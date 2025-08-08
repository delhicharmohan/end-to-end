const poolPromise = require("../../db");

async function logoutUser(req, res, next) {
  const username = req.params.username;
  const status = req.params.status && req.params.status == "true" ? 1 : 0;

  try {
    const query = "UPDATE users SET isLoggedIn = ? WHERE username = ?";

    const pool = await poolPromise;

    const [result] = await pool.query(query, [status, username]);

    if (result.affectedRows === 0) {
      logger.info("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Logged in status changed",
    });
  } catch (error) {
    logger.error("Error while changing logged in status.");
    logger.debug(error);
    return res
      .status(500)
      .json({ message: "Error while changing logged in status" });
  }
}

module.exports = logoutUser;
