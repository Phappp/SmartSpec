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

export interface InputsReloadEvent extends InputEventData {
    type: 'INPUTS_RELOAD';
    inputs: any[];
}

export type InputEvent = 
    | InputCreatedEvent
    | InputDeletedEvent
    | InputsReloadEvent;