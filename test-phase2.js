// Comprehensive Testing Script for Shop License System
// Phase 2: Custom Fields Testing

const API_BASE = 'http://localhost:3000/api';

// Test Results Storage
const testResults = {
    phase: 'Phase 2: Custom Fields Testing',
    startTime: new Date().toISOString(),
    tests: [],
    summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
    }
};

// Helper function to log test results
function logTest(testCase, status, message, details = {}) {
    const result = {
        testCase,
        status, // 'PASS', 'FAIL', 'SKIP'
        message,
        details,
        timestamp: new Date().toISOString()
    };
    testResults.tests.push(result);
    testResults.summary.total++;
    testResults.summary[status.toLowerCase()]++;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`TEST: ${testCase}`);
    console.log(`STATUS: ${status}`);
    console.log(`MESSAGE: ${message}`);
    if (Object.keys(details).length > 0) {
        console.log(`DETAILS:`, JSON.stringify(details, null, 2));
    }
    console.log(`${'='.repeat(80)}\n`);
}

// Test Suite: CF-CREATE - Create Custom Fields
async function testCreateCustomFields() {
    console.log('\n🧪 TEST SUITE: CF-CREATE - Create Custom Fields\n');

    // Test Case CF-CREATE-001: Create Text Field
    try {
        console.log('Running CF-CREATE-001: Create Text Field...');
        const response = await fetch(`${API_BASE}/custom-fields`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                entity_type: 'shops',
                field_name: 'cf_test_text',
                field_label: 'ฟิลด์ทดสอบข้อความ',
                field_type: 'text',
                is_required: false,
                show_in_form: true,
                show_in_table: true,
                display_order: 100
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            logTest('CF-CREATE-001', 'PASS', 'Text field created successfully', {
                fieldId: data.field?.id,
                fieldName: data.field?.field_name
            });
        } else {
            logTest('CF-CREATE-001', 'FAIL', 'Failed to create text field', {
                status: response.status,
                error: data.message || data.error
            });
        }
    } catch (error) {
        logTest('CF-CREATE-001', 'FAIL', 'Exception during text field creation', {
            error: error.message
        });
    }

    // Test Case CF-CREATE-002: Create Number Field
    try {
        console.log('Running CF-CREATE-002: Create Number Field...');
        const response = await fetch(`${API_BASE}/custom-fields`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                entity_type: 'shops',
                field_name: 'cf_test_number',
                field_label: 'ฟิลด์ทดสอบตัวเลข',
                field_type: 'number',
                is_required: false,
                show_in_form: true,
                show_in_table: true,
                display_order: 101
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            logTest('CF-CREATE-002', 'PASS', 'Number field created successfully', {
                fieldId: data.field?.id,
                fieldName: data.field?.field_name
            });
        } else {
            logTest('CF-CREATE-002', 'FAIL', 'Failed to create number field', {
                status: response.status,
                error: data.message || data.error
            });
        }
    } catch (error) {
        logTest('CF-CREATE-002', 'FAIL', 'Exception during number field creation', {
            error: error.message
        });
    }

    // Test Case CF-CREATE-003: Create Date Field
    try {
        console.log('Running CF-CREATE-003: Create Date Field...');
        const response = await fetch(`${API_BASE}/custom-fields`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                entity_type: 'shops',
                field_name: 'cf_test_date',
                field_label: 'ฟิลด์ทดสอบวันที่',
                field_type: 'date',
                is_required: false,
                show_in_form: true,
                show_in_table: true,
                display_order: 102
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            logTest('CF-CREATE-003', 'PASS', 'Date field created successfully', {
                fieldId: data.field?.id,
                fieldName: data.field?.field_name
            });
        } else {
            logTest('CF-CREATE-003', 'FAIL', 'Failed to create date field', {
                status: response.status,
                error: data.message || data.error
            });
        }
    } catch (error) {
        logTest('CF-CREATE-003', 'FAIL', 'Exception during date field creation', {
            error: error.message
        });
    }

    // Test Case CF-CREATE-004: Create Textarea Field
    try {
        console.log('Running CF-CREATE-004: Create Textarea Field...');
        const response = await fetch(`${API_BASE}/custom-fields`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                entity_type: 'shops',
                field_name: 'cf_test_textarea',
                field_label: 'ฟิลด์ทดสอบข้อความยาว',
                field_type: 'textarea',
                is_required: false,
                show_in_form: true,
                show_in_table: false,
                display_order: 103
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            logTest('CF-CREATE-004', 'PASS', 'Textarea field created successfully', {
                fieldId: data.field?.id,
                fieldName: data.field?.field_name
            });
        } else {
            logTest('CF-CREATE-004', 'FAIL', 'Failed to create textarea field', {
                status: response.status,
                error: data.message || data.error
            });
        }
    } catch (error) {
        logTest('CF-CREATE-004', 'FAIL', 'Exception during textarea field creation', {
            error: error.message
        });
    }

    // Test Case CF-CREATE-005: Create Select Field with Options
    try {
        console.log('Running CF-CREATE-005: Create Select Field...');
        const response = await fetch(`${API_BASE}/custom-fields`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                entity_type: 'shops',
                field_name: 'cf_test_select',
                field_label: 'ฟิลด์ทดสอบเลือก',
                field_type: 'select',
                field_options: ['ตัวเลือก 1', 'ตัวเลือก 2', 'ตัวเลือก 3'],
                is_required: false,
                show_in_form: true,
                show_in_table: true,
                display_order: 104
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            logTest('CF-CREATE-005', 'PASS', 'Select field created successfully', {
                fieldId: data.field?.id,
                fieldName: data.field?.field_name,
                options: data.field?.field_options
            });
        } else {
            logTest('CF-CREATE-005', 'FAIL', 'Failed to create select field', {
                status: response.status,
                error: data.message || data.error
            });
        }
    } catch (error) {
        logTest('CF-CREATE-005', 'FAIL', 'Exception during select field creation', {
            error: error.message
        });
    }
}

