<template>
  <div class="user-management">
    <!-- Debug Panel -->
    <DebugPanel />

    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1>Quản lý người dùng</h1>
        <p>Tổng cộng {{ totalUsers }} người dùng</p>
      </div>
      <!-- <div class="header-right">
        <button class="btn btn-primary" @click="showAddUserModal = true">
          <i class="fas fa-plus"></i>
          Thêm người dùng
        </button>
      </div> -->
    </div>

    <!-- Filters -->
    <div class="filters-card">
      <div class="filters">
        <div class="filter-group">
          <label>Vai trò</label>
          <select v-model="filters.role" @change="applyFilters">
            <option value="">Tất cả vai trò</option>
            <option value="ADMIN">Admin</option>
            <option value="PARTICIPANT">Participant</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Trạng thái</label>
          <select v-model="filters.status" @change="applyFilters">
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Không hoạt động</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Tìm kiếm</label>
          <input
            type="text"
            v-model="filters.search"
            @input="debouncedSearch"
            placeholder="Tìm theo tên, email..."
            class="search-input"
          />
        </div>
        <button class="btn btn-secondary" @click="resetFilters">
          <span class="material-symbols-outlined"> filter_list_off </span>
          Xóa bộ lọc
        </button>
      </div>
    </div>

    <!-- Users Table -->
    <div class="table-card">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
              </th>
              <th>Người dùng</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Hoạt động cuối</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in filteredUsers"
              :key="user.id"
              :class="{ selected: selectedUsers.includes(user.id) }"
            >
              <td>
                <input type="checkbox" v-model="selectedUsers" :value="user.id" />
              </td>
              <td>
                <div class="user-cell">
                  <div class="user-avatar">{{ user.name.charAt(0) }}</div>
                  <div class="user-info">
                    <span class="user-name">{{ user.name }}</span>
                    <span class="user-id">ID: {{ user.id }}</span>
                  </div>
                </div>
              </td>
              <td>
                <span class="email">{{ user.email }}</span>
              </td>
              <td>
                <span class="badge" :class="getRoleClass(user.role)">
                  {{ user.role }}
                </span>
              </td>
              <td>
                <div class="status-cell">
                  <span
                    class="status-dot"
                    :class="user.active ? 'active' : 'inactive'"
                  ></span>
                  <span>{{ user.active ? "Hoạt động" : "Không hoạt động" }}</span>
                </div>
              </td>
              <td>{{ formatDate(user.createdAt) || 'Chưa cập nhật' }}</td>
              <td>{{ formatDate(user.lastActive) || 'Chưa cập nhật' }}</td>
              <td>
                <div class="action-buttons">
                  <button
                    class="action-btn blue"
                    @click="viewUser(user)"
                    title="Xem chi tiết"
                  >
                    <i class="fas fa-eye"></i>
                  </button>
                  <button
                    class="action-btn green"
                    @click="editUser(user)"
                    title="Chỉnh sửa"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    class="action-btn orange"
                    @click="resetPassword(user)"
                    title="Đặt lại mật khẩu"
                  >
                    <span class="material-symbols-outlined"> lock_reset </span>
                  </button>
                  <button class="action-btn red" @click="deleteUser(user)" title="Xóa">
                    <span class="material-symbols-outlined"> delete_forever </span>
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
          Hiển thị {{ (currentPage - 1) * itemsPerPage + 1 }} -
          {{ Math.min(currentPage * itemsPerPage, totalUsers) }} trong tổng số
          {{ totalUsers }} người dùng
        </div>
        <div class="pagination-controls">
          <button
            class="btn btn-secondary"
            @click="previousPage"
            :disabled="currentPage === 1"
          >
            <span class="material-symbols-outlined"> arrow_back_ios </span>
          </button>
          <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
          <button
            class="btn btn-secondary"
            @click="nextPage"
            :disabled="currentPage === totalPages"
          >
            <span class="material-symbols-outlined"> arrow_forward_ios </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Actions -->
    <div v-if="selectedUsers.length > 0" class="bulk-actions">
      <div class="bulk-info">Đã chọn {{ selectedUsers.length }} người dùng</div>
      <div class="bulk-buttons">
        <button class="btn btn-secondary" @click="bulkActivate">
          <i class="fas fa-check"></i>
          Kích hoạt
        </button>
        <button class="btn btn-secondary" @click="bulkDeactivate">
          <i class="fas fa-times"></i>
          Vô hiệu hóa
        </button>
        <button class="btn btn-danger" @click="bulkDelete">
          <i class="fas fa-trash"></i>
          Xóa
        </button>
      </div>
    </div>

    <!-- Add User Modal -->
    <div
      v-if="showAddUserModal"
      class="modal-overlay"
      @click.self="showAddUserModal = false"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h2>Thêm người dùng mới</h2>
          <button class="close-btn" @click="showAddUserModal = false">&times;</button>
        </div>
        <form @submit.prevent="addUser" class="modal-body">
          <div class="form-group">
            <label>Họ tên *</label>
            <input type="text" v-model="newUser.name" required class="form-input" />
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input type="email" v-model="newUser.email" required class="form-input" />
          </div>
          <div class="form-group">
            <label>Mật khẩu *</label>
            <input
              type="password"
              v-model="newUser.password"
              required
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>Vai trò *</label>
            <select v-model="newUser.role" required class="form-input">
              <option value="">Chọn vai trò</option>
              <option value="ADMIN">Admin</option>
              <option value="PARTICIPANT">Participant</option>
            </select>
          </div>
          <div class="form-group">
            <label>Trạng thái</label>
            <select v-model="newUser.active" class="form-input">
              <option :value="true">Hoạt động</option>
              <option :value="false">Không hoạt động</option>
            </select>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="showAddUserModal = false"
            >
              Hủy
            </button>
            <!-- <button type="submit" class="btn btn-primary">Thêm người dùng</button> -->
          </div>
        </form>
      </div>
    </div>
    <!-- Edit User Modal -->
    <div
      v-if="showEditUserModal"
      class="modal-overlay"
      @click.self="showEditUserModal = false"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h2>Chỉnh sửa người dùng</h2>
          <button class="close-btn" @click="showEditUserModal = false">&times;</button>
        </div>
        <form @submit.prevent="submitEditUser" class="modal-body">
          <div class="form-group">
            <label>Họ tên *</label>
            <input type="text" v-model="editUserForm.name" required class="form-input" />
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input
              type="email"
              v-model="editUserForm.email"
              required
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>Vai trò *</label>
            <select v-model="editUserForm.role" required class="form-input">
              <option value="ADMIN">Admin</option>
              <option value="PARTICIPANT">Participant</option>
            </select>
          </div>
          <div class="form-group">
            <label>Trạng thái</label>
            <select v-model="editUserForm.active" class="form-input">
              <option :value="true">Hoạt động</option>
              <option :value="false">Không hoạt động</option>
            </select>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="showEditUserModal = false"
            >
              Hủy
            </button>
            <button type="submit" class="btn btn-primary">Lưu thay đổi</button>
          </div>
        </form>
      </div>
    </div>

    <!-- User Detail Modal -->
    <div
      v-if="showUserDetailModal"
      class="modal-overlay"
      @click.self="showUserDetailModal = false"
    >
      <div class="modal-content large">
        <div class="modal-header">
          <h2>Chi tiết người dùng</h2>
          <button class="close-btn" @click="showUserDetailModal = false">&times;</button>
        </div>
        <div class="modal-body" v-if="selectedUser">
          <div class="user-detail-grid">
            <div class="detail-section">
              <h3>Thông tin cơ bản</h3>
              <div class="detail-item">
                <label>Tên:</label>
                <span>{{ selectedUser.name }}</span>
              </div>
              <div class="detail-item">
                <label>Email:</label>
                <span>{{ selectedUser.email }}</span>
              </div>
              <div class="detail-item">
                <label>Vai trò:</label>
                <span class="badge" :class="getRoleClass(selectedUser.role)">{{
                  selectedUser.role
                }}</span>
              </div>
              <div class="detail-item">
                <label>Trạng thái:</label>
                <span
                  class="status-dot"
                  :class="selectedUser.active ? 'active' : 'inactive'"
                ></span>
                <span>{{ selectedUser.active ? "Hoạt động" : "Không hoạt động" }}</span>
              </div>
            </div>
            <div class="detail-section">
              <h3>Thông tin hệ thống</h3>
              <div class="detail-item">
                <label>ID:</label>
                <span>{{ selectedUser.id }}</span>
              </div>
              <div class="detail-item">
                <label>Ngày tạo:</label>
                <span>{{ formatDate(selectedUser.createdAt) || 'Chưa cập nhật' }}</span>
              </div>
              <div class="detail-item">
                <label>Hoạt động cuối:</label>
                <span>{{ formatDate(selectedUser.lastActive) || 'Chưa cập nhật' }}</span>
              </div>
              <div class="detail-item">
                <label>Số dự án:</label>
                <span>{{ selectedUser.projectCount || 0 }}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showUserDetailModal = false">
              Đóng
            </button>
            <button class="btn btn-primary" @click="editUser(selectedUser)">
              Chỉnh sửa
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showResetPasswordModal"
      class="modal-overlay"
      @click.self="showResetPasswordModal = false"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h2>Đặt lại mật khẩu</h2>
          <button class="close-btn" @click="showResetPasswordModal = false">
            &times;
          </button>
        </div>
        <div class="modal-body" v-if="selectedUser">
          <div class="user-info-box">
            <div class="user-avatar">{{ selectedUser.name.charAt(0) }}</div>
            <div>
              <div class="user-name">{{ selectedUser.name }}</div>
              <div class="user-email">{{ selectedUser.email }}</div>
            </div>
          </div>

          <form @submit.prevent="submitResetPassword">
            <div class="form-group">
              <label>Mật khẩu cũ *</label>
              <input
                type="password"
                v-model="resetPasswordForm.oldPassword"
                required
                class="form-input"
                placeholder="Nhập mật khẩu cũ"
              />
            </div>
            <div class="form-group">
              <label>Mật khẩu mới *</label>
              <input
                type="password"
                v-model="resetPasswordForm.newPassword"
                required
                class="form-input"
                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                minlength="6"
              />
            </div>
            <div class="form-group">
              <label>Xác nhận mật khẩu mới *</label>
              <input
                type="password"
                v-model="resetPasswordForm.confirmPassword"
                required
                class="form-input"
                placeholder="Nhập lại mật khẩu mới"
                minlength="6"
              />
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                @click="showResetPasswordModal = false"
              >
                Hủy
              </button>
              <button type="submit" class="btn btn-primary">Đặt lại mật khẩu</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
