const express = require("express");
const router = express.Router();
const Controller = require("../controllers/Tiktok.controller");

router.post("/info", Controller.info);
router.post("/download", Controller.download);
router.post("/long", Controller.long);
router.post("/general", Controller.general);
router.post("/audio", Controller.audio);
module.exports = router;
