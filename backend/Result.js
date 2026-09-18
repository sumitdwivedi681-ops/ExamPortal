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

// Indexes for fast result lookups and score history queries
resultSchema.index({ student_email: 1, course: 1 });
resultSchema.index({ student_email: 1, exam_date: -1 });

module.exports = mongoose.model("Result", resultSchema);

