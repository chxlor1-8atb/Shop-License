# AGENTS.md - AI Vibe Coding Project Rules

> **Project:** Shop License System  
> **Version:** 1.0.0  
> **Last Updated:** 2026-01-03  
> **Package Manager:** pnpm

---

## 📌 Project Overview

ระบบจัดการใบอนุญาตร้านค้า (Shop License Management System) สำหรับติดตามสถานะใบอนุญาตของร้านค้าต่างๆ

**Core Features:**

- จัดการข้อมูลร้านค้า (CRUD)
- จัดการใบอนุญาต (CRUD)
- จัดการประเภทใบอนุญาต
- Dashboard แสดงสถิติและสถานะ
- Export ข้อมูลเป็น CSV
- ระบบ Authentication (Login/Logout)
- Custom Fields & Entities (Dynamic fields)

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
| **Charts**         | Chart.js + react-chartjs-2              |
| **Alerts/Dialogs** | SweetAlert2                             |
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
├── jsconfig.json                  # JS path aliases (@/lib, @/components)
├── package.json                   # Dependencies & scripts
├── schema.sql                     # 📊 Database schema definition
├── verify-db.mjs                  # Database verification script
├── README.md                      # Project documentation
│
├── public/                        # Static assets (images, fonts, favicon)
│
├── scripts/                       # 📜 Database & maintenance scripts
│   ├── seed-sample.mjs            # Sample data seeder
│   ├── force-reset-all.js         # Full database reset
│   ├── reset-db.js                # Reset database tables
│   ├── reset-password.js          # Reset user password
│   ├── migrate.mjs                # Database migrations
│   ├── migrate-notifications.js   # Notification tables migration
│   ├── check-user.js              # Check user in database
│   ├── list-tables.js             # List all database tables
│   ├── verify-db.js               # Verify database connection
│   └── debug-expiring.js          # Debug expiring licenses
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── globals.css            # Global CSS imports
│   │   ├── layout.js              # Root layout (imports styles)
│   │   ├── page.js                # Home page (redirects to login)
│   │   │
│   │   ├── api/                   # 🔌 Backend API Routes
│   │   │   ├── auth/route.js              # POST: Login/Logout
│   │   │   ├── dashboard/route.js         # GET: Dashboard stats
│   │   │   ├── shops/route.js             # CRUD: Shops
│   │   │   ├── licenses/route.js          # CRUD: Licenses
│   │   │   ├── licenses/[id]/route.js     # Single license operations
│   │   │   ├── license-types/route.js     # CRUD: License types
│   │   │   ├── users/route.js             # CRUD: Users
│   │   │   ├── notifications/route.js     # Notification settings
│   │   │   ├── export/route.js            # CSV export
│   │   │   ├── entities/route.js          # Dynamic entities
│   │   │   ├── entity-fields/route.js     # Entity field definitions
│   │   │   ├── entity-records/route.js    # Entity records
│   │   │   ├── custom-fields/route.js     # Custom field definitions
│   │   │   ├── custom-field-values/route.js # Custom field values
│   │   │   └── migrate/route.js           # Database migration API
│   │   │
│   │   ├── login/                 # 🔐 Login page
│   │   │   └── page.jsx
│   │   │
│   │   └── dashboard/             # 🖥 Protected Dashboard Pages
│   │       ├── layout.jsx         # Dashboard layout (sidebar, header)
│   │       ├── page.jsx           # Main dashboard (stats, charts)
│   │       ├── shops/page.jsx     # Shops management
│   │       ├── licenses/page.jsx  # Licenses management
│   │       ├── license-types/page.jsx  # License types
│   │       ├── users/page.jsx     # Users management
│   │       ├── expiring/page.jsx  # Expiring licenses view
│   │       ├── notifications/page.jsx  # Notification settings
│   │       ├── export/page.jsx    # Export data page
│   │       ├── data/page.jsx      # Data management
│   │       └── settings/          # System settings
│   │           └── page.jsx
│   │
│   ├── components/                # 🧩 Reusable React Components
│   │   ├── Loading.jsx            # Loading spinner component
│   │   └── ui/                    # UI atoms (buttons, inputs)
│   │       └── ...
│   │
│   ├── lib/                       # 📚 Utility Libraries
│   │   ├── db.js                  # Database connection & query helpers
│   │   ├── session.js             # iron-session configuration
│   │   ├── security.js            # Security utilities (validation, sanitize)
│   │   ├── logger.js              # Logging utilities
│   │   ├── response.js            # API response helpers
│   │   ├── telegram.js            # Telegram bot integration
│   │   └── notification-service.js # Notification service logic
│   │
│   ├── scripts/                   # Additional scripts (in src)
│   │
│   ├── styles/                    # 🎨 CSS Stylesheets
│   │   ├── style.css              # Main dashboard styles (107KB)
│   │   ├── login-base.css         # Login page base styles
│   │   ├── login-responsive.css   # Login responsive styles
│   │   └── login-slide.css        # Login animations
│   │
│   └── style-responsive.css       # Responsive utilities
│

---


## 📊 Database Schema

### Tables Overview

| Table                  | Description                        |
| ---------------------- | ---------------------------------- |
| `users`                | Admin/User accounts                |
| `shops`                | Shop information                   |
| `license_types`        | Types of licenses                  |
| `licenses`             | License records (FK to shops/types)|
| `notification_settings`| Telegram notification config       |
| `notification_logs`    | Notification history               |

