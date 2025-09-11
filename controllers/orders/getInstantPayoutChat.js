const poolPromise = require("../../db");
const logger = require("../../logger");

/**
 * Get persistent chat history for an order, identified by refID.
 * Handles both payin and payout orders with proper cross-linking.
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

    // Determine the correct chat reference ID
    let chatRefID = refID;
    
    // Check if this is a payin order that should reference a payout's chat
    const [payinRows] = await pool.query(
      "SELECT * FROM orders WHERE refID = ? AND type = 'payin'",
      [refID]
    );
    
    if (payinRows.length) {
      // This is a payin order - check if it's linked to a payout
      const payinOrder = payinRows[0];
      const [batchLink] = await pool.query(
        `SELECT o.refID FROM instant_payout_batches b JOIN orders o ON o.id = b.order_id
         WHERE b.pay_in_order_id = ? ORDER BY b.created_at DESC LIMIT 1`,
        [payinOrder.id]
      );
      
      if (batchLink.length) {
        // Use the payout's refID as the chat reference for unified conversation
        chatRefID = batchLink[0].refID;
        logger.info(`[getInstantPayoutChat] Payin ${refID} linked to payout ${chatRefID}, using payout chat`);
      }
      // If no link exists, use the payin's own refID
    }

    let sql = `
      SELECT id, sender_type, sender_vendor, message, created_at
      FROM instant_payout_chats
      WHERE ref_id = ?
    `;
    const params = [chatRefID];

    if (beforeId) {
      sql += ` AND id < ?`;
      params.push(beforeId);
    }

    sql += ` ORDER BY id DESC LIMIT ?`;
    params.push(limit);

    const [rows] = await pool.query(sql, params);

    // Return in ascending time order for UI convenience
    rows.reverse();

    logger.info(`[getInstantPayoutChat] Retrieved ${rows.length} messages for refID=${refID} (chat_ref=${chatRefID})`);
    return res.json({ success: true, data: rows });
  } catch (error) {
    logger.error(`[getInstantPayoutChat] Error: ${error?.message}`);
    return res.status(500).json({ success: false, message: "Failed to fetch chat history" });
  }
};
