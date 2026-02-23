import { fetchAll, fetchOne, executeQuery } from '../src/lib/db.js';

// ข้อมูลทดสอบแบบสมจริง
const SHOP_NAMES = [
  'ร้านสะดุดพลาซ่า', 'ร้านอาหารทะเลมุกดก', 'ร้านก๋วยเตี๋ยวเก่าเหลือง', 'ร้านกาแฟฮิปสเตอร์',
  'ร้านขนมไทยแม่นงนุช', 'ร้านสเต็กเฮาส์', 'ร้านอาหารจานด่วน', 'ร้านผลไม้สด',
  'ร้านอาหารใต้', 'ร้านอาหารญี่ปุ่น'
];

const OWNER_NAMES = [
  'สมชาย ใจดี', 'สมศรี รักสุข', 'สมหญิง มั่นคง', 'สมศักดิ์ กล้าหาญ',
  'สมฤทธิ์ แก้วสว่าง', 'สมบูรณ์ ทรัพย์มาก', 'สมศรี ศรีสุข', 'สมหาญิง งามสง่า',
  'สมชาย มีเมตตา', 'สมศรี แก้วใส'
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
  return new Date(randomTime);
}

function formatThaiDate(date) {
  return date.toISOString().split('T')[0];
}

function generateLicenseNumber(prefix, id) {
  const year = new Date().getFullYear() + 543; // พ.ศ.
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${year}-${random}`;
}

async function seedRealisticTestDataFixed() {
  try {
    console.log('=== สร้างข้อมูลทดสอบแบบสมจริง (Fixed) ===\n');
    
    // 1. ดึง license types ที่มีจริง
    console.log('1. ดึง License Types ที่มีในระบบ...');
    const licenseTypes = await fetchAll('SELECT id, name FROM license_types ORDER BY id');
    console.log('License Types ที่มีในระบบ:');
    licenseTypes.forEach(type => {
      console.log(`  ID ${type.id}: ${type.name}`);
    });
    
    if (licenseTypes.length === 0) {
      console.log('❌ ไม่พบ License Types ในระบบ กรุณาสร้างก่อน');
      process.exit(1);
    }
    
    // 2. สร้างร้านค้า 10 แห่ง
    console.log('\n2. สร้างร้านค้า 10 แห่ง...');
    const createdShops = [];
    
    for (let i = 0; i < 10; i++) {
      const shopData = {
        shop_name: SHOP_NAMES[i],
        owner_name: OWNER_NAMES[i],
        phone: `0${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        address: `${Math.floor(Math.random() * 999) + 1} ซอย ${randomChoice(['ก', 'ข', 'ค', 'ง'])} ถนน${randomChoice(['สุขุมวิทัย', 'พหลโยธิน', 'รัชดาภิเษก', 'วิภาวดีรังสิต'])} แขวง${randomChoice(['พญาไท', 'ดินแดง', 'สามย่าน', 'บางนาค'])} เขต${randomChoice(['พญาไท', 'ดินแดง', 'สามย่าน', 'บางนาค'])} ${randomChoice(['กรุงเทพมหานคร', 'นนทบุรี', 'สมุทรปราการ', 'ชลบุรี'])} ${Math.floor(Math.random() * 50000) + 10000}`,
        email: `shop${i + 1}@example.com`,
        notes: `เปิดทำการมาแล้ว ${Math.floor(Math.random() * 10) + 1} ปี`
      };
      
      const shop = await fetchOne(`
        INSERT INTO shops (shop_name, owner_name, phone, address, email, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, shop_name, owner_name
      `, [shopData.shop_name, shopData.owner_name, shopData.phone, shopData.address, shopData.email, shopData.notes]);
      
      createdShops.push(shop);
      console.log(`  ✅ สร้างร้านค้า: ${shop.shop_name} (ID: ${shop.id})`);
    }
    
    // 3. สร้างใบอนุญาต 40 ใบ (ร้านละ 4 ใบ)
    console.log('\n3. สร้างใบอนุญาต 40 ใบ (ร้านละ 4 ใบ)...');
    const createdLicenses = [];
    
    for (const shop of createdShops) {
      for (let j = 0; j < 4; j++) {
        const licenseType = randomChoice(licenseTypes);
        const issueDate = randomDate(new Date(2020, 0, 1), new Date(2024, 0, 1));
        const validityDays = 365; // 1 ปี
        const expiryDate = new Date(issueDate.getTime() + (validityDays * 24 * 60 * 60 * 1000));
        
        const licenseData = {
          shop_id: shop.id,
          license_type_id: licenseType.id,
          license_number: generateLicenseNumber(licenseType.name.substring(0, 3), j + 1),
          issue_date: formatThaiDate(issueDate),
          expiry_date: formatThaiDate(expiryDate),
          status: randomChoice(['active', 'expired', 'pending', 'suspended']),
          notes: `ออกให้กับ ${shop.shop_name} โดย ${shop.owner_name}`
        };
        
        const license = await fetchOne(`
          INSERT INTO licenses (shop_id, license_type_id, license_number, issue_date, expiry_date, status, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, license_number, status, issue_date, expiry_date
        `, [licenseData.shop_id, licenseData.license_type_id, licenseData.license_number, licenseData.issue_date, licenseData.expiry_date, licenseData.status, licenseData.notes]);
        
        createdLicenses.push({
          ...license,
          shop_name: shop.shop_name,
          type_name: licenseType.name
        });
        
        console.log(`    ✅ สร้างใบอนุญาต: ${license.license_number} - ${licenseType.name} (${license.status})`);
      }
    }
    
    // 4. เพิ่ม Custom Field Values แบบสมจริง
    console.log('\n4. เพิ่ม Custom Field Values แบบสมจริง...');
    
    // ดึง custom fields ที่มีอยู่
    const licenseCustomFields = await fetchAll(`
      SELECT id, field_name, field_label, field_type
      FROM custom_fields 
      WHERE entity_type = 'licenses'
      ORDER BY display_order
    `);
    
    const shopCustomFields = await fetchAll(`
      SELECT id, field_name, field_label, field_type
      FROM custom_fields 
      WHERE entity_type = 'shops'
      ORDER BY display_order
    `);
    
    console.log(`  พบ License Custom Fields: ${licenseCustomFields.length} ฟิลด์`);
    console.log(`  พบ Shop Custom Fields: ${shopCustomFields.length} ฟิลด์`);
    
    // เพิ่ม custom values สำหรับ licenses
    const LOCATIONS = ['กรุงเทพมหานคร', 'นนทบุรี', 'สมุทรปราการ', 'ชลบุรี', 'เชียงใหม่', 'ภูเก็ต', 'ระยอง', 'พัทลุง', 'ขอนแก่น', 'สุรินทร์'];
    const CONTACT_PERSONS = ['คุณสมชาย', 'คุณสมศรี', 'คุณสมหญิง', 'คุณสมศักดิ์', 'คุณสมฤทธิ์', 'คุณสมบูรณ์', 'คุณสมศรี', 'คุณสมหาญิง', 'คุณสมชาย', 'คุณสมศรี'];
    
    for (const license of createdLicenses) {
      for (const field of licenseCustomFields) {
        let value = '';
        
        switch (field.field_name) {
          case 'cf_selling_location':
            value = randomChoice(LOCATIONS);
            break;
          case 'cf_amount':
            value = Math.floor(Math.random() * 50000) + 5000;
            break;
          case 'cf_area_sqm':
            value = Math.floor(Math.random() * 200) + 20;
            break;
          case 'cf_area_hp':
            value = Math.floor(Math.random() * 100) + 5;
            break;
          case 'cf_contact_person':
            value = randomChoice(CONTACT_PERSONS);
            break;
          case 'cf_payment_status':
            value = randomChoice(['ชำระแล้ว', 'รอชำระ', 'ค้างชำระ']);
            break;
          default:
            value = `ข้อมูล ${field.field_label} สำหรับ ${license.license_number}`;
        }
        
        await executeQuery(`
          INSERT INTO custom_field_values (custom_field_id, entity_type, entity_id, field_value)
          VALUES ($1, 'licenses', $2, $3)
          ON CONFLICT (custom_field_id, entity_id) DO UPDATE SET
          field_value = EXCLUDED.field_value,
          updated_at = CURRENT_TIMESTAMP
        `, [field.id, license.id, value]);
      }
    }
    
    // เพิ่ม custom values สำหรับ shops
    for (const shop of createdShops) {
      for (const field of shopCustomFields) {
        let value = '';
        
        switch (field.field_name) {
          case 'cf_facebook':
            value = `facebook.com/${shop.shop_name.replace(/\s+/g, '')}`;
            break;
          case 'cf_line':
            value = `@${shop.shop_name.replace(/\s+/g, '')}shop`;
            break;
          case 'cf_instagram':
            value = `@${shop.shop_name.replace(/\s+/g, '')}`;
            break;
          case 'cf_website':
            value = `www.${shop.shop_name.replace(/\s+/g, '')}.com`;
            break;
          default:
            value = `ข้อมูล ${field.field_label} สำหรับ ${shop.shop_name}`;
        }
        
        await executeQuery(`
          INSERT INTO custom_field_values (custom_field_id, entity_type, entity_id, field_value)
          VALUES ($1, 'shops', $2, $3)
          ON CONFLICT (custom_field_id, entity_id) DO UPDATE SET
          field_value = EXCLUDED.field_value,
          updated_at = CURRENT_TIMESTAMP
        `, [field.id, shop.id, value]);
      }
    }
    
    console.log(`  ✅ เพิ่ม Custom Field Values สำหรับ licenses ${createdLicenses.length} รายการ`);
    console.log(`  ✅ เพิ่ม Custom Field Values สำหรับ shops ${createdShops.length} รายการ`);
    
    // 5. แสดงสถิติ
    console.log('\n5. สถิติข้อมูลที่สร้าง:');
    
    const shopCount = await fetchOne('SELECT COUNT(*) as count FROM shops');
    const licenseCount = await fetchOne('SELECT COUNT(*) as count FROM licenses');
    const customValueCount = await fetchOne('SELECT COUNT(*) as count FROM custom_field_values');
    
    console.log(`  📊 ร้านค้าทั้งหมด: ${shopCount.count} ร้าน`);
    console.log(`  📊 ใบอนุญาตทั้งหมด: ${licenseCount.count} ใบ`);
    console.log(`  📊 Custom Field Values: ${customValueCount.count} ค่า`);
    
    // 6. แสดงตัวอย่างข้อมูล
    console.log('\n6. ตัวอย่างข้อมูลที่สร้าง:');
    
    const sampleShops = await fetchAll(`
      SELECT s.id, s.shop_name, s.owner_name, s.phone,
             (SELECT COUNT(*) FROM licenses l WHERE l.shop_id = s.id) as license_count
      FROM shops s
      ORDER BY s.id
      LIMIT 3
    `);
    
    console.log('\n🏪 ตัวอย่างร้านค้า:');
    sampleShops.forEach(shop => {
      console.log(`  - ${shop.shop_name} (${shop.owner_name}) - มีใบอนุญาต ${shop.license_count} ใบ`);
    });
    
    const sampleLicenses = await fetchAll(`
      SELECT l.license_number, l.status, l.issue_date, l.expiry_date,
             s.shop_name, lt.name as type_name
      FROM licenses l
      JOIN shops s ON l.shop_id = s.id
      JOIN license_types lt ON l.license_type_id = lt.id
      ORDER BY l.id
      LIMIT 5
    `);
    
    console.log('\n📄 ตัวอย่างใบอนุญาต:');
    sampleLicenses.forEach(license => {
      console.log(`  - ${license.license_number} - ${license.type_name} (${license.shop_name}) - ${license.status}`);
    });
    
    // 7. แสดงตัวอย่าง Custom Field Values
    console.log('\n7. ตัวอย่าง Custom Field Values:');
    
    const sampleCustomValues = await fetchAll(`
      SELECT cfv.entity_type, cfv.entity_id, cf.field_label, cfv.field_value,
             CASE 
               WHEN cfv.entity_type = 'shops' THEN s.shop_name
               WHEN cfv.entity_type = 'licenses' THEN l.license_number
               ELSE 'Unknown'
             END as entity_name
      FROM custom_field_values cfv
      JOIN custom_fields cf ON cfv.custom_field_id = cf.id
      LEFT JOIN shops s ON cfv.entity_type = 'shops' AND cfv.entity_id = s.id
      LEFT JOIN licenses l ON cfv.entity_type = 'licenses' AND cfv.entity_id = l.id
      ORDER BY cfv.entity_type, cfv.entity_id
      LIMIT 10
    `);
    
    console.log('\n🔧 ตัวอย่าง Custom Field Values:');
    sampleCustomValues.forEach(value => {
      console.log(`  - ${value.entity_name}: ${value.field_label} = ${value.field_value}`);
    });
    
    console.log('\n🎉 สร้างข้อมูลทดสอบแบบสมจริงสำเร็จ!');
    console.log('🚀 ตอนนี้คุณสามารถทดสอบระบบได้เต็มรูปแบบแล้ว!');
    console.log('📝 มีร้านค้า 10 แห่ง, ใบอนุญาต 40 ใบ, และ Custom Field Values ครบถ้วน');
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error.message);
    console.error('Stack trace:', error.stack);
  }
  process.exit(0);
}

seedRealisticTestDataFixed();
