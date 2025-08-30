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

async function restoreFromBackupInstance() {
  let backupConnection, targetConnection;
  
  try {
    console.log('🚀 Starting recovery from backup instance...\n');

    // Connect to backup instance (34.35.94.250)
    console.log('🔌 Connecting to backup instance (34.35.94.250)...');
    backupConnection = await mysql.createConnection({
      host: '34.35.94.250',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'rishad',
      password: process.env.DB_PASS || '}9B8dF8i3vb"_65&',
      database: 'wizpay_master'
    });
    console.log('✅ Connected to backup instance');

    // Connect to current instance (34.31.105.133)
    console.log('🔌 Connecting to current instance (34.31.105.133)...');
    targetConnection = await mysql.createConnection({
      host: '34.31.105.133',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'rishad',
      password: process.env.DB_PASS || '}9B8dF8i3vb"_65&',
      database: 'wizpay_master'
    });
    console.log('✅ Connected to current instance');

    // Define recovery date range (July 1 to August 20, 2024)
    const startDate = '2024-07-01 00:00:00';
    const endDate = '2024-08-20 23:59:59';

    console.log(`📅 Recovery date range: ${startDate} to ${endDate}`);

    // Check what data is available in backup instance
    console.log('\n🔍 Analyzing backup instance data...');
    const [backupCount] = await backupConnection.execute(`
      SELECT COUNT(*) as count 
      FROM orders_history 
      WHERE createdAt >= ? AND createdAt <= ?
    `, [startDate, endDate]);

    const totalRecords = backupCount[0].count;
    console.log(`📊 Records to recover: ${totalRecords.toLocaleString()}`);

    if (totalRecords === 0) {
      console.log('❌ No records found in the specified date range on backup instance');
      return;
    }

    // Get sample of backup data
    const [sampleData] = await backupConnection.execute(`
      SELECT refID, type, vendor, amount, createdAt
      FROM orders_history 
      WHERE createdAt >= ? AND createdAt <= ?
      ORDER BY createdAt DESC 
      LIMIT 5
    `, [startDate, endDate]);
    
    console.log('\n📋 Sample records from backup:');
    sampleData.forEach(record => {
      console.log(`  ${record.refID} | ${record.type} | ${record.vendor} | ${record.amount} | ${record.createdAt}`);
    });

    // Get date range analysis
    const [dateAnalysis] = await backupConnection.execute(`
      SELECT 
        MIN(createdAt) as earliest,
        MAX(createdAt) as latest,
        COUNT(DISTINCT DATE(createdAt)) as unique_days
      FROM orders_history 
      WHERE createdAt >= ? AND createdAt <= ?
    `, [startDate, endDate]);

    console.log('\n📊 Backup data analysis:');
    console.log(`  Earliest: ${dateAnalysis[0].earliest}`);
    console.log(`  Latest: ${dateAnalysis[0].latest}`);
    console.log(`  Unique days: ${dateAnalysis[0].unique_days}`);

    // Check current state of target
    const [currentCount] = await targetConnection.execute('SELECT COUNT(*) as count FROM orders_history');
    console.log(`\n📊 Current records in target: ${currentCount[0].count.toLocaleString()}`);

    // Confirmation
    console.log('\n⚠️  RECOVERY CONFIRMATION:');
    console.log(`📤 FROM: Backup instance (34.35.94.250)`);
    console.log(`📥 TO: Current instance (34.31.105.133)`);
    console.log(`📊 Records: ${totalRecords.toLocaleString()}`);
    console.log(`📅 Period: July 1 - August 20, 2024`);
    console.log('\n🔄 Starting recovery in 10 seconds...');
    
    for (let i = 10; i > 0; i--) {
      process.stdout.write(`\r⏳ ${i}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('\n');

    // Batch recovery
    const batchSize = 1000;
    const batches = Math.ceil(totalRecords / batchSize);
    let recoveredCount = 0;
    let duplicateCount = 0;
    let startTime = Date.now();

    console.log(`🔄 Starting batch recovery...`);
    console.log(`📊 Total batches: ${batches.toLocaleString()}`);
    console.log(`📦 Batch size: ${batchSize.toLocaleString()}\n`);

    for (let i = 0; i < batches; i++) {
      const offset = i * batchSize;
      
      try {
        // Get batch of data from backup
        const [batchData] = await backupConnection.execute(`
          SELECT * FROM orders_history 
          WHERE createdAt >= ? AND createdAt <= ?
          ORDER BY createdAt ASC 
          LIMIT ${batchSize} OFFSET ${offset}
        `, [startDate, endDate]);

        if (batchData.length === 0) break;

        // Prepare bulk insert
        const columns = Object.keys(batchData[0]);
        const placeholders = columns.map(() => '?').join(',');
        
        // Use INSERT IGNORE to avoid duplicates
        const insertQuery = `INSERT IGNORE INTO orders_history (${columns.join(',')}) VALUES (${placeholders})`;

        // Insert batch records
        for (const record of batchData) {
          const values = columns.map(col => record[col]);
          const result = await targetConnection.execute(insertQuery, values);
          
          if (result[0].affectedRows > 0) {
            recoveredCount++;
          } else {
            duplicateCount++;
          }
        }

        // Update progress
        const processed = (i + 1) * batchSize;
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = processed / elapsed;
        const remaining = totalRecords - processed;
        const eta = rate > 0 ? remaining / rate : 0;
        
        process.stdout.write(`\r${createProgressBar(Math.min(processed, totalRecords), totalRecords)} | Rate: ${Math.round(rate)}/sec | ETA: ${Math.round(eta)}s | Recovered: ${recoveredCount.toLocaleString()} | Duplicates: ${duplicateCount.toLocaleString()}`);

      } catch (error) {
        console.error(`\n❌ Error in batch ${i + 1}: ${error.message}`);
        
        // If it's a connection error, try to reconnect
        if (error.code === 'PROTOCOL_CONNECTION_LOST') {
          console.log('🔄 Reconnecting to databases...');
          try {
            await backupConnection.end();
            await targetConnection.end();
            
            backupConnection = await mysql.createConnection({
              host: '34.35.94.250',
              port: process.env.DB_PORT || 3306,
              user: process.env.DB_USER || 'rishad',
              password: process.env.DB_PASS || '}9B8dF8i3vb"_65&',
              database: 'wizpay_master'
            });
            
            targetConnection = await mysql.createConnection({
              host: '34.31.105.133',
              port: process.env.DB_PORT || 3306,
              user: process.env.DB_USER || 'rishad',
              password: process.env.DB_PASS || '}9B8dF8i3vb"_65&',
              database: 'wizpay_master'
            });
            
            console.log('✅ Reconnected successfully');
          } catch (reconnectError) {
            console.error('❌ Failed to reconnect:', reconnectError.message);
            break;
          }
        }
        continue;
      }
    }

    console.log(`\n\n✅ Recovery completed!`);
    console.log(`📊 Records recovered: ${recoveredCount.toLocaleString()}`);
    console.log(`🔄 Duplicates skipped: ${duplicateCount.toLocaleString()}`);
    console.log(`⏱️  Time taken: ${Math.round((Date.now() - startTime) / 1000)}s`);

    // Verify recovery
    const [finalCount] = await targetConnection.execute('SELECT COUNT(*) as count FROM orders_history');
    const [recoveredDateRange] = await targetConnection.execute(`
      SELECT 
        COUNT(*) as count,
        MIN(createdAt) as earliest,
        MAX(createdAt) as latest
      FROM orders_history 
      WHERE createdAt >= ? AND createdAt <= ?
    `, [startDate, endDate]);

    console.log(`\n📊 Final verification:`);
    console.log(`  Total records in orders_history: ${finalCount[0].count.toLocaleString()}`);
    console.log(`  Records in recovery period: ${recoveredDateRange[0].count.toLocaleString()}`);
    console.log(`  Recovery period: ${recoveredDateRange[0].earliest} to ${recoveredDateRange[0].latest}`);

  } catch (error) {
    console.error('❌ Error occurred:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (backupConnection) {
      await backupConnection.end();
      console.log('🔌 Backup instance connection closed');
    }
    if (targetConnection) {
      await targetConnection.end();
      console.log('🔌 Target instance connection closed');
    }
  }
}

// Run the script
restoreFromBackupInstance()
  .then(() => {
    console.log('\n✅ Recovery script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Recovery script failed:', error);
    process.exit(1);
  });

