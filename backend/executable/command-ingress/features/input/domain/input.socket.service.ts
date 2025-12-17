// features/input/domain/service/input.socket.service.ts
import { io } from '../../../socket';
import {
    InputEvent,
    InputCreatedEvent,
    InputDeletedEvent,
    InputsUpdatedEvent,
    InputsReloadEvent,
    IncrementalProgressEvent,
    InputsAddedSummaryEvent,
    EstimateReceivedEvent
} from '../events/input.events';

export class InputSocketService {

    /**
     * Gửi event đến tất cả thành viên trong project
     */
    broadcastToProject(
        projectId: string,
        event: InputCreatedEvent | InputDeletedEvent | InputsUpdatedEvent | InputsReloadEvent | IncrementalProgressEvent | InputsAddedSummaryEvent | EstimateReceivedEvent
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

    emitInputsUpdated(projectId: string, versionId: string, userId: string, unprocessedCount: number): void {
        const event: InputsUpdatedEvent = {
            type: 'INPUTS_UPDATED',
            projectId,
            versionId,
            userId,
            unprocessedCount,
            timestamp: new Date()
        };
        this.broadcastToProject(projectId, event);
        console.log(`📊 Broadcast inputs updated: ${unprocessedCount} unprocessed inputs`);
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

    emitInputsAddedSummary(
        projectId: string,
        versionId: string,
        userId: string,
        newInputsCount: number,
        totalInputs: number,
        unprocessedCount: number
    ): void {
        const event: InputsAddedSummaryEvent = {
            type: 'INPUTS_ADDED_SUMMARY',
            projectId,
            versionId,
            userId,
            newInputsCount,
            totalInputs,
            unprocessedCount,
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
        isProcessing: boolean,
        batchInfo?: {
            currentBatch: number;
            totalBatches: number;
            usecasesInBatch: number;
            savedCount?: number; // ✅ Tổng số usecases đã save
            totalCount?: number; // ✅ Tổng số usecases cần generate
        },
        errors?: string[], // ✅ Thêm errors parameter
        agentState?: string, // ✅ Agent state
        message?: string // ✅ Human-readable message
    ): void {
        const event: IncrementalProgressEvent = {
            type: 'INCREMENTAL_PROGRESS',
            projectId,
            versionId,
            userId,
            progress,
            stage,
            isProcessing,
            batchInfo,
            errors, // ✅ Gửi errors trong event
            errorMessage: errors && errors.length > 0 ? errors.join('; ') : undefined, // ✅ Thêm errorMessage cho compatibility
            agentState, // ✅ Agent state
            message, // ✅ Human-readable message
            timestamp: new Date()
        };
        this.broadcastToProject(projectId, event);
        const errorInfo = errors && errors.length > 0 ? ` (Errors: ${errors.length})` : '';
        const stateInfo = agentState ? ` [${agentState}]` : '';
        const messageInfo = message ? ` - ${message}` : '';
        console.log(`📊 Broadcast incremental progress: ${progress}% - ${stage}${stateInfo}${messageInfo}${batchInfo ? ` (Batch ${batchInfo.currentBatch}/${batchInfo.totalBatches})` : ''}${errorInfo}`);
    }

    emitEstimateReceived(
        projectId: string,
        versionId: string,
        userId: string,
        estimate: {
            estimated_count: number;
            summary: string;
            estimated_batches: number;
            reasoning?: string;
        }
    ): void {
        const event: EstimateReceivedEvent = {
            type: 'ESTIMATE_RECEIVED',
            projectId,
            versionId,
            userId,
            estimate,
            timestamp: new Date()
        };
        this.broadcastToProject(projectId, event);
        console.log(`📊 Broadcast estimate received: ${estimate.estimated_count} use cases, ${estimate.estimated_batches} batches`);
    }
}

export const inputSocketService = new InputSocketService();