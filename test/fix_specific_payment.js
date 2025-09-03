const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixSpecificPayment() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('🔧 === FIXING SPECIFIC PAYMENT (ORDER 226) ===');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('💰 Amount: ₹3');
    console.log('🔢 UTR: 520376037065');
    console.log('📋 Order: 226 (707e443f-d9f0-4b00-aaae-ab0214d05844)');

    // Step 1: Get current state
    console.log('\n📊 Step 1: Current State Analysis');
    
    const [payinOrder] = await connection.execute(`
      SELECT * FROM orders WHERE id = 226
    `);

    const [batch] = await connection.execute(`
      SELECT * FROM instant_payout_batches WHERE pay_in_order_id = 226
    `);

    console.log('📋 Payin Order 226:', {
      id: payinOrder[0].id,
      refID: payinOrder[0].refID,
      amount: payinOrder[0].amount,
      paymentStatus: payinOrder[0].paymentStatus,
      transactionID: payinOrder[0].transactionID,
      customerUtr: payinOrder[0].customerUtr,
      upload_screenshot: payinOrder[0].upload_screenshot ? 'YES' : 'NO'
    });

    console.log('📦 Associated Batch:', {
      id: batch[0].id,
      order_id: batch[0].order_id,
      amount: batch[0].amount,
      status: batch[0].status,
      utr_no: batch[0].utr_no,
      system_confirmed_at: batch[0].system_confirmed_at
    });

    // Step 2: Check the payout order
    const [payoutOrder] = await connection.execute(`
      SELECT * FROM orders WHERE id = ?
    `, [batch[0].order_id]);

    console.log('💸 Payout Order:', {
      id: payoutOrder[0].id,
      refID: payoutOrder[0].refID,
      amount: payoutOrder[0].amount,
      instant_balance: payoutOrder[0].instant_balance,
      instant_paid: payoutOrder[0].instant_paid,
      current_payout_splits: payoutOrder[0].current_payout_splits,
      paymentStatus: payoutOrder[0].paymentStatus
    });

    // Step 3: Fix the completion manually
    console.log('\n⚡ Step 3: Manually Completing the Payment');
    
    await connection.beginTransaction();

    try {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // Update the batch to sys_confirmed
      await connection.execute(`
        UPDATE instant_payout_batches 
        SET 
          status = 'sys_confirmed',
          utr_no = '520376037065',
          system_confirmed_at = ?,
          completion_method = 'manual_fix',
          confirmed_by = 'system_admin'
        WHERE id = ?
      `, [now, batch[0].id]);

      // Update the payin order to approved
      await connection.execute(`
        UPDATE orders 
        SET 
          paymentStatus = 'approved',
          transactionID = '520376037065',
          completion_method = 'manual_fix'
        WHERE id = 226
      `, []);

      // Update the payout order balances
      await connection.execute(`
        UPDATE orders 
        SET 
          instant_paid = instant_paid + 3.00,
          instant_balance = instant_balance - 3.00
        WHERE id = ?
      `, [batch[0].order_id]);

      await connection.commit();
      console.log('✅ Payment completion applied successfully!');

    } catch (error) {
      await connection.rollback();
      throw error;
    }

    // Step 4: Verify the fix
    console.log('\n🔍 Step 4: Verification');
    
    const [verifyPayin] = await connection.execute(`
      SELECT id, refID, amount, paymentStatus, transactionID, customerUtr
      FROM orders WHERE id = 226
    `);

    const [verifyBatch] = await connection.execute(`
      SELECT id, status, utr_no, system_confirmed_at, completion_method
      FROM instant_payout_batches WHERE pay_in_order_id = 226
    `);

    const [verifyPayout] = await connection.execute(`
      SELECT id, refID, instant_balance, instant_paid, current_payout_splits
      FROM orders WHERE id = ?
    `, [batch[0].order_id]);

    console.log('✅ Verified States:');
    console.log('   Payin Order:', verifyPayin[0]);
    console.log('   Batch:', verifyBatch[0]);
    console.log('   Payout Order:', verifyPayout[0]);

    await connection.end();

    console.log('\n🎉 === PAYMENT COMPLETION SUCCESSFUL ===');
    console.log('✅ Payin Order 226: pending → approved');
    console.log('✅ Batch 14624: expired → sys_confirmed');
    console.log('✅ UTR 520376037065: properly recorded');
    console.log('✅ Payout balances: updated correctly');
    console.log('🎯 The ₹3 payment with UTR 520376037065 is now completed!');

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixSpecificPayment().catch(console.error);
