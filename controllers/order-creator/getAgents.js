const poolPromise = require("../../db");

async function getAgents(req, res, next) {
  const vendor = req.user.vendor;
  let type = req.query.type;

  try {
    const pool = await poolPromise;

    let query = "SELECT username FROM users WHERE role = ?  AND is_deleted = 0 AND status = 1 AND isLoggedIn = 1";

    // Add vendor condition if it exists
    if (vendor) {
      query += " AND vendor = ?";
    }

    if (type === "payin") {
      query += " AND payIn = 1 AND payInLimit >= 0";
    } else if (type === "payout") {
      query += " AND payOut = 1 AND payOutLimit >= 0";
    }

    const queryParams = vendor ? ['user', vendor] : ['user'];

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

module.exports = getAgents;
