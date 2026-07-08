import React, { useState, useMemo, useEffect } from "react";
import api from "../../utils/api";
import Stepper from "../../components/Stepper";
import DevicePreviewFrame from "../../components/DevicePreviewFrame";
import { COOKIE_TEMPLATES, generateAIDesign, applyAdvancedStyles, applyScrollableCookieBackground, applyCookiePreviewScrollDemo, generateDesktopLPPage } from "../../utils/templates";
import { downloadAsZip } from "../../utils/zipHelper";

const STEPS = ["Domain", "Design", "Edit Content", "Preview & Save"];

function TypographyRow({ title, form, setForm, sizeKey, weightKey, formatKey }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-600 mb-1.5">{title}</p>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Size (px)</label>
          <input type="number" className="input text-xs" placeholder="auto" value={form[sizeKey]}
            onChange={e => setForm({ ...form, [sizeKey]: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Weight</label>
          <select className="input text-xs" value={form[weightKey]}
            onChange={e => setForm({ ...form, [weightKey]: e.target.value })}>
            <option value="">Default</option>
            <option value="400">Normal</option>
            <option value="500">Medium</option>
            <option value="600">Semibold</option>
            <option value="700">Bold</option>
            <option value="800">Extrabold</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Format</label>
          <select className="input text-xs" value={form[formatKey]}
            onChange={e => setForm({ ...form, [formatKey]: e.target.value })}>
            <option value="normal">Normal</option>
            <option value="uppercase">Uppercase</option>
            <option value="italic">Italic</option>
          </select>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_HEADLINE = "We Use Cookie";
const DEFAULT_BODY = `To improve your browsing experience and analyze site traffic, we use cookies. By clicking "Accept", you consent to our use of cookies. You can decline if you prefer limited functionality.`;

const empty = {
  domain: "", privacyUrl: "/privacy", acceptUrl: "", declineUrl: "", closeUrl: "",
  bgType: "color", bgColor: "", bgImage: "", bgOpacity: 0.6,
  advancedEnabled: false, headingColor: "", subColor: "", boxColor: "",
  fontSize: "", fontWeight: "", format: "normal",
  subFontSize: "", subFontWeight: "", subFormat: "normal",
  buttonColor: "", buttonTextColor: "", btnFontSize: "", btnFontWeight: "", btnFormat: "normal",
  buttonWidth: "", buttonPaddingX: "", buttonPaddingY: "",
  contentAlign: "", buttonLayout: "",
  scrollBgEnabled: false, scrollBgType: "color", scrollBgColor: "#f8fafc",
  scrollBgDesktopImages: ["", "", ""], scrollBgPhoneImages: ["", "", ""], scrollBgImages: ["", "", ""],
  scrollBgBlur: 0, scrollBgOpacity: 0.25
};
const emptyContent = {
  headline: DEFAULT_HEADLINE, bodyCopy: DEFAULT_BODY, ctaText: "", imagePrompt: "",
  acceptText: "Accept", declineText: "Decline"
};

export default function CookiePage() {
  const [step, setStep]         = useState(0);
  const [mode, setMode]         = useState(null); // "default" | "ai"
  const [form, setForm]         = useState(empty);
  const [template, setTemplate] = useState(null);
  const [aiDesign, setAiDesign] = useState(null); // { icon, accentColor, animation }
  const [referenceImage, setReferenceImage] = useState(""); // base64 data URL of an uploaded/pasted screenshot
  const [content, setContent]   = useState(emptyContent);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState("");
  // "Create LP for Desktop" feature
  const [desktopLP, setDesktopLP] = useState(false);
  const [blogLP, setBlogLP]       = useState(null);   // { title, subtitle, intro, sections, imageUrl }
  const [lpDomain, setLpDomain]   = useState("");     // landing page domain
  const [lpIndustry, setLpIndustry] = useState("");   // industry → drives blog topic
  const [lpLoading, setLpLoading] = useState(false);
  const [lpError, setLpError]     = useState("");
  const [lpImage, setLpImage]     = useState(""); // user-uploaded blog image (overrides AI image)

  const handleLpImage = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = () => setLpImage(r.result);
    r.readAsDataURL(file);
  };

  const [previewMode, setPreviewMode] = useState("desktop"); // "desktop" | "mobile"

  // The cookie consent page itself (the selected template / AI design).
  const consentHtml = useMemo(() => {
    if (!content.headline) return "";
    let html = "";
    if (mode === "ai") {
      if (!aiDesign) return "";
      html = generateAIDesign({ ...form, ...content, ...aiDesign });
    } else {
      if (!template) return "";
      const tmpl = COOKIE_TEMPLATES.find(t => t.id === template);
      html = tmpl ? tmpl.generate({ ...form, ...content }) : "";
    }
    if (!html) return "";
    html = applyAdvancedStyles(html, {
      enabled: form.advancedEnabled,
      headingColor: form.headingColor, subColor: form.subColor, boxColor: form.boxColor,
      fontSize: form.fontSize, fontWeight: form.fontWeight, format: form.format,
      subFontSize: form.subFontSize, subFontWeight: form.subFontWeight, subFormat: form.subFormat,
      buttonColor: form.buttonColor, buttonTextColor: form.buttonTextColor,
      btnFontSize: form.btnFontSize, btnFontWeight: form.btnFontWeight, btnFormat: form.btnFormat,
      buttonWidth: form.buttonWidth, buttonPaddingX: form.buttonPaddingX, buttonPaddingY: form.buttonPaddingY,
      contentAlign: form.contentAlign, buttonLayout: form.buttonLayout
    });

    return applyScrollableCookieBackground(html, {

      enabled: form.scrollBgEnabled,

      type: form.scrollBgType,

      color: form.scrollBgColor,

      desktopImages: form.scrollBgDesktopImages,

      phoneImages: form.scrollBgPhoneImages,


      images: form.scrollBgImages,

      blur: form.scrollBgBlur,

      opacity: form.scrollBgOpacity

    });
  }, [mode, template, aiDesign, content, form]);

  const lpActive = desktopLP && !!blogLP;
  const lpBlog = lpImage && blogLP ? { ...blogLP, imageUrl: lpImage } : blogLP;

  // What gets saved / downloaded — real device detection on the live page.
  const outputHtml = useMemo(() =>
    lpActive ? generateDesktopLPPage({ blog: lpBlog, consentHtml, domain: lpDomain || form.domain }) : consentHtml,
    [lpActive, lpBlog, consentHtml, lpDomain, form.domain]);

  const previewConsentHtml = useMemo(() => applyCookiePreviewScrollDemo(consentHtml), [consentHtml]);

  // What the in-app preview shows — forced by the desktop/phone toggle.
  const previewHtml = useMemo(() =>
    lpActive ? generateDesktopLPPage({ blog: lpBlog, consentHtml: previewConsentHtml, domain: lpDomain || form.domain, mode: previewMode }) : previewConsentHtml,
    [lpActive, lpBlog, previewConsentHtml, lpDomain, form.domain, previewMode]);

  const generateLanding = async () => {
    const domain = (lpDomain || form.domain).trim();
    if (!domain) return;
    setLpError(""); setLpLoading(true);
    try {
      const { data } = await api.post("/api/generate/landing", { domain, industry: lpIndustry.trim() });
      setBlogLP(data);
    } catch (err) {
      setLpError(err.response?.data?.message || "Landing page generation failed");
    } finally { setLpLoading(false); }
  };

  const generateFullAIDesign = async () => {
    setError(""); setGenerating(true);
    try {
      const { data } = await api.post("/api/generate", {
        domain: form.domain,
        type: "cookie",
        extra: { fullDesign: true, referenceImage: referenceImage || undefined }
      });
      const { icon, accentColor, animation, ...textContent } = data;
      setAiDesign({ icon, accentColor, animation });
      setContent(c => ({ ...c, ...textContent }));
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "AI design generation failed");
    } finally { setGenerating(false); }
  };

  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setReferenceImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleScrollBgImage = (file, index, target = "phone") => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm(f => {
        const key = target === "desktop" ? "scrollBgDesktopImages" : "scrollBgPhoneImages";
        const images = [...(f[key] || ["", "", ""] )];
        images[index] = reader.result;
        return { ...f, [key]: images, scrollBgType: "image" };
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e) => {
    const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith("image/"));
    if (item) handleImageFile(item.getAsFile());
  };

  const useDefault = () => setStep(2);

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/api/pages", { type: "cookie", domain: form.domain, html_content: outputHtml });
      setSaved(true);
    } catch { setError("Failed to save"); }
    finally { setSaving(false); }
  };

  // Editing the output marks it unsaved again (re-enables save + re-triggers auto-save).
  useEffect(() => { setSaved(false); }, [outputHtml]);

  // Auto-save to page history when the final preview becomes visible.
  useEffect(() => {
    if (step === 3 && outputHtml && !saved && !saving) save();
  }, [step, outputHtml]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">
          <i className="fa-solid fa-cookie-bite mr-2" style={{ color: "#059669" }} />Cookie Banner Generator
        </h1>
        <p className="text-slate-500 text-sm mt-1">Generate a GDPR-compliant cookie consent banner with AI</p>
      </div>

      <Stepper steps={STEPS} current={step} />

      {/* Step 0: Domain */}
      {step === 0 && (
        <div className="card max-w-lg">
          <h2 className="font-semibold text-slate-800 mb-5 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <i className="fa-solid fa-globe text-emerald-600" />
            </div>
            Your Domain
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project name *</label>
              <input className="input" placeholder="e.g. Acme Cookie Banner" value={form.domain}
                onChange={e => setForm({ ...form, domain: e.target.value })} />
              <p className="text-xs text-slate-400 mt-1">Used to save and identify this project.</p>
            </div>

            {/* Create LP for Desktop */}
            <div className="border border-slate-100 rounded-lg p-3 bg-slate-50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={desktopLP}
                  onChange={e => { setDesktopLP(e.target.checked); setLpError(""); }}
                  className="w-4 h-4 accent-emerald-500" />
                <span className="text-xs font-semibold text-slate-700">
                  <i className="fa-solid fa-desktop mr-1.5 text-emerald-500" />Create LP for Desktop
                </span>
              </label>
              {desktopLP && (
                <div className="mt-3">
                  <p className="text-xs text-slate-500 mb-3">
                    Desktop visitors see an AI-generated blog landing page; the cookie popup only shows on mobile.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Domain *</label>
                      <input className="input text-sm" placeholder="e.g. acme.com" value={lpDomain}
                        onChange={e => setLpDomain(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Industry *</label>
                      <input className="input text-sm" placeholder="e.g. Fitness, Finance, Travel" value={lpIndustry}
                        onChange={e => setLpIndustry(e.target.value)} />
                    </div>
                  </div>
                  {blogLP ? (
                    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-2">
                      <img src={blogLP.imageUrl} alt="" className="w-16 h-12 object-cover rounded" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{blogLP.title}</p>
                        <p className="text-xs text-slate-400 truncate">{blogLP.subtitle}</p>
                      </div>
                      <button type="button" onClick={generateLanding} disabled={lpLoading}
                        className="text-xs text-emerald-500 hover:text-emerald-600 whitespace-nowrap">
                        <i className="fa-solid fa-rotate mr-1" />Regenerate
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={generateLanding} disabled={lpLoading || !lpDomain.trim() || !lpIndustry.trim()}
                      className="btn-secondary text-xs">
                      {lpLoading
                        ? <><i className="fa-solid fa-spinner fa-spin mr-1.5" />Generating landing page…</>
                        : <><i className="fa-solid fa-wand-magic-sparkles mr-1.5" />Generate blog landing page</>}
                    </button>
                  )}
                  {lpError && <p className="text-red-500 text-xs mt-2">{lpError}</p>}
                  {blogLP && (
                    <div className="mt-2">
                      {lpImage ? (
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2">
                          <img src={lpImage} alt="" className="w-16 h-12 object-cover rounded" />
                          <span className="text-xs text-slate-600 flex-1">Your blog image</span>
                          <button type="button" onClick={() => setLpImage("")} className="text-xs text-red-400 hover:text-red-500">Remove</button>
                        </div>
                      ) : (
                        <label className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 cursor-pointer">
                          <i className="fa-solid fa-image" />Upload your own blog image
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleLpImage(e.target.files?.[0])} />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button className="btn-primary"
              disabled={!form.domain.trim() || lpLoading || (desktopLP && (!lpDomain.trim() || !lpIndustry.trim() || !blogLP))}
              onClick={() => setStep(1)}>
              Continue <i className="fa-solid fa-arrow-right ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Choose mode — default template vs full AI design */}
      {step === 1 && (
        <div>
          {!mode && (
            <div>
              <h2 className="font-semibold text-slate-800 mb-4">
                <i className="fa-solid fa-swatchbook mr-2 text-emerald-500" />How do you want to create this banner?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <button onClick={() => setMode("default")}
                  className="card text-left p-6 hover:shadow-md hover:border-emerald-200 transition-all">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-3" style={{ background: "#ecfdf5" }}>
                    <i className="fa-solid fa-layer-group text-lg" style={{ color: "#059669" }} />
                  </div>
                  <p className="font-semibold text-slate-800 mb-1">Use Default</p>
                  <p className="text-xs text-slate-500">Pick from ready-made designs and edit the text.</p>
                </button>
                <button onClick={() => setMode("ai")}
                  className="card text-left p-6 hover:shadow-md hover:border-emerald-200 transition-all">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-3" style={{ background: "#1e293b" }}>
                    <i className="fa-solid fa-wand-magic-sparkles text-lg text-white" />
                  </div>
                  <p className="font-semibold text-slate-800 mb-1">Generate Full AI Design</p>
                  <p className="text-xs text-slate-500">AI writes the copy AND picks the icon, accent color, and entrance animation — a one-of-a-kind design, not from the template list.</p>
                </button>
              </div>
              <button className="btn-secondary" onClick={() => setStep(0)}>
                <i className="fa-solid fa-arrow-left mr-2" />Back
              </button>
            </div>
          )}

          {mode === "default" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800">
                  <i className="fa-solid fa-swatchbook mr-2 text-emerald-500" />Choose a template
                </h2>
                <button className="text-xs text-slate-400 hover:text-slate-600" onClick={() => { setMode(null); setTemplate(null); }}>
                  <i className="fa-solid fa-rotate-left mr-1" />Change mode
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                {COOKIE_TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => setTemplate(t.id)}
                    className={`card text-left p-3 transition-all hover:shadow-md cursor-pointer
                      ${template === t.id ? "ring-2 ring-emerald-500 border-emerald-200" : "hover:border-slate-300"}`}>
                    <div className="w-full h-32 rounded-lg mb-3 overflow-hidden relative bg-slate-100 flex items-center justify-center">
                      <iframe
                        srcDoc={t.generate({
                          headline: DEFAULT_HEADLINE, bodyCopy: DEFAULT_BODY,
                          acceptText: "Accept", declineText: "Decline",
                          domain: form.domain || "example.com"
                        })}
                        title={t.name}
                        sandbox=""
                        style={{ width: 700, height: 460, transform: "scale(0.26)", transformOrigin: "center", border: "none", pointerEvents: "none" }}
                      />
                    </div>
                    <p className="text-xs font-semibold text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t.description}</p>
                    {template === t.id && <i className="fa-solid fa-circle-check text-emerald-500 mt-1" />}
                  </button>
                ))}
              </div>
              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
              <div className="flex gap-3 flex-wrap">
                <button className="btn-secondary" onClick={() => setStep(0)}>
                  <i className="fa-solid fa-arrow-left mr-2" />Back
                </button>
                <button className="btn-primary" disabled={!template}
                  onClick={useDefault}>
                  <i className="fa-solid fa-file-circle-check mr-2" />Use default content
                </button>
              </div>
            </div>
          )}

          {mode === "ai" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800">
                  <i className="fa-solid fa-wand-magic-sparkles mr-2 text-emerald-500" />Generate a full AI design
                </h2>
                <button className="text-xs text-slate-400 hover:text-slate-600" onClick={() => setMode(null)}>
                  <i className="fa-solid fa-rotate-left mr-1" />Change mode
                </button>
              </div>
              <div className="card max-w-lg mb-6">
                <p className="text-sm text-slate-600 mb-4">
                  AI will write the headline, body copy, and button text — and also choose a fitting icon, accent color, and entrance animation for <strong>{form.domain || "your brand"}</strong>. The result is centered on the page and unique each time, not picked from the fixed template list above.
                </p>

                <div className="border border-slate-100 rounded-lg p-3 bg-slate-50 mb-4">
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    <i className="fa-solid fa-image mr-1.5 text-emerald-500" />Optional — copy a design from a screenshot
                  </p>
                  <p className="text-xs text-slate-500 mb-3">Upload or paste (Ctrl+V) a screenshot of any cookie banner you like — AI will analyze its colors, icon, and copy style and replicate them for your brand.</p>

                  {referenceImage ? (
                    <div className="relative inline-block">
                      <img src={referenceImage} alt="Reference" className="max-h-32 rounded-lg border border-slate-200" />
                      <button type="button" onClick={() => setReferenceImage("")}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center hover:bg-slate-900">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label
                      onPaste={handlePaste}
                      tabIndex={0}
                      className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 rounded-lg py-5 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors focus:outline-none focus:border-emerald-400"
                    >
                      <i className="fa-solid fa-arrow-up-from-bracket text-slate-400" />
                      <span className="text-xs text-slate-500">Click to upload, or click here and press Ctrl+V to paste</span>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => handleImageFile(e.target.files?.[0])} />
                    </label>
                  )}
                </div>

                {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
                <button className="btn-primary w-full" disabled={generating} onClick={generateFullAIDesign}>
                  {generating
                    ? <><i className="fa-solid fa-spinner fa-spin mr-2" />Designing…</>
                    : referenceImage
                      ? <><i className="fa-solid fa-wand-magic-sparkles mr-2" />Generate Design From Screenshot</>
                      : <><i className="fa-solid fa-wand-magic-sparkles mr-2" />Generate Full AI Design</>}
                </button>
              </div>
              <button className="btn-secondary" onClick={() => setStep(0)}>
                <i className="fa-solid fa-arrow-left mr-2" />Back
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Content editor */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-semibold text-slate-800 mb-4">
              <i className="fa-solid fa-pen-to-square mr-2 text-emerald-500" />Edit Content
            </h2>
            <div className="space-y-4">
              {[
                { key: "headline",    label: "Headline (title)",    tag: "input" },
                { key: "bodyCopy",    label: "Subheading / Body Copy",   tag: "textarea" },
                { key: "acceptText",  label: "Accept Button Text", tag: "input" },
                { key: "declineText", label: "Decline Button Text", tag: "input" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                  {f.tag === "textarea"
                    ? <textarea rows={3} className="input resize-none text-sm" value={content[f.key]}
                        onChange={e => setContent({ ...content, [f.key]: e.target.value })} />
                    : <input className="input text-sm" value={content[f.key]}
                        onChange={e => setContent({ ...content, [f.key]: e.target.value })} />
                  }
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Accept Button URL</label>
                  <input className="input text-sm" placeholder="optional" value={form.acceptUrl}
                    onChange={e => {
                      const url = e.target.value;
                      setForm(f => ({ ...f, acceptUrl: url, closeUrl: f.closeUrl || url }));
                    }} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Decline Button URL</label>
                  <input className="input text-sm" placeholder="optional" value={form.declineUrl}
                    onChange={e => setForm({ ...form, declineUrl: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Close (✕) Button URL</label>
                <input className="input text-sm" placeholder="auto-filled from Accept URL" value={form.closeUrl}
                  onChange={e => setForm({ ...form, closeUrl: e.target.value })} />
                <p className="text-xs text-slate-400 mt-1">Where the ✕ close button redirects. Auto-filled from Accept URL.</p>
              </div>

              {/* Advanced — Background & Styling */}
              <div className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input type="checkbox" checked={form.advancedEnabled}
                    onChange={e => setForm({ ...form, advancedEnabled: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500" />
                  <span className="text-xs font-semibold text-slate-700">
                    <i className="fa-solid fa-sliders mr-1.5 text-emerald-500" />Advanced — Background &amp; Styling
                  </span>
                </label>

                {form.advancedEnabled && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1.5">Content Alignment</p>
                        <div className="flex gap-1">
                          {[
                            { v: "left",   icon: "fa-align-left" },
                            { v: "center", icon: "fa-align-center" },
                            { v: "right",  icon: "fa-align-right" },
                          ].map(o => (
                            <button key={o.v} type="button"
                              className={`flex-1 py-1.5 rounded-md border text-xs ${form.contentAlign === o.v ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-200"}`}
                              onClick={() => setForm({ ...form, contentAlign: form.contentAlign === o.v ? "" : o.v })}>
                              <i className={`fa-solid ${o.icon}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1.5">Button Layout</p>
                        <div className="flex gap-1">
                          <button type="button"
                            className={`flex-1 py-1.5 rounded-md border text-xs ${form.buttonLayout === "row" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-200"}`}
                            onClick={() => setForm({ ...form, buttonLayout: form.buttonLayout === "row" ? "" : "row" })}>
                            <i className="fa-solid fa-grip-lines mr-1" />Inline
                          </button>
                          <button type="button"
                            className={`flex-1 py-1.5 rounded-md border text-xs ${form.buttonLayout === "column" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-200"}`}
                            onClick={() => setForm({ ...form, buttonLayout: form.buttonLayout === "column" ? "" : "column" })}>
                            <i className="fa-solid fa-grip-lines-vertical mr-1" />Column
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Background type */}
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1.5">Page Background</p>
                      <div className="flex gap-2 mb-2">
                        <button type="button"
                          className={`flex-1 text-xs font-semibold py-1.5 rounded-md border ${form.bgType === "color" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-200"}`}
                          onClick={() => setForm({ ...form, bgType: "color" })}>
                          <i className="fa-solid fa-fill-drip mr-1" />Color
                        </button>
                        <button type="button"
                          className={`flex-1 text-xs font-semibold py-1.5 rounded-md border ${form.bgType === "image" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-200"}`}
                          onClick={() => setForm({ ...form, bgType: "image" })}>
                          <i className="fa-solid fa-image mr-1" />Image
                        </button>
                      </div>
                      {form.bgType === "color" ? (
                        <div className="flex items-center gap-2">
                          <input type="color" value={form.bgColor || "#0f172a"}
                            onChange={e => setForm({ ...form, bgColor: e.target.value })}
                            className="w-10 h-9 rounded border border-slate-200 cursor-pointer" />
                          <input className="input text-sm flex-1" placeholder="#0f172a" value={form.bgColor}
                            onChange={e => setForm({ ...form, bgColor: e.target.value })} />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input className="input text-sm flex-1" placeholder="Background image URL" value={form.bgImage}
                              onChange={e => setForm({ ...form, bgImage: e.target.value })} />
                            <label className="btn-secondary text-sm cursor-pointer whitespace-nowrap flex items-center">
                              <i className="fa-solid fa-upload mr-1" />Upload
                              <input type="file" accept="image/*" className="hidden" onChange={e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = () => setForm(f => ({ ...f, bgImage: reader.result }));
                                reader.readAsDataURL(file);
                                e.target.value = "";
                              }} />
                            </label>
                          </div>
                          {form.bgImage && <img src={form.bgImage} alt="bg preview" className="w-full h-24 object-cover rounded-lg border border-slate-200" />}
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Dark overlay opacity: {form.bgOpacity}</label>
                            <input type="range" min="0" max="0.9" step="0.05" value={form.bgOpacity}
                              onChange={e => setForm({ ...form, bgOpacity: parseFloat(e.target.value) })}
                              className="w-full" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* BG Scroll: fake website background behind the fixed cookie popup */}
                    <div className="border border-slate-100 rounded-lg p-3 bg-white">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!form.scrollBgEnabled}
                          onChange={e => setForm({ ...form, scrollBgEnabled: e.target.checked })}
                          className="w-4 h-4 accent-emerald-500" />
                        <span className="text-xs font-semibold text-slate-700">
                          <i className="fa-solid fa-scroll mr-1.5 text-emerald-500" />BG Scroll
                        </span>
                      </label>

                      {form.scrollBgEnabled && (
                        <div className="mt-3 space-y-3">
                          <div className="flex gap-2">
                            <button type="button"
                              className={`flex-1 text-xs font-semibold py-1.5 rounded-md border ${form.scrollBgType === "color" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-200"}`}
                              onClick={() => setForm({ ...form, scrollBgType: "color" })}>
                              <i className="fa-solid fa-fill-drip mr-1" />Color
                            </button>
                            <button type="button"
                              className={`flex-1 text-xs font-semibold py-1.5 rounded-md border ${form.scrollBgType === "image" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-200"}`}
                              onClick={() => setForm({ ...form, scrollBgType: "image" })}>
                              <i className="fa-solid fa-image mr-1" />Image
                            </button>
                          </div>

                          {form.scrollBgType === "color" ? (
                            <div className="flex items-center gap-2">
                              <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(form.scrollBgColor) ? form.scrollBgColor : "#f8fafc"}
                                onChange={e => setForm({ ...form, scrollBgColor: e.target.value })}
                                className="w-10 h-9 rounded border border-slate-200 cursor-pointer" />
                              <input className="input text-sm flex-1" placeholder="#f8fafc" value={form.scrollBgColor || ""}
                                onChange={e => setForm({ ...form, scrollBgColor: e.target.value })} />
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {(!desktopLP ? [
                                { key: "desktop", label: "Desktop BG Images", images: form.scrollBgDesktopImages || ["", "", ""] },
                                { key: "phone", label: "Phone BG Images", images: form.scrollBgPhoneImages || ["", "", ""] }
                              ] : [
                                { key: "phone", label: "Phone BG Images", images: form.scrollBgPhoneImages || ["", "", ""] }
                              ]).map(group => (
                                <div key={group.key}>
                                  <p className="text-xs font-medium text-slate-600 mb-1.5">{group.label}</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {[0, 1, 2].map(i => (
                                      <div key={i} className="border border-slate-200 rounded-lg p-2 bg-slate-50">
                                        {group.images?.[i] ? (
                                          <div className="relative">
                                            <img src={group.images[i]} alt={`${group.label} ${i + 1}`} className="w-full h-20 object-cover rounded-md" />
                                            <button type="button"
                                              onClick={() => {
                                                const key = group.key === "desktop" ? "scrollBgDesktopImages" : "scrollBgPhoneImages";
                                                const images = [...(form[key] || ["", "", ""])];
                                                images[i] = "";
                                                setForm({ ...form, [key]: images });
                                              }}
                                              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center hover:bg-slate-900">
                                              x
                                            </button>
                                          </div>
                                        ) : (
                                          <label className="h-20 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-slate-200 rounded-md cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30">
                                            <i className="fa-solid fa-upload text-slate-400" />
                                            <span className="text-[11px] text-slate-500">Image {i + 1}</span>
                                            <input type="file" accept="image/*" className="hidden"
                                              onChange={e => { handleScrollBgImage(e.target.files?.[0], i, group.key); e.target.value = ""; }} />
                                          </label>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Blury: {form.scrollBgBlur || 0}px</label>
                              <input type="range" min="0" max="18" step="1" value={form.scrollBgBlur || 0}
                                onChange={e => setForm({ ...form, scrollBgBlur: parseInt(e.target.value, 10) || 0 })}
                                className="w-full" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Opacity: {form.scrollBgOpacity ?? 0.25}</label>
                              <input type="range" min="0" max="0.8" step="0.05" value={form.scrollBgOpacity ?? 0.25}
                                onChange={e => setForm({ ...form, scrollBgOpacity: parseFloat(e.target.value) })}
                                className="w-full" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>


                    {/* Color fields */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: "headingColor",    label: "Heading Color" },
                        { key: "subColor",        label: "Subcontent Color" },
                        { key: "buttonColor",     label: "Button Color" },
                        { key: "buttonTextColor", label: "Button Text Color" },
                        { key: "boxColor",        label: "Cookie Box Color" },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={form[f.key] || "#000000"}
                              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                              className="w-8 h-8 rounded border border-slate-200 cursor-pointer" />
                            <input className="input text-xs flex-1" placeholder="auto" value={form[f.key]}
                              onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Typography — Heading */}
                    <TypographyRow title="Typography (Heading)" form={form} setForm={setForm}
                      sizeKey="fontSize" weightKey="fontWeight" formatKey="format" />

                    {/* Typography — Subheading */}
                    <TypographyRow title="Typography (Subheading / Body)" form={form} setForm={setForm}
                      sizeKey="subFontSize" weightKey="subFontWeight" formatKey="subFormat" />

                    {/* Typography — Button */}
                    <TypographyRow title="Typography (Button Text)" form={form} setForm={setForm}
                      sizeKey="btnFontSize" weightKey="btnFontWeight" formatKey="btnFormat" />

                    {/* Button width & spacing */}
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1.5">Button Size &amp; Spacing</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Width</label>
                          <select className="input text-xs" value={form.buttonWidth}
                            onChange={e => setForm({ ...form, buttonWidth: e.target.value })}>
                            <option value="">Auto</option>
                            <option value="full">Full width</option>
                            <option value="120">120px</option>
                            <option value="160">160px</option>
                            <option value="200">200px</option>
                            <option value="240">240px</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Padding X (px)</label>
                          <input type="number" className="input text-xs" placeholder="24" value={form.buttonPaddingX}
                            onChange={e => setForm({ ...form, buttonPaddingX: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Padding Y (px)</label>
                          <input type="number" className="input text-xs" placeholder="13" value={form.buttonPaddingY}
                            onChange={e => setForm({ ...form, buttonPaddingY: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-secondary" onClick={() => setStep(1)}>
                <i className="fa-solid fa-arrow-left mr-1" />Back
              </button>
              <button className="btn-primary" onClick={() => setStep(3)}>
                Preview <i className="fa-solid fa-arrow-right ml-1" />
              </button>
            </div>
          </div>
          {/* Live mini preview */}
          <div className="card self-start lg:sticky lg:top-6">
            <h2 className="font-semibold text-slate-800 mb-3 text-sm">
              <i className="fa-solid fa-eye mr-2 text-emerald-500" />Live Preview
            </h2>
            {consentHtml
              ? <DevicePreviewFrame html={consentHtml} height={340} title="preview" />
              : <div className="flex items-center justify-center h-48 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">Fill fields to see preview</div>
            }
          </div>
        </div>
      )}

      {/* Step 3: Preview + download + save */}
      {step === 3 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">
              <i className="fa-solid fa-eye mr-2 text-emerald-500" />Final Preview
            </h2>
            <div className="flex gap-3 items-center">
              {lpActive && (
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                  <button onClick={() => setPreviewMode("desktop")} title="Desktop view"
                    className={`px-2.5 py-1 rounded-md text-sm ${previewMode === "desktop" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}>
                    <i className="fa-solid fa-desktop" />
                  </button>
                  <button onClick={() => setPreviewMode("mobile")} title="Phone view"
                    className={`px-2.5 py-1 rounded-md text-sm ${previewMode === "mobile" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}>
                    <i className="fa-solid fa-mobile-screen-button" />
                  </button>
                </div>
              )}
              <button onClick={() => setStep(2)} className="btn-secondary text-sm">
                <i className="fa-solid fa-arrow-left mr-1" />Edit
              </button>
              <button onClick={() => downloadAsZip(outputHtml, `cookie-${form.domain}`)} className="btn-secondary text-sm">
                <i className="fa-solid fa-download mr-1" />Download ZIP
              </button>
              <button onClick={save} disabled={saving || saved} className="btn-primary text-sm">
                {saving ? <><i className="fa-solid fa-spinner fa-spin mr-1" />Saving…</>
                 : saved ? <><i className="fa-solid fa-check mr-1" />Saved!</>
                 :         <><i className="fa-solid fa-floppy-disk mr-1" />Save Page</>}
              </button>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          {lpActive && previewMode === "mobile" ? (
            <div className="flex justify-center bg-slate-100 rounded-xl py-6" style={{ minHeight: 600 }}>
              <div className="bg-black rounded-[2rem] p-2 shadow-xl" style={{ width: 390 }}>
                <iframe srcDoc={previewHtml} title="Final preview (phone)" className="w-full bg-white rounded-[1.5rem]" style={{ height: 720 }} sandbox="allow-scripts" />
              </div>
            </div>
          ) : (
            <div className="card">
              <DevicePreviewFrame html={previewHtml} height={520} title="Final preview" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
