# Fix Incremental Save - Rà soát và sửa lỗi

## Vấn đề phát hiện

User báo: Vẫn save 1 lần toàn bộ, không phải incremental save.

## Nguyên nhân

1. ✅ **Đã có incremental save trong loop** (dòng 676)
2. ❌ **Vẫn có batch save cuối** (dòng 950-957) - Đây là vấn đề!
3. ⚠️ Logic check `totalUseCasesCreated > 0` có thể không hoạt động đúng

## Đã sửa

### 1. Thêm logging chi tiết
- Log khi bắt đầu incremental save
- Log số lượng usecases saved
- Log khi skip batch save cuối
- Log khi vào fallback (batch save cũ)

### 2. Fix insertMany return value
- `insertMany` trả về array, cần lấy `length`
- Xử lý cả trường hợp `BulkWriteError`

### 3. Cải thiện logic check
- Rõ ràng hơn khi nào skip batch save cuối
- Log rõ ràng khi vào fallback

## Cần kiểm tra

1. ✅ `totalUseCasesCreated` có được tăng đúng không?
2. ✅ `savePartialUseCasesIncremental` có return đúng số lượng không?
3. ✅ Có exception nào khiến code nhảy vào fallback không?

## Kết quả mong đợi

- ✅ Incremental save hoạt động đúng (save từng batch 5 usecases)
- ✅ Skip batch save cuối nếu đã save incremental
- ✅ Log rõ ràng để debug

