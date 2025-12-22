<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3><span class="material-symbols-outlined">edit</span> Chỉnh sửa người dùng</h3>
        <button class="close-btn" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="modal-body">
        <div class="user-form">
          <div class="form-section">
            <h4>Thông tin</h4>
            <div class="form-grid">
              <!-- <div class="form-group">
                <label>Họ tên *</label>
                <input type="text" v-model="formData.name" class="form-input" />
                <span class="error-message" v-if="errors.name">{{ errors.name }}</span>
              </div>

              <div class="form-group">
                <label>Email *</label>
                <input type="email" v-model="formData.email" class="form-input" />
                <span class="error-message" v-if="errors.email">{{ errors.email }}</span>
              </div>

              <div class="form-group">
                <label>Số điện thoại</label>
                <input type="tel" v-model="formData.phone" class="form-input" />
              </div> -->

              <div class="form-group">
                <label>Vai trò *</label>
                <select v-model="formData.system_role" class="form-input">
                  <option value="ADMIN">Quản trị viên</option>
                  <option value="PARTICIPANT">Thành viên</option>
                </select>
                <span class="error-message" v-if="errors.system_role">{{
                  errors.system_role
                }}</span>
              </div>

               <div class="form-group">
                <label>Trạng thái *</label>
                <select v-model="formData.status" class="form-input">
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="INACTIVE">Ngừng hoạt động</option>
                </select>
              </div>

              <!--<div class="form-group">
                <label>Giới tính</label>
                <select v-model="formData.gender" class="form-input">
                  <option value="">Chọn giới tính</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <div class="form-group">
                <label>Ngày sinh</label>
                <input type="date" v-model="formData.dob" class="form-input" />
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>Thông tin bổ sung</h4>
            <div class="form-group full-width">
              <label>Tiểu sử</label>
              <textarea
                v-model="formData.bio"
                class="form-input"
                rows="3"
                placeholder="Mô tả về người dùng..."
              ></textarea>
            </div>
          </div>

          <div class="form-section">
            <h4>Cài đặt tài khoản</h4>
            <div class="account-settings">
              <div class="setting-option">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="formData.isTwoFactorEnabled" />
                  <span class="checkmark"></span>
                  <span class="setting-text">Xác thực 2 yếu tố</span>
                </label>
                <span class="setting-description">Yêu cầu xác thực 2 yếu tố khi đăng nhập</span>
              </div>

              <div class="setting-option">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="formData.requirePasswordChange" />
                  <span class="checkmark"></span>
                  <span class="setting-text">Yêu cầu đổi mật khẩu</span>
                </label>
                <span class="setting-description"
                  >Người dùng phải đổi mật khẩu khi đăng nhập lần tiếp theo</span
                >
              </div> -->
            </div>
          </div>

          <!-- <div class="form-section">
            <h4>Thống kê hoạt động</h4>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-label">Số dự án</span>
                <span class="stat-value">{{ user.project_count || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Đăng nhập cuối</span>
                <span class="stat-value">{{ formatLastLogin(user.last_login) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Ngày tạo</span>
                <span class="stat-value">{{ formatDate(user.created_at) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Cập nhật cuối</span>
                <span class="stat-value">{{ formatDate(user.updated_at) }}</span>
              </div>
            </div>
          </div> -->
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">Hủy</button>
        <button class="btn btn-primary" @click="handleSave" :disabled="loading">
          <span v-if="loading" class="loading-spinner"></span>
          {{ loading ? 'Đang lưu...' : 'Cập nhật' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['save', 'close'])

const loading = ref(false)

const formData = reactive({
  name: '',
  email: '',
  phone: '',
  system_role: 'PARTICIPANT',
  status: 'ACTIVE',
  gender: '',
  dob: '',
  bio: '',
  isTwoFactorEnabled: false,
  requirePasswordChange: false,
})

const errors = reactive({
  name: '',
  email: '',
  system_role: '',
})

// Initialize form data
onMounted(() => {
  Object.assign(formData, {
    ...props.user,
    system_role: props.user.system_role || 'PARTICIPANT',
    status: props.user.status || 'ACTIVE',
  })
})

const validateForm = () => {
  let isValid = true
  errors.name = ''
  errors.email = ''
  errors.system_role = ''

  if (!formData.name.trim()) {
    errors.name = 'Họ tên là bắt buộc'
    isValid = false
  }

  if (!formData.email.trim()) {
    errors.email = 'Email là bắt buộc'
    isValid = false
  } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
    errors.email = 'Email không hợp lệ'
    isValid = false
  }

  if (!formData.system_role) {
    errors.system_role = 'Vai trò là bắt buộc'
    isValid = false
  }

  return isValid
}

const handleSave = async () => {
  if (!validateForm()) return

  loading.value = true
  try {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    emit('save', {
      ...formData,
      id: props.user.id,
    })
  } catch (error) {
    console.error('Error updating user:', error)
  } finally {
    loading.value = false
  }
}

const formatLastLogin = (date) => {
  if (!date) return 'Chưa đăng nhập'
  return new Date(date).toLocaleDateString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('vi-VN')
}
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

.modal-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
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
  padding: 24px;
}

.user-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-section {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
}

.form-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1a365d;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-section h4::before {
  content: '';
  width: 4px;
  height: 16px;
  background: #1a365d;
  border-radius: 2px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
  font-size: 14px;
}

.form-input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

.error-message {
  color: #e53e3e;
  font-size: 12px;
  margin-top: 4px;
}

.account-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-option {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
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

.setting-text {
  font-weight: 500;
  color: #374151;
}

.setting-description {
  font-size: 12px;
  color: #718096;
  margin-left: 26px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: #f7fafc;
  border-radius: 8px;
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: #718096;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #1a365d;
}

.modal-footer {
  padding: 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .modal-content {
    width: 95%;
    margin: 20px;
  }
}
</style>