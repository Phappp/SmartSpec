// features/uml/domain/uml.socket.service.ts
import { io } from '../../../socket';

export interface UmlProgressEvent {
    type: 'UML_PROGRESS';
    projectId: string;
    versionId: string;
    userId: string;
    diagramType?: 'usecase' | 'activity' | 'sequence';
    progress?: number;
    stage?: string;
    isProcessing?: boolean;
    timestamp: Date;
}

export class UmlSocketService {
    /**
     * Gửi event đến tất cả thành viên trong project
     */
    broadcastToProject(projectId: string, event: UmlProgressEvent): void {
        io.to(`project_${projectId}`).emit('uml_event', event);
        console.log(`📢 Broadcast uml event to project ${projectId}:`, event.type);
    }

    /**
     * Emit progress event
     */
    emitProgress(
        projectId: string,
        versionId: string,
        userId: string,
        diagramType: 'usecase' | 'activity' | 'sequence',
        progress: number,
        stage: string,
        isProcessing: boolean
    ): void {
        const event: UmlProgressEvent = {
            type: 'UML_PROGRESS',
            projectId,
            versionId,
            userId,
            diagramType,
            progress,
            stage,
            isProcessing,
            timestamp: new Date()
        };
        this.broadcastToProject(projectId, event);
        console.log(`📊 Broadcast uml progress (${diagramType}): ${progress}% - ${stage}`);
    }
}

export const umlSocketService = new UmlSocketService();

