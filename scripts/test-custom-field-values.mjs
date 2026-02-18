import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env vars
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} else {
    console.warn('.env.local not found!');
}

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing');
    process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function testCustomFieldValues() {
    console.log('Testing custom_field_values API...');
    
    try {
        // First, let's check if the table exists and has the right columns
        const columns = await sql(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'custom_field_values'
            ORDER BY ordinal_position
        `);
        
        console.log('custom_field_values table structure:');
        columns.forEach(col => {
            console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
        });
        
        // Check if trigger exists
        const triggers = await sql(`
            SELECT trigger_name, event_manipulation, action_timing
            FROM information_schema.triggers 
            WHERE event_object_table = 'custom_field_values'
        `);
        
        console.log('\nTriggers on custom_field_values:');
        if (triggers.length === 0) {
            console.log('No triggers found');
        } else {
            triggers.forEach(t => {
                console.log(`- ${t.trigger_name}: ${t.event_manipulation} (${t.action_timing})`);
            });
        }
        
        // Test the upsert query
        console.log('\nTesting upsert query...');
        
        // Get a sample custom field and entity
        const customField = await sql(`
            SELECT id FROM custom_fields 
            WHERE entity_type = 'license_types' 
            LIMIT 1
        `);
        
        if (customField.length === 0) {
            console.log('No custom fields found for license_types, creating one...');
            const newField = await sql(`
                INSERT INTO custom_fields (entity_type, field_name, field_label, field_type, is_active)
                VALUES ('license_types', 'test_field', 'Test Field', 'text', true)
                RETURNING id
            `);
            customField.push(newField[0]);
        }
        
        const fieldId = customField[0].id;
        const testEntityId = 1; // Assuming there's at least one license_type
        
        console.log(`Using field_id: ${fieldId}, entity_id: ${testEntityId}`);
        
        // Test the upsert
        await sql(`
            INSERT INTO custom_field_values(custom_field_id, entity_id, field_value)
            VALUES($1, $2, $3)
            ON CONFLICT(custom_field_id, entity_id) 
            DO UPDATE SET field_value = EXCLUDED.field_value, updated_at = NOW()
        `, [fieldId, testEntityId, 'test_value_' + Date.now()]);
        
        console.log('✅ Upsert query executed successfully!');
        
        // Verify the result
        const result = await sql(`
            SELECT * FROM custom_field_values 
            WHERE custom_field_id = $1 AND entity_id = $2
        `, [fieldId, testEntityId]);
        
        console.log('Result:', result[0]);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testCustomFieldValues();
