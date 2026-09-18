const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  course: String,
  question_title: String, // Matching your existing 1.8K questions
  optionA: String,
  optionB: String,
  optionC: String,
  optionD: String,
  answer: String,
}, {
  collection: 'Questions' // Match your Atlas collection name exactly
});

// Index for fast course queries across 1.8k+ questions
questionSchema.index({ course: 1 });

module.exports = mongoose.model("Question", questionSchema);

