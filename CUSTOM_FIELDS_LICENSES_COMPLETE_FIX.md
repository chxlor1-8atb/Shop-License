# สรุปการแก้ไข: ระบบ Custom Fields ในหน้า Licenses

## 🎯 ปัญหาที่พบ

หน้า **dashboard/licenses** (ใบอนุญาต) มีระบบ custom fields ที่ไม่ทำงานสัมพันธ์กันกับระบบเพิ่มใบอนุญาต ในขณะที่หน้า **dashboard/shops** (รายการร้านค้า) ทำงานได้ดี

### ปัญหาที่ตรวจพบ:

1. **การแยก Custom Fields ไม่ถูกต้อง** - ใช้ hardcoded `knownKeys` array แทนที่จะใช้ `STANDARD_COLUMNS_IDS`
2. **Modal ไม่แสดง Custom Fields** - QuickAddModal component มี custom fields เฉพาะ type="shop" เท่านั้น

---

## ✅ การแก้ไข

### 1. แก้ไขการแยก Custom Fields ใน `licenses/page.jsx`

**ไฟล์:** `src/app/dashboard/licenses/page.jsx`

**ปัญหา:** ใช้ hardcoded `knownKeys` array ที่ไม่ยืดหยุ่น

**แก้ไข:** เปลี่ยนเป็นใช้ `STANDARD_COLUMNS_IDS` เหมือนหน้า shops

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

// Extract custom fields - use same pattern as shops page
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

### 2. เพิ่ม Custom Fields Support ใน QuickAddModal

**ไฟล์:** `src/components/ui/QuickAddModal.jsx`

**การเปลี่ยนแปลง:**

#### 2.1 Fetch Custom Fields สำหรับทั้ง Shop และ License

```javascript
// เปลี่ยนจาก
useEffect(() => {
  if (isOpen && type === "shop") {
    fetchCustomFields();
  }
}, [isOpen, type]);

// เป็น
useEffect(() => {
  if (isOpen) {
    fetchCustomFields();
  }
}, [isOpen, type]);
```

#### 2.2 ปรับ fetchCustomFields ให้รองรับทั้งสอง Entity Type

```javascript
const fetchCustomFields = async () => {
  setLoadingFields(true);
  try {
    const entityType = type === "shop" ? "shops" : "licenses";
    const res = await fetch(`/api/custom-fields?entity_type=${entityType}&t=${Date.now()}`);
    const data = await res.json();
    if (data.success) {
      const standardFields = type === "shop" 
        ? ['shop_name', 'owner_name', 'phone', 'address', 'email', 'notes', 'license_count']
        : ['shop_id', 'license_type_id', 'license_number', 'issue_date', 'expiry_date', 'status', 'notes'];
      const fields = (data.fields || []).filter(
        f => f.show_in_form && !standardFields.includes(f.field_name)
      );
      setCustomFields(fields);
    }
  } catch (err) {
    console.error('Error fetching custom fields:', err);
  } finally {
    setLoadingFields(false);
  }
};
```

#### 2.3 เพิ่มการจัดการ Custom Fields ใน handleSubmit

```javascript
} else if (type === "license") {
  const standardFields = ['shop_id', 'license_type_id', 'license_number', 'issue_date', 'expiry_date', 'status', 'notes'];
  const customFieldsData = {};
  
  // Extract custom field values
  Object.keys(formData).forEach(key => {
    if (!standardFields.includes(key)) {
      customFieldsData[key] = formData[key];
    }
  });
  
  // Create payload with custom_fields
  const payload = {
    shop_id: formData.shop_id,
    license_type_id: formData.license_type_id,
    license_number: formData.license_number,
    issue_date: formData.issue_date,
    expiry_date: formData.expiry_date,
    status: formData.status,
    notes: formData.notes,
    custom_fields: customFieldsData,
  };
  
  await onSubmit(payload);
}
```

#### 2.4 เพิ่ม Custom Fields Section ใน License Form

```javascript
{/* Custom Fields Section for Licenses */}
{customFields.length > 0 && (
  <>
    <div className="form-divider" style={{ margin: '1.5rem 0 1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
      <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
        <i className="fas fa-sliders-h" style={{ marginRight: '0.5rem' }}></i>
        ข้อมูลเพิ่มเติม (Custom Fields)
      </label>
    </div>
    
    {customFields.map((field) => {
      // Render different input types based on field_type
      // Support: text, textarea, number, date, select
    })}
  </>
)}
```

---

## 🎉 ผลลัพธ์

### ✅ สิ่งที่ทำงานได้แล้ว:

1. **ตารางใบอนุญาต** - แสดง custom columns ได้ถูกต้อง
2. **การเพิ่ม/แก้ไข Custom Columns** - คลิกขวาที่หัวตารางเพื่อจัดการคอลัมน์ได้
3. **Modal สร้างใบอนุญาต** - แสดงส่วน "ข้อมูลเพิ่มเติม (Custom Fields)" พร้อมฟิลด์ที่กำหนดเอง
4. **การบันทึกข้อมูล** - Custom fields ถูกส่งไปยัง API และบันทึกลงฐานข้อมูลได้ถูกต้อง
5. **ความสัมพันธ์กับระบบ** - ระบบ custom fields ทำงานสัมพันธ์กันระหว่างตาราง, modal, และ API

### 📋 Custom Fields ที่แสดงในหน้า Licenses:

- สถานที่จำหน่าย
- จำนวนเงิน
- พื้นที่ (ตารางเมตร)
- พื้นที่ (แรงม้า)

---

## 📁 ไฟล์ที่แก้ไข

1. **`src/app/dashboard/licenses/page.jsx`** - แก้ไขการแยก custom fields ใน handleRowUpdate
2. **`src/components/ui/QuickAddModal.jsx`** - เพิ่ม custom fields support สำหรับ license form

---

## 🧪 การทดสอบ

### ขั้นตอนการทดสอบ:

1. เปิดหน้า `http://localhost:3000/dashboard/licenses`
2. คลิกปุ่ม "เพิ่มใบอนุญาต"
3. ตรวจสอบว่า Modal แสดงส่วน "ข้อมูลเพิ่มเติม (Custom Fields)"
4. กรอกข้อมูลในฟิลด์ต่างๆ รวมถึง custom fields
5. บันทึกและตรวจสอบว่าข้อมูลถูกบันทึกลงฐานข้อมูล
6. Refresh หน้า - ข้อมูลควรยังคงอยู่

### ผลการทดสอบ:

✅ **ผ่านทุกขั้นตอน** - ระบบทำงานได้ถูกต้องและสัมพันธ์กันทั้งหมด

---

## 📝 หมายเหตุ

- API endpoint `/api/licenses` รองรับ custom_fields อยู่แล้ว (ทั้ง GET, POST, PUT)
- API endpoint `/api/custom-fields` ใช้จัดการ custom field definitions
- ระบบใช้ `show_in_form` flag เพื่อกำหนดว่า custom field ใดควรแสดงใน modal
- Custom fields รองรับหลายประเภท: text, textarea, number, date, select

---

## วันที่แก้ไข

**2026-01-28**

## ผู้แก้ไข

Antigravity AI Assistant
