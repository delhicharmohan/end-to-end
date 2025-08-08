const express = require("express");
const LicenceController = require("../controllers/mobile/LicenceController");
const KeyController = require("../controllers/mobile/KeyController");
const checkToken = require("../helpers/middleware/checkToken");
const checkTokenWithExtra = require("../helpers/middleware/checkTokenWithExtra");

const router = express.Router();
const licenceController = new LicenceController();
const keyController = new KeyController();





router.post("/login", async (req, res) => {
    await licenceController.login(req, res);
});


router.get("/me", checkToken, async (req, res) => {
    await licenceController.me(req, res);
});


router.get("/get-templates", checkToken, async (req, res) => {
    await licenceController.getTemplates(req, res);
});

router.post("/set-device", checkToken, async (req, res) => {
    await licenceController.setDevice(req, res);
});

// Route for validating licence
router.post("/validate-licence", async (req, res) => {
    await licenceController.validateLicence(req, res);
});

// Route for other function
router.post("/register-licence", async (req, res) => {
    await licenceController.registerLicence(req, res);
});

router.post("/revoke-licence", async (req, res) => {
    await licenceController.revokeLicence(req, res);
});


router.post("/generate-key", checkToken, async (req, res) => {
    await keyController.generateKey(req, res);
});


router.post("/public-key-validation", checkTokenWithExtra, async (req, res) => {
    await keyController.testFunction(req, res);
});




module.exports = router;