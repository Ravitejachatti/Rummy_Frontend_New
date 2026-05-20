import React from "react";
import { ShieldAlert } from "lucide-react";

const REVIEW_STATUSES = new Set([
  "MANUAL_REVIEW",
  "SETTLEMENT_REVIEW",
  "REVIEW_REQUIRED",
  "WALLET_FROZEN",
]);

export default function SecurityOverlay({ error, settlementStatus, onClose }) {
  const code = error?.code || null;
  const status = String(settlementStatus || "").toUpperCase();
  const shouldShow = code === "ERR_WALLET_FROZEN" || REVIEW_STATUSES.has(status);

  if (!shouldShow) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="max-w-md rounded-3xl border border-amber-300/25 bg-slate-950 p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-300/15 text-amber-200">
          <ShieldAlert size={28} />
        </div>
        <h2 className="text-xl font-black text-white">Account Under Review</h2>
        <p className="mt-3 text-sm leading-6 text-white/70">
          Our reconciliation system detected a balance mismatch or protected state.
          An admin is reviewing this hand to ensure fair play. Funds are safe.
        </p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/50">
          Status: <span className="font-bold text-amber-200">{status || code}</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="mt-5 rounded-2xl bg-amber-300 px-5 py-2 text-sm font-black text-slate-950 active:scale-95"
          >
            I Understand
          </button>
        )}
      </div>
    </div>
  );
}
