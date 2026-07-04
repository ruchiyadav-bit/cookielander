const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, default: null }
});

module.exports = mongoose.model("Setting", settingSchema);
