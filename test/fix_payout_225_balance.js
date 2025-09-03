const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixPayout225Balance() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('🔧 === FIXING PAYOUT ORDER 225 BALANCE ===');
    
    // Check current state
    const [payout] = await connection.execute(`
      SELECT 
        id, refID, amount, instant_balance, instant_paid, current_payout_splits,
        (amount - instant_paid) as calculated_balance
      FROM orders WHERE id = 225
    `);

    console.log('📊 Current Payout State:', payout[0]);

    // The payout order should have:
    // - amount: 6.00 (original)
    // - instant_paid: 3.00 (what was paid)
    // - instant_balance: 3.00 (what remains) NOT -3.00

    const correctBalance = parseFloat(payout[0].amount) - parseFloat(payout[0].instant_paid);
    console.log(`🔧 Correct balance should be: ${payout[0].amount} - ${payout[0].instant_paid} = ${correctBalance}`);

    await connection.execute(`
      UPDATE orders 
      SET instant_balance = ?
      WHERE id = 225
    `, [correctBalance]);

    console.log('✅ Payout order 225 balance corrected');

    // Verify
    const [verify] = await connection.execute(`
      SELECT id, amount, instant_balance, instant_paid, current_payout_splits
      FROM orders WHERE id = 225
    `);

    console.log('✅ Verified state:', verify[0]);

    await connection.end();

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixPayout225Balance().catch(console.error);
