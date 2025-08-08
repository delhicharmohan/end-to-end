const poolPromise = require("../../db");
const moment = require("moment-timezone");

async function userReport(req, res, next) {

  const type = req.query.type;
  const username = req.query.username;
  let selectedDay = req.query.selectedDay;

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

  try {
    const pool = await poolPromise;

    const query = `
    SELECT
      u.*,
      COALESCE(COUNT(CASE WHEN o.paymentStatus = 'pending' AND DATE(o.updatedAt) BETWEEN '${startDate}' AND '${endDate}' THEN 1 END), 0) AS pendingCount,
      COALESCE(SUM(CASE WHEN o.paymentStatus = 'pending' AND DATE(o.updatedAt) BETWEEN '${startDate}' AND '${endDate}' THEN o.amount END), 0) AS pendingAmount,
      COALESCE(COUNT(CASE WHEN o.paymentStatus = 'approved' AND DATE(o.updatedAt) BETWEEN '${startDate}' AND '${endDate}' THEN 1 END), 0) AS approvedCount,
      COALESCE(SUM(CASE WHEN o.paymentStatus = 'approved' AND DATE(o.updatedAt) BETWEEN '${startDate}' AND '${endDate}' THEN o.amount END), 0) AS approvedAmount,
      COALESCE(COUNT(CASE WHEN o.paymentStatus = 'rejected' AND DATE(o.updatedAt) BETWEEN '${startDate}' AND '${endDate}' THEN 1 END), 0) AS rejectedCount,
      COALESCE(SUM(CASE WHEN o.paymentStatus = 'rejected' AND DATE(o.updatedAt) BETWEEN '${startDate}' AND '${endDate}' THEN o.amount END), 0) AS rejectedAmount,
      COALESCE(COUNT(CASE WHEN o.paymentStatus = 'unassigned' AND DATE(o.updatedAt) BETWEEN '${startDate}' AND '${endDate}' THEN 1 END), 0) AS unassignedCount,
      COALESCE(SUM(CASE WHEN o.paymentStatus = 'unassigned' AND DATE(o.updatedAt) BETWEEN '${startDate}' AND '${endDate}' THEN o.amount END), 0) AS unassignedAmount,
      COALESCE(COUNT(CASE WHEN o.paymentStatus = 'expired' AND DATE(o.updatedAt) BETWEEN '${startDate}' AND '${endDate}' THEN 1 END), 0) AS expiredCount,
      COALESCE(SUM(CASE WHEN o.paymentStatus = 'expired' AND DATE(o.updatedAt) BETWEEN '${startDate}' AND '${endDate}' THEN o.amount END), 0) AS expiredAmount
    FROM users u
    LEFT JOIN orders o ON u.username = o.validatorUsername AND o.type = '${type}'
    WHERE
      u.username = '${username}'
    `;

    const [results] = await pool.query(query);

    return res.status(200).json(results[0]);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while trying to access the database.",
    });
  }
}

module.exports = userReport;