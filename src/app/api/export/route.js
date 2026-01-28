
import { fetchAll } from '@/lib/db';
import { NextResponse } from 'next/server';
import { logActivity, ACTIVITY_ACTIONS, ENTITY_TYPES } from '@/lib/activityLogger';
import { requireAuth, getCurrentUser } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const format = searchParams.get('format') || 'csv';

        if (format !== 'csv') {
            return NextResponse.json({ success: false, message: 'Only CSV format is supported' }, { status: 400 });
        }

        let data = [];
        let filename = `export_${type}_${new Date().toISOString().split('T')[0]}.csv`;
        let columns = [];
        let customFieldDefs = [];

        // Fetch custom field definitions for the entity type
        if (type === 'shops' || type === 'licenses') {
            const entityType = type; // 'shops' or 'licenses'
            customFieldDefs = await fetchAll(
                `SELECT field_name, field_label, field_type, show_in_table 
                 FROM custom_fields 
                 WHERE entity_type = $1 AND show_in_table = true 
                 ORDER BY display_order ASC`,
                [entityType]
            );
        }

        if (type === 'licenses') {
            const license_type = searchParams.get('license_type');
            const status = searchParams.get('status');
            const expiry_from = searchParams.get('expiry_from');
            const expiry_to = searchParams.get('expiry_to');

            let whereClauses = [];
            let params = [];
            let paramIndex = 1;

            if (license_type) {
                whereClauses.push(`l.license_type_id = $${paramIndex++}`);
                params.push(license_type);
            }
            if (status) {
                whereClauses.push(`l.status = $${paramIndex++}`);
                params.push(status);
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

            const query = `
                SELECT 
                    l.license_number, 
                    s.shop_name, 
                    lt.name as type_name, 
                    l.issue_date, 
                    l.expiry_date, 
                    l.status,
                    l.notes,
                    l.custom_fields
                FROM licenses l
                LEFT JOIN shops s ON l.shop_id = s.id
                LEFT JOIN license_types lt ON l.license_type_id = lt.id
                ${whereSQL}
                ORDER BY l.id DESC
            `;
            data = await fetchAll(query, params);

            // Base columns for licenses
            columns = ['เลขที่ใบอนุญาต', 'ชื่อร้าน', 'ประเภท', 'วันออกใบอนุญาต', 'วันหมดอายุ', 'สถานะ', 'หมายเหตุ'];

        } else if (type === 'shops') {
            data = await fetchAll(`
                SELECT shop_name, owner_name, phone, email, address, notes, custom_fields, created_at
                FROM shops
                ORDER BY id DESC
            `);

            // Base columns for shops
            columns = ['ชื่อร้าน', 'ชื่อเจ้าของ', 'โทรศัพท์', 'อีเมล', 'ที่อยู่', 'หมายเหตุ'];

        } else if (type === 'users') {
            data = await fetchAll(`
                SELECT username, created_at
                FROM users
                ORDER BY id ASC
            `);
            columns = ['ชื่อผู้ใช้', 'วันที่สร้าง'];
        } else {
            return NextResponse.json({ success: false, message: 'Invalid export type' }, { status: 400 });
        }

        // Add custom field columns
        const customFieldColumns = customFieldDefs.map(cf => cf.field_label);
        const allColumns = [...columns, ...customFieldColumns];

        // Add "วันที่สร้าง" column for shops at the end
        if (type === 'shops') {
            allColumns.push('วันที่สร้าง');
        }

        // Status translation map
        const statusMap = {
            'active': 'ปกติ',
            'expired': 'หมดอายุ',
            'pending': 'กำลังดำเนินการ',
            'suspended': 'ถูกพักใช้',
            'revoked': 'ถูกเพิกถอน'
        };

        // Define base column keys mapping
        const baseColumnKeys = {
            licenses: ['license_number', 'shop_name', 'type_name', 'issue_date', 'expiry_date', 'status', 'notes'],
            shops: ['shop_name', 'owner_name', 'phone', 'email', 'address', 'notes'],
            users: ['username', 'created_at']
        };

        // Convert to CSV with explicit column order
        const csvRows = [];
        csvRows.push(allColumns.join(',')); // Header with custom fields

        const baseKeys = baseColumnKeys[type] || Object.keys(data[0] || {});

        for (const row of data) {
            const values = [];

            // Add base field values
            for (const key of baseKeys) {
                let val = row[key];
                if (val === null || val === undefined) {
                    values.push('');
                    continue;
                }

                let stringVal = String(val);

                // Translate status values to Thai
                if (key === 'status' && statusMap[stringVal.toLowerCase()]) {
                    stringVal = statusMap[stringVal.toLowerCase()];
                }

                // Escape quotes and wrap in quotes if contains comma or quote
                if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
                    values.push(`"${stringVal.replace(/"/g, '""')}"`);
                } else {
                    values.push(stringVal);
                }
            }

            // Add custom field values
            const customFieldsData = row.custom_fields || {};
            for (const cf of customFieldDefs) {
                let cfValue = customFieldsData[cf.field_name];

                if (cfValue === null || cfValue === undefined) {
                    values.push('');
                } else {
                    let stringVal = String(cfValue);

                    // Escape quotes and wrap in quotes if contains comma or quote
                    if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
                        values.push(`"${stringVal.replace(/"/g, '""')}"`);
                    } else {
                        values.push(stringVal);
                    }
                }
            }

            // Add created_at for shops at the end
            if (type === 'shops') {
                let createdAt = row.created_at || '';
                if (createdAt) {
                    let stringVal = String(createdAt);
                    if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
                        values.push(`"${stringVal.replace(/"/g, '""')}"`);
                    } else {
                        values.push(stringVal);
                    }
                } else {
                    values.push('');
                }
            }

            csvRows.push(values.join(','));
        }

        const csvContent = '\uFEFF' + csvRows.join('\n'); // Add BOM for Excel UTF-8 support

        // Log activity
        const currentUser = await getCurrentUser();
        const typeNames = { licenses: 'ใบอนุญาต', shops: 'ร้านค้า', users: 'ผู้ใช้' };
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.EXPORT,
            entityType: ENTITY_TYPES.LICENSE, // Using LICENSE as generic entity for exports
            details: `ส่งออกข้อมูล${typeNames[type] || type} จำนวน ${data.length} รายการ${customFieldDefs.length > 0 ? ` (รวม Custom Fields ${customFieldDefs.length} ฟิลด์)` : ''}`
        });

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        });

    } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
