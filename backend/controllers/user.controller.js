const User = require("../models/User");
const bcrypt = require("bcryptjs");

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("name email created_at");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const { name, password } = req.body;
    const update = { name };
    if (password) update.password = await bcrypt.hash(password, 12);
    await User.findByIdAndUpdate(req.user.id, update);
    res.json({ message: "Profile updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteMe = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
