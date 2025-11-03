import { Router } from 'express';
import { ActivityDiagramController } from '../adapter/controller';
import { requireAuthorizedUser } from '../../../middlewares/auth';

export default function initActivityDiagramRoute(): Router {
  const router = Router();
  const controller = new ActivityDiagramController();

  router.post(
    '/version/:versionId/requirements/:requirementId/generate',
    requireAuthorizedUser,
    controller.generateFromUsecase
  );
  // List & Read
  router.get('/', requireAuthorizedUser, controller.listByQuery);
  router.get('/:id', requireAuthorizedUser, controller.getById);

  // CRUD
  router.post('/', requireAuthorizedUser, controller.create);
  router.put('/:id', requireAuthorizedUser, controller.update);
  router.delete('/:id', requireAuthorizedUser, controller.remove);

  // Utilities
  router.post('/:id/validate', requireAuthorizedUser, controller.validateStructure);
  router.get('/:id/export-svg', requireAuthorizedUser, controller.exportSvg);

  // Requirement-based generation and helpers
  router.post('/version/:versionId/actors/generate', requireAuthorizedUser, controller.generateFromActor);
  router.get('/version/:versionId/requirements', requireAuthorizedUser, controller.listRequirementsByVersion);

  // Diagram-level CRUD for nodes and edges
  router.post('/:id/nodes', requireAuthorizedUser, controller.addNode);
  router.put('/:id/nodes/:nodeId', requireAuthorizedUser, controller.updateNode);
  router.delete('/:id/nodes/:nodeId', requireAuthorizedUser, controller.removeNode);
  router.post('/:id/edges', requireAuthorizedUser, controller.addEdge);
  router.put('/:id/edges/:index', requireAuthorizedUser, controller.updateEdge);
  router.delete('/:id/edges/:index', requireAuthorizedUser, controller.removeEdge);
  router.patch('/:id/svg', requireAuthorizedUser, controller.updateSvg);

  return router;
}