// Test Suite: CF-VALIDATION - Validation Tests
async function testCustomFieldValidation() {
    console.log('\n🧪 TEST SUITE: CF-VALIDATION - Validation Tests\n');

    // Test Case CF-VALIDATION-001: Field name must start with cf_
    try {
        console.log('Running CF-VALIDATION-001: Invalid field name...');
        const response = await fetch(`${API_BASE}/custom-fields`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                entity_type: 'shops',
                field_name: 'invalid_name', // Should fail - doesn't start with cf_
                field_label: 'Invalid Field',
                field_type: 'text'
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            logTest('CF-VALIDATION-001', 'PASS', 'Correctly rejected invalid field name', {
                status: response.status,
                error: data.message || data.error
            });
        } else {
            logTest('CF-VALIDATION-001', 'FAIL', 'Should have rejected invalid field name', {
                fieldId: data.field?.id
            });
        }
    } catch (error) {
        logTest('CF-VALIDATION-001', 'FAIL', 'Exception during validation test', {
            error: error.message
        });
    }

    // Test Case CF-VALIDATION-002: Duplicate field name
    try {
        console.log('Running CF-VALIDATION-002: Duplicate field name...');
        const response = await fetch(`${API_BASE}/custom-fields`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                entity_type: 'shops',
                field_name: 'cf_test_text', // Already created in CF-CREATE-001
                field_label: 'Duplicate Field',
                field_type: 'text'
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            logTest('CF-VALIDATION-002', 'PASS', 'Correctly rejected duplicate field name', {
                status: response.status,
                error: data.message || data.error
            });
        } else {
            logTest('CF-VALIDATION-002', 'FAIL', 'Should have rejected duplicate field name', {
                fieldId: data.field?.id
            });
        }
    } catch (error) {
        logTest('CF-VALIDATION-002', 'FAIL', 'Exception during duplicate test', {
            error: error.message
        });
    }
}

