import { Router } from "express";
import { UsecaseDiagramController } from "./controller";
import { requireAuthorizedUser } from "../../../../middlewares/auth";
import express from "express";

const initUsecaseDiagramRoute: (
  controller: UsecaseDiagramController
) => express.Router = (controller) => {
  const router = express.Router();

  router
    .route("/versions/:versionId/generate-usecase-diagram")
    .post(
      requireAuthorizedUser,
      controller.generateUsecaseDiagram.bind(controller)
    );

  router
    .route("versions/:versionId/")
    .get(requireAuthorizedUser, controller.getUsecaseDiagrams.bind(controller));

  router
    .route("/:ucId/versions/:versionId/")
    .get(
      requireAuthorizedUser,
      controller.getUsecaseDiagramsById.bind(controller)
    );

  //actor
  router
    .route("/:ucId/versions/:versionId/actors/:actorId")
    .patch(requireAuthorizedUser, controller.editActorById.bind(controller));
  router
    .route("/:ucId/versions/:versionId/actors/:actorId")
    .delete(requireAuthorizedUser, controller.deleteActorById.bind(controller));

  //usecase
  router
    .route("/:ucId/versions/:versionId/usecase/:usecaseId")
    .patch(requireAuthorizedUser, controller.editUsecaseById.bind(controller));
  router
    .route("/:ucId/versions/:versionId/usecase/:usecaseId")
    .delete(
      requireAuthorizedUser,
      controller.deleteUsecaseById.bind(controller)
    );

  //relationship
  router
    .route("/:ucId/versions/:versionId/relationships/:relationshipId")
    .patch(
      requireAuthorizedUser,
      controller.editRelationshipById.bind(controller)
    );
  router
    .route("/:ucId/versions/:versionId/relationships/:relationshipId")
    .delete(
      requireAuthorizedUser,
      controller.deleteRelationshipById.bind(controller)
    );

  //association
  router
    .route("/:ucId/versions/:versionId/associations/:associationId")
    .patch(
      requireAuthorizedUser,
      controller.editAssociationById.bind(controller)
    );
  router
    .route("/:ucId/versions/:versionId/associations/:associationId")
    .patch(
      requireAuthorizedUser,
      controller.deleteAssociationById.bind(controller)
    );
  return router;
};

export default initUsecaseDiagramRoute;
