
const { fetchAll } = require('./src/lib/db');

async function checkCustomFields() {
    try {
        const fields = await fetchAll('SELECT * FROM custom_fields ORDER BY entity_type, display_order');
        console.log('Custom Fields:', JSON.stringify(fields, null, 2));
    } catch (e) {
        console.error(e);
    }
}

// Mocking the db module might be hard if it depends on env vars.
// Let's see if we can just read the sqlite file if it's sqlite, or connection string.
// Looking at package.json might tell us the DB driver.
