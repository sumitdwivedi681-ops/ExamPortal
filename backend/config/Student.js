const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  course: { type: String, required: true },
}, { 
  timestamps: true,
  collection: 'Users' // Match your Atlas collection name exactly
});

module.exports = mongoose.model("Student", studentSchema);
