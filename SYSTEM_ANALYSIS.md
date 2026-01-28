# 📊 การวิเคราะห์ฟังก์ชันการทำงานทั้งหมด
## ระบบจัดการใบอนุญาตร้านค้า (Shop License System)

**วันที่วิเคราะห์:** 27 มกราคม 2026  
**เวอร์ชัน:** 2.0  
**สถานะ:** ✅ เสร็จสมบูรณ์

---

## 📑 สารบัญ

1. [ภาพรวมระบบ](#ภาพรวมระบบ)
2. [โครงสร้างฐานข้อมูล](#โครงสร้างฐานข้อมูล)
3. [API Endpoints](#api-endpoints)
4. [ฟังก์ชันหลักของระบบ](#ฟังก์ชันหลักของระบบ)
5. [Components และ UI](#components-และ-ui)
6. [Hooks และ Utilities](#hooks-และ-utilities)
7. [Security และ Authentication](#security-และ-authentication)
8. [Performance Optimization](#performance-optimization)

---

## 🎯 ภาพรวมระบบ

### เทคโนโลยีที่ใช้

- **Frontend:** Next.js 14 + React 18
- **Styling:** Tailwind CSS + Custom CSS
- **Database:** Neon PostgreSQL (Serverless)
- **Authentication:** Iron Session
- **State Management:** SWR + React Hooks
- **Charts:** Chart.js + react-chartjs-2
- **PDF Export:** pdfmake
- **Icons:** React Icons + Lucide React
- **Alerts:** SweetAlert2

### โครงสร้างโปรเจกต์

```
Shop/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes (22 endpoints)
│   │   ├── dashboard/         # Dashboard Pages
│   │   └── page.jsx           # Login Page
│   ├── components/            # React Components (26 files)
│   ├── hooks/                 # Custom Hooks (8 files)
│   ├── lib/                   # Utilities & Services (13 files)
│   ├── styles/                # CSS Files
│   └── utils/                 # Helper Functions
├── public/                    # Static Assets
└── scripts/                   # Database Scripts
```

---

## 🗄️ โครงสร้างฐานข้อมูล

### ตารางหลัก (Core Tables)

#### 1. **users** - ผู้ใช้งานระบบ
```sql
- id (SERIAL PRIMARY KEY)
- username (VARCHAR, UNIQUE)
- password (VARCHAR) - bcrypt hashed
- full_name (VARCHAR)
- role (VARCHAR) - 'admin' | 'user'
- created_at, updated_at (TIMESTAMP)
```

**ฟังก์ชัน:**
- จัดการผู้ใช้งานระบบ
- ควบคุมสิทธิ์การเข้าถึง (Role-based)
- บันทึกประวัติการสร้าง/แก้ไข

#### 2. **shops** - ข้อมูลร้านค้า
```sql
- id (SERIAL PRIMARY KEY)
- shop_name (VARCHAR, NOT NULL)
- owner_name (VARCHAR)
- address (TEXT)
- phone (VARCHAR)
- email (VARCHAR)
- notes (TEXT)
- custom_fields (JSONB) - ฟิลด์เพิ่มเติมแบบ dynamic
- created_at, updated_at (TIMESTAMP)
```

**ฟังก์ชัน:**
- เก็บข้อมูลร้านค้าทั้งหมด
- รองรับ Custom Fields แบบ dynamic
- เชื่อมโยงกับใบอนุญาต

#### 3. **license_types** - ประเภทใบอนุญาต
```sql
- id (SERIAL PRIMARY KEY)
- name (VARCHAR, NOT NULL)
- description (TEXT)
- validity_days (INTEGER) - จำนวนวันที่ใช้ได้
- price (NUMERIC) - ราคา
- created_at, updated_at (TIMESTAMP)
```

**ฟังก์ชัน:**
- กำหนดประเภทใบอนุญาต
- ตั้งค่าระยะเวลาและราคา
- ใช้ในการคำนวณวันหมดอายุ

#### 4. **licenses** - ใบอนุญาต
```sql
- id (SERIAL PRIMARY KEY)
- shop_id (INTEGER, FK → shops)
- license_type_id (INTEGER, FK → license_types)
- license_number (VARCHAR, NOT NULL)
- issue_date (DATE) - วันที่ออก
- expiry_date (DATE) - วันหมดอายุ
- status (VARCHAR) - 'active' | 'expired' | 'revoked'
- notes (TEXT)
- custom_fields (JSONB)
- created_at, updated_at (TIMESTAMP)
```

**ฟังก์ชัน:**
- เก็บข้อมูลใบอนุญาตแต่ละใบ
- ติดตามสถานะและวันหมดอายุ
- เชื่อมโยงร้านค้ากับประเภทใบอนุญาต

### ตารางระบบ Custom Fields

#### 5. **custom_fields** - คำจำกัดความฟิลด์เพิ่มเติม
```sql
- id (SERIAL PRIMARY KEY)
- entity_type (VARCHAR) - 'shops' | 'licenses'
- field_name (VARCHAR) - ชื่อฟิลด์ (cf_xxx)
- field_label (VARCHAR) - ชื่อแสดง
- field_type (VARCHAR) - 'text' | 'number' | 'date' | 'textarea' | 'select'
- field_options (JSONB) - ตัวเลือกสำหรับ select
- is_required (BOOLEAN)
- is_active (BOOLEAN)
- display_order (INTEGER)
- show_in_table (BOOLEAN)
- show_in_form (BOOLEAN)
- created_at, updated_at (TIMESTAMP)
```

**ฟังก์ชัน:**
- กำหนดฟิลด์เพิ่มเติมแบบ dynamic
- รองรับหลายประเภทข้อมูล
- ควบคุมการแสดงผลในตารางและฟอร์ม

#### 6. **custom_field_values** - ค่าของฟิลด์เพิ่มเติม
```sql
- id (SERIAL PRIMARY KEY)
- custom_field_id (INTEGER, FK → custom_fields)
- entity_id (INTEGER) - ID ของ shop หรือ license
- field_value (TEXT)
- created_at, updated_at (TIMESTAMP)
```

**ฟังก์ชัน:**
- เก็บค่าจริงของ custom fields
- เชื่อมโยงกับ entity ที่เกี่ยวข้อง

### ตารางระบบ (System Tables)

#### 7. **audit_logs** - บันทึกกิจกรรม
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER, FK → users)
- action (VARCHAR) - 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN'
- entity_type (VARCHAR) - 'shop' | 'license' | 'user'
- entity_id (INTEGER)
- details (TEXT) - รายละเอียด JSON
- ip_address (VARCHAR)
- user_agent (TEXT)
- created_at (TIMESTAMP)
```

**ฟังก์ชัน:**
- บันทึกทุกการกระทำในระบบ
- ติดตาม user activity
- ใช้ในการ audit และ security

#### 8. **notification_settings** - ตั้งค่าการแจ้งเตือน
```sql
- id (SERIAL PRIMARY KEY)
- telegram_bot_token (VARCHAR)
- telegram_chat_id (VARCHAR)
- days_before_expiry (INTEGER) - แจ้งเตือนก่อนหมดอายุกี่วัน
- is_active (BOOLEAN)
- updated_at (TIMESTAMP)
```

**ฟังก์ชัน:**
- ตั้งค่า Telegram notification
- กำหนดเงื่อนไขการแจ้งเตือน

#### 9. **notification_logs** - ประวัติการแจ้งเตือน
```sql
- id (SERIAL PRIMARY KEY)
- shop_name (VARCHAR)
- status (VARCHAR) - 'success' | 'failed'
- message (TEXT)
- sent_at (TIMESTAMP)
```

**ฟังก์ชัน:**
- บันทึกประวัติการส่งการแจ้งเตือน
- ติดตามความสำเร็จของการแจ้งเตือน

#### 10. **schema_definitions** - คำจำกัดความ schema (Legacy)
```sql
- id (SERIAL PRIMARY KEY)
- table_name (VARCHAR)
- column_key (VARCHAR)
- column_label (VARCHAR)
- column_type (VARCHAR)
- is_required (BOOLEAN)
- display_order (INTEGER)
- created_at (TIMESTAMP)
```

**หมายเหตุ:** ตารางนี้เป็น legacy จากเวอร์ชันเก่า ปัจจุบันใช้ `custom_fields` แทน

---

## 🔌 API Endpoints

### 1. Authentication API

#### `POST /api/auth`
**ฟังก์ชัน:** Login และสร้าง session
```javascript
Request Body:
{
  "username": "admin",
  "password": "password"
}

Response:
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

**Features:**
- ✅ bcrypt password verification
- ✅ Iron session management
- ✅ Activity logging
- ✅ IP tracking

---

### 2. Shops API

#### `GET /api/shops`
**ฟังก์ชัน:** ดึงข้อมูลร้านค้าทั้งหมด

**Query Parameters:**
- `page` - หน้าที่ต้องการ (default: 1)
- `limit` - จำนวนต่อหน้า (default: 50)
- `search` - ค้นหา
- `sort` - เรียงลำดับ

**Response:**
```javascript
{
  "success": true,
  "shops": [...],
  "total": 100,
  "page": 1,
  "totalPages": 2
}
```

**Features:**
- ✅ Pagination
- ✅ Search (shop_name, owner_name, phone)
- ✅ Sorting
- ✅ Include custom_fields
- ✅ Include license count
- ✅ Cache support (60s)

#### `POST /api/shops`
**ฟังก์ชัน:** สร้างร้านค้าใหม่

**Request Body:**
```javascript
{
  "shop_name": "ร้านตัวอย่าง",
  "owner_name": "นายตัวอย่าง",
  "phone": "081-234-5678",
  "address": "123 ถนนตัวอย่าง",
  "email": "example@email.com",
  "notes": "หมายเหตุ",
  "custom_fields": {
    "cf_tax_id": "1234567890123"
  },
  "create_license": true,
  "license_type_id": 1,
  "license_number": "LIC-001"
}
```

**Features:**
- ✅ Validation
- ✅ Custom fields support
- ✅ Auto-create license (optional)
- ✅ Activity logging
- ✅ Cache invalidation

#### `PUT /api/shops`
**ฟังก์ชัน:** แก้ไขข้อมูลร้านค้า

**Features:**
- ✅ Update standard fields
- ✅ Update custom_fields (merge)
- ✅ Activity logging

#### `DELETE /api/shops`
**ฟังก์ชัน:** ลบร้านค้า

**Features:**
- ✅ Cascade delete licenses
- ✅ Activity logging
- ✅ Cache invalidation

---

### 3. Licenses API

#### `GET /api/licenses`
**ฟังก์ชัน:** ดึงข้อมูลใบอนุญาตทั้งหมด

**Query Parameters:**
- `page`, `limit`, `search`, `sort`
- `shop_id` - กรองตามร้านค้า
- `status` - กรองตามสถานะ

**Response:**
```javascript
{
  "success": true,
  "licenses": [
    {
      "id": 1,
      "license_number": "LIC-001",
      "shop_name": "ร้านตัวอย่าง",
      "license_type_name": "ใบอนุญาตประเภท A",
      "issue_date": "2024-01-01",
      "expiry_date": "2025-01-01",
      "status": "active",
      "days_until_expiry": 180
    }
  ]
}
```

**Features:**
- ✅ JOIN with shops and license_types
- ✅ Calculate days_until_expiry
- ✅ Auto-update status (active/expired)
- ✅ Custom fields support

#### `GET /api/licenses/expiring`
**ฟังก์ชัน:** ดึงใบอนุญาตที่ใกล้หมดอายุ

**Query Parameters:**
- `days` - จำนวนวันล่วงหน้า (default: 30)

**Features:**
- ✅ Filter licenses expiring within X days
- ✅ Exclude already expired
- ✅ Sort by expiry_date

#### `POST /api/licenses`
**ฟังก์ชัน:** สร้างใบอนุญาตใหม่

**Features:**
- ✅ Auto-calculate expiry_date
- ✅ Validate shop_id and license_type_id
- ✅ Custom fields support
- ✅ Activity logging

#### `PUT /api/licenses`
**ฟังก์ชัน:** แก้ไขใบอนุญาต

**Features:**
- ✅ Update all fields
- ✅ Recalculate expiry if needed
- ✅ Update custom_fields

#### `DELETE /api/licenses`
**ฟังก์ชัน:** ลบใบอนุญาต

---

### 4. License Types API

#### `GET /api/license-types`
**ฟังก์ชัน:** ดึงประเภทใบอนุญาตทั้งหมด

#### `GET /api/license-types-optimized`
**ฟังก์ชัน:** ดึงพร้อมนับจำนวนใบอนุญาต

**Response:**
```javascript
{
  "success": true,
  "licenseTypes": [
    {
      "id": 1,
      "name": "ใบอนุญาตประเภท A",
      "validity_days": 365,
      "price": 1000,
      "license_count": 25
    }
  ]
}
```

**Features:**
- ✅ COUNT licenses per type
- ✅ Cache support (5 minutes)

#### `POST /api/license-types`
**ฟังก์ชัน:** สร้างประเภทใบอนุญาตใหม่

#### `PUT /api/license-types`
**ฟังก์ชัน:** แก้ไขประเภทใบอนุญาต

#### `DELETE /api/license-types`
**ฟังก์ชัน:** ลบประเภทใบอนุญาต

**Features:**
- ✅ Check if in use before delete
- ✅ SET NULL on licenses if deleted

---

### 5. Users API

#### `GET /api/users`
**ฟังก์ชัน:** ดึงข้อมูลผู้ใช้ทั้งหมด

**Features:**
- ✅ Exclude password from response
- ✅ Pagination support

#### `POST /api/users`
**ฟังก์ชัน:** สร้างผู้ใช้ใหม่

**Features:**
- ✅ bcrypt password hashing
- ✅ Username uniqueness check
- ✅ Role validation

#### `PUT /api/users`
**ฟังก์ชัน:** แก้ไขข้อมูลผู้ใช้

**Features:**
- ✅ Optional password update
- ✅ Re-hash if password changed

#### `DELETE /api/users`
**ฟังก์ชัน:** ลบผู้ใช้

**Features:**
- ✅ Cannot delete yourself
- ✅ Activity logging

---

### 6. Custom Fields API

#### `GET /api/custom-fields`
**ฟังก์ชัน:** ดึง custom fields

**Query Parameters:**
- `entity_type` - 'shops' | 'licenses'

**Response:**
```javascript
{
  "success": true,
  "fields": [
    {
      "id": 1,
      "entity_type": "shops",
      "field_name": "cf_tax_id",
      "field_label": "เลขประจำตัวผู้เสียภาษี",
      "field_type": "text",
      "is_required": true,
      "show_in_table": true,
      "show_in_form": true,
      "display_order": 1
    }
  ]
}
```

#### `POST /api/custom-fields`
**ฟังก์ชัน:** สร้าง custom field ใหม่

**Validation:**
- ✅ field_name must start with 'cf_'
- ✅ Unique per entity_type
- ✅ Valid field_type

#### `PUT /api/custom-fields`
**ฟังก์ชัน:** แก้ไข custom field

#### `DELETE /api/custom-fields`
**ฟังก์ชัน:** ลบ custom field

**Features:**
- ✅ Cascade delete values
- ✅ Remove from entity custom_fields JSONB

---

### 7. Custom Field Values API

#### `GET /api/custom-field-values`
**ฟังก์ชัน:** ดึงค่าของ custom fields

**Query Parameters:**
- `entity_id` - ID ของ shop หรือ license
- `custom_field_id` - ID ของ field

#### `POST /api/custom-field-values`
**ฟังก์ชัน:** บันทึกค่า custom field

**Features:**
- ✅ Upsert (INSERT or UPDATE)
- ✅ Validation based on field_type

#### `DELETE /api/custom-field-values`
**ฟังก์ชัน:** ลบค่า custom field

---

### 8. Dashboard API

#### `GET /api/dashboard`
**ฟังก์ชัน:** ดึงข้อมูลสำหรับ dashboard

**Response:**
```javascript
{
  "success": true,
  "stats": {
    "totalShops": 150,
    "totalLicenses": 200,
    "activeLicenses": 180,
    "expiredLicenses": 20,
    "expiringLicenses": 15,
    "totalUsers": 5
  },
  "recentActivity": [...],
  "expiringLicenses": [...],
  "licensesByType": [...]
}
```

**Features:**
- ✅ Aggregate statistics
- ✅ Recent activity (last 10)
- ✅ Expiring licenses (next 30 days)
- ✅ License distribution by type
- ✅ Cache support (30s)

---

### 9. Activity Logs API

#### `GET /api/activity-logs`
**ฟังก์ชัน:** ดึงประวัติกิจกรรม

**Query Parameters:**
- `page`, `limit`
- `user_id` - กรองตามผู้ใช้
- `action` - กรองตามประเภทการกระทำ
- `entity_type` - กรองตามประเภท entity

**Features:**
- ✅ JOIN with users table
- ✅ Pagination
- ✅ Filtering
- ✅ Sort by created_at DESC

#### `DELETE /api/activity-logs`
**ฟังก์ชัน:** ลบประวัติเก่า

**Features:**
- ✅ Delete logs older than X days

---

### 10. Export API

#### `GET /api/export`
**ฟังก์ชัน:** Export ข้อมูลเป็น PDF

**Query Parameters:**
- `type` - 'shops' | 'licenses' | 'license-types'
- `id` - ID ของ entity (optional)

**Features:**
- ✅ Generate PDF using pdfmake
- ✅ Thai font support
- ✅ Custom styling
- ✅ Include custom fields
- ✅ Return as base64

---

### 11. Utility APIs

#### `GET /api/schema`
**ฟังก์ชัน:** ดึง schema definitions (legacy)

#### `POST /api/schema`
**ฟังก์ชัน:** สร้าง schema definition

#### `DELETE /api/schema`
**ฟังก์ชัน:** ลบ schema definition

#### `GET /api/migrate`
**ฟังก์ชัน:** Run database migrations

#### `POST /api/seed-shops`
**ฟังก์ชัน:** Seed ข้อมูลร้านค้าตัวอย่าง

#### `POST /api/seed-custom-fields`
**ฟังก์ชัน:** Seed custom fields ตัวอย่าง

#### `GET /api/seed-10-licenses`
**ฟังก์ชัน:** Seed ใบอนุญาต 10 ใบ

---

## 🎨 Components และ UI

### Core Components

#### 1. **ExcelTable** - ตารางแบบ Excel
**ไฟล์:** `src/components/ExcelTable/`

**ฟีเจอร์:**
- ✅ Inline editing (double-click)
- ✅ Context menu (right-click)
- ✅ Column resizing
- ✅ Row selection
- ✅ Sorting
- ✅ Filtering
- ✅ Pagination
- ✅ Add/Delete rows
- ✅ Custom fields support
- ✅ Copy/Paste
- ✅ Keyboard navigation

**Sub-components:**
- `TableHeader.jsx` - Header with sorting
- `TableRow.jsx` - Editable row
- `TableToolbar.jsx` - Action buttons
- `TableContextMenu.jsx` - Right-click menu
- `TableHooks.js` - Custom hooks

#### 2. **QuickAddModal** - ฟอร์มเพิ่มข้อมูลเร็ว
**ไฟล์:** `src/components/ui/QuickAddModal.jsx`

**ฟีเจอร์:**
- ✅ Dynamic form based on entity type
- ✅ Custom fields auto-load
- ✅ Field validation
- ✅ Multi-step (shop + license)
- ✅ Real-time validation
- ✅ Support all field types

**Supported Types:**
- Text input
- Number input
- Date picker
- Textarea
- Select dropdown
- Checkbox

#### 3. **ShopDetailModal** - รายละเอียดร้านค้า
**ไฟล์:** `src/components/ui/ShopDetailModal.jsx`

**ฟีเจอร์:**
- ✅ Show shop info
- ✅ List all licenses
- ✅ Show custom fields
- ✅ Edit mode
- ✅ Add new license
- ✅ Delete license

#### 4. **DashboardCharts** - กราฟสถิติ
**ไฟล์:** `src/components/DashboardCharts.jsx`

**Charts:**
- 📊 License Status (Pie Chart)
- 📊 Licenses by Type (Bar Chart)
- 📊 Monthly Trends (Line Chart)
- 📊 Expiring Licenses (Doughnut Chart)

**Features:**
- ✅ Responsive
- ✅ Interactive tooltips
- ✅ Color-coded
- ✅ Real-time data

### UI Components

#### 5. **DatePicker** - เลือกวันที่
**ฟีเจอร์:**
- ✅ Thai locale
- ✅ Asia/Bangkok timezone
- ✅ Custom styling
- ✅ Keyboard support

#### 6. **CustomSelect** - Dropdown แบบค้นหาได้
**ฟีเจอร์:**
- ✅ Search/filter options
- ✅ Keyboard navigation
- ✅ Custom styling
- ✅ Clear button

#### 7. **EditableCell** - Cell ที่แก้ไขได้
**ฟีเจอร์:**
- ✅ Double-click to edit
- ✅ Auto-save on blur
- ✅ Validation
- ✅ Type-specific input

#### 8. **EditableHeader** - Header ที่แก้ไขได้
**ฟีเจอร์:**
- ✅ Rename columns
- ✅ Sort indicator
- ✅ Resize handle

#### 9. **FilterRow** - แถวกรองข้อมูล
**ฟีเจอร์:**
- ✅ Filter per column
- ✅ Multiple filter types
- ✅ Clear all filters

#### 10. **Pagination** - แบ่งหน้า
**ฟีเจอร์:**
- ✅ Page numbers
- ✅ Previous/Next
- ✅ Jump to page
- ✅ Items per page selector

#### 11. **StatusBadge** - แสดงสถานะ
**ฟีเจอร์:**
- ✅ Color-coded
- ✅ Icon support
- ✅ Tooltip

#### 12. **Skeleton** - Loading placeholder
**ฟีเจอร์:**
- ✅ Shimmer effect
- ✅ Multiple variants
- ✅ Responsive

#### 13. **Modal** - Dialog popup
**ฟีเจอร์:**
- ✅ Backdrop
- ✅ Close on ESC
- ✅ Prevent scroll
- ✅ Animation

### Login Components

#### 14. **LoginForm** - ฟอร์ม login
**ฟีเจอร์:**
- ✅ Username/password
- ✅ Remember me
- ✅ Show/hide password
- ✅ Loading state
- ✅ Error handling

#### 15. **LoginSlider** - Slider แสดงฟีเจอร์
**ฟีเจอร์:**
- ✅ Auto-play
- ✅ Navigation dots
- ✅ Swipe support
- ✅ Pause on hover

#### 16. **FeatureTag** - แท็กฟีเจอร์
#### 17. **InputGroup** - Input group
#### 18. **WaveDivider** - Divider แบบคลื่น

### Utility Components

#### 19. **Loading** - Loading spinner
#### 20. **VersionBadge** - แสดงเวอร์ชัน
#### 21. **PatchNotesModal** - Release notes

---

## 🪝 Hooks และ Utilities

### Custom Hooks

#### 1. **useShops** - จัดการข้อมูลร้านค้า
**ไฟล์:** `src/hooks/useShops.js`

**Functions:**
```javascript
const {
  shops,           // ข้อมูลร้านค้า
  loading,         // สถานะโหลด
  error,           // ข้อผิดพลาด
  mutate,          // Refresh data
  addShop,         // เพิ่มร้านค้า
  updateShop,      // แก้ไขร้านค้า
  deleteShop       // ลบร้านค้า
} = useShops();
```

**Features:**
- ✅ SWR caching
- ✅ Optimistic updates
- ✅ Error handling
- ✅ Auto-revalidate

#### 2. **useData** - จัดการข้อมูลทั่วไป
**ไฟล์:** `src/hooks/useData.js`

**Functions:**
```javascript
const {
  data,
  loading,
  error,
  fetchData,
  createRecord,
  updateRecord,
  deleteRecord
} = useData(endpoint);
```

**Features:**
- ✅ Generic CRUD operations
- ✅ Pagination support
- ✅ Search/filter
- ✅ Sort

#### 3. **useOptimized** - Optimized data fetching
**ไฟล์:** `src/hooks/useOptimized.js`

**Features:**
- ✅ Debounced search
- ✅ Memoized results
- ✅ Request deduplication
- ✅ Cache management

#### 4. **useAuthLogin** - Authentication
**ไฟล์:** `src/hooks/useAuthLogin.js`

**Functions:**
```javascript
const {
  login,
  logout,
  user,
  loading,
  error
} = useAuthLogin();
```

**Features:**
- ✅ Session management
- ✅ Auto-redirect
- ✅ Remember me
- ✅ Error handling

#### 5. **usePagination** - Pagination logic
**ไฟล์:** `src/hooks/usePagination.js`

**Functions:**
```javascript
const {
  page,
  totalPages,
  goToPage,
  nextPage,
  prevPage,
  setItemsPerPage
} = usePagination(totalItems, itemsPerPage);
```

#### 6. **useSchema** - Schema management
**ไฟล์:** `src/hooks/useSchema.js`

**Functions:**
```javascript
const {
  schema,
  loading,
  addColumn,
  updateColumn,
  deleteColumn
} = useSchema(tableName);
```

#### 7. **useLoginSlider** - Login slider logic
**ไฟล์:** `src/hooks/useLoginSlider.js`

### Utility Libraries

#### 1. **db.js** - Database connection
**Functions:**
- `query(sql, params)` - Execute SQL
- `getConnection()` - Get pool connection
- `transaction(callback)` - Run transaction

**Features:**
- ✅ Connection pooling
- ✅ Error handling
- ✅ Query logging
- ✅ Timezone handling (Asia/Bangkok)

#### 2. **auth-service.js** - Authentication service
**Functions:**
- `hashPassword(password)` - bcrypt hash
- `verifyPassword(password, hash)` - Verify
- `createSession(user)` - Create session
- `getSession(req)` - Get current session
- `destroySession(req)` - Logout

#### 3. **activityLogger.js** - Activity logging
**Functions:**
- `logActivity(userId, action, entityType, entityId, details, req)`

**Actions:**
- CREATE, UPDATE, DELETE, LOGIN, LOGOUT, VIEW, EXPORT

#### 4. **cache.js** - Caching service
**Functions:**
- `get(key)` - Get from cache
- `set(key, value, ttl)` - Set cache
- `del(key)` - Delete cache
- `clear()` - Clear all cache

**Features:**
- ✅ In-memory cache
- ✅ TTL support
- ✅ LRU eviction
- ✅ Cache statistics

#### 5. **security.js** - Security utilities
**Functions:**
- `sanitizeInput(input)` - XSS prevention
- `validateEmail(email)` - Email validation
- `validatePhone(phone)` - Phone validation
- `checkPermission(user, action, resource)` - RBAC

#### 6. **performance.js** - Performance monitoring
**Functions:**
- `measureTime(label, fn)` - Measure execution time
- `logPerformance(metric)` - Log metrics
- `getMetrics()` - Get all metrics

#### 7. **logger.js** - Logging service
**Functions:**
- `log(level, message, meta)` - Log message
- `error(message, error)` - Log error
- `warn(message)` - Log warning
- `info(message)` - Log info

#### 8. **pdfExport.js** - PDF generation
**Functions:**
- `generateShopPDF(shop)` - Shop PDF
- `generateLicensePDF(license)` - License PDF
- `generateReportPDF(data)` - Report PDF

**Features:**
- ✅ Thai font support (Sarabun)
- ✅ Custom styling
- ✅ Tables and charts
- ✅ Headers/footers

#### 9. **api-helpers.js** - API utilities
**Functions:**
- `handleError(error, res)` - Error handler
- `validateRequest(schema, data)` - Validation
- `paginate(query, page, limit)` - Pagination helper
- `buildSearchQuery(fields, search)` - Search builder

#### 10. **response.js** - Response helpers
**Functions:**
- `success(data, message)` - Success response
- `error(message, code)` - Error response

#### 11. **session.js** - Session management
**Functions:**
- `getIronSession(req, res)` - Get session
- `sessionOptions` - Session config

#### 12. **swr-config.js** - SWR configuration
**Config:**
- Revalidate on focus
- Dedupe interval
- Error retry
- Cache provider

---

## 🔐 Security และ Authentication

### Authentication Flow

1. **Login Process:**
   ```
   User Input → Validate → bcrypt Compare → Create Session → Redirect
   ```

2. **Session Management:**
   - Iron Session (encrypted cookies)
   - HttpOnly cookies
   - Secure flag (HTTPS)
   - SameSite: Lax

3. **Password Security:**
   - bcrypt hashing (10 rounds)
   - No plain text storage
   - Password strength validation

### Authorization

**Role-Based Access Control (RBAC):**

| Role  | Permissions |
|-------|-------------|
| admin | Full access (CRUD all entities, manage users) |
| user  | Read-only (view shops, licenses) |

**Protected Routes:**
- All `/dashboard/*` routes require authentication
- Middleware checks session on every request
- Auto-redirect to login if not authenticated

### Security Features

1. **Input Validation:**
   - XSS prevention (sanitize inputs)
   - SQL injection prevention (parameterized queries)
   - CSRF protection (session tokens)

2. **Rate Limiting:**
   - Login attempts (5 per minute)
   - API calls (100 per minute)

3. **Activity Logging:**
   - All CRUD operations logged
   - IP address tracking
   - User agent tracking

4. **Data Protection:**
   - Passwords hashed with bcrypt
   - Sensitive data encrypted
   - HTTPS enforced (production)

---

## ⚡ Performance Optimization

### Caching Strategy

1. **API Response Caching:**
   - Dashboard stats: 30s
   - License types: 5 minutes
   - Shops list: 60s
   - Custom fields: 2 minutes

2. **SWR Client-Side Caching:**
   - Stale-while-revalidate
   - Dedupe requests
   - Focus revalidation

3. **Database Optimization:**
   - Indexes on frequently queried columns
   - Connection pooling
   - Query optimization

### Database Indexes

```sql
-- Performance indexes
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_custom_fields_entity_type ON custom_fields(entity_type);
CREATE INDEX idx_custom_fields_active ON custom_fields(is_active);
CREATE INDEX idx_custom_field_values_entity ON custom_field_values(entity_id);
CREATE INDEX idx_custom_field_values_field ON custom_field_values(custom_field_id);
```

### Frontend Optimization

1. **Code Splitting:**
   - Dynamic imports for heavy components
   - Route-based splitting
   - Lazy loading

2. **Image Optimization:**
   - Next.js Image component
   - WebP format
   - Lazy loading

3. **Bundle Optimization:**
   - Tree shaking
   - Minification
   - Compression (gzip)

---

## 📊 ฟังก์ชันหลักของระบบ

### 1. การจัดการร้านค้า (Shop Management)

**ฟีเจอร์:**
- ✅ เพิ่ม/แก้ไข/ลบร้านค้า
- ✅ ค้นหาและกรองข้อมูล
- ✅ เรียงลำดับตามคอลัมน์
- ✅ แสดงจำนวนใบอนุญาต
- ✅ Custom fields แบบ dynamic
- ✅ Export เป็น PDF
- ✅ Inline editing ในตาราง
- ✅ Bulk operations

**Use Cases:**
- สร้างร้านค้าพร้อมใบอนุญาต
- แก้ไขข้อมูลร้านค้าแบบเร็ว
- ดูประวัติใบอนุญาตทั้งหมด
- Export รายงานร้านค้า

### 2. การจัดการใบอนุญาต (License Management)

**ฟีเจอร์:**
- ✅ เพิ่ม/แก้ไข/ลบใบอนุญาต
- ✅ คำนวณวันหมดอายุอัตโนมัติ
- ✅ แสดงสถานะ (active/expired)
- ✅ แจ้งเตือนใกล้หมดอายุ
- ✅ กรองตามสถานะ/ประเภท
- ✅ Custom fields
- ✅ Export PDF

**Use Cases:**
- ออกใบอนุญาตใหม่
- ต่ออายุใบอนุญาต
- ตรวจสอบใบอนุญาตที่หมดอายุ
- รายงานใบอนุญาตตามประเภท

### 3. การจัดการประเภทใบอนุญาต (License Type Management)

**ฟีเจอร์:**
- ✅ กำหนดประเภทใบอนุญาต
- ✅ ตั้งค่าระยะเวลาและราคา
- ✅ นับจำนวนใบอนุญาตแต่ละประเภท
- ✅ แก้ไขข้อมูลประเภท

**Use Cases:**
- สร้างประเภทใบอนุญาตใหม่
- ปรับราคาและระยะเวลา
- ดูสถิติการใช้งานแต่ละประเภท

### 4. Custom Fields System

**ฟีเจอร์:**
- ✅ สร้างฟิลด์เพิ่มเติมแบบ dynamic
- ✅ รองรับหลายประเภทข้อมูล
- ✅ กำหนดฟิลด์บังคับ
- ✅ ควบคุมการแสดงผล
- ✅ จัดเรียงลำดับ

**Supported Field Types:**
- text - ข้อความสั้น
- number - ตัวเลข
- date - วันที่
- textarea - ข้อความยาว
- select - เลือกจาก dropdown

**Use Cases:**
- เพิ่มฟิลด์เลขประจำตัวผู้เสียภาษี
- เพิ่มฟิลด์วันที่จดทะเบียน
- เพิ่มฟิลด์ประเภทธุรกิจ
- เพิ่มฟิลด์หมายเหตุพิเศษ

### 5. Dashboard และ Analytics

**ฟีเจอร์:**
- ✅ สถิติภาพรวม (ร้านค้า, ใบอนุญาต)
- ✅ กราฟแสดงข้อมูล
- ✅ รายการใบอนุญาตใกล้หมดอายุ
- ✅ กิจกรรมล่าสุด
- ✅ สถิติตามประเภทใบอนุญาต

**Charts:**
- Pie Chart - สัดส่วนสถานะใบอนุญาต
- Bar Chart - จำนวนใบอนุญาตตามประเภท
- Line Chart - แนวโน้มรายเดือน
- Doughnut Chart - ใบอนุญาตใกล้หมดอายุ

### 6. Activity Logs

**ฟีเจอร์:**
- ✅ บันทึกทุกการกระทำ
- ✅ แสดงผู้ใช้, เวลา, การกระทำ
- ✅ กรองตามผู้ใช้/การกระทำ
- ✅ รายละเอียดการเปลี่ยนแปลง
- ✅ ลบประวัติเก่า

**Logged Actions:**
- CREATE - สร้างข้อมูลใหม่
- UPDATE - แก้ไขข้อมูล
- DELETE - ลบข้อมูล
- LOGIN - เข้าสู่ระบบ
- LOGOUT - ออกจากระบบ
- VIEW - ดูข้อมูล
- EXPORT - Export ข้อมูล

### 7. User Management

**ฟีเจอร์:**
- ✅ เพิ่ม/แก้ไข/ลบผู้ใช้
- ✅ กำหนด role (admin/user)
- ✅ เปลี่ยนรหัสผ่าน
- ✅ ดูประวัติการใช้งาน

**Roles:**
- **admin** - จัดการทุกอย่างได้
- **user** - ดูข้อมูลอย่างเดียว

### 8. Export และ Reporting

**ฟีเจอร์:**
- ✅ Export เป็น PDF
- ✅ รองรับภาษาไทย
- ✅ Custom styling
- ✅ Include custom fields
- ✅ Export ทีละรายการหรือทั้งหมด

**Export Types:**
- รายงานร้านค้า
- รายงานใบอนุญาต
- รายงานประเภทใบอนุญาต
- รายงานสรุป

---

## 🎯 สรุปฟังก์ชันทั้งหมด

### ฟังก์ชันหลัก (Core Features)
1. ✅ ระบบจัดการร้านค้า (CRUD)
2. ✅ ระบบจัดการใบอนุญาต (CRUD)
3. ✅ ระบบจัดการประเภทใบอนุญาต (CRUD)
4. ✅ ระบบ Custom Fields แบบ Dynamic
5. ✅ ระบบ Authentication & Authorization
6. ✅ ระบบ Activity Logging
7. ✅ Dashboard & Analytics
8. ✅ Export PDF

### ฟังก์ชันเสริม (Additional Features)
9. ✅ ตารางแบบ Excel (Inline editing)
10. ✅ ค้นหาและกรองข้อมูล
11. ✅ Pagination
12. ✅ Sorting
13. ✅ Caching
14. ✅ Performance Optimization
15. ✅ Responsive Design
16. ✅ Error Handling
17. ✅ Loading States
18. ✅ Validation

### จำนวนทั้งหมด
- **API Endpoints:** 22 endpoints
- **Database Tables:** 10 tables
- **Components:** 26+ components
- **Custom Hooks:** 8 hooks
- **Utility Functions:** 13 libraries
- **Pages:** 10+ pages

---

**เอกสารนี้ครอบคลุมฟังก์ชันการทำงานทั้งหมดของระบบ Shop License System**

✅ **Phase 1 - Task 3: วิเคราะห์ฟังก์ชันการทำงานทั้งหมด - เสร็จสมบูรณ์**
