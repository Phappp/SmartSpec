import express from "express";
import { ApiKeyController } from "./controller";
import { requireAuthorizedUser, requireRole } from "../../../middlewares/auth";

const initApiKeyRoute: (controller: ApiKeyController) => express.Router = (
  controller
) => {
  const router = express.Router();

  router
    .route("/search")
    .get(
      requireAuthorizedUser,
      requireRole("ADMIN"),
      controller.searchAPIKeys.bind(controller)
    );

  router
    .route("/filter")
    .get(
      requireAuthorizedUser,
      requireRole("ADMIN"),
      controller.filterAPIKeys.bind(controller)
    );

  router
    .route("/statistics")
    .get(
      requireAuthorizedUser,
      requireRole("ADMIN"),
      controller.getAPIKeyStatistics.bind(controller)
    );

  router
    .route("")
    .post(
      requireAuthorizedUser,
      requireRole("ADMIN"),
      controller.createAPIKey.bind(controller)
    );

  router
    .route("")
    .get(
      requireAuthorizedUser,
      requireRole("ADMIN"),
      controller.getAllAPIKey.bind(controller)
    );

  router
    .route("/:id")
    .get(
      requireAuthorizedUser,
      requireRole("ADMIN"),
      controller.getAPIKeyById.bind(controller)
    );

  router
    .route("/:id")
    .patch(
      requireAuthorizedUser,
      requireRole("ADMIN"),
      controller.updateAPIKey.bind(controller)
    );

  router
    .route("/:id")
    .delete(
      requireAuthorizedUser,
      requireRole("ADMIN"),
      controller.deleteAPIKey.bind(controller)
    );
  return router;
};

export default initApiKeyRoute;
