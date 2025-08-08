const poolPromise = require("../../db");

async function getUsers(req, res, next) {
  try {
    const query = "SELECT * FROM users WHERE role = 'admin' AND is_deleted = 0";

    const pool = await poolPromise;

    const [results] = await pool.query(query);
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
