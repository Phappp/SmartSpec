import { io } from 'socket.io-client';

export class LogSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.init();
  }

  init() {
    try {
      // SỬA: Dùng window.location.origin thay vì process.env
      const socketUrl = window.location.origin.replace(':8000', ':3000'); // Giả sử BE chạy port 3000
      
      this.socket = io(socketUrl, {
        transports: ['websocket'],
        autoConnect: true
      });

      this.socket.on('connect', () => {
        console.log('✅ [LogSocket] Connected to server');
      });

      this.socket.on('disconnect', () => {
        console.log('🔴 [LogSocket] Disconnected from server');
      });

      this.socket.on('log_event', (event) => {
        this.emit('log_event', event);
        
        // Handle specific event types
        if (event.type === 'LOG_CREATED') {
          this.emit('log_created', event.log);
        }
      });

      this.socket.on('error', (error) => {
        console.error('❌ [LogSocket] Error:', error);
      });

    } catch (err) {
      console.error('❌ [LogSocket] Initialization failed:', err);
    }
  }

  // Join project room
  joinProjectRoom(projectId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_project_room', projectId);
      console.log(`✅ [LogSocket] Joined project room: ${projectId}`);
    } else {
      console.warn('⚠️ [LogSocket] Socket not connected, cannot join room');
    }
  }

  // Leave project room
  leaveProjectRoom(projectId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_project_room', projectId);
      console.log(`🚪 [LogSocket] Left project room: ${projectId}`);
    }
  }

  // Join user room
  joinUserRoom(userId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_user_room', userId);
      console.log(`✅ [LogSocket] Joined user room: ${userId}`);
    }
  }

  // Join system room
  joinSystemRoom() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_system_room');
      console.log(`✅ [LogSocket] Joined system room`);
    }
  }

  // Event listeners
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  }

  // Specific event helpers
  onLogCreated(callback) {
    this.on('log_created', callback);
  }

  offLogCreated(callback) {
    this.off('log_created', callback);
  }

  onLogEvent(callback) {
    this.on('log_event', callback);
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`❌ [LogSocket] Error in ${event} callback:`, err);
        }
      });
    }
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
      console.log('🔴 [LogSocket] Disconnected');
    }
  }

  // Check connection status
  isConnected() {
    return this.socket && this.socket.connected;
  }
}

// Singleton instance
export const logSocketService = new LogSocketService();