// NOTE: User APIs cần từ BE:
// GET /api/admin/users, GET /api/admin/users/:id, POST /api/admin/users,
// PUT /api/admin/users/:id, DELETE /api/admin/users/:id,
// PATCH /api/admin/users/:id/status, POST /api/admin/users/:id/reset-password,
// POST /api/admin/users/bulk-action
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser as apiDeleteUser,
  resetUserPassword,
  toggleUserStatus,
  bulkUserAction,
  searchUsers,
  filterUsers,
} from "@/api/admin";
import DebugPanel from "@/components/DebugPanel.vue";

// State
const showAddUserModal = ref(false);
const showUserDetailModal = ref(false);
const selectedUser = ref(null);
const selectedUsers = ref([]);
const selectAll = ref(false);
const currentPage = ref(1);
const itemsPerPage = ref(10);
const showResetPasswordModal = ref(false);

const filters = ref({
  role: "",
  status: "",
  search: "",
});

const newUser = ref({
  name: "",
  email: "",
  password: "",
  role: "PARTICIPANT",
  active: true,
});

const resetPasswordForm = ref({
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
});
const showEditUserModal = ref(false);
const editUserForm = ref({
  id: "",
  name: "",
  email: "",
  role: "",
  active: true,
});

const users = ref([]);
const searchTimeout = ref(null);

