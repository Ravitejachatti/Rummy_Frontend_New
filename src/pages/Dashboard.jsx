import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchTables } from "../store/slices/tableSlice";
import { getBalance } from "../store/slices/walletSlice";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector((s) => s.auth);
  const {
    tables = [],
    loading: tablesLoading,
    error: tablesError,
  } = useSelector((s) => s.table);
  const { balance = 0, loading: balanceLoading } = useSelector((s) => s.wallet);

  useEffect(() => {
    dispatch(fetchTables());
    dispatch(getBalance());
  }, [dispatch]);

  const isLoading = tablesLoading || balanceLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header / Profile summary */}
      <section className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Welcome, {user?.username || "Player"} 👋
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Ready to join a table and play a round of Rummy?
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Coins Available
          </p>
          <p className="text-2xl font-extrabold text-emerald-600">
            {balance.toLocaleString()}
          </p>
        </div>
      </section>

      {/* Tables list */}
      <section className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Available Tables
          </h2>
          <button
            type="button"
            onClick={() => dispatch(fetchTables())}
            className="text-xs sm:text-sm px-3 py-1 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95 transition"
          >
            Refresh
          </button>
        </div>

        {/* Error state */}
        {tablesError && (
          <div className="mb-3">
            <ErrorMessage
              message={tablesError}
              onRetry={() => dispatch(fetchTables())}
            />
          </div>
        )}

        {/* Empty state */}
        {tables.length === 0 && !tablesError && (
          <p className="text-gray-500 text-sm">
            No active tables right now. Please try refreshing in a few moments.
          </p>
        )}

        {/* Tables list */}
        {tables.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {tables.map((t) => {
              const entryCost = t.chipValue ?? 0;
              const canJoin = !!t.isActive && balance >= entryCost;

              return (
                <li
                  key={t._id}
                  className="py-3 sm:py-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {t.name || "Rummy Table"}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {t.minPlayers}-{t.maxPlayers} players • Entry{" "}
                      <span className="font-semibold">
                        {entryCost.toLocaleString()}
                      </span>{" "}
                      coins
                    </div>
                    {!t.isActive && (
                      <div className="text-[11px] text-red-500 mt-0.5">
                        This table is currently inactive.
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!canJoin}
                    onClick={() => navigate(`/lobby/${t._id}`)}
                    className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition
                      ${
                        canJoin
                          ? "bg-gray-900 text-white border-gray-900 hover:bg-black active:scale-95"
                          : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      }`}
                    aria-disabled={!canJoin}
                  >
                    {!t.isActive
                      ? "Inactive"
                      : balance < entryCost
                      ? "Not enough coins"
                      : "Join"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}