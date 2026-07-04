const mongoose = require("mongoose");

const emailSchema = new mongoose.Schema(
  {
    page_id: { type: mongoose.Schema.Types.ObjectId, ref: "Page", required: true },
    email: { type: String, required: true, lowercase: true, trim: true }
  },
  { timestamps: { createdAt: "created_at", updatedAt: false }, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

emailSchema.index({ page_id: 1, email: 1 }, { unique: true });

module.exports = mongoose.model("Email", emailSchema);
