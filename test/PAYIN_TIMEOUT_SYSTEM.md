# Payin Timeout System - Comprehensive Solution

## Problem Statement

When a customer creates a payin request (e.g., ₹300) to match with a payout order (e.g., ₹500), but doesn't respond or complete the payment within a reasonable time, the system needs to:

1. **Timeout the inactive payin order**
2. **Reassign the remaining balance to another customer**
3. **Prevent the payout order from being stuck indefinitely**
4. **Maintain system efficiency and user experience**

## Solution Overview

### 1. Automatic Timeout Detection

**Timeout Duration**: 15 minutes from payin order creation
**Check Frequency**: Every 5 minutes via cron job
**Scope**: Only affects payin orders that are:
- Status: 'pending'
- Part of a batch with payout order
- No customer/admin confirmation received

### 2. Timeout Processing Flow

```
Payin Order Created (₹300)
         ↓
Customer doesn't respond for 15 minutes
         ↓
Cron job detects expired payin order
         ↓
Mark payin order as 'expired'
         ↓
Mark batch as 'expired'
         ↓
Check remaining balance in payout order
         ↓
Find new payin order to match remaining balance
         ↓
Create new batch for new payin order
         ↓
Notify payout customer about reassignment
```

### 3. Key Components

#### A. Payin Timeout Handler (`payinTimeoutHandler.js`)

**Main Functions**:
- `handlePayinTimeout()`: Process timeout for specific payin order
- `findNewPayinMatch()`: Find new payin order for remaining balance
- `checkAndProcessExpiredPayins()`: Cron job function

**Key Features**:
- Automatic reassignment to new customers
- Socket notifications for real-time updates
- Comprehensive error handling
- Detailed logging for debugging

#### B. Cron Job Integration

**Schedule**: Every 5 minutes (`*/5 * * * *`)
**Function**: `checkAndProcessExpiredPayins()`
**Logging**: Detailed logs for monitoring and debugging

#### C. API Endpoints

**Manual Processing**:
- `POST /api/v1/payin-timeout/process/:payinOrderId`
- `POST /api/v1/payin-timeout/check-all`
- `GET /api/v1/payin-timeout/status`

## Implementation Details

### 1. Timeout Detection Logic

```javascript
// Find payin orders that have been pending for too long
const [expiredPayins] = await pool.query(
  `SELECT DISTINCT o.id, o.refID, o.amount, o.vendor, o.createdAt
   FROM orders o
   INNER JOIN instant_payout_batches b ON o.id = b.pay_in_order_id
   WHERE o.type = 'payin' 
     AND o.paymentStatus = 'pending'
     AND o.createdAt <= ?
     AND b.status = 'pending'
     AND b.system_confirmed_at IS NULL
     AND b.confirmed_by_customer_at IS NULL
     AND b.confirmed_by_admin_at IS NULL`,
  [timeoutThreshold]
);
```

### 2. Reassignment Logic

```javascript
// Find new payin order to match with remaining balance
const newPayinMatch = await findNewPayinMatch(remainingBalance, payoutOrder.vendor, payoutOrderId);

if (newPayinMatch) {
  // Create new batch for the new payin order
  const newBatchData = {
    uuid: require("uuid").v4(),
    order_id: payoutOrderId,
    ref_id: payoutOrder.refID,
    amount: Math.min(newPayinMatch.amount, remainingBalance),
    pay_in_order_id: newPayinMatch.id,
    pay_in_ref_id: newPayinMatch.refID,
    status: 'pending',
    vendor: payoutOrder.vendor,
    payment_from: newPayinMatch.customerUPIID,
    payment_to: payoutOrder.customerUPIID,
    created_at: createdAt,
    updated_at: createdAt,
  };
}
```

### 3. Socket Notifications

```javascript
// Emit socket event to notify about reassignment
const io = getIO();
const payoutRoom = `instant-withdraw-${payoutOrder.refID}`;
io.emit(payoutRoom, {
  type: 'reassignment',
  message: `Order reassigned to new customer`,
  remainingBalance: remainingBalance
});
```

