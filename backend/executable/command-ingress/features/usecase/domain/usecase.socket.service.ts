// features/usecase/domain/service/usecase.socket.service.ts
import { io } from '../../../socket';
import {
    UsecaseEvent,
    UsecaseCreatedEvent,
    UsecaseUpdatedEvent,
    UsecaseDeletedEvent,
    UsecasesReloadEvent
} from '../events/usecase.events';

export class UsecaseSocketService {

    /**
     * Gửi event đến tất cả thành viên trong project
     */
    broadcastToProject(projectId: string, event: UsecaseEvent): void {
        io.to(`project_${projectId}`).emit('usecase_event', event);
        //console.log(`📢 Broadcast usecase event to project ${projectId}:`, event.type);
    }

    /**
     * Thành viên join project room
     */
    joinProjectRoom(socket: any, projectId: string): void {
        socket.join(`project_${projectId}`);
        //console.log(`✅ User ${socket.id} joined project room: project_${projectId}`);
    }

    /**
     * Thành viên leave project room
     */
    leaveProjectRoom(socket: any, projectId: string): void {
        socket.leave(`project_${projectId}`);
        //console.log(`🚪 User ${socket.id} left project room: project_${projectId}`);
    }

    // Các helper methods cho từng loại event
    emitUsecaseCreated(projectId: string, versionId: string, userId: string, usecase: any): void {
        const event: UsecaseCreatedEvent = {
            type: 'USECASE_CREATED',
            projectId,
            versionId,
            userId,
            usecase,
            timestamp: new Date()
        };
        this.broadcastToProject(projectId, event);
    }

    emitUsecaseUpdated(projectId: string, versionId: string, userId: string, usecase: any, previousData?: any): void {
        const event: UsecaseUpdatedEvent = {
            type: 'USECASE_UPDATED',
            projectId,
            versionId,
            userId,
            usecase,
            previousData,
            timestamp: new Date()
        };
        this.broadcastToProject(projectId, event);
    }

    emitUsecaseDeleted(projectId: string, versionId: string, userId: string, usecaseId: string): void {
        const event: UsecaseDeletedEvent = {
            type: 'USECASE_DELETED',
            projectId,
            versionId,
            userId,
            usecaseId,
            timestamp: new Date()
        };
        this.broadcastToProject(projectId, event);
    }

    emitUsecasesReload(projectId: string, versionId: string, userId: string, usecases: any[]): void {
        const event: UsecasesReloadEvent = {
            type: 'USECASES_RELOAD',
            projectId,
            versionId,
            userId,
            usecases,
            timestamp: new Date()
        };
        this.broadcastToProject(projectId, event);
    }
}

export const usecaseSocketService = new UsecaseSocketService();