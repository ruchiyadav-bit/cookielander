import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../utils/api";

const TYPE_LABELS = {
  privacy: { label: "Privacy Policy", icon: "fa-solid fa-file-shield" },
  terms: { label: "Terms & Conditions", icon: "fa-solid fa-file-contract" },
  contact: { label: "Contact", icon: "fa-solid fa-address-card" },
  disclaimer: { label: "Disclaimer", icon: "fa-solid fa-file-circle-exclamation" }
};
const TYPE_ORDER = ["privacy", "terms", "contact", "disclaimer"];
const NICHES = ["cbd", "nutra"];

// Body content is stored as HTML paragraphs (<p>...</p>) so the generated
// page renders correctly, but admins shouldn't have to read/write raw markup.
// These convert transparently between "plain text, blank line = new
// paragraph" (what the admin sees/types) and the stored HTML.
function htmlParasToText(html = "") {
  const matches = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  if (!matches.length) return html; // not paragraph-wrapped — show as-is
  return matches.map(m => m[1].trim()).join("\n\n");
}
function textToHtmlParas(text = "") {
  return text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => `<p>${p}</p>`).join("\n");
}

const emptyDraft = { heading: "", header_content: "", body_content: "", footer_content: "" };

export default function PolicyTemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);

  // Selection flow: pick a page type card, then a module (niche) — only then
  // does the editor for that exact (type, niche) template appear.
  const [selectedType, setSelectedType]   = useState(null);
  const [selectedNiche, setSelectedNiche] = useState(null);
  const [draft, setDraft]         = useState(emptyDraft);
  const [savingId, setSavingId]   = useState(null);
  const [saveMsg, setSaveMsg]     = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false); // shows raw header/footer HTML

  // User authorization lookup
  const [users, setUsers]         = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [togglingUserId, setTogglingUserId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [tRes, uRes] = await Promise.all([
        api.get("/api/admin/policy-templates"),
        api.get("/api/admin/users")
      ]);
      setTemplates(tRes.data);
      setUsers(uRes.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const selectedTemplate = templates.find(t => t.type === selectedType && t.niche === selectedNiche) || null;

  // Load the selected template's saved values into the draft whenever the
  // selection changes, so switching cards never leaks the previous edit.
  useEffect(() => {
    if (selectedTemplate) {
      setDraft({
        heading: selectedTemplate.heading || "",
        header_content: selectedTemplate.header_content || "",
        body_content: selectedTemplate.body_content || "",
        footer_content: selectedTemplate.footer_content || ""
      });
      setAdvancedOpen(false);
      setSaveMsg("");
    } else {
      setDraft(emptyDraft);
    }
  }, [selectedTemplate?.id]);

  const parseFeatures = (f) => {
    if (!f) return {};
    return typeof f === "string" ? JSON.parse(f) : f;
  };

  const pickType = (type) => {
    setSelectedType(t => t === type ? null : type);
    setSelectedNiche(null);
  };

  const saveTemplate = async () => {
    if (!selectedTemplate) return;
    setSavingId(selectedTemplate.id); setSaveMsg("");
    try {
      const { data } = await api.put(`/api/admin/policy-templates/${selectedTemplate.id}`, draft);
      setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? data : t));
      setSaveMsg("Saved!");
    } catch (err) {
      setSaveMsg(err.response?.data?.message || "Failed to save");
    } finally {
      setSavingId(null);
      setTimeout(() => setSaveMsg(""), 2500);
    }
  };

  const toggleUserAuthorization = async (userId, enabled) => {
    setTogglingUserId(userId);
    try {
      await api.put(`/api/admin/users/${userId}/policy-authorization`, { enabled });
      setUsers(prev => prev.map(u => {
        if (u.id !== userId) return u;
        const features = { ...parseFeatures(u.features_enabled), policy_template_edit: enabled };
        return { ...u, features_enabled: features };
      }));
    } finally { setTogglingUserId(null); }
  };

  const filteredUsers = users.filter(u =>
    !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            <i className="fa-solid fa-file-shield mr-2" style={{ color: "#059669" }} />Policy Template Manager
          </h1>
          <p className="text-slate-500 text-sm mt-1">Pick a page, pick a module, then edit its heading and content</p>
        </div>
        <Link to="/admin" className="btn-secondary text-sm">
          <i className="fa-solid fa-arrow-left mr-2" />Back to Admin Panel
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-emerald-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10 items-start">
            {/* Left: 4 page-type cards + module (niche) selector */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {TYPE_ORDER.map(type => {
                  const meta = TYPE_LABELS[type];
                  const active = selectedType === type;
                  return (
                    <button key={type} type="button" onClick={() => pickType(type)}
                      className={`card text-center p-4 cursor-pointer transition-all ${active ? "ring-2 ring-emerald-500 border-emerald-200" : "hover:border-slate-300 hover:shadow-sm"}`}>
                      <i className={`${meta.icon} text-xl mb-2 block`} style={{ color: "#059669" }} />
                      <p className="text-sm font-semibold text-slate-800">{meta.label}</p>
                    </button>
                  );
                })}
              </div>

              {selectedType && (
                <div className="card">
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    <i className="fa-solid fa-layer-group mr-1.5 text-emerald-500" />Select Module
                  </p>
                  <div className="flex gap-2">
                    {NICHES.map(n => (
                      <button key={n} type="button" onClick={() => setSelectedNiche(n)}
                        className={`flex-1 text-xs font-semibold py-2 rounded-md border transition-colors ${selectedNiche === n ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
                        {n.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: editor for the selected (type, niche) template */}
            <div className="lg:col-span-3">
              {!selectedTemplate ? (
                <div className="card text-center py-16 text-slate-400">
                  <i className="fa-solid fa-arrow-left text-2xl mb-3 block" />
                  <p className="text-sm">
                    {selectedType ? "Now select a module (CBD or Nutra)" : "Select a page type to get started"}
                  </p>
                </div>
              ) : (
                <div className="card">
                  <h2 className="font-semibold text-slate-800 mb-4">
                    <i className={`${TYPE_LABELS[selectedType].icon} mr-2 text-emerald-500`} />{TYPE_LABELS[selectedType].label}
                    <span className="ml-2 badge bg-slate-100 text-slate-500 uppercase">{selectedNiche}</span>
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Page Heading</label>
                      <input className="input text-sm" value={draft.heading}
                        placeholder={TYPE_LABELS[selectedType].label}
                        onChange={e => setDraft(d => ({ ...d, heading: e.target.value }))} />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Page Content</label>
                      <p className="text-xs text-slate-400 mb-1">
                        Plain text — leave a blank line between paragraphs. Use <code>{"{{domain}}"}</code> / <code>{"{{brand}}"}</code> anywhere and they'll be swapped for the real domain/brand when a page is generated.
                      </p>
                      <textarea rows={9} className="input resize-none text-sm"
                        value={htmlParasToText(draft.body_content)}
                        onChange={e => setDraft(d => ({ ...d, body_content: textToHtmlParas(e.target.value) }))} />
                    </div>

                    <button type="button"
                      className="text-xs font-medium text-slate-500 hover:text-emerald-600"
                      onClick={() => setAdvancedOpen(o => !o)}>
                      <i className={`fa-solid fa-chevron-${advancedOpen ? "down" : "right"} mr-1.5 text-[10px]`} />
                      Advanced — header &amp; footer markup
                    </button>

                    {advancedOpen && (
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Header Content (HTML)</label>
                          <textarea rows={2} className="input resize-none text-xs font-mono"
                            value={draft.header_content}
                            onChange={e => setDraft(d => ({ ...d, header_content: e.target.value }))} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Footer Content (HTML)</label>
                          <textarea rows={2} className="input resize-none text-xs font-mono"
                            value={draft.footer_content}
                            onChange={e => setDraft(d => ({ ...d, footer_content: e.target.value }))} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-5">
                    <button className="btn-primary text-sm" disabled={savingId === selectedTemplate.id} onClick={saveTemplate}>
                      {savingId === selectedTemplate.id
                        ? <><i className="fa-solid fa-spinner fa-spin mr-1" />Saving…</>
                        : <><i className="fa-solid fa-floppy-disk mr-1" />Save</>}
                    </button>
                    {saveMsg && <span className="text-xs text-slate-500">{saveMsg}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* User authorization */}
          <div className="card">
            <h2 className="font-semibold text-slate-800 mb-2">
              <i className="fa-solid fa-user-lock mr-2 text-emerald-500" />Per-User Policy Edit Authorization
            </h2>
            <p className="text-sm text-slate-500 mb-3">
              Regular users can only edit the copy on their own already-generated compliance pages if you turn this on for them. Off by default.
            </p>
            <input className="input text-sm mb-4 max-w-sm" placeholder="Search users by name or email…"
              value={userSearch} onChange={e => setUserSearch(e.target.value)} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  <tr>
                    {["User", "Policy Edit Authorized", ""].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => {
                    const features = parseFeatures(u.features_enabled);
                    const enabled = features.policy_template_edit === true;
                    return (
                      <tr key={u.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{u.name}</p>
                          <p className="text-slate-400 text-xs">{u.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${enabled ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400"}`}>
                            {enabled ? "Authorized" : "Not authorized"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            disabled={togglingUserId === u.id}
                            onClick={() => toggleUserAuthorization(u.id, !enabled)}
                            className={`relative w-9 h-5 rounded-full transition-colors ${enabled ? "bg-emerald-500" : "bg-slate-300"} disabled:opacity-50`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${enabled ? "translate-x-4" : ""}`} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
