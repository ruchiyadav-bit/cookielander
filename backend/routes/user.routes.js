const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const User = require("../models/User");
const Setting = require("../models/Setting");
const bcrypt = require("bcryptjs");

// GET /api/users/me
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("name email role features_enabled created_at team");
    if (!user) return res.status(404).json({ message: "Not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/me
router.put("/me", authenticate, async (req, res) => {
  try {
    const { name, password, team } = req.body;
    const update = { name };
    if (password) update.password = await bcrypt.hash(password, 12);
    if (team !== undefined) update.team = team || null;
    await User.findByIdAndUpdate(req.user.id, update);
    res.json({ message: "Profile updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/me/sheet — returns the global sheet URL set by admin (read-only for users)
router.get("/me/sheet", authenticate, async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: "global_sheet_webhook" });
    res.json({ sheet_webhook: setting?.value || "" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/users/me
router.delete("/me", authenticate, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
