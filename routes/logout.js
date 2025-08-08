const poolPromise = require("../db");
const logger = require("../logger");

async function logout(req, res, next) {
  try {
    const pool = await poolPromise;
    const [result] = await pool.query(
      "UPDATE users SET isLoggedIn = 0 WHERE username = ?",
      [req.user.username]
    );

    if (result.affectedRows === 0) {
      logger.info("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    logger.error("Error while logging out.");
    logger.debug(error);
    return res.status(500).json({ message: "Error while logging out" });
  }
}

module.exports = logout;