// Computed
const totalUsers = computed(() => users.value.length);

const filteredUsers = computed(() => {
  // Bây giờ filtering được thực hiện ở backend, chỉ cần trả về users
  return users.value;
});

const totalPages = computed(() =>
  Math.ceil(filteredUsers.value.length / itemsPerPage.value)
);

// Methods
const debouncedSearch = () => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value);
  }
  searchTimeout.value = setTimeout(() => {
    applyFilters();
  }, 500); // 500ms delay
};

const applyFilters = async () => {
  currentPage.value = 1;
  await loadUsers();
};

const resetFilters = async () => {
  filters.value = {
    role: "",
    status: "",
    search: "",
  };
  currentPage.value = 1;
  await loadUsers();
};

const editUser = (user) => {
  editUserForm.value = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role, // Giữ nguyên để hiển thị trong form
    active: user.active, // Giữ nguyên để hiển thị trong form
  };
  showEditUserModal.value = true;
};

const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedUsers.value = filteredUsers.value.map((user) => user.id);
  } else {
    selectedUsers.value = [];
  }
};

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const getRoleClass = (role) => {
  return role === "ADMIN" ? "badge-blue" : "badge-green";
};

const formatDate = (dateString) => {
  // Xử lý trường hợp dateString là null, undefined, hoặc rỗng
  if (dateString === null || dateString === undefined || dateString === '') {
    return '';
  }

  try {
    const date = new Date(dateString);
    // Kiểm tra xem date có hợp lệ không
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString("vi-VN");
  } catch (error) {
    console.error('Error formatting date:', error, 'dateString:', dateString);
    return '';
  }
};

