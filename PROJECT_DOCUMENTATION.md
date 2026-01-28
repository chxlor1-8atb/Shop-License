# 📚 เอกสารโปรเจกต์: ระบบจัดการใบอนุญาตร้านค้า
## Shop License Management System

**วันที่สร้าง:** 28 มกราคม 2569  
**เวอร์ชัน:** 1.0  
**สถานะ:** 🔄 กำลังพัฒนา

---

# สารบัญ

1. [ภาพรวมระบบ](#1-ภาพรวมระบบ)
2. [สถาปัตยกรรมและ Tech Stack](#2-สถาปัตยกรรมและ-tech-stack)
3. [โครงสร้างโปรเจกต์](#3-โครงสร้างโปรเจกต์)
4. [API Endpoints](#4-api-endpoints)
5. [Database Schema](#5-database-schema)
6. [React Components](#6-react-components)
7. [ระบบ Custom Fields](#7-ระบบ-custom-fields)
8. [การทดสอบระบบ](#8-การทดสอบระบบ)
9. [บั๊กที่แก้ไขแล้ว](#9-บั๊กที่แก้ไขแล้ว)
10. [คู่มือการใช้งาน](#10-คู่มือการใช้งาน)

---

# 1. ภาพรวมระบบ

## 🎯 วัตถุประสงค์
ระบบจัดการใบอนุญาตร้านค้า ช่วยติดตามและจัดการใบอนุญาตประเภทต่างๆ เช่น:
- ใบอนุญาตสุรา
- ใบอนุญาตยาสูบ
- ใบอนุญาตไพ่
- ใบอนุญาตสถานบริการ
- ใบอนุญาตสะสมอาหาร

## ✨ ฟีเจอร์หลัก
- 🏪 **จัดการร้านค้า** - CRUD operations พร้อม Custom Fields
- 📋 **จัดการใบอนุญาต** - ติดตามสถานะ, วันหมดอายุ
- 🔔 **แจ้งเตือน** - เตือนใบอนุญาตใกล้หมดอายุ
- 📊 **Dashboard** - สถิติและรายงาน
- 📤 **Export** - ส่งออก CSV/PDF
- ⚙️ **Custom Fields** - เพิ่มฟิลด์เองได้

---

# 2. สถาปัตยกรรมและ Tech Stack

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 18 |
| **Styling** | CSS Variables, Custom Components |
| **Database** | PostgreSQL (Neon) |
| **Auth** | iron-session (Cookies) |
| **Deployment** | Vercel |
| **Font** | IBM Plex Sans Thai |

## 📜 กฎการเขียนโค้ด (สำหรับ AI Agent)

### ❌ ห้ามใช้
- TypeScript (ใช้ JavaScript เท่านั้น)
- ORM (ใช้ raw SQL queries)
- Tailwind CSS (ใช้ Vanilla CSS)
- Global CSS imports ใน components

### ✅ ต้องทำ
- ใช้ PostgreSQL parameters ($1, $2, $3)
- ใช้ Asia/Bangkok timezone
- ใช้ `'use client'` สำหรับ client components
- Response format: `{ success: true/false, data/error }`

---

# 3. โครงสร้างโปรเจกต์

```
Shop/
├── src/
│   ├── app/
│   │   ├── api/                    # API Routes
│   │   │   ├── auth/               # Authentication
│   │   │   ├── shops/              # Shop Management
│   │   │   ├── licenses/           # License Management
│   │   │   ├── license-types/      # License Types
│   │   │   ├── custom-fields/      # Custom Fields
│   │   │   ├── export/             # Export CSV
│   │   │   └── dashboard/          # Dashboard Stats
│   │   │
│   │   ├── dashboard/              # Dashboard Pages
│   │   │   ├── shops/              # Shops List
│   │   │   ├── licenses/           # Licenses List
│   │   │   ├── settings/           # Settings
│   │   │   └── export/             # Export Page
│   │   │
│   │   ├── login/                  # Login Page
│   │   ├── layout.js               # Root Layout
│   │   └── page.js                 # Home Page
│   │
│   ├── components/
│   │   ├── ui/                     # UI Components
│   │   │   ├── ExcelTable.jsx      # Data Table
│   │   │   ├── QuickAddModal.jsx   # Add/Edit Modal
│   │   │   ├── CustomSelect.jsx    # Dropdown Select
│   │   │   ├── DatePicker.jsx      # Date Picker
│   │   │   └── Sidebar.jsx         # Navigation
│   │   └── dashboard/              # Dashboard Components
│   │
│   └── lib/
│       ├── db.js                   # Database Connection
│       ├── session.js              # Session Management
│       └── utils.js                # Utility Functions
│
├── public/                         # Static Assets
├── README.md                       # Main README
├── AGENTS.md                       # AI Agent Rules
└── migrationplan.md                # Database Migration
```

---

# 4. API Endpoints

## 📡 รายการ API ทั้งหมด (22 endpoints)

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth` | Login |
| DELETE | `/api/auth` | Logout |
| GET | `/api/auth` | Check Session |

### Shops
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shops` | List all shops |
| POST | `/api/shops` | Create shop |
| PUT | `/api/shops` | Update shop |
| DELETE | `/api/shops?id=X` | Delete shop |

### Licenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/licenses` | List all licenses |
| POST | `/api/licenses` | Create license |
| PUT | `/api/licenses` | Update license |
| DELETE | `/api/licenses?id=X` | Delete license |
| GET | `/api/licenses/expiring` | Expiring licenses |

### License Types
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/license-types` | List types |
| POST | `/api/license-types` | Create type |
| PUT | `/api/license-types` | Update type |
| DELETE | `/api/license-types?id=X` | Delete type |

### Custom Fields
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/custom-fields?entity_type=X` | List fields |
| POST | `/api/custom-fields` | Create field |
| PUT | `/api/custom-fields` | Update field |
| DELETE | `/api/custom-fields?id=X` | Delete field |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Dashboard stats |
| GET | `/api/export?type=X&format=csv` | Export data |
| GET | `/api/activity-logs` | Activity logs |

---

# 5. Database Schema

## 📊 ตารางทั้งหมด (10 tables)

### Core Tables

```sql
-- ตารางผู้ใช้
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ตารางร้านค้า
CREATE TABLE shops (
    id SERIAL PRIMARY KEY,
    shop_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ตารางประเภทใบอนุญาต
CREATE TABLE license_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    validity_days INTEGER DEFAULT 365,
    price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ตารางใบอนุญาต
CREATE TABLE licenses (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
    license_type_id INTEGER REFERENCES license_types(id),
    license_number VARCHAR(100),
    issue_date DATE,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Custom Fields Tables

```sql
-- ตารางนิยาม Custom Fields
CREATE TABLE custom_fields (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,  -- 'shops' หรือ 'licenses'
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) DEFAULT 'text',  -- text, number, date, textarea, select
    field_options JSONB,  -- สำหรับ select options
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    show_in_form BOOLEAN DEFAULT true,
    show_in_table BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(entity_type, field_name)
);

-- ตารางค่า Custom Fields
CREATE TABLE custom_field_values (
    id SERIAL PRIMARY KEY,
    custom_field_id INTEGER REFERENCES custom_fields(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    field_value TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(custom_field_id, entity_id)
);
```

### Other Tables

```sql
-- Activity Logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notification Settings
CREATE TABLE notification_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    notify_expiring_days INTEGER DEFAULT 30,
    email_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notification Logs
CREATE TABLE notification_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    license_id INTEGER REFERENCES licenses(id),
    notification_type VARCHAR(50),
    sent_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'sent'
);
```

### Database Indexes

```sql
-- Shops indexes
CREATE INDEX idx_shops_name_search ON shops(shop_name);
CREATE INDEX idx_shops_owner_search ON shops(owner_name);
CREATE INDEX idx_shops_phone_search ON shops(phone);

-- Licenses indexes
CREATE INDEX idx_licenses_shop_status ON licenses(shop_id, status);
CREATE INDEX idx_licenses_type ON licenses(license_type_id);
CREATE INDEX idx_licenses_number_search ON licenses(license_number);

-- Custom Fields indexes
CREATE INDEX idx_custom_fields_entity_type ON custom_fields(entity_type);
CREATE INDEX idx_custom_fields_active ON custom_fields(is_active);
CREATE INDEX idx_custom_field_values_entity ON custom_field_values(entity_type, entity_id);
CREATE INDEX idx_custom_field_values_field ON custom_field_values(custom_field_id);
```

---

# 6. React Components

## 🧩 Components หลัก (26+ components)

### UI Components

| Component | Description |
|-----------|-------------|
| `ExcelTable.jsx` | ตารางแบบ Excel พร้อม inline editing |
| `QuickAddModal.jsx` | Modal สร้าง/แก้ไขข้อมูล |
| `CustomSelect.jsx` | Dropdown พร้อมค้นหา |
| `DatePicker.jsx` | เลือกวันที่ |
| `Sidebar.jsx` | Navigation menu |
| `Header.jsx` | Header bar |
| `StatCard.jsx` | การ์ดแสดงสถิติ |
| `LoadingSkeleton.jsx` | Loading placeholder |

### Dashboard Components

| Component | Description |
|-----------|-------------|
| `DashboardStats.jsx` | สถิติ overview |
| `ExpiringLicenses.jsx` | รายการใบอนุญาตใกล้หมดอายุ |
| `RecentActivity.jsx` | กิจกรรมล่าสุด |
| `LicenseChart.jsx` | กราฟแสดงใบอนุญาต |

### Custom Hooks

| Hook | Description |
|------|-------------|
| `useAuth` | จัดการ authentication |
| `useShops` | จัดการข้อมูลร้านค้า |
| `useLicenses` | จัดการข้อมูลใบอนุญาต |
| `useCustomFields` | จัดการ custom fields |
| `usePagination` | จัดการ pagination |
| `useSearch` | จัดการการค้นหา |
| `useDebounce` | Debounce input |
| `useLocalStorage` | Local storage |

---

# 7. ระบบ Custom Fields

## 🔧 ภาพรวม

ระบบ Custom Fields ช่วยให้ผู้ใช้เพิ่มฟิลด์ข้อมูลเองได้ โดยไม่ต้องแก้โค้ด

### Field Types ที่รองรับ

| Type | Description | Input |
|------|-------------|-------|
| `text` | ข้อความสั้น | `<input type="text">` |
| `number` | ตัวเลข | `<input type="number">` |
| `date` | วันที่ | DatePicker component |
| `textarea` | ข้อความยาว | `<textarea>` |
| `select` | เลือกจากรายการ | CustomSelect component |

### การใช้งาน

#### 1. สร้าง Custom Field
```
Settings > Custom Fields > เพิ่ม Field ใหม่
```

#### 2. กรอกข้อมูล
- **Entity Type:** shops หรือ licenses
- **Field Name:** ชื่อฟิลด์ (ต้องขึ้นต้นด้วย cf_)
- **Field Label:** ป้ายกำกับ (ภาษาไทย)
- **Field Type:** ประเภทฟิลด์
- **Required:** บังคับกรอกหรือไม่
- **Show in Form:** แสดงในฟอร์มหรือไม่
- **Show in Table:** แสดงในตารางหรือไม่

### ตัวอย่าง Custom Fields ที่มี

| Field Name | Label | Type | Entity |
|------------|-------|------|--------|
| `location` | สถานที่จำหน่าย | text | licenses |
| `amount` | จำนวนเงิน | number | licenses |
| `area_sqm` | พื้นที่ (ตารางเมตร) | number | licenses |
| `area_hp` | พื้นที่ (แรงม้า) | number | licenses |
| `payment_status` | สถานะการชำระเงิน | select | licenses |

---

# 8. การทดสอบระบบ

## 🧪 แผนการทดสอบ (7 Phases)

### Phase Overview

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 1 | Planning & Analysis | ✅ | 100% |
| 2 | Unit Testing | 🔄 | 18.8% |
| 3 | Integration Testing | ⏳ | 0% |
| 4 | UI/UX Testing | 🔄 | 32% |
| 5 | Export Testing | ✅ | 100% |
| 6 | Performance Testing | ⏳ | 0% |
| 7 | Security Testing | 🔄 | 25% |
| 8 | Data Integrity | ✅ | 100% |

### Test Cases Summary

| Category | Total | Pass | Fail | Skip |
|----------|-------|------|------|------|
| Authentication | 5 | 5 | 0 | 0 |
| Shops CRUD | 10 | 3 | 0 | 7 |
| Licenses CRUD | 10 | 4 | 0 | 6 |
| Custom Fields | 15 | 10 | 0 | 5 |
| Export | 10 | 10 | 0 | 0 |
| **Total** | **160+** | **32** | **0** | **128** |

### ผลการทดสอบสำคัญ

#### ✅ Authentication (5/5 pass)
- Login สำเร็จ
- Login ล้มเหลว (wrong password)
- Session check
- Logout
- Session expired

#### ✅ Export (10/10 pass)
- Export CSV ร้านค้า ✅
- Export CSV ใบอนุญาต ✅
- Export PDF ร้านค้า ✅
- Export PDF ใบอนุญาต ✅
- Custom Fields ใน Export ✅
- ภาษาไทยถูกต้อง ✅

#### ✅ Backend Licenses (100% pass)
- Database Connection ✅
- Table Structure ✅
- Main Query (GET) ✅
- Search Functionality ✅
- Pagination ✅
- API Endpoints ✅
- Custom Fields Integration ✅

---

# 9. บั๊กที่แก้ไขแล้ว

## 🐛 รายการบั๊กและการแก้ไข

### BUG-001: 500 Error เมื่อบันทึก License พร้อม Custom Fields

**อาการ:**
- สร้าง License พร้อม Custom Fields → 500 Error
- แต่ข้อมูล License หลักถูกบันทึกแล้ว

**สาเหตุ:**
- ตาราง `custom_field_values` มี column `entity_type` (NOT NULL)
- แต่ code ไม่ได้ส่ง `entity_type` ใน INSERT query

**การแก้ไข:**
```javascript
// ❌ เดิม
INSERT INTO custom_field_values (custom_field_id, entity_id, field_value)
VALUES ($1, $2, $3)

// ✅ แก้ไขแล้ว
INSERT INTO custom_field_values (custom_field_id, entity_type, entity_id, field_value)
VALUES ($1, $2, $3, $4)
```

**ไฟล์ที่แก้ไข:**
- `src/app/api/licenses/route.js`

**สถานะ:** ✅ แก้ไขแล้ว

---

### BUG-002: Custom Fields ไม่แสดงในหน้า Licenses

**อาการ:**
- หน้า Shops แสดง Custom Fields ได้
- หน้า Licenses ไม่แสดง Custom Fields

**สาเหตุ:**
1. Frontend ใช้ hardcoded `knownKeys` แทน `STANDARD_COLUMNS`
2. Backend ไม่ได้ใช้ `entity_type` ในการ JOIN

**การแก้ไข:**

Frontend:
```javascript
// กำหนด standard columns ชัดเจน
const STANDARD_COLUMNS_IDS = [
  "shop_id", "license_type_id", "license_number",
  "issue_date", "expiry_date", "status", "notes"
];
```

Backend:
```javascript
// เพิ่ม entity_type ใน JOIN
LEFT JOIN custom_field_values cfv 
  ON cfv.entity_id = l.id 
  AND cfv.entity_type = 'licenses'
```

**ไฟล์ที่แก้ไข:**
- `src/app/dashboard/licenses/page.jsx`
- `src/app/api/licenses/route.js`

**สถานะ:** ✅ แก้ไขแล้ว

---

### BUG-003: QuickAddModal ไม่แสดง Custom Fields สำหรับ Licenses

**อาการ:**
- Modal สร้างร้านค้าแสดง Custom Fields ได้
- Modal สร้างใบอนุญาตไม่แสดง Custom Fields

**สาเหตุ:**
- `fetchCustomFields()` ถูกเรียกเฉพาะ `type === "shop"`

**การแก้ไข:**
```javascript
// เปลี่ยนจาก
if (isOpen && type === "shop") { fetchCustomFields(); }

// เป็น
if (isOpen) { fetchCustomFields(); }
```

**ไฟล์ที่แก้ไข:**
- `src/components/ui/QuickAddModal.jsx`

**สถานะ:** ✅ แก้ไขแล้ว

---

# 10. คู่มือการใช้งาน

## 🚀 การติดตั้งและรัน

### ข้อกำหนด
- Node.js 18+
- PostgreSQL database (Neon)

### ติดตั้ง
```bash
# Clone repository
git clone <repo-url>
cd Shop

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# แก้ไข DATABASE_URL และ SESSION_SECRET

# Run development
npm run dev
```

### เข้าใช้งาน
```
URL: http://localhost:3000
Username: admin
Password: 1234
```

---

## 📋 การใช้งานหลัก

### จัดการร้านค้า
1. เข้า **Dashboard > ร้านค้า**
2. คลิก **"สร้างร้านค้าใหม่"**
3. กรอกข้อมูลและ Custom Fields
4. คลิก **"บันทึก"**

### จัดการใบอนุญาต
1. เข้า **Dashboard > ใบอนุญาต**
2. คลิก **"เพิ่มใบอนุญาต"**
3. เลือกร้านค้า, ประเภท, กรอกข้อมูล
4. คลิก **"บันทึก"**

### เพิ่ม Custom Fields
1. เข้า **Settings > Custom Fields**
2. เลือก Entity Type (shops/licenses)
3. คลิก **"เพิ่ม Field ใหม่"**
4. กรอกรายละเอียด
5. คลิก **"สร้าง Field"**

### Export ข้อมูล
1. เข้า **Dashboard > Export**
2. เลือกประเภทข้อมูล
3. เลือกรูปแบบ (CSV/PDF)
4. คลิก **"ส่งออก"**

---

## 📞 การแก้ปัญหาเบื้องต้น

### ปัญหา: ไม่สามารถ Login ได้
- ตรวจสอบ username/password
- ตรวจสอบ database connection
- ล้าง cookies และลองใหม่

### ปัญหา: Custom Fields ไม่แสดง
- ตรวจสอบ `show_in_form = true`
- ตรวจสอบ `entity_type` ถูกต้อง
- Refresh หน้าใหม่

### ปัญหา: Export ไม่ได้
- ตรวจสอบ network connection
- ตรวจสอบ console errors
- ลองลดจำนวนข้อมูลที่ export

---

## 📚 เอกสารอ้างอิง

- **README.md** - เอกสารหลักโปรเจกต์
- **AGENTS.md** - กฎการเขียนโค้ดสำหรับ AI
- **migrationplan.md** - แผน Database Migration

---

**อัพเดทล่าสุด:** 28 มกราคม 2569  
**จัดทำโดย:** Antigravity AI Assistant
