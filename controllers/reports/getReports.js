const poolPromise = require("../../db");
const logger = require("../../logger");

const error_500 = {
  success: false,
  status: 500,
  message: "An error occurred while trying to get orders.",
};

/**
 * Build SQL query for getReports by parsing request query.
 * @param {Object} fields
 * @param {string} userRole
 * @returns {
 *      query: String,
 *      data: Array
 * }
 */
function buildQuery(fields, userRole, vendor) {
  const limit = fields.limit || 50;
  delete fields.limit;
  const offset = fields.offset || 0;
  delete fields.offset;

  const allowedFields = [
    "refID",
    "receiptId",
    "customerName",
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

  let query = "SELECT * FROM orders";
  let data = [];
  if (fields) {
    query += " WHERE ";
    Object.keys(fields).forEach((field) => {
      query += `${field} = ? AND `;
      data.push(fields[field]);
    });
    // Remove last AND from query
    query = query.slice(0, -5);
  }
  if (userRole === "user") {
    query += " AND validatorUsername = ?";
    data.push(fields.validatorUsername);
  }
  query += " ORDER BY createdAt DESC LIMIT ? OFFSET ?";
  data = [...data, limit, offset];
  logger.debug(`Query: ${query}`);
  return { query, data };
}

async function getReports(req, res, next) {
  const vendor = req.user.vendor;
  const { query, data, error } = buildQuery(req.query, req.user.role, vendor);
  if (error) {
    return res.status(400).json(error);
  }

  try {
    const pool = await poolPromise;

    const [results] = await pool.query(query, data);
    const [count] = await pool.query("SELECT COUNT(*) AS total FROM orders");

    const total = count[0].total;
    const limit = req.query.limit || 50;
    const offset = req.query.offset || 0;

    return res.json({
      pagination: {
        total: total,
        limit: limit,
        offset: offset,
      },
      data: results,
    });
  } catch (error) {
    logger.error("An error occurred while trying to get orders.");
    logger.debug(error);
    return res.status(500).json(error_500);
  }
}

module.exports = getReports;
