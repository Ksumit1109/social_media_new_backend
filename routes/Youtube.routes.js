const express = require("express");
const router = express.Router();
const Controller = require("../controllers/Youtube.controller");

router.post("/info", Controller.info);
router.patch("/download", Controller.download);
router.get("/playlist/info", Controller.playListInfo);
router.get("/playlist/download", Controller.playListDownload);
router.delete("/mp3", Controller.mp3);
router.get("/shorts", Controller.shorts);

module.exports = router;
