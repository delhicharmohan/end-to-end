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
      options.batchSize = parseInt(args[++i]) || 1000;
      break;
    case '--concurrency':
      options.concurrency = parseInt(args[++i]) || 5;
      break;
    case '--help':
      console.log(`
Usage: node delete_orders_history_advanced.js [options]

Options:
  --before DATE       Delete records before this date (YYYY-MM-DD)
  --after DATE        Delete records after this date (YYYY-MM-DD)
  --vendor VENDOR     Delete records for specific vendor
  --type TYPE         Delete records of specific type (payin/payout)
  --dry-run           Show what would be deleted without actually deleting
  --force             Skip confirmation prompt
  --batch-size SIZE   Number of records to delete per batch (default: 1000)
  --concurrency NUM   Number of concurrent batch operations (default: 5)
  --help              Show this help message

Examples:
  node delete_orders_history_advanced.js --before 2024-01-01
  node delete_orders_history_advanced.js --vendor gocomart --dry-run
  node delete_orders_history_advanced.js --type payin --after 2024-06-01
  node delete_orders_history_advanced.js --before 2025-01-01 --batch-size 5000 --concurrency 10
  node delete_orders_history_advanced.js --force
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

// Batch deletion with progress tracking
async function deleteInBatches(connection, whereClause, params, totalRecords, batchSize, concurrency) {
  const batches = Math.ceil(totalRecords / batchSize);
  let deletedCount = 0;
  let startTime = Date.now();
  let retryCount = 0;
  const maxRetries = 3;

  console.log(`\n🔄 Starting batch deletion...`);
  console.log(`📊 Total batches: ${batches.toLocaleString()}`);
  console.log(`📦 Batch size: ${batchSize.toLocaleString()}`);
  console.log(`⚡ Concurrency: ${concurrency}`);
  console.log(`⏱️  Estimated time: ${Math.ceil(batches / concurrency * 2)}-${Math.ceil(batches / concurrency * 5)} minutes\n`);

  // Process batches with concurrency
  for (let i = 0; i < batches; i += concurrency) {
    const batchPromises = [];
    
    // Create concurrent batch operations
    for (let j = 0; j < concurrency && i + j < batches; j++) {
      const batchIndex = i + j;
      const offset = batchIndex * batchSize;
      
      const deleteQuery = `
        DELETE FROM orders_history 
        ${whereClause} 
        ORDER BY createdAt ASC 
        LIMIT ${batchSize}
      `;
      
      // Add retry logic for each batch
      const batchPromise = async () => {
        for (let retry = 0; retry < maxRetries; retry++) {
          try {
            // Set a shorter timeout for each operation
            await connection.execute('SET SESSION innodb_lock_wait_timeout = 30');
            await connection.execute('SET SESSION lock_wait_timeout = 30');
            
            const result = await connection.execute(deleteQuery, params);
            return { success: true, deleted: result[0].affectedRows };
          } catch (error) {
            if (error.message.includes('Lock wait timeout') && retry < maxRetries - 1) {
              retryCount++;
              console.log(`\n⚠️  Lock timeout on batch ${batchIndex}, retrying... (attempt ${retry + 1}/${maxRetries})`);
              // Wait before retry with exponential backoff
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, retry) * 1000));
              continue;
            }
            return { success: false, error: error.message };
          }
        }
      };
      
      batchPromises.push(batchPromise());
    }

    // Wait for all concurrent batches to complete
    const results = await Promise.all(batchPromises);
    
    // Process results
    for (const result of results) {
      if (result.success) {
        deletedCount += result.deleted;
      } else {
        console.error(`❌ Batch error: ${result.error}`);
      }
    }

    // Update progress
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = deletedCount / elapsed;
    const remaining = totalRecords - deletedCount;
    const eta = rate > 0 ? remaining / rate : 0;
    
    process.stdout.write(`\r${createProgressBar(deletedCount, totalRecords)} | Rate: ${Math.round(rate)}/sec | ETA: ${Math.round(eta)}s | Retries: ${retryCount}`);

    // Add a small delay between batch groups to reduce lock contention
    if (i + concurrency < batches) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`\n\n✅ Batch deletion completed!`);
  console.log(`📊 Total deleted: ${deletedCount.toLocaleString()}`);
  console.log(`⏱️  Time taken: ${Math.round((Date.now() - startTime) / 1000)}s`);
  console.log(`🚀 Average rate: ${Math.round(deletedCount / ((Date.now() - startTime) / 1000))} records/sec`);
  console.log(`🔄 Total retries: ${retryCount}`);

  return deletedCount;
}

async function deleteOrdersHistoryAdvanced() {
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

    // Set default batch size and concurrency if not specified
    const batchSize = options.batchSize || 1000;
    const concurrency = options.concurrency || 5;

    // Confirmation prompt (unless --force is used)
    if (!options.force) {
      console.log('\n⚠️  WARNING: This will permanently delete the above records!');
      console.log('📋 Database: wizpay_master');
      console.log('📋 Table: orders_history');
      console.log(`📋 Records to be deleted: ${recordsToDelete.toLocaleString()}`);
      console.log(`📦 Batch size: ${batchSize.toLocaleString()}`);
      console.log(`⚡ Concurrency: ${concurrency}`);
      
      console.log('\n🔄 Starting deletion in 5 seconds... (Press Ctrl+C to cancel)');
      for (let i = 5; i > 0; i--) {
        process.stdout.write(`\r⏳ ${i}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      console.log('\n');
    }

    // Perform batch deletion
    const deletedCount = await deleteInBatches(connection, whereClause, params, recordsToDelete, batchSize, concurrency);

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
console.log('🚀 Starting advanced orders_history table cleanup script...\n');
console.log('📋 Options:', options);
deleteOrdersHistoryAdvanced()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
