const mysql = require('mysql2/promise');
require('dotenv').config();

async function testInstantPayoutFlow() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  console.log('🧪 === TESTING INSTANT PAYOUT FLOW ===\n');

  try {
    // Step 1: Create a fresh payout order
    console.log('📝 Step 1: Creating fresh payout order...');
    
    const payoutData = {
      refID: 'test-payout-' + Date.now(),
      type: 'payout',
      amount: 100.00,
      customerUPIID: '9876543210@paytm',
      customerName: 'Test Customer',
      customerMobile: '9876543210',
      paymentStatus: 'unassigned',
      vendor: 'testvendor',
      is_instant_payout: 1,
      payout_type: 'instant',
      instant_balance: 100.00,
      current_payout_splits: 0,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    await connection.execute(`
      INSERT INTO orders (refID, type, amount, customerUPIID, customerName, customerMobile, 
                         paymentStatus, vendor, is_instant_payout, payout_type, 
                         instant_balance, current_payout_splits, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      payoutData.refID, payoutData.type, payoutData.amount, payoutData.customerUPIID,
      payoutData.customerName, payoutData.customerMobile, payoutData.paymentStatus,
      payoutData.vendor, payoutData.is_instant_payout, payoutData.payout_type,
      payoutData.instant_balance, payoutData.current_payout_splits,
      payoutData.createdAt, payoutData.updatedAt
    ]);

    console.log(`✅ Created payout order: ${payoutData.refID} (₹${payoutData.amount})`);

    // Step 2: Check if it's available for matching
    console.log('\n📊 Step 2: Checking availability for matching...');
    
    const [availableOrders] = await connection.execute(`
      SELECT id, refID, amount, instant_balance, current_payout_splits, paymentStatus
      FROM orders 
      WHERE is_instant_payout = 1 
      AND paymentStatus = 'unassigned'
      AND instant_balance > 0
      AND current_payout_splits < 5
      AND vendor = 'testvendor'
      ORDER BY createdAt DESC
      LIMIT 5
    `);

    console.log('Available orders for matching:');
    console.table(availableOrders);

    if (availableOrders.length === 0) {
      console.log('❌ No orders available for matching!');
    } else {
      console.log(`✅ ${availableOrders.length} order(s) available for matching`);
    }

    // Step 3: Test the getEndToEndValidator function
    console.log('\n🔍 Step 3: Testing getEndToEndValidator function...');
    
    // Import the function
    const { getEndToEndValidator } = require('../helpers/getEndToEndValidator');
    
    const matchResult = await getEndToEndValidator(50, 'testvendor', '9876543210');
    
    if (matchResult) {
      console.log('✅ Match found:', {
        id: matchResult.id,
        refID: matchResult.refID,
        amount: matchResult.amount,
        instant_balance: matchResult.instant_balance
      });
    } else {
      console.log('❌ No match found via getEndToEndValidator');
    }

    // Step 4: Instructions for manual testing
    console.log('\n📋 Step 4: Manual Testing Instructions:');
    console.log('1. Now create a payin order via API with:');
    console.log('   - Amount: ₹50 or ₹100');
    console.log('   - Vendor: testvendor');
    console.log('   - Customer Mobile: 9876543210');
    console.log('2. Check the logs for instant payout matching');
    console.log('3. The payin should automatically match with the payout order');

  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await connection.end();
  }
}

testInstantPayoutFlow().catch(console.error);
