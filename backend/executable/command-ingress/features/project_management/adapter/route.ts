import { Router } from "express";
import { ProjectController } from "./controller";
import requireAuthorizedUser from "../../../middlewares/auth"; // Giả định đường dẫn

const router = Router();
const controller = new ProjectController();

/**
 * @route   POST /api/projects
 * @desc    Tạo một dự án mới
 * @access  Private
 */
router.post(
    "/",
    // DEBUG: Middleware nhỏ để ghi log mỗi khi request đi vào route này
    (req, res, next) => {
        console.log(`\n[ROUTE] Bắt đầu request POST /api/projects lúc ${new Date().toISOString()}`);
        next();
    },
    requireAuthorizedUser,
    controller.create
);

// export default router;