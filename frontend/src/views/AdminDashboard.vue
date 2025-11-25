<template>
  <div class="admin-dashboard">
    <!-- Material Icons -->
    <link
      href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      rel="stylesheet"
    />

    <!-- Header -->
    <header class="dashboard-header">
      <div class="header-left">
        <div class="logo">
          <span class="material-symbols-outlined">admin_panel_settings</span>
          <h1>SmartSpec Admin</h1>
        </div>
      </div>
      <div class="header-right">
        <div class="header-actions">
          
          <div class="user-menu" @click="toggleUserMenu">
            <div class="user-avatar">
              <img
                :src="currentUser.avatar_url"
                :alt="currentUser.name"
                @error="(e) => (e.target.src = 'https://static.vecteezy.com/system/resources/previews/024/983/914/original/simple-user-default-icon-free-png.png')"
              />
            </div>
            <span class="user-name">{{ currentUser.name }}</span>
            <span class="material-symbols-outlined">expand_more</span>

            <transition name="fade-slide">
              <div v-if="showUserMenu" class="user-dropdown">
                <div class="dropdown-item" @click="showProfileModal = true">
                  <span class="material-symbols-outlined">person</span>
                  <span>Thông tin cá nhân</span>
                </div>
                <div class="dropdown-item" @click="showChangePasswordModal = true">
                  <span class="material-symbols-outlined">key</span>
                  <span>Đổi mật khẩu</span>
                </div>
                <div class="dropdown-item" @click="showSystemSettingsModal = true">
                  <span class="material-symbols-outlined">settings</span>
                  <span>Cài đặt hệ thống</span>
                </div>
                <hr />
                <div class="dropdown-item logout" @click="logout">
                  <span class="material-symbols-outlined">logout</span>
                  <span>Đăng xuất</span>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="dashboard-main">
      <!-- Quick Stats -->
      <section class="stats-section">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-symbols-outlined">group</span>
            </div>
            <div class="stat-content">
              <h3>{{ formatNumber(stats.totalUsers) }}</h3>
              <p>Tổng người dùng</p>
              <div class="stat-trend" :class="userTrend.type">
                <span class="material-symbols-outlined">{{ userTrend.icon }}</span>
                <span>{{ userTrend.value }}</span>
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-symbols-outlined">key</span>
            </div>
            <div class="stat-content">
              <h3>{{ formatNumber(stats.activeApiKeys) }}</h3>
              <p>API Keys hoạt động</p>
              <div class="stat-trend" :class="apiTrend.type">
                <span class="material-symbols-outlined">{{ apiTrend.icon }}</span>
                <span>{{ apiTrend.value }}</span>
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-symbols-outlined">folder</span>
            </div>
            <div class="stat-content">
              <h3>{{ formatNumber(stats.totalProjects) }}</h3>
              <p>Tổng dự án</p>
              <div class="stat-trend" :class="projectTrend.type">
                <span class="material-symbols-outlined">{{ projectTrend.icon }}</span>
                <span>{{ projectTrend.value }}</span>
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-symbols-outlined">activity_zone</span>
            </div>
            <div class="stat-content">
              <h3>{{ formatNumber(stats.dailyActive) }}</h3>
              <p>Hoạt động hôm nay</p>
              <div class="stat-trend" :class="activityTrend.type">
                <span class="material-symbols-outlined">{{ activityTrend.icon }}</span>
                <span>{{ activityTrend.value }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Charts and Analytics -->
      <section class="analytics-section">
        <div class="analytics-grid">
          <!-- User Distribution Chart -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>Phân bố người dùng</h3>
              <div class="chart-actions">
                <button class="btn-icon" @click="refreshUserStats">
                  <span class="material-symbols-outlined">refresh</span>
                </button>
                <button class="btn-icon" @click="exportUserStats">
                  <span class="material-symbols-outlined">download</span>
                </button>
              </div>
            </div>
            <div class="chart-container">
              <div class="pie-chart" :style="{ background: pieBackground }">
                <div class="pie-center">
                  <div class="center-content">
                    <span class="center-value">
                      {{
                        hoveredSegment !== null
                          ? userDistribution[hoveredSegment].percentage + '%'
                          : '100%'
                      }}
                    </span>
                    <span class="center-label">
                      {{
                        hoveredSegment !== null
                          ? userDistribution[hoveredSegment].label
                          : 'Tổng'
                      }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="chart-legend">
                <div
                  v-for="(item, index) in userDistribution"
                  :key="item.label"
                  class="legend-item"
                  :class="{ active: hoveredSegment === index }"
                  @mouseenter="hoveredSegment = index"
                  @mouseleave="hoveredSegment = null"
                >
                  <div class="legend-color" :style="{ backgroundColor: item.color }"></div>
                  <span class="legend-label">{{ item.label }}</span>
                  <span class="legend-value">{{ item.value }} ({{ item.percentage }}%)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- API Usage Chart -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>Sử dụng API theo nhà cung cấp</h3>
              <div class="chart-actions">
                <button class="btn-icon" @click="refreshApiStats">
                  <span class="material-symbols-outlined">refresh</span>
                </button>
                <button class="btn-icon" @click="exportApiStats">
                  <span class="material-symbols-outlined">download</span>
                </button>
              </div>
            </div>
            <div class="chart-container">
              <div class="usage-stats">
                <div v-for="provider in apiUsage" :key="provider.name" class="usage-item">
                  <div class="usage-header">
                    <span class="provider-name">{{ provider.name }}</span>
                    <span class="usage-percentage">{{ provider.percentage }}%</span>
                  </div>
                  <div class="usage-bar">
                    <div
                      class="usage-fill"
                      :style="{ width: provider.percentage + '%', backgroundColor: provider.color }"
                    ></div>
                  </div>
                  <div class="usage-details">
                    <span class="usage-count">{{ provider.usage }} requests</span>
                    <span class="usage-trend" :class="provider.trend">
                      <span class="material-symbols-outlined">
                        {{ provider.trend === 'up' ? 'trending_up' : 'trending_down' }}
                      </span>
                      {{ provider.change }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="api-summary">
                <div class="summary-item">
                  <span class="summary-label">Tổng requests</span>
                  <span class="summary-value">{{ formatNumber(totalApiRequests) }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Thành công</span>
                  <span class="summary-value success">{{ apiSuccessRate }}%</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Lỗi</span>
                  <span class="summary-value error">{{ apiErrorRate }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Management Sections -->
      <section class="management-section">
        <div class="management-grid">
          <!-- User Management -->
          <div class="management-card">
            <div class="card-header">
              <h3><span class="material-symbols-outlined">group</span> Quản lý người dùng</h3>
              <span class="card-badge">{{ stats.totalUsers }}</span>
            </div>
            <div class="card-content">
              <div class="quick-stats">
                <div class="quick-stat">
                  <span class="stat-label">Hoạt động</span>
                  <span class="stat-value">{{ stats.activeUsers }}</span>
                </div>
                <div class="quick-stat">
                  <span class="stat-label">Mới hôm nay</span>
                  <span class="stat-value">{{ stats.newUsersToday }}</span>
                </div>
                <div class="quick-stat">
                  <span class="stat-label">Đang chờ</span>
                  <span class="stat-value">{{ stats.pendingUsers }}</span>
                </div>
              </div>
              <div class="action-buttons">
                <button class="btn-action primary" @click="showUserManagementModal = true">
                  <span class="material-symbols-outlined">list</span>
                  Danh sách người dùng
                </button>
                <button class="btn-action secondary" @click="showAddUserModal = true">
                  <span class="material-symbols-outlined">person_add</span>
                  Thêm người dùng
                </button>
              </div>
            </div>
          </div>

          <!-- API Key Management -->
          <div class="management-card">
            <div class="card-header">
              <h3><span class="material-symbols-outlined">key</span> Quản lý API Keys</h3>
              <span class="card-badge">{{ stats.activeApiKeys }}</span>
            </div>
            <div class="card-content">
              <div class="quick-stats">
                <div class="quick-stat">
                  <span class="stat-label">Gemini</span>
                  <span class="stat-value">{{ apiStats.gemini }}</span>
                </div>
                <div class="quick-stat">
                  <span class="stat-label">OpenAI</span>
                  <span class="stat-value">{{ apiStats.openai }}</span>
                </div>
                <div class="quick-stat">
                  <span class="stat-label">Claude</span>
                  <span class="stat-value">{{ apiStats.claude }}</span>
                </div>
              </div>
              <div class="action-buttons">
                <button class="btn-action primary" @click="showApiKeyManagementModal = true">
                  <span class="material-symbols-outlined">list</span>
                  Danh sách API Keys
                </button>
                <button class="btn-action secondary" @click="showAddApiKeyModal = true">
                  <span class="material-symbols-outlined">add</span>
                  Thêm API Key
                </button>
                <button class="btn-action secondary" @click="showApiAnalyticsModal = true">
                  <span class="material-symbols-outlined">analytics</span>
                  Phân tích sử dụng
                </button>
              </div>
            </div>
          </div>

          <!-- Project Management -->
          <div class="management-card">
            <div class="card-header">
              <h3><span class="material-symbols-outlined">folder</span> Quản lý dự án</h3>
              <span class="card-badge">{{ stats.totalProjects }}</span>
            </div>
            <div class="card-content">
              <div class="quick-stats">
                <div class="quick-stat">
                  <span class="stat-label">Đang hoạt động</span>
                  <span class="stat-value">{{ stats.activeProjects }}</span>
                </div>
                <div class="quick-stat">
                  <span class="stat-label">Mới hôm nay</span>
                  <span class="stat-value">{{ stats.newProjectsToday }}</span>
                </div>
                <div class="quick-stat">
                  <span class="stat-label">Đã xóa</span>
                  <span class="stat-value">{{ stats.deletedProjects }}</span>
                </div>
              </div>
              <div class="action-buttons">
                <button class="btn-action primary" @click="showProjectManagementModal = true">
                  <span class="material-symbols-outlined">list</span>
                  Danh sách dự án
                </button>
                <button class="btn-action secondary" @click="showProjectAnalyticsModal = true">
                  <span class="material-symbols-outlined">analytics</span>
                  Phân tích
                </button>
                <button class="btn-action secondary" @click="showProjectTemplatesModal = true">
                  <span class="material-symbols-outlined">description</span>
                  Template
                </button>
              </div>
            </div>
          </div>

          <!-- System Management -->
          <div class="management-card">
            <div class="card-header">
              <h3><span class="material-symbols-outlined">settings</span> Quản lý hệ thống</h3>
              <span class="card-badge">{{ systemStats.totalConfigs }}</span>
            </div>
            <div class="card-content">
              <div class="quick-stats">
                <div class="quick-stat">
                  <span class="stat-label">Dịch vụ</span>
                  <span class="stat-value">{{ systemStats.activeServices }}</span>
                </div>
                <div class="quick-stat">
                  <span class="stat-label">Cấu hình</span>
                  <span class="stat-value">{{ systemStats.totalConfigs }}</span>
                </div>
                <div class="quick-stat">
                  <span class="stat-label">Backup</span>
                  <span class="stat-value">{{ systemStats.lastBackup }}</span>
                </div>
              </div>
              <div class="action-buttons">
                <button class="btn-action primary" @click="showSystemSettingsModal = true">
                  <span class="material-symbols-outlined">settings</span>
                  Cài đặt hệ thống
                </button>
                <button class="btn-action secondary" @click="showBackupModal = true">
                  <span class="material-symbols-outlined">backup</span>
                  Sao lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Two Column Layout -->
      <section class="two-column-section">
        <div class="column-grid">
          <!-- Log System (moved here, replaces Recent Activity) -->
          <div class="column-card">
            <div class="card-header">
              <h3>
                <span class="material-symbols-outlined">list_alt</span> Log hệ thống
              </h3>
              <div class="card-actions">
                <div class="log-filters">
                  <select v-model="logFilter.level" class="filter-select">
                    <option value="all">Tất cả level</option>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                  <select v-model="logFilter.type" class="form-input">
                    <option value="all">Tất cả</option>
                    <option value="system">Hệ thống</option>
                    <option value="user">Người dùng</option>
                    <option value="project">Dự án</option>
                    <option value="member">Thành viên</option>
                  </select>
                </div>
                <button class="btn-icon" @click="refreshLogs">
                  <span class="material-symbols-outlined">refresh</span>
                </button>
                <div class="relative dropdown">
                  <button 
                    class="btn-action secondary flex items-center gap-1"
                    @click.stop="showExportMenu = !showExportMenu" 
                  >
                    <span class="material-symbols-outlined">download</span>
                    Xuất log
                    <span class="material-symbols-outlined text-sm">expand_more</span>
                  </button>
                  
                  <div 
                    v-if="showExportMenu" 
                    class="dropdown-menu absolute right-0 mt-2 w-36 bg-white border rounded-lg shadow-lg z-50"
                  >
                    <button @click="exportLogs('pdf'); showExportMenu = false" class="dropdown-item">Xuất PDF</button>
                    <button @click="exportLogs('csv'); showExportMenu = false" class="dropdown-item">Xuất CSV</button>
                    <button @click="exportLogs('json'); showExportMenu = false" class="dropdown-item">Xuất JSON</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="log-list">
              <div v-for="log in filteredLogs" :key="log.id" class="log-item" :class="log.level">
                <div class="log-level" :class="log.level">{{ log.level }}</div>
                <div class="log-content">
                  <div class="log-message">{{ log.message }}</div>
                  <div class="log-meta">
                    <span class="log-type">{{ log.type }}</span>
                    <span class="log-time">{{ formatTime(log.timestamp) }}</span>
                    <span class="log-user" v-if="log.user">{{ log.user }}</span>
                  </div>
                </div>
                <div class="log-actions">
                  <button class="btn-icon small" @click="viewLogDetails(log)">
                    <span class="material-symbols-outlined">visibility</span>
                  </button>
                </div>
              </div>
            </div>
            <div class="log-footer">
              <div class="log-summary">
                Hiển thị {{ filteredLogs.length }} log
                <span v-if="logFilter.level !== 'all'">(lọc theo {{ logFilter.level }})</span>
              </div>
              <button class="btn-view-all" @click="showLogManagementModal = true">
                Xem tất cả log
              </button>
            </div>
          </div>

          <!-- System Status (right column, unchanged) -->
          <div class="column-card">
            <div class="card-header">
              <h3>
                <span class="material-symbols-outlined">monitor_heart</span> Trạng thái hệ thống
              </h3>
              <div class="card-actions">
                <button class="btn-icon" @click="refreshSystemStatus">
                  <span class="material-symbols-outlined">refresh</span>
                </button>
              </div>
            </div>
            <div class="system-status">
              <div class="status-item" v-for="service in systemServices" :key="service.name">
                <div class="status-info">
                  <div class="status-name">{{ service.name }}</div>
                  <div class="status-description">{{ service.description }}</div>
                </div>
                <div class="status-indicator" :class="service.status">
                  <div class="status-dot"></div>
                  <span class="status-text">{{ service.statusText }}</span>
                  <span class="status-uptime" v-if="service.uptime">{{ service.uptime }}</span>
                </div>
              </div>
            </div>
            <div class="system-metrics">
              <div class="metric-item">
                <span class="metric-label">CPU</span>
                <div class="metric-bar">
                  <div class="metric-fill" :style="{ width: systemMetrics.cpu + '%' }"></div>
                </div>
                <span class="metric-value">{{ systemMetrics.cpu }}%</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Memory</span>
                <div class="metric-bar">
                  <div class="metric-fill" :style="{ width: systemMetrics.memory + '%' }"></div>
                </div>
                <span class="metric-value">{{ systemMetrics.memory }}%</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Disk</span>
                <div class="metric-bar">
                  <div class="metric-fill" :style="{ width: systemMetrics.disk + '%' }"></div>
                </div>
                <span class="metric-value">{{ systemMetrics.disk }}%</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Modals -->
    <!-- Profile Modal -->
    <AdminProfileModal
      v-if="showProfileModal"
      :user="currentUser"
      @save="updateProfile"
      @close="showProfileModal = false"
    />

    <!-- Change Password Modal -->
    <AdminChangePasswordModal
      v-if="showChangePasswordModal"
      @change="changePassword"
      @close="showChangePasswordModal = false"
    />

    <!-- Add User Modal -->
    <AdminAddUserModal v-if="showAddUserModal" @add="addUser" @close="showAddUserModal = false" />

    <!-- Add API Key Modal -->
    <AdminAddApiKeyModal
      v-if="showAddApiKeyModal"
      @add="addApiKey"
      @close="showAddApiKeyModal = false"
    />

    <!-- System Settings Modal -->
    <AdminSystemSettingsModal
      v-if="showSystemSettingsModal"
      :settings="systemSettings"
      @save="saveSystemSettings"
      @close="showSystemSettingsModal = false"
    />

    <!-- User Management Modal -->
    <AdminUserManagementModal
      v-if="showUserManagementModal"
      @close="showUserManagementModal = false"
    />

    <!-- API Key Management Modal -->
    <AdminApiKeyManagementModal
      v-if="showApiKeyManagementModal"
      @close="showApiKeyManagementModal = false"
    />

    <!-- Project Management Modal -->
    <AdminProjectManagementModal
      v-if="showProjectManagementModal"
      @close="showProjectManagementModal = false"
    />

    <!-- Log Management Modal -->
    <AdminLogManagementModal
      v-if="showLogManagementModal"
      @close="showLogManagementModal = false"
    />

    <!-- Other Modals -->
    <AdminApiAnalyticsModal v-if="showApiAnalyticsModal" @close="showApiAnalyticsModal = false" />

    <AdminProjectAnalyticsModal
      v-if="showProjectAnalyticsModal"
      @close="showProjectAnalyticsModal = false"
    />

    <AdminProjectTemplatesModal
      v-if="showProjectTemplatesModal"
      @close="showProjectTemplatesModal = false"
    />

    <AdminBackupModal v-if="showBackupModal" @close="showBackupModal = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import axiosClient from '@/utils/axiosClient'
import { socket, initSocketConnection } from '@/utils/socket'
import { useToast } from 'vue-toastification'
// Component imports
import AdminProfileModal from '@/components/admin/AdminProfileModal.vue'
import AdminChangePasswordModal from '@/components/admin/AdminChangePasswordModal.vue'
import AdminAddUserModal from '@/components/admin/AdminAddUserModal.vue'
import AdminAddApiKeyModal from '@/components/admin/AdminAddApiKeyModal.vue'
import AdminSystemSettingsModal from '@/components/admin/AdminSystemSettingsModal.vue'
import AdminUserManagementModal from '@/components/admin/AdminUserManagementModal.vue'
import AdminApiKeyManagementModal from '@/components/admin/AdminApiKeyManagementModal.vue'
import AdminProjectManagementModal from '@/components/admin/AdminProjectManagementModal.vue'
// import AdminLogManagementModal from '@/components/admin/AdminLogManagementModal.vue'
// import AdminApiAnalyticsModal from '@/components/admin/AdminApiAnalyticsModal.vue'
// import AdminProjectAnalyticsModal from '@/components/admin/AdminProjectAnalyticsModal.vue'
// import AdminProjectTemplatesModal from '@/components/admin/AdminProjectTemplatesModal.vue'
// import AdminBackupModal from '@/components/admin/AdminBackupModal.vue'
const router = useRouter()
// State
const showUserMenu = ref(false)
const hoveredSegment = ref(null)
const { toast } = useToast()
// Modal states
const showExportMenu = ref(false)
const showProfileModal = ref(false)
const showChangePasswordModal = ref(false)
const showSystemSettingsModal = ref(false)
const showAddUserModal = ref(false)
const showAddApiKeyModal = ref(false)
const showUserManagementModal = ref(false)
const showApiKeyManagementModal = ref(false)
const showProjectManagementModal = ref(false)
const showProjectAnalyticsModal = ref(false)
const showLogManagementModal = ref(false)
const showApiAnalyticsModal = ref(false)
const showProjectTemplatesModal = ref(false)
const showBackupModal = ref(false)

// Data
const currentUser = ref({
  name: 'Đang tải...',
  email: '',
  avatar_url: '',
})

const stats = ref({
  totalUsers: 1247,
  activeUsers: 893,
  newUsersToday: 12,
  pendingUsers: 5,
  totalProjects: 567,
  activeProjects: 432,
  newProjectsToday: 8,
  activeApiKeys: 23,
  dailyActive: 234,
  totalLogs: 12456,
  errorLogsToday: 3,
  warningLogsToday: 12,
})

const systemStats = ref({
  totalConfigs: 45,
  activeServices: 8,
  lastBackup: '2h',
  systemUptime: '99.8%',
})

const userDistribution = ref([
])
const userList = ref([])
const apiUsage = ref([
  { name: 'Gemini', usage: '1,234', percentage: 45, color: '#1a365d', trend: 'up', change: '+12%' },
  { name: 'OpenAI', usage: '987', percentage: 35, color: '#2d3748', trend: 'up', change: '+8%' },
  { name: 'Claude', usage: '543', percentage: 20, color: '#4a5568', trend: 'down', change: '-3%' },
])

const apiStats = ref({
  gemini: 12,
  openai: 8,
  claude: 3,
  totalRequests: 2764,
  successRate: 98.2,
  errorRate: 1.8,
})


const systemServices = ref([
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
])

const systemMetrics = ref({
  cpu: 45,
  memory: 68,
  disk: 32,
  network: 12,
})

const systemLogs = ref([])
const logLoading = ref(false)
const logFilter = ref({
  level: 'all',
  type: 'all',
})

const systemSettings = ref({
  systemName: 'SmartSpec',
  adminEmail: 'admin@smartspec.com',
  maxProjectsPerUser: 10,
  dailyApiLimit: 1000,
  sessionTimeout: 30,
  backupInterval: 24,
  logRetention: 30,
  maintenanceMode: false,
})

// Computed
const totalApiRequests = computed(() => {
  return apiUsage.value.reduce((total, provider) => {
    return total + parseInt(provider.usage.replace(',', ''))
  }, 0)
})

const apiSuccessRate = computed(() => apiStats.value.successRate)
const apiErrorRate = computed(() => apiStats.value.errorRate)

const userTrend = computed(() => ({
  type: 'positive',
  icon: 'trending_up',
  value: '+12%',
}))

const apiTrend = computed(() => ({
  type: 'positive',
  icon: 'trending_up',
  value: '+8%',
}))

const projectTrend = computed(() => ({
  type: 'positive',
  icon: 'trending_up',
  value: '+15%',
}))

const activityTrend = computed(() => ({
  type: 'negative',
  icon: 'trending_down',
  value: '-3%',
}))

const filteredLogs = computed(() => {
  return systemLogs.value.filter((log) => {
    const levelMatch = logFilter.value.level === 'all' || log.level === logFilter.value.level
    const typeMatch = logFilter.value.type === 'all' || log.type === logFilter.value.type
    return levelMatch && typeMatch
  })
})
const fetchCurrentUser = async () => {
  try {
    const res = await axiosClient.get('/api/auth/me')
    if (res.data?.status === 'Success' && res.data.data) {
      const user = res.data.data
      const BASE_URL = 'http://localhost:8000'

      currentUser.value = {
        id: user.id,
        name: user.name || 'Không rõ',
        email: user.email || 'Chưa có email',
        avatar_url: user.avatar_url
          ? user.avatar_url.startsWith('http')
            ? user.avatar_url
            : `${BASE_URL}${user.avatar_url}`
          : 'https://static.vecteezy.com/system/resources/previews/024/983/914/original/simple-user-default-icon-free-png.png',
      }

      console.log('✅ Current user loaded:', currentUser.value)
    } else {
      console.warn('⚠️ Không lấy được user từ /api/auth/me', res.data)
    }
  } catch (err) {
    console.error('❌ Lỗi khi lấy thông tin user:', err)
  }
}
// Methods
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

const formatNumber = (num) => {
  return new Intl.NumberFormat('vi-VN').format(num)
}

const formatTime = (date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  if (hours < 24) return `${hours} giờ trước`
  return `${days} ngày trước`
}


const pieBackground = computed(() => {
  let start = 0
  const gradients = userDistribution.value.map((item) => {
    const end = start + item.percentage * 3.6
    const part = `${item.color} ${start}deg ${end}deg`
    start = end
    return part
  })
  return `conic-gradient(${gradients.join(', ')})`
})
const refreshProjectStats = async () => {
  try {
    const res = await axiosClient.get('http://localhost:8000/api/projects/admin/all')

    if (res.data?.status === 'Success' && Array.isArray(res.data.data)) {
      const projects = res.data.data

      // Tổng số dự án
      stats.value.totalProjects = projects.length

      // Dự án đang hoạt động (chưa bị xóa)
      const activeProjects = projects.filter((p) => !p.isTrashed).length
      stats.value.activeProjects = activeProjects

      // Dự án đã xóa (isTrashed = true)
      const trashedProjects = projects.filter((p) => p.isTrashed).length
      stats.value.deletedProjects = trashedProjects

      // Dự án tạo trong hôm nay
      const today = new Date().toISOString().split('T')[0]
      const newProjectsToday = projects.filter((p) => {
        const createdDate = new Date(p.createdAt).toISOString().split('T')[0]
        return createdDate === today
      }).length
      stats.value.newProjectsToday = newProjectsToday

      console.log('✅ Project stats loaded:', {
        total: projects.length,
        active: activeProjects,
        deleted: trashedProjects,
        today: newProjectsToday,
      })
    } else {
      console.warn('⚠️ Không nhận được dữ liệu hợp lệ từ API /projects/admin/all')
    }
  } catch (error) {
    console.error('❌ Lỗi khi tải dữ liệu dự án:', error)
  }
}

const refreshUserStats = async () => {
  try {
    const res = await axiosClient.get('/api/users')

    if (res.data && res.data.status === 'Success') {
      const rawUsers = res.data.data
      const BASE_URL = 'http://localhost:8000'
      // ✅ Chuẩn hóa dữ liệu người dùng
      const users = rawUsers.map(u => ({
        id: u.id,
        name: u.name || 'Không rõ',
        email: u.email || 'Chưa có email',
        avatar_url: u.avatar_url
          ? u.avatar_url.startsWith('http')
            ? u.avatar_url
            : `${BASE_URL}${u.avatar_url}`
          : 'https://static.vecteezy.com/system/resources/previews/024/983/914/original/simple-user-default-icon-free-png.png',
        role:
          u.system_role === 'ADMIN'
            ? 'Quản Trị Viên'
            : u.system_role === 'PARTICIPANT'
            ? 'Thành Viên'
            : 'Khác',
        system_role: u.system_role,
        status: u.status === 'ACTIVE' ? 'Đang hoạt động' : 'Không hoạt động',
        rawStatus: u.status,
        createdAt: u.dob
          ? new Date(u.dob).toLocaleDateString('vi-VN')
          : 'Không rõ',
        gender:
          u.gender === 'male' ? 'Nam' : u.gender === 'female' ? 'Nữ' : 'Khác',
        twoFactor: u.isTwoFactorEnabled ? 'Bật' : 'Tắt',
      }))

      // ✅ Lưu danh sách người dùng để dùng ở modal
      userList.value = users

      // ✅ Tổng số người dùng
      stats.value.totalUsers = users.length

      // ✅ Đếm hoạt động / không hoạt động
      stats.value.activeUsers = users.filter(u => u.rawStatus === 'ACTIVE').length
      stats.value.inactiveUsers = users.filter(u => u.rawStatus !== 'ACTIVE').length

      // ✅ Đếm theo role
      const roleCounts = users.reduce((acc, user) => {
        acc[user.system_role] = (acc[user.system_role] || 0) + 1
        return acc
      }, {})

      // ✅ Biểu đồ phân bố người dùng
      const total = users.length || 1
      const distribution = Object.entries(roleCounts).map(([role, count]) => ({
        label:
          role === 'ADMIN'
            ? 'Admin'
            : role === 'PARTICIPANT'
            ? 'Participant'
            : role,
        value: count,
        percentage: Math.round((count / total) * 100),
        color:
          role === 'ADMIN'
            ? '#13235d'
            : role === 'PARTICIPANT'
            ? '#52abea'
            : '#8884d8',
      }))

      userDistribution.value = distribution

      console.log('✅ User stats loaded:', {
        total: users.length,
        active: stats.value.activeUsers,
        inactive: stats.value.inactiveUsers,
        distribution,
      })
    } else {
      console.warn('❌ Dữ liệu không hợp lệ khi gọi /api/users:', res.data)
    }
  } catch (error) {
    console.error('❌ Lỗi khi tải thống kê người dùng:', error)
  }
}

const refreshApiStats = async () => {
  try {
    const res = await axiosClient.get('http://localhost:8000/api/keys')

    if (res.data?.status === 'Success' && Array.isArray(res.data.data)) {
      const keys = res.data.data

      // Đếm số lượng key đang hoạt động
      const activeKeys = keys.filter((k) => k.is_active).length
      stats.value.activeApiKeys = activeKeys

      // Đếm theo nhà cung cấp
      const providerStats = keys.reduce((acc, key) => {
        const provider = key.provider?.toLowerCase() || 'other'
        acc[provider] = (acc[provider] || 0) + 1
        return acc
      }, {})

      // Gán vào biến thống kê chính
      apiStats.value.gemini = providerStats['gemini'] || 0
      apiStats.value.openai = providerStats['openai'] || 0
      apiStats.value.claude = providerStats['claude'] || 0
      apiStats.value.totalRequests = keys.length
      apiStats.value.successRate = 100 // nếu API chưa trả dữ liệu này, để tạm
      apiStats.value.errorRate = 0

      // Cập nhật biểu đồ hiển thị
      const total = keys.length
      apiUsage.value = Object.entries(providerStats).map(([provider, count]) => ({
        name:
          provider === 'gemini'
            ? 'Gemini'
            : provider === 'openai'
            ? 'OpenAI'
            : provider === 'claude'
            ? 'Claude'
            : 'Khác',
        usage: count.toString(),
        percentage: total ? Math.round((count / total) * 100) : 0,
        color:
          provider === 'gemini'
            ? '#1a365d'
            : provider === 'openai'
            ? '#2d3748'
            : provider === 'claude'
            ? '#4a5568'
            : '#718096',
        trend: 'up',
        change: '+0%',
      }))

      console.log('✅ API key stats loaded:', apiUsage.value)
    } else {
      console.warn('⚠️ Không nhận được dữ liệu hợp lệ từ API /api/keys')
    }
  } catch (error) {
    console.error('❌ Lỗi khi tải API key stats:', error)
  }
}

const refreshActivities = async () => {
  console.log('Refreshing activities...')
}

const refreshSystemStatus = async () => {
  console.log('Refreshing system status...')
}

const refreshLogs = async () => {
  logLoading.value = true
  try {
    // ✅ Đồng bộ với backend — kiểm tra đúng tên query param
    const params = {}
    if (logFilter.value.level !== 'all') params.level = logFilter.value.level
    if (logFilter.value.type !== 'all') params.target_type = logFilter.value.type  // <-- đổi từ type sang target_type

    console.log('📡 Fetching logs with params:', params)
    const res = await axiosClient.get('/api/logs', { params })

    const logItems = res.data?.data?.items || res.data?.data || []

    if (res.data?.status === 'Success' && Array.isArray(logItems)) {
      systemLogs.value = logItems.map((log) => ({
        id: log._id || log.id,
        userId: log.user_id,
        user: log.user_name || log.user_email || 'Hệ thống',
        action: log.action || '-',
        type: log.target_type?.toLowerCase() || 'system',  // ✅ chuẩn hóa type
        level: log.level?.toLowerCase() || 'info',
        message:
          log.details?.message ||
          log.action ||
          'Không có mô tả hành động',
        timestamp: new Date(log.created_at || log.timestamp),
        ip: log.ip || '-',
        userAgent: log.user_agent || '-',
      }))

      console.log(`✅ Loaded ${systemLogs.value.length} logs`)
    } else {
      console.warn('⚠️ Không nhận được log hợp lệ:', res.data)
      systemLogs.value = []
    }
  } catch (err) {
    console.error('❌ Lỗi khi tải log:', err)
    toast({
      title: 'Lỗi tải log',
      description:
        err.response?.data?.message || 'Không thể tải log hệ thống.',
      variant: 'destructive',
    })
  } finally {
    logLoading.value = false
  }
}



const exportUserStats = () => {
  console.log('Exporting user stats...')
}

const exportApiStats = () => {
  console.log('Exporting API stats...')
}

const exportLogs = async (format) => {
  try {
    const baseURL = 'http://localhost:8000';
    
    // ✅ Lấy giá trị của bộ lọc
    const levelFilter = logFilter.value.level !== 'all' ? logFilter.value.level : '';
    const typeFilter = logFilter.value.type !== 'all' ? logFilter.value.type : '';
    
    // ✅ Xây dựng các query params
    const params = new URLSearchParams();
    params.append('format', format);

    // Thêm level và target_type vào params nếu chúng không phải 'all'
    if (levelFilter) {
        params.append('level', levelFilter);
    }
    if (typeFilter) {
        params.append('target_type', typeFilter); // Backend đang dùng target_type
    }

    const url = `${baseURL}/api/logs/export?${params.toString()}`;

    console.log('📤 Exporting logs with URL:', url); // Log URL để kiểm tra

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (!response.ok) {
      // Cố gắng đọc thông báo lỗi từ server (nếu có)
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`Server trả lỗi ${response.status}: ${errorText.substring(0, 100)}...`);
    }

    // 👇 Lấy tên file từ header (nếu được expose)
    const disposition = response.headers.get('Content-Disposition');
    const filename =
      disposition?.split('filename=')[1]?.replace(/"/g, '') ||
      `logs_${levelFilter}_${typeFilter}_${Date.now()}.${format}`; // Tạo tên file chi tiết hơn

    // 👇 Đọc binary stream
    const blob = await response.blob();

    // 👇 Tạo và click link tải
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // 👇 Dọn dẹp
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    console.log(`✅ Tải thành công ${filename}`);
  } catch (err) {
    console.error('❌ Lỗi export log:', err);
    alert('Xuất thất bại: ' + err.message);
  }
};


const viewLogDetails = (log) => {
  console.log('Viewing log details:', log)
}

const updateProfile = (userData) => {
  console.log('Updating profile:', userData)
  currentUser.value = { ...currentUser.value, ...userData }
  showProfileModal.value = false
}

const changePassword = (passwordData) => {
  console.log('Changing password:', passwordData)
  showChangePasswordModal.value = false
}

const addUser = (userData) => {
  console.log('Adding new user:', userData)
  showAddUserModal.value = false
}

const addApiKey = (apiKeyData) => {
  console.log('Adding new API key:', apiKeyData)
  showAddApiKeyModal.value = false
}

const saveSystemSettings = (settings) => {
  console.log('Saving system settings:', settings)
  systemSettings.value = { ...systemSettings.value, ...settings }
  showSystemSettingsModal.value = false
}

const logout = () => {
  console.log('Logging out...')
  showUserMenu.value = false

  // Xóa token & thông tin user
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  localStorage.removeItem('role')

  // Chuyển hướng về trang đăng nhập
  router.push('/login')
}

// Close user menu when clicking outside
const handleClickOutside = (event) => {
  const userMenu = document.querySelector('.user-menu')
  if (userMenu && !userMenu.contains(event.target)) {
    showUserMenu.value = false
  }
}

// Watchers
watch(logFilter, () => {
  refreshLogs()
}, { deep: true })

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  initSocketConnection()
  // 🔥 Lắng nghe log realtime từ server (cả project + system)
  socket.on("log_event", (event) => {
  console.log("🧩 Realtime log event:", event);

  // Nếu log hệ thống (không có projectId)
  if (!event.projectId) {
    const log = event.log || event;
    systemLogs.value.unshift({
      id: log._id || log.id,
      user: log.user_name || log.user_email || 'Hệ thống',
      action: log.action || '-',
      type: log.target_type?.toLowerCase() || 'system',
      level: log.level?.toLowerCase() || 'info',
      message: log.details?.message || log.action || 'Không có mô tả hành động',
      timestamp: new Date(log.created_at || log.timestamp || event.timestamp),
      ip: log.ip || '-',
      userAgent: log.user_agent || '-',
    });

    // Giới hạn tối đa 100 log
    if (systemLogs.value.length > 100) systemLogs.value.pop();
  }
})

  // Fetch initial data
  refreshUserStats()
  refreshProjectStats()
  refreshApiStats()
  refreshActivities()
  refreshSystemStatus()
  refreshLogs()
  fetchCurrentUser()
  console.log('Admin dashboard mounted')
})

</script>

<style scoped>
/* Giữ nguyên toàn bộ CSS từ file gốc */
.admin-dashboard {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Header */
.dashboard-header {
  background: #1a365d;
  color: white;
  padding: 0 32px;
  height: 70px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left .logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo .material-symbols-outlined {
  font-size: 32px;
  color: #63b3ed;
}
.pie-chart {
  position: relative;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  transition: all 0.3s;
}

.pie-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
  border-radius: 50%;
  width: 100px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.center-content .center-value {
  display: block;
  font-weight: bold;
  font-size: 20px;
  color: #1a365d;
}

.center-content .center-label {
  font-size: 14px;
  color: #555;
}
.logo h1 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #63b3ed 0%, #4299e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.btn-notification {
  position: relative;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.btn-notification:hover {
  background: rgba(255, 255, 255, 0.1);
}

.notification-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: #e53e3e;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

.user-menu {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-menu:hover {
  background: rgba(255, 255, 255, 0.1);
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #63b3ed;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-name {
  font-weight: 500;
  font-size: 14px;
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  z-index: 1000;
  margin-top: 8px;
}
.relative.dropdown {
    position: relative;
    display: inline-block; /* Quan trọng để chỉ chiếm không gian cần thiết */
}

/* 2. Nút kích hoạt Dropdown */
.btn-action.secondary {
    /* Đảm bảo nút có kiểu dáng dễ nhìn */
    padding: 8px 12px;
    border: 1px solid #ccc;
    background-color: #f7f7f7;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
}

.btn-action.secondary:hover {
    background-color: #e0e0e0;
}

/* 3. Menu thả xuống */
.dropdown-menu {
    /* Định vị và hình dáng chung */
    position: absolute;
    right: 0; /* Menu xuất hiện bên phải nút bấm */
    top: 100%; /* Đặt dưới nút bấm */
    margin-top: 8px; /* Khoảng cách với nút */
    width: 140px; /* Chiều rộng của menu */
    background-color: #ffffff;
    border: 1px solid #e2e8f0; /* Viền nhẹ */
    border-radius: 8px; /* Bo góc */
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
    z-index: 50;
    overflow: hidden; /* Đảm bảo các item không tràn ra ngoài bo góc */
}

/* 4. Các mục trong Menu (Xuất PDF, CSV, JSON) */
.dropdown-item {
    /* Đảm bảo là nút bấm full width */
    width: 100%;
    text-align: left;
    padding: 10px 15px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    color: #333;
    transition: background-color 0.15s, color 0.15s;
}

/* Hiệu ứng di chuột (Hover) */
.dropdown-item:hover {
    background-color: #f1f5f9; /* Màu nền khi di chuột */
    color: #007bff; /* Thay đổi màu chữ (tùy chọn) */
}

/* Loại bỏ viền cho item cuối cùng (nếu muốn) */
.dropdown-menu .dropdown-item:not(:last-child) {
    border-bottom: 1px solid #f0f0f0; 
}
.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: #2d3748;
  text-decoration: none;
  transition: background 0.2s;
  cursor: pointer;
}

.dropdown-item:hover {
  background: #f7fafc;
}

.dropdown-item.logout {
  color: #e53e3e;
}

.dropdown-item .material-symbols-outlined {
  font-size: 18px;
  width: 20px;
}

/* Main Content */
.dashboard-main {
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Stats Section */
.stats-section {
  margin-bottom: 32px;
}

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
  display: flex;
  align-items: center;
  gap: 20px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-icon .material-symbols-outlined {
  font-size: 28px;
}

.stat-content h3 {
  font-size: 28px;
  font-weight: 700;
  color: #1a365d;
  margin: 0 0 4px 0;
}

.stat-content p {
  color: #718096;
  margin: 0 0 8px 0;
  font-size: 14px;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
}

.stat-trend.positive {
  color: #38a169;
}

.stat-trend.negative {
  color: #e53e3e;
}

.stat-trend .material-symbols-outlined {
  font-size: 14px;
}

/* Analytics Section */
.analytics-section {
  margin-bottom: 32px;
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
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
  margin-bottom: 20px;
}

.chart-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a365d;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-icon {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
  color: #718096;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: #edf2f7;
  color: #1a365d;
}

.btn-icon.small {
  padding: 4px;
}

/* Pie Chart */
.chart-container {
  display: flex;
  gap: 24px;
  align-items: center;
}

.pie-chart {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  position: relative;
  background: #e2e8f0;
}

.pie-segment {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 50% 100%);
  transform-origin: center;
}

.segment-tooltip {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  background: #3979ad;
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 10;
}

.pie-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.center-content {
  text-align: center;
}

.center-value {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #1a365d;
}

.center-label {
  display: block;
  font-size: 12px;
  color: #718096;
  margin-top: 2px;
}

.chart-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.legend-item.active,
.legend-item:hover {
  background: #f7fafc;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  flex: 1;
  font-size: 14px;
  color: #4a5568;
}

.legend-value {
  font-size: 14px;
  font-weight: 600;
  color: #1a365d;
}

/* API Usage Stats */
.usage-stats {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.usage-item {
  padding: 16px;
  background: #f7fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.usage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.provider-name {
  font-weight: 600;
  color: #1a365d;
}

.usage-percentage {
  font-weight: 700;
  color: #1a365d;
  font-size: 18px;
}

.usage-bar {
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.usage-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.usage-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.usage-count {
  color: #718096;
}

.usage-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
}

.usage-trend.up {
  color: #38a169;
}

.usage-trend.down {
  color: #e53e3e;
}

.usage-trend .material-symbols-outlined {
  font-size: 14px;
}

.api-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.summary-item {
  text-align: center;
  padding: 12px;
  background: #f7fafc;
  border-radius: 8px;
}

.summary-label {
  display: block;
  font-size: 12px;
  color: #718096;
  margin-bottom: 4px;
}

.summary-value {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #1a365d;
}

.summary-value.success {
  color: #38a169;
}

.summary-value.error {
  color: #e53e3e;
}

/* Management Section */
.management-section {
  margin-bottom: 32px;
}

.management-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.management-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.management-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.card-header {
  background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
  color: white;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.card-content {
  padding: 24px;
}

.quick-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.quick-stat {
  text-align: center;
  padding: 12px;
  background: #f7fafc;
  border-radius: 8px;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #718096;
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #1a365d;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-action {
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  text-align: left;
}

.btn-action.primary {
  background: #1a365d;
  color: white;
}

.btn-action.primary:hover {
  background: #2d3748;
  transform: translateY(-1px);
}

.btn-action.secondary {
  background: #f7fafc;
  color: #4a5568;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
}

.btn-action.secondary:hover {
  background: #edf2f7;
  transform: translateY(-1px);
}

/* Two Column Section */
.two-column-section {
  margin-bottom: 32px;
}

.column-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.column-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.column-card .card-header {
  background: white;
  color: #1a365d;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-view-all {
  background: none;
  border: 1px solid #1a365d;
  color: #1a365d;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-view-all:hover {
  background: #1a365d;
  color: white;
}

/* Activity List */
.activity-list {
  padding: 0;
  max-height: 400px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid #f7fafc;
  transition: background 0.2s;
}

.activity-item:hover {
  background: #f7fafc;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-item.user .activity-icon {
  background: #bee3f8;
  color: #2b6cb0;
}

.activity-item.project .activity-icon {
  background: #c6f6d5;
  color: #276749;
}

.activity-item.api .activity-icon {
  background: #faf089;
  color: #d69e2e;
}

.activity-item.system .activity-icon {
  background: #e9d8fd;
  color: #6b46c1;
}

.activity-item.error .activity-icon {
  background: #fed7d7;
  color: #c53030;
}

.activity-content {
  flex: 1;
}

.activity-description {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #4a5568;
  font-weight: 500;
}

.activity-time {
  font-size: 12px;
  color: #718096;
}

.activity-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

.activity-badge.success {
  background: #c6f6d5;
  color: #276749;
}

.activity-badge.warning {
  background: #faf089;
  color: #d69e2e;
}

/* System Status */
.system-status {
  padding: 0;
  margin-bottom: 20px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #f7fafc;
}

.status-item:last-child {
  border-bottom: none;
}

.status-info {
  flex: 1;
}

.status-name {
  font-weight: 600;
  color: #1a365d;
  margin-bottom: 4px;
}

.status-description {
  font-size: 14px;
  color: #718096;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.online .status-dot {
  background: #48bb78;
}

.status-indicator.offline .status-dot {
  background: #e53e3e;
}

.status-indicator.maintenance .status-dot {
  background: #ed8936;
}

.status-text {
  font-size: 14px;
  font-weight: 500;
}

.status-indicator.online .status-text {
  color: #48bb78;
}

.status-indicator.offline .status-text {
  color: #e53e3e;
}

.status-indicator.maintenance .status-text {
  color: #ed8936;
}

.status-uptime {
  font-size: 12px;
  color: #718096;
  margin-left: 8px;
}

/* System Metrics */
.system-metrics {
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f7fafc;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.metric-item:last-child {
  margin-bottom: 0;
}

.metric-label {
  font-size: 14px;
  color: #4a5568;
  width: 60px;
}

.metric-bar {
  flex: 1;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  background: linear-gradient(90deg, #48bb78, #38a169);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
  color: #1a365d;
  width: 40px;
  text-align: right;
}

/* Log Section */
.log-section {
  margin-bottom: 32px;
}

.log-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.log-card .card-header {
  background: white;
  color: #1a365d;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-filters {
  display: flex;
  gap: 12px;
}

.filter-select {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  background: white;
  color: #4a5568;
}

.log-list {
  padding: 0;
  max-height: 506px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid #f7fafc;
  transition: background 0.2s;
}

.log-item:hover {
  background: #f7fafc;
}

.log-item:last-child {
  border-bottom: none;
}

.log-level {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  width: 60px;
  text-align: center;
}

.log-level.info {
  background: #bee3f8;
  color: #2b6cb0;
}

.log-level.warning {
  background: #faf089;
  color: #d69e2e;
}

.log-level.error {
  background: #fed7d7;
  color: #c53030;
}

.log-content {
  flex: 1;
}

.log-message {
  font-size: 14px;
  color: #4a5568;
  margin-bottom: 4px;
  font-weight: 500;
}

.log-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #718096;
}

.log-type {
  text-transform: capitalize;
}

.log-actions {
  display: flex;
  gap: 4px;
}

.log-footer {
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f7fafc;
}

.log-summary {
  font-size: 14px;
  color: #718096;
}

/* Responsive */
@media (max-width: 768px) {
  .dashboard-main {
    padding: 16px;
  }

  .analytics-grid {
    grid-template-columns: 1fr;
  }

  .chart-container {
    flex-direction: column;
  }

  .management-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .column-grid {
    grid-template-columns: 1fr;
  }

  .user-name {
    display: none;
  }

  .api-summary {
    grid-template-columns: 1fr;
  }

  .log-filters {
    flex-direction: column;
    gap: 8px;
  }

  .card-actions {
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .dashboard-header {
    padding: 0 16px;
  }

  .logo h1 {
    font-size: 16px;
  }

  .stat-card {
    flex-direction: column;
    text-align: center;
  }

  .activity-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .activity-badge {
    align-self: flex-start;
  }

  .log-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .log-actions {
    align-self: flex-end;
  }
}

/* Animations */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
