<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content extra-large">
      <div class="modal-header">
        <h3><span class="material-symbols-outlined">folder</span> Quản lý dự án</h3>
        <div class="header-actions">
          <div class="search-box">
            <span class="material-symbols-outlined">search</span>
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Tìm kiếm dự án..."
              class="search-input"
            />
          </div>
          <button class="btn btn-primary" @click="showCreateProjectModal = true">
            <span class="material-symbols-outlined">add</span>
            Tạo dự án
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
            <label>Trạng thái:</label>
            <select v-model="filters.status" class="filter-select">
              <option value="all">Tất cả</option>
              <option value="active">Đang hoạt động</option>
              <option value="archived">Đã lưu trữ</option>
              <option value="deleted">Đã xóa</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Ngôn ngữ:</label>
            <select v-model="filters.language" class="filter-select">
              <option value="all">Tất cả</option>
              <option value="vi-VN">Tiếng Việt</option>
              <option value="en-US">English</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Sắp xếp:</label>
            <select v-model="filters.sortBy" class="filter-select">
              <option value="created_at">Ngày tạo</option>
              <option value="name">Tên</option>
              <option value="last_accessed">Truy cập cuối</option>
              <option value="member_count">Số thành viên</option>
            </select>
          </div>
          <button class="btn btn-secondary" @click="resetFilters">
            <span class="material-symbols-outlined">refresh</span>
            Đặt lại
          </button>
        </div>

        <!-- Projects Table -->
        <div class="table-container">
          <table class="projects-table">
            <thead>
              <tr>
                <th>Tên dự án</th>
                <th>Chủ sở hữu</th>
                <th>Thành viên</th>
                <th>Ngôn ngữ</th>
                <th>Phiên bản</th>
                <th>Truy cập cuối</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="project in paginatedProjects" :key="project.id">
                <td>
                  <div class="project-info">
                    <div class="project-icon">
                      <span class="material-symbols-outlined">folder</span>
                    </div>
                    <div class="project-details">
                      <div class="project-name">{{ project.name }}</div>
                      <div class="project-description">{{ project.description }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="owner-info">
                    <div class="user-avatar small">
                      <img :src="getOwner(project).avatar_url || defaultAvatar" alt="Owner" />
                    </div>
                    <span class="owner-name">{{ getOwner(project).name }}</span>
                  </div>
                </td>
                <td>
                  <div class="members-info">
                    <div class="member-avatars">
                      <div
                        v-for="member in getTopMembers(project)"
                        :key="member.user_id"
                        class="member-avatar"
                        :title="member.name"
                      >
                        <img :src="member.avatar_url || defaultAvatar" alt="Member" />
                      </div>
                      <div v-if="project.members.length > 3" class="more-members">
                        +{{ project.members.length - 3 }}
                      </div>
                    </div>
                    <span class="member-count">{{ project.members.length }} thành viên</span>
                  </div>
                </td>
                <td>
                  <span class="language-badge">{{ getLanguageDisplay(project.language) }}</span>
                </td>
                <td>
                  <div class="version-info">
                    <span class="version-number"
                      >v{{ project.current_version?.version_number || '1.0' }}</span
                    >
                    <span class="version-date" v-if="project.current_version">
                      {{ formatDate(project.current_version.created_at) }}
                    </span>
                  </div>
                </td>
                <td>
                  <div class="last-accessed">
                    {{ formatLastAccessed(project.last_accessed_at) }}
                  </div>
                </td>
                <td>
                  <span class="status-badge" :class="getProjectStatus(project)">
                    {{ getStatusDisplay(project) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon" @click="viewProject(project)" title="Xem chi tiết">
                      <span class="material-symbols-outlined">visibility</span>
                    </button>
                    <button class="btn-icon" @click="editProject(project)" title="Chỉnh sửa">
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      class="btn-icon"
                      @click="manageMembers(project)"
                      title="Quản lý thành viên"
                    >
                      <span class="material-symbols-outlined">group</span>
                    </button>
                    <button
                      class="btn-icon"
                      :class="{ danger: !project.status?.is_trashed }"
                      @click="toggleProjectStatus(project)"
                      :title="project.status?.is_trashed ? 'Khôi phục' : 'Lưu trữ'"
                    >
                      <span class="material-symbols-outlined">
                        {{ project.status?.is_trashed ? 'restore_from_trash' : 'archive' }}
                      </span>
                    </button>
                    <button
                      class="btn-icon danger"
                      @click="deleteProject(project)"
                      title="Xóa vĩnh viễn"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div v-if="filteredProjects.length === 0" class="empty-state">
            <span class="material-symbols-outlined">folder_off</span>
            <h4>Không tìm thấy dự án</h4>
            <p>Không có dự án nào phù hợp với tiêu chí tìm kiếm của bạn.</p>
            <button class="btn btn-primary" @click="resetFilters">
              <span class="material-symbols-outlined">refresh</span>
              Đặt lại bộ lọc
            </button>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="filteredProjects.length > 0" class="pagination-section">
          <div class="pagination-info">
            Hiển thị {{ pagination.start }}-{{ pagination.end }} của
            {{ filteredProjects.length }} dự án
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
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Project Modal -->
    <AdminCreateProjectModal
      v-if="showCreateProjectModal"
      @create="handleCreateProject"
      @close="showCreateProjectModal = false"
    />

    <!-- Edit Project Modal -->
    <AdminEditProjectModal
      v-if="showEditProjectModal"
      :project="editingProject"
      @save="handleUpdateProject"
      @close="showEditProjectModal = false"
    />

    <!-- Project Details Modal -->
    <AdminProjectDetailsModal
      v-if="showProjectDetailsModal"
      :project="selectedProject"
      @close="showProjectDetailsModal = false"
    />

    <!-- Manage Members Modal -->
    <AdminManageMembersModal
      v-if="showManageMembersModal"
      :project="selectedProject"
      @close="showManageMembersModal = false"
    />

    <!-- Delete Confirmation Modal -->
    <AdminConfirmModal
      v-if="showDeleteModal"
      title="Xóa dự án"
      :message="`Bạn có chắc chắn muốn xóa vĩnh viễn dự án ${deletingProject?.name}? Tất cả dữ liệu sẽ bị mất và không thể khôi phục.`"
      confirm-text="Xóa vĩnh viễn"
      cancel-text="Hủy"
      type="danger"
      :requires-confirmation="true"
      confirmation-text="DELETE"
      @confirm="confirmDeleteProject"
      @cancel="showDeleteModal = false"
    />

    confirmation-text="DELETE" @confirm="confirmDeleteProject" @cancel="showDeleteModal = false" />
  </div>
</template>

<script setup>
// import { ref, reactive, computed, onMounted } from 'vue'
// import AdminCreateProjectModal from './AdminCreateProjectModal.vue'
// import AdminEditProjectModal from './AdminEditProjectModal.vue'
// import AdminProjectDetailsModal from './AdminProjectDetailsModal.vue'
// import AdminManageMembersModal from './AdminManageMembersModal.vue'
// import AdminConfirmModal from './AdminConfirmModal.vue'

const emit = defineEmits(['close'])

// Modal states
const showCreateProjectModal = ref(false)
const showEditProjectModal = ref(false)
const showProjectDetailsModal = ref(false)
const showManageMembersModal = ref(false)
const showDeleteModal = ref(false)

// Data
const projects = ref([])
const editingProject = ref(null)
const selectedProject = ref(null)
const deletingProject = ref(null)

const searchQuery = ref('')
const filters = reactive({
  status: 'all',
  language: 'all',
  sortBy: 'created_at',
})

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  totalPages: 1,
  start: 0,
  end: 0,
  pages: [],
})

const defaultAvatar =
  'https://static.vecteezy.com/system/resources/previews/024/983/914/original/simple-user-default-icon-free-png.png'

// Sample data
const sampleProjects = [
  {
    id: '1',
    name: 'E-commerce Platform',
    description: 'Xây dựng hệ thống thương mại điện tử với AI integration',
    language: 'vi-VN',
    owner_id: '1',
    members: [
      { user_id: '1', name: 'Admin User', avatar_url: null, role: 'owner' },
      { user_id: '2', name: 'Nguyễn Văn A', avatar_url: null, role: 'editor' },
      { user_id: '3', name: 'Trần Thị B', avatar_url: null, role: 'viewer' },
    ],
    current_version: {
      version_number: 2,
      created_at: new Date('2024-01-15'),
    },
    last_accessed_at: new Date('2024-01-15T10:30:00'),
    created_at: new Date('2024-01-01'),
    status: {
      is_trashed: false,
      trashed_at: null,
    },
  },
  {
    id: '2',
    name: 'Banking Mobile App',
    description: 'Ứng dụng ngân hàng di động với tính năng AI chatbot',
    language: 'en-US',
    owner_id: '2',
    members: [
      { user_id: '2', name: 'Nguyễn Văn A', avatar_url: null, role: 'owner' },
      { user_id: '1', name: 'Admin User', avatar_url: null, role: 'editor' },
    ],
    current_version: {
      version_number: 1,
      created_at: new Date('2024-01-10'),
    },
    last_accessed_at: new Date('2024-01-14T15:45:00'),
    created_at: new Date('2024-01-05'),
    status: {
      is_trashed: false,
      trashed_at: null,
    },
  },
  {
    id: '3',
    name: 'Healthcare System',
    description: 'Hệ thống quản lý chăm sóc sức khỏe thông minh',
    language: 'vi-VN',
    owner_id: '1',
    members: [
      { user_id: '1', name: 'Admin User', avatar_url: null, role: 'owner' },
      { user_id: '3', name: 'Trần Thị B', avatar_url: null, role: 'editor' },
    ],
    current_version: {
      version_number: 3,
      created_at: new Date('2024-01-12'),
    },
    last_accessed_at: new Date('2024-01-13T09:20:00'),
    created_at: new Date('2023-12-20'),
    status: {
      is_trashed: true,
      trashed_at: new Date('2024-01-10'),
    },
  },
]

// Computed
const filteredProjects = computed(() => {
  let filtered = projects.value.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesLanguage = filters.language === 'all' || project.language === filters.language
    const matchesStatus =
      filters.status === 'all' ||
      (filters.status === 'active' && !project.status?.is_trashed) ||
      (filters.status === 'archived' && project.status?.is_trashed) ||
      (filters.status === 'deleted' && project.status?.is_trashed)

    return matchesSearch && matchesLanguage && matchesStatus
  })

  // Sort
  filtered.sort((a, b) => {
    switch (filters.sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'last_accessed':
        return new Date(b.last_accessed_at) - new Date(a.last_accessed_at)
      case 'member_count':
        return b.members.length - a.members.length
      default:
        return new Date(b.created_at) - new Date(a.created_at)
    }
  })

  return filtered
})

