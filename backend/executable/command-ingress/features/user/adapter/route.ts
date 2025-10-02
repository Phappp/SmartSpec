import express from "express";
import { UserController } from "./controller";
import { requireAuthorizedUser, requireRole } from "../../../middlewares/auth";

const initUserRoute: (controller: UserController) => express.Router = (
  controller
) => {
  const router = express.Router();

  //for admin
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

  //for user
  router
    .route("/update-profile")
    .patch(requireAuthorizedUser, controller.updateProfile.bind(controller));
  router
    .route("/change-password")
    .post(requireAuthorizedUser, controller.changePassword.bind(controller));

  return router;
};

export default initUserRoute;
