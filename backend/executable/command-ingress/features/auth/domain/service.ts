import { v4 as uuidv4 } from "uuid";
import {
  AuthService,
  ExchangeTokenResult,
  ExchangeTokenRequest,
  LoginResponse,
} from "../types";
import User from "../../../../../internal/model/user";
import Session from "../../../../../internal/model/session";
import jwt from "jsonwebtoken";
import { GoogleIdentityBroker } from "../identity-broker/google-idp.broker";
import bcrypt from "bcrypt";
import {
  ServiceResponse,
  ResponseStatus,
} from "../../../services/serviceResponse";
import { generateJwt, generateJwtOTP } from "../../../services/jwtService";
import mailService from "../../../services/sendMail.service";
import { ac, L } from "@faker-js/faker/dist/airline-BcEu2nRk";
import { Double } from "mongodb";
import { NumberingPlan } from "libphonenumber-js";
import { LogService } from "../../log/domain/service";

export class AuthServiceImpl implements AuthService {
  googleIdentityBroker: GoogleIdentityBroker;
  jwtSecret: string;          // Dùng cho Access Token
  jwtRefreshSecret: string;   // Dùng cho Refresh Token
  jwtOtpSecret: string;       // Dùng cho OTP Token
  jwtEmailSecret: string      // Dùng cho Verify Email & Reset Password
  //Thêm log
  private logService: LogService;
  constructor(
    googleIdentityBroker: GoogleIdentityBroker,
    jwtSecret: string,
    jwtRefreshSecret: string,
    jwtOtpSecret: string,
    jwtEmailSecret: string
  ) {
    this.googleIdentityBroker = googleIdentityBroker;
    this.jwtSecret = jwtSecret;
    this.jwtRefreshSecret = jwtRefreshSecret;
    this.jwtOtpSecret = jwtOtpSecret;
    this.jwtEmailSecret = jwtEmailSecret;
    //Khởi tạo log
    this.logService = new LogService();
  }

  signAccessToken(payload: any): string {
    return jwt.sign(
      {
        ...payload,
      },
      this.jwtSecret,
      { expiresIn: "1d" }
    );
  }

  signRefreshToken(payload: any): string {
    return jwt.sign({ ...payload, typ: "offline" }, this.jwtRefreshSecret, {
      expiresIn: "30d",
    });
  }

  verifyToken(token: string, secret: string): any {
    return jwt.verify(token, secret);
  }

  async createUserIfNotExists(userProfile: any): Promise<any> {
    let user = await User.findOne({ email: userProfile.email });
    if (!user) {
      user = new User({
        name: userProfile.name,
        email: userProfile.email,
        avatar: userProfile.picture ?? "",
        lists: [
          {
            name: "Reading list",
            posts: [],
            images: [],
          },
        ],
        provider: "GOOGLE",
      });

      await user.save();
      await this.logService.createLog({
        user_id: user._id.toString(),
        target_id: user._id.toString(),
        action: "create_user",
        target_type: "system",
        details: { message: `New Google user created: ${user.email}` },
        level: "info",
      });
    }

    return user;
  }

