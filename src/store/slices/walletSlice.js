import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/api';

// Async thunks
export const getBalance = createAsyncThunk(
  'wallet/getBalance',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/wallet/balance');
      return response.data.balance;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to get balance');
    }
  }
);

export const addChips = createAsyncThunk(
  'wallet/addChips',
  async (amount, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/wallet/add', { amount });
      return response.data.balance;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to add chips');
    }
  }
);

export const withdrawChips = createAsyncThunk(
  'wallet/withdrawChips',
  async (amount, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/wallet/withdraw', { amount });
      return response.data.balance;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to withdraw chips');
    }
  }
);

const initialState = {
  balance: 0,
  loading: false,
  error: null,
  transactions: [],
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateBalance: (state, action) => {
      state.balance = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get balance
      .addCase(getBalance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBalance.fulfilled, (state, action) => {
        state.loading = false;
        state.balance = action.payload;
      })
      .addCase(getBalance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add chips
      .addCase(addChips.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addChips.fulfilled, (state, action) => {
        state.loading = false;
        state.balance = action.payload;
      })
      .addCase(addChips.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Withdraw chips
      .addCase(withdrawChips.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(withdrawChips.fulfilled, (state, action) => {
        state.loading = false;
        state.balance = action.payload;
      })
      .addCase(withdrawChips.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, updateBalance } = walletSlice.actions;
export default walletSlice.reducer;