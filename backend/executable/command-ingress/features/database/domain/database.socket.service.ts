// features/database/domain/database.socket.service.ts
import { io } from '../../../socket';

export interface DatabaseProgressEvent {
    type: 'DATABASE_PROGRESS';
    projectId: string;
    versionId: string;
    userId: string;
    progress?: number;
    stage?: string;
    isProcessing?: boolean;
    errors?: string[];
    errorMessage?: string;
    timestamp: Date;
}

export class DatabaseSocketService {
    /**
     * Gửi event đến tất cả thành viên trong project
     */
    broadcastToProject(projectId: string, event: DatabaseProgressEvent): void {
        io.to(`project_${projectId}`).emit('database_event', event);
        console.log(`📢 Broadcast database event to project ${projectId}:`, event.type);
    }

    /**
     * Emit progress event
     */
    emitProgress(
        projectId: string,
        versionId: string,
        userId: string,
        progress: number,
        stage: string,
        isProcessing: boolean,
        batchInfo?: any,
        errors?: string[]
    ): void {
        const event: DatabaseProgressEvent = {
            type: 'DATABASE_PROGRESS',
            projectId,
            versionId,
            userId,
            progress,
            stage,
            isProcessing,
            errors,
            errorMessage: errors && errors.length > 0 ? errors.join('; ') : undefined,
            timestamp: new Date()
        };
        this.broadcastToProject(projectId, event);
        if (errors && errors.length > 0) {
            console.log(`❌ Broadcast database failed: ${progress}% - ${stage}`, errors);
        } else {
            console.log(`📊 Broadcast database progress: ${progress}% - ${stage}`);
        }
    }
}

export const databaseSocketService = new DatabaseSocketService();


