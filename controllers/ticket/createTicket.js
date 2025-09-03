const poolPromise = require("../../db");
const logger = require("../../logger");
const moment = require("moment-timezone");

const { Storage } = require('@google-cloud/storage');
// Use Application Default Credentials (ADC). On Render, set GOOGLE_APPLICATION_CREDENTIALS to the Secret File path.
const storage = new Storage();

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
      resolve(`https://storage.cloud.google.com/${bucketName}/${fileName}`);
    });

    stream.end(fileBuffer);
  });
}

async function createTicket(req, res, next) {

  try {
    const pool = await poolPromise;

    const now = moment().tz(process.env.TIMEZONE);
    const created_at = updated_at = now.format("YYYY-MM-DD HH:mm:ss");

    const attachmentFileName = `attachment_${now.unix()}.jpeg`;
    const bucketName = 'wizpay-master-aura'; // Replace with your desired bucket name

    // Check if the bucket exists
    const [bucketExists] = await storage.bucket(bucketName).exists();

    if (!bucketExists) {
      // If the bucket does not exist, create it
      await storage.createBucket(bucketName);
    }

    const attachmentUrl = await uploadToGoogleStorage(req.file.buffer, attachmentFileName, bucketName);

    const result = await pool.query(
      "INSERT INTO tickets (vendor, attachment_url, utr, comment, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [
        req.body.vendor,
        attachmentUrl,
        req.body.utr,
        req.body.comment,
        created_at,
        updated_at,
      ]
    );

    logger.info(`Ticket created successfully. UTR: ${req.body.utr}`);
    return res.status(201).json({
      message: `Ticket created successfully. UTR: ${req.body.utr}`,
    });
  } catch (error) {
    logger.error(`Error while creating Ticket. error: ${error}`);
    return res.status(500).json({ message: `Error while creating Ticket. error: ${error}` });
  }
}

module.exports = createTicket;
