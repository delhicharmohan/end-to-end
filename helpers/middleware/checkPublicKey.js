const poolPromise = require("../../db");
const jwt = require("jsonwebtoken");
const logger = require("../../logger");
const KeyController = require("../../controllers/mobile/KeyController");
const crypto = require('crypto');

async function checkPublicKey(req, res, next) {

  // public key validation only
  try {
    const salt = req.headers['salt'];
    const base64PublicKey = req.headers['publickey'];
    const publicKey = Buffer.from(base64PublicKey, 'base64').toString('utf8');
    const pool = await poolPromise;

    const [keyResult] = await pool.query(
      "SELECT * FROM app_auth WHERE salt = ? AND status = ?",
      [salt, 1]
    );
    if (!keyResult.length) {
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
  } catch (error) {
    console.log(error);
    logger.error("Invalid Salt or Public Key.");
    return res.status(400).json({ status: false, message: "Invalid Salt or Public Key." });
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



module.exports = checkPublicKey;
