// features/handle_audio/adapter/route.ts
import { Router } from 'express';
import { SpeechController } from './controller';
import requireAuthorizedUser from '../../../middlewares/auth'; // Giả sử bạn có middleware xác thực

export default function initSpeechRoute(controller: SpeechController): Router {
    const router = Router();
    const uploadAudioHandler = controller.uploadAudio.bind(controller);

    /**
     * @route POST /projects/:project_id/versions/:version_id/upload-audio
     * @description Route chính, được khuyến khích sử dụng, tuân thủ chuẩn RESTful.
     */
    router.post(
        '/projects/:project_id/versions/:version_id/process',
        uploadAudioHandler
    );

    /**
     * @route POST /upload-audio
     * @description Route dự phòng (fallback) cho các trường hợp client
     * gửi ID qua query string, body, hoặc headers.
     * Đổi tên từ '/process' để rõ nghĩa hơn.
     */
    router.post(
        '/process',
        uploadAudioHandler
    );

    return router;
}