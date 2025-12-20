// 📄 features/presence/domain/presence.socket.service.ts
import { io } from '../../../socket';
import { PresenceRedisService } from './presence.redis.service';

interface ActiveUser {
    userId: string;
    socketId: string;
    projectId: string;
    userInfo: any;
    joinedAt: Date;
}

export class PresenceSocketService {
    private redisService: PresenceRedisService | null = null;

    /**
     * Khởi tạo Redis service (gọi từ app.ts khi có Redis client)
     */
    setRedisService(redisService: PresenceRedisService): void {
        this.redisService = redisService;
    }

    /**
     * User join project room - REDIS-BACKED
     */
    async joinProjectRoom(socket: any, projectId: string, userId: string, userInfo: any): Promise<void> {
        const activeUser: ActiveUser = {
            userId,
            socketId: socket.id,
            projectId,
            userInfo: userInfo || { name: 'Unknown User', email: '', avatar_url: '' },
            joinedAt: new Date()
        };

        // Lưu vào Redis nếu có Redis service
        if (this.redisService) {
            await this.redisService.addActiveUser(activeUser);
        }

        socket.join(`project_${projectId}`);

        // Lấy danh sách active users (từ Redis hoặc fallback)
        const currentActiveUsers = await this.getActiveUsersInProject(projectId);

        // Broadcast user joined event với accurate count
        await this.broadcastUserJoined(projectId, userId, userInfo);
    }

    /**
     * User leave project room - REDIS-BACKED
     */
    async leaveProjectRoom(socket: any, projectId: string): Promise<void> {
        let activeUser: ActiveUser | null = null;

        // Xóa khỏi Redis nếu có Redis service
        if (this.redisService) {
            activeUser = await this.redisService.removeActiveUser(socket.id);
        }

        if (activeUser) {
            const remainingUsers = await this.getActiveUsersInProject(projectId);
            await this.broadcastUserLeft(projectId, activeUser.userId, activeUser.userInfo, remainingUsers);
        } else {
            // Không log warning vì đây là trường hợp bình thường:
            // - Socket disconnect nhưng chưa join project
            // - Socket đã bị cleanup trước đó (TTL hết hạn)
            // - Socket disconnect được gọi nhiều lần (race condition)
            // Chỉ log ở debug level nếu cần
            // console.log(`🚪 No active user found for socket ${socket.id} - this is normal if socket was not in Redis`);
        }

        socket.leave(`project_${projectId}`);
    }

    /**
     * Get active users in project - REDIS-BACKED
     */
    async getActiveUsersInProject(projectId: string): Promise<ActiveUser[]> {
        if (this.redisService) {
            return await this.redisService.getActiveUsersInProject(projectId);
        }

        // Fallback: trả về empty array nếu không có Redis
        return [];
    }

    /**
     * Broadcast user joined event - REDIS-BACKED
     */
    private async broadcastUserJoined(projectId: string, userId: string, userInfo: any): Promise<void> {
        const activeUsers = await this.getActiveUsersInProject(projectId);
        const activeUsersData = activeUsers.map(user => ({
            userId: user.userId,
            name: user.userInfo.name,
            email: user.userInfo.email,
            avatar: user.userInfo.avatar_url,
            joinedAt: user.joinedAt
        }));

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
     * Broadcast user left event - REDIS-BACKED
     */
    private async broadcastUserLeft(projectId: string, userId: string, userInfo: any, remainingUsers?: ActiveUser[]): Promise<void> {
        const activeUsers = remainingUsers || await this.getActiveUsersInProject(projectId);
        const activeUsersData = activeUsers.map(user => ({
            userId: user.userId,
            name: user.userInfo.name,
            email: user.userInfo.email,
            avatar: user.userInfo.avatar_url,
            joinedAt: user.joinedAt
        }));

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