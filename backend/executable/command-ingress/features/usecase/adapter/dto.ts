// features/usecase/adapter/dto.ts
// Chỉ giữ interface, không dùng class-validator

export interface CreateUsecaseDto {
    name: string;
    role: string;
    goal: string;
    reason: string;
    tasks: string[];
    inputs: string[];
    outputs: string[];
    context: string;
    priority: "low" | "medium" | "high";
    feedback?: any;
    rules: string[];
    triggers: string[];
    preconditions: string[];
    postconditions: string[];
    exceptions: string[];
    stakeholders: string[];
    constraints: string[];
    related_usecases: string[];
}

export interface UpdateUsecaseDto extends Partial<CreateUsecaseDto> { }