  async exchangeWithGoogleIDP(
    request: ExchangeTokenRequest, ip?: string, userAgent?: string
  ): Promise<ExchangeTokenResult> {
    const { code } = request;
    const googleToken =
      await this.googleIdentityBroker.exchangeAuthorizationCode(code);
    const userProfile = await this.googleIdentityBroker.fetchProfile({
      idToken: googleToken.idToken,
      accessToken: googleToken.accessToken,
    });

    const user = await this.createUserIfNotExists(userProfile);
    const sessionID = uuidv4();
    const jwtPayload = {
      _id: user._id,
      sub: user._id,
      sid: sessionID,
      system_role: user.system_role
    };
    const accessToken = this.signAccessToken(jwtPayload);
    const refreshToken = this.signRefreshToken(jwtPayload);
    const session = new Session({ sessionID: sessionID, userID: user._id });
    await session.save();

    await this.logService.createLog({
      user_id: user._id.toString(),
      target_id: user._id.toString(),
      action: "login",
      target_type: "system",
      details: { message: `Google login success for ${user.email}` },
      level: "info",
      ip: ip,
      user_agent: userAgent
    });
    return {
      refreshToken,
      accessToken,
      sub: String(user._id),
    };
  }
  async logout(refreshToken: string, ip?: string, userAgent?: string): Promise<string> {
    const jwtClaims = jwt.verify(refreshToken, this.jwtRefreshSecret);
    const sid = jwtClaims["sid"];
    const sub = jwtClaims["sub"];
    await Session.deleteOne({
      sessionID: sid,
    });
    await this.logService.createLog({
      user_id: sub?.toString(),
      target_id: sub?.toString(),
      action: "logout",
      target_type: "system",
      details: { message: ` User "${sub}" logged out successfully (Session ID: ${sid}).` },
      level: "info",
      ip: ip,
      user_agent: userAgent
    });
    return "User logged out successfully";
  }

  async refreshToken(token: string): Promise<ExchangeTokenResult> {
    const jwtClaims = this.verifyToken(token, this.jwtRefreshSecret);
    const sessionID = jwtClaims["sid"];
    const subject = jwtClaims["sub"];

    const session = await Session.findOne({ sessionID });

    // ✨ FIX: Ném ra lỗi với thông báo rõ ràng hơn.
    if (!session) {
      throw new Error("Invalid or expired session. Please log in again.");
    }

    const jwtPayload = {
      _id: jwtClaims["sub"],
      sub: jwtClaims["sub"],
      sid: sessionID,
    };

    // Tạo lại cả access token và refresh token mới (xoay vòng token)
    const newAccessToken = this.signAccessToken(jwtPayload);
    const newRefreshToken = this.signRefreshToken(jwtPayload);

    return {
      sub: String(subject),
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async getProfile(userId: string): Promise<any> {
    const user = await User.findById(userId).select('-password'); // Lấy user và loại bỏ trường password
    if (!user) {
      throw new Error("User not found");
    }

    // Transform user object để đảm bảo dob được serialize đúng
    const userObj = user.toObject ? user.toObject() : user;

    // Đảm bảo dob là Date object hoặc ISO string
    if (userObj.dob) {
      // Nếu là Date object, giữ nguyên (Express sẽ serialize thành ISO string)
      // Nếu đã là string, giữ nguyên
      if (!(userObj.dob instanceof Date) && typeof userObj.dob !== 'string') {
        // Nếu là object khác, thử convert
        userObj.dob = new Date(userObj.dob);
      }
    }

    return userObj;
  }


  async sendVerificationEmail(email: string): Promise<boolean> {
    const user = await User.findOne({ email });
    if (user) {
      throw new Error("Email already exists");
    }
    const verifyToken = await generateJwtOTP({ email });

    const subject = "Verify your email";
    const data = `Click the link to verify your email: http://localhost:5173/verify-email?token=${verifyToken}`;

    const mailIsSent = await this.sendmail(email, subject, data);
    if (!mailIsSent) {
      throw new Error("Failed to send email");
    }
    return true;
  }

  async verifyEmail(token: string): Promise<boolean> {
    // ✨ FIX: Dùng secret key riêng cho email.
    const payload = jwt.verify(token, this.jwtSecret) as { email: string }; // THAY this.jwtSecret BẰNG this.jwtEmailSecret
    if (!payload.email) {
      throw new Error("Invalid token");
    }
    return true;
  }
  async register(
    email: string,
    password: string,
    confirmPassword: string,
    name: string,
    isTwoFactorEnabled: boolean,
    dob: Date,
    gender: string,
    ip?: string, userAgent?: string
  ): Promise<ExchangeTokenResult> {
    // ✨ FIX: Thêm bước kiểm tra mật khẩu trùng khớp.
    if (password !== confirmPassword) {
      throw new Error("Passwords do not match");
    }

    let existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("User already exists");
    }
    console.log("password before hash:", password)
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      password: hashedPassword,
      name,
      isTwoFactorEnabled,
      dob,
      gender,
    });
    await user.save();

