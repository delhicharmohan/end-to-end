# Enhanced Timeout System with Payment Verification

## Problem Statement

When a customer timer expires, there are two possible scenarios:
1. **Customer processed the payment** but didn't confirm in time
2. **Customer didn't process the payment** at all

The system needs to distinguish between these scenarios and handle them appropriately.

## Solution Overview

### Enhanced Timeout Flow

```
Timer Expires (15 minutes)
         ↓
Check Payment Status
         ↓
┌─────────────────┬─────────────────┐
│ Payment Found   │ No Payment      │
│ (Processed)     │ (Not Processed) │
└─────────────────┴─────────────────┘
         ↓                    ↓
   Mark as Confirmed    Mark as Expired
         ↓                    ↓
   Process Remaining    Reprocess Amount
         ↓                    ↓
   Update Balance       Find New Customer
```

## Implementation Details

### 1. Payment Verification Function

**Function**: `checkIfPaymentProcessed(payinOrderId, batchId)`

**Checks Multiple Indicators**:
- Batch confirmations (admin/customer/system)
- Payin order status (approved)
- UTR numbers in batch
- Order UTR numbers

```javascript
async function checkIfPaymentProcessed(payinOrderId, batchId) {
  // Check batch confirmations
  const [batchConfirmations] = await pool.query(
    `SELECT confirmed_by_admin_at, confirmed_by_customer_at, system_confirmed_at 
     FROM instant_payout_batches 
     WHERE id = ?`,
    [batchId]
  );

  // Check payin order status
  const [payinOrder] = await pool.query(
    `SELECT paymentStatus, utr_no 
     FROM orders 
     WHERE id = ?`,
    [payinOrderId]
  );

  // Check UTR entries
  const [utrEntries] = await pool.query(
    `SELECT utr_no 
     FROM instant_payout_batches 
     WHERE id = ? AND utr_no IS NOT NULL AND utr_no != ''`,
    [batchId]
  );

  return (batchConfirmations[0]?.confirmed_by_admin_at || 
          batchConfirmations[0]?.confirmed_by_customer_at || 
          batchConfirmations[0]?.system_confirmed_at ||
          payinOrder[0]?.paymentStatus === 'approved' ||
          payinOrder[0]?.utr_no ||
          utrEntries.length > 0);
}
```

### 2. Enhanced Timeout Handler

**Function**: `handlePayinTimeout(payinOrderId)`

**New Logic**:
```javascript
// Check if the customer actually processed the payment
const paymentProcessed = await checkIfPaymentProcessed(payinOrderId, batch.id);

if (paymentProcessed) {
  // Customer processed payment but didn't confirm in time
  console.log(`✅ Customer ${payinOrderId} has already processed the payment, marking as confirmed`);
  
  // Mark as confirmed and process remaining amount
  await updateBatchStatus('confirmed', batch.id);
  await updatePayinOrderStatus('approved', payinOrderId);
  await processRemainingAmountAfterConfirmation(payoutOrderId, batch.amount);
  
} else {
  // Customer didn't process payment at all
  console.log(`❌ Customer ${payinOrderId} has NOT processed the payment, reprocessing the amount`);
  
  // Mark as expired and reprocess amount
  await updateBatchStatus('expired', batch.id);
  await updatePayinOrderStatus('expired', payinOrderId);
  await reprocessExpiredAmount(batch.amount, payoutOrder, batch.id);
}
```

### 3. Payment Confirmation Processing

**Function**: `processRemainingAmountAfterConfirmation(payoutOrderId, confirmedAmount)`

**Purpose**: When payment is confirmed after timeout, process the remaining balance.

```javascript
async function processRemainingAmountAfterConfirmation(payoutOrderId, confirmedAmount) {
  const payoutOrder = await getPayoutOrder(payoutOrderId);
  const remainingBalance = parseFloat(payoutOrder.instant_balance) - parseFloat(confirmedAmount);

  if (remainingBalance > 0) {
    // Update payout order balance
    await updatePayoutOrderBalance(payoutOrderId, remainingBalance);
    
    // Emit socket event for frontend update
    emitBalanceUpdate(payoutOrder.refID, remainingBalance);
  }
}
```

### 4. Amount Reprocessing

**Function**: `reprocessExpiredAmount(expiredAmount, payoutOrder, expiredBatchId)`

**Purpose**: When payment was not processed, find a new customer for the amount.

```javascript
async function reprocessExpiredAmount(expiredAmount, payoutOrder, expiredBatchId) {
  // Find new payin order to match with the expired amount
  const newPayinMatch = await findNewPayinMatch(expiredAmount, payoutOrder.vendor, payoutOrder.id);
  
  if (newPayinMatch) {
    // Create new batch for the new payin order
    const newBatchData = {
      uuid: require("uuid").v4(),
      order_id: payoutOrder.id,
      ref_id: payoutOrder.refID,
      amount: Math.min(newPayinMatch.amount, expiredAmount),
      pay_in_order_id: newPayinMatch.id,
      pay_in_ref_id: newPayinMatch.refID,
      status: 'pending',
      vendor: payoutOrder.vendor,
      payment_from: newPayinMatch.customerUPIID,
      payment_to: payoutOrder.customerUPIID,
      created_at: createdAt,
      updated_at: createdAt,
    };

    await createNewBatch(newBatchData);
    
    // Emit socket event for frontend notification
    emitReprocessingEvent(payoutOrder.refID, expiredAmount, newPayinMatch.id);
  }
}
```

