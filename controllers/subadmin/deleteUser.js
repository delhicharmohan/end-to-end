const poolPromise = require("../../db");
const logger = require("../../logger");

async function deleteUser(req, res, next) {
  const username = req.params.username;
  try {
    const pool = await poolPromise;

    const [result] = await pool.query("UPDATE users SET is_deleted = 1 WHERE username = ?", [
      username,
    ]);

    if (result.affectedRows === 0) {
      logger.error(`User '${username}' attempted to delete does not exist.`);
      return res.status(400).json({
        success: false,
        message: "Sub admin does not exist.",
      });
    }

    logger.info(`Sub admin '${username}' was soft-deleted successfully.`);
    return res.status(200).json({
      success: true,
      message: "Successfully soft-deleted user.",
    });
  } catch (error) {
    logger.error(
      "A Database error occurred while trying to delete the sub admin."
    );
    logger.debug(error);
    return res.status(500).json({
      message: "An error occurred while trying to delete the sub admin.",
    });
  }
}

module.exports = deleteUser;
