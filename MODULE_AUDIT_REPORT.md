# Báo cáo kiểm tra các module - Hỗ trợ OpenRouter

## ✅ Đã hoàn thành

### 1. Core Infrastructure
- ✅ **LLMService Wrapper** (`backend/executable/command-ingress/shared/LLMService.ts`)
  - Hỗ trợ Gemini, OpenRouter, OpenAI, Claude
  - Tự động detect provider từ modelName
  - Tự động validate FREE mode
  - Error handling và retry logic
  - Logging đầy đủ

- ✅ **ApiKeyService** (`backend/executable/command-ingress/features/orchestrator/domain/ApiKeyService.ts`)
  - Đã cập nhật Provider type để hỗ trợ tất cả providers mới
  - Bao gồm: gemini, openai, claude, nous, qwen, deepseek, mistral, meta, allenai, google, amazon, nvidia, kwaipilot, openrouter

- ✅ **tokenManager** (`backend/executable/command-ingress/shared/tokenManager.ts`)
  - Đã có MODEL_CONFIGS với 11 FREE models
  - Đã có validation FREE mode
  - Đã có getModelConfig() với auto-detect provider

## 📋 Các module cần cập nhật

### 🔴 Module: database
**File**: `backend/executable/command-ingress/features/database/domain/GeminiService.ts`
**Status**: ⚠️ Cần cập nhật
**Method**: `generateJsonContent()` (line 1671)
**Hiện tại**: Gọi trực tiếp Gemini API
**Cần làm**:
1. Import LLMService
2. Thay thế logic gọi Gemini API bằng `llmService.callLLM()`
3. Giữ nguyên error handling logic (có ApiKeyError handling phức tạp)

**Code pattern cần thay**:
```typescript
// TRƯỚC
const { GoogleGenerativeAI } = await import("@google/generative-ai");
const client = new GoogleGenerativeAI(k.key_value);
const model = client.getGenerativeModel({ model: modelName });
const resp = await model.generateContent({...});

// SAU
import { LLMService } from "../../../shared/LLMService";
const llmService = new LLMService();
const response = await llmService.callLLM({
    prompt: prompt,
    modelName: k.model_name || 'gemini-2.0-flash-001',
    provider: 'gemini',
    userId: userId,
    projectId: projectId,
    endpoint: 'generateDatabase',
});
const text = response.text;
```

---

### 🔴 Module: orchestrator
**File**: `backend/executable/command-ingress/features/orchestrator/domain/GeminiService.ts`
**Status**: ⚠️ Cần cập nhật
**Methods cần cập nhật**:
- `analyzeRequirementsSingleCall()` (line ~1169)
- `analyzeRequirementsBatchCall()` (line ~1270)
- Tất cả methods gọi `GoogleGenerativeAI`

**Cần làm**: Tương tự database module

---

### 🔴 Module: testcase
**File**: `backend/executable/command-ingress/features/testcase/domain/GeminiService.ts`
**Status**: ⚠️ Cần cập nhật
**Method**: `callGeminiAPI()` (line 961)
**Cần làm**: Thay thế bằng LLMService

---

### 🔴 Module: uml/usecase.diagram
**File**: `backend/executable/command-ingress/features/uml/usecase.diagram/domain/GeminiService.ts`
**Status**: ⚠️ Cần cập nhật
**Methods**: Tất cả methods gọi Gemini API
**Cần làm**: Thay thế bằng LLMService

---

### 🔴 Module: uml/sequence.diagram
**File**: `backend/executable/command-ingress/features/uml/sequence.diagram/domain/GeminiService.ts`
**Status**: ⚠️ Cần cập nhật
**Method**: `generateJsonContent()` (line ~648)
**Cần làm**: Thay thế bằng LLMService

---

### 🔴 Module: uml/activity_diagram
**File**: `backend/executable/command-ingress/features/uml/activity_diagram/domain/ActivityGeminiService.ts`
**Status**: ⚠️ Cần cập nhật
**Method**: `callGemini()` (line ~66)
**Cần làm**: Thay thế bằng LLMService

---

### ✅ Module: handle_audio
**File**: `backend/executable/command-ingress/features/handle_audio/domain/service.ts`
**Status**: ✅ Không cần cập nhật
**Lý do**: Không gọi LLM API trực tiếp, chỉ gọi `refineInputById()` (đã được xử lý ở module khác)

---

### ✅ Module: handle_image
**File**: `backend/executable/command-ingress/features/handle_image/domain/service.ts`
**Status**: ✅ Không cần cập nhật
**Lý do**: Không gọi LLM API trực tiếp, chỉ gọi `refineInputById()` (đã được xử lý ở module khác)

---

## 📊 Tổng kết

| Module | Status | Priority | Estimated Effort |
|--------|--------|----------|------------------|
| database | ⚠️ Cần cập nhật | High | 2-3 hours |
| orchestrator | ⚠️ Cần cập nhật | Critical | 3-4 hours |
| testcase | ⚠️ Cần cập nhật | High | 1-2 hours |
| uml/usecase.diagram | ⚠️ Cần cập nhật | Medium | 1-2 hours |
| uml/sequence.diagram | ⚠️ Cần cập nhật | Medium | 1-2 hours |
| uml/activity_diagram | ⚠️ Cần cập nhật | Medium | 1 hour |
| handle_audio | ✅ OK | - | - |
| handle_image | ✅ OK | - | - |

**Tổng cộng**: 6 modules cần cập nhật, ~10-15 hours effort

## 🔄 Migration Strategy

### Phase 1: Core Modules (Priority)
1. ✅ orchestrator (Critical - ảnh hưởng toàn bộ hệ thống)
2. ✅ database (High - sử dụng nhiều)
3. ✅ testcase (High - sử dụng nhiều)

### Phase 2: UML Modules
4. ✅ uml/usecase.diagram
5. ✅ uml/sequence.diagram
6. ✅ uml/activity_diagram

### Testing Strategy
1. Test với Gemini API key (backward compatibility)
2. Test với OpenRouter key + FREE models
3. Test FREE mode validation
4. Test error handling và retry logic

## 🚀 Next Steps

1. Cập nhật từng module theo pattern trong MODULE_UPDATE_SUMMARY.md
2. Test từng module sau khi cập nhật
3. Update documentation
4. Deploy và monitor

