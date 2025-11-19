import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getBalance } from "../store/slices/walletSlice";

export default function Profile() {
  const { user } = useSelector((s) => s.auth);
  const { balance, loading } = useSelector((s) => s.wallet);
  const dispatch = useDispatch();

  useEffect(() => { dispatch(getBalance()); }, [dispatch]);

  return (
    <div className="bg-white border rounded-lg p-4">
      <h1 className="text-xl font-bold mb-2">Profile</h1>
      <div className="text-sm text-gray-700">Username: <b>{user?.username}</b></div>
      <div className="text-sm text-gray-700">Email: <b>{user?.email || "—"}</b></div>
      <div className="text-sm text-gray-700 mt-2">Coins: <b>{loading ? "…" : (balance ?? 0).toLocaleString()}</b></div>
    </div>
  );
}
