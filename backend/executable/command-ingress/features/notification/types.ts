import { ObjectId } from "mongodb";

interface NotificationResponse {
  id: string;
  recipient_id: ObjectId;
  sender_id: ObjectId;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  link: string;
  created_at: Date;
}
interface NotificationService {
  createNotification(
    recipient_id: string,
    sender_id: string,
    type: string,
    title: string,
    message: string,
    link: string
  ): Promise<any>;
  getNotificationById(
    userId: string,
    id: string
  ): Promise<NotificationResponse>;
  getNotificationsByUserId(userId: string): Promise<NotificationResponse[]>;
  deleteNotification(userId: string, notId: string): Promise<string>;
  markAsRead(userid: string, notId: string, is_mark: boolean): Promise<NotificationResponse>;
}

export { NotificationService, NotificationResponse };
