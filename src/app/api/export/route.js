
import { fetchAll } from '@/lib/db';
import { NextResponse } from 'next/server';
import { logActivity, ACTIVITY_ACTIONS, ENTITY_TYPES } from '@/lib/activityLogger';
import { requireAuth, getCurrentUser } from '@/lib/api-helpers';
import { generatePdf } from '@/lib/serverPdfGenerator';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    // Check authentication - REQUIRED for security
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const format = searchParams.get('format') || 'csv';
        const fieldsParam = searchParams.get('fields');

        if (format !== 'csv' && format !== 'pdf') {
            return NextResponse.json({ success: false, message: 'Only CSV and PDF formats are supported' }, { status: 400 });
        }

        let data = [];
        let filename = `export_${type}_${new Date().toISOString().split('T')[0]}.${format}`;

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
                { key: 'license_number', dataKey: 'license_number', label: 'เลขที่ใบอนุญาต' },
                { key: 'shop_id', dataKey: 'shop_name', label: 'ร้านค้า' },
                { key: 'license_type_id', dataKey: 'type_name', label: 'ประเภทใบอนุญาต' },
                { key: 'issue_date', dataKey: 'issue_date', label: 'วันที่ออก' },
                { key: 'expiry_date', dataKey: 'expiry_date', label: 'วันหมดอายุ' },
                { key: 'status', dataKey: 'status', label: 'สถานะ' },
                { key: 'notes', dataKey: 'notes', label: 'หมายเหตุ' }
            ],
            users: [
                { key: 'username', dataKey: 'username', label: 'ชื่อผู้ใช้' },
                { key: 'full_name', dataKey: 'full_name', label: 'ชื่อ-นามสกุล' },
                { key: 'role', dataKey: 'role', label: 'สิทธิ์การใช้งาน' },
                { key: 'created_at', dataKey: 'created_at', label: 'วันที่สร้าง' }
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
            const status = searchParams.get('status');
            const shop_id = searchParams.get('shop_id');
            const search = searchParams.get('search');
            const expiry_from = searchParams.get('expiry_from');
            const expiry_to = searchParams.get('expiry_to');

            let whereClauses = [];
            let params = [];
            let paramIndex = 1;

            if (license_type) {
                whereClauses.push(`l.license_type_id = $${paramIndex++}`);
                params.push(license_type);
                filters['License Type ID'] = license_type;
            }
            if (shop_id) {
                whereClauses.push(`l.shop_id = $${paramIndex++}`);
                params.push(shop_id);
                // We might want to look up shop name for the filter label if possible, or just show ID
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

            const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

            // Computed status: คำนวณสถานะอัตโนมัติจากวันหมดอายุ
            const query = `
                SELECT 
                    l.license_number, 
                    s.shop_name, 
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
                LEFT JOIN custom_field_values cfv ON cfv.entity_id = l.id
                LEFT JOIN custom_fields cf ON cfv.custom_field_id = cf.id AND cf.entity_type = 'licenses' AND cf.is_active = true
                ${whereSQL}
                GROUP BY l.id, l.license_number, s.shop_name, lt.name, l.issue_date, l.expiry_date, l.status, l.notes
                ORDER BY l.id DESC
            `;
            data = await fetchAll(query, params);

        } else if (type === 'shops') {
            data = await fetchAll(`
                SELECT 
                    s.shop_name, 
                    s.owner_name, 
                    s.phone, 
                    s.email, 
                    s.address, 
                    s.notes, 
                    s.custom_fields, 
                    s.created_at,
                    (SELECT COUNT(*) FROM licenses WHERE shop_id = s.id) as license_count
                FROM shops s
                ORDER BY s.id DESC
            `);
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
        const baseLabels = activeBaseFields.map(f => f.label);
        const customLabels = customFieldDefs.map(cf => cf.field_label);
        const allColumns = [...baseLabels, ...customLabels];

        const statusMap = {
            'active': 'ปกติ',
            'expired': 'หมดอายุ',
            'pending': 'กำลังดำเนินการ',
            'suspended': 'ถูกพักใช้',
            'revoked': 'ถูกเพิกถอน'
        };

        const csvRows = [];
        csvRows.push(allColumns.join(','));

        for (const row of data) {
            const values = [];

            for (const field of activeBaseFields) {
                let val = row[field.dataKey];

                if (val === null || val === undefined) {
                    values.push('');
                    continue;
                }

                let stringVal = String(val);

                if (field.dataKey === 'status' && statusMap[stringVal.toLowerCase()]) {
                    stringVal = statusMap[stringVal.toLowerCase()];
                }

                if (field.dataKey === 'role') {
                    stringVal = stringVal === 'admin' ? 'แอดมิน' : 'ผู้ใช้ทั่วไป';
                }

                if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
                    values.push(`"${stringVal.replace(/"/g, '""')}"`);
                } else {
                    values.push(stringVal);
                }
            }

            const customFieldsData = row.custom_fields || {};
            for (const cf of customFieldDefs) {
                let cfValue = customFieldsData[cf.field_name];

                if (cfValue === null || cfValue === undefined) {
                    values.push('');
                } else {
                    let stringVal = String(cfValue);
                    if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
                        values.push(`"${stringVal.replace(/"/g, '""')}"`);
                    } else {
                        values.push(stringVal);
                    }
                }
            }

            csvRows.push(values.join(','));
        }

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
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
