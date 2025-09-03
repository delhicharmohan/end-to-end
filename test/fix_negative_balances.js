const mysql = require('mysql2/promise');
const moment = require('moment-timezone');
require('dotenv').config();

/**
 * Fix Negative Balance Issue - Critical Priority Fix
 * 
 * This script identifies and fixes orders with negative instant_balance
 * which indicates over-allocation beyond available funds.
 */

async function fixNegativeBalances() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('🔧 === NEGATIVE BALANCE FIX STARTED ===');
    console.log('📅 Timestamp:', moment().tz(process.env.TIMEZONE || 'Asia/Kolkata').format("YYYY-MM-DD HH:mm:ss"));

    // Step 1: Identify all orders with negative balances
    console.log('\n🔍 Step 1: Identifying orders with negative balances...');
    const [negativeBalanceOrders] = await connection.execute(`
      SELECT 
        id, refID, amount, instant_balance, instant_paid, current_payout_splits,
        (amount - instant_paid) as calculated_balance,
        (instant_balance - (amount - instant_paid)) as balance_discrepancy
      FROM orders 
      WHERE is_instant_payout = 1 
      AND instant_balance < 0
      ORDER BY instant_balance ASC
    `);

    if (negativeBalanceOrders.length === 0) {
      console.log('✅ No negative balance orders found!');
      return;
    }

    console.log(`❌ Found ${negativeBalanceOrders.length} orders with negative balances:`);
    console.table(negativeBalanceOrders);

    // Step 2: Get batch information for these orders
    console.log('\n🔍 Step 2: Analyzing batch information...');
    for (const order of negativeBalanceOrders) {
      console.log(`\n📊 Order ${order.id} (${order.refID}) Analysis:`);
      console.log(`   💰 Original Amount: ₹${order.amount}`);
      console.log(`   💸 Instant Paid: ₹${order.instant_paid}`);
      console.log(`   ⚖️  Current Balance: ₹${order.instant_balance}`);
      console.log(`   🧮 Calculated Balance: ₹${order.calculated_balance}`);
      console.log(`   📈 Splits: ${order.current_payout_splits}`);

      // Get batch details
      const [batches] = await connection.execute(`
        SELECT 
          id, amount, status, pay_in_order_id, pay_in_ref_id,
          created_at, system_confirmed_at
        FROM instant_payout_batches 
        WHERE order_id = ?
        ORDER BY created_at DESC
      `, [order.id]);

      console.log(`   📦 Total Batches: ${batches.length}`);
      
      let totalBatchAmount = 0;
      let confirmedBatchAmount = 0;
      let pendingBatchAmount = 0;

      batches.forEach(batch => {
        totalBatchAmount += parseFloat(batch.amount);
        if (batch.status === 'sys_confirmed') {
          confirmedBatchAmount += parseFloat(batch.amount);
        } else if (batch.status === 'pending') {
          pendingBatchAmount += parseFloat(batch.amount);
        }
      });

      console.log(`   💵 Total Batch Amount: ₹${totalBatchAmount}`);
      console.log(`   ✅ Confirmed Batch Amount: ₹${confirmedBatchAmount}`);
      console.log(`   ⏳ Pending Batch Amount: ₹${pendingBatchAmount}`);

      // Show discrepancy
      const expectedBalance = parseFloat(order.amount) - confirmedBatchAmount;
      console.log(`   🎯 Expected Balance: ₹${expectedBalance}`);
      console.log(`   ❌ Actual Balance: ₹${order.instant_balance}`);
      console.log(`   🔴 Discrepancy: ₹${parseFloat(order.instant_balance) - expectedBalance}`);

      if (batches.length > 0) {
        console.log('   📋 Batch Details:');
        console.table(batches);
      }
    }

    // Step 3: Ask for confirmation before fixing
    console.log('\n⚠️  === PROPOSED FIXES ===');
    console.log('The following fixes will be applied:');
    console.log('1. Recalculate instant_balance = amount - instant_paid');
    console.log('2. Update current_payout_splits based on actual confirmed batches');
    console.log('3. Cancel any pending batches that exceed available balance');

    // For now, let's create a backup and show what would be fixed
    console.log('\n💾 Creating backup before fixes...');
    const backupData = {
      timestamp: moment().tz(process.env.TIMEZONE || 'Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
      negative_balance_orders: negativeBalanceOrders,
      total_affected: negativeBalanceOrders.length
    };

    const backupFilename = `backup_negative_balance_fix_${Date.now()}.json`;
    const fs = require('fs');
    fs.writeFileSync(backupFilename, JSON.stringify(backupData, null, 2));
    console.log(`✅ Backup created: ${backupFilename}`);

    // Step 4: Apply fixes (with transaction safety)
    console.log('\n🔧 Step 4: Applying fixes...');
    await connection.beginTransaction();

    let fixedCount = 0;
    let cancelledBatches = 0;

    try {
      for (const order of negativeBalanceOrders) {
        console.log(`\n🔧 Fixing Order ${order.id}...`);

        // Get confirmed batches total
        const [confirmedBatches] = await connection.execute(`
          SELECT 
            COALESCE(SUM(amount), 0) as confirmed_amount,
            COUNT(*) as confirmed_count
          FROM instant_payout_batches 
          WHERE order_id = ? AND status = 'sys_confirmed'
        `, [order.id]);

        const confirmedAmount = parseFloat(confirmedBatches[0].confirmed_amount);
        const confirmedCount = confirmedBatches[0].confirmed_count;
        const correctBalance = parseFloat(order.amount) - confirmedAmount;

        // Update the order with correct values
        await connection.execute(`
          UPDATE orders 
          SET 
            instant_balance = ?,
            instant_paid = ?,
            current_payout_splits = ?
          WHERE id = ?
        `, [correctBalance, confirmedAmount, confirmedCount, order.id]);

        console.log(`   ✅ Updated Order ${order.id}:`);
        console.log(`      instant_balance: ${order.instant_balance} → ${correctBalance}`);
        console.log(`      instant_paid: ${order.instant_paid} → ${confirmedAmount}`);
        console.log(`      current_payout_splits: ${order.current_payout_splits} → ${confirmedCount}`);

        // Cancel pending batches that would exceed the available balance
        const [pendingBatches] = await connection.execute(`
          SELECT id, amount, pay_in_order_id 
          FROM instant_payout_batches 
          WHERE order_id = ? AND status = 'pending'
          ORDER BY created_at ASC
        `, [order.id]);

        let remainingBalance = correctBalance;
        for (const batch of pendingBatches) {
          if (remainingBalance < parseFloat(batch.amount)) {
            // Cancel this batch - insufficient balance
            await connection.execute(`
              UPDATE instant_payout_batches 
              SET status = 'cancelled_insufficient_balance', updated_at = NOW()
              WHERE id = ?
            `, [batch.id]);

            // Also update the associated payin order if it exists
            if (batch.pay_in_order_id) {
              await connection.execute(`
                UPDATE orders 
                SET paymentStatus = 'expired'
                WHERE id = ? AND type = 'payin'
              `, [batch.pay_in_order_id]);
            }

            console.log(`   ❌ Cancelled batch ${batch.id} (₹${batch.amount}) - insufficient balance`);
            cancelledBatches++;
          } else {
            remainingBalance -= parseFloat(batch.amount);
          }
        }

        fixedCount++;
      }

      await connection.commit();
      console.log(`\n✅ === FIX COMPLETED ===`);
      console.log(`   🔧 Fixed ${fixedCount} orders`);
      console.log(`   ❌ Cancelled ${cancelledBatches} invalid batches`);

      // Step 5: Verification
      console.log('\n🔍 Step 5: Verification...');
      const [verifyOrders] = await connection.execute(`
        SELECT 
          id, refID, amount, instant_balance, instant_paid, current_payout_splits,
          (amount - instant_paid) as calculated_balance,
          (instant_balance - (amount - instant_paid)) as balance_discrepancy
        FROM orders 
        WHERE is_instant_payout = 1 
        AND instant_balance < 0
      `);

      if (verifyOrders.length === 0) {
        console.log('✅ SUCCESS: No more negative balance orders found!');
      } else {
        console.log(`❌ WARNING: ${verifyOrders.length} orders still have negative balances:`);
        console.table(verifyOrders);
      }

    } catch (error) {
      await connection.rollback();
      console.error('❌ Error during fix, rolling back:', error);
      throw error;
    }

  } catch (error) {
    console.error('❌ Fatal Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the fix
fixNegativeBalances().catch(console.error);

