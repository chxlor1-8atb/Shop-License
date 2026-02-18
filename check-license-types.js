require('dotenv').config();
const { fetchAll } = require('./src/lib/db');

async function check() {
  try {
    const types = await fetchAll('SELECT id, name, validity_days, description FROM license_types ORDER BY id');
    console.log('License Types:');
    types.forEach(t => {
      console.log(`ID: ${t.id}, Name: ${t.name}, Validity Days: ${t.validity_days}, Description: ${t.description}`);
    });
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

check();
