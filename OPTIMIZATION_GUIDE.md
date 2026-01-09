# 🚀 คู่มือ Optimization สำหรับ Vercel + Neon Database

## สารบัญ

1. [Database Optimization](#1-database-optimization)
2. [API Route Optimization](#2-api-route-optimization)
3. [Next.js Configuration](#3-nextjs-configuration)
4. [Vercel Configuration](#4-vercel-configuration)
5. [Frontend Optimization](#5-frontend-optimization)
6. [Caching Strategy](#6-caching-strategy)
7. [Monitoring & Debugging](#7-monitoring--debugging)

---

## 1. Database Optimization

### 1.1 ใช้ Connection Pooling (สำคัญมาก!)

**ปัญหา**: Serverless functions สร้าง connection ใหม่ทุกครั้ง ทำให้ช้าและกิน resource

**วิธีแก้**: ใช้ Pooled Connection String จาก Neon

```env
# .env.local
# ❌ ไม่ดี - ใช้ Direct Connection
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"

# ✅ ดี - ใช้ Pooler Connection (มี -pooler ใน hostname)
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.neon.tech/neondb?sslmode=require"
```

### 1.2 เพิ่ม Index ในฐานข้อมูล

เพิ่ม Index สำหรับ columns ที่ค้นหาบ่อย:

```sql
-- licenses table - ค้นหาตาม status, shop_id, expiry_date บ่อย
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_shop_id ON licenses(shop_id);
CREATE INDEX IF NOT EXISTS idx_licenses_expiry_date ON licenses(expiry_date);
CREATE INDEX IF NOT EXISTS idx_licenses_license_type_id ON licenses(license_type_id);

-- Composite index สำหรับ query ที่ใช้บ่อย
CREATE INDEX IF NOT EXISTS idx_licenses_status_expiry ON licenses(status, expiry_date);
CREATE INDEX IF NOT EXISTS idx_licenses_shop_type ON licenses(shop_id, license_type_id);

-- shops table
CREATE INDEX IF NOT EXISTS idx_shops_shop_name ON shops(shop_name);
CREATE INDEX IF NOT EXISTS idx_shops_shop_name_gin ON shops USING gin(shop_name gin_trgm_ops);

-- users table
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- audit_logs - ค้นหาตาม user_id และ created_at
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
```

### 1.3 Query Optimization

**ก่อน (ช้า)**:

```javascript
// ❌ SELECT * ดึงทุก column
const licenses = await fetchAll("SELECT * FROM licenses");
```

**หลัง (เร็ว)**:

```javascript
// ✅ เลือกเฉพาะ columns ที่ต้องการ
const licenses = await fetchAll(`
  SELECT id, license_number, status, expiry_date, shop_id 
  FROM licenses 
  WHERE status = 'active'
  LIMIT 50
`);
```

### 1.4 ใช้ Batch Queries

```javascript
// ❌ ช้า - หลาย queries
const shops = await fetchAll("SELECT * FROM shops");
const licenses = await fetchAll("SELECT * FROM licenses");
const types = await fetchAll("SELECT * FROM license_types");

// ✅ เร็ว - Single query with JOINs หรือ Promise.all
const [shops, licenses, types] = await Promise.all([
  fetchAll("SELECT id, shop_name FROM shops"),
  fetchAll("SELECT id, license_number, shop_id FROM licenses"),
  fetchAll("SELECT id, name FROM license_types"),
]);
```

### 1.5 Neon Serverless HTTP Mode

อัพเดต `src/lib/db.js` เพื่อใช้ HTTP mode (เร็วกว่า WebSocket สำหรับ serverless):

```javascript
import { neon, neonConfig } from "@neondatabase/serverless";

// Enable HTTP mode for faster cold starts
neonConfig.fetchConnectionCache = true;

let sql;
try {
  sql = neon(process.env.DATABASE_URL, {
    fetchOptions: {
      // Enable HTTP fetch caching
    },
  });
} catch (e) {
  console.error("Failed to initialize Neon client:", e);
}

export default sql;
```

---

## 2. API Route Optimization

### 2.1 ใช้ Edge Runtime (เมื่อเป็นไปได้)

Edge Runtime มี cold start ต่ำมาก (~50ms vs ~500ms)

```javascript
// src/app/api/dashboard/route.js

// เพิ่มบรรทัดนี้เพื่อใช้ Edge Runtime
export const runtime = "edge";

export async function GET(request) {
  // โค้ดเดิม
}
```

**⚠️ ข้อจำกัด Edge Runtime**:

- ไม่สามารถใช้ Node.js native modules บางตัว
- `bcryptjs` ใช้ได้ แต่ต้องระวัง
- Session management อาจต้องปรับ

### 2.2 Optimize Response Headers

```javascript
// เพิ่ม Cache headers สำหรับ data ที่ไม่เปลี่ยนบ่อย
export async function GET(request) {
  const data = await fetchData();

  return NextResponse.json(data, {
    headers: {
      // Cache 1 นาที, แล้ว revalidate
      "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
    },
  });
}
```

### 2.3 Reduce Payload Size

```javascript
// ❌ ส่ง data ทั้งหมด
return NextResponse.json({
  success: true,
  licenses: fullLicenses, // อาจมี 100+ fields
});

// ✅ ส่งเฉพาะที่จำเป็น
return NextResponse.json({
  success: true,
  licenses: licenses.map((l) => ({
    id: l.id,
    number: l.license_number,
    status: l.status,
    expiry: l.expiry_date,
  })),
});
```

### 2.4 Early Return Pattern

```javascript
export async function GET(request) {
  // ✅ Check auth ก่อน ถ้าไม่ผ่านก็ return เลย
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ต่อไปทำ database query
  const data = await fetchData();
  return NextResponse.json(data);
}
```

---

## 3. Next.js Configuration

### 3.1 อัพเดต `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Remove console.log in production
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Optimize package imports (ลด bundle size)
  experimental: {
    optimizePackageImports: [
      "chart.js",
      "react-chartjs-2",
      "sweetalert2",
      "bcryptjs",
      "@neondatabase/serverless",
    ],
  },

  // Webpack optimizations
  webpack: (config, { isServer }) => {
    // Tree shaking
    config.optimization.usedExports = true;

    return config;
  },

  // Cache static assets for 1 year
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // API routes caching
      {
        source: "/api/license-types",
        headers: [
          {
            key: "Cache-Control",
            value: "s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },

  // Rewrites for API optimization
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;
```

### 3.2 Dynamic Imports

```javascript
// ❌ Import ทั้งหมดตอน load
import Chart from "chart.js/auto";
import Swal from "sweetalert2";

// ✅ Dynamic import เมื่อต้องการใช้
const showAlert = async () => {
  const Swal = (await import("sweetalert2")).default;
  Swal.fire("Hello!");
};

// ✅ Next.js dynamic component
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("@/components/Chart"), {
  loading: () => <div>Loading chart...</div>,
  ssr: false, // ไม่ต้อง render ฝั่ง server
});
```

---

## 4. Vercel Configuration

### 4.1 อัพเดต `vercel.json`

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "installCommand": "npm install",
  "outputDirectory": ".next",

  "functions": {
    "src/app/api/**/*.js": {
      "memory": 256,
      "maxDuration": 10
    }
  },

  "headers": [
    {
      "source": "/api/license-types",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=3600, stale-while-revalidate"
        }
      ]
    },
    {
      "source": "/api/dashboard",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=60, stale-while-revalidate=300"
        }
      ]
    }
  ],

  "crons": []
}
```

### 4.2 Vercel Region Configuration

ตั้ง Region ใกล้กับ Neon Database:

- Neon: `ap-southeast-1` (Singapore)
- Vercel: ตั้งเป็น `sin1` (Singapore)

ใน Vercel Dashboard → Settings → Functions → Function Region

### 4.3 Environment Variables

```env
# Vercel Dashboard → Settings → Environment Variables

# Database (ใช้ pooler connection!)
DATABASE_URL="postgresql://...@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Session
SESSION_SECRET="your-very-long-secret-key-at-least-32-characters"

# Performance
NODE_ENV="production"
```

---

## 5. Frontend Optimization

### 5.1 Code Splitting

```javascript
// pages หรือ components ที่ไม่ใช้บ่อย
const AdminPanel = dynamic(() => import("@/components/AdminPanel"), {
  loading: () => <Spinner />,
});

const ExportModal = dynamic(() => import("@/components/ExportModal"), {
  loading: () => <Spinner />,
});
```

### 5.2 Optimize Fetching

```javascript
// ❌ Fetch ทุกครั้งที่ render
useEffect(() => {
  fetch("/api/data")
    .then((r) => r.json())
    .then(setData);
}, []);

// ✅ ใช้ SWR หรือ React Query - มี caching & deduplication
import useSWR from "swr";

const fetcher = (url) => fetch(url).then((r) => r.json());

function Dashboard() {
  const { data, error, isLoading } = useSWR("/api/dashboard", fetcher, {
    refreshInterval: 60000, // Refresh ทุก 1 นาที
    revalidateOnFocus: false,
    dedupingInterval: 5000, // ป้องกัน duplicate requests ใน 5 วินาที
  });
}
```

### 5.3 Image Optimization

```jsx
// ❌ HTML img tag
<img src="/logo.png" />;

// ✅ Next.js Image component
import Image from "next/image";

<Image
  src="/logo.png"
  width={200}
  height={100}
  alt="Logo"
  priority // สำหรับ above-the-fold images
  placeholder="blur"
  blurDataURL="data:image/..."
/>;
```

### 5.4 Lazy Loading

```javascript
// Intersection Observer สำหรับ lazy load
"use client";
import { useEffect, useRef, useState } from "react";

function LazySection({ children }) {
  const ref = useRef();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{isVisible ? children : <Skeleton />}</div>;
}
```

---

## 6. Caching Strategy

### 6.1 Static Data Caching

```javascript
// src/app/api/license-types/route.js
import { unstable_cache } from "next/cache";

const getCachedLicenseTypes = unstable_cache(
  async () => {
    return await fetchAll("SELECT * FROM license_types ORDER BY name");
  },
  ["license-types"],
  {
    revalidate: 3600, // Cache 1 ชั่วโมง
    tags: ["license-types"],
  }
);

export async function GET() {
  const types = await getCachedLicenseTypes();
  return NextResponse.json({ success: true, types });
}
```

### 6.2 Revalidation Strategy

```javascript
// ใช้ revalidateTag เมื่อ data เปลี่ยน
import { revalidateTag } from "next/cache";

export async function POST(request) {
  // บันทึก license type ใหม่
  await executeQuery("INSERT INTO license_types...");

  // Invalidate cache
  revalidateTag("license-types");

  return NextResponse.json({ success: true });
}
```

### 6.3 Browser Caching Headers

| Data Type       | Cache Strategy                            |
| --------------- | ----------------------------------------- |
| Static Assets   | `max-age=31536000, immutable`             |
| License Types   | `s-maxage=3600, stale-while-revalidate`   |
| Dashboard Stats | `s-maxage=60, stale-while-revalidate=300` |
| User Data       | `no-store` (sensitive data)               |
| Real-time Data  | `no-cache`                                |

---

## 7. Monitoring & Debugging

### 7.1 Vercel Speed Insights

โปรเจกต์ติดตั้ง `@vercel/speed-insights` แล้ว เพิ่มใน layout:

```jsx
// src/app/layout.js
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### 7.2 Neon Query Insights

ใน Neon Dashboard → Insights:

- ดู slow queries
- ดู query frequency
- ดู connection stats

### 7.3 Custom Performance Logging

```javascript
// src/lib/performance.js
export function measureQuery(queryName, queryFn) {
  return async (...args) => {
    const start = performance.now();
    try {
      const result = await queryFn(...args);
      const duration = performance.now() - start;

      if (duration > 100) {
        // Log queries > 100ms
        console.warn(`[SLOW QUERY] ${queryName}: ${duration.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      console.error(`[QUERY ERROR] ${queryName}:`, error);
      throw error;
    }
  };
}

// Usage
const getDashboard = measureQuery("getDashboard", async () => {
  return await fetchAll("SELECT ...");
});
```

---

## 📋 Quick Checklist

### Database

- [ ] ใช้ **Pooled Connection** (`-pooler` endpoint)
- [ ] สร้าง **Index** บน columns ที่ค้นหาบ่อย
- [ ] `SELECT` เฉพาะ columns ที่ต้องการ
- [ ] ใช้ `LIMIT` และ Pagination
- [ ] ใช้ `Promise.all()` สำหรับ parallel queries

### API Routes

- [ ] พิจารณาใช้ Edge Runtime
- [ ] เพิ่ม Cache headers
- [ ] ลด Response payload
- [ ] Early return pattern

### Next.js

- [ ] Enable `optimizePackageImports`
- [ ] ใช้ Dynamic imports
- [ ] Remove console.log in production
- [ ] Image optimization

### Vercel

- [ ] ตั้ง Region ใกล้ Database
- [ ] ตั้งค่า Function memory/duration
- [ ] เพิ่ม caching headers

### Frontend

- [ ] ใช้ SWR/React Query
- [ ] Code splitting
- [ ] Lazy loading
- [ ] Optimize images

---

## ⚡ ผลลัพธ์ที่คาดหวัง

| Metric              | ก่อน Optimize | หลัง Optimize |
| ------------------- | ------------- | ------------- |
| Function Cold Start | 500-1000ms    | 50-200ms      |
| API Response Time   | 200-500ms     | 50-150ms      |
| Database Query      | 100-300ms     | 20-80ms       |
| Page Load (LCP)     | 2-4s          | 1-2s          |
| Bundle Size         | 100%          | 60-70%        |
| CPU Usage           | 100%          | 40-60%        |

---

## 🔧 Next Steps

1. **Apply Database Indexes** - Run the SQL commands in Neon console
2. **Update Connection String** - Use pooled endpoint
3. **Apply next.config.js changes** - Already optimized
4. **Monitor with Vercel Insights** - Track improvements
5. **Iterate** - Optimize slowest endpoints first

---

## 🛡️ Safe Optimizations (ไม่กระทบระบบ)

วิธี optimize ที่ปลอดภัย 100% ไม่ต้องแก้ code:

### 1. Run SQL Indexes (Neon Console)

เปิด **Neon Dashboard → SQL Editor** แล้ว run:

```sql
-- licenses table indexes
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_shop_id ON licenses(shop_id);
CREATE INDEX IF NOT EXISTS idx_licenses_expiry_date ON licenses(expiry_date);
CREATE INDEX IF NOT EXISTS idx_licenses_status_expiry ON licenses(status, expiry_date);
CREATE INDEX IF NOT EXISTS idx_licenses_license_type_id ON licenses(license_type_id);

-- shops table
CREATE INDEX IF NOT EXISTS idx_shops_shop_name ON shops(LOWER(shop_name));

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);

-- Analyze tables for query planner
ANALYZE licenses;
ANALYZE shops;
ANALYZE audit_logs;
```

**ผลลัพธ์**: Query เร็วขึ้น 50-80%

### 2. ตั้งค่า Vercel Region (Vercel Dashboard)

1. ไป **Vercel Dashboard** → Project → Settings
2. Functions → Function Region
3. เลือก **sin1 (Singapore)** (ใกล้กับ Neon ap-southeast-1)
4. Save

**ผลลัพธ์**: ลด latency 50-100ms ต่อ request

### 3. ตรวจสอบ Pooled Connection

ใน **Vercel Dashboard** → Settings → Environment Variables:

- ตรวจว่า `DATABASE_URL` มี `-pooler` ใน hostname
- ตัวอย่าง: `ep-xxx-pooler.ap-southeast-1.aws.neon.tech`

**ผลลัพธ์**: ลด connection overhead 30-50%

### 4. Neon Autoscaling (Neon Console)

1. ไป **Neon Console** → Project → Settings
2. Compute → Edit
3. ตั้งค่า:
   - Autoscaling: **ON**
   - Min compute: **0.25 CU**
   - Max compute: **2 CU**
   - Auto-suspend: **5 minutes**

**ผลลัพธ์**: ประหยัด compute + รองรับ spike traffic

### 5. เปิด Speed Insights (Vercel Dashboard)

1. ไป **Vercel Dashboard** → Project → Analytics
2. Enable **Speed Insights**
3. ดู Core Web Vitals

**ผลลัพธ์**: เห็นข้อมูล performance จริงจาก users

---

## 📊 สรุป Safe Optimizations

| วิธี              | ทำที่ไหน           | ผลลัพธ์                | ความเสี่ยง |
| ----------------- | ------------------ | ---------------------- | ---------- |
| SQL Indexes       | Neon Console       | Query เร็วขึ้น 50-80%  | ไม่มี      |
| Vercel Region     | Vercel Dashboard   | ลด latency 50-100ms    | ไม่มี      |
| Pooled Connection | Vercel Environment | ลด connection overhead | ไม่มี      |
| Neon Autoscaling  | Neon Console       | ประหยัด + scale        | ไม่มี      |
| Speed Insights    | Vercel Dashboard   | Monitoring             | ไม่มี      |

**ทั้งหมดทำได้โดยไม่ต้องแก้ code และไม่กระทบระบบ!**
