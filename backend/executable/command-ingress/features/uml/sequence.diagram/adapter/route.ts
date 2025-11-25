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

  // Thêm route mới chỉ cần sequenceId
  router
    .route("/:sequenceId")
    .delete(
      requireAuthorizedUser,
      controller.deleteSequenceDiagramById.bind(controller)
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

  return router;
};

export default initSequenceDiagramRoute;