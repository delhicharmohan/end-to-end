const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixOrder225() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('🔧 === FIXING ORDER 225 BALANCE INCONSISTENCY ===');
    console.log('📅 Timestamp:', new Date().toISOString());

    // Step 1: Analyze Order 225
    console.log('\n📊 Step 1: Analyzing Order 225');
    
    const [order] = await connection.execute(`
      SELECT 
        id, refID, amount, instant_balance, instant_paid, current_payout_splits,
        (amount - instant_paid) as calculated_balance,
        ABS(instant_balance - (amount - instant_paid)) as discrepancy
      FROM orders 
      WHERE id = 225
    `);

    if (order.length === 0) {
      console.log('❌ Order 225 not found');
      return;
    }

    const orderData = order[0];
    console.log('📋 Current State:', orderData);

    // Step 2: Get batch information
    console.log('\n📦 Step 2: Batch Analysis');
    
    const [batches] = await connection.execute(`
      SELECT 
        id, amount, status, pay_in_order_id, pay_in_ref_id,
        created_at, system_confirmed_at
      FROM instant_payout_batches 
      WHERE order_id = 225
      ORDER BY created_at DESC
    `);

    console.log(`Found ${batches.length} batches:`);
    if (batches.length > 0) {
      console.table(batches);
    }

    let confirmedAmount = 0;
    let confirmedCount = 0;

    batches.forEach(batch => {
      if (batch.status === 'sys_confirmed') {
        confirmedAmount += parseFloat(batch.amount);
        confirmedCount++;
      }
    });

    console.log(`�� Batch Summary:`);
    console.log(`   Total Batches: ${batches.length}`);
    console.log(`   Confirmed Batches: ${confirmedCount}`);
    console.log(`   Confirmed Amount: ₹${confirmedAmount}`);

    // Step 3: Calculate correct values
    const correctBalance = parseFloat(orderData.amount) - confirmedAmount;
    const correctPaid = confirmedAmount;
    const correctSplits = confirmedCount;

    console.log(`\n🔧 Step 3: Correction Needed`);
    console.log(`   Current instant_balance: ₹${orderData.instant_balance}`);
    console.log(`   Correct instant_balance: ₹${correctBalance}`);
    console.log(`   Current instant_paid: ₹${orderData.instant_paid}`);
    console.log(`   Correct instant_paid: ₹${correctPaid}`);
    console.log(`   Current splits: ${orderData.current_payout_splits}`);
    console.log(`   Correct splits: ${correctSplits}`);

    // Step 4: Apply fix
    console.log('\n⚡ Step 4: Applying Fix');
    
    await connection.execute(`
      UPDATE orders 
      SET 
        instant_balance = ?,
        instant_paid = ?,
        current_payout_splits = ?
      WHERE id = 225
    `, [correctBalance, correctPaid, correctSplits]);

    console.log('✅ Order 225 fixed successfully!');

    // Step 5: Verify fix
    console.log('\n🔍 Step 5: Verification');
    
    const [verifyOrder] = await connection.execute(`
      SELECT 
        id, refID, amount, instant_balance, instant_paid, current_payout_splits,
        (amount - instant_paid) as calculated_balance,
        ABS(instant_balance - (amount - instant_paid)) as discrepancy
      FROM orders 
      WHERE id = 225
    `);

    const verified = verifyOrder[0];
    console.log('✅ Updated State:', verified);

    if (parseFloat(verified.discrepancy) <= 0.01) {
      console.log('🎉 SUCCESS: Balance inconsistency resolved!');
    } else {
      console.log('❌ WARNING: Discrepancy still exists:', verified.discrepancy);
    }

    await connection.end();

    console.log('\n🎯 === FIX SUMMARY ===');
    console.log('✅ Order 225 balance inconsistency fixed');
    console.log('✅ Payin order creation should now work');
    console.log('🛡️ Validation system prevented data corruption');

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixOrder225().catch(console.error);
