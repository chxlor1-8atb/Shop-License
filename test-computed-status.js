// Test computed status
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function testComputedStatus() {
    const sql = neon(process.env.DATABASE_URL);

    console.log('\n📊 Testing Computed Status Logic...\n');
    console.log('Today:', new Date().toISOString().split('T')[0]);

    // Test query with computed status
    const licenses = await sql`
        SELECT 
            l.id,
            l.license_number,
            l.expiry_date,
            l.status as original_status,
            CASE 
                WHEN l.status IN ('suspended', 'revoked') THEN l.status
                WHEN l.expiry_date < CURRENT_DATE THEN 'expired'
                ELSE 'active'
            END AS computed_status
        FROM licenses l
        ORDER BY l.id DESC
        LIMIT 10
    `;

    console.log('License Status Results:');
    console.log('─'.repeat(80));
    console.log(
        'ID'.padEnd(6),
        'License Number'.padEnd(20),
        'Expiry Date'.padEnd(15),
        'Original'.padEnd(12),
        'Computed (NEW)'
    );
    console.log('─'.repeat(80));

    for (const l of licenses) {
        const expiryStr = l.expiry_date ? new Date(l.expiry_date).toISOString().split('T')[0] : 'N/A';
        console.log(
            String(l.id).padEnd(6),
            (l.license_number || 'N/A').padEnd(20),
            expiryStr.padEnd(15),
            (l.original_status || 'N/A').padEnd(12),
            l.computed_status
        );
    }

    console.log('─'.repeat(80));

    // Count by computed status
    const counts = await sql`
        SELECT 
            CASE 
                WHEN status IN ('suspended', 'revoked') THEN status
                WHEN expiry_date < CURRENT_DATE THEN 'expired'
                ELSE 'active'
            END AS computed_status,
            COUNT(*) as count
        FROM licenses
        GROUP BY computed_status
    `;

    console.log('\n📈 Summary by Computed Status:');
    for (const c of counts) {
        const label = c.computed_status === 'active' ? '✅ ปกติ' :
            c.computed_status === 'expired' ? '❌ หมดอายุ' :
                c.computed_status;
        console.log(`   ${label}: ${c.count} รายการ`);
    }

    console.log('\n✨ Done!\n');
}

testComputedStatus().catch(console.error);
