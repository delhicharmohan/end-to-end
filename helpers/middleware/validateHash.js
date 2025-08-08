const crypto = require("crypto");
const poolPromise = require("../../db");
const logger = require("../../logger");

async function validateHash(req, res, next) {
  const { "x-key": xKey, "x-hash": xHash, vendor } = req.headers;

  try {
    const pool = await poolPromise;
    const query = "SELECT secret, clientName FROM secrets WHERE xKey = ? AND vendor = ?";
    const [results] = await pool.query(query, [xKey, vendor]);

    if (!results.length) {
      console.log("\n \n \n \n \n \n =============== X KEY MISS MATCH =============== \n \n \n \n \n \n");
      console.log(xKey);
      console.log(vendor);
      console.log("\n \n \n \n \n \n *************** X KEY END ************* \n \n \n \n \n \n");
      return res.status(404).json({ success: false, message: "Invalid Secret." });
    }

    const { secret, clientName } = results[0];
    req.clientName = clientName;

    const calculatedHash = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(req.body))
      .digest("base64");
      console.log("\n \n \n \n \n \n =============== NEW KEY TRY THIS =============== \n \n \n \n \n \n");
      console.log(calculatedHash);
      console.log("\n \n \n \n \n \n *************** KEY END ************* \n \n \n \n \n \n");

    if (process.env.NODE_ENV !== "development" && calculatedHash !== xHash) {
      console.log("\n \n \n \n \n \n =============== NEW KEY TRY THIS =============== \n \n \n \n \n \n");
      console.log(calculatedHash);
      console.log("\n \n \n \n \n \n *************** KEY END ************* \n \n \n \n \n \n");
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid hash." });
    }

    next();
  } catch (error) {
    logger.error("An error occurred while trying to validate the hash.", error);
    return res.status(500).json({ message: "An error occurred while trying to validate the hash." });
  }
}

module.exports = validateHash;
