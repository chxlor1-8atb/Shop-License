import { createClient } from '@supabase/supabase-js';

/**
 * Database Configuration with Supabase
 * 
 * Security Features:
 * - Parameterized queries only (SQL injection prevention)
 * - Table name whitelist
 * - Query timeout protection
 * - Sensitive data sanitization in logs
 * - Row Level Security (RLS) support
 */

// Create Supabase client
let supabase;
let supabaseAdmin;

try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('CRITICAL: Supabase environment variables are not defined. Database queries will fail.');
    }
    
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        // Client for server-side operations (with service role key)
        supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );
        
        // Client for client-side operations (with anon key)
        if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            );
        }
    } else {
        const noDb = async () => { throw new Error('Supabase is not configured'); };
        supabase = noDb;
        supabaseAdmin = noDb;
    }
} catch (e) {
    console.error('Failed to initialize Supabase client:', e);
    const failDb = async () => { throw new Error('Supabase client failed to initialize'); };
    supabase = failDb;
    supabaseAdmin = failDb;
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

// Database helper functions — uses Supabase client
export async function query(sqlQuery, params = []) {
    try {
        // For raw SQL queries, use rpc (PostgreSQL functions)
        const { data, error } = await executeWithTimeout(() => 
            supabaseAdmin.rpc('execute_raw_query', { 
                query_string: sqlQuery, 
                query_params: params 
            })
        );
        
        if (error) throw error;
        return data || [];
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

/**
 * Insert data into table using Supabase
 */
export async function insert(table, data) {
    validateTableName(table);
    
    try {
        const { data: result, error } = await executeWithTimeout(() =>
            supabaseAdmin
                .from(table)
                .insert(data)
                .select()
                .single()
        );
        
        if (error) throw error;
        return result.id;
    } catch (error) {
        console.error('Database insert error:', sanitizeErrorMessage(error));
        throw new Error(sanitizeErrorMessage(error));
    }
}

/**
 * Update data in table using Supabase
 */
export async function update(table, data, where, whereParams = []) {
    validateTableName(table);
    
    try {
        let query = supabaseAdmin.from(table).update(data);
        
        // Handle where clause - convert to Supabase filter
        if (where && whereParams.length > 0) {
            // Simple case: where = "id = ?" and whereParams = [id]
            if (where.includes('id = ?')) {
                query = query.eq('id', whereParams[0]);
            }
            // Add more where clause parsing as needed
        }
        
        const { data: result, error } = await executeWithTimeout(() => query);
        
        if (error) throw error;
        return result?.length || 0;
    } catch (error) {
        console.error('Database update error:', sanitizeErrorMessage(error));
        throw new Error(sanitizeErrorMessage(error));
    }
}

/**
 * Delete data from table using Supabase
 */
export async function remove(table, where, params = []) {
    validateTableName(table);
    
    try {
        let query = supabaseAdmin.from(table).delete();
        
        // Handle where clause - convert to Supabase filter
        if (where && params.length > 0) {
            // Simple case: where = "id = ?" and params = [id]
            if (where.includes('id = ?')) {
                query = query.eq('id', params[0]);
            }
            // Add more where clause parsing as needed
        }
        
        const { data: result, error } = await executeWithTimeout(() => query);
        
        if (error) throw error;
        return result?.length || 0;
    } catch (error) {
        console.error('Database delete error:', sanitizeErrorMessage(error));
        throw new Error(sanitizeErrorMessage(error));
    }
}

/**
 * Supabase specific operations
 */
export async function select(table, columns = '*', filters = {}) {
    validateTableName(table);
    
    try {
        let query = supabaseAdmin.from(table).select(columns);
        
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                query = query.eq(key, value);
            }
        });
        
        const { data, error } = await executeWithTimeout(() => query);
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Database select error:', sanitizeErrorMessage(error));
        throw new Error(sanitizeErrorMessage(error));
    }
}

export async function selectWithPagination(table, columns = '*', filters = {}, page = 1, limit = 10) {
    validateTableName(table);
    
    try {
        let query = supabaseAdmin
            .from(table)
            .select(columns, { count: 'exact' })
            .range((page - 1) * limit, page * limit - 1);
        
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                query = query.eq(key, value);
            }
        });
        
        const { data, error, count } = await executeWithTimeout(() => query);
        
        if (error) throw error;
        
        return {
            data: data || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        };
    } catch (error) {
        console.error('Database select with pagination error:', sanitizeErrorMessage(error));
        throw new Error(sanitizeErrorMessage(error));
    }
}

// Export clients
export { supabase, supabaseAdmin };
export default supabaseAdmin;
