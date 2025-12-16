import { Router } from "express";
import { UsecaseDiagramController } from "./controller";
import { requireAuthorizedUser } from "../../../../middlewares/auth";
import express from "express";

const initUsecaseDiagramRoute: (
  controller: UsecaseDiagramController
) => express.Router = (controller) => {
  const router = express.Router();

  //UCD
  router
    .route("/versions/:versionId/generate-usecase-diagram")
    .post(
      requireAuthorizedUser,
      controller.generateUsecaseDiagram.bind(controller)
    );
  router
    .route("/versions/:versionId/")
    .get(requireAuthorizedUser, controller.getUsecaseDiagrams.bind(controller));
  router
    .route("/:ucId")
    .get(
      requireAuthorizedUser,
      controller.getUsecaseDiagramsById.bind(controller)
    );

  //actor
  router
    .route("/:ucId/actors")
    .post(requireAuthorizedUser, controller.createActor.bind(controller));
  router
    .route("/:ucId/actors/:actorId")
    .patch(requireAuthorizedUser, controller.editActorById.bind(controller));
  router
    .route("/:ucId/actors/:actorId")
    .delete(requireAuthorizedUser, controller.deleteActorById.bind(controller));

  //usecase
  router
    .route("/:ucId/usecases")
    .post(requireAuthorizedUser, controller.createUsecase.bind(controller));
  router
    .route("/:ucId/usecases/:usecaseId")
    .patch(requireAuthorizedUser, controller.editUsecaseById.bind(controller));
  router
    .route("/:ucId/usecases/:usecaseId")
    .delete(
      requireAuthorizedUser,
      controller.deleteUsecaseById.bind(controller)
    );

  //relationship
  router
    .route("/:ucId/relationship")
    .post(
      requireAuthorizedUser,
      controller.createRelationship.bind(controller)
    );
  router
    .route("/:ucId/relationships/:relationshipId")
    .patch(
      requireAuthorizedUser,
      controller.editRelationshipById.bind(controller)
    );
  router
    .route("/:ucId/relationships/:relationshipId")
    .delete(
      requireAuthorizedUser,
      controller.deleteRelationshipById.bind(controller)
    );

  //association
  router
    .route("/:ucId/associations")
    .post(requireAuthorizedUser, controller.createAssociation.bind(controller));
  router
    .route("/:ucId/associations/:associationId")
    .patch(
      requireAuthorizedUser,
      controller.editAssociationById.bind(controller)
    );
  router
    .route("/:ucId/associations/:associationId")
    .delete(
      requireAuthorizedUser,
      controller.deleteAssociationById.bind(controller)
    );

  // Thêm route xóa usecase diagram
  router
    .route("/:ucId")
    .delete(requireAuthorizedUser, controller.deleteUsecaseDiagram.bind(controller));

  // POSITION ADJUSTMENT ROUTES
  // Update single actor position
  router
    .route("/:ucId/actors/:actorId/position")
    .patch(requireAuthorizedUser, controller.updateActorPosition.bind(controller));

  // Update single usecase position
  router
    .route("/:ucId/usecases/:usecaseId/position")
    .patch(requireAuthorizedUser, controller.updateUsecasePosition.bind(controller));

  // Update multiple positions (for drag & drop)
  router
    .route("/:ucId/positions")
    .patch(requireAuthorizedUser, controller.updateMultiplePositions.bind(controller));

  // Reset all positions to default
  router
    .route("/:ucId/reset-positions")
    .patch(requireAuthorizedUser, controller.resetPositions.bind(controller));
  return router;


};

export default initUsecaseDiagramRoute;
