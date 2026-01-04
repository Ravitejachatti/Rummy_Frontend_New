// 📁 src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/api';
import socketService from '../../config/socket';

// ---------- LOGIN ----------
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { accessToken, user } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(user));

      // Connect socket after successful login
      socketService.connect(accessToken);

      return { accessToken, user };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Login failed');
    }
  }
);

// ---------- SIGNUP ----------
export const signupUser = createAsyncThunk(
  'auth/signup',
  async ({ email, username, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/auth/signup', {
        email,
        username,
        password,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Signup failed');
    }
  }
);

// ---------- REFRESH ACCESS TOKEN ----------
export const refreshAccessToken = createAsyncThunk(
  'auth/refresh',
  async (_, { getState, rejectWithValue }) => {
    try {
      // refresh token is in httpOnly cookie, just call API with credentials
      const response = await api.post('/api/auth/refresh', {}, { withCredentials: true });
      const { accessToken } = response.data;

      const { user } = getState().auth;

      localStorage.setItem('accessToken', accessToken);

      // Reconnect socket with new token if needed
      socketService.connect(accessToken);

      return { accessToken, user };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Failed to refresh session'
      );
    }
  }
);

// ---------- LOGOUT ----------
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Inform backend so it clears session + refresh cookie
      await api.post('/api/auth/logout', {}, { withCredentials: true });

      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      socketService.disconnect();

      return null;
    } catch (error) {
      // Even if server fails, clear locally
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      socketService.disconnect();
      return rejectWithValue('Logout failed, cleared local session');
    }
  }
);

const initialState = {
  user: JSON.parse(localStorage.getItem('user')) || null,
  accessToken: localStorage.getItem('accessToken') || null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // LOGIN
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })

      // SIGNUP
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // REFRESH
      .addCase(refreshAccessToken.pending, (state) => {
        state.loading = false; // don't block UI
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
      })
      .addCase(refreshAccessToken.rejected, (state, action) => {
        state.accessToken = null;
        state.isAuthenticated = false;
        state.error = action.payload;
      })

      // LOGOUT
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;