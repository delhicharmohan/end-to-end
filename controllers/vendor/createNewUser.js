const poolPromise = require("../../db");
const logger = require("../../logger");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");

function hashPassword(password) {
  const saltRounds = 10;
  const hashedPassword = bcrypt.hashSync(password, saltRounds);
  return hashedPassword;
}

function buildInsertUserQuery(fields) {
  fields.upiid = uuidv4();
  requiredFields = ["username", "password"];
  allowedFields = [
    "username",
    "password",
    "role",
    "name",
    "email",
    "phone",
    "upiid",
    "status",
    "isLoggedIn",
  ];
  missingFields = requiredFields.filter(
    (field) => !Object.keys(fields).includes(field)
  );
  if (missingFields.length) {
    logger.error(`Missing fields: ${missingFields}`);
    throw new Error(`Missing fields: ${missingFields}`);
  }
  invalidFields = Object.keys(fields).filter(
    (field) => !allowedFields.includes(field)
  );
  if (invalidFields.length) {
    logger.error(`Invalid fields: ${invalidFields}`);
    throw new Error(`Invalid fields: ${invalidFields}`);
  }

  fields.vendor = fields.username;

  const now = moment().tz(process.env.TIMEZONE);
  fields.created_at = fields.updated_at = now.format("YYYY-MM-DD HH:mm:ss");

  query = `INSERT INTO users SET `;
  data = [];
  Object.keys(fields).forEach((field) => {
    if (field === "password") {
      query += `${field} = ?, `;
      data.push(hashPassword(fields[field]));
    } else {
      query += `${field} = ?, `;
      data.push(fields[field]);
    }
  });
  query = query.slice(0, -2);
  return { query, data };
}

async function createNewUser(req, res, next) {
  try {
    const { query, data } = buildInsertUserQuery(req.body);

    const pool = await poolPromise;

    // insert the new user into the users table
    const [result] = await pool.query(query, data);

    return res.status(201).json({
      message: "Vendor created successfully.",
    });
  } catch (error) {
    logger.debug(error);
    if (error.message === "Missing fields") {
      return res.status(400).json({ message: "Missing parameters" });
    } else if (error.message === "Invalid fields") {
      return res.status(400).json({ message: "Invalid parameters" });
    } else if (error.code === "ER_DUP_ENTRY") {
      logger.error("Duplicate User.");
      return res.status(400).json({ message: "Duplicate User." });
    } else {
      logger.error(
        "A Database error occurred while trying to create a new user."
      );
      return res.status(500).json({
        message: "An error occurred while trying to create a new user.",
      });
    }
  }
}

module.exports = createNewUser;
