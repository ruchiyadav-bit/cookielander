import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";

// Public pages
import Login    from "./pages/Login";
import Register from "./pages/Register";

// Dashboard pages
import Dashboard      from "./pages/Dashboard";
import CookiePage     from "./pages/modules/CookiePage";
import AgeVerification from "./pages/modules/AgeVerification";
import EmailNewsletter from "./pages/modules/EmailNewsletter";
import LandingPage    from "./pages/modules/LandingPage";
import PopupModule    from "./pages/modules/PopupModule";
import History        from "./pages/History";

// Admin
import AdminPanel from "./pages/admin/AdminPanel";
import PolicyTemplateManager from "./pages/admin/PolicyTemplateManager";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public — root goes straight to login (office / internal use) */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Dashboard — protected, sidebar layout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index            element={<Dashboard />} />
            <Route path="cookie"    element={<CookiePage />} />
            <Route path="age-verify" element={<AgeVerification />} />
            <Route path="newsletter" element={<EmailNewsletter />} />
            <Route path="landing"   element={<LandingPage />} />
            <Route path="popup"     element={<PopupModule />} />
            <Route path="history"   element={<History />} />
          </Route>

          {/* Admin — protected + admin only */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminPanel />} />
            <Route path="policy-templates" element={<PolicyTemplateManager />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
