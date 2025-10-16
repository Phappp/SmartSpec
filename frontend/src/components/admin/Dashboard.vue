<template>
  <div class="dashboard">
    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-info">
            <p class="stat-label">Tổng người dùng</p>
            <p class="stat-value">{{ stats.totalUsers.toLocaleString() }}</p>
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
            
          </div>
        </div>
        <div class="chart-content-split">
          <!-- Biểu đồ tròn bên trái -->
          <div class="pie-chart-container">
            <div class="pie-chart" :style="getPieChartStyle(userRoleStats)">
              <div class="pie-chart-center">
                <!-- Để trống -->
              </div>
              <!-- Hiển thị phần trăm cho từng phần -->
              <div class="pie-percentages">
                <div 
                  v-for="(role, index) in userRoleStats" 
                  :key="role.name"
                  class="pie-percentage-item"
                  :style="getPercentagePosition(role, index, userRoleStats)"
                >
                  <span class="pie-percentage-text">{{ role.percentage }}%</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Thanh tiến trình bên phải -->
          <div class="progress-list">
            <div class="progress-item" v-for="role in userRoleStats" :key="role.name">
              <div class="progress-info">
                <span class="progress-name">{{ role.name }}</span>
                <span class="progress-count">{{ role.count }}</span>
              </div>
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :class="role.color"
                  :style="{ width: role.percentage + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- API Provider Distribution -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>Phân bố API Keys theo nhà cung cấp</h3>
          <div class="chart-actions">
            
          </div>
        </div>
        <div class="chart-content-split">
          <!-- Biểu đồ tròn bên trái -->
          <div class="pie-chart-container">
            <div class="pie-chart" :style="getPieChartStyle(apiProviderStats)">
              <div class="pie-chart-center">
                <!-- Để trống -->
              </div>
              <!-- Hiển thị phần trăm cho từng phần -->
              <div class="pie-percentages">
                <div 
                  v-for="(provider, index) in apiProviderStats" 
                  :key="provider.name"
                  class="pie-percentage-item"
                  :style="getPercentagePosition(provider, index, apiProviderStats)"
                >
                  <span class="pie-percentage-text">{{ provider.percentage }}%</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Thanh tiến trình bên phải -->
          <div class="progress-list">
            <div class="progress-item" v-for="provider in apiProviderStats" :key="provider.name">
              <div class="progress-info">
                <span class="progress-name">{{ provider.name }}</span>
                <span class="progress-count">{{ provider.count }}</span>
              </div>
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :class="provider.color"
                  :style="{ width: provider.percentage + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <!-- <div class="activity-section">
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
    </div> -->
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getUsers, getAllProjectsForAdmin as getProjects, getApiKeys } from '@/api/admin'


// State
const stats = ref({ totalUsers: 0, activeUsers: 0, totalProjects: 0, activeApiKeys: 0 })
const userRoleStats = ref([])
const apiProviderStats = ref([])
const recentActivities = ref([])

// Methods
const loadDashboardData = async () => {
  try {
    console.log('Loading dashboard data...')
    
    // Gọi các API có sẵn song song
    const [usersRes, projectsRes, apiKeysRes] = await Promise.all([
      getUsers(),
      getProjects(),
      getApiKeys()
    ])
    
    // Xử lý dữ liệu users
    const users = usersRes?.data?.data || usersRes?.data || []
    const totalUsers = users.length
    const activeUsers = users.filter(user => user.status === 'ACTIVE').length
    
    // Xử lý dữ liệu projects
    const projects = projectsRes?.data?.data || projectsRes?.data || []
    const totalProjects = projects.length
    
    // Xử lý dữ liệu API keys
    const apiKeys = apiKeysRes?.data?.data || apiKeysRes?.data || []
    const activeApiKeys = apiKeys.filter(key => key.is_active).length
    
    // Cập nhật stats
    stats.value = {
      totalUsers,
      activeUsers,
      totalProjects,
      activeApiKeys
    }
    
    // Tính toán user role stats
    const roleCounts = {}
    users.forEach(user => {
      const role = user.system_role || user.role || 'USER'
      roleCounts[role] = (roleCounts[role] || 0) + 1
    })
    
    userRoleStats.value = Object.entries(roleCounts).map(([role, count], index) => ({
      name: role,
      count,
      percentage: totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0,
      color: ['blue', 'green', 'purple', 'orange'][index % 4]
    }))
    
    // Tính toán API provider stats
    const providerCounts = {}
    apiKeys.forEach(key => {
      const provider = key.provider || 'Unknown'
      providerCounts[provider] = (providerCounts[provider] || 0) + 1
    })
    
    apiProviderStats.value = Object.entries(providerCounts).map(([provider, count], index) => ({
      name: provider,
      count,
      percentage: apiKeys.length > 0 ? Math.round((count / apiKeys.length) * 100) : 0,
      color: ['blue', 'green', 'purple', 'orange'][index % 4]
    }))
    
    // Mock recent activities
    // recentActivities.value = [
    //   {
    //     id: 1,
    //     type: 'user',
    //     icon: 'fas fa-user-plus',
    //     description: `Người dùng mới đăng ký`,
    //     time: '5 phút trước',
    //     status: 'success',
    //     statusText: 'Thành công'
    //   },
    //   {
    //     id: 2,
    //     type: 'project',
    //     icon: 'fas fa-project-diagram',
    //     description: `Dự án mới được tạo`,
    //     time: '15 phút trước',
    //     status: 'success',
    //     statusText: 'Thành công'
    //   },
    //   {
    //     id: 3,
    //     type: 'api',
    //     icon: 'fas fa-key',
    //     description: `API Key mới được tạo`,
    //     time: '1 giờ trước',
    //     status: 'success',
    //     statusText: 'Thành công'
    //   }
    // ]
    
    console.log('Dashboard data loaded:', stats.value)
    
  } catch (error) {
    console.error('Error loading dashboard:', error)
    
    // Set default values on error
    stats.value = {
      totalUsers: 0,
      activeUsers: 0,
      totalProjects: 0,
      activeApiKeys: 0
    }
    userRoleStats.value = []
    apiProviderStats.value = []
    recentActivities.value = []
  }
}

