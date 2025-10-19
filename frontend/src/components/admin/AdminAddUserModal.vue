<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3><span class="material-symbols-outlined">person_add</span> Thêm người dùng mới</h3>
        <button class="close-btn" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="modal-body">
        <div class="user-form">
          <div class="form-section">
            <h4>Thông tin cơ bản</h4>
            <div class="form-grid">
              <div class="form-group">
                <label>Họ tên *</label>
                <input
                  type="text"
                  v-model="formData.name"
                  class="form-input"
                  placeholder="Nhập họ và tên"
                />
                <span class="error-message" v-if="errors.name">{{ errors.name }}</span>
              </div>

              <div class="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  v-model="formData.email"
                  class="form-input"
                  placeholder="Nhập địa chỉ email"
                />
                <span class="error-message" v-if="errors.email">{{ errors.email }}</span>
              </div>

              <div class="form-group">
                <label>Số điện thoại</label>
                <input
                  type="tel"
                  v-model="formData.phone"
                  class="form-input"
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <div class="form-group">
                <label>Vai trò *</label>
                <select v-model="formData.role" class="form-input">
                  <option value="">Chọn vai trò</option>
                  <option value="ADMIN">Quản trị viên</option>
                  <option value="PARTICIPANT">Thành viên</option>
                </select>
                <span class="error-message" v-if="errors.role">{{ errors.role }}</span>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>Thông tin bổ sung</h4>
            <div class="form-grid">
              <div class="form-group">
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
          </div>

          <div class="form-section">
            <h4>Cài đặt tài khoản</h4>
            <div class="account-settings">
              <div class="setting-option">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="formData.sendWelcomeEmail" />
                  <span class="checkmark"></span>
                  Gửi email chào mừng
                </label>
                <span class="setting-description"
                  >Gửi hướng dẫn sử dụng và thông tin đăng nhập</span
                >
              </div>

              <div class="setting-option">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="formData.requirePasswordChange" />
                  <span class="checkmark"></span>
                  Yêu cầu đổi mật khẩu khi đăng nhập lần đầu
                </label>
                <span class="setting-description"
                  >Người dùng phải đổi mật khẩu khi đăng nhập lần đầu tiên</span
                >
              </div>

              <div class="setting-option">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="formData.generateRandomPassword" />
                  <span class="checkmark"></span>
                  Tạo mật khẩu ngẫu nhiên
                </label>
                <span class="setting-description"
                  >Mật khẩu sẽ được tạo tự động và gửi qua email</span
                >
              </div>

              <div v-if="!formData.generateRandomPassword" class="form-group">
                <label>Mật khẩu *</label>
                <div class="input-with-icon">
                  <input
                    :type="showPassword ? 'text' : 'password'"
                    v-model="formData.password"
                    class="form-input"
                    placeholder="Nhập mật khẩu"
                  />
                  <button class="btn-toggle-password" @click="showPassword = !showPassword">
                    <span class="material-symbols-outlined">
                      {{ showPassword ? 'visibility_off' : 'visibility' }}
                    </span>
                  </button>
                </div>
                <span class="error-message" v-if="errors.password">{{ errors.password }}</span>
                <div class="password-strength" v-if="formData.password">
                  <div class="strength-bar" :class="passwordStrength"></div>
                  <span class="strength-text">{{ strengthText }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="form-section" v-if="formData.sendWelcomeEmail">
            <h4>Nội dung email chào mừng</h4>
            <div class="email-template">
              <textarea
                v-model="formData.welcomeMessage"
                class="form-input"
                rows="4"
                placeholder="Nhập nội dung email chào mừng tùy chỉnh..."
              ></textarea>
              <div class="template-variables">
                <span class="variables-title">Biến có sẵn:</span>
                <div class="variables-list">
                  <!-- <code>{{"{{name}}"}}</code>
                  <code>{{"{{email}}"}}</code>
                  <code>{{"{{password}}"}}</code>
                  <code>{{"{{login_url}}"}}</code> -->
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">Hủy</button>
        <button class="btn btn-primary" @click="handleAddUser" :disabled="loading">
          <span v-if="loading" class="loading-spinner"></span>
          {{ loading ? 'Đang thêm...' : 'Thêm người dùng' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

const emit = defineEmits(['add', 'close'])

const loading = ref(false)
const showPassword = ref(false)

const formData = reactive({
  name: '',
  email: '',
  phone: '',
  role: '',
  gender: '',
  dob: '',
  bio: '',
  password: '',
  sendWelcomeEmail: true,
  requirePasswordChange: true,
  generateRandomPassword: true,
  welcomeMessage: `Chào mừng {{name}} đến với SmartSpec!

Tài khoản của bạn đã được tạo thành công.

Thông tin đăng nhập:
- Email: {{email}}
- Mật khẩu: {{password}}

Truy cập {{login_url}} để bắt đầu sử dụng hệ thống.

Trân trọng,
Đội ngũ SmartSpec`,
})

const errors = reactive({
  name: '',
  email: '',
  role: '',
  password: '',
})

// Password strength calculation
const passwordStrength = computed(() => {
  if (!formData.password) return 'empty'

  const strength = calculatePasswordStrength(formData.password)
  if (strength < 2) return 'weak'
  if (strength < 4) return 'medium'
  return 'strong'
})

const strengthText = computed(() => {
  const texts = {
    empty: '',
    weak: 'Yếu',
    medium: 'Trung bình',
    strong: 'Mạnh',
  }
  return texts[passwordStrength.value]
})

const calculatePasswordStrength = (password) => {
  let strength = 0
  if (password.length >= 8) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/[a-z]/.test(password)) strength++
  if (/[0-9]/.test(password)) strength++
  if (/[!@#$%^&*]/.test(password)) strength++
  return strength
}

const validateForm = () => {
  let isValid = true
  errors.name = ''
  errors.email = ''
  errors.role = ''
  errors.password = ''

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

  if (!formData.role) {
    errors.role = 'Vai trò là bắt buộc'
    isValid = false
  }

  if (!formData.generateRandomPassword) {
    if (!formData.password.trim()) {
      errors.password = 'Mật khẩu là bắt buộc'
      isValid = false
    } else if (formData.password.length < 8) {
      errors.password = 'Mật khẩu phải có ít nhất 8 ký tự'
      isValid = false
    } else if (calculatePasswordStrength(formData.password) < 3) {
      errors.password = 'Mật khẩu không đủ mạnh'
      isValid = false
    }
  }

  return isValid
}

const generateRandomPassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

const handleAddUser = async () => {
  if (!validateForm()) return

  loading.value = true
  try {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const userData = {
      ...formData,
      password: formData.generateRandomPassword ? generateRandomPassword() : formData.password,
      status: 'ACTIVE',
      system_role: formData.role,
      created_at: new Date(),
    }

    emit('add', userData)

    // Reset form
    Object.assign(formData, {
      name: '',
      email: '',
      phone: '',
      role: '',
      gender: '',
      dob: '',
      bio: '',
      password: '',
      sendWelcomeEmail: true,
      requirePasswordChange: true,
      generateRandomPassword: true,
    })
  } catch (error) {
    console.error('Error adding user:', error)
  } finally {
    loading.value = false
  }
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

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.btn-toggle-password {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: #718096;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-toggle-password:hover {
  color: #1a365d;
}

.password-strength {
  margin-top: 8px;
}

.strength-bar {
  height: 4px;
  border-radius: 2px;
  margin-bottom: 4px;
  transition: all 0.3s ease;
}

.strength-bar.empty {
  background: #e2e8f0;
}

.strength-bar.weak {
  background: #e53e3e;
  width: 33%;
}

.strength-bar.medium {
  background: #ed8936;
  width: 66%;
}

.strength-bar.strong {
  background: #38a169;
  width: 100%;
}

.strength-text {
  font-size: 12px;
  color: #718096;
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
  font-weight: 500;
  color: #374151;
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

.setting-description {
  font-size: 12px;
  color: #718096;
  margin-left: 26px;
}

.email-template {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-variables {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.variables-title {
  font-size: 12px;
  color: #718096;
  font-weight: 500;
}

.variables-list {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.variables-list code {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  color: #4a5568;
  font-family: monospace;
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
  min-width: 120px;
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

  .modal-content {
    width: 95%;
    margin: 20px;
  }
}
</style>