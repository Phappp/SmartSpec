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
│                   ┌───────────────────┐                         │
│                   │ Has missing? & <3 │                         │
│                   └───────┬───────────┘                         │
│                           │                                     │
│              YES          │          NO                         │
│              ▼            │          ▼                          │
│  ┌────────────────────┐   │   ┌────────────────────┐            │
│  │  RETRY_GENERATE    │   │   │  Continue to       │            │
│  │  - Gen lại các     │   │   │  Phase 5           │            │
│  │    missing keys    │   │   └────────────────────┘            │
│  │  - Update temp     │   │                                     │
│  │    storage         │   │                                     │
│  └─────────┬──────────┘   │                                     │
│            │              │                                     │
│            │  retry++     │                                     │
│            │◄─────────────┘                                     │
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
│  │  - Check related_usecases references                    │    │
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
│  │  TRANSACTION SAVE                                       │    │
│  │  - Start MongoDB transaction (if supported)             │    │
│  │  - insertMany(all_valid_usecases)                       │    │
│  │  - Commit transaction                                   │    │
│  │  - Clear temp_storage                                   │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                     │
│                           ▼                                     │
│                   ┌───────────────────┐                         │
│                   │ Save success?     │                         │
│                   └───────┬───────────┘                         │
│                           │                                     │
│              YES          │          NO                         │
│              ▼            │          ▼                          │
│  ┌────────────────────┐   │   ┌────────────────────┐            │
│  │       DONE         │   │   │  Rollback,         │            │
│  │  Return usecases   │   │   │  Log error,        │            │
│  │  Broadcast success │   │   │  Return partial    │            │
│  └────────────────────┘   │   └────────────────────┘            │
│                           │                                     │
└───────────────────────────┴─────────────────────────────────────┘
```

## Key Improvements (v2 vs v1):

| Aspect | v1 (Current) | v2 (Proposed) |
|--------|--------------|---------------|
| **Estimate** | Chỉ trả về số lượng | Cam kết danh sách cụ thể |
| **Tracking** | Không track từng UC | Track theo key (UC001, UC002...) |
| **Save** | Save ngay mỗi batch | Lưu tạm → validate → save 1 lần |
| **Missing** | Retry toàn bộ batch | Retry chính xác UC bị missing |
| **Consistency** | Có thể partial save | Atomic save (all or nothing) |

## Temp Storage Structure:

```typescript
interface TempStorage {
  [key: string]: {
    status: 'pending' | 'generated' | 'missing' | 'invalid';
    committed: {
      key: string;
      name: string;
      desc: string;
    };
    generated?: UsecaseData;
    error?: string;
    retryCount: number;
  }
}
```

## Benefits:

1. **Traceability** - Biết chính xác UC nào missing, tại sao
2. **Reliability** - Retry chính xác, không gen trùng
3. **Consistency** - Save 1 lần, không có partial data
4. **Debugging** - Dễ debug khi có lỗi

---

## PHASE 6 DETAIL: Atomic Save với Retry + Fallback + LLM Self-Repair

```
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
│                           │    │  - Max 3 repair attempts    │  │
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

## LLM Self-Repair Prompt Template:

```typescript
const repairPrompt = (brokenUsecase: any, error: string) => `
🔧 **FIX THIS USECASE**

**BROKEN DATA:**
${JSON.stringify(brokenUsecase, null, 2)}

**ERROR MESSAGE:**
${error}

**EXPECTED SCHEMA:**
{
  "name": "string (required)",
  "actor": { "id": "string", "name": "string", "description": "string" },
  "goal": "string (required)",
  "main_flow": [{ "step": number, "actor": "string", "action": "string", "expected_result": "string" }],
  "business_reason": "string",
  "context": { "module": "string", "scope": "string", "system": "string" },
  "trigger": { "event": "string", "source": "string" },
  "preconditions": ["string"],
  "postconditions": ["string"],
  "exceptions": [{ "id": "string", "at_step": number, "type": "string", "description": "string", "system_response": "string" }],
  "rules": [{ "id": "string", "description": "string" }],
  "inputs": [{ "name": "string", "type": "string", "required": boolean }],
  "outputs": [{ "name": "string", "type": "string", "optional": boolean }],
  "non_functional_constraints": ["string"]
}

