const mysql = require('mysql2/promise');
const { completePayinMatching } = require('../controllers/orders/completePayinMatching');
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

async function fixSpecificPayinMatching() {
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

    // 1. Find the specific ₹3 payin order (185)
    console.log('🔍 CHECKING PAYIN ORDER 185:');
    const [payinOrder] = await connection.execute(`
      SELECT * FROM orders WHERE id = 185 AND type = 'payin'
    `);

    if (payinOrder.length === 0) {
      console.log('❌ Payin order 185 not found');
      return;
    }

    console.log(`📥 Payin Order 185: ₹${payinOrder[0].amount} - Status: ${payinOrder[0].paymentStatus}`);

    // 2. Check associated batches
    const [batches] = await connection.execute(`
      SELECT * FROM instant_payout_batches 
      WHERE pay_in_order_id = 185
    `);

    console.log(`🎯 Found ${batches.length} batches associated with payin order 185:`);
    batches.forEach(batch => {
      console.log(`   Batch ${batch.id}: ₹${batch.amount} - Status: ${batch.status} - Payout Order: ${batch.order_id}`);
    });

    // 3. First, update the payin order status to 'success' if it's not already
    if (payinOrder[0].paymentStatus !== 'success') {
      console.log('\n🔧 UPDATING PAYIN ORDER STATUS TO SUCCESS...');
      
      const utrNumber = `MANUAL_${Date.now()}`;
      await connection.execute(`
        UPDATE orders 
        SET paymentStatus = 'success', 
            transactionID = ?,
            updatedAt = NOW()
        WHERE id = 185
      `, [utrNumber]);
      
      console.log(`✅ Updated payin order 185 status to 'success' with UTR: ${utrNumber}`);
    }

    // 4. Now complete the matching process
    console.log('\n🔄 COMPLETING PAYIN MATCHING...');
    
    const result = await completePayinMatching(185, `UTR_${Date.now()}`, 'manual_fix');
    
    console.log('\n✅ MATCHING COMPLETION RESULT:');
    console.log(`   - Success: ${result.success}`);
    console.log(`   - Matched Batches: ${result.matchedBatches}`);
    console.log(`   - Transaction ID: ${result.transactionId}`);

    // 5. Verify the results
    console.log('\n🔍 VERIFICATION:');
    
    // Check updated payin order
    const [updatedPayin] = await connection.execute(`
      SELECT * FROM orders WHERE id = 185
    `);
    console.log(`📥 Updated Payin: ₹${updatedPayin[0].amount} - Status: ${updatedPayin[0].paymentStatus} - UTR: ${updatedPayin[0].transactionID}`);

    // Check updated batches
    const [updatedBatches] = await connection.execute(`
      SELECT * FROM instant_payout_batches WHERE pay_in_order_id = 185
    `);
    console.log(`🎯 Updated Batches:`);
    updatedBatches.forEach(batch => {
      console.log(`   Batch ${batch.id}: ₹${batch.amount} - Status: ${batch.status} - UTR: ${batch.utr_no}`);
    });

    // Check payout order balance
    if (updatedBatches.length > 0) {
      const payoutOrderId = updatedBatches[0].order_id;
      const [payoutOrder] = await connection.execute(`
        SELECT id, amount, instant_balance, current_payout_splits 
        FROM orders WHERE id = ?
      `, [payoutOrderId]);
      
      if (payoutOrder.length > 0) {
        console.log(`📤 Payout Order ${payoutOrderId}: Total: ₹${payoutOrder[0].amount}, Balance: ₹${payoutOrder[0].instant_balance}, Splits: ${payoutOrder[0].current_payout_splits}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the fix function
fixSpecificPayinMatching().catch(console.error);

