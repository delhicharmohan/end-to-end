const poolPromise = require('../db');
const moment = require("moment-timezone");

async function debugSpecificOrders() {
  try {
    const pool = await poolPromise;
    
    console.log('=== DEBUGGING SPECIFIC ORDERS ===');
    console.log('');
    
    // Check payout order
    console.log('1. PAYOUT ORDER DETAILS:');
    const [payoutOrders] = await pool.query(
      `SELECT id, refID, type, amount, instant_balance, paymentStatus, current_payout_splits, 
              vendor, is_instant_payout, createdAt 
       FROM orders 
       WHERE refID = ?`,
      ['payout-ffa0b72c-170e-48bf-8877-be76c8f9816c']
    );
    
    if (payoutOrders.length > 0) {
      console.table(payoutOrders);
      const payoutOrder = payoutOrders[0];
      
      // Check if payout is within time window
      const timezone = process.env.TIMEZONE || 'Asia/Kolkata';
      const now = moment().tz(timezone);
      const thirtyMinutesAgo = now.subtract(30, "minutes").format("YYYY-MM-DD HH:mm:ss");
      const payoutCreatedAt = moment(payoutOrder.createdAt).format("YYYY-MM-DD HH:mm:ss");
      
      console.log('');
      console.log('Time Window Check:');
      console.log('Current time:', now.format("YYYY-MM-DD HH:mm:ss"));
      console.log('30 minutes ago:', thirtyMinutesAgo);
      console.log('Payout created:', payoutCreatedAt);
      console.log('Within window?', payoutCreatedAt >= thirtyMinutesAgo ? '✅ YES' : '❌ NO - TOO OLD');
      
      // Check for existing batches
      console.log('');
      console.log('2. EXISTING BATCHES FOR PAYOUT:');
      const [existingBatches] = await pool.query(
        `SELECT id, uuid, pay_in_order_id, amount, status, timeout_flag, is_reassigned, created_at
         FROM instant_payout_batches 
         WHERE order_id = ?`,
        [payoutOrder.id]
      );
      
      if (existingBatches.length > 0) {
        console.table(existingBatches);
        
        // Check if there are pending batches blocking new matches
        const pendingBatches = existingBatches.filter(batch => batch.status === 'pending');
        console.log('');
        console.log('Pending batches blocking new matches:', pendingBatches.length > 0 ? '❌ YES' : '✅ NO');
        if (pendingBatches.length > 0) {
          console.log('Pending batch IDs:', pendingBatches.map(b => b.id).join(', '));
        }
      } else {
        console.log('No existing batches found ✅');
      }
      
    } else {
      console.log('❌ Payout order not found!');
      return;
    }
    
    console.log('');
    console.log('3. PAYIN ORDERS DETAILS:');
    const [payinOrders] = await pool.query(
      `SELECT id, refID, type, amount, paymentStatus, vendor, createdAt 
       FROM orders 
       WHERE id IN (14601, 14600)`,
      []
    );
    
    if (payinOrders.length > 0) {
      console.table(payinOrders);
      
      // Check vendor match
      const payoutVendor = payoutOrders[0].vendor;
      console.log('');
      console.log('Vendor Matching:');
      console.log('Payout vendor:', payoutVendor);
      
      payinOrders.forEach(payin => {
        console.log(`Payin ${payin.id} vendor: ${payin.vendor} - Match: ${payin.vendor === payoutVendor ? '✅' : '❌'}`);
      });
      
    } else {
      console.log('❌ Payin orders not found!');
    }
    
    console.log('');
    console.log('4. BATCHES FOR PAYIN ORDERS:');
    const [payinBatches] = await pool.query(
      `SELECT id, uuid, order_id, pay_in_order_id, amount, status, timeout_flag, is_reassigned, created_at
       FROM instant_payout_batches 
       WHERE pay_in_order_id IN (14601, 14600)`,
      []
    );
    
    if (payinBatches.length > 0) {
      console.table(payinBatches);
    } else {
      console.log('No batches found for payin orders');
    }
    
    console.log('');
    console.log('5. PARTIAL MATCHING SIMULATION:');
    
    if (payoutOrders.length > 0 && payinOrders.length > 0) {
      const payout = payoutOrders[0];
      
      console.log('Simulating partial matching logic:');
      console.log('');
      
      payinOrders.forEach(payin => {
        console.log(`--- Testing Payin ${payin.id} (₹${payin.amount}) ---`);
        console.log('Requirements check:');
        console.log('- Payout is_instant_payout = 1?', payout.is_instant_payout === 1 ? '✅' : '❌');
        console.log('- Payout paymentStatus = "unassigned"?', payout.paymentStatus === 'unassigned' ? '✅' : '❌');
        console.log('- Payout instant_balance >= payin amount?', payout.instant_balance >= payin.amount ? '✅' : '❌');
        console.log('- Vendor match?', payout.vendor === payin.vendor ? '✅' : '❌');
        console.log('- Payout splits <= 4?', payout.current_payout_splits <= 4 ? '✅' : '❌');
        
        const shouldMatch = payout.is_instant_payout === 1 && 
                           payout.paymentStatus === 'unassigned' &&
                           payout.instant_balance >= payin.amount &&
                           payout.vendor === payin.vendor &&
                           payout.current_payout_splits <= 4;
                           
        console.log('Should match?', shouldMatch ? '✅ YES' : '❌ NO');
        
        if (shouldMatch) {
          const batchAmount = Math.min(payin.amount, payout.instant_balance);
          console.log(`Expected batch amount: ₹${batchAmount}`);
          console.log(`Remaining balance after: ₹${payout.instant_balance - batchAmount}`);
        }
        console.log('');
      });
    }
    
    console.log('6. DEBUGGING RECOMMENDATIONS:');
    console.log('');
    
    if (payoutOrders.length > 0) {
      const payout = payoutOrders[0];
      const now = moment().tz(process.env.TIMEZONE || 'Asia/Kolkata');
      const payoutAge = now.diff(moment(payout.createdAt), 'minutes');
      
      if (payoutAge > 30) {
        console.log('❌ ISSUE: Payout order is too old (>30 minutes). Create a new payout order for testing.');
      }
      
      if (payout.instant_balance <= 0) {
        console.log('❌ ISSUE: Payout has no remaining balance. Check if all amount was already processed.');
      }
      
      if (payout.paymentStatus !== 'unassigned') {
        console.log('❌ ISSUE: Payout status is not "unassigned". It should be "unassigned" for matching.');
      }
    }
    
    console.log('');
    console.log('To test partial matching:');
    console.log('1. Create a new payin order with amount ₹3');
    console.log('2. Use the same vendor as the payout order');
    console.log('3. Watch console logs for matching attempts');
    console.log('4. Check if batch is created with correct amount');
    
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugSpecificOrders();
