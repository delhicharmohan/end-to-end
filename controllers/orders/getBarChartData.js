const poolPromise = require("../../db");
const logger = require("../../logger");
const moment = require("moment-timezone");

async function getBarChartData(req, res, next) {
  try {
    var userRole = req.user.role;
    var username = req.user.username;
    var vendor = req.user.vendor;

    let selectedDay = req.query.selectedDay;
    let website = req.query.website;
    let paymentType = req.query.paymentType;
    let selectedVendor = req.query.vendor;
    let orderCreator = req.query.orderCreator;

    const tz = process.env.TIMEZONE;
    let startDate;
    let endDate;

    if (selectedDay == "today") {
      startDate = moment.tz(tz).format("YYYY-MM-DD 00:00:00");
      endDate = moment.tz(tz).format("YYYY-MM-DD 23:59:59");
    } else if (selectedDay == "yesterday") {
      startDate = moment
        .tz(tz)
        .subtract(1, "days")
        .format("YYYY-MM-DD 00:00:00");
      endDate = moment.tz(tz).subtract(1, "days").format("YYYY-MM-DD 23:59:59");
    } else {
      startDate = req.query.startDate + " 00:00:00";
      endDate = req.query.endDate + " 23:59:59";
    }

    let data = [startDate, endDate];
    let query =
      "SELECT HOUR(updatedAt) AS hour, paymentStatus, SUM(amount) AS totalAmount FROM orders WHERE is_show = 1 AND updatedAt BETWEEN ? AND ?";

    if (userRole === "user") {
      query += " AND validatorUsername = ?";
      data.push(username);
    }

    if (paymentType) {
      query += " AND type = ?";
      data.push(paymentType);
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

    query += " GROUP BY hour, paymentStatus ORDER BY hour, paymentStatus";

    const pool = await poolPromise;

    const [results] = await pool.query(query, data);

    return res.json({
      data: results,
    });
  } catch (error) {
    logger.error("An error occurred while trying to get orders.");
    logger.debug(error);
    return res
      .status(500)
      .json({ message: "An error occurred while trying to get orders." });
  }
}

module.exports = getBarChartData;
