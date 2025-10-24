export interface VersionEventData {
  projectId: string;
  versionId: string;
  userId: string;
  timestamp: Date;
}

/** Khi tạo version mới (bump, clone, auto bump, ...) */
export interface VersionCreatedEvent extends VersionEventData {
  type: 'VERSION_CREATED';
  version: any; // hoặc có thể thay bằng kiểu VersionModel nếu bạn có interface đó
}

/** Khi người dùng đổi sang version khác */
export interface VersionSwitchedEvent extends VersionEventData {
  type: 'VERSION_SWITCHED';
  fromVersionId: string;
  toVersionId: string;
}

/** Khi version bị xoá (hiếm khi dùng nhưng nên có) */
export interface VersionDeletedEvent extends VersionEventData {
  type: 'VERSION_DELETED';
  deletedVersionId: string;
}

/** Khi cần reload lại toàn bộ danh sách version (ví dụ khi có thay đổi đồng bộ) */
export interface VersionsReloadEvent extends VersionEventData {
  type: 'VERSIONS_RELOAD';
  versions: any[];
}

/** Khi có cập nhật nhỏ trong version hiện tại (ví dụ status, progress, v.v.) */
export interface VersionUpdatedEvent extends VersionEventData {
  type: 'VERSION_UPDATED';
  updatedFields: Record<string, any>;
}

/** Union type để dễ xử lý trong socket service */
export type VersionEvent =
  | VersionCreatedEvent
  | VersionSwitchedEvent
  | VersionDeletedEvent
  | VersionsReloadEvent
  | VersionUpdatedEvent;
