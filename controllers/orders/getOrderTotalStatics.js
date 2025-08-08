const poolPromise = require("../../db");
const logger = require("../../logger");
const moment = require("moment-timezone");

async function getOrderTotalStatics(req, res, next) {
  var userRole = req.user.role;
  var username = req.user.username;
  var vendor = req.user.vendor;

  let selectedDay = req.query.selectedDay;
  let website = req.query.website;
  let selectedVendor = req.query.vendor;
  let orderCreator = req.query.orderCreator;

  const tz = process.env.TIMEZONE;
  let startDate;
  let endDate;
  let queryStartDate;

  if (selectedDay === "today") {
    queryStartDate = moment.tz(tz).startOf('day').format("YYYY-MM-DD");
    startDate = moment.tz(tz).startOf('day').format("YYYY-MM-DD HH:mm:ss");
    endDate = moment.tz(tz).endOf('day').format("YYYY-MM-DD HH:mm:ss");
  } else if (selectedDay === "yesterday") {
    queryStartDate = moment.tz(tz).subtract(1, "days").startOf('day').format("YYYY-MM-DD");
    startDate = moment.tz(tz).subtract(1, "days").startOf('day').format("YYYY-MM-DD HH:mm:ss");
    endDate = moment.tz(tz).subtract(1, "days").endOf('day').format("YYYY-MM-DD HH:mm:ss");
  } else {
    queryStartDate = req.query.startDate;
    startDate = moment.tz(req.query.startDate + " 00:00:00", tz).format("YYYY-MM-DD HH:mm:ss");
    endDate = moment.tz(req.query.endDate + " 23:59:59", tz).format("YYYY-MM-DD HH:mm:ss");
  }
  
  const today = moment.tz(tz).startOf('day');
  const newStartDate = moment.tz(queryStartDate, tz).startOf('day');
  const differenceInDays = today.diff(newStartDate, 'days');

  let payInCommissionQuery;
  let payInCommissionQueryData;
  let payOutCommissionQuery;
  let payOutCommissionQueryData;
  
  if (differenceInDays > 7) {
    // payInCommissionQuery start
    payInCommissionQueryData = [startDate, endDate];
    payInCommissionQuery = `
      SELECT validatorUsername, SUM(amount) AS total_payin
      FROM (
        SELECT validatorUsername, amount
        FROM orders
        WHERE type = 'payin' AND paymentStatus = 'approved' AND is_show = 1 AND updatedAt BETWEEN ? AND ?`;
    
      if (userRole === "user") {
        payInCommissionQuery += " AND validatorUsername = ?";
        payInCommissionQueryData.push(username);
      }

      if (website) {
        payInCommissionQuery += " AND website = ?";
        payInCommissionQueryData.push(website);
      }
  
      if (vendor) {
        payInCommissionQuery += " AND vendor = ?";
        payInCommissionQueryData.push(vendor);
      }
  
      if (selectedVendor) {
        payInCommissionQuery += " AND vendor = ?";
        payInCommissionQueryData.push(selectedVendor);
      }
  
      if (orderCreator) {
        payInCommissionQuery += " AND created_by = ?";
        payInCommissionQueryData.push(orderCreator);
      }
     
    payInCommissionQueryData.push(startDate);
    payInCommissionQueryData.push(endDate);

    payInCommissionQuery += `UNION ALL
        SELECT validatorUsername, amount
        FROM orders_history
        WHERE type = 'payin' AND paymentStatus = 'approved' AND is_show = 1 AND updatedAt BETWEEN ? AND ?`;

    if (userRole === "user") {
      payInCommissionQuery += " AND validatorUsername = ?";
      payInCommissionQueryData.push(username);
    }

    if (website) {
      payInCommissionQuery += " AND website = ?";
      payInCommissionQueryData.push(website);
    }

    if (vendor) {
      payInCommissionQuery += " AND vendor = ?";
      payInCommissionQueryData.push(vendor);
    }

    if (selectedVendor) {
      payInCommissionQuery += " AND vendor = ?";
      payInCommissionQueryData.push(selectedVendor);
    }

    if (orderCreator) {
      payInCommissionQuery += " AND created_by = ?";
      payInCommissionQueryData.push(orderCreator);
    }

    payInCommissionQuery += `) AS combined_orders`;
    payInCommissionQuery += " GROUP BY validatorUsername";
    // payInCommissionQuery end

    // payOutCommissionQuery start
    payOutCommissionQueryData = [startDate, endDate];
    payOutCommissionQuery = `
      SELECT validatorUsername, SUM(amount) AS total_payout
      FROM (
        SELECT validatorUsername, amount
        FROM orders
        WHERE type = 'payout' AND paymentStatus = 'approved' AND is_show = 1 AND updatedAt BETWEEN ? AND ?`;
    
      if (userRole === "user") {
        payOutCommissionQuery += " AND validatorUsername = ?";
        payOutCommissionQueryData.push(username);
      }

      if (website) {
        payOutCommissionQuery += " AND website = ?";
        payOutCommissionQueryData.push(website);
      }
  
      if (vendor) {
        payOutCommissionQuery += " AND vendor = ?";
        payOutCommissionQueryData.push(vendor);
      }
  
      if (selectedVendor) {
        payOutCommissionQuery += " AND vendor = ?";
        payOutCommissionQueryData.push(selectedVendor);
      }
  
      if (orderCreator) {
        payOutCommissionQuery += " AND created_by = ?";
        payOutCommissionQueryData.push(orderCreator);
      }
     
      payOutCommissionQueryData.push(startDate);
      payOutCommissionQueryData.push(endDate);

    payOutCommissionQuery += `UNION ALL
        SELECT validatorUsername, amount
        FROM orders_history
        WHERE type = 'payout' AND paymentStatus = 'approved' AND is_show = 1 AND updatedAt BETWEEN ? AND ?`;

    if (userRole === "user") {
      payOutCommissionQuery += " AND validatorUsername = ?";
      payOutCommissionQueryData.push(username);
    }

    if (website) {
      payOutCommissionQuery += " AND website = ?";
      payOutCommissionQueryData.push(website);
    }

    if (vendor) {
      payOutCommissionQuery += " AND vendor = ?";
      payOutCommissionQueryData.push(vendor);
    }

    if (selectedVendor) {
      payOutCommissionQuery += " AND vendor = ?";
      payOutCommissionQueryData.push(selectedVendor);
    }

    if (orderCreator) {
      payOutCommissionQuery += " AND created_by = ?";
      payOutCommissionQueryData.push(orderCreator);
    }

    payOutCommissionQuery += `) AS combined_orders`;
    payOutCommissionQuery += " GROUP BY validatorUsername";
    // payOutCommissionQuery end

  } else {
    // payInCommissionQuery start
    payInCommissionQueryData = [startDate, endDate];
    payInCommissionQuery =
      "SELECT validatorUsername, SUM(amount) AS total_payin FROM orders WHERE type = 'payin' AND paymentStatus = 'approved' AND is_show = 1 AND updatedAt BETWEEN ? AND ?";

    if (userRole === "user") {
      payInCommissionQuery += " AND validatorUsername = ?";
      payInCommissionQueryData.push(username);
    }

    if (website) {
      payInCommissionQuery += " AND website = ?";
      payInCommissionQueryData.push(website);
    }

    if (vendor) {
      payInCommissionQuery += " AND vendor = ?";
      payInCommissionQueryData.push(vendor);
    }

    if (selectedVendor) {
      payInCommissionQuery += " AND vendor = ?";
      payInCommissionQueryData.push(selectedVendor);
    }

    if (orderCreator) {
      payInCommissionQuery += " AND created_by = ?";
      payInCommissionQueryData.push(orderCreator);
    }

    payInCommissionQuery += " GROUP BY validatorUsername";
    // payInCommissionQuery end

    // payOutCommissionQuery start
    payOutCommissionQueryData = [startDate, endDate];
    payOutCommissionQuery =
      "SELECT validatorUsername, SUM(amount) AS total_payout FROM orders WHERE type = 'payout' AND paymentStatus = 'approved' AND is_show = 1 AND updatedAt BETWEEN ? AND ?";

    if (userRole === "user") {
      payOutCommissionQuery += " AND validatorUsername = ?";
      payOutCommissionQueryData.push(username);
    }

    if (website) {
      payOutCommissionQuery += " AND website = ?";
      payOutCommissionQueryData.push(website);
    }

    if (vendor) {
      payOutCommissionQuery += " AND vendor = ?";
      payOutCommissionQueryData.push(vendor);
    }

    if (selectedVendor) {
      payOutCommissionQuery += " AND vendor = ?";
      payOutCommissionQueryData.push(selectedVendor);
    }

    if (orderCreator) {
      payOutCommissionQuery += " AND created_by = ?";
      payOutCommissionQueryData.push(orderCreator);
    }

    payOutCommissionQuery += " GROUP BY validatorUsername";
    // payOutCommissionQuery end
  }

  try {

    let payInCommissionAmount = 0;
    let payOutCommissionAmount = 0;

    const pool = await poolPromise;

    const [payInByUser] = await pool.query(payInCommissionQuery, payInCommissionQueryData);
    const payInUsers = payInByUser.map(entry => entry.validatorUsername);
    const payInUsersusernamesString = payInUsers.map(username => `'${username}'`).join(',');

    if (payInUsersusernamesString) {
      const payInCommissionByUserQuery = `SELECT username, payInCommission FROM users WHERE username IN (${payInUsersusernamesString})`;
      const [payIncommissionByUser] = await pool.query(payInCommissionByUserQuery);
      payInCommissionAmount = getTotalCommission('payin', payInByUser, payIncommissionByUser);
    }

    const [payOutByUser] = await pool.query(payOutCommissionQuery, payOutCommissionQueryData);
    const payOutUsers = payOutByUser.map(entry => entry.validatorUsername);
    const payOutUsersusernamesString = payOutUsers.map(username => `'${username}'`).join(',');

    if (payOutUsersusernamesString) {
      const payOutCommissionByUserQuery = `SELECT username, payOutCommission FROM users WHERE username IN (${payOutUsersusernamesString})`;
      const [payOutcommissionByUser] = await pool.query(payOutCommissionByUserQuery);
      payOutCommissionAmount = getTotalCommission('payout', payOutByUser, payOutcommissionByUser);
    }

    return res.json({
      data: {
        payInCommissionAmount: payInCommissionAmount,
        payOutCommissionAmount: payOutCommissionAmount,
      },
    });
  } catch (error) {
    console.log(error);
    logger.error(`A Database error occurred while trying to get orders. error: ${error}`);
    logger.debug(error);
    return res
      .status(500)
      .json({ message: `An error occurred while trying to get orders. error: ${error}` });
  }
}

function getTotalCommission(type, usersList, commissionsList) {
  const commissions = usersList.map(user => {
    // Find commission details for the current user
    const commissionDetails = commissionsList.find(c => c.username === user.validatorUsername);
    if (commissionDetails) {
      if (type === 'payin') {
        // Calculate payIn commission
        return parseFloat(user.total_payin) * (commissionDetails.payInCommission / 100);
      } else if (type === 'payout') {
        // Calculate payOut commission
        return parseFloat(user.total_payout) * (commissionDetails.payOutCommission / 100);
      }
    }
    return 0; // Return 0 if commission details are not found
  });

  // Calculate total commission
  const totalCommission = commissions.reduce((total, commission) => total + commission, 0);

  return totalCommission.toFixed(2);
}

module.exports = getOrderTotalStatics;
