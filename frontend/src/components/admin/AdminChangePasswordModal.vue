<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3><span class="material-symbols-outlined">key</span> Đổi mật khẩu</h3>
        <button class="close-btn" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="modal-body">
        <div class="password-form">
          <div class="form-group">
            <label>Mật khẩu hiện tại *</label>
            <div class="input-with-icon">
              <input
                :type="showCurrentPassword ? 'text' : 'password'"
                v-model="formData.currentPassword"
                class="form-input"
                placeholder="Nhập mật khẩu hiện tại"
              />
              <button
                class="btn-toggle-password"
                @click="showCurrentPassword = !showCurrentPassword"
              >
                <span class="material-symbols-outlined">
                  {{ showCurrentPassword ? 'visibility_off' : 'visibility' }}
                </span>
              </button>
            </div>
            <span class="error-message" v-if="errors.currentPassword">{{
              errors.currentPassword
            }}</span>
          </div>

          <div class="form-group">
            <label>Mật khẩu mới *</label>
            <div class="input-with-icon">
              <input
                :type="showNewPassword ? 'text' : 'password'"
                v-model="formData.newPassword"
                class="form-input"
                placeholder="Nhập mật khẩu mới"
              />
              <button class="btn-toggle-password" @click="showNewPassword = !showNewPassword">
                <span class="material-symbols-outlined">
                  {{ showNewPassword ? 'visibility_off' : 'visibility' }}
                </span>
              </button>
            </div>
            <span class="error-message" v-if="errors.newPassword">{{ errors.newPassword }}</span>
            <div class="password-strength">
              <div class="strength-bar" :class="passwordStrength"></div>
              <span class="strength-text">{{ strengthText }}</span>
            </div>
            <div class="password-requirements">
              <p class="requirements-title">Mật khẩu phải có:</p>
              <ul class="requirements-list">
                <li :class="{ met: hasMinLength }">Ít nhất 8 ký tự</li>
                <li :class="{ met: hasUpperCase }">Chữ hoa (A-Z)</li>
                <li :class="{ met: hasLowerCase }">Chữ thường (a-z)</li>
                <li :class="{ met: hasNumber }">Số (0-9)</li>
                <li :class="{ met: hasSpecialChar }">Ký tự đặc biệt (!@#$%^&*)</li>
              </ul>
            </div>
          </div>

          <div class="form-group">
            <label>Xác nhận mật khẩu mới *</label>
            <div class="input-with-icon">
              <input
                :type="showConfirmPassword ? 'text' : 'password'"
                v-model="formData.confirmPassword"
                class="form-input"
                placeholder="Nhập lại mật khẩu mới"
              />
              <button
                class="btn-toggle-password"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <span class="material-symbols-outlined">
                  {{ showConfirmPassword ? 'visibility_off' : 'visibility' }}
                </span>
              </button>
            </div>
            <span class="error-message" v-if="errors.confirmPassword">{{
              errors.confirmPassword
            }}</span>
          </div>

          <div class="security-tips">
            <h4>Mẹo bảo mật:</h4>
            <ul>
              <li>Không sử dụng mật khẩu đã dùng trước đây</li>
              <li>Tránh sử dụng thông tin cá nhân dễ đoán</li>
              <li>Sử dụng cụm mật khẩu dễ nhớ nhưng khó đoán</li>
              <li>Không sử dụng cùng mật khẩu cho nhiều tài khoản</li>
            </ul>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">Hủy</button>
        <button
          class="btn btn-primary"
          @click="handleChangePassword"
          :disabled="loading || !isFormValid"
        >
          <span v-if="loading" class="loading-spinner"></span>
          {{ loading ? 'Đang xử lý...' : 'Đổi mật khẩu' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

const emit = defineEmits(['change', 'close'])

const loading = ref(false)
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const formData = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const errors = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// Password strength calculation
const passwordStrength = computed(() => {
  if (!formData.newPassword) return 'empty'

  const strength = calculatePasswordStrength(formData.newPassword)
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

const hasMinLength = computed(() => formData.newPassword.length >= 8)
const hasUpperCase = computed(() => /[A-Z]/.test(formData.newPassword))
const hasLowerCase = computed(() => /[a-z]/.test(formData.newPassword))
const hasNumber = computed(() => /[0-9]/.test(formData.newPassword))
const hasSpecialChar = computed(() => /[!@#$%^&*]/.test(formData.newPassword))

const isFormValid = computed(() => {
  return (
    formData.currentPassword &&
    formData.newPassword &&
    formData.confirmPassword &&
    formData.newPassword === formData.confirmPassword &&
    calculatePasswordStrength(formData.newPassword) >= 3
  )
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
  errors.currentPassword = ''
  errors.newPassword = ''
  errors.confirmPassword = ''

  if (!formData.currentPassword.trim()) {
    errors.currentPassword = 'Mật khẩu hiện tại là bắt buộc'
    isValid = false
  }

  if (!formData.newPassword.trim()) {
    errors.newPassword = 'Mật khẩu mới là bắt buộc'
    isValid = false
  } else if (formData.newPassword.length < 8) {
    errors.newPassword = 'Mật khẩu phải có ít nhất 8 ký tự'
    isValid = false
  } else if (calculatePasswordStrength(formData.newPassword) < 3) {
    errors.newPassword = 'Mật khẩu không đủ mạnh'
    isValid = false
  }

  if (!formData.confirmPassword.trim()) {
    errors.confirmPassword = 'Xác nhận mật khẩu là bắt buộc'
    isValid = false
  } else if (formData.newPassword !== formData.confirmPassword) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp'
    isValid = false
  }

  return isValid
}

const handleChangePassword = async () => {
  if (!validateForm()) return

  loading.value = true
  try {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    emit('change', {
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    })

    // Reset form
    Object.assign(formData, {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
  } catch (error) {
    console.error('Error changing password:', error)
    errors.currentPassword = 'Mật khẩu hiện tại không đúng'
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
  max-width: 500px;
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

.password-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
  font-size: 14px;
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.form-input {
  width: 100%;
  padding: 10px 40px 10px 12px;
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

.error-message {
  color: #e53e3e;
  font-size: 12px;
  margin-top: 4px;
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

.password-requirements {
  margin-top: 12px;
  padding: 12px;
  background: #f7fafc;
  border-radius: 6px;
}

.requirements-title {
  font-size: 12px;
  font-weight: 600;
  color: #4a5568;
  margin: 0 0 8px 0;
}

.requirements-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 11px;
  color: #718096;
}

.requirements-list li {
  margin-bottom: 4px;
  display: flex;
  align-items: center;
}

.requirements-list li::before {
  content: '●';
  margin-right: 6px;
  font-size: 8px;
}

.requirements-list li.met {
  color: #38a169;
}

.requirements-list li.met::before {
  content: '✓';
  color: #38a169;
}

.security-tips {
  padding: 16px;
  background: #fffaf0;
  border: 1px solid #fed7d7;
  border-radius: 8px;
  margin-top: 16px;
}

.security-tips h4 {
  font-size: 14px;
  font-weight: 600;
  color: #c53030;
  margin: 0 0 8px 0;
}

.security-tips ul {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 12px;
  color: #744210;
}

.security-tips li {
  margin-bottom: 4px;
  padding-left: 12px;
  position: relative;
}

.security-tips li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #ed8936;
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
  .modal-content {
    width: 95%;
    margin: 20px;
  }
}
</style>