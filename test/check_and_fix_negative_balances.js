const poolPromise = require("../db");

async function checkAndFixNegativeBalances() {
  const pool = await poolPromise;
  
  try {
    console.log("🔍 Checking for negative instant_balance records...\n");
    
    // Find all orders with negative instant_balance
    const [negativeBalances] = await pool.query(`
      SELECT id, refID, amount, instant_balance, instant_paid, current_payout_splits, paymentStatus
      FROM orders 
      WHERE instant_balance < 0 AND payout_type = 'instant'
      ORDER BY instant_balance ASC
    `);
    
    console.log(`Found ${negativeBalances.length} orders with negative instant_balance:\n`);
    
    if (negativeBalances.length === 0) {
      console.log("✅ No negative balances found! Database is clean.");
      return;
    }
    
    // Display the problematic records
    console.table(negativeBalances.map(order => ({
      ID: order.id,
      RefID: order.refID.substring(0, 20) + '...',
      Amount: `₹${order.amount}`,
      InstantBalance: `₹${order.instant_balance}`,
      InstantPaid: `₹${order.instant_paid || 0}`,
      Splits: order.current_payout_splits,
      Status: order.paymentStatus
    })));
    
    console.log("\n🔧 Fixing negative balances...\n");
    
    for (let order of negativeBalances) {
      // Calculate correct balance: amount - instant_paid
      const correctBalance = parseFloat(order.amount) - parseFloat(order.instant_paid || 0);
      
      console.log(`Order ${order.id}:`);
      console.log(`  Current: instant_balance=${order.instant_balance}`);
      console.log(`  Correct: amount(${order.amount}) - instant_paid(${order.instant_paid || 0}) = ${correctBalance}`);
      
      // Update to correct balance
      const [updateResult] = await pool.query(`
        UPDATE orders 
        SET instant_balance = ? 
        WHERE id = ?
      `, [correctBalance, order.id]);
      
      if (updateResult.affectedRows > 0) {
        console.log(`  ✅ Fixed: Set instant_balance to ₹${correctBalance}\n`);
      } else {
        console.log(`  ❌ Failed to update order ${order.id}\n`);
      }
    }
    
    // Verify the fix
    const [stillNegative] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE instant_balance < 0 AND payout_type = 'instant'
    `);
    
    if (stillNegative[0].count === 0) {
      console.log("🎉 All negative balances have been successfully fixed!");
    } else {
      console.log(`⚠️  Still ${stillNegative[0].count} negative balances remaining.`);
    }
    
  } catch (error) {
    console.error("❌ Error checking/fixing negative balances:", error);
  } finally {
    process.exit(0);
  }
}

checkAndFixNegativeBalances();
