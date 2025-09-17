const poolPromise = require("../../db");
const logger = require("../../logger");
const moment = require("moment-timezone");
const { v4: uuidv4 } = require("uuid");
const claimToken = require("../../helpers/utils/claimToken");

/**
 * List anonymized, eligible instant payout orders (amounts only) for cross-vendor matching.
 * Security: validateHash should run before this handler to set req.clientName and validate vendor/x-key/x-hash.
 * Visibility: amounts only; do not expose UPI or origin vendor.
 * 
 * Query Parameters:
 * - returnUrl: Optional URL to redirect customer after successful payment completion
 */
module.exports = async function listInstantPayoutAvailable(req, res) {
  try {
    const vendor = req.headers.vendor; // selecting vendor (authenticated via validateHash)
    if (!vendor) {
      return res.status(400).json({ success: false, message: "Missing vendor header" });
    }

    // Extract returnUrl from query parameters
    const { returnUrl } = req.query;
    
    // Validate returnUrl if provided
    if (returnUrl) {
      try {
        new URL(returnUrl); // Basic URL validation
        if (returnUrl.length > 2048) {
          return res.status(400).json({ success: false, message: 'returnUrl too long (max 2048 characters)' });
        }
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid returnUrl format' });
      }
    }

    const pool = await poolPromise;

    const now = moment().tz(process.env.TIMEZONE);
    const thirtyMinutesAgo = now.clone().subtract(30, "minutes").format("YYYY-MM-DD HH:mm:ss");

    // Select eligible instant payouts (any vendor), anonymized
    const [rows] = await pool.query(
      `
      SELECT refID, amount, COALESCE(instant_balance, amount) AS instant_balance, createdAt
      FROM orders
      WHERE type = 'payout'
        AND (is_instant_payout = 1 OR payout_type = 'instant')
        AND paymentStatus IN ('unassigned','pending')
        AND customerUPIID IS NOT NULL AND customerUPIID <> ''
        AND COALESCE(instant_balance, amount) > 0
        AND createdAt >= ?
      ORDER BY createdAt DESC
      LIMIT 100
      `,
      [thirtyMinutesAgo]
    );

    const host = req.get('host');
    const proto = req.protocol;
    const base = `${proto}://${host}`;

    const nowSec = Math.floor(Date.now() / 1000);
    const ttlSec = 1800; // 30 minutes validity for claim links

    const data = rows.map(r => {
      const amount = parseFloat(r.instant_balance);
      const payload = {
        vendor,
        payoutRefID: r.refID,
        amount,
        iat: nowSec,
        ttl: ttlSec,
        nonce: uuidv4(),
        idempotencyKey: uuidv4(),
        ...(returnUrl && { returnUrl }) // Include returnUrl in token if provided
      };
      const token = claimToken.sign(payload);
      const claimURL = `${base}/api/v1/orders/instant-payout/${r.refID}/claim?token=${encodeURIComponent(token)}`;
      return {
        refID: r.refID,
        amount: parseFloat(r.amount),
        instant_balance: amount,
        claimURL
      };
    });

    // Build a redirect URL to the front-end page that renders this list
    const redirectURL = `${base}/#/instant-payout-market`;

    return res.json({ success: true, data, redirectURL });
  } catch (error) {
    logger.error(`[listInstantPayoutAvailable] Error: ${error?.message}`);
    return res.status(500).json({ success: false, message: "Failed to fetch available instant payouts" });
  }
};
