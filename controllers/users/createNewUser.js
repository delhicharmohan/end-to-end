const logger = require("../../logger");
const bcrypt = require("bcrypt");
const moment = require("moment-timezone");
const poolPromise = require("../../db"); // Assuming your db module exports a promise-based pool

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

function buildInsertUserQuery(fields, vendor) {
  requiredFields = ["username", "password"];

  allowedFields = [
    "username",
    "password",
    "upiid",
    "role",
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
    "accountHolderName",
    "accountNumber",
    "ifsc",
    "bankName",
    "merchantCode",
    "merchantName",
    "uniqueIdentifier",
    "extensionId",
    "qr",
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

  if (fields.paymentMethod == 'UPI') {
    delete fields.merchantCode;
    delete fields.merchantName;
    delete fields.uniqueIdentifier;
    delete fields.accountHolderName;
    delete fields.accountNumber;
    delete fields.ifsc;
    delete fields.bankName;
  } else if (fields.paymentMethod == 'Manual Bank') {
    delete fields.merchantCode;
    delete fields.merchantName;
    delete fields.uniqueIdentifier;
    delete fields.upiid;
  } else if (fields.paymentMethod == 'Automatic Payment') {
    delete fields.accountHolderName;
    delete fields.accountNumber;
    delete fields.ifsc;
    delete fields.bankName;
  } else if (fields.paymentMethod == 'automatic_payment_with_sms') {
    delete fields.accountHolderName;
    delete fields.accountNumber;
    delete fields.ifsc;
    delete fields.bankName;
    delete fields.merchantCode;
    delete fields.merchantName;
  } 

  fields.role = "user";
  fields.vendor = vendor;

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
  const vendor = req.user.vendor;

  if (req.body.paymentMethod == 'static_qr' && req.file !== undefined) {

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
      req.body.qr = attachmentUrl;
    }

  }

  const { query, data } = buildInsertUserQuery(req.body, vendor);

  try {
    const pool = await poolPromise;

    // Get a connection from the pool
    const connection = await pool.getConnection();

    // Insert the new user into the users table
    await connection.query(query, data);

    // Release the connection back to the pool
    connection.release();

    return res.status(201).json({
      message: "User created successfully.",
    });
  } catch (error) {
    logger.debug(error);
    if (error.code === "ER_DUP_ENTRY") {
      logger.error("Duplicate User.");
      return res.status(400).json({ message: "Duplicate User." });
    }
    logger.error(
      "A Database error occurred while trying to create a new user."
    );
    return res.status(500).json({
      message: "An error occurred while trying to create a new user.",
    });
  }
}

module.exports = createNewUser;
