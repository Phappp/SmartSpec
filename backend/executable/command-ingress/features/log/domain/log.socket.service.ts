import { io } from '../../../socket';
import {
  LogEvent,
  LogCreatedEvent,
  LogsReloadEvent,
  LogDeletedEvent,
  LogsPurgedEvent,
} from '../events/log.events';

/**
 * Service chịu trách nhiệm gửi/nhận các event liên quan đến log qua Socket.IO
 */
export class LogSocketService {
  /**
   * Gửi event log đến tất cả thành viên trong cùng project
   */
  broadcastToProject(projectId: string, event: LogEvent): void {
    io.to(`project_${projectId}`).emit('log_event', event);
    console.log(`📢 Broadcast log event to project ${projectId}:`, event.type);
  }

  /**
   * Gửi event log đến một user cụ thể
   */
  sendToUser(userId: string, event: LogEvent): void {
    io.to(`user_${userId}`).emit('log_event', event);
    console.log(`📢 Sent log event to user ${userId}:`, event.type);
  }
  /**
 * Gửi event log tới toàn hệ thống (ví dụ: login, logout, tạo project,...)
 */
broadcastToSystem(event: LogEvent): void {
  io.to('system_logs').emit('log_event', event);
  console.log(`🌍 Broadcast global log event:`, event.type);
}

/**
 * Thành viên join room hệ thống để nhận toàn bộ log
 */
joinSystemRoom(socket: any): void {
  socket.join('system_logs');
  console.log(`✅ User ${socket.id} joined system log room`);
}

/**
 * Emit log hệ thống
 */
emitGlobalLog(log: any): void {
  const event: LogCreatedEvent = {
    type: 'LOG_CREATED',
    projectId: undefined,
    userId: log.userId,
    log,
    timestamp: new Date(),
  };
  this.broadcastToSystem(event);
}
  /**
   * Thành viên join vào phòng của project
   */
  joinProjectRoom(socket: any, projectId: string): void {
    socket.join(`project_${projectId}`);
    console.log(`✅ User ${socket.id} joined project log room: project_${projectId}`);
  }

  /**
   * Thành viên rời khỏi phòng project
   */
  leaveProjectRoom(socket: any, projectId: string): void {
    socket.leave(`project_${projectId}`);
    console.log(`🚪 User ${socket.id} left project log room: project_${projectId}`);
  }

  /**
   * Thành viên join vào phòng cá nhân (user room)
   */
  joinUserRoom(socket: any, userId: string): void {
    socket.join(`user_${userId}`);
    console.log(`✅ User ${socket.id} joined user log room: user_${userId}`);
  }

  /**
   * Thành viên rời khỏi phòng cá nhân
   */
  leaveUserRoom(socket: any, userId: string): void {
    socket.leave(`user_${userId}`);
    console.log(`🚪 User ${socket.id} left user log room: user_${userId}`);
  }

  // ============================================================
  // =============== Emit các loại event khác nhau ===============
  // ============================================================

  /**
   * Khi tạo mới một log
   */
  emitLogCreated(projectId: string | undefined, userId: string | undefined, log: any): void {
    const event: LogCreatedEvent = {
      type: 'LOG_CREATED',
      projectId,
      userId,
      log,
      timestamp: new Date(),
    };
    if (projectId) this.broadcastToProject(projectId, event);
    if (userId) this.sendToUser(userId, event);
  }

  /**
   * Khi reload toàn bộ logs (ví dụ khi admin yêu cầu tải lại)
   */
  emitLogsReload(projectId: string | undefined, logs: any[]): void {
    if (!projectId) return;
    const event: LogsReloadEvent = {
      type: 'LOGS_RELOAD',
      projectId,
      logs,
      timestamp: new Date(),
    };
    this.broadcastToProject(projectId, event);
  }

  /**
   * Khi xóa log cụ thể
   */
  emitLogDeleted(projectId: string | undefined, logId: string): void {
    if (!projectId) return;
    const event: LogDeletedEvent = {
      type: 'LOG_DELETED',
      projectId,
      logId,
      timestamp: new Date(),
    };
    this.broadcastToProject(projectId, event);
  }

  /**
   * Khi dọn dẹp hệ thống log cũ (admin retention)
   */
  emitLogsPurged(projectId: string | undefined, count: number, beforeDate: Date): void {
    if (!projectId) return;
    const event: LogsPurgedEvent = {
      type: 'LOGS_PURGED',
      projectId,
      count,
      beforeDate,
      timestamp: new Date(),
    };
    this.broadcastToProject(projectId, event);
  }
}

export const logSocketService = new LogSocketService();
