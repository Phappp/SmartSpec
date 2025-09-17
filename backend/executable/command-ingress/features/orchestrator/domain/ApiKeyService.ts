import ApiKey from "../../../../../internal/model/api_key";

export type Provider = "gemini" | "openai" | "claude";

export class ApiKeyService {
    /**
     * Lấy API key đang active mới nhất của 1 provider
     */
    async getActiveKey(provider: Provider): Promise<string | null> {
        const keyDoc = await ApiKey.findOne({ provider, is_active: true }).sort({ updatedAt: -1 });
        return keyDoc ? (keyDoc as any).key_value : null;
    }

    /**
     * Lấy tất cả API key đang active của 1 provider (sắp xếp mới nhất trước)
     */
    async getAllActiveKeys(provider: Provider): Promise<{ _id: string; key_value: string }[]> {
        const keys = await ApiKey.find({ provider, is_active: true })
            .sort({ updatedAt: -1 })
            .lean();

        return keys.map((k: any) => ({
            _id: String(k._id),
            key_value: k.key_value,
        }));
    }

    /**
     * Disable một API key (thường khi bị invalid/unauthorized)
     */
    async disableKey(keyId: string): Promise<void> {
        await ApiKey.updateOne(
            { _id: keyId },
            { $set: { is_active: false, updatedAt: new Date() } }
        );
    }
}
