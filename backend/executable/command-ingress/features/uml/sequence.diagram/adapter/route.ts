import { Router } from "express";
import { SequenceDiagramController } from "./controller";
import { requireAuthorizedUser } from "../../../../middlewares/auth";
import express from "express";

const initSequenceDiagramRoute: (
  controller: SequenceDiagramController
) => express.Router = (controller) => {
  const router = express.Router();

  //UCD
  router
    .route("/versions/:versionId/generate-sequence-diagram")
    .post(
      requireAuthorizedUser,
      controller.generateSchemaFromRequirements.bind(controller)
    );
  router
    .route("/versions/:versionId/")
    .get(
      requireAuthorizedUser,
      controller.getSequenceDiagrams.bind(controller)
    );
  router
    .route("/:ucId")
    .get(
      requireAuthorizedUser,
      controller.getSequenceDiagramById.bind(controller)
    );
  return router;
};

export default initSequenceDiagramRoute;
