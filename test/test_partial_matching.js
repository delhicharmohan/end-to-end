// Test partial matching logic without database connection
console.log('=== PARTIAL MATCHING ANALYSIS ===');
console.log('');

console.log('Your Current Scenario:');
console.log('- Payout: payout-ffa0b72c-170e-48bf-8877-be76c8f9816c (₹5, status: unassigned)');
console.log('- Payin #14601: ₹3');
console.log('- Payin #14600: ₹4');
console.log('');

console.log('=== POTENTIAL ISSUES TO CHECK ===');
console.log('');

console.log('1. TIME WINDOW ISSUE:');
console.log('   - Payout orders are only eligible for 30 minutes after creation');
console.log('   - Check: Is your payout order created within last 30 minutes?');
console.log('   - If older than 30 minutes, create a new payout order for testing');
console.log('');

console.log('2. VENDOR MISMATCH:');
console.log('   - Both payout and payin must have EXACT same vendor');
console.log('   - Check: Do all orders have the same vendor string?');
console.log('   - Common issue: Case sensitivity or extra spaces');
console.log('');

console.log('3. EXISTING PENDING BATCHES:');
console.log('   - If payout has pending batches, new matching is blocked');
console.log('   - Check: Are there any pending batches for this payout?');
console.log('   - Solution: Clear/expire pending batches first');
console.log('');

console.log('4. PAYIN ORDER STATUS:');
console.log('   - Payin orders should be "unassigned" for matching');
console.log('   - Check: What is the current status of payin orders?');
console.log('   - If "pending", they might already be in a batch');
console.log('');

console.log('5. BALANCE CALCULATION:');
console.log('   - instant_balance should be > 0 for matching');
console.log('   - Check: What is current instant_balance of payout?');
console.log('   - Should be ₹5 if no batches created yet');
console.log('');

console.log('=== DEBUGGING STEPS ===');
console.log('');

console.log('Step 1: Check the server console logs');
console.log('When you create a payin order, look for these messages:');
console.log('- "Enhanced validation for amount: 3 and vendor: [vendor]"');
console.log('- "Found X partial amount matches for 3"');
console.log('- "✅ Found partial match" OR "❌ No suitable match found"');
console.log('');

console.log('Step 2: Manual test with new orders');
console.log('1. Create a new payout order for ₹5');
console.log('2. Immediately create a payin order for ₹3 with same vendor');
console.log('3. Watch console for matching logs');
console.log('4. Check if batch is created');
console.log('');

console.log('Step 3: Check database directly');
console.log('Run these queries in your database:');
console.log('');
console.log('-- Check payout order state');
console.log('SELECT id, refID, amount, instant_balance, paymentStatus, vendor, current_payout_splits, createdAt');
console.log('FROM orders WHERE refID = "payout-ffa0b72c-170e-48bf-8877-be76c8f9816c";');
console.log('');
console.log('-- Check payin orders state');
console.log('SELECT id, amount, paymentStatus, vendor, createdAt FROM orders WHERE id IN (14601, 14600);');
console.log('');
console.log('-- Check existing batches');
console.log('SELECT * FROM instant_payout_batches WHERE order_id = (');
console.log('  SELECT id FROM orders WHERE refID = "payout-ffa0b72c-170e-48bf-8877-be76c8f9816c"');
console.log(') OR pay_in_order_id IN (14601, 14600);');
console.log('');

console.log('=== MOST LIKELY CAUSES ===');
console.log('');
console.log('1. ⏰ TIME WINDOW: Payout order is older than 30 minutes');
console.log('2. 🏷️  VENDOR MISMATCH: Different vendor strings between payout and payin');
console.log('3. 🔄 PENDING BATCHES: Existing pending batches blocking new matches');
console.log('4. 📊 WRONG STATUS: Payin orders are not in "unassigned" status');
console.log('5. 💰 ZERO BALANCE: Payout instant_balance is 0 (already fully processed)');
console.log('');

console.log('=== QUICK TEST ===');
console.log('');
console.log('Create a new test scenario:');
console.log('1. Create new payout order: ₹10');
console.log('2. Create new payin order: ₹6 (same vendor)');
console.log('3. Should create batch for ₹6, remaining ₹4');
console.log('4. Create another payin: ₹3');
console.log('5. Should create batch for ₹3, remaining ₹1');
console.log('');

console.log('Monitor the console output during this test for matching logs.');
