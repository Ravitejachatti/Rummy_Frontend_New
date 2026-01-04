// client/src/store/slices/gameSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../config/api";
import socketService from "../../config/socket";

const pickToken = (getState) => {
  const s = getState();
  return s?.auth?.token || localStorage.getItem("accessToken") || localStorage.getItem("token") || "";
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
      return rejectWithValue(error.response?.data?.error || "Failed to get game state");
    }
  }
);

// ---- Socket actions ----
import { getDeviceId, getHardwareSignature } from "../../utils/device";

// ... existing imports

export const joinTable = (tableIdOrObj) => {
  const tableId = typeof tableIdOrObj === "string" ? tableIdOrObj : tableIdOrObj?.tableId;
  if (!tableId) return;
  const deviceId = getDeviceId();
  const hardwareId = getHardwareSignature();
  socketService.emit("rummy/join_table", { tableId, deviceId, hardwareId });
};

export const drawCard = (gameId, _playerId, source) => {
  if (!gameId || !source) return;
  socketService.emit("rummy/draw_card", { gameId, source });
};

export const discardCard = (gameId, _playerId, card) => {
  if (!gameId || !card) return;
  socketService.emit("rummy/discard_card", { gameId, card });
};

export const reorderCards = (gameId, _playerId, newOrder) => {
  if (!gameId || !Array.isArray(newOrder)) return;
  socketService.emit("rummy/update_order", { gameId, newOrder });
};

export const dropGame = (gameId) => {
  if (!gameId) return;
  socketService.emit("rummy/drop", { gameId });
};

// ✅ FIXED: no wrapper { payload }
export const declareWinSocket = ({ gameId, playerId, groups, ungrouped }) => {
  if (!gameId) return;
  socketService.emit("rummy/declare_win", { gameId, playerId, groups, ungrouped });
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
      state.gameState = action.payload;
      state.currentGame = action.payload;
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
      state.votes = action.payload || {};
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

        const s = action.payload || {};
        state.gameState = s;
        state.currentGame = s;

        state.players = s.players || [];
        state.currentTurn = s.currentTurn ?? null;
        state.gameStatus = s.status || "waiting";

        // ✅ clean + consistent
        state.discardTop = s.discardTop ?? null;
        state.discardHistory = Array.isArray(s.discardHistory) ? s.discardHistory : [];
        state.drawPileCount = Number.isFinite(s.drawPileCount) ? s.drawPileCount : 0;
      })
      .addCase(getGameState.rejected, (state, action) => {
        state.loading = false;
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
  addNotification,
  removeNotification,
  resetGame,
  reorderMyCards,
  setSeatCutResults,
  setReviewData,
  setVotes,
} = gameSlice.actions;

export default gameSlice.reducer;