const express = require("express");
const router = express.Router();

const validateHash = require("../helpers/middleware/validateHash");
const approveOrder = require("../controllers/sms/approveOrder");
const callbackHook = require("../helpers/middleware/callbackHook");
const checkTokenWithExtra = require("../helpers/middleware/checkTokenWithExtra");

router.post("/", checkTokenWithExtra, approveOrder, callbackHook);

module.exports = router;
