const express = require("express");
const router = express.Router();

const { test, testAuth } = require("../controllers/sample");
const userController = require("../controllers/user");
const campaignController = require("../controllers/campaign");
const donationController = require("../controllers/donate");
const auth = require("../middlewares/auth");
const { isFundraiser, isAdmin, isDonatur } = require("../middlewares/auth");

router.get("/test", test);
router.post("/register", userController.register);
router.post("/login", userController.login);
router.get("/test-auth", auth, testAuth);

// Campaign routes
router.get("/campaigns", auth, campaignController.getAll);
router.get("/campaigns/:id", auth, campaignController.getById);
router.post("/campaigns", auth, isFundraiser, campaignController.create);
router.patch("/campaigns/:id/status", auth, isAdmin, campaignController.setStatus);
router.post("/campaigns/:id/disbursements", auth, isFundraiser, campaignController.requestDisbursement);
router.patch("/disbursements/:id/verify", auth, isAdmin, campaignController.verifyDisbursement);
router.get("/disbursements", auth, isAdmin, campaignController.getAllDisbursements);

// Donation routes
router.post("/donations", auth, isDonatur, donationController.createDonation);
router.get("/users/me/donations", auth, donationController.getDonationHistory);
router.get("/campaigns/:id/donations", auth, donationController.getDonationsByCampaign);

module.exports = router;