const poolPromise = require("../../db");
const logger = require("../../logger");
const bcrypt = require("bcrypt");
const moment = require("moment-timezone");

function hashPassword(password) {
  const saltRounds = 10;
  const hashedPassword = bcrypt.hashSync(password, saltRounds);
  return hashedPassword;
}

async function updatePassword(req, res) {
  // get the username from the request
  var username = req.params.username;
  var password = req.body.password;

  try {
    const pool = await poolPromise;

    // check if user exists in the users table
    const [userResult] = await pool.query(
      "SELECT name FROM users WHERE username = ?",
      [username]
    );

    if (!userResult.length) {
      logger.error("User not found.");
      return res.status(201).json({ success: false, message: "User not found." });
    }

    const newPassword = hashPassword(password);
    const now = moment().tz(process.env.TIMEZONE);
    const updated_at = now.format("YYYY-MM-DD HH:mm:ss");
    // update the user status in the users table
    await pool.query(
      "UPDATE users SET password = ?, updated_at = ? WHERE username = ?",
      [newPassword, updated_at, username]
    );

    logger.info(`Password reset successfully. username: ${username}`);
    return res
      .status(201)
      .json({ success: true, message: "Password reset successfully." });
  } catch (error) {
    logger.error(`An error occurred while trying to reset the password. error: ${error}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred while trying to reset the password. error: ${error}",
    });
  }
}

module.exports = updatePassword;
