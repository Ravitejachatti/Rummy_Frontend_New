// client/src/config/socket.js
import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "https://rummy-backend-sb29.onrender.com";

// Only queue safe events (do NOT queue gameplay actions)
const SAFE_QUEUE_EVENTS = new Set(["rummy/join_table"]);

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;

    this.queue = [];

    this._connectPromise = null;
    this._resolve = null;
    this._reject = null;

    this.token = null; // keep latest token
  }

  _ensurePromise() {
    if (!this._connectPromise) {
      this._connectPromise = new Promise((resolve, reject) => {
        this._resolve = resolve;
        this._reject = reject;
      });
    }
  }

  _cleanupPromiseHandles() {
    this._connectPromise = null;
    this._resolve = null;
    this._reject = null;
  }

  connect(token) {
    // Always store latest token
    this.token = token || localStorage.getItem("accessToken") || "";

    // If socket exists, update auth for next connect/reconnect
    if (this.socket) {
      this.socket.auth = { token: this.token };

      // If already connected, return quickly
      if (this.socket.connected) {
        this.isConnected = true;
        return this.socket;
      }

      // If disconnected, ensure promise and connect
      this._ensurePromise();
      try {
        this.socket.connect();
      } catch {}
      return this.socket;
    }

    // First time create socket
    this._ensurePromise();

    this.socket = io(SOCKET_URL, {
      auth: { token: this.token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      timeout: 20000,
      path: "/socket.io",
      withCredentials: false,
      autoConnect: true,
    });

    // ✅ Always re-apply latest token on reconnect attempts
    // (prevents “stuck reconnecting with old token”)
    this.socket.io?.on?.("reconnect_attempt", () => {
      try {
        this.socket.auth = { token: this.token };
      } catch {}
    });

    this.socket.on("connect", () => {
      console.log("✅ Socket connected:", this.socket.id);
      this.isConnected = true;

      // Flush queued emits (safe ones only)
      const toFlush = this.queue.splice(0, this.queue.length);
      for (const { event, data } of toFlush) {
        try {
          this.socket.emit(event, data);
        } catch {}
      }

      if (this._resolve) this._resolve();
      this._cleanupPromiseHandles();
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      this.isConnected = false;

      // prepare new promise for next waitUntilConnected
      this._ensurePromise();
    });

    this.socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error?.message || error);
      this.isConnected = false;

      // Reject current waiter once (then reset to allow future waits)
      if (this._reject) this._reject(error);
      this._cleanupPromiseHandles();
      this._ensurePromise();
    });

    return this.socket;
  }

  // Call this after refresh success (api.js)
  updateToken(newToken) {
    if (!newToken) return;

    this.token = newToken;
    localStorage.setItem("accessToken", newToken);

    if (!this.socket) return;

    // update auth used on the next (re)connect
    this.socket.auth = { token: newToken };

    // If currently disconnected, reconnect with new token
    if (!this.socket.connected) {
      this._ensurePromise();
      try {
        this.socket.connect();
      } catch {}
    }
  }

  async waitUntilConnected() {
    if (this.socket?.connected && this.isConnected) return;
    this._ensurePromise();
    try {
      await this._connectPromise;
    } catch {
      // swallow (caller can still rely on socket reconnecting later)
    }
  }

  disconnect() {
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch {}
      this.socket = null;
    }
    this.isConnected = false;
    this.queue.length = 0;
    this._cleanupPromiseHandles();
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      return;
    }

    // Only queue safe events
    if (SAFE_QUEUE_EVENTS.has(event)) {
      console.warn("Socket not connected, queueing SAFE emit:", event, data);
      this.queue.push({ event, data });
      return;
    }

    console.warn("Blocked emit while disconnected:", event);
  }

  on(event, callback) {
    if (!this.socket || !event || !callback) return;
    this.socket.on(event, callback);
  }

  off(event, callback) {
    if (!this.socket || !event) return;
    if (callback) this.socket.off(event, callback);
    else this.socket.off(event);
  }

  getSocket() {
    return this.socket;
  }
}

export default new SocketService();