import React, { useState, useMemo, useEffect } from "react";
import api from "../../utils/api";
import Stepper from "../../components/Stepper";
import DevicePreviewFrame from "../../components/DevicePreviewFrame";
import { POPUP_TEMPLATES, POPUP_FIELD_DEFAULTS, applyPopupAdvancedStyles } from "../../utils/templates";
import { downloadAsZip } from "../../utils/zipHelper";

// No "generate" step — the README is explicit that the popup module skips
// AI generation entirely: Domain -> Choose a design -> Live editor -> Preview & Save.
const STEPS = ["Domain", "Choose a Design", "Live Editor", "Preview & Save"];

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

export default function PopupModule() {
  const [step, setStep]         = useState(0);
  const [domain, setDomain]     = useState("");
  const [templateId, setTemplateId] = useState(null);
  const [form, setForm]         = useState(POPUP_FIELD_DEFAULTS);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState("");

  const template = POPUP_TEMPLATES.find(t => t.id === templateId);

  const outputHtml = useMemo(() => {
    if (!template) return "";
    const html = template.generate({ ...form, domain });
    return applyPopupAdvancedStyles(html, {
      enabled: form.advancedEnabled,
      headingColor: form.headingColor, subColor: form.subColor,
      fontSize: form.fontSize, fontWeight: form.fontWeight, format: form.format,
      subFontSize: form.subFontSize, subFontWeight: form.subFontWeight, subFormat: form.subFormat,
      btnFontSize: form.btnFontSize, btnFontWeight: form.btnFontWeight, btnFormat: form.btnFormat,
      buttonWidth: form.buttonWidth, buttonPaddingX: form.buttonPaddingX, buttonPaddingY: form.buttonPaddingY,
      btnRadius: form.btnRadius, boxShadow: form.boxShadow,
      contentAlign: form.contentAlign, buttonLayout: form.buttonLayout
    });
  }, [template, form, domain]);

  const handleImageUpload = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, imageUrl: reader.result }));
    reader.readAsDataURL(file);
  };

  const chooseTemplate = (id) => {
    const t = POPUP_TEMPLATES.find(t => t.id === id);
    setTemplateId(id);
    setForm({ ...POPUP_FIELD_DEFAULTS, ...(t?.defaults || {}) });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/api/pages", { type: "popup", domain, html_content: outputHtml });
      setSaved(true);
    } catch { setError("Failed to save"); }
    finally { setSaving(false); }
  };

  useEffect(() => { setSaved(false); }, [outputHtml]);

  useEffect(() => {
    if (step === 3 && outputHtml && !saved && !saving) save();
  }, [step, outputHtml]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">
          <i className="fa-solid fa-window-restore mr-2" style={{ color: "#059669" }} />Popup Widget Generator
        </h1>
        <p className="text-slate-500 text-sm mt-1">A general-purpose, fully customizable modal popup — pick a design and edit every visual property live</p>
      </div>

      <Stepper steps={STEPS} current={step} />

      {/* Step 0: Domain */}
      {step === 0 && (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="card max-w-lg w-full">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <i className="fa-solid fa-globe text-emerald-600" />
              </div>
              <h2 className="font-semibold text-slate-800">Your Domain</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project name *</label>
                <input className="input" placeholder="e.g. Acme Popup" value={domain}
                  onChange={e => setDomain(e.target.value)} />
                <p className="text-xs text-slate-400 mt-1">Used to save and identify this project.</p>
              </div>
              <button className="btn-primary px-6 font-semibold text-white" disabled={!domain.trim()} onClick={() => setStep(1)}>
                Continue <i className="fa-solid fa-arrow-right ml-2" />
              </button>
            </div>
          </div>

          {/* Tips panel — large screens only */}
          <div className="hidden lg:block flex-1 max-w-sm pt-2">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              <i className="fa-solid fa-lightbulb mr-2 text-emerald-500" />Tips for great popups
            </h3>
            <ul className="space-y-3 text-sm text-slate-500">
              <li className="flex gap-2">
                <i className="fa-solid fa-circle-check text-emerald-500 mt-0.5" />
                <span>Trigger popups on exit-intent or after a short delay to avoid annoying first-time visitors.</span>
              </li>
              <li className="flex gap-2">
                <i className="fa-solid fa-circle-check text-emerald-500 mt-0.5" />
                <span>Keep your headline short and lead with the benefit, not the ask.</span>
              </li>
              <li className="flex gap-2">
                <i className="fa-solid fa-circle-check text-emerald-500 mt-0.5" />
                <span>Use a single, clear call-to-action button so visitors know exactly what to do next.</span>
              </li>
              <li className="flex gap-2">
                <i className="fa-solid fa-circle-check text-emerald-500 mt-0.5" />
                <span>Always give an easy way to dismiss the popup to keep the experience user-friendly.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Step 1: Choose a design */}
      {step === 1 && (
        <div>
          <h2 className="font-semibold text-slate-800 mb-4">
            <i className="fa-solid fa-swatchbook mr-2 text-emerald-500" />Choose a design
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {POPUP_TEMPLATES.map(t => (
              <button key={t.id} onClick={() => chooseTemplate(t.id)}
                className={`card text-left p-3 transition-all hover:shadow-md cursor-pointer
                  ${templateId === t.id ? "ring-2 ring-emerald-500 border-emerald-200" : "hover:border-slate-300"}`}>
                <div className="w-full h-32 rounded-lg mb-3 overflow-hidden relative bg-slate-100 flex items-center justify-center">
                  <iframe
                    srcDoc={t.generate({ ...POPUP_FIELD_DEFAULTS, ...(t.defaults || {}), domain: domain || "example.com" })}
                    title={t.name}
                    sandbox=""
                    style={{ width: 700, height: 460, transform: "scale(0.26)", transformOrigin: "center", border: "none", pointerEvents: "none" }}
                  />
                </div>
                <p className="text-xs font-semibold text-slate-800">
                  <i className={`${t.icon} mr-1 text-emerald-400`} />{t.name}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{t.description}</p>
                {templateId === t.id && <i className="fa-solid fa-circle-check text-emerald-500 mt-1" />}
              </button>
            ))}
          </div>
          <div className="flex gap-3 flex-wrap">
            <button className="btn-secondary" onClick={() => setStep(0)}>
              <i className="fa-solid fa-arrow-left mr-2" />Back
            </button>
            <button className="btn-primary" disabled={!templateId} onClick={() => setStep(2)}>
              Continue <i className="fa-solid fa-arrow-right ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Live editor */}
      {step === 2 && template && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-semibold text-slate-800 mb-4">
              <i className="fa-solid fa-sliders mr-2 text-emerald-500" />Live Editor
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Image URL</label>
                <div className="flex gap-2">
                  <input className="input text-sm flex-1" placeholder="Image URL" value={form.imageUrl}
                    onChange={e => setForm({ ...form, imageUrl: e.target.value })} />
                  <label className="btn-secondary text-sm cursor-pointer whitespace-nowrap flex items-center">
                    <i className="fa-solid fa-upload mr-1" />Upload
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => { handleImageUpload(e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                </div>
                {form.imageUrl && <img src={form.imageUrl} alt="preview" className="w-full h-24 object-cover rounded-lg border border-slate-200 mt-2" />}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Heading</label>
                <input className="input text-sm" value={form.heading} onChange={e => setForm({ ...form, heading: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Body Text</label>
                <textarea rows={3} className="input resize-none text-sm" value={form.bodyCopy}
                  onChange={e => setForm({ ...form, bodyCopy: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Primary Button Text</label>
                  <input className="input text-sm" value={form.primaryText} onChange={e => setForm({ ...form, primaryText: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Primary Button URL</label>
                  <input className="input text-sm" placeholder="optional" value={form.primaryUrl} onChange={e => setForm({ ...form, primaryUrl: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Secondary Button Text</label>
                  <input className="input text-sm" placeholder="optional — leave blank to hide" value={form.secondaryText} onChange={e => setForm({ ...form, secondaryText: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Secondary Button URL</label>
                  <input className="input text-sm" placeholder="optional" value={form.secondaryUrl} onChange={e => setForm({ ...form, secondaryUrl: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "primaryColor",       label: "Primary Button Color" },
                  { key: "primaryTextColor",   label: "Primary Button Text Color" },
                  { key: "secondaryColor",     label: "Secondary Button Color" },
                  { key: "secondaryTextColor", label: "Secondary Button Text Color" },
                  { key: "bgColor",            label: "Card Background" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={/^#/.test(form[f.key]) ? form[f.key] : "#ffffff"}
                        onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-200 cursor-pointer" />
                      <input className="input text-xs flex-1" value={form[f.key]}
                        onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Backdrop / overlay — color or image, with independent opacity + blur */}
              <div className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  <i className="fa-solid fa-layer-group mr-1.5 text-emerald-500" />Backdrop
                </p>
                <div className="flex gap-2 mb-2">
                  <button type="button"
                    className={`flex-1 text-xs font-semibold py-1.5 rounded-md border ${form.overlayBgType === "color" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-200"}`}
                    onClick={() => setForm({ ...form, overlayBgType: "color" })}>
                    <i className="fa-solid fa-fill-drip mr-1" />Color
                  </button>
                  <button type="button"
                    className={`flex-1 text-xs font-semibold py-1.5 rounded-md border ${form.overlayBgType === "image" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-200"}`}
                    onClick={() => setForm({ ...form, overlayBgType: "image" })}>
                    <i className="fa-solid fa-image mr-1" />Image
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <input type="color" value={/^#/.test(form.overlayBgColor) ? form.overlayBgColor : "#0f172a"}
                    onChange={e => setForm({ ...form, overlayBgColor: e.target.value })}
                    className="w-9 h-9 rounded border border-slate-200 cursor-pointer" />
                  <input className="input text-sm flex-1" placeholder="#0f172a" value={form.overlayBgColor}
                    onChange={e => setForm({ ...form, overlayBgColor: e.target.value })} />
                </div>

                {form.overlayBgType === "image" && (
                  <div className="space-y-2 mb-3">
                    <div className="flex gap-2">
                      <input className="input text-sm flex-1" placeholder="Backdrop image URL" value={form.overlayBgImage}
                        onChange={e => setForm({ ...form, overlayBgImage: e.target.value })} />
                      <label className="btn-secondary text-sm cursor-pointer whitespace-nowrap flex items-center">
                        <i className="fa-solid fa-upload mr-1" />Upload
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => setForm(f => ({ ...f, overlayBgImage: reader.result }));
                          reader.readAsDataURL(file);
                          e.target.value = "";
                        }} />
                      </label>
                    </div>
                    {form.overlayBgImage && <img src={form.overlayBgImage} alt="backdrop preview" className="w-full h-24 object-cover rounded-lg border border-slate-200" />}
                    <p className="text-xs text-slate-400">The color above tints the image as a scrim, controlled by Opacity below.</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Opacity: {form.overlayOpacity}</label>
                    <input type="range" min="0" max="1" step="0.05" value={form.overlayOpacity}
                      onChange={e => setForm({ ...form, overlayOpacity: parseFloat(e.target.value) })} className="w-full" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Blur: {form.overlayBlur}px</label>
                    <input type="range" min="0" max="20" step="1" value={form.overlayBlur}
                      onChange={e => setForm({ ...form, overlayBlur: parseInt(e.target.value) || 0 })} className="w-full" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Border Radius (px)</label>
                  <input type="number" className="input text-xs" value={form.borderRadius}
                    onChange={e => setForm({ ...form, borderRadius: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Padding (px)</label>
                  <input type="number" className="input text-xs" value={form.padding}
                    onChange={e => setForm({ ...form, padding: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Box Width (px)</label>
                  <input type="number" className="input text-xs" placeholder="auto" value={form.boxWidth}
                    onChange={e => setForm({ ...form, boxWidth: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Box Height (px)</label>
                  <input type="number" className="input text-xs" placeholder="auto" value={form.boxHeight}
                    onChange={e => setForm({ ...form, boxHeight: e.target.value })} />
                </div>
              </div>

              {templateId === "split-confirm" && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Image Panel Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={/^#/.test(form.imagePanelColor) ? form.imagePanelColor : "#87a06b"}
                      onChange={e => setForm({ ...form, imagePanelColor: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-200 cursor-pointer" />
                    <input className="input text-xs flex-1" value={form.imagePanelColor}
                      onChange={e => setForm({ ...form, imagePanelColor: e.target.value })} />
                  </div>
                </div>
              )}

              {/* Advanced — Heading / Body / Buttons (same options as Cookie / Age-Verification / Newsletter) */}
              <div className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input type="checkbox" checked={form.advancedEnabled}
                    onChange={e => setForm({ ...form, advancedEnabled: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500" />
                  <span className="text-xs font-semibold text-slate-700">
                    <i className="fa-solid fa-sliders mr-1.5 text-emerald-500" />Advanced — Heading, Body &amp; Buttons
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
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: "headingColor", label: "Heading Color" },
                        { key: "subColor",     label: "Body Text Color" },
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
                    <TypographyRow title="Typography (Heading)" form={form} setForm={setForm}
                      sizeKey="fontSize" weightKey="fontWeight" formatKey="format" />
                    <TypographyRow title="Typography (Body)" form={form} setForm={setForm}
                      sizeKey="subFontSize" weightKey="subFontWeight" formatKey="subFormat" />
                    <TypographyRow title="Typography (Buttons)" form={form} setForm={setForm}
                      sizeKey="btnFontSize" weightKey="btnFontWeight" formatKey="btnFormat" />
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
                          <label className="block text-xs text-slate-500 mb-1">Padding X</label>
                          <input type="number" className="input text-xs" placeholder="20" value={form.buttonPaddingX}
                            onChange={e => setForm({ ...form, buttonPaddingX: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Padding Y</label>
                          <input type="number" className="input text-xs" placeholder="12" value={form.buttonPaddingY}
                            onChange={e => setForm({ ...form, buttonPaddingY: e.target.value })} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1.5">Corners &amp; Shadow</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Button radius</label>
                          <input type="number" className="input text-xs" placeholder="auto" value={form.btnRadius}
                            onChange={e => setForm({ ...form, btnRadius: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Box shadow</label>
                          <select className="input text-xs" value={form.boxShadow}
                            onChange={e => setForm({ ...form, boxShadow: e.target.value })}>
                            <option value="">Default</option>
                            <option value="none">None</option>
                            <option value="soft">Soft</option>
                            <option value="strong">Strong</option>
                          </select>
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

          {/* Live preview */}
          <div className="card self-start lg:sticky lg:top-6">
            <h2 className="font-semibold text-slate-800 mb-3 text-sm">
              <i className="fa-solid fa-eye mr-2 text-emerald-500" />Live Preview
            </h2>
            <DevicePreviewFrame html={outputHtml} height={480} title="preview" />
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
              <button onClick={() => setStep(2)} className="btn-secondary text-sm">
                <i className="fa-solid fa-arrow-left mr-1" />Edit
              </button>
              <button onClick={() => downloadAsZip(outputHtml, `popup-${domain}`)} className="btn-secondary text-sm">
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
          <div className="card">
            <DevicePreviewFrame html={outputHtml} height={520} title="Final preview" />
          </div>
        </div>
      )}
    </div>
  );
}
