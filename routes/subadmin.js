var express = require("express");
const multer = require("multer");

// Set up Multer to handle file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const isAdmin = require("../helpers/middleware/isAdmin");
const getUsers = require("../controllers/subadmin/getUsers");
const createNewUser = require("../controllers/subadmin/createNewUser");
const deleteUser = require("../controllers/subadmin/deleteUser");
const updateUser = require("../controllers/subadmin/updateUser");
const addCustomerUtr = require("../controllers/subadmin/addCustomerUtr");
const uploadScreenshot = require("../controllers/subadmin/uploadScreenshot");
const checkAuth = require("../helpers/middleware/checkAuth");
var router = express.Router();

// Get all sub admins
router.get("/", checkAuth, isAdmin, getUsers);
// Create new sub admin
router.post("/", checkAuth, isAdmin, createNewUser);
// Delete sub admin
router.delete("/:username", checkAuth, isAdmin, deleteUser);
// Update sub admin
router.put("/:username", checkAuth, isAdmin, updateUser);
// add customer utr
router.post("/:refID/addCustomerUtr", checkAuth, addCustomerUtr);
router.post("/:refID/upload-screenshot", checkAuth, upload.single("upload_screenshot"), uploadScreenshot);

module.exports = router;
