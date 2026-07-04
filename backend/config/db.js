// ============================================================================
//  MongoDB connection (via Mongoose)
//
//  Replaces the previous embedded SQLite (better-sqlite3) setup. On first
//  connect, a single admin account is seeded so you can log in immediately
//  without creating an account manually.
// ============================================================================

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const PolicyTemplate = require("../models/PolicyTemplate");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/landingpagesaas";

const ALL_FEATURES = {
  cookie_banner: true,
  age_gate: true,
  email_newsletter: true,
  ai_generation: true,
  custom_templates: true,
  email_export: true,
  analytics: true,
  landing_pages: true,
  popup_module: true,
  policy_template_edit: false
};

async function seedUsers() {
  const seeds = [
    {
      name: "Admin",
      email: (process.env.SEED_ADMIN_EMAIL || "hello@kushalarora.in").toLowerCase(),
      password: process.env.SEED_ADMIN_PASSWORD || "admin123",
      role: "admin"
    }
  ];

  for (const s of seeds) {
    const existing = await User.findOne({ email: s.email });
    if (!existing) {
      await User.create({
        name: s.name,
        email: s.email,
        password: bcrypt.hashSync(s.password, 12),
        role: s.role,
        features_enabled: ALL_FEATURES
      });
      console.log(`👤 Seeded ${s.role} login → ${s.email} / ${s.password}`);
    }
  }
}

// Default, Google-Ads-safe-sounding copy for the 8 (type x niche) PolicyTemplate
// docs. Kept short and generic on purpose — admins can edit the shared
// defaults from the Policy Template Manager, and {{domain}}/{{brand}}
// placeholders are substituted only at generation time (policy.controller.js).
const NICHE_LABEL = {
  cbd: "CBD and hemp-derived wellness products",
  nutra: "nutraceutical and dietary supplement products"
};

const NICHE_PRODUCT_NOUN = {
  cbd: "CBD products",
  nutra: "supplements"
};

function defaultHeader(niche) {
  return `<nav style="display:flex;justify-content:space-between;align-items:center;"><strong>{{brand}}</strong><span style="font-size:13px;color:#888;">${niche === "cbd" ? "CBD & Wellness" : "Nutraceuticals"}</span></nav>`;
}

function defaultFooter() {
  return `<p>&copy; ${new Date().getFullYear()} {{brand}}. All rights reserved. &middot; <a href="/privacy" style="color:#777;">Privacy</a> &middot; <a href="/terms" style="color:#777;">Terms</a> &middot; <a href="/contact" style="color:#777;">Contact</a></p>`;
}

function defaultBody(type, niche) {
  const category = NICHE_LABEL[niche];
  const noun = NICHE_PRODUCT_NOUN[niche];

  const bodies = {
    privacy: `
<p>{{brand}} ("we", "us", or "our") respects your privacy. This Privacy Policy explains what information we collect when you visit {{domain}}, how we use it, and the choices you have.</p>
<p>We collect basic information you voluntarily provide to us, such as your name and email address, when you contact us or subscribe to updates about our ${category}. We may also collect standard technical information (like browser type and IP address) through cookies and analytics tools to help us improve the site.</p>
<p>We do not sell your personal information. We may share information with trusted service providers (such as payment processors or email providers) solely to operate {{brand}} and never for unrelated marketing purposes.</p>
<p>You may request access to, correction of, or deletion of your personal information at any time by contacting us. We retain information only as long as reasonably necessary for the purposes described here or as required by law.</p>
<p>This policy may be updated periodically; continued use of {{domain}} after changes are posted constitutes acceptance of the updated policy.</p>`,
    terms: `
<p>These Terms & Conditions ("Terms") govern your use of {{domain}} and any ${noun} or content offered by {{brand}}. By accessing this site, you agree to these Terms.</p>
<p>All content on {{domain}}, including product descriptions, images, and educational material about ${category}, is provided for general informational purposes only and does not constitute medical, legal, or professional advice.</p>
<p>${niche === "cbd"
      ? "Products referenced on this site are intended for adults only. Please check your local regulations before purchasing, as availability and legality of CBD products vary by jurisdiction."
      : "Products referenced on this site have not been evaluated by the FDA and are not intended to diagnose, treat, cure, or prevent any disease. Consult a healthcare professional before use."}</p>
<p>{{brand}} makes reasonable efforts to keep information on {{domain}} accurate and up to date but does not guarantee completeness or accuracy. Use of this site is at your own discretion and risk.</p>
<p>{{brand}} reserves the right to modify these Terms at any time. Continued use of {{domain}} after changes are posted constitutes your acceptance of the revised Terms.</p>`,
    contact: `
<p>We'd love to hear from you. If you have questions about {{brand}}, our ${category}, or anything else on {{domain}}, please reach out using the information below.</p>
<p>Email: <a href="mailto:support@{{domain}}">support@{{domain}}</a></p>
<p>We aim to respond to all inquiries within 1-2 business days. For fastest service, please include your name and a brief description of your question or concern.</p>
<p>{{brand}} values customer feedback and uses it to continually improve our site and offerings.</p>`,
    disclaimer: `
<p>The information provided on {{domain}} by {{brand}} is for general informational purposes only. All information on the site is provided in good faith; however, we make no representation or warranty of any kind regarding the accuracy, adequacy, or completeness of any information on this site.</p>
<p>${niche === "cbd"
      ? "Statements regarding CBD and hemp-derived products have not been evaluated by the FDA. These products are not intended to diagnose, treat, cure, or prevent any disease, and are not intended for use by anyone under the age of 21."
      : "Statements regarding dietary supplements on this site have not been evaluated by the FDA. These products are not intended to diagnose, treat, cure, or prevent any disease. Individual results may vary."}</p>
<p>Always consult with a qualified healthcare professional before starting any new ${niche === "cbd" ? "CBD" : "supplement"} regimen, especially if you are pregnant, nursing, taking medication, or have a medical condition.</p>
<p>Under no circumstance shall {{brand}} be liable for any loss or damage of any kind incurred as a result of the use of {{domain}} or reliance on any information provided on this site.</p>`
  };
  return bodies[type];
}

// Default page heading (H1) per type — matches policy.controller.js's
// titleMap so a freshly-seeded template's generated page looks right even
// before an admin edits it.
const DEFAULT_HEADING = {
  privacy: "Privacy Policy",
  terms: "Terms & Conditions",
  contact: "Contact Us",
  disclaimer: "Disclaimer"
};

async function seedPolicyTemplates() {
  const niches = ["cbd", "nutra"];
  const types = ["privacy", "terms", "contact", "disclaimer"];

  for (const niche of niches) {
    for (const type of types) {
      const existing = await PolicyTemplate.findOne({ type, niche });
      if (existing) continue;
      await PolicyTemplate.create({
        type,
        niche,
        heading: DEFAULT_HEADING[type],
        header_content: defaultHeader(niche),
        body_content: defaultBody(type, niche),
        footer_content: defaultFooter()
      });
      console.log(`📄 Seeded policy template → ${niche}/${type}`);
    }
  }
}

async function testConnection() {
  // serverSelectionTimeoutMS bumped from the 10s default — on some Windows
  // networks the mongodb+srv:// DNS lookup / initial handshake to Atlas is
  // slower than 10s, which surfaces to callers as "buffering timed out".
  // family: 4 avoids IPv6-resolution stalls that cause the same symptom on
  // some Windows/ISP setups.
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 20000,
    family: 4
  });
  console.log(`✅ MongoDB connected → ${MONGODB_URI}`);
  await seedUsers();
  await seedPolicyTemplates();
}

module.exports = { mongoose, testConnection };
