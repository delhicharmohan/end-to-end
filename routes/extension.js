const express = require("express");
const OrdersController = require("../controllers/mobile/OrdersController");
const checkPublicKey = require("../helpers/middleware/checkPublicKey");
const callbackHook = require("../helpers/middleware/callbackHook");
const ExtensionController = require("../controllers/extension/ExtensionController");
// const validateHash = require("../helpers/middleware/validateHash");

const router = express.Router();
const ordersController = new OrdersController();
const extensionController = new ExtensionController();



router.post("/approve-order", checkPublicKey, async (req, res) => {
    await ordersController.recordTransactions(req, res);
});

// router.post("/approve-order", checkPublicKey, async (req, res) => {
//     await ordersController.approveOrderFromBank(req, res);
// }, callbackHook);

router.post("/approve-order-from-extension", async (req, res) => {
    await extensionController.approveOrderFromExtension(req, res);
});



module.exports = router;