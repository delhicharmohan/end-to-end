const logger = require("../../logger");
const poolPromise = require("../../db");

async function deleteUser(req, res, next) {
  try {
    const username = req.params.username;
    const query = "UPDATE users SET is_deleted = 1 WHERE username = ?";

    const pool = await poolPromise;

    const [results] = await pool.execute(query, [username]);

    if (results.affectedRows === 0) {
      logger.error(`User '${username}' attempted to delete does not exist.`);
      return res.status(400).json({
        success: false,
        message: "User does not exist.",
      });
    }

    logger.info(`User '${username}' was soft-deleted successfully.`);
    return res.status(200).json({
      success: true,
      message: "Successfully soft-deleted user.",
    });
  } catch (error) {
    logger.error("A Database error occurred while trying to delete the user.");
    logger.debug(error);
    return res
      .status(500)
      .json({ message: "An error occurred while trying to delete the user." });
  }
}

module.exports = deleteUser;