## Configuration

### Timeout Settings

```javascript
const timeoutMinutes = 15; // Configurable timeout duration
const cronSchedule = '*/5 * * * *'; // Check every 5 minutes
```

### Database Updates

**Orders Table**:
- `paymentStatus`: 'pending' → 'expired'

**Instant Payout Batches Table**:
- `status`: 'pending' → 'expired'
- `updated_at`: Timestamp of timeout

## Testing Scenarios

### Scenario 1: Basic Timeout
1. Create payout order: ₹500
2. Create payin order: ₹300
3. Wait 15 minutes without customer response
4. Expected: Payin order expires, remaining ₹200 reassigned

### Scenario 2: No New Match Available
1. Create payout order: ₹500
2. Create payin order: ₹300
3. Wait 15 minutes
4. No other payin orders available
5. Expected: Payin order expires, payout waits for new customer

### Scenario 3: Multiple Timeouts
1. Create payout order: ₹1000
2. Create payin order 1: ₹300 (timeout after 15 min)
3. Create payin order 2: ₹400 (timeout after 15 min)
4. Expected: Sequential reassignment with proper balance updates

## Monitoring and Debugging

### Log Messages

**Timeout Detection**:
```
⏰ Checking for expired payin orders before 2024-01-15 10:30:00
⏰ Found 3 expired payin orders
```

**Processing**:
```
⏰ Processing timeout for payin order: 12345
🔄 Processing timeout for batch: uuid-123, Payout Order: 67890
💰 Payout order 67890 has remaining balance: 200
✅ Found new payin match: 12346 for remaining balance 200
✅ Successfully reassigned remaining balance 200 to new payin order 12346
```

**Completion**:
```
✅ Completed processing 2/3 expired payin orders
```

### API Monitoring

**Status Endpoint** (`GET /api/v1/payin-timeout/status`):
```json
{
  "success": true,
  "data": {
    "pendingPayins": 15,
    "expiredPayins": 3,
    "pendingBatches": 8,
    "timeoutThreshold": "2024-01-15 10:30:00",
    "timeoutMinutes": 15
  }
}
```

## Benefits

### 1. System Efficiency
- Prevents payout orders from being stuck indefinitely
- Maintains optimal order matching
- Reduces manual intervention requirements

### 2. User Experience
- Real-time notifications about order status
- Automatic reassignment reduces waiting time
- Clear communication about timeouts

### 3. Business Continuity
- Ensures payout orders are completed
- Maintains system liquidity
- Reduces customer complaints

### 4. Operational Benefits
- Automated timeout handling
- Comprehensive logging for debugging
- Easy monitoring and management

## Future Enhancements

### 1. Dynamic Timeout Duration
- Adjust timeout based on order amount
- Different timeouts for different vendors
- Customer-specific timeout preferences

### 2. Advanced Matching
- Priority-based reassignment
- Customer rating consideration
- Historical success rate analysis

### 3. Notification System
- Email/SMS notifications for timeouts
- Customer dashboard updates
- Admin alert system

### 4. Analytics Dashboard
- Timeout rate monitoring
- Reassignment success metrics
- Performance optimization insights

## Troubleshooting

### Common Issues

1. **Orders not timing out**:
   - Check cron job is running
   - Verify database timestamps
   - Check order status conditions

2. **Reassignment failures**:
   - Verify available payin orders
   - Check vendor matching
   - Review batch creation logic

3. **Socket notifications not working**:
   - Check socket connection
   - Verify room names
   - Review event emission

### Debug Commands

```bash
# Check cron job status
curl -X POST /api/v1/payin-timeout/check-all

# Get system status
curl -X GET /api/v1/payin-timeout/status

# Manually process timeout
curl -X POST /api/v1/payin-timeout/process/12345
```

This comprehensive timeout system ensures that your instant payout flow remains efficient and responsive, preventing orders from getting stuck due to customer inactivity.
