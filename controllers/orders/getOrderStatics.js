const poolPromise = require("../../db");
const logger = require("../../logger");
const moment = require("moment-timezone");

async function getOrderStatics(req, res, next) {
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

  let query;
  let data;
  
  if (differenceInDays > 7) {
    data = [startDate, endDate];

    query = `
      SELECT type, paymentStatus, COUNT(*) AS count, SUM(amount) AS total_amount, ROUND(SUM(diffAmount), 2) AS total_diff_amount
      FROM (
        SELECT type, paymentStatus, amount, diffAmount
        FROM orders
        WHERE (type = 'payin' OR type = 'payout') AND is_show = 1 AND updatedAt BETWEEN ? AND ?`;
    
      if (userRole === "user") {
        query += " AND validatorUsername = ?";
        data.push(username);
      }

      if (website) {
        query += " AND website = ?";
        data.push(website);
      }
  
      if (vendor) {
        query += " AND vendor = ?";
        data.push(vendor);
      }
  
      if (selectedVendor) {
        query += " AND vendor = ?";
        data.push(selectedVendor);
      }
  
      if (orderCreator) {
        query += " AND created_by = ?";
        data.push(orderCreator);
      }
     
    data.push(startDate);
    data.push(endDate);

    query += `UNION ALL
        SELECT type, paymentStatus, amount, diffAmount
        FROM orders_history
        WHERE (type = 'payin' OR type = 'payout') AND is_show = 1 AND updatedAt BETWEEN ? AND ?`;

    if (userRole === "user") {
      query += " AND validatorUsername = ?";
      data.push(username);
    }

    if (website) {
      query += " AND website = ?";
      data.push(website);
    }

    if (vendor) {
      query += " AND vendor = ?";
      data.push(vendor);
    }

    if (selectedVendor) {
      query += " AND vendor = ?";
      data.push(selectedVendor);
    }

    if (orderCreator) {
      query += " AND created_by = ?";
      data.push(orderCreator);
    }

    query += `) AS combined_orders`;
    query += " GROUP BY type, paymentStatus";

  } else {
    data = [startDate, endDate];
    query =
      "SELECT type, paymentStatus, COUNT(*) AS count, SUM(amount) AS total_amount, ROUND(SUM(`diffAmount`), 2) AS total_diff_amount FROM orders WHERE (type = 'payin' OR type = 'payout') AND is_show = 1 AND updatedAt BETWEEN ? AND ?";

    if (userRole === "user") {
      query += " AND validatorUsername = ?";
      data.push(username);
    }

    if (website) {
      query += " AND website = ?";
      data.push(website);
    }

    if (vendor) {
      query += " AND vendor = ?";
      data.push(vendor);
    }

    if (selectedVendor) {
      query += " AND vendor = ?";
      data.push(selectedVendor);
    }

    if (orderCreator) {
      query += " AND created_by = ?";
      data.push(orderCreator);
    }

    query += " GROUP BY type, paymentStatus";
  }

  try {
    const pool = await poolPromise;

    const [results] = await pool.query(query, data);

    return res.json({
      data: results,
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

module.exports = getOrderStatics;
