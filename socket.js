const socketIO = require("socket.io");
const poolPromise = require("./db");

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
