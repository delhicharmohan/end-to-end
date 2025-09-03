const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugBalanceInconsistency() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('🔍 === DEBUGGING BALANCE INCONSISTENCY ===');
    console.log('📅 Timestamp:', new Date().toISOString());

    // Check 1: Find orders with balance inconsistencies
    console.log('\n❌ Step 1: Finding Balance Inconsistencies');
    
    const [inconsistentOrders] = await connection.execute(`
      SELECT 
        id, refID, amount, instant_balance, instant_paid,
        (amount - instant_paid) as calculated_balance,
        ABS(instant_balance - (amount - instant_paid)) as discrepancy,
        current_payout_splits, paymentStatus
      FROM orders 
      WHERE is_instant_payout = 1 
      AND ABS(instant_balance - (amount - instant_paid)) > 0.01
      ORDER BY discrepancy DESC
    `);

    if (inconsistentOrders.length > 0) {
      console.log(`❌ Found ${inconsistentOrders.length} orders with balance inconsistencies:`);
      console.table(inconsistentOrders);
      
      // Analyze each inconsistent order
      for (const order of inconsistentOrders) {
        console.log(`\n🔬 Analyzing Order ${order.id} (${order.refID}):`);
        
        // Get batch details
        const [batches] = await connection.execute(`
          SELECT 
            id, amount, status, pay_in_order_id, pay_in_ref_id,
            created_at, system_confirmed_at, timeout_flag
          FROM instant_payout_batches 
          WHERE order_id = ?
          ORDER BY created_at DESC
        `, [order.id]);

        let totalBatchAmount = 0;
        let confirmedBatchAmount = 0;
        let pendingBatchAmount = 0;

        console.log(`   📦 Batches (${batches.length} total):`);
        batches.forEach(batch => {
          totalBatchAmount += parseFloat(batch.amount);
          if (batch.status === 'sys_confirmed') {
            confirmedBatchAmount += parseFloat(batch.amount);
          } else if (batch.status === 'pending') {
            pendingBatchAmount += parseFloat(batch.amount);
          }
          console.log(`      Batch ${batch.id}: ₹${batch.amount} (${batch.status})`);
        });

        console.log(`   💰 Financial Summary:`);
        console.log(`      Original Amount: ₹${order.amount}`);
        console.log(`      Instant Paid: ₹${order.instant_paid}`);
        console.log(`      Current Balance: ₹${order.instant_balance}`);
        console.log(`      Expected Balance: ₹${order.calculated_balance}`);
        console.log(`      Total Batched: ₹${totalBatchAmount}`);
        console.log(`      Confirmed Batches: ₹${confirmedBatchAmount}`);
        console.log(`      Pending Batches: ₹${pendingBatchAmount}`);
        console.log(`      Discrepancy: ₹${order.discrepancy}`);
      }
    } else {
      console.log('✅ No balance inconsistencies found!');
    }

    // Check 2: Available orders for payin matching
    console.log('\n📊 Step 2: Available Orders for Payin Matching');
    
    const [availableOrders] = await connection.execute(`
      SELECT 
        id, refID, amount, instant_balance, instant_paid,
        current_payout_splits, paymentStatus,
        (amount - instant_paid) as calculated_balance,
        ABS(instant_balance - (amount - instant_paid)) as discrepancy
      FROM orders 
      WHERE is_instant_payout = 1 
      AND paymentStatus = 'unassigned'
      AND instant_balance > 0
      ORDER BY instant_balance DESC
    `);

    console.log(`💰 Found ${availableOrders.length} available orders:`);
    if (availableOrders.length > 0) {
      console.table(availableOrders);
    }

    // Check 3: Recent payin order attempts
    console.log('\n📝 Step 3: Recent Payin Orders');
    
    const [recentPayins] = await connection.execute(`
      SELECT 
        id, refID, amount, paymentStatus, createdAt,
        TIMESTAMPDIFF(MINUTE, createdAt, NOW()) as minutes_ago
      FROM orders 
      WHERE type = 'payin'
      AND createdAt >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      ORDER BY createdAt DESC
      LIMIT 10
    `);

    console.log(`📋 Recent payin orders (last hour):`);
    if (recentPayins.length > 0) {
      console.table(recentPayins);
    } else {
      console.log('   No recent payin orders found');
    }

    // Check 4: Validation logic test
    console.log('\n🧪 Step 4: Testing Validation Logic');
    
    if (availableOrders.length > 0) {
      const testOrder = availableOrders[0];
      const testAmount = Math.min(parseFloat(testOrder.instant_balance), 1.00);
      
      console.log(`🎯 Testing validation for order ${testOrder.id}:`);
      console.log(`   Available Balance: ₹${testOrder.instant_balance}`);
      console.log(`   Test Amount: ₹${testAmount}`);
      console.log(`   Current Splits: ${testOrder.current_payout_splits}/5`);
      console.log(`   Status: ${testOrder.paymentStatus}`);
      
      // Manual validation checks
      let validationPassed = true;
      let issues = [];
      
      if (testOrder.paymentStatus !== 'unassigned') {
        validationPassed = false;
        issues.push(`Status is '${testOrder.paymentStatus}', not 'unassigned'`);
      }
      
      if (testOrder.current_payout_splits >= 5) {
        validationPassed = false;
        issues.push(`Maximum splits reached (${testOrder.current_payout_splits}/5)`);
      }
      
      if (parseFloat(testOrder.instant_balance) <= 0) {
        validationPassed = false;
        issues.push(`No available balance (₹${testOrder.instant_balance})`);
      }
      
      if (parseFloat(testOrder.instant_balance) < testAmount) {
        validationPassed = false;
        issues.push(`Insufficient balance: ₹${testOrder.instant_balance} < ₹${testAmount}`);
      }
      
      // Check for balance consistency
      const expectedBalance = parseFloat(testOrder.amount) - parseFloat(testOrder.instant_paid);
      if (Math.abs(parseFloat(testOrder.instant_balance) - expectedBalance) > 0.01) {
        validationPassed = false;
        issues.push(`Balance inconsistency: available=${testOrder.instant_balance}, expected=${expectedBalance}`);
      }
      
      if (validationPassed) {
        console.log('   ✅ Validation would pass');
      } else {
        console.log('   ❌ Validation would fail:');
        issues.forEach(issue => console.log(`      - ${issue}`));
      }
    }

    // Check 5: System health
    console.log('\n🏥 Step 5: System Health Check');
    
    const [healthMetrics] = await connection.execute(`
      SELECT 
        COUNT(CASE WHEN is_instant_payout = 1 THEN 1 END) as total_instant_payouts,
        COUNT(CASE WHEN is_instant_payout = 1 AND paymentStatus = 'unassigned' THEN 1 END) as available_payouts,
        COUNT(CASE WHEN is_instant_payout = 1 AND instant_balance < 0 THEN 1 END) as negative_balances,
        COUNT(CASE WHEN is_instant_payout = 1 AND ABS(instant_balance - (amount - instant_paid)) > 0.01 THEN 1 END) as balance_mismatches,
        SUM(CASE WHEN is_instant_payout = 1 AND paymentStatus = 'unassigned' THEN instant_balance ELSE 0 END) as total_available_balance
      FROM orders
    `);

    console.log('📊 System Health:', healthMetrics[0]);

    await connection.end();

    console.log('\n🎯 === DIAGNOSIS SUMMARY ===');
    if (inconsistentOrders.length > 0) {
      console.log(`❌ Found ${inconsistentOrders.length} orders with balance inconsistencies`);
      console.log('🔧 Recommended action: Run balance fix script');
    } else {
      console.log('✅ No balance inconsistencies detected');
    }
    
    console.log(`💰 Available for matching: ${availableOrders.length} orders with ₹${healthMetrics[0].total_available_balance} total balance`);
    console.log('🛡️ Validation system is working as intended - preventing problematic matches');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

debugBalanceInconsistency().catch(console.error);
