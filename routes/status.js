const express = require("express");
const router = express.Router();
const StatusController = require("../controllers/status/StatusController");

const statusController = new StatusController();

router.get("/order/:merchantOrderId", async (req, res) => {
    await statusController.getStatusWithOrderId(req, res);
});

module.exports = router;