const viewUser = (user) => {
  selectedUser.value = user;
  showUserDetailModal.value = true;
};

// const editUser = async (user) => {
//   // NOTE: PUT /api/admin/users/:id
//   try {
//     await updateUser(user.id, {
//       name: user.name,
//       email: user.email,
//       role: user.role,
//       active: user.active,
//     });
//     await loadUsers();
//   } catch (e) {}
// };

const resetPassword = async (user) => {
  // Mở modal để nhập mật khẩu cũ và mới
  selectedUser.value = user;
  resetPasswordForm.value = {
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  };
  showResetPasswordModal.value = true;
};

const submitResetPassword = async () => {
  // Validate
  if (!resetPasswordForm.value.oldPassword || !resetPasswordForm.value.newPassword) {
    alert("Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới!");
    return;
  }

  if (resetPasswordForm.value.newPassword !== resetPasswordForm.value.confirmPassword) {
    alert("Mật khẩu mới và xác nhận mật khẩu không khớp!");
    return;
  }

  if (resetPasswordForm.value.newPassword.length < 6) {
    alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
    return;
  }

  if (!confirm(`Bạn có chắc chắn muốn đặt lại mật khẩu cho ${selectedUser.value.name}?`))
    return;

  try {
    // Gọi API với format đúng: { oldPassword, newPassword }
    await resetUserPassword(selectedUser.value.id, {
      oldPassword: resetPasswordForm.value.oldPassword,
      newPassword: resetPasswordForm.value.newPassword,
    });

    alert("Đặt lại mật khẩu thành công!");
    showResetPasswordModal.value = false;
    resetPasswordForm.value = {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    };
  } catch (e) {
    console.error("Error resetting password:", e);
    alert("Đặt lại mật khẩu thất bại: " + (e.response?.data?.message || e.message));
  }
};

const deleteUser = async (user) => {
  if (!confirm(`Bạn có chắc chắn muốn xóa người dùng ${user.name}?`)) return;
  try {
    // NOTE: DELETE /api/admin/users/:id
    await apiDeleteUser(user.id);
    await loadUsers();
  } catch (e) {}
};

const addUser = async () => {
  // NOTE: POST /api/admin/users
  try {
    await createUser(newUser.value);
    showAddUserModal.value = false;
    newUser.value = { name: "", email: "", password: "", role: "", active: true };
    await loadUsers();
  } catch (e) {}
};

