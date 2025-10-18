import express from "express";
import { UserController } from "./controller";
import { requireAuthorizedUser, requireRole } from "../../../middlewares/auth";

const initUserRoute: (controller: UserController) => express.Router = (
  controller
) => {
  const router = express.Router();

  //for admin
  router
    .route("/update-profile")
    .patch(requireAuthorizedUser, controller.updateProfile.bind(controller));
  router
    .route("/upload-avatar")
    .post(requireAuthorizedUser, controller.uploadAvatar.bind(controller));
  router
    .route("/search")
    .post(
      requireAuthorizedUser,
      requireRole("ADMIN"),
      controller.searchUsersByNameAndEmail.bind(controller)
    );
  router
    .route("/filter")
    .post(
      requireAuthorizedUser,
      requireRole("ADMIN"),
      controller.filterUsers.bind(controller)
    );
  router
    .route("")
    .get(
      requireAuthorizedUser,
      requireRole("ADMIN"),
      controller.getAllUsers.bind(controller)
    );
  router
    .route("/:id")
    .get(
      requireAuthorizedUser,
      requireRole("ADMIN"),
      controller.getUserById.bind(controller)
    );
  router
    .route("/:id")
    .patch(
      requireAuthorizedUser,
      requireRole("ADMIN"),
      controller.updateUserById.bind(controller)
    );
  router
    .route("/reset-password/:id")
    .put(
      requireAuthorizedUser,
      requireRole("ADMIN"),
      controller.resetPasswordById.bind(controller)
    );

  router
    .route("/:id")
    .delete(
      requireAuthorizedUser,
      requireRole("ADMIN"),
      controller.deleteUserById.bind(controller)
    );

  //for user
  router
    .route("/change-email")
    .post(requireAuthorizedUser, controller.changeEmail.bind(controller));
  router
    .route("/change-password")
    .post(requireAuthorizedUser, controller.changePassword.bind(controller));

  return router;
};

export default initUserRoute;
