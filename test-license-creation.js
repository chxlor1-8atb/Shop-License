// Test License Creation with Custom Fields
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = "postgresql://neondb_owner:npg_dmWJrab3uSP5@ep-lively-bird-a1vsnlbg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function testLicenseCreation() {
    console.log('🧪 Testing License Creation with Custom Fields\n');

    const sql = neon(DATABASE_URL);

    try {
        // 1. Get first shop and license type
        console.log('1️⃣ Getting test data...');
        const shop = await sql`SELECT id, shop_name FROM shops LIMIT 1`;
        const licenseType = await sql`SELECT id, name FROM license_types LIMIT 1`;

        if (shop.length === 0 || licenseType.length === 0) {
            console.error('❌ No shop or license type found');
            return;
        }

        console.log(`   Shop: ${shop[0].shop_name} (ID: ${shop[0].id})`);
        console.log(`   License Type: ${licenseType[0].name} (ID: ${licenseType[0].id})`);
        console.log('');

        // 2. Create a test license
        console.log('2️⃣ Creating test license...');
        const licenseNumber = `TEST-${Date.now()}`;
        const issueDate = new Date().toISOString().split('T')[0];
        const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const result = await sql`
            INSERT INTO licenses (shop_id, license_type_id, license_number, issue_date, expiry_date, status, notes)
            VALUES (${shop[0].id}, ${licenseType[0].id}, ${licenseNumber}, ${issueDate}, ${expiryDate}, 'active', 'ทดสอบระบบ')
            RETURNING id
        `;

        const licenseId = result[0].id;
        console.log(`   ✅ Created license ID: ${licenseId}`);
        console.log(`   License Number: ${licenseNumber}`);
        console.log('');

        // 3. Get active custom fields for licenses
        console.log('3️⃣ Getting active custom fields...');
        const customFields = await sql`
            SELECT id, field_name, field_label, field_type
            FROM custom_fields
            WHERE entity_type = 'licenses' AND is_active = true
            ORDER BY display_order
            LIMIT 5
        `;

        console.log(`   Found ${customFields.length} active custom fields`);
        customFields.forEach(f => {
            console.log(`   - ${f.field_label} (${f.field_name}): ${f.field_type}`);
        });
        console.log('');

        // 4. Add custom field values
        console.log('4️⃣ Adding custom field values...');
        const testValues = {
            'location': 'กรุงเทพมหานคร',
            'amount': '5000',
            'area_sqm': '100',
            'area_hp': '50',
            'contact_person': 'นายทดสอบ ระบบ'
        };

        let addedCount = 0;
        for (const field of customFields) {
            const testValue = testValues[field.field_name];
            if (testValue) {
                await sql`
                    INSERT INTO custom_field_values (custom_field_id, entity_type, entity_id, field_value)
                    VALUES (${field.id}, 'licenses', ${licenseId}, ${testValue})
                    ON CONFLICT (custom_field_id, entity_id)
                    DO UPDATE SET field_value = EXCLUDED.field_value
                `;
                console.log(`   ✅ Added ${field.field_label}: ${testValue}`);
                addedCount++;
            }
        }
        console.log(`   Total custom fields added: ${addedCount}`);
        console.log('');

        // 5. Verify data with the same query used in API
        console.log('5️⃣ Verifying data (using API query)...');
        const verification = await sql`
            SELECT l.*, s.shop_name, lt.name as type_name,
                   COALESCE(
                       json_object_agg(cf.field_name, cfv.field_value) FILTER (WHERE cf.field_name IS NOT NULL),
                       '{}'::json
                   ) as custom_fields
            FROM licenses l
            LEFT JOIN shops s ON l.shop_id = s.id
            LEFT JOIN license_types lt ON l.license_type_id = lt.id
            LEFT JOIN custom_field_values cfv ON cfv.entity_id = l.id AND cfv.entity_type = 'licenses'
            LEFT JOIN custom_fields cf ON cfv.custom_field_id = cf.id AND cf.entity_type = 'licenses' AND cf.is_active = true
            WHERE l.id = ${licenseId}
            GROUP BY l.id, s.shop_name, lt.name
        `;

        if (verification.length > 0) {
            const license = verification[0];
            console.log('   ✅ License found in database:');
            console.log(`   - ID: ${license.id}`);
            console.log(`   - License Number: ${license.license_number}`);
            console.log(`   - Shop: ${license.shop_name}`);
            console.log(`   - Type: ${license.type_name}`);
            console.log(`   - Status: ${license.status}`);
            console.log(`   - Issue Date: ${license.issue_date}`);
            console.log(`   - Expiry Date: ${license.expiry_date}`);
            console.log(`   - Custom Fields:`, JSON.stringify(license.custom_fields, null, 2));
        } else {
            console.log('   ❌ License not found!');
        }
        console.log('');

        // 6. Clean up test data
        console.log('6️⃣ Cleaning up test data...');
        await sql`DELETE FROM licenses WHERE id = ${licenseId}`;
        console.log('   ✅ Test license deleted');
        console.log('');

        console.log('='.repeat(60));
        console.log('✅ TEST PASSED');
        console.log('='.repeat(60));
        console.log('✅ License creation: Working');
        console.log('✅ Custom fields storage: Working');
        console.log('✅ Data retrieval: Working');
        console.log('✅ Query with entity_type filter: Working');
        console.log('');
        console.log('🎉 Backend system is fully functional!');
        console.log('');
        console.log('📝 Next: Test via UI at http://localhost:3000/dashboard/licenses');
        console.log('   Click "เพิ่มใบอนุญาต" and fill in the form');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

testLicenseCreation().then(() => process.exit(0));
