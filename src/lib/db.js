import pg from 'pg';

const { Pool } = pg;

/**
 * Database Configuration — PostgreSQL via Neon
 * 
 * เชื่อมต่อ Neon ผ่าน PostgreSQL connection string โดยตรง
 * ใช้ pg library กับ connection pooling สำหรับ performance ที่ดี
 * 
 * Security Features:
 * - Parameterized queries only (SQL injection prevention)
 * - Connection pooling with limits
 * - Query timeout protection (30s)
 * - SSL/TLS encryption (Neon requires proper SSL)
 * - Sensitive data sanitization in production logs
 */

// ===== Singleton Connection Pool =====
let pool;

function getPool() {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;

        if (!connectionString) {
            console.error('❌ CRITICAL: DATABASE_URL is not defined. Database queries will fail.');
            throw new Error('DATABASE_URL environment variable is not set');
        }

        // Debug: Log the active database host
        try {
            const url = new URL(connectionString);
            console.log('🔌 Database connecting to host:', url.host);
        } catch (e) {
            console.log('🔌 Database connecting (could not parse host)');
        }

        pool = new Pool({
            connectionString,
            max: 10,                       // Maximum connections in pool
            idleTimeoutMillis: 30000,      // Close idle connections after 30s
            connectionTimeoutMillis: 10000, // Timeout waiting for connection: 10s
            ssl: {
                rejectUnauthorized: true    // Neon requires proper SSL verification
            }
        });

        // Handle unexpected pool errors
        pool.on('error', (err) => {
            console.error('❌ Unexpected database pool error:', err.message);
        });

        console.log('✅ Database pool created successfully');
    }
    return pool;
}

// ===== Configuration =====

/** Query timeout in milliseconds */
const QUERY_TIMEOUT = 30000; // 30 seconds

// ===== Error Handling =====

/**
 * Sanitize error message to prevent information leakage in production
 * @param {Error} error 
 * @returns {string}
 */
function sanitizeErrorMessage(error) {
    if (process.env.NODE_ENV === 'production') {
        if (error.message?.includes('ECONNREFUSED') ||
            error.message?.includes('connection') ||
            error.message?.includes('timeout')) {
            return 'Database connection error';
        }
        if (error.message?.includes('syntax')) {
            return 'Invalid query format';
        }
        if (error.message?.includes('duplicate')) {
            return 'Duplicate entry detected';
        }
        if (error.message?.includes('violates')) {
            return 'Data constraint violation';
        }
        return 'Database operation failed';
    }
    return error.message;
}

// ===== Core Query Functions =====

/**
 * Execute a SQL query with parameterized values
 * 
 * @param {string} sqlQuery - SQL query with $1, $2, ... placeholders
 * @param {Array} params - Parameter values (automatically sanitized by pg)
 * @returns {Promise<Array>} - Array of result rows
 * 
 * @example
 * // SELECT
 * const users = await query('SELECT * FROM users WHERE role = $1', ['admin']);
 * 
 * // INSERT with RETURNING
 * const result = await query('INSERT INTO shops (name) VALUES ($1) RETURNING id', ['My Shop']);
 * const newId = result[0].id;
 * 
 * // UPDATE
 * await query('UPDATE licenses SET status = $1 WHERE id = $2', ['active', 5]);
 */
export async function query(sqlQuery, params = []) {
    const db = getPool();

    try {
        const result = await db.query({
            text: sqlQuery,
            values: params,
            statement_timeout: QUERY_TIMEOUT
        });

        return result.rows;
    } catch (error) {
        console.error('❌ Database query error:', sanitizeErrorMessage(error));
        if (process.env.NODE_ENV !== 'production') {
            console.error('   Query:', sqlQuery.substring(0, 200));
            console.error('   Params:', params.map((p, i) => `$${i + 1}=${typeof p}`).join(', '));
        }
        throw new Error(sanitizeErrorMessage(error));
    }
}

/**
 * Alias for query() — used by API routes
 */
export const executeQuery = query;

/**
 * Execute query and return only the first row (or null)
 * 
 * @param {string} sqlQuery - SQL query
 * @param {Array} params - Parameter values
 * @returns {Promise<Object|null>} - First row or null
 * 
 * @example
 * const user = await fetchOne('SELECT * FROM users WHERE id = $1', [1]);
 * if (user) console.log(user.username);
 */
export async function fetchOne(sqlQuery, params = []) {
    const results = await query(sqlQuery, params);
    return results[0] || null;
}

/**
 * Execute query and return all rows
 * 
 * @param {string} sqlQuery - SQL query
 * @param {Array} params - Parameter values
 * @returns {Promise<Array>} - All result rows
 * 
 * @example
 * const shops = await fetchAll('SELECT * FROM shops ORDER BY id DESC');
 */
export async function fetchAll(sqlQuery, params = []) {
    return await query(sqlQuery, params);
}

// ===== Transaction Support =====

/**
 * Execute multiple queries in a single transaction
 * 
 * @param {Function} callback - Async function receiving a client
 * @returns {Promise<any>} - Result of the callback
 * 
 * @example
 * await transaction(async (client) => {
 *     await client.query('INSERT INTO shops (name) VALUES ($1)', ['Shop A']);
 *     await client.query('INSERT INTO licenses (shop_id) VALUES ($1)', [1]);
 * });
 */
export async function transaction(callback) {
    const db = getPool();
    const client = await db.connect();

    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Transaction error:', sanitizeErrorMessage(error));
        throw new Error(sanitizeErrorMessage(error));
    } finally {
        client.release();
    }
}

// ===== Utility Functions =====

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
export async function testConnection() {
    try {
        const result = await query('SELECT NOW() as current_time');
        console.log('✅ Database connected:', result[0]?.current_time);
        return true;
    } catch (error) {
        console.error('❌ Database connection test failed:', error.message);
        return false;
    }
}

/**
 * Get the connection pool instance (for advanced use cases)
 * @returns {Pool}
 */
export function getDbPool() {
    return getPool();
}

/**
 * Gracefully close the connection pool
 * (useful for cleanup in tests or shutdown)
 */
export async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('✅ Database pool closed');
    }
}

// ===== Default Export =====
// Default export as query function (for backward compatibility)
export default query;
