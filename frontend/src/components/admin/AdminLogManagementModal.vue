<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content extra-large">
      <div class="modal-header">
        <h3><span class="material-symbols-outlined">list_alt</span> Quản lý Log hệ thống</h3>
        <div class="header-actions">
          <div class="search-box">
            <span class="material-symbols-outlined">search</span>
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Tìm kiếm log..."
              class="search-input"
            />
          </div>
          <button class="btn btn-primary" @click="exportLogs">
            <span class="material-symbols-outlined">download</span>
            Xuất log
          </button>
          <button class="btn btn-secondary" @click="clearOldLogs">
            <span class="material-symbols-outlined">delete_sweep</span>
            Dọn dẹp
          </button>
          <button class="close-btn" @click="$emit('close')">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <div class="modal-body">
        <!-- Filters -->
        <div class="filters-section">
          <div class="filter-group">
            <label>Level:</label>
            <select v-model="filters.level" class="filter-select">
              <option value="all">Tất cả</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Loại:</label>
            <select v-model="filters.type" class="filter-select">
              <option value="all">Tất cả</option>
              <option value="user">Người dùng</option>
              <option value="system">Hệ thống</option>
              <option value="api">API</option>
              <option value="project">Dự án</option>
              <option value="database">Database</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Dự án:</label>
            <select v-model="filters.project" class="filter-select">
              <option value="all">Tất cả dự án</option>
              <option v-for="project in projects" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
          </div>
          <div class="filter-group">
            <label>Người dùng:</label>
            <select v-model="filters.user" class="filter-select">
              <option value="all">Tất cả người dùng</option>
              <option v-for="user in users" :key="user.id" :value="user.id">
                {{ user.name }}
              </option>
            </select>
          </div>
          <div class="filter-group">
            <label>Thời gian:</label>
            <select v-model="filters.timeRange" class="filter-select">
              <option value="1h">1 giờ qua</option>
              <option value="24h">24 giờ qua</option>
              <option value="7d">7 ngày qua</option>
              <option value="30d">30 ngày qua</option>
              <option value="all">Tất cả</option>
            </select>
          </div>
          <button class="btn btn-secondary" @click="resetFilters">
            <span class="material-symbols-outlined">refresh</span>
            Đặt lại
          </button>
        </div>

        <!-- Log Statistics -->
        <div class="stats-section">
          <div class="stats-cards">
            <div class="stat-card">
              <div class="stat-icon info">
                <span class="material-symbols-outlined">info</span>
              </div>
              <div class="stat-content">
                <h3>{{ stats.info }}</h3>
                <p>Info</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon warning">
                <span class="material-symbols-outlined">warning</span>
              </div>
              <div class="stat-content">
                <h3>{{ stats.warning }}</h3>
                <p>Warning</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon error">
                <span class="material-symbols-outlined">error</span>
              </div>
              <div class="stat-content">
                <h3>{{ stats.error }}</h3>
                <p>Error</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon total">
                <span class="material-symbols-outlined">summarize</span>
              </div>
              <div class="stat-content">
                <h3>{{ stats.total }}</h3>
                <p>Tổng log</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Logs Table -->
        <div class="table-container">
          <table class="logs-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Level</th>
                <th>Loại</th>
                <th>Thông điệp</th>
                <th>Người dùng</th>
                <th>Dự án</th>
                <th>IP</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="log in paginatedLogs"
                :key="log.id"
                :class="log.level"
                @click="viewLogDetails(log)"
                class="log-row"
              >
                <td>
                  <div class="timestamp">
                    <div class="date">{{ formatDate(log.created_at) }}</div>
                    <div class="time">{{ formatTime(log.created_at) }}</div>
                  </div>
                </td>
                <td>
                  <span class="level-badge" :class="log.level">
                    {{ getLevelDisplay(log.level) }}
                  </span>
                </td>
                <td>
                  <span class="type-badge">{{ getTypeDisplay(log.target_type) }}</span>
                </td>
                <td>
                  <div class="message-content">
                    <div class="message-text">{{ log.details?.message || log.action }}</div>
                    <div class="action-info" v-if="log.action">
                      {{ getActionDisplay(log.action) }}
                    </div>
                  </div>
                </td>
                <td>
                  <div class="user-info" v-if="log.user_id">
                    <div class="user-avatar small">
                      <img :src="getUserAvatar(log.user_id)" alt="User" />
                    </div>
                    <span class="user-name">{{ getUserName(log.user_id) }}</span>
                  </div>
                  <span v-else class="no-user">System</span>
                </td>
                <td>
                  <span class="project-name" v-if="log.project_id">
                    {{ getProjectName(log.project_id) }}
                  </span>
                  <span v-else class="no-project">-</span>
                </td>
                <td>
                  <code class="ip-address">{{ log.ip || 'Not available' }}</code>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon" @click.stop="viewLogDetails(log)" title="Xem chi tiết">
                      <span class="material-symbols-outlined">visibility</span>
                    </button>
                    <button class="btn-icon" @click.stop="copyLog(log)" title="Sao chép">
                      <span class="material-symbols-outlined">content_copy</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div v-if="filteredLogs.length === 0" class="empty-state">
            <span class="material-symbols-outlined">list_alt</span>
            <h4>Không tìm thấy log</h4>
            <p>Không có log nào phù hợp với tiêu chí tìm kiếm của bạn.</p>
            <button class="btn btn-primary" @click="resetFilters">
              <span class="material-symbols-outlined">refresh</span>
              Đặt lại bộ lọc
            </button>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="filteredLogs.length > 0" class="pagination-section">
          <div class="pagination-info">
            Hiển thị {{ pagination.start }}-{{ pagination.end }} của {{ filteredLogs.length }} log
          </div>
          <div class="pagination-controls">
            <button
              class="btn-pagination"
              :disabled="pagination.currentPage === 1"
              @click="changePage(pagination.currentPage - 1)"
            >
              <span class="material-symbols-outlined">chevron_left</span>
            </button>

            <button
              v-for="page in pagination.pages"
              :key="page"
              class="btn-pagination"
              :class="{ active: page === pagination.currentPage }"
              @click="changePage(page)"
            >
              {{ page }}
            </button>

            <button
              class="btn-pagination"
              :disabled="pagination.currentPage === pagination.totalPages"
              @click="changePage(pagination.currentPage + 1)"
            >
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
          <div class="page-size">
            <label>Hiển thị:</label>
            <select v-model="pagination.pageSize" class="page-size-select">
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Log Details Modal -->
    <AdminLogDetailsModal
      v-if="showLogDetailsModal"
      :log="selectedLog"
      @close="showLogDetailsModal = false"
    />

    <!-- Clear Logs Confirmation -->
    <AdminConfirmModal
      v-if="showClearLogsModal"
      title="Dọn dẹp log"
      message="Bạn có chắc chắn muốn xóa tất cả log cũ hơn 30 ngày? Hành động này không thể hoàn tác."
      confirm-text="Dọn dẹp"
      cancel-text="Hủy"
      type="warning"
      @confirm="confirmClearLogs"
      @cancel="showClearLogsModal = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import AdminLogDetailsModal from './AdminLogDetailsModal.vue'
