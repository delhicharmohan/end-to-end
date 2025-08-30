const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkOrdersHistoryDetailed() {
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

    console.log('✅ Connected to wizpay_master database successfully\n');

    // Get actual table structure using DESCRIBE
    console.log('🔍 Actual table structure (DESCRIBE):');
    const [describeResult] = await connection.execute('DESCRIBE orders_history');
    
    console.log('Columns:');
    describeResult.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
    });

    // Get total row count
    console.log('\n📊 Row count:');
    const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM orders_history');
    const totalCount = countResult[0].count;
    console.log(`  Total rows: ${totalCount.toLocaleString()}`);

    if (totalCount > 0) {
      // Get date range using the actual column names
      const [dateRange] = await connection.execute(`
        SELECT 
          MIN(createdAt) as earliest_date,
          MAX(createdAt) as latest_date
        FROM orders_history
      `);
      
      console.log(`  Date range: ${dateRange[0].earliest_date} to ${dateRange[0].latest_date}`);

      // Get sample records using the actual column names
      console.log('\n📋 Sample records (latest 5):');
      const [sampleRecords] = await connection.execute(`
        SELECT * FROM orders_history 
        ORDER BY createdAt DESC 
        LIMIT 5
      `);
      
      sampleRecords.forEach((record, index) => {
        console.log(`\n  Record ${index + 1}:`);
        Object.keys(record).forEach(key => {
          const value = record[key];
          if (value !== null && value !== undefined) {
            console.log(`    ${key}: ${value}`);
          }
        });
      });

      // Check for records before 2025-02-01
      console.log('\n🔍 Checking for records before 2025-02-01...');
      const [beforeDateCount] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM orders_history 
        WHERE createdAt < '2025-02-01 23:59:59'
      `);
      
      console.log(`  Records before 2025-02-01: ${beforeDateCount[0].count.toLocaleString()}`);

      if (beforeDateCount[0].count > 0) {
        const [beforeDateSample] = await connection.execute(`
          SELECT * FROM orders_history 
          WHERE createdAt < '2025-02-01 23:59:59'
          ORDER BY createdAt DESC 
          LIMIT 3
        `);
        
        console.log('  Sample records before 2025-02-01:');
        beforeDateSample.forEach((record, index) => {
          console.log(`\n    Sample ${index + 1}:`);
          Object.keys(record).forEach(key => {
            const value = record[key];
            if (value !== null && value !== undefined) {
              console.log(`      ${key}: ${value}`);
            }
          });
        });
      }

      // Get vendor distribution
      console.log('\n🏢 Vendor distribution (top 10):');
      const [vendorStats] = await connection.execute(`
        SELECT vendor, COUNT(*) as count 
        FROM orders_history 
        GROUP BY vendor 
        ORDER BY count DESC 
        LIMIT 10
      `);
      
      vendorStats.forEach(stat => {
        console.log(`  ${stat.vendor}: ${stat.count.toLocaleString()} records`);
      });

      // Get type distribution
      console.log('\n📊 Type distribution:');
      const [typeStats] = await connection.execute(`
        SELECT type, COUNT(*) as count 
        FROM orders_history 
        GROUP BY type 
        ORDER BY count DESC
      `);
      
      typeStats.forEach(stat => {
        console.log(`  ${stat.type}: ${stat.count.toLocaleString()} records`);
      });

    } else {
      console.log('  Table is empty');
    }

  } catch (error) {
    console.error('❌ Error occurred:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the script
console.log('🚀 Starting detailed orders_history table diagnostic...\n');
checkOrdersHistoryDetailed()
  .then(() => {
    console.log('\n✅ Diagnostic completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Diagnostic failed:', error);
    process.exit(1);
  });

