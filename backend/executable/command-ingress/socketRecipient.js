import { io } from "socket.io-client";

// kết nối tới backend socket server
const socket = io("http://localhost:8000", {
  transports: ["websocket"],
});

// giả lập userId bạn muốn test
const userId = "68ee63c0e8f7c01bfb234d90"; // thay bằng ObjectId thực tế

socket.on("connect", () => {
  console.log("Connected to socket server!");
  // join vào room userId
  socket.emit("notification", userId);
});

socket.on("notification", (data) => {
  console.log("📩 Notification received:", data);
});
