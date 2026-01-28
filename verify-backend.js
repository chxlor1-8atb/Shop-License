// Quick verification test after fixes
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = "postgresql://neondb_owner:npg_dmWJrab3uSP5@ep-lively-bird-a1vsnlbg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function quickVerify() {
    console.log('🔍 Quick Verification Test\n');

    const sql = neon(DATABASE_URL);

    try {
        // Check current data
        const stats = await sql`
            SELECT 
                (SELECT COUNT(*) FROM licenses) as licenses,
                (SELECT COUNT(*) FROM shops) as shops,
                (SELECT COUNT(*) FROM license_types) as license_types,
                (SELECT COUNT(*) FROM custom_fields WHERE entity_type = 'licenses' AND is_active = true) as active_fields
        `;

        console.log('📊 Current Database Status:');
        console.log(`   Licenses: ${stats[0].licenses}`);
        console.log(`   Shops: ${stats[0].shops}`);
        console.log(`   License Types: ${stats[0].license_types}`);
        console.log(`   Active Custom Fields: ${stats[0].active_fields}`);
        console.log('');

        // Test the fixed query
        console.log('🧪 Testing Fixed Query (with entity_type filter)...');
        const testQuery = await sql`
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
            GROUP BY l.id, s.shop_name, lt.name
            ORDER BY l.id DESC
            LIMIT 5
        `;
        console.log(`✅ Query executed successfully - Found ${testQuery.length} licenses`);
        console.log('');

        // Show license types
        console.log('📋 Available License Types:');
        const types = await sql`SELECT id, name, price, validity_days FROM license_types ORDER BY id`;
        types.forEach(t => {
            console.log(`   ${t.id}. ${t.name} - ${t.price} บาท (${t.validity_days} วัน)`);
        });
        console.log('');

        console.log('='.repeat(60));
        console.log('✅ VERIFICATION COMPLETE');
        console.log('='.repeat(60));
        console.log('✅ Database connection: OK');
        console.log('✅ License Types: Ready (' + stats[0].license_types + ' types)');
        console.log('✅ Shops: Ready (' + stats[0].shops + ' shops)');
        console.log('✅ Custom Fields: Ready (' + stats[0].active_fields + ' active fields)');
        console.log('✅ Fixed Query: Working');
        console.log('');
        console.log('🎉 Backend system is READY for use!');
        console.log('');
        console.log('📝 Next steps:');
        console.log('   1. Open http://localhost:3000/dashboard/licenses');
        console.log('   2. Click "เพิ่มใบอนุญาต" to create a new license');
        console.log('   3. Test all CRUD operations');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

quickVerify().then(() => process.exit(0));
