# Stats Service - Hướng dẫn tích hợp

## Model API Usage

Đã tạo model `api_usage.ts` để lưu log mỗi lần gọi API (Gemini, OpenAI, Claude).

## Cách sử dụng Logging

### 1. Import helper function

```typescript
import { logApiUsage } from '../stats/domain/apiUsageLogger';
```

### 2. Log sau mỗi lần gọi API thành công

```typescript
// Ví dụ trong GeminiService
try {
  const startTime = Date.now();
  const response = await model.generateContent({...});
  const responseTime = Date.now() - startTime;
  
  // Lấy tokens từ response (nếu có)
  const usageMetadata = response.response?.usageMetadata;
  
  await logApiUsage({
    api_key_id: key._id.toString(),
    provider: 'gemini',
    model_name: 'gemini-2.0-flash-001',
    user_id: userId,
    project_id: projectId,
    request_type: 'text',
    prompt_tokens: usageMetadata?.promptTokenCount || 0,
    completion_tokens: usageMetadata?.candidatesTokenCount || 0,
    total_tokens: usageMetadata?.totalTokenCount || 0,
    status: 'success',
    status_code: 200,
    response_time: responseTime,
  });
  
  return response;
} catch (error) {
  // Log lỗi
  await logApiUsage({
    api_key_id: key._id.toString(),
    provider: 'gemini',
    status: 'failed',
    status_code: error.status || 500,
    error_message: error.message,
  });
  throw error;
}
```

### 3. Stats Service tự động query từ database

StatsService đã được cập nhật để:
- `fetchUsageSummary()`: Tổng hợp từ bảng `api_usages`
- `fetchProviderUsage()`: Thống kê theo provider từ `api_usages`
- `fetchQuickStats()`: Thống kê users/projects từ database thật

## Lưu ý

- Logging không block flow chính (catch error riêng)
- Có thể log bất đồng bộ (không cần await nếu muốn tăng tốc)
- Tất cả dữ liệu thống kê giờ đã lấy từ database thật, không còn mock

