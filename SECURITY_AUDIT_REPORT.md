# 🔒 Security Vulnerability Report — Technical

> **Project:** Shop License Management System  
> **Audit Date:** 2026-02-12  
> **Auditor:** Cascade AI Security Scan  
> **Scope:** Full codebase review (API routes, auth, DB layer, middleware, client)  
> **Framework:** Next.js 14 (App Router) + Neon PostgreSQL + iron-session

---

## Executive Summary

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 2 | Requires immediate fix |
| 🟠 High | 5 | Fix before next deploy |
| 🟡 Medium | 6 | Fix within sprint |
| 🔵 Low | 5 | Backlog / Hardening |
| **Total** | **18** | — |

**Overall Security Posture: 7/10** — ระบบมี security foundation ที่ดี (parameterized queries, iron-session, input sanitization, CSP, WAF lite) แต่มีช่องโหว่สำคัญหลายจุดที่ต้องแก้ไขก่อน production

---

## 🔴 CRITICAL — Requires Immediate Fix

### VULN-01: Entities API — No Input Sanitization (SQL Injection Risk via `id` param)

- **File:** `src/app/api/entities/route.js`
- **Lines:** 17-19 (GET), 93 (PUT), 103 (PUT), 122 (DELETE)
- **CWE:** CWE-89 (SQL Injection), CWE-20 (Improper Input Validation)

**Description:**  
`/api/entities` route ใช้ `id` parameter จาก query string/body ส่งตรงไป query โดย **ไม่ผ่าน `sanitizeInt()`** ต่างจาก routes อื่นๆ ทั้งหมดที่ sanitize แล้ว

```javascript
// GET — id ไม่ผ่าน sanitization
const id = searchParams.get('id');
const entity = await fetchOne('SELECT * FROM entities WHERE id = $1', [id]);

// PUT — id จาก body ไม่ผ่าน sanitization
const { id, label, icon, description, display_order, is_active } = body;
// ...
await executeQuery('...WHERE id = $6', [..., id]);

// DELETE — id ไม่ผ่าน sanitization
const id = searchParams.get('id');
await executeQuery('DELETE FROM entities WHERE id = $1', [id]);
```

**Impact:** แม้ว่า Neon driver ใช้ parameterized queries (ป้องกัน classic SQLi ได้) แต่การไม่ validate type ทำให้:
- สามารถส่ง string แปลกๆ เข้ามาทำให้ query error → Information Disclosure
- ส่ง negative number หรือ `0` ลบ/แก้ไข record ที่ไม่ควรเข้าถึง
- Inconsistent security posture กับ routes อื่นทั้งหมด

**Remediation:**
```javascript
const id = sanitizeInt(searchParams.get('id'), 0, 1);
if (id < 1) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 });
```

---

### VULN-02: Date Parameters ไม่ผ่าน Validation — SQL Type Confusion

- **Files:**
  - `src/app/api/licenses/route.js` — lines 174, 246 (`issue_date`, `expiry_date` from body)
  - `src/app/api/export/route.js` — lines 121-122 (`expiry_from`, `expiry_to` from query)
  - `src/app/api/export-preview/route.js` — lines 100-101
  - `src/app/api/activity-logs/route.js` — lines 80-81 (`date_from`, `date_to`)
- **CWE:** CWE-20 (Improper Input Validation)

**Description:**  
Date parameters (`issue_date`, `expiry_date`, `expiry_from`, `expiry_to`, `date_from`, `date_to`) ถูกส่งตรงจาก user input ลง SQL query **โดยไม่มี format validation**

```javascript
// licenses/route.js POST — dates ส่งตรงจาก body
const { issue_date, expiry_date } = body;
await executeQuery('INSERT INTO licenses ... VALUES ($1,...,$4,$5,...)', 
    [shop_id, ..., issue_date, expiry_date, ...]);

// export/route.js — dates จาก query string ไม่ validated
const expiry_from = searchParams.get('expiry_from');
const expiry_to = searchParams.get('expiry_to');
whereClauses.push(`l.expiry_date >= $${paramIndex++}`);
params.push(expiry_from); // raw user input
```

