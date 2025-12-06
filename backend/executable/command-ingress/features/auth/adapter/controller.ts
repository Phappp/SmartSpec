import { Response, Request, NextFunction } from "express";
import env from "../../../utils/env";
import { AuthService } from "../types";
import {
  ExchangeGoogleTokenBody,
  LogoutRequestBody,
  RefreshTokenRequestBody,
  RegisterRequestBody,
  LoginRequestBody,
  ForgotPasswordRequestBody,
  ResetPasswordRequestBody,
  verifyEmailRequestBody,
} from "./dto";
import { BaseController } from "../../../shared/base-controller";
import responseValidationError from "../../../shared/response";
import { HttpRequest } from "../../../types";
import { handleServiceResponse } from "../../../services/httpHandlerResponse";
import { StatusCodes } from "http-status-codes";
import { getClientInfo } from "../../../utils/networkInfo";

class AuthController extends BaseController {
  service: AuthService;

  constructor(service: AuthService) {
    super();
    this.service = service;
  }

  async exchangeGoogleToken(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const exchangeGoogleTokenBody = new ExchangeGoogleTokenBody(req.query);
        console.log("exchangeGoogleTokenBody: ", exchangeGoogleTokenBody);
        // lấy ip và userAgent
        const { ip, userAgent } = getClientInfo(req);
        //
        const validateResult = await exchangeGoogleTokenBody.validate();
        if (!validateResult.ok) {
          responseValidationError(res, validateResult.errors[0]);
          return;
        }

        const exchangeResult = await this.service.exchangeWithGoogleIDP({
          idp: "google",
          code: exchangeGoogleTokenBody.code,
        });

        const params = new URLSearchParams({
          uid: exchangeResult.sub,
          access_token: exchangeResult.accessToken,
          refresh_token: exchangeResult.refreshToken,
        });

        const redirectURL = `${env.CLIENT_URL
          }/oauth/redirect?${params.toString()}`;
        res.redirect(redirectURL);

        return;
      }
    );
  }

  async logout(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const logoutRequestBody = new LogoutRequestBody(req.body);
        // lấy ip và userAgent
        const { ip, userAgent } = getClientInfo(req);
        //
        const validateResult = await logoutRequestBody.validate();
        if (!validateResult.ok) {
          responseValidationError(res, validateResult.errors[0]);
          return;
        }
        console.log(
          "logoutRequestBody.refreshToken: ",
          logoutRequestBody.refreshToken
        );
        await this.service.logout(logoutRequestBody.refreshToken,ip, userAgent);

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "User logged in successfully",
        });
      }
    );
  }

  async refreshToken(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const refreshTokenRequestBody = new RefreshTokenRequestBody(req.body);
    console.log(refreshTokenRequestBody);
    const validateResult = await refreshTokenRequestBody.validate();
    if (!validateResult.ok) {
      responseValidationError(res, validateResult.errors[0]);
      return;
    }

    const token = await this.service.refreshToken(
      refreshTokenRequestBody.refreshToken
    );

    res.status(200).json({
      refresh_token: token.refreshToken,
      access_token: token.accessToken,
    });

    return;
  }

  async register(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      const {
        email,
        password,
        confirmPassword,
        name,
        isTwoFactorEnabled,
        dob,
        gender,
      } = req.body;

      const { day, month, year } = dob;
      // Sử dụng UTC để tránh timezone issues - tạo Date với UTC time 00:00:00
      const newDob = new Date(Date.UTC(year, month - 1, day));
      console.log(req.body);

      const registerRequestBody = new RegisterRequestBody(req.body);
      // lấy ip và userAgent
      const { ip, userAgent } = getClientInfo(req);
      //
      const validateResult = await registerRequestBody.validate();

      console.log("register:", registerRequestBody);
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }

      const registerResult = await this.service.register(
        email,
        password,
        confirmPassword,
        name,
        isTwoFactorEnabled,
        newDob,
        gender,
        ip, userAgent
      );

      const serviceResponse = {
        success: true,
        message: "User registered successfully",
        data: registerResult,
        code: StatusCodes.OK,
      };

      handleServiceResponse(serviceResponse, res);
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: "Failed",
        message: "Error register",
        error: (error as Error).message,
      });
    }
  }

  async sendVerificationEmail(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      const { email } = req.body;
      const verifyEmail = new verifyEmailRequestBody(req.body);
      const validateResult = await verifyEmail.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }
      const verifyEmailResult = await this.service.sendVerificationEmail(email);

      const serviceResponse = {
        success: true,
        message: "Verify email successfully",
        data: verifyEmailResult,
        code: StatusCodes.OK,
      };

      handleServiceResponse(serviceResponse, res);
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: "Failed",
        message: (error as Error).message,
        error: (error as Error).message,
      });
    }
  }

  async verifyEmail(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      const { token } = req.body;
      if (!token || typeof token !== "string") {
        res.status(StatusCodes.BAD_REQUEST).json({
          status: "Failed",
          message: "Invalid or missing token",
        });
        return;
      }
      const verifyEmailResult = await this.service.verifyEmail(token);

      const serviceResponse = {
        success: true,
        message: "Verify email successfully",
        data: verifyEmailResult,
        code: StatusCodes.OK,
      };

      handleServiceResponse(serviceResponse, res);
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: "Failed",
        message: "Error verifying email",
        error: (error as Error).message,
      });
    }
  }
  
  async login(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const loginRequestBody = new LoginRequestBody(req.body);
      // lấy ip và userAgent
      const { ip, userAgent } = getClientInfo(req);
      //
      const validateResult = await loginRequestBody.validate();
      console.log(validateResult);
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }
      // có sửa tham số
      const loginResult = await this.service.login(email, password,ip, userAgent);
      const serviceResponse = {
        success: true,
        message: "User logged in successfully",
        data: loginResult,
        code: StatusCodes.OK,
      };
      handleServiceResponse(serviceResponse, res);
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: "Failed",
        message: "Error logging in",
        error: (error as Error).message,
      });
    }
  }

  async getProfile(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const userId = req.getSubject();
        if (!userId) {
          throw new Error("User ID not found in request. User is not authenticated.");
        }

        const userProfile = await this.service.getProfile(userId);

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "User profile fetched successfully.",
          data: userProfile,
        });
        return;
      }
    );
  }

  async verifyOTP(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      const { email, otp, otpToken } = req.body;

      if (!email || !otp || !otpToken) {
        res.status(StatusCodes.BAD_REQUEST).json({
          status: "Failed",
          message: "Email, OTP, Token are required",
        });
        return;
      }
      // lấy ip và userAgent
      const { ip, userAgent } = getClientInfo(req);
      //
      const verifyOTP = await this.service.verifyOTP(email, otp, otpToken,ip,userAgent);
      const serviceResponse = {
        success: true,
        message: "User logged in successfully",
        data: verifyOTP,
        code: StatusCodes.OK,
      };
      handleServiceResponse(serviceResponse, res);
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: "Failed",
        message: "Error verifying OTP",
        error: (error as Error).message,
      });
    }
  }

  async forgotPassword(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      const { email } = req.body;
      const forgotPasswordRequestBody = new ForgotPasswordRequestBody(req.body);
      // lấy ip và userAgent
      const { ip, userAgent } = getClientInfo(req);
      //
      const validateResult = await forgotPasswordRequestBody.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }

      const serviceResponse = await this.service.forgotPassword(email,ip, userAgent);

      res.status(StatusCodes.OK).json({
        status: "Success",
        message: `Password reset link sent to ${email} if it exists in our system.`,
        data: serviceResponse,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: "Failed",
        message: "Error processing forgot password request",
        error: (error as Error).message,
      });
    }
  }

  async resetPassword(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      const { token } = req.query;
      const { newPassword, confirmNewPassword } = req.body;

      if (!token || typeof token !== "string") {
        res.status(StatusCodes.BAD_REQUEST).json({
          status: "Failed",
          message: "Invalid or missing token",
        });
        return;
      }

      const resetPasswordRequestBody = new ResetPasswordRequestBody({
        newPassword,
        confirmNewPassword,
      });
      // lấy ip và userAgent
      const { ip, userAgent } = getClientInfo(req);
      //
      const validatePasswords = await resetPasswordRequestBody.validate();

      if (!validatePasswords.ok) {
        responseValidationError(res, validatePasswords.errors[0]);
        return;
      }

      await this.service.resetPassword(token, newPassword,ip, userAgent);

      res.status(StatusCodes.OK).json({
        status: "Success",
        message: "Password has been reset successfully",
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: "Failed",
        message: "Error resetting password",
        error: (error as Error).message,
      });
    }
  }

  async toggleTwoFactorAuth(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const { enable } = req.body;
        if (enable !== true && enable !== false) {
          throw new Error(
            "Invalid value for enable. It should be true or false"
          );
        }
        const userId = req.getSubject();
        if (!userId) {
          throw new Error("User ID not found in request");
        }
        // lấy ip và userAgent
        const { ip, userAgent } = getClientInfo(req);
        //
        const result = await this.service.toggleTwoFactorAuth(userId, enable,ip, userAgent);
        res.status(StatusCodes.OK).json({
          status: "Success",
          message: `Two-factor authentication has been ${enable ? "enabled" : "disabled"
            } successfully.`,
          data: result,
        });
        return;
      }
    );
  }
}

export { AuthController };
