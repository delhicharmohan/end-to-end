const poolPromise = require("../../db");
const jwt = require("jsonwebtoken");

async function checkAuth(req, res, next) {
  const authCookie = req.cookies.auth;
  if (!authCookie) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: No auth cookie found",
    });
  }

  try {
    // Verify the JWT token
    const decoded = jwt.verify(authCookie, process.env.JWT_SECRET);
    const username = decoded.username;

    const query = "SELECT * FROM users WHERE username = ? AND role = ?";
    const values = [username, "admin"];

    const pool = await poolPromise;

    const [results] = await pool.query(query, values);

    // If results is empty, the user does not exist or is not an admin
    if (!results.length) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid auth cookie",
      });
    }

    // Attach the user object to the request object
    req.user = results[0];
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid auth cookie",
    });
  }
}

module.exports = checkAuth;
