
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
                    l.notes
                FROM licenses l
                LEFT JOIN shops s ON l.shop_id = s.id
                LEFT JOIN license_types lt ON l.license_type_id = lt.id
                ${whereSQL}
                ORDER BY l.id DESC
            `;
            data = await fetchAll(query, params);
            columns = ['เลขที่ใบอนุญาต', 'ชื่อร้าน', 'ประเภท', 'วันออกใบอนุญาต', 'วันหมดอายุ', 'สถานะ', 'หมายเหตุ'];

        } else if (type === 'shops') {
            // Check admin logic if needed, but for now allow
            data = await fetchAll(`
                SELECT shop_name, owner_name, phone, email, address, notes, created_at
                FROM shops
                ORDER BY id DESC
            `);
            columns = ['ชื่อร้าน', 'ชื่อเจ้าของ', 'โทรศัพท์', 'อีเมล', 'ที่อยู่', 'หมายเหตุ', 'วันที่สร้าง'];

        } else if (type === 'users') {
            // RESTRICT TO ADMIN logic needed? Assuming dashboard access implies admin for this system
            data = await fetchAll(`
                SELECT username, created_at
                FROM users
                ORDER BY id ASC
            `);
            columns = ['ชื่อผู้ใช้', 'วันที่สร้าง'];
        } else {
            return NextResponse.json({ success: false, message: 'Invalid export type' }, { status: 400 });
        }

        // Status translation map
        const statusMap = {
            'active': 'ปกติ',
            'expired': 'หมดอายุ',
            'pending': 'กำลังดำเนินการ',
            'suspended': 'ถูกพักใช้',
            'revoked': 'ถูกเพิกถอน'
        };

        // Convert to CSV
        const csvRows = [];
        csvRows.push(columns.join(',')); // Header

        for (const row of data) {
            const values = Object.values(row).map((val, index) => {
                if (val === null || val === undefined) return '';
                
                let stringVal = String(val);
                
                // Translate status values to Thai (status is typically the 6th column for licenses)
                if (statusMap[stringVal.toLowerCase()]) {
                    stringVal = statusMap[stringVal.toLowerCase()];
                }
                
                // Escape quotes and wrap in quotes if contains comma or quote
                if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
                    return `"${stringVal.replace(/"/g, '""')}"`;
                }
                return stringVal;
            });
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
            details: `ส่งออกข้อมูล${typeNames[type] || type} จำนวน ${data.length} รายการ`
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