**Impact:**
- ส่ง malformed date string ทำให้ PostgreSQL error → Information Disclosure (dev mode)
- Type confusion attack: ส่ง `'1970-01-01' OR '1'='1'` (แม้ parameterized จะป้องกัน SQLi ได้ แต่ invalid dates จะ crash)
- ไม่มี range validation — สามารถใส่วันที่ในอนาคตหรืออดีตแบบไม่สมเหตุสมผล

**Remediation:**
```javascript
function sanitizeDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
}
```

---

## 🟠 HIGH — Fix Before Next Deploy

### VULN-03: Custom Fields POST — `field_name` ไม่ Sanitize (Stored XSS Vector)

- **File:** `src/app/api/custom-fields/route.js` — line 69
- **CWE:** CWE-79 (Cross-site Scripting - Stored)

**Description:**  
`field_name` จาก request body ถูก INSERT โดยตรงโดยไม่ผ่าน `sanitizeString()` ส่วน `field_label` ก็ไม่ sanitize ใน POST (แต่ sanitize ใน PUT)

```javascript
const { field_name, field_label, ... } = body;
// field_name, field_label ส่งตรงลง DB ไม่ผ่าน sanitizeString()
await executeQuery('INSERT INTO custom_fields (entity_type, field_name, field_label, ...) VALUES ($1, $2, $3, ...)',
    [entity_type, field_name, field_label, ...]);
```

`field_name` จะถูก render ใน frontend เป็น column header ของ table — หากมี script ฝังอยู่ จะเป็น Stored XSS

**Impact:** Admin user สามารถฝัง XSS payload ผ่าน custom field name ซึ่งจะ render บน browser ของ user อื่น

**Remediation:**
```javascript
const field_name = sanitizeString(body.field_name || '', 100)
    .replace(/[^a-zA-Z0-9_\u0E00-\u0E7F]/g, '_'); // alphanumeric + Thai + underscore only
const field_label = sanitizeString(body.field_label || '', 255);
```

---

### VULN-04: In-Memory Rate Limiting ไม่ทำงานบน Serverless

- **File:** `middleware.js` — lines 43-68
- **File:** `src/lib/security.js` — lines 169-199
- **File:** `src/lib/api-helpers.js` — lines 242-338
- **CWE:** CWE-770 (Allocation of Resources Without Limits)

**Description:**  
Rate limiting ใช้ `Map()` ใน memory ซึ่ง **ไม่ persist ระหว่าง serverless cold starts** และ **ไม่ share state ข้าม instances** ใน Vercel:

```javascript
// middleware.js
const ipRequestCounts = new Map(); // ← resets on cold start

// security.js
const rateLimitStore = new Map(); // ← another independent store

// api-helpers.js
const rateLimitMap = new Map(); // ← yet another independent store
```

นอกจากนี้ยังมี **3 ระบบ rate limiting ที่ซ้ำซ้อนกัน** แต่ไม่มีอันไหนทำงานได้จริงบน production

**Impact:**
- Brute-force login attack สำเร็จได้ง่าย (แค่ trigger cold start ใหม่)
- ไม่มี protection จริงต่อ credential stuffing
- ทำให้ MAX_LOGIN_REQUESTS = 10/min ไม่มีความหมาย

**Remediation:**
- ใช้ **Vercel KV** หรือ **Upstash Redis** สำหรับ distributed rate limiting
- หรือใช้ **Vercel Edge Middleware + Edge Config** สำหรับ basic protection
- รวม 3 ระบบเป็น 1 ระบบกลาง

---

### VULN-05: CSP ใช้ `'unsafe-inline'` และ `'unsafe-eval'`

- **File:** `middleware.js` — line 201
- **File:** `next.config.js` — lines 46-58
- **CWE:** CWE-79 (XSS via weak CSP)

**Description:**  
CSP สำหรับ page routes อนุญาต `'unsafe-inline'` และ `'unsafe-eval'` ใน `script-src`:

```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
```

สิ่งนี้ทำให้ CSP **ไม่ป้องกัน XSS ได้จริง** เพราะ attacker สามารถ inject inline script ได้

