// 📄 features/presence/domain/presence.socket.service.ts
import { io } from '../../../socket';

interface ActiveUser {
    userId: string;
    socketId: string;
    projectId: string;
    userInfo: any;
    joinedAt: Date;
}

export class PresenceSocketService {
    private activeUsers = new Map<string, ActiveUser>();

    /**
     * User join project room
     */
    joinProjectRoom(socket: any, projectId: string, userId: string, userInfo: any): void {
        const activeUser: ActiveUser = {
            userId,
            socketId: socket.id,
            projectId,
            userInfo,
            joinedAt: new Date()
        };

        this.activeUsers.set(socket.id, activeUser);
        socket.join(`project_${projectId}`);

        // Broadcast user joined event
        this.broadcastUserJoined(projectId, userId, userInfo);

        console.log(`✅ User ${userId} joined project room: project_${projectId}`);
    }

    /**
     * User leave project room
     */
    leaveProjectRoom(socket: any, projectId: string): void {
        const activeUser = this.activeUsers.get(socket.id);
        if (activeUser) {
            this.activeUsers.delete(socket.id);
            this.broadcastUserLeft(projectId, activeUser.userId, activeUser.userInfo);
        }

        socket.leave(`project_${projectId}`);
        console.log(`🚪 User left project room: project_${projectId}`);
    }

    /**
     * Get active users in project
     */
    getActiveUsersInProject(projectId: string): ActiveUser[] {
        const users = Array.from(this.activeUsers.values())
            .filter(user => user.projectId === projectId);

        // ✅ THÊM: Remove duplicates by userId
        const uniqueUsers = users.reduce((acc, current) => {
            const existing = acc.find(user => user.userId === current.userId);
            if (!existing) {
                acc.push(current);
            }
            return acc;
        }, [] as ActiveUser[]);

        return uniqueUsers;
    }

    /**
     * Broadcast user joined event
     */
    private broadcastUserJoined(projectId: string, userId: string, userInfo: any): void {
        const activeUsers = this.getActiveUsersInProject(projectId);

        io.to(`project_${projectId}`).emit('user_joined', {
            type: 'USER_JOINED',
            projectId,
            userId,
            userInfo: { // ✅ Đảm bảo có userInfo
                name: userInfo.name,
                email: userInfo.email,
                avatar: userInfo.avatar_url
            },
            activeUsers: activeUsers.map(user => ({ // ✅ Đảm bảo có activeUsers array
                userId: user.userId,
                name: user.userInfo.name,
                email: user.userInfo.email,
                avatar: user.userInfo.avatar_url,
                joinedAt: user.joinedAt
            })),
            timestamp: new Date()
        });
    }

    /**
     * Broadcast user left event
     */
    private broadcastUserLeft(projectId: string, userId: string, userInfo: any): void {
        const activeUsers = this.getActiveUsersInProject(projectId);

        console.log(`📤 Broadcasting user_left for project ${projectId}`);
        console.log(`📤 Remaining active users:`, activeUsers.length);

        io.to(`project_${projectId}`).emit('user_left', {
            type: 'USER_LEFT',
            projectId,
            userId,
            userInfo: {
                name: userInfo.name,
                email: userInfo.email,
                avatar: userInfo.avatar_url
            },
            activeUsers: activeUsers.map(user => ({
                userId: user.userId,
                name: user.userInfo.name,
                email: user.userInfo.email,
                avatar: user.userInfo.avatar_url,
                joinedAt: user.joinedAt
            })),
            timestamp: new Date()
        });
    }
}

export const presenceSocketService = new PresenceSocketService();