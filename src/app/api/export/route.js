
import { fetchAll } from '@/lib/db';
import { NextResponse } from 'next/server';
import { logActivity, ACTIVITY_ACTIONS, ENTITY_TYPES } from '@/lib/activityLogger';
import { requireAuth, getCurrentUser, safeErrorMessage } from '@/lib/api-helpers';
import { generatePdf } from '@/lib/serverPdfGenerator';
import { sanitizeString, sanitizeInt, validateEnum, sanitizeDate } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * Security: Prevent CSV Formula Injection
 * Prefixes dangerous characters with a single quote to neutralize formulas in Excel/LibreOffice
 */
function sanitizeCsvValue(val) {
    if (typeof val !== 'string' || val.length === 0) return val;
    const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
    if (dangerousChars.includes(val.charAt(0))) {
        return "'" + val;
    }
    return val;
}

const THAI_MONTHS_SHORT = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

/**
 * Format a Date object / ISO string into Thai Buddhist-era short date.
 * Example: 2026-01-12 -> "12 ม.ค. 2569"
 * Returns '' for null/undefined/invalid input.
 */
function formatThaiDate(val) {
    if (val === null || val === undefined || val === '') return '';
    try {
        const d = val instanceof Date ? val : new Date(val);
        if (isNaN(d.getTime())) return String(val);
        const day = d.getDate();
        const month = THAI_MONTHS_SHORT[d.getMonth()];
        const year = d.getFullYear() + 543;
        return `${day} ${month} ${year}`;
    } catch {
        return String(val);
    }
}