### Key Relationships
```

shops (1) ──────< (N) licenses
license_types (1) ──────< (N) licenses

````

### Important Columns

**users table:**
```sql
id SERIAL PRIMARY KEY
username VARCHAR(255) UNIQUE NOT NULL
password VARCHAR(255) NOT NULL      -- bcrypt hashed
full_name VARCHAR(255)
role VARCHAR(50) DEFAULT 'user'     -- 'admin' | 'user'
````

**shops table:**

```sql
id SERIAL PRIMARY KEY
shop_name VARCHAR(255) NOT NULL
owner_name VARCHAR(255)
address TEXT
phone VARCHAR(50)
email VARCHAR(255)
notes TEXT
```

**licenses table:**

```sql
id SERIAL PRIMARY KEY
shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE
license_type_id INTEGER REFERENCES license_types(id)
license_number VARCHAR(100) NOT NULL
issue_date DATE
expiry_date DATE                    -- Used for expiration checks
status VARCHAR(50) DEFAULT 'active' -- 'active' | 'expired' | 'pending'
notes TEXT
```

---

## ⚙️ Environment Variables

```env
# Database (Required) - Neon PostgreSQL connection string
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Session (Required) - Must be at least 32 characters
SESSION_SECRET=your_32_character_secret_here

# Telegram Notifications (Optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

---

## 🔧 Development Commands

```bash
# Install dependencies
pnpm install

# Start development server (http://localhost:3000)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint

# Database Scripts
node scripts/force-reset-all.js    # Reset all tables
node scripts/seed-sample.mjs       # Seed sample data
node scripts/reset-password.js     # Reset user password
node scripts/check-user.js         # Check user exists
node scripts/list-tables.js        # List all tables
node scripts/verify-db.js          # Verify DB connection
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
1. User visits /login
2. Submits username + password
3. POST /api/auth validates with bcrypt
4. On success: Create iron-session cookie (30 min expiry)
5. Redirect to /dashboard
6. middleware.js adds security headers to all routes
7. API routes check session.user for protected endpoints
8. Logout: Clear session cookie
```

**Session Cookie Config (from session.js):**

- Cookie name: `shop_license_session`
- Max age: 30 minutes
- HTTP Only: true
- Secure: true (in production)

**Protected Routes:** All `/dashboard/*` routes require login

---

## 📋 API Endpoints Reference

### Authentication

| Method | Endpoint    | Description                |
| ------ | ----------- | -------------------------- |
| POST   | `/api/auth` | Login (username, password) |

### Core Resources

| Method | Endpoint                     | Description                  |
| ------ | ---------------------------- | ---------------------------- |
| GET    | `/api/dashboard`             | Get dashboard stats & charts |
| GET    | `/api/shops`                 | List all shops               |
| POST   | `/api/shops`                 | Create shop                  |
| PUT    | `/api/shops`                 | Update shop                  |
| DELETE | `/api/shops?id={id}`         | Delete shop                  |
| GET    | `/api/licenses`              | List licenses (with JOINs)   |
| POST   | `/api/licenses`              | Create license               |
| PUT    | `/api/licenses`              | Update license               |
| DELETE | `/api/licenses?id={id}`      | Delete license               |
| GET    | `/api/license-types`         | List license types           |
| POST   | `/api/license-types`         | Create license type          |
| PUT    | `/api/license-types`         | Update license type          |
| DELETE | `/api/license-types?id={id}` | Delete license type          |
| GET    | `/api/users`                 | List users                   |
| POST   | `/api/users`                 | Create user                  |
| PUT    | `/api/users`                 | Update user                  |
| DELETE | `/api/users?id={id}`         | Delete user                  |

### Features

| Method | Endpoint             | Description                |
| ------ | -------------------- | -------------------------- |
| GET    | `/api/export`        | Export licenses as CSV     |
| GET    | `/api/notifications` | Get notification settings  |
| POST   | `/api/notifications` | Update notification config |

### Dynamic Fields (Advanced)

| Method | Endpoint                   | Description             |
| ------ | -------------------------- | ----------------------- |
| GET    | `/api/entities`            | List custom entities    |
| GET    | `/api/entity-fields`       | List entity fields      |
| GET    | `/api/entity-records`      | List entity records     |
| GET    | `/api/custom-fields`       | List custom fields      |
| GET    | `/api/custom-field-values` | Get custom field values |

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

- [x] Database schema configured with Neon PostgreSQL
- [x] Authentication system with iron-session
- [x] Dashboard with stats and charts (Chart.js)
- [x] CRUD for shops, licenses, license-types, users
- [x] Telegram notification integration
- [x] CSV export functionality
- [x] Security headers middleware
- [x] Input validation & sanitization
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
│   └── imports: src/styles/style.css
│   └── imports: src/styles/login-base.css
│   └── imports: src/styles/login-responsive.css
│   └── imports: src/styles/login-slide.css

API routes
├── imports: @/lib/db.js (database operations)
├── imports: @/lib/session.js (authentication)
├── imports: @/lib/security.js (validation)
└── imports: next/server (NextResponse)

Dashboard pages
├── imports: react (useState, useEffect)
├── imports: sweetalert2 (alerts)
├── imports: chart.js (charts)
└── imports: @/components/... (shared components)
```
