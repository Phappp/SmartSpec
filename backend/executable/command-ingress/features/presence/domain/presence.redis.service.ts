// 📄 features/presence/domain/presence.redis.service.ts
import { createClient } from 'redis';

interface ActiveUser {
    userId: string;
    socketId: string;
    projectId: string;
    userInfo: any;
    joinedAt: Date;
}

/**
 * Redis-based Presence Service
 * Lưu trữ active users trong Redis để chia sẻ giữa nhiều server instances
 */
export class PresenceRedisService {
    private redisClient: ReturnType<typeof createClient>;
    private readonly KEY_PREFIX = 'presence:';
    private readonly KEY_SOCKET_PREFIX = 'presence:socket:';
    private readonly KEY_PROJECT_PREFIX = 'presence:project:';
    private readonly TTL_SECONDS = 3600; // 1 giờ

    constructor(redisClient: ReturnType<typeof import('redis').createClient>) {
        this.redisClient = redisClient;
    }

    /**
     * Lưu active user vào Redis
     */
    async addActiveUser(user: ActiveUser): Promise<void> {
        const socketKey = `${this.KEY_SOCKET_PREFIX}${user.socketId}`;
        const projectKey = `${this.KEY_PROJECT_PREFIX}${user.projectId}`;
        const userKey = `${this.KEY_PREFIX}user:${user.userId}:project:${user.projectId}`;

        const userData = {
            userId: user.userId,
            socketId: user.socketId,
            projectId: user.projectId,
            userInfo: JSON.stringify(user.userInfo),
            joinedAt: user.joinedAt.toISOString(),
        };

        // Lưu mapping socket -> user
        await this.redisClient.setEx(socketKey, this.TTL_SECONDS, JSON.stringify(userData));

        // Lưu user vào project set (Sorted Set với timestamp để tự động cleanup)
        const score = Date.now();
        await this.redisClient.zAdd(projectKey, {
            score,
            value: userKey,
        });
        await this.redisClient.expire(projectKey, this.TTL_SECONDS);

        // Lưu user data
        await this.redisClient.setEx(userKey, this.TTL_SECONDS, JSON.stringify(userData));
    }

    /**
     * Xóa active user khỏi Redis
     */
    async removeActiveUser(socketId: string): Promise<ActiveUser | null> {
        const socketKey = `${this.KEY_SOCKET_PREFIX}${socketId}`;
        const userDataStr = await this.redisClient.get(socketKey);

        if (!userDataStr) {
            return null;
        }

        const userData = JSON.parse(userDataStr);
        const projectKey = `${this.KEY_PROJECT_PREFIX}${userData.projectId}`;
        const userKey = `${this.KEY_PREFIX}user:${userData.userId}:project:${userData.projectId}`;

        // Xóa mapping socket
        await this.redisClient.del(socketKey);

        // Xóa user khỏi project set
        await this.redisClient.zRem(projectKey, userKey);

        // Xóa user data
        await this.redisClient.del(userKey);

        return {
            userId: userData.userId,
            socketId: userData.socketId,
            projectId: userData.projectId,
            userInfo: JSON.parse(userData.userInfo),
            joinedAt: new Date(userData.joinedAt),
        };
    }

    /**
     * Lấy danh sách active users trong project
     */
    async getActiveUsersInProject(projectId: string): Promise<ActiveUser[]> {
        const projectKey = `${this.KEY_PROJECT_PREFIX}${projectId}`;

        // Lấy tất cả user keys trong project (sorted by timestamp)
        const userKeys = await this.redisClient.zRange(projectKey, 0, -1);

        if (userKeys.length === 0) {
            return [];
        }

        // Lấy user data cho tất cả keys
        const userDataPromises = userKeys.map(async (userKey) => {
            const userDataStr = await this.redisClient.get(userKey);
            if (!userDataStr) {
                return null;
            }
            const userData = JSON.parse(userDataStr);
            return {
                userId: userData.userId,
                socketId: userData.socketId,
                projectId: userData.projectId,
                userInfo: JSON.parse(userData.userInfo),
                joinedAt: new Date(userData.joinedAt),
            };
        });

        const users = (await Promise.all(userDataPromises)).filter(
            (user): user is ActiveUser => user !== null
        );

        // Remove duplicates by userId - giữ user mới nhất (dựa trên joinedAt)
        const uniqueUsersMap = new Map<string, ActiveUser>();
        users.forEach((user) => {
            const existing = uniqueUsersMap.get(user.userId);
            if (!existing || user.joinedAt > existing.joinedAt) {
                uniqueUsersMap.set(user.userId, user);
            }
        });

        return Array.from(uniqueUsersMap.values());
    }

    /**
     * Cleanup expired entries (có thể gọi định kỳ)
     */
    async cleanupExpiredEntries(): Promise<void> {
        // Redis tự động xóa entries hết hạn TTL, nhưng có thể cleanup thủ công nếu cần
        // Có thể implement logic cleanup cho các entries không còn valid
    }

    /**
     * Refresh TTL cho user (gọi khi user còn active)
     */
    async refreshUserTTL(socketId: string): Promise<void> {
        const socketKey = `${this.KEY_SOCKET_PREFIX}${socketId}`;
        const exists = await this.redisClient.exists(socketKey);

        if (exists) {
            await this.redisClient.expire(socketKey, this.TTL_SECONDS);
        }
    }

    /**
     * Xóa tất cả users trong project (khi project bị xóa)
     */
    async clearProject(projectId: string): Promise<void> {
        const projectKey = `${this.KEY_PROJECT_PREFIX}${projectId}`;
        const userKeys = await this.redisClient.zRange(projectKey, 0, -1);

        if (userKeys.length > 0) {
            // Xóa từng key một để tránh lỗi TypeScript với Redis client
            const deletePromises = userKeys.map(key => this.redisClient.del(key));
            await Promise.all(deletePromises);
        }

        await this.redisClient.del(projectKey);
    }
}

