import { Request, Response, NextFunction } from 'express';
import { StatsService } from '../domain/service';

export class StatsController {
    private statsService: StatsService;

    constructor() {
        this.statsService = new StatsService();
    }

    // Tổng hợp usage toàn hệ thống
    async usageSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await this.statsService.fetchUsageSummary();
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    // Thống kê usage theo provider
    async providerUsage(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await this.statsService.fetchProviderUsage();
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
}
