const poolPromise = require("../../db");
const logger = require("../../logger");

async function updateUniqueIdentifier(req, res) {

  console.log(req.body);

  // check if required fields (username) is present in the request params
  if (!req.params.username) {
    logger.error("Missing required fields: username");
    return res.status(200).json({
      status: false,
      message: "Missing required fields: username",
    });
  }
  // get the username from the request
  var username = req.params.username;

  // check if required fields (uniqueIdentifier) is present in the request body
  if (!req.body.uniqueIdentifier) {
    logger.error("Missing required fields: uniqueIdentifier");
    return res.status(200).json({
      status: false,
      message: "Missing required fields: uniqueIdentifier",
    });
  }
  var uniqueIdentifier = req.body.uniqueIdentifier;

  try {
    const pool = await poolPromise;

    // check if user exists in the users table
    const [userResult] = await pool.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (!userResult.length) {
      logger.error("User not found.");
      return res.status(200).json({ status: false, message: "User not found." });
    }

    // update the user status in the users table
    await pool.query(
      "UPDATE users SET uniqueIdentifier = ? WHERE username = ?",
      [uniqueIdentifier, username]
    );

    logger.info("User uniqueIdentifier updated successfully.");
    return res
      .status(200)
      .json({ status: true, message: "User Unique Identifier updated successfully." });
  } catch (error) {
    logger.error("An error occurred while trying to update unique identifier.");
    logger.debug(error);
    return res.status(200).json({
      status: false,
      message: "An error occurred while trying to update unique identifier.",
    });
  }
}

module.exports = updateUniqueIdentifier;
