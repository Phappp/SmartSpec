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
import user from "../../../../../internal/model/user";

export class NotificationServiceImpl implements NotificationService {
  async createNotification(
    recipient_id: string | string[],
    sender_id: string,
    type: string,
    title: string,
    message: string,
    link: string
  ): Promise<any> {
    const recipients = Array.isArray(recipient_id)
      ? recipient_id
      : [recipient_id];

    const foundRecipients = await User.find({ _id: { $in: recipients } });
    if (foundRecipients.length === 0) {
      throw new Error("Recipients not found");
    }
    // ✅ Tạo danh sách notification
    const notifications = recipients.map((rid) => ({
      recipient_id: rid,
      sender_id,
      type,
      title,
      message,
      link,
      created_at: new Date(),
    }));

    // ✅ Lưu hàng loạt
    await Notification.insertMany(notifications);
    // return {
    //   recipient_id: recipient_id,
    //   sender_id: sender_id,
    //   type: type,
    //   title: title,
    //   message: message,
    //   link: link,
    //   created_at: new Date().toISOString(),
    // };

    return notifications;
  }

  async getNotificationById(
    userId: string,
    notId: string
  ): Promise<NotificationResponse> {
    const user = await User.findOne({ _id: userId });
    if (!user) {
      throw new Error("User not found");
    }

    const notification = await Notification.findOne({ _id: notId });
    if (!notification) {
      throw new Error("Notification not found");
    }
    console.log("RecipientID: ", notification.recipient_id);
    console.log("Userid: ", user.id);
    if (notification.recipient_id.toString() !== user.id) {
      throw new Error(`You do not have permission to view this notice`);
    }

    return {
      id: notification.id,
      recipient_id: notification.recipient_id,
      sender_id: notification.sender_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      is_read: notification.is_read,
      link: notification.link,
      created_at: notification.created_at,
    };
  }

  async getNotificationsByUserId(
    userId: string
  ): Promise<NotificationResponse[]> {
    const user = await User.findOne({ _id: userId });
    if (!user) {
      throw new Error("User not found");
    }
    const notifications = await Notification.find({
      recipient_id: user.id,
    }).sort({ created_at: -1 });

    return notifications.map((notification) => ({
      id: notification.id,
      recipient_id: notification.recipient_id,
      sender_id: notification.sender_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      is_read: notification.is_read,
      link: notification.link,
      created_at: notification.created_at,
    }));
  }

  async deleteNotification(userId: string, notId: string): Promise<string> {
    const user = await User.findOne({ _id: userId });
    if (!user) {
      throw new Error("User not found");
    }
    const notification = await Notification.findOne({ _id: notId });
    if (!notification) {
      throw new Error("Notification not found");
    }
    if (
      user.system_role === "ADMIN" ||
      user.id === notification.recipient_id.toString()
    ) {
      await notification.deleteOne();
      return "Delete notification Successfull";
    }

    throw new Error(
      "This notification can only be deleted by the admin or its recipient."
    );
  }

  async markAsRead(
    userId: string,
    notId: string,
    is_read: boolean
  ): Promise<NotificationResponse> {
    const user = await User.findOne({ _id: userId });
    if (!user) {
      throw new Error("User not found");
    }

    const notification = await Notification.findOne({ _id: notId });
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.recipient_id.toString() !== user.id) {
      throw new Error(
        "Only the recipient of this notification is allowed to perform this action."
      );
    }

    notification.is_read = is_read;

    await notification.save();

    return {
      id: notification.id,
      recipient_id: notification.recipient_id,
      sender_id: notification.sender_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      is_read: notification.is_read,
      link: notification.link,
      created_at: notification.created_at,
    };
  }
}
