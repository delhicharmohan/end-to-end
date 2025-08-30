const moment = require("moment-timezone");

// Mock the database connection to avoid environment issues
console.log('=== DEBUGGING PARTIAL MATCHING ISSUE ===');
console.log('');

console.log('Your Scenario:');
console.log('- Payout Order: payout-ffa0b72c-170e-48bf-8877-be76c8f9816c (₹5)');
console.log('- Payin Order #14601: ₹3');
console.log('- Payin Order #14600: ₹4');
console.log('');

console.log('Expected Behavior:');
console.log('1. Payin #14601 (₹3) → matches payout (₹5) → batch for ₹3, remaining ₹2');
console.log('2. Payin #14600 (₹4) → matches payout (₹2 remaining) → batch for ₹2, remaining ₹0');
console.log('');

console.log('=== POTENTIAL ISSUES TO CHECK ===');
console.log('');

console.log('1. DATABASE COLUMNS MISSING:');
console.log('   - timeout_flag column in instant_payout_batches');
console.log('   - is_reassigned column in instant_payout_batches');
console.log('   Run these SQL commands to add them:');
console.log('   ALTER TABLE instant_payout_batches ADD COLUMN timeout_flag TINYINT(1) DEFAULT 0;');
console.log('   ALTER TABLE instant_payout_batches ADD COLUMN is_reassigned TINYINT(1) DEFAULT 0;');
console.log('');

console.log('2. ORDER STATES TO VERIFY:');
console.log('   - Payout order paymentStatus should be "unassigned"');
console.log('   - Payout order instant_balance should be > 0');
console.log('   - Payin orders paymentStatus should be "pending" or "unassigned"');
console.log('   - Check if there are existing batches blocking the matching');
console.log('');

console.log('3. PARTIAL MATCHING LOGIC:');
console.log('   - findPartialAmountMatch looks for orders with instant_balance >= payin amount');
console.log('   - checkPendingBatches should return false for available orders');
console.log('   - Time window: orders created within last 30 minutes');
console.log('');

console.log('4. BATCH CREATION:');
console.log('   - Math.min(payin_amount, payout_balance) should determine batch amount');
console.log('   - instant_balance should be updated after batch creation');
console.log('');

console.log('=== DEBUGGING STEPS ===');
console.log('');

console.log('Step 1: Check if database columns exist');
console.log('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS');
console.log('WHERE TABLE_NAME = "instant_payout_batches"');
console.log('AND COLUMN_NAME IN ("timeout_flag", "is_reassigned");');
console.log('');

console.log('Step 2: Check current order states');
console.log('SELECT id, refID, type, amount, instant_balance, paymentStatus, current_payout_splits');
console.log('FROM orders WHERE refID = "payout-ffa0b72c-170e-48bf-8877-be76c8f9816c" OR id IN (14601, 14600);');
console.log('');

console.log('Step 3: Check existing batches');
console.log('SELECT * FROM instant_payout_batches');
console.log('WHERE order_id = (SELECT id FROM orders WHERE refID = "payout-ffa0b72c-170e-48bf-8877-be76c8f9816c")');
console.log('OR pay_in_order_id IN (14601, 14600);');
console.log('');

console.log('Step 4: Test partial matching manually');
console.log('- Try creating payin order with ₹3 for same vendor as payout');
console.log('- Check console logs for matching process');
console.log('- Verify batch creation with correct amounts');
console.log('');

console.log('=== COMMON ISSUES & SOLUTIONS ===');
console.log('');

console.log('Issue 1: Orders not matching due to vendor mismatch');
console.log('Solution: Ensure both payin and payout have same vendor');
console.log('');

console.log('Issue 2: Orders not matching due to time window');
console.log('Solution: Check if payout was created within last 30 minutes');
console.log('');

console.log('Issue 3: Existing pending batches blocking new matches');
console.log('Solution: Check and clear any stuck pending batches');
console.log('');

console.log('Issue 4: Database columns missing');
console.log('Solution: Add timeout_flag and is_reassigned columns');
console.log('');

console.log('Issue 5: Balance not updated after batch creation');
console.log('Solution: Verify instant_balance calculation in createOrder.js');
console.log('');

const timezone = process.env.TIMEZONE || 'Asia/Kolkata';
const now = moment().tz(timezone);
const thirtyMinutesAgo = now.subtract(30, "minutes").format("YYYY-MM-DD HH:mm:ss");

console.log('Current time window for matching:');
console.log('Now:', now.format("YYYY-MM-DD HH:mm:ss"));
console.log('30 minutes ago:', thirtyMinutesAgo);
console.log('');

console.log('=== NEXT STEPS ===');
console.log('1. First, add the missing database columns');
console.log('2. Check the current state of your specific orders');
console.log('3. Test the partial matching with a new payin order');
console.log('4. Monitor the console logs during order creation');
