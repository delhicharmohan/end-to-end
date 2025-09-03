const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUTRDuplicate(utr) {
  if (!utr) {
    console.log('Usage: node test/check_utr_duplicate.js <UTR>');
    console.log('Example: node test/check_utr_duplicate.js 123456789012');
    return;
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  console.log('\n🔍 === UTR DUPLICATE CHECK ===');
  console.log('📝 Checking UTR:', utr);
  console.log('📅 Timestamp:', new Date().toISOString());

  try {
    // Check in orders table
    const [ordersResults] = await connection.execute(
      'SELECT id, refID, transactionID, paymentStatus, type, amount, vendor, createdAt FROM orders WHERE transactionID = ?',
      [utr]
    );

    console.log('\n📊 ORDERS TABLE RESULTS:');
    if (ordersResults.length === 0) {
      console.log('✅ No records found in orders table');
    } else {
      console.log(`❌ Found ${ordersResults.length} record(s) in orders table:`);
      ordersResults.forEach((order, index) => {
        console.log(`   ${index + 1}. ID: ${order.id}, RefID: ${order.refID}, Status: ${order.paymentStatus}, Type: ${order.type}, Amount: ${order.amount}, Vendor: ${order.vendor}, Created: ${order.createdAt}`);
      });
    }

    // Check in orders_history table
    const [historyResults] = await connection.execute(
      'SELECT id, refID, transactionID, paymentStatus, type, amount, vendor, createdAt FROM orders_history WHERE transactionID = ?',
      [utr]
    );

    console.log('\n📊 ORDERS_HISTORY TABLE RESULTS:');
    if (historyResults.length === 0) {
      console.log('✅ No records found in orders_history table');
    } else {
      console.log(`❌ Found ${historyResults.length} record(s) in orders_history table:`);
      historyResults.forEach((order, index) => {
        console.log(`   ${index + 1}. ID: ${order.id}, RefID: ${order.refID}, Status: ${order.paymentStatus}, Type: ${order.type}, Amount: ${order.amount}, Vendor: ${order.vendor}, Created: ${order.createdAt}`);
      });
    }

    // Check for similar UTRs (in case of typos)
    const [similarResults] = await connection.execute(`
      SELECT id, refID, transactionID, paymentStatus, type, amount, vendor, createdAt 
      FROM orders 
      WHERE transactionID LIKE ? 
      AND transactionID != ?
      LIMIT 5
    `, [`%${utr}%`, utr]);

    console.log('\n🔍 SIMILAR UTRs IN ORDERS:');
    if (similarResults.length === 0) {
      console.log('✅ No similar UTRs found');
    } else {
      console.log(`⚠️ Found ${similarResults.length} similar UTR(s):`);
      similarResults.forEach((order, index) => {
        console.log(`   ${index + 1}. UTR: ${order.transactionID}, RefID: ${order.refID}, Status: ${order.paymentStatus}`);
      });
    }

    // Summary
    console.log('\n📋 === SUMMARY ===');
    const totalDuplicates = ordersResults.length + historyResults.length;
    if (totalDuplicates === 0) {
      console.log('✅ UTR is UNIQUE - can be used');
    } else {
      console.log(`❌ UTR is DUPLICATE - found in ${totalDuplicates} record(s)`);
      console.log('   - Orders table:', ordersResults.length, 'record(s)');
      console.log('   - Orders_history table:', historyResults.length, 'record(s)');
    }

  } catch (error) {
    console.error('💥 Error checking UTR:', error.message);
  } finally {
    await connection.end();
  }
}

// Get UTR from command line argument
const utr = process.argv[2];
checkUTRDuplicate(utr).catch(console.error);

