const mysql = require('mysql2/promise');
require('dotenv').config();

// Command line arguments parsing
const args = process.argv.slice(2);
const options = {};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--before':
      options.beforeDate = args[++i];
      break;
    case '--after':
      options.afterDate = args[++i];
      break;
    case '--vendor':
      options.vendor = args[++i];
      break;
    case '--type':
      options.type = args[++i];
      break;
    case '--dry-run':
      options.dryRun = true;
      break;
    case '--force':
      options.force = true;
      break;
    case '--batch-size':
      options.batchSize = parseInt(args[++i]) || 500;
      break;
    case '--help':
      console.log(`
Usage: node delete_orders_history_safe.js [options]

SAFE VERSION - Optimized for large datasets with minimal lock contention

Options:
  --before DATE       Delete records before this date (YYYY-MM-DD)
  --after DATE        Delete records after this date (YYYY-MM-DD)
  --vendor VENDOR     Delete records for specific vendor
  --type TYPE         Delete records of specific type (payin/payout)
  --dry-run           Show what would be deleted without actually deleting
  --force             Skip confirmation prompt
  --batch-size SIZE   Number of records to delete per batch (default: 500)
  --help              Show this help message

Examples:
  node delete_orders_history_safe.js --before 2024-01-01
  node delete_orders_history_safe.js --vendor gocomart --dry-run
  node delete_orders_history_safe.js --type payin --after 2024-06-01
  node delete_orders_history_safe.js --before 2025-01-01 --batch-size 200
      `);
      process.exit(0);
  }
}

// Progress bar utility
function createProgressBar(current, total, width = 50) {
  const percentage = Math.min(current / total, 1);
  const filled = Math.round(width * percentage);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percent = Math.round(percentage * 100);
  return `[${bar}] ${percent}% (${current.toLocaleString()}/${total.toLocaleString()})`;
}

