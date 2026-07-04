const PolicyTemplate = require("../models/PolicyTemplate");
const Page = require("../models/Page");
const User = require("../models/User");

const POLICY_TYPES = ["privacy", "terms", "contact", "disclaimer"];

function substitute(str, domain, brand) {
  if (!str) return "";
  return str
    .split("{{domain}}").join(domain)
    .split("{{brand}}").join(brand);
}

const DEFAULT_TITLES = {
  privacy: "Privacy Policy",
  terms: "Terms & Conditions",
  contact: "Contact Us",
  disclaimer: "Disclaimer"
};

function buildPolicyHtml({ type, domain, header, body, footer, heading }) {
  const title = heading || DEFAULT_TITLES[type] || type;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} | ${domain}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    color: #222;
    background: #fff;
    line-height: 1.6;
  }
  header.policy-header {
    padding: 24px 32px;
    border-bottom: 1px solid #e5e5e5;
    font-weight: 600;
    font-size: 20px;
  }
  main.policy-body {
    max-width: 760px;
    margin: 0 auto;
    padding: 40px 24px;
  }
  main.policy-body h1 {
    font-size: 26px;
    margin-bottom: 16px;
  }
  main.policy-body p {
    margin: 0 0 16px;
    color: #333;
  }
  footer.policy-footer {
    padding: 24px 32px;
    border-top: 1px solid #e5e5e5;
    font-size: 13px;
    color: #777;
    text-align: center;
  }
</style>
</head>
<body>
<header class="policy-header">${header}</header>
<main class="policy-body">
<h1>${title}</h1>
${body}
</main>
<footer class="policy-footer">${footer}</footer>
</body>
</html>`;
}

// POST /api/generate/policy-pages
exports.generatePolicyPages = async (req, res) => {
  try {
    const { domain, niche } = req.body;
    if (!domain) return res.status(400).json({ message: "domain is required" });
    if (!niche || !["cbd", "nutra"].includes(niche)) {
      return res.status(400).json({ message: "niche is required and must be 'cbd' or 'nutra'" });
    }

    const templates = await PolicyTemplate.find({ niche, type: { $in: POLICY_TYPES } });
    if (!templates.length) {
      return res.status(404).json({ message: `No policy templates found for niche '${niche}'` });
    }
    const byType = {};
    templates.forEach(t => { byType[t.type] = t; });

    const brand = domain;
    const results = [];

    for (const type of POLICY_TYPES) {
      const tpl = byType[type];
      if (!tpl) continue;

      const header = substitute(tpl.header_content, domain, brand);
      const body = substitute(tpl.body_content, domain, brand);
      const footer = substitute(tpl.footer_content, domain, brand);
      const heading = substitute(tpl.heading, domain, brand) || DEFAULT_TITLES[type];
      const html_content = buildPolicyHtml({ type, domain, header, body, footer, heading });

      // Same upsert-by-(user_id,type,domain) semantics as page.controller.create
      const existing = await Page.findOne({ user_id: req.user.id, type, domain });
      let page;
      if (existing) {
        existing.html_content = html_content;
        existing.niche = niche;
        await existing.save();
        page = existing;
      } else {
        page = await Page.create({
          user_id: req.user.id,
          type,
          domain,
          html_content,
          niche
        });
      }
      // `body` (raw substituted paragraph HTML) is included alongside the
      // full standalone `html_content` so callers that want to re-wrap the
      // policy copy in a different page chrome (e.g. the Landing Page
      // module's business-site header/footer) don't have to re-parse it.
      results.push({ id: page._id, type, domain, niche, updated: !!existing, html_content, body, heading });
    }

    res.json({ pages: results });
  } catch (err) {
    console.error("Policy page generation error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/policy-templates
exports.listPolicyTemplates = async (req, res) => {
  try {
    const rows = await PolicyTemplate.find().sort({ niche: 1, type: 1 });
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/admin/policy-templates/:id
exports.updatePolicyTemplate = async (req, res) => {
  try {
    const { heading, header_content, body_content, footer_content } = req.body;
    const update = { updated_by: req.user.id };
    if (heading !== undefined) update.heading = heading;
    if (header_content !== undefined) update.header_content = header_content;
    if (body_content !== undefined) update.body_content = body_content;
    if (footer_content !== undefined) update.footer_content = footer_content;

    const tpl = await PolicyTemplate.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!tpl) return res.status(404).json({ message: "Policy template not found" });
    res.json(tpl);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/admin/users/:id/policy-authorization
exports.setPolicyAuthorization = async (req, res) => {
  try {
    const { enabled } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { "features_enabled.policy_template_edit": !!enabled } },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Policy authorization updated", features_enabled: user.features_enabled });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
