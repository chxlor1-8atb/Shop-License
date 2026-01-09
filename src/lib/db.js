import { neon, neonConfig } from '@neondatabase/serverless';

// ===== Neon Performance Optimization =====
// Enable connection caching for faster subsequent queries
neonConfig.fetchConnectionCache = true;

// Create Neon SQL client
let sql;
try {
    if (!process.env.DATABASE_URL) {
        console.warn('Warning: DATABASE_URL is not defined');
    }
    // Initialize with optimized settings
    sql = neon(process.env.DATABASE_URL || 'postgres://user:pass@host/db');
} catch (e) {
    console.error('Failed to initialize Neon client:', e);
    sql = async () => []; // No-op fallback
}

// Database helper functions
export async function query(sqlQuery, params = []) {
    const results = await sql(sqlQuery, params);
    return results;
}

export const executeQuery = query;

export async function fetchOne(sqlQuery, params = []) {
    const results = await query(sqlQuery, params);
    return results[0] || null;
}

export async function fetchAll(sqlQuery, params = []) {
    return await query(sqlQuery, params);
}

export async function insert(table, data) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(data);

    const sqlQuery = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING id`;
    const result = await sql(sqlQuery, values);
    return result[0]?.id;
}

export async function update(table, data, where, whereParams = []) {
    const setClause = Object.keys(data).map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = [...Object.values(data), ...whereParams];
    const whereOffset = Object.keys(data).length + 1;

    // Replace ? with $n in where clause
    let paramIndex = whereOffset;
    const whereClause = where.replace(/\?/g, () => `$${paramIndex++}`);

    const sqlQuery = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const result = await sql(sqlQuery, values);
    return result.length;
}

export async function remove(table, where, params = []) {
    // Replace ? with $n in where clause
    let paramIndex = 1;
    const whereClause = where.replace(/\?/g, () => `$${paramIndex++}`);

    const sqlQuery = `DELETE FROM ${table} WHERE ${whereClause}`;
    const result = await sql(sqlQuery, params);
    return result.length;
}

export default sql;
