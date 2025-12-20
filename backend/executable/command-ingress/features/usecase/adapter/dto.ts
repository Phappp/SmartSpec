// features/usecase/adapter/dto.ts
// Chỉ giữ interface, không dùng class-validator

export interface ActorDto {
    id?: string;
    name: string;
    description?: string;
}

export interface ContextDto {
    module?: string;
    scope?: string;
    system?: string;
}

export interface TriggerDto {
    event: string;
    source?: string;
}

export interface MainFlowStepDto {
    step: number;
    actor: string;
    action: string;
    inputs?: string[];
    rules_applied?: string[];
    expected_result: string;
}

export interface AlternativeFlowDto {
    id: string;
    at_step: number;
    condition: string;
    system_response: string;
    end_state: string;
}

export interface ExceptionDto {
    id: string;
    at_step: number;
    type: string;
    description: string;
    system_response: string;
}

export interface RuleDto {
    id: string;
    description: string;
}

export interface InputOutputDto {
    name: string;
    type: string;
    required?: boolean;
    optional?: boolean;
}

export interface CreateUsecaseDto {
    type?: "use_case" | "epic" | "feature";
    level?: "system" | "module" | "component";
    status?: "active" | "inactive" | "deprecated";
    name: string;
    description: string;
    actor: ActorDto;
    goal: string;
    business_reason: string;
    context?: ContextDto;
    priority: "low" | "medium" | "high";
    frequency?: "low" | "medium" | "high";
    trigger: TriggerDto;
    preconditions?: string[];
    main_flow: MainFlowStepDto[];
    alternative_flows?: AlternativeFlowDto[];
    exceptions?: ExceptionDto[];
    postconditions?: string[];
    rules?: RuleDto[];
    inputs?: InputOutputDto[];
    outputs?: InputOutputDto[];
    non_functional_constraints?: string[];
    stakeholders?: string[];
    related_usecases?: string[];
}

export interface UpdateUsecaseDto extends Partial<CreateUsecaseDto> { }
