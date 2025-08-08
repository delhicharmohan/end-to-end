var express = require("express");
const isAdmin = require("../helpers/middleware/isAdmin");
const getUsers = require("../controllers/support-user/getUsers");
const createNewUser = require("../controllers/support-user/createNewUser");
const deleteUser = require("../controllers/support-user/deleteUser");
const updateUser = require("../controllers/support-user/updateUser");
const checkAuth = require("../helpers/middleware/checkAuth");
const getDashboardTicketStatics = require("../controllers/support-user/getDashboardTicketStatics");
var router = express.Router();

// Get all support users
router.get("/", checkAuth, isAdmin, getUsers);
router.get("/getDashboardTicketStatics", checkAuth, getDashboardTicketStatics);
// Create new support user
router.post("/", checkAuth, isAdmin, createNewUser);
// Delete support user
router.delete("/:username", checkAuth, isAdmin, deleteUser);
// Update support user
router.put("/:username", checkAuth, isAdmin, updateUser);

module.exports = router;
