import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronRight,
  Clock3,
  Coins,
  Crown,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { fetchTables } from "../store/slices/tableSlice";
import { getBalance } from "../store/slices/walletSlice";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import useActiveGameDetector from "../hooks/useActiveGameDetector";

function getJoinedCount(table) {
  if (Array.isArray(table?.players)) return table.players.length;
  if (Array.isArray(table?.currentPlayers)) return table.currentPlayers.length;
  if (Number.isFinite(table?.currentPlayers)) return table.currentPlayers;
  return 0;
}

function tableStatusLabel(table) {
  const phase = String(table?.phase || "LOBBY").toUpperCase();
  if (!table?.isActive) return { label: "Inactive", tone: "bg-slate-700 text-slate-300" };
  if (table?.activeGameId || phase === "PLAYING") return { label: "In Game", tone: "bg-amber-400/15 text-amber-200 border border-amber-300/20" };
  return { label: "Open", tone: "bg-emerald-400/15 text-emerald-200 border border-emerald-300/20" };
}

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");

  const { user } = useSelector((s) => s.auth);
  const { tables = [], loading: tablesLoading, error: tablesError } = useSelector((s) => s.table);
  const { balance = 0, loading: balanceLoading } = useSelector((s) => s.wallet);

  useActiveGameDetector();

  useEffect(() => {
    dispatch(fetchTables());
    dispatch(getBalance());
  }, [dispatch]);

  const filteredTables = useMemo(() => {
    const list = Array.isArray(tables) ? tables : [];
    if (filter === "open") return list.filter((t) => t.isActive && !t.activeGameId);
    if (filter === "low") return list.filter((t) => Number(t.bankRange || t.chipValue || 0) <= Number(balance || 0));
    return list;
  }, [tables, filter, balance]);

  const openTables = useMemo(() => tables.filter((t) => t.isActive && !t.activeGameId).length, [tables]);
  const isLoading = tablesLoading || balanceLoading;

  return (
    <div className="min-h-[calc(100vh-4rem)] -mx-3 sm:mx-0 bg-[radial-gradient(circle_at_top_left,#14532d_0%,#03140d_35%,#020617_100%)] text-white rounded-none sm:rounded-[2rem] overflow-hidden">
      <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-5 sm:space-y-7">
        <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.07] shadow-2xl backdrop-blur-xl p-5 sm:p-6">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="absolute -left-16 -bottom-16 h-44 w-44 rounded-full bg-emerald-400/15 blur-3xl" />

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100 mb-3">
                <Sparkles size={14} /> Live Rummy Arena
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
                Welcome, {user?.username || "Player"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm sm:text-base text-emerald-50/70">
                Pick a table, watch the seat count, and jump into a fast points-rummy hand. Optimized for mobile play with clear action feedback.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 min-w-[min(100%,30rem)]">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <Wallet className="text-amber-300 mb-2" size={20} />
                <p className="text-xs text-white/50">Wallet</p>
                <p className="text-xl font-black text-amber-100">{Number(balance || 0).toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <Users className="text-emerald-300 mb-2" size={20} />
                <p className="text-xs text-white/50">Open Tables</p>
                <p className="text-xl font-black">{openTables}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4 col-span-2 sm:col-span-1">
                <Trophy className="text-sky-300 mb-2" size={20} />
                <p className="text-xs text-white/50">Mode</p>
                <p className="text-xl font-black">Points</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-5">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-black">Choose Your Table</h2>
                <p className="text-sm text-white/55">Real-rummy style table cards with entry, seats, and live status.</p>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                {[
                  ["all", "All"],
                  ["open", "Open"],
                  ["low", "Affordable"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                      filter === key
                        ? "bg-amber-300 text-slate-950"
                        : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => dispatch(fetchTables())}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 hover:bg-white/10 active:scale-95"
                  title="Refresh tables"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            {isLoading && (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-10 flex justify-center">
                <LoadingSpinner size="xl" />
              </div>
            )}

            {tablesError && <ErrorMessage message={tablesError} onRetry={() => dispatch(fetchTables())} />}

            {!isLoading && !tablesError && filteredTables.length === 0 && (
              <div className="rounded-[1.5rem] border border-dashed border-white/15 bg-white/5 p-8 text-center">
                <Users className="mx-auto text-white/35" size={42} />
                <h3 className="mt-3 font-bold">No tables available</h3>
                <p className="mt-1 text-sm text-white/50">Try another filter or refresh after a few seconds.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {!isLoading && filteredTables.map((table) => {
                const joined = getJoinedCount(table);
                const maxPlayers = Number(table.maxPlayers || 6);
                const minPlayers = Number(table.minPlayers || 2);
                const entry = Number(table.bankRange ?? table.chipValue ?? 0);
                const canJoin = Boolean(table.isActive) && !table.activeGameId && Number(balance || 0) >= entry;
                const status = tableStatusLabel(table);
                const fillPct = Math.min(100, Math.round((joined / Math.max(maxPlayers, 1)) * 100));

                return (
                  <article key={table._id} className="group relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-gradient-to-br from-white/[0.1] to-white/[0.035] p-4 shadow-xl backdrop-blur-xl">
                    <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-amber-300/10 blur-2xl" />
                    <div className="relative">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-black leading-tight">{table.name || "Rummy Table"}</h3>
                          <p className="mt-1 text-xs text-white/50">{table.gameType || "POINTS"} • {minPlayers}-{maxPlayers} players</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${status.tone}`}>{status.label}</span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="rounded-2xl bg-black/25 p-3">
                          <Coins size={16} className="text-amber-300 mb-1" />
                          <p className="text-[10px] text-white/40">Entry</p>
                          <p className="text-sm font-black">{entry.toLocaleString()}</p>
                        </div>
                        <div className="rounded-2xl bg-black/25 p-3">
                          <Users size={16} className="text-emerald-300 mb-1" />
                          <p className="text-[10px] text-white/40">Seats</p>
                          <p className="text-sm font-black">{joined}/{maxPlayers}</p>
                        </div>
                        <div className="rounded-2xl bg-black/25 p-3">
                          <Zap size={16} className="text-sky-300 mb-1" />
                          <p className="text-[10px] text-white/40">Point</p>
                          <p className="text-sm font-black">{Number(table.chipValue || 0)}</p>
                        </div>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/35">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300" style={{ width: `${fillPct}%` }} />
                      </div>

                      <button
                        type="button"
                        disabled={!canJoin}
                        onClick={() => navigate(`/lobby/${table._id}`)}
                        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
                          canJoin
                            ? "bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/10 hover:bg-amber-200 active:scale-[0.98]"
                            : "bg-white/8 text-white/35 cursor-not-allowed"
                        }`}
                      >
                        {!table.isActive ? "Inactive" : table.activeGameId ? "Game Running" : Number(balance || 0) < entry ? "Need More Chips" : "Join Table"}
                        {canJoin && <ChevronRight size={16} />}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.07] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-200"><ShieldCheck size={22} /></div>
                <div>
                  <h3 className="font-black">Safe Play Checklist</h3>
                  <p className="text-xs text-white/50">Before joining a real-money table.</p>
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm text-white/70">
                <p className="flex gap-2"><span className="text-emerald-300">✓</span> Stable internet connection</p>
                <p className="flex gap-2"><span className="text-emerald-300">✓</span> Enough wallet balance for buy-in</p>
                <p className="flex gap-2"><span className="text-emerald-300">✓</span> Keep sound on for turn/card feedback</p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
              <div className="flex items-center gap-3">
                <Crown className="text-amber-300" />
                <div>
                  <h3 className="font-black">Pro Tip</h3>
                  <p className="text-xs text-white/50">Mobile rummy habit</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-white/65">Rotate to landscape before the hand starts. You get better card spacing, clearer draw/discard piles, and fewer mis-taps.</p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold"><Bell size={16} /> Feedback</span>
                <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] font-black text-emerald-200">Sound-ready</span>
              </div>
              <p className="mt-3 text-sm text-white/55">The updated game table includes sound hooks for card draw, discard, your turn, timeouts, errors, and wins.</p>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
