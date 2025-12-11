# Refactor Plan: Đơn giản hóa LLM Processing

## Vấn đề hiện tại

1. **Logic batch processing quá phức tạp**: 
   - Với text nhỏ (953 tokens), vẫn chạy vòng lặp batch (tối đa 100 lần)
   - Mỗi batch thử tất cả keys → tốn thời gian không cần thiết
   - Logic offset phức tạp, dễ gây lặp lại

2. **Không tận dụng context window**:
   - Gemini 2.0 Flash có 1M tokens
   - Text 953 tokens → có thể gửi toàn bộ trong 1 lần
   - Không cần batch processing

3. **User requirement đơn giản**:
   - Input dài → trả về usecases phù hợp
   - Không cần logic phức tạp

## Giải pháp

### Strategy 1: Single Call (Text nhỏ)
- Nếu text < 80% context window → gọi 1 lần
- Yêu cầu LLM trả về TẤT CẢ usecases
- Không cần batch, không cần offset

### Strategy 2: Chunking (Text lớn)
- Nếu text > context window → chunk
- Mỗi chunk gọi 1 lần
- Merge kết quả từ tất cả chunks

### Strategy 3: Hybrid (Text rất lớn)
- Chunk + context từ chunks trước
- Đảm bảo không mất context

## Implementation Plan

1. **Tạo function mới: `analyzeRequirementsSimple`**
   - Input: text, language, modelConfig
   - Output: all usecases
   - Logic: Single call hoặc chunking đơn giản

2. **Refactor `analyzeRequirements`**
   - Detect text size
   - Chọn strategy phù hợp
   - Gọi function tương ứng

3. **Tối ưu prompt**
   - Text nhỏ: "Trả về TẤT CẢ usecases từ văn bản"
   - Text lớn: "Trả về usecases từ phần này"

4. **Loại bỏ logic không cần thiết**
   - Batch loop cho text nhỏ
   - Offset tracking phức tạp
   - Retry logic không cần thiết

