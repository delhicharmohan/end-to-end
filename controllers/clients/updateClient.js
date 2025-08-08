const poolPromise = require("../../db");
const logger = require("../../logger");
const moment = require("moment-timezone");

function buildUpdateClientQuery(fields, clientName) {
  const allowedFields = ["secret", "xKey", "callbackURL", "payOutCallbackURL", "failedOrderCallbackURL", "vendor", "is_instant_payout", 'wallet_callback', 'instant_payout_limit'];
  const invalidFields = Object.keys(fields).filter(
    (field) => !allowedFields.includes(field)
  );
  if (invalidFields.length) {
    logger.error(`Invalid fields: ${invalidFields}`);
    throw new Error(`Invalid fields: ${invalidFields}`);
  }

  const now = moment().tz(process.env.TIMEZONE);
  fields.updated_at = now.format("YYYY-MM-DD HH:mm:ss");
  
  let query = "UPDATE secrets SET ";
  const data = [];
  Object.keys(fields).forEach((field) => {
    query += `${field} = ?, `;
    data.push(fields[field]);
  });
  query = query.slice(0, -2);
  query += " WHERE clientName = ?";
  data.push(clientName);
  return { query, data };
}

async function updateClient(req, res, next) {
  const clientName = req.params.clientName;
  const fields = req.body;

  try {
    const { query, data } = buildUpdateClientQuery(fields, clientName);

    const pool = await poolPromise;

    const [results] = await pool.query(query, data);

    if (results.affectedRows === 0) {
      logger.info("Client not found");
      return res.status(404).json({ message: "Client not found." });
    }

    logger.info("Client updated successfully");
    return res.status(200).json({ message: "Client updated successfully." });
  } catch (error) {
    logger.error(`CLIENT UPDATE ERROR: ${error}`);
    return res.status(500).json({ message: `Error updating client: ${error}` });
  }
}

module.exports = updateClient;
