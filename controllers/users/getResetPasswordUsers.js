const poolPromise = require("../../db");

async function getResetPasswordUsers(req, res, next) {

  const vendor = req.params.vendor;
  let first = req.query.first;
  let page = req.query.page;
  let limit = first || 10;
  let offset = (page - 1) * limit;

  try {
    const pool = await poolPromise;

    let query = `SELECT name, username, role FROM users WHERE (role = 'user' OR role = 'order_creator') AND is_deleted = 0 AND vendor = '${vendor}' ORDER BY username ASC LIMIT ${limit} OFFSET ${offset}`;
    const [results] = await pool.query(query);

    let countQuery = `SELECT COUNT(username) AS total FROM users WHERE (role = 'user' OR role = 'order_creator') AND is_deleted = 0 AND vendor = '${vendor}'`;
    const [count] = await pool.query(countQuery, [vendor]);

    const total = count[0].total;
    const perPage = first || 10;
    const currentPage = page || 1;
    const lastPage = Math.ceil(total / perPage);
    const firstItem = perPage * (currentPage - 1) + 1;
    const lastItem = Math.min(firstItem + perPage - 1, total);
    const hasMorePages = currentPage < lastPage;

    return res.status(200).json({
      success: true,
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
    return res.status(200).json({
      success: false,
      message: `An error occurred while trying to fetch reset password users. error: ${error}`,
    });
  }
}

module.exports = getResetPasswordUsers;
