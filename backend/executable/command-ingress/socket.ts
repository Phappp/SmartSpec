// socket.ts
import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { usecaseSocketService } from '../command-ingress/features/usecase/domain/usecase.socket.service';
import { inputSocketService } from '../command-ingress/features/input/domain/input.socket.service';
import { presenceSocketService } from '../command-ingress/features/presence/domain/presence.socket.service';
import { versionSocketService } from '../command-ingress/features/version/domain/version.socket.service';
import { logSocketService } from '../command-ingress/features/log/domain/log.socket.service';
export let io: Server;

export function initSocket(server: HttpServer) {
    io = new Server(server, {
        cors: { origin: '*', methods: ['GET', 'POST'] }
    });

    // Track projects for each socket for auto cleanup
    const socketProjects = new Map<string, Set<string>>();

    io.on('connection', (socket) => {
        //console.log(`✅ User connected: ${socket.id}, userId: ${socket.handshake.auth.userId}`);
        socket.on('join_system_logs', () => {
            //console.log(`🧩 User ${socket.id} joined global system log room`);
            logSocketService.joinSystemRoom(socket);
            });
        // Initialize projects set for this socket
        socketProjects.set(socket.id, new Set<string>());

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

            //console.log(`🎯 User ${userId} joining project ${projectId}`);

            // Track this project for the socket
            socketProjects.get(socket.id)?.add(projectId);

            // Join usecase & input rooms (existing)
            usecaseSocketService.joinProjectRoom(socket, projectId);
            inputSocketService.joinProjectRoom(socket, projectId);
            logSocketService.joinProjectRoom(socket, projectId);
            // ✅ Join presence tracking
            try {
                const userInfo = await getUserInfo(userId);
                //console.log(`👤 Retrieved user info for ${userId}:`, userInfo?.name);
                presenceSocketService.joinProjectRoom(socket, projectId, userId, userInfo);
            } catch (error) {
                //console.error('Error joining presence room:', error);
                // Fallback với basic info
                const fallbackUserInfo = {
                    name: 'Unknown User',
                    email: '',
                    avatar_url: ''
                };
                presenceSocketService.joinProjectRoom(socket, projectId, userId, fallbackUserInfo);
            }
            versionSocketService.joinProjectRoom(socket, projectId);
            
        });

        // ✅ Leave project room
        socket.on('leave_project', (projectId: string) => {
            const userId = socket.handshake.auth.userId;
            //console.log(`🚪 User ${userId} leaving project ${projectId}`);

            // Remove from tracking
            socketProjects.get(socket.id)?.delete(projectId);

            usecaseSocketService.leaveProjectRoom(socket, projectId);
            inputSocketService.leaveProjectRoom(socket, projectId);
            presenceSocketService.leaveProjectRoom(socket, projectId);
            versionSocketService.leaveProjectRoom(socket, projectId);
            logSocketService.leaveProjectRoom(socket, projectId);
        });

        socket.on('disconnect', (reason) => {
            //console.log(`❌ User disconnected: ${socket.id}, reason: ${reason}`);

            // ✅ Auto cleanup on disconnect - Leave all projects
            const userProjects = socketProjects.get(socket.id);
            if (userProjects) {
                //console.log(`🧹 Cleaning up ${userProjects.size} projects for disconnected user`);
                userProjects.forEach(projectId => {
                    presenceSocketService.leaveProjectRoom(socket, projectId);
                    usecaseSocketService.leaveProjectRoom(socket, projectId);
                    inputSocketService.leaveProjectRoom(socket, projectId);
                });
                socketProjects.delete(socket.id);
            }
        });

        // Error handling
        socket.on('error', (error) => {
            console.error(`❌ Socket error for ${socket.id}:`, error);
        });
    });

    return io;
}

// Helper function to get user info
async function getUserInfo(userId: string) {
    try {
        const User = await import('../../internal/model/user').then(m => m.default);
        const user = await User.findById(userId).select('name email avatar_url');
        
        if (!user) {
            //console.warn(`⚠️ User not found: ${userId}`);
            return null;
        }
        
        return user;
    } catch (error) {
        console.error(`❌ Error fetching user ${userId}:`, error);
        throw error;
    }
}