const submitEditUser = async () => {
  try {
    // Chuẩn hóa dữ liệu theo định dạng Backend mong đợi
    // Chỉ gửi các field cần thiết và loại bỏ gender để tránh lỗi validation
    const updateData = {
      name: editUserForm.value.name,
      email: editUserForm.value.email,
      system_role: editUserForm.value.role, // Backend mong đợi system_role thay vì role
      status: editUserForm.value.active ? "ACTIVE" : "INACTIVE", // Backend mong đợi string thay vì boolean
      dob: {
        day: 1,
        month: 1,
        year: 2000
      }, // Thêm dob mặc định để tránh lỗi Backend parsing
      // Không gửi gender để tránh lỗi validation
      avatar_url: "" // Thêm avatar_url mặc định
    };

    // Đảm bảo không có field dob hoặc các field date khác gây lỗi
    console.log("Sending update data:", updateData);
    console.log("User ID:", editUserForm.value.id);
    console.log("Edit form data:", editUserForm.value);

    // Validate dữ liệu trước khi gửi
    if (!updateData.name || !updateData.email || !updateData.system_role) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc!");
      return;
    }

    await updateUser(editUserForm.value.id, updateData);
    alert("Cập nhật người dùng thành công!");
    showEditUserModal.value = false;
    await loadUsers();
  } catch (e) {
    console.error("Error updating user:", e);
    console.error("Error response:", e.response?.data);
    console.error("Error status:", e.response?.status);

    let errorMessage = "Cập nhật thất bại: ";
    if (e.response?.data?.message) {
      errorMessage += e.response.data.message;
    } else if (e.response?.status === 400) {
      errorMessage += "Dữ liệu gửi lên không đúng định dạng. Vui lòng thử lại.";
    } else if (e.response?.status === 500) {
      errorMessage += "Lỗi máy chủ. Vui lòng thử lại sau.";
    } else {
      errorMessage += e.message || "Lỗi không xác định";
    }

    alert(errorMessage);
  }
};

const bulkActivate = async () => {
  // NOTE: POST /api/admin/users/bulk-action { action: 'activate' }
  try {
    await bulkUserAction(selectedUsers.value, "activate");
    await loadUsers();
  } catch (e) {}
};

const bulkDeactivate = async () => {
  // NOTE: POST /api/admin/users/bulk-action { action: 'deactivate' }
  try {
    await bulkUserAction(selectedUsers.value, "deactivate");
    await loadUsers();
  } catch (e) {}
};

const bulkDelete = async () => {
  if (
    !confirm(
      `Bạn có chắc chắn muốn xóa ${selectedUsers.value.length} người dùng đã chọn?`
    )
  )
    return;
  // NOTE: POST /api/admin/users/bulk-action { action: 'delete' }
  try {
    await bulkUserAction(selectedUsers.value, "delete");
    await loadUsers();
  } catch (e) {}
};

