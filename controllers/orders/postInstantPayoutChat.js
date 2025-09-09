const poolPromise = require("../../db");
const logger = require("../../logger");
const { getIO } = require("../../socket");
const { resolveCallbackURL, sendGenericCallback } = require("../../helpers/utils/callbackHandler");

/**
 * POST /api/v1/orders/:refID/chat
 * Body: { message: string, senderType: 'payer'|'payee'|'admin', senderVendor?: string }
 * Security: validateHash (vendor/x-key/x-hash); vendor is the sender's vendor context
 */
module.exports = async function postInstantPayoutChat(req, res) {
  try {
    const { refID } = req.params; // payout refID
    const { message, senderType, clientNonce } = req.body || {};
    logger.info(`[chat] incoming POST chat-public refID=${refID} senderType=${senderType} hasMessage=${!!message}`);
    const senderVendor = req.body?.senderVendor || req.headers.vendor || null;

    if (!refID || !message || !senderType) {
      return res.status(400).json({ success: false, message: "refID, message, and senderType are required" });
    }

    const pool = await poolPromise;

    // Resolve payout order: accept either payout refID or payin refID
    let payoutOrder = null;
    let payoutRefID = null;

    // Try direct payout refID
    const [payoutRows] = await pool.query(
      "SELECT * FROM orders WHERE refID = ? AND type = 'payout'",
      [refID]
    );
    if (payoutRows.length) {
      payoutOrder = payoutRows[0];
      payoutRefID = payoutOrder.refID;
    } else {
      // Try interpreting refID as a payin refID and map to its payout via latest batch
      const [payinRows] = await pool.query(
        "SELECT * FROM orders WHERE refID = ? AND type = 'payin'",
        [refID]
      );
      if (!payinRows.length) {
        return res.status(404).json({ success: false, message: "Order not found for chat" });
      }
      const payinOrder = payinRows[0];
      const [batchLink] = await pool.query(
        `SELECT o.* FROM instant_payout_batches b JOIN orders o ON o.id = b.order_id
         WHERE b.pay_in_order_id = ? ORDER BY b.created_at DESC LIMIT 1`,
        [payinOrder.id]
      );
      if (batchLink.length) {
        payoutOrder = batchLink[0];
        payoutRefID = payoutOrder.refID;
      } else {
        // No linked payout yet: allow pre-match chat by storing refID-only thread
        payoutOrder = null; // indicates pre-link chat
        payoutRefID = refID; // keep chat scoped to provided refID
      }
    }

    // Persist message
    logger.info(`[chat] inserting message for ref=${payoutRefID} order_id=${payoutOrder ? payoutOrder.id : null}`);
    await pool.query(
      `INSERT INTO instant_payout_chats (order_id, ref_id, sender_type, sender_vendor, message)
       VALUES (?, ?, ?, ?, ?)`,
      [payoutOrder ? payoutOrder.id : null, payoutRefID, senderType, senderVendor, message]
    );

    // Broadcast to room
    try {
      const io = getIO();
      io.to(`payin:${payoutRefID}`).emit("chat:message", { refID: payoutRefID, senderType, message, ts: Date.now(), nonce: clientNonce || null });
      logger.info(`[chat] emitted socket chat:message to room payin:${payoutRefID}`);
    } catch (e) {
      logger.warn(`[postInstantPayoutChat] socket emit failed: ${e?.message}`);
    }

    // Webhooks to payout and linked payin callbacks
    try {
      const payoutCallbackURL = await resolveCallbackURL(payoutOrder);
      if (payoutCallbackURL) {
        sendGenericCallback({
          ...payoutOrder,
          event: 'chat_message',
          payload: { refID, senderType, senderVendor, message }
        }, payoutCallbackURL, { event: 'chat_message', refID, senderType, senderVendor, message });
      }
      // find linked payin via batches (most recent pending)
      const [linkedPayin] = await pool.query(
        `SELECT o.* FROM instant_payout_batches b JOIN orders o ON o.id = b.pay_in_order_id
         WHERE b.order_id = ? ORDER BY b.created_at DESC LIMIT 1`,
        [payoutOrder.id]
      );
      if (linkedPayin.length) {
        const payinOrder = linkedPayin[0];
        const payinCallbackURL = await resolveCallbackURL(payinOrder);
        if (payinCallbackURL) {
          sendGenericCallback({
            ...payinOrder,
            event: 'chat_message',
            payload: { refID, senderType, senderVendor, message }
          }, payinCallbackURL, { event: 'chat_message', refID, senderType, senderVendor, message });
        }
      }
    } catch (whErr) {
      logger.warn(`[postInstantPayoutChat] webhook failed: ${whErr?.message}`);
    }

    return res.json({ success: true });
  } catch (error) {
    logger.error(`[postInstantPayoutChat] Error: ${error?.message}`);
    return res.status(500).json({ success: false, message: "Failed to send chat message" });
  }
}
