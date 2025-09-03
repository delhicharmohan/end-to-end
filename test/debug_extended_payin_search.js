const mysql = require('mysql2/promise');
require('dotenv').config();

// Preflight helper to validate required environment variables
function validateEnvironmentVariables() {
  const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_NAME'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease set these environment variables and try again.');
    process.exit(1);
  }
}

async function debugExtendedPayinSearch() {
  let connection;
  
  try {
    validateEnvironmentVariables();
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('✅ Connected to database successfully\n');

    // Check for payin orders with amounts 2, 3, and 5 (the remaining amounts)
    console.log('🔍 SEARCHING FOR PAYIN ORDERS WITH AMOUNTS 2, 3, 5 (LAST 24 HOURS):');
    const [matchingPayins] = await connection.execute(`
      SELECT id, refID, amount, paymentStatus, vendor, createdAt, 
             transactionID, instant_balance
      FROM orders 
      WHERE type = 'payin' 
      AND amount IN (2, 3, 5)
      AND createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY createdAt DESC
    `);

    if (matchingPayins.length === 0) {
      console.log('❌ No payin orders found with amounts 2, 3, or 5 in the last 24 hours');
    } else {
      console.log(`Found ${matchingPayins.length} payin orders with matching amounts:`);
      matchingPayins.forEach(order => {
        console.log(`
  📥 PAYIN: ${order.id}
     Amount: ₹${order.amount}
     Status: ${order.paymentStatus}
     TransactionID: ${order.transactionID || 'NULL'}
     Created: ${order.createdAt}
        `);
      });
    }

    // Check the instant payout batches table for these orders
    console.log('\n🔍 CHECKING INSTANT PAYOUT BATCHES:');
    const [batches] = await connection.execute(`
      SELECT ipb.*, o.amount as order_amount, o.paymentStatus as order_status
      FROM instant_payout_batches ipb
      JOIN orders o ON ipb.orders_id = o.id
      WHERE o.id IN (137, 119)
      ORDER BY ipb.created_at DESC
    `);

    if (batches.length === 0) {
      console.log('❌ No instant payout batches found for these orders');
    } else {
      console.log(`Found ${batches.length} instant payout batches:`);
      batches.forEach(batch => {
        console.log(`
  🎯 BATCH: ${batch.id}
     Order ID: ${batch.orders_id}
     Amount: ₹${batch.amount}
     UTR: ${batch.utr_no}
     Status: ${batch.system_confirmed_at ? 'System Confirmed' : 'Pending'}
     Customer Confirmed: ${batch.confirmed_by_customer_at ? 'Yes' : 'No'}
     Created: ${batch.created_at}
        `);
      });
    }

    // Check for any payin orders created recently (regardless of amount)
    console.log('\n🔍 CHECKING ALL RECENT PAYIN ORDERS (LAST 6 HOURS):');
    const [allRecentPayins] = await connection.execute(`
      SELECT id, refID, amount, paymentStatus, vendor, createdAt, transactionID
      FROM orders 
      WHERE type = 'payin' 
      AND createdAt >= DATE_SUB(NOW(), INTERVAL 6 HOUR)
      ORDER BY createdAt DESC
      LIMIT 20
    `);

    if (allRecentPayins.length === 0) {
      console.log('❌ No payin orders found in the last 6 hours');
    } else {
      console.log(`Found ${allRecentPayins.length} recent payin orders:`);
      allRecentPayins.forEach(order => {
        console.log(`
  📥 PAYIN: ${order.id}
     Amount: ₹${order.amount}
     Status: ${order.paymentStatus}
     Created: ${order.createdAt}
        `);
      });
    }

    // Check the matching algorithm status
    console.log('\n🔍 CHECKING MATCHING ALGORITHM STATUS:');
    const [matchingLogs] = await connection.execute(`
      SELECT * FROM orders 
      WHERE (id = 137 OR id = 119)
      AND type = 'payout'
    `);

    matchingLogs.forEach(order => {
      console.log(`
  📤 PAYOUT ORDER ${order.id}:
     Amount: ₹${order.amount}
     Instant Balance: ₹${order.instant_balance || 0}
     Current Splits: ${order.current_payout_splits || 0}
     Payment Status: ${order.paymentStatus}
     Is Instant Payout: ${order.is_instant_payout}
     Created: ${order.createdAt}
     Updated: ${order.updatedAt}
      `);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the debug function
debugExtendedPayinSearch().catch(console.error);

