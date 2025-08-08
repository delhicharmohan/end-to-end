const poolPromise = require("../../db");

async function getUsers(req, res, next) {
  const vendor = req.user.vendor;

  try {
    const pool = await poolPromise;

    let query = "SELECT * FROM users WHERE role = ?  AND is_deleted = 0";

    // Add vendor condition if it exists
    if (vendor) {
      query += " AND vendor = ?";
    }

    const queryParams = vendor ? ['subadmin', vendor] : ['subadmin'];

    const [results] = await pool.query(query, queryParams);

    return res.status(200).json(results);
  } catch (error) {
    console.error("An error occurred while trying to access the database.");
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while trying to access the database.",
    });
  }
}

module.exports = getUsers;
