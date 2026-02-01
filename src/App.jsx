// 📁 src/App.jsx
import "./index.css";
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Pages / Components
import Layout from "./components/common/Layout";
import LoginForm from "./components/auth/LoginForm";
import SignupForm from "./components/auth/SignupForm";
import Dashboard from "./pages/Dashboard";
import Lobby from "./pages/Lobby";
import GameTable from "./components/game/GameTable";
import Profile from "./pages/profile";
import RummyResult from "./components/game/Rummyresult";

// ✅ Production managers
import AuthGate from "./core/AuthGate";
import SocketManager from "./core/SocketManager";

const ProtectedRoute = ({ children }) => <AuthGate>{children}</AuthGate>;
const PublicRoute = ({ children }) => <AuthGate publicOnly>{children}</AuthGate>;

export default function App() {
  return (
    <>
      {/* ✅ runs once, manages socket connect/disconnect */}
      <SocketManager />

      <Router>
        <Routes>
          {/* Public */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginForm />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <SignupForm />
              </PublicRoute>
            }
          />

          {/* Protected */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/lobby/:tableId"
            element={
              <ProtectedRoute>
                <Layout>
                  <Lobby />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/game/:tableId"
            element={
              <ProtectedRoute>
                <GameTable />
              </ProtectedRoute>
            }
          />

          <Route
            path="/rummy/result/:gameId"
            element={
              <ProtectedRoute>
                <RummyResult />
              </ProtectedRoute>
            }
          />

          {/* Defaults */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </>
  );
}