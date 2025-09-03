const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSpecificValidation() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('🔍 === CHECKING SPECIFIC VALIDATION TRIGGER ===');
    console.log('📅 Timestamp:', new Date().toISOString());

    // Simulate the exact validation logic from instantPayoutValidator.js
    console.log('\n🧪 Step 1: Simulating Validation Logic');
    
    const [availableOrders] = await connection.execute(`
      SELECT 
        id, refID, amount, instant_balance, instant_paid, 
        current_payout_splits, paymentStatus, is_instant_payout,
        (amount - instant_paid) as calculated_balance
      FROM orders 
      WHERE id = ? AND is_instant_payout = 1
    `, [204]); // Testing with order 204 which has ₹9 balance

    if (availableOrders.length === 0) {
      console.log('❌ No order found for testing');
      return;
    }

    const order = availableOrders[0];
    const requestedAmount = 3.00; // Simulate a ₹3 payin request
    const requestedAmountFloat = parseFloat(requestedAmount);
    const availableBalance = parseFloat(order.instant_balance);

    console.log('📊 Order Details:', {
      id: order.id,
      refID: order.refID,
      totalAmount: order.amount,
      availableBalance: availableBalance,
      paidAmount: order.instant_paid,
      currentSplits: order.current_payout_splits,
      status: order.paymentStatus,
      calculatedBalance: order.calculated_balance,
      requestedAmount: requestedAmountFloat
    });

    // Step by step validation checks
    console.log('\n🔍 Step 2: Validation Checks');

    // Check 1: Status
    if (order.paymentStatus !== 'unassigned') {
      console.log(`❌ Status Check: Status is '${order.paymentStatus}', must be 'unassigned'`);
      return;
    } else {
      console.log(`✅ Status Check: Status is 'unassigned'`);
    }

    // Check 2: Splits
    if (order.current_payout_splits >= 5) {
      console.log(`❌ Splits Check: Maximum splits reached (${order.current_payout_splits}/5)`);
      return;
    } else {
      console.log(`✅ Splits Check: ${order.current_payout_splits}/5 splits used`);
    }

    // Check 3: Zero balance
    if (availableBalance <= 0) {
      console.log(`❌ Balance Check: No available balance (₹${availableBalance})`);
      return;
    } else {
      console.log(`✅ Balance Check: Available balance ₹${availableBalance}`);
    }

    // Check 4: Insufficient balance
    if (availableBalance < requestedAmountFloat) {
      console.log(`❌ Amount Check: Insufficient balance. Available: ₹${availableBalance}, Requested: ₹${requestedAmountFloat}`);
      return;
    } else {
      console.log(`✅ Amount Check: Sufficient balance for ₹${requestedAmountFloat}`);
    }

    // Check 5: Balance consistency (THIS IS LIKELY THE CULPRIT)
    const expectedBalance = parseFloat(order.amount) - parseFloat(order.instant_paid);
    const balanceDifference = Math.abs(availableBalance - expectedBalance);
    
    console.log('\n🎯 Step 3: Balance Consistency Check (Critical)');
    console.log(`   Available Balance: ₹${availableBalance}`);
    console.log(`   Expected Balance: ₹${expectedBalance} (${order.amount} - ${order.instant_paid})`);
    console.log(`   Difference: ₹${balanceDifference}`);
    console.log(`   Tolerance: ₹0.01`);

    if (balanceDifference > 0.01) {
      console.log(`❌ BALANCE INCONSISTENCY DETECTED!`);
      console.log(`   This would trigger the "Balance inconsistency detected. Please contact support." message`);
      console.log(`   Available: ₹${availableBalance}, Expected: ₹${expectedBalance}`);
      
      // Show what needs to be fixed
      console.log('\n🔧 Fix Required:');
      console.log(`   UPDATE orders SET instant_balance = ${expectedBalance} WHERE id = ${order.id};`);
      
    } else {
      console.log(`✅ Balance Consistency: Within tolerance (difference: ₹${balanceDifference})`);
    }

    // Check all orders for potential issues
    console.log('\n📊 Step 4: Check All Available Orders');
    
    const [allOrders] = await connection.execute(`
      SELECT 
        id, refID, amount, instant_balance, instant_paid,
        (amount - instant_paid) as calculated_balance,
        ABS(instant_balance - (amount - instant_paid)) as discrepancy,
        current_payout_splits, paymentStatus
      FROM orders 
      WHERE is_instant_payout = 1 
      AND paymentStatus = 'unassigned'
      ORDER BY discrepancy DESC
    `);

    console.log('📋 All Available Orders with Balance Analysis:');
    console.table(allOrders.map(o => ({
      id: o.id,
      refID: o.refID.substring(0, 8) + '...',
      amount: o.amount,
      instant_balance: o.instant_balance,
      calculated_balance: o.calculated_balance,
      discrepancy: o.discrepancy,
      splits: o.current_payout_splits,
      status: o.paymentStatus,
      consistent: parseFloat(o.discrepancy) <= 0.01 ? '✅' : '❌'
    })));

    const problematicOrders = allOrders.filter(o => parseFloat(o.discrepancy) > 0.01);
    
    if (problematicOrders.length > 0) {
      console.log(`\n❌ Found ${problematicOrders.length} orders with balance inconsistencies that would trigger validation errors:`);
      problematicOrders.forEach(order => {
        console.log(`   Order ${order.id}: Available ₹${order.instant_balance}, Expected ₹${order.calculated_balance}`);
      });
    } else {
      console.log('\n✅ All orders have consistent balances');
    }

    await connection.end();

    console.log('\n🎯 === DIAGNOSIS ===');
    if (problematicOrders.length > 0) {
      console.log('❌ ISSUE FOUND: Balance inconsistencies in available orders');
      console.log('🔧 SOLUTION: Run the balance fix script to correct these inconsistencies');
      console.log('📝 COMMAND: node test/fix_negative_balances.js');
    } else {
      console.log('✅ No balance inconsistencies found');
      console.log('🤔 If you\'re still getting the error, it might be:');
      console.log('   1. A race condition during order creation');
      console.log('   2. An order that was just modified by another process');
      console.log('   3. A temporary inconsistency that needs refresh');
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkSpecificValidation().catch(console.error);
