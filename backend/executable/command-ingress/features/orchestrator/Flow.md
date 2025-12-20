# Usecase Generation Flow (v2)

```
[START] User trigger "Finalize"
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 1: ESTIMATE & COMMIT                         │
│  LLM ước tính VÀ cam kết danh sách usecase sẽ generate          │
│                                                                 │
│  Output:                                                        │
│  {                                                              │
│    "estimated_count": 99,                                       │
│    "committed_usecases": [                                      │
│      { "key": "UC001", "name": "Login", "desc": "..." },        │
│      { "key": "UC002", "name": "Register", "desc": "..." },     │
│      ...                                                        │
│    ]                                                            │
│  }                                                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 2: BATCH PLANNING                            │
│  Chia committed_usecases thành batches                          │
│                                                                 │
│  Batch 1: UC001-UC015 (15 usecases)                             │
│  Batch 2: UC016-UC030 (15 usecases)                             │
│  ...                                                            │
│  Batch 7: UC091-UC099 (9 usecases)                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 3: GENERATE BATCHES                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  GENERATE_BATCH (batch i)                               │    │
│  │  - Input: committed_usecases[batch_i]                   │    │
│  │  - LLM gen chi tiết cho từng usecase đã cam kết         │    │
│  │  - Output: detailed_usecases[]                          │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  SAVE TO TEMP STORAGE                                   │    │
│  │  - Lưu vào memory/Redis/temp collection                 │    │
│  │  - Mark status: "generated" | "missing" | "invalid"     │    │
│  │                                                         │    │
│  │  temp_storage = {                                       │    │
│  │    "UC001": { status: "generated", data: {...} },       │    │
│  │    "UC002": { status: "missing", error: "..." },        │    │
│  │    ...                                                  │    │
│  │  }                                                      │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                     │
│                           │  Loop: batch 2, 3, ... n            │
│                           │◄────────────────────────────────┐   │
│                           │                                 │   │
│                           ▼                                 │   │
│                   ┌───────────────┐                         │   │
│                   │ More batches? │──── YES ────────────────┘   │
│                   └───────┬───────┘                             │
│                           │ NO                                  │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 4: RETRY MISSING                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  CHECK MISSING                                          │    │
│  │  - Scan temp_storage for status = "missing" | "invalid" │    │
│  │  - missing_keys = ["UC005", "UC023", "UC078"]           │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                     │
│                           ▼                                     │
│                   ┌──────────────────────┐                      │
│                   │ Has missing? & <10?  │                      │
│                   └───────┬──────────────┘                      │
│                           │                                     │
│              YES          │          NO                         │
│              ▼            │          ▼                          │
│  ┌────────────────────┐   │   ┌─────────────────────────────┐   │
│  │  RETRY_GENERATE    │   │   │  FINAL LLM RETRY            │   │
│  │  - Gen lại các     │   │   │  (với blacklist)            │   │
│  │    missing keys    │   │   │  - Gọi LLM một lần nữa     │   │
│  │  - Với BLACKLIST:  │   │   │  - Có blacklist để tránh   │   │
│  │    liệt kê các UC  │   │   │    trùng lặp                 │   │
│  │    đã có (❌)      │   │   │  - KHÔNG dùng mock data     │   │
│  │  - Update temp     │   │   └───────────┬─────────────────┘   │
│  │    storage         │   │               │                     │
│  └─────────┬──────────┘   │               │                     │
│            │              │               ▼                     │
│            │  retry++     │   ┌─────────────────────────────┐   │
│            │◄─────────────┘   │  Continue to Phase 5        │   │
│            │                  └─────────────────────────────┘   │
│            │                                                    │
└────────────┼────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 5: FINAL VALIDATION                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  VALIDATE ALL                                           │    │
│  │  - Đọc toàn bộ temp_storage                             │    │
│  │  - Check: count == estimated_count?                     │    │
│  │  - Validate schema cho từng usecase                     │    │
│  │  - Check duplicates (name, goal)                        │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                     │
│                           ▼                                     │
│                   ┌───────────────────┐                         │
│                   │ All valid?        │                         │
│                   └───────┬───────────┘                         │
│                           │                                     │
│              YES          │          NO                         │
│              ▼            │          ▼                          │
│  ┌────────────────────┐   │   ┌────────────────────┐            │
│  │  Continue to       │   │   │  Log warnings,     │            │
│  │  Phase 6           │   │   │  filter invalid,   │            │
│  └────────────────────┘   │   │  continue          │            │
│                           │   └────────────────────┘            │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 6: ATOMIC SAVE TO DATABASE                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  STEP 1: BATCH INSERT (attempt 1-3)                     │    │
│  │  - Start MongoDB transaction                            │    │
│  │  - insertMany(all_valid_usecases, { ordered: false })   │    │
│  │  - Commit transaction                                   │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                     │
│                           ▼                                     │
│                   ┌───────────────────┐                         │
│                   │ Insert success?   │                         │
│                   └───────┬───────────┘                         │
│                           │                                     │
│         YES               │               NO                    │
│         ▼                 │               ▼                     │
│  ┌────────────────┐       │    ┌─────────────────────────────┐  │
│  │     DONE ✅    │       │    │  STEP 2: ANALYZE ERRORS     │  │
│  │  Clear temp    │       │    │  - Parse MongoDB errors     │  │
│  │  Return result │       │    │  - Categorize:              │  │
│  │  Broadcast     │       │    │                             │  │
│  │  savedCount    │       │    │                             │  │
│  └────────────────┘       │    │    • validation_errors[]    │  │
│                           │    │    • duplicate_errors[]     │  │
│                           │    │    • connection_errors[]    │  │
│                           │    └──────────────┬──────────────┘  │
│                           │                   │                 │
│                           │                   ▼                 │
│                           │    ┌─────────────────────────────┐  │
│                           │    │  STEP 3: LLM SELF-REPAIR    │  │
│                           │    │  (for validation_errors)    │  │
│                           │    │                             │  │
│                           │    │  Prompt:                    │  │
│                           │    │  "Fix this usecase:         │  │
│                           │    │   {broken_usecase}          │  │
│                           │    │   Error: {error_message}    │  │
│                           │    │   Schema: {expected_schema} │  │
│                           │    │   Return fixed JSON only"   │  │
│                           │    │                             │  │
│                           │    │  → LLM returns fixed UC     │  │
│                           │    └──────────────┬──────────────┘  │
│                           │                   │                 │
│                           │                   ▼                 │
│                           │    ┌─────────────────────────────┐  │
│                           │    │  STEP 4: RETRY INSERT       │  │
│                           │    │  - Insert fixed usecases    │  │
│                           │    │  - Max 2 repair attempts    │  │
│                           │    └──────────────┬──────────────┘  │
│                           │                   │                 │
│                           │                   ▼                 │
│                           │    ┌─────────────────────────────┐  │
│                           │    │  STEP 5: FALLBACK           │  │
│                           │    │  (if still failing)         │  │
│                           │    │                             │  │
│                           │    │  - Insert one-by-one        │  │
│                           │    │  - Skip permanently broken  │  │
│                           │    │  - Log failed UCs for       │  │
│                           │    │    manual review            │  │
│                           │    └──────────────┬──────────────┘  │
│                           │                   │                 │
│                           │                   ▼                 │
│                           │    ┌─────────────────────────────┐  │
│                           │    │  STEP 6: FINAL REPORT       │  │
│                           │    │                             │  │
│                           │    │  {                          │  │
│                           │    │    total_expected: 99,      │  │
│                           │    │    saved: 96,               │  │
│                           │    │    repaired_by_llm: 3,      │  │
│                           │    │    skipped: 0,              │  │
│                           │    │    failed: []               │  │
│                           │    │  }                          │  │
│                           │    └──────────────────────────────┘  │
│                           │                                     │
└───────────────────────────┴─────────────────────────────────────┘
```
