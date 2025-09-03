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

async function fixPayinPayoutMatching() {
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

    // 1. Find the specific ₹3 payin order that should match
    console.log('🔍 FINDING ₹3 PAYIN ORDER:');
    const [payinOrders] = await connection.execute(`
      SELECT id, refID, amount, paymentStatus, vendor, createdAt, transactionID
      FROM orders 
      WHERE type = 'payin' 
      AND amount = 3
      AND createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY createdAt DESC
      LIMIT 1
    `);

    if (payinOrders.length === 0) {
      console.log('❌ No ₹3 payin order found');
      return;
    }

    const payinOrder = payinOrders[0];
    console.log(`📥 Found payin order: ${payinOrder.id} - ₹${payinOrder.amount} (${payinOrder.paymentStatus})`);

    // 2. Find the pending ₹3 instant payout batch
    console.log('\n🔍 FINDING PENDING ₹3 INSTANT PAYOUT BATCH:');
    const [pendingBatches] = await connection.execute(`
      SELECT * FROM instant_payout_batches 
      WHERE amount = 3
      AND status = 'pending'
      AND pay_in_order_id IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (pendingBatches.length === 0) {
      console.log('❌ No pending ₹3 instant payout batch found');
      return;
    }

    const batch = pendingBatches[0];
    console.log(`🎯 Found pending batch: ${batch.id} for order ${batch.order_id}`);

    // 3. Check if we should proceed with matching
    console.log('\n🤔 SHOULD WE MATCH THESE?');
    console.log(`Payin: Order ${payinOrder.id} - ₹${payinOrder.amount} (${payinOrder.paymentStatus})`);
    console.log(`Batch: ${batch.id} for payout ${batch.order_id} - ₹${batch.amount} (${batch.status})`);

    if (payinOrder.paymentStatus !== 'success') {
      console.log('\n⚠️  PAYIN ORDER IS NOT SUCCESS STATUS');
      console.log('The payin order needs to be marked as "success" first before matching.');
      console.log('This typically happens when:');
      console.log('1. Payment is confirmed by the payment gateway');
      console.log('2. UTR/Transaction ID is verified');
      console.log('3. Admin approves the payment');
      
      // Option to update status (commented out for safety)
      console.log('\n🔧 TO FIX THIS MANUALLY:');
      console.log(`UPDATE orders SET paymentStatus = 'success', transactionID = 'YOUR_UTR_HERE' WHERE id = ${payinOrder.id};`);
      return;
    }

    // 4. If payin is success, perform the matching
    console.log('\n🔄 PERFORMING MATCHING...');
    
    // Update the instant payout batch with payin details
    await connection.execute(`
      UPDATE instant_payout_batches 
      SET pay_in_order_id = ?, 
          pay_in_ref_id = ?,
          status = 'sys_confirmed',
          system_confirmed_at = NOW(),
          utr_no = ?
      WHERE id = ?
    `, [payinOrder.id, payinOrder.refID, payinOrder.transactionID || 'AUTO_MATCHED', batch.id]);

    // Update the payout order's instant_balance
    const newInstantBalance = parseFloat(batch.amount);
    await connection.execute(`
      UPDATE orders 
      SET instant_balance = COALESCE(instant_balance, 0) + ?
      WHERE id = ?
    `, [newInstantBalance, batch.order_id]);

    console.log('✅ MATCHING COMPLETED!');
    console.log(`- Updated batch ${batch.id} with payin ${payinOrder.id}`);
    console.log(`- Added ₹${batch.amount} to payout order ${batch.order_id}'s instant_balance`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the fix function
fixPayinPayoutMatching().catch(console.error);

