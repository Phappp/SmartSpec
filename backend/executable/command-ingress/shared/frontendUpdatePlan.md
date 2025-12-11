# Kế hoạch cập nhật Frontend cho Incremental Save

## Hiện trạng

### Backend đã làm:
- ✅ Save từng batch 5 usecases ngay khi parse được
- ✅ Emit `INCREMENTAL_PROGRESS` event sau mỗi batch
- ✅ Progress update realtime (40-90%)

### Frontend hiện tại:
- ✅ Đã có `handleIncrementalProgress` để nhận event
- ❌ Chỉ refresh data khi `isProcessing = false` (completed)
- ❌ Không refresh usecases trong lúc đang processing

## Vấn đề

User không thấy usecases mới xuất hiện ngay trong lúc đang processing, phải chờ đến khi completed.

## Giải pháp đề xuất

### Option 1: Refresh usecases khi nhận progress update (Đơn giản nhất) ✅
- Khi nhận `INCREMENTAL_PROGRESS` event và `isProcessing = true`
- Fetch usecases mới từ API (không fetch toàn bộ project)
- Update UI ngay lập tức

### Option 2: Polling usecases trong lúc processing
- Thêm polling interval khi `isProcessingIncremental = true`
- Poll usecases mới mỗi 2-3 giây
- Dừng khi completed

### Option 3: Emit từng batch usecases (Phức tạp hơn)
- Backend emit event mới `USECASES_INCREMENTAL` với danh sách usecases
- Frontend nhận và thêm vào list ngay

## Khuyến nghị: Option 1

**Lý do:**
- Đơn giản, dễ implement
- Không cần thay đổi backend
- Hiệu quả (chỉ fetch usecases khi có update)
- User thấy kết quả ngay

## Implementation

### 1. Cải thiện `handleIncrementalProgress`
```javascript
handleIncrementalProgress(event) {
  // ... existing code ...
  
  // ✅ MỚI: Refresh usecases ngay khi nhận progress update
  if (event.isProcessing) {
    // Fetch usecases mới trong lúc processing
    this.fetchUseCasesIncremental(event.versionId)
  }
  
  // Nếu hoàn thành, refresh toàn bộ data
  if (!event.isProcessing) {
    setTimeout(() => {
      this.fetchProjectData(this.project._id)
    }, 1000)
  }
}
```

### 2. Thêm method `fetchUseCasesIncremental`
```javascript
async fetchUseCasesIncremental(versionId) {
  try {
    const response = await getUseCasesByVersion(versionId)
    if (response.data && response.data.data) {
      // Merge usecases mới vào list hiện tại
      const newUseCases = response.data.data
      const existingIds = new Set(this.useCases.map(uc => uc.id || uc._id))
      
      newUseCases.forEach(uc => {
        const id = uc.id || uc._id
        if (!existingIds.has(id)) {
          this.useCases.push(uc)
          existingIds.add(id)
        }
      })
      
      this.$forceUpdate()
    }
  } catch (error) {
    console.error('Error fetching incremental usecases:', error)
  }
}
```

### 3. Thêm API endpoint (nếu chưa có)
- `GET /api/usecases/version/:versionId` - Lấy usecases theo version

