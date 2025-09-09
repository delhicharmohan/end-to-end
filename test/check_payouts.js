const poolPromise = require('./db');

async function checkPayoutStatus() {
  try {
    const pool = await poolPromise;
    
    // Get recent payout orders
    const [payoutOrders] = await pool.query(`
      SELECT 
        id, 
        ref_id, 
        amount, 
        instant_balance, 
        current_payout_splits, 
        paymentStatus, 
        payoutType,
        createdAt,
        merchantOrderID
      FROM orders 
      WHERE payoutType = 'instant' 
      ORDER BY createdAt DESC 
      LIMIT 10
    `);
    
    console.log('\n=== RECENT INSTANT PAYOUT ORDERS ===');
    console.table(payoutOrders);
    
    // Get instant payout batches for these orders
    const [batches] = await pool.query(`
      SELECT 
        ipb.uuid,
        ipb.order_id,
        ipb.payin_order_id,
        ipb.amount,
        ipb.status,
        ipb.createdAt,
        o.ref_id as payout_ref_id,
        po.ref_id as payin_ref_id
      FROM instant_payout_batches ipb
      LEFT JOIN orders o ON ipb.order_id = o.id
      LEFT JOIN orders po ON ipb.payin_order_id = po.id
      ORDER BY ipb.createdAt DESC 
      LIMIT 10
    `);
    
    console.log('\n=== RECENT INSTANT PAYOUT BATCHES ===');
    console.table(batches);
    
    // Check if there are any unmatched payouts
    const [unmatchedPayouts] = await pool.query(`
      SELECT 
        id, 
        ref_id, 
        amount, 
        instant_balance, 
        current_payout_splits,
        paymentStatus
      FROM orders 
      WHERE payoutType = 'instant' 
        AND paymentStatus != 'approved'
        AND instant_balance > 0
      ORDER BY createdAt DESC
    `);
    
    console.log('\n=== UNMATCHED PAYOUTS (Available for matching) ===');
    console.table(unmatchedPayouts);
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking payout status:', error);
    process.exit(1);
  }
}

checkPayoutStatus();
