// features/log/domain/events/log.events.ts

export interface LogEventData {
  projectId?: string;     // Có thể không có nếu là log hệ thống
  userId?: string;        // Ai tạo log
  timestamp: Date;
}

/**
 * Khi tạo mới một log
 */
export interface LogCreatedEvent extends LogEventData {
  type: 'LOG_CREATED';
  log: any;
}

/**
 * Khi reload toàn bộ logs (ví dụ khi admin yêu cầu tải lại)
 */
export interface LogsReloadEvent extends LogEventData {
  type: 'LOGS_RELOAD';
  logs: any[];
}

/**
 * Khi xóa log (theo retention hoặc admin)
 */
export interface LogDeletedEvent extends LogEventData {
  type: 'LOG_DELETED';
  logId: string;
}

/**
 * Khi dọn dẹp hệ thống log cũ (admin chạy retention)
 */
export interface LogsPurgedEvent extends LogEventData {
  type: 'LOGS_PURGED';
  count: number;
  beforeDate: Date;
}

/**
 * Union type cho tất cả các loại event log
 */
export type LogEvent =
  | LogCreatedEvent
  | LogsReloadEvent
  | LogDeletedEvent
  | LogsPurgedEvent;
