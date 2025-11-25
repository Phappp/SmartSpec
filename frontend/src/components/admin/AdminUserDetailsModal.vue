<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content large">
      <div class="modal-header">
        <h3><span class="material-symbols-outlined">person</span> Chi tiết người dùng</h3>
        <button class="close-btn" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="modal-body">
        <div class="user-profile">
          <!-- Header Section -->
          <div class="profile-header">
            <div class="avatar-section">
              <div class="user-avatar large">
                <img :src="userAvatar || defaultAvatar" alt="Avatar" />
              </div>
              <div class="user-basic-info">
                <h2>{{ user.name }}</h2>
                <p class="user-email">{{ user.email }}</p>
                <div class="user-badges">
                  <span class="role-badge" :class="user.system_role.toLowerCase()">
                    {{ getRoleDisplay(user.system_role) }}
                  </span>
                  <span class="status-badge" :class="user.status.toLowerCase()">
                    {{ getStatusDisplay(user.status) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="profile-actions">
              <button class="btn btn-secondary" @click="sendMessage">
                <span class="material-symbols-outlined">mail</span>
                Gửi tin nhắn
              </button>
            </div>
          </div>

          <!-- Tabs Navigation -->
          <div class="tabs-navigation">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="tab-button"
              :class="{ active: activeTab === tab.id }"
              @click="activeTab = tab.id"
            >
              <span class="material-symbols-outlined">{{ tab.icon }}</span>
              {{ tab.label }}
            </button>
          </div>

          <!-- Tab Content -->
          <div class="tab-content">
            <!-- Overview Tab -->
            <div v-if="activeTab === 'overview'" class="tab-panel">
              <div class="info-grid">
                <div class="info-section">
                  <h4>Thông tin cá nhân</h4>
                  <div class="info-list">
                    <div class="info-item">
                      <span class="info-label">Số điện thoại:</span>
                      <span class="info-value">{{ user.phone || 'Chưa cung cấp' }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Giới tính:</span>
                      <span class="info-value">{{ getGenderDisplay(user.gender) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Ngày sinh:</span>
                      <span class="info-value">{{ formatDate(user.dob) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Tiểu sử:</span>
                      <span class="info-value">{{ user.bio || 'Chưa có tiểu sử' }}</span>
                    </div>
                  </div>
                </div>

                <div class="info-section">
                  <h4>Thông tin tài khoản</h4>
                  <div class="info-list">
                    <div class="info-item">
                      <span class="info-label">Ngày tạo:</span>
                      <span class="info-value">{{ formatDateTime(user.created_at) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Cập nhật cuối:</span>
                      <span class="info-value">{{ formatDateTime(user.updated_at) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Đăng nhập cuối:</span>
                      <span class="info-value">{{ formatLastLogin(user.last_login) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Xác thực 2 yếu tố:</span>
                      <span class="info-value" :class="{ enabled: user.isTwoFactorEnabled }">
                        {{ user.isTwoFactorEnabled ? 'Đã bật' : 'Chưa bật' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Activity Tab -->
            <div v-if="activeTab === 'activity'" class="tab-panel">
              <div v-if="loadingActivities" class="loading-state">
                <span class="material-symbols-outlined spin">sync</span>
                Đang tải hoạt động...
              </div>

              <div v-else-if="recentActivities.length > 0" class="recent-activity">
                <h4>Hoạt động gần đây</h4>
                <div class="activity-list">
                  <div
                    v-for="activity in recentActivities"
                    :key="activity.id"
                    class="activity-item"
                  >
                    <div class="activity-icon">
                      <span class="material-symbols-outlined">{{ activity.icon }}</span>
                    </div>
                    <div class="activity-content">
                      <p class="activity-description">{{ activity.description }}</p>
                      <span class="activity-time">{{ activity.time }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="empty-state">
                <span class="material-symbols-outlined">hourglass_empty</span>
                <p>Chưa có hoạt động nào được ghi nhận</p>
              </div>
            </div>


            <!-- Projects Tab -->
            <div v-if="activeTab === 'projects'" class="tab-panel">
              <div class="projects-section">
                <h4>Dự án tham gia</h4>
                <div class="projects-list">
                  <div v-for="project in userProjects" :key="project.id" class="project-card">
                    <div class="project-header">
                      <h5>{{ project.name }}</h5>
                      <span class="project-role">{{ project.role }}</span>
                    </div>
                    <p class="project-description">{{ project.description }}</p>
                    <div class="project-meta">
                      <span class="meta-item">
                        <span class="material-symbols-outlined">calendar_today</span>
                        {{ formatDate(project.created_at) }}
                      </span>
                      <span class="meta-item">
                        <span class="material-symbols-outlined">update</span>
                        {{ formatDate(project.updated_at) }}
                      </span>
                    </div>
                  </div>
                </div>

                <div v-if="userProjects.length === 0" class="empty-state">
                  <span class="material-symbols-outlined">folder_off</span>
                  <p>Người dùng chưa tham gia dự án nào</p>
                </div>
              </div>
            </div>

            <!-- Settings Tab -->
            <div v-if="activeTab === 'settings'" class="tab-panel">
              <div class="settings-section">
                <h4>Cài đặt người dùng</h4>
                <div class="settings-list">
                  <div class="setting-item">
                    <div class="setting-info">
                      <span class="setting-label">Ngôn ngữ</span>
                      <span class="setting-value">{{
                        getUserLanguage(user.setting?.language)
                      }}</span>
                    </div>
                    <button class="btn btn-secondary small">Thay đổi</button>
                  </div>
                  <div class="setting-item">
                    <div class="setting-info">
                      <span class="setting-label">Giao diện</span>
                      <span class="setting-value">{{ getUserTheme(user.setting?.theme) }}</span>
                    </div>
                    <button class="btn btn-secondary small">Thay đổi</button>
                  </div>
                  <div class="setting-item">
                    <div class="setting-info">
                      <span class="setting-label">Thông báo email</span>
                      <span class="setting-value">Đã bật</span>
                    </div>
                    <button class="btn btn-secondary small">Quản lý</button>
                  </div>
                </div>
              </div>

              <div class="danger-zone">
                <h4>Khu vực nguy hiểm</h4>
                <div class="danger-actions">
                  <button class="btn btn-danger" @click="resetPassword">
                    <span class="material-symbols-outlined">key</span>
                    Đặt lại mật khẩu
                  </button>
                  <button
                    class="btn btn-danger"
                    @click="deactivateUser"
                    v-if="user.status === 'ACTIVE'"
                  >
                    <span class="material-symbols-outlined">toggle_off</span>
                    Vô hiệu hóa tài khoản
                  </button>
                  <button class="btn btn-danger" @click="activateUser" v-else>
                    <span class="material-symbols-outlined">toggle_on</span>
                    Kích hoạt tài khoản
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axiosClient from '@/utils/axiosClient'

const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
})


const activeTab = ref('overview')
const defaultAvatar =
  'https://static.vecteezy.com/system/resources/previews/024/983/914/original/simple-user-default-icon-free-png.png'
const userAvatar = computed(() => {
  const avatar = user.value?.avatar_url
  if (!avatar) return defaultAvatar
  // Nếu avatar đã là link đầy đủ
  if (avatar.startsWith('http')) return avatar
  // Nếu avatar là path tương đối => gắn BASE_URL
  return `${'http://localhost:8000'}${avatar}`
})
const tabs = [
  { id: 'overview', label: 'Tổng quan', icon: 'dashboard' },
  { id: 'activity', label: 'Hoạt động', icon: 'activity_zone' },
  { id: 'projects', label: 'Dự án', icon: 'folder' },
  { id: 'settings', label: 'Cài đặt', icon: 'settings' },
]

// Sample data
const recentActivities = ref([])
const loadingActivities = ref(false)

const userProjects = [
  {
    id: 1,
    name: 'E-commerce Platform',
    description: 'Xây dựng hệ thống thương mại điện tử với AI integration',
    role: 'Owner',
    created_at: new Date('2024-01-10'),
    updated_at: new Date('2024-01-15'),
  },
  {
    id: 2,
    name: 'Banking Mobile App',
    description: 'Ứng dụng ngân hàng di động với tính năng AI chatbot',
    role: 'Collaborator',
    created_at: new Date('2024-01-05'),
    updated_at: new Date('2024-01-12'),
  },
]
const fetchUserActivities = async () => {
  if (!user.value?.id) return
  loadingActivities.value = true
  try {
    const res = await axiosClient.get(`/api/logs?user_id=${user.value.id}`)
    const logs = res.data?.data?.items || []

    recentActivities.value = logs.map((log) => ({
      id: log._id,
      icon: getActivityIcon(log.action),
      description: log.details?.message || log.action || 'Hoạt động không xác định',
      time: formatDateTime(log.created_at),
    }))
  } catch (err) {
    console.error('Lỗi khi tải hoạt động người dùng:', err)
    recentActivities.value = []
  } finally {
    loadingActivities.value = false
  }
}

const getActivityIcon = (action) => {
  const icons = {
    login: 'login',
    logout: 'logout',
    create_user: 'person_add',
    create_project: 'add_circle',
    update_project: 'edit',
    create_version: 'layers',
    delete_project: 'delete',
    default: 'info',
  }
  return icons[action?.toLowerCase()] || icons.default
}

watch(activeTab, (newVal) => {
  if (newVal === 'activity') {
    fetchUserActivities()
  }
})
// Computed
const user = computed(() => props.user)

// Methods
const getRoleDisplay = (role) => {
  const roles = {
    ADMIN: 'Quản trị viên',
    PARTICIPANT: 'Thành viên',
  }
  return roles[role] || role
}

const getStatusDisplay = (status) => {
  const statuses = {
    ACTIVE: 'Đang hoạt động',
    INACTIVE: 'Ngừng hoạt động',
  }
  return statuses[status] || status
}

const getGenderDisplay = (gender) => {
  const genders = {
    male: 'Nam',
    female: 'Nữ',
    other: 'Khác',
  }
  return genders[gender] || 'Chưa cung cấp'
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('vi-VN')
}

const formatDateTime = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleString('vi-VN')
}

const formatLastLogin = (date) => {
  if (!date) return 'Chưa đăng nhập'
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  if (hours < 24) return `${hours} giờ trước`
  return `${days} ngày trước`
}

const getUserLanguage = (language) => {
  const languages = {
    vi: 'Tiếng Việt',
    en: 'English',
  }
  return languages[language] || 'Tiếng Việt'
}

const getUserTheme = (theme) => {
  const themes = {
    light: 'Sáng',
    dark: 'Tối',
    auto: 'Tự động',
  }
  return themes[theme] || 'Sáng'
}


const sendMessage = () => {
  // Implement send message functionality
  console.log('Send message to:', user.value.email)
}

const resetPassword = () => {
  // Implement reset password functionality
  console.log('Reset password for:', user.value.id)
}

const deactivateUser = () => {
  // Implement deactivate user functionality
  console.log('Deactivate user:', user.value.id)
}

const activateUser = () => {
  // Implement activate user functionality
  console.log('Activate user:', user.value.id)
}
onMounted(() => {
  if (activeTab.value === 'activity') {
    fetchUserActivities()
  }
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

.modal-content.large {
  max-width: 900px;
  width: 95%;
  max-height: 90vh;
  background:white;
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #1a365d;
  font-size: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.close-btn {
  background: none;
  border: none;
  color: #718096;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
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
}

.user-profile {
  display: flex;
  flex-direction: column;
  height: calc(90vh - 80px);
}

.profile-header {
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.avatar-section {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  flex: 1;
}

.user-avatar.large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid #e2e8f0;
  flex-shrink: 0;
}

.user-avatar.large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-basic-info h2 {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 700;
  color: #1a365d;
}

.user-email {
  margin: 0 0 12px 0;
  color: #718096;
  font-size: 16px;
}

.user-badges {
  display: flex;
  gap: 8px;
}

.role-badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
}

.role-badge.admin {
  background: #ebf8ff;
  color: #2b6cb0;
}

.role-badge.participant {
  background: #f0fff4;
  color: #276749;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
}

.status-badge.active {
  background: #f0fff4;
  color: #276749;
}

.status-badge.inactive {
  background: #fed7d7;
  color: #c53030;
}

.profile-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.tabs-navigation {
  padding: 0 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  gap: 0;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #718096;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-button:hover {
  color: #1a365d;
  background: #f7fafc;
}

.tab-button.active {
  color: #1a365d;
  border-bottom-color: #1a365d;
  background: white;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.info-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1a365d;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-section h4::before {
  content: '';
  width: 4px;
  height: 16px;
  background: #1a365d;
  border-radius: 2px;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px;
  background: #f7fafc;
  border-radius: 6px;
}

.info-label {
  font-weight: 500;
  color: #4a5568;
  min-width: 120px;
}

.info-value {
  color: #718096;
  text-align: right;
  flex: 1;
}

.info-value.enabled {
  color: #38a169;
  font-weight: 500;
}

.activity-stats {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stat-cards {
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
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: linear-gradient(135deg, #1a365d, #2d3748);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
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
}

.recent-activity h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1a365d;
  margin: 0 0 16px 0;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #f7fafc;
  border-radius: 6px;
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #718096;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-description {
  margin: 0 0 4px 0;
  color: #4a5568;
  font-weight: 500;
}

.activity-time {
  font-size: 12px;
  color: #718096;
}

.projects-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1a365d;
  margin: 0 0 16px 0;
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.project-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.project-header h5 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1a365d;
}

.project-role {
  padding: 4px 8px;
  background: #ebf8ff;
  color: #2b6cb0;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.project-description {
  margin: 0 0 12px 0;
  color: #718096;
  font-size: 14px;
  line-height: 1.4;
}

.project-meta {
  display: flex;
  gap: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #718096;
}

.meta-item .material-symbols-outlined {
  font-size: 14px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #718096;
}

.empty-state .material-symbols-outlined {
  font-size: 48px;
  color: #cbd5e0;
  margin-bottom: 12px;
}

.settings-section {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
}

.settings-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1a365d;
  margin: 0 0 16px 0;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f7fafc;
  border-radius: 6px;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  font-weight: 500;
  color: #4a5568;
}

.setting-value {
  color: #718096;
  font-size: 14px;
}

.danger-zone {
  border: 1px solid #fed7d7;
  border-radius: 8px;
  padding: 20px;
  background: #fff5f5;
}

.danger-zone h4 {
  font-size: 16px;
  font-weight: 600;
  color: #c53030;
  margin: 0 0 16px 0;
}

.danger-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 16px;
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

.btn.small {
  padding: 6px 12px;
  font-size: 12px;
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

.btn-danger {
  background: #e53e3e;
  color: white;
}

.btn-danger:hover {
  background: #c53030;
}

@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    align-items: stretch;
  }

  .avatar-section {
    flex-direction: column;
    text-align: center;
  }

  .profile-actions {
    justify-content: center;
  }

  .tabs-navigation {
    overflow-x: auto;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .stat-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .danger-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>