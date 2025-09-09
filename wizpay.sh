#!/usr/bin/env bash
set -euo pipefail

# ---- CONFIG ----
BASE_URL=${BASE_URL:-http://localhost:3000}
VENDOR=${VENDOR:-gocomart}
X_KEY=${X_KEY:-550e8400e29b41d4a716446655440000}
SECRET=${SECRET:-s23e4567e89b12d3a45642661417400s}

# ---- HELPERS ----
hmac() {
  BODY="$1"
  printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64
}

parse_refid() {
  jq -r '.data.refID // .data.refId // .refID // .refId // "__NOREF__"' 
}

# ---- COMMANDS ----
create_payout() {
  AMOUNT="$1"
  UPIID="$2"

  BODY=$(jq -nc \
    --arg amt "$AMOUNT" \
    --arg upi "$UPIID" \
    --arg ts "$(date +%s%3N)" '
    {
      type: "payout",
      payoutType: "instant",
      amount: ($amt|tonumber),
      customerUPIID: $upi,
      mode: "upi",
      returnUrl: "",
      website: "api",
      customerName: "Tester",
      customerIp: "127.0.0.1",
      customerMobile: "9999999999",
      merchantOrderID: ("TEST-" + $ts)
    }'
  )

  HASH=$(hmac "$BODY")

  echo ">>> Sending payout order..."
  RESPONSE=$(curl -sS -X POST "$BASE_URL/api/v1/orders" \
    -H "Content-Type: application/json" \
    -H "vendor: $VENDOR" \
    -H "x-key: $X_KEY" \
    -H "x-hash: $HASH" \
    -d "$BODY")

  echo "$RESPONSE" | jq .
  REFID=$(echo "$RESPONSE" | parse_refid)
  echo ">>> RefID: $REFID"
}

# ---- MAIN ----
if [[ "${1:-}" == "create" ]]; then
  if [[ $# -ne 3 ]]; then
    echo "Usage: $0 create <amount> <upi_id>"
    exit 1
  fi
  create_payout "$2" "$3"
else
  echo "Usage:"
  echo "  $0 create <amount> <upi_id>"
fi
