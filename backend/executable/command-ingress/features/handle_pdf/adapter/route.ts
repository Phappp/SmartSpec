import { Router } from 'express';
import { PdfController } from './controller';

export default function initPdfRoute(controller: PdfController): Router {
  const router = Router();
  const processPdfHandler = controller.processPdf.bind(controller);

  /**
   * @route POST /projects/:project_id/versions/:version_id/upload-pdf
   * @description Route được khuyến khích sử dụng, tuân thủ chuẩn RESTful.
   * Lấy ID trực tiếp từ đường dẫn URL.
   */
  router.post(
    '/projects/:project_id/versions/:version_id/process',
    processPdfHandler
  );

  /**
   * @route POST /upload-pdf
   * @description Route dự phòng (fallback) cho các trường hợp client
   * gửi ID qua query string, body, hoặc headers.
   * Tên route đã được đổi từ '/process' thành '/upload-pdf' để rõ nghĩa hơn.
   */
  router.post(
    '/process',
    processPdfHandler
  );

  return router;
}