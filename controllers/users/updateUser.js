const poolPromise = require("../../db");
const logger = require("../../logger");
const bcrypt = require("bcrypt");
const moment = require("moment-timezone");

const { Storage } = require('@google-cloud/storage');
const storage = new Storage({
  keyFilename: 'gcloud/best-live-404609-214f2657ad28.json', // Replace with the path to your Service Account Key
  projectId: 'best-live-404609', // Replace with your Google Cloud project ID
});

async function uploadToGoogleStorage(fileBuffer, fileName, bucketName) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);

  return new Promise((resolve, reject) => {
    const stream = file.createWriteStream({
      metadata: {
        contentType: 'image/jpeg', // Set the appropriate content type for your file
      },
    });

    stream.on('error', (err) => {
      reject(err);
    });

    stream.on('finish', () => {
      resolve(`https://storage.googleapis.com/${bucketName}/${fileName}`);
    });

    stream.end(fileBuffer);
  });
}

function hashPassword(password) {
  const saltRounds = 10;
  const hashedPassword = bcrypt.hashSync(password, saltRounds);
  return hashedPassword;
}

function buildUpdateUserQuery(fields, username) {
  const allowedFields = [
    "password",
    "upiid",
    "name",
    "email",
    "phone",
    "payIn",
    "payOut",
    "payInLimit",
    "payOutLimit",
    "balance",
    "payInCommission",
    "payOutCommission",
    "website",
    "is_utr_enabled",
    "isPayNow",
    "paymentMethod",
    "merchantCode",
    "merchantName",
    "uniqueIdentifier",
    "accountHolderName",
    "accountNumber",
    "ifsc",
    "bankName",
    "extensionId",
    "qr",
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

    if (fields.paymentMethod == 'static_qr' && req.file !== undefined) {

      const now = moment().tz(process.env.TIMEZONE);
      const attachmentFileName = `attachment_${now.unix()}.jpeg`;
      const bucketName = 'wizpay-master-qr-code'; // Replace with your desired bucket name

      // Check if the bucket exists
      const [bucketExists] = await storage.bucket(bucketName).exists();

      if (!bucketExists) {
        // If the bucket does not exist, create it
        await storage.createBucket(bucketName);
      }

      const attachmentUrl = await uploadToGoogleStorage(req.file.buffer, attachmentFileName, bucketName);

      if (attachmentUrl) {
        fields.qr = attachmentUrl;
      }

    }

    const { query, data } = buildUpdateUserQuery(fields, username);

    const pool = await poolPromise;

    const [result] = await pool.query(query, data);

    if (result.affectedRows === 0) {
      logger.info("User not found");
      return res.status(404).json({ message: "User not found." });
    }

    logger.info("User updated successfully");
    logger.debug(result);
    return res.status(200).json({ message: "User updated successfully." });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ message: "Error updating user." });
  }
}

module.exports = updateUser;
