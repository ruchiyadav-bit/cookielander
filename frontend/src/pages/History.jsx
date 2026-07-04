import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { downloadAsZip, downloadSiteAsZip } from "../utils/zipHelper";
import { extractCookieFields, applyCookieFields, applyAdvancedStyles } from "../utils/templates";
import DevicePreviewFrame from "../components/DevicePreviewFrame";

const SITE_TABS = [
  { key: "index", label: "Home" },
  { key: "privacy", label: "Privacy" },
  { key: "terms", label: "Terms" },
  { key: "disclaimer", label: "Disclaimer" },
  { key: "contact", label: "Contact" }
];

const emptyAdvanced = {
  enabled: false, headingColor: "", subColor: "", boxColor: "",
  fontSize: "", fontWeight: "", format: "normal",
  subFontSize: "", subFontWeight: "", subFormat: "normal",
  buttonColor: "", buttonTextColor: "", btnFontSize: "", btnFontWeight: "", btnFormat: "normal",
  buttonWidth: "", buttonPaddingX: "", buttonPaddingY: ""
};

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

const TYPE_META = {
  cookie:             { label: "Cookie Banner",    icon: "fa-solid fa-cookie-bite",       color: "bg-blue-50 text-blue-700" },
  "age-verification": { label: "Age Gate",         icon: "fa-solid fa-shield-halved",      color: "bg-purple-50 text-purple-700" },
  newsletter:         { label: "Newsletter",        icon: "fa-solid fa-envelope-open-text", color: "bg-green-50 text-green-700" },
  landing:            { label: "Multiple Page LP", icon: "fa-solid fa-globe",              color: "bg-yellow-50 text-yellow-700" },
  popup:              { label: "Popup",             icon: "fa-solid fa-window-restore",     color: "bg-pink-50 text-pink-700" },
  privacy:            { label: "Privacy Policy",    icon: "fa-solid fa-file-shield",        color: "bg-slate-100 text-slate-600" },
  terms:              { label: "Terms",             icon: "fa-solid fa-file-contract",      color: "bg-slate-100 text-slate-600" },
  contact:            { label: "Contact",           icon: "fa-solid fa-address-card",       color: "bg-slate-100 text-slate-600" },
  disclaimer:         { label: "Disclaimer",        icon: "fa-solid fa-file-circle-exclamation", color: "bg-slate-100 text-slate-600" },
};

const POLICY_TYPES = ["privacy", "terms", "contact", "disclaimer"];

function RowActions({ page, siblingPolicyPages = [], onPreview, onEdit, onDownload, onDelete, deleting }) {
  return (
    <div className="flex gap-3">
      <button onClick={() => onPreview(page, siblingPolicyPages)}
        className="text-xs text-emerald-600 hover:underline font-medium">
        <i className="fa-solid fa-eye mr-1" />Preview
      </button>
      <button onClick={() => onEdit(page, siblingPolicyPages)}
        className="text-xs text-slate-600 hover:underline font-medium">
        <i className="fa-solid fa-pen-to-square mr-1" />Edit
      </button>
      <button onClick={() => onDownload(page, siblingPolicyPages)}
        className="text-xs text-slate-600 hover:underline font-medium">
        <i className="fa-solid fa-download mr-1" />ZIP
      </button>
      <button onClick={() => onDelete(page.id)} disabled={deleting === page.id}
        className="text-xs text-red-400 hover:underline font-medium disabled:opacity-40">
        <i className="fa-solid fa-trash mr-1" />{deleting === page.id ? "…" : "Delete"}
      </button>
    </div>
  );
}