import AdminConfirmModal from './AdminConfirmModal.vue'

const emit = defineEmits(['close'])

// Modal states
const showLogDetailsModal = ref(false)
const showClearLogsModal = ref(false)

// Data
const logs = ref([])
const selectedLog = ref(null)
const users = ref([])
const projects = ref([])

const searchQuery = ref('')
const filters = reactive({
  level: 'all',
  type: 'all',
  project: 'all',
  user: 'all',
  timeRange: '24h',
})

const pagination = reactive({
  currentPage: 1,
  pageSize: 50,
  totalPages: 1,
  start: 0,
  end: 0,
  pages: [],
})

const stats = reactive({
  info: 0,
  warning: 0,
  error: 0,
  total: 0,
})

// Sample data
const sampleLogs = [
  {
    id: '1',
    level: 'info',
    action: 'login',
    target_type: 'system',
    details: {
      message: 'User logged in successfully',
    },
    user_id: '1',
    project_id: null,
    ip: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: new Date('2024-01-15T10:30:00'),
  },
  {
    id: '2',
    level: 'warning',
    action: 'api_rate_limit',
    target_type: 'api',
    details: {
      message: 'API rate limit approaching threshold',
    },
    user_id: '2',
    project_id: '1',
    ip: '192.168.1.101',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    created_at: new Date('2024-01-15T09:15:00'),
  },
  {
    id: '3',
    level: 'error',
    action: 'database_connection',
    target_type: 'database',
    details: {
      message: 'Database connection failed - automatically recovered',
      before: null,
      after: null,
    },
    user_id: null,
    project_id: null,
    ip: null,
    user_agent: null,
    created_at: new Date('2024-01-15T08:45:00'),
  },
  {
    id: '4',
    level: 'info',
    action: 'create_project',
    target_type: 'project',
    details: {
      message: 'Project created: E-commerce Platform',
    },
    user_id: '1',
    project_id: '1',
    ip: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: new Date('2024-01-14T15:20:00'),
  },
]

