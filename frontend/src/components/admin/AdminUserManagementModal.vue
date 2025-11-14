<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content extra-large">
      <div class="modal-header">
        <h3><span class="material-symbols-outlined">group</span> Quản lý người dùng</h3>
        <div class="header-actions">
          <div class="search-box">
            <span class="material-symbols-outlined">search</span>
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Tìm kiếm người dùng..."
              class="search-input"
            />
          </div>
          <button class="btn btn-primary" @click="showAddUserModal = true">
            <span class="material-symbols-outlined">person_add</span>
            Thêm người dùng
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
            <label>Vai trò:</label>
            <select v-model="filters.role" class="filter-select">
              <option value="all">Tất cả</option>
              <option value="ADMIN">Quản trị viên</option>
              <option value="PARTICIPANT">Thành viên</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Trạng thái:</label>
            <select v-model="filters.status" class="filter-select">
              <option value="all">Tất cả</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Ngừng hoạt động</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Sắp xếp:</label>
            <select v-model="filters.sortBy" class="filter-select">
              <option value="created_at">Ngày tạo</option>
              <option value="name">Tên</option>
              <option value="last_login">Đăng nhập cuối</option>
            </select>
          </div>
          <button class="btn btn-secondary" @click="resetFilters">
            <span class="material-symbols-outlined">refresh</span>
            Đặt lại
          </button>
        </div>

        <!-- Users Table -->
        <div class="table-container">
          <table class="users-table">
            <thead>
              <tr>
                <th>
                  <label class="checkbox-label">
                    <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
                    <span class="checkmark"></span>
                  </label>
                </th>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Dự án</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="user in paginatedUsers"
                :key="user.id"
                :class="{ selected: selectedUsers.includes(user.id) }"
              >
                <td>
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      :checked="selectedUsers.includes(user.id)"
                      @change="toggleUserSelection(user.id)"
                    />
                    <span class="checkmark"></span>
                  </label>
                </td>
                <td>
                  <div class="user-info">
                    <div class="user-avatar">
                      <img
                        :src="user.avatar_url"
                      />
                    </div>
                    <div class="user-details">
                      <div class="user-name">{{ user.name }}</div>
                      <div class="user-email">{{ user.email }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="role-badge" :class="user.system_role.toLowerCase()">
                    {{ getRoleDisplay(user.system_role) }}
                  </span>
                </td>
                <td>
                  <span class="status-badge" :class="user.status.toLowerCase()">
                    {{ getStatusDisplay(user.status) }}
                  </span>
                </td>
                <td>
                  <div class="project-count">
                    <span class="count">{{ user.project_count || 0 }}</span>
                    <span class="label">dự án</span>
                  </div>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon" @click="editUser(user)" title="Chỉnh sửa">
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="btn-icon" @click="viewUserDetails(user)" title="Xem chi tiết">
                      <span class="material-symbols-outlined">visibility</span>
                    </button>
                    <button class="btn-icon danger" @click="deleteUser(user)" title="Xóa">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div v-if="filteredUsers.length === 0" class="empty-state">
            <span class="material-symbols-outlined">group_off</span>
            <h4>Không tìm thấy người dùng</h4>
            <p>Không có người dùng nào phù hợp với tiêu chí tìm kiếm của bạn.</p>
            <button class="btn btn-primary" @click="resetFilters">
              <span class="material-symbols-outlined">refresh</span>
              Đặt lại bộ lọc
            </button>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="filteredUsers.length > 0" class="pagination-section">
          <div class="pagination-info">
            Hiển thị {{ pagination.start }}-{{ pagination.end }} của
            {{ filteredUsers.length }} người dùng
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
              <option value="100">100</option>
            </select>
          </div>
        </div>

        <!-- Bulk Actions -->
        <div v-if="selectedUsers.length > 0" class="bulk-actions">
          <div class="bulk-info">Đã chọn {{ selectedUsers.length }} người dùng</div>
          <div class="bulk-buttons">
            <select v-model="bulkAction" class="bulk-select">
              <option value="">Thao tác hàng loạt</option>
              <option value="activate">Kích hoạt</option>
              <option value="deactivate">Vô hiệu hóa</option>
              <option value="delete">Xóa</option>
              <option value="export">Xuất dữ liệu</option>
            </select>
            <button class="btn btn-primary" @click="executeBulkAction" :disabled="!bulkAction">
              Áp dụng
            </button>
            <button class="btn btn-secondary" @click="clearSelection">Bỏ chọn</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add User Modal -->
    <AdminAddUserModal
      v-if="showAddUserModal"
      @add="handleAddUser"
      @close="showAddUserModal = false"
    />

    <!-- Edit User Modal -->
    <AdminEditUserModal
      v-if="showEditUserModal"
      :user="editingUser"
      @save="handleUpdateUser"
      @close="showEditUserModal = false"
    />

    <!-- User Details Modal -->
    <AdminUserDetailsModal
      v-if="showUserDetailsModal"
      :user="selectedUser"
      @close="showUserDetailsModal = false"
    />

    <!-- Delete Confirmation Modal -->
    <AdminConfirmModal
      v-if="showDeleteModal"
      title="Xóa người dùng"
      :message="`Bạn có chắc chắn muốn xóa người dùng ${deletingUser?.name}? Hành động này không thể hoàn tác.`"
      confirm-text="Xóa"
      cancel-text="Hủy"
      type="danger"
      @confirm="confirmDeleteUser"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue' // Đã thêm watch vào import
import AdminAddUserModal from './AdminAddUserModal.vue'
import AdminEditUserModal from './AdminEditUserModal.vue'
import AdminUserDetailsModal from './AdminUserDetailsModal.vue'
import AdminConfirmModal from './AdminConfirmModal.vue'
import axiosClient from '@/utils/axiosClient'
import { useToast } from 'vue-toastification'
const toast = useToast()
const emit = defineEmits(['close'])

// Modal states
const showAddUserModal = ref(false)
const showEditUserModal = ref(false)
const showUserDetailsModal = ref(false)
const showDeleteModal = ref(false)

// Data
const users = ref([])
const selectedUsers = ref([])
const editingUser = ref(null)
const selectedUser = ref(null)
const deletingUser = ref(null)
const bulkAction = ref('')

const searchQuery = ref('')
const filters = reactive({
  role: 'all',
  status: 'all',
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

// Sample data - in real app, this would come from API


// Computed
const filteredUsers = computed(() => {
  let filtered = users.value.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesRole = filters.role === 'all' || user.system_role === filters.role
    const matchesStatus = filters.status === 'all' || user.status === filters.status

    return matchesSearch && matchesRole && matchesStatus
  })

  // Sort
  filtered.sort((a, b) => {
    switch (filters.sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'last_login':
        return new Date(b.last_login) - new Date(a.last_login)
      default:
        return new Date(b.created_at) - new Date(a.created_at)
    }
  })

  return filtered
})

const paginatedUsers = computed(() => {
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  pagination.start = start + 1
  pagination.end = Math.min(end, filteredUsers.value.length)
  return filteredUsers.value.slice(start, end)
})

const isAllSelected = computed(() => {
  return (
    selectedUsers.value.length > 0 && selectedUsers.value.length === paginatedUsers.value.length
  )
})

// Methods
const loadUsers = async () => {
  try {
    const res = await axiosClient.get('/api/users')
    if (res.data && res.data.status === 'Success') {
      const BASE_URL = 'http://localhost:8000' // 👈 Thay bằng domain backend của bạn
      console.log('🔥 Response gốc:', res)
      users.value = res.data.data.map((u) => ({
        id: u.id,
        name: u.name || 'Không rõ',
        email: u.email || '',
        
        // ✅ Nếu link chưa có http thì tự thêm domain backend
        avatar_url: u.avatar_url
          ? u.avatar_url.startsWith('http')
            ? u.avatar_url
            : `${BASE_URL}${u.avatar_url}`
          : 'https://static.vecteezy.com/system/resources/previews/024/983/914/original/simple-user-default-icon-free-png.png',
        system_role: u.system_role,
        status: u.status,
        project_count: u.project_count || 0,
        phone: u.phone || '',
        bio: u.bio || '',
      }))
      updatePagination()
      console.log('✅ Users loaded:', users.value)
    } else {
      toast.error('Không thể tải danh sách người dùng')
      console.warn('❌ Lỗi response:', res.data)
    }
  } catch (error) {
    toast.error('Lỗi khi tải người dùng')
    console.error('❌ loadUsers error:', error)
  }
}


const updatePagination = () => {
  pagination.totalPages = Math.ceil(filteredUsers.value.length / pagination.pageSize)
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

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedUsers.value = []
  } else {
    selectedUsers.value = paginatedUsers.value.map((user) => user.id)
  }
}

