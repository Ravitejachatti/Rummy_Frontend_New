// 📁 src/pages/Lobby.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock3, Coins, Loader2, Lock, RotateCcw, ShieldCheck, Users, Volume2, Wifi } from "lucide-react";
import socketService from "../config/socket";
import { fetchTables } from "../store/slices/tableSlice";
import { addNotification, joinTable, setCurrentTurn, setGameStatus, setPlayers } from "../store/slices/gameSlice";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import { normalizeErrorMessage } from "../utils/normalizeError";
import { normalizeGameStatePayload } from "../utils/normalizeGameSocketPayload";
import useSound from "../hooks/useSound";

function getJoinedPlayers(statePlayers, table) {
  if (Array.isArray(statePlayers) && statePlayers.length) return statePlayers;
  if (Array.isArray(table?.players)) return table.players;
  if (Array.isArray(table?.currentPlayers)) return table.currentPlayers;
  return [];
}

function isGameStartedState(state) {
  const phase = String(state?.phase || "").toUpperCase();
  const status = String(state?.status || "").toLowerCase();
  return Boolean(state?.gameId || state?.activeGameId || phase === "PLAYING" || status === "playing");
}

export default function Lobby() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { play, unlock } = useSound();

  const { user } = useSelector((s) => s.auth);
  const { tables = [], loading: tablesLoading, error: tablesError } = useSelector((s) => s.table);
  const { players = [], currentTurn, gameStatus } = useSelector((s) => s.game);

  const [joining, setJoining] = useState(true);
  const [socketReady, setSocketReady] = useState(false);
  const [statusText, setStatusText] = useState("Connecting to table…");
  const [gameId, setGameId] = useState(null);
  const [flowPhase, setFlowPhase] = useState("LOBBY");

  const joinSentRef = useRef(false);
  const gameStartedRef = useRef(false);
  const navigatedRef = useRef(false);
  const lastPlayerCountRef = useRef(0);

  const meId = user?._id || user?.id || user?.userId;

  useEffect(() => {
    if (!tables?.length) dispatch(fetchTables());
  }, [dispatch, tables?.length]);

  const table = useMemo(() => tables.find((t) => String(t._id) === String(tableId)) || null, [tables, tableId]);
  const joinedPlayers = useMemo(() => getJoinedPlayers(players, table), [players, table]);
  const joinedCount = joinedPlayers.length;
  const maxPlayers = Number(table?.maxPlayers || 6);
  const minPlayers = Number(table?.minPlayers || 2);
  const entry = Number(table?.bankRange ?? table?.chipValue ?? 0);
  const seats = Array.from({ length: maxPlayers }, (_, i) => joinedPlayers[i] || null);
  const meSeated = joinedPlayers.some((p) => String(p.playerId || p.userId || p._id) === String(meId));
  const progressPct = Math.min(100, Math.round((joinedCount / Math.max(minPlayers, 1)) * 100));

  useEffect(() => {
    if (joinedCount > lastPlayerCountRef.current) play("turnNotify", 0.035);
    lastPlayerCountRef.current = joinedCount;
  }, [joinedCount, play]);

  useEffect(() => {
    if (!tableId || !user) return;

    const token = localStorage.getItem("accessToken") || "";
    const socket = socketService.connect(token);

    const goToGame = (payload = {}) => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      gameStartedRef.current = true;
      if (payload?.gameId) setGameId(payload.gameId);
      play("winFanfare", 0.05);
      navigate(`/game/${tableId}`, { replace: true });
    };

    const doJoin = () => {
      if (joinSentRef.current || gameStartedRef.current) return;
      joinSentRef.current = true;
      setJoining(true);
      setStatusText("Securing seat and reserving chips…");
      unlock();
      joinTable(tableId);
    };

    const onConnect = () => {
      setSocketReady(true);
      setStatusText("Connected. Joining table…");
      doJoin();
    };

    const onDisconnect = () => {
      setSocketReady(false);
      setStatusText("Reconnecting… your seat is protected.");
    };

    const onState = (payload = {}) => {
      const state = normalizeGameStatePayload(payload);
      setJoining(false);
      if (state?.gameId) setGameId(state.gameId);
      if (state?.phase) setFlowPhase(state.phase);
      if (Array.isArray(state?.players)) dispatch(setPlayers(state.players));
      if (typeof state?.currentTurn !== "undefined") dispatch(setCurrentTurn(state.currentTurn));
      if (state?.status) dispatch(setGameStatus(state.status));
      if (isGameStartedState(state) && state?.role !== "spectator") goToGame(state);
      else setStatusText("Waiting for players…");
    };

    const onGameStarted = (payload = {}) => {
      const state = normalizeGameStatePayload(payload);
      if (Array.isArray(state?.players)) dispatch(setPlayers(state.players));
      if (typeof state?.currentTurn !== "undefined") dispatch(setCurrentTurn(state.currentTurn));
      dispatch(setGameStatus(state.status || "PLAYING"));
      setFlowPhase(state.phase || "PLAYING");
      goToGame(state);
    };

    const onError = (msg) => {
      const message = normalizeErrorMessage(msg, "Unable to join table");
      setJoining(false);
      setStatusText(message);
      dispatch(addNotification({ type: "error", message }));
      play("error", 0.045);
    };

    const onPlayerConnected = () => dispatch(addNotification({ type: "info", message: "Player connected" }));
    const onPlayerDisconnected = () => dispatch(addNotification({ type: "warning", message: "A player disconnected" }));

    const events = [
      ["connect", onConnect],
      ["disconnect", onDisconnect],
      ["rummy/state", onState],
      ["rummy/game_started", onGameStarted],
      ["rummy/player_connected", onPlayerConnected],
      ["rummy/player_disconnected", onPlayerDisconnected],
      ["rummy/error", onError],
    ];

    events.forEach(([event, handler]) => socketService.off(event, handler));
    events.forEach(([event, handler]) => socketService.on(event, handler));

    if (socket.connected) onConnect();

    return () => events.forEach(([event, handler]) => socketService.off(event, handler));
  }, [dispatch, navigate, play, tableId, unlock, user]);

  if (tablesLoading && !table) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-950 text-white">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (tablesError && !table) {
    return (
      <div className="p-4">
        <ErrorMessage message={tablesError} onRetry={() => dispatch(fetchTables())} />
      </div>
    );
  }

  return (
    <div className="min-h-screen -mx-3 sm:mx-0 bg-[radial-gradient(circle_at_top,#166534_0%,#052e16_34%,#020617_100%)] text-white overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10">
            <ArrowLeft size={15} /> Tables
          </Link>
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${socketReady ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200"}`}>
            <Wifi size={15} /> {socketReady ? "Connected" : "Connecting"}
          </div>
        </div>

        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.08] shadow-2xl backdrop-blur-xl p-5 sm:p-7">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-300/15 blur-3xl" />
          <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6 items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-300/10 border border-amber-300/20 px-3 py-1 text-xs font-black text-amber-100 mb-3">
                <ShieldCheck size={14} /> Secure Lobby
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight">{table?.name || "Rummy Table"}</h1>
              <p className="mt-2 max-w-2xl text-sm sm:text-base text-emerald-50/70">
                Your seat is reserved through the socket session. Stay here until the table reaches the minimum player count, then the hand starts automatically.
              </p>

              <div className="mt-5 grid grid-cols-3 gap-3 max-w-xl">
                <div className="rounded-2xl bg-black/25 p-3 border border-white/10">
                  <Coins className="text-amber-300 mb-1" size={18} />
                  <p className="text-[10px] text-white/45">Entry</p>
                  <p className="font-black">{entry.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-black/25 p-3 border border-white/10">
                  <Users className="text-emerald-300 mb-1" size={18} />
                  <p className="text-[10px] text-white/45">Players</p>
                  <p className="font-black">{joinedCount}/{maxPlayers}</p>
                </div>
                <div className="rounded-2xl bg-black/25 p-3 border border-white/10">
                  <Clock3 className="text-sky-300 mb-1" size={18} />
                  <p className="text-[10px] text-white/45">Phase</p>
                  <p className="font-black text-xs sm:text-sm truncate">{flowPhase || gameStatus || "LOBBY"}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-white/65">Minimum players needed</span>
                  <span className="font-black text-amber-100">{Math.min(joinedCount, minPlayers)}/{minPlayers}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-black/40">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300 transition-all" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm text-white/70">
                  {joining ? <Loader2 size={16} className="animate-spin text-amber-200" /> : meSeated ? <CheckCircle2 size={16} className="text-emerald-300" /> : <Lock size={16} className="text-amber-300" />}
                  <span>{meSeated ? "You are seated. Waiting for opponents…" : statusText}</span>
                </div>
              </div>
            </div>

            <aside className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-200"><Volume2 size={20} /></div>
                <div>
                  <h3 className="font-black">Before Game Starts</h3>
                  <p className="text-xs text-white/50">Best mobile experience</p>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-white/65">
                <li className="flex gap-2"><span className="text-emerald-300">✓</span> Keep this page open until game starts.</li>
                <li className="flex gap-2"><span className="text-emerald-300">✓</span> Turn sound on for draw/discard/turn feedback.</li>
                <li className="flex gap-2"><span className="text-emerald-300">✓</span> Rotate to landscape after entering game table.</li>
              </ul>
              <button
                type="button"
                onClick={() => dispatch(fetchTables())}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/75 hover:bg-white/10"
              >
                <RotateCcw size={16} /> Refresh Lobby Data
              </button>
            </aside>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 sm:p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black">Seats</h2>
              <p className="text-xs text-white/50">Game starts at {minPlayers} joined players.</p>
            </div>
            <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-black text-white/65">{joinedCount}/{maxPlayers}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {seats.map((player, index) => {
              const playerId = player?.playerId || player?.userId || player?._id;
              const isMe = playerId && String(playerId) === String(meId);
              return (
                <div key={index} className={`min-h-[7.5rem] rounded-3xl border p-3 flex flex-col items-center justify-center text-center ${player ? "border-emerald-300/20 bg-emerald-400/10" : "border-dashed border-white/10 bg-black/20"}`}>
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-lg font-black ${player ? "bg-gradient-to-br from-emerald-300 to-amber-200 text-slate-950" : "bg-white/5 text-white/25"}`}>
                    {player ? String(player.username || "P").slice(0, 1).toUpperCase() : index + 1}
                  </div>
                  <p className="mt-2 text-sm font-black truncate max-w-full">{player?.username || "Open Seat"}</p>
                  <p className={`mt-1 text-[10px] font-bold ${isMe ? "text-amber-200" : "text-white/40"}`}>{isMe ? "You" : player ? String(player.status || "ACTIVE") : "Waiting"}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