const sampleUsers = [
  { id: '1', name: 'Admin User', avatar_url: null },
  { id: '2', name: 'Nguyễn Văn A', avatar_url: null },
]

const sampleProjects = [
  { id: '1', name: 'E-commerce Platform' },
  { id: '2', name: 'Banking Mobile App' },
]

// Computed
const filteredLogs = computed(() => {
  let filtered = logs.value.filter((log) => {
    const matchesSearch =
      log.details?.message?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesLevel = filters.level === 'all' || log.level === filters.level
    const matchesType = filters.type === 'all' || log.target_type === filters.type
    const matchesProject = filters.project === 'all' || log.project_id === filters.project
    const matchesUser = filters.user === 'all' || log.user_id === filters.user

    // Time range filter
    const logTime = new Date(log.created_at).getTime()
    const now = new Date().getTime()
    let timeFilter = true

    switch (filters.timeRange) {
      case '1h':
        timeFilter = now - logTime <= 60 * 60 * 1000
        break
      case '24h':
        timeFilter = now - logTime <= 24 * 60 * 60 * 1000
        break
      case '7d':
        timeFilter = now - logTime <= 7 * 24 * 60 * 60 * 1000
        break
      case '30d':
        timeFilter = now - logTime <= 30 * 24 * 60 * 60 * 1000
        break
      default:
        timeFilter = true
    }

    return (
      matchesSearch && matchesLevel && matchesType && matchesProject && matchesUser && timeFilter
    )
  })

  // Sort by creation date (newest first)
  filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return filtered
})

const paginatedLogs = computed(() => {
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  pagination.start = start + 1
  pagination.end = Math.min(end, filteredLogs.value.length)
  return filteredLogs.value.slice(start, end)
})

// Methods
const loadLogs = async () => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 500))
  logs.value = sampleLogs
  users.value = sampleUsers
  projects.value = sampleProjects
  updateStatistics()
  updatePagination()
}

const updateStatistics = () => {
  stats.info = logs.value.filter((log) => log.level === 'info').length
  stats.warning = logs.value.filter((log) => log.level === 'warning').length
  stats.error = logs.value.filter((log) => log.level === 'error').length
  stats.total = logs.value.length
}

const updatePagination = () => {
  pagination.totalPages = Math.ceil(filteredLogs.value.length / pagination.pageSize)
  pagination.pages = Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
    let start = Math.max(1, pagination.currentPage - 2)
    return start + i
  }).filter((page) => page <= pagination.totalPages)
}

const changePage = (page) => {
  if (page >= 1 && page <= pagination.totalPages) {
    pagination.currentPage = page
  }
}

const viewLogDetails = (log) => {
  selectedLog.value = log
  showLogDetailsModal.value = true
}

const copyLog = async (log) => {
  const logText = `[${formatDateTime(log.created_at)}] ${log.level.toUpperCase()}: ${
    log.details?.message || log.action
  }`
  try {
    await navigator.clipboard.writeText(logText)
    // Show success message
    console.log('Log copied to clipboard')
  } catch (err) {
    console.error('Failed to copy log:', err)
  }
}

