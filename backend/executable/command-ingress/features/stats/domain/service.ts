import ApiUsage from '../../../../../internal/model/api_usage';
import User from '../../../../../internal/model/user';
import Project from '../../../../../internal/model/project';
import Key from '../../../../../internal/model/api_key';

export class StatsService {
  async fetchUsageSummary() {
    try {
      const stats = await ApiUsage.aggregate([
        {
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
        },
      ]);

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

  async fetchProviderUsage() {
    try {
      const stats = await ApiUsage.aggregate([
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
      ]);

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
                    { $gte: ['$createdAt', today] },
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
}


