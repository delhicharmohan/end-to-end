const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixMissingInstantBalance() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '34.31.105.133',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'rishad',
      password: process.env.DB_PASS || '}9B8dF8i3vb"_65&',
      database: process.env.DB_NAME || 'wizpay_staging'
    });

    console.log('✅ Connected to database successfully\n');

    // Find payout orders with missing instant_balance
    console.log('🔍 FINDING PAYOUT ORDERS WITH MISSING INSTANT_BALANCE:');
    const [ordersToFix] = await connection.execute(`
      SELECT id, refID, amount, instant_balance, current_payout_splits, 
             paymentStatus, vendor, createdAt, is_instant_payout
      FROM orders 
      WHERE type = 'payout' 
      AND (instant_balance IS NULL OR instant_balance = 0)
      AND paymentStatus = 'unassigned'
      ORDER BY createdAt DESC
    `);
    
    if (ordersToFix.length === 0) {
      console.log('✅ No payout orders need fixing!');
      return;
    }

    console.log(`Found ${ordersToFix.length} payout orders that need fixing:`);
    ordersToFix.forEach(order => {
      console.log(`  - ID: ${order.id}, Amount: ${order.amount}, Balance: ${order.instant_balance}, Splits: ${order.current_payout_splits}, Vendor: ${order.vendor}, Created: ${order.createdAt}`);
    });

    // Fix the orders
    console.log('\n🔧 FIXING MISSING INSTANT_BALANCE:');
    let fixedCount = 0;
    
    for (const order of ordersToFix) {
      try {
        const [updateResult] = await connection.execute(`
          UPDATE orders 
          SET instant_balance = ?, 
              current_payout_splits = COALESCE(current_payout_splits, 0),
              is_instant_payout = COALESCE(is_instant_payout, 1)
          WHERE id = ?
        `, [order.amount, order.id]);
        
        if (updateResult.affectedRows > 0) {
          console.log(`  ✅ Fixed order ${order.id}: set instant_balance = ${order.amount}`);
          fixedCount++;
        } else {
          console.log(`  ❌ Failed to fix order ${order.id}`);
        }
      } catch (error) {
        console.error(`  ❌ Error fixing order ${order.id}:`, error.message);
      }
    }

    console.log(`\n📊 SUMMARY: Fixed ${fixedCount} out of ${ordersToFix.length} orders`);

    // Verify the fix
    console.log('\n🔍 VERIFYING THE FIX:');
    const [verifiedOrders] = await connection.execute(`
      SELECT id, refID, amount, instant_balance, current_payout_splits, 
             paymentStatus, vendor, createdAt, is_instant_payout
      FROM orders 
      WHERE type = 'payout' 
      AND paymentStatus = 'unassigned'
      AND instant_balance IS NOT NULL
      AND instant_balance > 0
      ORDER BY createdAt DESC 
      LIMIT 10
    `);
    
    console.log(`Found ${verifiedOrders.length} payout orders with valid instant_balance:`);
    verifiedOrders.forEach(order => {
      console.log(`  - ID: ${order.id}, Amount: ${order.amount}, Balance: ${order.instant_balance}, Splits: ${order.current_payout_splits}, Vendor: ${order.vendor}, Created: ${order.createdAt}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the fix function
fixMissingInstantBalance().catch(console.error);
