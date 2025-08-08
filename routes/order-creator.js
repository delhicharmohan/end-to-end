var express = require("express");
const isAdmin = require("../helpers/middleware/isAdmin");
const getUsers = require("../controllers/order-creator/getUsers");
const createNewUser = require("../controllers/order-creator/createNewUser");
const deleteUser = require("../controllers/order-creator/deleteUser");
const updateUser = require("../controllers/order-creator/updateUser");
const isValidOrder = require("../controllers/order-creator/isValidOrder");
const isValidVendor = require("../controllers/order-creator/isValidVendor");
const createManualOrder = require("../controllers/order-creator/createManualOrder");
const addDeposit = require("../controllers/order-creator/addDeposit");
const getManualOrderStatics = require("../controllers/order-creator/getManualOrderStatics");
const getAgents = require("../controllers/order-creator/getAgents");
const checkAuth = require("../helpers/middleware/checkAuth");
var router = express.Router();

// Get all order-creator users
router.get("/", checkAuth, isAdmin, getUsers);
// Create new order-creator user
router.post("/", checkAuth, isAdmin, createNewUser);
// Delete order-creator user
router.delete("/:username", checkAuth, isAdmin, deleteUser);
// Update order-creator user
router.put("/:username", checkAuth, isAdmin, updateUser);

// check the order is valid or not
router.get("/isValidOrder/:refID", isValidOrder);
// check the vendor is valid or not
router.get("/isValidVendor/:vendor", isValidVendor);
// get agents
router.get("/getAgents", checkAuth, getAgents);

//create-order
router.post("/create-manual-order", createManualOrder);
router.post("/add-deposit", addDeposit);
router.get("/getManualOrderStatics", checkAuth, getManualOrderStatics);

module.exports = router;
