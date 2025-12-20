# Testcase Generation Flow (orchestrator-style)

```
[START] User trigger "Generate Testcases"
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│        PHASE 1: ESTIMATE & COMMIT                                │
│  LLM ước tính VÀ cam kết danh sách testcases sẽ generate         │
│                                                                  │
│  Output:                                                         │
│  {                                                               │
│    "estimated_count": 88,                                       │
│    "committed_requirements": [                                  │
│      { "id": "UC001", "name": "Đăng nhập", ...},           │
│      ...                                                         │
│    ]                                                             │
│  }                                                               │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│        PHASE 2: BATCH PLANNING                                   │
│  Chia committed_requirements thành batches testcases              │
│                                                                  │
│  Batch 1: UC001-UC020 (20 testcases)                             │
│  Batch 2: UC021-UC040 (20 testcases)                             │
│  ...                                                             │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│        PHASE 3: GENERATE BATCHES                                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │  GENERATE_BATCH (batch i)                                │     │
│  │  - Input: committed_requirements[batch_i], database,...  │     │
│  │  - LLM gen chi tiết cho từng testcase đã cam kết         │     │
│  │  - Output: detailed_testcases[] (dạng JSON chuẩn)        │     │
│  └────────────────────────┬─────────────────────────────────┘     │
│                           │                                        │
│                           ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │       SAVE TO TEMP STORAGE                               │      │
│  │  - Lưu vào Redis/tập in-memory HOẶC collection tạm       │      │
│  │  - Mark status: "generated" | "missing" | "invalid"   │      │
│  │                                                          │      │
│  │  temp_storage = {                                        │      │
│  │    "1": { status: "generated", data: {...} },           │      │
│  │    "2": { status: "missing", error: "..." },           │      │
│  │    ...                                                   │      │
│  │  }                                                       │      │
│  └────────────────────────┬─────────────────────────────────┘      │
│                           │                                        │
│                           │  Loop: batch 2, 3, ... n               │
│                           │◄─────────────────────────────────┐     │
│                           │                                  │     │
│                           ▼                                  │     │
│                    ┌───────────────┐                         │     │
│                    │ More batches? │──── YES ────────────────┘     │
│                    └─────┬────────┘                                │
│                          │ NO                                       │
└───────────────────────────┼──────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│        PHASE 4: RETRY MISSING                                   │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │   CHECK MISSING                                        │    │
│  │   - Scan temp_storage for status = "missing" | "invalid" │ │
│  │   - missing_indexes = [5, 8, 21]                        │    │
│  └────────────────────────────────┬────────────────────────┘    │
│                                  ▼                             │
│                    ┌─────────────────────┐                    │
│                    │  Has missing?       │                    │
│                    └───────┬─────────────┘                    │
│                            │                                   │
│             YES            │             NO                    │
│             ▼              │             ▼                     │
│   ┌────────────────────┐   │   ┌───────────────────────────┐   │
│   │   RETRY_GENERATE   │   │   │       PHASE 5: FINAL      │   │
│   │   - Gen lại những  │   │   │       VALIDATION          │   │
│   │     testcase còn thiếu │   │   │                       │   │
│   │   - Update temp    │   │   │                       │   │
│   │     storage        │   │   │                       │   │
│   └─────┬──────────────┘   │   └───────┬─────────────┘   │
│         │ retry++         │            │                 │
│         │◄────────────────┘            │                 │
│         ▼                             ▼                 │
│ ┌────────────────────────────┐  ┌──────────────────────┐│
│ │ Loop lại retry (tối đa N)  │  │ ALL TESTCASES VALID? ││
│ └─────────┬──────────────────┘  └──────────┬───────────┘│
│           │                                  │           │
└───────────┼──────────────────────────────────┼───────────┘
            │                                  │           
            ▼                                  ▼           
┌──────────────────────────────────────────────────────────┐  
│      PHASE 5: FINAL VALIDATION                          │
│  - Đọc toàn bộ temp_storage                             │
│  - Check: count == estimated_count?                     │
│  - Validate schema cho từng testcase                    │
│  - Check duplicates (title)                             │
│                                                        │
│      ALL TESTCASES VALID?                              │
│          │              │                               │
│         YES            NO                               │
│          ▼              ▼                               │
│  ┌──────────────────┐  ┌────────────────────────────┐   │
│  │ Tiếp sang phase6 │  │ Log/filter invalid, tiếp  │   │
│  │  (ATOMIC SAVE)   │  │ tục phase6 với testcases  │   │
│  └──────────────────┘  └───────────┬────────────────┘   │
│                                     ▼                   │
└─────────────────────────────────────┼───────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────┐
│      PHASE 6: ATOMIC SAVE TO DATABASE                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │  STEP 1: BATCH INSERT (attempt 1-3)               │  │
│  │  - Start MongoDB transaction                      │  │
│  │  - insertMany(all_valid_testcases, {ordered: false})││
│  │  - Commit transaction                             │  │
│  └────────────────────────┬──────────────────────────┘  │
│                           ▼                             │
│                  Insert thành công?                     │
│                   │           │                         │
│                  YES         NO                         │
│                   ▼           ▼                         │
│             ┌────────┐  ┌──────────────────────────┐    │
│             │  DONE  │  │  PHÂN TÍCH LỖI           │    │
│             │  ✅    │  │  - Retry insert từng cái │    │
│             └────────┘  │  - Log lại testcase fail │    │
│                         └──────────┬──────────────┘    │
│                                    ▼                   │
│               Báo cáo cuối cùng:                       │
│               { total_expected: 88, saved: 85,        │
│                 repaired_by_llm: 2, skipped: 1,        │
│                 failed: ["Testcase 17"] }             │
└────────────────────────────────────────────────────────┘
```

## Trạng thái testcase trong temp storage ví dụ
```json
{
   "5": { "status": "missing", "error": "LLM timeout" },
   "8": { "status": "invalid", "error": "Missing title" },
   "13": { "status": "generated", "data": { ... } },
   ...
}
```

## Ghi chú khác biệt nổi bật so với flow orchestrator
- Input là danh sách requirement+testType, tiến hành trên từng requirement nhưng status batch/testcase vẫn gồm: generated/missing/invalid
- Hỗ trợ resumeState để PAUSE và RESUME từ batch bị lỗi (quota/rate limit...)
- Tối đa 3 lần retry cho missing/invalid, sau đó sẽ báo cáo luôn (giống orchestrator)
- Chặn duplicate title ngay khi validate, chỉ những testcase hợp lệ mới commit vào DB
- Ghi log, và trả về báo cáo cuối cùng sau khi hoàn tất atomic insert

## Báo cáo cuối ví dụ
```json
{
  "total_expected": 88,
  "saved": 85,
  "repaired_by_llm": 2,
  "skipped": 1,
  "failed": ["Testcase 17"]
}
```
