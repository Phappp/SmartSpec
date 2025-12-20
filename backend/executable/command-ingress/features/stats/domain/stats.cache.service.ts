// 📄 features/stats/domain/stats.cache.service.ts
import { createClient } from 'redis';
import crypto from 'crypto';

/**
 * Redis Cache Service cho Stats
 * Cache kết quả stats để giảm tải MongoDB và tăng tốc phản hồi
 */
export class StatsCacheService {
    private redisClient: ReturnType<typeof createClient>;
    private readonly KEY_PREFIX = 'stats:';
    private readonly DEFAULT_TTL = 300; // 5 phút
    private readonly LONG_TTL = 900; // 15 phút cho các query phức tạp

    constructor(redisClient: ReturnType<typeof import('redis').createClient>) {
        this.redisClient = redisClient;
    }

    /**
     * Tạo cache key từ filters
     */
    private generateCacheKey(prefix: string, filters?: any): string {
        const filterStr = filters ? JSON.stringify(filters) : 'default';
        const hash = crypto.createHash('md5').update(filterStr).digest('hex');
        return `${this.KEY_PREFIX}${prefix}:${hash}`;
    }

    /**
     * Lấy data từ cache
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const cached = await this.redisClient.get(key);
            if (!cached) {
                return null;
            }
            return JSON.parse(cached) as T;
        } catch (error) {
            console.error(`[StatsCache] Error getting cache for key ${key}:`, error);
            return null;
        }
    }

    /**
     * Lưu data vào cache
     */
    async set(key: string, data: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
        try {
            await this.redisClient.setEx(key, ttl, JSON.stringify(data));
        } catch (error) {
            console.error(`[StatsCache] Error setting cache for key ${key}:`, error);
        }
    }

    /**
     * Lấy hoặc tính toán (với cache)
     */
    async getOrCompute<T>(
        key: string,
        computeFn: () => Promise<T>,
        ttl?: number
    ): Promise<T> {
        // Thử lấy từ cache
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        // Nếu không có cache, tính toán
        const result = await computeFn();

        // Lưu vào cache
        await this.set(key, result, ttl);

        return result;
    }

    /**
     * Xóa cache theo pattern
     */
    async invalidate(pattern: string): Promise<void> {
        try {
            const keys = await this.redisClient.keys(`${this.KEY_PREFIX}${pattern}*`);
            if (keys.length > 0) {
                await this.redisClient.del(keys);
            }
        } catch (error) {
            console.error(`[StatsCache] Error invalidating cache for pattern ${pattern}:`, error);
        }
    }

    /**
     * Xóa tất cả stats cache
     */
    async clearAll(): Promise<void> {
        await this.invalidate('');
    }

    /**
     * Cache key generators cho các loại stats
     */
    getUsageSummaryKey(filters?: any): string {
        return this.generateCacheKey('usage_summary', filters);
    }

    getProviderUsageKey(filters?: any): string {
        return this.generateCacheKey('provider_usage', filters);
    }

    getQuickStatsKey(): string {
        return this.generateCacheKey('quick_stats', {});
    }

    getSystemStatsKey(): string {
        return this.generateCacheKey('system_stats', {});
    }

    getUserAnalyticsKey(filters?: any): string {
        return this.generateCacheKey('user_analytics', filters);
    }

    getFilteredUsageKey(filters?: any): string {
        return this.generateCacheKey('filtered_usage', filters);
    }

    getChartDataKey(filters?: any): string {
        return this.generateCacheKey('chart_data', filters);
    }

    /**
     * Invalidate cache khi có API usage mới
     */
    async invalidateOnNewUsage(): Promise<void> {
        // Xóa các cache liên quan đến usage
        await Promise.all([
            this.invalidate('usage_summary'),
            this.invalidate('provider_usage'),
            this.invalidate('filtered_usage'),
            this.invalidate('chart_data'),
        ]);
    }

    /**
     * Invalidate cache khi có user mới hoặc thay đổi
     */
    async invalidateOnUserChange(): Promise<void> {
        await Promise.all([
            this.invalidate('quick_stats'),
            this.invalidate('user_analytics'),
        ]);
    }
}

