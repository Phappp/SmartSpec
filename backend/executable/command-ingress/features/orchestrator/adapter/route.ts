import { Router } from 'express';
import requireAuthorizedUser from '../../../middlewares/auth';
import { OrchestratorController } from './controller';

export default function initOrchestratorRoute(controller: OrchestratorController): Router {
    const router = Router();
    const runHandler = controller.run.bind(controller);
    // const resolveHandler = controller.resolveDuplicate.bind(controller);
    const retryProjectAnalysis = controller.retryProjectAnalysis.bind(controller);
    const findConflictsHandler = controller.findConflicts.bind(controller);
    const resolveConflictHandler = controller.resolveConflict.bind(controller);

    // Run API (full/incremental mode)
    router.post(
        '/projects/:project_id/versions/:version_id/process',
        // requireAuthorizedUser,
        runHandler
    );

    router.post(
        '/process',
        requireAuthorizedUser,
        runHandler
    );

    // Retry API
    router.post(
        '/projects/:project_id/versions/:version_id/retry',
        requireAuthorizedUser,
        retryProjectAnalysis
    );

    // Resolve duplicate API
    // router.post(
    //     '/projects/:project_id/versions/:version_id/resolve-duplicate',
    //     requireAuthorizedUser,
    //     resolveHandler
    // );

    // router.post(
    //     '/resolve-duplicate',
    //     requireAuthorizedUser,
    //     resolveHandler
    // );

    // API mới để người dùng bấm nút và tìm tất cả xung đột
    router.post(
        '/projects/:project_id/versions/:version_id/find-conflicts',
        requireAuthorizedUser,
        findConflictsHandler
    );

    // API đã sửa để giải quyết một nhóm xung đột
    router.post(
        '/projects/:project_id/versions/:version_id/resolve-conflict',
        requireAuthorizedUser,
        resolveConflictHandler
    );

    return router;
}