    await this.logService.createLog({
      user_id: user._id.toString(),
      target_id: user._id.toString(),
      action: "create_user",
      target_type: "system",
      details: { message: `User "${email}" registered successfully (ID: ${user._id}) via local registration.` },
      level: "info",
      ip: ip,
      user_agent: userAgent
    });

    const sessionID = uuidv4();
    const jwtPayload = {
      _id: user._id,
      sub: user._id,
      sid: sessionID,
      system_role: user.system_role
    };
    const accessToken = this.signAccessToken(jwtPayload);
    const refreshToken = this.signRefreshToken(jwtPayload);

    const session = new Session({ sessionID, userID: user._id });
    await session.save();

    return {
      refreshToken,
      accessToken,
      sub: String(user._id),
    };
  }

  // có chỉnh thêm tham số
  async login(email: string, password: string, ip?: string, userAgent?: string): Promise<LoginResponse> {
    const user = await User.findOne({ email });
    if (!user) {
      await this.logService.createLog({
        user_id: undefined,
        target_id: undefined,
        action: "failed_login",
        target_type: "system",
        details: { message: `Failed login attempt for "${email}" — reason: "User not found"` },
        level: "warning",
        ip: ip,
        user_agent: userAgent
      });
      throw new Error("User not found");
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await this.logService.createLog({
        user_id: undefined,
        target_id: undefined,
        action: "failed_login",
        target_type: "system",
        details: { message: `Failed login attempt for "${email}" — reason: "Invalid password"` },
        level: "warning",
        ip: ip,
        user_agent: userAgent
      });
      throw new Error("Invalid password");
    }

    if (user.isTwoFactorEnabled) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // ✨ FIX: Ký token OTP bằng một secret key RIÊNG BIỆT và có thời gian hết hạn ngắn.
      // Lưu ý: Bạn cần thêm this.jwtOtpSecret vào constructor.
      const otpToken = jwt.sign({ email, otp }, this.jwtSecret, { expiresIn: '5m' }); // THAY this.jwtSecret BẰNG this.jwtOtpSecret

      const subject = "Your OTP Code";
      const data = `Your OTP code is: ${otp}`;
      await this.sendmail(email, subject, data);

      return {
        isTwoFactorEnabled: true,
        otpToken: otpToken,
      };
    }

    const sessionID = uuidv4();
    const jwtPayload = {
      _id: user._id,
      sub: user._id,
      sid: sessionID,
      system_role: user.system_role
    };
    const accessToken = this.signAccessToken(jwtPayload);
    const refreshToken = this.signRefreshToken(jwtPayload);
    const session = new Session({ sessionID, userID: user._id });
    await session.save();
    await this.logService.createLog({
      user_id: user._id.toString(),
      target_id: user._id.toString(),
      action: "login",
      target_type: "system",
      details: { message: `User "${email}" logged in successfully (Session ID: ${sessionID}).` },
      level: "info",
      ip: ip,
      user_agent: userAgent
    });
    return {
      isTwoFactorEnabled: false,
      refreshToken,
      accessToken,
      sub: String(user._id),
    };
  }

  async verifyOTP(
    email: string,
    otp: string,
    otpToken: string,
    ip?: string, userAgent?: string
  ): Promise<ExchangeTokenResult> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("User not found");
    }

    // ✨ FIX: Xác thực token OTP bằng secret key RIÊNG BIỆT của nó.
    // Đây là bước quan trọng nhất để sửa lỗi login-logout.
    const payload = jwt.verify(otpToken, this.jwtSecret) as { // THAY this.jwtSecret BẰNG this.jwtOtpSecret
      email: string;
      otp: string;
    };

    if (payload.otp !== otp || payload.email !== email) {
      throw new Error("Invalid OTP or token");
    }

    // Sau khi xác thực thành công, tạo session và cấp token cho người dùng.
    const sessionID = uuidv4();
    const jwtPayload = {
      _id: user._id,
      sub: user._id,
      sid: sessionID,
      system_role: user.system_role
    };
    const accessToken = this.signAccessToken(jwtPayload);
    const refreshToken = this.signRefreshToken(jwtPayload);
    const session = new Session({ sessionID, userID: user._id });
    await session.save();
    await this.logService.createLog({
      user_id: user._id.toString(),
      target_id: user._id.toString(),
      action: "login",
      target_type: "system",
      details: { message: `2FA login success for ${email}` },
      level: "info",
      ip: ip,
      user_agent: userAgent
    });
    return {
      refreshToken,
      accessToken,
      sub: String(user._id),
    };
  }

  async sendmail(
    email: string,
    subject: string,
    data: string
  ): Promise<boolean> {
    try {
      const mailIsSent = await mailService.sendEmail({
        emailFrom: "hngvtdat010@gmail.com",
        emailTo: email,
        emailSubject: subject,
        emailText: `${data}`,
      });

      console.log("mailIsSent", mailIsSent);

      if (!mailIsSent) {
        return false;
      }
      return true;
    } catch (ex) {
      const errorMessage = `Error activating email: ${(ex as Error).message}`;
      return false;
    }
  }
  async forgotPassword(email: string, ip?: string, userAgent?: string): Promise<string> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("Email not found");
    }
    const token = await generateJwt({ email });
    console.log("verifyEmailToken generated");
    const subject = "Reset your password";
    const data = `Click the link to reset your password: http://localhost:5173/reset-password?token=${token}`;
    await this.logService.createLog({
      user_id: user?._id?.toString(),
      target_id: user?._id?.toString(),
      action: "update_user",
      target_type: "system",
      details: { message: `Password reset requested by "${email}" — verification email sent.` },
      level: "info",
      ip,
      user_agent: userAgent
    });

    const mailIsSent = await this.sendmail(email, subject, data);
    if (!mailIsSent) {
      throw new Error("Failed to send email");
    }
    return token;
  }

  async resetPassword(token: string, newPassword: string, ip?: string, userAgent?: string): Promise<string> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as { email: string };
      const user = await User.findOne({ email: payload.email });
      if (!user) {
        throw new Error("User not found");
      }
      const oldPasswordHash = user.password;
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();

      await this.logService.createLog({
        user_id: user._id.toString(),
        target_id: user._id.toString(),
        action: "update_user",
        target_type: "system",
        details: {
          before: { password: oldPasswordHash.slice(0, 10) + "..." },
          after: { password: hashedPassword.slice(0, 10) + "..." },
          message: `User "${user.email}" reset password successfully (User ID: ${user._id}).`
        },
        level: "info",
        ip: ip,
        user_agent: userAgent
      });
      return "Password reset successfully";
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }

  async toggleTwoFactorAuth(userId: string, enable: boolean, ip?: string, userAgent?: string): Promise<string> {
    try {
      const user = await User.findOne({ _id: userId });
      if (!user) {
        throw new Error("User not found");
      }
      const oldValue = user.isTwoFactorEnabled;
      user.isTwoFactorEnabled = enable === true;
      await user.save();
      await this.logService.createLog({
        user_id: userId,
        target_id: userId,
        action: "update_user",
        target_type: "system",
        details: {
          before: { isTwoFactorEnabled: oldValue },
          after: { isTwoFactorEnabled: enable },
          message: `User "${user.email}" ${enable ? "enabled" : "disabled"} Two-Factor Authentication (2FA).`
        },
        level: "info",
        ip: ip,
        user_agent: userAgent
      });
      return `Two-factor authentication has been ${enable === true ? "enabled" : "disabled"
        } successfully.`;
    } catch (error) {
      throw new Error("Error toggling two-factor authentication");
    }
  }
}
