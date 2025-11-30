# Kế hoạch xử lý lỗi sau Migration

## 🐛 Các lỗi phát sinh

### 1. ❌ Testcase Generation: "No matching requirements found"

**Nguyên nhân:**
- Frontend gửi `selectedRequirementIds` từ `RequirementSelectorModal` 
- `RequirementSelectorModal` map `requirement_id: String(usecase._id || usecase.id)`
- Backend nhận IDs nhưng có thể format không match (ObjectId string vs plain string)
- Backend filter logic có thể không match đúng

**Vị trí lỗi:**
- `backend/executable/command-ingress/features/testcase/domain/service.ts:47-69`
- `frontend/src/components/testcase/RequirementSelectorModal.vue:291,305`

**Giải pháp:**
1. ✅ Backend đã có `normalizeRequirementId()` nhưng cần cải thiện
2. ✅ Thêm logging chi tiết để debug
3. ✅ Normalize `selectedRequirementIds` từ frontend (convert tất cả sang string)
4. ✅ So sánh case-insensitive và loại bỏ whitespace

### 2. ❌ Activity Diagram: Nút generate không hoạt động

**Nguyên nhân:**
- Frontend gửi `requirementId` từ dropdown
- Dropdown options có thể dùng `_id` hoặc `id` cũ
- Backend tìm usecase nhưng có thể không match

**Vị trí lỗi:**
- `backend/executable/command-ingress/features/uml/activity_diagram/domain/service.ts:20-42`
- `frontend/src/views/UmlManagement.vue:541` (requirementId dropdown)
- `frontend/src/api/activity_diagram.js:5-6`

**Giải pháp:**
1. ✅ Backend đã có logic tìm bằng cả `_id` và `id` nhưng cần cải thiện
2. ✅ Đảm bảo frontend dropdown options dùng `_id` đúng cách
3. ✅ Thêm error handling và logging
4. ✅ Validate requirementId trước khi gọi API

### 3. ❌ Sequence Diagram: Nút generate không hoạt động

**Nguyên nhân:**
- Frontend gửi `usecaseId` từ dropdown
- Dropdown options có thể dùng `_id` hoặc `id` cũ
- Backend tìm usecase nhưng có thể không match

**Vị trí lỗi:**
- `backend/executable/command-ingress/features/uml/sequence.diagram/adapter/controller.ts:73-98`
- `frontend/src/views/UmlManagement.vue:511` (usecaseId dropdown)
- `frontend/src/api/sqd.js:13-17`

**Giải pháp:**
1. ✅ Backend đã có logic tìm bằng cả `_id` và `id` nhưng cần cải thiện
2. ✅ Đảm bảo frontend dropdown options dùng `_id` đúng cách
3. ✅ Thêm error handling và logging
4. ✅ Validate usecaseId trước khi gọi API

## 🔧 Chi tiết fix

### Fix 1: Testcase Service - Cải thiện ID matching

**File:** `backend/executable/command-ingress/features/testcase/domain/service.ts`

**Thay đổi:**
1. Cải thiện `normalizeRequirementId()` để handle ObjectId strings
2. Normalize `selectedRequirementIds` từ frontend
3. Thêm logging chi tiết
4. So sánh case-insensitive

### Fix 2: Activity Diagram - Cải thiện requirement lookup

**File:** `backend/executable/command-ingress/features/uml/activity_diagram/domain/service.ts`

**Thay đổi:**
1. Cải thiện logic tìm usecase (handle ObjectId string)
2. Thêm logging chi tiết
3. Return error message rõ ràng hơn

### Fix 3: Sequence Diagram - Cải thiện usecase lookup

**File:** `backend/executable/command-ingress/features/uml/sequence.diagram/adapter/controller.ts`

**Thay đổi:**
1. Cải thiện logic tìm usecase (handle ObjectId string)
2. Thêm logging chi tiết
3. Return error message rõ ràng hơn

### Fix 4: Frontend - Đảm bảo dropdown options dùng _id

**Files:**
- `frontend/src/views/UmlManagement.vue`
- `frontend/src/components/testcase/RequirementSelectorModal.vue`

**Thay đổi:**
1. Đảm bảo dropdown options dùng `getUsecaseId(uc)` hoặc `String(uc._id)`
2. Validate IDs trước khi gửi API
3. Thêm error handling cho API calls

## 📋 Checklist

- [ ] Fix testcase service ID matching
- [ ] Fix activity diagram requirement lookup
- [ ] Fix sequence diagram usecase lookup
- [ ] Update frontend dropdowns để dùng _id
- [ ] Thêm logging để debug
- [ ] Test tất cả flows
- [ ] Verify error messages rõ ràng
