// client/src/store/slices/gameSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/api';
import socketService from '../../config/socket';

// Helper to read token from state (fallback to localStorage)
const pickToken = (getState) => {
  const s = getState();
  return s?.auth?.token || localStorage.getItem('token') || '';
};

// Async thunks (attach Authorization header explicitly)
export const getGameState = createAsyncThunk(
  'game/getGameState',
  async (tableId, { rejectWithValue, getState }) => {
    try {
      const token = pickToken(getState);
      const response = await api.get(`/api/rummy/game/${tableId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to get game state');
    }
  }
);

export const declareWin = createAsyncThunk(
  'game/declareWin',
  async ({ playerId, gameId, sets }, { rejectWithValue, getState }) => {
    try {
      const token = pickToken(getState);
      const response = await api.post(
        '/api/rummy/game/declare',
        { playerId, gameId, sets },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to declare win');
    }
  }
);

// Socket actions (do NOT pass token here; socket handshake already has it from socketService.connect(token))
export const joinTable = (tableId) => {
  console.log(tableId)
  socketService.emit('rummy/join_table', { tableId });
};
export const drawCard = (gameId, _playerId, source) => {
  socketService.emit('rummy/draw_card', { gameId, source }); // source: 'drawPile' | 'discard'
};
export const discardCard = (gameId, _playerId, card) => {
  socketService.emit('rummy/discard_card', { gameId, card });
};
export const reorderCards = (gameId, playerId, newOrder) => {
  socketService.emit('rummy/update_order', { gameId, playerId, newOrder });
};
export const dropGame = (gameId, _playerId) => {
  socketService.emit('rummy/drop', { gameId });
};
export const declareWinSocket = (payload) => {
  socketService.emit('rummy/declare_win', { payload });
};

const initialState = {
  currentGame: null,
  gameState: null,
  players: [],
  currentTurn: null,
  myCards: [],
  discardPile: [],
  drawPile: [],
  selectedCards: [],
  gameStatus: 'waiting', // waiting, playing, ended
  loading: false,
  error: null,
  notifications: [],
  isMyTurn: false,
  gameHistory: [],
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setGameState: (state, action) => {
      state.gameState = action.payload;
      state.currentGame = action.payload;
    },
    setPlayers: (state, action) => {
      state.players = action.payload;
    },
    setCurrentTurn: (state, action) => {
      state.currentTurn = action.payload;
      const currentUser = JSON.parse(localStorage.getItem('user'));
      state.isMyTurn = !!(currentUser && String(action.payload) === String(currentUser.id));
    },
    setMyCards: (state, action) => {
      state.myCards = action.payload || [];
    },
    addCardToHand: (state, action) => {
      state.myCards.push(action.payload);
    },
    removeCardFromHand: (state, action) => {
      const cardIndex = state.myCards.findIndex(
        card => card.suit === action.payload.suit && card.rank === action.payload.rank
      );
      if (cardIndex !== -1) {
        state.myCards.splice(cardIndex, 1);
      }
    },
    setDiscardPile: (state, action) => {
      state.discardPile = action.payload;
    },
    addToDiscardPile: (state, action) => {
      state.discardPile.push(action.payload);
    },
    setDrawPile: (state, action) => {
      state.drawPile = action.payload;
    },
    toggleCardSelection: (state, action) => {
      const card = action.payload;
      const key = `${card.suit}-${card.rank}`;
      const index = state.selectedCards.findIndex(c => `${c.suit}-${c.rank}` === key);
      if (index !== -1) state.selectedCards.splice(index, 1);
      else state.selectedCards.push(card);
    },
    clearSelectedCards: (state) => {
      state.selectedCards = [];
    },
    setGameStatus: (state, action) => {
      state.gameStatus = action.payload;
    },
    addNotification: (state, action) => {
      state.notifications.push({
        id: Date.now(),
        ...action.payload,
      });
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    clearError: (state) => {
      state.error = null;
    },
    resetGame: (state) => {
      state.currentGame = null;
      state.gameState = null;
      state.players = [];
      state.currentTurn = null;
      state.myCards = [];
      state.discardPile = [];
      state.drawPile = [];
      state.selectedCards = [];
      state.gameStatus = 'waiting';
      state.isMyTurn = false;
      state.error = null;
    },
    reorderMyCards: (state, action) => {
    state.myCards = action.payload || [];
  },
  },
  extraReducers: (builder) => {
    builder
      // Get game state
      .addCase(getGameState.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getGameState.fulfilled, (state, action) => {
        state.loading = false;
        state.gameState = action.payload;
        state.currentGame = action.payload;
        state.players = action.payload.players || [];
        state.currentTurn = action.payload.currentTurn; 
        // backend exposes only discardTop; seed local pile
        state.discardPile = [];
        if (action.payload.discardTop) state.discardPile.push(action.payload.discardTop);
        state.gameStatus = action.payload.status;

        // myCards are never returned via REST; rely on rummy/your_hand events
        const currentUser = JSON.parse(localStorage.getItem('user'));
        if (currentUser) {
          state.isMyTurn = String(action.payload.currentTurn) === String(currentUser.id);
        }
      })
      .addCase(getGameState.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Declare win
      .addCase(declareWin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(declareWin.fulfilled, (state) => {
        state.loading = false;
        state.gameStatus = 'ended';
      })
      .addCase(declareWin.rejected, (state, action) => {
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
  addCardToHand,
  removeCardFromHand,
  setDiscardPile,
  addToDiscardPile,
  setDrawPile,
  toggleCardSelection,
  clearSelectedCards,
  setGameStatus,
  addNotification,
  removeNotification,
  clearError,
  resetGame,
  reorderMyCards,
} = gameSlice.actions;

export default gameSlice.reducer;