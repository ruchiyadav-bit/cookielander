import React, { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import Stepper from "../../components/Stepper";
import DevicePreviewFrame from "../../components/DevicePreviewFrame";
import {
  generateBusinessSiteHTML, generatePolicyPageHTML,
  COOKIE_TEMPLATES, AGE_TEMPLATES, EMAIL_TEMPLATES, POPUP_TEMPLATES, POPUP_FIELD_DEFAULTS,
  applyAdvancedStyles, applyAgeAdvancedStyles, applyNewsletterAdvancedStyles, applyPopupAdvancedStyles,
  applyScrollableCookieBackground, applyScrollableWidgetBackground
} from "../../utils/templates";
import { downloadSiteAsZip } from "../../utils/zipHelper";

const STEPS = ["Domain", "Generate", "Integrate", "Edit Content", "Preview & Save"];

const INDUSTRY_PRESETS = [
  "Fitness", "Travel", "Software", "Real Estate", "Education", "Restaurant",
  "E-commerce", "Healthcare", "Board Games", "Finance", "Beauty", "Legal", "Automotive"
];

const FEATURE_ICONS = [
  "bolt", "shield-halved", "headset", "chart-line", "gem", "rocket",
  "thumbs-up", "heart", "star", "leaf", "lock", "gears",
  "comments", "hand-holding-heart", "truck-fast", "medal", "globe", "compass"
];

// Same size/weight/format triple used by the Cookie/Age/Newsletter/Popup
// modules' own "Advanced" sections — duplicated here (not shared import) to
// match the existing per-file pattern in this codebase.
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

const SCROLL_BG_DEFAULTS = {
  scrollBgEnabled: false,
  scrollBgType: "color",
  scrollBgColor: "#f8fafc",
  scrollBgDesktopImages: ["", "", ""],
  scrollBgPhoneImages: ["", "", ""],
  scrollBgBlur: 0,
  scrollBgOpacity: 0.25
};

// Widget types that can be embedded into index.html, each configured with the
// SAME content + advanced-styling option set as their standalone module
// (Cookie/Age-Verification/Newsletter/Popup), so this "lite" integration flow
// isn't actually lite — it's full parity, just reached from inside the
// Landing Page wizard instead of its own module.
const WIDGET_TYPES = {
  cookie: {
    label: "Cookie Banner", icon: "fa-cookie", templates: COOKIE_TEMPLATES, apply: applyAdvancedStyles,
    contentFields: [
      { key: "headline", label: "Headline (title)" },
      { key: "bodyCopy", label: "Subheading / Body Copy", area: true },
      { key: "acceptText", label: "Accept Button Text" },
      { key: "acceptUrl", label: "Accept Button URL" },
      { key: "declineText", label: "Decline Button Text" },
      { key: "declineUrl", label: "Decline Button URL" },
      { key: "closeUrl", label: "Close Button URL" }
    ],
    colorFields: [
      { key: "headingColor", label: "Heading Color" },
      { key: "subColor", label: "Subcontent Color" },
      { key: "buttonColor", label: "Button Color" },
      { key: "buttonTextColor", label: "Button Text Color" },
      { key: "boxColor", label: "Cookie Box Color" }
    ],
    flags: { boxRadius: false, btnRadius: false, boxShadow: false, bgToggle: true, popupQuick: false },
    defaultForm: {
      ...SCROLL_BG_DEFAULTS,
      bgType: "color", bgColor: "", bgImage: "", bgOpacity: 0.6,
      advancedEnabled: false, headingColor: "", subColor: "", boxColor: "",
      fontSize: "", fontWeight: "", format: "normal",
      subFontSize: "", subFontWeight: "", subFormat: "normal",
      buttonColor: "", buttonTextColor: "", btnFontSize: "", btnFontWeight: "", btnFormat: "normal",
      buttonWidth: "", buttonPaddingX: "", buttonPaddingY: "",
      contentAlign: "", buttonLayout: "",
      headline: "We Use Cookies",
      bodyCopy: "We use cookies to improve your browsing experience and analyze site traffic. By clicking “Accept”, you consent to our use of cookies.",
      acceptText: "Accept", acceptUrl: "", declineText: "Decline", declineUrl: "", closeUrl: ""
    }
  },
  "age-verification": {
    label: "Age Verification", icon: "fa-shield-halved", templates: AGE_TEMPLATES, apply: applyAgeAdvancedStyles,
    contentFields: [
      { key: "headline", label: "Headline (title)" },
      { key: "bodyCopy", label: "Body Copy", area: true },
      { key: "ctaText", label: "Confirm Button Text" },
      { key: "confirmUrl", label: "Confirm Button URL" },
      { key: "exitText", label: "Exit Button Text" },
      { key: "exitUrl", label: "Exit Button URL" }
    ],
    colorFields: [
      { key: "headingColor", label: "Heading Color" },
      { key: "subColor", label: "Subcontent Color" },
      { key: "boxColor", label: "Box Color" },
      { key: "confirmColor", label: "Confirm Btn Color" },
      { key: "confirmTextColor", label: "Confirm Btn Text Color" },
      { key: "exitColor", label: "Exit Btn Color" },
      { key: "exitTextColor", label: "Exit Btn Text Color" }
    ],
    flags: { boxRadius: true, btnRadius: true, boxShadow: true, bgToggle: true, popupQuick: false },
    defaultForm: {
      ...SCROLL_BG_DEFAULTS,
      bgType: "color", bgColor: "", bgImage: "", bgOpacity: 0.6,
      advancedEnabled: false, headingColor: "", subColor: "", boxColor: "",
      fontSize: "", fontWeight: "", format: "normal",
      subFontSize: "", subFontWeight: "", subFormat: "normal",
      confirmColor: "", confirmTextColor: "", exitColor: "", exitTextColor: "",
      btnFontSize: "", btnFontWeight: "", btnFormat: "normal",
      buttonWidth: "", buttonPaddingX: "", buttonPaddingY: "",
      boxRadius: "", btnRadius: "", boxShadow: "", contentAlign: "", buttonLayout: "",
      headline: "Age Verification",
      bodyCopy: "You must be 18 years or older to enter this site. Please verify your age to continue.",
      ctaText: "I am 18+", confirmUrl: "", exitText: "Exit", exitUrl: ""
    }
  },
  newsletter: {
    label: "Email Newsletter", icon: "fa-envelope", templates: EMAIL_TEMPLATES, apply: applyNewsletterAdvancedStyles,
    contentFields: [
      { key: "headline", label: "Headline (title)" },
      { key: "bodyCopy", label: "Body Copy", area: true },
      { key: "ctaText", label: "Button Text" },
      { key: "redirectUrl", label: "Redirect after Subscribe URL" },
      { key: "closeUrl", label: "Close Button URL" },
      { key: "placeholder", label: "Email Placeholder" }
    ],
    colorFields: [
      { key: "headingColor", label: "Heading Color" },
      { key: "subColor", label: "Subcontent Color" },
      { key: "boxColor", label: "Box Color" },
      { key: "btnColor", label: "Button Color" },
      { key: "btnTextColor", label: "Button Text Color" }
    ],
    flags: { boxRadius: true, btnRadius: true, boxShadow: false, bgToggle: true, popupQuick: false },
    defaultForm: {
      ...SCROLL_BG_DEFAULTS,
      bgType: "color", bgColor: "", bgImage: "", bgOpacity: 0.6,
      advancedEnabled: false, headingColor: "", subColor: "", boxColor: "",
      btnColor: "", btnTextColor: "",
      fontSize: "", fontWeight: "", format: "normal",
      subFontSize: "", subFontWeight: "", subFormat: "normal",
      btnFontSize: "", btnFontWeight: "", btnFormat: "normal",
      boxRadius: "", btnRadius: "", contentAlign: "", buttonLayout: "",
      headline: "Subscribe to Our Newsletter",
      bodyCopy: "Get the latest updates, offers and news straight to your inbox.",
      ctaText: "Subscribe", redirectUrl: "", closeUrl: "", placeholder: "Enter your email"
    }
  },
  popup: {
    label: "Popup", icon: "fa-window-restore", templates: POPUP_TEMPLATES, apply: applyPopupAdvancedStyles,
    contentFields: [
      { key: "heading", label: "Heading" },
      { key: "bodyCopy", label: "Body Copy", area: true },
      { key: "primaryText", label: "Primary Button Text" },
      { key: "primaryUrl", label: "Primary Button URL" },
      { key: "secondaryText", label: "Secondary Button Text" },
      { key: "secondaryUrl", label: "Secondary Button URL" }
    ],
    colorFields: [
      { key: "headingColor", label: "Heading Color" },
      { key: "subColor", label: "Body Text Color" }
    ],
    flags: { boxRadius: false, btnRadius: true, boxShadow: true, bgToggle: false, popupQuick: true },
    defaultForm: { ...POPUP_FIELD_DEFAULTS }
  }
};

const PAGE_TABS = [
  { key: "index", label: "Home", type: null },
  { key: "privacy", label: "Privacy", type: "privacy" },
  { key: "terms", label: "Terms", type: "terms" },
  { key: "disclaimer", label: "Disclaimer", type: "disclaimer" },
  { key: "contact", label: "Contact", type: "contact" }
];

// Category select with a list + a "+ New" option for anything not preset —
// used for the Industry field.
function CategoryDropdown({ value, onChange, options, placeholder = "Choose a category…" }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setAdding(false); }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const commitCustom = () => {
    const v = draft.trim();
    if (v) onChange(v);
    setDraft(""); setAdding(false); setOpen(false);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="input flex items-center justify-between text-left">
        <span className={value ? "text-slate-800" : "text-slate-400"}>{value || placeholder}</span>
        <i className={`fa-solid fa-chevron-down text-xs text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto py-1">
          {options.map(opt => (
            <button type="button" key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2 text-sm ${value === opt ? "bg-emerald-600 text-white font-medium" : "text-slate-700 hover:bg-emerald-50"}`}>
              {opt}
            </button>
          ))}
          {value && !options.includes(value) && (
            <button type="button" onClick={() => setOpen(false)}
              className="w-full text-left px-3.5 py-2 text-sm bg-emerald-600 text-white font-medium">
              {value} <span className="text-emerald-100 text-xs">(custom)</span>
            </button>
          )}

          <div className="border-t border-slate-100 mt-1 pt-1">
            {!adding ? (
              <button type="button" onClick={() => setAdding(true)}
                className="w-full text-left px-3.5 py-2 text-sm text-emerald-600 font-medium hover:bg-emerald-50">
                <i className="fa-solid fa-plus mr-1.5" />New category…
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                <input autoFocus className="input text-xs flex-1 py-1.5" placeholder="Type a custom industry"
                  value={draft} onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && commitCustom()} />
                <button type="button" onClick={commitCustom}
                  className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md px-2.5 py-1.5">
                  Add
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();

  // Reopening an already-saved project from Page History links here as
  // ?edit=<pageId>; when present, the wizard loads that page's persisted
  // landing_data instead of starting fresh.
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const [loadingProject, setLoadingProject] = useState(!!editId);

  const [step, setStep] = useState(0);

  // Step 0 — Domain / industry
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState("");

  // Step 1 — Generate (5-section business site copy)
  const [site, setSite] = useState(null); // { hero, about, features, imageUrl }
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [heroImage, setHeroImage] = useState(""); // user-uploaded override

  // Step 2 — Integrate a widget (optional)
  const [widgetType, setWidgetType] = useState("");       // "" | "cookie" | "age-verification" | "newsletter" | "popup"
  const [widgetTemplateId, setWidgetTemplateId] = useState(null);
  const [widgetForm, setWidgetForm] = useState({});

  // Step 3 — Edit content
  // Defaults to the user's own profile "team" (their usual niche) so they
  // never have to remember to pick it themselves — still fully overridable,
  // and a reopened saved project's own niche always takes priority (see the
  // "load an existing project" effect below).
  const [niche, setNiche] = useState(user?.team || "");   // "" | "cbd" | "nutra"
  const [policyGenerating, setPolicyGenerating] = useState(false);
  const [policyError, setPolicyError] = useState("");
  const [policyPages, setPolicyPages] = useState(null); // { privacy: {body,...}, terms: {...}, ... }

  // Step 4 — Preview & Save
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [previewMode, setPreviewMode] = useState("desktop");
  const [activeTab, setActiveTab] = useState("index");

  const effectiveImageUrl = heroImage || site?.imageUrl || "";

  const widgetConfig = widgetType ? WIDGET_TYPES[widgetType] : null;
  const widgetTemplate = widgetConfig?.templates.find(t => t.id === widgetTemplateId) || null;

  // Full standalone HTML of just the chosen widget, styled with the same
  // "Advanced" option set as its standalone module — used for the mobile
  // preview (which shows the widget itself) and as the source for embedding.
  const widgetStandaloneHtml = useMemo(() => {
    if (!widgetTemplate || !widgetConfig) return "";
    const raw = widgetTemplate.generate({ ...widgetForm, domain });
    const styled = widgetConfig.apply(raw, { ...widgetForm, enabled: widgetForm.advancedEnabled });
    const scrollOpts = {
      enabled: widgetForm.scrollBgEnabled,
      type: widgetForm.scrollBgType,
      color: widgetForm.scrollBgColor,
      desktopImages: widgetForm.scrollBgDesktopImages,
      phoneImages: widgetForm.scrollBgPhoneImages,
      blur: widgetForm.scrollBgBlur,
      opacity: widgetForm.scrollBgOpacity
    };
    if (widgetType === "cookie") return applyScrollableCookieBackground(styled, scrollOpts);
    if (widgetType === "age-verification") {
      return applyScrollableWidgetBackground(styled, {
        ...scrollOpts,
        overlaySelector: "#age-gate",
        modalSelector: "#age-box"
      });
    }
    if (widgetType === "newsletter") {
      return applyScrollableWidgetBackground(styled, {
        ...scrollOpts,
        overlaySelector: "#nl-overlay",
        modalSelector: "#nl-box"
      });
    }
    return styled;
  }, [widgetTemplate, widgetConfig, widgetType, widgetForm, domain]);

  // The real, deliverable index.html. If a widget is integrated, it's shown
  // in a full-screen iframe ONLY on phone-sized/mobile devices (hiding the
  // site behind it) — desktop visitors never see it at all and the site
  // renders completely normally. See generateBusinessSiteHTML for the actual
  // device-detection script; this is what gets saved and what goes in the ZIP.
  const indexHtmlFinal = useMemo(() => {
    if (!site) return "";
    return generateBusinessSiteHTML({
      domain, hero: site.hero, about: site.about, features: site.features,
      imageUrl: effectiveImageUrl, widgetHtml: widgetStandaloneHtml
    });
  }, [site, domain, effectiveImageUrl, widgetStandaloneHtml]);

  // A widget-free version of index.html used ONLY for in-app preview (the
  // desktop mockup in Step 3/Step 4, where we want to see the page layout
  // itself, not the phone-only widget behavior).
  const indexHtmlPreview = useMemo(() => {
    if (!site) return "";
    return generateBusinessSiteHTML({
      domain, hero: site.hero, about: site.about, features: site.features,
      imageUrl: effectiveImageUrl, widgetHtml: ""
    });
  }, [site, domain, effectiveImageUrl]);

  const policyHtmlByType = useMemo(() => {
    if (!policyPages) return {};
    const out = {};
    Object.entries(policyPages).forEach(([type, p]) => {
      out[type] = generatePolicyPageHTML({ type, domain, bodyHtml: p.body || "", heading: p.heading || "" });
    });
    return out;
  }, [policyPages, domain]);

  const pagesForZip = useMemo(() => ({
    index: indexHtmlFinal,
    privacy: policyHtmlByType.privacy || "",
    terms: policyHtmlByType.terms || "",
    disclaimer: policyHtmlByType.disclaimer || "",
    contact: policyHtmlByType.contact || ""
  }), [indexHtmlFinal, policyHtmlByType]);

  // Desktop tab preview always shows a clean page (home = widget-free).
  const activePageHtml = activeTab === "index" ? indexHtmlPreview : (policyHtmlByType[activeTab] || "");

  const generateSite = async () => {
    if (!domain.trim()) return;
    setGenError(""); setGenerating(true);
    try {
      const { data } = await api.post("/api/generate/business-site", { domain: domain.trim(), industry: industry.trim() });
      const { imageUrl, ...rest } = data;
      setSite({ hero: rest.hero, about: rest.about, features: rest.features, imageUrl });
      setHeroImage("");
    } catch (err) {
      setGenError(err.response?.data?.message || "Site generation failed");
    } finally { setGenerating(false); }
  };

  const handleHeroImage = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = () => setHeroImage(r.result);
    r.readAsDataURL(file);
  };

  const updateHero = (key, value) => setSite(s => ({ ...s, hero: { ...s.hero, [key]: value } }));
  const updateAbout = (key, value) => setSite(s => ({ ...s, about: { ...s.about, [key]: value } }));
  const updateFeature = (i, key, value) => setSite(s => {
    const features = [...(s.features || [])];
    features[i] = { ...features[i], [key]: value };
    return { ...s, features };
  });

  const chooseWidgetType = (type) => {
    setWidgetType(type);
    setWidgetTemplateId(null);
    setWidgetForm({});
  };
  const chooseWidgetTemplate = (id) => {
    const cfg = WIDGET_TYPES[widgetType];
    const tmpl = cfg.templates.find(t => t.id === id);
    setWidgetTemplateId(id);
    setWidgetForm({ ...cfg.defaultForm, ...(tmpl?.defaults || {}) });
  };
  const handleWidgetImage = (file, key = "imageUrl") => {
    if (!file || !file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = () => setWidgetForm(f => ({ ...f, [key]: r.result }));
    r.readAsDataURL(file);
  };
  const handleScrollBgImage = (file, index, target = "phone") => {
    if (!file || !file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = () => {
      setWidgetForm(f => {
        const key = target === "desktop" ? "scrollBgDesktopImages" : "scrollBgPhoneImages";
        const images = [...(f[key] || ["", "", ""])];
        images[index] = r.result;
        return { ...f, [key]: images, scrollBgType: "image" };
      });
    };
    r.readAsDataURL(file);
  };

  const generatePolicyPages = async () => {
    if (!niche || !domain.trim()) return;
    setPolicyError(""); setPolicyGenerating(true); setPolicyPages(null);
    try {
      const { data } = await api.post("/api/generate/policy-pages", { domain: domain.trim(), niche });
      const byType = {};
      (data.pages || []).forEach(p => { byType[p.type] = p; });
      setPolicyPages(byType);
    } catch (err) {
      setPolicyError(err.response?.data?.message || "Policy page generation failed");
    } finally { setPolicyGenerating(false); }
  };

  const save = async () => {
    setSaving(true); setSaveError("");
    try {
      await api.post("/api/pages", {
        type: "landing",
        domain: domain.trim(),
        html_content: indexHtmlFinal,
        niche: niche || null,
        // Structured state so this exact project can be reopened for full
        // editing later from Page History, not just viewed/downloaded.
        landing_data: { industry, site, heroImage, widgetType, widgetTemplateId, widgetForm }
      });
      setSaved(true);
    } catch {
      setSaveError("Failed to save");
    } finally { setSaving(false); }
  };

  // Editing marks the output unsaved again.
  useEffect(() => { setSaved(false); }, [indexHtmlFinal]);

  // Auto-save on reaching the final step, same pattern as the other modules.
  useEffect(() => {
    if (step === 4 && indexHtmlFinal && !saved && !saving) save();
  }, [step, indexHtmlFinal]);

  // Load an existing project (from Page History's "Edit" action) and jump
  // straight into content editing with everything restored.
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/api/pages/${editId}`);
        if (cancelled) return;
        const ld = data.landing_data || {};
        setDomain(data.domain || "");
        setIndustry(ld.industry || "");
        if (ld.site) setSite(ld.site);
        setHeroImage(ld.heroImage || "");
        setWidgetType(ld.widgetType || "");
        setWidgetTemplateId(ld.widgetTemplateId || null);
        setWidgetForm(ld.widgetForm || {});
        setNiche(data.niche || "");
        setStep(3);
      } catch {
        // Couldn't load — leave the wizard at its normal blank starting state.
      } finally {
        if (!cancelled) setLoadingProject(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editId]);

  // Once a loaded project's niche comes back populated, regenerate its
  // compliance pages automatically so Step 3/4 have them ready immediately
  // (their content is template+niche+domain-driven, so this reproduces the
  // same pages rather than losing them on reload).
  useEffect(() => {
    if (!loadingProject && editId && niche && domain.trim() && !policyPages && !policyGenerating) {
      generatePolicyPages();
    }
  }, [loadingProject]);

  if (loadingProject) {
    return (
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center py-24 text-slate-400">
        <i className="fa-solid fa-spinner fa-spin text-2xl mb-3" />
        <p className="text-sm">Loading your project…</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">
          <i className="fa-solid fa-globe mr-2" style={{ color: "#059669" }} />Landing Page Generator
        </h1>
        <p className="text-slate-500 text-sm mt-1">A 5-page business website — home, privacy, terms, disclaimer, and contact — with AI-written copy</p>
      </div>

      <Stepper steps={STEPS} current={step} />

      {/* Step 0: Domain */}
      {step === 0 && (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="card max-w-lg w-full">
            <h2 className="font-semibold text-slate-800 mb-5 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <i className="fa-solid fa-globe text-emerald-600" />
              </div>
              Your Domain
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Domain *</label>
                <input className="input" placeholder="e.g. acme.com" value={domain}
                  onChange={e => setDomain(e.target.value)} />
                <p className="text-xs text-slate-400 mt-1">Used as the site's brand name and to save this project.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Industry *</label>
                <CategoryDropdown value={industry} onChange={setIndustry} options={INDUSTRY_PRESETS} />
                <p className="text-xs text-slate-400 mt-1">Drives the AI-generated copy and stock hero image. Pick a category or add your own.</p>
              </div>
              <button className="btn-primary" disabled={!domain.trim() || !industry.trim()}
                onClick={() => setStep(1)}>
                Continue <i className="fa-solid fa-arrow-right ml-2" />
              </button>
            </div>
          </div>

          <div className="hidden lg:block flex-1 max-w-sm bg-emerald-50/40 rounded-lg p-6">
            <p className="text-sm font-semibold text-slate-700 mb-3">
              <i className="fa-solid fa-lightbulb mr-1.5 text-emerald-500" />What you'll get
            </p>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-check text-emerald-500 mt-0.5 text-xs" />
                A home page with hero, about, features &amp; contact sections
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-check text-emerald-500 mt-0.5 text-xs" />
                4 linked pages: Privacy, Terms, Disclaimer, Contact
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-check text-emerald-500 mt-0.5 text-xs" />
                Optionally embed a Cookie, Age-Verification, or Newsletter widget
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Step 1: Generate */}
      {step === 1 && (
        <div className="card max-w-lg">
          <h2 className="font-semibold text-slate-800 mb-4">
            <i className="fa-solid fa-wand-magic-sparkles mr-2 text-emerald-500" />Generate Site Content
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            AI will write the hero, about, and 6 feature cards for <strong>{domain}</strong> ({industry}) with a matching stock hero image.
          </p>

          {site ? (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
              <img src={effectiveImageUrl} alt="" className="w-20 h-14 object-cover rounded" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{site.hero?.heading}</p>
                <p className="text-xs text-slate-400 truncate">{site.hero?.subheading}</p>
              </div>
              <button type="button" onClick={generateSite} disabled={generating}
                className="text-xs text-emerald-600 hover:text-emerald-700 whitespace-nowrap">
                <i className="fa-solid fa-rotate mr-1" />Regenerate
              </button>
            </div>
          ) : (
            <button type="button" onClick={generateSite} disabled={generating}
              className="btn-primary w-full mb-4">
              {generating
                ? <><i className="fa-solid fa-spinner fa-spin mr-2" />Generating site content…</>
                : <><i className="fa-solid fa-wand-magic-sparkles mr-2" />Generate Site Content</>}
            </button>
          )}
          {genError && <p className="text-red-500 text-sm mb-3">{genError}</p>}

          {site && (
            <div className="mb-5">
              {heroImage ? (
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2">
                  <img src={heroImage} alt="" className="w-16 h-12 object-cover rounded" />
                  <span className="text-xs text-slate-600 flex-1">Your uploaded hero image</span>
                  <button type="button" onClick={() => setHeroImage("")} className="text-xs text-red-400 hover:text-red-500">Remove</button>
                </div>
              ) : (
                <label className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 cursor-pointer">
                  <i className="fa-solid fa-image" />Upload your own hero image
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleHeroImage(e.target.files?.[0])} />
                </label>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button className="btn-secondary" onClick={() => setStep(0)}>
              <i className="fa-solid fa-arrow-left mr-2" />Back
            </button>
            <button className="btn-primary" disabled={!site} onClick={() => setStep(2)}>
              Continue <i className="fa-solid fa-arrow-right ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Integrate a widget */}
      {step === 2 && (
        <div>
          <div className="card mb-6">
            <h2 className="font-semibold text-slate-800 mb-2">
              <i className="fa-solid fa-puzzle-piece mr-2 text-emerald-500" />Integrate a Widget
            </h2>
            <p className="text-sm text-slate-500 mb-4">What do you want to add to your website? It'll be embedded directly inside index.html.</p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
              <button type="button" onClick={() => chooseWidgetType("")}
                className={`card text-center p-3 cursor-pointer ${widgetType === "" ? "ring-2 ring-emerald-500 border-emerald-200" : "hover:border-slate-300"}`}>
                <i className="fa-solid fa-ban text-lg text-slate-400 mb-1.5 block" />
                <span className="text-xs font-semibold text-slate-700">None</span>
              </button>
              {Object.entries(WIDGET_TYPES).map(([key, cfg]) => (
                <button type="button" key={key} onClick={() => chooseWidgetType(key)}
                  className={`card text-center p-3 cursor-pointer ${widgetType === key ? "ring-2 ring-emerald-500 border-emerald-200" : "hover:border-slate-300"}`}>
                  <i className={`fa-solid ${cfg.icon} text-lg text-emerald-500 mb-1.5 block`} />
                  <span className="text-xs font-semibold text-slate-700">{cfg.label}</span>
                </button>
              ))}
            </div>

            {widgetConfig && (
              <>
                <p className="text-xs font-medium text-slate-600 mb-2">Choose a design</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {widgetConfig.templates.map(t => (
                    <button type="button" key={t.id} onClick={() => chooseWidgetTemplate(t.id)}
                      className={`card text-left p-2.5 cursor-pointer ${widgetTemplateId === t.id ? "ring-2 ring-emerald-500 border-emerald-200" : "hover:border-slate-300"}`}>
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        <i className={`${t.icon} mr-1 text-emerald-400`} />{t.name}
                      </p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {widgetTemplate && widgetConfig && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Full content + advanced editor — same option set as the standalone module */}
              <div className="card">
                <h2 className="font-semibold text-slate-800 mb-4">
                  <i className="fa-solid fa-pen-to-square mr-2 text-emerald-500" />Edit {widgetConfig.label}
                </h2>
                <div className="space-y-4">
                  {widgetConfig.contentFields.map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                      {f.area
                        ? <textarea rows={3} className="input resize-none text-sm" value={widgetForm[f.key] || ""}
                            onChange={e => setWidgetForm({ ...widgetForm, [f.key]: e.target.value })} />
                        : <input className="input text-sm" value={widgetForm[f.key] || ""}
                            onChange={e => setWidgetForm({ ...widgetForm, [f.key]: e.target.value })} />
                      }
                    </div>
                  ))}

                  {/* Popup-only quick styling: image, button colors, box size, overlay */}
                  {widgetConfig.flags.popupQuick && (
                    <div className="border border-slate-100 rounded-lg p-3 bg-slate-50 space-y-3">
                      <p className="text-xs font-semibold text-slate-700">
                        <i className="fa-solid fa-image mr-1.5 text-emerald-500" />Image &amp; Box Styling
                      </p>
                      <div className="flex gap-2">
                        <input className="input text-sm flex-1" placeholder="Image URL" value={widgetForm.imageUrl || ""}
                          onChange={e => setWidgetForm({ ...widgetForm, imageUrl: e.target.value })} />
                        <label className="btn-secondary text-sm cursor-pointer whitespace-nowrap flex items-center">
                          <i className="fa-solid fa-upload mr-1" />Upload
                          <input type="file" accept="image/*" className="hidden" onChange={e => { handleWidgetImage(e.target.files?.[0]); e.target.value = ""; }} />
                        </label>
                      </div>
                      {widgetForm.imageUrl && <img src={widgetForm.imageUrl} alt="" className="w-full h-24 object-cover rounded-lg border border-slate-200" />}

                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: "primaryColor", label: "Primary Btn Color" },
                          { key: "primaryTextColor", label: "Primary Btn Text" },
                          { key: "secondaryColor", label: "Secondary Btn Color" },
                          { key: "secondaryTextColor", label: "Secondary Btn Text" },
                          { key: "bgColor", label: "Box Background" }
                        ].map(f => (
                          <div key={f.key}>
                            <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                            <div className="flex items-center gap-2">
                              <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(widgetForm[f.key]) ? widgetForm[f.key] : "#000000"}
                                onChange={e => setWidgetForm({ ...widgetForm, [f.key]: e.target.value })}
                                className="w-8 h-8 rounded border border-slate-200 cursor-pointer" />
                              <input className="input text-xs flex-1" value={widgetForm[f.key] || ""}
                                onChange={e => setWidgetForm({ ...widgetForm, [f.key]: e.target.value })} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Corner Radius</label>
                          <input type="number" className="input text-xs" value={widgetForm.borderRadius ?? ""}
                            onChange={e => setWidgetForm({ ...widgetForm, borderRadius: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Padding</label>
                          <input type="number" className="input text-xs" value={widgetForm.padding ?? ""}
                            onChange={e => setWidgetForm({ ...widgetForm, padding: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Box Width</label>
                          <input type="number" className="input text-xs" placeholder="auto" value={widgetForm.boxWidth || ""}
                            onChange={e => setWidgetForm({ ...widgetForm, boxWidth: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Box Height</label>
                          <input type="number" className="input text-xs" placeholder="auto" value={widgetForm.boxHeight || ""}
                            onChange={e => setWidgetForm({ ...widgetForm, boxHeight: e.target.value })} />
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1.5">Overlay Background</p>
                        <div className="flex gap-2 mb-2">
                          <button type="button"
                            className={`flex-1 text-xs font-semibold py-1.5 rounded-md border ${widgetForm.overlayBgType === "color" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-200"}`}
                            onClick={() => setWidgetForm({ ...widgetForm, overlayBgType: "color" })}>
                            <i className="fa-solid fa-fill-drip mr-1" />Color
                          </button>
                          <button type="button"
                            className={`flex-1 text-xs font-semibold py-1.5 rounded-md border ${widgetForm.overlayBgType === "image" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-200"}`}
                            onClick={() => setWidgetForm({ ...widgetForm, overlayBgType: "image" })}>
                            <i className="fa-solid fa-image mr-1" />Image
                          </button>
                        </div>
                        {widgetForm.overlayBgType === "image" ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <input className="input text-sm flex-1" placeholder="Overlay image URL" value={widgetForm.overlayBgImage || ""}
                                onChange={e => setWidgetForm({ ...widgetForm, overlayBgImage: e.target.value })} />
                              <label className="btn-secondary text-sm cursor-pointer whitespace-nowrap flex items-center">
                                <i className="fa-solid fa-upload mr-1" />Upload
                                <input type="file" accept="image/*" className="hidden" onChange={e => { handleWidgetImage(e.target.files?.[0], "overlayBgImage"); e.target.value = ""; }} />
                              </label>
                            </div>
                            {widgetForm.overlayBgImage && <img src={widgetForm.overlayBgImage} alt="" className="w-full h-20 object-cover rounded-lg border border-slate-200" />}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(widgetForm.overlayBgColor) ? widgetForm.overlayBgColor : "#0f172a"}
                              onChange={e => setWidgetForm({ ...widgetForm, overlayBgColor: e.target.value })}
                              className="w-10 h-9 rounded border border-slate-200 cursor-pointer" />
                            <input className="input text-sm flex-1" value={widgetForm.overlayBgColor || ""}
                              onChange={e => setWidgetForm({ ...widgetForm, overlayBgColor: e.target.value })} />
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Opacity: {widgetForm.overlayOpacity ?? 0.6}</label>
                            <input type="range" min="0" max="0.9" step="0.05" value={widgetForm.overlayOpacity ?? 0.6}
                              onChange={e => setWidgetForm({ ...widgetForm, overlayOpacity: parseFloat(e.target.value) })}
                              className="w-full" />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Blur: {widgetForm.overlayBlur ?? 4}px</label>
                            <input type="range" min="0" max="20" step="1" value={widgetForm.overlayBlur ?? 4}
                              onChange={e => setWidgetForm({ ...widgetForm, overlayBlur: parseFloat(e.target.value) })}
                              className="w-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BG Scroll: website-style background behind the fixed widget */}
                  {widgetConfig.flags.bgToggle && (
                    <div className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                      <label className="flex items-center gap-2 mb-3 cursor-pointer">
                        <input type="checkbox" checked={!!widgetForm.scrollBgEnabled}
                          onChange={e => setWidgetForm({ ...widgetForm, scrollBgEnabled: e.target.checked })}
                          className="w-4 h-4 accent-emerald-500" />
                        <span className="text-xs font-semibold text-slate-700">
                          <i className="fa-solid fa-scroll mr-1.5 text-emerald-500" />BG Scroll
                        </span>
                      </label>

                      {widgetForm.scrollBgEnabled && (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <button type="button"
                              className={`flex-1 text-xs font-semibold py-1.5 rounded-md border ${widgetForm.scrollBgType === "color" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-200"}`}
                              onClick={() => setWidgetForm({ ...widgetForm, scrollBgType: "color" })}>
                              <i className="fa-solid fa-fill-drip mr-1" />Color
                            </button>
                            <button type="button"
                              className={`flex-1 text-xs font-semibold py-1.5 rounded-md border ${widgetForm.scrollBgType === "image" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-200"}`}
                              onClick={() => setWidgetForm({ ...widgetForm, scrollBgType: "image" })}>
                              <i className="fa-solid fa-image mr-1" />Image
                            </button>
                          </div>

                          {widgetForm.scrollBgType === "color" ? (
                            <div className="flex items-center gap-2">
                              <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(widgetForm.scrollBgColor) ? widgetForm.scrollBgColor : "#f8fafc"}
                                onChange={e => setWidgetForm({ ...widgetForm, scrollBgColor: e.target.value })}
                                className="w-10 h-9 rounded border border-slate-200 cursor-pointer" />
                              <input className="input text-sm flex-1" placeholder="#f8fafc" value={widgetForm.scrollBgColor || ""}
                                onChange={e => setWidgetForm({ ...widgetForm, scrollBgColor: e.target.value })} />
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {[{ key: "phone", label: "Phone BG Images", images: widgetForm.scrollBgPhoneImages || ["", "", ""] }].map(group => (
                                <div key={group.key}>
                                  <p className="text-xs font-medium text-slate-600 mb-1.5">{group.label}</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {[0, 1, 2].map(i => (
                                      <div key={i} className="border border-slate-200 rounded-lg p-2 bg-white">
                                        {group.images?.[i] ? (
                                          <div className="relative">
                                            <img src={group.images[i]} alt={`${group.label} ${i + 1}`} className="w-full h-20 object-cover rounded-md" />
                                            <button type="button"
                                              onClick={() => {
                                                const images = [...(widgetForm.scrollBgPhoneImages || ["", "", ""])];
                                                images[i] = "";
                                                setWidgetForm({ ...widgetForm, scrollBgPhoneImages: images });
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
                              <label className="block text-xs text-slate-500 mb-1">Blury: {widgetForm.scrollBgBlur || 0}px</label>
                              <input type="range" min="0" max="18" step="1" value={widgetForm.scrollBgBlur || 0}
                                onChange={e => setWidgetForm({ ...widgetForm, scrollBgBlur: parseInt(e.target.value, 10) || 0 })}
                                className="w-full" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Opacity: {widgetForm.scrollBgOpacity ?? 0.25}</label>
                              <input type="range" min="0" max="0.8" step="0.05" value={widgetForm.scrollBgOpacity ?? 0.25}
                                onChange={e => setWidgetForm({ ...widgetForm, scrollBgOpacity: parseFloat(e.target.value) })}
                                className="w-full" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Advanced — same option set as the standalone module */}
                  <div className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                    <label className="flex items-center gap-2 mb-3 cursor-pointer">
                      <input type="checkbox" checked={!!widgetForm.advancedEnabled}
                        onChange={e => setWidgetForm({ ...widgetForm, advancedEnabled: e.target.checked })}
                        className="w-4 h-4 accent-emerald-500" />
                      <span className="text-xs font-semibold text-slate-700">
                        <i className="fa-solid fa-sliders mr-1.5 text-emerald-500" />Advanced — Styling
                      </span>
                    </label>

                    {widgetForm.advancedEnabled && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-medium text-slate-600 mb-1.5">Content Alignment</p>
                            <div className="flex gap-1">
                              {[
                                { v: "left", icon: "fa-align-left" },
                                { v: "center", icon: "fa-align-center" },
                                { v: "right", icon: "fa-align-right" }
                              ].map(o => (
                                <button key={o.v} type="button"
                                  className={`flex-1 py-1.5 rounded-md border text-xs ${widgetForm.contentAlign === o.v ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-200"}`}
                                  onClick={() => setWidgetForm({ ...widgetForm, contentAlign: widgetForm.contentAlign === o.v ? "" : o.v })}>
                                  <i className={`fa-solid ${o.icon}`} />
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-600 mb-1.5">Button Layout</p>
                            <div className="flex gap-1">
                              <button type="button"
                                className={`flex-1 py-1.5 rounded-md border text-xs ${widgetForm.buttonLayout === "row" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-200"}`}
                                onClick={() => setWidgetForm({ ...widgetForm, buttonLayout: widgetForm.buttonLayout === "row" ? "" : "row" })}>
                                <i className="fa-solid fa-grip-lines mr-1" />Inline
                              </button>
                              <button type="button"
                                className={`flex-1 py-1.5 rounded-md border text-xs ${widgetForm.buttonLayout === "column" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-200"}`}
                                onClick={() => setWidgetForm({ ...widgetForm, buttonLayout: widgetForm.buttonLayout === "column" ? "" : "column" })}>
                                <i className="fa-solid fa-grip-lines-vertical mr-1" />Column
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {widgetConfig.colorFields.map(f => (
                            <div key={f.key}>
                              <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                              <div className="flex items-center gap-2">
                                <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(widgetForm[f.key]) ? widgetForm[f.key] : "#000000"}
                                  onChange={e => setWidgetForm({ ...widgetForm, [f.key]: e.target.value })}
                                  className="w-8 h-8 rounded border border-slate-200 cursor-pointer" />
                                <input className="input text-xs flex-1" placeholder="auto" value={widgetForm[f.key] || ""}
                                  onChange={e => setWidgetForm({ ...widgetForm, [f.key]: e.target.value })} />
                              </div>
                            </div>
                          ))}
                        </div>

                        <TypographyRow title="Typography (Heading)" form={widgetForm} setForm={setWidgetForm}
                          sizeKey="fontSize" weightKey="fontWeight" formatKey="format" />
                        <TypographyRow title="Typography (Subheading / Body)" form={widgetForm} setForm={setWidgetForm}
                          sizeKey="subFontSize" weightKey="subFontWeight" formatKey="subFormat" />
                        <TypographyRow title="Typography (Button Text)" form={widgetForm} setForm={setWidgetForm}
                          sizeKey="btnFontSize" weightKey="btnFontWeight" formatKey="btnFormat" />

                        <div>
                          <p className="text-xs font-medium text-slate-600 mb-1.5">Button Size &amp; Spacing</p>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Width</label>
                              <select className="input text-xs" value={widgetForm.buttonWidth || ""}
                                onChange={e => setWidgetForm({ ...widgetForm, buttonWidth: e.target.value })}>
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
                              <input type="number" className="input text-xs" placeholder="24" value={widgetForm.buttonPaddingX || ""}
                                onChange={e => setWidgetForm({ ...widgetForm, buttonPaddingX: e.target.value })} />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Padding Y (px)</label>
                              <input type="number" className="input text-xs" placeholder="13" value={widgetForm.buttonPaddingY || ""}
                                onChange={e => setWidgetForm({ ...widgetForm, buttonPaddingY: e.target.value })} />
                            </div>
                          </div>
                        </div>

                        {(widgetConfig.flags.boxRadius || widgetConfig.flags.btnRadius || widgetConfig.flags.boxShadow) && (
                          <div className="grid grid-cols-3 gap-2">
                            {widgetConfig.flags.boxRadius && (
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Box Corner Radius</label>
                                <input type="number" className="input text-xs" placeholder="auto" value={widgetForm.boxRadius || ""}
                                  onChange={e => setWidgetForm({ ...widgetForm, boxRadius: e.target.value })} />
                              </div>
                            )}
                            {widgetConfig.flags.btnRadius && (
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Button Corner Radius</label>
                                <input type="number" className="input text-xs" placeholder="auto" value={widgetForm.btnRadius || ""}
                                  onChange={e => setWidgetForm({ ...widgetForm, btnRadius: e.target.value })} />
                              </div>
                            )}
                            {widgetConfig.flags.boxShadow && (
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Box Shadow</label>
                                <select className="input text-xs" value={widgetForm.boxShadow || ""}
                                  onChange={e => setWidgetForm({ ...widgetForm, boxShadow: e.target.value })}>
                                  <option value="">Default</option>
                                  <option value="none">None</option>
                                  <option value="soft">Soft</option>
                                  <option value="strong">Strong</option>
                                </select>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Live widget preview */}
              <div className="card self-start lg:sticky lg:top-6">
                <h2 className="font-semibold text-slate-800 mb-3 text-sm">
                  <i className="fa-solid fa-eye mr-2 text-emerald-500" />Widget Preview
                </h2>
                <DevicePreviewFrame html={widgetStandaloneHtml} height={420} title="widget preview" />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button className="btn-secondary" onClick={() => setStep(1)}>
              <i className="fa-solid fa-arrow-left mr-1" />Back
            </button>
            <button className="btn-primary" onClick={() => setStep(3)}>
              Continue <i className="fa-solid fa-arrow-right ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Edit content */}
      {step === 3 && site && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-semibold text-slate-800 mb-4">
              <i className="fa-solid fa-pen-to-square mr-2 text-emerald-500" />Edit Content
            </h2>
            <div className="space-y-4">
              <div className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                <p className="text-xs font-semibold text-slate-700 mb-2">Hero Section</p>
                <label className="block text-xs text-slate-500 mb-1">Heading</label>
                <input className="input text-sm mb-2" value={site.hero?.heading || ""} onChange={e => updateHero("heading", e.target.value)} />
                <label className="block text-xs text-slate-500 mb-1">Subheading</label>
                <input className="input text-sm mb-2" value={site.hero?.subheading || ""} onChange={e => updateHero("subheading", e.target.value)} />
                <label className="block text-xs text-slate-500 mb-1">Button Text</label>
                <input className="input text-sm" value={site.hero?.cta || ""} onChange={e => updateHero("cta", e.target.value)} />
              </div>

              <div className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                <p className="text-xs font-semibold text-slate-700 mb-2">About Us Section</p>
                <label className="block text-xs text-slate-500 mb-1">Heading</label>
                <input className="input text-sm mb-2" value={site.about?.heading || ""} onChange={e => updateAbout("heading", e.target.value)} />
                <label className="block text-xs text-slate-500 mb-1">Content</label>
                <textarea rows={3} className="input text-sm resize-none" value={site.about?.content || ""} onChange={e => updateAbout("content", e.target.value)} />
              </div>

              <div className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                <p className="text-xs font-semibold text-slate-700 mb-2">Features (6 cards)</p>
                <div className="space-y-3">
                  {(site.features || []).map((f, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 items-start border-t border-slate-200 pt-2 first:border-0 first:pt-0">
                      <select className="input text-xs" value={f.icon || ""} onChange={e => updateFeature(i, "icon", e.target.value)}>
                        {FEATURE_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                      </select>
                      <input className="input text-xs col-span-1" placeholder="Heading" value={f.heading || ""} onChange={e => updateFeature(i, "heading", e.target.value)} />
                      <input className="input text-xs col-span-2" placeholder="Text" value={f.text || ""} onChange={e => updateFeature(i, "text", e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Niche picker + policy pages */}
              <div className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  <i className="fa-solid fa-file-shield mr-1.5 text-emerald-500" />Compliance Pages (Niche)
                </p>
                <select className="input text-sm mb-3" value={niche} onChange={e => { setNiche(e.target.value); setPolicyPages(null); setPolicyError(""); }}>
                  <option value="">None</option>
                  <option value="cbd">CBD</option>
                  <option value="nutra">Nutra</option>
                </select>

                {niche && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">
                      Generates privacy.html, terms.html, disclaimer.html &amp; contact.html, all sharing the same header/footer as your home page.
                    </p>
                    <button type="button" className="btn-secondary text-xs" disabled={policyGenerating}
                      onClick={generatePolicyPages}>
                      {policyGenerating
                        ? <><i className="fa-solid fa-spinner fa-spin mr-1.5" />Generating…</>
                        : <><i className="fa-solid fa-file-shield mr-1.5" />Generate compliance pages</>}
                    </button>
                    {policyError && <p className="text-red-500 text-xs mt-2">{policyError}</p>}
                    {policyPages && (
                      <div className="mt-2 text-xs text-green-600">
                        <i className="fa-solid fa-circle-check mr-1" />
                        {Object.keys(policyPages).length} pages ready: Privacy, Terms, Disclaimer, Contact
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button className="btn-secondary" onClick={() => setStep(2)}>
                <i className="fa-solid fa-arrow-left mr-1" />Back
              </button>
              <button className="btn-primary" onClick={() => setStep(4)}>
                Preview <i className="fa-solid fa-arrow-right ml-1" />
              </button>
            </div>
          </div>

          {/* Live mini preview — always the clean site (no widget overlay) */}
          <div className="card self-start lg:sticky lg:top-6">
            <h2 className="font-semibold text-slate-800 mb-3 text-sm">
              <i className="fa-solid fa-eye mr-2 text-emerald-500" />Live Preview
            </h2>
            {indexHtmlPreview
              ? <iframe srcDoc={indexHtmlPreview} title="preview" className="w-full rounded-lg border border-slate-100" style={{ height: 480 }} sandbox="allow-scripts" />
              : <div className="flex items-center justify-center h-48 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">Generate content to see preview</div>
            }
          </div>
        </div>
      )}

      {/* Step 4: Preview + download + save */}
      {step === 4 && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-semibold text-slate-800">
              <i className="fa-solid fa-eye mr-2 text-emerald-500" />Final Preview
            </h2>
            <div className="flex gap-3 items-center flex-wrap">
              <button onClick={() => setStep(3)} className="btn-secondary text-sm">
                <i className="fa-solid fa-arrow-left mr-1" />Edit
              </button>
              <button onClick={() => downloadSiteAsZip(pagesForZip, `site-${domain}`)} className="btn-secondary text-sm">
                <i className="fa-solid fa-download mr-1" />Download Site ZIP
              </button>
              <button onClick={save} disabled={saving || saved} className="btn-primary text-sm">
                {saving ? <><i className="fa-solid fa-spinner fa-spin mr-1" />Saving…</>
                 : saved ? <><i className="fa-solid fa-check mr-1" />Saved!</>
                 :         <><i className="fa-solid fa-floppy-disk mr-1" />Save Page</>}
              </button>
            </div>
          </div>
          {saveError && <p className="text-red-500 text-sm mb-3">{saveError}</p>}

          <p className="text-xs text-slate-500 mb-3">
            {previewMode === "desktop"
              ? "Desktop: browse all 5 pages of the site using the tabs below — this is the clean site, exactly as described (header, hero, about, features, contact, footer)."
              : widgetTemplate
                ? "Mobile: previewing the widget you integrated, exactly as it'll appear on a phone."
                : "Mobile: previewing the site itself, responsively."}
          </p>

          <DevicePreviewFrame
            mode={previewMode}
            onModeChange={setPreviewMode}
            html={previewMode === "desktop" ? activePageHtml : (widgetTemplate ? widgetStandaloneHtml : indexHtmlPreview)}
            height={560}
            title="Final preview"
            extraControls={previewMode === "desktop" ? (
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 mr-1">
                {PAGE_TABS.filter(t => t.key === "index" || policyPages?.[t.type]).map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium ${activeTab === t.key ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            ) : null}
          />
        </div>
      )}
    </div>
  );
}
