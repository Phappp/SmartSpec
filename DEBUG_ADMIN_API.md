# Debug Admin API - Hướng dẫn kiểm tra

## Vấn đề hiện tại
FE admin không gọi được dữ liệu users từ database.

## Các bước debug

### 1. Kiểm tra Authentication
```bash
# Kiểm tra xem có token trong localStorage không
# Mở Developer Tools > Application > Local Storage
# Tìm: accessToken, adminToken, hoặc token
```

### 2. Test API trực tiếp
```bash
# Test API users (cần token)
curl -X GET "http://localhost:8000/api/users" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### 3. Kiểm tra Console Logs
Mở Developer Tools > Console để xem:
- "Raw API response:" - Response từ BE
- "API Response:" - Data đã parse
- "Parsed items:" - Items đã extract
- "Mapped users:" - Users đã map

### 4. Kiểm tra Network Tab
Mở Developer Tools > Network:
- Tìm request đến `/api/users`
- Kiểm tra Status Code (200, 401, 403, 500)
- Kiểm tra Response body

## Các lỗi có thể gặp

### 401 Unauthorized
- Token không có hoặc không hợp lệ
- Token đã hết hạn
- **Giải pháp**: Đăng nhập lại để lấy token mới

### 403 Forbidden  
- User không có quyền ADMIN
- **Giải pháp**: Kiểm tra user có system_role = "ADMIN" không

### 500 Internal Server Error
- Lỗi server
- **Giải pháp**: Kiểm tra logs của BE

## Cách tạo user ADMIN để test

### Cách 1: Sử dụng MongoDB Compass
1. Kết nối đến MongoDB
2. Tìm collection "users"
3. Tìm user cần test
4. Cập nhật field `system_role` thành "ADMIN"

### Cách 2: Sử dụng MongoDB Shell
```javascript
// Kết nối đến database
use your_database_name

// Tìm user
db.users.findOne({email: "your_email@example.com"})

// Cập nhật role
db.users.updateOne(
  {email: "your_email@example.com"}, 
  {$set: {system_role: "ADMIN"}}
)
```

### Cách 3: Sử dụng API (nếu có)
```bash
# Tạo user mới với role ADMIN
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123",
    "name": "Admin User",
    "system_role": "ADMIN"
  }'
```

## Kiểm tra BE có chạy không

```bash
# Kiểm tra BE có chạy trên port 8000 không
curl http://localhost:8000/api/users

# Hoặc kiểm tra health check
curl http://localhost:8000/health
```

## Kiểm tra CORS
Nếu gặp lỗi CORS:
1. Kiểm tra BE có cấu hình CORS cho FE không
2. FE chạy trên port 5173, BE trên port 8000
3. Kiểm tra file app.ts trong BE

## Debug Steps

1. **Mở FE admin**: http://localhost:5173/admin
2. **Mở Developer Tools**: F12
3. **Vào tab Console**: Xem logs
4. **Vào tab Network**: Xem API calls
5. **Kiểm tra localStorage**: Xem có token không
6. **Test API trực tiếp**: Sử dụng curl hoặc Postman

## Expected Response Format

BE sẽ trả về:
```json
{
  "status": "Success",
  "message": "Get all users successfully", 
  "data": [
    {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "system_role": "ADMIN",
      "status": "ACTIVE",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

FE sẽ map thành:
```json
[
  {
    "id": "user_id",
    "name": "User Name", 
    "email": "user@example.com",
    "role": "ADMIN",
    "active": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```
