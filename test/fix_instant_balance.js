const mysql = require('mysql2/promise');
require('dotenv').config();
const moment = require('moment-timezone');

// Preflight helper to validate required environment variables
function validateEnvironmentVariables() {
  const requiredVars = [
    'DB_HOST',
    'DB_PORT', 
    'DB_USER',
    'DB_PASS',
    'DB_NAME'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease set these environment variables and try again.');
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are set');
}

async function fixInstantBalance() {
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
    
    await connection.beginTransaction();
    console.log('🔄 Starting transaction...\n');

    // Get all instant payout orders with their batch data
    const [payoutOrders] = await connection.execute(`
      SELECT o.id, o.refID, o.amount, o.instant_balance, o.instant_paid, o.current_payout_splits,
             (SELECT SUM(amount) FROM instant_payout_batches WHERE order_id = o.id) as total_batched,
             (SELECT SUM(amount) FROM instant_payout_batches WHERE order_id = o.id AND status = 'sys_confirmed') as total_confirmed
      FROM orders o
      WHERE o.is_instant_payout = 1
      ORDER BY o.createdAt DESC
    `);

    console.log('📊 CURRENT STATE:');
    console.table(payoutOrders.map(order => ({
      id: order.id,
      refID: order.refID.substring(0, 12) + '...',
      amount: order.amount,
      instant_balance: order.instant_balance,
      instant_paid: order.instant_paid,
      splits: order.current_payout_splits,
      total_batched: order.total_batched || 0,
      total_confirmed: order.total_confirmed || 0
    })));

    console.log('\n🔧 FIXING INSTANT BALANCES...\n');

    let fixedCount = 0;

    for (const order of payoutOrders) {
      const originalAmount = parseFloat(order.amount);
      const totalBatched = parseFloat(order.total_batched || 0);
      const totalConfirmed = parseFloat(order.total_confirmed || 0);
      
      // Calculate correct instant_balance (remaining amount to be matched)
      const correctBalance = originalAmount - totalBatched;
      
      // Calculate correct instant_paid (amount that has been confirmed)
      const correctPaid = totalConfirmed;

      console.log(`📋 Order ${order.id} (${order.refID.substring(0, 12)}...):`);
      console.log(`   Original Amount: ${originalAmount}`);
      console.log(`   Total Batched: ${totalBatched}`);
      console.log(`   Total Confirmed: ${totalConfirmed}`);
      console.log(`   Current instant_balance: ${order.instant_balance}`);
      console.log(`   Current instant_paid: ${order.instant_paid}`);
      console.log(`   Correct instant_balance: ${correctBalance}`);
      console.log(`   Correct instant_paid: ${correctPaid}`);

      if (parseFloat(order.instant_balance) !== correctBalance || parseFloat(order.instant_paid || 0) !== correctPaid) {
        await connection.execute(`
          UPDATE orders 
          SET instant_balance = ?, instant_paid = ?
          WHERE id = ?
        `, [correctBalance, correctPaid, order.id]);
        
        console.log(`   ✅ FIXED: instant_balance ${order.instant_balance} → ${correctBalance}, instant_paid ${order.instant_paid} → ${correctPaid}`);
        fixedCount++;
      } else {
        console.log(`   ✅ Already correct`);
      }
      console.log('');
    }

    await connection.commit();
    console.log(`🎉 Transaction committed! Fixed ${fixedCount} orders.`);

    // Verify the fix
    console.log('\n🔍 VERIFICATION:');
    const [verifyOrders] = await connection.execute(`
      SELECT o.id, o.refID, o.amount, o.instant_balance, o.instant_paid, o.current_payout_splits,
             (SELECT SUM(amount) FROM instant_payout_batches WHERE order_id = o.id) as total_batched,
             (SELECT SUM(amount) FROM instant_payout_batches WHERE order_id = o.id AND status = 'sys_confirmed') as total_confirmed
      FROM orders o
      WHERE o.is_instant_payout = 1
      ORDER BY o.createdAt DESC
    `);

    console.table(verifyOrders.map(order => ({
      id: order.id,
      refID: order.refID.substring(0, 12) + '...',
      amount: order.amount,
      instant_balance: order.instant_balance,
      instant_paid: order.instant_paid,
      splits: order.current_payout_splits,
      total_batched: order.total_batched || 0,
      total_confirmed: order.total_confirmed || 0
    })));

    const timestamp = moment().tz(process.env.TIMEZONE || 'Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    console.log(`\n🕐 Fix completed at: ${timestamp}`);
    
  } catch (error) {
    console.error('\n❌ Error during fix:', error.message);
    
    if (connection) {
      try {
        await connection.rollback();
        console.log('🔄 Transaction rolled back due to error');
      } catch (rollbackError) {
        console.error('❌ Error during rollback:', rollbackError.message);
      }
    }
    
    throw error;
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the fix
if (require.main === module) {
  fixInstantBalance().catch(console.error);
}

module.exports = { fixInstantBalance };

