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

module.exports = mongoose.model("Question", questionSchema);