const refreshUserStats = async () => {
  await loadDashboardData()
}

const refreshApiStats = async () => {
  await loadDashboardData()
}

const viewAllActivity = () => {
  console.log('View all activity clicked')
}

// Tạo style cho biểu đồ tròn
const getPieChartStyle = (data) => {
  if (!data || data.length === 0) {
    return {
      background: 'conic-gradient(#e2e8f0 0deg 360deg)'
    }
  }
  
  let currentAngle = 0
  const gradients = data.map(item => {
    const startAngle = currentAngle
    const endAngle = currentAngle + (item.percentage * 3.6) // 360/100 = 3.6 degrees per 1%
    currentAngle = endAngle
    
    const colorMap = {
      blue: '#3b82f6',
      green: '#059669', 
      purple: '#7c3aed',
      orange: '#ea580c'
    }
    
    return `${colorMap[item.color] || '#64748b'} ${startAngle}deg ${endAngle}deg`
  }).join(', ')
  
  return {
    background: `conic-gradient(${gradients})`
  }
}

// Tính toán vị trí hiển thị phần trăm trên biểu đồ tròn
const getPercentagePosition = (item, index, data) => {
  if (!data || data.length === 0) return {}
  
  // Tính góc giữa của phần này
  let currentAngle = 0
  for (let i = 0; i < index; i++) {
    currentAngle += data[i].percentage * 3.6
  }
  const middleAngle = currentAngle + (item.percentage * 3.6 / 2)
  
  // Chuyển đổi từ độ sang radian
  const radians = (middleAngle - 90) * Math.PI / 180
  
  // Tính vị trí x, y (khoảng cách từ tâm)
  const radius = 60 // Khoảng cách từ tâm đến vị trí hiển thị phần trăm
  const x = Math.cos(radians) * radius
  const y = Math.sin(radians) * radius
  
  return {
    position: 'absolute',
    left: `calc(50% + ${x}px)`,
    top: `calc(50% + ${y}px)`,
    transform: 'translate(-50%, -50%)'
  }
}

onMounted(() => {
  loadDashboardData()
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

/* Chart Content Split Layout */
.chart-content-split {
  display: flex;
  gap: 24px;
  align-items: center;
}

/* Pie Chart */
.pie-chart-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.pie-chart {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pie-percentages {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}

.pie-percentage-item {
  position: absolute;
  z-index: 10;
}

.pie-percentage-text {
  background: rgba(255, 255, 255, 0.9);
  color: #1e293b;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
}

.pie-chart-center {
  position: absolute;
  width: 120px;
  height: 120px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}


/* Progress List */
.progress-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.progress-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-name {
  font-weight: 500;
  color: #334155;
  font-size: 14px;
}

.progress-count {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.progress-bar {
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

.progress-fill.orange {
  background: #ea580c;
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
  
  .chart-content-split {
    flex-direction: column;
    gap: 20px;
  }
  
  .pie-chart {
    width: 150px;
    height: 150px;
  }
  
  .pie-chart-center {
    width: 90px;
    height: 90px;
  }
  
  .progress-list {
    width: 100%;
  }
}
</style>
