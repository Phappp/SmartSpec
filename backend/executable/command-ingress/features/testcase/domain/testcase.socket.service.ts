// features/testcase/domain/testcase.socket.service.ts
import { io } from '../../../socket';

export interface TestcaseProgressEvent {
    type: 'TESTCASE_PROGRESS' | 'ESTIMATE_RECEIVED';
    projectId: string;
    versionId: string;
    userId: string;
    progress?: number;
    stage?: string;
    isProcessing?: boolean;
    batchInfo?: {
        currentBatch: number;
        totalBatches: number;
        testcasesInBatch: number;
        savedCount: number;
        totalCount: number;
    };
    estimate?: {
        estimated_count: number;
        summary: string;
        estimated_batches: number;
        reasoning?: string;
    };
    errors?: string[]; // ✅ Thêm errors field để frontend có thể detect failed state
    errorMessage?: string; // ✅ Thêm errorMessage cho compatibility
    agentState?: string; // ✅ Thêm agentState để hiển thị state của agent
    message?: string; // ✅ Thêm message để hiển thị thông báo chi tiết
    timestamp: Date;
}

export class TestcaseSocketService {
    /**
     * Gửi event đến tất cả thành viên trong project
     */
    broadcastToProject(projectId: string, event: TestcaseProgressEvent): void {
        io.to(`project_${projectId}`).emit('testcase_event', event);
        console.log(`📢 Broadcast testcase event to project ${projectId}:`, event.type);
    }

    /**
     * Emit estimate received event
     */
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
        const event: TestcaseProgressEvent = {
            type: 'ESTIMATE_RECEIVED',
            projectId,
            versionId,
            userId,
            estimate,
            timestamp: new Date()
        };
        this.broadcastToProject(projectId, event);
        console.log(`📊 Broadcast testcase estimate received: ${estimate.estimated_count} test cases, ${estimate.estimated_batches} batches`);
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
        batchInfo?: {
            currentBatch: number;
            totalBatches: number;
            testcasesInBatch: number;
            savedCount: number;
            totalCount: number;
        },
        errors?: string[], // ✅ Thêm errors parameter
        agentState?: string, // ✅ Thêm agentState parameter
        message?: string // ✅ Thêm message parameter
    ): void {
        const event: TestcaseProgressEvent = {
            type: 'TESTCASE_PROGRESS',
            projectId,
            versionId,
            userId,
            progress,
            stage,
            isProcessing,
            batchInfo,
            errors, // ✅ Gửi errors trong event
            errorMessage: errors && errors.length > 0 ? errors.join('; ') : undefined, // ✅ Thêm errorMessage cho compatibility
            agentState, // ✅ Thêm agentState
            message, // ✅ Thêm message
            timestamp: new Date()
        };
        this.broadcastToProject(projectId, event);
        const errorInfo = errors && errors.length > 0 ? ` (Errors: ${errors.length})` : '';
        const stateInfo = agentState ? ` [${agentState}]` : '';
        const messageInfo = message ? ` - ${message}` : '';
        console.log(`📊 Broadcast testcase progress: ${progress}% - ${stage}${stateInfo}${batchInfo ? ` (Batch ${batchInfo.currentBatch}/${batchInfo.totalBatches})` : ''}${messageInfo}${errorInfo}`);
    }
}

export const testcaseSocketService = new TestcaseSocketService();


