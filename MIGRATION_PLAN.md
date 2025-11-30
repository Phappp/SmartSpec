# Kế hoạch Migration: requirement_model → usecases Collection

## Tổng quan
Chuyển đổi `requirement_model` từ embedded subdocument trong `version` sang collection độc lập `usecases` (giống như `testcases`).

## Cấu trúc mới

### 1. usecase.ts (Model độc lập)
```typescript
{
  project_id: ObjectId (ref: "projects", required, indexed),
  version_id: ObjectId (ref: "versions", required, indexed),
  name: String (required),
  role: { id, name, description },
  goal: String (required),
  reason: String (required),
  tasks: [String] (required),
  inputs: [String],
  outputs: [String],
  context: String,
  priority: "low" | "medium" | "high",
  feedback: Mixed,
  rules: [String],
  triggers: [String],
  preconditions: [String],
  postconditions: [String],
  exceptions: [String],
  stakeholders: [String],
  constraints: [String],
  related_usecases: [ObjectId] (ref: "usecases"),
  created_by: ObjectId (ref: "users"),
  updated_by: ObjectId (ref: "users"),
  timestamps: true
}
```

### 2. version.ts
- ❌ Bỏ: `requirement_model: [requirementModelSchema]`
- ✅ Giữ: `pending_conflicts` (cập nhật để reference usecase _id)
- ✅ Giữ: `affects_requirement: Boolean`

### 3. conflictSchema
- Cập nhật `items` để reference usecase _id thay vì embed

## Danh sách file cần cập nhật

### Phase 1: Model & Schema
- [ ] `backend/internal/model/usecase.ts` - Chuyển thành model độc lập
- [ ] `backend/internal/model/version.ts` - Bỏ requirement_model, cập nhật conflictSchema

### Phase 2: Core Services
- [ ] `backend/executable/command-ingress/features/usecase/domain/service.ts`
  - Thay `version.requirement_model.push()` → `Usecase.create()`
  - Thay `version.requirement_model.find()` → `Usecase.find()`
  - Thay `version.requirement_model[index]` → `Usecase.findByIdAndUpdate()`
  - Thay `version.requirement_model.filter()` → `Usecase.deleteMany()`

- [ ] `backend/executable/command-ingress/features/orchestrator/domain/RequirementService.ts`
  - `finalize()`: Tạo usecases mới thay vì push vào version
  - `resolveDuplicate()`: Cập nhật logic conflict resolution
  - `findConflicts()`: Cập nhật để query từ collection
  - `resolveConflict()`: Cập nhật để xóa usecases

### Phase 3: Version Service
- [ ] `backend/executable/command-ingress/features/version/domain/service.ts`
  - `bumpVersion()`: Clone usecases từ version cũ sang version mới
  - `createOrUpdatePreview()`: Cập nhật logic preview
  - Các method khác sử dụng requirement_model

### Phase 4: Testcase Services
- [ ] `backend/executable/command-ingress/features/testcase/domain/service.ts`
  - Aggregation pipeline: Thay `$unwind: "$requirement_model"` → `$lookup: { from: "usecases" }`
  - `getRequirementCoverageReport()`: Cập nhật query

- [ ] `backend/executable/command-ingress/features/testcase/domain/ExportService.ts`
  - `getRequirementCoverage()`: Cập nhật aggregation

### Phase 5: UML Services
- [ ] `backend/executable/command-ingress/features/uml/activity_diagram/domain/service.ts`
  - Thay `version.requirement_model` → `Usecase.find({ version_id })`

- [ ] `backend/executable/command-ingress/features/uml/sequence.diagram/adapter/controller.ts`
  - Thay `version.requirement_model.find()` → `Usecase.findById()`

- [ ] `backend/executable/command-ingress/features/uml/usecase.diagram/adapter/controller.ts`
  - Cập nhật để query từ collection

### Phase 6: Other Services
- [ ] `backend/executable/command-ingress/features/database/adapter/controller.ts`
  - Cập nhật `requirements: version.requirement_model`

- [ ] `backend/executable/command-ingress/features/project/domain/service.ts`
  - Bỏ `requirement_model: []` khi tạo version mới

- [ ] `backend/executable/command-ingress/features/orchestrator/domain/service.ts`
  - Cập nhật response format

- [ ] `backend/executable/command-ingress/features/orchestrator/domain/InputService.ts`
  - Cập nhật logic xử lý

### Phase 7: Log & DTOs
- [ ] `backend/executable/command-ingress/features/log/adapter/dto.ts`
  - Giữ `target_type: "requirement_model"` hoặc đổi thành `"usecase"`

- [ ] `backend/internal/model/log.ts`
  - Cập nhật enum nếu cần

### Phase 8: Frontend (nếu cần)
- [ ] `frontend/src/views/UsecaseManagement.vue`
  - Cập nhật API calls

- [ ] `frontend/src/views/ActivityDiagramManagement.vue`
  - Cập nhật `v?.requirement_model`

### Phase 9: Migration Script
- [ ] Tạo script migration để:
  1. Lấy tất cả versions có requirement_model
  2. Tạo usecases mới từ requirement_model
  3. Cập nhật related_usecases (map từ id cũ sang _id mới)
  4. Xóa requirement_model khỏi versions
  5. Cập nhật pending_conflicts

## Thay đổi API/Response Format

### Trước:
```typescript
version.requirement_model = [
  { _id: ObjectId, name: "...", ... },
  ...
]
```

### Sau:
```typescript
// Query riêng
const usecases = await Usecase.find({ version_id: versionId });
```

## Indexes cần tạo
```typescript
usecaseSchema.index({ project_id: 1, version_id: 1 });
usecaseSchema.index({ version_id: 1 });
usecaseSchema.index({ project_id: 1 });
usecaseSchema.index({ "related_usecases": 1 });
usecaseSchema.index({ name: 1 });
usecaseSchema.index({ priority: 1 });
```

## Lưu ý quan trọng
1. **related_usecases**: Chuyển từ `[String]` (id cũ) sang `[ObjectId]` (ref: "usecases")
2. **pending_conflicts**: Cập nhật để lưu usecase _id thay vì embed
3. **source_requirement_ids** trong testcase: Giữ nguyên String (ObjectId string)
4. **Migration**: Cần script để migrate dữ liệu hiện có
5. **Backward compatibility**: Có thể cần giữ API cũ tạm thời

## Thứ tự thực hiện
1. Tạo model usecase.ts mới (không xóa cũ ngay)
2. Tạo migration script
3. Chạy migration trên dev/staging
4. Cập nhật từng service một
5. Test kỹ từng phase
6. Deploy production
7. Xóa code cũ sau khi confirm

