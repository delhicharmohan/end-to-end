const { Storage } = require("@google-cloud/storage");
const logger = require("../../logger");

// Reuse default application credentials
const storage = new Storage();

async function uploadToGoogleStorage(fileBuffer, fileName, bucketName, contentType = "image/jpeg") {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);

  return new Promise((resolve, reject) => {
    const stream = file.createWriteStream({
      metadata: { contentType },
    });

    stream.on("error", (err) => reject(err));
    stream.on("finish", () => resolve(`https://storage.googleapis.com/${bucketName}/${fileName}`));
    stream.end(fileBuffer);
  });
}

// POST /api/v1/orders/:refID/chat-attachment (public)
// multipart field name: upload_screenshot (reuses existing front-end field name)
module.exports = async function uploadChatAttachment(req, res) {
  try {
    const { refID } = req.params;
    if (!refID) return res.status(400).json({ success: false, message: "Missing refID" });
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const contentType = req.file.mimetype || "image/jpeg";
    const now = Date.now();
    const safeRef = String(refID).replace(/[^a-zA-Z0-9_-]/g, "");
    const fileName = `chat_${safeRef}_${now}.jpg`;

    const bucketName = "wizpay-master-upload-screenshot"; // same bucket as uploadScreenshot.js
    // Ensure bucket exists (best-effort)
    const [exists] = await storage.bucket(bucketName).exists();
    if (!exists) {
      await storage.createBucket(bucketName);
    }

    const url = await uploadToGoogleStorage(req.file.buffer, fileName, bucketName, contentType);

    return res.json({ success: true, url });
  } catch (err) {
    logger.error(`[uploadChatAttachment] Failed: ${err?.message}`);
    return res.status(500).json({ success: false, message: "Failed to upload attachment" });
  }
};
