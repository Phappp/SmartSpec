# Hướng dẫn khắc phục lỗi Admin API

## Vấn đề: FE admin không gọi được dữ liệu users từ database

### 🔍 **Nguyên nhân có thể:**

1. **Authentication Issues** (Phổ biến nhất)
   - User chưa đăng nhập
   - Token đã hết hạn
   - User không có quyền ADMIN

2. **API Endpoint Issues**
   - BE không chạy hoặc chạy sai port
   - CORS configuration
   - Route không đúng

3. **Data Format Issues**
   - Response format không khớp
   - Field mapping sai

## 🛠️ **Các bước khắc phục:**

### Bước 1: Kiểm tra Authentication

1. **Mở Developer Tools** (F12)
2. **Vào tab Console** - Xem logs debug
3. **Vào tab Application > Local Storage** - Kiểm tra tokens
4. **Tìm các keys**: `accessToken`, `adminToken`, `token`

**Nếu không có token:**
```javascript
// Đăng nhập trước khi vào admin
// Hoặc tạo token test
localStorage.setItem('accessToken', 'your_jwt_token_here')
```

### Bước 2: Tạo User ADMIN để test

**Cách 1: Sử dụng MongoDB Compass**
1. Kết nối đến MongoDB
2. Tìm collection "users"
3. Tìm user cần test
4. Cập nhật: `system_role: "ADMIN"`

**Cách 2: Sử dụng MongoDB Shell**
```javascript
// Kết nối database
use your_database_name

// Tìm user
db.users.findOne({email: "your_email@example.com"})

// Cập nhật role
db.users.updateOne(
  {email: "your_email@example.com"}, 
  {$set: {system_role: "ADMIN"}}
)

// Kiểm tra
db.users.findOne({email: "your_email@example.com"})
```

**Cách 3: Sử dụng API Register**
```bash
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123",
    "name": "Admin User",
    "system_role": "ADMIN"
  }'
```

### Bước 3: Test API trực tiếp

**Test với curl:**
```bash
# Test API users (cần token)
curl -X GET "http://localhost:8000/api/users" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

**Test với Postman:**
1. Method: GET
2. URL: `http://localhost:8000/api/users`
3. Headers: `Authorization: Bearer YOUR_TOKEN`
4. Send

### Bước 4: Kiểm tra BE có chạy không

```bash
# Kiểm tra BE
curl http://localhost:8000/api/users

# Kiểm tra health
curl http://localhost:8000/health

# Kiểm tra logs BE
cd SmartSpec/backend
npm run dev
```

### Bước 5: Sử dụng Debug Panel

1. **Mở FE admin**: http://localhost:5173/admin
2. **Click nút "🐛 Debug"** ở góc phải màn hình
3. **Xem thông tin**:
   - Authentication status
   - API status
   - Data status
4. **Click "Test API"** để test trực tiếp

## 🔧 **Các lỗi thường gặp và cách sửa:**

### 401 Unauthorized
```
Error: Authentication failed - Please login again
```
**Nguyên nhân**: Token không có hoặc không hợp lệ
**Giải pháp**: 
1. Đăng nhập lại
2. Kiểm tra token trong localStorage
3. Kiểm tra token có hết hạn không

### 403 Forbidden
```
Error: Access denied - Admin role required
```
**Nguyên nhân**: User không có quyền ADMIN
**Giải pháp**: 
1. Cập nhật `system_role: "ADMIN"` trong database
2. Đăng nhập lại để lấy token mới

### 500 Internal Server Error
```
Error: Server error - Check backend logs
```
**Nguyên nhân**: Lỗi server
**Giải pháp**: 
1. Kiểm tra logs của BE
2. Kiểm tra database connection
3. Restart BE

### CORS Error
```
Access to fetch at 'http://localhost:8000/api/users' from origin 'http://localhost:5173' has been blocked by CORS policy
```
**Nguyên nhân**: CORS configuration
**Giải pháp**: 
1. Kiểm tra CORS config trong BE
2. Đảm bảo FE chạy trên port 5173, BE trên port 8000

### Empty Data
```
No data found in response
```
**Nguyên nhân**: Database trống hoặc query sai
**Giải pháp**: 
1. Kiểm tra có data trong database không
2. Kiểm tra query parameters
3. Kiểm tra response format

## 📋 **Checklist Debug:**

- [ ] BE đang chạy trên port 8000
- [ ] FE đang chạy trên port 5173  
- [ ] User đã đăng nhập
- [ ] Token có trong localStorage
- [ ] User có role ADMIN
- [ ] API endpoint `/api/users` hoạt động
- [ ] Response format đúng
- [ ] CORS configuration đúng

## 🚀 **Cách chạy test nhanh:**

1. **Start BE:**
   ```bash
   cd SmartSpec/backend
   npm run dev
   ```

2. **Start FE:**
   ```bash
   cd SmartSpec/frontend
   npm run dev
   ```

3. **Tạo admin user:**
   ```bash
   # Sử dụng MongoDB Shell hoặc Compass
   db.users.updateOne(
     {email: "your_email@example.com"}, 
     {$set: {system_role: "ADMIN"}}
   )
   ```

4. **Đăng nhập và test:**
   - Mở http://localhost:5173
   - Đăng nhập với user ADMIN
   - Vào http://localhost:5173/admin
   - Xem debug panel và console logs

## 📞 **Nếu vẫn không được:**

1. **Kiểm tra console logs** trong Developer Tools
2. **Kiểm tra Network tab** để xem API calls
3. **Kiểm tra BE logs** trong terminal
4. **Sử dụng Debug Panel** để test API
5. **Kiểm tra database** có data không

## 🎯 **Expected Results:**

Sau khi sửa xong, bạn sẽ thấy:
- Console logs hiển thị: "👥 Mapped users: X users loaded"
- Bảng users hiển thị dữ liệu từ database
- Debug panel hiển thị: "✅ API test successful"
- Network tab hiển thị request 200 OK
