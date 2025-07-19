import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import gameSlice from './slices/gameSlice';
import walletSlice from './slices/walletSlice';
import leaderboardSlice from './slices/leaderboardSlice';
import tableSlice from './slices/tableSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    game: gameSlice,
    wallet: walletSlice,
    leaderboard: leaderboardSlice,
    table: tableSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;