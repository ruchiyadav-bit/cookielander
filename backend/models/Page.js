const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["landing", "cookie", "age-verification", "newsletter", "popup", "privacy", "terms", "contact", "disclaimer", "other"],
      default: "landing"
    },
    domain: { type: String, default: null },
    html_content: { type: String, default: null },
    sheet_webhook: { type: String, default: null },
    image_display_mode: { type: String, enum: ["scroll", "single-section"], default: "single-section" },
    niche: { type: String, enum: ["cbd", "nutra", null], default: null },
    // Structured wizard state for type:"landing" projects only (industry,
    // AI-generated hero/about/features copy + image, and the integrated
    // widget's type/template/field values). Lets a saved Multiple Page LP
    // project be reopened in the wizard for further editing instead of only
    // ever being viewable as its final flattened html_content.
    landing_data: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

module.exports = mongoose.model("Page", pageSchema);
