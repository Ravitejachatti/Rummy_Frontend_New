// src/core/socket/SocketManager.jsx
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import socketService from "../config/socket";

export default function SocketManager() {
  const { isAuthenticated, accessToken, bootstrapped } = useSelector((s) => s.auth);

  const prevAuth = useRef(isAuthenticated);

  useEffect(() => {
    if (!bootstrapped) return;

    if (isAuthenticated && accessToken) {
      socketService.connect(accessToken);
    }

    // disconnect only on logout transition
    if (prevAuth.current && !isAuthenticated) {
      socketService.disconnect();
    }

    prevAuth.current = isAuthenticated;
  }, [bootstrapped, isAuthenticated, accessToken]);

  return null;
}