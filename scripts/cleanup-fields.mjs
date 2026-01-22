import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_dmWJrab3uSP5@ep-lively-bird-a1vsnlbg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

async function cleanupAndReorderFields() {
    try {
        console.log('Cleaning up duplicate custom fields...');

        // First, let's see what we have
        const allFields = await sql`
            SELECT id, field_name, field_label, field_type, display_order, is_active
            FROM custom_fields 
            WHERE entity_type = 'licenses'
            ORDER BY display_order ASC, id ASC
        `;
        
        console.log('All fields before cleanup:');
        allFields.forEach(field => {
            console.log(`${field.id}: ${field.field_label} (${field.field_name}) - order: ${field.display_order} - active: ${field.is_active}`);
        });

        // Deactivate duplicate/old fields (keep the ones with proper names)
        const fieldsToDeactivate = [
            'สถานที่จำหน่าย', // Thai name duplicate
            'จำนวนเงิน', // Thai name duplicate
            'พื้นที่ (ตารางเมตร)', // Thai name duplicate
            'พื้นที่(แรงม้า)', // Thai name duplicate
            'สถานที่จำหน่าย', // Another duplicate
            'จำนวนเงิน', // Another duplicate
            'พื้นที่ (ตารางเมตร)', // Another duplicate
            'พื้นที่ (แรงม้า)', // Another duplicate
            'cf_1768442259211',
            'cf_1768356527954',
            'cf_1768288466669',
            'cf_1768288445301'
        ];

        for (const fieldName of fieldsToDeactivate) {
            await sql`
                UPDATE custom_fields 
                SET is_active = false
                WHERE entity_type = 'licenses' AND field_name = ${fieldName}
            `;
            console.log(`✓ Deactivated field: ${fieldName}`);
        }

        // Now set proper display order for remaining active fields
        const activeFields = await sql`
            SELECT field_name, field_label
            FROM custom_fields 
            WHERE entity_type = 'licenses' AND is_active = true
            ORDER BY display_order ASC
        `;

        console.log('\nActive fields after cleanup:');
        activeFields.forEach(field => {
            console.log(`- ${field.field_label} (${field.field_name})`);
        });

        // Update display order to be sequential
        const finalOrder = [
            { field_name: 'shop_id', display_order: 1 },
            { field_name: 'license_type_id', display_order: 2 },
            { field_name: 'license_number', display_order: 3 },
            { field_name: 'issue_date', display_order: 4 },
            { field_name: 'expiry_date', display_order: 5 },
            { field_name: 'status', display_order: 6 },
            { field_name: 'notes', display_order: 7 },
            { field_name: 'contact_person', display_order: 8 },
            { field_name: 'payment_status', display_order: 9 },
            { field_name: 'renewal_date', display_order: 10 },
            { field_name: 'priority_level', display_order: 11 },
            { field_name: 'notes_internal', display_order: 12 }
        ];

        for (const field of finalOrder) {
            await sql`
                UPDATE custom_fields 
                SET display_order = ${field.display_order}
                WHERE entity_type = 'licenses' AND field_name = ${field.field_name} AND is_active = true
            `;
            console.log(`✓ Set display_order for ${field.field_name} to ${field.display_order}`);
        }

        // Final verification
        const finalFields = await sql`
            SELECT field_name, field_label, field_type, display_order 
            FROM custom_fields 
            WHERE entity_type = 'licenses' AND is_active = true
            ORDER BY display_order ASC
        `;
        
        console.log('\nFinal field order:');
        finalFields.forEach(field => {
            console.log(`${field.display_order}. ${field.field_label} (${field.field_name}) - ${field.field_type}`);
        });

    } catch (error) {
        console.error('Error cleaning up fields:', error);
    }
}

cleanupAndReorderFields();
