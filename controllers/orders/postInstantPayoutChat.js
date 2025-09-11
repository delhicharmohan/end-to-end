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

    // Resolve order: accept either payout refID or payin refID
    let targetOrder = null;
    let chatRefID = null;
    let orderType = null;

    // Try direct payout refID first
    const [payoutRows] = await pool.query(
      "SELECT * FROM orders WHERE refID = ? AND type = 'payout'",
      [refID]
    );
    if (payoutRows.length) {
      targetOrder = payoutRows[0];
      chatRefID = targetOrder.refID;
      orderType = 'payout';
    } else {
      // Try interpreting refID as a payin refID
      const [payinRows] = await pool.query(
        "SELECT * FROM orders WHERE refID = ? AND type = 'payin'",
        [refID]
      );
      if (payinRows.length) {
        const payinOrder = payinRows[0];
        // For payin orders, find the linked payout via batch
        const [batchLink] = await pool.query(
          `SELECT o.* FROM instant_payout_batches b JOIN orders o ON o.id = b.order_id
           WHERE b.pay_in_order_id = ? ORDER BY b.created_at DESC LIMIT 1`,
          [payinOrder.id]
        );
        if (batchLink.length) {
          // Use the payout order as the primary chat reference
          targetOrder = batchLink[0];
          chatRefID = targetOrder.refID;
          orderType = 'payout';
        } else {
          // No linked payout yet: use payin order but store under its own refID
          targetOrder = payinOrder;
          chatRefID = payinOrder.refID;
          orderType = 'payin';
        }
      } else {
        return res.status(404).json({ success: false, message: "Order not found for chat" });
      }
    }

    // Persist message with proper order reference
    logger.info(`[chat] inserting message for ref=${chatRefID} order_id=${targetOrder.id} type=${orderType}`);
    await pool.query(
      `INSERT INTO instant_payout_chats (order_id, ref_id, sender_type, sender_vendor, message)
       VALUES (?, ?, ?, ?, ?)`,
      [targetOrder.id, chatRefID, senderType, senderVendor, message]
    );

    // Broadcast to room - emit to both payin and payout rooms for cross-page visibility
    try {
      const io = getIO();
      const messagePayload = { refID: chatRefID, senderType, message, ts: Date.now(), nonce: clientNonce || null };
      
      // Always emit to the primary chat room
      io.to(`payin:${chatRefID}`).emit("chat:message", messagePayload);
      logger.info(`[chat] emitted socket chat:message to room payin:${chatRefID}`);
      
      // If this is a payout order, also emit to any linked payin rooms
      if (orderType === 'payout') {
        const [linkedPayins] = await pool.query(
          `SELECT o.refID FROM instant_payout_batches b JOIN orders o ON o.id = b.pay_in_order_id
           WHERE b.order_id = ?`,
          [targetOrder.id]
        );
        linkedPayins.forEach(payin => {
          io.to(`payin:${payin.refID}`).emit("chat:message", messagePayload);
          logger.info(`[chat] emitted socket chat:message to linked payin room payin:${payin.refID}`);
        });
      }
    } catch (e) {
      logger.warn(`[postInstantPayoutChat] socket emit failed: ${e?.message}`);
    }

    // Webhooks to relevant order callbacks
    try {
      const targetCallbackURL = await resolveCallbackURL(targetOrder);
      if (targetCallbackURL) {
        sendGenericCallback({
          ...targetOrder,
          event: 'chat_message',
          payload: { refID: chatRefID, senderType, senderVendor, message }
        }, targetCallbackURL, { event: 'chat_message', refID: chatRefID, senderType, senderVendor, message });
      }
      
      // If this is a payout order, also send webhooks to linked payin orders
      if (orderType === 'payout') {
        const [linkedPayins] = await pool.query(
          `SELECT o.* FROM instant_payout_batches b JOIN orders o ON o.id = b.pay_in_order_id
           WHERE b.order_id = ?`,
          [targetOrder.id]
        );
        for (const payinOrder of linkedPayins) {
          const payinCallbackURL = await resolveCallbackURL(payinOrder);
          if (payinCallbackURL) {
            sendGenericCallback({
              ...payinOrder,
              event: 'chat_message',
              payload: { refID: chatRefID, senderType, senderVendor, message }
            }, payinCallbackURL, { event: 'chat_message', refID: chatRefID, senderType, senderVendor, message });
          }
        }
      } else if (orderType === 'payin') {
        // If this is a payin order, send webhook to linked payout if exists
        const [linkedPayout] = await pool.query(
          `SELECT o.* FROM instant_payout_batches b JOIN orders o ON o.id = b.order_id
           WHERE b.pay_in_order_id = ? ORDER BY b.created_at DESC LIMIT 1`,
          [targetOrder.id]
        );
        if (linkedPayout.length) {
          const payoutOrder = linkedPayout[0];
          const payoutCallbackURL = await resolveCallbackURL(payoutOrder);
          if (payoutCallbackURL) {
            sendGenericCallback({
              ...payoutOrder,
              event: 'chat_message',
              payload: { refID: chatRefID, senderType, senderVendor, message }
            }, payoutCallbackURL, { event: 'chat_message', refID: chatRefID, senderType, senderVendor, message });
          }
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
