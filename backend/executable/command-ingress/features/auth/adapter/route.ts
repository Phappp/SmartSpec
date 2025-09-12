import express from 'express';
import { AuthController } from './controller';
import requireAuthorizedUser from '../../../middlewares/auth';

const   initAuthRoute: (controller: AuthController) => express.Router  = (controller) => {
  const router = express.Router();

  router.route('/google/oauth').get(controller.exchangeGoogleToken.bind(controller));
  router.route('/verifyemail').post(controller.verifyEmail.bind(controller));
  router.route('/logout').post(controller.logout.bind(controller));
  router.route('/token').post(controller.refreshToken.bind(controller));
  router.route('/register').post(controller.register.bind(controller));
  router.route('/login').post(controller.login.bind(controller));
  router.route('/verify-otp').post(controller.verifyOTP.bind(controller));
  router.route('/forgot-password').post(controller.forgotPassword.bind(controller));
  router.route('/reset-password').post(controller.resetPassword.bind(controller));
  router.route('/toggle-2fa').post(requireAuthorizedUser, controller.toggleTwoFactorAuth.bind(controller));
  return router;
};

export default initAuthRoute;