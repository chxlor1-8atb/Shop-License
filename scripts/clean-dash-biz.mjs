import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
const sql = neon(process.env.DATABASE_URL);

const CF_TYPE = 128; // custom field \"ประเภท\"

console.log('=== ทำความสะอาด custom field \"ประเภท\" (id 128) ค่า \"-\" เป็นค่าว่าง ===');
const result = await sql`
    UPDATE custom_field_values
    SET field_value = ''
    WHERE custom_field_id = ${CF_TYPE}
      AND entity_type = 'licenses'
      AND field_value = '-'
    RETURNING id, field_value
`;
console.log(`✅ แก้ไข ${result.length} แถว`);
