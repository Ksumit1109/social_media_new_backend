const express = require("express");
const router = express.Router();
const Controller = require("../controllers/Facebook.controller");

router.post("/info", Controller.info);
router.post("/download", Controller.download);
router.post("/video", Controller.video);
router.post("/watch", Controller.watch);

module.exports = router;
