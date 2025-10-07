<template>
  <div class="dashboard">
    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-info">
            <p class="stat-label">Tổng người dùng</p>
            <p class="stat-value">{{ stats.totalUsers.toLocaleString() }}</p>
            <p class="stat-change positive">+12% so với tháng trước</p>
          </div>
          <div class="stat-icon blue">
          
            <i class=""></i>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-info">
            <p class="stat-label">Người dùng hoạt động</p>
            <p class="stat-value green">{{ stats.activeUsers.toLocaleString() }}</p>
            <p class="stat-change positive">+8% so với tháng trước</p>
          </div>
          <div class="stat-icon green">
          
            <i class=""></i>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-info">
            <p class="stat-label">Tổng số dự án</p>
            <p class="stat-value purple">{{ stats.totalProjects.toLocaleString() }}</p>
            <p class="stat-change positive">+25% so với tháng trước</p>
          </div>
          <div class="stat-icon purple">

            <i class=""></i>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-info">
            <p class="stat-label">API Keys hoạt động</p>
            <p class="stat-value orange">{{ stats.activeApiKeys.toLocaleString() }}</p>
            <p class="stat-change positive">+5% so với tháng trước</p>
          </div>
          <div class="stat-icon orange">

            <i class=""></i>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Grid -->
    <div class="charts-grid">
      <!-- User Role Distribution -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>Phân bố người dùng theo vai trò</h3>
          <div class="chart-actions">
            <button class="btn-icon" @click="refreshUserStats">

              <i class=""></i>
            </button>
          </div>
        </div>
        <div class="chart-content">
          <div class="chart-row" v-for="role in userRoleStats" :key="role.name">
            <div class="role-info">
              <span class="role-name">{{ role.name }}</span>
              <span class="role-count">{{ role.count }}</span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :class="role.color"
                :style="{ width: role.percentage + '%' }"
              ></div>
            </div>
            <span class="percentage">{{ role.percentage }}%</span>
          </div>
        </div>
      </div>

      <!-- API Provider Distribution -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>Phân bố API Keys theo nhà cung cấp</h3>
          <div class="chart-actions">
            <button class="btn-icon" @click="refreshApiStats">

              <i class=""></i>
            </button>
          </div>
        </div>
        <div class="chart-content">
          <div class="chart-row" v-for="provider in apiProviderStats" :key="provider.name">
            <div class="provider-info">
              <span class="provider-name">{{ provider.name }}</span>
              <span class="provider-count">{{ provider.count }}</span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :class="provider.color"
                :style="{ width: provider.percentage + '%' }"
              ></div>
            </div>
            <span class="percentage">{{ provider.percentage }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="activity-section">
      <div class="activity-card">
        <div class="activity-header">
          <h3>Hoạt động gần đây</h3>
          <button class="btn-secondary" @click="viewAllActivity">
            Xem tất cả
          </button>
        </div>
        <div class="activity-list">
          <div 
            class="activity-item" 
            v-for="activity in recentActivities" 
            :key="activity.id"
          >
            <div class="activity-icon" :class="activity.type">
              <i :class="activity.icon"></i>
            </div>
            <div class="activity-content">
              <p class="activity-text">{{ activity.description }}</p>
              <p class="activity-time">{{ activity.time }}</p>
            </div>
            <div class="activity-status" :class="activity.status">
              {{ activity.statusText }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
// NOTE: Dashboard APIs cần từ BE:
// GET /api/admin/dashboard/stats, GET /api/admin/dashboard/activities
import { getDashboardStats, getRecentActivities } from '@/api/admin'

// State
const stats = ref({ totalUsers: 0, activeUsers: 0, totalProjects: 0, activeApiKeys: 0 })

const userRoleStats = ref([]) // sẽ đổ từ API

const apiProviderStats = ref([]) // sẽ đổ từ API

const recentActivities = ref([])

// Methods
const refreshUserStats = async () => {
  // NOTE: GET /api/admin/dashboard/stats
  try {
    const data = await getDashboardStats()
    // Kỳ vọng schema: { totalUsers, activeUsers, totalProjects, activeApiKeys, userRoleStats, apiProviderStats }
    stats.value = {
      totalUsers: data?.totalUsers || 0,
      activeUsers: data?.activeUsers || 0,
      totalProjects: data?.totalProjects || 0,
      activeApiKeys: data?.activeApiKeys || 0,
    }
    userRoleStats.value = data?.userRoleStats || []
    apiProviderStats.value = data?.apiProviderStats || []
  } catch (e) {
    // Để trống nếu BE chưa có
    userRoleStats.value = []
    apiProviderStats.value = []
  }
}

const refreshApiStats = async () => {
  // Tận dụng cùng endpoint stats ở trên nếu BE không tách
  await refreshUserStats()
}

const viewAllActivity = () => {}

onMounted(async () => {
  await refreshUserStats()
  try {
    // NOTE: GET /api/admin/dashboard/activities
    const acts = await getRecentActivities()
    recentActivities.value = Array.isArray(acts) ? acts : (acts?.items || [])
  } catch (e) {
    recentActivities.value = []
  }
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-info {
  flex: 1;
}

.stat-label {
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.stat-value.green {
  color: #059669;
}

.stat-value.purple {
  color: #7c3aed;
}

.stat-value.orange {
  color: #ea580c;
}

.stat-change {
  font-size: 12px;
  font-weight: 500;
}

.stat-change.positive {
  color: #059669;
}

.stat-change.negative {
  color: #dc2626;
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-icon.blue {
  background: #dbeafe;
  color: #3b82f6;
}

.stat-icon.green {
  background: #dcfce7;
  color: #059669;
}

.stat-icon.purple {
  background: #f3e8ff;
  color: #7c3aed;
}

.stat-icon.orange {
  background: #fed7aa;
  color: #ea580c;
}

/* Charts Grid */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.chart-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.chart-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.chart-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #f1f5f9;
  color: #334155;
}

.chart-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.role-info, .provider-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 120px;
}

.role-name, .provider-name {
  font-weight: 500;
  color: #334155;
  font-size: 14px;
}

.role-count, .provider-count {
  font-size: 12px;
  color: #64748b;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-fill.blue {
  background: #3b82f6;
}

.progress-fill.green {
  background: #059669;
}

.progress-fill.purple {
  background: #7c3aed;
}

.percentage {
  min-width: 40px;
  text-align: right;
  font-weight: 600;
  color: #334155;
  font-size: 14px;
}

/* Activity Section */
.activity-section {
  margin-top: 8px;
}

.activity-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.activity-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.btn-secondary {
  background: #f1f5f9;
  color: #334155;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.activity-icon.user {
  background: #dbeafe;
  color: #3b82f6;
}

.activity-icon.api {
  background: #fef3c7;
  color: #d97706;
}

.activity-icon.project {
  background: #f3e8ff;
  color: #7c3aed;
}

.activity-icon.warning {
  background: #fee2e2;
  color: #dc2626;
}

.activity-content {
  flex: 1;
}

.activity-text {
  font-size: 14px;
  color: #334155;
  margin: 0 0 4px 0;
  font-weight: 500;
}

.activity-time {
  font-size: 12px;
  color: #64748b;
  margin: 0;
}

.activity-status {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.activity-status.success {
  background: #dcfce7;
  color: #166534;
}

.activity-status.warning {
  background: #fef3c7;
  color: #92400e;
}

/* Responsive */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .charts-grid {
    grid-template-columns: 1fr;
  }
  
  .chart-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .role-info, .provider-info {
    min-width: auto;
  }
  
  .progress-bar {
    width: 100%;
  }
}
</style>
