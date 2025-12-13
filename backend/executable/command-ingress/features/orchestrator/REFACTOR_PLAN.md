# Kế hoạch Refactor: Estimate → Generate → Batch Save Usecases

## 📋 Tổng quan

Refactor luồng xử lý input để:
1. Gửi **toàn bộ** inputs có `is_processed = false` cho LLM
2. LLM **estimate** số lượng usecase trước (ví dụ: 94 usecases)
3. Hiển thị estimate cho người dùng
4. Generate và lưu usecases theo batch 50 usecases/lần
5. Mỗi usecase ~400-500 tokens

---

## 🎯 Luồng mới

```
1. User click "Start Incremental Analysis"
   ↓
2. Backend: Lấy TẤT CẢ inputs có is_processed = false
   ↓
3. Gửi toàn bộ text cho LLM → ESTIMATE phase
   ↓
4. LLM trả về: { estimated_count: 94, summary: "..." }
   ↓
5. Broadcast estimate lên frontend → Hiển thị cho user
   ↓
6. Bắt đầu GENERATE phase:
   - Generate batch 1: usecases 1-50
   - Save batch 1 → Broadcast progress
   - Generate batch 2: usecases 51-100
   - Save batch 2 → Broadcast progress
   - ...
   ↓
7. Hoàn thành → Mark inputs as processed
```

---

## 📝 Chi tiết triển khai

### Phase 1: Backend - Estimate Phase

#### 1.1. Tạo prompt mới cho Estimate
**File**: `domain/GeminiService.ts`

```typescript
estimateUseCasesCount: (text: string) => `
Bạn là một chuyên gia phân tích yêu cầu phần mềm.

NHIỆM VỤ: Đọc toàn bộ văn bản dưới đây và ước tính số lượng use case sẽ được tạo ra.

YÊU CẦU:
- Phân tích toàn bộ văn bản
- Đếm số lượng chức năng/phân hệ có thể tạo use case
- Ước tính số lượng use case sẽ được generate

TRẢ VỀ JSON:
{
  "estimated_count": 94,
  "summary": "Hệ thống quản lý với 5 module chính: User, Order, Product, Payment, Report",
  "estimated_batches": 2,
  "reasoning": "Dựa trên số lượng chức năng và độ phức tạp..."
}

QUAN TRỌNG:
- Chỉ trả về JSON, không có markdown
- estimated_count phải là số nguyên dương
- estimated_batches = Math.ceil(estimated_count / 50)
`
```

#### 1.2. Tạo method estimateUseCasesCount
**File**: `domain/GeminiService.ts`

```typescript
async estimateUseCasesCount(
    text: string,
    language: string = 'vi-VN',
    modelName?: string
): Promise<{
    estimated_count: number;
    summary: string;
    estimated_batches: number;
    reasoning?: string;
}> {
    // Implementation
}
```

#### 1.3. Tạo method generateUseCasesBatch
**File**: `domain/GeminiService.ts`

```typescript
async generateUseCasesBatch(
    text: string,
    batchNumber: number,
    totalBatches: number,
    offset: number, // usecase số bao nhiêu bắt đầu
    batchSize: number = 50,
    language: string = 'vi-VN',
    modelName?: string
): Promise<any[]> {
    // Generate batch usecases với offset và batchSize
    // Mỗi usecase ~400-500 tokens
}
```

---

### Phase 2: Backend - Refactor RequirementService

#### 2.1. Thêm method estimatePhase
**File**: `domain/RequirementService.ts`

```typescript
async estimatePhase(
    inputs: any[],
    gemini: GeminiService,
    language: string,
    modelName?: string,
    userId?: string,
    projectId?: string,
    versionId?: string
): Promise<{
    estimated_count: number;
    summary: string;
    estimated_batches: number;
    reasoning?: string;
}> {
    // 1. Merge tất cả inputs có is_processed = false
    // 2. Gọi gemini.estimateUseCasesCount()
    // 3. Broadcast estimate lên frontend
    // 4. Return estimate result
}
```

#### 2.2. Thêm method generateAndSaveBatches
**File**: `domain/RequirementService.ts`

```typescript
async generateAndSaveBatches(
    versionId: string,
    inputs: any[],
    estimatedCount: number,
    estimatedBatches: number,
    gemini: GeminiService,
    language: string,
    modelName?: string,
    userId?: string,
    projectId?: string,
    mode: "full" | "incremental" = "incremental"
): Promise<{
    version_id: string;
    usecases: any[];
    totalGenerated: number;
}> {
    // 1. Loop qua từng batch (1 → estimatedBatches)
    // 2. Mỗi batch:
    //    - Generate 50 usecases
    //    - Save batch vào DB
    //    - Broadcast progress
    // 3. Return final result
}
```

#### 2.3. Refactor method finalize
**File**: `domain/RequirementService.ts`

```typescript
async finalize(
    versionId: string,
    mode: "full" | "incremental",
    inputs: any[],
    gemini: GeminiService,
    language: string,
    modelName?: string,
    userId?: string,
    projectId?: string
) {
    // 1. ESTIMATE PHASE
    const estimate = await this.estimatePhase(
        inputs, gemini, language, modelName, userId, projectId, versionId
    );
    
    // 2. GENERATE & SAVE PHASE
    const result = await this.generateAndSaveBatches(
        versionId, inputs, 
        estimate.estimated_count, 
        estimate.estimated_batches,
        gemini, language, modelName, userId, projectId, mode
    );
    
    return result;
}
```

---

### Phase 3: Backend - Socket Events

