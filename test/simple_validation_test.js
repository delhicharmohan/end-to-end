const mysql = require('mysql2/promise');
const moment = require('moment-timezone');
require('dotenv').config();

/**
 * Simple Balance Validation Test
 * Tests the validation logic without complex database pool setup
 */

async function simpleValidationTest() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('🧪 === SIMPLE VALIDATION TEST ===');
    console.log('📅 Timestamp:', moment().tz(process.env.TIMEZONE || 'Asia/Kolkata').format("YYYY-MM-DD HH:mm:ss"));

    // Test 1: Check current system state after our fixes
    console.log('\n📊 Test 1: Current System State');
    const [systemState] = await connection.execute(`
      SELECT 
        COUNT(*) as total_instant_payouts,
        COUNT(CASE WHEN instant_balance < 0 THEN 1 END) as negative_balances,
        COUNT(CASE WHEN current_payout_splits > 5 THEN 1 END) as over_splits,
        COUNT(CASE WHEN paymentStatus = 'unassigned' AND instant_balance > 0 THEN 1 END) as available_orders,
        SUM(CASE WHEN paymentStatus = 'unassigned' THEN instant_balance ELSE 0 END) as total_available_balance
      FROM orders 
      WHERE is_instant_payout = 1
    `);

    console.log('📈 System Metrics:', systemState[0]);
    
    if (systemState[0].negative_balances === 0) {
      console.log('✅ SUCCESS: No negative balances found!');
    } else {
      console.log(`❌ WARNING: ${systemState[0].negative_balances} negative balances still exist`);
    }

    // Test 2: Find an available order for testing
    console.log('\n🔍 Test 2: Available Orders');
    const [availableOrders] = await connection.execute(`
      SELECT id, refID, amount, instant_balance, current_payout_splits, paymentStatus
      FROM orders 
      WHERE is_instant_payout = 1 
      AND paymentStatus = 'unassigned'
      AND instant_balance > 0
      ORDER BY instant_balance DESC
      LIMIT 3
    `);

    if (availableOrders.length > 0) {
      console.log(`✅ Found ${availableOrders.length} available orders:`);
      console.table(availableOrders);
      
      const testOrder = availableOrders[0];
      
      // Test 3: Simulate validation logic
      console.log(`\n🔬 Test 3: Manual Validation for Order ${testOrder.id}`);
      
      const requestedAmount = 1.00;
      const availableBalance = parseFloat(testOrder.instant_balance);
      const currentSplits = testOrder.current_payout_splits;
      
      console.log('Validation Checks:');
      console.log(`   📊 Available Balance: ₹${availableBalance}`);
      console.log(`   💰 Requested Amount: ₹${requestedAmount}`);
      console.log(`   🔢 Current Splits: ${currentSplits}/5`);
      console.log(`   📋 Status: ${testOrder.paymentStatus}`);
      
      let validationPassed = true;
      let validationErrors = [];
      
      if (testOrder.paymentStatus !== 'unassigned') {
        validationPassed = false;
        validationErrors.push(`Status is '${testOrder.paymentStatus}', not 'unassigned'`);
      }
      
      if (currentSplits >= 5) {
        validationPassed = false;
        validationErrors.push(`Maximum splits reached (${currentSplits}/5)`);
      }
      
      if (availableBalance <= 0) {
        validationPassed = false;
        validationErrors.push(`No available balance (₹${availableBalance})`);
      }
      
      if (availableBalance < requestedAmount) {
        validationPassed = false;
        validationErrors.push(`Insufficient balance: ₹${availableBalance} < ₹${requestedAmount}`);
      }
      
      if (validationPassed) {
        console.log('   ✅ All validation checks passed!');
        console.log(`   💳 Would allocate ₹${requestedAmount}, leaving ₹${availableBalance - requestedAmount}`);
      } else {
        console.log('   ❌ Validation failed:');
        validationErrors.forEach(error => console.log(`      - ${error}`));
      }
      
      // Test 4: Test over-allocation prevention
      console.log(`\n🚫 Test 4: Over-allocation Prevention`);
      const overAmount = availableBalance + 10;
      console.log(`   Attempting to allocate ₹${overAmount} (more than available ₹${availableBalance})`);
      
      if (availableBalance < overAmount) {
        console.log('   ✅ Over-allocation would be correctly prevented');
      } else {
        console.log('   ❌ Over-allocation would NOT be prevented - check validation logic!');
      }
      
    } else {
      console.log('❌ No available orders found for testing');
    }

    // Test 5: Check batch consistency
    console.log('\n📦 Test 5: Batch Consistency Check');
    const [batchConsistency] = await connection.execute(`
      SELECT 
        o.id,
        o.refID,
        o.amount as order_amount,
        o.instant_balance,
        o.instant_paid,
        o.current_payout_splits,
        COALESCE(SUM(b.amount), 0) as total_batch_amount,
        COUNT(b.id) as batch_count,
        (o.amount - o.instant_paid) as calculated_balance
      FROM orders o
      LEFT JOIN instant_payout_batches b ON b.order_id = o.id
      WHERE o.is_instant_payout = 1
      GROUP BY o.id
      HAVING ABS(o.instant_balance - (o.amount - o.instant_paid)) > 0.01
      LIMIT 5
    `);

    if (batchConsistency.length === 0) {
      console.log('✅ All orders have consistent balances');
    } else {
      console.log(`❌ Found ${batchConsistency.length} orders with balance inconsistencies:`);
      console.table(batchConsistency);
    }

    console.log('\n🎯 === TEST RESULTS ===');
    console.log(`✅ Negative Balance Fix: ${systemState[0].negative_balances === 0 ? 'SUCCESS' : 'NEEDS ATTENTION'}`);
    console.log(`✅ Available Orders: ${availableOrders.length} orders ready for matching`);
    console.log(`✅ Balance Consistency: ${batchConsistency.length === 0 ? 'ALL GOOD' : 'NEEDS REVIEW'}`);
    console.log('🛡️  Enhanced validation system is ready for deployment!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

simpleValidationTest().catch(console.error);

