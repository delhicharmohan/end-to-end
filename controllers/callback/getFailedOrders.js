const poolPromise = require("../../db");
const logger = require("../../logger");
const error_500 = {
  success: false,
  status: 500,
  message: "An error occurred while trying to get orders.",
};

/**
 * Build SQL query for getFailedOrders by parsing request query.
 * @param {Object} fields
 * @returns {
 *      query: String,
 *      data: Array
 * }
 */
function buildQuery(fields, vendor) {
  let first = parseInt(fields.first);
  let page = parseInt(fields.page);
  let searchKeyWord = fields.searchKeyWord;
  delete fields.searchKeyWord;
  let startDate = fields.startDate ? `${fields.startDate} 00:00:00` : "";
  delete fields.startDate;
  let endDate = fields.endDate ? `${fields.endDate} 23:59:59` : "";
  delete fields.endDate;
  const paymentStatus = fields.paymentStatus;
  delete fields.paymentStatus;
  const paymentType = fields.paymentType;
  delete fields.paymentType;
  const customerUPIID = fields.customerUPIID;
  delete fields.customerUPIID;

  let limit = first || 10;
  let offset = (page - 1) * limit;
  delete fields.first;
  delete fields.page;

  let query =
    `SELECT * FROM orders WHERE type = '${paymentType}' AND paymentStatus = '${paymentStatus}'  AND (manualCallback IS NULL OR manualCallback != 1)`;
  let countQuery =
    `SELECT COUNT(*) AS total FROM orders WHERE type = '${paymentType}' AND paymentStatus = '${paymentStatus}'  AND (manualCallback IS NULL OR manualCallback != 1)`;

  if (customerUPIID) {
    if (customerUPIID == 1) {
      query += ` AND (customerUPIID IS NOT NULL AND customerUPIID != '')`;
      countQuery += ` AND (customerUPIID IS NOT NULL AND customerUPIID != '')`;
    } else if (customerUPIID == 2) {
      query += ` AND customerUPIID = ''`;
      countQuery += ` AND customerUPIID = ''`;
    }
  }

  if (vendor) {
    query += ` AND vendor = '${vendor}'`;
    countQuery += ` AND vendor = '${vendor}'`;
  }

  // If a search keyword is provided, add the search condition
  if (searchKeyWord) {
    query += ` AND merchantOrderId LIKE '%${searchKeyWord}%'`; // Modify this condition as per your database schema
    countQuery += ` AND merchantOrderId LIKE '%${searchKeyWord}%'`; // Modify this condition as per your database schema
  }

  if (startDate && endDate) {
    query += ` AND updatedAt BETWEEN '${startDate}' AND '${endDate}'`;
    countQuery += ` AND updatedAt BETWEEN '${startDate}' AND '${endDate}'`;
  }

  query += " ORDER BY createdAt DESC LIMIT ? OFFSET ?";

  data = [limit, offset];

  logger.debug(`Query: ${query}`);
  logger.debug(`Query: ${countQuery}`);
  return { query, data, countQuery, first, page };
}

async function getFailedOrders(req, res, next) {
  const vendor = req.user.vendor;
  try {
    const { query, data, countQuery, first, page } = buildQuery(req.query, vendor);

    const pool = await poolPromise;

    const [results] = await pool.query(query, data);

    const [count] = await pool.query(countQuery);
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
    logger.error("An error occurred while trying to get failed orders.");
    logger.debug(error);
    return res.status(500).json(error_500);
  }
}

module.exports = getFailedOrders;
