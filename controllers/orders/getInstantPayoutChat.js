const poolPromise = require("../../db");
const logger = require("../../logger");

/**
 * Get persistent chat history for a payout order, identified by refID.
 * Security: protect with validateHash (vendor/x-key/x-hash). This returns only messages; no PII.
 * Query params:
 *  - limit: number of messages (default 50, max 200)
 *  - beforeId: paginate by message id (optional)
 */
module.exports = async function getInstantPayoutChat(req, res) {
  try {
    const { refID } = req.params;
    if (!refID) return res.status(400).json({ success: false, message: "Missing refID" });

    const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 200);
    const beforeId = req.query.beforeId ? parseInt(req.query.beforeId, 10) : null;

    const pool = await poolPromise;

    let sql = `
      SELECT id, sender_type, sender_vendor, message, created_at
      FROM instant_payout_chats
      WHERE ref_id = ?
    `;
    const params = [refID];

    if (beforeId) {
      sql += ` AND id < ?`;
      params.push(beforeId);
    }

    sql += ` ORDER BY id DESC LIMIT ?`;
    params.push(limit);

    const [rows] = await pool.query(sql, params);

    // Return in ascending time order for UI convenience
    rows.reverse();

    return res.json({ success: true, data: rows });
  } catch (error) {
    logger.error(`[getInstantPayoutChat] Error: ${error?.message}`);
    return res.status(500).json({ success: false, message: "Failed to fetch chat history" });
  }
};
