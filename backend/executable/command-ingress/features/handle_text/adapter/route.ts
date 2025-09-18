import { Router } from 'express';
import { TextController } from './controller';
import requireAuthorizedUser from '../../../middlewares/auth';

export default function initTextRoute(controller: TextController): Router {
    const router = Router();
    const handler = controller.createText.bind(controller);

    router.post(
        '/projects/:project_id/versions/:version_id/process',
        requireAuthorizedUser,
        handler
    );
    router.post(
        '/process',
        requireAuthorizedUser,
        handler
    );

    return router;
}







