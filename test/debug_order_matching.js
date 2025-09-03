const mysql = require('mysql2/promise');
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

async function debugOrderMatching() {
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

    // 1. First check the specific orders mentioned
    const payoutId = 'payout-0c1032b2-43c7-4834-8367-c489cc37abed';
    const payinId = 'eac8bef4-1b39-4f54-b762-199e6cea0db9';

    console.log('🔍 CHECKING SPECIFIC ORDERS:');
    
    // Check payout order details
    const [payoutOrder] = await connection.execute(`
      SELECT id, refID, amount, instant_balance, current_payout_splits,
             paymentStatus, vendor, createdAt, is_instant_payout,
             matched_order_id, type, matched_at
      FROM orders 
      WHERE id = ?
    `, [payoutId]);

    if (payoutOrder.length > 0) {
      console.log('\n📤 PAYOUT ORDER DETAILS:');
      console.log(JSON.stringify(payoutOrder[0], null, 2));
    } else {
      console.log(`❌ Payout order ${payoutId} not found`);
    }

    // Check payin order details
    const [payinOrder] = await connection.execute(`
      SELECT id, refID, amount, instant_balance,
             paymentStatus, vendor, createdAt,
             matched_order_id, type, matched_at
      FROM orders 
      WHERE id = ?
    `, [payinId]);

    if (payinOrder.length > 0) {
      console.log('\n📥 PAYIN ORDER DETAILS:');
      console.log(JSON.stringify(payinOrder[0], null, 2));
    } else {
      console.log(`❌ Payin order ${payinId} not found`);
    }

    // 2. Check for any other matching orders with same amount
    console.log('\n🔍 CHECKING OTHER ORDERS WITH SAME AMOUNT:');
    const [matchingOrders] = await connection.execute(`
      SELECT id, refID, amount, type, paymentStatus, 
             createdAt, matched_order_id, matched_at
      FROM orders 
      WHERE amount = 7
      AND createdAt BETWEEN 
        (SELECT createdAt FROM orders WHERE id = ? OR id = ? ORDER BY createdAt ASC LIMIT 1) - INTERVAL 1 HOUR
      AND (SELECT createdAt FROM orders WHERE id = ? OR id = ? ORDER BY createdAt DESC LIMIT 1) + INTERVAL 1 HOUR
      ORDER BY createdAt ASC
    `, [payoutId, payinId, payoutId, payinId]);

    console.log('\n📊 ORDERS WITH AMOUNT 7 AROUND SAME TIME:');
    matchingOrders.forEach(order => {
      console.log(`
  - ID: ${order.id}
    Type: ${order.type}
    Status: ${order.paymentStatus}
    Created: ${order.createdAt}
    Matched With: ${order.matched_order_id || 'none'}
    Matched At: ${order.matched_at || 'none'}
      `);
    });

    // 3. Check matching rules status
    if (payoutOrder.length > 0 && payinOrder.length > 0) {
      console.log('\n🔍 ANALYZING MATCHING ISSUES:');
      
      const issues = [];
      
      // Check timing
      const payoutTime = new Date(payoutOrder[0].createdAt);
      const payinTime = new Date(payinOrder[0].createdAt);
      const timeDiff = Math.abs(payoutTime - payinTime) / 1000 / 60; // in minutes
      
      if (timeDiff > 60) {
        issues.push(`⚠️ Time difference between orders is ${timeDiff.toFixed(1)} minutes (> 60 minutes)`);
      }

      // Check amounts
      if (payoutOrder[0].amount !== payinOrder[0].amount) {
        issues.push('⚠️ Order amounts do not match');
      }

      // Check statuses
      if (payoutOrder[0].paymentStatus !== 'unassigned') {
        issues.push(`⚠️ Payout order status is ${payoutOrder[0].paymentStatus} (not unassigned)`);
      }
      if (payinOrder[0].paymentStatus !== 'success') {
        issues.push(`⚠️ Payin order status is ${payinOrder[0].paymentStatus} (not success)`);
      }

      // Check if already matched
      if (payoutOrder[0].matched_order_id) {
        issues.push(`⚠️ Payout order already matched with: ${payoutOrder[0].matched_order_id}`);
      }
      if (payinOrder[0].matched_order_id) {
        issues.push(`⚠️ Payin order already matched with: ${payinOrder[0].matched_order_id}`);
      }

      // Check instant payout eligibility
      if (payoutOrder[0].is_instant_payout !== 1) {
        issues.push('⚠️ Payout order is not marked for instant payout');
      }

      if (issues.length === 0) {
        console.log('✅ No obvious matching issues found - orders should be eligible for matching');
      } else {
        console.log('Found potential matching issues:');
        issues.forEach(issue => console.log(issue));
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

// Run the debug function
debugOrderMatching().catch(console.error);