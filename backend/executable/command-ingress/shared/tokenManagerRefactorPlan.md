# Kế hoạch Refactor: Thêm Token Management cho Testcase, UML, Database

## Mục tiêu

Refactor các features testcase, uml, database để:
- ✅ Dùng tokenManager thay vì truyền text trực tiếp
- ✅ Estimate tokens trước khi gọi LLM
- ✅ Log token analysis để debug
- ✅ Xử lý text quá dài (chunking nếu cần)

## Cách Orchestrator làm (Reference)

### 1. Import tokenManager
```typescript
const { getModelConfig, estimateTokens, determineStrategy, logTokenInfo } = await import("../../../shared/tokenManager");
```

### 2. Lấy model config
```typescript
const modelConfig = getModelConfig(modelName, 'gemini');
```

### 3. Estimate tokens và determine strategy
```typescript
const estimatedTokens = estimateTokens(cleanText, modelConfig);
const strategy = determineStrategy(cleanText, modelConfig);
```

### 4. Log token info
```typescript
logTokenInfo(cleanText, modelConfig, context);
```

## Các features cần refactor

### 1. Testcase (`features/testcase/domain/GeminiService.ts`)
- Method: `generateTestCases`
- Method: `generateMixedTestCases`
- Cần: Thêm token analysis trước khi gọi LLM

### 2. UML Usecase Diagram (`features/uml/usecase.diagram/domain/GeminiService.ts`)
- Method: `generateUsecaseDiagram`
- Method: `generateJsonContent`
- Cần: Thêm token analysis

### 3. UML Sequence Diagram (`features/uml/sequence.diagram/domain/GeminiService.ts`)
- Method: `generateSequenceDiagram`
- Method: `generateJsonContent`
- Cần: Thêm token analysis

### 4. UML Activity Diagram (`features/uml/activity_diagram/domain/ActivityGeminiService.ts`)
- Method: `generateFromUseCase`
- Method: `generateFromActor`
- Cần: Thêm token analysis

### 5. Database (`features/database/domain/GeminiService.ts`)
- Method: `generateDatabaseSchema`
- Method: `generateDatabaseSchemaBatch`
- Method: `generateJsonContent`
- Cần: Thêm token analysis

## Implementation Plan

1. ✅ Import tokenManager vào mỗi GeminiService
2. ✅ Thêm token analysis trước khi gọi LLM
3. ✅ Log token info để debug
4. ✅ Xử lý text quá dài (nếu cần)

