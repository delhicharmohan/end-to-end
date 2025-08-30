const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkOrdersHistory() {
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

    console.log('✅ Connected to database successfully\n');

    // Check if the table exists
    console.log('🔍 Checking if orders_history table exists...');
    const [tableCheck] = await connection.execute(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'wizpay_staging' 
      AND table_name = 'orders_history'
    `);

    if (tableCheck[0].count === 0) {
      console.log('❌ orders_history table does NOT exist in wizpay_master database');
      
      // Show all tables in the database
      console.log('\n📋 Available tables in wizpay_master:');
      const [tables] = await connection.execute(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'wizpay_master' 
        ORDER BY table_name
      `);
      
      tables.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
      
      return;
    }

    console.log('✅ orders_history table exists\n');

    // Get table structure
    console.log('🔍 Table structure:');
    const [columns] = await connection.execute(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'wizpay_master' 
      AND table_name = 'orders_history'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Get total row count
    console.log('\n📊 Row count:');
    const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM orders_history');
    const totalCount = countResult[0].count;
    console.log(`  Total rows: ${totalCount}`);

    if (totalCount > 0) {
      // Get date range
      const [dateRange] = await connection.execute(`
        SELECT 
          MIN(createdAt) as earliest_date,
          MAX(createdAt) as latest_date
        FROM orders_history
      `);
      
      console.log(`  Date range: ${dateRange[0].earliest_date} to ${dateRange[0].latest_date}`);

      // Get sample records
      console.log('\n📋 Sample records (latest 5):');
      const [sampleRecords] = await connection.execute(`
        SELECT id, refID, type, vendor, amount, createdAt, paymentStatus
        FROM orders_history 
        ORDER BY createdAt DESC 
        LIMIT 5
      `);
      
      sampleRecords.forEach(record => {
        console.log(`  ID: ${record.id}, RefID: ${record.refID}, Type: ${record.type}, Vendor: ${record.vendor}, Amount: ${record.amount}, Status: ${record.paymentStatus}, Date: ${record.createdAt}`);
      });

      // Check for records before 2025-02-01
      console.log('\n🔍 Checking for records before 2025-02-01...');
      const [beforeDateCount] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM orders_history 
        WHERE createdAt < '2025-02-01 23:59:59'
      `);
      
      console.log(`  Records before 2025-02-01: ${beforeDateCount[0].count}`);

      if (beforeDateCount[0].count > 0) {
        const [beforeDateSample] = await connection.execute(`
          SELECT id, refID, type, vendor, amount, createdAt
          FROM orders_history 
          WHERE createdAt < '2025-02-01 23:59:59'
          ORDER BY createdAt DESC 
          LIMIT 3
        `);
        
        console.log('  Sample records before 2025-02-01:');
        beforeDateSample.forEach(record => {
          console.log(`    ID: ${record.id}, RefID: ${record.refID}, Type: ${record.type}, Date: ${record.createdAt}`);
        });
      }
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
console.log('🚀 Starting orders_history table diagnostic...\n');
checkOrdersHistory()
  .then(() => {
    console.log('\n✅ Diagnostic completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Diagnostic failed:', error);
    process.exit(1);
  });
