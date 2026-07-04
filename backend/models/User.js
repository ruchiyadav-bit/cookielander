const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    features_enabled: { type: mongoose.Schema.Types.Mixed, default: {} },
    sheet_webhook: { type: String, default: null },
    // The user's default niche/vertical ("team") — CBD or Nutra. Used to
    // pre-fill the niche selector wherever one is needed (e.g. the Multiple
    // Page LP wizard's compliance-page niche picker) so a user never has to
    // remember to pick it themselves.
    team: { type: String, enum: ["cbd", "nutra", null], default: null }
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

module.exports = mongoose.model("User", userSchema);
