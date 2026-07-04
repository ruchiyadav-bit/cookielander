import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/dashboard",             label: "Dashboard",        icon: "fa-solid fa-gauge-high",     end: true },
  { to: "/dashboard/cookie",      label: "Cookie Banner",    icon: "fa-solid fa-cookie" },
  { to: "/dashboard/age-verify",  label: "Age Verification", icon: "fa-solid fa-shield-halved" },
  { to: "/dashboard/newsletter",  label: "Email Newsletter", icon: "fa-regular fa-envelope" },
  { to: "/dashboard/landing",     label: "Multiple Page LP", icon: "fa-regular fa-file-lines",    feat: "landing_pages" },
  { to: "/dashboard/popup",       label: "Popup Widgets",    icon: "fa-solid fa-table-cells-large", feat: "popup_module" },
  { to: "/dashboard/history",     label: "Page History",     icon: "fa-solid fa-clock-rotate-left" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const features = typeof user?.features_enabled === "string"
    ? JSON.parse(user.features_enabled) : (user?.features_enabled || {});
  const visibleNav = NAV.filter(item => !item.feat || features[item.feat] !== false);

  return (
    <aside
      style={{ background: "#0f172a", width: collapsed ? 64 : 240 }}
      className="min-h-screen flex flex-col transition-all duration-200 shrink-0"
    >
      {/* Logo row */}
      <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: "1px solid #1e293b" }}>
        {!collapsed && (
          <span className="font-semibold text-white text-sm tracking-tight truncate">
            <i className="fa-solid fa-layer-group mr-2" style={{ color: "#14b8a6" }} />
            Lander Generation
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1.5 rounded-md transition-colors hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <i className={`fa-solid ${collapsed ? "fa-chevron-right" : "fa-chevron-left"} text-xs`} />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {visibleNav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 group
               ${isActive
                 ? "text-white"
                 : "text-slate-400 hover:text-white hover:bg-slate-800"
               }`
            }
            style={({ isActive }) => isActive ? { background: "#0f766e" } : {}}
          >
            <i className={`${item.icon} w-4 text-center shrink-0`} style={{ fontSize: 14 }} />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}

        {/* Admin link */}
        {user?.role === "admin" && (
          <>
            <div className="my-3 mx-2" style={{ borderTop: "1px solid #1e293b" }} />
            <NavLink
              to="/admin"
              title={collapsed ? "Admin Panel" : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150
                 ${isActive ? "bg-red-700 text-white" : "text-red-400 hover:bg-slate-800 hover:text-red-300"}`
              }
            >
              <i className="fa-solid fa-user-shield w-4 text-center shrink-0" style={{ fontSize: 14 }} />
              {!collapsed && <span>Admin Panel</span>}
            </NavLink>
            <NavLink
              to="/admin/policy-templates"
              title={collapsed ? "Policy Templates" : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150
                 ${isActive ? "bg-red-700 text-white" : "text-red-400 hover:bg-slate-800 hover:text-red-300"}`
              }
            >
              <i className="fa-solid fa-file-shield w-4 text-center shrink-0" style={{ fontSize: 14 }} />
              {!collapsed && <span>Policy Templates</span>}
            </NavLink>
          </>
        )}
      </nav>

      {/* User + logout */}
      <div className="px-2 py-3" style={{ borderTop: "1px solid #1e293b" }}>
        {!collapsed && (
          <div className="px-3 pb-2">
            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        )}
        <button
          onClick={() => { logout(); navigate("/login"); }}
          title={collapsed ? "Logout" : undefined}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
        >
          <i className="fa-solid fa-right-from-bracket w-4 text-center shrink-0" style={{ fontSize: 14 }} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
