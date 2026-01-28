# 🧪 แผนการทดสอบระบบแบบละเอียด
## ระบบจัดการใบอนุญาตร้านค้า (Shop License System)

**วันที่สร้าง:** 27 มกราคม 2026  
**เวอร์ชัน:** 2.0  
**ผู้รับผิดชอบ:** QA Team

---

## 📋 สารบัญ

1. [ภาพรวมการทดสอบ](#ภาพรวมการทดสอบ)
2. [Phase 1: Planning & Analysis](#phase-1-planning--analysis)
3. [Phase 2: Unit Testing](#phase-2-unit-testing)
4. [Phase 3: Integration Testing](#phase-3-integration-testing)
5. [Phase 4: System Testing](#phase-4-system-testing)
6. [Phase 5: User Acceptance Testing](#phase-5-user-acceptance-testing)
7. [Phase 6: Performance Testing](#phase-6-performance-testing)
8. [Phase 7: Security Testing](#phase-7-security-testing)
9. [Test Cases รายละเอียด](#test-cases-รายละเอียด)
10. [Bug Tracking](#bug-tracking)

---

## 🎯 ภาพรวมการทดสอบ

### วัตถุประสงค์
1. ✅ ตรวจสอบความถูกต้องของฟังก์ชันทั้งหมด
2. ✅ ทดสอบการทำงานร่วมกันของ components
3. ✅ ตรวจสอบ performance และ scalability
4. ✅ ทดสอบ security และ data integrity
5. ✅ ตรวจสอบ user experience

### ขอบเขตการทดสอบ

**ระบบที่ต้องทดสอบ:**
- ✅ Authentication & Authorization
- ✅ Shop Management
- ✅ License Management
- ✅ License Type Management
- ✅ Custom Fields System
- ✅ Dashboard & Analytics
- ✅ Activity Logs
- ✅ User Management
- ✅ Export & Reporting
- ✅ UI/UX Components

**สิ่งที่ไม่ทดสอบ:**
- ❌ Third-party libraries (bcrypt, pdfmake, etc.)
- ❌ Database engine (PostgreSQL)
- ❌ Next.js framework core

### Test Environment

**Development:**
- URL: http://localhost:3000
- Database: Neon PostgreSQL (Dev)
- Users: admin/admin, user1/password

**Staging:**
- URL: https://staging.example.com
- Database: Neon PostgreSQL (Staging)
- Users: Test accounts

**Production:**
- URL: https://shop-license.vercel.app
- Database: Neon PostgreSQL (Prod)
- Users: Real accounts

### Test Data

**Shops:** 150 test shops
**Licenses:** 200 test licenses
**Users:** 5 test users
**Custom Fields:** 10 test fields

---

## Phase 1: Planning & Analysis

### ✅ Task 1.1: สำรวจโครงสร้างระบบและ API endpoints
**สถานะ:** ✅ เสร็จสมบูรณ์

**ผลลัพธ์:**
- พบ 22 API endpoints
- 10 database tables
- 26+ React components
- 8 custom hooks

### ✅ Task 1.2: ทำความเข้าใจระบบ Custom Fields
**สถานะ:** ✅ เสร็จสมบูรณ์

**ผลลัพธ์:**
- เข้าใจ architecture ของ custom fields
- รองรับ 5 field types
- Dynamic form generation
- JSONB storage

### ✅ Task 1.3: วิเคราะห์ฟังก์ชันการทำงานทั้งหมด
**สถานะ:** ✅ เสร็จสมบูรณ์

**ผลลัพธ์:**
- สร้างเอกสาร SYSTEM_ANALYSIS.md
- ครอบคลุมทุกฟังก์ชัน
- รายละเอียดครบถ้วน

### ✅ Task 1.4: สร้างแผนการทดสอบแบบละเอียด
**สถานะ:** ✅ เสร็จสมบูรณ์ (เอกสารนี้)

---

## Phase 2: Unit Testing

### 2.1 API Endpoints Testing

#### 2.1.1 Authentication API

**Test Case: AUTH-001 - Login Success**
```
Endpoint: POST /api/auth
Input:
{
  "username": "admin",
  "password": "admin"
}

Expected Result:
- Status: 200
- Response: { success: true, user: {...} }
- Session cookie created
- Activity log created

Test Steps:
1. Send POST request
2. Verify response structure
3. Check session cookie
4. Verify activity log entry
```

**Test Case: AUTH-002 - Login Failed (Wrong Password)**
```
Input:
{
  "username": "admin",
  "password": "wrongpassword"
}

Expected Result:
- Status: 401
- Response: { success: false, message: "Invalid credentials" }
- No session created
- Failed login logged
```

**Test Case: AUTH-003 - Login Failed (User Not Found)**
```
Input:
{
  "username": "nonexistent",
  "password": "password"
}

Expected Result:
- Status: 401
- Response: { success: false }
```

**Test Case: AUTH-004 - Session Validation**
```
Test Steps:
1. Login successfully
2. Access protected route
3. Verify session is valid
4. Logout
5. Try to access protected route
6. Verify redirect to login
```

---

#### 2.1.2 Shops API

**Test Case: SHOP-001 - Get All Shops**
```
Endpoint: GET /api/shops

Expected Result:
- Status: 200
- Response contains array of shops
- Each shop has required fields
- Custom fields included
- License count included
- Pagination working
```

**Test Case: SHOP-002 - Get Shops with Pagination**
```
Endpoint: GET /api/shops?page=2&limit=10

Expected Result:
- Returns 10 shops
- Correct page number
- Total count correct
- Total pages calculated
```

**Test Case: SHOP-003 - Search Shops**
```
Endpoint: GET /api/shops?search=ร้าน

Expected Result:
- Returns only matching shops
- Search in shop_name, owner_name, phone
- Case-insensitive
```

**Test Case: SHOP-004 - Sort Shops**
```
Endpoint: GET /api/shops?sort=shop_name&order=desc

Expected Result:
- Shops sorted by shop_name descending
- Order maintained
```

**Test Case: SHOP-005 - Create Shop (Basic)**
```
Endpoint: POST /api/shops
Input:
{
  "shop_name": "ร้านทดสอบ",
  "owner_name": "นายทดสอบ",
  "phone": "081-234-5678",
  "address": "123 ถนนทดสอบ"
}

Expected Result:
- Status: 201
- Shop created in database
- Returns shop object with ID
- Activity log created
- Cache invalidated
```

**Test Case: SHOP-006 - Create Shop with Custom Fields**
```
Input:
{
  "shop_name": "ร้านทดสอบ 2",
  "custom_fields": {
    "cf_tax_id": "1234567890123",
    "cf_business_type": "ร้านค้าปลีก"
  }
}

Expected Result:
- Shop created
- Custom fields saved in JSONB
- Custom field values created
```

**Test Case: SHOP-007 - Create Shop with License**
```
Input:
{
  "shop_name": "ร้านทดสอบ 3",
  "create_license": true,
  "license_type_id": 1,
  "license_number": "TEST-001"
}

Expected Result:
- Shop created
- License created automatically
- License linked to shop
- Expiry date calculated
```

**Test Case: SHOP-008 - Update Shop**
```
Endpoint: PUT /api/shops
Input:
{
  "id": 1,
  "shop_name": "ร้านทดสอบ (แก้ไข)",
  "phone": "082-345-6789"
}

Expected Result:
- Shop updated
- Only specified fields changed
- updated_at timestamp updated
- Activity log created
```

**Test Case: SHOP-009 - Update Shop Custom Fields**
```
Input:
{
  "id": 1,
  "custom_fields": {
    "cf_tax_id": "9876543210987"
  }
}

Expected Result:
- Custom fields merged (not replaced)
- Existing custom fields preserved
```

**Test Case: SHOP-010 - Delete Shop**
```
Endpoint: DELETE /api/shops?id=1

Expected Result:
- Shop deleted
- Cascade delete licenses
- Activity log created
- Cache invalidated
```

**Test Case: SHOP-011 - Validation - Missing Required Field**
```
Input:
{
  "owner_name": "นายทดสอบ"
}

Expected Result:
- Status: 400
- Error: "shop_name is required"
```

**Test Case: SHOP-012 - Validation - Invalid Data Type**
```
Input:
{
  "shop_name": 12345
}

Expected Result:
- Status: 400
- Error: "shop_name must be string"
```

---

#### 2.1.3 Licenses API

**Test Case: LIC-001 - Get All Licenses**
```
Endpoint: GET /api/licenses

Expected Result:
- Returns array of licenses
- Includes shop_name (JOIN)
- Includes license_type_name (JOIN)
- Calculates days_until_expiry
- Updates status automatically
```

**Test Case: LIC-002 - Get Licenses by Shop**
```
Endpoint: GET /api/licenses?shop_id=1

Expected Result:
- Returns only licenses for shop ID 1
- Correct filtering
```

**Test Case: LIC-003 - Get Licenses by Status**
```
Endpoint: GET /api/licenses?status=active

Expected Result:
- Returns only active licenses
- Excludes expired
```

**Test Case: LIC-004 - Get Expiring Licenses**
```
Endpoint: GET /api/licenses/expiring?days=30

Expected Result:
- Returns licenses expiring in next 30 days
- Excludes already expired
- Sorted by expiry_date ASC
```

**Test Case: LIC-005 - Create License**
```
Endpoint: POST /api/licenses
Input:
{
  "shop_id": 1,
  "license_type_id": 1,
  "license_number": "LIC-TEST-001",
  "issue_date": "2024-01-27"
}

Expected Result:
- License created
- expiry_date calculated automatically
- status = 'active'
- Activity log created
```

**Test Case: LIC-006 - Create License with Custom Fields**
```
Input:
{
  "shop_id": 1,
  "license_type_id": 1,
  "license_number": "LIC-TEST-002",
  "custom_fields": {
    "cf_inspector": "นายตรวจสอบ"
  }
}

Expected Result:
- License created
- Custom fields saved
```

**Test Case: LIC-007 - Update License**
```
Endpoint: PUT /api/licenses
Input:
{
  "id": 1,
  "status": "expired",
  "notes": "หมดอายุแล้ว"
}

Expected Result:
- License updated
- Activity log created
```

**Test Case: LIC-008 - Delete License**
```
Endpoint: DELETE /api/licenses?id=1

Expected Result:
- License deleted
- Activity log created
```

**Test Case: LIC-009 - Expiry Date Calculation**
```
Input:
{
  "license_type_id": 1, // validity_days = 365
  "issue_date": "2024-01-27"
}

Expected Result:
- expiry_date = "2025-01-26" (365 days later)
```

**Test Case: LIC-010 - Status Auto-Update**
```
Test Steps:
1. Create license with expiry_date in past
2. GET /api/licenses
3. Verify status changed to 'expired'
```

---

#### 2.1.4 License Types API

**Test Case: LT-001 - Get All License Types**
```
Endpoint: GET /api/license-types

Expected Result:
- Returns all license types
- Includes all fields
```

**Test Case: LT-002 - Get License Types with Count**
```
Endpoint: GET /api/license-types-optimized

Expected Result:
- Returns license types
- Includes license_count for each
- Count is accurate
```

**Test Case: LT-003 - Create License Type**
```
Endpoint: POST /api/license-types
Input:
{
  "name": "ใบอนุญาตทดสอบ",
  "description": "สำหรับทดสอบ",
  "validity_days": 180,
  "price": 500
}

Expected Result:
- License type created
- Returns with ID
```

**Test Case: LT-004 - Update License Type**
```
Endpoint: PUT /api/license-types
Input:
{
  "id": 1,
  "price": 1500
}

Expected Result:
- Price updated
- Other fields unchanged
```

**Test Case: LT-005 - Delete License Type**
```
Endpoint: DELETE /api/license-types?id=1

Expected Result:
- If no licenses: Deleted
- If has licenses: Error or SET NULL
```

---

#### 2.1.5 Custom Fields API

**Test Case: CF-001 - Get Custom Fields by Entity**
```
Endpoint: GET /api/custom-fields?entity_type=shops

Expected Result:
- Returns only shop custom fields
- Ordered by display_order
- Only active fields
```

**Test Case: CF-002 - Create Custom Field**
```
Endpoint: POST /api/custom-fields
Input:
{
  "entity_type": "shops",
  "field_name": "cf_test_field",
  "field_label": "ฟิลด์ทดสอบ",
  "field_type": "text",
  "is_required": true,
  "show_in_form": true,
  "show_in_table": true
}

Expected Result:
- Custom field created
- Validation passed
```

**Test Case: CF-003 - Create Select Field with Options**
```
Input:
{
  "field_type": "select",
  "field_options": ["ตัวเลือก 1", "ตัวเลือก 2"]
}

Expected Result:
- Field created
- Options saved as JSONB array
```

**Test Case: CF-004 - Validation - Invalid Field Name**
```
Input:
{
  "field_name": "invalid_name" // must start with cf_
}

Expected Result:
- Status: 400
- Error: "field_name must start with cf_"
```

**Test Case: CF-005 - Validation - Duplicate Field Name**
```
Input:
{
  "entity_type": "shops",
  "field_name": "cf_tax_id" // already exists
}

Expected Result:
- Status: 400
- Error: "Field name already exists"
```

**Test Case: CF-006 - Update Custom Field**
```
Endpoint: PUT /api/custom-fields
Input:
{
  "id": 1,
  "field_label": "ฟิลด์ทดสอบ (แก้ไข)",
  "is_required": false
}

Expected Result:
- Field updated
- Form regenerates with new settings
```

**Test Case: CF-007 - Delete Custom Field**
```
Endpoint: DELETE /api/custom-fields?id=1

Expected Result:
- Field deleted
- Cascade delete values
- Remove from entity JSONB
```

**Test Case: CF-008 - Field Type Validation**
```
Test all field types:
- text: accepts any string
- number: accepts only numbers
- date: accepts valid dates
- textarea: accepts long text
- select: accepts only from options
```

---

#### 2.1.6 Dashboard API

**Test Case: DASH-001 - Get Dashboard Stats**
```
Endpoint: GET /api/dashboard

Expected Result:
- Returns all stats:
  - totalShops
  - totalLicenses
  - activeLicenses
  - expiredLicenses
  - expiringLicenses (30 days)
  - totalUsers
- All counts accurate
```

**Test Case: DASH-002 - Recent Activity**
```
Expected Result:
- Returns last 10 activities
- Sorted by created_at DESC
- Includes user info
```

**Test Case: DASH-003 - Expiring Licenses List**
```
Expected Result:
- Returns licenses expiring in 30 days
- Includes shop info
- Sorted by expiry_date ASC
```

**Test Case: DASH-004 - Licenses by Type**
```
Expected Result:
- Returns count per license type
- Includes type name
- Sorted by count DESC
```

**Test Case: DASH-005 - Cache Testing**
```
Test Steps:
1. GET /api/dashboard (cache miss)
2. GET /api/dashboard (cache hit)
3. Verify response time improved
4. Wait 30 seconds
5. GET /api/dashboard (cache expired)
```

---

#### 2.1.7 Activity Logs API

**Test Case: ACT-001 - Get All Activity Logs**
```
Endpoint: GET /api/activity-logs

Expected Result:
- Returns all logs
- Includes user info (JOIN)
- Sorted by created_at DESC
- Pagination working
```

**Test Case: ACT-002 - Filter by User**
```
Endpoint: GET /api/activity-logs?user_id=1

Expected Result:
- Returns only user 1's activities
```

**Test Case: ACT-003 - Filter by Action**
```
Endpoint: GET /api/activity-logs?action=CREATE

Expected Result:
- Returns only CREATE actions
```

**Test Case: ACT-004 - Filter by Entity Type**
```
Endpoint: GET /api/activity-logs?entity_type=shop

Expected Result:
- Returns only shop-related activities
```

**Test Case: ACT-005 - Delete Old Logs**
```
Endpoint: DELETE /api/activity-logs?days=90

Expected Result:
- Deletes logs older than 90 days
- Returns count of deleted logs
```

---

#### 2.1.8 Users API

**Test Case: USER-001 - Get All Users**
```
Endpoint: GET /api/users

Expected Result:
- Returns all users
- Password excluded from response
- Includes role
```

**Test Case: USER-002 - Create User**
```
Endpoint: POST /api/users
Input:
{
  "username": "testuser",
  "password": "password123",
  "full_name": "Test User",
  "role": "user"
}

Expected Result:
- User created
- Password hashed with bcrypt
- Activity log created
```

**Test Case: USER-003 - Update User**
```
Endpoint: PUT /api/users
Input:
{
  "id": 2,
  "full_name": "Test User (Updated)"
}

Expected Result:
- User updated
- Password not changed
```

**Test Case: USER-004 - Update Password**
```
Input:
{
  "id": 2,
  "password": "newpassword123"
}

Expected Result:
- Password re-hashed
- Can login with new password
```

**Test Case: USER-005 - Delete User**
```
Endpoint: DELETE /api/users?id=2

Expected Result:
- User deleted
- Cannot delete yourself
- Activity log created
```

**Test Case: USER-006 - Validation - Duplicate Username**
```
Input:
{
  "username": "admin" // already exists
}

Expected Result:
- Status: 400
- Error: "Username already exists"
```

---

#### 2.1.9 Export API

**Test Case: EXP-001 - Export Shop PDF**
```
Endpoint: GET /api/export?type=shops&id=1

Expected Result:
- Returns PDF as base64
- Includes shop info
- Includes custom fields
- Thai font working
```

**Test Case: EXP-002 - Export License PDF**
```
Endpoint: GET /api/export?type=licenses&id=1

Expected Result:
- Returns license PDF
- Includes shop info
- Includes license type info
```

**Test Case: EXP-003 - Export All Shops**
```
Endpoint: GET /api/export?type=shops

Expected Result:
- Returns PDF with all shops
- Table format
- Pagination if needed
```

---

### 2.2 Database Testing

**Test Case: DB-001 - Connection Pool**
```
Test Steps:
1. Make 100 concurrent requests
2. Verify all succeed
3. Check connection pool stats
4. Verify no connection leaks
```

**Test Case: DB-002 - Transaction Rollback**
```
Test Steps:
1. Start transaction
2. Insert shop
3. Throw error
4. Verify rollback
5. Check shop not in database
```

**Test Case: DB-003 - Foreign Key Constraints**
```
Test Steps:
1. Try to create license with invalid shop_id
2. Verify error
3. Try to delete shop with licenses
4. Verify cascade delete
```

**Test Case: DB-004 - Unique Constraints**
```
Test Steps:
1. Create user with username "test"
2. Try to create another user with "test"
3. Verify error
```

**Test Case: DB-005 - JSONB Operations**
```
Test Steps:
1. Insert shop with custom_fields
2. Update custom_fields (merge)
3. Query by custom field value
4. Verify JSONB functions work
```

**Test Case: DB-006 - Timezone Handling**
```
Test Steps:
1. Insert record with timestamp
2. Verify stored in Asia/Bangkok timezone
3. Query and verify timezone correct
```

---

### 2.3 Utility Functions Testing

**Test Case: UTIL-001 - Password Hashing**
```
Test Steps:
1. Hash password "test123"
2. Verify bcrypt format
3. Verify different hash each time
4. Verify can verify password
```

**Test Case: UTIL-002 - Session Management**
```
Test Steps:
1. Create session
2. Get session
3. Verify data correct
4. Destroy session
5. Verify session gone
```

**Test Case: UTIL-003 - Cache Operations**
```
Test Steps:
1. Set cache key "test" with value
2. Get cache key "test"
3. Verify value correct
4. Wait for TTL
5. Verify cache expired
```

**Test Case: UTIL-004 - Input Sanitization**
```
Test Steps:
1. Input: "<script>alert('xss')</script>"
2. Sanitize
3. Verify script tags removed
```

**Test Case: UTIL-005 - Email Validation**
```
Test Cases:
- "test@example.com" → valid
- "invalid.email" → invalid
- "test@" → invalid
- "@example.com" → invalid
```

**Test Case: UTIL-006 - Phone Validation**
```
Test Cases:
- "081-234-5678" → valid
- "0812345678" → valid
- "12345" → invalid
- "abc" → invalid
```

---

## Phase 3: Integration Testing

### 3.1 Shop + License Integration

**Test Case: INT-001 - Create Shop with License**
```
Test Steps:
1. POST /api/shops with create_license=true
2. Verify shop created
3. Verify license created
4. Verify license.shop_id = shop.id
5. Verify expiry_date calculated
```

**Test Case: INT-002 - Delete Shop Cascade**
```
Test Steps:
1. Create shop with 3 licenses
2. DELETE /api/shops?id=X
3. Verify shop deleted
4. Verify all 3 licenses deleted
5. Verify activity logs created
```

**Test Case: INT-003 - Shop Custom Fields in License**
```
Test Steps:
1. Create shop with custom fields
2. Create license for that shop
3. GET /api/licenses
4. Verify shop custom fields included
```

---

### 3.2 Custom Fields Integration

**Test Case: INT-004 - Custom Field in Form**
```
Test Steps:
1. Create custom field for shops
2. Open QuickAddModal
3. Verify field appears in form
4. Fill and submit
5. Verify value saved
```

**Test Case: INT-005 - Custom Field in Table**
```
Test Steps:
1. Create custom field with show_in_table=true
2. Reload shops page
3. Verify column appears
4. Verify values displayed
5. Edit value inline
6. Verify saved
```

**Test Case: INT-006 - Required Custom Field**
```
Test Steps:
1. Create required custom field
2. Try to submit form without it
3. Verify validation error
4. Fill field
5. Verify submit succeeds
```

**Test Case: INT-007 - Select Field Options**
```
Test Steps:
1. Create select field with options
2. Open form
3. Verify dropdown shows options
4. Select option
5. Verify saved correctly
```

---

### 3.3 Authentication Flow

**Test Case: INT-008 - Full Login Flow**
```
Test Steps:
1. Navigate to /
2. Enter credentials
3. Click login
4. Verify redirect to /dashboard
5. Verify session created
6. Verify activity log
```

**Test Case: INT-009 - Protected Route Access**
```
Test Steps:
1. Logout
2. Try to access /dashboard/shops
3. Verify redirect to /
4. Login
5. Verify redirect back to /dashboard/shops
```

**Test Case: INT-010 - Session Expiry**
```
Test Steps:
1. Login
2. Wait for session to expire
3. Try to access protected route
4. Verify redirect to login
```

---

### 3.4 Dashboard Integration

**Test Case: INT-011 - Dashboard Stats Update**
```
Test Steps:
1. Note current stats
2. Create new shop
3. Refresh dashboard
4. Verify totalShops increased by 1
5. Create license
6. Verify totalLicenses increased
```

**Test Case: INT-012 - Expiring Licenses Alert**
```
Test Steps:
1. Create license expiring in 15 days
2. Refresh dashboard
3. Verify appears in expiring list
4. Verify correct days_until_expiry
```

---

## Phase 4: System Testing

### 4.1 End-to-End Workflows

**Test Case: E2E-001 - Complete Shop Lifecycle**
```
Test Steps:
1. Login as admin
2. Navigate to Shops
3. Click "สร้างร้านค้าใหม่"
4. Fill form with all fields
5. Add custom fields
6. Enable "สร้างใบอนุญาตพร้อมกัน"
7. Submit
8. Verify shop appears in table
9. Click to view details
10. Verify all data correct
11. Edit shop
12. Verify changes saved
13. Delete shop
14. Verify removed from table
```

**Test Case: E2E-002 - License Management Workflow**
```
Test Steps:
1. Create shop
2. Navigate to Licenses
3. Create license for shop
4. Verify expiry date calculated
5. Wait until near expiry
6. Verify appears in expiring list
7. Renew license (update expiry)
8. Verify removed from expiring list
9. Revoke license (change status)
10. Verify status updated
```

**Test Case: E2E-003 - Custom Fields Workflow**
```
Test Steps:
1. Navigate to Settings > Custom Fields
2. Create new field for shops
3. Set field type to select
4. Add options
5. Enable show_in_form and show_in_table
6. Navigate to Shops
7. Create new shop
8. Verify field appears in form
9. Select option
10. Submit
11. Verify column appears in table
12. Verify value displayed
13. Edit value inline
14. Verify saved
```

**Test Case: E2E-004 - User Management Workflow**
```
Test Steps:
1. Login as admin
2. Navigate to Users
3. Create new user
4. Set role to "user"
5. Logout
6. Login as new user
7. Verify limited permissions
8. Try to create shop (should fail)
9. Logout
10. Login as admin
11. Delete user
```

**Test Case: E2E-005 - Export Workflow**
```
Test Steps:
1. Navigate to Shops
2. Click export button
3. Verify PDF generated
4. Open PDF
5. Verify all data included
6. Verify Thai font working
7. Verify custom fields included
```

---

### 4.2 Data Integrity Testing

**Test Case: DI-001 - Concurrent Updates**
```
Test Steps:
1. Open shop in 2 browser tabs
2. Edit different fields in each
3. Save both
4. Verify both changes applied
5. Check for data loss
```

**Test Case: DI-002 - Orphaned Records**
```
Test Steps:
1. Delete license type
2. Verify licenses SET NULL
3. Delete custom field
4. Verify values deleted
5. Check for orphaned records
```

**Test Case: DI-003 - Data Consistency**
```
Test Steps:
1. Create 100 shops
2. Create 200 licenses
3. Verify counts match
4. Delete 50 shops
5. Verify cascade delete
6. Verify counts correct
```

---

### 4.3 Error Handling

**Test Case: ERR-001 - Network Error**
```
Test Steps:
1. Disconnect network
2. Try to create shop
3. Verify error message
4. Reconnect
5. Retry
6. Verify succeeds
```

**Test Case: ERR-002 - Database Error**
```
Test Steps:
1. Simulate database down
2. Try to access data
3. Verify graceful error
4. Verify user-friendly message
```

**Test Case: ERR-003 - Validation Errors**
```
Test Steps:
1. Submit form with invalid data
2. Verify validation errors shown
3. Verify specific field highlighted
4. Fix errors
5. Verify submit succeeds
```

**Test Case: ERR-004 - 404 Not Found**
```
Test Steps:
1. Navigate to /invalid-route
2. Verify 404 page shown
3. Verify can navigate back
```

**Test Case: ERR-005 - 500 Server Error**
```
Test Steps:
1. Trigger server error
2. Verify 500 page shown
3. Verify error logged
4. Verify user can recover
```

---

## Phase 5: User Acceptance Testing

### 5.1 Usability Testing

**Test Case: UAT-001 - First-Time User**
```
Test Steps:
1. Give system to new user
2. Ask to create shop
3. Observe without help
4. Note confusion points
5. Measure time to complete
6. Gather feedback

Success Criteria:
- Completes task < 5 minutes
- No critical confusion
- Positive feedback
```

**Test Case: UAT-002 - Mobile Usability**
```
Test Steps:
1. Access on mobile device
2. Test all main functions
3. Verify responsive design
4. Test touch interactions
5. Verify readability

Success Criteria:
- All functions work
- No horizontal scroll
- Buttons easy to tap
- Text readable
```

**Test Case: UAT-003 - Accessibility**
```
Test Steps:
1. Test with screen reader
2. Test keyboard navigation
3. Check color contrast
4. Verify ARIA labels
5. Test with zoom

Success Criteria:
- WCAG 2.1 AA compliant
- Keyboard accessible
- Screen reader friendly
```

---

### 5.2 Business Logic Testing

**Test Case: BIZ-001 - License Expiry Logic**
```
Scenario: License expires in 10 days

Test Steps:
1. Create license expiring in 10 days
2. Verify appears in expiring list
3. Verify days_until_expiry = 10
4. Wait 1 day
5. Verify days_until_expiry = 9
6. Wait until expiry
7. Verify status = 'expired'
```

**Test Case: BIZ-002 - Custom Fields Validation**
```
Scenario: Required field must be filled

Test Steps:
1. Create required custom field
2. Try to submit without it
3. Verify error
4. Fill field
5. Verify submit succeeds
```

**Test Case: BIZ-003 - Role Permissions**
```
Scenario: User role cannot delete

Test Steps:
1. Login as user
2. Try to delete shop
3. Verify permission denied
4. Login as admin
5. Delete shop
6. Verify succeeds
```

---

## Phase 6: Performance Testing

### 6.1 Load Testing

**Test Case: PERF-001 - Concurrent Users**
```
Test Setup:
- 100 concurrent users
- Each performs CRUD operations
- Duration: 10 minutes

Metrics:
- Response time < 2s (95th percentile)
- Error rate < 1%
- Throughput > 50 req/s

Test Steps:
1. Simulate 100 users
2. Each creates 10 shops
3. Each updates 5 shops
4. Each deletes 3 shops
5. Measure metrics
```

**Test Case: PERF-002 - Large Dataset**
```
Test Setup:
- 10,000 shops
- 20,000 licenses
- 100 custom fields

Test Steps:
1. Load shops page
2. Measure load time
3. Search shops
4. Measure search time
5. Sort shops
6. Measure sort time

Success Criteria:
- Page load < 3s
- Search < 1s
- Sort < 500ms
```

**Test Case: PERF-003 - API Response Time**
```
Test all API endpoints:
- GET /api/shops → < 500ms
- POST /api/shops → < 1s
- GET /api/dashboard → < 1s
- GET /api/licenses → < 500ms

Test with:
- Empty database
- 1,000 records
- 10,000 records
```

**Test Case: PERF-004 - Cache Effectiveness**
```
Test Steps:
1. GET /api/dashboard (cache miss)
2. Measure time: T1
3. GET /api/dashboard (cache hit)
4. Measure time: T2
5. Verify T2 < T1 * 0.1 (10x faster)
```

---

### 6.2 Stress Testing

**Test Case: STRESS-001 - Database Connections**
```
Test Steps:
1. Make 1000 concurrent requests
2. Verify no connection errors
3. Check connection pool
4. Verify no leaks
```

**Test Case: STRESS-002 - Memory Usage**
```
Test Steps:
1. Load 100,000 records
2. Monitor memory usage
3. Verify no memory leaks
4. Verify garbage collection
```

**Test Case: STRESS-003 - CPU Usage**
```
Test Steps:
1. Run heavy operations
2. Monitor CPU usage
3. Verify < 80% sustained
4. Verify no blocking
```

---

## Phase 7: Security Testing

### 7.1 Authentication Security

**Test Case: SEC-001 - SQL Injection**
```
Test Steps:
1. Input: "admin' OR '1'='1"
2. Try to login
3. Verify fails
4. Check database not affected
```

**Test Case: SEC-002 - XSS Attack**
```
Test Steps:
1. Input: "<script>alert('xss')</script>"
2. Submit in shop name
3. View shop
4. Verify script not executed
5. Verify sanitized
```

**Test Case: SEC-003 - CSRF Attack**
```
Test Steps:
1. Create malicious form
2. Try to submit to API
3. Verify CSRF token required
4. Verify fails without token
```

**Test Case: SEC-004 - Session Hijacking**
```
Test Steps:
1. Login and get session cookie
2. Try to use in different browser
3. Verify security checks
4. Verify fails if suspicious
```

**Test Case: SEC-005 - Brute Force Protection**
```
Test Steps:
1. Try to login 10 times wrong password
2. Verify rate limiting
3. Verify account not locked
4. Wait cooldown
5. Verify can login
```

---

### 7.2 Authorization Security

**Test Case: SEC-006 - Unauthorized Access**
```
Test Steps:
1. Logout
2. Try to access /api/shops directly
3. Verify 401 Unauthorized
4. Try to access /dashboard/shops
5. Verify redirect to login
```

**Test Case: SEC-007 - Role Bypass**
```
Test Steps:
1. Login as user
2. Try to access admin-only API
3. Verify 403 Forbidden
4. Try to modify user role
5. Verify fails
```

**Test Case: SEC-008 - Direct Object Reference**
```
Test Steps:
1. Login as user1
2. Get shop ID owned by user2
3. Try to access /api/shops?id=X
4. Verify permission check
5. Verify fails if not owner
```

---

### 7.3 Data Security

**Test Case: SEC-009 - Password Storage**
```
Test Steps:
1. Create user
2. Check database
3. Verify password is hashed
4. Verify bcrypt format
5. Verify not reversible
```

**Test Case: SEC-010 - Sensitive Data Exposure**
```
Test Steps:
1. GET /api/users
2. Verify password not in response
3. Check all API responses
4. Verify no sensitive data leaked
```

**Test Case: SEC-011 - HTTPS Enforcement**
```
Test Steps:
1. Try to access via HTTP
2. Verify redirect to HTTPS
3. Verify secure cookies
4. Verify HSTS header
```

---

## 📝 Test Cases รายละเอียด

### Test Case Template

```
Test Case ID: XXX-001
Title: [Short description]
Priority: High/Medium/Low
Type: Functional/Integration/Performance/Security

Preconditions:
- [What must be true before test]

Test Steps:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Expected Result:
- [What should happen]

Actual Result:
- [What actually happened]

Status: Pass/Fail/Blocked
Tested By: [Name]
Date: [Date]
Notes: [Any notes]
```

---

## 🐛 Bug Tracking

### Bug Report Template

```
Bug ID: BUG-001
Title: [Short description]
Severity: Critical/High/Medium/Low
Priority: P0/P1/P2/P3

Environment:
- Browser: [Chrome/Firefox/Safari]
- OS: [Windows/Mac/Linux]
- Version: [Version number]

Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Expected Behavior:
- [What should happen]

Actual Behavior:
- [What actually happened]

Screenshots:
- [Attach screenshots]

Logs:
- [Attach error logs]

Status: Open/In Progress/Fixed/Closed
Assigned To: [Developer]
Found By: [Tester]
Date Found: [Date]
Date Fixed: [Date]
```

### Bug Severity Levels

**Critical (P0):**
- System crash
- Data loss
- Security vulnerability
- Cannot login

**High (P1):**
- Major feature broken
- Incorrect calculations
- Performance issues

**Medium (P2):**
- Minor feature issues
- UI glitches
- Workaround available

**Low (P3):**
- Cosmetic issues
- Enhancement requests
- Nice to have

---

## 📊 Test Metrics

### Coverage Metrics

**Target Coverage:**
- Unit Tests: > 80%
- Integration Tests: > 70%
- E2E Tests: > 60%
- API Tests: 100%

**Current Coverage:**
- Unit Tests: [To be measured]
- Integration Tests: [To be measured]
- E2E Tests: [To be measured]
- API Tests: [To be measured]

### Quality Metrics

**Defect Metrics:**
- Total Bugs Found: [Number]
- Critical Bugs: [Number]
- High Priority: [Number]
- Medium Priority: [Number]
- Low Priority: [Number]
- Fixed: [Number]
- Open: [Number]

**Test Execution:**
- Total Test Cases: [Number]
- Passed: [Number]
- Failed: [Number]
- Blocked: [Number]
- Not Run: [Number]
- Pass Rate: [Percentage]

---

## ✅ Test Sign-Off Criteria

### Phase 1: Planning & Analysis
- ✅ All API endpoints documented
- ✅ All functions analyzed
- ✅ Test plan created
- ✅ Test data prepared

### Phase 2: Unit Testing
- ⬜ All API endpoints tested
- ⬜ All database operations tested
- ⬜ All utility functions tested
- ⬜ > 80% code coverage

### Phase 3: Integration Testing
- ⬜ All integrations tested
- ⬜ All workflows tested
- ⬜ No critical bugs

### Phase 4: System Testing
- ⬜ All E2E scenarios tested
- ⬜ Data integrity verified
- ⬜ Error handling verified
- ⬜ No high priority bugs

### Phase 5: UAT
- ⬜ Usability tested
- ⬜ Business logic verified
- ⬜ User acceptance obtained

### Phase 6: Performance Testing
- ⬜ Load testing passed
- ⬜ Stress testing passed
- ⬜ Performance targets met

### Phase 7: Security Testing
- ⬜ All security tests passed
- ⬜ No vulnerabilities found
- ⬜ Security audit completed

---

## 📅 Test Schedule

### Week 1: Unit Testing
- Day 1-2: API endpoints
- Day 3-4: Database operations
- Day 5: Utility functions

### Week 2: Integration Testing
- Day 1-2: Component integration
- Day 3-4: Workflow testing
- Day 5: Bug fixing

### Week 3: System Testing
- Day 1-2: E2E scenarios
- Day 3: Data integrity
- Day 4: Error handling
- Day 5: Bug fixing

### Week 4: UAT & Performance
- Day 1-2: User acceptance
- Day 3-4: Performance testing
- Day 5: Security testing

### Week 5: Final Testing
- Day 1-3: Regression testing
- Day 4: Bug fixing
- Day 5: Sign-off

---

## 🎯 สรุป

### จำนวน Test Cases ทั้งหมด

**Unit Tests:**
- API Tests: 60+ test cases
- Database Tests: 10+ test cases
- Utility Tests: 10+ test cases
- **Total: 80+ test cases**

**Integration Tests:**
- Component Integration: 10+ test cases
- Workflow Integration: 10+ test cases
- **Total: 20+ test cases**

**System Tests:**
- E2E Tests: 10+ test cases
- Data Integrity: 5+ test cases
- Error Handling: 5+ test cases
- **Total: 20+ test cases**

**UAT:**
- Usability: 5+ test cases
- Business Logic: 5+ test cases
- **Total: 10+ test cases**

**Performance Tests:**
- Load Testing: 5+ test cases
- Stress Testing: 5+ test cases
- **Total: 10+ test cases**

**Security Tests:**
- Authentication: 10+ test cases
- Authorization: 5+ test cases
- Data Security: 5+ test cases
- **Total: 20+ test cases**

### **Grand Total: 160+ Test Cases**

---

**แผนการทดสอบนี้ครอบคลุมทุกฟังก์ชันของระบบ Shop License System**

✅ **Phase 1 - Task 4: สร้างแผนการทดสอบแบบละเอียด - เสร็จสมบูรณ์**

---

**Next Steps:**
1. เริ่มดำเนินการทดสอบตาม Phase 2
2. บันทึกผลการทดสอบ
3. รายงาน bugs ที่พบ
4. แก้ไข bugs
5. Regression testing
6. Final sign-off
