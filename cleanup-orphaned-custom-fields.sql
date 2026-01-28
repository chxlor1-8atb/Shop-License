-- SQL Script: ตรวจสอบและลบข้อมูล Orphaned Custom Field Values
-- วันที่: 2026-01-28

-- 1. ตรวจสอบข้อมูล orphaned (custom_field_values ที่ไม่มี license อ้างอิง)
SELECT 
    cfv.id,
    cfv.custom_field_id,
    cfv.entity_type,
    cfv.entity_id,
    cfv.field_value,
    cfv.created_at,
    CASE 
        WHEN l.id IS NULL THEN 'ORPHANED'
        ELSE 'VALID'
    END as status
FROM custom_field_values cfv
LEFT JOIN licenses l ON cfv.entity_id = l.id AND cfv.entity_type = 'licenses'
WHERE cfv.entity_type = 'licenses'
ORDER BY cfv.created_at DESC;

-- 2. นับจำนวนข้อมูล orphaned
SELECT 
    COUNT(*) as orphaned_count
FROM custom_field_values cfv
LEFT JOIN licenses l ON cfv.entity_id = l.id AND cfv.entity_type = 'licenses'
WHERE cfv.entity_type = 'licenses' AND l.id IS NULL;

-- 3. ลบข้อมูล orphaned ทั้งหมด (ระวัง! จะลบข้อมูลจริง)
-- ⚠️ ให้รันคำสั่งนี้เฉพาะเมื่อแน่ใจว่าต้องการลบ
DELETE FROM custom_field_values
WHERE entity_type = 'licenses'
AND entity_id NOT IN (SELECT id FROM licenses);

-- 4. ตรวจสอบอีกครั้งหลังลบ
SELECT COUNT(*) as remaining_count
FROM custom_field_values
WHERE entity_type = 'licenses';
