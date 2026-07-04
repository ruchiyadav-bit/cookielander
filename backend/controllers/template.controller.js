const Template = require("../models/Template");

exports.getAll = async (req, res) => {
  try {
    const rows = await Template.find({ user_id: req.user.id }).sort({ created_at: -1 });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const template = await Template.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!template) return res.status(404).json({ message: "Template not found" });
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, type, content } = req.body;
    const template = await Template.create({ user_id: req.user.id, name, type, content });
    res.status(201).json({ id: template._id, name, type });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, type, content } = req.body;
    await Template.findOneAndUpdate({ _id: req.params.id, user_id: req.user.id }, { name, type, content });
    res.json({ message: "Template updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await Template.findOneAndDelete({ _id: req.params.id, user_id: req.user.id });
    res.json({ message: "Template deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
