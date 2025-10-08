<template>
  <div class="project-management">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1>Quản lý dự án</h1>
        <p>Tổng cộng {{ totalProjects }} dự án</p>
      </div>
      <div class="header-right">
        <button class="btn btn-secondary" @click="refreshProjects">
          <i class="fas fa-sync-alt"></i>
          Làm mới
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-card">
      <div class="filters">
        <div class="filter-group">
          <label>Trạng thái</label>
          <select v-model="filters.status" @change="applyFilters">
            <option value="">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="completed">Hoàn thành</option>
            <option value="archived">Lưu trữ</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Chủ sở hữu</label>
          <select v-model="filters.owner" @change="applyFilters">
            <option value="">Tất cả chủ sở hữu</option>
            <option v-for="owner in owners" :key="owner.id" :value="owner.id">
              {{ owner.name }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label>Tìm kiếm</label>
          <input 
            type="text" 
            v-model="filters.search" 
            @input="applyFilters"
            placeholder="Tìm theo tên dự án..."
            class="search-input"
          >
        </div>
        <button class="btn btn-secondary" @click="resetFilters">
          <i class="fas fa-times"></i>
          Xóa bộ lọc
        </button>
      </div>
    </div>

    <!-- Projects Table -->
    <div class="table-card">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" v-model="selectAll" @change="toggleSelectAll">
              </th>
              <th>Dự án</th>
              <th>Chủ sở hữu</th>
              <th>Thành viên</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Cập nhật cuối</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="project in filteredProjects" :key="project.id" :class="{ selected: selectedProjects.includes(project.id) }">
              <td>
                <input type="checkbox" v-model="selectedProjects" :value="project.id">
              </td>
              <td>
                <div class="project-cell">
                  <div class="project-info">
                    <h3 class="project-name">{{ project.name }}</h3>
                    <p class="project-description">{{ project.description }}</p>
                    <div class="project-meta">
                      <span class="project-language">{{ project.language }}</span>
                      <span class="project-version">v{{ project.version }}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <div class="owner-cell">
                  <div class="owner-avatar">{{ project.owner.name.charAt(0) }}</div>
                  <div class="owner-info">
                    <span class="owner-name">{{ project.owner.name }}</span>
                    <span class="owner-email">{{ project.owner.email }}</span>
                  </div>
                </div>
              </td>
              <td>
                <div class="members-cell">
                  <div class="members-count">
                    <i class="fas fa-users"></i>
                    {{ project.members.length }} thành viên
                  </div>
                  <div class="members-preview">
                    <div 
                      v-for="member in project.members.slice(0, 3)" 
                      :key="member.id"
                      class="member-avatar"
                      :title="member.name"
                    >
                      {{ member.name.charAt(0) }}
                    </div>
                    <div v-if="project.members.length > 3" class="more-members">
                      +{{ project.members.length - 3 }}
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <span class="status-badge" :class="getStatusClass(project.status)">
                  {{ getStatusText(project.status) }}
                </span>
              </td>
              <td>{{ formatDate(project.createdAt) }}</td>
              <td>{{ formatDate(project.updatedAt) }}</td>
              <td>
                <div class="action-buttons">
                  <button class="action-btn blue" @click="viewProject(project)" title="Xem chi tiết">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button class="action-btn orange" @click="viewProjectFiles(project)" title="Xem files">
                    <i class="fas fa-folder"></i>
                  </button>
                  <button class="action-btn red" @click="deleteProject(project)" title="Xóa">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination">
        <div class="pagination-info">
          Hiển thị {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, totalProjects) }} 
          trong tổng số {{ totalProjects }} dự án
        </div>
        <div class="pagination-controls">
          <button 
            class="btn btn-secondary" 
            @click="previousPage" 
            :disabled="currentPage === 1"
          >
            <i class="fas fa-chevron-left"></i>
          </button>
          <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
          <button 
            class="btn btn-secondary" 
            @click="nextPage" 
            :disabled="currentPage === totalPages"
          >
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Actions -->
    <div v-if="selectedProjects.length > 0" class="bulk-actions">
      <div class="bulk-info">
        Đã chọn {{ selectedProjects.length }} dự án
      </div>
      <div class="bulk-buttons">
        <button class="btn btn-secondary" @click="bulkArchive">
          <i class="fas fa-archive"></i>
          Lưu trữ
        </button>
        <button class="btn btn-danger" @click="bulkDelete">
          <i class="fas fa-trash"></i>
          Xóa
        </button>
      </div>
    </div>

    <!-- Project Detail Modal -->
    <div v-if="showProjectDetailModal" class="modal-overlay" @click.self="showProjectDetailModal = false">
      <div class="modal-content large">
        <div class="modal-header">
          <h2>Chi tiết dự án</h2>
          <button class="close-btn" @click="showProjectDetailModal = false">&times;</button>
        </div>
        <div class="modal-body" v-if="selectedProject">
          <div class="project-detail-grid">
            <div class="detail-section">
              <h3>Thông tin cơ bản</h3>
              <div class="detail-item">
                <label>Tên dự án:</label>
                <span>{{ selectedProject.name }}</span>
              </div>
              <div class="detail-item">
                <label>Mô tả:</label>
                <span>{{ selectedProject.description }}</span>
              </div>
              <div class="detail-item">
                <label>Ngôn ngữ:</label>
                <span>{{ selectedProject.language }}</span>
              </div>
              <div class="detail-item">
                <label>Phiên bản:</label>
                <span>v{{ selectedProject.version }}</span>
              </div>
              <div class="detail-item">
                <label>Trạng thái:</label>
                <span class="status-badge" :class="getStatusClass(selectedProject.status)">
                  {{ getStatusText(selectedProject.status) }}
                </span>
              </div>
            </div>
            <div class="detail-section">
              <h3>Thông tin hệ thống</h3>
              <div class="detail-item">
                <label>ID:</label>
                <span>{{ selectedProject.id }}</span>
              </div>
              <div class="detail-item">
                <label>Chủ sở hữu:</label>
                <span>{{ selectedProject.owner.name }} ({{ selectedProject.owner.email }})</span>
              </div>
              <div class="detail-item">
                <label>Ngày tạo:</label>
                <span>{{ formatDate(selectedProject.createdAt) }}</span>
              </div>
              <div class="detail-item">
                <label>Cập nhật cuối:</label>
                <span>{{ formatDate(selectedProject.updatedAt) }}</span>
              </div>
              <div class="detail-item">
                <label>Số thành viên:</label>
                <span>{{ selectedProject.members.length }}</span>
              </div>
            </div>
          </div>
          
          <!-- Members List -->
          <div class="members-section">
            <h3>Danh sách thành viên</h3>
            <div class="members-list">
              <div 
                v-for="member in selectedProject.members" 
                :key="member.id"
                class="member-item"
              >
                <div class="member-avatar">{{ member.name.charAt(0) }}</div>
                <div class="member-info">
                  <span class="member-name">{{ member.name }}</span>
                  <span class="member-email">{{ member.email }}</span>
                </div>
                <span class="member-role">{{ member.role }}</span>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showProjectDetailModal = false">Đóng</button>
            <button class="btn btn-primary" @click="viewProjectFiles(selectedProject)">Xem Files</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
