const express = require("express");
const router = express.Router();

const checkAuth = require("../helpers/middleware/checkAuth");
const isAdmin = require("../helpers/middleware/isAdmin");
const getFailedOrders = require("../controllers/callback/getFailedOrders");
const sendCallbackToFailedOrders = require("../controllers/callback/sendCallbackToFailedOrders");

router.get("/", checkAuth, isAdmin, getFailedOrders);
router.post("/", checkAuth, isAdmin, sendCallbackToFailedOrders);

module.exports = router;
