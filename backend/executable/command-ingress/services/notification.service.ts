import exp from "constants";
import { io } from "../socket";

interface notificationOptions {
  recipient: string; // userId nhận thông báo
  sender: string; // userId gửi thông báo
  title: string; // tiêu đề thông báo
  message?: string; // nội dung thông báo
}

export const notificationService = {
  async sendInvitationSocketNotification(
    recipient: string,
    title: string,
    message?: string,
    acceptUrl?: string,
    rejectUrl?: string
  ) {
    io.to(`user_${recipient}`).emit("notification", {
      title: title,
      message: message,
      action: [
        { label: "accept", api: acceptUrl },
        { label: "reject", api: rejectUrl },
      ],
    });
  },

  async RespondToInvitation(
    recipient: string,
    title: string,
    message?: string
  ) {
    io.to(`user_${recipient}`).emit("notification", {
      title: title,
      message: message,
    });
  },
};
