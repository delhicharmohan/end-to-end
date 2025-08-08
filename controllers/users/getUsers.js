const poolPromise = require("../../db");

async function getUsers(req, res, next) {
  const vendor = req.user.vendor;

  let first = req.query.first;
  let page = req.query.page;

  let limit = first || 10;
  let offset = (page - 1) * limit;

  try {

    let whereClause = "WHERE ";
    
    // Check if vendor is not null, then add a condition to filter by vendor
    if (vendor !== null) {
      whereClause = "WHERE u.vendor = ? AND "; // Assuming u.vendor is the column in the users table
    }

    const query = `
    SELECT
      u.*,
      COALESCE(COUNT(CASE WHEN o.paymentStatus = 'pending' AND DATE(o.updatedAt) = CURDATE() THEN 1 END), 0) AS pendingCount,
      COALESCE(SUM(CASE WHEN o.paymentStatus = 'pending' AND DATE(o.updatedAt) = CURDATE() THEN o.amount END), 0) AS pendingAmount,
      COALESCE(COUNT(CASE WHEN o.paymentStatus = 'approved' AND DATE(o.updatedAt) = CURDATE() THEN 1 END), 0) AS approvedCount,
      COALESCE(SUM(CASE WHEN o.paymentStatus = 'approved' AND DATE(o.updatedAt) = CURDATE() THEN o.amount END), 0) AS approvedAmount,
      COALESCE(COUNT(CASE WHEN o.paymentStatus = 'rejected' AND DATE(o.updatedAt) = CURDATE() THEN 1 END), 0) AS rejectedCount,
      COALESCE(SUM(CASE WHEN o.paymentStatus = 'rejected' AND DATE(o.updatedAt) = CURDATE() THEN o.amount END), 0) AS rejectedAmount,
      COALESCE(COUNT(CASE WHEN o.paymentStatus = 'unassigned' AND DATE(o.updatedAt) = CURDATE() THEN 1 END), 0) AS unassignedCount,
      COALESCE(SUM(CASE WHEN o.paymentStatus = 'unassigned' AND DATE(o.updatedAt) = CURDATE() THEN o.amount END), 0) AS unassignedAmount,
      COALESCE(COUNT(CASE WHEN o.paymentStatus = 'expired' AND DATE(o.updatedAt) = CURDATE() THEN 1 END), 0) AS expiredCount,
      COALESCE(SUM(CASE WHEN o.paymentStatus = 'expired' AND DATE(o.updatedAt) = CURDATE() THEN o.amount END), 0) AS expiredAmount
    FROM users u
    LEFT JOIN orders o ON u.username = o.validatorUsername AND o.type = 'payin'
    ${whereClause}
      u.role = 'user'
      AND u.is_deleted = 0
    GROUP BY u.username
    ORDER BY 
      CASE 
          WHEN u.isLoggedIn = 1 THEN 0
          WHEN u.isLoggedIn = 0 AND u.status = 1 THEN 1
          ELSE 2
      END
    LIMIT ${limit} OFFSET ${offset};
    `;

    const countQuery = `
    SELECT
      COUNT(*) AS total
    FROM users u
    ${whereClause}
      u.role = 'user'
      AND u.is_deleted = 0;
    `;

    const pool = await poolPromise;

    const [results] = await pool.query(query, [vendor]);

    const [count] = await pool.query(countQuery, [vendor]);

    const total = count[0].total;
    const perPage = first || 10;
    const currentPage = page || 1;
    const lastPage = Math.ceil(total / perPage);
    const firstItem = perPage * (currentPage - 1) + 1;
    const lastItem = Math.min(firstItem + perPage - 1, total);
    const hasMorePages = currentPage < lastPage;

    return res.status(200).json({
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
    return res.status(500).json({
      success: false,
      message: "An error occurred while processing the request.",
    });
  }
}

module.exports = getUsers;
