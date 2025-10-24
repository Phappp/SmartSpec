// socket.ts
import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { usecaseSocketService } from '../command-ingress/features/usecase/domain/usecase.socket.service'; 
import { inputSocketService } from '../command-ingress/features/input/domain/input.socket.service';
import { versionSocketService } from '../command-ingress/features/version/domain/version.socket.service';

export let io: Server;

export function initSocket(server: HttpServer) {
    io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        // Join notification room (existing)
        socket.on('notification', (data) => {
            const userId = typeof data === "string" ? data : data.room?.replace("user_", "");
            socket.join(`user_${userId}`);
            console.log(`User ${userId} joined to system`);
        });

        // ✅ THÊM: Join project room for realtime collaboration
        socket.on('join_project', (projectId: string) => {
            usecaseSocketService.joinProjectRoom(socket, projectId);
            inputSocketService.joinProjectRoom(socket, projectId);
            versionSocketService.joinProjectRoom(socket, projectId);
        });

        // ✅ THÊM: Leave project room
        socket.on('leave_project', (projectId: string) => {
            usecaseSocketService.leaveProjectRoom(socket, projectId);
            inputSocketService.leaveProjectRoom(socket, projectId);
            versionSocketService.leaveProjectRoom(socket, projectId);
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });

    return io;
}