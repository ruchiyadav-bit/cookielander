const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Page = require("../models/Page");
const Email = require("../models/Email");
const Setting = require("../models/Setting");

exports.getStats = async (req, res) => {
  try {
    const [total_users, total_pages, total_emails] = await Promise.all([
      User.countDocuments(),
      Page.countDocuments(),
      Email.countDocuments()
    ]);
    res.json({ total_users, total_pages, total_emails });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getAllUsers = async (req, res) => {
  try {
    const rows = await User.find()
      .select("name email role features_enabled created_at team")
      .sort({ created_at: -1 });
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role = "user", team } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) return res.status(409).json({ message: "Email already in use" });

    const hash = await bcrypt.hash(password, 12);
    const defaultFeatures = { ai_generation: true, custom_templates: true, email_export: true, analytics: true, landing_pages: true, popup_module: true, policy_template_edit: false };
    const user = await User.create({ name, email: cleanEmail, password: hash, role, features_enabled: defaultFeatures, team: team || null });
    res.status(201).json({ id: user._id, name, email: cleanEmail, role, team: user.team });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, password, team } = req.body;
    const update = { name, email, role };
    if (password) update.password = await bcrypt.hash(password, 12);
    if (team !== undefined) update.team = team || null;
    await User.findByIdAndUpdate(req.params.id, update);
    res.json({ message: "User updated" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: "Cannot delete yourself" });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.toggleFeatures = async (req, res) => {
  try {
    const { features_enabled } = req.body;
    await User.findByIdAndUpdate(req.params.id, { features_enabled });
    res.json({ message: "Features updated", features_enabled });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getGlobalSheet = async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: "global_sheet_webhook" });
    res.json({ sheet_webhook: setting?.value || "" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.setGlobalSheet = async (req, res) => {
  try {
    const url = (req.body.sheet_webhook || "").trim();
    if (url && !/^https:\/\/script\.google\.com\//i.test(url)) {
      return res.status(400).json({ message: "Enter a valid Google Apps Script Web App URL (https://script.google.com/...)" });
    }
    await Setting.findOneAndUpdate(
      { key: "global_sheet_webhook" },
      { value: url || null },
      { upsert: true }
    );
    res.json({ message: url ? "Google Sheet connected" : "Disconnected", sheet_webhook: url });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getOrphanPages = async (req, res) => {
  try {
    const userIds = await User.distinct("_id");
    const rows = await Page.find({ user_id: { $nin: userIds } })
      .select("user_id type domain created_at");
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.recoverPages = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: "User not found. Create the user first, then recover." });

    const userIds = await User.distinct("_id");
    const result = await Page.updateMany(
      { user_id: { $nin: userIds } },
      { user_id: user._id }
    );
    res.json({ message: `${result.modifiedCount} pages recovered and assigned to ${email}` });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
