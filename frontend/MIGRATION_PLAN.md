# Kế hoạch Migration Frontend: requirement_model → usecases Collection

## 📋 Tổng quan
Backend đã chuyển từ `requirement_model` (embedded trong version) sang collection `usecases` độc lập. Frontend cần cập nhật để:
1. Bỏ dependency vào `version.requirement_model`
2. Sử dụng API `getUsecases(versionId)` thay vì lấy từ version object
3. Thay `uc.id` → `uc._id` hoặc `String(uc._id)` ở tất cả nơi
4. Cập nhật mapping và display logic

## 🎯 Các file cần cập nhật

### 1. **API Layer** ✅ (Đã đúng)
- `api/project.js`: `usecaseApi` đã đúng, không cần sửa

### 2. **Views**
- [ ] `views/UsecaseManagement.vue`
  - Line 799: `this.currentVersionDetails.requirement_model` → Gọi `fetchUseCases()` thay vì
  - Đảm bảo `fetchUseCases()` được gọi sau khi có `selectedVersionId`
  
- [ ] `views/TestcaseManagement.vue`
  - Line 817: Đã dùng `usecaseApi.getUsecases()` ✅
  - Kiểm tra mapping `requirement_id` từ `_id`

### 3. **Components - Usecase**
- [ ] `components/usecase/UseCaseMainContent.vue`
  - Line 129, 131, 133, 135, 162: `uc.id` → `String(uc._id)`
  - Line 460, 507, 547, 642: Tất cả references đến `uc.id` → `String(uc._id)`
  
- [ ] `components/usecase/AddEditUseCaseModal.vue`
  - Line 466, 467, 469, 472: `usecase.id` → `String(usecase._id)`
  - Line 1020, 1021, 1025, 1027: `usecaseId` comparisons với `_id`
  - Kiểm tra form data khi submit: đảm bảo không gửi `id` field nếu không cần
  
- [ ] `components/usecase/HandleConflict.vue`
  - Line 94, 96, 97, 100, 103, 106, 112: `useCase.id` → `String(useCase._id)`
  
- [ ] `components/usecase/ConflictDetailModal.vue`
  - Tìm và thay tất cả `id` → `_id`
  
- [ ] `components/usecase/UsecaseSpecDocExport.vue`
  - Line 466, 475, 652, 663: `uc.id` → `String(uc._id)`

### 4. **Components - Testcase**
- [ ] `components/testcase/RequirementSelectorModal.vue`
  - Line 291, 305: `requirement_id: usecase.id` → `requirement_id: String(usecase._id)`
  - Đảm bảo mapping đúng với backend

### 5. **Components - Other**
- [ ] `components/PreviewModal.vue`
  - Kiểm tra xem có dùng `requirement_model` không
  
- [ ] `components/ChangeFieldDisplay.vue`
  - Kiểm tra xem có dùng `requirement_model` không
  
- [ ] `components/ProjectCard.vue`
  - Kiểm tra xem có dùng `requirement_model` không

### 6. **Utils**
- [ ] `utils/usecaseFormatter.js`
  - Kiểm tra xem có dùng `id` field không (có thể không cần sửa nếu chỉ format display)

## 🔧 Chiến lược cập nhật

### Pattern 1: Thay `uc.id` → `String(uc._id)`
```javascript
// Before
const id = uc.id
:key="uc.id"
UC-{{ uc.id }}

// After
const id = String(uc._id)
:key="String(uc._id)"
UC-{{ String(uc._id) }}
```

### Pattern 2: Thay `version.requirement_model` → API call
```javascript
// Before
this.useCases = this.currentVersionDetails?.requirement_model || []

// After
async fetchUseCases() {
  if (!this.selectedVersionId) return
  const response = await usecaseApi.getUsecases(this.selectedVersionId)
  this.useCases = response.data.data || []
}
```

### Pattern 3: Mapping trong RequirementSelectorModal
```javascript
// Before
requirement_id: usecase.id

// After
requirement_id: String(usecase._id)
```

## ⚠️ Lưu ý quan trọng

1. **Backward Compatibility**: Một số nơi có thể vẫn nhận được `id` từ backend (nếu chưa migrate), nên cần xử lý cả 2 trường hợp:
   ```javascript
   const usecaseId = String(uc._id || uc.id || '')
   ```

2. **API Response Structure**: Đảm bảo xử lý đúng response structure:
   ```javascript
   const usecases = response.data.data || response.data || []
   ```

3. **Conflict Resolution**: Conflict items giờ là array of ObjectId, cần convert sang string khi so sánh

4. **Related Usecases**: `related_usecases` giờ là array of ObjectId, cần convert khi hiển thị

## ✅ Checklist

- [ ] Tất cả views đã dùng API `getUsecases()` thay vì `requirement_model`
- [ ] Tất cả `uc.id` đã được thay bằng `String(uc._id)`
- [ ] Form submissions không gửi `id` field không cần thiết
- [ ] Conflict resolution hoạt động với ObjectId
- [ ] Test tất cả CRUD operations
- [ ] Test conflict resolution flow
- [ ] Test requirement selector trong testcase
- [ ] Verify không có lỗi console

