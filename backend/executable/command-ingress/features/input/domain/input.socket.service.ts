// features/input/domain/service/input.socket.service.ts
import { io } from '../../../socket';
import {
    InputEvent,
    InputCreatedEvent,
    InputDeletedEvent,
    InputsReloadEvent,
    IncrementalProgressEvent
} from '../events/input.events';

export class InputSocketService {

    /**
     * Gửi event đến tất cả thành viên trong project
     */
    broadcastToProject(
        projectId: string,
        event: InputCreatedEvent | InputDeletedEvent | InputsReloadEvent | IncrementalProgressEvent
    ): void {
        io.to(`project_${projectId}`).emit('input_event', event);
        console.log(`📢 Broadcast input event to project ${projectId}:`, event.type);
    }

    /**
     * Thành viên join project room
     */
    joinProjectRoom(socket: any, projectId: string): void {
        socket.join(`project_${projectId}`);
        console.log(`✅ User ${socket.id} joined project room: project_${projectId}`);
    }

    /**
     * Thành viên leave project room
     */
    leaveProjectRoom(socket: any, projectId: string): void {
        socket.leave(`project_${projectId}`);
        console.log(`🚪 User ${socket.id} left project room: project_${projectId}`);
    }

    // Các helper methods cho từng loại event
    emitInputCreated(projectId: string, versionId: string, userId: string, input: any): void {
        const event: InputCreatedEvent = {
            type: 'INPUT_CREATED',
            projectId,
            versionId,
            userId,
            input,
            timestamp: new Date()
        };
        this.broadcastToProject(projectId, event);
    }

    emitInputDeleted(projectId: string, versionId: string, userId: string, inputId: string): void {
        const event: InputDeletedEvent = {
            type: 'INPUT_DELETED',
            projectId,
            versionId,
            userId,
            inputId,
            timestamp: new Date()
        };
        this.broadcastToProject(projectId, event);
    }

    emitInputsReload(projectId: string, versionId: string, userId: string, inputs: any[]): void {
        const event: InputsReloadEvent = {
            type: 'INPUTS_RELOAD',
            projectId,
            versionId,
            userId,
            inputs,
            timestamp: new Date()
        };
        this.broadcastToProject(projectId, event);
    }

    emitIncrementalProgress(
        projectId: string,
        versionId: string,
        userId: string,
        progress: number,
        stage: string,
        isProcessing: boolean
    ): void {
        const event: IncrementalProgressEvent = {
            type: 'INCREMENTAL_PROGRESS',
            projectId,
            versionId,
            userId,
            progress,
            stage,
            isProcessing,
            timestamp: new Date()
        };
        this.broadcastToProject(projectId, event);
        console.log(`📊 Broadcast incremental progress: ${progress}% - ${stage}`);
    }
}

export const inputSocketService = new InputSocketService();