**REQUIREMENTS:**
1. Fix the error while preserving original intent
2. Ensure all required fields are present
3. Return ONLY valid JSON, no explanations
4. Keep original name and goal if valid

**RETURN FIXED JSON:**
`;
```

## Error Categories & Actions:

| Error Type | Action | LLM Repair? |
|------------|--------|-------------|
| `ValidationError: missing name` | LLM repair | ✅ Yes |
| `ValidationError: invalid actor` | LLM repair | ✅ Yes |
| `ValidationError: empty main_flow` | LLM repair | ✅ Yes |
| `DuplicateKeyError` | Skip (already exists) | ❌ No |
| `ConnectionError` | Retry with backoff | ❌ No |
| `TimeoutError` | Retry with backoff | ❌ No |

## Implementation Code:

```typescript
interface SaveResult {
  success: boolean;
  total_expected: number;
  saved: number;
  repaired_by_llm: number;
  skipped: number;
  failed: Array<{ key: string; error: string; data: any }>;
}

async function atomicSaveWithRepair(
  validUsecases: any[],
  geminiService: GeminiService
): Promise<SaveResult> {
  const MAX_RETRIES = 3;
  const MAX_REPAIR_ATTEMPTS = 2;
  
  let toInsert = [...validUsecases];
  let saved: any[] = [];
  let repaired = 0;
  let skipped = 0;
  let failed: any[] = [];

  // Step 1: Try batch insert
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await Usecase.insertMany(toInsert, { ordered: false });
      saved.push(...result);
      toInsert = []; // All inserted
      break;
    } catch (error: any) {
      if (error.name === 'BulkWriteError') {
        // Some succeeded, some failed
        const writeErrors = error.writeErrors || [];
        const successCount = toInsert.length - writeErrors.length;
        
        // Collect failed ones
        const failedIndices = new Set(writeErrors.map((e: any) => e.index));
        const failedUsecases = toInsert.filter((_, i) => failedIndices.has(i));
        const succeededUsecases = toInsert.filter((_, i) => !failedIndices.has(i));
        
        saved.push(...succeededUsecases);
        
        // Step 3: LLM Self-Repair for validation errors
        const repairable = writeErrors.filter((e: any) => 
          e.code === 121 || // Document validation error
          e.errmsg?.includes('validation')
        );
        
        for (const err of repairable) {
          const brokenUC = toInsert[err.index];
          
          for (let repairAttempt = 1; repairAttempt <= MAX_REPAIR_ATTEMPTS; repairAttempt++) {
            try {
              console.log(`🔧 [LLM REPAIR] Attempting to fix: ${brokenUC.name}`);
              const fixedUC = await geminiService.repairUsecase(brokenUC, err.errmsg);
              
              if (fixedUC) {
                const doc = await Usecase.create(fixedUC);
                saved.push(doc);
                repaired++;
                console.log(`✅ [LLM REPAIR] Fixed: ${brokenUC.name}`);
                break;
              }
            } catch (repairErr) {
              if (repairAttempt === MAX_REPAIR_ATTEMPTS) {
                failed.push({ 
                  key: brokenUC.name, 
                  error: err.errmsg, 
                  data: brokenUC 
                });
              }
            }
          }
        }
        
        // Handle duplicates - skip
        const duplicates = writeErrors.filter((e: any) => e.code === 11000);
        skipped += duplicates.length;
        
        toInsert = []; // Processed all
      } else if (attempt < MAX_RETRIES) {
        // Connection error - retry
        await delay(1000 * attempt);
        continue;
      } else {
        // Step 5: Fallback - insert one by one
        for (const uc of toInsert) {
          try {
            const doc = await Usecase.create(uc);
            saved.push(doc);
          } catch (e: any) {
            failed.push({ key: uc.name, error: e.message, data: uc });
          }
        }
        toInsert = [];
      }
    }
  }

  return {
    success: failed.length === 0,
    total_expected: validUsecases.length,
    saved: saved.length,
    repaired_by_llm: repaired,
    skipped,
    failed
  };
}
```
