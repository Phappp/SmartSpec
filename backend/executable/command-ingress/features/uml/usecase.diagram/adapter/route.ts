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

  //done
  router
    .route("/versions/:versionId/")
    .get(requireAuthorizedUser, controller.getUsecaseDiagrams.bind(controller));

  //done
  router
    .route("/:ucId")
    .get(
      requireAuthorizedUser,
      controller.getUsecaseDiagramsById.bind(controller)
    );

  //actor
  //done
  router
    .route("/:ucId/actors/:actorId")
    .patch(requireAuthorizedUser, controller.editActorById.bind(controller));
  //done
  router
    .route("/:ucId/actors/:actorId")
    .delete(requireAuthorizedUser, controller.deleteActorById.bind(controller));

  //usecase
  //done
  router
    .route("/:ucId/usecases/:usecaseId")
    .patch(requireAuthorizedUser, controller.editUsecaseById.bind(controller));
  //done
  router
    .route("/:ucId/usecases/:usecaseId")
    .delete(
      requireAuthorizedUser,
      controller.deleteUsecaseById.bind(controller)
    );

  //relationship
  //done
  router
    .route("/:ucId/relationships/:relationshipId")
    .patch(
      requireAuthorizedUser,
      controller.editRelationshipById.bind(controller)
    );
  //done
  router
    .route("/:ucId/relationships/:relationshipId")
    .delete(
      requireAuthorizedUser,
      controller.deleteRelationshipById.bind(controller)
    );

  //association
  //progressing
  router
    .route("/:ucId/associations/:associationId")
    .patch(
      requireAuthorizedUser,
      controller.editAssociationById.bind(controller)
    );
  router
    .route("/:ucId/associations/:associationId")
    .patch(
      requireAuthorizedUser,
      controller.deleteAssociationById.bind(controller)
    );
  return router;
};

export default initUsecaseDiagramRoute;
