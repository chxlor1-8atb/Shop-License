/**
 * Generate a secure SESSION_SECRET for .env.local
 * Run: node scripts/generate-secret.js
 */

const crypto = require('crypto');

const secret = crypto.randomBytes(32).toString('hex');

console.log('\n========================================');
console.log('🔐 Secure Session Secret Generator');
console.log('========================================\n');
console.log('Copy this to your .env.local file:\n');
console.log(`SESSION_SECRET="${secret}"`);
console.log('\n========================================');
console.log('⚠️  IMPORTANT:');
console.log('   1. Never commit .env.local to git');
console.log('   2. Rotate this secret periodically');
console.log('   3. Use different secrets for dev/prod');
console.log('========================================\n');