// Test Suite: SHOP-CREATE - Create Shops with Custom Fields
async function testCreateShopsWithCustomFields() {
    console.log('\n🧪 TEST SUITE: SHOP-CREATE - Create Shops with Custom Fields\n');

    // Test Case SHOP-CREATE-001: Create basic shop
    try {
        console.log('Running SHOP-CREATE-001: Create basic shop...');
        const response = await fetch(`${API_BASE}/shops`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                shop_name: 'ร้านทดสอบ Basic',
                owner_name: 'นายทดสอบ',
                phone: '081-234-5678',
                address: '123 ถนนทดสอบ'
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            logTest('SHOP-CREATE-001', 'PASS', 'Basic shop created successfully', {
                shopId: data.shop?.id,
                shopName: data.shop?.shop_name
            });
        } else {
            logTest('SHOP-CREATE-001', 'FAIL', 'Failed to create basic shop', {
                status: response.status,
                error: data.message || data.error
            });
        }
    } catch (error) {
        logTest('SHOP-CREATE-001', 'FAIL', 'Exception during shop creation', {
            error: error.message
        });
    }

    // Test Case SHOP-CREATE-002: Create shop with custom fields
    try {
        console.log('Running SHOP-CREATE-002: Create shop with custom fields...');
        const response = await fetch(`${API_BASE}/shops`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                shop_name: 'ร้านทดสอบ Custom Fields',
                owner_name: 'นายทดสอบ 2',
                phone: '082-345-6789',
                address: '456 ถนนทดสอบ',
                custom_fields: {
                    cf_test_text: 'ข้อความทดสอบ',
                    cf_test_number: 12345,
                    cf_test_date: '2026-01-27',
                    cf_test_select: 'ตัวเลือก 1'
                }
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            logTest('SHOP-CREATE-002', 'PASS', 'Shop with custom fields created successfully', {
                shopId: data.shop?.id,
                shopName: data.shop?.shop_name,
                customFields: data.shop?.custom_fields
            });
        } else {
            logTest('SHOP-CREATE-002', 'FAIL', 'Failed to create shop with custom fields', {
                status: response.status,
                error: data.message || data.error
            });
        }
    } catch (error) {
        logTest('SHOP-CREATE-002', 'FAIL', 'Exception during shop creation with custom fields', {
            error: error.message
        });
    }
}

// Test Suite: SHOP-READ - Read and Verify Shops
async function testReadShops() {
    console.log('\n🧪 TEST SUITE: SHOP-READ - Read and Verify Shops\n');

    try {
        console.log('Running SHOP-READ-001: Get all shops...');
        const response = await fetch(`${API_BASE}/shops`);
        const data = await response.json();

        if (response.ok && data.success) {
            const shopsWithCustomFields = data.shops.filter(s =>
                s.custom_fields && Object.keys(s.custom_fields).length > 0
            );

            logTest('SHOP-READ-001', 'PASS', 'Successfully retrieved shops', {
                totalShops: data.shops.length,
                shopsWithCustomFields: shopsWithCustomFields.length,
                sampleCustomFields: shopsWithCustomFields[0]?.custom_fields
            });
        } else {
            logTest('SHOP-READ-001', 'FAIL', 'Failed to retrieve shops', {
                status: response.status,
                error: data.message || data.error
            });
        }
    } catch (error) {
        logTest('SHOP-READ-001', 'FAIL', 'Exception during shop retrieval', {
            error: error.message
        });
    }
}

