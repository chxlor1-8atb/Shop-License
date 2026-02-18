-- Performance optimization indexes for Shop License System
-- Run this script to improve query performance

-- Shops table indexes
CREATE INDEX IF NOT EXISTS idx_shops_shop_name ON shops(shop_name);
CREATE INDEX IF NOT EXISTS idx_shops_owner_name ON shops(owner_name);
CREATE INDEX IF NOT EXISTS idx_shops_phone ON shops(phone);
CREATE INDEX IF NOT EXISTS idx_shops_email ON shops(email);
CREATE INDEX IF NOT EXISTS idx_shops_created_at ON shops(created_at);

-- License types table indexes
CREATE INDEX IF NOT EXISTS idx_license_types_name ON license_types(name);
CREATE INDEX IF NOT EXISTS idx_license_types_created_at ON license_types(created_at);

-- Licenses table indexes
CREATE INDEX IF NOT EXISTS idx_licenses_shop_id ON licenses(shop_id);
CREATE INDEX IF NOT EXISTS idx_licenses_license_type_id ON licenses(license_type_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_expiry_date ON licences(expiry_date);
CREATE INDEX IF NOT EXISTS idx_licenses_created_at ON licenses(created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_licenses_shop_status ON licenses(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_licenses_shop_expiry ON licenses(shop_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_licenses_type_status ON licenses(license_type_id, status);

-- Full-text search indexes (if supported)
-- CREATE INDEX IF NOT EXISTS idx_shops_search ON shops USING gin(to_tsvector('thai', shop_name || ' ' || owner_name || ' ' || address));

-- Custom fields indexes
CREATE INDEX IF NOT EXISTS idx_custom_fields_entity_type ON custom_fields(entity_type);
CREATE INDEX IF NOT EXISTS idx_custom_fields_is_active ON custom_fields(is_active);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON custom_field_values(entity_type, entity_id);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- Analyze tables to update statistics
ANALYZE shops;
ANALYZE license_types;
ANALYZE licenses;
ANALYZE custom_fields;
ANALYZE custom_field_values;
ANALYZE activity_logs;

-- Report completion
SELECT 'Performance indexes created successfully' as status;
