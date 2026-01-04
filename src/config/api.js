// 📁 src/config/api.js
import axios from 'axios';
import socketService from "./socket";
// import { toast } from 'react-toastify'; // not needed now because we use alert

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://rummy-backend-sb29.onrender.com';

console.log('API_BASE_URL:', API_BASE_URL);

// Main API client (used everywhere)
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
});

// Separate client ONLY for refresh calls to avoid interceptor loops
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// --------- REQUEST INTERCEPTOR (attach access token) ----------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --------- RESPONSE INTERCEPTOR (auto-refresh on 401) ----------
let isRefreshing = false;
let pendingRequests = [];
let isLoggingOut = false; // 🔐 NEW: prevents multiple alerts

const processQueue = (error, newToken = null) => {
  pendingRequests.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(newToken);
    }
  });
  pendingRequests = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If we're already in logout flow, don't do anything else
    if (isLoggingOut) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If a refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            resolve: (token) => {
              if (token) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        // Call your backend refresh endpoint
        const res = await refreshClient.post('/api/auth/refresh');
        const newToken = res.data.accessToken;

        if (!newToken) {
          throw new Error('No access token returned from refresh');
        }

        // Save & apply new token
        localStorage.setItem('accessToken', newToken);
        socketService.updateToken(newToken);

        processQueue(null, newToken);
        isRefreshing = false;

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);

        // 🚨 Make sure we only show alert + redirect ONCE
        if (!isLoggingOut) {
          isLoggingOut = true;

          const msg = refreshError.response?.data?.error;

          if (msg === 'Session expired or logged in on another device') {
            alert('You logged in on another device, so this session was closed here.');
          } else {
            alert('Your session has expired. Please sign in again.');
          }

          socketService.disconnect();
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      }
    }

    // Any non-401 errors or second-time failures
    return Promise.reject(error);
  }
);

export default api;