export async function GET(request) {
    // Check authentication - REQUIRED for security
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const type = validateEnum(searchParams.get('type'), ['shops', 'licenses', 'users'], '');
        const format = validateEnum(searchParams.get('format') || 'csv', ['csv', 'pdf'], 'csv');
        const fieldsParam = searchParams.get('fields');

        if (!type) {
            return NextResponse.json({ success: false, message: 'Invalid export type' }, { status: 400 });
        }

        // Security: Exporting user data requires admin privileges
        if (type === 'users') {
            const { requireAdmin } = await import('@/lib/api-helpers');
            const adminError = await requireAdmin();
            if (adminError) return adminError;
        }

        let data = [];
        // Security: Sanitize filename to prevent header injection
        const safeType = type.replace(/[^a-zA-Z0-9_-]/g, '');
        let filename = `export_${safeType}_${new Date().toISOString().split('T')[0]}.${format}`;

        // Define Base Columns Mapping
        // Updated to match custom_fields keys and labels EXACTLY
        const baseFieldsDefinitions = {
            shops: [
                { key: 'shop_name', dataKey: 'shop_name', label: 'ชื่อร้านค้า' },
                { key: 'owner_name', dataKey: 'owner_name', label: 'ชื่อเจ้าของ' },
                { key: 'phone', dataKey: 'phone', label: 'เบอร์โทรศัพท์' },
                { key: 'email', dataKey: 'email', label: 'อีเมล' },
                { key: 'address', dataKey: 'address', label: 'ที่อยู่' },
                { key: 'notes', dataKey: 'notes', label: 'หมายเหตุ' },
                { key: 'license_count', dataKey: 'license_count', label: 'จำนวนใบอนุญาต' }
            ],
            licenses: [
                // Pre-custom: ข้อมูลหลักของใบอนุญาต (จะแสดงก่อน custom fields)
                { key: 'owner_name', dataKey: 'owner_name', label: 'ชื่อเจ้าของ' },
                { key: 'shop_id', dataKey: 'shop_name', label: 'ชื่อร้านค้า' },
                { key: 'license_type_id', dataKey: 'type_name', label: 'ประเภทใบอนุญาต' },
                { key: 'license_number', dataKey: 'license_number', label: 'เลขที่ใบอนุญาต', preserveText: true },
                { key: 'issue_date', dataKey: 'issue_date', label: 'วันที่ออก', type: 'date' },
                { key: 'expiry_date', dataKey: 'expiry_date', label: 'วันหมดอายุ', type: 'date' },
                // Post-custom: status + notes จะแสดงท้ายสุดหลัง custom fields
                { key: 'status', dataKey: 'status', label: 'สถานะ', afterCustom: true },
                { key: 'notes', dataKey: 'notes', label: 'หมายเหตุ', afterCustom: true }
            ],
            users: [
                { key: 'username', dataKey: 'username', label: 'ชื่อผู้ใช้' },
                { key: 'full_name', dataKey: 'full_name', label: 'ชื่อ-นามสกุล' },
                { key: 'role', dataKey: 'role', label: 'สิทธิ์การใช้งาน' },
                { key: 'created_at', dataKey: 'created_at', label: 'วันที่สร้าง', type: 'date' }
            ]
        };

        const availableBaseFields = baseFieldsDefinitions[type] || [];
        let activeBaseFields = availableBaseFields;
        let customFieldDefs = [];
        let filters = {};

        // 1. Fetch Custom Field Definitions
        if (availableBaseFields.length > 0) {
            const entityType = type;
            customFieldDefs = await fetchAll(
                `SELECT field_name, field_label, field_type, show_in_table 
                 FROM custom_fields 
                 WHERE entity_type = $1 AND is_active = true 
                 ORDER BY display_order ASC`,
                [entityType]
            );

            // 2. Determine Active Base Fields
            const customFieldNames = new Set(customFieldDefs.map(cf => cf.field_name));

            if (fieldsParam) {
                const selectedKeys = fieldsParam.split(',');

                activeBaseFields = availableBaseFields.filter(f => {
                    if (customFieldNames.has(f.key)) {
                        return selectedKeys.includes(f.key);
                    }
                    return true;
                });

                // Filter Custom Fields Definitions
                customFieldDefs = customFieldDefs.filter(cf => selectedKeys.includes(cf.field_name));
            }

            // 3. EXCLUDE Base Fields from customFieldDefs to avoid duplicates
            const baseKeysSet = new Set(availableBaseFields.map(f => f.key));
            customFieldDefs = customFieldDefs.filter(cf => !baseKeysSet.has(cf.field_name));
        }

        // Fetch Data
        if (type === 'licenses') {
            const license_type = searchParams.get('license_type');
            const status = validateEnum(
                sanitizeString(searchParams.get('status'), 50),
                ['active', 'expired', 'pending', 'suspended', 'revoked'],
                ''
            );
            const shop_id = sanitizeInt(searchParams.get('shop_id'), 0, 1);
            const search = sanitizeString(searchParams.get('search') || '', 100);
            const expiry_from = sanitizeDate(searchParams.get('expiry_from'));
            const expiry_to = sanitizeDate(searchParams.get('expiry_to'));
            // Quick filter: เดือน (1-12) และปี (ค.ศ.) ของ expiry_date
            const expiry_month = sanitizeInt(searchParams.get('expiry_month'), 0, 1, 12);
            const expiry_year = sanitizeInt(searchParams.get('expiry_year'), 0, 1900, 2999);

            let whereClauses = [];
            let params = [];
            let paramIndex = 1;

            if (license_type) {
                const safeLicenseType = sanitizeInt(license_type, 0, 1);
                if (safeLicenseType > 0) {
                    whereClauses.push(`l.license_type_id = $${paramIndex++}`);
                    params.push(safeLicenseType);
                    filters['License Type ID'] = safeLicenseType;
                }
            }
            if (shop_id) {
                const safeShopId = sanitizeInt(shop_id, 0, 1);
                if (safeShopId > 0) {
                    whereClauses.push(`l.shop_id = $${paramIndex++}`);
                    params.push(safeShopId);
                }
            }
            if (search) {
                whereClauses.push(`(
                    s.shop_name ILIKE $${paramIndex} OR 
                    l.license_number ILIKE $${paramIndex} OR 
                    lt.name ILIKE $${paramIndex} OR 
                    l.status ILIKE $${paramIndex} OR 
                    l.notes ILIKE $${paramIndex} OR
                    l.issue_date::text ILIKE $${paramIndex} OR
                    l.expiry_date::text ILIKE $${paramIndex} OR
                    EXISTS (
                        SELECT 1 FROM custom_field_values cfv2
                        WHERE cfv2.entity_id = l.id 
                        AND cfv2.field_value ILIKE $${paramIndex}
                    )
                )`);
                params.push(`%${search}%`);
                paramIndex++;
                filters['Search'] = search;
            }
            // Filter by computed status
            if (status) {
                if (status === 'active') {
                    whereClauses.push(`(l.expiry_date >= CURRENT_DATE AND l.status NOT IN ('suspended', 'revoked'))`);
                } else if (status === 'expired') {
                    whereClauses.push(`(l.expiry_date < CURRENT_DATE AND l.status NOT IN ('suspended', 'revoked'))`);
                } else {
                    whereClauses.push(`l.status = $${paramIndex++}`);
                    params.push(status);
                }
                filters['Status'] = status;
            }
            if (expiry_from) {
                whereClauses.push(`l.expiry_date >= $${paramIndex++}`);
                params.push(expiry_from);
                filters['Expiry From'] = expiry_from;
            }
            if (expiry_to) {
                whereClauses.push(`l.expiry_date <= $${paramIndex++}`);
                params.push(expiry_to);
                filters['Expiry To'] = expiry_to;
            }
            // Quick filter: Month / Year of expiry_date (independent of from/to range)
            if (expiry_month > 0) {
                whereClauses.push(`EXTRACT(MONTH FROM l.expiry_date) = $${paramIndex++}`);
                params.push(expiry_month);
                filters['Expiry Month'] = expiry_month;
            }
            if (expiry_year > 0) {
                whereClauses.push(`EXTRACT(YEAR FROM l.expiry_date) = $${paramIndex++}`);
                params.push(expiry_year);
                filters['Expiry Year'] = expiry_year;
            }

            const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

            // Computed status: คำนวณสถานะอัตโนมัติจากวันหมดอายุ
            const query = `
                SELECT 
                    l.license_number, 
                    s.shop_name, 
                    s.owner_name,
                    lt.name as type_name, 
                    l.issue_date, 
                    l.expiry_date, 
                    CASE 
                        WHEN l.status IN ('suspended', 'revoked') THEN l.status
                        WHEN l.expiry_date < CURRENT_DATE THEN 'expired'
                        ELSE 'active'
                    END AS status,
                    l.notes,
                    COALESCE(
                        json_object_agg(cf.field_name, cfv.field_value) FILTER (WHERE cf.field_name IS NOT NULL),
                        '{}'::json
                    ) as custom_fields
                FROM licenses l
                LEFT JOIN shops s ON l.shop_id = s.id
                LEFT JOIN license_types lt ON l.license_type_id = lt.id
                LEFT JOIN custom_field_values cfv ON cfv.entity_id = l.id AND cfv.entity_type = 'licenses'
                LEFT JOIN custom_fields cf ON cfv.custom_field_id = cf.id AND cf.entity_type = 'licenses' AND cf.is_active = true
                ${whereSQL}
                GROUP BY l.id, l.license_number, s.shop_name, s.owner_name, lt.name, l.issue_date, l.expiry_date, l.status, l.notes
                ORDER BY l.id DESC
                LIMIT 5000
            `;
            data = await fetchAll(query, params);

        } else if (type === 'shops') {
            const shopSearch = sanitizeString(searchParams.get('search') || '', 100);
            const hasLicense = searchParams.get('has_license') || '';
            const shopLicenseStatus = validateEnum(
                searchParams.get('license_status'),
                ['active', 'expired', 'pending', 'suspended', 'revoked'],
                ''
            );
            const shopLicenseType = searchParams.get('license_type') || '';

            let shopWhereClauses = [];
            let shopParams = [];
            let shopParamIndex = 1;

            if (shopSearch) {
                shopWhereClauses.push(`(
                    s.shop_name ILIKE $${shopParamIndex} OR 
                    s.owner_name ILIKE $${shopParamIndex} OR 
                    s.phone ILIKE $${shopParamIndex} OR 
                    s.address ILIKE $${shopParamIndex} OR 
                    s.email ILIKE $${shopParamIndex} OR 
                    s.notes ILIKE $${shopParamIndex}
                )`);
                shopParams.push(`%${shopSearch}%`);
                shopParamIndex++;
                filters['Search'] = shopSearch;
            }

            if (hasLicense === 'yes') {
                shopWhereClauses.push(`EXISTS (SELECT 1 FROM licenses l WHERE l.shop_id = s.id)`);
                filters['ใบอนุญาต'] = 'มีใบอนุญาต';
            } else if (hasLicense === 'no') {
                shopWhereClauses.push(`NOT EXISTS (SELECT 1 FROM licenses l WHERE l.shop_id = s.id)`);
                filters['ใบอนุญาต'] = 'ยังไม่มี';
            }

            if (shopLicenseStatus) {
                if (shopLicenseStatus === 'active') {
                    shopWhereClauses.push(`EXISTS (SELECT 1 FROM licenses l WHERE l.shop_id = s.id AND l.expiry_date >= CURRENT_DATE AND l.status NOT IN ('suspended', 'revoked'))`);
                } else if (shopLicenseStatus === 'expired') {
                    shopWhereClauses.push(`EXISTS (SELECT 1 FROM licenses l WHERE l.shop_id = s.id AND l.expiry_date < CURRENT_DATE AND l.status NOT IN ('suspended', 'revoked'))`);
                } else {
                    shopWhereClauses.push(`EXISTS (SELECT 1 FROM licenses l WHERE l.shop_id = s.id AND l.status = $${shopParamIndex})`);
                    shopParams.push(shopLicenseStatus);
                    shopParamIndex++;
                }
                filters['Status'] = shopLicenseStatus;
            }

            if (shopLicenseType) {
                const safeLicenseType = sanitizeInt(shopLicenseType, 0, 1);
                if (safeLicenseType > 0) {
                    shopWhereClauses.push(`EXISTS (SELECT 1 FROM licenses l WHERE l.shop_id = s.id AND l.license_type_id = $${shopParamIndex})`);
                    shopParams.push(safeLicenseType);
                    shopParamIndex++;
                    filters['License Type ID'] = safeLicenseType;
                }
            }

            const shopWhereSQL = shopWhereClauses.length > 0 ? 'WHERE ' + shopWhereClauses.join(' AND ') : '';

            data = await fetchAll(`
                SELECT 
                    s.shop_name, 
                    s.owner_name, 
                    s.phone, 
                    s.email, 
                    s.address, 
                    s.notes, 
                    s.created_at,
                    (SELECT COUNT(*) FROM licenses WHERE shop_id = s.id) as license_count,
                    COALESCE(
                        json_object_agg(cf.field_name, cfv.field_value) FILTER (WHERE cf.field_name IS NOT NULL),
                        '{}'::json
                    ) as custom_fields
                FROM shops s
                LEFT JOIN custom_field_values cfv ON cfv.entity_id = s.id AND cfv.entity_type = 'shops'
                LEFT JOIN custom_fields cf ON cfv.custom_field_id = cf.id AND cf.entity_type = 'shops' AND cf.is_active = true
                ${shopWhereSQL}
                GROUP BY s.id, s.shop_name, s.owner_name, s.phone, s.email, s.address, s.notes, s.created_at
                ORDER BY s.id DESC
                LIMIT 5000
            `, shopParams);
        } else if (type === 'users') {
            data = await fetchAll(`
                SELECT username, full_name, role, created_at
                FROM users
                ORDER BY id ASC
            `);
        } else {
            return NextResponse.json({ success: false, message: 'Invalid export type' }, { status: 400 });
        }

        // Log activity
        const currentUser = await getCurrentUser();
        const typeNames = { licenses: 'ใบอนุญาต', shops: 'ร้านค้า', users: 'ผู้ใช้' };
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.EXPORT,
            entityType: ENTITY_TYPES.LICENSE,
            details: `ส่งออกข้อมูล${typeNames[type] || type} (${format.toUpperCase()}) จำนวน ${data.length} รายการ`
        });

        // HANDLE PDF EXPORT
        if (format === 'pdf') {
            const pdfBuffer = await generatePdf(type, data, customFieldDefs, filters, activeBaseFields);
            return new NextResponse(pdfBuffer, {
                status: 200,
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${filename}"`
                }
            });
        }

        // HANDLE CSV EXPORT

        // Split base fields into pre-custom and post-custom groups so custom fields
        // appear between the main info and status/notes columns (per user request).
        const preCustomFields = activeBaseFields.filter(f => !f.afterCustom);
        const postCustomFields = activeBaseFields.filter(f => f.afterCustom);

        const statusMap = {
            'active': 'ปกติ',
            'expired': 'หมดอายุ',
            'pending': 'กำลังดำเนินการ',
            'suspended': 'ถูกพักใช้',
            'revoked': 'ถูกเพิกถอน'
        };

        // Helper: render one base field value into a CSV-safe token
        const renderBaseField = (field, val) => {
            if (val === null || val === undefined) return '';

            let stringVal;
            if (field.type === 'date') {
                stringVal = formatThaiDate(val);
            } else {
                stringVal = String(val);
            }

            if (field.dataKey === 'status' && statusMap[stringVal.toLowerCase()]) {
                stringVal = statusMap[stringVal.toLowerCase()];
            }
            if (field.dataKey === 'role') {
                stringVal = stringVal === 'admin' ? 'แอดมิน' : 'ผู้ใช้ทั่วไป';
            }

            // Preserve text: wrap in Excel formula ="..." to prevent auto-date conversion
            if (field.preserveText && stringVal !== '') {
                const escaped = stringVal.replace(/"/g, '""');
                return `"=""${escaped}"""`;
            }

            stringVal = sanitizeCsvValue(stringVal);
            if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
                return `"${stringVal.replace(/"/g, '""')}"`;
            }
            return stringVal;
        };

        // Helper: render one custom field value into a CSV-safe token
        const renderCustomField = (cf, cfValue) => {
            if (cfValue === null || cfValue === undefined || cfValue === '') return '';
            let stringVal = (cf.field_type === 'date' || cf.field_type === 'datetime')
                ? formatThaiDate(cfValue)
                : String(cfValue);
            stringVal = sanitizeCsvValue(stringVal);
            if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
                return `"${stringVal.replace(/"/g, '""')}"`;
            }
            return stringVal;
        };

        // Build header row: [ลำดับที่, ...preCustom, ...custom, ...postCustom]
        const allLabels = [
            'ลำดับที่',
            ...preCustomFields.map(f => f.label),
            ...customFieldDefs.map(cf => cf.field_label),
            ...postCustomFields.map(f => f.label)
        ];

        const csvRows = [];
        const headerRow = allLabels.map(col => {
            const str = String(col);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        });
        csvRows.push(headerRow.join(','));

        data.forEach((row, rowIdx) => {
            const values = [];

            // 1) ลำดับที่ (1-based running number)
            values.push(String(rowIdx + 1));

            // 2) Pre-custom base fields
            for (const field of preCustomFields) {
                values.push(renderBaseField(field, row[field.dataKey]));
            }

            // 3) Custom fields (middle)
            const customFieldsData = row.custom_fields || {};
            for (const cf of customFieldDefs) {
                values.push(renderCustomField(cf, customFieldsData[cf.field_name]));
            }

            // 4) Post-custom base fields (status / notes)
            for (const field of postCustomFields) {
                values.push(renderBaseField(field, row[field.dataKey]));
            }

            csvRows.push(values.join(','));
        });

        const csvContent = '\uFEFF' + csvRows.join('\n');

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        });

    } catch (err) {
        console.error('Export Error:', err);
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}
