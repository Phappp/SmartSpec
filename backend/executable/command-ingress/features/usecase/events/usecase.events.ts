// features/usecase/domain/events/usecase.events.ts
export interface UsecaseEventData {
    projectId: string;
    versionId: string;
    userId: string;
    timestamp: Date;
}

export interface UsecaseCreatedEvent extends UsecaseEventData {
    type: 'USECASE_CREATED';
    usecase: any;
}

export interface UsecaseUpdatedEvent extends UsecaseEventData {
    type: 'USECASE_UPDATED';
    usecase: any;
    previousData?: any;
}

export interface UsecaseDeletedEvent extends UsecaseEventData {
    type: 'USECASE_DELETED';
    usecaseId: string;
}

export interface UsecasesReloadEvent extends UsecaseEventData {
    type: 'USECASES_RELOAD';
    usecases: any[];
}

export type UsecaseEvent =
    | UsecaseCreatedEvent
    | UsecaseUpdatedEvent
    | UsecaseDeletedEvent
    | UsecasesReloadEvent;