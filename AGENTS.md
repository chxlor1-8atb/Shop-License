# AGENTS.md - AI Vibe Coding Project Rules

> **Project:** Shop License System  
> **Version:** 2.0.0  
> **Last Updated:** 2026-02-10  
> **Package Manager:** npm

---

## 📌 Project Overview

ระบบจัดการใบอนุญาตร้านค้า (Shop License Management System) สำหรับติดตามสถานะใบอนุญาตของร้านค้าต่างๆ

**Core Features:**

- จัดการข้อมูลร้านค้า (CRUD) พร้อม Excel-like Table
- จัดการใบอนุญาต (CRUD) พร้อม Custom Fields
- จัดการประเภทใบอนุญาต (พร้อมราคา)
- Dashboard แสดงสถิติและสถานะ (Chart.js)
- Export ข้อมูลเป็น CSV และ PDF
- ระบบ Authentication (Login/Logout) + Profile management
- Custom Fields & Dynamic Schema (schema_definitions)
- Activity Logs (Audit trail)
- Cron Jobs (Cleanup tasks)
- Version/Changelog system (PatchNotes)
- SWR-based data fetching with caching

---

## 🛠 Tech Stack

| Category           | Technology                              |
| ------------------ | --------------------------------------- |
| **Framework**      | Next.js 14 (App Router)                 |
| **Language**       | JavaScript (ES6+), JSX                  |
| **Styling**        | Vanilla CSS (ไม่ใช้ Tailwind)           |
| **Database**       | Neon PostgreSQL (Serverless)            |
| **ORM/Query**      | Raw SQL with `@neondatabase/serverless` |
| **Auth**           | iron-session (cookie-based)             |
| **Password Hash**  | bcryptjs                                |
| **Data Fetching**  | SWR (stale-while-revalidate)            |
| **Charts**         | Chart.js + react-chartjs-2              |
| **Alerts/Dialogs** | SweetAlert2                             |
| **Icons**          | lucide-react, react-icons               |
| **PDF Export**     | pdfmake                                 |
| **Class Utils**    | clsx + tailwind-merge                   |
| **Analytics**      | @vercel/analytics + @vercel/speed-insights |
| **Fonts**          | next/font/google (Inter, Noto Sans Thai)|
| **HTTP Client**    | Native fetch API                        |

---

## 📁 Directory Structure