// NOTE: Projects APIs cần từ BE:
// GET /api/admin/projects, GET /api/admin/projects/:id, DELETE /api/admin/projects/:id
// (có thể thêm bulk-action nếu cần)
import { getProjects, deleteProject as apiDeleteProject } from '@/api/admin'

// State
const showProjectDetailModal = ref(false)
const selectedProject = ref(null)
const selectedProjects = ref([])
const selectAll = ref(false)
const currentPage = ref(1)
const itemsPerPage = ref(10)

const filters = ref({
  status: '',
  owner: '',
  search: ''
})

const projects = ref([])

const owners = ref([]) // sẽ fill từ API nếu có endpoint owners

// Computed
const totalProjects = computed(() => projects.value.length)

const filteredProjects = computed(() => {
  let result = projects.value

  if (filters.value.status) {
    result = result.filter(project => project.status === filters.value.status)
  }

  if (filters.value.owner) {
    result = result.filter(project => project.owner.id === parseInt(filters.value.owner))
  }

  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    result = result.filter(project => 
      project.name.toLowerCase().includes(search) ||
      project.description.toLowerCase().includes(search)
    )
  }

  return result
})

const totalPages = computed(() => Math.ceil(filteredProjects.value.length / itemsPerPage.value))

// Methods
const applyFilters = () => {
  currentPage.value = 1
}

const resetFilters = () => {
  filters.value = {
    status: '',
    owner: '',
    search: ''
  }
  currentPage.value = 1
}

const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedProjects.value = filteredProjects.value.map(project => project.id)
  } else {
    selectedProjects.value = []
  }
}

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const getStatusClass = (status) => {
  const classes = {
    'active': 'status-active',
    'completed': 'status-completed',
    'archived': 'status-archived'
  }
  return classes[status] || 'status-default'
}

const getStatusText = (status) => {
  const texts = {
    'active': 'Hoạt động',
    'completed': 'Hoàn thành',
    'archived': 'Lưu trữ'
  }
  return texts[status] || status
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('vi-VN')
}

const viewProject = (project) => {
  selectedProject.value = project
  showProjectDetailModal.value = true
}

const viewProjectFiles = (project) => {
  // TODO: Navigate to project files page
  console.log('View project files:', project)
}

