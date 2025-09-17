// features/handle_audio/adapter/route.ts
import { Router } from 'express';
import { OcrController } from './controller';
import requireAuthorizedUser from '../../../middlewares/auth'; // Giả sử bạn có middleware xác thực

export default function initSpeechRoute(controller: OcrController): Router {
    const router = Router();
    const uploadImageHandler = controller.processImage.bind(controller);

    /**
     * @route POST /projects/:project_id/versions/:version_id/upload-audio
     * @description Route chính, được khuyến khích sử dụng, tuân thủ chuẩn RESTful.
     */
    router.post(
        '/projects/:project_id/versions/:version_id/process',
        uploadImageHandler
    );

    /**
     * @route POST /upload-audio
     * @description Route dự phòng (fallback) cho các trường hợp client
     * gửi ID qua query string, body, hoặc headers.
     * Đổi tên từ '/process' để rõ nghĩa hơn.
     */
    router.post(
        '/process',
        uploadImageHandler
    );

    return router;
}