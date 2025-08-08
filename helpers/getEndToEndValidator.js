const poolPromise = require("../db");
const logger = require("../logger");
const { onlineUsers } = require("../socket");
const moment = require("moment-timezone");
const getOrderUsageIndex = require("./orderUsageIndex");

async function getEndToEndValidator(amount, vendor, customerMobile = '') {
  console.log(
    `Starting validation for amount: ${amount} and vendor: ${vendor}`
  );

  try {
    const order = await findIdealOrder(vendor, amount, customerMobile);
    return order || null;
  } catch (error) {
    console.log(`Error in getEndToEndValidator: ${error}`);
    throw error;
  }
}

/**
 * Finds the ideal order based on specified criteria.
 * @param {string} vendor - The vendor identifier.
 * @param {number} amount - The amount to validate.
 * @returns {Object|null} - Returns the ideal order or null if none is found.
 */
async function findIdealOrder(vendor, amount, customerMobile = '') {
  const pool = await poolPromise;
  const now = moment().tz(process.env.TIMEZONE);
  const createdAt = now.format("YYYY-MM-DD HH:mm:ss");
  const fifteenMinutesAgo = now
    .subtract(15, "minutes")
    .format("YYYY-MM-DD HH:mm:ss");

  const thirteenMinutesAgo = now
    .subtract(30, "minutes")
    .format("YYYY-MM-DD HH:mm:ss");

  const limit = 50;
  let offset = 0;
  let foundOrder = null;

  let orderUsageIndex = await getOrderUsageIndex(vendor);

  let isAssignableToNewUser = false;

  console.log(orderUsageIndex);

  let exactQueryParams = [];
  let exactQuery = ` SELECT * FROM orders WHERE `;

  exactQuery += `is_instant_payout = ?`;
  exactQueryParams.push(1);

  exactQuery += ` AND createdAt >= ?
        AND vendor = ?
        AND type = ?
        AND paymentStatus = ?
        AND instant_balance = ?
        AND current_payout_splits <= ?
      ORDER BY current_payout_splits DESC, id ASC, createdAt ASC
      LIMIT ? OFFSET ?`;

  exactQueryParams.push(thirteenMinutesAgo);
  exactQueryParams.push(vendor);
  exactQueryParams.push("payout");
  exactQueryParams.push("unassigned");
  exactQueryParams.push(amount);
  exactQueryParams.push(4);
  exactQueryParams.push(limit);
  exactQueryParams.push(offset);

  const [exactOrders] = await pool.query(exactQuery, exactQueryParams);

  for (let order of exactOrders) {
    let duplicateFound = await checkNoDuplicatePaymentInThisVerifier(order, customerMobile);
    let isActiveUser = await isUserActive(order);
    if (!duplicateFound && isActiveUser) {
      foundOrder = order;
      break;
    }
  }

  if (foundOrder != null) {
    return foundOrder;
  }

  if (orderUsageIndex > 5) {
    isAssignableToNewUser = true;
  } else {
    isAssignableToNewUser = false;
  }

  while (!foundOrder) {
    const query = `
      SELECT * FROM orders
      WHERE is_instant_payout = ?
        AND createdAt >= ?
        AND vendor = ?
        AND type = ?
        AND paymentStatus = ?
        AND instant_balance >= ?
        AND current_payout_splits <= ?
      ORDER BY current_payout_splits DESC, id ASC, createdAt ASC
      LIMIT ? OFFSET ?`;

    const params = [
      1, // is_instant_payout
      fifteenMinutesAgo,
      vendor,
      "payout",
      "unassigned",
      amount,
      4, // Max splits
      limit,
      offset,
    ];

    let [orders] = await pool.query(query, params);

    if (orders.length === 0) break; // Exit if no orders are found

    for (let order of orders) {
      // check if the user has reached more than 3 batches if the user is got 3 orders and order not matching will assign to the next user
      let duplicateFound = await checkNoDuplicatePaymentInThisVerifier(order, customerMobile);
      let isActiveUser = await isUserActive(order);

      if (order.current_payout_splits == 4) {
        // check for the balance
        if (isAssignableToNewUser) {
          continue;
        }
      }

      if (!duplicateFound && isActiveUser) {
        foundOrder = order;
        break;
      }
    }
    offset += limit; // Increase offset for the next batch
  }

  console.log(`Found ideal order: ${foundOrder} `);
  return foundOrder;
}

/**
 * Checks if a user is active in the specified channel.
 * @param {Object} orderData - The order data containing the `refID`.
 * @returns {boolean} - True if the user is active, false otherwise.
 */
async function isUserActive(orderData) {
  const room = `instant-withdraw-${orderData.refID}`;
  const pool = await poolPromise;

  try {
    const [channelData] = await pool.query(
      "SELECT * FROM socket_channels WHERE channel = ?",
      [room]
    );
    return channelData.length > 0;
  } catch (error) {
    logger.error("Error checking user activity:", error);
    return false;
  }
}


async function checkNoDuplicatePaymentInThisVerifier(orderData, customerMobile) {
  const pool = await poolPromise;

  try {
    const [duplicateData] = await pool.query(
      `SELECT * FROM instant_payin_logs WHERE order_id = ? AND customer_mobile = ?`,
      [orderData.id, customerMobile]
    );

    if(duplicateData.length > 0 ) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    logger.error("Error checking user activity:", error);
    return true;
  }
}

module.exports = getEndToEndValidator;
