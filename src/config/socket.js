// client/src/config/socket.js
import { io } from 'socket.io-client';

const DEFAULT_URL = (typeof window !== 'undefined' && window.location)
  ? `${window.location.protocol}//${window.location.host}`
  : 'http://localhost:5001';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || DEFAULT_URL;

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.queue = [];              // queued emits when disconnected
    this._connectPromise = null;  // promise used by waitUntilConnected()
    this._resolve = null;
    this._reject = null;
  }

  connect(token) {
    // Idempotent: reuse if already connected
    if (this.socket?.connected) return this.socket;
    if (this._connectPromise) return this.socket;

    this._connectPromise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });

    this.socket = io(SOCKET_URL, {
      auth: { token },                        // backend extracts userId from JWT
      transports: ['websocket', 'polling'],   // robust option
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      timeout: 20000,
      path: '/socket.io',
      withCredentials: false,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      this.isConnected = true;

      // Flush queued emits
      const toFlush = this.queue.splice(0, this.queue.length);
      for (const { event, data } of toFlush) {
        try { this.socket.emit(event, data); } catch {}
      }

      if (this._resolve) this._resolve();
      this._cleanupPromiseHandles();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      this.isConnected = false;
      this._resetPromiseIfNeeded();
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error?.message || error);
      this.isConnected = false;
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
    if (!this._connectPromise) this._resetPromiseIfNeeded();
    try {
      await this._connectPromise;
    } catch {
      // swallow; caller may retry
    }
  }

  disconnect() {
    if (this.socket) {
      try { this.socket.disconnect(); } catch {}
      this.socket = null;
    }
    this.isConnected = false;
    this.queue.length = 0;
    this._cleanupPromiseHandles();
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
    if (callback) this.socket.off(event, callback);
    else this.socket.off(event);
  }

  getSocket() {
    return this.socket;
  }
}

export default new SocketService();