const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTableSchema() {
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

    // Check instant_payout_batches table schema
    console.log('📋 INSTANT_PAYOUT_BATCHES TABLE SCHEMA:');
    const [batchSchema] = await connection.execute(`DESCRIBE instant_payout_batches`);
    console.table(batchSchema);

    // Check a few sample records
    console.log('\n📊 SAMPLE INSTANT_PAYOUT_BATCHES RECORDS:');
    const [sampleBatches] = await connection.execute(`
      SELECT * FROM instant_payout_batches 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.table(sampleBatches);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTableSchema().catch(console.error);

