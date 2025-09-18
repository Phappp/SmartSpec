<!-- 📌 InputService.ts

Chịu trách nhiệm hash file/text, check duplicate, lưu input.

Tách riêng logic từ đoạn run() hiện tại. -->


<!-- 📌 GeminiService.ts

Chỉ tập trung vào việc gửi prompt, retry với nhiều API key, parse JSON an toàn.

Tách toàn bộ hàm analyzeRequirementsWithGemini. -->


<!-- 📌 RequirementService.ts

Xử lý merge full/incremental.

Dedup, normalize, detect conflict.

Lưu kết quả vào Version.

Tách toàn bộ hàm finalize, normalizeUseCaseIds, mergeUseCasesDedup, resolveDuplicate. -->


<!-- 📌 ApiKeyService.ts

Quản lý API key: getActiveKey, disable key invalid.

Tách logic API key ra khỏi GeminiService. -->


<!-- 📌 UtilService.ts

Các hàm tiện ích: waitForInputsCompletionByIds, splitTextIntoChunks, processWithRateLimit. -->


<!-- 👉 service chỉ còn điều phối (orchestrate):

Gọi InputService → có input.

Chờ hoàn tất.

Gọi RequirementService → phân tích bằng GeminiService.

Trả về kết quả. -->