export default function History() {
  const navigate = useNavigate();
  const [pages, setPages]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  // Multi-page preview for Multiple Page LP projects — { domain, pages: {index, privacy, ...}, activeTab }
  const [sitePreview, setSitePreview] = useState(null);
  const [sitePreviewMode, setSitePreviewMode] = useState("desktop");
  const [editing, setEditing] = useState(null); // { id, type, domain, html_content }
  const [editFields, setEditFields] = useState(null); // { headline, bodyCopy, acceptText, declineText, acceptUrl, declineUrl }
  const [editAdvanced, setEditAdvanced] = useState(emptyAdvanced);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch]   = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedGroups, setExpandedGroups] = useState({}); // domain -> bool

  const toggleGroup = (domain) => setExpandedGroups(g => ({ ...g, [domain]: !g[domain] }));

  useEffect(() => {
    api.get("/api/pages").then(r => setPages(r.data)).finally(() => setLoading(false));
  }, []);

  // Fetches a landing page's own html_content plus its sibling compliance
  // pages' (already-generated) html_content, keyed by filename — used by
  // both the multi-page preview and the ZIP download below.
  const loadSitePages = async (page, siblingPolicyPages) => {
    const [own, ...siblings] = await Promise.all([
      api.get(`/api/pages/${page.id}`),
      ...siblingPolicyPages.map(pp => api.get(`/api/pages/${pp.id}`))
    ]);
    const out = { index: own.data.html_content };
    siblings.forEach((r, i) => { out[siblingPolicyPages[i].type] = r.data.html_content; });
    return out;
  };

  const openPreview = async (page, siblingPolicyPages = []) => {
    if (page.type === "landing") {
      const sitePages = await loadSitePages(page, siblingPolicyPages);
      setSitePreviewMode("desktop");
      setSitePreview({ domain: page.domain, pages: sitePages, activeTab: "index" });
      return;
    }
    const { data } = await api.get(`/api/pages/${page.id}`);
    setPreview(data);
  };

  const openEdit = async (page) => {
    if (page.type === "landing") {
      // Full re-editing (domain/industry/content/widget) happens back in the
      // wizard itself, which restores everything from the saved project.
      navigate(`/dashboard/landing?edit=${page.id}`);
      return;
    }
    const { data } = await api.get(`/api/pages/${page.id}`);
    setEditing(data);
    setEditFields(extractCookieFields(data.html_content || ""));
    setEditAdvanced(emptyAdvanced);
  };

  const editPreviewHtml = useMemo(() => {
    if (!editing || !editFields) return "";
    const withFields = applyCookieFields(editing.html_content, editFields);
    return applyAdvancedStyles(withFields, editAdvanced);
  }, [editing, editFields, editAdvanced]);

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      await api.put(`/api/pages/${editing.id}`, {
        type: editing.type, domain: editing.domain, html_content: editPreviewHtml
      });
      setPages(p => p.map(x => x.id === editing.id ? { ...x, html_content: editPreviewHtml } : x));
      setEditing(null);
    } finally { setSavingEdit(false); }
  };

  const deletePage = async (id) => {
    if (!window.confirm("Delete this page?")) return;
    setDeleting(id);
    try {
      await api.delete(`/api/pages/${id}`);
      setPages(p => p.filter(x => x.id !== id));
    } finally { setDeleting(null); }
  };

  const redownload = async (page, siblingPolicyPages = []) => {
    if (page.type === "landing") {
      const sitePages = await loadSitePages(page, siblingPolicyPages);
      downloadSiteAsZip(sitePages, `site-${page.domain || page.id}`);
      return;
    }
    const { data } = await api.get(`/api/pages/${page.id}`);
    downloadAsZip(data.html_content, `${page.type}-${page.id}`);
  };

  const fmt = d => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const filtered = pages.filter(p => {
    const matchType = typeFilter === "all"
      || p.type === typeFilter
      || (typeFilter === "compliance" && POLICY_TYPES.includes(p.type));
    const matchSearch = !search || p.domain?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  // Group privacy/terms/contact/disclaimer pages under the landing page that
  // shares their domain (README §6.6/§7). Landing pages with no matching
  // policy pages, and every other type, render as flat rows like before.
  const { groups, ungrouped } = useMemo(() => {
    const byDomainGroup = {}; // domain -> { landing: page|null, policyPages: [] }
    const flat = [];

    filtered.forEach(p => {
      if (p.type === "landing" && p.domain) {
        byDomainGroup[p.domain] = byDomainGroup[p.domain] || { landing: null, policyPages: [] };
        byDomainGroup[p.domain].landing = p;
      } else if (POLICY_TYPES.includes(p.type) && p.domain) {
        byDomainGroup[p.domain] = byDomainGroup[p.domain] || { landing: null, policyPages: [] };
        byDomainGroup[p.domain].policyPages.push(p);
      } else {
        flat.push(p);
      }
    });

    // Only treat it as a "group" (with an expandable row) if there's an
    // actual landing page and at least one policy page under it; otherwise
    // fall back to flat rows so lone policy pages / lone landing pages still show.
    const groupList = [];
    Object.entries(byDomainGroup).forEach(([domain, g]) => {
      if (g.landing && g.policyPages.length > 0) {
        groupList.push({ domain, ...g });
      } else {
        if (g.landing) flat.push(g.landing);
        g.policyPages.forEach(pp => flat.push(pp));
      }
    });

    return { groups: groupList, ungrouped: flat };
  }, [filtered]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">
          <i className="fa-solid fa-clock-rotate-left mr-2" style={{ color: "#059669" }} />Page History
        </h1>
        <p className="text-slate-500 text-sm mt-1">All your generated and saved pages</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input className="input pl-8" placeholder="Search by domain…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-44" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">All types</option>
          <option value="cookie">Cookie Banner</option>
          <option value="age-verification">Age Gate</option>
          <option value="newsletter">Newsletter</option>
          <option value="landing">Multiple Page LP</option>
          <option value="popup">Popup</option>
          <option value="compliance">Compliance Pages (Privacy/Terms/Contact/Disclaimer)</option>
        </select>
        <span className="text-sm text-slate-400 self-center">{filtered.length} page{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">
          <i className="fa-solid fa-file-circle-xmark text-4xl mb-3" />
          <p className="text-sm">{pages.length === 0 ? "No pages yet — try a module!" : "No pages match your filters."}</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
              <tr>
                {["Type", "Domain / Name", "Created", "Actions"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Landing pages grouped with their Privacy/Terms/Contact/Disclaimer pages */}
              {groups.map(g => {
                const m = TYPE_META.landing;
                const isOpen = expandedGroups[g.domain] !== false; // expanded by default
                return (
                  <React.Fragment key={`group-${g.domain}`}>
                    <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors bg-slate-50/30">
                      <td className="px-5 py-3.5">
                        <span className={`badge ${m.color}`}>
                          <i className={`${m.icon} text-xs`} /> {m.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-700">
                        <button onClick={() => toggleGroup(g.domain)} className="flex items-center gap-2 hover:text-emerald-600">
                          <i className={`fa-solid ${isOpen ? "fa-chevron-down" : "fa-chevron-right"} text-xs text-slate-400`} />
                          {g.domain || "—"}
                          <span className="text-xs text-slate-400 font-normal">({g.policyPages.length} compliance page{g.policyPages.length !== 1 ? "s" : ""})</span>
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 text-xs">{fmt(g.landing.created_at)}</td>
                      <td className="px-5 py-3.5">
                        <RowActions page={g.landing} siblingPolicyPages={g.policyPages} onPreview={openPreview} onEdit={openEdit} onDownload={redownload} onDelete={deletePage} deleting={deleting} />
                      </td>
                    </tr>
                    {isOpen && g.policyPages.map(pp => {
                      const pm = TYPE_META[pp.type] || TYPE_META.landing;
                      return (
                        <tr key={pp.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3 pl-10">
                            <span className={`badge ${pm.color}`}>
                              <i className={`${pm.icon} text-xs`} /> {pm.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-500 text-xs">↳ {pp.domain || "—"}</td>
                          <td className="px-5 py-3 text-slate-400 text-xs">{fmt(pp.created_at)}</td>
                          <td className="px-5 py-3">
                            <RowActions page={pp} onPreview={openPreview} onEdit={openEdit} onDownload={redownload} onDelete={deletePage} deleting={deleting} />
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* Everything else — flat rows, same as before */}
              {ungrouped.map(p => {
                const m = TYPE_META[p.type] || TYPE_META.landing;
                return (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className={`badge ${m.color}`}>
                        <i className={`${m.icon} text-xs`} /> {m.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-700">{p.domain || "—"}</td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">{fmt(p.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <RowActions page={p} onPreview={openPreview} onEdit={openEdit} onDownload={redownload} onDelete={deletePage} deleting={deleting} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <span className="font-semibold text-slate-800">
                <i className="fa-solid fa-eye mr-2 text-emerald-500" />{preview.domain || "Preview"}
              </span>
              <div className="flex gap-2">
                <button onClick={() => downloadAsZip(preview.html_content, `${preview.type}-${preview.id}`)}
                  className="btn-secondary text-xs py-1.5 px-3">
                  <i className="fa-solid fa-download mr-1" />ZIP
                </button>
                <button onClick={() => setPreview(null)} className="text-slate-400 hover:text-slate-600 text-xl px-1">×</button>
              </div>
            </div>
            <iframe srcDoc={preview.html_content} title="Preview" className="flex-1 w-full rounded-b-2xl" sandbox="allow-scripts" />
          </div>
        </div>
      )}

      {/* Multi-page preview modal — Multiple Page LP projects (index + any
          generated compliance pages), with the same real desktop/mobile
          device-accurate frame used in the wizard's own final step. */}
      {sitePreview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-2xl shadow-2xl w-[97vw] h-[96vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
              <span className="font-semibold text-slate-800">
                <i className="fa-solid fa-globe mr-2 text-emerald-500" />{sitePreview.domain || "Preview"}
              </span>
              <div className="flex gap-2">
                <button onClick={() => downloadSiteAsZip(sitePreview.pages, `site-${sitePreview.domain}`)}
                  className="btn-secondary text-xs py-1.5 px-3">
                  <i className="fa-solid fa-download mr-1" />ZIP
                </button>
                <button onClick={() => setSitePreview(null)} className="text-slate-400 hover:text-slate-600 text-xl px-1">×</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <DevicePreviewFrame
                mode={sitePreviewMode}
                onModeChange={setSitePreviewMode}
                html={sitePreview.pages[sitePreview.activeTab] || ""}
                height="80vh"
                title="Site preview"
                extraControls={sitePreviewMode === "desktop" ? (
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5 mr-1">
                    {SITE_TABS.filter(t => t.key === "index" || sitePreview.pages[t.key]).map(t => (
                      <button key={t.key} onClick={() => setSitePreview(sp => ({ ...sp, activeTab: t.key }))}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium ${sitePreview.activeTab === t.key ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit modal — simple field editor, same as the creation wizard, full screen */}
      {editing && editFields && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <span className="font-semibold text-slate-800">
              <i className="fa-solid fa-pen-to-square mr-2 text-emerald-500" />Edit — {editing.domain || "Page"}
            </span>
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={savingEdit} className="btn-primary text-sm py-2 px-4">
                {savingEdit ? <><i className="fa-solid fa-spinner fa-spin mr-1" />Saving…</> : <><i className="fa-solid fa-floppy-disk mr-1" />Save Changes</>}
              </button>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600 text-2xl px-2">×</button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 flex-1 overflow-y-auto">
              <div className="p-8 space-y-5 border-r border-slate-100 max-w-xl mx-auto w-full">
                {[
                  { key: "headline",    label: "Headline (title)",      tag: "input" },
                  { key: "bodyCopy",    label: "Subheading / Body Copy", tag: "textarea" },
                  { key: "acceptText",  label: "Accept Button Text",    tag: "input" },
                  { key: "declineText", label: "Decline Button Text",   tag: "input" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                    {f.tag === "textarea"
                      ? <textarea rows={3} className="input resize-none text-sm" value={editFields[f.key]}
                          onChange={e => setEditFields({ ...editFields, [f.key]: e.target.value })} />
                      : <input className="input text-sm" value={editFields[f.key]}
                          onChange={e => setEditFields({ ...editFields, [f.key]: e.target.value })} />
                    }
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Accept Button URL</label>
                    <input className="input text-sm" placeholder="optional" value={editFields.acceptUrl}
                      onChange={e => setEditFields({ ...editFields, acceptUrl: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Decline Button URL</label>
                    <input className="input text-sm" placeholder="optional" value={editFields.declineUrl}
                      onChange={e => setEditFields({ ...editFields, declineUrl: e.target.value })} />
                  </div>
                </div>

                {/* Advanced — Background & Styling */}
                <div className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                  <label className="flex items-center gap-2 mb-3 cursor-pointer">
                    <input type="checkbox" checked={editAdvanced.enabled}
                      onChange={e => setEditAdvanced({ ...editAdvanced, enabled: e.target.checked })}
                      className="w-4 h-4 accent-emerald-500" />
                    <span className="text-xs font-semibold text-slate-700">
                      <i className="fa-solid fa-sliders mr-1.5 text-emerald-500" />Advanced — Background &amp; Styling
                    </span>
                  </label>

                  {editAdvanced.enabled && (
                    <div className="space-y-4">
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
                              <input type="color" value={editAdvanced[f.key] || "#000000"}
                                onChange={e => setEditAdvanced({ ...editAdvanced, [f.key]: e.target.value })}
                                className="w-8 h-8 rounded border border-slate-200 cursor-pointer" />
                              <input className="input text-xs flex-1" placeholder="auto" value={editAdvanced[f.key]}
                                onChange={e => setEditAdvanced({ ...editAdvanced, [f.key]: e.target.value })} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <TypographyRow title="Typography (Heading)" form={editAdvanced} setForm={setEditAdvanced}
                        sizeKey="fontSize" weightKey="fontWeight" formatKey="format" />

                      <TypographyRow title="Typography (Subheading / Body)" form={editAdvanced} setForm={setEditAdvanced}
                        sizeKey="subFontSize" weightKey="subFontWeight" formatKey="subFormat" />

                      <TypographyRow title="Typography (Button Text)" form={editAdvanced} setForm={setEditAdvanced}
                        sizeKey="btnFontSize" weightKey="btnFontWeight" formatKey="btnFormat" />

                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1.5">Button Size &amp; Spacing</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Width</label>
                            <select className="input text-xs" value={editAdvanced.buttonWidth}
                              onChange={e => setEditAdvanced({ ...editAdvanced, buttonWidth: e.target.value })}>
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
                            <input type="number" className="input text-xs" placeholder="24" value={editAdvanced.buttonPaddingX}
                              onChange={e => setEditAdvanced({ ...editAdvanced, buttonPaddingX: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Padding Y (px)</label>
                            <input type="number" className="input text-xs" placeholder="13" value={editAdvanced.buttonPaddingY}
                              onChange={e => setEditAdvanced({ ...editAdvanced, buttonPaddingY: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <iframe srcDoc={editPreviewHtml} title="Edit preview" className="w-full h-full min-h-[360px]" sandbox="allow-scripts" />
          </div>
        </div>
      )}
    </div>
  );
}