const deleteProject = async (project) => {
  if (!confirm(`Bạn có chắc chắn muốn xóa dự án "${project.name}"?`)) return
  // NOTE: DELETE /api/admin/projects/:id
  try { await apiDeleteProject(project.id); await loadProjects() } catch (e) {}
}

const refreshProjects = async () => { await loadProjects() }

const bulkArchive = () => { /* NOTE: Chưa có API bulk archive. Dự kiến: POST /api/admin/projects/bulk-action { action: 'archive' } */ }

const bulkDelete = async () => {
  if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedProjects.value.length} dự án đã chọn?`)) return
  // NOTE: Chưa có API bulk delete. Dự kiến: POST /api/admin/projects/bulk-action { action: 'delete' }
}

const loadProjects = async () => {
  // NOTE: GET /api/admin/projects?status=&owner=&q=&page=&size=
  try {
    const res = await getProjects({
      status: filters.value.status || undefined,
      owner: filters.value.owner || undefined,
      q: filters.value.search || undefined,
      page: currentPage.value,
      size: itemsPerPage.value,
    })
    // Kỳ vọng schema: { items: [], total: number }
    projects.value = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : [])
  } catch (e) {
    projects.value = []
  }
}

onMounted(() => { loadProjects() })
</script>

<style scoped>
.project-management {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.header-left h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.header-left p {
  color: #64748b;
  margin: 0;
}

/* Filters */
.filters-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.filters {
  display: flex;
  gap: 20px;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 150px;
}

.filter-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.filter-group select,
.search-input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  transition: all 0.2s;
}

.filter-group select:focus,
.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-input {
  min-width: 250px;
}

/* Table */
.table-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: #f8fafc;
}

.data-table th {
  padding: 16px 20px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #e2e8f0;
}

.data-table td {
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 14px;
  color: #374151;
}

.data-table tr:hover {
  background: #f8fafc;
}

.data-table tr.selected {
  background: #dbeafe;
}

/* Project Cell */
.project-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-info {
  flex: 1;
}

.project-name {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.project-description {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.project-meta {
  display: flex;
  gap: 12px;
}

.project-language,
.project-version {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  background: #f1f5f9;
  color: #64748b;
}

/* Owner Cell */
.owner-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.owner-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.owner-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.owner-name {
  font-weight: 500;
  color: #1e293b;
  font-size: 14px;
}

.owner-email {
  font-size: 12px;
  color: #64748b;
}

/* Members Cell */
.members-cell {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.members-count {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
}

.members-preview {
  display: flex;
  gap: 4px;
}

.member-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #6b7280;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
}

.more-members {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
}

/* Status Badge */
.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-active {
  background: #dcfce7;
  color: #166534;
}

.status-completed {
  background: #dbeafe;
  color: #1e40af;
}

.status-archived {
  background: #f3f4f6;
  color: #374151;
}

.status-default {
  background: #fef3c7;
  color: #92400e;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 14px;
}

.action-btn.blue {
  background: #dbeafe;
  color: #1e40af;
}

.action-btn.blue:hover {
  background: #3b82f6;
  color: white;
}

.action-btn.orange {
  background: #fed7aa;
  color: #9a3412;
}

.action-btn.orange:hover {
  background: #ea580c;
  color: white;
}

.action-btn.red {
  background: #fee2e2;
  color: #991b1b;
}

.action-btn.red:hover {
  background: #ef4444;
  color: white;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-top: 1px solid #e2e8f0;
}

.pagination-info {
  color: #64748b;
  font-size: 14px;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-info {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

/* Bulk Actions */
.bulk-actions {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 16px 24px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 20px;
  z-index: 1000;
}

.bulk-info {
  color: #374151;
  font-weight: 500;
}

.bulk-buttons {
  display: flex;
  gap: 8px;
}

/* Buttons */
.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #f1f5f9;
  color: #374151;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.large {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #374151;
}

.modal-body {
  padding: 24px;
}

/* Project Detail */
.project-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.detail-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item label {
  font-weight: 500;
  color: #64748b;
}

.detail-item span {
  color: #1e293b;
}

/* Members Section */
.members-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

.members-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.member-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.member-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.member-name {
  font-weight: 500;
  color: #1e293b;
  font-size: 14px;
}

.member-email {
  font-size: 12px;
  color: #64748b;
}

.member-role {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  background: #dbeafe;
  color: #1e40af;
  font-weight: 500;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #e2e8f0;
}

/* Responsive */
@media (max-width: 768px) {
  .filters {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-group {
    min-width: auto;
  }
  
  .search-input {
    min-width: auto;
  }
  
  .project-detail-grid {
    grid-template-columns: 1fr;
  }
  
  .bulk-actions {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
