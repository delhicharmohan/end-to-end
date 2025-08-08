const poolPromise = require("../../db");
const logger = require("../../logger");
const moment = require("moment-timezone");

const error_500 = {
  success: false,
  status: 500,
  message: "An error occurred while trying to get orders.",
};

/**
 * Build SQL query for generateReport by parsing request query.
 * @param {Object} fields
 * @returns {
 *      query: String,
 *      data: Array
 * }
 */
function buildQuery(fields, vendor) {

  const tz = process.env.TIMEZONE;

  const startDate = fields.startDate ? `${moment.tz(fields.startDate + " 00:00:00", tz).format("YYYY-MM-DD HH:mm:ss")}` : moment.tz(tz).startOf('day').format("YYYY-MM-DD HH:mm:ss");
  delete fields.startDate;
  const endDate = fields.endDate ? `${moment.tz(fields.endDate + " 23:59:59", tz).format("YYYY-MM-DD HH:mm:ss")}` : moment.tz(tz).endOf('day').format("YYYY-MM-DD HH:mm:ss");
  delete fields.endDate;

  const allowedFields = [
    "refID",
    "receiptId",
    "customerName",
    "vendor",
    "customerIp",
    "customerMobile",
    "customerUPIID",
    "merchantOrderID",
    "amount",
    "type",
    "mode",
    "paymentStatus",
    "validatorUPIID",
    "approvedBy",
    "transactionID",
    "returnUrl",
    "clientName",
    "validatorUsername",
    "createdAt",
    "updatedAt",
  ];
  const invalidFields = Object.keys(fields).filter(
    (field) => !allowedFields.includes(field)
  );
  if (invalidFields.length) {
    logger.error(`Invalid fields: ${invalidFields}`);
    return {
      error: {
        message: "Invalid fields.",
      },
    };
  }

  if (vendor) {
    fields.vendor = vendor;
  }

  const today = moment.tz(tz).startOf('day');
  const newStartDate = moment.tz(startDate, tz).startOf('day');
  const differenceInDays = today.diff(newStartDate, 'days');

  let query = "";

  if (differenceInDays > 7) {
    if (fields.type == 'payin') {
      query =
        "SELECT refID, receiptId, customerName, merchantOrderId, amount, type, mode, paymentStatus, transactionType, automation_type, validatorUPIID, approvedBy, approvedByUsername, transactionID, website, vendor, created_by, createdAt, updatedAt FROM ( SELECT refID, receiptId, customerName, merchantOrderId, amount, type, mode, paymentStatus, transactionType, automation_type, validatorUPIID, approvedBy, approvedByUsername, transactionID, website, vendor, created_by, createdAt, updatedAt FROM orders UNION ALL SELECT refID, receiptId, customerName, merchantOrderId, amount, type, mode, paymentStatus, transactionType, automation_type, validatorUPIID, approvedBy, approvedByUsername, transactionID, website, vendor, created_by, createdAt, updatedAt FROM orders_history ) AS combined_orders";
    } else {
      query =
        "SELECT refID, receiptId, customerName, merchantOrderId, amount, type, mode, paymentStatus, transactionType, automation_type, accountNumber, ifsc, bankName, validatorUPIID, approvedBy, approvedByUsername, transactionID, website, vendor, created_by, createdAt, updatedAt FROM ( SELECT refID, receiptId, customerName, merchantOrderId, amount, type, mode, paymentStatus, transactionType, automation_type, accountNumber, ifsc, bankName, validatorUPIID, approvedBy, approvedByUsername, transactionID, website, vendor, created_by, createdAt, updatedAt FROM orders UNION ALL SELECT refID, receiptId, customerName, merchantOrderId, amount, type, mode, paymentStatus, transactionType, automation_type, accountNumber, ifsc, bankName, validatorUPIID, approvedBy, approvedByUsername, transactionID, website, vendor, created_by, createdAt, updatedAt FROM orders_history ) AS combined_orders";
    }
  } else {
    if (fields.type == 'payin') {
      query =
        "SELECT refID, receiptId, customerName, merchantOrderId, amount, type, mode, paymentStatus, transactionType, automation_type, validatorUPIID, approvedBy, approvedByUsername, transactionID, website, vendor, created_by, createdAt, updatedAt FROM orders";
    } else {
      query =
        "SELECT refID, receiptId, customerName, merchantOrderId, amount, type, mode, paymentStatus, transactionType, automation_type, accountNumber, ifsc, bankName, validatorUPIID, approvedBy, approvedByUsername, transactionID, website, vendor, created_by, createdAt, updatedAt FROM orders";
    }
  }

  let data = [];
  let isRemoveLastQuery;
  if (fields) {
    isRemoveLastQuery = false;
    query += " WHERE ";
    Object.keys(fields).forEach((field) => {
      if (fields[field]) {
        isRemoveLastQuery = true;
        query += `${field} = ? AND `;
        data.push(fields[field]);
      }
    });

    if (isRemoveLastQuery) {
      // Remove last AND from query
      query = query.slice(0, -5);
    } else {
      // Remove last WHERE from query
      query = query.slice(0, -7);
    }
  }

  if (startDate && endDate) {
    if (isRemoveLastQuery) {
      query += ` AND updatedAt BETWEEN ? AND ?`;
    } else {
      query += ` WHERE updatedAt BETWEEN ? AND ?`;
    }
    data.push(startDate);
    data.push(endDate);
  }

  query += " ORDER BY updatedAt DESC";
  logger.debug(`Query: ${query}`);
  return { query, data };
}

async function generateReport(req, res, next) {
  const vendor = req.user.vendor;
  const { query, data, error } = buildQuery(req.body, vendor);
  if (error) {
    return res.status(400).json(error);
  }

  try {
    const pool = await poolPromise;


    const [results] = await pool.query(query, data);
    return res.json({
      data: results,
    });
  } catch (error) {
    logger.error("An error occurred while trying to get orders.");
    logger.debug(error);
    return res.status(500).json(error_500);
  }
}

module.exports = generateReport;
