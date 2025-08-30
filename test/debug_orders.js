const poolPromise = require('../db');

async function checkOrders() {
  try {
    const pool = await poolPromise;
    
    console.log('=== PAYOUT ORDER ===');
    const [payoutOrders] = await pool.query(
      'SELECT id, refID, type, amount, instant_balance, paymentStatus, current_payout_splits, vendor, createdAt FROM orders WHERE refID = ?',
      ['payout-ffa0b72c-170e-48bf-8877-be76c8f9816c']
    );
    console.table(payoutOrders);
    
    console.log('\n=== PAYIN ORDERS ===');
    const [payinOrders] = await pool.query(
      'SELECT id, refID, type, amount, paymentStatus, vendor, createdAt FROM orders WHERE id IN (14601, 14600)',
      []
    );
    console.table(payinOrders);
    
    if (payoutOrders.length > 0) {
      console.log('\n=== INSTANT PAYOUT BATCHES ===');
      const [batches] = await pool.query(
        'SELECT id, uuid, order_id, pay_in_order_id, amount, status, timeout_flag, is_reassigned, created_at FROM instant_payout_batches WHERE order_id = ? OR pay_in_order_id IN (14601, 14600)',
        [payoutOrders[0].id]
      );
      console.table(batches);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkOrders();