## Frontend Enhancements

### 1. New Notification Types

#### Reprocessing Notification
```html
<div class="reprocessing-notification fixed z-50 text-white rounded-lg p-3 bg-purple-500 shadow-lg">
  <h4>Amount Reprocessed</h4>
  <p>Expired amount ₹300 has been reassigned to a new customer</p>
</div>
```

#### Waiting for Reprocessing Notification
```html
<div class="waiting-reprocessing-notification fixed z-50 text-white rounded-lg p-3 bg-orange-500 shadow-lg">
  <h4>Waiting for New Customer</h4>
  <p>Expired amount ₹300 is waiting for a new customer</p>
</div>
```

### 2. Socket Event Handlers

```javascript
// Handle reprocessing events
handleReprocessingEvent(data) {
  this.reprocessingNotificationTitle = "Amount Reprocessed";
  this.reprocessingNotificationMessage = data.message;
  this.reprocessingNotificationVisible = true;
  
  setTimeout(() => {
    this.dismissReprocessingNotification();
  }, 12000);
}

// Handle waiting for reprocessing events
handleWaitingForReprocessingEvent(data) {
  this.waitingReprocessingNotificationTitle = "Waiting for New Customer";
  this.waitingReprocessingNotificationMessage = data.message;
  this.waitingReprocessingNotificationVisible = true;
  
  setTimeout(() => {
    this.dismissWaitingReprocessingNotification();
  }, 15000);
}
```

## Scenarios and Outcomes

### Scenario 1: Payment Processed but Not Confirmed
```
Customer creates payin order: ₹300
Customer processes payment but doesn't confirm
Timer expires after 15 minutes
System checks: Payment found ✅
Result: Mark as confirmed, process remaining ₹200
```

### Scenario 2: Payment Not Processed
```
Customer creates payin order: ₹300
Customer doesn't process payment
Timer expires after 15 minutes
System checks: No payment found ❌
Result: Mark as expired, reprocess ₹300 with new customer
```

### Scenario 3: Multiple Timeouts
```
Payout order: ₹1000
Payin 1: ₹300 (processed but not confirmed) → Confirmed
Payin 2: ₹400 (not processed) → Reprocessed
Payin 3: ₹300 (not processed) → Reprocessed
Result: Sequential processing with proper balance updates
```

## Benefits

### 1. Accurate Payment Tracking
- Distinguishes between processed and unprocessed payments
- Prevents loss of confirmed payments
- Maintains data integrity

### 2. Improved User Experience
- Real-time notifications for different scenarios
- Clear communication about order status
- Automatic reprocessing of failed amounts

### 3. System Efficiency
- Reduces manual intervention
- Optimizes order matching
- Maintains system liquidity

### 4. Business Continuity
- Ensures no payments are lost
- Maintains order flow
- Reduces customer complaints

## Monitoring and Debugging

### Log Messages

**Payment Found**:
```
✅ Customer 12345 has already processed the payment, marking as confirmed
🔄 Processing remaining amount after confirmation: 200 for payout order 67890
✅ Updated payout order 67890 balance to 200
```

**Payment Not Found**:
```
❌ Customer 12345 has NOT processed the payment, reprocessing the amount
🔄 Reprocessing expired amount: 300 for payout order 67890
✅ Found new payin match: 12346 for expired amount 300
✅ Successfully reprocessed expired amount 300 to new payin order 12346
```

### API Endpoints

**Enhanced Status Check**:
```bash
GET /api/v1/payin-timeout/status
```

**Manual Timeout Processing**:
```bash
POST /api/v1/payin-timeout/process/12345
```

## Configuration

### Timeout Settings
```javascript
const timeoutMinutes = 15; // Payment timeout duration
const cronSchedule = '*/5 * * * *'; // Check frequency
```

### Payment Verification Criteria
- Batch confirmations (admin/customer/system)
- Order status (approved)
- UTR numbers
- Payment timestamps

## Future Enhancements

### 1. Advanced Payment Detection
- Bank API integration for payment verification
- Real-time payment status checking
- Automated UTR validation

### 2. Smart Reprocessing
- Priority-based customer matching
- Historical success rate analysis
- Customer rating consideration

### 3. Enhanced Notifications
- Email/SMS notifications
- Push notifications
- Customer dashboard updates

### 4. Analytics Dashboard
- Payment success rate monitoring
- Timeout pattern analysis
- System performance metrics

This enhanced timeout system ensures that no payments are lost while maintaining system efficiency and providing excellent user experience.