**Impact:** XSS protection จาก CSP ถูก bypass ได้ทั้งหมด

**Remediation:**
- ใช้ **nonce-based CSP** แทน `'unsafe-inline'`:
  ```
  script-src 'self' 'nonce-{random}';
  ```
- ลบ `'unsafe-eval'` — Next.js 14 ไม่ต้องการ `'unsafe-eval'` ใน production
- ถ้า Next.js จำเป็นต้อง inline → ใช้ `next/script` strategy + nonce

---

### VULN-06: `full_name` ใน Users POST ไม่ Sanitize

- **File:** `src/app/api/users/route.js` — line 121
- **CWE:** CWE-79 (Stored XSS)

**Description:**
```javascript
const { username, full_name, password, role } = body;
// username ผ่าน validateUsername() ✓
// password ผ่าน validatePassword() ✓
// role ผ่าน whitelist check ✓
// full_name ส่งตรง ✗
const result = await executeQuery(
    'INSERT INTO users (username, full_name, password, role) VALUES ($1, $2, $3, $4)',
    [username, full_name || '', hashedPassword, role]
);
```

`full_name` ไม่ผ่าน `sanitizeString()` ทั้งใน POST และ PUT — ค่านี้ถูก render ใน activity logs, dashboard, header ทุกหน้า

**Impact:** Admin สามารถสร้าง user ที่มี `full_name` เป็น XSS payload

**Remediation:**
```javascript
const full_name = sanitizeString(body.full_name || '', 255);
```

---

### VULN-07: Entity Slug ไม่มี Whitelist/Format Validation

- **File:** `src/app/api/entities/route.js` — line 72
- **File:** `src/app/api/entity-records/route.js` — lines 30, 131, 180
- **CWE:** CWE-20 (Improper Input Validation)

**Description:**
`slug` ใน entities POST ถูก lowercase แต่ **ไม่มี format validation**:
```javascript
const { slug, label, icon, description, display_order } = body;
// slug ไม่ถูก validate format — อาจมี special characters
await executeQuery('INSERT INTO entities (slug, ...) VALUES ($1, ...)', [slug.toLowerCase(), ...]);
```

`entitySlug` ใน entity-records ผ่าน `sanitizeString()` แต่ `sanitizeString` แค่ตัด HTML tags ไม่ได้ enforce slug format

**Impact:** สามารถสร้าง entities ที่มี slug เป็น URL-unsafe characters, spaces, หรือ unicode ที่อาจทำให้เกิดปัญหาเมื่อใช้ใน routing

**Remediation:**
```javascript
const slug = body.slug?.toLowerCase().replace(/[^a-z0-9_-]/g, '') || '';
if (!slug || slug.length < 2) return error;
```

---

## 🟡 MEDIUM — Fix Within Sprint

### VULN-08: Lack of CSRF Protection on State-Changing Operations

- **CWE:** CWE-352 (Cross-Site Request Forgery)

**Description:**  
แม้ session cookie ตั้ง `sameSite: 'strict'` ซึ่งป้องกัน CSRF ได้ดีในเบราว์เซอร์สมัยใหม่ แต่:
1. Older browsers อาจไม่รองรับ `sameSite`
2. ไม่มี CSRF token เป็น defense-in-depth
3. API ใช้ `Content-Type: application/json` (ช่วยป้องกัน simple CSRF form) แต่ไม่มี `Origin` header check

**Impact:** Medium — `sameSite: strict` ป้องกันได้ 95% ของ cases แต่ขาด defense-in-depth

**Remediation:**
- เพิ่ม Origin/Referer header validation ใน API middleware
- หรือเพิ่ม CSRF token สำหรับ critical operations (user management, delete)

---

### VULN-09: Migration Route — File System Access ผ่าน API

- **File:** `src/app/api/migrate/route.js` — lines 26-27
- **CWE:** CWE-73 (External Control of File Name or Path)

**Description:**
```javascript
const schemaPath = path.join(process.cwd(), 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
```

แม้ว่า:
- ถูก block ใน production (ถ้า `ALLOW_MIGRATE !== 'true'`)
- ต้องเป็น admin

