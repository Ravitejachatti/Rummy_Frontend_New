// client/src/store/slices/gameSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../config/api";
import socketService from "../../config/socket";
import {
  emitJoinTable,
  emitDrawCard,
  emitDiscardCard,
  emitDropGame,
  emitDeclareWin,
  emitShowConfirm,
  emitLeaveTable,
} from "../../api/rummySocketApi";
import { normalizeErrorMessage } from "../../utils/normalizeError";
import { getDeviceId, getHardwareSignature } from "../../utils/device";
import { normalizeGameStatePayload } from "../../utils/normalizeGameSocketPayload";
import { createClientActionId } from "../../utils/clientActionId";

const pickToken = (getState) => {
  const s = getState();
  return s?.auth?.accessToken || localStorage.getItem("accessToken") || localStorage.getItem("token") || "";
};

export const getGameState = createAsyncThunk(
  "game/getGameState",
  async (tableId, { rejectWithValue, getState }) => {
    try {
      const token = pickToken(getState);
      const response = await api.get(`/api/rummy/game/${tableId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(normalizeErrorMessage(error, "Failed to get game state"));
    }
  }
);

export const getActiveGame = createAsyncThunk(
  "game/getActiveGame",
  async (_, { rejectWithValue, getState }) => {
    try {
      const token = pickToken(getState);
      const response = await api.get(`/api/rummy/me/active-game`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(normalizeErrorMessage(error, "Failed to recover active game"));
    }
  }
);

// ---- Socket actions ----

export const joinTable = (tableIdOrObj) => {
  const tableId = typeof tableIdOrObj === "string" ? tableIdOrObj : tableIdOrObj?.tableId;
  if (!tableId) return;
  const deviceId = getDeviceId();
  const hardwareId = getHardwareSignature();
  emitJoinTable({ tableId, deviceId, hardwareId });
};

export const leaveTable = (tableIdOrObj) => {
  const tableId = typeof tableIdOrObj === "string" ? tableIdOrObj : tableIdOrObj?.tableId;
  if (!tableId) return;
  emitLeaveTable({ tableId });
};

export const drawCard = (gameId, _playerId, source, stateVersion = 0) => {
  if (!gameId || !source) return;
  emitDrawCard({ gameId, source, stateVersion });
};

export const discardCard = (gameId, _playerId, card, stateVersion = 0) => {
  if (!gameId || !card) return;
  emitDiscardCard({ gameId, card, stateVersion });
};

export const reorderCards = (gameId, _playerId, newOrder, stateVersion = 0) => {
  if (!gameId || !Array.isArray(newOrder)) return;
  socketService.emit("rummy/update_order", { gameId, newOrder, stateVersion, clientActionId: createClientActionId("update_order") });
};

export const dropGame = (gameId, stateVersion = 0) => {
  if (!gameId) return;
  emitDropGame({ gameId, stateVersion });
};

export const declareWinSocket = ({ gameId, playerId, groups, ungrouped, forceWin, stateVersion = 0 }) => {
  if (!gameId) return;
  emitDeclareWin({ gameId, playerId, groups, ungrouped, forceWin, stateVersion });
};

export const confirmShowSocket = (gameId, decision, stateVersion = 0) => {
  if (!gameId || !decision) return;
  emitShowConfirm({ gameId, decision, stateVersion });
};

const initialState = {
  currentGame: null,
  gameState: null,
  players: [],
  currentTurn: null,
  myCards: [],

  discardTop: null,
  discardHistory: [],
  drawPileCount: 0,
  allowedActions: [],
  stateVersion: 0,
  lastActionId: null,
  settlementStatus: null,
  securityError: null,

  selectedCards: [],
  gameStatus: "waiting",
  loading: false,
  error: null,
  notifications: [],

  // Points Rummy
  seatCutResults: null,
  reviewData: null,
  votes: {},
};

const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    setGameState: (state, action) => {
      const normalized = normalizeGameStatePayload(action.payload || {});
      const incomingVersion = Number(normalized.stateVersion || 0);
      const currentVersion = Number(state.stateVersion || 0);

      // Ignore stale socket/REST updates to prevent older messages from
      // overwriting a newer authoritative state already applied in Redux.
      if (incomingVersion > 0 && currentVersion > 0 && incomingVersion < currentVersion) {
        return;
      }

      state.gameState = normalized;
      state.currentGame = normalized;
      state.players = normalized.players || [];
      state.currentTurn = normalized.currentTurn ?? null;
      state.gameStatus = normalized.status || state.gameStatus;
      state.discardTop = normalized.discardTop ?? null;
      state.discardHistory = normalized.discardHistory || [];
      state.drawPileCount = Number.isFinite(normalized.drawPileCount) ? normalized.drawPileCount : 0;
      state.allowedActions = normalized.allowedActions || [];
      state.stateVersion = incomingVersion || currentVersion || 0;
      state.lastActionId = normalized.lastActionId || state.lastActionId || null;
      state.settlementStatus = normalized.settlementStatus || null;
      if (Array.isArray(normalized.myHand)) state.myCards = normalized.myHand;
    },

    setPlayers: (state, action) => {
      const incoming = action.payload || [];
      const prevById = new Map((state.players || []).map((p) => [String(p.playerId), p]));

      state.players = incoming.map((p) => {
        const prev = prevById.get(String(p.playerId)) || {};
        return {
          ...prev,
          ...p,
          connected: p.connected ?? prev.connected ?? true,
        };
      });
    },

    setCurrentTurn: (state, action) => {
      state.currentTurn = action.payload ?? null;
    },

    setMyCards: (state, action) => {
      state.myCards = action.payload || [];
    },

    setDiscardTop: (state, action) => {
      state.discardTop = action.payload ?? null;
    },

    setDiscardHistory: (state, action) => {
      state.discardHistory = Array.isArray(action.payload) ? action.payload : [];
    },

    setDrawPileCount: (state, action) => {
      state.drawPileCount = Number.isFinite(action.payload) ? action.payload : 0;
    },

    setGameStatus: (state, action) => {
      state.gameStatus = action.payload;
    },

    setSecurityError: (state, action) => {
      state.securityError = action.payload || null;
    },

    addNotification: (state, action) => {
      const { type = "info", message = "", autoDismissMs } = action.payload || {};
      state.notifications = [
        {
          id: Date.now(),
          type,
          message,
          autoDismissMs: autoDismissMs ?? 4000,
        },
      ];
    },

    removeNotification: (state, action) => {
      const id = action.payload;
      state.notifications = state.notifications.filter((n) => n.id !== id);
    },

    resetGame: (state) => {
      Object.assign(state, initialState);
    },

    reorderMyCards: (state, action) => {
      state.myCards = action.payload || [];
    },

    // Points Rummy Features
    setSeatCutResults: (state, action) => {
      state.seatCutResults = action.payload;
    },
    setReviewData: (state, action) => {
      state.reviewData = action.payload;
      state.votes = {}; // Reset votes on new review
    },
    setVotes: (state, action) => {
      const payload = action.payload || {};
      if (payload.voterId) {
        state.votes = {
          ...(state.votes || {}),
          [payload.voterId]: payload.decision,
        };
        return;
      }
      state.votes = payload;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(getGameState.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getGameState.fulfilled, (state, action) => {
        state.loading = false;

        const s = normalizeGameStatePayload(action.payload || {});
        const incomingVersion = Number(s.stateVersion || 0);
        const currentVersion = Number(state.stateVersion || 0);
        if (incomingVersion > 0 && currentVersion > 0 && incomingVersion < currentVersion) {
          return;
        }
        state.gameState = s;
        state.currentGame = s;
        state.players = s.players || [];
        state.currentTurn = s.currentTurn ?? null;
        state.gameStatus = s.status || "waiting";
        state.discardTop = s.discardTop ?? null;
        state.discardHistory = s.discardHistory || [];
        state.drawPileCount = Number.isFinite(s.drawPileCount) ? s.drawPileCount : 0;
        state.allowedActions = s.allowedActions || [];
        state.stateVersion = incomingVersion || currentVersion || 0;
        state.lastActionId = s.lastActionId || state.lastActionId || null;
        state.settlementStatus = s.settlementStatus || null;
        if (Array.isArray(s.myHand)) state.myCards = s.myHand;
      })
      .addCase(getGameState.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getActiveGame.pending, (state) => {
        state.error = null;
      })
      .addCase(getActiveGame.fulfilled, (state, action) => {
        const payload = action.payload || {};
        if (!payload.activeGame) return;
        const s = normalizeGameStatePayload(payload.activeGame);
        const incomingVersion = Number(s.stateVersion || 0);
        const currentVersion = Number(state.stateVersion || 0);
        if (incomingVersion > 0 && currentVersion > 0 && incomingVersion < currentVersion) {
          return;
        }
        state.gameState = s;
        state.currentGame = s;
        state.players = s.players || [];
        state.currentTurn = s.currentTurn ?? null;
        state.gameStatus = s.status || "PLAYING";
        state.discardTop = s.discardTop ?? null;
        state.discardHistory = s.discardHistory || [];
        state.drawPileCount = Number.isFinite(s.drawPileCount) ? s.drawPileCount : 0;
        state.allowedActions = s.allowedActions || [];
        state.stateVersion = incomingVersion || currentVersion || 0;
        state.lastActionId = s.lastActionId || state.lastActionId || null;
        state.settlementStatus = s.settlementStatus || null;
        if (Array.isArray(s.myHand)) state.myCards = s.myHand;
      })
      .addCase(getActiveGame.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  setGameState,
  setPlayers,
  setCurrentTurn,
  setMyCards,
  setDiscardTop,
  setDiscardHistory,
  setDrawPileCount,
  setGameStatus,
  setSecurityError,
  addNotification,
  removeNotification,
  resetGame,
  reorderMyCards,
  setSeatCutResults,
  setReviewData,
  setVotes,
} = gameSlice.actions;

export default gameSlice.reducer;