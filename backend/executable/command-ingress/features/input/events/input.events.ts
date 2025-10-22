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
    | InputDeletedSummaryEvent;