const toggleUserSelection = (userId) => {
  const index = selectedUsers.value.indexOf(userId)
  if (index > -1) {
    selectedUsers.value.splice(index, 1)
  } else {
    selectedUsers.value.push(userId)
  }
}

const clearSelection = () => {
  selectedUsers.value = []
}

const editUser = (user) => {
  editingUser.value = { ...user }
  showEditUserModal.value = true
}

const viewUserDetails = async (user) => {
  try {
    const res = await axiosClient.get(`/api/users/${user.id}`)
    if (res.data && res.data.status === 'Success') {
      selectedUser.value = res.data.data
      showUserDetailsModal.value = true
    } else {
      toast.error('Không thể tải chi tiết người dùng')
    }
  } catch (error) {
    console.error('❌ Lỗi khi xem chi tiết:', error)
    toast.error('Lỗi khi tải chi tiết người dùng')
  }
}


const deleteUser = (user) => {
  deletingUser.value = user
  showDeleteModal.value = true
}

const confirmDeleteUser = async () => {
  if (!deletingUser.value) return
  try {
    const res = await axiosClient.delete(`/api/users/${deletingUser.value.id}`)
    if (res.data && res.data.status === 'Success') {
      users.value = users.value.filter((u) => u.id !== deletingUser.value.id)
      toast.success('Đã xóa người dùng thành công')
    } else {
      toast.error('Không thể xóa người dùng')
      console.error('❌ Response:', res.data)
    }
  } catch (error) {
    console.error('❌ Lỗi khi xóa người dùng:', error)
    toast.error('Lỗi khi xóa người dùng')
  } finally {
    showDeleteModal.value = false
    deletingUser.value = null
  }
}

