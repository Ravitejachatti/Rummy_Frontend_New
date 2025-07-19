import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/api';

// Async thunks
export const createTable = createAsyncThunk(
  'table/createTable',
  async (tableData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/rummy/table/create', tableData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create table');
    }
  }
);

export const fetchTables = createAsyncThunk(
  'table/fetchTables',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/rummy/table/list');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch tables');
    }
  }
);

const initialState = {
  tables: [],
  currentTable: null,
  loading: false,
  error: null,
  createLoading: false,
};

const tableSlice = createSlice({
  name: 'table',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentTable: (state, action) => {
      state.currentTable = action.payload;
    },
    clearCurrentTable: (state) => {
      state.currentTable = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create table
      .addCase(createTable.pending, (state) => {
        state.createLoading = true;
        state.error = null;
      })
      .addCase(createTable.fulfilled, (state, action) => {
        state.createLoading = false;
        state.tables.push(action.payload);
      })
      .addCase(createTable.rejected, (state, action) => {
        state.createLoading = false;
        state.error = action.payload;
      })
      // Fetch tables
      .addCase(fetchTables.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTables.fulfilled, (state, action) => {
        state.loading = false;
        state.tables = action.payload;
      })
      .addCase(fetchTables.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, setCurrentTable, clearCurrentTable } = tableSlice.actions;
export default tableSlice.reducer;