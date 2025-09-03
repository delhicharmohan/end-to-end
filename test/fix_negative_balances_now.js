const poolPromise = require("../db");

async function fixNegativeBalances() {
  const pool = await poolPromise;
  
  try {
    // Find all orders with negative instant_balance
    const [negativeBalances] = await pool.query(`
      SELECT id, refID, instant_balance, amount, current_payout_splits 
      FROM orders 
      WHERE instant_balance < 0 AND payout_type = 'instant'
      ORDER BY id DESC
    `);
    
    console.log(`Found ${negativeBalances.length} orders with negative instant_balance:`);
    
    for (let order of negativeBalances) {
      console.log(`Order ${order.id}: instant_balance=${order.instant_balance}, amount=${order.amount}, splits=${order.current_payout_splits}`);
      
      // Reset instant_balance to 0 for orders that went negative
      const [updateResult] = await pool.query(`
        UPDATE orders 
        SET instant_balance = 0 
        WHERE id = ? AND instant_balance < 0
      `, [order.id]);
      
      if (updateResult.affectedRows > 0) {
        console.log(`✅ Fixed order ${order.id}: Set instant_balance to 0`);
      }
    }
    
    console.log("\n✅ All negative balances have been fixed!");
    
  } catch (error) {
    console.error("Error fixing negative balances:", error);
  } finally {
    process.exit(0);
  }
}

fixNegativeBalances();
