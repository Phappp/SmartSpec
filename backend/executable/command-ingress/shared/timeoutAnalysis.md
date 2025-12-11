# Phân tích vấn đề Timeout và UI Loading

## Vấn đề phát hiện

### 1. Timeout xảy ra sau khi đã parse xong
- Log: "✅ Parsed 48 use cases from single call"
- Sau đó: "❌ Processing attempt 2/3 failed: LLM call timeout after 2 minutes"
- **Nguyên nhân**: Timeout 2 phút quá ngắn cho response lớn (61364 chars) và parse 48 use cases

### 2. UI loading mãi
- Version status có thể không được update thành "completed"
- `is_processing` flag có thể không được reset
- Frontend polling không detect được completion

## Giải pháp đã triển khai

### 1. Tăng timeout động
- Text nhỏ (< 1000 tokens): 5 phút timeout
- Text lớn: 3 phút timeout
- Đảm bảo đủ thời gian cho parse và normalize

### 2. Reset is_processing flag
- Tất cả các trường hợp completed đều set `is_processing: false`
- Đảm bảo UI dừng loading

### 3. Logging cải thiện
- Log thời gian normalize để debug
- Log timeout được sử dụng

## Cần kiểm tra thêm

1. **LLM đọc token**: ✅ Đúng - Gemini API tự convert text → tokens
2. **Timeout logic**: ✅ Đã tăng timeout động
3. **UI polling**: ✅ Đã đảm bảo reset flag

