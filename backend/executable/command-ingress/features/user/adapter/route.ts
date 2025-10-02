import express from "express";
import { UserController } from "./controller";
import { requireAuthorizedUser, requireRole } from "../../../middlewares/auth";

const initUserRoute: (controller: UserController) => express.Router = (
  controller
) => {
  const router = express.Router();

  router.route('').get(requireAuthorizedUser, requireRole('ADMIN'), controller.getAllUsers.bind(controller));
  // router.route('/get-by-id/:id').get(requireAuthorizedUser, controller.getUserById.bind(controller));

  // router.route('/getme').get(requireAuthorizedUser, requireAuthorizedUser, controller.getProfile.bind(controller));
  router
    .route("/update-profile")
    .patch(
      requireAuthorizedUser,
      controller.updateProfile.bind(controller)
    );
  router
    .route("/change-password")
    .post(
      requireAuthorizedUser,
      controller.changePassword.bind(controller)
    );
  
  return router;
};

export default initUserRoute;
