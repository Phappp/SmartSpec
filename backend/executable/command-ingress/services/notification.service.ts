import exp from "constants";
import { io } from "../socket";

interface notificationOptions {
  recipient: string; // userId nhận thông báo
  sender: string; // userId gửi thông báo
  title: string; // tiêu đề thông báo
  message?: string; // nội dung thông báo
}

export const notificationService = {
  async sendSocketNotification(
    recipient: string,
    sender: string,
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
    console.log("Gửi thông báo qua socket.io đến userId:", recipient);
  },
};
