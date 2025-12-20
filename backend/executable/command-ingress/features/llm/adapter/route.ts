import { Router } from 'express';
import { LLMController } from './controller';
import { requireAuthorizedUser } from '../../../middlewares/auth';

const router = Router();
const controller = new LLMController();

/**
 * ✅ GET /api/llm/available-models
 * Lấy danh sách các models có thể sử dụng
 * Query params: category (optional) - 'agent' | 'worker' | 'specialized'
 */
router.get('/available-models', requireAuthorizedUser, (req, res) => {
    controller.getAvailableModels(req, res);
});

/**
 * ✅ POST /api/llm/validate-model
 * Validate model có thể sử dụng được không
 * Body: { modelName: string }
 */
router.post('/validate-model', requireAuthorizedUser, (req, res) => {
    controller.validateModel(req, res);
});

/**
 * ✅ POST /api/llm/save-model-preference
 * Lưu model preference của user vào database
 * Body: { modelName: string }
 */
router.post('/save-model-preference', requireAuthorizedUser, (req: any, res) => {
    controller.saveModelPreference(req, res);
});

/**
 * ✅ GET /api/llm/get-model-preference
 * Lấy model preference của user từ database
 */
router.get('/get-model-preference', requireAuthorizedUser, (req: any, res) => {
    controller.getModelPreference(req, res);
});

export default function initLLMRoute(): Router {
    return router;
}

