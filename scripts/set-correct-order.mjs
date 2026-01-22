import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_dmWJrab3uSP5@ep-lively-bird-a1vsnlbg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

async function setCorrectFieldOrder() {
    try {
        console.log('Setting correct field order...');

        // Define the exact order we want
        const correctOrder = [
            { field_name: 'shop_id', display_order: 1, label: 'ร้านค้า' },
            { field_name: 'license_type_id', display_order: 2, label: 'ประเภทใบอนุญาต' },
            { field_name: 'license_number', display_order: 3, label: 'เลขที่ใบอนุญาต' },
            { field_name: 'issue_date', display_order: 4, label: 'วันที่ออก' },
            { field_name: 'expiry_date', display_order: 5, label: 'วันหมดอายุ' },
            { field_name: 'status', display_order: 6, label: 'สถานะ' },
            { field_name: 'notes', display_order: 7, label: 'หมายเหตุ' },
            { field_name: 'contact_person', display_order: 8, label: 'ผู้ติดต่อ' },
            { field_name: 'payment_status', display_order: 9, label: 'สถานะการชำระเงิน' },
            { field_name: 'renewal_date', display_order: 10, label: 'วันที่ต่ออายุ' },
            { field_name: 'priority_level', display_order: 11, label: 'ระดับความสำคัญ' },
            { field_name: 'notes_internal', display_order: 12, label: 'บันทึกภายใน' },
            { field_name: 'location', display_order: 13, label: 'สถานที่จำหน่าย' },
            { field_name: 'amount', display_order: 14, label: 'จำนวนเงิน' },
            { field_name: 'area_sqm', display_order: 15, label: 'พื้นที่ (ตารางเมตร)' },
            { field_name: 'area_hp', display_order: 16, label: 'พื้นที่ (แรงม้า)' }
        ];

        for (const field of correctOrder) {
            await sql`
                UPDATE custom_fields 
                SET display_order = ${field.display_order}
                WHERE entity_type = 'licenses' AND field_name = ${field.field_name} AND is_active = true
            `;
            console.log(`${field.display_order}. ${field.label} (${field.field_name})`);
        }

        // Final verification
        const finalFields = await sql`
            SELECT field_name, field_label, field_type, display_order 
            FROM custom_fields 
            WHERE entity_type = 'licenses' AND is_active = true
            ORDER BY display_order ASC
        `;
        
        console.log('\nFinal field order (should match base columns + custom fields):');
        finalFields.forEach(field => {
            const prefix = field.display_order <= 7 ? '[STD]' : '[CUSTOM]';
            console.log(`${field.display_order}. ${prefix} ${field.field_label} (${field.field_name}) - ${field.field_type}`);
        });

    } catch (error) {
        console.error('Error setting correct field order:', error);
    }
}

setCorrectFieldOrder();
