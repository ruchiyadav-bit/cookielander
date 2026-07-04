import React, { useState } from "react";

export default function DevicePreviewFrame({ html, height = 480, title = "preview", className = "", mode: controlledMode, onModeChange, extraControls = null }) {
  const [internalMode, setInternalMode] = useState("desktop");
  // Optionally controlled from the parent (e.g. Landing Page's final preview,
  // which needs to know the current mode to swap what content is shown) —
  // falls back to owning its own state otherwise, so existing callers are unaffected.
  const mode = controlledMode || internalMode;
  const setMode = onModeChange || setInternalMode;

  return (
    <div className={className}>
      <div className="flex justify-end items-center gap-2 mb-2">
        {extraControls}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          <button onClick={() => setMode("desktop")} title="Desktop view"
            className={`px-2.5 py-1 rounded-md text-sm ${mode === "desktop" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}>
            <i className="fa-solid fa-desktop" />
          </button>
          <button onClick={() => setMode("mobile")} title="Phone view"
            className={`px-2.5 py-1 rounded-md text-sm ${mode === "mobile" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}>
            <i className="fa-solid fa-mobile-screen-button" />
          </button>
        </div>
      </div>

      {mode === "desktop" ? (
        <div className="rounded-lg border border-slate-200 shadow overflow-hidden">
          <div className="h-7 bg-slate-100 rounded-t-lg flex items-center px-3 gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-white rounded text-[10px] text-slate-400 px-3 py-0.5 flex items-center gap-1.5">
                <i className="fa-solid fa-lock text-[9px]" />
                preview
              </div>
            </div>
          </div>
          <iframe
            srcDoc={html}
            title={title}
            sandbox="allow-scripts"
            className="w-full"
            style={{ height }}
          />
        </div>
      ) : (
        <div className="flex justify-center">
          <div className="bg-slate-900 rounded-[36px] shadow-xl" style={{ padding: 14 }}>
            <div className="w-16 h-1.5 bg-slate-700 rounded-full mx-auto mb-2" />
            <iframe
              srcDoc={html}
              title={title}
              sandbox="allow-scripts"
              className="mx-auto block rounded-[24px] overflow-hidden"
              style={{ width: 375, height: 667 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