แต่ schema.sql ถูก **execute โดยตรงโดยไม่มี validation** — ถ้า schema.sql ถูก tamper (supply chain attack) จะ execute SQL อะไรก็ได้

**Impact:** ถ้า `ALLOW_MIGRATE=true` ถูกตั้งใน production โดยไม่ได้ตั้งใจ → full database destruction

**Remediation:**
- เพิ่ม checksum verification สำหรับ schema.sql
- ลบ route นี้ออกจาก production build เลย
- ใช้ migration tool แยก (เช่น CLI script) แทน API route

---

### VULN-10: Account Lockout ไม่มี — Brute Force ทำได้ไม่จำกัด

- **CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)

**Description:**  
เมื่อ rate limiting ไม่ทำงานจริงบน serverless (VULN-04) จึงไม่มี mechanism ใดๆ ที่จะ:
- Lock account หลัง N failed attempts
- เพิ่ม delay ระหว่าง attempts (progressive delay)
- แจ้ง admin เมื่อมี suspicious login activity

**Impact:** Attacker สามารถ brute-force password ได้ไม่จำกัด

**Remediation:**
- เพิ่ม `failed_login_count` + `locked_until` columns ใน `users` table
- Lock account หลัง 5 failed attempts (auto-unlock หลัง 15 นาที)
- Log failed login attempts ใน audit_logs

---

### VULN-11: `custom_fields` JSON ใน Shops ไม่ผ่าน Validation

- **File:** `src/app/api/shops/route.js` — lines 100, 115
- **CWE:** CWE-20 (Improper Input Validation)

**Description:**
```javascript
const { custom_fields } = body;
// custom_fields ส่งตรงลง DB เป็น JSON.stringify() โดยไม่ validate structure
await executeQuery('INSERT INTO shops (..., custom_fields) VALUES (..., $7)',
    [..., JSON.stringify(custom_fields || {})]);
```

Attacker สามารถส่ง JSON ขนาดใหญ่มาก หรือ deeply nested object เพื่อทำ DoS

**Impact:**
- JSON bomb → memory exhaustion
- Extremely large payload → disk usage spike ใน database

**Remediation:**
```javascript
const customFieldsStr = JSON.stringify(custom_fields || {});
if (customFieldsStr.length > 10000) { // 10KB limit
    return error('Custom fields too large');
}
```

---

### VULN-12: Error Messages Leak Stack Trace ใน Development

- **Multiple Files** — ทุก route ที่ใช้ `console.error()`
- **CWE:** CWE-209 (Information Exposure Through Error Message)

**Description:**  
`safeErrorMessage()` ซ่อน error ใน production แต่ใน development:
```javascript
// api-helpers.js
export function safeErrorMessage(error, fallback = 'เกิดข้อผิดพลาดภายในระบบ') {
    if (process.env.NODE_ENV === 'production') return fallback;
    return typeof error === 'string' ? error : (error?.message || fallback);
}
```

ปัญหาคือ **Vercel Preview deployments** อาจ run ใน non-production mode (ถ้า `NODE_ENV` ไม่ได้ตั้งเป็น `production` ใน preview branch)

**Impact:** Staging/preview URLs อาจ leak SQL error messages, table names, column names

**Remediation:**
- ตรวจสอบว่า `NODE_ENV=production` ถูกตั้งใน **ทุก** Vercel environment
- เพิ่ม check: `if (process.env.VERCEL) return fallback;`

---

### VULN-13: Seed Routes Accessible ถ้า `ALLOW_SEED=true`

- **File:** `src/app/api/seed-shops/route.js`
- **File:** `src/app/api/seed-custom-fields/route.js`
- **File:** `src/app/api/seed-10-licenses/route.js`
- **CWE:** CWE-749 (Exposed Dangerous Method)

**Description:**  
Seed routes ถูก block เมื่อ `NODE_ENV=production && ALLOW_SEED !== 'true'` แต่:
1. ถ้า dev ลืมลบ `ALLOW_SEED=true` ใน Vercel env → seed ทำงานได้ใน production
2. Seed route สร้าง dummy data ลง production database

**Impact:** Data pollution ใน production database

