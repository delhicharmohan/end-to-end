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

async function debugPartialMatchingIssue() {
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

    // 1. Find payout orders with partial completion
    console.log('🔍 FINDING PARTIALLY COMPLETED PAYOUT ORDERS:');
    const [partialPayouts] = await connection.execute(`
      SELECT id, refID, amount, instant_balance, current_payout_splits,
             paymentStatus, vendor, createdAt, is_instant_payout
      FROM orders 
      WHERE type = 'payout' 
      AND paymentStatus = 'unassigned'
      AND instant_balance IS NOT NULL
      AND instant_balance > 0
      AND instant_balance < amount
      ORDER BY createdAt DESC
      LIMIT 10
    `);

    if (partialPayouts.length === 0) {
      console.log('✅ No partially completed payout orders found');
    } else {
      console.log(`Found ${partialPayouts.length} partially completed payout orders:`);
      partialPayouts.forEach(order => {
        const remaining = order.amount - order.instant_balance;
        console.log(`
  📤 PAYOUT: ${order.id}
     Amount: ₹${order.amount}
     Completed: ₹${order.instant_balance}
     Remaining: ₹${remaining}
     Splits: ${order.current_payout_splits}
     Status: ${order.paymentStatus}
     Created: ${order.createdAt}
        `);
      });
    }

    // 2. Find recent payin orders that might match remaining amounts
    console.log('\n🔍 FINDING RECENT PAYIN ORDERS (LAST 1 HOUR):');
    const [recentPayins] = await connection.execute(`
      SELECT id, refID, amount, paymentStatus, vendor, createdAt
      FROM orders 
      WHERE type = 'payin' 
      AND createdAt >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      AND paymentStatus = 'success'
      ORDER BY createdAt DESC
    `);

    if (recentPayins.length === 0) {
      console.log('No recent payin orders found');
    } else {
      console.log(`Found ${recentPayins.length} recent payin orders:`);
      recentPayins.forEach(order => {
        console.log(`
  📥 PAYIN: ${order.id}
     Amount: ₹${order.amount}
     Status: ${order.paymentStatus}
     Created: ${order.createdAt}
        `);
      });
    }

    // 3. Check for potential matches
    console.log('\n🔍 CHECKING FOR POTENTIAL MATCHES:');
    if (partialPayouts.length > 0 && recentPayins.length > 0) {
      for (const payout of partialPayouts) {
        const remaining = payout.amount - payout.instant_balance;
        console.log(`\n📤 Payout ${payout.id} needs ₹${remaining}`);
        
        const matchingPayins = recentPayins.filter(payin => 
          Math.abs(payin.amount - remaining) < 0.01 // Allow small floating point differences
        );
        
        if (matchingPayins.length > 0) {
          console.log('   ✅ Found potential matches:');
          matchingPayins.forEach(payin => {
            console.log(`   📥 Payin ${payin.id} - ₹${payin.amount} (${payin.createdAt})`);
          });
        } else {
          console.log('   ❌ No matching payin orders found');
          console.log('   Available amounts:', recentPayins.map(p => `₹${p.amount}`).join(', '));
        }
      }
    }

    // 4. Check matching logic issues
    console.log('\n🔍 CHECKING COMMON MATCHING ISSUES:');
    
    // Check for orders with same amounts but different statuses
    const [statusIssues] = await connection.execute(`
      SELECT 
        p.id as payout_id, p.amount as payout_amount, p.paymentStatus as payout_status,
        pi.id as payin_id, pi.amount as payin_amount, pi.paymentStatus as payin_status,
        p.createdAt as payout_created, pi.createdAt as payin_created,
        TIMESTAMPDIFF(MINUTE, p.createdAt, pi.createdAt) as time_diff_minutes
      FROM orders p
      JOIN orders pi ON ABS(p.amount - pi.amount) < 0.01
      WHERE p.type = 'payout' 
      AND pi.type = 'payin'
      AND p.paymentStatus = 'unassigned'
      AND pi.paymentStatus = 'success'
      AND p.createdAt >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
      AND pi.createdAt >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
      ORDER BY p.createdAt DESC, pi.createdAt DESC
      LIMIT 10
    `);

    if (statusIssues.length > 0) {
      console.log('Found orders with matching amounts but different statuses:');
      statusIssues.forEach(issue => {
        console.log(`
  🔄 POTENTIAL MATCH:
     Payout: ${issue.payout_id} - ₹${issue.payout_amount} (${issue.payout_status})
     Payin:  ${issue.payin_id} - ₹${issue.payin_amount} (${issue.payin_status})
     Time Diff: ${issue.time_diff_minutes} minutes
        `);
      });
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
debugPartialMatchingIssue().catch(console.error);

