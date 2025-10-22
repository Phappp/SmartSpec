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
     * User join project room - FIXED ACTIVE MEMBER COUNT
     */
    joinProjectRoom(socket: any, projectId: string, userId: string, userInfo: any): void {
        console.log(`🔍 [JOIN] User ${userId} joining project ${projectId}`);
        console.log(`🔍 [JOIN] Current active users before:`, this.getActiveUsersInProject(projectId).length);

        const activeUser: ActiveUser = {
            userId,
            socketId: socket.id,
            projectId,
            userInfo: userInfo || { name: 'Unknown User', email: '', avatar_url: '' },
            joinedAt: new Date()
        };

        // Remove any existing entry for this socket to avoid duplicates
        this.activeUsers.delete(socket.id);
        this.activeUsers.set(socket.id, activeUser);
        socket.join(`project_${projectId}`);

        const currentActiveUsers = this.getActiveUsersInProject(projectId);
        console.log(`🔍 [JOIN] Active users after join:`, currentActiveUsers.length);
        console.log(`🔍 [JOIN] Users details:`, currentActiveUsers.map(u => ({ userId: u.userId, name: u.userInfo.name })));

        // Broadcast user joined event với accurate count
        this.broadcastUserJoined(projectId, userId, userInfo);

        console.log(`✅ User ${userId} joined project room: project_${projectId}`);
    }

    /**
     * User leave project room - FIXED ACTIVE MEMBER COUNT
     */
    leaveProjectRoom(socket: any, projectId: string): void {
        console.log(`🔍 [LEAVE] Socket ${socket.id} leaving project ${projectId}`);
        console.log(`🔍 [LEAVE] Current active users before:`, this.getActiveUsersInProject(projectId).length);

        const activeUser = this.activeUsers.get(socket.id);

        if (activeUser) {
            this.activeUsers.delete(socket.id);
            console.log(`🔍 [LEAVE] After deletion - Total active users in system: ${this.activeUsers.size}`);

            const remainingUsers = this.getActiveUsersInProject(projectId);
            console.log(`🔍 [LEAVE] Remaining users in project ${projectId}:`, remainingUsers.length);
            console.log(`🔍 [LEAVE] Remaining users details:`, remainingUsers.map(u => ({ userId: u.userId, name: u.userInfo.name })));

            // Broadcast với remaining users chính xác
            this.broadcastUserLeft(projectId, activeUser.userId, activeUser.userInfo, remainingUsers);
        } else {
            console.log(`🚪 No active user found for socket ${socket.id}`);
        }

        socket.leave(`project_${projectId}`);
    }

    /**
     * Get active users in project - FIXED DUPLICATE HANDLING
     */
    getActiveUsersInProject(projectId: string): ActiveUser[] {
        const allUsers = Array.from(this.activeUsers.values());
        
        // Filter by project
        const projectUsers = allUsers.filter(user => user.projectId === projectId);
        
        // Remove duplicates by userId - giữ user mới nhất
        const uniqueUsersMap = new Map<string, ActiveUser>();
        
        projectUsers.forEach(user => {
            const existing = uniqueUsersMap.get(user.userId);
            if (!existing || user.joinedAt > existing.joinedAt) {
                uniqueUsersMap.set(user.userId, user);
            }
        });

        const uniqueUsers = Array.from(uniqueUsersMap.values());
        
        console.log(`🔍 [ACTIVE_USERS] Project ${projectId}: ${uniqueUsers.length} unique users`);
        
        return uniqueUsers;
    }

    /**
     * Broadcast user joined event - FIXED DATA CONSISTENCY
     */
    private broadcastUserJoined(projectId: string, userId: string, userInfo: any): void {
        const activeUsers = this.getActiveUsersInProject(projectId);
        const activeUsersData = activeUsers.map(user => ({
            userId: user.userId,
            name: user.userInfo.name,
            email: user.userInfo.email,
            avatar: user.userInfo.avatar_url,
            joinedAt: user.joinedAt
        }));

        console.log(`📤 [BROADCAST_JOIN] Project ${projectId} - Active users:`, activeUsersData.length);
        console.log(`📤 [BROADCAST_JOIN] Users:`, activeUsersData.map(u => u.userId));

        io.to(`project_${projectId}`).emit('user_joined', {
            type: 'USER_JOINED',
            projectId,
            userId,
            userInfo: {
                name: userInfo.name,
                email: userInfo.email,
                avatar: userInfo.avatar_url
            },
            activeUsers: activeUsersData, // ✅ LUÔN gửi danh sách chính xác
            timestamp: new Date()
        });
    }

    /**
     * Broadcast user left event - FIXED DATA CONSISTENCY
     */
    private broadcastUserLeft(projectId: string, userId: string, userInfo: any, remainingUsers?: ActiveUser[]): void {
        const activeUsers = remainingUsers || this.getActiveUsersInProject(projectId);
        const activeUsersData = activeUsers.map(user => ({
            userId: user.userId,
            name: user.userInfo.name,
            email: user.userInfo.email,
            avatar: user.userInfo.avatar_url,
            joinedAt: user.joinedAt
        }));

        console.log(`📤 [BROADCAST_LEFT] Project ${projectId} - Remaining users:`, activeUsersData.length);
        console.log(`📤 [BROADCAST_LEFT] Users:`, activeUsersData.map(u => u.userId));

        io.to(`project_${projectId}`).emit('user_left', {
            type: 'USER_LEFT',
            projectId,
            userId,
            userInfo: {
                name: userInfo.name,
                email: userInfo.email,
                avatar: userInfo.avatar_url
            },
            activeUsers: activeUsersData, // ✅ LUÔN gửi danh sách chính xác
            timestamp: new Date()
        });
    }
}

export const presenceSocketService = new PresenceSocketService();