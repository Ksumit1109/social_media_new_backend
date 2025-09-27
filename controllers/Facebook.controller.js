const Review = require("../models/Review.model");

exports.createReview = async (req, res) => {
  try {
    let { name, comment } = req.body;

    let review = new Review({
      name,
      comment,
    });
    review = await review.save();
    return res.status(201).json({
      errorcode: 0,
      status: true,
      message: "review added successfully",
      data: null,
    });
  } catch (error) {
    return res.status(204).json({
      errorcode: 5,
      status: false,
      message: error.message,
      data: error,
    });
  }
};

exports.editReview = async (req, res) => {
  try {
    let { id, name, comment } = req.body;
    if (!id)
      return res.status(207).json({
        errorcode: 1,
        status: false,
        message: "Id should present",
        data: null,
      });

    let editReview = await Review.findById(id);
    if (!editReview)
      return res.status(207).json({
        errorcode: 2,
        status: false,
        message: "Review not found",
        data: null,
      });

    editReview.name = name ? name : editReview.name;
    editReview.comment = comment ? comment : editReview.comment;

    await editReview.save();

    return res.status(201).json({
      errorcode: 0,
      status: false,
      message: "Review Edit Successfully",
      data: editReview,
    });
  } catch (error) {
    console.log("Error:", error);
    return res.status(500).json({
      errorcode: 5,
      status: false,
      message: "Internal server error",
      data: error,
    });
  }
};

exports.getAllReview = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    let reviewList = await Review.find({})
      .sort({ created_ts: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalReviews = await Review.countDocuments({});

    return res.status(200).json({
      errorcode: 0,
      status: true,
      message: "Get all reviews successfully",
      data: reviewList,
      total: totalReviews,
      page: parseInt(page),
      pages: Math.ceil(totalReviews / limit),
    });
  } catch (error) {
    return res.status(204).json({
      errorcode: 5,
      status: false,
      message: error.message,
      data: error,
    });
  }
};

exports.getReviewById = async (req, res) => {
  try {
    let { id } = req.params;

    let review = await Review.findOne({ _id: id });
    if (!review)
      return res.status(404).json({
        errorcode: 2,
        status: true,
        message: "Review Id not found",
        data: null,
      });

    return res.status(200).json({
      errorcode: 0,
      status: true,
      message: "Get Review Successfully by Id",
      data: review,
    });
  } catch (error) {
    console.log("error", error.message);
    return res.status(500).json({
      errorcode: 5,
      status: false,
      message: "Internal server error",
      data: error,
    });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    let { reviewId } = req.params;
    if (!reviewId)
      return res.status(403).json({
        errorcode: 2,
        status: false,
        message: "Review id should be present",
        data: null,
      });

    let reviews = await Review.findById({ _id: reviewId });
    if (!reviews)
      return res.status(404).json({
        errorcode: 2,
        status: false,
        message: "Review not found",
        data: null,
      });

    await Review.deleteOne({ _id: reviewId });
    return res.status(200).json({
      errorcode: 0,
      status: true,
      message: "Review deleted successfully",
      data: null,
    });
  } catch (error) {
    console.log("error", error.message);
    return res.status(500).json({
      errorcode: 5,
      status: false,
      message: "Internal server error",
      data: error,
    });
  }
};

exports.searchReviews = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    const query = {
      $or: [{ name: { $regex: q, $options: "i" } }],
    };
    const reviews = await Review.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ created_ts: -1 });

    const total = await Review.countDocuments(query);

    return res.status(200).json({
      errorcode: 0,
      status: true,
      message: "Search Reviews Successfully",
      data: reviews,
      total,
    });
  } catch (error) {
    console.log("error", error.message);
    return res.status(500).json({
      errorcode: 5,
      status: false,
      message: "Server error",
      data: error.message,
    });
  }
};
