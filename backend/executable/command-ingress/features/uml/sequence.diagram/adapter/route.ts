import { Router } from "express";
import { SequenceDiagramController } from "./controller";
import { requireAuthorizedUser } from "../../../../middlewares/auth";
import express from "express";

const initSequenceDiagramRoute: (
  controller: SequenceDiagramController
) => express.Router = (controller) => {
  const router = express.Router();

  // FIX: Thêm base path "/sequence-diagram"
  router
    .route("/versions/:versionId/generate-sequence-diagram")
    .post(
      requireAuthorizedUser,
      controller.generateSchemaFromRequirements.bind(controller)
    );

  // FIX: Sửa route get all diagrams
  router
    .route("/versions/:versionId/sequence-diagrams") // Đổi tên route
    .get(
      requireAuthorizedUser,
      controller.getSequenceDiagrams.bind(controller)
    );

  // FIX: Sửa route get by id
  router
    .route("/sequence-diagrams/:ucId") // Đổi tên route
    .get(
      requireAuthorizedUser,
      controller.getSequenceDiagramById.bind(controller)
    );

  // POSITION ADJUSTMENT ROUTES - Đặt trước route generic :sequenceId để tránh conflict
  // Update single lifeline position
  router
    .route("/:sqdId/lifelines/:lifelineId/position")
    .patch(requireAuthorizedUser, controller.updateLifelinePosition.bind(controller));

  // Thêm route mới chỉ cần sequenceId - Đặt sau route cụ thể
  router
    .route("/:sequenceId")
    .delete(
      requireAuthorizedUser,
      controller.deleteSequenceDiagramById.bind(controller)
    );

  return router;
};

export default initSequenceDiagramRoute;