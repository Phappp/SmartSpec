import { Request, Response } from 'express';
import { LLMService } from '../../../shared/LLMService';
import User from '../../../../../internal/model/user';

export class LLMController {
    private llmService: LLMService;

    constructor() {
        this.llmService = new LLMService();
    }

    /**
     * ✅ GET /api/llm/available-models
     * Lấy danh sách các models có thể sử dụng
     */
    async getAvailableModels(req: Request, res: Response) {
        try {
            const category = req.query.category as 'agent' | 'worker' | 'specialized' | undefined;

            const models = await this.llmService.getAvailableModels(category);

            return res.status(200).json({
                success: true,
                data: models,
                message: `Found ${models.length} available models`
            });
        } catch (error: any) {
            console.error('Error getting available models:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get available models'
            });
        }
    }

    /**
     * ✅ POST /api/llm/validate-model
     * Validate model có thể sử dụng được không
     */
    async validateModel(req: Request, res: Response) {
        try {
            const { modelName } = req.body;

            if (!modelName) {
                return res.status(400).json({
                    success: false,
                    message: 'Model name is required'
                });
            }

            const validation = await this.llmService.validateModel(modelName);

            return res.status(200).json({
                success: true,
                data: validation
            });
        } catch (error: any) {
            console.error('Error validating model:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to validate model'
            });
        }
    }

    /**
     * ✅ POST /api/llm/save-model-preference
     * Lưu model preference của user vào database
     */
    async saveModelPreference(req: any, res: Response) {
        try {
            const userId = req.getSubject?.();
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            const { modelName } = req.body;

            if (!modelName) {
                return res.status(400).json({
                    success: false,
                    message: 'Model name is required'
                });
            }

            // ✅ CẢI THIỆN: Nếu model có format OpenRouter (có /), chỉ cần check OpenRouter keys
            // Không cần validate phức tạp vì OpenRouter có thể dùng nhiều models
            console.log(`🔍 [saveModelPreference] Validating model: ${modelName}`);

            if (modelName.includes('/')) {
                // Model OpenRouter format → chỉ cần check OpenRouter keys qua validateModel
                const validation = await this.llmService.validateModel(modelName);
                if (!validation.valid) {
                    console.warn(`⚠️ [saveModelPreference] OpenRouter model "${modelName}" validation failed: ${validation.reason}`);
                    return res.status(400).json({
                        success: false,
                        message: validation.reason || 'OpenRouter API key is required for this model. Please add an OpenRouter API key first.'
                    });
                }
                console.log(`✅ [saveModelPreference] OpenRouter model "${modelName}" validated (OpenRouter keys available)`);
            } else {
                // Validate model có thể dùng được không (cho non-OpenRouter models)
                const validation = await this.llmService.validateModel(modelName);
                if (!validation.valid) {
                    console.warn(`⚠️ [saveModelPreference] Model "${modelName}" validation failed: ${validation.reason}`);
                    return res.status(400).json({
                        success: false,
                        message: validation.reason || 'Model is not available'
                    });
                }
                console.log(`✅ [saveModelPreference] Non-OpenRouter model "${modelName}" validated successfully`);
            }

            // Lưu vào database
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (!user.setting) {
                user.setting = { language: 'vi', theme: 'light', selectedModel: null };
            }

            // ✅ Lưu model vào setting
            (user.setting as any).selectedModel = modelName;

            // ✅ Log trước khi save
            console.log(`💾 [saveModelPreference] Saving model preference for user ${userId}:`);
            console.log(`   - Current setting:`, JSON.stringify(user.setting));
            console.log(`   - New selectedModel: ${modelName}`);

            await user.save();

            // ✅ Verify sau khi save
            const savedUser = await User.findById(userId).lean();
            const savedModel = (savedUser as any)?.setting?.selectedModel;
            console.log(`✅ [saveModelPreference] User ${userId} selected model saved: ${savedModel}`);

            if (savedModel !== modelName) {
                console.error(`❌ [saveModelPreference] Model mismatch! Expected: ${modelName}, Got: ${savedModel}`);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to save model preference. Please try again.'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Model preference saved successfully',
                data: { modelName }
            });
        } catch (error: any) {
            console.error('Error saving model preference:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to save model preference'
            });
        }
    }

    /**
     * ✅ GET /api/llm/get-model-preference
     * Lấy model preference của user từ database
     */
    async getModelPreference(req: any, res: Response) {
        try {
            const userId = req.getSubject?.();
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            const user = await User.findById(userId).lean();
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const selectedModel = (user as any).setting?.selectedModel || null;

            return res.status(200).json({
                success: true,
                data: { modelName: selectedModel }
            });
        } catch (error: any) {
            console.error('Error getting model preference:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get model preference'
            });
        }
    }
}
