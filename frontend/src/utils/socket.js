// 📄 utils/socket.js - KẾT HỢP CẢ 2 BẢN
import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

// ✅ Giữ auth userId từ bản cũ
const userId = localStorage.getItem("userId");

export const socket = io(BACKEND_URL, {
    transports: ["websocket"],
    reconnection: true,
    auth: {
        userId: userId // Gửi userId khi kết nối
    }
});

export function initSocketConnection() {
    socket.on("connect", () => {
        console.log("🔌 Connected to backend socket:", socket.id);

        // ✅ Tham gia room cá nhân (nếu có userId)
        if (userId) {
            socket.emit("notification", userId);
            console.log("✅ Joined socket room:", `user_${userId}`);
        }

        // ✅ Tham gia room hệ thống (để nhận log toàn hệ thống)
        socket.emit("join_system_logs");
        console.log("🌍 Joined global system log room");
    });

    // ✅ Lắng nghe tất cả log realtime (từ BE)
    socket.on("log_event", (event) => {
        if (event.projectId) {
            console.log("📘 [Project Log Event]:", event);
        } else {
            console.log("🌍 [System Log Event]:", event);
        }
    });

    socket.on("disconnect", () => {
        console.warn("❌ Socket disconnected from server");
    });
}
