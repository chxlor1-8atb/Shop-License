import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
const sql = neon(process.env.DATABASE_URL);

console.log('=== shops.shop_name constraint ===');
const cols = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'shops' AND column_name IN ('shop_name','owner_name')
`;
console.table(cols);

console.log('\n=== มี shop_name เป็น empty string อยู่แล้วกี่แถว? ===');
const empty = await sql`SELECT COUNT(*)::int AS cnt FROM shops WHERE shop_name = '' OR shop_name IS NULL`;
console.table(empty);
