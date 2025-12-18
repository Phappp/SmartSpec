import { io } from '../../../socket';
import {
  VersionEvent,
  VersionCreatedEvent,
  VersionSwitchedEvent,
  VersionDeletedEvent,
  VersionsReloadEvent,
  VersionUpdatedEvent,
} from '../events/version.events';

export class VersionSocketService {
  /**
   * 📢 Gửi event đến tất cả thành viên trong project
   */
  broadcastToProject(projectId: string, event: VersionEvent): void {
    io.to(`project_${projectId}`).emit('version_event', event);
    //console.log(`📢 Broadcast version event to project ${projectId}:`, event.type);
  }

  /**
   * ✅ Thành viên join project room
   */
  joinProjectRoom(socket: any, projectId: string): void {
    socket.join(`project_${projectId}`);
    //console.log(`✅ User ${socket.id} joined project room: project_${projectId}`);
  }

  /**
   * 🚪 Thành viên rời khỏi project room
   */
  leaveProjectRoom(socket: any, projectId: string): void {
    socket.leave(`project_${projectId}`);
    //console.log(`🚪 User ${socket.id} left project room: project_${projectId}`);
  }

  /**
   * 🟩 Khi tạo version mới (bump/clone)
   */
  emitVersionBumped(projectId: string, versionId: string, userId: string, version: any): void {
    const event: VersionCreatedEvent = {
      type: 'VERSION_CREATED',
      projectId,
      versionId,
      userId,
      version,
      timestamp: new Date(),
    };
    this.broadcastToProject(projectId, event);
  }

  /**
   * 🔄 Khi người dùng đổi version hiện tại
   */
  emitVersionSwitched(
    projectId: string,
    userId: string,
    toVersionId: string,
    fromVersionId: string
  ): void {
    const event: VersionSwitchedEvent = {
      type: 'VERSION_SWITCHED',
      projectId,
      versionId: toVersionId,
      userId,
      toVersionId,
      fromVersionId,
      timestamp: new Date(),
    };
    this.broadcastToProject(projectId, event);
  }

  /**
   * ❌ Khi version bị xóa
   */
  emitVersionDeleted(projectId: string, versionId: string, userId: string): void {
    const event: VersionDeletedEvent = {
      type: 'VERSION_DELETED',
      projectId,
      versionId,
      userId,
      deletedVersionId: versionId,
      timestamp: new Date(),
    };
    this.broadcastToProject(projectId, event);
  }

  /**
   * 🔁 Khi cần reload lại toàn bộ danh sách version
   */
  emitVersionsReload(projectId: string, versionId: string, userId: string, versions: any[]): void {
    const event: VersionsReloadEvent = {
      type: 'VERSIONS_RELOAD',
      projectId,
      versionId,
      userId,
      versions,
      timestamp: new Date(),
    };
    this.broadcastToProject(projectId, event);
  }

  /**
   * ⚙️ Khi version hiện tại được cập nhật (progress, status, v.v.)
   */
  emitVersionUpdated(
    projectId: string,
    versionId: string,
    userId: string,
    updatedFields: Record<string, any>
  ): void {
    const event: VersionUpdatedEvent = {
      type: 'VERSION_UPDATED',
      projectId,
      versionId,
      userId,
      updatedFields,
      timestamp: new Date(),
    };
    this.broadcastToProject(projectId, event);
  }
}

export const versionSocketService = new VersionSocketService();
