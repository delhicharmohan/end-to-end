const express = require("express");
const router = express.Router();

const checkAuth = require("../helpers/middleware/checkAuth");
const isAdmin = require("../helpers/middleware/isAdmin");
const getReports = require("../controllers/reports/getReports");
const generateReport = require("../controllers/reports/generateReport");
const getWebsites = require("../controllers/reports/getWebsites");
const userReport = require("../controllers/reports/userReport");

router.get("/", checkAuth, isAdmin, getReports);
router.post("/", checkAuth, isAdmin, generateReport);
router.get("/websites", checkAuth, getWebsites);
router.get("/userReport", checkAuth, isAdmin, userReport);

module.exports = router;
