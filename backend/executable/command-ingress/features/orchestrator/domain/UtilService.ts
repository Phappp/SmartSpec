import Input from "../../../../../internal/model/input";

export class UtilService {
    /**
     * Chờ cho tới khi tất cả inputs trong danh sách hoàn tất (completed/failed)
     */
    async waitForInputsCompletionByIds(
        inputIds: string[],
        timeoutMs = 120000,
        pollMs = 1500
    ) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const inputs = await Input.find({ _id: { $in: inputIds } }).lean();
            console.log(`Waiting: ${inputs.length}/${inputIds.length} inputs fetched`);

            if (
                inputs.length === inputIds.length &&
                inputs.every(
                    (i: any) =>
                        i.processing_status === "completed" ||
                        i.processing_status === "failed"
                )
            ) {
                return inputs;
            }
            await this.delay(pollMs);
        }
        // Timeout → return whatever we have
        return await Input.find({ _id: { $in: inputIds } }).lean();
    }

    /**
     * Delay tiện ích
     */
    async delay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
