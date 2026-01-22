import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_dmWJrab3uSP5@ep-lively-bird-a1vsnlbg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

async function fixFinalFieldOrder() {
    try {
        console.log('Fixing final field order...');

        // Get all active fields and assign sequential order
        const activeFields = await sql`
            SELECT field_name, field_label
            FROM custom_fields 
            WHERE entity_type = 'licenses' AND is_active = true
            ORDER BY field_name
        `;

        console.log('Setting sequential display order for all active fields:');
        
        let order = 1;
        for (const field of activeFields) {
            await sql`
                UPDATE custom_fields 
                SET display_order = ${order}
                WHERE entity_type = 'licenses' AND field_name = ${field.field_name} AND is_active = true
            `;
            console.log(`${order}. ${field.field_label} (${field.field_name})`);
            order++;
        }

        // Final verification
        const finalFields = await sql`
            SELECT field_name, field_label, field_type, display_order 
            FROM custom_fields 
            WHERE entity_type = 'licenses' AND is_active = true
            ORDER BY display_order ASC
        `;
        
        console.log('\nFinal verified field order:');
        finalFields.forEach(field => {
            console.log(`${field.display_order}. ${field.field_label} (${field.field_name}) - ${field.field_type}`);
        });

    } catch (error) {
        console.error('Error fixing field order:', error);
    }
}

fixFinalFieldOrder();
