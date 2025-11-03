// import exp from "constants";
// import { io } from "../socket";

// interface notificationOptions {
//   recipient: string; // userId nhận thông báo
//   sender: string; // userId gửi thông báo
//   title: string; // tiêu đề thông báo
//   message?: string; // nội dung thông báo
// }

// async function SocketNotification(
//   recipient: string | string[],
//   title: string,
//   message?: string
// ): Promise<void>;

// async function SocketNotification(
//   recipient: string | string[],
//   title: string,
//   message?: string,
//   acceptUrl?: string,
//   rejectUrl?: string
// ): Promise<void>;

// // 2️⃣ Phần triển khai duy nhất
// async function SocketNotification(
//   recipient: string | string[],
//   title: string,
//   message?: string,
//   acceptUrl?: string,
//   rejectUrl?: string
// ): Promise<void> {
//   if (acceptUrl && rejectUrl) {
//     // Trường hợp có 5 tham số
//     io.to(`user_${recipient}`).emit("notification", {
//       title,
//       message,
//       action: [
//         { label: "accept", api: acceptUrl },
//         { label: "reject", api: rejectUrl },
//       ],
//     });
//   } else {
//     // Trường hợp có 3 tham số
//     io.to(`user_${recipient}`).emit("notification", {
//       title,
//       message,
//     });
//   }
// }

// // 3️⃣ Gắn hàm đó vào service
// export const notificationService = {
//   SocketNotification,
// };


import { io } from "../socket";

interface notificationOptions {
  recipient: string | string[]; // 1 hoặc nhiều người nhận
  sender?: string; // có thể thêm sau nếu cần
  title: string;
  message?: string;
}

async function SocketNotification(
  recipient: string | string[],
  title: string,
  message?: string
): Promise<void>;

async function SocketNotification(
  recipient: string | string[],
  title: string,
  message?: string,
  acceptUrl?: string,
  rejectUrl?: string
): Promise<void>;

// ✅ Phần triển khai đúng
async function SocketNotification(
  recipient: string | string[],
  title: string,
  message?: string,
  acceptUrl?: string,
  rejectUrl?: string
): Promise<void> {
  const recipients = Array.isArray(recipient) ? recipient : [recipient];

  const payload: any = {
    title,
    message,
  };

  if (acceptUrl && rejectUrl) {
    payload.action = [
      { label: "accept", api: acceptUrl },
      { label: "reject", api: rejectUrl },
    ];
  }

  // ✅ Gửi đến từng user riêng lẻ
  for (const userId of recipients) {
    io.to(`user_${userId}`).emit("notification", payload);
  }
}

export const notificationService = {
  SocketNotification,
};
