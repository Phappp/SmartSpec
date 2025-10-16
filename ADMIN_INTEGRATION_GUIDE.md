# Hướng dẫn tích hợp Admin Panel

## 🎯 **Tổng quan**

Admin Panel đã được tích hợp hoàn toàn vào dự án chính với hệ thống authentication và authorization đầy đủ.

## 🔐 **Hệ thống Authentication**

### 1. **Authentication Guard** (`/src/utils/authGuard.js`)
- `isAuthenticated()`: Kiểm tra user đã đăng nhập
- `isAdmin()`: Kiểm tra user có role ADMIN
- `getUserInfo()`: Lấy thông tin user từ JWT token
- `adminGuard()`: Middleware bảo vệ admin routes
- `authGuard()`: Middleware bảo vệ authenticated routes

### 2. **Route Protection**
- **Admin routes**: Chỉ cho phép user có `system_role: "ADMIN"`
- **Authenticated routes**: Yêu cầu đăng nhập
- **Public routes**: Login, Register, OAuth

## 🚀 **Cách sử dụng**

### 1. **Tạo User ADMIN**
```javascript
// Trong MongoDB
db.users.updateOne(
  {email: "your_email@example.com"}, 
  {$set: {system_role: "ADMIN"}}
)
```

### 2. **Đăng nhập và truy cập Admin**
1. Đăng nhập với user có role ADMIN
2. Vào trang chủ (`/dashboard`)
3. Trong sidebar sẽ hiển thị section "Admin" với nút "Admin Panel"
4. Click vào "Admin Panel" để vào `/admin`

### 3. **Các trang Admin**
- `/admin` - Dashboard tổng quan
- `/admin/users` - Quản lý người dùng
- `/admin/api-keys` - Quản lý API Keys
- `/admin/projects` - Quản lý dự án
- `/admin/access-denied` - Trang thông báo không có quyền

## 🛡️ **Bảo mật**

### 1. **JWT Token Validation**
- Token được decode để lấy `system_role`
- Kiểm tra `system_role === "ADMIN"` để cho phép truy cập admin
- Token hết hạn sẽ redirect về login

### 2. **Route Guards**
```javascript
// Admin routes được bảo vệ bởi adminGuard
{
  path: '/admin',
  beforeEnter: adminGuard // Chỉ cho phép ADMIN
}

// Authenticated routes được bảo vệ bởi authGuard
{
  path: '/dashboard',
  beforeEnter: authGuard // Yêu cầu đăng nhập
}
```

### 3. **Access Control**
- User không có quyền ADMIN sẽ thấy trang "Access Denied"
- User chưa đăng nhập sẽ bị redirect về `/login`

## 🎨 **UI/UX Features**

### 1. **Sidebar Integration**
- Nút "Admin Panel" chỉ hiển thị cho user ADMIN
- Màu đỏ để phân biệt với các chức năng thường
- Icon shield để thể hiện tính bảo mật

### 2. **Admin Dashboard**
- Hiển thị thông tin user hiện tại
- Navigation menu cho các chức năng admin
- Nút logout tích hợp

### 3. **Debug Panel**
- Hiển thị thông tin authentication
- Test API trực tiếp
- Debug logs chi tiết

## 📊 **Admin Features**

### 1. **User Management**
- Xem danh sách users
- Tạo user mới
- Cập nhật thông tin user
- Xóa user
- Reset password
- Tìm kiếm và lọc users

### 2. **API Keys Management**
- Xem danh sách API keys
- Tạo API key mới
- Cập nhật API key
- Xóa API key
- Thống kê sử dụng

### 3. **Project Management**
- Xem tất cả projects
- Xem chi tiết project
- Xóa project
- Quản lý versions

### 4. **Dashboard**
- Thống kê tổng quan
- Hoạt động gần đây
- Biểu đồ phân bố

## 🔧 **Technical Details**

### 1. **File Structure**
```
src/
├── utils/
│   └── authGuard.js          # Authentication utilities
├── components/
│   ├── AdminAccessDenied.vue # Access denied page
│   └── DebugPanel.vue        # Debug panel
├── views/
│   ├── admin/                # Admin pages
│   └── AdminDashboard.vue    # Admin layout
└── router/
    ├── admin.js              # Admin routes
    └── index.js              # Main router
```

### 2. **API Integration**
- Tất cả admin APIs đã được map với BE endpoints
- Error handling và loading states
- Response format normalization

### 3. **State Management**
- User info được load từ JWT token
- Real-time updates cho admin data
- Persistent authentication state

## 🚨 **Troubleshooting**

### 1. **Không thấy nút Admin Panel**
- Kiểm tra user có `system_role: "ADMIN"` không
- Refresh page sau khi cập nhật role
- Kiểm tra console logs

### 2. **Access Denied khi vào admin**
- User không có role ADMIN
- Token hết hạn
- JWT token không chứa `system_role`

### 3. **API không hoạt động**
- Kiểm tra BE có chạy không
- Kiểm tra CORS configuration
- Kiểm tra authentication token

### 4. **Debug Steps**
1. Mở Developer Tools (F12)
2. Vào Console tab xem logs
3. Vào Network tab xem API calls
4. Sử dụng Debug Panel để test API

## 📝 **Notes**

- **Không chỉnh sửa BE**: Tất cả thay đổi chỉ ở FE
- **Backward compatible**: Không ảnh hưởng đến chức năng hiện tại
- **Responsive**: Admin panel hoạt động trên mobile
- **Accessible**: Tuân thủ accessibility standards

## 🎉 **Kết quả**

Sau khi tích hợp, admin panel sẽ:
- ✅ Tự động hiển thị cho user ADMIN
- ✅ Bảo vệ bởi authentication guards
- ✅ Tích hợp hoàn toàn với UI hiện tại
- ✅ Cung cấp đầy đủ chức năng quản lý
- ✅ Hỗ trợ debug và troubleshooting
