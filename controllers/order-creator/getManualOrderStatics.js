const poolPromise = require("../../db");
const logger = require("../../logger");
const moment = require("moment-timezone");

async function getManualOrderStatics(req, res, next) {
  var userRole = req.user.role;
  var username = req.user.username;
  var vendor = req.user.vendor;

  let selectedDay = req.query.selectedDay;
  let website = req.query.website;
  let selectedVendor = req.query.vendor;

  const tz = process.env.TIMEZONE;
  let startDate;
  let endDate;

  if (selectedDay == "today") {
    startDate = moment.tz(tz).format("YYYY-MM-DD 00:00:00");
    endDate = moment.tz(tz).format("YYYY-MM-DD 23:59:59");
  } else if (selectedDay == "yesterday") {
    startDate = moment.tz(tz).subtract(1, "days").format("YYYY-MM-DD 00:00:00");
    endDate = moment.tz(tz).subtract(1, "days").format("YYYY-MM-DD 23:59:59");
  } else {
    startDate = req.query.startDate + " 00:00:00";
    endDate = req.query.endDate + " 23:59:59";
  }

  let data = ['manual', startDate, endDate];
  let query =
    "SELECT type, paymentStatus, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total_amount, ROUND(SUM(`diffAmount`), 2) AS total_diff_amount FROM orders WHERE (type = 'payin' OR type = 'payout') AND is_show = 1 AND transactionType = ? AND updatedAt BETWEEN ? AND ?";

  if (userRole === "order_creator") {
    query += " AND created_by = ?";
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

  query += " GROUP BY type, paymentStatus";

  try {
    const pool = await poolPromise;

    const [results] = await pool.query(query, data);

    return res.json({
      data: results,
    });
  } catch (error) {
    logger.error("A Database error occurred while trying to get manual orders.");
    return res
      .status(500)
      .json({ message: "An error occurred while trying to get manual orders." });
  }
}

module.exports = getManualOrderStatics;
