const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixStuckPayinOrders() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('🔧 FIXING STUCK PAYIN ORDERS\n');

  try {
    // 1. Find payin orders that are pending but have no associated batches
    console.log('1. Finding stuck payin orders...');
    const [stuckPayins] = await connection.execute(`
      SELECT o.id, o.refID, o.amount, o.paymentStatus, o.vendor, o.createdAt
      FROM orders o
      LEFT JOIN instant_payout_batches b ON o.id = b.pay_in_order_id
      WHERE o.type = 'payin' 
        AND o.paymentStatus = 'pending'
        AND b.pay_in_order_id IS NULL
        AND o.createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY o.createdAt DESC
    `);

    console.log(`Found ${stuckPayins.length} stuck payin orders:`);
    console.table(stuckPayins);

    if (stuckPayins.length === 0) {
      console.log('✅ No stuck payin orders found!');
      await connection.end();
      return;
    }

    // 2. Reset these orders to 'unassigned' so they can be matched again
    console.log('\n2. Resetting stuck payin orders to "unassigned"...');
    
    const payinIds = stuckPayins.map(p => p.id);
    const placeholders = payinIds.map(() => '?').join(',');
    
    const [resetResult] = await connection.execute(`
      UPDATE orders 
      SET paymentStatus = 'unassigned', 
          validatorUsername = '',
          validatorUPIID = '',
          updatedAt = NOW()
      WHERE id IN (${placeholders})
    `, payinIds);

    console.log(`✅ Reset ${resetResult.affectedRows} payin orders to "unassigned"`);

    // 3. Show current state after fix
    console.log('\n3. Current state after fix:');
    const [afterFix] = await connection.execute(`
      SELECT id, refID, amount, paymentStatus, vendor, createdAt
      FROM orders 
      WHERE id IN (${placeholders})
      ORDER BY createdAt DESC
    `, payinIds);
    console.table(afterFix);

    console.log('\n✅ Fix completed! These payin orders can now be matched with payout requests.');

  } catch (error) {
    console.error('❌ Error fixing stuck payin orders:', error);
  } finally {
    await connection.end();
  }
}

// Run the fix
fixStuckPayinOrders().catch(console.error);