const loadUsers = async () => {
  // NOTE: GET /api/users (admin only)
  try {
    console.log("Loading users...");
    console.log(
      "Token check:",
      localStorage.getItem("accessToken") ? "Present" : "Missing"
    );

    let res;

    // Ưu tiên search trước, sau đó mới filter
    if (filters.value.search && filters.value.search.trim() !== "") {
      console.log("Using search API for:", filters.value.search);
      res = await searchUsers(filters.value.search);
    }
    // Nếu có filter criteria, sử dụng filter API
    else if (filters.value.role || filters.value.status) {
      console.log("Using filter API for:", {
        role: filters.value.role,
        status: filters.value.status,
      });

      // Chỉ gửi filter nếu có ít nhất một giá trị không rỗng
      const filterData = {};
      if (filters.value.role && filters.value.role.trim() !== "") {
        filterData.system_role = filters.value.role;
      }
      if (filters.value.status && filters.value.status.trim() !== "") {
        filterData.status = filters.value.status;
      }

      // Chỉ gọi filter API nếu có ít nhất một filter
      if (Object.keys(filterData).length > 0) {
        res = await filterUsers(filterData);
      } else {
        // Nếu không có filter nào, lấy tất cả users
        res = await getUsers();
      }
    }
    // Nếu không có filter, lấy tất cả users
    else {
      console.log("Using getAllUsers API");
      res = await getUsers();
    }

    console.log("API Response:", res); // Debug log

    // BE trả về format: { status: "Success", message: "...", data: [...] }
    let items = [];
    if (res?.data?.data && Array.isArray(res.data.data)) {
      items = res.data.data;
      console.log("Found data in res.data.data:", items.length, "users");
    } else if (res?.data && Array.isArray(res.data)) {
      items = res.data;
      console.log("Found data in res.data:", items.length, "users");
    } else if (Array.isArray(res)) {
      items = res;
      console.log("Found data in res:", items.length, "users");
    } else {
      console.warn("No data found in response:", res);
    }

    console.log("Parsed items:", items); // Debug log

    // Chuẩn hóa field theo BE: system_role/status -> role/active
    // Xử lý trường hợp Backend không trả về created_at và updated_at
    users.value = items.map((u) => ({
      id: u.id || u._id || u.user_id,
      name: u.name || u.full_name || u.username || "",
      email: u.email || "",
      role: u.system_role || u.role || "PARTICIPANT",
      active: u.status === "ACTIVE" || u.active === true || false, // Đảm bảo là boolean
      createdAt: u.created_at || u.createdAt || null,
      lastActive: u.updated_at || u.lastActive || null,
      projectCount: u.projectCount || 0,
    }));

    console.log("Mapped users:", users.value.length, "users loaded");
  } catch (e) {
    console.error("Error loading users:", e);
    console.error("Error details:", e.response?.data || e.message);

    // Hiển thị thông báo lỗi chi tiết
    if (e.response?.status === 401) {
      console.error("Authentication failed - Please login again");
    } else if (e.response?.status === 403) {
      console.error("Access denied - Admin role required");
    } else if (e.response?.status === 500) {
      console.error("Server error - Check backend logs");
    }

    users.value = [];
  }
};

onMounted(() => {
  loadUsers();
});
</script>

<style scoped>
.user-management {
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
  table-layout: fixed;
}

.data-table thead {
  background: #f8fafc;
}

.data-table th {
  padding: 12px 3px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.data-table th:nth-child(1) {
  width: 15px;
}
.data-table th:nth-child(2) {
  width: 130px;
}
.data-table th:nth-child(3) {
  width: 70px;
}
.data-table th:nth-child(4) {
  width: 70px;
}
.data-table th:nth-child(5) {
  width: 65px;
}
.data-table th:nth-child(6) {
  width: 70px;
}
.data-table th:nth-child(7) {
  width: 75px;
}
.data-table th:nth-child(8) {
  width: 100px;
}
.data-table th:nth-child(9) {
  width: 140px;
}

.data-table td {
  padding: 12px 3px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.data-table tr:hover {
  background: #f8fafc;
}

.data-table tr.selected {
  background: #dbeafe;
}

/* User Cell */
.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.user-name {
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-id {
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.email {
  color: #3b82f6;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Badge */
.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.badge-blue {
  background: #dbeafe;
  color: #1e40af;
}

.badge-green {
  background: #dcfce7;
  color: #166534;
}

.status-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.active {
  background: #22c55e;
}

.status-dot.inactive {
  background: #ef4444;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 6px;
}

.action-btn {
  width: 25px;
  height: 25px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 12px;
  flex-shrink: 0;
}

.action-btn.blue {
  background: #dbeafe;
  color: #1e40af;
}

.action-btn.blue:hover {
  background: #3b82f6;
  color: white;
}

.action-btn.green {
  background: #dcfce7;
  color: #166534;
}

.action-btn.green:hover {
  background: #22c55e;
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
  max-width: 700px;
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

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #e2e8f0;
}

/* User Detail */
.user-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
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

  .user-detail-grid {
    grid-template-columns: 1fr;
  }

  .bulk-actions {
    flex-direction: column;
    gap: 12px;
  }
}

/* User Info Box */
.user-info-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 24px;
}

.user-info-box .user-avatar {
  width: 48px;
  height: 48px;
  font-size: 20px;
}

.user-info-box .user-name {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.user-info-box .user-email {
  font-size: 14px;
  color: #64748b;
}
</style>
