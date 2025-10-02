import { v4 as uuidv4 } from "uuid";
import {
  UserResponse,
  UserService,
  ExchangeTokenResult,
  ExchangeTokenRequest,
} from "../types";
import User from "../../../../../internal/model/user";
import Session from "../../../../../internal/model/session";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import { generateJwt, generateJwtOTP } from "../../../services/jwtService";
import mailService from "../../../services/sendMail.service";
import { faker } from "@faker-js/faker";

export class UserServiceImpl implements UserService {
  async getAllUsers(): Promise<UserResponse[]> {
    const users = await User.find();
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      avatarUrl: user.avatarUrl,
      name: user.name,
      dob: user.dob,
      system_role: user.system_role,
      status: user.status,
      gender: user.gender,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
    }));
  }

  async getUserById(id: string): Promise<UserResponse> {
    const user = await User.findOne({ _id: id });
    if (!user) {
      throw new Error("User not found");
    }
    return {
      id: user.id,
      email: user.email,
      avatarUrl: user.avatarUrl,
      name: user.name,
      dob: user.dob,
      system_role: user.system_role,
      status: user.status,
      gender: user.gender,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
    };
  }

  async getme(token: string): Promise<any> {
    throw new Error("Method not implemented.");
  }
  async changePassword(
    userId: string,
    body: { oldPassword: string; newPassword: string }
  ): Promise<string> {
    const user = await User.findOne({ _id: userId });
    if (!user) {
      throw new Error("User not found");
    }
    if (body.oldPassword === body.newPassword) {
      throw new Error("New password must be different from old password");
    }

    const isMatch = await bcrypt.compare(body.oldPassword, user.password);
    if (!isMatch) {
      throw new Error("Old password is incorrect");
    }

    const hashedPassword = await bcrypt.hash(body.newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    return "Password changed successfully";
  }
  async updateProfile(
    userId: string,
    body: {
      email: string;
      name: string;
      isTwoFactorEnabled: boolean;
      newDob: Date;
      gender: string;
      avatarUrl: string;
      status: string;
    }
  ): Promise<UserResponse> {
    const user = await User.findOne({ _id: userId });
    console.log("User ID:", userId);
    console.log("Updating user profile:", body);
    console.log("Found user:", user);
    if (!user) {
      throw new Error("User not found");
    }
    if (body.email) {
      user.email = body.email;
    }
    if (body.name) {
      user.name = body.name;
    }
    if (body.newDob) {
      user.dob = body.newDob;
    }
    if (body.gender) {
      user.gender = body.gender;
    }
    if (body.avatarUrl) {
      user.avatarUrl = body.avatarUrl;
    }
    if (body.status === "ACTIVE" || body.status === "INACTIVE") {
      user.status = body.status;
    }

    await user.save();

    return {
      id: user.id,
      email: user.email,
      avatarUrl: user.avatarUrl,
      name: user.name,
      dob: user.dob,
      system_role: user.system_role,
      status: user.status,
      gender: user.gender,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
    };
  }
  async resetPasswordById(id: string): Promise<string> {
    const user = await User.findOne({ _id: id });
    if (!user) {
      throw new Error("User not found");
    }

    const newPassword = faker.string.alphanumeric(12).toLowerCase();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    const subject = "Password Reset Notification";
    const data = `Your password has been reset. Your new password is: ${newPassword}. Please change it after logging in.`;
    const mailIsSent = await mailService.sendEmail({
      emailFrom: "hngvtdat010@gmail.com",
      emailTo: user.email,
      emailSubject: subject,
      emailText: `${data}`,
    });

    return "Password reset successfully. New password has been sent to the user's email.";
  }

  async deleteUserById(id: string): Promise<string> {
    const user = await User.findOne({ _id: id });
    if (!user) {
      throw new Error("User not found");
    }

    await User.deleteOne({ _id: id });
    await Session.deleteMany({ userID: id });

    return "User deleted successfully";
  }
}
