const mongoose = require("mongoose");

const policyTemplateSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["privacy", "terms", "contact", "disclaimer"], required: true },
    niche: { type: String, enum: ["cbd", "nutra"], required: true },
    // The page's H1 / title text — editable per (type, niche) just like the
    // body copy. Falls back to a sensible per-type default at generation
    // time (see policy.controller.js) if left blank.
    heading: { type: String, default: "" },
    header_content: { type: String, default: "" },
    body_content: { type: String, default: "" },
    footer_content: { type: String, default: "" },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

policyTemplateSchema.index({ type: 1, niche: 1 }, { unique: true });

module.exports = mongoose.model("PolicyTemplate", policyTemplateSchema);
