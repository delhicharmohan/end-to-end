const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixOrder217() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('🔧 Fixing Order 217 balance inconsistency...');
    
    // Check current state
    const [order] = await connection.execute(`
      SELECT id, amount, instant_balance, instant_paid
      FROM orders WHERE id = 217
    `);
    
    console.log('Current state:', order[0]);
    
    // Calculate correct balance
    const correctBalance = parseFloat(order[0].amount) - parseFloat(order[0].instant_paid);
    console.log(`Correct balance should be: ${order[0].amount} - ${order[0].instant_paid} = ${correctBalance}`);
    
    // Update the balance
    await connection.execute(`
      UPDATE orders 
      SET instant_balance = ?
      WHERE id = 217
    `, [correctBalance]);
    
    console.log(`✅ Updated order 217 balance: ${order[0].instant_balance} → ${correctBalance}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixOrder217().catch(console.error);
