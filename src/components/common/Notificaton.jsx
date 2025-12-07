// client/src/components/common/NotificationCenter.jsx
import React, { useEffect } from "react";

const typeStyles = {
  error: "bg-red-600/90 text-white",
  warning: "bg-amber-500/90 text-black",
  success: "bg-emerald-500/90 text-black",
  info: "bg-slate-700/90 text-white",
};

export default function NotificationCenter({
  notifications = [],
  onClose,
  position = "top-right",
}) {
  if (!Array.isArray(notifications) || notifications.length === 0) return null;

  // ✅ Only show the latest notification (slice logic already enforces this,
  // but this makes it future-proof)
  const current = notifications[notifications.length - 1];

  const positionClass =
    position === "top-left"
      ? "top-2 left-2"
      : position === "bottom-right"
      ? "bottom-2 right-2"
      : position === "bottom-left"
      ? "bottom-2 left-2"
      : "top-2 right-2";

  // ✅ Auto-dismiss after delay
  useEffect(() => {
    if (!current || !onClose) return;

    const delay = current.autoDismissMs ?? 4000;
    const timer = setTimeout(() => {
      onClose(current.id);
    }, delay);

    // If a new notification comes or component unmounts, clear timer
    return () => clearTimeout(timer);
  }, [current?.id, current?.autoDismissMs, onClose]);

  return (
    <div className={`fixed z-[60] ${positionClass}`}>
      <div
        className={`min-w-[220px] max-w-xs px-3 py-2 rounded-lg shadow-lg text-xs flex items-start justify-between gap-2 ${
          typeStyles[current.type] || typeStyles.info
        }`}
      >
        <div className="flex-1">
          {current.type && (
            <div className="font-semibold capitalize mb-0.5">
              {current.type}
            </div>
          )}
          <div className="leading-snug">{current.message}</div>
        </div>

        <button
          onClick={() => onClose && onClose(current.id)}
          className="ml-1 text-[10px] px-1 rounded hover:bg-black/20"
        >
          ✕
        </button>
      </div>
    </div>
  );
}