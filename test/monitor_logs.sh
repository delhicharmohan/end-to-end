#!/bin/bash

echo "=== MONITORING PARTIAL MATCHING LOGS ==="
echo ""
echo "Look for these log patterns when creating payin orders:"
echo ""

echo "1. PARTIAL MATCHING ATTEMPT:"
echo "   'Enhanced validation for amount: X and vendor: Y'"
echo "   'Found X partial amount matches for Y'"
echo ""

echo "2. SUCCESSFUL MATCH:"
echo "   '✅ Found partial match: Order ID with balance X for amount Y'"
echo "   '📦 Creating batch: Amount=X, Payin=Y, Available=Z'"
echo ""

echo "3. FAILED MATCH:"
echo "   '❌ No suitable match found for amount X'"
echo "   '⏳ Order ID has pending batches, skipping for now'"
echo ""

echo "4. BATCH CREATION:"
echo "   'INSERT INTO instant_payout_batches SET ?'"
echo "   'UPDATE orders SET current_payout_splits = current_payout_splits + 1'"
echo ""

echo "To monitor live logs, run:"
echo "tail -f logs/app.log | grep -E '(Enhanced|partial|batch|payout-ffa0b72c|14601|14600)'"
echo ""

echo "Or monitor the console output where you started the server with 'npm start'"
