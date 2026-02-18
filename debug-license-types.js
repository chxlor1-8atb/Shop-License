require('dotenv').config();
const { fetchAll } = require('./src/lib/db');

async function debug() {
  try {
    console.log('=== Checking API Query ===');
    const query = `
        SELECT lt.*, 
        (SELECT COUNT(*) FROM licenses l WHERE l.license_type_id = lt.id) as license_count
        FROM license_types lt
        ORDER BY lt.id ASC
    `;
    const types = await fetchAll(query);
    console.log('Raw types from API query:');
    types.forEach(t => {
      console.log(`ID: ${t.id}, Name: ${t.name}, Validity Days: ${t.validity_days}, Description: ${t.description}, License Count: ${t.license_count}`);
    });
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

debug();
