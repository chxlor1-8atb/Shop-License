import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_dmWJrab3uSP5@ep-lively-bird-a1vsnlbg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

async function updateCustomFieldOrder() {
    try {
        console.log('Updating custom field display order...');

        // Update display order for all custom fields to place them after standard fields
        const fieldUpdates = [
            { field_name: 'contact_person', display_order: 8 },
            { field_name: 'payment_status', display_order: 9 },
            { field_name: 'renewal_date', display_order: 10 },
            { field_name: 'priority_level', display_order: 11 },
            { field_name: 'notes_internal', display_order: 12 }
        ];

        for (const field of fieldUpdates) {
            await sql`
                UPDATE custom_fields 
                SET display_order = ${field.display_order}
                WHERE entity_type = 'licenses' AND field_name = ${field.field_name}
            `;
            console.log(`✓ Updated display_order for ${field.field_name} to ${field.display_order}`);
        }

        // Also update standard fields to have proper order
        const standardFields = [
            { field_name: 'shop_id', display_order: 1 },
            { field_name: 'license_type_id', display_order: 2 },
            { field_name: 'license_number', display_order: 3 },
            { field_name: 'issue_date', display_order: 4 },
            { field_name: 'expiry_date', display_order: 5 },
            { field_name: 'status', display_order: 6 },
            { field_name: 'notes', display_order: 7 }
        ];

        for (const field of standardFields) {
            await sql`
                UPDATE custom_fields 
                SET display_order = ${field.display_order}
                WHERE entity_type = 'licenses' AND field_name = ${field.field_name}
            `;
            console.log(`✓ Updated display_order for standard field ${field.field_name} to ${field.display_order}`);
        }

        console.log('Display order updated successfully!');
        
        // Verify the order
        const fields = await sql`
            SELECT field_name, field_label, field_type, display_order 
            FROM custom_fields 
            WHERE entity_type = 'licenses' AND is_active = true
            ORDER BY display_order ASC
        `;
        
        console.log('\nCurrent field order:');
        fields.forEach(field => {
            console.log(`${field.display_order}. ${field.field_label} (${field.field_name}) - ${field.field_type}`);
        });

    } catch (error) {
        console.error('Error updating field order:', error);
    }
}

updateCustomFieldOrder();
