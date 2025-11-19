import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getBalance } from "../../store/slices/walletSlice";

export default function Layout({ children }) {
  const { user } = useSelector((s) => s.auth);
  const { balance } = useSelector((s) => s.wallet);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    dispatch(getBalance());
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="font-bold text-lg">Rummy • Minimal</Link>

          <nav className="flex items-center gap-3">
            <Link to="/dashboard" className={`text-sm ${pathname.startsWith("/dashboard") ? "text-black" : "text-gray-600"}`}>Dashboard</Link>
            <Link to="/profile" className={`text-sm ${pathname.startsWith("/profile") ? "text-black" : "text-gray-600"}`}>Profile</Link>
          </nav>

          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm"
            title="Your coins"
          >
            <span className="font-medium">{user?.username || "Player"}</span>
            <span className="text-gray-500">•</span>
            <span className="font-semibold">{(balance ?? 0).toLocaleString()} coins</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">{children}</main>
    </div>
  );
}
