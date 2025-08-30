const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config();

async function testPayinMatching() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('🧪 TESTING PAYIN-PAYOUT MATCHING AFTER FIXES\n');

  try {
    // 1. Check current state of available payout orders
    console.log('1. AVAILABLE PAYOUT ORDERS FOR MATCHING:');
    const [payoutOrders] = await connection.execute(`
      SELECT id, refID, amount, instant_balance, paymentStatus, current_payout_splits, vendor
      FROM orders 
      WHERE type='payout' AND is_instant_payout=1 AND paymentStatus='unassigned' AND instant_balance > 0
      ORDER BY instant_balance DESC LIMIT 5
    `);
    console.table(payoutOrders);

    if (payoutOrders.length === 0) {
      console.log('❌ No payout orders available for testing');
      await connection.end();
      return;
    }

    // 2. Check available payin orders
    console.log('\n2. AVAILABLE PAYIN ORDERS FOR MATCHING:');
    const [payinOrders] = await connection.execute(`
      SELECT id, refID, amount, paymentStatus, vendor, customerMobile
      FROM orders 
      WHERE type='payin' AND paymentStatus='unassigned' AND vendor='gocomart'
      ORDER BY amount ASC LIMIT 5
    `);
    console.table(payinOrders);

    if (payinOrders.length === 0) {
      console.log('❌ No payin orders available for testing');
      await connection.end();
      return;
    }

    // 3. Test creating a payin order that should match
    const testPayout = payoutOrders[0];
    const testAmount = Math.min(parseFloat(testPayout.instant_balance), 5.00); // Use smaller amount for testing

    console.log(`\n3. TESTING: Creating payin order for amount ${testAmount} to match payout ${testPayout.refID}`);
    
    const payinData = {
      type: 'payin',
      amount: testAmount,
      customerMobile: '9587414520', // Same mobile as existing orders
      customerName: 'Test Customer',
      customerUPIID: 'test@upi',
      merchantOrderID: `TEST-${Date.now()}`,
      mode: 'UPI',
      returnUrl: 'https://example.com/return'
    };

    try {
      const response = await axios.post('http://192.168.15.130:3000/api/v1/orders', payinData, {
        headers: {
          'Content-Type': 'application/json',
          'vendor': 'gocomart'
        }
      });

      console.log('✅ PayIn order created successfully!');
      console.log('Response:', response.data);

      // 4. Check if batch was created
      setTimeout(async () => {
        console.log('\n4. CHECKING BATCH CREATION:');
        const [newBatches] = await connection.execute(`
          SELECT id, uuid, order_id, pay_in_order_id, amount, status, created_at
          FROM instant_payout_batches 
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
          ORDER BY created_at DESC LIMIT 3
        `);
        console.table(newBatches);

        // 5. Check updated balance
        console.log('\n5. CHECKING UPDATED PAYOUT BALANCE:');
        const [updatedPayout] = await connection.execute(`
          SELECT id, refID, amount, instant_balance, current_payout_splits
          FROM orders 
          WHERE id = ?
        `, [testPayout.id]);
        console.table(updatedPayout);

        const balanceChange = parseFloat(testPayout.instant_balance) - parseFloat(updatedPayout[0].instant_balance);
        console.log(`\n💰 Balance changed by: ${balanceChange} (Expected: ${testAmount})`);
        
        if (Math.abs(balanceChange - testAmount) < 0.01) {
          console.log('✅ BALANCE DECREMENT WORKING CORRECTLY!');
        } else {
          console.log('❌ Balance decrement issue still exists');
        }

        await connection.end();
      }, 2000);

    } catch (error) {
      console.error('❌ Error creating test payin order:', error.response?.data || error.message);
      await connection.end();
    }

  } catch (error) {
    console.error('❌ Test error:', error);
    await connection.end();
  }
}

// Run the test
testPayinMatching().catch(console.error);
