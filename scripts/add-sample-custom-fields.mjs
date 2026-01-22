import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_dmWJrab3uSP5@ep-lively-bird-a1vsnlbg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

async function addSampleCustomFields() {
    try {
        console.log('Adding sample custom fields for licenses...');

        // Add some sample custom fields for licenses
        const sampleFields = [
            {
                entity_type: 'licenses',
                field_name: 'contact_person',
                field_label: 'ผู้ติดต่อ',
                field_type: 'text',
                display_order: 1
            },
            {
                entity_type: 'licenses',
                field_name: 'payment_status',
                field_label: 'สถานะการชำระเงิน',
                field_type: 'select',
                field_options: JSON.stringify([
                    { value: 'paid', label: 'ชำระแล้ว' },
                    { value: 'pending', label: 'รอชำระ' },
                    { value: 'overdue', label: 'ค้างชำระ' }
                ]),
                display_order: 2
            },
            {
                entity_type: 'licenses',
                field_name: 'renewal_date',
                field_label: 'วันที่ต่ออายุ',
                field_type: 'date',
                display_order: 3
            },
            {
                entity_type: 'licenses',
                field_name: 'priority_level',
                field_label: 'ระดับความสำคัญ',
                field_type: 'select',
                field_options: JSON.stringify([
                    { value: 'high', label: 'สูง' },
                    { value: 'medium', label: 'ปานกลาง' },
                    { value: 'low', label: 'ต่ำ' }
                ]),
                display_order: 4
            },
            {
                entity_type: 'licenses',
                field_name: 'notes_internal',
                field_label: 'บันทึกภายใน',
                field_type: 'textarea',
                display_order: 5
            }
        ];

        for (const field of sampleFields) {
            await sql`
                INSERT INTO custom_fields (
                    entity_type, field_name, field_label, field_type, 
                    field_options, display_order, is_required, is_active,
                    show_in_table, show_in_form
                ) VALUES (
                    ${field.entity_type}, ${field.field_name}, ${field.field_label}, 
                    ${field.field_type}, ${field.field_options || '[]'}, 
                    ${field.display_order}, false, true, true, true
                )
                ON CONFLICT (entity_type, field_name) DO UPDATE SET
                    field_label = EXCLUDED.field_label,
                    field_type = EXCLUDED.field_type,
                    field_options = EXCLUDED.field_options,
                    display_order = EXCLUDED.display_order,
                    updated_at = NOW()
            `;
            console.log(`✓ Added/Updated field: ${field.field_label}`);
        }

        console.log('Sample custom fields added successfully!');
        
        // Verify the fields were added
        const fields = await sql`
            SELECT field_name, field_label, field_type 
            FROM custom_fields 
            WHERE entity_type = 'licenses' AND is_active = true
            ORDER BY display_order
        `;
        
        console.log('\nCurrent custom fields for licenses:');
        fields.forEach(field => {
            console.log(`- ${field.field_label} (${field.field_name}) - ${field.field_type}`);
        });

    } catch (error) {
        console.error('Error adding sample custom fields:', error);
    }
}

addSampleCustomFields();
