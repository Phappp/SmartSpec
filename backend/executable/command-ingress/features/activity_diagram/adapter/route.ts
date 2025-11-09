import { Router } from 'express';
import { ActivityDiagramController } from '../adapter/controller';
import { requireAuthorizedUser } from '../../../middlewares/auth';

export default function initActivityDiagramRoute(): Router {
  const router = Router();
  const controller = new ActivityDiagramController();

  router.post('/version/:versionId/requirements/:requirementId/generate',
    // requireAuthorizedUser,
    controller.generateFromUsecase);
    // Requirement-based generation and helpers
  router.post('/version/:versionId/actors/:actor/generate', 
    // requireAuthorizedUser, 
    controller.generateFromActor);

  // List & Read
  router.get('/:versionId', requireAuthorizedUser, controller.getListActivityDiagram);
  router.get('/:activityDiagramId', requireAuthorizedUser, controller.getActivityDiagramByID);

  // // CRUD
  // router.post('/', requireAuthorizedUser, controller.create);
  // router.put('/:id', requireAuthorizedUser, controller.update);
  // router.delete('/:id', requireAuthorizedUser, controller.remove);

  // // Diagram-level CRUD for nodes and edges
  // router.post('/:id/nodes', requireAuthorizedUser, controller.addNode);
  // router.put('/:id/nodes/:nodeId', requireAuthorizedUser, controller.updateNode);
  // router.delete('/:id/nodes/:nodeId', requireAuthorizedUser, controller.removeNode);
  // router.post('/:id/edges', requireAuthorizedUser, controller.addEdge);
  // router.put('/:id/edges/:index', requireAuthorizedUser, controller.updateEdge);
  // router.delete('/:id/edges/:index', requireAuthorizedUser, controller.removeEdge);
  // router.patch('/:id/svg', requireAuthorizedUser, controller.updateSvg);

    // Utilities
  router.post('/:activityDiagramId/validate', requireAuthorizedUser, controller.validateStructure);
  router.get('/:activityDiagramId/export', 
    // requireAuthorizedUser, 
    controller.export);
  return router;
}


