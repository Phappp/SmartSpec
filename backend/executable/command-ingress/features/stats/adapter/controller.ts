import { Request, Response, NextFunction } from 'express';
import { StatsService } from '../domain/service';

export class StatsController {
    private statsService: StatsService;

    constructor(statsService?: StatsService) {
        this.statsService = statsService || new StatsService();
    }

    // Tổng hợp usage toàn hệ thống
    async usageSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const { dateFrom, dateTo, provider, status } = req.query;
            const data = await this.statsService.fetchUsageSummary({
                dateFrom: dateFrom as string,
                dateTo: dateTo as string,
                provider: provider as string,
                status: status as 'success' | 'failed' | 'timeout',
            });
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    // Thống kê usage theo provider
    async providerUsage(req: Request, res: Response, next: NextFunction) {
        try {
            const { dateFrom, dateTo, provider, status } = req.query;
            const data = await this.statsService.fetchProviderUsage({
                dateFrom: dateFrom as string,
                dateTo: dateTo as string,
                provider: provider as string,
                status: status as 'success' | 'failed' | 'timeout',
            });
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    // Thống kê nhanh users, projects
    async quickStats(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await this.statsService.fetchQuickStats();
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    // System metrics
    async systemStats(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await this.statsService.fetchSystemStats();
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    // User analytics (new registrations, online users, timeline)
    async userAnalytics(req: Request, res: Response, next: NextFunction) {
        try {
            const { rangeDays } = req.query;
            const range = rangeDays ? parseInt(rangeDays as string, 10) : 7;
            const data = await this.statsService.fetchUserAnalytics({
                rangeDays: isNaN(range) ? 7 : range,
            });
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    // Trends (user, api, project, activity)
    async trends(req: Request, res: Response, next: NextFunction) {
        try {
            // TODO: Tính toán trends từ dữ liệu thật (so sánh hôm nay vs hôm qua)
            res.json({
                userTrend: { type: 'positive', icon: 'trending_up', value: '+12%' },
                apiTrend: { type: 'positive', icon: 'trending_up', value: '+8%' },
                projectTrend: { type: 'positive', icon: 'trending_up', value: '+15%' },
                activityTrend: { type: 'negative', icon: 'trending_down', value: '-3%' }
            });
        } catch (err) {
            next(err);
        }
    }

    // Activities (daily active)
    async activities(req: Request, res: Response, next: NextFunction) {
        try {
            // Đếm số API calls hôm nay
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const ApiUsage = (await import('../../../../../internal/model/api_usage')).default;
            const dailyActive = await ApiUsage.countDocuments({
                created_at: { $gte: today }
            });
            res.json({
                dailyActive: dailyActive || 0
            });
        } catch (err) {
            next(err);
        }
    }

    // System Settings
    async getSettings(req: Request, res: Response, next: NextFunction) {
        try {
            res.json({
                systemName: 'SmartSpec',
                adminEmail: 'admin@smartspec.com',
                maxProjectsPerUser: 10,
                dailyApiLimit: 1000,
                sessionTimeout: 30,
                backupInterval: 24,
                logRetention: 30,
                maintenanceMode: false,
            });
        } catch (err) {
            next(err);
        }
    }

    async updateSettings(req: Request, res: Response, next: NextFunction) {
        try {
            // TODO: Lưu vào database
            res.json({
                message: 'Settings updated successfully',
                data: req.body
            });
        } catch (err) {
            next(err);
        }
    }

    // Lọc API usage với filters
    async filteredUsage(req: Request, res: Response, next: NextFunction) {
        try {
            const { dateFrom, dateTo, provider, status, groupBy } = req.query;
            const data = await this.statsService.fetchFilteredUsage({
                dateFrom: dateFrom as string,
                dateTo: dateTo as string,
                provider: provider as string,
                status: status as 'success' | 'failed' | 'timeout',
                groupBy: groupBy as 'day' | 'month' | 'year',
            });
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    // Lấy dữ liệu cho biểu đồ
    async chartData(req: Request, res: Response, next: NextFunction) {
        try {
            const { dateFrom, dateTo, provider, chartType } = req.query;
            if (!chartType || !['timeline', 'provider', 'status'].includes(chartType as string)) {
                return res.status(400).json({ error: 'Invalid chartType. Must be timeline, provider, or status' });
            }
            const data = await this.statsService.fetchChartData({
                dateFrom: dateFrom as string,
                dateTo: dateTo as string,
                provider: provider as string,
                chartType: chartType as 'timeline' | 'provider' | 'status',
            });
            res.json(data);
        } catch (err) {
            next(err);
        }
    }
}
