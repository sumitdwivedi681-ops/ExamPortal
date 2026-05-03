const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
  student_email: String,
  course: String,
  score: Number,
  total: Number,
  exam_date: {
    type: Date,
    default: Date.now,
  },
}, {
  collection: 'Results' // Match your Atlas collection name exactly
});

module.exports = mongoose.model("Result", resultSchema);
