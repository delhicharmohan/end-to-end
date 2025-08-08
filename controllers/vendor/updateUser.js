const poolPromise = require("../../db");
const logger = require("../../logger");
const bcrypt = require("bcrypt");
const moment = require("moment-timezone");

function hashPassword(password) {
  const saltRounds = 10;
  const hashedPassword = bcrypt.hashSync(password, saltRounds);
  return hashedPassword;
}

function buildUpdateUserQuery(fields, username) {
  const allowedFields = [
    "password",
    "upiid",
    "role",
    "name",
    "email",
    "phone",
    "status",
    "isLoggedIn",
  ];
  const invalidFields = Object.keys(fields).filter(
    (field) => !allowedFields.includes(field)
  );
  if (invalidFields.length) {
    logger.error(`Invalid fields: ${invalidFields}`);
    throw new Error(`Invalid fields: ${invalidFields}`);
  }

  const now = moment().tz(process.env.TIMEZONE);
  fields.updated_at = now.format("YYYY-MM-DD HH:mm:ss");

  query = `UPDATE users SET `;
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
  query += ` WHERE username = ?`;
  data.push(username);
  return { query, data };
}

async function updateUser(req, res) {
  const username = req.params.username;
  const fields = req.body;

  try {
    const { query, data } = buildUpdateUserQuery(fields, username);

    const pool = await poolPromise;

    const [result] = await pool.query(query, data);

    if (result.affectedRows === 0) {
      logger.info("Vendor not found");
      return res.status(404).json({ message: "Vendor not found." });
    }

    logger.info("Vendor updated successfully");
    logger.debug(result);
    return res.status(200).json({ message: "Vendor updated successfully." });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ message: "Error updating user." });
  }
}

module.exports = updateUser;
