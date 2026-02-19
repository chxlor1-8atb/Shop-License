import { neon, neonConfig } from '@neondatabase/serverless';

/**
 * Database Configuration with Enhanced Security
 * 
 * Security Features:
 * - Parameterized queries only (SQL injection prevention)
 * - Table name whitelist
 * - Query timeout protection
 * - Sensitive data sanitization in logs
 */

// Create Neon SQL client
let sql;
try {
    if (!process.env.DATABASE_URL) {
        console.error('CRITICAL: DATABASE_URL is not defined. Database queries will fail.');
    }
    // Initialize with optimized settings
    sql = process.env.DATABASE_URL
        ? neon(process.env.DATABASE_URL)
        : async () => { throw new Error('DATABASE_URL is not configured'); };
} catch (e) {
    console.error('Failed to initialize Neon client:', e);
    sql = async () => { throw new Error('Database client failed to initialize'); };
}

// Query timeout in milliseconds (30 seconds)
const QUERY_TIMEOUT = 30000;

/**
 * Sanitize error message to prevent information leakage
 */
function sanitizeErrorMessage(error) {
    if (process.env.NODE_ENV === 'production') {
        // Don't leak internal error details in production
        if (error.message?.includes('ECONNREFUSED') ||
            error.message?.includes('connection')) {
            return 'Database connection error';
        }
        if (error.message?.includes('syntax')) {
            return 'Invalid query format';
        }
        return 'Database operation failed';
    }
    return error.message;
}

/**
 * Execute query with timeout protection
 */
async function executeWithTimeout(queryFn, timeout = QUERY_TIMEOUT) {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout exceeded')), timeout);
    });
    return Promise.race([queryFn(), timeoutPromise]);
}

// Database helper functions
export async function query(sqlQuery, params = []) {
    try {
        return await executeWithTimeout(() => sql(sqlQuery, params));
    } catch (error) {
        console.error('Database query error:', sanitizeErrorMessage(error));
        throw new Error(sanitizeErrorMessage(error));
    }
}

export const executeQuery = query;

export async function fetchOne(sqlQuery, params = []) {
    const results = await query(sqlQuery, params);
    return results[0] || null;
}

export async function fetchAll(sqlQuery, params = []) {
    return await query(sqlQuery, params);
}

// Security: Whitelist of allowed table names to prevent SQL injection
const ALLOWED_TABLES = [
    'users',
    'shops',
    'licenses',
    'license_types',
    'custom_fields',
    'custom_field_values',
    'audit_logs',
    'entities',
    'entity_fields',
    'entity_records'
];

/**
 * Validate table name against whitelist to prevent SQL injection
 */
function validateTableName(table) {
    if (!ALLOWED_TABLES.includes(table)) {
        throw new Error(`Invalid table name: ${table}`);
    }
    return table;
}

/**
 * Validate column name to prevent SQL injection via dynamic column names
 * Only allows alphanumeric characters and underscores
 */
function validateColumnName(column) {
    if (typeof column !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
        throw new Error(`Invalid column name: ${column}`);
    }
    return column;
}

export async function insert(table, data) {
    validateTableName(table);
    const keys = Object.keys(data);
    keys.forEach(validateColumnName);
    const columns = keys.join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(data);

    const sqlQuery = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING id`;
    const result = await sql(sqlQuery, values);
    return result[0]?.id;
}

export async function update(table, data, where, whereParams = []) {
    validateTableName(table);
    const keys = Object.keys(data);
    keys.forEach(validateColumnName);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
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
    validateTableName(table);
    // Replace ? with $n in where clause
    let paramIndex = 1;
    const whereClause = where.replace(/\?/g, () => `$${paramIndex++}`);

    const sqlQuery = `DELETE FROM ${table} WHERE ${whereClause}`;
    const result = await sql(sqlQuery, params);
    return result.length;
}

export default sql;
