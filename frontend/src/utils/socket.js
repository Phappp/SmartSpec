// 📄 utils/socket.js - SỬA ĐỔI
import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export const socket = io(BACKEND_URL, {
    transports: ["websocket"],
    reconnection: true,
    auth: {
        userId: localStorage.getItem("userId") // ✅ THÊM: Gửi userId khi kết nối
    }
});

export function initSocketConnection() {
    const userId = localStorage.getItem("userId");
    if (userId) {
        socket.emit("notification", userId);
        console.log("✅ Joined socket room:", `user_${userId}`);
    }
}