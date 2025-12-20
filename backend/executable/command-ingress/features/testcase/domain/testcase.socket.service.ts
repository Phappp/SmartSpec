// features/testcase/domain/testcase.socket.service.ts
import { io } from '../../../socket';

export interface TestcaseProgressEvent {
    type: 'TESTCASE_PROGRESS' | 'ESTIMATE_RECEIVED' | 'TESTCASE_COMPLETED';
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
    committedTestcases?: Array<{ // ✅ Danh sách testcases đã cam kết
        index: number;
        title: string;
        requirementId?: string;
        status: 'pending' | 'generating' | 'completed' | 'error';
        error?: string;
    }>;
    errors?: string[]; // ✅ Thêm errors field để frontend có thể detect failed state
    errorMessage?: string; // ✅ Thêm errorMessage cho compatibility
    agentState?: string; // ✅ Thêm agentState để hiển thị state của agent
    message?: string; // ✅ Thêm message để hiển thị thông báo chi tiết
    shouldRefresh?: boolean; // ✅ Thêm flag để frontend biết cần refresh data
    saveResult?: { // ✅ Thêm saveResult để frontend biết kết quả save
        totalExpected: number;
        saved: number;
        repairedByLLM: number;
        skipped: number;
        failed: number;
    };
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
        },
        committedTestcases?: Array<{ // ✅ Thêm committedTestcases parameter
            index: number;
            title: string;
            requirementId?: string;
            status: 'pending' | 'generating' | 'completed' | 'error';
            error?: string;
        }>
    ): void {
        const event: TestcaseProgressEvent = {
            type: 'ESTIMATE_RECEIVED',
            projectId,
            versionId,
            userId,
            estimate,
            committedTestcases, // ✅ Thêm committedTestcases vào event
            timestamp: new Date()
        };
        this.broadcastToProject(projectId, event);
        console.log(`📊 Broadcast testcase estimate received: ${estimate.estimated_count} test cases, ${estimate.estimated_batches} batches, ${committedTestcases?.length || 0} committed testcases`);
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
        message?: string, // ✅ Thêm message parameter
        shouldRefresh?: boolean, // ✅ Thêm shouldRefresh parameter để frontend biết cần refresh data
        committedTestcases?: Array<{ // ✅ Thêm committedTestcases parameter để cập nhật status
            index: number;
            title: string;
            requirementId?: string;
            status: 'pending' | 'generating' | 'completed' | 'error';
            error?: string;
        }>
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
            shouldRefresh, // ✅ Thêm shouldRefresh flag
            committedTestcases, // ✅ Thêm committedTestcases để cập nhật status
            timestamp: new Date()
        };
        this.broadcastToProject(projectId, event);
        const errorInfo = errors && errors.length > 0 ? ` (Errors: ${errors.length})` : '';
        const stateInfo = agentState ? ` [${agentState}]` : '';
        const messageInfo = message ? ` - ${message}` : '';
        const refreshInfo = shouldRefresh ? ' [REFRESH]' : '';
        console.log(`📊 Broadcast testcase progress: ${progress}% - ${stage}${stateInfo}${batchInfo ? ` (Batch ${batchInfo.currentBatch}/${batchInfo.totalBatches})` : ''}${messageInfo}${errorInfo}${refreshInfo}`);
    }

    /**
     * ✅ MỚI: Emit completion event với flag refresh data
     */
    emitCompletion(
        projectId: string,
        versionId: string,
        userId: string,
        saveResult: {
            totalExpected: number;
            saved: number;
            repairedByLLM: number;
            skipped: number;
            failed: number;
        },
        message?: string
    ): void {
        const event: TestcaseProgressEvent = {
            type: 'TESTCASE_COMPLETED',
            projectId,
            versionId,
            userId,
            progress: 100,
            stage: 'completed',
            isProcessing: false,
            shouldRefresh: true, // ✅ Flag để frontend biết cần refresh data
            saveResult,
            message: message || `✅ Đã hoàn thành: ${saveResult.saved}/${saveResult.totalExpected} testcases đã lưu`,
            timestamp: new Date()
        };
        this.broadcastToProject(projectId, event);
        console.log(`✅ Broadcast testcase completion: ${saveResult.saved}/${saveResult.totalExpected} testcases saved. Frontend should refresh data.`);
    }
}

export const testcaseSocketService = new TestcaseSocketService();


