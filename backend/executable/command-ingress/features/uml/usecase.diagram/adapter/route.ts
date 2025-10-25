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

  return router;
};

export default initUsecaseDiagramRoute;
