# Agent Orchestrator cho Usecase Generation

## 📋 Tổng quan

Orchestrator đã được agent hóa với state machine để quản lý luồng generate usecases một cách tự động và có khả năng retry khi có missing/invalid usecases.

## 🔄 Luồng State Machine

```
[START]
  ↓
ESTIMATE_USECASE_COUNT
  ↓
BATCH_PLANNING
  ↓
GENERATE_BATCH (loop cho đến hết batches)
  ↓
VERIFY_RESULTS
  ↓
HAS_MISSING_OR_BAD?
   ├─ NO → DONE
   └─ YES
        ↓
    REPLAN_MISSING
        ↓
    GENERATE_RETRY (loop cho đến hết retry batches)
        ↓
    VERIFY_RESULTS (loop lại)
```

## 🎯 Các State

### 1. ESTIMATE_USECASE_COUNT
- **Mục đích**: Ước tính số lượng usecase từ text
- **Action**: Gọi LLM để estimate số lượng usecases
- **Output**: `estimatedCount`, `estimatedBatches`, `summary`
- **Next State**: `BATCH_PLANNING`

### 2. BATCH_PLANNING
- **Mục đích**: Lập kế hoạch chia batch dựa trên estimate
- **Action**: Tính toán số batch và offset cho mỗi batch
- **Output**: `batchPlan[]` với thông tin từng batch
- **Next State**: `GENERATE_BATCH`

### 3. GENERATE_BATCH
- **Mục đích**: Generate batch hiện tại
- **Action**: 
  - Generate usecases cho batch hiện tại
  - Normalize và save vào database
  - Tăng `currentBatchIndex`
- **Next State**: 
  - Nếu còn batches → giữ nguyên `GENERATE_BATCH` (loop)
  - Nếu hết batches → `VERIFY_RESULTS`

### 4. VERIFY_RESULTS
- **Mục đích**: Kiểm tra kết quả sau khi generate tất cả batches
- **Action**:
  - Đếm số usecases đã generate vs expected
  - Validate từng usecase đã lưu
  - Xác định missing/invalid usecases
- **Next State**:
  - Nếu không có missing/invalid → `DONE`
  - Nếu có missing/invalid và chưa đạt max retry → `REPLAN_MISSING`
  - Nếu đạt max retry → `DONE` (với warnings)

### 5. REPLAN_MISSING
- **Mục đích**: Lập kế hoạch lại cho các usecases còn thiếu
- **Action**: Tạo batch plan mới cho retry với số lượng = missing + invalid
- **Output**: `retryPlan[]`
- **Next State**: `GENERATE_RETRY`

### 6. GENERATE_RETRY
- **Mục đích**: Generate lại các usecases còn thiếu/invalid
- **Action**:
  - Generate với prompt đặc biệt chứa thông tin về missing/invalid
  - Normalize và save vào database
  - Tăng `currentRetryBatchIndex`
- **Next State**:
  - Nếu còn retry batches → giữ nguyên `GENERATE_RETRY` (loop)
  - Nếu hết retry batches → `VERIFY_RESULTS` (để verify lại)

### 7. DONE
- **Mục đích**: Hoàn thành quá trình
- **Action**: Return kết quả cuối cùng

## 🔧 Cấu trúc Code

### UsecaseGenerationAgent
File: `domain/UsecaseGenerationAgent.ts`

**Main Method**:
- `run()`: Chạy agent theo state machine

**State Methods**:
- `estimateUsecaseCount()`: State ESTIMATE_USECASE_COUNT
- `batchPlanning()`: State BATCH_PLANNING
- `generateBatch()`: State GENERATE_BATCH
- `verifyResults()`: State VERIFY_RESULTS
- `replanMissing()`: State REPLAN_MISSING
- `generateRetry()`: State GENERATE_RETRY

**Helper Methods**:
- `saveBatch()`: Save batch usecases vào database
- `performVerification()`: Verify kết quả
- `buildRetryPrompt()`: Tạo prompt cho retry
- `normalizeRoleStructure()`: Normalize role structure

### RequirementService
File: `domain/RequirementService.ts`

**Refactored Method**:
- `finalize()`: Sử dụng `UsecaseGenerationAgent` thay vì logic cũ

## 📊 AgentContext

```typescript
interface AgentContext {
    versionId: string;
    mergedText: string;
    language: string;
    mode: "full" | "incremental";
    modelName?: string;
    userId?: string;
    projectId?: string;
    
    // Estimate results
    estimatedCount?: number;
    estimatedBatches?: number;
    summary?: string;
    
    // Batch planning
    batchPlan?: BatchPlan[];
    currentBatchIndex?: number;
    
    // Generation results
    generatedUsecases?: any[];
    savedUsecases?: any[];
    
    // Verification results
    missingCount?: number;
    invalidUsecases?: InvalidUsecase[];
    
    // Retry tracking
    retryAttempts?: number;
    maxRetryAttempts?: number;
}
```

## 🔄 Retry Logic

1. **Max Retry Attempts**: Mặc định 3 lần
2. **Retry Trigger**: Khi có missing hoặc invalid usecases sau verify
3. **Retry Process**:
   - Tạo batch plan mới cho missing/invalid usecases
   - Generate với prompt đặc biệt
   - Verify lại sau khi retry
   - Loop cho đến khi không còn missing/invalid hoặc đạt max retry

## ✅ Verification Logic

Verification kiểm tra:
1. **Missing Count**: `expectedCount - actualCount`
2. **Invalid Usecases**: Validate từng usecase đã lưu:
   - Missing name
   - Invalid role
   - Missing goal
   - Missing tasks

**Effective Missing Count** = `missingCount + invalidUsecases.length`

## 🚀 Usage

```typescript
const agentContext: AgentContext = {
    versionId,
    mergedText,
    language,
    mode,
    modelName,
    userId,
    projectId
};

const agent = new UsecaseGenerationAgent(gemini, agentContext);
const result = await agent.run();
```

## 📝 Notes

- Agent tự động quản lý state transitions
- Retry logic đảm bảo không bỏ sót usecases
- Verification sau mỗi lần generate đảm bảo chất lượng
- Max retry attempts tránh infinite loop

