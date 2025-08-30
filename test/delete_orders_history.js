const mysql = require('mysql2/promise');
require('dotenv').config();

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
async function deleteAllInBatches(connection, totalRecords, batchSize = 1000, concurrency = 5) {
  const batches = Math.ceil(totalRecords / batchSize);
  let deletedCount = 0;
  let startTime = Date.now();

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
        ORDER BY createdAt ASC 
        LIMIT ${batchSize}
      `;
      
      batchPromises.push(
        connection.execute(deleteQuery)
          .then(result => ({ success: true, deleted: result[0].affectedRows }))
          .catch(error => ({ success: false, error: error.message }))
      );
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
    const eta = remaining / rate;
    
    process.stdout.write(`\r${createProgressBar(deletedCount, totalRecords)} | Rate: ${Math.round(rate)}/sec | ETA: ${Math.round(eta)}s`);
  }

  console.log(`\n\n✅ Batch deletion completed!`);
  console.log(`📊 Total deleted: ${deletedCount.toLocaleString()}`);
  console.log(`⏱️  Time taken: ${Math.round((Date.now() - startTime) / 1000)}s`);
  console.log(`🚀 Average rate: ${Math.round(deletedCount / ((Date.now() - startTime) / 1000))} records/sec`);

  return deletedCount;
}

async function deleteOrdersHistory() {
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

    // First, let's check if the table exists and get its current row count
    const [tableCheck] = await connection.execute(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'wizpay_master' 
      AND table_name = 'orders_history'
    `);

    if (tableCheck[0].count === 0) {
      console.log('❌ orders_history table does not exist in wizpay_master database');
      return;
    }

    // Get current row count
    const [countResult] = await connection.execute('SELECT COUNT(refID) as count FROM orders_history');
    const currentCount = countResult[0].count;
    
    console.log(`📊 Current rows in orders_history table: ${currentCount.toLocaleString()}`);

    if (currentCount === 0) {
      console.log('ℹ️  orders_history table is already empty');
      return;
    }

    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will delete ALL data from orders_history table!');
    console.log('📋 Database: wizpay_master');
    console.log('📋 Table: orders_history');
    console.log(`📋 Rows to be deleted: ${currentCount.toLocaleString()}`);
    
    // For safety, we'll add a small delay and show a countdown
    console.log('\n🔄 Starting deletion in 5 seconds...');
    for (let i = 5; i > 0; i--) {
      process.stdout.write(`\r⏳ ${i}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('\n');

    // Perform batch deletion
    const deletedCount = await deleteAllInBatches(connection, currentCount);

    // Verify deletion
    const [verifyResult] = await connection.execute('SELECT COUNT(refID) as count FROM orders_history');
    const newCount = verifyResult[0].count;
    
    console.log(`📊 Rows remaining in orders_history table: ${newCount.toLocaleString()}`);

    if (newCount === 0) {
      console.log('🎉 orders_history table has been completely cleared!');
    } else {
      console.log('⚠️  Some rows may still exist in the table');
    }

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
console.log('🚀 Starting orders_history table cleanup script...\n');
deleteOrdersHistory()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
