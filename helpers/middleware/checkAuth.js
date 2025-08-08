const poolPromise = require("../../db");
const jwt = require("jsonwebtoken");
const logger = require("../../logger");

async function checkAuth(req, res, next) {
  const authCookie = req.cookies.auth;
  if (!authCookie) {
    logger.error("No auth cookie found.");
    return res.status(400).json({ message: "Unauthorized." });
  }

  try {
    // Verify the JWT token
    const decoded = jwt.verify(authCookie, process.env.JWT_SECRET);
    const username = decoded.username;

    const query = "SELECT * FROM users WHERE username = ?";
    const values = [username];

    const pool = await poolPromise;

    const [results] = await pool.query(query, values);

    // If results is empty, the user does not exist
    if (!results.length) {
      logger.error(`Invalid username. Attempted username: '${username}'`);
      return res.status(401).json({ message: "Unauthorized." });
    }

    // Attach the user object to the request object
    req.user = results[0];
    next();
  } catch (error) {
    console.log(error);
    logger.error("An error occurred while trying to authenticate.");
    logger.debug(error);
    return res.status(401).json({ message: "Unauthorized." });
  }
}

module.exports = checkAuth;
