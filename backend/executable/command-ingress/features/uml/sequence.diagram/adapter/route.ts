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

  // Update multiple positions (for drag & drop)
  router
    .route("/:sqdId/positions")
    .patch(requireAuthorizedUser, controller.updateMultiplePositions.bind(controller));

  // ==================== LIFELINE CRUD ROUTES ====================
  router
    .route("/:sqdId/lifelines/:lifelineId")
    .patch(requireAuthorizedUser, controller.updateLifeline.bind(controller))
    .delete(requireAuthorizedUser, controller.deleteLifeline.bind(controller));

  // ==================== MESSAGE CRUD ROUTES ====================
  router
    .route("/:sqdId/messages")
    .post(requireAuthorizedUser, controller.createMessage.bind(controller));

  router
    .route("/:sqdId/messages/:messageId")
    .patch(requireAuthorizedUser, controller.updateMessage.bind(controller))
    .delete(requireAuthorizedUser, controller.deleteMessage.bind(controller));

  // ==================== FRAGMENT CRUD ROUTES ====================
  router
    .route("/:sqdId/fragments")
    .post(requireAuthorizedUser, controller.createFragment.bind(controller));

  router
    .route("/:sqdId/fragments/:fragmentId")
    .patch(requireAuthorizedUser, controller.updateFragment.bind(controller))
    .delete(requireAuthorizedUser, controller.deleteFragment.bind(controller));

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