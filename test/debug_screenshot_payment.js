const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugScreenshotPayment() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('🔍 === DEBUGGING SCREENSHOT PAYMENT ISSUE ===');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('💰 Amount: ₹3');
    console.log('🔢 UTR: 520376037065');

    // Step 1: Find orders with this UTR
    console.log('\n📊 Step 1: Finding Orders with UTR 520376037065');
    
    const [ordersWithUTR] = await connection.execute(`
      SELECT 
        id, refID, type, amount, paymentStatus, transactionID, customerUtr,
        createdAt, updatedAt
      FROM orders 
      WHERE transactionID = ? OR customerUtr = ?
      ORDER BY createdAt DESC
    `, ['520376037065', '520376037065']);

    if (ordersWithUTR.length > 0) {
      console.log(`✅ Found ${ordersWithUTR.length} orders with UTR 520376037065:`);
      console.table(ordersWithUTR);
    } else {
      console.log('❌ No orders found with UTR 520376037065');
    }

    // Step 2: Find recent ₹3 orders
    console.log('\n💰 Step 2: Finding Recent ₹3 Orders');
    
    const [recentOrders] = await connection.execute(`
      SELECT 
        id, refID, type, amount, paymentStatus, transactionID, customerUtr,
        createdAt, updatedAt,
        TIMESTAMPDIFF(MINUTE, createdAt, NOW()) as minutes_ago
      FROM orders 
      WHERE amount = 3.00
      AND createdAt >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
      ORDER BY createdAt DESC
      LIMIT 10
    `);

    console.log(`📋 Found ${recentOrders.length} recent ₹3 orders:`);
    if (recentOrders.length > 0) {
      console.table(recentOrders);
    }

    // Step 3: Check instant payout batches with this UTR
    console.log('\n📦 Step 3: Checking Instant Payout Batches');
    
    const [batchesWithUTR] = await connection.execute(`
      SELECT 
        b.id, b.uuid, b.order_id, b.pay_in_order_id, b.amount, b.status,
        b.utr_no, b.created_at, b.system_confirmed_at, b.completion_method,
        o.refID as payout_ref_id, p.refID as payin_ref_id
      FROM instant_payout_batches b
      LEFT JOIN orders o ON b.order_id = o.id
      LEFT JOIN orders p ON b.pay_in_order_id = p.id
      WHERE b.utr_no = ?
      ORDER BY b.created_at DESC
    `, ['520376037065']);

    if (batchesWithUTR.length > 0) {
      console.log(`✅ Found ${batchesWithUTR.length} batches with UTR 520376037065:`);
      console.table(batchesWithUTR);
    } else {
      console.log('❌ No batches found with UTR 520376037065');
    }

    // Step 4: Check for pending ₹3 payin orders
    console.log('\n⏳ Step 4: Checking Pending ₹3 Payin Orders');
    
    const [pendingPayins] = await connection.execute(`
      SELECT 
        o.id, o.refID, o.amount, o.paymentStatus, o.transactionID, o.customerUtr,
        o.createdAt, o.updatedAt,
        COUNT(b.id) as batch_count,
        GROUP_CONCAT(b.status) as batch_statuses
      FROM orders o
      LEFT JOIN instant_payout_batches b ON o.id = b.pay_in_order_id
      WHERE o.type = 'payin' 
      AND o.amount = 3.00
      AND o.paymentStatus IN ('pending', 'created')
      AND o.createdAt >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
      GROUP BY o.id
      ORDER BY o.createdAt DESC
    `);

    if (pendingPayins.length > 0) {
      console.log(`📋 Found ${pendingPayins.length} pending ₹3 payin orders:`);
      console.table(pendingPayins);
      
      // Check each pending payin for batches
      for (const payin of pendingPayins) {
        console.log(`\n🔬 Analyzing Payin Order ${payin.id} (${payin.refID}):`);
        
        const [batches] = await connection.execute(`
          SELECT 
            id, order_id, amount, status, utr_no, created_at, system_confirmed_at,
            completion_method, confirmed_by
          FROM instant_payout_batches
          WHERE pay_in_order_id = ?
          ORDER BY created_at DESC
        `, [payin.id]);

        if (batches.length > 0) {
          console.log(`   📦 Associated batches:`);
          console.table(batches);
        } else {
          console.log(`   ❌ No associated batches found`);
        }
      }
    } else {
      console.log('✅ No pending ₹3 payin orders found');
    }

    // Step 5: Check upload_screenshot logs or activity
    console.log('\n📸 Step 5: Checking Screenshot Upload Activity');
    
    // Check if there are any orders that might have been processed recently
    const [recentActivity] = await connection.execute(`
      SELECT 
        id, refID, type, amount, paymentStatus, transactionID, customerUtr,
        upload_screenshot, updatedAt,
        TIMESTAMPDIFF(MINUTE, updatedAt, NOW()) as minutes_since_update
      FROM orders 
      WHERE amount = 3.00
      AND updatedAt >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      AND (upload_screenshot IS NOT NULL OR transactionID IS NOT NULL OR customerUtr IS NOT NULL)
      ORDER BY updatedAt DESC
    `);

    if (recentActivity.length > 0) {
      console.log(`📋 Recent activity on ₹3 orders:`);
      console.table(recentActivity);
    } else {
      console.log('ℹ️  No recent screenshot upload activity found');
    }

    // Step 6: Check system logs or completion logs if available
    console.log('\n📝 Step 6: Checking Completion Logs');
    
    try {
      const [completionLogs] = await connection.execute(`
        SELECT 
          id, payin_order_id, completion_method, confirmed_by, transaction_id,
          amount, status, created_at
        FROM completion_logs
        WHERE transaction_id = ? OR amount = 3.00
        ORDER BY created_at DESC
        LIMIT 10
      `, ['520376037065']);

      if (completionLogs.length > 0) {
        console.log(`📋 Found completion logs:`);
        console.table(completionLogs);
      } else {
        console.log('ℹ️  No completion logs found (table might be empty)');
      }
    } catch (error) {
      console.log('ℹ️  Completion logs table not accessible:', error.message);
    }

    await connection.end();

    console.log('\n🎯 === DIAGNOSIS ===');
    console.log('Based on the investigation:');
    
    if (ordersWithUTR.length > 0) {
      console.log('✅ UTR found in system - payment was processed');
      const order = ordersWithUTR[0];
      if (order.paymentStatus === 'success' || order.paymentStatus === 'approved') {
        console.log('✅ Order status shows as completed');
      } else {
        console.log(`❌ Order status is '${order.paymentStatus}' - may need completion`);
      }
    } else if (batchesWithUTR.length > 0) {
      console.log('✅ UTR found in batch system - instant payout was processed');
      const batch = batchesWithUTR[0];
      if (batch.status === 'sys_confirmed') {
        console.log('✅ Batch status shows as confirmed');
      } else {
        console.log(`❌ Batch status is '${batch.status}' - may need attention`);
      }
    } else if (pendingPayins.length > 0) {
      console.log('⏳ Found pending ₹3 payin orders - screenshot may not have been processed correctly');
      console.log('🔧 Recommended action: Check screenshot upload process or manually complete');
    } else {
      console.log('❌ No matching orders found - possible issues:');
      console.log('   1. Screenshot upload failed');
      console.log('   2. UTR extraction failed');
      console.log('   3. Auto-completion system issue');
      console.log('   4. Order was not created properly');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

debugScreenshotPayment().catch(console.error);
