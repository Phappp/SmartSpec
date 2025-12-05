import ApiUsage from '../../../../../internal/model/api_usage';
import User from '../../../../../internal/model/user';
import Project from '../../../../../internal/model/project';
import Key from '../../../../../internal/model/api_key';

export class StatsService {
  /**
   * Tổng hợp usage (tổng request/token, success/failed)
   * Hỗ trợ filter theo date range, provider, status để phục vụ bộ lọc ở dashboard
   */
  async fetchUsageSummary(filters?: {
    dateFrom?: string;
    dateTo?: string;
    provider?: string;
    status?: 'success' | 'failed' | 'timeout';
  }) {
    try {
      const pipeline: any[] = [];

      // Áp dụng bộ lọc nếu có
      if (filters && (filters.dateFrom || filters.dateTo || filters.provider || filters.status)) {
        const matchStage: any = {};

        if (filters.dateFrom || filters.dateTo) {
          matchStage.created_at = {};
          if (filters.dateFrom) {
            const dateFrom = new Date(filters.dateFrom);
            dateFrom.setHours(0, 0, 0, 0);
            matchStage.created_at.$gte = dateFrom;
          }
          if (filters.dateTo) {
            const dateTo = new Date(filters.dateTo);
            dateTo.setHours(23, 59, 59, 999);
            matchStage.created_at.$lte = dateTo;
          }
        }

        if (filters.provider) {
          matchStage.provider = filters.provider.toLowerCase();
        }

        if (filters.status) {
          matchStage.status = filters.status;
        }

        pipeline.push({ $match: matchStage });
      }

      pipeline.push({
        $group: {
          _id: null,
          total_requests: { $sum: 1 },
          total_tokens: { $sum: '$total_tokens' },
          total_success: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          total_failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
        },
      });

      const stats = await ApiUsage.aggregate(pipeline);

      const result = stats[0] || {
        total_requests: 0,
        total_tokens: 0,
        total_success: 0,
        total_failed: 0,
      };

      return {
        total_requests: result.total_requests,
        total_tokens: result.total_tokens,
        total_success: result.total_success,
        total_failed: result.total_failed,
      };
    } catch (error) {
      console.error('Error fetching usage summary:', error);
      return {
        total_requests: 0,
        total_tokens: 0,
        total_success: 0,
        total_failed: 0,
      };
    }
  }

  /**
   * Thống kê usage theo provider
   * Hỗ trợ filter theo date range, status để đồng bộ với dashboard filters
   */
  async fetchProviderUsage(filters?: {
    dateFrom?: string;
    dateTo?: string;
    provider?: string;
    status?: 'success' | 'failed' | 'timeout';
  }) {
    try {
      const pipeline: any[] = [];

      if (filters && (filters.dateFrom || filters.dateTo || filters.provider || filters.status)) {
        const matchStage: any = {};

        if (filters.dateFrom || filters.dateTo) {
          matchStage.created_at = {};
          if (filters.dateFrom) {
            const dateFrom = new Date(filters.dateFrom);
            dateFrom.setHours(0, 0, 0, 0);
            matchStage.created_at.$gte = dateFrom;
          }
          if (filters.dateTo) {
            const dateTo = new Date(filters.dateTo);
            dateTo.setHours(23, 59, 59, 999);
            matchStage.created_at.$lte = dateTo;
          }
        }

        if (filters.provider) {
          matchStage.provider = filters.provider.toLowerCase();
        }

        if (filters.status) {
          matchStage.status = filters.status;
        }

        pipeline.push({ $match: matchStage });
      }

      pipeline.push(
        {
          $group: {
            _id: '$provider',
            requests: { $sum: 1 },
            tokens: { $sum: '$total_tokens' },
            success: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
            },
            failed: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            },
          },
        },
        {
          $project: {
            provider: {
              $switch: {
                branches: [
                  { case: { $eq: ['$_id', 'gemini'] }, then: 'Gemini' },
                  { case: { $eq: ['$_id', 'openai'] }, then: 'OpenAI' },
                  { case: { $eq: ['$_id', 'claude'] }, then: 'Claude' },
                ],
                default: 'Other',
              },
            },
            requests: 1,
            tokens: 1,
            success: 1,
            failed: 1,
          },
        },
        { $sort: { requests: -1 } },
      );

