# 🔄 Database Migration Plan

> **Project:** Shop License Management System  
> **Version:** 1.0.0  
> **Last Updated:** 2026-01-26  
> **Database:** Neon PostgreSQL (Serverless)

---

## 📋 สารบัญ

1. [ภาพรวมโปรเจกต์](#1-ภาพรวมโปรเจกต์)
2. [โครงสร้างฐานข้อมูลปัจจุบัน](#2-โครงสร้างฐานข้อมูลปัจจุบัน)
3. [คำสั่ง Migration พื้นฐาน](#3-คำสั่ง-migration-พื้นฐาน)
4. [การ Migrate ข้อมูลใหม่](#4-การ-migrate-ข้อมูลใหม่)
5. [Rollback Strategy](#5-rollback-strategy)
6. [Best Practices สำหรับ AI Agents](#6-best-practices-สำหรับ-ai-agents)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. ภาพรวมโปรเจกต์

### Tech Stack
| Category | Technology |
|----------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | JavaScript (ES6+), JSX |
| **Database** | Neon PostgreSQL (Serverless) |
| **Query Method** | Raw SQL with `@neondatabase/serverless` |
| **Auth** | iron-session (cookie-based) |
| **Password Hash** | bcryptjs |

### ข้อจำกัดสำคัญ
- ❌ **ห้ามใช้ TypeScript** - ใช้ JavaScript เท่านั้น
- ❌ **ห้ามใช้ Tailwind CSS** - ใช้ Vanilla CSS
- ❌ **ห้ามใช้ ORM** - ใช้ Raw SQL เท่านั้น
- ✅ ใช้ PostgreSQL Parameters: `$1, $2, $3...` (ไม่ใช่ `?`)

---

## 2. โครงสร้างฐานข้อมูลปัจจุบัน

### 2.1 Core Tables

```sql
-- Users Table (ผู้ใช้ระบบ)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,      -- bcrypt hashed
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',     -- 'admin' | 'user'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shops Table (ร้านค้า)
CREATE TABLE IF NOT EXISTS shops (
  id SERIAL PRIMARY KEY,
  shop_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255),
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',    -- Dynamic fields (V2)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- License Types Table (ประเภทใบอนุญาต)
CREATE TABLE IF NOT EXISTS license_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  validity_days INTEGER DEFAULT 365,
  price NUMERIC DEFAULT 0,             -- ราคา (V2)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Licenses Table (ใบอนุญาต)
CREATE TABLE IF NOT EXISTS licenses (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
  license_type_id INTEGER REFERENCES license_types(id) ON DELETE SET NULL,
  license_number VARCHAR(100) NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  status VARCHAR(50) DEFAULT 'active', -- 'active' | 'expired' | 'pending'
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',    -- Dynamic fields (V2)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 Notification Tables

```sql
-- Notification Settings (ตั้งค่าแจ้งเตือน Telegram)
CREATE TABLE IF NOT EXISTS notification_settings (
    id SERIAL PRIMARY KEY,
    telegram_bot_token VARCHAR(255),
    telegram_chat_id VARCHAR(255),
    days_before_expiry INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification Logs (ประวัติการแจ้งเตือน)
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    shop_name VARCHAR(255),
    status VARCHAR(50),
    message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.3 Audit & Logging Tables

```sql
-- Audit Logs (บันทึกกิจกรรม)
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

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
```

### 2.4 Dynamic Schema Tables (V2 Features)

```sql
-- Schema Definitions (กำหนด Dynamic Fields)
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

-- Custom Fields (ฟิลด์กำหนดเอง)
CREATE TABLE IF NOT EXISTS custom_fields (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,      -- 'shop' | 'license'
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) DEFAULT 'text', -- 'text' | 'number' | 'date' | 'select'
    field_options JSONB DEFAULT '[]',      -- Options for select type
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    show_in_table BOOLEAN DEFAULT true,
    show_in_form BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity_type, field_name)
);

-- Custom Field Values (ค่าของ Custom Field)
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
```

### 2.5 Entity Relationships

```
shops (1) ──────< (N) licenses
license_types (1) ──────< (N) licenses
users (1) ──────< (N) audit_logs
custom_fields (1) ──────< (N) custom_field_values
```

---

## 3. คำสั่ง Migration พื้นฐาน

### 3.1 รัน Full Schema Migration

```bash
# 1. ตรวจสอบ environment variables
echo $DATABASE_URL

# 2. รัน schema.sql
node -e "
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);
const schema = fs.readFileSync('schema.sql', 'utf-8');

sql(schema).then(() => console.log('Migration success!'))
           .catch(err => console.error('Migration failed:', err));
"

# 3. Verify tables
node scripts/list-tables.js
```

### 3.2 Migration Scripts ที่มีอยู่

| Script | Description | Command |
|--------|-------------|---------|
| `scripts/force-reset-all.js` | Reset ฐานข้อมูลทั้งหมด (⚠️ ลบข้อมูล) | `node scripts/force-reset-all.js` |
| `scripts/reset-db.js` | Reset tables | `node scripts/reset-db.js` |
| `scripts/migrate.mjs` | Run migrations | `node scripts/migrate.mjs` |
| `scripts/seed-sample.mjs` | เพิ่มข้อมูลตัวอย่าง | `node scripts/seed-sample.mjs` |
| `scripts/reset-password.js` | Reset password | `node scripts/reset-password.js` |
| `scripts/list-tables.js` | แสดงรายการ tables | `node scripts/list-tables.js` |
| `scripts/verify-db.js` | ตรวจสอบ connection | `node scripts/verify-db.js` |

### 3.3 Seed Initial Data

```sql
-- Initial Admin User (password: admin)
INSERT INTO users (username, password, full_name, role)
VALUES ('admin', '$2a$10$KmoCm3CWEYNAUhcnuvgM9OGe7fJUuES3Ru5juLpH5EaPxM8vNac3W', 'Administrator', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Initial Notification Settings
INSERT INTO notification_settings (id, days_before_expiry, is_active)
VALUES (1, 30, false)
ON CONFLICT (id) DO NOTHING;
```

---

## 4. การ Migrate ข้อมูลใหม่

### 4.1 เพิ่ม Column ใหม่

```sql
-- Pattern: เพิ่ม column ใหม่พร้อม default value
ALTER TABLE <table_name> ADD COLUMN IF NOT EXISTS <column_name> <type> DEFAULT <default_value>;

-- Example: เพิ่ม status_color ใน licenses
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS status_color VARCHAR(20) DEFAULT '#10b981';

-- Example: เพิ่ม priority ใน shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
```

### 4.2 สร้าง Table ใหม่

```sql
-- Pattern สำหรับ table ใหม่
CREATE TABLE IF NOT EXISTS <table_name> (
    id SERIAL PRIMARY KEY,
    -- columns...
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- สร้าง indexes
CREATE INDEX IF NOT EXISTS idx_<table_name>_<column> ON <table_name>(<column>);
```

### 4.3 เพิ่ม Foreign Key

```sql
-- Pattern: Add FK with safe deletion
ALTER TABLE <child_table> 
ADD CONSTRAINT fk_<name> 
FOREIGN KEY (<column>) 
REFERENCES <parent_table>(id) 
ON DELETE CASCADE;  -- หรือ ON DELETE SET NULL
```

### 4.4 Migration Script Template

```javascript
// scripts/migrate-<feature>.js
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
    console.log('🚀 Starting migration...');
    
    try {
        // Step 1: Create new table or add columns
        await sql`
            ALTER TABLE shops 
            ADD COLUMN IF NOT EXISTS new_field VARCHAR(100)
        `;
        console.log('✅ Added new_field column');

        // Step 2: Create indexes if needed
        await sql`
            CREATE INDEX IF NOT EXISTS idx_shops_new_field 
            ON shops(new_field)
        `;
        console.log('✅ Created index');

        // Step 3: Seed data if needed
        await sql`
            UPDATE shops 
            SET new_field = 'default_value' 
            WHERE new_field IS NULL
        `;
        console.log('✅ Seeded default values');

        console.log('🎉 Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
```

---

## 5. Rollback Strategy

### 5.1 ก่อน Migration เสมอ

```bash
# 1. Backup database (Neon สนับสนุน point-in-time recovery)
# ใช้ Neon Console เพื่อ backup หรือ branch

# 2. หรือ export ข้อมูลสำคัญก่อน
node -e "
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function backup() {
    const shops = await sql\`SELECT * FROM shops\`;
    const licenses = await sql\`SELECT * FROM licenses\`;
    
    const fs = require('fs');
    fs.writeFileSync('backup-shops.json', JSON.stringify(shops, null, 2));
    fs.writeFileSync('backup-licenses.json', JSON.stringify(licenses, null, 2));
    console.log('Backup created!');
}
backup();
"
```

### 5.2 Rollback Commands

```sql
-- ลบ column ที่เพิ่มไป
ALTER TABLE shops DROP COLUMN IF EXISTS new_field;

-- ลบ table ที่สร้างไป
DROP TABLE IF EXISTS new_table CASCADE;

-- ลบ index
DROP INDEX IF EXISTS idx_shops_new_field;

-- ลบ constraint
ALTER TABLE child_table DROP CONSTRAINT IF EXISTS fk_name;
```

### 5.3 Neon Branch Strategy (Recommended)

```bash
# 1. สร้าง branch สำหรับ test migration
# (ทำผ่าน Neon Console หรือ API)

# 2. รัน migration บน branch
DATABASE_URL=<branch-url> node scripts/migrate-feature.js

# 3. ถ้า OK ให้ merge กลับ main branch
# (ทำผ่าน Neon Console)
```

---

## 6. Best Practices สำหรับ AI Agents

### 6.1 ก่อนเปลี่ยนแปลง Schema

```markdown
## Checklist
- [ ] อ่าน schema.sql เพื่อเข้าใจ structure ปัจจุบัน
- [ ] ตรวจสอบ entity relationships
- [ ] ใช้ `IF NOT EXISTS` / `IF EXISTS` ใน SQL
- [ ] เตรียม rollback script
- [ ] Test บน development ก่อน production
```

### 6.2 SQL Query Standards

```javascript
// ✅ CORRECT - ใช้ $1, $2 สำหรับ parameters
const shop = await query('SELECT * FROM shops WHERE id = $1', [shopId]);

// ❌ WRONG - ห้ามใช้ string concatenation
const shop = await query(`SELECT * FROM shops WHERE id = ${shopId}`);

// ❌ WRONG - ห้ามใช้ MySQL style (?)
const shop = await query('SELECT * FROM shops WHERE id = ?', [shopId]);
```

### 6.3 Database Helper Functions (src/lib/db.js)

```javascript
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// Query with parameters
export async function query(sqlString, params = []) {
    return await sql(sqlString, params);
}

// Fetch one record
export async function fetchOne(sqlString, params = []) {
    const results = await sql(sqlString, params);
    return results[0] || null;
}

// Insert and return new ID
export async function insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`);
    
    const result = await sql(`
        INSERT INTO ${table} (${keys.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING id
    `, values);
    
    return result[0]?.id;
}

// Update records
export async function update(table, data, whereClause, whereParams = []) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    
    // Convert ? to $n for whereClause
    let paramIndex = keys.length;
    const pgWhereClause = whereClause.replace(/\?/g, () => `$${++paramIndex}`);
    
    await sql(`
        UPDATE ${table}
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE ${pgWhereClause}
    `, [...values, ...whereParams]);
}

// Delete records
export async function remove(table, whereClause, whereParams = []) {
    let paramIndex = 0;
    const pgWhereClause = whereClause.replace(/\?/g, () => `$${++paramIndex}`);
    
    await sql(`DELETE FROM ${table} WHERE ${pgWhereClause}`, whereParams);
}
```

### 6.4 Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
SESSION_SECRET=your_32_character_secret_here

# Optional (Telegram Notifications)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

---

## 7. Troubleshooting

### 7.1 Common Errors

| Error | Solution |
|-------|----------|
| `relation "xxx" does not exist` | รัน `schema.sql` เพื่อสร้าง tables |
| `duplicate key value violates unique constraint` | ใช้ `ON CONFLICT DO NOTHING` หรือ `ON CONFLICT DO UPDATE` |
| `cannot drop table xxx because other objects depend on it` | ใช้ `DROP TABLE xxx CASCADE` |
| `column "xxx" of relation "yyy" already exists` | ใช้ `IF NOT EXISTS` ใน ALTER TABLE |
| `connection refused` | ตรวจสอบ DATABASE_URL และ Neon project status |

### 7.2 Debug Commands

```bash
# ตรวจสอบ connection
node scripts/verify-db.js

# ดู tables ทั้งหมด
node scripts/list-tables.js

# ตรวจสอบ user ใน database
node scripts/check-user.js

# Debug expiring licenses
node scripts/debug-expiring.js
```

### 7.3 Reset Everything (⚠️ ลบข้อมูลทั้งหมด)

```bash
# Full reset - ลบทุก table แล้วสร้างใหม่
node scripts/force-reset-all.js

# Seed sample data
node scripts/seed-sample.mjs
```

---

## 📝 Migration History

| Date | Version | Description | Status |
|------|---------|-------------|--------|
| 2026-01-01 | 1.0.0 | Initial schema (users, shops, licenses, license_types) | ✅ Done |
| 2026-01-02 | 1.1.0 | Added notification tables | ✅ Done |
| 2026-01-03 | 1.2.0 | Added audit_logs table | ✅ Done |
| 2026-01-05 | 2.0.0 | Added custom_fields system (dynamic schema) | ✅ Done |
| 2026-01-10 | 2.1.0 | Added JSONB custom_fields to shops/licenses | ✅ Done |
| 2026-01-15 | 2.2.0 | Added price column to license_types | ✅ Done |

---

## 🔗 Related Files

- `schema.sql` - Full database schema definition
- `AGENTS.md` - AI coding guidelines
- `scripts/` - All migration and utility scripts
- `src/lib/db.js` - Database helper functions
- `src/lib/session.js` - Session configuration

---

**Last Updated:** 2026-01-26  
**Maintainer:** AI Agent Compatible
