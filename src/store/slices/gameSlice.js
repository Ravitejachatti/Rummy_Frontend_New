import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/api';
import socketService from '../../config/socket';

// Async thunks
export const getGameState = createAsyncThunk(
  'game/getGameState',
  async (tableId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/rummy/game/${tableId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to get game state');
    }
  }
);

export const declareWin = createAsyncThunk(
  'game/declareWin',
  async ({ playerId, gameId, sets }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/rummy/game/declare', { playerId, gameId, sets });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to declare win');
    }
  }
);

// Socket actions
export const joinTable = (tableId, playerId) => {
  socketService.emit('rummy/join_table', { tableId, playerId });
};

export const drawCard = (gameId, playerId, source) => {
  socketService.emit('rummy/draw_card', { gameId, playerId, source });
};

export const discardCard = (gameId, playerId, card) => {
  socketService.emit('rummy/discard_card', { gameId, playerId, card });
};

export const dropGame = (gameId, playerId) => {
  socketService.emit('rummy/drop', { gameId, playerId });
};

export const declareWinSocket = (gameId, playerId, sets) => {
  socketService.emit('rummy/declare_win', { gameId, playerId, sets });
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
      // Check if it's current user's turn
      const currentUser = JSON.parse(localStorage.getItem('user'));
      state.isMyTurn = currentUser && action.payload === currentUser.id;
    },
    setMyCards: (state, action) => {
      state.myCards = action.payload;
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
      const cardKey = `${card.suit}-${card.rank}`;
      const index = state.selectedCards.findIndex(c => `${c.suit}-${c.rank}` === cardKey);
      
      if (index !== -1) {
        state.selectedCards.splice(index, 1);
      } else {
        state.selectedCards.push(card);
      }
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
        state.discardPile = action.payload.discardPile || [];
        state.gameStatus = action.payload.status;
        
        // Set user's cards
        const currentUser = JSON.parse(localStorage.getItem('user'));
        if (currentUser) {
          const playerData = action.payload.players?.find(p => p.playerId === currentUser.id);
          if (playerData) {
            state.myCards = playerData.hand || [];
          }
          state.isMyTurn = action.payload.currentTurn === currentUser.id;
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
      .addCase(declareWin.fulfilled, (state, action) => {
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
} = gameSlice.actions;

export default gameSlice.reducer;