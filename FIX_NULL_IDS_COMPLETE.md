# Fix hoàn chỉnh: Null IDs trong Testcase Generation

## 🐛 Vấn đề gốc

Frontend gửi `selectedRequirementIds: [ null ]` thay vì ID thực tế khi generate testcase.

**Root Cause:**
- `GenerateTestcaseModal` dùng `requirement.id` nhưng requirements từ props có thể không có field `id` (chỉ có `_id`)
- `selectedRequirements` array chứa `null` values thay vì valid IDs

## ✅ Đã fix

### 1. GenerateTestcaseModal.vue

**Thay đổi chính:**

1. **Thêm helper function:**
   ```javascript
   const getRequirementId = (req) => {
     if (!req) return ''
     return String(req._id || req.id || req.requirement_id || '')
   }
   ```

2. **Fix template:**
   - `:key="requirement.id"` → `:key="getRequirementId(requirement)"`
   - `selectedRequirements.includes(requirement.id)` → `isRequirementSelected(requirement)`
   - `toggleRequirement(requirement.id)` → `toggleRequirement(requirement)`

3. **Fix methods:**
   - `selectAll()`: Dùng `getRequirementId()` và filter empty values
   - `toggleRequirement()`: Nhận requirement object, extract ID bằng helper
   - `generateTestCases()`: Filter và validate IDs trước khi gửi API
   - `onMounted()`: Dùng `getRequirementId()` khi auto-select

4. **Thêm validation:**
   - Filter null/undefined/empty values trước khi gửi API
   - Validate có ít nhất 1 valid ID
   - Thêm logging chi tiết để debug

### 2. RequirementSelectorModal.vue (đã fix trước đó)

- Fix `applySelection()` để dùng `getRequirementId()`
- Fix mapping trong `loadRequirements()` để set cả `id` và `requirement_id`
- Filter null values trước khi emit

### 3. Backend - testcase/domain/service.ts (đã fix trước đó)

- Filter null/undefined/empty values
- Normalize IDs đúng cách
- Thêm validation và error messages rõ ràng

## 🔍 Flow đã được fix

1. **Load Requirements:**
   - `fetchRequirements()` → `usecaseApi.getUsecases()` 
   - Map usecases với `requirement_id` và `id` fields
   - Store trong `requirements.value`

2. **Select Requirements:**
   - User click checkbox → `toggleRequirement(requirement)`
   - Extract ID bằng `getRequirementId(requirement)`
   - Add/remove từ `selectedRequirements` array (chứa IDs)

3. **Generate Testcases:**
   - `generateTestCases()` được gọi
   - Filter `selectedRequirements` để loại bỏ null/empty
   - Validate có ít nhất 1 valid ID
   - Gửi `validRequirementIds` đến API

4. **Backend Processing:**
   - Nhận `selectedRequirementIds`
   - Filter và normalize IDs
   - Match với usecases trong database
   - Generate testcases

## 📋 Testing Checklist

- [ ] Open GenerateTestcaseModal
- [ ] Verify requirements hiển thị đúng (có name, goal)
- [ ] Select requirements bằng checkbox
- [ ] Verify `selectedRequirements` array chứa valid IDs (check console)
- [ ] Click "Generate Test Cases"
- [ ] Verify API call có `selectedRequirementIds` với valid IDs
- [ ] Verify backend nhận và process đúng
- [ ] Verify testcases được generate thành công

## 🚀 Next Steps

1. Test lại toàn bộ flow
2. Verify console logs để đảm bảo IDs đúng format
3. Monitor để catch edge cases
4. Update documentation nếu cần