// Test Suite: LICENSE-CREATE - Create Licenses
async function testCreateLicenses() {
    console.log('\n🧪 TEST SUITE: LICENSE-CREATE - Create Licenses\n');

    // First, get a shop ID to use
    try {
        const shopsResponse = await fetch(`${API_BASE}/shops`);
        const shopsData = await shopsResponse.json();
        const shopId = shopsData.shops?.[0]?.id;

        if (!shopId) {
            logTest('LICENSE-CREATE-001', 'SKIP', 'No shops available to create license');
            return;
        }

        // Get license types
        const typesResponse = await fetch(`${API_BASE}/license-types`);
        const typesData = await typesResponse.json();
        const licenseTypeId = typesData.licenseTypes?.[0]?.id;

        if (!licenseTypeId) {
            logTest('LICENSE-CREATE-001', 'SKIP', 'No license types available');
            return;
        }

        console.log('Running LICENSE-CREATE-001: Create basic license...');
        const response = await fetch(`${API_BASE}/licenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                shop_id: shopId,
                license_type_id: licenseTypeId,
                license_number: 'TEST-LIC-001',
                issue_date: '2026-01-27',
                status: 'active'
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            logTest('LICENSE-CREATE-001', 'PASS', 'License created successfully', {
                licenseId: data.license?.id,
                licenseNumber: data.license?.license_number,
                expiryDate: data.license?.expiry_date
            });
        } else {
            logTest('LICENSE-CREATE-001', 'FAIL', 'Failed to create license', {
                status: response.status,
                error: data.message || data.error
            });
        }
    } catch (error) {
        logTest('LICENSE-CREATE-001', 'FAIL', 'Exception during license creation', {
            error: error.message
        });
    }
}

// Test Suite: EXPORT - Test Export Functionality
async function testExport() {
    console.log('\n🧪 TEST SUITE: EXPORT - Test Export Functionality\n');

    try {
        console.log('Running EXPORT-001: Export shops...');
        const response = await fetch(`${API_BASE}/export?type=shops`);

        if (response.ok) {
            const contentType = response.headers.get('content-type');
            const isExcel = contentType?.includes('spreadsheet') || contentType?.includes('excel');

            logTest('EXPORT-001', 'PASS', 'Shop export successful', {
                contentType,
                isExcel
            });
        } else {
            logTest('EXPORT-001', 'FAIL', 'Shop export failed', {
                status: response.status
            });
        }
    } catch (error) {
        logTest('EXPORT-001', 'FAIL', 'Exception during shop export', {
            error: error.message
        });
    }

    try {
        console.log('Running EXPORT-002: Export licenses...');
        const response = await fetch(`${API_BASE}/export?type=licenses`);

        if (response.ok) {
            const contentType = response.headers.get('content-type');
            const isExcel = contentType?.includes('spreadsheet') || contentType?.includes('excel');

            logTest('EXPORT-002', 'PASS', 'License export successful', {
                contentType,
                isExcel
            });
        } else {
            logTest('EXPORT-002', 'FAIL', 'License export failed', {
                status: response.status
            });
        }
    } catch (error) {
        logTest('EXPORT-002', 'FAIL', 'Exception during license export', {
            error: error.message
        });
    }
}

// Main test runner
async function runAllTests() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║           COMPREHENSIVE SYSTEM TESTING - SHOP LICENSE SYSTEM               ║');
    console.log('║                     Phase 2: Custom Fields Testing                         ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');
    console.log('\n');

    // Run all test suites
    await testCreateCustomFields();
    await testCustomFieldValidation();
    await testCreateShopsWithCustomFields();
    await testReadShops();
    await testCreateLicenses();
    await testExport();

    // Print summary
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                           TEST SUMMARY                                     ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');
    console.log('\n');
    console.log(`Total Tests: ${testResults.summary.total}`);
    console.log(`✅ Passed: ${testResults.summary.passed}`);
    console.log(`❌ Failed: ${testResults.summary.failed}`);
    console.log(`⏭️  Skipped: ${testResults.summary.skipped}`);
    console.log(`\nSuccess Rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(2)}%`);
    console.log('\n');

    // Save results to file
    const fs = require('fs');
    const resultsFile = 'test-results-' + new Date().toISOString().replace(/:/g, '-') + '.json';
    fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2));
    console.log(`📄 Test results saved to: ${resultsFile}\n`);

    return testResults;
}

// Run tests
runAllTests().catch(console.error);
