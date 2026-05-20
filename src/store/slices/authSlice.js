// 📁 src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api, { refreshClient } from "../../config/api";
import socketService from "../../config/socket";

// ---------- LOGIN ----------
export const loginUser = createAsyncThunk(
  "auth/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/auth/login", { email, password });
      const { accessToken, user } = response.data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("user", JSON.stringify(user));

      return { accessToken, user };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || "Login failed");
    }
  }
);

// ---------- SIGNUP ----------
export const signupUser = createAsyncThunk(
  "auth/signup",
  async ({ email, username, password }, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/auth/signup", {
        email,
        username,
        password,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || "Signup failed");
    }
  }
);

// ---------- REFRESH ACCESS TOKEN ----------
export const refreshAccessToken = createAsyncThunk(
  "auth/refresh",
  async (_, { getState, rejectWithValue }) => {
    try {
      // ✅ use refreshClient to avoid interceptor loops
      const response = await refreshClient.post("/api/auth/refresh");
      const { accessToken } = response.data;

      if (!accessToken) throw new Error("No access token returned");

      localStorage.setItem("accessToken", accessToken);

      // Update socket token safely
      if (typeof socketService.updateToken === "function") {
        socketService.updateToken(accessToken);
      }

      const { user } = getState().auth;
      return { accessToken, user };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || "Failed to refresh session");
    }
  }
);

// ---------- LOGOUT ----------
export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await api.post("/api/auth/logout", {}, { withCredentials: true });

      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");

      return null;
    } catch (error) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      return rejectWithValue("Logout failed, cleared local session");
    }
  }
);

const initialState = {
  user: JSON.parse(localStorage.getItem("user")) || null,
  accessToken: localStorage.getItem("accessToken") || null,
  isAuthenticated: false,         // ✅ start false until bootstrapped
  bootstrapped: false,            // ✅ NEW
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
reducers: {
  clearError: (state) => { state.error = null; },
  setUser: (state, action) => { state.user = action.payload; },
  bootstrapped: (state) => { state.bootstrapped = true; },
  localLogout: (state) => {
    state.user = null;
    state.accessToken = null;
    state.isAuthenticated = false;
    state.bootstrapped = true;
    state.loading = false;
    state.error = null;
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
        state.bootstrapped = true;
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
        state.loading = true;
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.loading = false;
        state.bootstrapped = true;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
      })
      .addCase(refreshAccessToken.rejected, (state, action) => {
        state.loading = false;
        state.bootstrapped = true;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.error = action.payload;
      })

      // LOGOUT
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.bootstrapped = true;
        state.loading = false;
        state.error = null;
      })
  },
});

export const { clearError, setUser, bootstrapped, localLogout } = authSlice.actions;
export default authSlice.reducer;