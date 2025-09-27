const express = require("express");
const router = express.Router();
const Controller = require("../controllers/Youtube.controller");

router.post("/info", Controller.info);
router.post("/download", Controller.download);
router.post("/playlist/info", Controller.playListInfo);
router.post("/playlist/download", Controller.playListDownload);
router.post("/mp3", Controller.mp3);
router.post("/shorts", Controller.shorts);

module.exports = router;
