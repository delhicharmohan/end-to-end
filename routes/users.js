var express = require("express");
const isAdmin = require("../helpers/middleware/isAdmin");
const isSubAdmin = require("../helpers/middleware/isSubAdmin");
const getUsers = require("../controllers/users/getUsers");
const getUsersWithRole = require("../controllers/users/getUsersWithRole");
const getResetPasswordUsers = require("../controllers/users/getResetPasswordUsers");
const createNewUser = require("../controllers/users/createNewUser");
const deleteUser = require("../controllers/users/deleteUser");
const updateUser = require("../controllers/users/updateUser");
const changeUserStatus = require("../controllers/users/changeUserStatus");
const updatePassword = require("../controllers/users/updatePassword");
const updateUniqueIdentifier = require("../controllers/users/updateUniqueIdentifier");
const checkAuth = require("../helpers/middleware/checkAuth");
const logoutUser = require("../controllers/users/logoutUser");
var router = express.Router();
const multer = require("multer");

// Set up Multer to handle file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Get all users
router.get("/", checkAuth, isAdmin, getUsers);
// Get all users with role
router.get("/:role", checkAuth, getUsersWithRole);
// Create new user
router.put("/", checkAuth, isAdmin, upload.single("qr_picture"), createNewUser);
// Logout a user
router.put("/:username/:status", checkAuth, isAdmin, logoutUser);
// Delete user
router.delete("/:username", checkAuth, isAdmin, deleteUser);
// Update user
router.post("/:username", checkAuth, isAdmin, upload.single("qr_picture"), updateUser);
// Update user status
router.post("/:username/status", checkAuth, isAdmin, changeUserStatus);
// Update user Unique Identifier
router.post("/:username/updateUniqueIdentifier", checkAuth, updateUniqueIdentifier);
// Get all reset password users
router.get("/:vendor/getResetPasswordUsers", checkAuth, isSubAdmin, getResetPasswordUsers);
// Update user password
router.post("/:username/updatePassword", checkAuth, isSubAdmin, updatePassword);

module.exports = router;
