// src/core/auth/AuthGate.jsx
import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { refreshAccessToken } from "../store/slices/authSlice";

export default function AuthGate({ children, publicOnly = false }) {
  const dispatch = useDispatch();
  const location = useLocation();

  const { isAuthenticated, bootstrapped, loading } = useSelector((s) => s.auth);

  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    // If we have any token, bootstrap by trying refresh once.
    // (Refresh cookie decides if session is valid)
    const hasAnyToken = !!localStorage.getItem("accessToken");
    if (hasAnyToken) dispatch(refreshAccessToken());
    else {
      // no token -> mark bootstrapped via reducer action (below)
      dispatch({ type: "auth/bootstrapped" });
    }
  }, [dispatch]);

  // While bootstrapping, show loading (prevents dashboard flash)
  if (!bootstrapped || loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div>Loading...</div>
      </div>
    );
  }

  // public pages should not show if logged in
  if (publicOnly) {
    return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
  }

  // protected pages: redirect instantly if not authenticated
  return isAuthenticated ? children : <Navigate to="/login" state={{ from: location }} replace />;
}