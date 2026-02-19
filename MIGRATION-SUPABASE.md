# ย้ายจาก Neon ไป Supabase - Migration Guide

## ขั้นตอนที่ต้องทำ:

### 1. สร้าง Supabase Project
1. ไปที่ https://supabase.com
2. สร้าง project ใหม่
3. รอให้ project พร้อมใช้งาน (ประมาณ 2-3 นาที)

### 2. ตั้งค่า Environment Variables
คัดลอกค่าจาก `.env.example` ไปยัง `.env.local`:

```bash
# แก้ไข .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SESSION_SECRET=your-super-secret-session-key-here
```

**วิธีหาค่า:**
- เข้า Project Settings > API ใน Supabase Dashboard
- คัดลอก Project URL และ Keys

### 3. สร้าง Database Schema
รัน SQL script ใน Supabase SQL Editor:

```sql
-- คัดลอกเนื้อหาจาก schema.sql และ supabase-setup.sql
-- ไปที่ https://supabase.com/project/[your-project]/sql
```

### 4. ติดตั้ง Dependencies
```bash
npm install
```

### 5. ทดสอบการเชื่อมต่อ
```bash
npm run dev
```

## การเปลี่ยนแปลงที่เกิดขึ้น:

### ✅ เสร็จแล้ว:
- ✅ อัปเดต package.json (เพิ่ม @supabase/supabase-js, ลบ Neon)
- ✅ แก้ไข src/lib/db.js (ใช้ Supabase client)
- ✅ สร้าง .env.example (สำหรับ Supabase config)
- ✅ API routes ใช้ฟังก์ชันเดิมจาก @/lib/db

### 🔄 ต้องทำต่อ:
1. สร้าง Supabase project
2. ตั้งค่า environment variables
3. รัน SQL script ใน Supabase
4. ทดสอบระบบ

## ข้อควรระวัง:
- API routes ใช้ฟังก์ชันเดิม แต่อาจต้องปรับบางส่วนถ้ามีปัญหา
- Raw SQL queries ใช้ RPC function ต้องสร้างใน Supabase
- ตรวจสอบว่า schema ถูกต้องก่อนใช้งานจริง
