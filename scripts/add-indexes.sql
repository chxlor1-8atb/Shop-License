-- =====================================================
-- Performance Indexes for Neon PostgreSQL
-- Run this script in Neon SQL Editor or via psql
-- =====================================================

-- Enable pg_trgm extension for text search (optional)
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- Licenses Table Indexes
-- =====================================================

-- Status-based queries (most common filter)
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);

-- Shop-based queries (JOIN with shops)
CREATE INDEX IF NOT EXISTS idx_licenses_shop_id ON licenses(shop_id);

-- Expiry date queries (dashboard, notifications)
CREATE INDEX IF NOT EXISTS idx_licenses_expiry_date ON licenses(expiry_date);

-- License type filter
CREATE INDEX IF NOT EXISTS idx_licenses_license_type_id ON licenses(license_type_id);

-- Composite: Status + Expiry (for "expiring soon" queries)
CREATE INDEX IF NOT EXISTS idx_licenses_status_expiry 
ON licenses(status, expiry_date) 
WHERE status = 'active';

-- Composite: Shop + Type (for filtered lists)
CREATE INDEX IF NOT EXISTS idx_licenses_shop_type ON licenses(shop_id, license_type_id);

-- License number search (exact match)
CREATE INDEX IF NOT EXISTS idx_licenses_number ON licenses(license_number);

-- =====================================================
-- Shops Table Indexes
-- =====================================================

-- Shop name search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_shops_shop_name_lower ON shops(LOWER(shop_name));

-- For ILIKE queries (requires pg_trgm extension)
-- CREATE INDEX IF NOT EXISTS idx_shops_shop_name_gin ON shops USING gin(shop_name gin_trgm_ops);

-- =====================================================
-- Users Table Indexes
-- =====================================================

-- Username lookup (login)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =====================================================
-- Audit Logs Indexes (already partial, adding more)
-- =====================================================

-- Composite: User + Created (for user activity view)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created 
ON audit_logs(user_id, created_at DESC);

-- Action type filter
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Entity type filter
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);

-- =====================================================
-- Notification Logs Indexes
-- =====================================================

-- Sent date (for history queries)
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at DESC);

-- Status filter
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);

-- =====================================================
-- License Types Indexes
-- =====================================================

-- Name lookup
CREATE INDEX IF NOT EXISTS idx_license_types_name ON license_types(name);

-- =====================================================
-- Analyze tables after creating indexes
-- =====================================================
ANALYZE licenses;
ANALYZE shops;
ANALYZE users;
ANALYZE audit_logs;
ANALYZE notification_logs;
ANALYZE license_types;

-- =====================================================
-- Check created indexes
-- =====================================================
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
