// src/core/socket/SocketManager.jsx
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import socketService from "../config/socket";
import { localLogout } from "../store/slices/authSlice";

export default function SocketManager() {
  const dispatch = useDispatch();
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

  useEffect(() => {
    const onAuthLogout = (event) => {
      const message = event?.detail?.message;
      if (message) window.alert(message);
      socketService.disconnect();
      dispatch(localLogout());
    };
    window.addEventListener("auth:logout", onAuthLogout);
    return () => window.removeEventListener("auth:logout", onAuthLogout);
  }, [dispatch]);

  return null;
}