const exportLogs = () => {
  const logData = filteredLogs.value.map((log) => ({
    timestamp: log.created_at,
    level: log.level,
    type: log.target_type,
    message: log.details?.message || log.action,
    user: getUserName(log.user_id),
    project: getProjectName(log.project_id),
    ip: log.ip,
  }))

  const csv = convertToCSV(logData)
  downloadCSV(csv, `system-logs-${new Date().toISOString().split('T')[0]}.csv`)
}

const convertToCSV = (data) => {
  const headers = ['Timestamp', 'Level', 'Type', 'Message', 'User', 'Project', 'IP']
  const rows = data.map((item) => [
    formatDateTime(item.timestamp),
    item.level,
    item.type,
    `"${item.message.replace(/"/g, '""')}"`,
    item.user,
    item.project,
    item.ip,
  ])

  return [headers, ...rows].map((row) => row.join(',')).join('\n')
}

const downloadCSV = (csv, filename) => {
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}

const clearOldLogs = () => {
  showClearLogsModal.value = true
}

const confirmClearLogs = async () => {
  // In real app, call API to clear old logs
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  logs.value = logs.value.filter((log) => new Date(log.created_at) > thirtyDaysAgo)
  updateStatistics()
  showClearLogsModal.value = false
}

const getLevelDisplay = (level) => {
  const levels = {
    info: 'Info',
    warning: 'Warning',
    error: 'Error',
  }
  return levels[level] || level
}

const getTypeDisplay = (type) => {
  const types = {
    system: 'System',
    user: 'User',
    api: 'API',
    project: 'Project',
    database: 'Database',
  }
  return types[type] || type
}

const getActionDisplay = (action) => {
  const actions = {
    login: 'Đăng nhập',
    api_rate_limit: 'Giới hạn API',
    database_connection: 'Kết nối database',
    create_project: 'Tạo dự án',
  }
  return actions[action] || action
}

const getUserAvatar = (userId) => {
  const user = users.value.find((u) => u.id === userId)
  return (
    user?.avatar_url ||
    'https://static.vecteezy.com/system/resources/previews/024/983/914/original/simple-user-default-icon-free-png.png'
  )
}

const getUserName = (userId) => {
  const user = users.value.find((u) => u.id === userId)
  return user?.name || 'Unknown'
}

const getProjectName = (projectId) => {
  const project = projects.value.find((p) => p.id === projectId)
  return project?.name || 'Unknown'
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('vi-VN')
}

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDateTime = (date) => {
  return new Date(date).toLocaleString('vi-VN')
}

const resetFilters = () => {
  searchQuery.value = ''
  filters.level = 'all'
  filters.type = 'all'
  filters.project = 'all'
  filters.user = 'all'
  filters.timeRange = '24h'
  pagination.currentPage = 1
}

// Watchers
watch(
  [
    () => filters.level,
    () => filters.type,
    () => filters.project,
    () => filters.user,
    () => filters.timeRange,
    searchQuery,
  ],
  () => {
    pagination.currentPage = 1
    updatePagination()
  }
)

watch(
  () => pagination.pageSize,
  () => {
    pagination.currentPage = 1
    updatePagination()
  }
)

watch(filteredLogs, updatePagination)

