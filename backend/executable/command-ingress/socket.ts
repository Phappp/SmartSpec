import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

export let io: Server;

export function initSocket(server: HttpServer) {
    io = new Server(server, {
        cors: {
            origin: '*', // có thể giới hạn origin nếu cần
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        // Ví dụ: join theo userId để gửi thông báo riêng
        socket.on('notification', (data) => {
            const userId = typeof data === "string" ? data : data.room?.replace("user_", "");
            socket.join(`user_${userId}`);
            console.log(`User ${userId} joined to system`);
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });

    return io;
}
