const mongoose = require("mongoose");

const templateSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, trim: true },
    type: { type: String, default: "other" },
    content: { type: String, default: null }
  },
  { timestamps: { createdAt: "created_at", updatedAt: false }, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

module.exports = mongoose.model("Template", templateSchema);