#### 3.1. Thêm event ESTIMATE_RECEIVED
**File**: `features/input/domain/input.socket.service.ts`

```typescript
emitEstimateReceived(
    projectId: string,
    versionId: string,
    userId: string,
    estimate: {
        estimated_count: number;
        summary: string;
        estimated_batches: number;
    }
) {
    // Emit event để frontend hiển thị estimate
}
```

#### 3.2. Cập nhật event INCREMENTAL_PROGRESS
**File**: `features/input/domain/input.socket.service.ts`

```typescript
emitIncrementalProgress(
    projectId: string,
    versionId: string,
    userId: string,
    progress: number,
    stage: "estimating" | "generating" | "saving" | "completed",
    isProcessing: boolean,
    batchInfo?: {
        currentBatch: number;
        totalBatches: number;
        usecasesInBatch: number;
    }
) {
    // Cập nhật để hỗ trợ batch info
}
```

---

### Phase 4: Frontend - UI Updates

#### 4.1. Thêm state cho estimate
**File**: `frontend/src/views/UsecaseManagement.vue`

```javascript
data() {
    return {
        // ... existing states
        estimateInfo: {
            estimated_count: 0,
            summary: '',
            estimated_batches: 0,
            isEstimating: false
        },
        batchProgress: {
            currentBatch: 0,
            totalBatches: 0,
            usecasesInBatch: 0
        }
    }
}
```

#### 4.2. Xử lý socket event ESTIMATE_RECEIVED
**File**: `frontend/src/views/UsecaseManagement.vue`

```javascript
handleEstimateReceived(event) {
    this.estimateInfo = {
        estimated_count: event.estimate.estimated_count,
        summary: event.estimate.summary,
        estimated_batches: event.estimate.estimated_batches,
        isEstimating: false
    }
    // Hiển thị modal hoặc notification với estimate
}
```

#### 4.3. Cập nhật handleIncrementalProgress
**File**: `frontend/src/views/UsecaseManagement.vue`

```javascript
handleIncrementalProgress(event) {
    // Cập nhật progress bar
    // Cập nhật batch info nếu có
    if (event.batchInfo) {
        this.batchProgress = event.batchInfo
    }
}
```

#### 4.4. Thêm UI component hiển thị estimate
**File**: `frontend/src/components/usecase/EstimateModal.vue` (NEW)

```vue
<template>
  <div class="estimate-modal">
    <h3>📊 Estimate Usecases</h3>
    <p><strong>{{ estimateInfo.estimated_count }}</strong> usecases sẽ được tạo</p>
    <p>{{ estimateInfo.summary }}</p>
    <p>Sẽ được chia thành <strong>{{ estimateInfo.estimated_batches }}</strong> batch(es)</p>
  </div>
</template>
```

---

## 🔧 Implementation Steps

### Step 1: Backend - GeminiService
- [ ] Thêm prompt `estimateUseCasesCount` vào `GeminiService.ts`
- [ ] Implement method `estimateUseCasesCount()`
- [ ] Implement method `generateUseCasesBatch()` với batch size 50

### Step 2: Backend - RequirementService
- [ ] Tạo method `estimatePhase()`
- [ ] Tạo method `generateAndSaveBatches()`
- [ ] Refactor method `finalize()` để sử dụng estimate → generate flow

### Step 3: Backend - Socket Service
- [ ] Thêm event `ESTIMATE_RECEIVED`
- [ ] Cập nhật `INCREMENTAL_PROGRESS` với batch info

### Step 4: Frontend - Vue Component
- [ ] Thêm state cho estimate và batch progress
- [ ] Xử lý socket event `ESTIMATE_RECEIVED`
- [ ] Cập nhật `handleIncrementalProgress()` với batch info
- [ ] Tạo component `EstimateModal.vue` (optional)

### Step 5: Testing
- [ ] Test với 10-20 inputs
- [ ] Test với 50+ inputs (nhiều batches)
- [ ] Test error handling
- [ ] Test realtime updates

---

## 📊 Token Calculation

### Estimate Phase
- Input: Toàn bộ text từ inputs (có thể rất lớn)
- Output: JSON nhỏ (~100 tokens)
- **Strategy**: Có thể cần chunking nếu text quá lớn

### Generate Phase
- Input: Toàn bộ text + context từ estimate
- Output: 50 usecases × 450 tokens = ~22,500 tokens/batch
- **Strategy**: 
  - Nếu text < context window → gửi toàn bộ
  - Nếu text > context window → chunking thông minh

---

## ⚠️ Lưu ý

1. **Token Limits**: 
   - Gemini 2.0 Flash: 1M context window
   - Mỗi batch generate 50 usecases ~22.5K tokens output
   - Cần đảm bảo input + output < context window

2. **Error Handling**:
   - Nếu estimate fail → fallback về flow cũ
   - Nếu generate batch fail → retry batch đó
   - Nếu một số batch fail → partial success

3. **Performance**:
   - Estimate phase: 1 LLM call
   - Generate phase: N batch calls (N = estimated_batches)
   - Tổng thời gian: Estimate + (N × Generate time)

4. **Backward Compatibility**:
   - Giữ flow cũ làm fallback
   - Có thể toggle giữa flow mới/cũ qua config

---

## 🎯 Success Criteria

- [ ] Estimate chính xác ±10% số usecase thực tế
- [ ] Generate và save đúng 50 usecases/batch
- [ ] Frontend hiển thị estimate và progress realtime
- [ ] Không có memory leak khi xử lý nhiều batches
- [ ] Error handling đầy đủ

