const poolPromise = require("../../db");
const logger = require("../../logger");
const moment = require("moment-timezone");

const error_500 = {
  success: false,
  status: 500,
  message: "An error occurred while trying to get orders.",
};

/**
 * Build SQL query for getOrders by parsing request query.
 * @param {Object} fields
 * @returns {
 *      query: String,
 *      data: Array
 * }
 */
function buildQuery(fields, vendor) {
  let first = parseInt(fields.first);
  let page = parseInt(fields.page);

  let limit = first || 10;
  let offset = (page - 1) * limit;
  delete fields.first;
  delete fields.page;

  const tz = process.env.TIMEZONE;

  let searchKeyWord = fields.searchKeyWord;
  delete fields.searchKeyWord;
  let advanceSearch = fields.advanceSearch;
  delete fields.advanceSearch;
  let startDate = fields.startDate ? `${moment.tz(fields.startDate + " 00:00:00", tz).format("YYYY-MM-DD HH:mm:ss")}` : moment.tz(tz).startOf('day').format("YYYY-MM-DD HH:mm:ss");
  delete fields.startDate;
  let endDate = fields.endDate ? `${fields.endDate} 23:59:59` : "";
  delete fields.endDate;

  let allowedFields = [
    "refID",
    "receiptId",
    "clientName",
    "customerName",
    "customerIp",
    "customerMobile",
    "customerUPIID",
    "merchantOrderID",
    "amount",
    "mode",
    "paymentStatus",
    "validatorUsername",
    "validatorUPIID",
    "transactionID",
    "createdAt",
    "updatedAt",
  ];

  if (fields.transactionType && fields.transactionType == 'manual') {
    delete fields.type;
    allowedFields.push("transactionType");
    allowedFields.push("created_by");
  } else {
    allowedFields.push("type");
  }

  let invalidFields = Object.keys(fields).filter(
    (field) => !allowedFields.includes(field)
  );
  if (invalidFields.length) {
    logger.error(`Invalid fields: ${invalidFields}`);
    return res.status(400).json({
      message: "Invalid fields.",
    });
  }

  const today = moment.tz(tz).startOf('day');
  const newStartDate = moment.tz(startDate, tz).startOf('day');
  const differenceInDays = today.diff(newStartDate, 'days');

  let query;
  let countQuery;

  if (differenceInDays > 7) {
    query = "SELECT * FROM ( SELECT * FROM orders UNION ALL SELECT * FROM orders_history ) AS combined_orders";
    countQuery = "SELECT COUNT(*) AS total FROM ( SELECT * FROM orders UNION ALL SELECT * FROM orders_history ) AS combined_orders";
  } else {
    query = "SELECT * FROM orders";
    countQuery = "SELECT COUNT(*) AS total FROM orders";    
  }

  let data = [];
  let isRemoveLastQuery;
  let searchKeyWordCondition;
  if (fields) {
    isRemoveLastQuery = false;

    // Add vendor condition if it exists
    if (vendor) {
      query += " WHERE vendor = ? AND ";
      countQuery += " WHERE vendor = ? AND ";
      data.push(vendor);
    } else {
      query += " WHERE ";
      countQuery += " WHERE ";
    }

    Object.keys(fields).forEach((field) => {
      if (fields[field]) {
        isRemoveLastQuery = true;
        query += `${field} = ? AND `;
        countQuery += `${field} = ? AND `;
        data.push(fields[field]);
      }
    });

    if (isRemoveLastQuery) {
      // remove last AND from query
      query = query.slice(0, -5);
      countQuery = countQuery.slice(0, -5);
    } else {
      // remove last WHERE from query
      query = query.slice(0, -7);
      countQuery = countQuery.slice(0, -7);
      searchKeyWordCondition = " WHERE ";
    }
  }

  if (startDate && endDate) {
    if (isRemoveLastQuery) {
      query += ` AND updatedAt BETWEEN ? AND ?`;
      countQuery += ` AND updatedAt BETWEEN ? AND ?`;
    } else {
      query += ` WHERE updatedAt BETWEEN ? AND ?`;
      countQuery += ` WHERE updatedAt BETWEEN ? AND ?`;
      searchKeyWordCondition = null;
    }
    data.push(startDate);
    data.push(endDate);
  }

  if (searchKeyWord) {
    if (!searchKeyWordCondition) {
      searchKeyWordCondition = " AND ";
    }
    
    if (advanceSearch == 'true') {
      query += ` ${searchKeyWordCondition} (customerName LIKE '%${searchKeyWord}%' OR merchantOrderId LIKE '%${searchKeyWord}%' OR receiptId LIKE '%${searchKeyWord}%' OR transactionID LIKE '%${searchKeyWord}%' OR customerUPIID LIKE '%${searchKeyWord}%' OR customerUtr LIKE '%${searchKeyWord}%')`;
      countQuery += ` ${searchKeyWordCondition} (customerName LIKE '%${searchKeyWord}%' OR merchantOrderId LIKE '%${searchKeyWord}%' OR receiptId LIKE '%${searchKeyWord}%' OR transactionID LIKE '%${searchKeyWord}%' OR customerUPIID LIKE '%${searchKeyWord}%' OR customerUtr LIKE '%${searchKeyWord}%')`;
    } else {
      query += ` ${searchKeyWordCondition} (receiptId LIKE '%${searchKeyWord}%')`;
      countQuery += ` ${searchKeyWordCondition} (receiptId LIKE '%${searchKeyWord}%')`;
    }
  }

  query += " ORDER BY createdAt DESC LIMIT ? OFFSET ?";
  let countData = data;
  data = [...data, limit, offset];
  logger.debug(`Query: ${query}`);
  return { query, data, countQuery, countData, first, page };
}

async function getBatchOrders(req, res, next) {
  try {
    const { query, data, countQuery, countData, first, page } = buildQuery(
      req.query,
      req.user.vendor
    );

    const pool = await poolPromise;

    const [results] = await pool.query(query, data);

    const [count] = await pool.query(countQuery, countData);
    const total = count[0].total;
    const perPage = first || 10;
    const currentPage = page || 1;
    const lastPage = Math.ceil(total / perPage);
    const firstItem = perPage * (currentPage - 1) + 1;
    const lastItem = Math.min(firstItem + perPage - 1, total);
    const hasMorePages = currentPage < lastPage;

    return res.json({
      pagination: {
        count: results.length,
        currentPage: currentPage,
        firstItem: firstItem,
        hasMorePages: hasMorePages,
        lastItem: lastItem,
        lastPage: lastPage,
        perPage: perPage,
        total: total,
      },
      data: results,
    });
  } catch (error) {
    console.log(error);
    logger.error("An error occurred while trying to get orders.");
    logger.debug(error);
    return res.status(500).json(error_500);
  }
}

module.exports = getOrders;
