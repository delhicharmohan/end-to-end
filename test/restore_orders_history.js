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

async function restoreOrdersHistory() {
  let sourceConnection, targetConnection;
  
  try {
    console.log('🚀 Starting orders_history data restoration...\n');

    // Connect to both databases
    sourceConnection = await mysql.createConnection({
      host: process.env.DB_HOST || '34.31.105.133',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'rishad',
      password: process.env.DB_PASS || '}9B8dF8i3vb"_65&',
      database: 'wizpay_history'
    });

    targetConnection = await mysql.createConnection({
      host: process.env.DB_HOST || '34.31.105.133',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'rishad',
      password: process.env.DB_PASS || '}9B8dF8i3vb"_65&',
      database: 'wizpay_master'
    });

    console.log('✅ Connected to both databases successfully');

    // Get count of records to restore
    const [sourceCount] = await sourceConnection.execute('SELECT COUNT(*) as count FROM orders_history');
    const totalRecords = sourceCount[0].count;
    
    console.log(`📊 Records to restore: ${totalRecords.toLocaleString()}`);

    // Get sample of data being restored
    const [sampleData] = await sourceConnection.execute(`
      SELECT refID, type, vendor, amount, createdAt
      FROM orders_history 
      ORDER BY createdAt DESC 
      LIMIT 5
    `);
    
    console.log('\n📋 Sample records being restored:');
    sampleData.forEach(record => {
      console.log(`  ${record.refID} | ${record.type} | ${record.vendor} | ${record.amount} | ${record.createdAt}`);
    });

    // Confirmation
    console.log('\n⚠️  This will restore data to orders_history table in wizpay_master');
    console.log('🔄 Starting restoration in 5 seconds...');
    for (let i = 5; i > 0; i--) {
      process.stdout.write(`\r⏳ ${i}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('\n');

    // Batch restoration
    const batchSize = 1000;
    const batches = Math.ceil(totalRecords / batchSize);
    let restoredCount = 0;
    let startTime = Date.now();

    console.log(`🔄 Starting batch restoration...`);
    console.log(`📊 Total batches: ${batches.toLocaleString()}`);
    console.log(`📦 Batch size: ${batchSize.toLocaleString()}\n`);

    for (let i = 0; i < batches; i++) {
      const offset = i * batchSize;
      
      try {
        // Get batch of data from source
        const [batchData] = await sourceConnection.execute(`
          SELECT * FROM orders_history 
          ORDER BY createdAt ASC 
          LIMIT ${batchSize} OFFSET ${offset}
        `);

        if (batchData.length === 0) break;

        // Prepare bulk insert
        const columns = Object.keys(batchData[0]);
        const placeholders = columns.map(() => '?').join(',');
        const insertQuery = `INSERT IGNORE INTO orders_history (${columns.join(',')}) VALUES (${placeholders})`;

        // Insert batch
        for (const record of batchData) {
          const values = columns.map(col => record[col]);
          await targetConnection.execute(insertQuery, values);
          restoredCount++;
        }

        // Update progress
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = restoredCount / elapsed;
        const remaining = totalRecords - restoredCount;
        const eta = rate > 0 ? remaining / rate : 0;
        
        process.stdout.write(`\r${createProgressBar(restoredCount, totalRecords)} | Rate: ${Math.round(rate)}/sec | ETA: ${Math.round(eta)}s | Batch: ${i + 1}/${batches}`);

      } catch (error) {
        console.error(`\n❌ Error in batch ${i + 1}: ${error.message}`);
        continue;
      }
    }

    console.log(`\n\n✅ Restoration completed!`);
    console.log(`📊 Total restored: ${restoredCount.toLocaleString()}`);
    console.log(`⏱️  Time taken: ${Math.round((Date.now() - startTime) / 1000)}s`);

    // Verify restoration
    const [targetCount] = await targetConnection.execute('SELECT COUNT(*) as count FROM orders_history');
    console.log(`📊 Records now in orders_history: ${targetCount[0].count.toLocaleString()}`);

  } catch (error) {
    console.error('❌ Error occurred:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (sourceConnection) {
      await sourceConnection.end();
      console.log('🔌 Source database connection closed');
    }
    if (targetConnection) {
      await targetConnection.end();
      console.log('🔌 Target database connection closed');
    }
  }
}

// Run the script
restoreOrdersHistory()
  .then(() => {
    console.log('\n✅ Restoration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Restoration script failed:', error);
    process.exit(1);
  });

