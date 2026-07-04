// ============================================================================
//  One-time migration: run this once after updating SEED_ADMIN_EMAIL /
//  SEED_ADMIN_PASSWORD in backend/.env, to bring the *existing* database in
//  line with the new values (changing the .env alone only affects what gets
//  seeded into an EMPTY database — it does not touch users that already
//  exist).
//
//  What it does:
//    1. Deletes the demo "vishal@launchigo.in" user, if present.
//    2. Finds the existing admin (by role, or by the old default email
//       hello@kushalarora.in) and updates its email + password to the
//       values currently set in SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
//       If no admin exists yet, creates one instead.
//
//  Usage (from the backend/ folder, with a working MONGODB_URI in .env):
//    node scripts/fix-users.js
// ============================================================================

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/landingpagesaas";
const NEW_ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || "").toLowerCase();
const NEW_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "";
const OLD_DEMO_USER_EMAIL = "vishal@launchigo.in";
const OLD_ADMIN_EMAIL_FALLBACK = "hello@kushalarora.in";

async function main() {
  if (!NEW_ADMIN_EMAIL || !NEW_ADMIN_PASSWORD) {
    console.error("❌ SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not set in backend/.env — aborting.");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 20000, family: 4 });
  console.log(`✅ Connected → ${MONGODB_URI}`);

  // 1. Remove the demo user.
  const removed = await User.deleteOne({ email: OLD_DEMO_USER_EMAIL });
  if (removed.deletedCount) {
    console.log(`🗑️  Removed demo user → ${OLD_DEMO_USER_EMAIL}`);
  } else {
    console.log(`ℹ️  No demo user found at ${OLD_DEMO_USER_EMAIL} (already removed / never existed)`);
  }

  // 2. Update (or create) the admin.
  const hashedPassword = bcrypt.hashSync(NEW_ADMIN_PASSWORD, 12);
  let admin = await User.findOne({ role: "admin" }) || await User.findOne({ email: OLD_ADMIN_EMAIL_FALLBACK });

  if (admin) {
    admin.email = NEW_ADMIN_EMAIL;
    admin.password = hashedPassword;
    admin.role = "admin";
    await admin.save();
    console.log(`✏️  Updated existing admin → ${NEW_ADMIN_EMAIL} / ${NEW_ADMIN_PASSWORD}`);
  } else {
    await User.create({
      name: "Admin",
      email: NEW_ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin",
      features_enabled: {
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
      }
    });
    console.log(`👤 Created new admin → ${NEW_ADMIN_EMAIL} / ${NEW_ADMIN_PASSWORD}`);
  }

  console.log("✅ Done.");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});
