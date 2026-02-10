
import { fetchAll } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    // Check authentication - REQUIRED for security
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const fieldsParam = searchParams.get('fields');
        const limit = Math.max(1, parseInt(searchParams.get('limit') || '100') || 100); // Limit preview rows

        let data = [];

        // Define Base Columns Mapping
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

        // Fetch Data with limit
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
            }
            if (shop_id) {
                whereClauses.push(`l.shop_id = $${paramIndex++}`);
                params.push(shop_id);
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
            }
            if (expiry_from) {
                whereClauses.push(`l.expiry_date >= $${paramIndex++}`);
                params.push(expiry_from);
            }
            if (expiry_to) {
                whereClauses.push(`l.expiry_date <= $${paramIndex++}`);
                params.push(expiry_to);
            }

            const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

            // Count total
            const countQuery = `
                SELECT COUNT(DISTINCT l.id) as total
                FROM licenses l
                LEFT JOIN shops s ON l.shop_id = s.id
                LEFT JOIN license_types lt ON l.license_type_id = lt.id
                ${whereSQL}
            `;
            const countResult = await fetchAll(countQuery, params);
            const totalCount = parseInt(countResult[0]?.total || 0);

            // Fetch data with limit
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
                LIMIT ${limit}
            `;
            data = await fetchAll(query, params);

            return NextResponse.json({
                success: true,
                data,
                totalCount,
                previewCount: data.length,
                columns: [...activeBaseFields, ...customFieldDefs.map(cf => ({ key: cf.field_name, label: cf.field_label, dataKey: cf.field_name }))],
                customFieldDefs
            });

        } else if (type === 'shops') {
            // Count total
            const countResult = await fetchAll(`SELECT COUNT(*) as total FROM shops`);
            const totalCount = parseInt(countResult[0]?.total || 0);

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
                LIMIT ${limit}
            `);

            return NextResponse.json({
                success: true,
                data,
                totalCount,
                previewCount: data.length,
                columns: [...activeBaseFields, ...customFieldDefs.map(cf => ({ key: cf.field_name, label: cf.field_label, dataKey: cf.field_name }))],
                customFieldDefs
            });

        } else if (type === 'users') {
            // Count total
            const countResult = await fetchAll(`SELECT COUNT(*) as total FROM users`);
            const totalCount = parseInt(countResult[0]?.total || 0);

            data = await fetchAll(`
                SELECT username, full_name, role, created_at
                FROM users
                ORDER BY id ASC
                LIMIT ${limit}
            `);

            return NextResponse.json({
                success: true,
                data,
                totalCount,
                previewCount: data.length,
                columns: activeBaseFields
            });

        } else {
            return NextResponse.json({ success: false, message: 'Invalid export type' }, { status: 400 });
        }

    } catch (err) {
        console.error('Preview Error:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
