import { v4 as uuidv4 } from "uuid";
import { NotificationService, NotificationResponse } from "../types";
import User from "../../../../../internal/model/user";
import Notification from "../../../../../internal/model/notification";
import Session from "../../../../../internal/model/session";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import { generateJwt, generateJwtOTP } from "../../../services/jwtService";
import mailService from "../../../services/sendMail.service";
import { faker } from "@faker-js/faker";

export class NotificationServiceImpl implements NotificationService {
  async createNotification(
    recipient_id: string,
    sender_id: string,
    type: string,
    title: string,
    message: string,
    link: string
  ): Promise<any> {
    const recipient = User.findOne({ _id: recipient_id });
    if (!recipient) {
      throw new Error("Recipient not found");
    }
    const notification = new Notification({
      recipient_id: recipient_id,
      sender_id: sender_id,
      type: type,
      title: title,
      message: message,
      link: link,
    });
    await notification.save();

    return {
      recipient_id: recipient_id,
      sender_id: sender_id,
      type: type,
      title: title,
      message: message,
      link: link,
      created_at: new Date().toISOString(),
    };
  }

  async getNotificationById(): Promise<NotificationResponse> {
    throw new Error("Method not implemented.");
  }

  async getNotificationsByUserId(): Promise<NotificationResponse[]> {
    throw new Error("Method not implemented.");
  }

  async deleteNotification(): Promise<string> {
    throw new Error("Method not implemented.");
  }
}
