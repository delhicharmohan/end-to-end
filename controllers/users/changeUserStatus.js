const poolPromise = require("../../db");
const logger = require("../../logger");

async function changeUserStatus(req, res, next) {
  // get the username from the request
  var username = req.params.username;
  var status = req.body.status;

  try {
    const pool = await poolPromise;

    // check if user exists in the users table
    const [userResult] = await pool.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (!userResult.length) {
      logger.error("User not found.");
      return res.status(404).json({ message: "User not found." });
    }

    // update the user status in the users table
    const [updateResult] = await pool.query(
      "UPDATE users SET status = ? WHERE username = ?",
      [status, username]
    );

    // if user's status is being set to false
    // update all pending orders where that user is validator so that the admin who is updating the status will become the validator
    if (status === 0) {
      await pool.query(
        'UPDATE orders SET validatorUsername= ?, validatorUPIID= ? where validatorUsername = ? and paymentStatus="pending"',
        [req.user.username, req.user.upiid, username]
      );
    }

    logger.info("User status updated successfully.");
    logger.debug(updateResult);
    return res
      .status(200)
      .json({ message: "User status updated successfully." });
  } catch (error) {
    logger.error("An error occurred while trying to access the database.");
    logger.debug(error);
    return res.status(500).json({
      message: "An error occurred while trying to access the database.",
    });
  }
}

module.exports = changeUserStatus;