**Remediation:**
- ลบ `ALLOW_SEED` env var ออกจาก Vercel production
- เพิ่ม double-check: `if (process.env.VERCEL_ENV === 'production') return blocked;`
- ดีที่สุด: ลบ seed API routes ออก ใช้ CLI scripts (`scripts/`) แทน

---

## 🔵 LOW — Backlog / Hardening

### VULN-14: Session ไม่ Invalidate เมื่อ User ถูกลบหรือเปลี่ยน Role

- **CWE:** CWE-613 (Insufficient Session Expiration)

**Description:**  
เมื่อ admin ลบ user หรือเปลี่ยน role → session เดิมของ user นั้นยังใช้งานได้จนกว่าจะหมดอายุ (24 ชม. หรือ 7 วัน)

iron-session เก็บ data ใน encrypted cookie → server ไม่มี session store จึง revoke ไม่ได้

**Remediation:**
- เพิ่ม `sessionVersion` ใน users table, check ทุก request
- หรือ periodic re-validation (ทุก 5 นาที check ว่า user ยังมีอยู่ใน DB)

---

### VULN-15: `X-XSS-Protection` Header Deprecated

- **File:** `src/lib/security.js` — line 159
- **CWE:** CWE-16 (Configuration)

**Description:**
```javascript
'X-XSS-Protection': '1; mode=block',
```
Header นี้ถูก deprecated แล้ว และ Chrome/Edge ลบ XSS Auditor ออกตั้งแต่ 2019 ไม่มีผลกับ browser สมัยใหม่

**Remediation:** ลบ header นี้ออก — ป้องกันด้วย CSP แทน

---

### VULN-16: Timing Attack บน User Enumeration

- **File:** `src/lib/auth-service.js` — lines 20-30
- **CWE:** CWE-208 (Observable Timing Discrepancy)

**Description:**
```javascript
const user = await fetchOne('SELECT * FROM users WHERE username = $1', [username]);
if (!user) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'); // ← returns immediately

const isValid = await bcrypt.compare(password, user.password); // ← takes ~200ms
if (!isValid) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
```

เมื่อ username ไม่มีในระบบ → response กลับเร็วมาก (ไม่ต้อง bcrypt.compare)  
เมื่อ username มีแต่ password ผิด → response ช้ากว่า ~200ms

Attacker สามารถวัดเวลา response เพื่อ enumerate valid usernames ได้

**Remediation:**
```javascript
if (!user) {
    await bcrypt.compare(password, '$2a$12$dummy_hash_to_prevent_timing');
    throw new Error('...');
}
```

---

### VULN-17: ไม่มี Request Body Size Limit

- **CWE:** CWE-400 (Uncontrolled Resource Consumption)

**Description:**  
API routes รับ `request.json()` โดยไม่จำกัดขนาด payload → Attacker ส่ง request ขนาดใหญ่มากเพื่อ DoS

Vercel มี default limit 4.5MB แต่ยังเป็นขนาดที่ใหญ่มากสำหรับ JSON payload ของระบบนี้

**Remediation:**
```javascript
// ใน middleware หรือแต่ละ route
const contentLength = parseInt(request.headers.get('content-length') || '0');
if (contentLength > 102400) { // 100KB
    return new NextResponse(JSON.stringify({ error: 'Payload too large' }), { status: 413 });
}
```

---

### VULN-18: Duplicate Rate Limiter Implementations

- **Files:** `middleware.js`, `src/lib/security.js`, `src/lib/api-helpers.js`
- **CWE:** CWE-1188 (Insecure Default Initialization)

**Description:**  
มี rate limiter **3 ชุดที่ซ้ำซ้อนกัน** แต่ใช้คนละ Map, คนละ algorithm:

| Location | Algorithm | Used By |
|----------|-----------|---------|
| `middleware.js` | Fixed window | ทุก request ผ่าน middleware |
| `security.js` `isRateLimited()` | Fixed window | ไม่ถูกเรียกใช้ที่ไหน (dead code) |
| `api-helpers.js` `checkRateLimit()` | Sliding window + penalty | ไม่ถูกเรียกใช้ที่ไหน (dead code) |

