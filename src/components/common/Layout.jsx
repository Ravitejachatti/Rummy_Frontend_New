// client/src/layouts/Layout.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getBalance } from "../../store/slices/walletSlice";

export default function Layout({ children }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const { user } = useSelector((s) => s.auth || {});
  const { balance = 0, loading: walletLoading } = useSelector((s) => s.wallet || {});

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (user) {
      dispatch(getBalance());
    }
  }, [dispatch, user?.id]);

  const isDashboard = pathname === "/" || pathname.startsWith("/dashboard");
  const isProfile = pathname.startsWith("/profile");

  const navLinkBase =
    "inline-flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition";
  const navLinkInactive =
    "text-gray-600 hover:text-gray-900 hover:bg-gray-100";
  const navLinkActive = "bg-gray-900 text-white";

  const balanceLabel = walletLoading ? "…" : balance.toLocaleString();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Brand */}
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 rounded-xl bg-gray-900 text-white flex items-center justify-center text-xs font-bold">
              R
            </div>
            <div className="text-left">
              <div className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                Rummy
                <span className="hidden sm:inline text-gray-400 font-normal">
                  {" "}
                  • Minimal
                </span>
              </div>
              <div className="hidden sm:block text-[11px] text-gray-500">
                Play. Compete. Repeat.
              </div>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-2">
            <Link
              to="/dashboard"
              className={`${navLinkBase} ${
                isDashboard ? navLinkActive : navLinkInactive
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/profile"
              className={`${navLinkBase} ${
                isProfile ? navLinkActive : navLinkInactive
              }`}
            >
              Profile
            </Link>
          </nav>

          {/* User pill */}
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="hidden sm:flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs sm:text-sm text-gray-800 hover:bg-gray-200 transition"
            title="View profile & balance"
          >
            <span className="font-medium truncate max-w-[120px]">
              {user?.username || "Player"}
            </span>
            <span className="text-gray-400">•</span>
            <span className="font-semibold">
              {balanceLabel}{" "}
              <span className="text-gray-500 text-[11px]">coins</span>
            </span>
          </button>

          {/* Mobile: balance + hamburger */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-800 hover:bg-gray-200 transition"
              title="Your coins"
            >
              <span className="font-medium">
                {walletLoading ? "…" : balance.toLocaleString()}
              </span>
              <span className="text-gray-500">coins</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
              aria-label="Toggle navigation"
            >
              <span className="sr-only">Toggle navigation</span>
              <div className="space-y-0.5">
                <span className="block w-4 h-[1.5px] bg-gray-800 rounded-full" />
                <span className="block w-4 h-[1.5px] bg-gray-800 rounded-full" />
                <span className="block w-4 h-[1.5px] bg-gray-800 rounded-full" />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="sm:hidden border-t border-gray-200 bg-white">
            <div className="max-w-6xl mx-auto px-4 py-2 flex flex-col gap-2">
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className={`${navLinkBase} ${
                  isDashboard ? navLinkActive : navLinkInactive
                } w-fit`}
              >
                Dashboard
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className={`${navLinkBase} ${
                  isProfile ? navLinkActive : navLinkInactive
                } w-fit`}
              >
                Profile
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 pb-6 pt-4">{children}</main>
    </div>
  );
}