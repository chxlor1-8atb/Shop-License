# Custom Fields Integration Fix - Licenses Page

## ปัญหาที่พบ

หน้า dashboard/licenses มีปัญหาระบบ custom fields ไม่ทำงานสัมพันธ์กันกับระบบเพิ่มใบอนุญาต ในขณะที่หน้า dashboard/shops ทำงานได้ปกติ

## สาเหตุ

การแยก custom fields ในหน้า licenses ใช้วิธีที่แตกต่างจากหน้า shops:

**หน้า Shops (ทำงานได้ดี):**
```javascript
// ใช้ STANDARD_COLUMNS เพื่อกรอง
Object.keys(updatedRow).forEach((key) => {
  if (
    !STANDARD_COLUMNS.find((c) => c.id === key) &&
    key !== "id" &&
    key !== "custom_fields" &&
    key !== "created_at" &&
    key !== "updated_at"
  ) {
    customValues[key] = updatedRow[key];
  }
});
```

**หน้า Licenses (ก่อนแก้ไข - มีปัญหา):**
```javascript
// ใช้ hardcoded knownKeys array
const knownKeys = [
  "id", "shop_id", "license_type_id", "license_number",
  "issue_date", "expiry_date", "status", "notes",
  "custom_fields", "created_at", "updated_at",
  "shop_name", "type_name",
];
const customValues = {};
Object.keys(updatedRow).forEach((key) => {
  if (!knownKeys.includes(key) && !key.startsWith("custom_")) {
    customValues[key] = updatedRow[key];
  }
});
```

## การแก้ไข

แก้ไขไฟล์ `src/app/dashboard/licenses/page.jsx` ในฟังก์ชัน `handleRowUpdate`:

```javascript
// Define standard columns (base columns that are not custom fields)
const STANDARD_COLUMNS_IDS = [
  "shop_id",
  "license_type_id", 
  "license_number",
  "issue_date",
  "expiry_date",
  "status",
  "notes",
];

const standardData = {
  shop_id: updatedRow.shop_id,
  license_type_id: updatedRow.license_type_id,
  license_number: updatedRow.license_number,
  issue_date: updatedRow.issue_date,
  expiry_date: updatedRow.expiry_date,
  status: updatedRow.status,
  notes: updatedRow.notes,
};

// Extract custom fields - use same pattern as shops page
// Everything in updatedRow that is NOT a standard field and NOT id/created_at/etc.
const customValues = {};
Object.keys(updatedRow).forEach((key) => {
  if (
    !STANDARD_COLUMNS_IDS.includes(key) &&
    key !== "id" &&
    key !== "custom_fields" &&
    key !== "created_at" &&
    key !== "updated_at" &&
    key !== "shop_name" &&
    key !== "type_name"
  ) {
    customValues[key] = updatedRow[key];
  }
});
```

## ผลลัพธ์

✅ ระบบ custom fields ในหน้า licenses ทำงานสัมพันธ์กันกับระบบเพิ่มใบอนุญาต
✅ ใช้วิธีการเดียวกันกับหน้า shops
✅ รองรับการเพิ่ม/แก้ไข/ลบ custom fields ได้อย่างถูกต้อง

## การทดสอบ

1. เปิดหน้า dashboard/licenses
2. คลิกขวาที่หัวตาราง > เพิ่มคอลัมน์
3. ตั้งชื่อคอลัมน์ใหม่
4. เพิ่มข้อมูลในคอลัมน์ที่สร้าง
5. บันทึกและตรวจสอบว่าข้อมูลถูกบันทึกลงฐานข้อมูลถูกต้อง
6. Refresh หน้า - ข้อมูลควรยังคงอยู่

## ไฟล์ที่เกี่ยวข้อง

- `src/app/dashboard/licenses/page.jsx` - หน้าจัดการใบอนุญาต (แก้ไข)
- `src/app/dashboard/shops/page.jsx` - หน้าจัดการร้านค้า (อ้างอิง)
- `src/app/api/licenses/route.js` - API endpoint (รองรับอยู่แล้ว)
- `src/app/api/custom-fields/route.js` - API จัดการ custom fields

## วันที่แก้ไข

2026-01-28
