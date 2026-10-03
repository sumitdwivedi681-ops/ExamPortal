const mongoose = require("mongoose");

const chatLogSchema = new mongoose.Schema({
  user_email: { type: String, default: "Guest Student" },
  user_name: { type: String, default: "Guest" },
  message: { type: String, required: true },
  response: { type: String, required: true },
  topic: { type: String, default: "general" }, // 'owner_info', 'subject', 'guide', 'course_request', 'general'
  asked_about_owner: { type: Boolean, default: false },
  course_requested: { type: String, default: "" },
  language: { type: String, default: "hinglish" },
  user_ip: { type: String, default: "" },
}, { 
  timestamps: true,
  collection: 'SaarthiChatLogs'
});

// Index for fast querying by topic and creator inquiries
chatLogSchema.index({ asked_about_owner: 1, createdAt: -1 });
chatLogSchema.index({ topic: 1 });
chatLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ChatLog", chatLogSchema);