onMounted(() => {
  loadLogs()
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content.extra-large {
  max-width: 1400px;
  width: 95%;
  max-height: 90vh;
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.modal-header h3 {
  margin: 0;
  color: #1a365d;
  font-size: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  justify-content: flex-end;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 300px;
}

.search-box .material-symbols-outlined {
  position: absolute;
  left: 12px;
  color: #718096;
  font-size: 20px;
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 40px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

.close-btn {
  background: none;
  border: none;
  color: #718096;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #f7fafc;
  color: #1a365d;
}

.modal-body {
  padding: 0;
  display: flex;
  flex-direction: column;
  height: calc(90vh - 80px);
}

.filters-section {
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  background: #f7fafc;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
  white-space: nowrap;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  min-width: 120px;
}

.stats-section {
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: white;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-icon.info {
  background: linear-gradient(135deg, #3182ce, #63b3ed);
}

.stat-icon.warning {
  background: linear-gradient(135deg, #ed8936, #fbd38d);
}

.stat-icon.error {
  background: linear-gradient(135deg, #e53e3e, #fc8181);
}

.stat-icon.total {
  background: linear-gradient(135deg, #1a365d, #2d3748);
}

.stat-icon .material-symbols-outlined {
  font-size: 24px;
}

.stat-content h3 {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 700;
  color: #1a365d;
}

.stat-content p {
  margin: 0;
  color: #718096;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.table-container {
  flex: 1;
  overflow: auto;
  padding: 0;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.logs-table th {
  background: #f7fafc;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.logs-table td {
  padding: 16px;
  border-bottom: 1px solid #f7fafc;
  vertical-align: top;
}

.log-row {
  cursor: pointer;
  transition: background 0.2s;
}

.log-row:hover {
  background: #f7fafc;
}

.log-row.info {
  border-left: 4px solid #3182ce;
}

.log-row.warning {
  border-left: 4px solid #ed8936;
}

.log-row.error {
  border-left: 4px solid #e53e3e;
}

.timestamp {
  display: flex;
  flex-direction: column;
  gap: 2px;
  white-space: nowrap;
}

.date {
  font-weight: 500;
  color: #1a365d;
  font-size: 13px;
}

.time {
  font-size: 12px;
  color: #718096;
}

.level-badge {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.level-badge.info {
  background: #ebf8ff;
  color: #2b6cb0;
}

.level-badge.warning {
  background: #fffaf0;
  color: #d69e2e;
}

.level-badge.error {
  background: #fed7d7;
  color: #c53030;
}

.type-badge {
  padding: 4px 8px;
  background: #f7fafc;
  color: #4a5568;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  text-transform: capitalize;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-text {
  color: #4a5568;
  font-weight: 500;
  line-height: 1.4;
  word-break: break-word;
}

.action-info {
  font-size: 12px;
  color: #718096;
  font-style: italic;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar.small {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #e2e8f0;
}

.user-avatar.small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-name {
  font-size: 13px;
  color: #4a5568;
}

.no-user,
.no-project {
  font-size: 13px;
  color: #718096;
  font-style: italic;
}

.project-name {
  font-size: 13px;
  color: #4a5568;
  font-weight: 500;
}

.ip-address {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #718096;
  background: #f7fafc;
  padding: 2px 6px;
  border-radius: 4px;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.btn-icon {
  background: none;
  border: none;
  color: #718096;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: #edf2f7;
  color: #1a365d;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: #718096;
}

.empty-state .material-symbols-outlined {
  font-size: 64px;
  color: #cbd5e0;
  margin-bottom: 16px;
}

.empty-state h4 {
  font-size: 18px;
  font-weight: 600;
  color: #4a5568;
  margin: 0 0 8px 0;
}

.empty-state p {
  margin: 0 0 20px 0;
}

.pagination-section {
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f7fafc;
}

.pagination-info {
  font-size: 14px;
  color: #718096;
}

.pagination-controls {
  display: flex;
  gap: 4px;
}

.btn-pagination {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  cursor: pointer;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
  min-width: 40px;
}

.btn-pagination:hover:not(:disabled) {
  background: #edf2f7;
  border-color: #a0aec0;
}

.btn-pagination.active {
  background: #1a365d;
  color: white;
  border-color: #1a365d;
}

.btn-pagination:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-size {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-size label {
  font-size: 14px;
  color: #374151;
}

.page-size-select {
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.btn-primary {
  background: #1a365d;
  color: white;
}

.btn-primary:hover {
  background: #2d3748;
}

.btn-secondary {
  background: #f7fafc;
  color: #374151;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  background: #edf2f7;
}

@media (max-width: 768px) {
  .modal-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .header-actions {
    justify-content: space-between;
  }

  .filters-section {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    justify-content: space-between;
  }

  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .logs-table {
    font-size: 12px;
  }

  .logs-table th,
  .logs-table td {
    padding: 8px 12px;
  }

  .pagination-section {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .pagination-controls {
    justify-content: center;
  }
}
</style>