```
/
├── .env.local                     # 🔒 Environment variables (DO NOT COMMIT)
├── .gitignore                     # Git ignore rules
├── middleware.js                  # 🔒 Security headers middleware (CSP, XSS, etc.)
├── next.config.js                 # Next.js configuration
├── vercel.json                    # Vercel deployment config
├── jsconfig.json                  # JS path aliases (@/lib, @/components, @/hooks, etc.)
├── package.json                   # Dependencies & scripts
├── schema.sql                     # 📊 Database schema definition (V2 with custom fields)
├── README.md                      # Project documentation
├── AGENTS.md                      # AI coding rules (this file)
│
├── public/                        # Static assets
│   ├── fonts/                     # Custom fonts
│   └── image/                     # Images
│
├── scripts/                       # 📜 Database & maintenance scripts
│   ├── seed-sample.mjs            # Sample data seeder
│   ├── force-reset-all.js         # Full database reset
│   ├── reset-db.js                # Reset database tables
│   ├── reset-password.js          # Reset user password
│   ├── migrate.mjs                # Database migrations
│   ├── migrate_schema.mjs         # Schema migrations
│   ├── migrate-notifications.js   # Notification tables migration
│   ├── check-user.js              # Check user in database
│   ├── check-license-type.js      # Check license type
│   ├── list-tables.js             # List all database tables
│   ├── verify-db.js               # Verify database connection
│   ├── debug-expiring.js          # Debug expiring licenses
│   ├── generate-secret.js         # Generate session secret
│   ├── comprehensive-test.js      # Comprehensive test suite
│   ├── add-sample-custom-fields.mjs # Add sample custom fields
│   ├── cleanup-fields.mjs         # Cleanup orphaned fields
│   ├── fix-final-order.mjs        # Fix field display order
│   ├── set-correct-order.mjs      # Set correct field order
│   └── update-field-order.mjs     # Update field ordering
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── globals.css            # Global CSS (base body styles, font vars)
│   │   ├── layout.js              # Root layout (fonts, metadata, analytics)
│   │   ├── page.jsx               # 🔐 Login page (root = login)
│   │   │
│   │   ├── api/                   # 🔌 Backend API Routes
│   │   │   ├── auth/route.js              # POST: Login/Logout
│   │   │   ├── dashboard/route.js         # GET: Dashboard stats
│   │   │   ├── shops/route.js             # CRUD: Shops
│   │   │   ├── licenses/route.js          # CRUD: Licenses
│   │   │   ├── licenses/expiring/route.js # GET: Expiring licenses
│   │   │   ├── license-types/route.js     # CRUD: License types
│   │   │   ├── license-types-optimized/route.js # GET: Optimized license types
│   │   │   ├── users/route.js             # CRUD: Users
│   │   │   ├── profile/route.js           # GET/PUT: User profile
│   │   │   ├── export/route.js            # CSV export
│   │   │   ├── export-preview/route.js    # Export preview
│   │   │   ├── activity-logs/route.js     # GET: Activity/audit logs
│   │   │   ├── schema/route.js            # Dynamic schema definitions
│   │   │   ├── entities/route.js          # Dynamic entities
│   │   │   ├── entity-fields/route.js     # Entity field definitions
│   │   │   ├── entity-records/route.js    # Entity records
│   │   │   ├── custom-fields/route.js     # Custom field definitions
│   │   │   ├── custom-field-values/route.js # Custom field values
│   │   │   ├── cron/cleanup/route.js      # Cron: Cleanup tasks
│   │   │   ├── migrate/route.js           # Database migration API
│   │   │   ├── seed-shops/route.js        # Seed: Sample shops
│   │   │   ├── seed-custom-fields/route.js # Seed: Custom fields
│   │   │   └── seed-10-licenses/route.js  # Seed: Test licenses
│   │   │
│   │   └── dashboard/             # 🖥 Protected Dashboard Pages
│   │       ├── layout.jsx         # Dashboard layout (sidebar, header)
│   │       ├── page.jsx           # Main dashboard (stats, charts)
│   │       ├── shops/page.jsx     # Shops management (Excel-like table)
│   │       ├── licenses/page.jsx  # Licenses management
│   │       ├── license-types/page.jsx  # License types management
│   │       ├── users/page.jsx     # Users management
│   │       ├── expiring/page.jsx  # Expiring licenses view
│   │       ├── export/page.jsx    # Export data page (CSV/PDF)
│   │       ├── data/page.jsx      # Data management (dynamic entities)
│   │       ├── activity-logs/page.jsx  # Activity logs view
│   │       └── settings/          # ⚙️ System settings
│   │           ├── custom-fields/page.jsx  # Custom field management
│   │           ├── entities/page.jsx       # Entity management
│   │           └── fields/page.jsx         # Field definitions
│   │
│   ├── components/                # 🧩 Reusable React Components
│   │   ├── Loading.jsx            # Loading spinner component
│   │   ├── DashboardCharts.jsx    # Dashboard chart components
│   │   ├── PatchNotesModal.jsx    # Version changelog modal
│   │   ├── VersionBadge.jsx       # Version badge display
│   │   ├── ExcelTable/            # 📊 Excel-like table system
│   │   │   ├── index.jsx          # Main ExcelTable component
│   │   │   ├── ExcelTable.css     # Table styles
│   │   │   └── table/             # Table sub-components
│   │   │       ├── TableContextMenu.jsx  # Right-click context menu
│   │   │       ├── TableHeader.jsx       # Column headers
│   │   │       ├── TableHooks.js         # Table logic hooks
│   │   │       ├── TableRow.jsx          # Row rendering
│   │   │       └── TableToolbar.jsx      # Table toolbar
│   │   ├── login/                 # 🔐 Login components
│   │   │   ├── FeatureTag.jsx     # Feature tag display
│   │   │   ├── InputGroup.jsx     # Form input group
│   │   │   ├── LoginForm.jsx      # Login form component
│   │   │   ├── LoginSlider.jsx    # Login page slider
│   │   │   └── WaveDivider.jsx    # Wave divider decoration
│   │   └── ui/                    # UI atoms
│   │       ├── CustomSelect.jsx   # Custom dropdown select
│   │       ├── DatePicker.jsx     # Date picker component
│   │       ├── EditableCell.jsx   # Inline editable cell
│   │       ├── EditableHeader.jsx # Editable table header
│   │       ├── FilterRow.jsx      # Table filter row
│   │       ├── Modal.jsx          # Modal dialog
│   │       ├── Pagination.jsx     # Pagination component
│   │       ├── QuickAddModal.jsx  # Quick add record modal
│   │       ├── QuickAddModal.css  # Quick add modal styles
│   │       ├── ShopDetailModal.jsx # Shop detail view modal
│   │       ├── ShopDetailModal.css # Shop detail styles
│   │       ├── Skeleton.jsx       # Loading skeleton
│   │       ├── StatusBadge.jsx    # Status badge component
│   │       └── TableSkeleton.jsx  # Table loading skeleton
│   │
│   ├── hooks/                     # � Custom React Hooks
│   │   ├── index.js               # Re-exports all hooks
│   │   ├── useData.js             # SWR-based data hooks (shops, licenses, etc.)
│   │   ├── useShops.js            # Shop-specific operations
│   │   ├── useSchema.js           # Dynamic schema management
│   │   ├── usePagination.js       # Pagination logic
│   │   ├── useOptimized.js        # Performance hooks (debounce, throttle, etc.)
│   │   ├── useAuthLogin.js        # Login authentication logic
│   │   └── useLoginSlider.js      # Login slider animation
│   │
│   ├── constants/                 # 📋 Application Constants
│   │   ├── index.js               # Re-exports all constants
│   │   ├── api.js                 # API endpoint constants
│   │   ├── status.js              # Status definitions
│   │   └── changelog.js           # Version changelog data
│   │
│   ├── utils/                     # 🔧 Client-side Utilities
│   │   ├── index.js               # Re-exports all utils
│   │   ├── formatters.js          # Data formatting helpers
│   │   ├── alerts.js              # SweetAlert2 wrapper functions
│   │   └── auth.js                # Auth utility functions
│   │
│   ├── lib/                       # 📚 Server-side Libraries
│   │   ├── db.js                  # Database connection & query helpers
│   │   ├── session.js             # iron-session configuration
│   │   ├── security.js            # Security utilities (validation, sanitize)
│   │   ├── logger.js              # Logging utilities
│   │   ├── response.js            # API response helpers
│   │   ├── activityLogger.js      # Audit log writer
│   │   ├── api-helpers.js         # API route helper functions
│   │   ├── auth-service.js        # Authentication service logic
│   │   ├── cache.js               # Server-side caching
│   │   ├── performance.js         # Performance monitoring utilities
│   │   ├── swr-config.js          # SWR configuration
│   │   ├── pdfExport.js           # PDF export logic
│   │   ├── pdfExportSafe.js       # Safe PDF export (fallback)
│   │   └── serverPdfGenerator.js  # Server-side PDF generation
│   │
│   ├── styles/                    # 🎨 CSS Stylesheets
│   │   ├── style.css              # Main dashboard styles (~174KB)
│   │   ├── login-base.css         # Login page base styles
│   │   ├── login-responsive.css   # Login responsive styles
│   │   ├── login-slide.css        # Login animations
│   │   ├── sweetalert-custom.css  # SweetAlert2 custom theme
│   │   └── toast.css              # Toast notification styles
│   │
│   └── style-responsive.css       # Responsive utilities
│

---


## 📊 Database Schema

### Tables Overview

| Table                    | Description                              |
| ------------------------ | ---------------------------------------- |
| `users`                  | Admin/User accounts                      |
| `shops`                  | Shop information + custom_fields (JSONB) |
| `license_types`          | Types of licenses (with price)           |
| `licenses`               | License records + custom_fields (JSONB)  |
| `notification_settings`  | Notification config                      |
| `notification_logs`      | Notification history                     |
| `audit_logs`             | Activity/audit trail                     |
| `schema_definitions`     | Dynamic schema column definitions        |
| `custom_fields`          | Custom field definitions per entity      |
| `custom_field_values`    | Custom field values per entity record    |

### Key Relationships
```
shops (1) ──────< (N) licenses
license_types (1) ──────< (N) licenses
users (1) ──────< (N) audit_logs
custom_fields (1) ──────< (N) custom_field_values
```

### Important Columns

**users table:**
```sql
id SERIAL PRIMARY KEY
username VARCHAR(255) UNIQUE NOT NULL
password VARCHAR(255) NOT NULL      -- bcrypt hashed
full_name VARCHAR(255)
role VARCHAR(50) DEFAULT 'user'     -- 'admin' | 'user'
```

**shops table:**
```sql
id SERIAL PRIMARY KEY
shop_name VARCHAR(255) NOT NULL
owner_name VARCHAR(255)
address TEXT
phone VARCHAR(50)
email VARCHAR(255)
notes TEXT
custom_fields JSONB DEFAULT '{}'    -- V2: Dynamic custom fields
```

**licenses table:**
```sql
id SERIAL PRIMARY KEY
shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE
license_type_id INTEGER REFERENCES license_types(id) ON DELETE SET NULL
license_number VARCHAR(100) NOT NULL
issue_date DATE
expiry_date DATE                    -- Used for expiration checks
status VARCHAR(50) DEFAULT 'active' -- 'active' | 'expired' | 'pending'
notes TEXT
custom_fields JSONB DEFAULT '{}'    -- V2: Dynamic custom fields
```

**license_types table:**
```sql
id SERIAL PRIMARY KEY
name VARCHAR(255) NOT NULL
description TEXT
validity_days INTEGER DEFAULT 365
price NUMERIC DEFAULT 0             -- V2: License type price
```

**audit_logs table:**
```sql
id SERIAL PRIMARY KEY
user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
action VARCHAR(50) NOT NULL
entity_type VARCHAR(100)
entity_id INTEGER
details TEXT
ip_address VARCHAR(45)
user_agent TEXT
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**custom_fields table:**
```sql
id SERIAL PRIMARY KEY
entity_type VARCHAR(50) NOT NULL    -- 'shops' | 'licenses'
field_name VARCHAR(100) NOT NULL
field_label VARCHAR(255) NOT NULL
field_type VARCHAR(50) DEFAULT 'text'
field_options JSONB DEFAULT '[]'
is_required BOOLEAN DEFAULT false
is_active BOOLEAN DEFAULT true
display_order INTEGER DEFAULT 0
show_in_table BOOLEAN DEFAULT true
show_in_form BOOLEAN DEFAULT true
UNIQUE(entity_type, field_name)
```

