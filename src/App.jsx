// client/src/App.jsx
import './index.css';
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import socketService from './config/socket';
import Lobby from './pages/Lobby';

// Components
import Layout from './components/common/Layout';
import LoginForm from './components/auth/LoginForm';
import SignupForm from './components/auth/SignupForm';
import Dashboard from './pages/Dashboard';
import TableList from './components/tables/TableList';
import GameTable from './components/game/GameTable';
import WalletManager from './components/wallet/WalletManager';
import Leaderboard from './components/leaderboard/Leaderboard';

// Notifications
import { removeNotification } from './store/slices/gameSlice';
import RummyResult from './components/game/Rummyresult';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? children : <Navigate to="/login" />;
};
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
};

const NotificationContainer = () => {
  const dispatch = useDispatch();
  const { notifications } = useSelector((state) => state.game);

  useEffect(() => {
    if (!notifications.length) return;
    const timers = notifications.map(n =>
      setTimeout(() => dispatch(removeNotification(n.id)), 5000)
    );
    return () => timers.forEach(clearTimeout);
  }, [notifications, dispatch]);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div key={notification.id} className={`notification ${notification.type}`}>
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium">{notification.message}</p>
            <button
              onClick={() => dispatch(removeNotification(notification.id))}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

function App() {
  const { isAuthenticated, token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && token) {
      socketService.connect(token);
    }
    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, token]);

  return (
    <Router>
      <div className="App">
        <NotificationContainer />

        <Routes>
          {/* Public Routes */}
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

          {/* Protected Routes */}
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
          path="/lobby/:tableId"
           element={
             <ProtectedRoute>
               <Layout>
                 {/** Lazy import if you want; for now direct import is fine */}
                 <Lobby />
               </Layout>
             </ProtectedRoute>
           }
         />
          <Route
            path="/tables"
            element={
              <ProtectedRoute>
                <Layout>
                  <TableList />
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
            path="/wallet"
            element={
              <ProtectedRoute>
                <Layout>
                  <WalletManager />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Leaderboard />
                </Layout>
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

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;