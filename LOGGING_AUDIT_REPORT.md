# 📋 BÁO CÁO KIỂM TRA TÍNH NĂNG GHI LOG

## 🎯 Tổng quan

Hệ thống đã có tính năng logging khá đầy đủ với cấu trúc rõ ràng:
- **LogService**: Service chính để tạo log
- **LogModel**: Schema MongoDB với các action types được định nghĩa
- **Socket Service**: Real-time notification khi có log mới
- **Export**: Hỗ trợ export CSV, JSON, PDF

---

## ✅ CÁC HÀNH ĐỘNG ĐÃ CÓ LOG

### 1. **CRUD Input** ✅
- ✅ `create_input` - `backend/executable/command-ingress/features/input/domain/service.ts:100`
- ✅ `update_input` - `backend/executable/command-ingress/features/input/domain/service.ts:208`
- ✅ `delete_input` - `backend/executable/command-ingress/features/input/domain/service.ts:358, 391`

### 2. **CRUD Project** ✅
- ✅ `create_project` - `backend/executable/command-ingress/features/project/domain/service.ts:86`
- ✅ `update_project` - `backend/executable/command-ingress/features/project/domain/service.ts:168, 212`
- ✅ `delete_project` - `backend/executable/command-ingress/features/project/domain/service.ts:263`

### 3. **CRUD Usecase (Requirement Model)** ✅
- ✅ `generate_data` (tạo usecase) - `backend/executable/command-ingress/features/usecase/domain/service.ts:225`
- ✅ `update_data` (cập nhật usecase) - `backend/executable/command-ingress/features/usecase/domain/service.ts:373`
- ✅ `delete_data` (xóa usecase) - `backend/executable/command-ingress/features/usecase/domain/service.ts:490`

### 4. **CRUD Testcase** ⚠️ (Một phần)
- ✅ `update_output` (cập nhật testcase) - `backend/executable/command-ingress/features/testcase/domain/service.ts:461`
- ✅ `delete_output` (xóa testcase) - `backend/executable/command-ingress/features/testcase/domain/service.ts:602`
- ❌ **THIẾU**: `generate_output` khi generate testcase
- ❌ **THIẾU**: `generate_output` khi save testcase (saveTestCases)

### 5. **CRUD Database** ✅
- ✅ `generate_output` (generate database) - `backend/executable/command-ingress/features/database/domain/DatabaseCoreService.ts:89`
- ✅ `update_output` (cập nhật database) - `backend/executable/command-ingress/features/database/domain/DatabaseCoreService.ts:184`
- ✅ `delete_output` (xóa database) - `backend/executable/command-ingress/features/database/domain/DatabaseCoreService.ts:278`

### 6. **CRUD Database Tables** ✅
- ✅ `create_table` - `backend/executable/command-ingress/features/database/domain/TableManagementService.ts:85`
- ✅ `update_table` - `backend/executable/command-ingress/features/database/domain/TableManagementService.ts:200`

### 7. **Authentication & User Management** ✅
- ✅ `create_user` - `backend/executable/command-ingress/features/auth/domain/service.ts:86`
- ✅ `update_user` - `backend/executable/command-ingress/features/auth/domain/service.ts:123, 146, 253, 288, 302, 343, 395, 445, 475, 504`
- ✅ `login` - `backend/executable/command-ingress/features/auth/domain/service.ts`
- ✅ `logout` - `backend/executable/command-ingress/features/auth/domain/service.ts`
- ✅ `failed_login` - `backend/executable/command-ingress/features/auth/domain/service.ts`

### 8. **Project Member Management** ✅
- ✅ `invite_member` - `backend/executable/command-ingress/features/share/domain/service.ts:98`
- ✅ `accept_invite` - `backend/executable/command-ingress/features/share/domain/service.ts:164`
- ✅ `reject_invite` - `backend/executable/command-ingress/features/share/domain/service.ts:236`
- ✅ `cancel_invite` - `backend/executable/command-ingress/features/share/domain/service.ts:554`
- ✅ `remove_member` - `backend/executable/command-ingress/features/share/domain/service.ts:659`
- ✅ `leave_project` - `backend/executable/command-ingress/features/share/domain/service.ts:767`
- ✅ `change_member_role` - `backend/executable/command-ingress/features/share/domain/service.ts:853, 962`

---

## ❌ CÁC HÀNH ĐỘNG THIẾU LOG

