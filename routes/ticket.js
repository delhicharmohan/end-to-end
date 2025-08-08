const express = require("express");
const router = express.Router();
const multer = require("multer");

const createTicket = require("../controllers/ticket/createTicket");

// Set up Multer to handle file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Use Multer middleware for the "attachment" field in the form data
router.post("/", upload.single("attachment"), createTicket);

module.exports = router;
