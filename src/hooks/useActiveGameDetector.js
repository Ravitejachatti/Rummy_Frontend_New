import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { getActiveGame } from "../store/slices/gameSlice";

/**
 * Authoritative active-game recovery hook.
 *
 * On dashboard/app mount, ask the backend whether this user has an active game.
 * If yes, Redux is rehydrated by getActiveGame and the user is routed back to
 * the live table. The backend remains the only source of truth.
 */
export default function useActiveGameDetector({ enabled = true } = {}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!enabled || ranRef.current) return;
    ranRef.current = true;

    let alive = true;
    dispatch(getActiveGame())
      .unwrap()
      .then((payload) => {
        if (!alive || !payload?.activeGame) return;
        const tableId = payload.activeGame.tableId || payload.tableId;
        const status = String(payload.activeGame.status || "").toUpperCase();
        const phase = String(payload.activeGame.phase || "").toUpperCase();
        const alreadyInGame = location.pathname.startsWith("/game/") || location.pathname.startsWith("/rummy/result/");
        const isTerminal = status === "ENDED" || phase === "ENDED";
        if (tableId && !alreadyInGame && !isTerminal) {
          navigate(`/game/${tableId}`, { replace: true });
        }
      })
      .catch(() => {
        // Recovery is best-effort. Normal dashboard load should continue.
      });

    return () => { alive = false; };
  }, [dispatch, enabled, location.pathname, navigate]);
}
