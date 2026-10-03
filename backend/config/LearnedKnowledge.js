const mongoose = require("mongoose");

const learnedKnowledgeSchema = new mongoose.Schema({
  topic: { type: String, required: true, trim: true },
  fact: { type: String, required: true, trim: true },
  learned_from_name: { type: String, default: "Student" },
  learned_from_email: { type: String, default: "" },
  verified: { type: Boolean, default: true }
}, {
  timestamps: true,
  collection: "SaarthiLearnedKnowledge"
});

learnedKnowledgeSchema.index({ topic: 1 });
learnedKnowledgeSchema.index({ createdAt: -1 });

module.exports = mongoose.model("LearnedKnowledge", learnedKnowledgeSchema);
