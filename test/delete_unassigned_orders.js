const mysql = require('mysql2/promise');
require('dotenv').config();
const moment = require('moment-timezone');
const fs = require('fs');

/**
 * Delete All Unassigned Orders
 * 
 * This script safely deletes all unassigned orders with proper backup
 */

async function deleteUnassignedOrders() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('🗑️  === DELETE UNASSIGNED ORDERS ===');
    console.log('📅 Timestamp:', moment().tz(process.env.TIMEZONE || 'Asia/Kolkata').format("YYYY-MM-DD HH:mm:ss"));

    // Step 1: Get all unassigned orders for backup
    console.log('\n🔍 Step 1: Finding unassigned orders...');
    const [unassignedOrders] = await connection.execute(`
      SELECT * FROM orders 
      WHERE paymentStatus = 'unassigned'
      ORDER BY createdAt DESC
    `);

    if (unassignedOrders.length === 0) {
      console.log('✅ No unassigned orders found!');
      return;
    }

    console.log(`📊 Found ${unassignedOrders.length} unassigned orders:`);
    console.table(unassignedOrders.map(order => ({
      id: order.id,
      refID: order.refID.substring(0, 12) + '...',
      type: order.type,
      amount: order.amount,
      vendor: order.vendor,
      createdAt: order.createdAt,
      is_instant_payout: order.is_instant_payout
    })));

    // Step 2: Create backup
    console.log('\n💾 Step 2: Creating backup...');
    const backupData = {
      timestamp: moment().tz(process.env.TIMEZONE || 'Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
      total_orders: unassignedOrders.length,
      orders: unassignedOrders
    };

    const backupFilename = `backup_unassigned_orders_${Date.now()}.json`;
    fs.writeFileSync(backupFilename, JSON.stringify(backupData, null, 2));
    console.log(`✅ Backup created: ${backupFilename}`);

    // Step 3: Check for related instant payout batches
    console.log('\n🔍 Step 3: Checking for related instant payout batches...');
    const [relatedBatches] = await connection.execute(`
      SELECT b.*, o.refID as order_refID
      FROM instant_payout_batches b
      JOIN orders o ON (b.order_id = o.id OR b.pay_in_order_id = o.id)
      WHERE o.paymentStatus = 'unassigned'
    `);

    if (relatedBatches.length > 0) {
      console.log(`⚠️  Found ${relatedBatches.length} related instant payout batches:`);
      console.table(relatedBatches.map(batch => ({
        id: batch.id,
        order_id: batch.order_id,
        pay_in_order_id: batch.pay_in_order_id,
        amount: batch.amount,
        status: batch.status
      })));
    }

    // Step 4: Delete with transaction safety
    console.log('\n🗑️  Step 4: Deleting unassigned orders...');
    await connection.beginTransaction();

    try {
      // First delete related instant payout batches
      if (relatedBatches.length > 0) {
        const [deleteBatchesResult] = await connection.execute(`
          DELETE b FROM instant_payout_batches b
          JOIN orders o ON (b.order_id = o.id OR b.pay_in_order_id = o.id)
          WHERE o.paymentStatus = 'unassigned'
        `);
        console.log(`🗑️  Deleted ${deleteBatchesResult.affectedRows} related instant payout batches`);
      }

      // Then delete the unassigned orders
      const [deleteOrdersResult] = await connection.execute(`
        DELETE FROM orders 
        WHERE paymentStatus = 'unassigned'
      `);

      await connection.commit();
      
      console.log(`✅ Successfully deleted ${deleteOrdersResult.affectedRows} unassigned orders`);
      
      // Step 5: Verification
      console.log('\n🔍 Step 5: Verification...');
      const [remainingUnassigned] = await connection.execute(`
        SELECT COUNT(*) as count FROM orders WHERE paymentStatus = 'unassigned'
      `);

      if (remainingUnassigned[0].count === 0) {
        console.log('✅ SUCCESS: All unassigned orders have been deleted!');
      } else {
        console.log(`❌ WARNING: ${remainingUnassigned[0].count} unassigned orders still remain`);
      }

      // Show current order summary
      const [orderSummary] = await connection.execute(`
        SELECT 
          paymentStatus,
          COUNT(*) as count,
          SUM(CASE WHEN type = 'payin' THEN 1 ELSE 0 END) as payin_count,
          SUM(CASE WHEN type = 'payout' THEN 1 ELSE 0 END) as payout_count
        FROM orders 
        GROUP BY paymentStatus
        ORDER BY paymentStatus
      `);

      console.log('\n📊 Current order summary:');
      console.table(orderSummary);

    } catch (error) {
      await connection.rollback();
      console.error('❌ Error during deletion, rolling back:', error);
      throw error;
    }

    const timestamp = moment().tz(process.env.TIMEZONE || 'Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    console.log(`\n🕐 Deletion completed at: ${timestamp}`);
    
  } catch (error) {
    console.error('\n❌ Error during deletion:', error.message);
    throw error;
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the deletion
if (require.main === module) {
  deleteUnassignedOrders().catch(console.error);
}

module.exports = { deleteUnassignedOrders };
