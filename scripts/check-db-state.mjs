import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL);

console.log('=== 1) license_types (ทั้งหมด) ===');
const types = await sql`SELECT id, name, price FROM license_types ORDER BY id`;
console.table(types);

console.log('\n=== 2) custom_fields สำหรับ licenses ===');
const cfs = await sql`
    SELECT id, entity_type, field_name, field_label, field_type, is_active, show_in_table
    FROM custom_fields
    WHERE entity_type = 'licenses'
    ORDER BY id
`;
console.table(cfs);

console.log('\n=== 3) custom_field_values table schema ===');
const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'custom_field_values'
    ORDER BY ordinal_position
`;
console.table(cols);

console.log('\n=== 4) ตัวอย่าง custom_field_values 5 แถวล่าสุด ===');
const sample = await sql`
    SELECT cfv.id, cfv.custom_field_id, cfv.entity_id, cfv.entity_type, cfv.field_value, cf.field_name
    FROM custom_field_values cfv
    LEFT JOIN custom_fields cf ON cf.id = cfv.custom_field_id
    ORDER BY cfv.id DESC
    LIMIT 5
`;
console.table(sample);

console.log('\n=== 5) ตัวอย่าง licenses ล่าสุด 3 แถว ===');
const lics = await sql`
    SELECT id, shop_id, license_type_id, license_number, issue_date, expiry_date, status
    FROM licenses ORDER BY id DESC LIMIT 3
`;
console.table(lics);

console.log('\n=== 6) shops ล่าสุด 3 แถว ===');
const shops = await sql`
    SELECT id, shop_name, owner_name, phone FROM shops ORDER BY id DESC LIMIT 3
`;
console.table(shops);
