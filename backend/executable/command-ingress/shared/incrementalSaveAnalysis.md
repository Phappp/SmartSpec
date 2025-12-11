# Phân tích: Batch Save vs Incremental Save

## Hiện tại (Batch Save)

### Cách hoạt động:
1. LLM trả về toàn bộ JSON array (48 usecases)
2. Parse toàn bộ JSON array một lần
3. Normalize tất cả usecases
4. Save batch vào DB (insertMany)

### Ưu điểm:
- ✅ Performance tốt (batch insert nhanh hơn)
- ✅ Ít database operations
- ✅ Transaction đơn giản

### Nhược điểm:
- ❌ User phải chờ lâu mới thấy kết quả
- ❌ Nếu lỗi giữa chừng → mất toàn bộ
- ❌ Không có real-time feedback

## Đề xuất (Incremental Save)

### Cách hoạt động:
1. LLM trả về JSON array
2. Parse streaming: Parse từng usecase ngay khi có
3. Save từng usecase ngay khi parse được
4. Broadcast realtime cho frontend

### Ưu điểm:
- ✅ User thấy kết quả ngay (UX tốt hơn)
- ✅ Nếu lỗi → vẫn giữ được usecases đã parse
- ✅ Real-time feedback cho user
- ✅ Progress tracking chính xác hơn

### Nhược điểm:
- ⚠️ Nhiều database operations hơn
- ⚠️ Có thể chậm hơn một chút (nhưng không đáng kể)

## Kết luận

**Incremental Save tối ưu và thân thiện với user hơn** vì:
1. User experience tốt hơn (thấy kết quả ngay)
2. Resilient hơn (không mất data khi lỗi)
3. Real-time feedback

## Giải pháp đã triển khai ✅

### 1. Parse và Normalize
- Parse toàn bộ JSON array (như hiện tại - LLM trả về hoàn chỉnh)
- Normalize từng usecase
- **Không thể parse streaming** vì LLM trả về JSON array hoàn chỉnh

### 2. Save Incremental ✅
- **Batch nhỏ (5 usecases)** để user thấy kết quả ngay
- Save từng batch ngay sau khi normalize
- Delay 100ms giữa các batch để tránh overload DB
- User thấy progress realtime

### 3. Broadcast Realtime ✅
- Emit `INCREMENTAL_PROGRESS` event sau mỗi batch
- Frontend nhận được progress update ngay lập tức
- User thấy usecases xuất hiện từng batch một

## Kết quả

✅ **Incremental Save đã được triển khai**
- User thấy kết quả ngay (không phải chờ toàn bộ)
- Resilient hơn (không mất data khi lỗi)
- Real-time feedback cho user
- Performance vẫn tốt (batch nhỏ 5 usecases)

