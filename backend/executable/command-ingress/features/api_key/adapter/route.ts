import express from "express";
import { ApiKeyController } from "./controller";
import { requireAuthorizedUser, requireRole } from "../../../middlewares/auth";

const initApiKeyRoute: (controller: ApiKeyController) => express.Router = (
  controller
) => {
  const router = express.Router();

  router
    .route("/search")
    .get(requireAuthorizedUser, controller.searchAPIKeys.bind(controller));

  router.route("/filter")
  .get(requireAuthorizedUser, controller.filterAPIKeys.bind(controller));

  router.route("/statistics")
  .get(requireAuthorizedUser, requireRole("ADMIN"), controller.getAPIKeyStatistics.bind(controller));

  router
    .route("")
    .post(requireAuthorizedUser, controller.createAPIKey.bind(controller));

  //
  router
    .route("")
    .get(requireAuthorizedUser, controller.getAllAPIKey.bind(controller));
  //
  router
    .route("/:id")
    .get(requireAuthorizedUser, controller.getAPIKeyById.bind(controller));
  //
  router
    .route("/:id")
    .patch(requireAuthorizedUser, controller.updateAPIKey.bind(controller));
    
  //
  router
    .route("/:id")
    .delete(requireAuthorizedUser, controller.deleteAPIKey.bind(controller));
  return router;
};

export default initApiKeyRoute;
