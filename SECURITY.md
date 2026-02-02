# 🔐 Security Implementation Guide

## ภาพรวมการรักษาความปลอดภัย

โปรเจคนี้ได้รับการ implement security best practices ดังนี้:

---

## 1. Authentication & Authorization

### Session Management
- **Library**: `iron-session` - Encrypted session cookies
- **Cookie Options**:
  - `httpOnly: true` - ป้องกัน XSS อ่าน cookie
  - `secure: true` (production) - ส่งผ่าน HTTPS เท่านั้น
  - `sameSite: 'lax'` - ป้องกัน CSRF
  - `maxAge: 86400` - หมดอายุใน 24 ชั่วโมง

### Password Security
- **Hashing**: `bcryptjs` with salt rounds 10
- **Minimum Requirements**: 6 characters

### Role-Based Access Control
- `requireAuth()` - ต้องเข้าสู่ระบบ
- `requireAdmin()` - ต้องเป็น admin

---

## 2. API Security

### Authentication Check (ทุก API)
```javascript
const authError = await requireAuth();
if (authError) return authError;
```

### Rate Limiting (Login API)
```javascript
const { allowed } = checkRateLimit(`login:${clientIP}`, 5, 60000);
// 5 attempts per minute per IP
```

### SQL Injection Prevention
- ใช้ Parameterized Queries (`$1`, `$2`, etc.)
- ไม่มี String Concatenation ใน SQL

---

## 3. Security Headers

### Middleware Headers
```javascript
// ทุก response
'X-Content-Type-Options': 'nosniff'
'X-Frame-Options': 'DENY'
'X-XSS-Protection': '1; mode=block'
'Referrer-Policy': 'strict-origin-when-cross-origin'
'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'

// เพิ่มเติมสำหรับ API
'Cache-Control': 'no-store, no-cache, must-revalidate'
```

---

## 4. Secrets Management

### Environment Variables
- `DATABASE_URL` - Connection string to Neon PostgreSQL
- `SESSION_SECRET` - 64-character random hex string

### Generate New Secret
```bash
node scripts/generate-secret.js
```

### Best Practices
- ❌ อย่า commit `.env.local` ลง git
- ✅ ใช้ environment variables ของ hosting (Vercel, etc.)
- 🔄 Rotate secrets เป็นระยะ

---

## 5. Input Validation

### Available Functions (`src/lib/security.js`)
```javascript
sanitizeInt(value, defaultValue, min, max)
sanitizeString(str, maxLength)
isValidEmail(email)
isValidPhone(phone)
validatePagination(page, limit)
validateEnum(value, allowedValues, defaultValue)
escapeHtml(str)
sanitizeOutput(obj)
validatePassword(password)
validateUsername(username)
```

---

## 6. Activity Logging

ทุกการกระทำสำคัญถูก log:
- `LOGIN` / `LOGOUT`
- `CREATE` / `UPDATE` / `DELETE`
- `EXPORT`

---

## 7. Files Structure

```
src/lib/
├── api-helpers.js    # Auth functions, rate limiting
├── auth-service.js   # Login/logout/session
├── session.js        # Session configuration
├── security.js       # Input validation utilities
└── activityLogger.js # Activity logging

middleware.js         # Security headers

scripts/
└── generate-secret.js # Secret generator
```

---

## 8. Security Checklist

| ✅ | Item |
|---|------|
| ✅ | Authentication on all protected APIs |
| ✅ | Admin-only access for user management |
| ✅ | Password hashing with bcrypt |
| ✅ | Parameterized SQL queries |
| ✅ | Security headers on responses |
| ✅ | HttpOnly cookies |
| ✅ | Rate limiting on login |
| ✅ | Activity logging |
| ✅ | Random session secret |
| ✅ | .env files in .gitignore |

---

## 9. Recommendations (อนาคต)

1. **HTTPS Only** - บังคับใช้ HTTPS ใน production
2. **CSP Headers** - เพิ่ม Content-Security-Policy
3. **Database Encryption** - เข้ารหัสข้อมูลสำคัญ
4. **Audit Logs** - เก็บ log เพิ่มเติมสำหรับ security audit
5. **Two-Factor Authentication** - เพิ่ม 2FA สำหรับ admin

---

## 10. Emergency Response

### หาก Secret รั่วไหล:
1. Generate secret ใหม่: `node scripts/generate-secret.js`
2. Update `.env.local` 
3. Restart application
4. ทุก session จะถูก invalidate อัตโนมัติ

### หาก Database Credentials รั่วไหล:
1. เข้า Neon Console
2. เปลี่ยน password ของ database user
3. Update `DATABASE_URL` ใน `.env.local`
4. Restart application

---

*Last Updated: 2026-02-02*
