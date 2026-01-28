/**
 * 🧪 Comprehensive Testing Script for Shop License System
 * 
 * This script tests all major functionalities of the system
 * Run with: node scripts/comprehensive-test.js
 */

const API_BASE = 'http://localhost:3000/api';

// Test Results Storage
const testResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: []
};

// Session storage
let sessionCookie = null;

// Helper Functions
function log(message, type = 'info') {
    const colors = {
        info: '\x1b[36m',    // Cyan
        success: '\x1b[32m', // Green
        error: '\x1b[31m',   // Red
        warning: '\x1b[33m', // Yellow
        reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
}

function logTest(name, status, details = '') {
    const symbol = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
    const color = status === 'PASS' ? 'success' : status === 'FAIL' ? 'error' : 'warning';
    log(`${symbol} ${name} ${details}`, color);

    testResults.tests.push({ name, status, details });
    if (status === 'PASS') testResults.passed++;
    else if (status === 'FAIL') testResults.failed++;
    else testResults.skipped++;
}

async function login() {
    log('\n🔐 Logging in...', 'info');
    try {
        const response = await fetch(`${API_BASE}/auth?action=login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin'
            })
        });

        // Extract cookies from response
        const cookies = response.headers.get('set-cookie');
        if (cookies) {
            sessionCookie = cookies;
        }

        const data = await response.json();
        if (data.success) {
            logTest('Authentication - Login', 'PASS', `Logged in as ${data.user?.username || 'admin'}`);
            return true;
        } else {
            logTest('Authentication - Login', 'FAIL', data.message || 'Login failed');
            return false;
        }
    } catch (error) {
        logTest('Authentication - Login', 'FAIL', error.message);
        return false;
    }
}

async function testAPI(endpoint, options = {}) {
    try {
        // Add session cookie if available
        const headers = {
            ...options.headers,
        };

        if (sessionCookie) {
            headers['Cookie'] = sessionCookie;
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include'
        });

        const data = await response.json();
        return { success: response.ok, status: response.status, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ===== TEST SUITES =====

async function testDashboardAPI() {
    log('\n📊 Testing Dashboard API...', 'info');

    const result = await testAPI('/dashboard');
    if (result.success && result.data.success) {
        const stats = result.data.stats;
        logTest('Dashboard API - Get Stats', 'PASS',
            `Shops: ${stats.total_shops}, Licenses: ${stats.total_licenses}`);

        // Verify data structure
        const requiredFields = ['total_shops', 'total_licenses', 'active_licenses', 'expired_licenses', 'expiring_soon'];
        const hasAllFields = requiredFields.every(field => stats.hasOwnProperty(field));
        logTest('Dashboard API - Data Structure', hasAllFields ? 'PASS' : 'FAIL');

        return stats;
    } else {
        logTest('Dashboard API - Get Stats', 'FAIL', result.error || 'API returned error');
        return null;
    }
}

async function testShopsAPI() {
    log('\n🏪 Testing Shops API...', 'info');

    // Test GET all shops
    const result = await testAPI('/shops');
    if (result.success && result.data.success) {
        const shops = result.data.shops;
        const total = result.data.pagination.total;
        logTest('Shops API - Get All', 'PASS', `Found ${total} shops`);

        // Test pagination
        const paginatedResult = await testAPI('/shops?page=1&limit=5');
        if (paginatedResult.success) {
            logTest('Shops API - Pagination', 'PASS',
                `Page 1, Limit 5, Got ${paginatedResult.data.shops.length} items`);
        } else {
            logTest('Shops API - Pagination', 'FAIL');
        }

        // Test search
        if (shops.length > 0) {
            const searchTerm = shops[0].shop_name.substring(0, 3);
            const searchResult = await testAPI(`/shops?search=${encodeURIComponent(searchTerm)}`);
            if (searchResult.success) {
                logTest('Shops API - Search', 'PASS',
                    `Search "${searchTerm}" found ${searchResult.data.shops.length} results`);
            } else {
                logTest('Shops API - Search', 'FAIL');
            }
        }

        return { total, shops };
    } else {
        logTest('Shops API - Get All', 'FAIL', result.error || 'API returned error');
        return null;
    }
}

async function testLicensesAPI() {
    log('\n📜 Testing Licenses API...', 'info');

    // Test GET all licenses
    const result = await testAPI('/licenses');
    if (result.success && result.data.success) {
        const licenses = result.data.licenses;
        const total = result.data.pagination.total;
        logTest('Licenses API - Get All', 'PASS', `Found ${total} licenses`);

        // Count by status
        const active = licenses.filter(l => l.status === 'active').length;
        const expired = licenses.filter(l => l.status === 'expired').length;
        logTest('Licenses API - Status Count', 'PASS',
            `Active: ${active}, Expired: ${expired}`);

        // Test filtering by status
        const activeResult = await testAPI('/licenses?status=active');
        if (activeResult.success) {
            logTest('Licenses API - Filter by Status', 'PASS',
                `Active filter returned ${activeResult.data.licenses.length} licenses`);
        } else {
            logTest('Licenses API - Filter by Status', 'FAIL');
        }

        return { total, licenses };
    } else {
        logTest('Licenses API - Get All', 'FAIL', result.error || 'API returned error');
        return null;
    }
}

async function testLicenseTypesAPI() {
    log('\n🏷️ Testing License Types API...', 'info');

    const result = await testAPI('/license-types');
    if (result.success && result.data.success) {
        const types = result.data.license_types;
        logTest('License Types API - Get All', 'PASS', `Found ${types.length} types`);

        // Test optimized endpoint
        const optimizedResult = await testAPI('/license-types-optimized');
        if (optimizedResult.success) {
            logTest('License Types API - Optimized Endpoint', 'PASS',
                `Got ${optimizedResult.data.license_types.length} types with counts`);
        } else {
            logTest('License Types API - Optimized Endpoint', 'FAIL');
        }

        return types;
    } else {
        logTest('License Types API - Get All', 'FAIL', result.error || 'API returned error');
        return null;
    }
}

async function testCustomFieldsAPI() {
    log('\n⚙️ Testing Custom Fields API...', 'info');

    // Test for shops
    const shopsResult = await testAPI('/custom-fields?entity_type=shops');
    if (shopsResult.success && shopsResult.data.success) {
        const fields = shopsResult.data.custom_fields;
        logTest('Custom Fields API - Get for Shops', 'PASS', `Found ${fields.length} fields`);
    } else {
        logTest('Custom Fields API - Get for Shops', 'FAIL');
    }

    // Test for licenses
    const licensesResult = await testAPI('/custom-fields?entity_type=licenses');
    if (licensesResult.success && licensesResult.data.success) {
        const fields = licensesResult.data.custom_fields;
        logTest('Custom Fields API - Get for Licenses', 'PASS', `Found ${fields.length} fields`);
    } else {
        logTest('Custom Fields API - Get for Licenses', 'FAIL');
    }
}

async function testDataIntegrity(dashStats, shopsData, licensesData) {
    log('\n🔍 Testing Data Integrity...', 'info');

    if (!dashStats || !shopsData || !licensesData) {
        logTest('Data Integrity - Prerequisites', 'SKIP', 'Missing data from previous tests');
        return;
    }

    // Compare dashboard stats with actual API data
    const dashboardShops = dashStats.total_shops;
    const actualShops = shopsData.total;

    if (dashboardShops === actualShops) {
        logTest('Data Integrity - Shop Count Match', 'PASS',
            `Dashboard: ${dashboardShops}, API: ${actualShops}`);
    } else {
        logTest('Data Integrity - Shop Count Match', 'FAIL',
            `Dashboard: ${dashboardShops}, API: ${actualShops} (MISMATCH!)`);
    }

    const dashboardLicenses = dashStats.total_licenses;
    const actualLicenses = licensesData.total;

    if (dashboardLicenses === actualLicenses) {
        logTest('Data Integrity - License Count Match', 'PASS',
            `Dashboard: ${dashboardLicenses}, API: ${actualLicenses}`);
    } else {
        logTest('Data Integrity - License Count Match', 'FAIL',
            `Dashboard: ${dashboardLicenses}, API: ${actualLicenses} (MISMATCH!)`);
    }
}

async function testTimezoneHandling() {
    log('\n🕐 Testing Timezone Handling...', 'info');

    const result = await testAPI('/licenses');
    if (result.success && result.data.success) {
        const licenses = result.data.licenses;
        if (licenses.length > 0) {
            const sampleLicense = licenses[0];
            // Check if dates are present
            const hasIssueDate = !!sampleLicense.issue_date;
            const hasExpiryDate = !!sampleLicense.expiry_date;

            logTest('Timezone - Date Fields Present',
                hasIssueDate && hasExpiryDate ? 'PASS' : 'FAIL',
                `Issue: ${hasIssueDate}, Expiry: ${hasExpiryDate}`);
        } else {
            logTest('Timezone - Date Fields Present', 'SKIP', 'No licenses to test');
        }
    }
}

// ===== MAIN TEST RUNNER =====

async function runAllTests() {
    log('╔════════════════════════════════════════════════════════════╗', 'info');
    log('║   🧪 Shop License System - Comprehensive Test Suite      ║', 'info');
    log('╚════════════════════════════════════════════════════════════╝', 'info');
    log(`\nStarting tests at ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}...\n`, 'info');

    try {
        // Login first
        const loginSuccess = await login();
        if (!loginSuccess) {
            log('\n❌ Cannot proceed without authentication', 'error');
            process.exit(1);
        }

        // Run all test suites
        const dashStats = await testDashboardAPI();
        const shopsData = await testShopsAPI();
        const licensesData = await testLicensesAPI();
        await testLicenseTypesAPI();
        await testCustomFieldsAPI();
        await testDataIntegrity(dashStats, shopsData, licensesData);
        await testTimezoneHandling();

        // Print summary
        log('\n╔════════════════════════════════════════════════════════════╗', 'info');
        log('║                     TEST SUMMARY                          ║', 'info');
        log('╚════════════════════════════════════════════════════════════╝', 'info');
        log(`\n✅ Passed: ${testResults.passed}`, 'success');
        log(`❌ Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'info');
        log(`⏭️  Skipped: ${testResults.skipped}`, 'warning');
        log(`📊 Total: ${testResults.tests.length}\n`, 'info');

        const successRate = ((testResults.passed / testResults.tests.length) * 100).toFixed(1);
        log(`Success Rate: ${successRate}%\n`, successRate >= 80 ? 'success' : 'warning');

        // Print failed tests
        if (testResults.failed > 0) {
            log('\n❌ Failed Tests:', 'error');
            testResults.tests
                .filter(t => t.status === 'FAIL')
                .forEach(t => log(`   - ${t.name}: ${t.details}`, 'error'));
        }

        log(`\nCompleted at ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}\n`, 'info');

        // Exit with appropriate code
        process.exit(testResults.failed > 0 ? 1 : 0);

    } catch (error) {
        log(`\n❌ Fatal Error: ${error.message}`, 'error');
        console.error(error);
        process.exit(1);
    }
}

// Run tests
runAllTests();
