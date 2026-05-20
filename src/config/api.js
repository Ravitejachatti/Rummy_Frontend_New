// 📁 src/config/api.js
import axios from "axios";
import socketService from "./socket";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://rummy-backend-sb29.onrender.com";

console.log("API_BASE_URL:", API_BASE_URL);

// Main API client (used everywhere)
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
});

// Separate client ONLY for refresh calls (no interceptor loops)
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
});

// --------- REQUEST INTERCEPTOR (attach access token) ----------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --------- RESPONSE INTERCEPTOR (single-flight refresh) ----------
let isLoggingOut = false;
let refreshPromise = null;

function logoutAndRedirect(message) {
  if (isLoggingOut) return;
  isLoggingOut = true;

  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");

  window.dispatchEvent(
    new CustomEvent("auth:logout", {
      detail: { message: message || "Your session has expired. Please sign in again." },
    })
  );
}

async function getNewAccessToken() {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post("/api/auth/refresh")
      .then((res) => {
        const newToken = res.data?.accessToken;
        if (!newToken) throw new Error("No access token returned from refresh");

        localStorage.setItem("accessToken", newToken);

        // ✅ only update token on socket (do NOT connect/disconnect here)
        if (typeof socketService.updateToken === "function") {
          socketService.updateToken(newToken);
        }

        return newToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    if (isLoggingOut) return Promise.reject(error);
    if (!originalRequest) return Promise.reject(error);

    const url = originalRequest?.url || "";
    const isAuthEndpoint =
      url.includes("/api/auth/refresh") ||
      url.includes("/api/auth/login") ||
      url.includes("/api/auth/signup") ||
      url.includes("/api/auth/logout");

    // ✅ Auto-refresh for non-auth endpoints
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const newToken = await getNewAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        const code = refreshError.response?.data?.error;

        if (code === "SESSION_REVOKED") {
          logoutAndRedirect("You logged in on another device, so this session was closed here.");
        } else {
          logoutAndRedirect("Your session has expired. Please sign in again.");
        }

        return Promise.reject(refreshError);
      }
    }

    // ✅ If an auth endpoint fails with 401/403, logout immediately
    if (isAuthEndpoint && (error.response?.status === 401 || error.response?.status === 403)) {
      const code = error.response?.data?.error;

      if (code === "SESSION_REVOKED") {
        logoutAndRedirect("You logged in on another device, so this session was closed here.");
      } else if (code === "BANNED") {
        logoutAndRedirect("Your account is banned.");
      } else {
        logoutAndRedirect("Your session has expired. Please sign in again.");
      }
    }

    return Promise.reject(error);
  }
);

export { refreshClient };
export default api;