const poolPromise = require("../../db");

async function getUsersWithRole(req, res, next) {
  const role = req.params.role;
  const vendor = req.user.vendor;

  try {
    const pool = await poolPromise;

    let query = `SELECT * FROM users WHERE role = ? AND is_deleted = 0`;

    // Add vendor condition if it exists
    if (vendor !== null) {
      query += ` AND vendor = ?`;
    }

    const queryParams = vendor !== null ? [role, vendor] : [role];

    const [results] = await pool.query(query, queryParams);
    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while trying to access the database.",
    });
  }
}

module.exports = getUsersWithRole;
