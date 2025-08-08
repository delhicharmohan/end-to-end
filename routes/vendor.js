var express = require("express");
const isSuperAdmin = require("../helpers/middleware/isSuperAdmin");
const getUsers = require("../controllers/vendor/getUsers");
const createNewUser = require("../controllers/vendor/createNewUser");
const deleteUser = require("../controllers/vendor/deleteUser");
const updateUser = require("../controllers/vendor/updateUser");
const checkAuth = require("../helpers/middleware/checkAuth");
var router = express.Router();

// Get all sub admins
router.get("/", checkAuth, isSuperAdmin, getUsers);
// Create new sub admin
router.post("/", checkAuth, isSuperAdmin, createNewUser);
// Delete sub admin
router.delete("/:username", checkAuth, isSuperAdmin, deleteUser);
// Update sub admin
router.put("/:username", checkAuth, isSuperAdmin, updateUser);

module.exports = router;
