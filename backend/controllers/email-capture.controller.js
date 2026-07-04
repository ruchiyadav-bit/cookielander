const mongoose = require("mongoose");
const Page = require("../models/Page");
const Email = require("../models/Email");
const Setting = require("../models/Setting");
const ExcelJS = require("exceljs");

exports.capture = async (req, res) => {
  try {
    const { page_id, email, redirect_url } = req.body;
    if (!page_id || !email) return res.status(400).json({ message: "page_id and email required" });

    const page = await Page.findById(page_id);
    if (!page) return res.status(404).json({ message: "Page not found" });

    const cleanEmail = email.toLowerCase().trim();
    try {
      await Email.create({ page_id, email: cleanEmail });
    } catch (e) {
      if (e.code !== 11000) throw e; // ignore duplicate (page_id, email) — same as MySQL's INSERT IGNORE
    }

    // If the admin connected a Google Sheet (Apps Script webhook), append
    // the email to it. Fire-and-forget so it never blocks the visitor's submit.
    try {
      const globalSetting = await Setting.findOne({ key: "global_sheet_webhook" });
      const hook = page.sheet_webhook || globalSetting?.value;
      if (hook) {
        fetch(hook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, page_id, timestamp: new Date().toISOString() })
        }).catch(() => {});
      }
    } catch (e) { /* ignore sheet errors */ }

    if (redirect_url) return res.json({ redirect: redirect_url });
    res.status(201).json({ message: "Subscribed" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getByPage = async (req, res) => {
  try {
    const page = await Page.findOne({ _id: req.params.pageId, user_id: req.user.id });
    if (!page) return res.status(403).json({ message: "Not authorised" });

    const rows = await Email.find({ page_id: req.params.pageId })
      .select("email created_at")
      .sort({ created_at: -1 });
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.stats = async (req, res) => {
  try {
    const rows = await Page.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $lookup: {
          from: "emails",
          localField: "_id",
          foreignField: "page_id",
          as: "emails"
        }
      },
      {
        $project: {
          page_id: "$_id",
          type: 1,
          domain: 1,
          email_count: { $size: "$emails" },
          _id: 0
        }
      }
    ]);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Export as Excel
exports.exportExcel = async (req, res) => {
  try {
    const page = await Page.findOne({ _id: req.params.pageId, user_id: req.user.id }).select("_id domain");
    if (!page) return res.status(403).json({ message: "Not authorised" });

    const rows = await Email.find({ page_id: req.params.pageId })
      .select("email created_at")
      .sort({ created_at: -1 });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Subscribers");
    ws.columns = [
      { header: "Email", key: "email", width: 35 },
      { header: "Subscribed At", key: "created_at", width: 25 }
    ];
    ws.getRow(1).font = { bold: true };
    rows.forEach(r => ws.addRow({ email: r.email, created_at: new Date(r.created_at).toLocaleString() }));

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="subscribers-page-${req.params.pageId}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Export as CSV
exports.exportCsv = async (req, res) => {
  try {
    const page = await Page.findOne({ _id: req.params.pageId, user_id: req.user.id }).select("_id");
    if (!page) return res.status(403).json({ message: "Not authorised" });

    const rows = await Email.find({ page_id: req.params.pageId })
      .select("email created_at")
      .sort({ created_at: -1 });

    const csv = ["email,subscribed_at", ...rows.map(r => `${r.email},${new Date(r.created_at).toISOString()}`)].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="subscribers-page-${req.params.pageId}.csv"`);
    res.send(csv);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
