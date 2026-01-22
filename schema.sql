
-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shops Table
CREATE TABLE IF NOT EXISTS shops (
  id SERIAL PRIMARY KEY,
  shop_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255),
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- License Types Table
CREATE TABLE IF NOT EXISTS license_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  validity_days INTEGER DEFAULT 365,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Licenses Table
CREATE TABLE IF NOT EXISTS licenses (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
  license_type_id INTEGER REFERENCES license_types(id) ON DELETE SET NULL,
  license_number VARCHAR(100) NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification Settings
CREATE TABLE IF NOT EXISTS notification_settings (
    id SERIAL PRIMARY KEY,
    telegram_bot_token VARCHAR(255),
    telegram_chat_id VARCHAR(255),
    days_before_expiry INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification Logs
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    shop_name VARCHAR(255),
    status VARCHAR(50), 
    message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs (Activity History)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Initial Admin User (password: admin)
INSERT INTO users (username, password, full_name, role)
VALUES ('admin', '$2a$10$YourHashHereOrGeneratedInScript', 'Administrator', 'admin')
ON CONFLICT (username) DO NOTHING;

INSERT INTO notification_settings (id, days_before_expiry, is_active)
VALUES (1, 30, false)
ON CONFLICT (id) DO NOTHING;

-- V2: Dynamic Schema Support
ALTER TABLE shops ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

CREATE TABLE IF NOT EXISTS schema_definitions (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    column_key VARCHAR(50) NOT NULL,
    column_label VARCHAR(100) NOT NULL,
    column_type VARCHAR(20) DEFAULT 'text',
    is_required BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(table_name, column_key)
);

ALTER TABLE license_types ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

-- Custom Fields System
CREATE TABLE IF NOT EXISTS custom_fields (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) DEFAULT 'text',
    field_options JSONB DEFAULT '[]',
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    show_in_table BOOLEAN DEFAULT true,
    show_in_form BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity_type, field_name)
);

CREATE TABLE IF NOT EXISTS custom_field_values (
    id SERIAL PRIMARY KEY,
    custom_field_id INTEGER REFERENCES custom_fields(id) ON DELETE CASCADE,
    entity_id INTEGER NOT NULL,
    field_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(custom_field_id, entity_id)
);

-- Indexes for custom fields
CREATE INDEX IF NOT EXISTS idx_custom_fields_entity_type ON custom_fields(entity_type);
CREATE INDEX IF NOT EXISTS idx_custom_fields_active ON custom_fields(is_active);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON custom_field_values(entity_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_field ON custom_field_values(custom_field_id);
