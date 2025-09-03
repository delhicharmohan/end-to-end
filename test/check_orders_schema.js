const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkOrdersSchema() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('✅ Connected to database successfully\n');

    // Check orders table schema
    console.log('📋 ORDERS TABLE SCHEMA:');
    const [ordersSchema] = await connection.execute(`DESCRIBE orders`);
    console.table(ordersSchema);

    // Check sample instant payout orders
    console.log('\n📊 SAMPLE INSTANT PAYOUT ORDERS:');
    const [sampleOrders] = await connection.execute(`
      SELECT id, refID, type, amount, instant_balance, instant_paid, current_payout_splits, 
             is_instant_payout, payout_type, paymentStatus, vendor, createdAt
      FROM orders 
      WHERE is_instant_payout = 1 
      ORDER BY createdAt DESC 
      LIMIT 5
    `);
    console.table(sampleOrders);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkOrdersSchema().catch(console.error);