      const stats = await ApiUsage.aggregate(pipeline);

      return stats.length > 0 ? stats : [
        { provider: 'Gemini', requests: 0, tokens: 0, success: 0, failed: 0 },
        { provider: 'OpenAI', requests: 0, tokens: 0, success: 0, failed: 0 },
        { provider: 'Claude', requests: 0, tokens: 0, success: 0, failed: 0 },
      ];
    } catch (error) {
      console.error('Error fetching provider usage:', error);
      return [
        { provider: 'Gemini', requests: 0, tokens: 0, success: 0, failed: 0 },
        { provider: 'OpenAI', requests: 0, tokens: 0, success: 0, failed: 0 },
        { provider: 'Claude', requests: 0, tokens: 0, success: 0, failed: 0 },
      ];
    }
  }

  async fetchQuickStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [users, projects] = await Promise.all([
        User.aggregate([
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              activeUsers: {
                $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] }
              },
              pendingUsers: {
                $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] }
              },
              newUsersToday: {
                $sum: {
                  $cond: [
                    { $gte: ['$created_at', today] },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ]),
        Project.aggregate([
          {
            $group: {
              _id: null,
              totalProjects: { $sum: 1 },
              activeProjects: {
                $sum: { $cond: [{ $eq: ['$isTrashed', false] }, 1, 0] }
              },
              newProjectsToday: {
                $sum: {
                  $cond: [
                    { $gte: ['$createdAt', today] },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ]),
      ]);

      const userStats = users[0] || {
        totalUsers: 0,
        activeUsers: 0,
        pendingUsers: 0,
        newUsersToday: 0,
      };

      const projectStats = projects[0] || {
        totalProjects: 0,
        activeProjects: 0,
        newProjectsToday: 0,
      };

      return {
        totalUsers: userStats.totalUsers,
        activeUsers: userStats.activeUsers,
        pendingUsers: userStats.pendingUsers,
        newUsersToday: userStats.newUsersToday,
        totalProjects: projectStats.totalProjects,
        activeProjects: projectStats.activeProjects,
        newProjectsToday: projectStats.newProjectsToday,
      };
    } catch (error) {
      console.error('Error fetching quick stats:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        pendingUsers: 0,
        newUsersToday: 0,
        totalProjects: 0,
        activeProjects: 0,
        newProjectsToday: 0,
      };
    }
  }

  async fetchSystemStats() {
    // System metrics vẫn có thể mock hoặc lấy từ system monitoring
    // Nếu có monitoring service thì tích hợp sau
    return {
      cpu: 40,
      memory: 72,
      disk: 55,
      services: [
        {
          name: 'API Gateway',
          description: 'Cổng kết nối API chính',
          status: 'online',
          statusText: 'Online',
          uptime: '99.9%',
        },
        {
          name: 'Database',
          description: 'Hệ thống cơ sở dữ liệu',
          status: 'online',
          statusText: 'Online',
          uptime: '99.8%',
        },
        {
          name: 'Authentication',
          description: 'Dịch vụ xác thực',
          status: 'online',
          statusText: 'Online',
          uptime: '100%',
        },
        {
          name: 'File Storage',
          description: 'Lưu trữ file',
          status: 'maintenance',
          statusText: 'Bảo trì',
          uptime: '95.2%',
        },
        {
          name: 'Cache Service',
          description: 'Dịch vụ cache',
          status: 'online',
          statusText: 'Online',
          uptime: '99.7%',
        },
      ],
    };
  }

  /**
   * Analytics người dùng: tổng, active, pending, mới, online hôm nay, timeline đăng ký
   */
  async fetchUserAnalytics(filters?: { rangeDays?: number }) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const rangeDays = filters?.rangeDays && filters.rangeDays > 0 ? filters.rangeDays : 7;
      const fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - (rangeDays - 1));

      const [userAgg, registrationTimeline, onlineToday] = await Promise.all([
        // Tổng quan user
        User.aggregate([
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              activeUsers: {
                $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] }
              },
              pendingUsers: {
                $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] }
              },
            },
          },
        ]),
        // Timeline đăng ký trong N ngày gần đây
        User.aggregate([
          {
            $match: {
              created_at: { $gte: fromDate },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: '$created_at' },
                month: { $month: '$created_at' },
                day: { $dayOfMonth: '$created_at' },
              },
              date: {
                $first: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$created_at',
                  },
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        // Người dùng "online hôm nay": có API usage trong hôm nay
        ApiUsage.aggregate([
          {
            $match: {
              created_at: { $gte: today },
              user_id: { $ne: null },
            },
          },
          {
            $group: {
              _id: '$user_id',
            },
          },
          {
            $group: {
              _id: null,
              onlineToday: { $sum: 1 },
            },
          },
        ]),
      ]);

      const userStats = userAgg[0] || {
        totalUsers: 0,
        activeUsers: 0,
        pendingUsers: 0,
      };

      const onlineCount =
        onlineToday && onlineToday[0] && typeof onlineToday[0].onlineToday === 'number'
          ? onlineToday[0].onlineToday
          : 0;

      return {
        counters: {
          totalUsers: userStats.totalUsers,
          activeUsers: userStats.activeUsers,
          pendingUsers: userStats.pendingUsers,
          newUsersToday: await this.countNewUsersToday(today),
          onlineToday: onlineCount,
        },
        registrationTimeline: registrationTimeline.map((r) => ({
          date: r.date,
          count: r.count,
        })),
        rangeDays,
      };
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      return {
        counters: {
          totalUsers: 0,
          activeUsers: 0,
          pendingUsers: 0,
          newUsersToday: 0,
          onlineToday: 0,
        },
        registrationTimeline: [],
        rangeDays: filters?.rangeDays || 7,
      };
    }
  }

  // Helper: đếm user đăng ký hôm nay
  private async countNewUsersToday(today: Date): Promise<number> {
    const result = await User.aggregate([
      {
        $match: {
          created_at: { $gte: today },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);
    return result[0]?.count || 0;
  }

  /**
   * Lọc API usage với các filters
   */
  async fetchFilteredUsage(filters: {
    dateFrom?: string;
    dateTo?: string;
    provider?: string;
    status?: 'success' | 'failed' | 'timeout';
    groupBy?: 'day' | 'month' | 'year';
  }) {
    try {
      const matchStage: any = {};

      // Filter theo date range
      if (filters.dateFrom || filters.dateTo) {
        matchStage.created_at = {};
        if (filters.dateFrom) {
          const dateFrom = new Date(filters.dateFrom);
          dateFrom.setHours(0, 0, 0, 0);
          matchStage.created_at.$gte = dateFrom;
        }
        if (filters.dateTo) {
          const dateTo = new Date(filters.dateTo);
          dateTo.setHours(23, 59, 59, 999);
          matchStage.created_at.$lte = dateTo;
        }
      }

      // Filter theo provider
      if (filters.provider) {
        matchStage.provider = filters.provider.toLowerCase();
      }

      // Filter theo status
      if (filters.status) {
        matchStage.status = filters.status;
      }

      const pipeline: any[] = [{ $match: matchStage }];

      // Group by time period
      if (filters.groupBy) {
        let dateFormat: any = {};
        if (filters.groupBy === 'day') {
          dateFormat = {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' },
            day: { $dayOfMonth: '$created_at' },
          };
        } else if (filters.groupBy === 'month') {
          dateFormat = {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' },
          };
        } else if (filters.groupBy === 'year') {
          dateFormat = {
            year: { $year: '$created_at' },
          };
        }

        pipeline.push({
          $group: {
            _id: dateFormat,
            date: {
              $first: {
                $dateToString: {
                  format: filters.groupBy === 'day' ? '%Y-%m-%d' : filters.groupBy === 'month' ? '%Y-%m' : '%Y',
                  date: '$created_at',
                },
              },
            },
            requests: { $sum: 1 },
            tokens: { $sum: '$total_tokens' },
            success: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
            },
            failed: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
            },
            avgResponseTime: { $avg: '$response_time' },
          },
        });
        pipeline.push({ $sort: { _id: 1 } });
      } else {
        // Không group by, trả về tổng hợp
        pipeline.push({
          $group: {
            _id: null,
            requests: { $sum: 1 },
            tokens: { $sum: '$total_tokens' },
            success: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
            },
            failed: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
            },
            avgResponseTime: { $avg: '$response_time' },
          },
        });
      }

      const results = await ApiUsage.aggregate(pipeline);
      return results;
    } catch (error) {
      console.error('Error fetching filtered usage:', error);
      return [];
    }
  }

  /**
   * Lấy dữ liệu cho biểu đồ
   */
  async fetchChartData(filters: {
    dateFrom?: string;
    dateTo?: string;
    provider?: string;
    chartType: 'timeline' | 'provider' | 'status';
  }) {
    try {
      const matchStage: any = {};

      if (filters.dateFrom || filters.dateTo) {
        matchStage.created_at = {};
        if (filters.dateFrom) {
          const dateFrom = new Date(filters.dateFrom);
          dateFrom.setHours(0, 0, 0, 0);
          matchStage.created_at.$gte = dateFrom;
        }
        if (filters.dateTo) {
          const dateTo = new Date(filters.dateTo);
          dateTo.setHours(23, 59, 59, 999);
          matchStage.created_at.$lte = dateTo;
        }
      }

      if (filters.provider) {
        matchStage.provider = filters.provider.toLowerCase();
      }

      if (filters.chartType === 'timeline') {
        // Biểu đồ theo thời gian (line chart)
        const pipeline: any[] = [
          { $match: matchStage },
          {
            $group: {
              _id: {
                year: { $year: '$created_at' },
                month: { $month: '$created_at' },
                day: { $dayOfMonth: '$created_at' },
              },
              date: {
                $first: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$created_at',
                  },
                },
              },
              requests: { $sum: 1 },
              tokens: { $sum: '$total_tokens' },
              success: {
                $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
              },
              failed: {
                $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
              },
            },
          },
          { $sort: { _id: 1 } },
        ];

        const results = await ApiUsage.aggregate(pipeline);
        return {
          type: 'timeline',
          data: results.map((r) => ({
            date: r.date,
            requests: r.requests,
            tokens: r.tokens,
            success: r.success,
            failed: r.failed,
          })),
        };
      } else if (filters.chartType === 'provider') {
        // Biểu đồ theo provider (pie chart)
        const pipeline: any[] = [
          { $match: matchStage },
          {
            $group: {
              _id: '$provider',
              requests: { $sum: 1 },
              tokens: { $sum: '$total_tokens' },
              success: {
                $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
              },
              failed: {
                $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
              },
            },
          },
          {
            $project: {
              provider: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$_id', 'gemini'] }, then: 'Gemini' },
                    { case: { $eq: ['$_id', 'openai'] }, then: 'OpenAI' },
                    { case: { $eq: ['$_id', 'claude'] }, then: 'Claude' },
                  ],
                  default: 'Other',
                },
              },
              requests: 1,
              tokens: 1,
              success: 1,
              failed: 1,
            },
          },
          { $sort: { requests: -1 } },
        ];

        const results = await ApiUsage.aggregate(pipeline);
        return {
          type: 'provider',
          data: results,
        };
      } else if (filters.chartType === 'status') {
        // Biểu đồ theo status (bar chart)
        const pipeline: any[] = [
          { $match: matchStage },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              tokens: { $sum: '$total_tokens' },
            },
          },
          { $sort: { count: -1 } },
        ];

        const results = await ApiUsage.aggregate(pipeline);
        return {
          type: 'status',
          data: results.map((r) => ({
            status: r._id,
            count: r.count,
            tokens: r.tokens,
          })),
        };
      }

      return { type: filters.chartType, data: [] };
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return { type: filters.chartType, data: [] };
    }
  }
}


