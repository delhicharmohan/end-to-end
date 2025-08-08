const poolPromise = require("../db");
const logger = require("../logger");

async function checkWebsiteAssignment(website) {
  const pool = await poolPromise;
  const query = "SELECT 1 FROM users WHERE website = ? LIMIT 1";

  try {
    const [result] = await pool.query(query, [website]);
    return result.length > 0;
  } catch (error) {
    logger.error("Error while checking website assignment", error);
    throw error;
  }
}

async function getRandomValidator(type, amount, website, vendor) {
  const pool = await poolPromise;

  try {
    const isAssigned = website && (await checkWebsiteAssignment(website));

    const conditions = [
      "role = 'user'",
      "status = 1",
      "isLoggedIn = 1",
      isAssigned ? "website = ?" : "(website IS NULL OR website = '')",
      "vendor = ?",
      type === "payin" ? "payIn = 1 AND payInLimit >= ?" : "payOut = 1 AND payOutLimit >= ?",
    ];

    const query = `SELECT * FROM users WHERE ${conditions.join(" AND ")} ORDER BY RAND() LIMIT 1`;
    const params = isAssigned ? [website, vendor, amount] : [vendor, amount];

    const [validators] = await pool.query(query, params);
    if (validators.length > 0) {
      return validators[0];
    } else {
      const message = isAssigned
        ? `No validators available for website: ${website}`
        : "No validators available";
      logger.error(message);
      throw new Error(message);
    }
  } catch (error) {
    logger.error("Error while fetching random validator", error);
    throw error;
  }
}

module.exports = getRandomValidator;
