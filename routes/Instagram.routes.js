const express = require("express");
const router = express.Router();
const Controller = require("../controllers/Review.controller");

router.post("/create-review", Controller.createReview);
router.patch("/edit-review", Controller.editReview);
router.get("/get-all-reviews", Controller.getAllReview);
router.get("/get-review-by-id/:id", Controller.getReviewById);
router.delete("/delete/:reviewId", Controller.deleteReview);
router.get("/search", Controller.searchReviews);

module.exports = router;
