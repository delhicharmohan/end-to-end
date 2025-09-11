const socketIO = require("socket.io");
const poolPromise = require("./db");
const logger = require("./logger");
const { resolveCallbackURL, sendGenericCallback } = require("./helpers/utils/callbackHandler");

let io; // Socket.IO instance
const onlineUsers = {};

/**
 * Initialize Socket.IO server
 * @param {Object} server - The HTTP server instance
 * @param {string} path - The path for the Socket.IO server
 */
function initialize(server, path) {
  io = socketIO(server, {
    path,
    cors: {
      origin: [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://192.168.1.54:3000",
        "http://192.168.1.54:8080",
        "https://best-live-404609.uc.r.appspot.com",
        "https://zinggale.com",
        "https://api.wizpayy.com",
        "http://wizpayy.com",
        "http://34.27.183.239:80",
        "https://p2p-instance.de.r.appspot.com",
        "https://20240328t022808-dot-best-live-404609.uc.r.appspot.com",
        "http://localhost:3000",
        "http://localhost:8080"
      ],
      credentials: true,
    },
  });

  io.on("connection", handleConnection);
}

/**
 * Handle new socket connection
 * @param {Object} socket - The connected socket instance
 */
function handleConnection(socket) {
  console.log("New client connected");

  // Handle user joining a channel
  socket.on("joinChannel", async (channel) => {
    if (!onlineUsers[channel]) {
      onlineUsers[channel] = new Set(); // Initialize the channel's user set
    }
    onlineUsers[channel].add(socket.id); // Add the socket ID to the channel's set

    await addToChannel(channel);
    console.log(`=======\n \n \n User joined channel ${channel} Total users: ${onlineUsers[channel].size} \n \n \n========`);

    // Notify all clients in the channel about the updated user count
    io.to(channel).emit("userCountUpdate", onlineUsers[channel].size);
  });

  // Handle user disconnection
  socket.on("disconnect", async () => {
    console.log("Client disconnected");

    // Remove the socket ID from all channels and update the user count
    for (const channel in onlineUsers) {
      if (onlineUsers[channel].has(socket.id)) {
        onlineUsers[channel].delete(socket.id);
        console.log(`======== \n \n \n \n User left channel ${channel}. Total users: ${onlineUsers[channel].size}  \n \n \n \n =========`);
        io.to(channel).emit("userCountUpdate", onlineUsers[channel].size);

        // Update the database after removing the user
        if (onlineUsers[channel].size === 0) {
          await removeFromChannel(channel);
        }
      }
    }
  });

  // Join payin room keyed by payout refID
  socket.on("join-payin-room", async ({ refID }) => {
    try {
      if (!refID) return;
      const pool = await poolPromise;
      let payoutRefID = null;
      let payoutRecord = null;

      // First, see if refID is a payout
      const [payoutRows] = await pool.query(
        "SELECT id, refID, vendor FROM orders WHERE refID = ? AND type = 'payout'",
        [refID]
      );
      if (payoutRows.length) {
        payoutRecord = payoutRows[0];
        payoutRefID = payoutRecord.refID;
      } else {
        // Else, try as payin: find linked payout via latest batch
        const [payinRows] = await pool.query(
          "SELECT id, refID FROM orders WHERE refID = ? AND type = 'payin'",
          [refID]
        );
        if (payinRows.length) {
          const payin = payinRows[0];
          const [linked] = await pool.query(
            `SELECT o.id, o.refID, o.vendor FROM instant_payout_batches b JOIN orders o ON o.id = b.order_id
             WHERE b.pay_in_order_id = ? ORDER BY b.created_at DESC LIMIT 1`,
            [payin.id]
          );
          if (linked.length) {
            payoutRecord = linked[0];
            payoutRefID = payoutRecord.refID;
          }
        }
      }

      // Always join the provided refID room
      socket.join(`payin:${refID}`);
      // Also join the normalized payout room if resolved
      if (payoutRefID && payoutRefID !== refID) {
        socket.join(`payin:${payoutRefID}`);
      }

      // Lookup payout & related payin to compute remaining time and vendors
      const payout = payoutRecord;
      if (!payout) return;

      // Find the most recent linked pending payin (if any) to derive expires_at
      const [linked] = await pool.query(
        `SELECT o.vendor, o.expires_at
         FROM instant_payout_batches b
         JOIN orders o ON o.id = b.pay_in_order_id
         WHERE b.order_id = ? AND b.status = 'pending'
         ORDER BY b.created_at DESC LIMIT 1`,
        [payout.id]
      );

      let remainingSeconds = null;
      let payerVendor = null;
      if (linked.length && linked[0].expires_at) {
        const expiresAt = new Date(linked[0].expires_at).getTime();
        remainingSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        payerVendor = linked[0].vendor;
      }

      // Notify connected parties without exposing cross vendor identities
      if (payerVendor) {
        io.emit(`${payerVendor}-payer-connected`, { refID, remainingSeconds });
      }
      io.emit(`${payout.vendor}-payer-connected`, { refID, remainingSeconds });

      // Send webhook notifications to payout and linked payin callbacks (if any)
      try {
        // webhook to payout order callback
        const payoutCallbackURL = await resolveCallbackURL(payout);
        if (payoutCallbackURL) {
          sendGenericCallback({
            ...payout,
            event: 'payer_connected',
            payload: { refID, remainingSeconds }
          }, payoutCallbackURL, { event: 'payer_connected', refID, remainingSeconds });
        }
        // webhook to payer (linked payin) callback if exists
        if (linked.length) {
          const [payinOrderRows] = await pool.query("SELECT * FROM orders WHERE vendor = ? AND type='payin' AND expires_at IS NOT NULL ORDER BY createdAt DESC LIMIT 1", [payerVendor]);
          if (payinOrderRows.length) {
            const payinOrder = payinOrderRows[0];
            const payinCallbackURL = await resolveCallbackURL(payinOrder);
            if (payinCallbackURL) {
              sendGenericCallback({
                ...payinOrder,
                event: 'payer_connected',
                payload: { refID, remainingSeconds }
              }, payinCallbackURL, { event: 'payer_connected', refID, remainingSeconds });
            }
          }
        }
      } catch (whErr) {
        logger.warn(`[socket] payer_connected webhook failed: ${whErr?.message}`);
      }
    } catch (e) {
      logger.warn(`[socket] join-payin-room failed: ${e?.message}`);
    }
  });

  // Chat join (persistent channel)
  socket.on("chat:join", ({ refID }) => {
    if (!refID) return;
    socket.join(`payin:${refID}`);
  });

  // Handle payee connection notification
  socket.on("payee-connected", async ({ refID, userType, timestamp }) => {
    try {
      if (!refID || !userType) return;
      
      console.log(`[Socket] Payee connected notification for refID: ${refID}, userType: ${userType}`);
      
      const pool = await poolPromise;
      
      // Find the linked payout order for this payin refID
      let targetRefID = refID;
      const [payinRows] = await pool.query(
        "SELECT id, refID FROM orders WHERE refID = ? AND type = 'payin'",
        [refID]
      );
      
      if (payinRows.length) {
        const payin = payinRows[0];
        const [linked] = await pool.query(
          `SELECT o.refID FROM instant_payout_batches b JOIN orders o ON o.id = b.order_id
           WHERE b.pay_in_order_id = ? ORDER BY b.created_at DESC LIMIT 1`,
          [payin.id]
        );
        if (linked.length) {
          targetRefID = linked[0].refID;
        }
      }
      
      // Broadcast to the payout room (withdrawal page)
      io.to(`payin:${targetRefID}`).emit('payee-connected', {
        refID: targetRefID,
        userType,
        timestamp,
        originalRefID: refID
      });
      
      console.log(`[Socket] Broadcasted payee-connected to room payin:${targetRefID}`);
      
    } catch (e) {
      logger.warn(`[socket] payee-connected failed: ${e?.message}`);
    }
  });

  // Chat message persist + broadcast
  socket.on("chat:message", async ({ refID, senderType, senderVendor, message }) => {
    try {
      if (!refID || !message || !senderType) return;
      const pool = await poolPromise;
      // Resolve payout order id for refID
      const [rows] = await pool.query(
        "SELECT id FROM orders WHERE refID = ? AND type = 'payout'",
        [refID]
      );
      if (!rows.length) return;
      const orderId = rows[0].id;
      await pool.query(
        `INSERT INTO instant_payout_chats (order_id, ref_id, sender_type, sender_vendor, message)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, refID, senderType, senderVendor || null, message]
      );
      io.to(`payin:${refID}`).emit("chat:message", { refID, senderType, message, ts: Date.now() });

      // Send webhooks to payout and linked payin callbacks
      try {
        const [payoutOrderRows] = await pool.query("SELECT * FROM orders WHERE refID = ? AND type = 'payout'", [refID]);
        if (payoutOrderRows.length) {
          const payoutOrder = payoutOrderRows[0];
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
        }
      } catch (whErr) {
        logger.warn(`[socket] chat webhook failed: ${whErr?.message}`);
      }
    } catch (e) {
      logger.warn(`[socket] chat:message failed: ${e?.message}`);
    }
  });
}

/**
 * Get the Socket.IO instance
 * @returns {Object} io - The Socket.IO instance
 */
function getIO() {
  if (!io) {
    throw new Error("Socket.IO is not initialized.");
  }
  return io;
}

/**
 * Add a user to the specified channel
 * @param {string} channel - The channel name
 */
async function addToChannel(channel) {
  const pool = await poolPromise;

  const [channelData] = await pool.query(
    "SELECT user_count FROM socket_channels WHERE channel = ?",
    [channel]
  );

  if (channelData.length === 0) {
    // Insert a new channel with user_count = 1
    await pool.query(
      "INSERT INTO socket_channels (channel, user_count) VALUES (?, ?)",
      [channel, 1]
    );
  } else {
    // Increment the user count for the existing channel
    await pool.query(
      "UPDATE socket_channels SET user_count = user_count + 1 WHERE channel = ?",
      [channel]
    );
  }

  return true;
}

/**
 * Remove a user from the specified channel
 * @param {string} channel - The channel name
 */
async function removeFromChannel(channel) {
  const pool = await poolPromise;

  const [channelData] = await pool.query(
    "SELECT user_count FROM socket_channels WHERE channel = ?",
    [channel]
  );

  if (channelData.length === 0) {
    // Channel does not exist, no action needed
    return true;
  }
  
  const userCount = channelData[0].user_count;
  await pool.query(
    "DELETE FROM socket_channels WHERE channel = ?",
    [channel]
  );

  return true;
}

module.exports = {
  initialize,
  getIO,
  onlineUsers,
};
