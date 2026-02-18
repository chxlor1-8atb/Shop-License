#!/usr/bin/env node

import { executeQuery } from '../src/lib/db.js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function addIndexes() {
  try {
    console.log('🚀 Adding performance indexes...');
    
    const sql = readFileSync('./scripts/add-performance-indexes.sql', 'utf8');
    const statements = sql.split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('SELECT') && !s.startsWith('ANALYZE'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        await executeQuery(statement.trim());
        console.log('✓', statement.trim().substring(0, 60) + '...');
      }
    }
    
    // Analyze tables
    console.log('📊 Analyzing tables...');
    await executeQuery('ANALYZE shops');
    await executeQuery('ANALYZE license_types'); 
    await executeQuery('ANALYZE licenses');
    await executeQuery('ANALYZE custom_fields');
    await executeQuery('ANALYZE custom_field_values');
    await executeQuery('ANALYZE activity_logs');
    
    console.log('🎉 Performance indexes added successfully!');
  } catch (error) {
    console.error('❌ Error adding indexes:', error.message);
    process.exit(1);
  }
}

addIndexes();
