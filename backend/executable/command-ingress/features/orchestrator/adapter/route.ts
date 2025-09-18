import { Router } from 'express';
import requireAuthorizedUser from '../../../middlewares/auth';
import { OrchestratorController } from './controller';

export default function initOrchestratorRoute(controller: OrchestratorController): Router {
    const router = Router();
    const runHandler = controller.run.bind(controller);
    const resolveHandler = controller.resolveDuplicate.bind(controller);

    // Run API (full/incremental mode)
    router.post(
        '/projects/:project_id/versions/:version_id/process',
        requireAuthorizedUser,
        runHandler
    );

    router.post(
        '/process',
        requireAuthorizedUser,
        runHandler
    );

    // Resolve duplicate API
    router.post(
        '/projects/:project_id/versions/:version_id/resolve-duplicate',
        requireAuthorizedUser,
        resolveHandler
    );

    router.post(
        '/resolve-duplicate',
        requireAuthorizedUser,
        resolveHandler
    );

    return router;
}