const handleAddUser = (userData) => {
  const newUser = {
    id: Date.now().toString(),
    ...userData,
    project_count: 0,
    last_login: null,
    created_at: new Date(),
    status: 'ACTIVE',
  }
  users.value.unshift(newUser)
  showAddUserModal.value = false
  updatePagination()
}

const handleUpdateUser = (userData) => {
  const index = users.value.findIndex((u) => u.id === userData.id)
  if (index > -1) {
    users.value[index] = { ...users.value[index], ...userData }
  }
  showEditUserModal.value = false
}

const executeBulkAction = async () => {
  if (!bulkAction.value) return

  switch (bulkAction.value) {
    case 'activate':
      users.value.forEach((user) => {
        if (selectedUsers.value.includes(user.id)) {
          user.status = 'ACTIVE'
        }
      })
      break
    case 'deactivate':
      users.value.forEach((user) => {
        if (selectedUsers.value.includes(user.id)) {
          user.status = 'INACTIVE'
        }
      })
      break
    case 'delete':
      users.value = users.value.filter((user) => !selectedUsers.value.includes(user.id))
      break
    case 'export':
      exportUsersData()
      break
  }

  clearSelection()
  bulkAction.value = ''
}

const exportUsersData = () => {
  const selectedUsersData = users.value.filter((user) => selectedUsers.value.includes(user.id))
  console.log('Exporting users:', selectedUsersData)
  // Implement export logic
}

const resetFilters = () => {
  searchQuery.value = ''
  filters.role = 'all'
  filters.status = 'all'
  filters.sortBy = 'created_at'
  pagination.currentPage = 1
}

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



// Watchers - ĐÃ SỬA LỖI: Đã import watch
watch([() => filters.role, () => filters.status, () => filters.sortBy, searchQuery], () => {
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

watch(filteredUsers, updatePagination)

onMounted(() => {
  loadUsers()
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
  max-width: 1200px;
  width: 95%;
  max-height: 90vh;
  background: white;
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

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.users-table th {
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

.users-table td {
  padding: 16px;
  border-bottom: 1px solid #f7fafc;
  vertical-align: middle;
}

.users-table tr:hover {
  background: #f7fafc;
}

.users-table tr.selected {
  background: #ebf8ff;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  display: none;
}

.checkmark {
  width: 18px;
  height: 18px;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.checkbox-label input[type='checkbox']:checked + .checkmark {
  background: #1a365d;
  border-color: #1a365d;
}

.checkbox-label input[type='checkbox']:checked + .checkmark::after {
  content: '✓';
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #e2e8f0;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 600;
  color: #1a365d;
  margin-bottom: 2px;
}

.user-email {
  font-size: 12px;
  color: #718096;
}

.role-badge {
  padding: 4px 8px;
  border-radius: 12px;
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
  padding: 4px 8px;
  border-radius: 12px;
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

.project-count {
  display: flex;
  align-items: center;
  gap: 4px;
}

.count {
  font-weight: 600;
  color: #1a365d;
}

.label {
  font-size: 12px;
  color: #718096;
}

.last-login,
.created-date {
  font-size: 13px;
  color: #718096;
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

.bulk-actions {
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  background: #ebf8ff;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bulk-info {
  font-size: 14px;
  color: #2b6cb0;
  font-weight: 500;
}

.bulk-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.bulk-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  min-width: 160px;
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

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #1a365d;
  color: white;
}

.btn-primary:hover:not(:disabled) {
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

  .users-table {
    font-size: 12px;
  }

  .users-table th,
  .users-table td {
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

  .bulk-actions {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .bulk-buttons {
    justify-content: space-between;
  }
}
</style>