// Safe batch deletion with minimal lock contention
async function deleteInBatchesSafe(connection, whereClause, params, totalRecords, batchSize) {
  const batches = Math.ceil(totalRecords / batchSize);
  let deletedCount = 0;
  let startTime = Date.now();
  let retryCount = 0;
  const maxRetries = 5;

  console.log(`\n🔄 Starting SAFE batch deletion...`);
  console.log(`📊 Total batches: ${batches.toLocaleString()}`);
  console.log(`📦 Batch size: ${batchSize.toLocaleString()}`);
  console.log(`⚡ Concurrency: 1 (sequential for safety)`);
  console.log(`⏱️  Estimated time: ${Math.ceil(batches * 2)}-${Math.ceil(batches * 5)} minutes\n`);

  // Process batches sequentially to avoid lock contention
  for (let i = 0; i < batches; i++) {
    let success = false;
    let batchDeleted = 0;

    // Retry logic for each batch
    for (let retry = 0; retry < maxRetries && !success; retry++) {
      try {
        // Set conservative timeouts
        await connection.execute('SET SESSION innodb_lock_wait_timeout = 60');
        await connection.execute('SET SESSION lock_wait_timeout = 60');
        
        const deleteQuery = `
          DELETE FROM orders_history 
          ${whereClause} 
          ORDER BY createdAt ASC 
          LIMIT ${batchSize}
        `;
        
        const result = await connection.execute(deleteQuery, params);
        batchDeleted = result[0].affectedRows;
        success = true;
        
        if (retry > 0) {
          console.log(`\n✅ Batch ${i + 1} succeeded after ${retry + 1} attempts`);
        }
      } catch (error) {
        if (error.message.includes('Lock wait timeout') && retry < maxRetries - 1) {
          retryCount++;
          console.log(`\n⚠️  Lock timeout on batch ${i + 1}, retrying... (attempt ${retry + 1}/${maxRetries})`);
          // Wait longer before retry
          await new Promise(resolve => setTimeout(resolve, (retry + 1) * 2000));
          continue;
        } else {
          console.error(`\n❌ Batch ${i + 1} failed after ${retry + 1} attempts: ${error.message}`);
          break;
        }
      }
    }

    if (success) {
      deletedCount += batchDeleted;
    }

    // Update progress
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = deletedCount / elapsed;
    const remaining = totalRecords - deletedCount;
    const eta = rate > 0 ? remaining / rate : 0;
    
    process.stdout.write(`\r${createProgressBar(deletedCount, totalRecords)} | Rate: ${Math.round(rate)}/sec | ETA: ${Math.round(eta)}s | Retries: ${retryCount} | Batch: ${i + 1}/${batches}`);

    // Add delay between batches to reduce lock contention
    if (i < batches - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`\n\n✅ Safe batch deletion completed!`);
  console.log(`📊 Total deleted: ${deletedCount.toLocaleString()}`);
  console.log(`⏱️  Time taken: ${Math.round((Date.now() - startTime) / 1000)}s`);
  console.log(`🚀 Average rate: ${Math.round(deletedCount / ((Date.now() - startTime) / 1000))} records/sec`);
  console.log(`🔄 Total retries: ${retryCount}`);

  return deletedCount;
}

async function deleteOrdersHistorySafe() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '34.31.105.133',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'rishad',
      password: process.env.DB_PASS || '}9B8dF8i3vb"_65&',
      database: 'wizpay_master'
    });

    console.log('✅ Connected to database successfully');

    // Check if table exists
    const [tableCheck] = await connection.execute(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'wizpay_master' 
      AND table_name = 'orders_history'
    `);

    if (tableCheck[0].count === 0) {
      console.log('❌ orders_history table does not exist in wizpay_master database');
      return;
    }

    // Build WHERE clause based on options
    let whereClause = '';
    let params = [];

    if (options.beforeDate) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'createdAt < ?';
      params.push(options.beforeDate + ' 23:59:59');
    }

    if (options.afterDate) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'createdAt > ?';
      params.push(options.afterDate + ' 00:00:00');
    }

    if (options.vendor) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'vendor = ?';
      params.push(options.vendor);
    }

    if (options.type) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'type = ?';
      params.push(options.type);
    }

    // Get count of records that would be deleted
    const countQuery = `SELECT COUNT(refID) as count FROM orders_history${whereClause}`;
    const [countResult] = await connection.execute(countQuery, params);
    const recordsToDelete = countResult[0].count;

    console.log(`📊 Records that would be deleted: ${recordsToDelete.toLocaleString()}`);

    if (recordsToDelete === 0) {
      console.log('ℹ️  No records match the specified criteria');
      return;
    }

    // Show sample of records that would be deleted
    const sampleQuery = `SELECT refID, type, vendor, amount, createdAt FROM orders_history${whereClause} ORDER BY createdAt DESC LIMIT 5`;
    const [sampleResult] = await connection.execute(sampleQuery, params);
    
    console.log('\n📋 Sample records that would be deleted:');
    sampleResult.forEach(record => {
      console.log(`  RefID: ${record.refID}, Type: ${record.type}, Vendor: ${record.vendor}, Amount: ${record.amount}, Date: ${record.createdAt}`);
    });

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN MODE: No records were actually deleted');
      return;
    }

    // Set conservative batch size
    const batchSize = options.batchSize || 500;

    // Confirmation prompt (unless --force is used)
    if (!options.force) {
      console.log('\n⚠️  WARNING: This will permanently delete the above records!');
      console.log('📋 Database: wizpay_master');
      console.log('📋 Table: orders_history');
      console.log(`📋 Records to be deleted: ${recordsToDelete.toLocaleString()}`);
      console.log(`📦 Batch size: ${batchSize.toLocaleString()}`);
      console.log(`⚡ Concurrency: 1 (sequential for safety)`);
      
      console.log('\n🔄 Starting deletion in 5 seconds... (Press Ctrl+C to cancel)');
      for (let i = 5; i > 0; i--) {
        process.stdout.write(`\r⏳ ${i}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      console.log('\n');
    }

    // Perform safe batch deletion
    const deletedCount = await deleteInBatchesSafe(connection, whereClause, params, recordsToDelete, batchSize);

    // Verify deletion
    const [verifyResult] = await connection.execute('SELECT COUNT(refID) as count FROM orders_history');
    const remainingCount = verifyResult[0].count;
    
    console.log(`📊 Total rows remaining in orders_history table: ${remainingCount.toLocaleString()}`);

  } catch (error) {
    console.error('❌ Error occurred:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
console.log('🚀 Starting SAFE orders_history table cleanup script...\n');
console.log('📋 Options:', options);
deleteOrdersHistorySafe()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

