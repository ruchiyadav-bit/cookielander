const { generatePageContent, generateBlogContent, generateBusinessSite } = require("../services/openai.service");
const { fetchStockImage } = require("../services/image.service");

exports.generate = async (req, res) => {
  try {
    const { domain, type, templateName, extra } = req.body;
    if (!domain || !type || (!templateName && !extra?.fullDesign)) {
      return res.status(400).json({ message: "domain, type, and templateName are required" });
    }
    const content = await generatePageContent({ domain, type, templateName, extra });
    res.json(content);
  } catch (err) {
    console.error("OpenAI error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// Blog-style landing page (text via OpenAI + a stock image) for the
// "Create LP for Desktop" feature.
exports.generateLanding = async (req, res) => {
  try {
    const { domain, industry } = req.body;
    if (!domain) return res.status(400).json({ message: "domain is required" });
    const blog = await generateBlogContent({ domain, industry });
    // Prefer the AI's niche keyword, then the industry, then the domain.
    const imageUrl = await fetchStockImage(blog.imageKeyword || industry || domain);
    res.json({ ...blog, imageUrl });
  } catch (err) {
    console.error("Landing generation error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// 5-section business website (hero/about/features + a stock hero image) for
// the standalone Landing Page module. Kept as a separate endpoint from
// generateLanding above, since that one's blog shape is still relied on by
// the Cookie/Age/Newsletter modules' "Create LP for Desktop" feature.
exports.generateBusinessSite = async (req, res) => {
  try {
    const { domain, industry } = req.body;
    if (!domain) return res.status(400).json({ message: "domain is required" });
    const site = await generateBusinessSite({ domain, industry });
    const imageUrl = await fetchStockImage(site.imageKeyword || industry || domain);
    res.json({ ...site, imageUrl });
  } catch (err) {
    console.error("Business site generation error:", err.message);
    res.status(500).json({ message: err.message });
  }
};
