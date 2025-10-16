
import express from "express";
import { NotificationController } from "./controller";
import { requireAuthorizedUser, requireRole } from "../../../middlewares/auth";

const initNotificationRoute: (controller: NotificationController) => express.Router = (
  controller
) => {
  const router = express.Router();

  router.route('').post(requireAuthorizedUser, controller.createNotification.bind(controller));
  router.route('/me').get(requireAuthorizedUser, controller.getAllMyNotifications.bind(controller));
  router.route('/:id').get(requireAuthorizedUser, controller.getNotificationById.bind(controller));
  router.route('/:id').delete(requireAuthorizedUser, controller.deleteNotification.bind(controller));

  return router;
};

export default initNotificationRoute;
