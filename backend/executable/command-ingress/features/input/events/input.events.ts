// features/input/domain/events/input.events.ts
export interface InputEventData {
    projectId: string;
    versionId: string;
    userId: string;
    timestamp: Date;
}

export interface InputCreatedEvent extends InputEventData {
    type: 'INPUT_CREATED';
    input: any;
}

export interface InputDeletedEvent extends InputEventData {
    type: 'INPUT_DELETED';
    inputId: string;
}

export interface InputsUpdatedEvent extends InputEventData {
    type: 'INPUTS_UPDATED';
    unprocessedCount: number;
}


export interface InputsReloadEvent extends InputEventData {
    type: 'INPUTS_RELOAD';
    inputs: any[];
}

export interface IncrementalProgressEvent extends InputEventData {
    type: 'INCREMENTAL_PROGRESS';
    progress: number;
    stage: string;
    isProcessing: boolean;
    batchInfo?: {
        currentBatch: number;
        totalBatches: number;
        usecasesInBatch: number;
        savedCount?: number; // ✅ Tổng số usecases đã save
        totalCount?: number; // ✅ Tổng số usecases cần generate
    };
    errors?: string[]; // ✅ Thêm errors field để frontend có thể detect failed state
    errorMessage?: string; // ✅ Thêm errorMessage cho compatibility
    agentState?: string; // ✅ Agent state: ESTIMATE_USECASE_COUNT, BATCH_PLANNING, GENERATE_BATCH, VERIFY_RESULTS, REPLAN_MISSING, GENERATE_RETRY
    message?: string; // ✅ Human-readable message từ agent
    committedUsecases?: Array<{ // ✅ Danh sách usecases đã cam kết
        index: number;
        key: string;
        name: string;
        status: 'pending' | 'generating' | 'completed' | 'error';
        error?: string;
    }>;
    shouldRefresh?: boolean; // ✅ Flag để frontend biết cần refresh data
}

export interface EstimateReceivedEvent extends InputEventData {
    type: 'ESTIMATE_RECEIVED';
    estimate: {
        estimated_count: number;
        summary: string;
        estimated_batches: number;
        reasoning?: string;
    };
    committedUsecases?: Array<{ // ✅ Danh sách usecases đã cam kết
        index: number;
        key: string;
        name: string;
        status: 'pending' | 'generating' | 'completed' | 'error';
        error?: string;
    }>;
}

export interface InputsAddedSummaryEvent extends InputEventData {
    type: 'INPUTS_ADDED_SUMMARY';
    newInputsCount: number;
    totalInputs: number;
    unprocessedCount: number;
}

export interface InputDeletedSummaryEvent extends InputEventData {
    type: 'INPUT_DELETED_SUMMARY';
    deletedInputId: string;
    totalInputs: number;
    unprocessedCount: number;
}

export type InputEvent =
    | InputCreatedEvent
    | InputDeletedEvent
    | InputsReloadEvent
    | InputsUpdatedEvent
    | IncrementalProgressEvent
    | InputsAddedSummaryEvent
    | InputDeletedSummaryEvent
    | EstimateReceivedEvent;