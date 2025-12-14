# Hướng dẫn sử dụng OpenRouter API Key

## 📋 Tổng quan

OpenRouter là một gateway cho phép bạn sử dụng **1 API key duy nhất** để truy cập nhiều LLM models khác nhau từ các nhà cung cấp khác nhau.

## 🔑 Cách thêm OpenRouter API Key

### Bước 1: Lấy API Key từ OpenRouter
1. Truy cập: https://openrouter.ai/
2. Đăng ký/Đăng nhập tài khoản
3. Vào **Keys** → Tạo API key mới
4. Copy API key (dạng: `sk-or-v1-...`)

### Bước 2: Thêm vào hệ thống

#### Cách 1: Qua UI (Khuyến nghị)
1. Đăng nhập vào hệ thống với quyền Admin
2. Vào **Admin Dashboard** → **API Keys Management**
3. Click **Thêm API Key mới**
4. Điền thông tin:
   - **API Key**: Dán key từ OpenRouter
   - **Nhà cung cấp**: Chọn **OpenRouter (Universal)**
   - **Tên hiển thị**: Ví dụ: "OpenRouter Free Key"
   - **Model name**: Để trống hoặc nhập model mặc định (ví dụ: `google/gemma-3-27b:free`)
   - **Trạng thái**: Kích hoạt ✅
5. Click **Thêm API Key**

#### Cách 2: Qua API
```bash
POST /api/keys
{
  "key_value": "sk-or-v1-your-key-here",
  "provider": "openrouter",
  "model_name": "google/gemma-3-27b:free",
  "display_name": "OpenRouter Free Key",
  "is_active": true
}
```

## 🎯 Cách sử dụng

### Lưu ý quan trọng
- OpenRouter key có thể dùng cho **TẤT CẢ** models trong `MODEL_CONFIGS`
- Model FREE trên OpenRouter **PHẢI** có suffix `:free` trong modelName
- Ví dụ: `google/gemma-3-27b:free` ✅ (FREE)
- Ví dụ: `google/gemma-3-27b` ❌ (Có thể bị tính tiền)

### Models được hỗ trợ (FREE)

#### 🧠 Agent Models (Planner/Controller)
- `nous/hermes-3-405b-instruct`
- `qwen/qwen3-235b-a22b`
- `tng/deepseek-r1t-chimera`

#### ⚙️ Worker Models (Executor)
- `google/gemma-3-4b:free`
- `google/gemma-3-12b:free`
- `google/gemma-3-27b:free`
- `mistral/mistral-7b-instruct`
- `meta/llama-3.2-3b-instruct`
- `kwaipilot/kat-coder-pro-v1`
- `nvidia/nemotron-nano-9b-v2`

#### 🧪 Specialized Models
- `nvidia/nemotron-nano-12b-2-vl` (Vision)

## ⚠️ Bảo vệ chống tính tiền

Hệ thống tự động kiểm tra:
- Model FREE phải có `:free` trong modelName
- Nếu không có `:free` → sẽ throw error trong FREE mode
- Validation được thực hiện tự động khi gọi `getModelConfig()`

## 🔧 Cấu hình nâng cao

### Thêm nhiều keys cho load balancing
Bạn có thể thêm nhiều OpenRouter keys để:
- Phân tải request
- Failover khi 1 key hết quota
- Quản lý theo project/team

### Model name trong API Key
- Có thể để trống → hệ thống sẽ dùng model mặc định
- Hoặc chỉ định model cụ thể → key đó sẽ ưu tiên dùng model đó

## 📊 Monitoring

Sau khi thêm key, bạn có thể:
- Xem usage statistics trong Admin Dashboard
- Theo dõi số lượng requests/ngày
- Kiểm tra last_used timestamp

## 🚀 Next Steps

Sau khi thêm OpenRouter key:
1. Hệ thống sẽ tự động sử dụng key này khi gọi các models
2. Các service sẽ tự động fallback giữa các keys nếu 1 key fail
3. Usage sẽ được log vào database để tracking

## ❓ FAQ

**Q: Tôi có thể dùng 1 OpenRouter key cho tất cả models không?**
A: Có! Đó chính là ưu điểm của OpenRouter. Chỉ cần 1 key cho tất cả models.

**Q: Làm sao để đảm bảo chỉ dùng FREE models?**
A: Hệ thống tự động validate. Model FREE phải có `:free` trong modelName. Nếu không có, sẽ bị chặn trong FREE mode.

**Q: Tôi muốn dùng model trả phí thì sao?**
A: Bỏ `:free` khỏi modelName và set `isProductionFreeMode = false` khi gọi API.

**Q: Key của tôi bị lỗi "Invalid API key"**
A: Kiểm tra:
- Key có đúng format `sk-or-v1-...` không?
- Key có còn active trên OpenRouter không?
- Key có đủ quota không?