**custom_field_values table:**
```sql
id SERIAL PRIMARY KEY
custom_field_id INTEGER REFERENCES custom_fields(id) ON DELETE CASCADE
entity_id INTEGER NOT NULL
field_value TEXT
UNIQUE(custom_field_id, entity_id)
```

---

## ⚙️ Environment Variables

```env
# Database (Required) - Neon PostgreSQL connection string
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Session (Required) - Must be at least 32 characters
SESSION_SECRET=your_32_character_secret_here
```

---

## 🔧 Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Database Scripts
node scripts/force-reset-all.js    # Reset all tables
node scripts/seed-sample.mjs       # Seed sample data
node scripts/reset-password.js     # Reset user password
node scripts/check-user.js         # Check user exists
node scripts/list-tables.js        # List all tables
node scripts/verify-db.js          # Verify DB connection
node scripts/migrate.mjs           # Run migrations
node scripts/migrate_schema.mjs    # Run schema migrations
node scripts/generate-secret.js    # Generate session secret
node scripts/comprehensive-test.js # Run comprehensive tests
```

---

## 📝 Coding Rules for AI

### General Rules

1. **Language**: ใช้ JavaScript เท่านั้น (ไม่ใช้ TypeScript)
2. **File Extension**: `.js` สำหรับ logic/API, `.jsx` สำหรับ React components
3. **No TypeScript**: ห้ามใช้ `.ts`, `.tsx` หรือ type annotations
4. **Export Style**: ใช้ `export default` สำหรับ components, named exports สำหรับ utilities
5. **Path Aliases**: ใช้ `@/lib/...`, `@/components/...` (configured in jsconfig.json)

### Component Rules

```jsx
// ✅ CORRECT - Functional component with default export
'use client';

