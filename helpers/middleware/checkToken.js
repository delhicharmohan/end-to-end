const poolPromise = require("../../db");
const jwt = require("jsonwebtoken");
const logger = require("../../logger");

async function checkToken(req, res, next) {
  // Bearer token validation
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    logger.error("Access Denied: No token provided.");
    return res.status(400).json({ message: "Access Denied: No token provided." });
  }

  // split token from Bearer
  const token = authHeader.split(' ')[1];

  req.token = token;

  if (!token) {
    logger.error("Access Denied: No token provided.");
    return res.status(400).json({ message: "Access Denied: No token provided." });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const username = decoded.username;

    const query = "SELECT * FROM users WHERE username = ?";
    const values = [username];

    const pool = await poolPromise;

    const [results] = await pool.query(query, values);

    if (!results.length) {
      logger.error(`Invalid username. Attempted username: '${username}'`);
      return res.status(401).json({ message: "Unauthorized." });
    }

    req.user = results[0];
    next();
  } catch (error) {

    console.log(error);
    logger.error("An error occurred while trying to authenticate.");
    logger.debug(error);
    return res.status(401).json({ message: "Unauthorized." });
  }
}

module.exports = checkToken;
