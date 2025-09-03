const mysql = require('mysql2/promise');
require('dotenv').config();

async function testValidatorDirectly() {
  console.log('🧪 === TESTING VALIDATOR DIRECTLY ===\n');
  
  try {
    // First, check available payout orders
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });
    
    console.log('1️⃣ Checking available payout orders...');
    const [orders] = await connection.execute(`
      SELECT id, refID, merchantOrderId, amount, instant_balance, current_payout_splits, 
             paymentStatus, vendor, is_instant_payout, instant_payout_expiry_at,
             TIMESTAMPDIFF(MINUTE, createdAt, NOW()) as age_minutes
      FROM orders 
      WHERE vendor = 'gocomart' 
      AND type = 'payout'
      AND is_instant_payout = 1
      AND paymentStatus = 'unassigned'
      ORDER BY createdAt DESC
      LIMIT 5
    `);
    
    if (orders.length > 0) {
      console.log(`📊 Found ${orders.length} available payout orders:`);
      orders.forEach((order, i) => {
        console.log(`  ${i+1}. ID:${order.id} Amount:₹${order.amount} Balance:₹${order.instant_balance} Splits:${order.current_payout_splits} Expiry:${order.instant_payout_expiry_at || 'NULL'} Age:${order.age_minutes}min`);
      });
    } else {
      console.log('❌ No available payout orders found');
      await connection.end();
      return;
    }
    
    console.log('\n2️⃣ Testing validator with amount 5...');
    
    // Test the validator function directly
    const getEndToEndValidator = require('../helpers/getEndToEndValidator');
    const result = await getEndToEndValidator(5, 'gocomart', '9876543210');
    
    if (result) {
      console.log('\n✅ SUCCESS! Validator found a match:');
      console.log('🆔 Order ID:', result.id);
      console.log('📋 RefID:', result.refID.substring(0,20) + '...');
      console.log('💰 Original Amount:', result.amount);
      console.log('⚡ Available Balance:', result.instant_balance);
      console.log('🔢 Current Splits:', result.current_payout_splits);
      console.log('📊 Status:', result.paymentStatus);
      console.log('⏰ Expiry:', result.instant_payout_expiry_at || 'Not accessed yet');
      
      console.log('\n🎯 This means the validator fix is working!');
      console.log('   The issue was that it was filtering by creation time instead of expiry time.');
      
    } else {
      console.log('\n❌ Validator returned null - still not working');
    }
    
    await connection.end();
    
  } catch (error) {
    console.log('💥 Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

testValidatorDirectly();