### 1. **Testcase Generation & Save** ❌
**File**: `backend/executable/command-ingress/features/testcase/domain/service.ts`

- ❌ **`generateTestCases()`** (line 21-153): Không có log khi generate testcase từ requirements
- ❌ **`saveTestCases()`** (line 262-321): Không có log khi save testcase vào database

**Cần thêm**:
```typescript
// Sau khi generate thành công
await this.logService.createLog({
  project_id: projectId,
  user_id: userId,
  action: "generate_output",
  target_id: versionId,
  target_type: "testcases",
  version_number: version.version_number,
  affects_requirement: true,
  level: "info",
  performed_by_ai: true,
  details: {
    after: { count: generatedTestCases.length },
    message: `Generated ${generatedTestCases.length} test cases from requirements`
  }
});

// Sau khi save thành công
await this.logService.createLog({
  project_id: projectId,
  user_id: createdBy,
  action: "generate_output",
  target_id: versionId,
  target_type: "testcases",
  version_number: version.version_number,
  affects_requirement: true,
  level: "info",
  performed_by_ai: false,
  details: {
    after: { count: savedTestCases.length },
    message: `Saved ${savedTestCases.length} test cases to database`
  }
});
```

### 2. **Activity Diagram** ❌
**File**: `backend/executable/command-ingress/features/uml/activity_diagram/domain/service.ts`

- ❌ **`generateFromUsecase()`** (line 16-98): Không có log khi generate activity diagram từ usecase
- ❌ **`generateFromActor()`** (line 100-147): Không có log khi generate activity diagram từ actor
- ❌ **`create()`** (line 150-190): Không có log khi tạo activity diagram thủ công
- ❌ **`deleteActivityDiagram()`** (line 235-316): Không có log khi xóa activity diagram

**Cần thêm**:
```typescript
// Sau generateFromUsecase/generateFromActor/create
await this.logService.createLog({
  project_id: version.project_id.toString(),
  user_id: userId,
  action: "generate_output",
  target_id: newDiagram._id.toString(),
  target_type: "activity_diagrams",
  version_number: version.version_number,
  affects_requirement: true,
  level: "info",
  performed_by_ai: true, // hoặc false nếu create thủ công
  details: {
    after: { name: newDiagram.name },
    message: `Generated activity diagram: ${newDiagram.name}`
  }
});

// Sau deleteActivityDiagram
await this.logService.createLog({
  project_id: diagram.project_id.toString(),
  user_id: userId,
  action: "delete_output",
  target_id: diagram._id.toString(),
  target_type: "activity_diagrams",
  version_number: version.version_number,
  affects_requirement: false,
  level: "warning",
  details: {
    before: diagram,
    message: `Deleted activity diagram: ${diagram.name}`
  }
});
```

### 3. **Sequence Diagram** ❌
**File**: `backend/executable/command-ingress/features/uml/sequence.diagram/domain/service.ts`

- ❌ **`generateSchemaFromRequirements()`** (line 23-124): Không có log khi generate sequence diagram
- ❌ **`deleteSequenceDiagramById()`** (line 193-246): Không có log khi xóa sequence diagram

**Cần thêm**:
```typescript
// Sau generateSchemaFromRequirements
await this.logService.createLog({
  project_id: projectId,
  user_id: userId,
  action: "generate_output",
  target_id: savedDocument._id.toString(),
  target_type: "sequence_diagrams",
  version_number: version.version_number,
  affects_requirement: true,
  level: "info",
  performed_by_ai: true,
  details: {
    after: { name: savedDocument.name, usecase_ref_id: usecaseId },
    message: `Generated sequence diagram: ${savedDocument.name}`
  }
});

// Sau deleteSequenceDiagramById
await this.logService.createLog({
  project_id: sequenceDiagram.project_id.toString(),
  user_id: subId,
  action: "delete_output",
  target_id: sequenceId,
  target_type: "sequence_diagrams",
  version_number: version.version_number,
  affects_requirement: false,
  level: "warning",
  details: {
    before: beforeSnapshot,
    message: `Deleted sequence diagram: ${sequenceDiagram.name}`
  }
});
```

### 4. **Usecase Diagram** ❌
**File**: `backend/executable/command-ingress/features/uml/usecase.diagram/domain/service.ts`

- ❌ **`generateSchemaFromRequirements()`** (line 22-90): Không có log khi generate usecase diagram
- ❌ **`deleteUsecaseDiagram()`** (line 468-522): Không có log khi xóa usecase diagram

