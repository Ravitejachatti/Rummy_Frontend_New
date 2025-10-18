// client/src/config/socket.js
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://rummy-backend-sb29.onrender.com';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.queue = [];              // {event, data}
    this._connectPromise = null;  // promise for waitUntilConnected
    this._resolve = null;
    this._reject = null;
  }

  connect(token) {
    // Idempotent: reuse existing socket when possible
    if (this.socket?.connected) return this.socket;
    if (this._connectPromise) return this.socket;

    this._connectPromise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });

    this.socket = io(SOCKET_URL, {
      auth: { token },                 // backend extracts userId from JWT
      transports: ['websocket', 'polling'], // be robust; WS-only can blip early
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      timeout: 20000,
      path: '/socket.io',              // default; keep explicit if your server customizes
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      this.isConnected = true;
      // flush queued emits
      const toFlush = [...this.queue];
      this.queue.length = 0;
      for (const { event, data } of toFlush) {
        this.socket.emit(event, data);
      }
      if (this._resolve) this._resolve();
      this._cleanupPromiseHandles();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      this.isConnected = false;
      // Keep queue for next connect if caller keeps emitting
      // New waiters will get a new promise
      this._resetPromiseIfNeeded();
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error?.message || error);
      this.isConnected = false;
      // Let initial waiters fail once; reconnect attempts will create a new promise
      if (this._reject) this._reject(error);
      this._cleanupPromiseHandles();
      this._resetPromiseIfNeeded();
    });

    return this.socket;
  }

  _cleanupPromiseHandles() {
    this._connectPromise = null;
    this._resolve = null;
    this._reject = null;
  }

  _resetPromiseIfNeeded() {
    if (!this._connectPromise) {
      this._connectPromise = new Promise((resolve, reject) => {
        this._resolve = resolve;
        this._reject = reject;
      });
    }
  }

  async waitUntilConnected() {
    if (this.socket?.connected && this.isConnected) return;
    if (!this._connectPromise) {
      // Create a promise if none exists (e.g., called before connect())
      this._resetPromiseIfNeeded();
    }
    try {
      await this._connectPromise;
    } catch {
      // swallow; caller may retry
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.queue.length = 0;
      this._cleanupPromiseHandles();
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, queueing emit:', event, data);
      this.queue.push({ event, data });
    }
  }

  on(event, callback) {
    if (!this.socket) return;
    this.socket.on(event, callback);
  }

  off(event, callback) {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }

  getSocket() {
    return this.socket;
  }
}

export default new SocketService();