const express = require("express");
const router = express.Router();
const multer = require("multer");
const moment = require("moment-timezone");
const poolPromise = require("../db");

// Set up Multer to handle file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const checkAuth = require("../helpers/middleware/checkAuth");
const isAdmin = require("../helpers/middleware/isAdmin");
const validateHash = require("../helpers/middleware/validateHash");
const listInstantPayoutAvailable = require("../controllers/orders/listInstantPayoutAvailable");
const createPayinAgainstPayout = require("../controllers/orders/createPayinAgainstPayout");
const getInstantPayoutChat = require("../controllers/orders/getInstantPayoutChat");
const postInstantPayoutChat = require("../controllers/orders/postInstantPayoutChat");
const uploadChatAttachment = require("../controllers/orders/uploadChatAttachment");
const claimInstantPayout = require("../controllers/orders/claimInstantPayout");
const getOrders = require("../controllers/orders/getOrders");
const getStatus = require("../controllers/orders/getStatus");
const getStatusInstantPayOut = require("../controllers/orders/getStatusInstantPay");
const exitInstantPayoutPage = require("../controllers/orders/exitInstantPayoutPage");
const createOrder = require("../controllers/orders/createOrder");
const approveOrder = require("../controllers/orders/approveOrder");
const updateOrder = require("../controllers/orders/updateOrder");
const updateCommission = require("../controllers/orders/updateCommission");
const callbackHook = require("../helpers/middleware/callbackHook");
const autoCallbackHook = require("../helpers/middleware/autoCallbackHook");
const updateCustomerUpiId = require("../controllers/orders/updateCustomerUpiId");
const updateOrderStatus = require("../controllers/orders/updateOrderStatus");
const setCustomerPaymentType = require("../controllers/orders/setCustomerPaymentType");
const getOrderStatics = require("../controllers/orders/getOrderStatics");
const getOrderTotalStatics = require("../controllers/orders/getOrderTotalStatics");
const getBarChartData = require("../controllers/orders/getBarChartData");
const addCustomerUtr = require("../controllers/orders/addCustomerUtr");
const approvePayOutOrder = require("../controllers/orders/approvePayOutOrder");
const payOutCallbackHook = require("../helpers/middleware/payOutCallbackHook");
const createPayOutOrder = require("../controllers/orders/createPayOutOrder");
const updatePayOutLinkOrder = require("../controllers/orders/updatePayOutLinkOrder");
const unableToPay = require("../controllers/orders/unableToPay");
const autoApproval = require("../controllers/orders/autoApproval");
const refreshToken = require("../controllers/orders/refreshToken");
const uploadScreenshot = require("../controllers/orders/uploadScreenshot");
const getInstantPayoutBatches = require("../controllers/orders/getInstantPayoutBatches");
const {confirmBatchPayout, confirmPayInTransaction, confirmPayOutTransaction} = require("../controllers/orders/confirmBatchPayout");
const { route } = require(".");
const checkAndReAssignInstantPayout = require("../controllers/orders/checkAndReAssignInstantPayout");
const getInstantPayoutBatchForAdmin = require("../controllers/orders/getInstantPayoutBatchForAdmin");
const updateInstantPayoutUPIID = require("../controllers/orders/updateIntantPayoutUPIID");
const testFunction = require("../controllers/orders/test");



router.post("/:refID/validator", checkAuth, isAdmin, updateOrder);
router.post("/:refID/customerUpiId", updateCustomerUpiId);
router.post("/:refID/updateOrderStatus", updateOrderStatus);
router.post("/:refID/setCustomerPaymentType", setCustomerPaymentType);
router.post("/:refID/addCustomerUtr", addCustomerUtr);
router.get('/:refID/check-instant-payout-status', checkAndReAssignInstantPayout);
router.get("/:refID/exit-instant-payout", exitInstantPayoutPage);
router.get('/:refID/instant-payout-batches', getInstantPayoutBatches);
router.get("/:refID/instant-payout", getStatusInstantPayOut);
router.post("/:refID/update-instant-payout", updateInstantPayoutUPIID);
router.get('/:refID/batch-payout-details', checkAuth, getInstantPayoutBatchForAdmin);


