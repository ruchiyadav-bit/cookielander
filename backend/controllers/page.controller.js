const Page = require("../models/Page");
const archiver = require("archiver");

exports.getAll = async (req, res) => {
  try {
    const rows = await Page.find({ user_id: req.user.id })
      .select("user_id type domain created_at updated_at")
      .sort({ created_at: -1 });
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getById = async (req, res) => {
  try {
    const page = await Page.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.json(page);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const { type, domain, html_content, sheet_webhook, image_display_mode, niche, landing_data } = req.body;
    const hook = (sheet_webhook || "").trim() || null;
    const displayMode = image_display_mode || "single-section";
    const pageNiche = niche || null;
    // One save slot per project: a project is identified by (user, type, name).
    // Re-saving the same project name overrides the existing record instead of
    // creating a duplicate in page history.
    if (domain) {
      const existing = await Page.findOne({ user_id: req.user.id, type, domain });
      if (existing) {
        existing.html_content = html_content;
        existing.sheet_webhook = hook;
        existing.image_display_mode = displayMode;
        existing.niche = pageNiche;
        if (landing_data !== undefined) existing.landing_data = landing_data;
        await existing.save();
        return res.status(200).json({ id: existing._id, type, domain, updated: true });
      }
    }
    const page = await Page.create({
      user_id: req.user.id,
      type,
      domain: domain || null,
      html_content,
      sheet_webhook: hook,
      image_display_mode: displayMode,
      niche: pageNiche,
      landing_data: landing_data || null
    });
    res.status(201).json({ id: page._id, type, domain });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.update = async (req, res) => {
  try {
    const { type, domain, html_content, image_display_mode, niche, landing_data } = req.body;
    const update = { type, domain: domain || null, html_content };
    if (image_display_mode !== undefined) update.image_display_mode = image_display_mode || "single-section";
    if (niche !== undefined) update.niche = niche || null;
    if (landing_data !== undefined) update.landing_data = landing_data;
    const page = await Page.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      update
    );
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.json({ message: "Updated" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.remove = async (req, res) => {
  try {
    const page = await Page.findOneAndDelete({ _id: req.params.id, user_id: req.user.id });
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ZIP download
exports.download = async (req, res) => {
  try {
    const page = await Page.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!page) return res.status(404).json({ message: "Page not found" });
    const filename = `${page.type}-${page._id}`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.zip"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);
    archive.append(page.html_content, { name: "index.html" });
    await archive.finalize();
  } catch (err) { res.status(500).json({ message: err.message }); }
};
