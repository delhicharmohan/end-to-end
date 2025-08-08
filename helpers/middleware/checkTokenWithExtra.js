const poolPromise = require("../../db");
const jwt = require("jsonwebtoken");
const logger = require("../../logger");
const KeyController = require("../../controllers/mobile/KeyController");
const crypto = require('crypto');

async function checkTokenWithExtra(req, res, next) {

  // Bearer token validation
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    logger.error("Access Denied: No token provided.");
    return res.status(400).json({ message: "Access Denied: No token provided." });
  }

  // split token from Bearer
  const token = authHeader.split(' ')[1];

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
    try {
      const salt = req.headers['salt'];
      const base64PublicKey = req.headers['publickey'];
      const publicKey = Buffer.from(base64PublicKey, 'base64').toString('utf8');

      const [keyResult] = await pool.query(
        "SELECT * FROM app_auth WHERE salt = ? AND status = ?",
        [salt, 1]
      );
      if (!keyResult.length) {
        logger.error("Invalid Salt or Public Key.");
        return res.status(400).json({ status: false, message: "Invalid Salt or Public Key." });
      } else {
        const keyController = new KeyController();
        const privateKey = keyResult[0].private_key;
        const isValid = validatePublicKey(publicKey, privateKey);
        if (isValid) {
          next();
        } else {
          logger.error("Invalid Salt or Public Key.");
          return res.status(400).json({ status: false, message: "Invalid Salt or Public Key." });
        }

      }
    } catch (e) {
      console.log(e);
      logger.error("Invalid Salt or Public Key.");
      return res.status(400).json({ status: false, message: "Invalid Salt or Public Key." });
    }

  } catch (error) {
    console.log(error);
    logger.error("An error occurred while trying to authenticate.");
    logger.debug(error);
    return res.status(401).json({ message: "Unauthorized." });
  }
}


function validatePublicKey(publicKey, privateKeyFromDatabase) {

  const publicKeyMesage = Buffer.from(process.env.JWT_SECRET);
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(publicKeyMesage);
  const signature = signer.sign(privateKeyFromDatabase, 'base64');

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(publicKeyMesage);
  const isVerified = verifier.verify(publicKey, signature, 'base64');

  return isVerified;
}



module.exports = checkTokenWithExtra;
