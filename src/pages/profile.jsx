import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getBalance } from "../store/slices/walletSlice";

export default function Profile() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { balance = 0, loading } = useSelector((s) => s.wallet);

  useEffect(() => {
    dispatch(getBalance());
  }, [dispatch]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm max-w-lg">
      <h1 className="text-xl sm:text-2xl font-bold mb-3 text-gray-900">
        Profile
      </h1>

      <div className="space-y-2 text-sm text-gray-700">
        <div>
          <span className="font-medium">Username: </span>
          <span>{user?.username || "—"}</span>
        </div>

        <div>
          <span className="font-medium">Email: </span>
          <span>{user?.email || "—"}</span>
        </div>

        <div className="pt-2 mt-2 border-t border-gray-100">
          <span className="font-medium">Coins: </span>
          <span>
            {loading ? "…" : balance.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}