# Fix: Null IDs trong Testcase Generation

## 🐛 Vấn đề

Frontend gửi `selectedRequirementIds: [ null ]` thay vì ID thực tế khi generate testcase.

**Error:**
```
selectedRequirementIds: [ null ],
normalizedSelectedIds: [ 'null' ],
```

## 🔍 Nguyên nhân

1. **RequirementSelectorModal** map requirements nhưng không set `id` field đúng cách
2. `applySelection()` dùng `req.id` nhưng field này có thể là `null` hoặc `undefined`
3. Backend không filter out null values trước khi normalize

## ✅ Đã fix

### 1. Frontend - RequirementSelectorModal.vue

**Thay đổi:**
- ✅ Thêm helper `getRequirementId()` để lấy ID từ `requirement_id`, `_id`, hoặc `id`
- ✅ Fix `applySelection()` để:
  - Dùng `getRequirementId()` thay vì `req.id`
  - Filter out null/undefined/empty values
  - Validate có ít nhất 1 requirement được chọn
- ✅ Fix `isRequirementSelected()`, `toggleRequirement()`, `removeRequirement()` để dùng `getRequirementId()`
- ✅ Fix mapping trong `loadRequirements()` để set cả `id` và `requirement_id` fields
- ✅ Fix search filter để handle cả `requirement_id` và `id`

### 2. Backend - testcase/domain/service.ts

**Thay đổi:**
- ✅ Filter out null/undefined/empty values trước khi normalize
- ✅ Filter out 'null' và 'undefined' strings
- ✅ Thêm validation để đảm bảo có ít nhất 1 valid ID
- ✅ Cải thiện error messages

## 📋 Testing

Cần test:
1. ✅ Select requirements trong modal
2. ✅ Apply selection và verify IDs được gửi đúng
3. ✅ Generate testcase với selected requirements
4. ✅ Verify không còn null values trong selectedRequirementIds

## 🚀 Next Steps

1. Test lại flow generate testcase
2. Verify console logs để đảm bảo IDs đúng format
3. Monitor để catch edge cases