router.get('/:refID/test', testFunction);
router.post(
  '/:refID/confirm-batch', 
  confirmBatchPayout,  // batch transaction confirm
  confirmPayInTransaction,  // payin transaction confirm
  callbackHook,  // giving callback for payin transaction
  confirmPayOutTransaction // confirm payout transaction
);
router.get("/:refID", getStatus);
router.post("/:refID", checkAuth, approveOrder, updateCommission, callbackHook);
router.post("/", validateHash, createOrder);
router.get("/", checkAuth, getOrders);

router.post(
  "/:refID/approvePayOutOrder",
  checkAuth,
  approvePayOutOrder,
  updateCommission,
  payOutCallbackHook
);
router.post("/:vendor/createPayOutOrder", checkAuth, createPayOutOrder);
router.post("/:refID/updatePayOutLinkOrder", checkAuth, updatePayOutLinkOrder);
router.post("/:refID/unableToPay", unableToPay, callbackHook);
router.post("/:refID/upload-screenshot", upload.single("upload_screenshot"), uploadScreenshot);
router.post("/:refID/autoApproval", autoApproval, updateCommission, autoCallbackHook);
router.post("/:refID/refreshToken", refreshToken);

// API2: cross-vendor instant payout marketplace
router.get("/instant-payout/available", validateHash, listInstantPayoutAvailable);
router.post("/instant-payout/:refID/create-payin", validateHash, createPayinAgainstPayout);
router.get("/:refID/chat", validateHash, getInstantPayoutChat);
router.post("/:refID/chat", validateHash, postInstantPayoutChat);
// Public chat endpoints for browser clients (no validateHash)
router.get("/:refID/chat-public", getInstantPayoutChat);
router.post("/:refID/chat-public", postInstantPayoutChat);
router.post(
  "/:refID/chat-attachment",
  upload.single("upload_screenshot"),
  uploadChatAttachment
);
router.get("/instant-payout/:refID/claim", claimInstantPayout);

router.get("/getOrderStatics/:type", checkAuth, getOrderStatics);
router.get("/getBarChartData/:type", checkAuth, getBarChartData);
router.get("/getOrderTotalStatics/:type", checkAuth, getOrderTotalStatics);

// Debug endpoint to check available payouts for matching
router.get("/debug/payouts", async (req, res) => {
  try {
    const { vendor, amount } = req.query;
    const pool = await poolPromise;
    const now = moment().tz(process.env.TIMEZONE);
    
    const thirtyMinutesAgo = now.subtract(30, "minutes").format("YYYY-MM-DD HH:mm:ss");
    const oneHourAgo = now.subtract(60, "minutes").format("YYYY-MM-DD HH:mm:ss");
    
    // Get all unassigned payouts
    const query = `
      SELECT 
        id, 
        instant_balance, 
        current_payout_splits, 
        createdAt, 
        vendor,
        paymentStatus,
        is_instant_payout
      FROM orders 
      WHERE is_instant_payout = 1 
        AND type = 'payout' 
        AND paymentStatus = 'unassigned'
        AND vendor = ?
        AND createdAt >= ?
      ORDER BY createdAt DESC
      LIMIT 20
    `;
    
    const [payouts] = await pool.query(query, [vendor, oneHourAgo]);
    
    // Get socket channel activity
    const socketQuery = `
      SELECT channel, user_count 
      FROM socket_channels 
      WHERE channel LIKE 'instant-withdraw-%'
      ORDER BY user_count DESC
    `;
    
    const [socketChannels] = await pool.query(socketQuery);
    
    res.json({
      success: true,
      data: {
        payouts,
        socketChannels,
        searchCriteria: {
          vendor,
          amount,
          timeWindow: oneHourAgo
        }
      }
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
