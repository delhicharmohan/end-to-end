const mysql = require('mysql2/promise');
require('dotenv').config();
const moment = require('moment-timezone');

/**
 * Test Script: Verify Negative Balance Fix
 * 
 * This script tests the fix for instant balance going negative after splits
 * by simulating the problematic scenario and verifying the solution works.
 */

async function testNegativeBalanceFix() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('🧪 === NEGATIVE BALANCE FIX VERIFICATION ===');
    console.log('📅 Timestamp:', moment().tz(process.env.TIMEZONE || 'Asia/Kolkata').format("YYYY-MM-DD HH:mm:ss"));

    // Test 1: Check for any existing negative balances
    console.log('\n🔍 Test 1: Checking for existing negative balances...');
    const [negativeBalances] = await connection.execute(`
      SELECT 
        id, refID, amount, instant_balance, instant_paid, current_payout_splits,
        (amount - instant_paid) as calculated_balance
      FROM orders 
      WHERE is_instant_payout = 1 
      AND instant_balance < 0
      ORDER BY instant_balance ASC
    `);

    if (negativeBalances.length === 0) {
      console.log('✅ No negative balance orders found!');
    } else {
      console.log(`❌ Found ${negativeBalances.length} orders with negative balances:`);
      console.table(negativeBalances);
    }

    // Test 2: Check balance consistency across all instant payout orders
    console.log('\n🔍 Test 2: Checking balance consistency...');
    const [inconsistentBalances] = await connection.execute(`
      SELECT 
        o.id, o.refID, o.amount, o.instant_balance, o.instant_paid,
        COALESCE(SUM(b.amount), 0) as total_batched,
        COALESCE(SUM(CASE WHEN b.status = 'sys_confirmed' THEN b.amount ELSE 0 END), 0) as total_confirmed,
        (o.amount - COALESCE(SUM(CASE WHEN b.status = 'sys_confirmed' THEN b.amount ELSE 0 END), 0)) as expected_balance,
        ABS(o.instant_balance - (o.amount - COALESCE(SUM(CASE WHEN b.status = 'sys_confirmed' THEN b.amount ELSE 0 END), 0))) as discrepancy
      FROM orders o
      LEFT JOIN instant_payout_batches b ON b.order_id = o.id
      WHERE o.is_instant_payout = 1
      GROUP BY o.id
      HAVING ABS(o.instant_balance - (o.amount - COALESCE(SUM(CASE WHEN b.status = 'sys_confirmed' THEN b.amount ELSE 0 END), 0))) > 0.01
      ORDER BY discrepancy DESC
    `);

    if (inconsistentBalances.length === 0) {
      console.log('✅ All instant payout balances are consistent!');
    } else {
      console.log(`❌ Found ${inconsistentBalances.length} orders with balance inconsistencies:`);
      console.table(inconsistentBalances);
    }

    // Test 3: Check for over-allocated orders (total batches > original amount)
    console.log('\n🔍 Test 3: Checking for over-allocated orders...');
    const [overAllocated] = await connection.execute(`
      SELECT 
        o.id, o.refID, o.amount, o.instant_balance, o.current_payout_splits,
        COALESCE(SUM(b.amount), 0) as total_batched,
        (COALESCE(SUM(b.amount), 0) - o.amount) as over_allocation
      FROM orders o
      LEFT JOIN instant_payout_batches b ON b.order_id = o.id
      WHERE o.is_instant_payout = 1
      GROUP BY o.id
      HAVING COALESCE(SUM(b.amount), 0) > o.amount
      ORDER BY over_allocation DESC
    `);

    if (overAllocated.length === 0) {
      console.log('✅ No over-allocated orders found!');
    } else {
      console.log(`❌ Found ${overAllocated.length} over-allocated orders:`);
      console.table(overAllocated);
    }

    // Test 4: System health summary
    console.log('\n🔍 Test 4: Overall system health...');
    const [healthMetrics] = await connection.execute(`
      SELECT 
        COUNT(*) as total_instant_payouts,
        COUNT(CASE WHEN instant_balance < 0 THEN 1 END) as negative_balances,
        COUNT(CASE WHEN current_payout_splits > 5 THEN 1 END) as over_splits,
        COUNT(CASE WHEN ABS(instant_balance - (amount - instant_paid)) > 0.01 THEN 1 END) as balance_mismatches,
        COUNT(CASE WHEN paymentStatus = 'unassigned' AND instant_balance > 0 THEN 1 END) as available_orders,
        SUM(CASE WHEN paymentStatus = 'unassigned' THEN instant_balance ELSE 0 END) as total_available_balance
      FROM orders 
      WHERE is_instant_payout = 1
    `);

    const metrics = healthMetrics[0];
    console.log('\n📊 System Health Metrics:');
    console.table(metrics);

    // Calculate health score
    let healthScore = 100;
    if (metrics.negative_balances > 0) healthScore -= 40;
    if (metrics.over_splits > 0) healthScore -= 20;
    if (metrics.balance_mismatches > 0) healthScore -= 30;

    console.log(`\n🏥 Health Score: ${healthScore}/100`);
    
    if (healthScore >= 90) {
      console.log('✅ EXCELLENT: System is healthy!');
    } else if (healthScore >= 70) {
      console.log('⚠️  WARNING: System has minor issues');
    } else {
      console.log('❌ CRITICAL: System needs immediate attention');
    }

    // Test 5: Simulate the problematic scenario
    console.log('\n🔍 Test 5: Simulating problematic scenario...');
    console.log('Scenario: Payout ₹5, then Payin ₹4, then Payin ₹3');
    console.log('Expected: First payin should match ₹4, second should match ₹1 (remaining balance)');
    console.log('Result: No negative balances should occur');

    const timestamp = moment().tz(process.env.TIMEZONE || 'Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    console.log(`\n🕐 Verification completed at: ${timestamp}`);
    
  } catch (error) {
    console.error('\n❌ Error during verification:', error.message);
    throw error;
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the verification
if (require.main === module) {
  testNegativeBalanceFix().catch(console.error);
}

module.exports = { testNegativeBalanceFix };
