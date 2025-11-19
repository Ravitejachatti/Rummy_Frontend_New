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
  const { tables, loading, error } = useSelector((s) => s.table);
  const { balance } = useSelector((s) => s.wallet);

  useEffect(() => {
    dispatch(fetchTables());
    dispatch(getBalance());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-4">
        <h1 className="text-xl font-bold">Welcome, {user?.username || "Player"} 👋</h1>
        <p className="text-gray-600 text-sm mt-1">Coins available: <b>{(balance ?? 0).toLocaleString()}</b></p>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Available Tables</h2>
          <button onClick={() => dispatch(fetchTables())} className="text-sm underline">Refresh</button>
        </div>

        <ErrorMessage message={error} onRetry={() => dispatch(fetchTables())} />

        {tables.length === 0 ? (
          <p className="text-gray-500 text-sm">No active tables right now.</p>
        ) : (
          <ul className="divide-y">
            {tables.map((t) => (
              <li key={t._id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-gray-600">{t.minPlayers}-{t.maxPlayers} players • Entry {t.chipValue} coins</div>
                </div>
                <button
                  disabled={!t.isActive || (balance ?? 0) < (t.chipValue ?? 0)}
                  onClick={() => navigate(`/lobby/${t._id}`)}
                  className={`px-3 py-1 rounded text-sm border ${!t.isActive || (balance ?? 0) < (t.chipValue ?? 0) ? "opacity-50 cursor-not-allowed" : "bg-black text-white"}`}
                >
                  {(!t.isActive) ? "Inactive" : (balance ?? 0) < (t.chipValue ?? 0) ? "Not enough" : "Join"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}