const paginatedProjects = computed(() => {
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  pagination.start = start + 1
  pagination.end = Math.min(end, filteredProjects.value.length)
  return filteredProjects.value.slice(start, end)
})

// Methods
const loadProjects = async () => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 500))
  projects.value = sampleProjects
  updatePagination()
}

const updatePagination = () => {
  pagination.totalPages = Math.ceil(filteredProjects.value.length / pagination.pageSize)
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

const getOwner = (project) => {
  return project.members.find((member) => member.role === 'owner') || project.members[0]
}

const getTopMembers = (project) => {
  return project.members.filter((member) => member.role !== 'owner').slice(0, 3)
}

const getLanguageDisplay = (language) => {
  const languages = {
    'vi-VN': 'VI',
    'en-US': 'EN',
  }
  return languages[language] || language
}

const getProjectStatus = (project) => {
  if (project.status?.is_trashed) return 'archived'
  return 'active'
}

const getStatusDisplay = (project) => {
  if (project.status?.is_trashed) return 'Đã lưu trữ'
  return 'Đang hoạt động'
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('vi-VN')
}

const formatLastAccessed = (date) => {
  if (!date) return 'Chưa truy cập'
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Hôm nay'
  if (days === 1) return '1 ngày trước'
  if (days < 7) return `${days} ngày trước`
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`
  return `${Math.floor(days / 30)} tháng trước`
}

const viewProject = (project) => {
  selectedProject.value = project
  showProjectDetailsModal.value = true
}

const editProject = (project) => {
  editingProject.value = { ...project }
  showEditProjectModal.value = true
}

const manageMembers = (project) => {
  selectedProject.value = project
  showManageMembersModal.value = true
}

const toggleProjectStatus = (project) => {
  project.status.is_trashed = !project.status.is_trashed
  project.status.trashed_at = project.status.is_trashed ? new Date() : null
  // In real app, call API to update status
}

const deleteProject = (project) => {
  deletingProject.value = project
  showDeleteModal.value = true
}

const confirmDeleteProject = async () => {
  if (deletingProject.value) {
    // In real app, call API to delete project
    projects.value = projects.value.filter((p) => p.id !== deletingProject.value.id)
    showDeleteModal.value = false
    deletingProject.value = null
  }
}

const handleCreateProject = (projectData) => {
  const newProject = {
    id: Date.now().toString(),
    ...projectData,
    members: [
      {
        user_id: '1', // current user
        name: 'Admin User',
        avatar_url: null,
        role: 'owner',
      },
    ],
    current_version: {
      version_number: 1,
      created_at: new Date(),
    },
    last_accessed_at: new Date(),
    created_at: new Date(),
    status: {
      is_trashed: false,
      trashed_at: null,
    },
  }
  projects.value.unshift(newProject)
  showCreateProjectModal.value = false
  updatePagination()
}

const handleUpdateProject = (projectData) => {
  const index = projects.value.findIndex((p) => p.id === projectData.id)
  if (index > -1) {
    projects.value[index] = { ...projects.value[index], ...projectData }
  }
  showEditProjectModal.value = false
}

const resetFilters = () => {
  searchQuery.value = ''
  filters.status = 'all'
  filters.language = 'all'
  filters.sortBy = 'created_at'
  pagination.currentPage = 1
}

// Watchers
watch([() => filters.status, () => filters.language, () => filters.sortBy, searchQuery], () => {
  pagination.currentPage = 1
  updatePagination()
})

watch(
  () => pagination.pageSize,
  () => {
    pagination.currentPage = 1
    updatePagination()
  }
)

watch(filteredProjects, updatePagination)

onMounted(() => {
  loadProjects()
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

.table-container {
  flex: 1;
  overflow: auto;
  padding: 0;
}

.projects-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.projects-table th {
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

.projects-table td {
  padding: 16px;
  border-bottom: 1px solid #f7fafc;
  vertical-align: middle;
}

.projects-table tr:hover {
  background: #f7fafc;
}

.project-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.project-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, #1a365d, #2d3748);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.project-details {
  display: flex;
  flex-direction: column;
}

.project-name {
  font-weight: 600;
  color: #1a365d;
  margin-bottom: 4px;
}

.project-description {
  font-size: 12px;
  color: #718096;
  line-height: 1.3;
}

.owner-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar.small {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #e2e8f0;
}

.user-avatar.small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.owner-name {
  font-size: 14px;
  color: #4a5568;
}

.members-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.member-avatars {
  display: flex;
  gap: -8px;
}

.member-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid white;
  background: #e2e8f0;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.more-members {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #718096;
  font-weight: 600;
  border: 2px solid white;
}

.member-count {
  font-size: 12px;
  color: #718096;
}

.language-badge {
  padding: 4px 8px;
  background: #ebf8ff;
  color: #2b6cb0;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.version-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.version-number {
  font-weight: 600;
  color: #1a365d;
  font-size: 14px;
}

.version-date {
  font-size: 12px;
  color: #718096;
}

.last-accessed {
  font-size: 13px;
  color: #718096;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
}

.status-badge.active {
  background: #f0fff4;
  color: #276749;
}

.status-badge.archived {
  background: #fffaf0;
  color: #d69e2e;
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

.btn-icon.danger:hover {
  background: #fed7d7;
  color: #c53030;
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

  .projects-table {
    font-size: 12px;
  }

  .projects-table th,
  .projects-table td {
    padding: 8px 12px;
  }

  .action-buttons {
    flex-direction: column;
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