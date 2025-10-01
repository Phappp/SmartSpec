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
import { StringModule } from "@faker-js/faker/.";

export class UserServiceImpl implements UserService {
  async getAllUsers(token: string): Promise<UserResponse[]> {
    throw new Error("Method not implemented.");
  }
  async getUserById(id: string, token: string): Promise<UserResponse> {
    throw new Error("Method not implemented.");
  }
  async getme(token: string): Promise<any> {
    throw new Error("Method not implemented.");
  }
  async changePassword(token: string, body: any): Promise<string> {
    throw new Error("Method not implemented.");
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
}
