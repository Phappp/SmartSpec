# Tóm tắt API còn thiếu cho Admin Panel

## Đã hoàn thành ✅
- Gắn API BE vào FE admin
- Sửa các endpoint URLs để khớp với BE
- Thêm mock data cho các API chưa có

## API Endpoints hiện có trong BE ✅

### Authentication (`/api/auth`)
- ✅ POST `/login`, `/register`, `/logout`
- ✅ POST `/token` (refresh), `/forgot-password`, `/reset-password`
- ✅ POST `/verify-email`, `/verify-otp`, `/send-verification-email`
- ✅ GET `/me`, POST `/toggle-2fa`
- ✅ GET `/google/oauth`

### Users (`/api/users`)
- ✅ GET `/` (admin only)
- ✅ GET `/:id` (admin only)
- ✅ PATCH `/:id` (admin only)
- ✅ DELETE `/:id` (admin only)
- ✅ GET `/search` (admin only)
- ✅ GET `/filter` (admin only)
- ✅ PUT `/reset-password/:id` (admin only)
- ✅ PATCH `/update-profile` (user)
- ✅ POST `/change-password` (user)

### API Keys (`/api/keys`)
- ✅ GET `/` (user)
- ✅ POST `/` (user)
- ✅ GET `/:id` (user)
- ✅ PATCH `/:id` (user)
- ✅ DELETE `/:id` (user)
- ✅ GET `/search` (user)
- ✅ GET `/filter` (user)
- ✅ GET `/statistics` (admin only)

### Projects (`/api/projects`)
- ✅ GET `/myproject` (user's projects)
- ✅ POST `/` (create project)
- ✅ PUT `/:projectId` (update project)
- ✅ DELETE `/:projectId` (delete project)
- ✅ POST `/:projectId/restore` (restore project)
- ✅ GET `/recent` (recent projects)
- ✅ GET `/shared` (shared projects)
- ✅ GET `/trashed` (deleted projects)
- ✅ GET `/:projectId` (project details)
- ✅ GET `/versions/:versionId/status` (version status)

## API Endpoints còn thiếu cần tạo ❌

### 1. Admin Dashboard APIs
```typescript
// Cần tạo trong BE
GET /api/admin/dashboard/stats
// Response: {
//   totalUsers: number,
//   activeUsers: number,
//   totalProjects: number,
//   activeApiKeys: number,
//   userRoleStats: Array<{name: string, count: number, percentage: number, color: string}>,
//   apiProviderStats: Array<{name: string, count: number, percentage: number, color: string}>
// }

GET /api/admin/dashboard/activities
// Response: Array<{
//   id: number,
//   type: 'user' | 'api' | 'project',
//   icon: string,
//   description: string,
//   time: string,
//   status: 'success' | 'warning' | 'error',
//   statusText: string
// }>
```

### 2. Admin User Management APIs
```typescript
// Cần tạo trong BE
POST /api/users (admin only)
// Tạo user mới từ admin panel
// Body: {name: string, email: string, password: string, role: string, active: boolean}

PATCH /api/users/:id/status (admin only)
// Thay đổi trạng thái user (active/inactive)
// Body: {active: boolean}

POST /api/users/bulk-action (admin only)
// Thực hiện hành động hàng loạt
// Body: {userIds: string[], action: 'activate' | 'deactivate' | 'delete'}
```

### 3. Admin API Keys Management APIs
```typescript
// Cần tạo trong BE
PATCH /api/keys/:id/status (user)
// Thay đổi trạng thái API key
// Body: {active: boolean}

POST /api/keys/:id/test (user)
// Test API key
// Response: {success: boolean, message: string}

POST /api/keys/bulk-action (user)
// Thực hiện hành động hàng loạt
// Body: {apiKeyIds: string[], action: 'activate' | 'deactivate' | 'delete'}
```

### 4. Admin Project Management APIs
```typescript
// Cần tạo trong BE
GET /api/projects (admin only)
// Lấy tất cả projects (không chỉ của user hiện tại)
// Query: ?status=&owner=&q=&page=&size=

POST /api/projects/bulk-action (admin only)
// Thực hiện hành động hàng loạt
// Body: {projectIds: string[], action: 'archive' | 'delete'}
```

### 5. System Management APIs
```typescript
// Cần tạo trong BE
GET /api/admin/system/info
// Thông tin hệ thống
// Response: {version: string, uptime: string, memory: string, cpu: string}

GET /api/admin/system/logs
// System logs
// Query: ?level=&source=&page=&size=
// Response: {items: Array<{id: number, level: string, message: string, timestamp: string, source: string}>, total: number}
```

## Các thay đổi đã thực hiện trong FE ✅

1. **Sửa API base URL**: Loại bỏ prefix `/admin` vì BE không có
2. **Cập nhật endpoint URLs**: 
   - `/api-keys` → `/keys`
   - `/users` giữ nguyên
   - `/projects` giữ nguyên
3. **Thêm mock data**: Cho các API chưa có trong BE
4. **Thêm error handling**: Xử lý lỗi khi API không tồn tại
5. **Thêm comments**: Ghi chú rõ ràng về API nào cần tạo trong BE

## Hướng dẫn triển khai

1. **Chạy FE admin**: 
   ```bash
   cd SmartSpec/frontend
   npm run dev
   ```

2. **Chạy BE**:
   ```bash
   cd SmartSpec/backend
   npm run dev
   ```

3. **Truy cập admin panel**: `http://localhost:5173/admin`

4. **Tạo các API còn thiếu** trong BE theo danh sách trên

## Lưu ý quan trọng

- FE admin đã được cấu hình để hoạt động với BE hiện tại
- Các API chưa có sẽ hiển thị mock data hoặc empty state
- Cần tạo các API còn thiếu trong BE để có đầy đủ chức năng
- Tất cả API admin cần có middleware `requireRole("ADMIN")`
