import "./index.css";
import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import socketService from "./config/socket";

// Pages
import Layout from "./components/common/Layout";
import LoginForm from "./components/auth/LoginForm";
import SignupForm from "./components/auth/SignupForm";
import Dashboard from "./pages/Dashboard"; // simplified below
import Lobby from "./pages/Lobby";          // simplified below
import GameTable from "./components/game/GameTable"; // simplified below
import Profile from "./pages/profile";      // new minimal page
import RummyResult from "./components/game/Rummyresult";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((s) => s.auth);
  return isAuthenticated ? children : <Navigate to="/login" />;
};
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((s) => s.auth);
  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
};

function App() {
  const { isAuthenticated, token } = useSelector((s) => s.auth);

  useEffect(() => {
    if (isAuthenticated && token) {
      socketService.connect(token);
    }
    return () => socketService.disconnect();
  }, [isAuthenticated, token]);

  return (
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
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}
export default App;