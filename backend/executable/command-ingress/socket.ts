// socket.ts
import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { usecaseSocketService } from '../command-ingress/features/usecase/domain/usecase.socket.service';
import { inputSocketService } from '../command-ingress/features/input/domain/input.socket.service';
import { presenceSocketService } from '../command-ingress/features/presence/domain/presence.socket.service';

export let io: Server;
export function initSocket(server: HttpServer) {
    io = new Server(server, {
        cors: { origin: '*', methods: ['GET', 'POST'] }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        // Join notification room (existing)
        socket.on('notification', (data) => {
            const userId = typeof data === "string" ? data : data.room?.replace("user_", "");
            socket.join(`user_${userId}`);
        });

        // ✅ Join project room for realtime collaboration
        socket.on('join_project', async (projectId: string) => {
            const userId = socket.handshake.auth.userId;

            if (!userId) {
                console.warn('⚠️ No userId in socket auth');
                return;
            }

            // Join usecase & input rooms (existing)
            usecaseSocketService.joinProjectRoom(socket, projectId);
            inputSocketService.joinProjectRoom(socket, projectId);

            // ✅ THÊM: Join presence tracking
            try {
                const userInfo = await getUserInfo(userId); // Lấy user info từ DB
                presenceSocketService.joinProjectRoom(socket, projectId, userId, userInfo);
            } catch (error) {
                console.error('Error joining presence room:', error);
            }
        });

        // ✅ Leave project room
        socket.on('leave_project', (projectId: string) => {
            usecaseSocketService.leaveProjectRoom(socket, projectId);
            inputSocketService.leaveProjectRoom(socket, projectId);

            // ✅ THÊM: Leave presence tracking
            presenceSocketService.leaveProjectRoom(socket, projectId);
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);

            // ✅ THÊM: Auto cleanup on disconnect
            // Presence service sẽ tự handle trong leaveProjectRoom
        });
    });

    return io;
}

// Helper function to get user info
async function getUserInfo(userId: string) {
    // Implementation to get user from DB
    const User = await import('../../internal/model/user').then(m => m.default);
    return User.findById(userId).select('name email avatar_url');
}