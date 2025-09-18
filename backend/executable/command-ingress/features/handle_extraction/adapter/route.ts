import { Router } from "express";
import { ExtractorController } from "../adapter/controller";
import { ExtractorService } from "../domain/ExtractorService"; // <-- 1. Import Service
import requireAuthorizedUser from "../../../middlewares/auth";

// --- 2. Khởi tạo Service và Controller ---
const extractorService = new ExtractorService();
const extractorController = new ExtractorController(extractorService);

const router = Router();

export default function initExtractorRoute(controller: ExtractorController): Router {
    const router = Router();

    const extractHandler = controller.uploadAndExtract.bind(controller);

    router.post(
        "/projects/:project_id/versions/:version_id/process",
        requireAuthorizedUser,
        extractHandler
    );
    router.post(
        "/process",
        requireAuthorizedUser,
        extractHandler
    );

    return router; // <-- THÊM DÒNG NÀY VÀO
}