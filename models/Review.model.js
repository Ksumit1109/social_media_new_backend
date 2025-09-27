const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  name: {
    type: String,
    default: null,
  },
  comment: {
    type: String,
    default: null,
  },
  created_ts: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Review", reviewSchema);
