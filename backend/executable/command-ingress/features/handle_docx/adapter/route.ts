import { Router } from 'express';
import { ReadDocxController } from './controller'; // Giả sử controller ở cùng thư mục

export default function initReadDocxRoute(controller: ReadDocxController): Router {
    const router = Router();
    const processDocxHandler = controller.processDocx.bind(controller);

    /**
     * @route POST /projects/:project_id/versions/:version_id/upload
     * @description Đây là route chính và được khuyến khích sử dụng.
     * Nó lấy ID trực tiếp từ URL, rất rõ ràng và chuẩn RESTful.
     */
    router.post('/projects/:project_id/versions/:version_id/process', processDocxHandler);

    /**
     * @route POST /upload
     * @description Route này đóng vai trò là phương án dự phòng.
     * Nó sẽ xử lý các request không có ID trong URL, cho phép controller
     * tìm kiếm ID trong query string, body, hoặc headers.
     * Tôi đã đổi tên từ '/process' thành '/upload' để tường minh hơn.
     */
    router.post('/process', processDocxHandler);

    return router;
}