import { useState, useEffect } from 'react';

export default function MyComponent() {
    const [data, setData] = useState([]);

    return <div className="card">Content</div>;
}

// ❌ WRONG - Class component
class MyComponent extends React.Component { }

// ❌ WRONG - Arrow function as default export
const MyComponent = () => { };
export default MyComponent;
```

### Styling Rules

```jsx
// ✅ CORRECT - Use CSS class from src/styles/
<div className="card">Content</div>
<button className="btn btn-primary">Submit</button>

// ❌ WRONG - Inline styles
<div style={{ padding: '20px' }}>Content</div>

// ❌ WRONG - Tailwind classes (NOT INSTALLED)
<div className="p-4 bg-blue-500">Content</div>
```

### API Route Rules (Next.js App Router)

```javascript
// ✅ CORRECT - src/app/api/[resource]/route.js
import { NextResponse } from "next/server";
import { query, fetchOne, insert } from "@/lib/db";
import { cookies } from "next/headers";
import { getSessionFromCookies } from "@/lib/session";

// GET - List all
export async function GET(request) {
  try {
    // Optional: Check auth
    const cookieStore = await cookies();
    const session = await getSessionFromCookies(cookieStore);
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await query("SELECT * FROM shops ORDER BY id");
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create
export async function POST(request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.shop_name) {
      return NextResponse.json(
        { error: "Shop name required" },
        { status: 400 }
      );
    }

    const newId = await insert("shops", {
      shop_name: body.shop_name,
      phone: body.phone || null,
    });

    return NextResponse.json({ success: true, id: newId });
  } catch (error) {
    console.error("POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    await update("shops", data, "id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    await remove("shops", "id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Database Query Rules

```javascript
// ✅ CORRECT - Import from @/lib/db
import { query, fetchOne, fetchAll, insert, update, remove } from "@/lib/db";

// Select all
const shops = await query("SELECT * FROM shops ORDER BY id");

// Select with params (use $1, $2, etc. for PostgreSQL)
const shop = await fetchOne("SELECT * FROM shops WHERE id = $1", [shopId]);

// Select with JOIN
const licenses = await query(`
    SELECT l.*, s.shop_name, lt.name as type_name
    FROM licenses l
    LEFT JOIN shops s ON l.shop_id = s.id
    LEFT JOIN license_types lt ON l.license_type_id = lt.id
    ORDER BY l.expiry_date
`);

// Insert (returns new id)
const newId = await insert("shops", {
  shop_name: "Test Shop",
  phone: "0891234567",
});

// Update (uses ? placeholder, converted internally)
await update("shops", { shop_name: "New Name" }, "id = ?", [shopId]);

// Delete
await remove("shops", "id = ?", [shopId]);

// ❌ WRONG - String concatenation (SQL Injection!)
const shops = await query(`SELECT * FROM shops WHERE id = ${id}`);

// ❌ WRONG - Using mysql2 syntax
const shops = await query("SELECT * FROM shops WHERE id = ?", [id]);
```

### Session/Auth Rules

```javascript
// ✅ CORRECT - Check session in API routes
import { cookies } from "next/headers";
import { getSessionFromCookies } from "@/lib/session";

export async function GET() {
  const cookieStore = await cookies();
  const session = await getSessionFromCookies(cookieStore);

  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // session.user contains: { id, username, fullName, role }
  console.log("User:", session.user.username);

  // ... proceed with authenticated request
}
```

### Error Handling Rules

```javascript
// ✅ CORRECT - Try/catch with detailed error response
try {
  const result = await query("SELECT * FROM shops");
  return NextResponse.json(result);
} catch (error) {
  console.error("API Error:", error);
  return NextResponse.json(
    {
      error: "Operation failed",
      details: error.message,
      code: error.code || "UNKNOWN",
    },
    { status: 500 }
  );
}
```

### SweetAlert2 Usage (Frontend)

```javascript
// ✅ CORRECT - Use Swal for user feedback
import Swal from "sweetalert2";

// Success message with auto-close
Swal.fire({
  icon: "success",
  title: "สำเร็จ!",
  text: "บันทึกข้อมูลเรียบร้อยแล้ว",
  timer: 1500,
  showConfirmButton: false,
});

// Error message
Swal.fire({
  icon: "error",
  title: "เกิดข้อผิดพลาด",
  text: error.message,
});

// Confirmation dialog before delete
const result = await Swal.fire({
  icon: "warning",
  title: "ยืนยันการลบ?",
  text: "คุณต้องการลบข้อมูลนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้",
  showCancelButton: true,
  confirmButtonColor: "#d33",
  cancelButtonColor: "#3085d6",
  confirmButtonText: "ลบ",
  cancelButtonText: "ยกเลิก",
});

if (result.isConfirmed) {
  // proceed with delete
  await fetch(`/api/shops?id=${id}`, { method: "DELETE" });
}
```

---

## 🔐 Authentication Flow

```
1. User visits / (root page = login page)
2. Submits username + password via LoginForm component
3. POST /api/auth validates with bcrypt
4. On success: Create iron-session cookie (30 min expiry)
5. Redirect to /dashboard
6. middleware.js adds security headers to all routes
7. API routes check session.user for protected endpoints
8. Logout: Clear session cookie via POST /api/auth
```

**Session Cookie Config (from session.js):**

- Cookie name: `shop_license_session`
- Max age: 30 minutes
- HTTP Only: true
- Secure: true (in production)

**Protected Routes:** All `/dashboard/*` routes require login

---

## 📋 API Endpoints Reference

### Authentication & Profile

| Method | Endpoint       | Description                |
| ------ | -------------- | -------------------------- |
| POST   | `/api/auth`    | Login/Logout               |
| GET    | `/api/profile` | Get current user profile   |
| PUT    | `/api/profile` | Update user profile        |

### Core Resources

| Method | Endpoint                          | Description                    |
| ------ | --------------------------------- | ------------------------------ |
| GET    | `/api/dashboard`                  | Get dashboard stats & charts   |
| GET    | `/api/shops`                      | List all shops                 |
| POST   | `/api/shops`                      | Create shop                    |
| PUT    | `/api/shops`                      | Update shop                    |
| DELETE | `/api/shops?id={id}`              | Delete shop                    |
| GET    | `/api/licenses`                   | List licenses (with JOINs)     |
| POST   | `/api/licenses`                   | Create license                 |
| PUT    | `/api/licenses`                   | Update license                 |
| DELETE | `/api/licenses?id={id}`           | Delete license                 |
| GET    | `/api/licenses/expiring`          | Get expiring licenses          |
| GET    | `/api/license-types`              | List license types             |
| POST   | `/api/license-types`              | Create license type            |
| PUT    | `/api/license-types`              | Update license type            |
| DELETE | `/api/license-types?id={id}`      | Delete license type            |
| GET    | `/api/license-types-optimized`    | Get license types (optimized)  |
| GET    | `/api/users`                      | List users                     |
| POST   | `/api/users`                      | Create user                    |
| PUT    | `/api/users`                      | Update user                    |
| DELETE | `/api/users?id={id}`              | Delete user                    |

### Features

| Method | Endpoint               | Description                |
| ------ | ---------------------- | -------------------------- |
| GET    | `/api/export`          | Export licenses as CSV     |
| GET    | `/api/export-preview`  | Preview export data        |
| GET    | `/api/activity-logs`   | Get activity/audit logs    |
| GET    | `/api/cron/cleanup`    | Trigger cleanup cron job   |

### Dynamic Fields & Schema

| Method | Endpoint                   | Description                 |
| ------ | -------------------------- | --------------------------- |
| GET    | `/api/schema`              | Get dynamic schema defs     |
| GET    | `/api/entities`            | List custom entities        |
| GET    | `/api/entity-fields`       | List entity fields          |
| GET    | `/api/entity-records`      | List entity records         |
| CRUD   | `/api/custom-fields`       | Custom field definitions    |
| CRUD   | `/api/custom-field-values` | Custom field values         |

### Seed & Migration (Dev only)

| Method | Endpoint                   | Description                 |
| ------ | -------------------------- | --------------------------- |
| POST   | `/api/migrate`             | Run database migrations     |
| POST   | `/api/seed-shops`          | Seed sample shops           |
| POST   | `/api/seed-custom-fields`  | Seed custom fields          |
| POST   | `/api/seed-10-licenses`    | Seed test licenses          |

---

## 🎨 CSS Class Naming Convention

Use descriptive, lowercase class names with hyphens (BEM-like):

```css
/* ✅ Good - Block__Element--Modifier pattern */
.card {
}
.card-header {
}
.card-body {
}
.btn {
}
.btn-primary {
}
.btn-danger {
}
.form-control {
}
.form-group {
}
.data-table {
}
.sidebar {
}
.sidebar-item {
}
.sidebar-item.active {
}

/* ❌ Bad - Mixed cases, unclear naming */
.Card {
}
.cardHeader {
}
.btnPrimary {
}
.BUTTON {
}
```

---

## 🔒 Security Features

The project includes these security measures (in `middleware.js` and `lib/security.js`):

1. **Security Headers:**

   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`
   - `Content-Security-Policy` (CSP)
   - `Referrer-Policy: strict-origin-when-cross-origin`

2. **Authentication:**

   - Password hashing with bcrypt
   - HTTP-only session cookies
   - Session expiry (30 minutes)

3. **Database:**
   - Parameterized queries (prevent SQL injection)
   - Input validation

---

## 🚫 Things to Avoid

1. ❌ **TypeScript** - This project uses JavaScript only
2. ❌ **Tailwind CSS** - Use vanilla CSS from `src/styles/`
3. ❌ **React Class Components** - Use functional components only
4. ❌ **Inline Styles** - Use CSS classes
5. ❌ **SQL String Concatenation** - Use parameterized queries
6. ❌ **console.log in production** - Use proper error handling
7. ❌ **Using mysql2 syntax** - Use PostgreSQL $1, $2 params
8. ❌ **Hardcoding credentials** - Use environment variables

---

## 📝 Current Context / Memory

_Notes for AI about current work in progress:_

- [x] Database schema configured with Neon PostgreSQL (V2 with custom fields)
- [x] Authentication system with iron-session + profile management
- [x] Dashboard with stats and charts (Chart.js + react-chartjs-2)
- [x] CRUD for shops, licenses, license-types, users
- [x] Excel-like table system (ExcelTable component)
- [x] CSV and PDF export functionality (pdfmake)
- [x] Security headers middleware (CSP, XSS, etc.)
- [x] Input validation & sanitization
- [x] Activity logs / Audit trail system
- [x] Custom Fields system (dynamic field definitions + values)
- [x] Dynamic Schema support (schema_definitions)
- [x] SWR-based data fetching with caching
- [x] Version/Changelog system (PatchNotesModal)
- [x] Cron jobs (cleanup tasks)
- [x] Performance optimization hooks (debounce, throttle, intersection observer)
- [x] Login page with slider animation
- [ ] Continue enhancement as requested

---

## 📚 Useful Patterns

### Fetch Data in Client Component

```jsx
"use client";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";

export default function ShopsPage() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShops();
  }, []);

  async function fetchShops() {
    try {
      setLoading(true);
      const res = await fetch("/api/shops");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setShops(data);
    } catch (error) {
      console.error("Fetch error:", error);
      Swal.fire({ icon: "error", title: "Error", text: error.message });
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="card">
      <div className="card-header">Shops ({shops.length})</div>
      <div className="card-body">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Shop Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shops.map((shop) => (
              <tr key={shop.id}>
                <td>{shop.id}</td>
                <td>{shop.shop_name}</td>
                <td>
                  <button onClick={() => handleEdit(shop)}>Edit</button>
                  <button onClick={() => handleDelete(shop.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### Form Submission Pattern

```jsx
const [formData, setFormData] = useState({
  shop_name: "",
  phone: "",
  email: "",
});

async function handleSubmit(e) {
  e.preventDefault();

  // Validate
  if (!formData.shop_name.trim()) {
    Swal.fire({
      icon: "warning",
      title: "Warning",
      text: "Shop name is required",
    });
    return;
  }

  try {
    const res = await fetch("/api/shops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Failed");
    }

    Swal.fire({ icon: "success", title: "สำเร็จ!", timer: 1500 });
    setFormData({ shop_name: "", phone: "", email: "" }); // Reset form
    fetchShops(); // Refresh list
  } catch (error) {
    Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.message });
  }
}
```

### Delete with Confirmation

```jsx
async function handleDelete(id) {
  const result = await Swal.fire({
    icon: "warning",
    title: "ยืนยันการลบ?",
    text: "การดำเนินการนี้ไม่สามารถย้อนกลับได้",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "ลบ",
    cancelButtonText: "ยกเลิก",
  });

  if (result.isConfirmed) {
    try {
      const res = await fetch(`/api/shops?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");

      Swal.fire({ icon: "success", title: "ลบแล้ว!", timer: 1500 });
      fetchShops(); // Refresh list
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error", text: error.message });
    }
  }
}
```

---

## 🔗 File Dependencies Map

```
layout.js
├── imports: globals.css
├── imports: @vercel/speed-insights
├── imports: @vercel/analytics
├── imports: next/font/google (Inter, Noto Sans Thai)
│
page.jsx (Login)
├── imports: @/components/login/FeatureTag
├── imports: @/components/login/LoginForm
├── imports: src/styles/login-base.css
├── imports: src/styles/login-responsive.css
└── imports: src/styles/login-slide.css

dashboard/layout.jsx
├── imports: src/styles/style.css
├── imports: src/styles/sweetalert-custom.css
├── imports: src/styles/toast.css
└── imports: src/style-responsive.css

API routes
├── imports: @/lib/db.js (database operations)
├── imports: @/lib/session.js (authentication)
├── imports: @/lib/security.js (validation)
├── imports: @/lib/activityLogger.js (audit logging)
├── imports: @/lib/api-helpers.js (route helpers)
└── imports: next/server (NextResponse)

Dashboard pages
├── imports: @/hooks/... (useData, usePagination, useOptimized, etc.)
├── imports: @/utils/... (alerts, formatters, auth)
├── imports: @/constants/... (api, status)
├── imports: @/components/... (ExcelTable, ui/*, etc.)
├── imports: sweetalert2 (alerts)
├── imports: chart.js (charts)
└── imports: swr (data fetching)
```