**Cần thêm**:
```typescript
// Sau generateSchemaFromRequirements
await this.logService.createLog({
  project_id: projectId,
  user_id: userId,
  action: "generate_output",
  target_id: savedDocument._id.toString(),
  target_type: "usecase_diagrams",
  version_number: version.version_number,
  affects_requirement: true,
  level: "info",
  performed_by_ai: true,
  details: {
    after: { name: savedDocument.name },
    message: `Generated usecase diagram: ${savedDocument.name}`
  }
});

// Sau deleteUsecaseDiagram
await this.logService.createLog({
  project_id: ucd.project_id.toString(),
  user_id: userId,
  action: "delete_output",
  target_id: ucId,
  target_type: "usecase_diagrams",
  version_number: version.version_number,
  affects_requirement: false,
  level: "warning",
  details: {
    before: beforeSnapshot,
    message: `Deleted usecase diagram: ${ucd.name}`
  }
});
```

### 5. **Version Operations** ❌
**File**: `backend/executable/command-ingress/features/version/domain/service.ts`

- ❌ **`createVersion()`**: Cần kiểm tra xem có log không
- ❌ **`updateVersion()`**: Cần kiểm tra xem có log không
- ❌ **`deleteVersion()`**: Cần kiểm tra xem có log không
- ❌ **`rollbackVersion()`** (line 986): Không có log khi rollback version

**Cần thêm**:
```typescript
// Sau rollbackVersion
await this.logService.createLog({
  project_id: version.project_id.toString(),
  user_id: userId,
  action: "rollback",
  target_id: versionId,
  target_type: "version",
  version_number: version.version_number,
  affects_requirement: true,
  level: "warning",
  details: {
    message: `Rolled back to version ${parentVersion.version_number}`
  }
});
```

### 6. **Export Operations** ❌
- ❌ **`export_data`**: Action này đã được định nghĩa trong model nhưng chưa thấy được sử dụng ở đâu

**Cần kiểm tra**: Các chức năng export (CSV, JSON, PDF) có nên log không?

---

## 📊 THỐNG KÊ

| Loại hành động | Đã có log | Thiếu log | Tỷ lệ |
|---------------|-----------|-----------|-------|
| CRUD Input | ✅ 3/3 | - | 100% |
| CRUD Project | ✅ 3/3 | - | 100% |
| CRUD Usecase | ✅ 3/3 | - | 100% |
| CRUD Testcase | ⚠️ 2/4 | 2 | 50% |
| CRUD Database | ✅ 3/3 | - | 100% |
| CRUD Tables | ✅ 2/2 | - | 100% |
| Authentication | ✅ 5/5 | - | 100% |
| Member Management | ✅ 7/7 | - | 100% |
| **UML Diagrams** | ❌ 0/8 | **8** | **0%** |
| Version Operations | ⚠️ 0/4 | 4 | 0% |
| **TỔNG CỘNG** | **26/42** | **16** | **62%** |

---

## 🎯 KHUYẾN NGHỊ

### Ưu tiên cao:
1. ✅ **Thêm log cho Testcase Generation & Save** - Quan trọng cho audit trail
2. ✅ **Thêm log cho tất cả UML Diagram operations** - Activity, Sequence, Usecase diagrams
3. ✅ **Thêm log cho Version operations** - Đặc biệt là rollback

### Ưu tiên trung bình:
4. ⚠️ **Kiểm tra và thêm log cho Export operations** - Nếu cần track export data
5. ⚠️ **Thêm log cho update/delete Activity/Sequence/Usecase diagrams** - Hiện chỉ có preview change

### Best Practices:
- ✅ Luôn log với `performed_by_ai: true` khi là AI generation
- ✅ Luôn log với `affects_requirement: true` khi ảnh hưởng đến requirements
- ✅ Luôn log `before` và `after` snapshot cho update/delete operations
- ✅ Sử dụng level phù hợp: `info` (normal), `warning` (delete), `error` (failures)

---

## 📝 LƯU Ý

1. **LogService đã được inject** vào hầu hết các service, chỉ cần gọi `this.logService.createLog()`
2. **Version number** cần được lấy từ version object để đảm bảo consistency
3. **User ID** cần được truyền vào từ controller/request để track người thực hiện
4. **Target ID** nên là ID của entity được tạo/sửa/xóa, không phải version ID (trừ khi target_type là "version")

---

**Ngày kiểm tra**: $(date)
**Người kiểm tra**: AI Assistant