**Impact:** Code complexity สูงโดยไม่จำเป็น + 2 ใน 3 เป็น dead code ที่ไม่ถูกใช้

**Remediation:**
- ลบ `isRateLimited()` จาก `security.js`
- ลบ `checkRateLimit()` จาก `api-helpers.js`
- ใช้เฉพาะ middleware rate limiter (หรือย้ายไป distributed store)

---

## ✅ สิ่งที่ทำได้ดี (Positive Findings)

| Area | Detail |
|------|--------|
| **Parameterized Queries** | ทุก SQL query ใช้ `$1, $2` placeholders — ไม่มี string concatenation เข้า query |
| **Password Hashing** | bcrypt with 12 rounds — ดีมาก |
| **Session Security** | iron-session encrypted cookies + httpOnly + secure + sameSite:strict |
| **Table Name Whitelist** | `db.js` validate table names ใน dynamic insert/update/delete |
| **Column Name Validation** | `db.js` ใช้ regex `^[a-zA-Z_][a-zA-Z0-9_]*$` สำหรับ column names |
| **Error Sanitization** | Production ซ่อน internal errors ผ่าน `safeErrorMessage()` |
| **Admin Authorization** | Destructive operations (DELETE, user mgmt) require admin role |
| **CSV Injection Prevention** | Export route sanitize dangerous characters (`=`, `+`, `-`, `@`) |
| **Cron Authentication** | Timing-safe comparison สำหรับ CRON_SECRET |
| **Audit Trail** | ทุก CRUD operation ถูก log ลง audit_logs พร้อม IP + User Agent |
| **WAF Lite** | Middleware block known scanners + suspicious patterns (SQLi, XSS, LFI) |
| **HSTS** | 2 years + includeSubDomains + preload |
| **Query Timeout** | 30 second timeout protection ป้องกัน slow query DoS |
| **Production Secret Validation** | Session secret ต้อง 32+ chars + ไม่เป็น weak pattern |

---

## 📊 Priority Action Matrix

| Priority | Vulnerability | Effort | Impact |
|----------|--------------|--------|--------|
| **P0** | VULN-01 Entities no sanitize | 15 min | Critical |
| **P0** | VULN-02 Date params no validation | 30 min | Critical |
| **P1** | VULN-03 Custom fields XSS | 15 min | High |
| **P1** | VULN-06 full_name no sanitize | 5 min | High |
| **P1** | VULN-07 Entity slug no validation | 10 min | High |
| **P2** | VULN-04 Rate limiting serverless | 2-4 hrs | High |
| **P2** | VULN-05 CSP unsafe-inline | 1-2 hrs | High |
| **P2** | VULN-10 Account lockout | 1-2 hrs | Medium |
| **P3** | VULN-08 CSRF defense-in-depth | 2-4 hrs | Medium |
| **P3** | VULN-09 Migration route | 30 min | Medium |
| **P3** | VULN-11 JSON validation | 15 min | Medium |
| **P3** | VULN-12 Error leak preview | 10 min | Medium |
| **P3** | VULN-13 Seed routes | 15 min | Medium |
| **P4** | VULN-14 Session invalidation | 2-4 hrs | Low |
| **P4** | VULN-16 Timing attack | 10 min | Low |
| **P4** | VULN-17 Body size limit | 15 min | Low |
| **P4** | VULN-18 Duplicate rate limiters | 30 min | Low |
| **P5** | VULN-15 XSS-Protection header | 1 min | Low |

---

## 🏁 Conclusion

ระบบมี **security foundation ที่ดี** — parameterized queries, encrypted sessions, input sanitization framework, WAF lite, และ audit logging ครบถ้วน

**ช่องโหว่หลักที่ต้องแก้ทันที** คือ:
1. Input validation ที่ขาดหายไปใน entities/date params (VULN-01, 02)
2. Stored XSS vectors ผ่าน unsanitized fields (VULN-03, 06)
3. Rate limiting ที่ไม่ทำงานบน serverless (VULN-04)

แก้ **P0 + P1** ได้ภายใน **1-2 ชั่วโมง** เพราะเป็นการเพิ่ม sanitization function calls ที่มีอยู่แล้วในระบบ
