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
        isProcessing: boolean
    ): void {
        const event: DatabaseProgressEvent = {
            type: 'DATABASE_PROGRESS',
            projectId,
            versionId,
            userId,
            progress,
            stage,
            isProcessing,
            timestamp: new Date()
        };
        this.broadcastToProject(projectId, event);
        console.log(`📊 Broadcast database progress: ${progress}% - ${stage}`);
    }
}

export const databaseSocketService = new DatabaseSocketService();

