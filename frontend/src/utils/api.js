import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
  headers: { "Content-Type": "application/json" }
});

// Attach JWT on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to /login on 401 — but not for the login/register calls themselves,
// where a 401/409 is just "wrong credentials" / "email in use", not an expired
// session. Redirecting there wiped the error message before the user could
// read it.
const AUTH_ENDPOINTS = ["/api/auth/login", "/api/auth/register"];
api.interceptors.response.use(
  res => res,
  err => {
    const isAuthEndpoint = AUTH_ENDPOINTS.some(p => err.config?.url?.includes(p));
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
