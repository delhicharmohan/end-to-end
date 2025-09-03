const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugWithdrawalPayinMatching() {
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

    // Check withdrawal orders
    console.log('🔍 CHECKING WITHDRAWAL ORDERS:');
    const [withdrawalOrders] = await connection.execute(`
      SELECT id, refID, amount, instant_balance, current_payout_splits, 
             paymentStatus, vendor, createdAt, is_instant_payout
      FROM orders 
      WHERE type = 'payout' 
      ORDER BY createdAt DESC 
      LIMIT 10
    `);
    
    if (withdrawalOrders.length === 0) {
      console.log('❌ No withdrawal orders found!');
      return;
    }

    console.log(`Found ${withdrawalOrders.length} withdrawal orders:`);
    withdrawalOrders.forEach(order => {
      console.log(`  - ID: ${order.id}, Amount: ${order.amount}, Balance: ${order.instant_balance}, Splits: ${order.current_payout_splits}, Status: ${order.paymentStatus}, Vendor: ${order.vendor}, Created: ${order.createdAt}`);
    });

    // Check unassigned withdrawal orders (should be available for matching)
    console.log('\n🔍 CHECKING UNASSIGNED WITHDRAWAL ORDERS:');
    const [unassignedWithdrawals] = await connection.execute(`
      SELECT id, refID, amount, instant_balance, current_payout_splits, 
             paymentStatus, vendor, createdAt, is_instant_payout
      FROM orders 
      WHERE type = 'payout' 
      AND paymentStatus = 'unassigned'
      AND is_instant_payout = 1
      ORDER BY createdAt DESC
    `);
    
    console.log(`Found ${unassignedWithdrawals.length} unassigned withdrawal orders:`);
    unassignedWithdrawals.forEach(order => {
      console.log(`  - ID: ${order.id}, Amount: ${order.amount}, Balance: ${order.instant_balance}, Splits: ${order.current_payout_splits}, Vendor: ${order.vendor}, Created: ${order.createdAt}`);
    });

    // Check recent payin orders
    console.log('\n🔍 CHECKING RECENT PAYIN ORDERS:');
    const [recentPayins] = await connection.execute(`
      SELECT id, refID, amount, paymentStatus, vendor, createdAt, is_end_to_end
      FROM orders 
      WHERE type = 'payin' 
      ORDER BY createdAt DESC 
      LIMIT 10
    `);
    
    console.log(`Found ${recentPayins.length} recent payin orders:`);
    recentPayins.forEach(order => {
      console.log(`  - ID: ${order.id}, Amount: ${order.amount}, Status: ${order.paymentStatus}, Vendor: ${order.vendor}, End-to-end: ${order.is_end_to_end}, Created: ${order.createdAt}`);
    });

    // Check instant_payout_batches
    console.log('\n🔍 CHECKING INSTANT PAYOUT BATCHES:');
    const [batches] = await connection.execute(`
      SELECT id, order_id, ref_id, amount, pay_in_order_id, pay_in_ref_id, status, vendor, created_at
      FROM instant_payout_batches 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log(`Found ${batches.length} payout batches:`);
    batches.forEach(batch => {
      console.log(`  - ID: ${batch.id}, Order: ${batch.order_id}, Amount: ${batch.amount}, Payin: ${batch.pay_in_order_id}, Status: ${batch.status}, Vendor: ${batch.vendor}, Created: ${batch.created_at}`);
    });

    // Check socket channels for active users
    console.log('\n🔍 CHECKING ACTIVE SOCKET CHANNELS:');
    const [channels] = await connection.execute(`
      SELECT channel, created_at 
      FROM socket_channels 
      WHERE channel LIKE 'instant-withdraw-%'
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log(`Found ${channels.length} active socket channels:`);
    channels.forEach(channel => {
      console.log(`  - Channel: ${channel.channel}, Created: ${channel.created_at}`);
    });

    // Test the matching logic for a specific amount
    console.log('\n🧪 TESTING MATCHING LOGIC:');
    const testAmount = 100; // Test with ₹100
    const testVendor = 'test_vendor';
    
    console.log(`Testing matching for amount: ₹${testAmount}, vendor: ${testVendor}`);
    
    const [matchingOrders] = await connection.execute(`
      SELECT id, refID, amount, instant_balance, current_payout_splits, 
             paymentStatus, vendor, createdAt, is_instant_payout
      FROM orders 
      WHERE type = 'payout' 
      AND paymentStatus = 'unassigned'
      AND is_instant_payout = 1
      AND instant_balance >= ?
      AND current_payout_splits <= 4
      ORDER BY current_payout_splits DESC, instant_balance ASC, id ASC, createdAt ASC
      LIMIT 5
    `, [testAmount]);
    
    console.log(`Found ${matchingOrders.length} potential matching orders for ₹${testAmount}:`);
    matchingOrders.forEach(order => {
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

// Run the debug function
debugWithdrawalPayinMatching().catch(console.error);
