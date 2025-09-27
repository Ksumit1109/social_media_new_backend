const express = require("express");
const router = express.Router();
const Controller = require("../controllers/Instagram.controller");

router.post("/info", Controller.info);
router.post("/download", Controller.download);
router.post("/story", Controller.story);
router.post("/photo", Controller.photo);
router.post("/highlights", Controller.highlights);
router.post("/profile", Controller.profile);

module.exports = router;
