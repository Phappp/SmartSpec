<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content large">
      <div class="modal-header">
        <h3><span class="material-symbols-outlined">settings</span> Cài đặt hệ thống</h3>
        <button class="close-btn" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <div class="settings-tabs">
          <div class="tabs-header">
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

          <div class="tabs-content">
            <!-- General Settings -->
            <div v-if="activeTab === 'general'" class="tab-panel">
              <div class="settings-section">
                <h4>Thông tin hệ thống</h4>
                <div class="form-grid">
                  <div class="form-group">
                    <label>Tên hệ thống *</label>
                    <input type="text" v-model="formData.systemName" class="form-input" />
                    <span class="error-message" v-if="errors.systemName">{{
                      errors.systemName
                    }}</span>
                  </div>

                  <div class="form-group">
                    <label>Email quản trị *</label>
                    <input type="email" v-model="formData.adminEmail" class="form-input" />
                    <span class="error-message" v-if="errors.adminEmail">{{
                      errors.adminEmail
                    }}</span>
                  </div>

                  <div class="form-group">
                    <label>URL hệ thống *</label>
                    <input type="url" v-model="formData.systemUrl" class="form-input" />
                    <span class="error-message" v-if="errors.systemUrl">{{
                      errors.systemUrl
                    }}</span>
                  </div>

                  <div class="form-group">
                    <label>Ngôn ngữ mặc định</label>
                    <select v-model="formData.defaultLanguage" class="form-input">
                      <option value="vi">Tiếng Việt</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="settings-section">
                <h4>Giao diện</h4>
                <div class="form-grid">
                  <div class="form-group">
                    <label>Theme mặc định</label>
                    <select v-model="formData.defaultTheme" class="form-input">
                      <option value="light">Sáng</option>
                      <option value="dark">Tối</option>
                      <option value="auto">Tự động</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label>Logo hệ thống</label>
                    <div class="logo-upload">
                      <div class="logo-preview">
                        <img :src="logoPreview" alt="Logo" />
                      </div>
                      <input
                        type="file"
                        ref="logoInput"
                        @change="handleLogoUpload"
                        accept="image/*"
                        class="logo-input"
                      />
                      <button class="btn-logo-change" @click="triggerLogoUpload">Đổi logo</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- User Management -->
            <div v-if="activeTab === 'users'" class="tab-panel">
              <div class="settings-section">
                <h4>Quản lý người dùng</h4>
                <div class="form-grid">
                  <div class="form-group">
                    <label>Cho phép đăng ký</label>
                    <div class="toggle-group">
                      <label class="toggle-label">
                        <input type="checkbox" v-model="formData.allowRegistrations" />
                        <span class="toggle-slider"></span>
                        <span class="toggle-text">{{
                          formData.allowRegistrations ? 'Cho phép' : 'Không cho phép'
                        }}</span>
                      </label>
                      <span class="help-text">Cho phép người dùng tự đăng ký tài khoản mới</span>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Xác thực email</label>
                    <div class="toggle-group">
                      <label class="toggle-label">
                        <input type="checkbox" v-model="formData.emailVerification" />
                        <span class="toggle-slider"></span>
                        <span class="toggle-text">{{
                          formData.emailVerification ? 'Bắt buộc' : 'Không bắt buộc'
                        }}</span>
                      </label>
                      <span class="help-text">Yêu cầu xác thực email khi đăng ký</span>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Số dự án tối đa/user</label>
                    <input
                      type="number"
                      v-model="formData.maxProjectsPerUser"
                      class="form-input"
                      min="1"
                    />
                    <span class="help-text">Số dự án tối đa mỗi người dùng có thể tạo</span>
                  </div>

                  <div class="form-group">
                    <label>Thời gian timeout (phút)</label>
                    <input
                      type="number"
                      v-model="formData.sessionTimeout"
                      class="form-input"
                      min="5"
                    />
                    <span class="help-text"
                      >Thời gian không hoạt động trước khi tự động đăng xuất</span
                    >
                  </div>
                </div>
              </div>
            </div>

            <!-- API Settings -->
            <div v-if="activeTab === 'api'" class="tab-panel">
              <div class="settings-section">
                <h4>Cấu hình API</h4>
                <div class="form-grid">
                  <div class="form-group">
                    <label>API requests/ngày</label>
                    <input
                      type="number"
                      v-model="formData.dailyApiLimit"
                      class="form-input"
                      min="0"
                    />
                    <span class="help-text">0 = không giới hạn</span>
                  </div>

                  <div class="form-group">
                    <label>Giới hạn request/phút</label>
                    <input
                      type="number"
                      v-model="formData.apiRateLimit"
                      class="form-input"
                      min="1"
                    />
                    <span class="help-text">Số request tối đa mỗi phút cho mỗi API key</span>
                  </div>

                  <div class="form-group">
                    <label>Timeout request (giây)</label>
                    <input
                      type="number"
                      v-model="formData.apiTimeout"
                      class="form-input"
                      min="10"
                    />
                    <span class="help-text">Thời gian chờ tối đa cho mỗi API request</span>
                  </div>

                  <div class="form-group">
                    <label>Kích thước file tối đa (MB)</label>
                    <input
                      type="number"
                      v-model="formData.maxFileSize"
                      class="form-input"
                      min="1"
                    />
                    <span class="help-text">Kích thước file tối đa cho upload</span>
                  </div>
                </div>
              </div>

              <div class="settings-section">
                <h4>Nhà cung cấp AI mặc định</h4>
                <div class="form-grid">
                  <div class="form-group">
                    <label>Nhà cung cấp chính</label>
                    <select v-model="formData.defaultAiProvider" class="form-input">
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI</option>
                      <option value="claude">Anthropic Claude</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label>Model mặc định</label>
                    <input type="text" v-model="formData.defaultAiModel" class="form-input" />
                    <span class="help-text">Model AI sẽ được sử dụng mặc định</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Security -->
            <div v-if="activeTab === 'security'" class="tab-panel">
              <div class="settings-section">
                <h4>Bảo mật</h4>
                <div class="form-grid">
                  <div class="form-group">
                    <label>Xác thực 2 yếu tố</label>
                    <div class="toggle-group">
                      <label class="toggle-label">
                        <input type="checkbox" v-model="formData.twoFactorAuth" />
                        <span class="toggle-slider"></span>
                        <span class="toggle-text">{{
                          formData.twoFactorAuth ? 'Bắt buộc' : 'Tùy chọn'
                        }}</span>
                      </label>
                      <span class="help-text">Yêu cầu xác thực 2 yếu tố cho tất cả người dùng</span>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Giới hạn đăng nhập sai</label>
                    <input
                      type="number"
                      v-model="formData.maxLoginAttempts"
                      class="form-input"
                      min="1"
                    />
                    <span class="help-text"
                      >Số lần đăng nhập sai tối đa trước khi khóa tài khoản</span
                    >
                  </div>

                  <div class="form-group">
                    <label>Thời gian khóa (phút)</label>
                    <input
                      type="number"
                      v-model="formData.lockoutDuration"
                      class="form-input"
                      min="1"
                    />
                    <span class="help-text"
                      >Thời gian khóa tài khoản sau khi vượt quá số lần đăng nhập sai</span
                    >
                  </div>

                  <div class="form-group">
                    <label>Mật khẩu tối thiểu</label>
                    <input
                      type="number"
                      v-model="formData.minPasswordLength"
                      class="form-input"
                      min="6"
                    />
                    <span class="help-text">Độ dài tối thiểu của mật khẩu</span>
                  </div>
                </div>
              </div>

              <div class="settings-section">
                <h4>SSL & Encryption</h4>
                <div class="form-grid">
                  <div class="form-group">
                    <label>Bắt buộc HTTPS</label>
                    <div class="toggle-group">
                      <label class="toggle-label">
                        <input type="checkbox" v-model="formData.forceHttps" />
                        <span class="toggle-slider"></span>
                        <span class="toggle-text">{{ formData.forceHttps ? 'Bật' : 'Tắt' }}</span>
                      </label>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Mã hóa dữ liệu</label>
                    <div class="toggle-group">
                      <label class="toggle-label">
                        <input type="checkbox" v-model="formData.dataEncryption" />
                        <span class="toggle-slider"></span>
                        <span class="toggle-text">{{
                          formData.dataEncryption ? 'Bật' : 'Tắt'
                        }}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Backup -->
            <div v-if="activeTab === 'backup'" class="tab-panel">
              <div class="settings-section">
                <h4>Sao lưu tự động</h4>
                <div class="form-grid">
                  <div class="form-group">
                    <label>Tự động sao lưu</label>
                    <div class="toggle-group">
                      <label class="toggle-label">
                        <input type="checkbox" v-model="formData.autoBackup" />
                        <span class="toggle-slider"></span>
                        <span class="toggle-text">{{ formData.autoBackup ? 'Bật' : 'Tắt' }}</span>
                      </label>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Tần suất sao lưu (giờ)</label>
                    <input
                      type="number"
                      v-model="formData.backupInterval"
                      class="form-input"
                      min="1"
                    />
                    <span class="help-text">Khoảng thời gian giữa các lần sao lưu tự động</span>
                  </div>

                  <div class="form-group">
                    <label>Giữ lại bản sao lưu (ngày)</label>
                    <input
                      type="number"
                      v-model="formData.backupRetention"
                      class="form-input"
                      min="1"
                    />
                    <span class="help-text">Số ngày giữ lại các bản sao lưu cũ</span>
                  </div>

                  <div class="form-group">
                    <label>Lưu trữ sao lưu</label>
                    <select v-model="formData.backupStorage" class="form-input">
                      <option value="local">Local Server</option>
                      <option value="cloud">Cloud Storage</option>
                      <option value="both">Cả hai</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="backup-actions">
                <h4>Thao tác sao lưu</h4>
                <div class="action-buttons">
                  <button class="btn-action primary" @click="createBackup">
                    <span class="material-symbols-outlined">backup</span>
                    Tạo bản sao lưu ngay
                  </button>
                  <button class="btn-action secondary" @click="restoreBackup">
                    <span class="material-symbols-outlined">settings_backup_restore</span>
                    Khôi phục từ sao lưu
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">Hủy</button>
        <button class="btn btn-primary" @click="handleSave" :disabled="loading">
          <span v-if="loading" class="loading-spinner"></span>
          {{ loading ? 'Đang lưu...' : 'Lưu cài đặt' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

const props = defineProps({
  settings: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['save', 'close'])

const loading = ref(false)
const activeTab = ref('general')
const logoInput = ref(null)


const tabs = [
  { id: 'general', label: 'Chung', icon: 'settings' },
  { id: 'users', label: 'Người dùng', icon: 'group' },
  { id: 'api', label: 'API', icon: 'key' },
  { id: 'security', label: 'Bảo mật', icon: 'security' },
  { id: 'backup', label: 'Sao lưu', icon: 'backup' },
]

const formData = reactive({
  // General
  systemName: '',
  adminEmail: '',
  systemUrl: '',
  defaultLanguage: 'vi',
  defaultTheme: 'light',
  logo: '',
  favicon: '',

  // Users
  allowRegistrations: true,
  emailVerification: true,
  maxProjectsPerUser: 10,
  sessionTimeout: 30,

  // API
  dailyApiLimit: 1000,
  apiRateLimit: 60,
  apiTimeout: 30,
  maxFileSize: 50,
  defaultAiProvider: 'gemini',
  defaultAiModel: 'gemini-pro',

  // Security
  twoFactorAuth: false,
  maxLoginAttempts: 5,
  lockoutDuration: 30,
  minPasswordLength: 8,
  forceHttps: true,
  dataEncryption: true,

  // Backup
  autoBackup: true,
  backupInterval: 24,
  backupRetention: 30,
  backupStorage: 'local',
})

const errors = reactive({
  systemName: '',
  adminEmail: '',
  systemUrl: '',
})

const logoPreview = computed(() => formData.logo || '/default-logo.png')


// Initialize form data
Object.assign(formData, props.settings)

const triggerLogoUpload = () => {
  logoInput.value?.click()
}


const handleLogoUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      formData.logo = e.target.result
    }
    reader.readAsDataURL(file)
  }
}



const validateForm = () => {
  let isValid = true
  errors.systemName = ''
  errors.adminEmail = ''
  errors.systemUrl = ''

  if (!formData.systemName.trim()) {
    errors.systemName = 'Tên hệ thống là bắt buộc'
    isValid = false
  }

  if (!formData.adminEmail.trim()) {
    errors.adminEmail = 'Email quản trị là bắt buộc'
    isValid = false
  } else if (!/\S+@\S+\.\S+/.test(formData.adminEmail)) {
    errors.adminEmail = 'Email không hợp lệ'
    isValid = false
  }

  if (!formData.systemUrl.trim()) {
    errors.systemUrl = 'URL hệ thống là bắt buộc'
    isValid = false
  }

  return isValid
}

const handleSave = async () => {
  if (!validateForm()) return

  loading.value = true
  try {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    emit('save', { ...formData })
  } catch (error) {
    console.error('Error saving settings:', error)
  } finally {
    loading.value = false
  }
}

const createBackup = async () => {
  // Backup logic would go here
  console.log('Creating backup...')
}

const restoreBackup = async () => {
  // Restore logic would go here
  console.log('Restoring from backup...')
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

.modal-content.large {
  max-width: 900px;
  max-height: 90vh;
  width: 100%;
  background: white;
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
  background: #e2e8f0;
}

.settings-tabs {
  display: flex;
  flex-direction: column;
  height: 600px;
}

.tabs-header {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  background: #f7fafc;
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
}

.tab-button:hover {
  color: #1a365d;
  background: #edf2f7;
}

.tab-button.active {
  color: #1a365d;
  border-bottom-color: #1a365d;
  background: white;
}

.tabs-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: white;
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 32px;
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-section h4::before {
  content: '';
  width: 4px;
  height: 16px;
  background: #1a365d;
  border-radius: 2px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
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

.form-input {
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  max-height: 7vh;
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

.help-text {
  font-size: 12px;
  color: #718096;
  margin-top: 4px;
}

.toggle-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.toggle-label input[type='checkbox'] {
  display: none;
}

.toggle-slider {
  width: 44px;
  height: 24px;
  background: #e2e8f0;
  border-radius: 12px;
  position: relative;
  transition: all 0.3s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  top: 3px;
  left: 3px;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-label input[type='checkbox']:checked + .toggle-slider {
  background: #1a365d;
}

.toggle-label input[type='checkbox']:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.toggle-text {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.logo-upload {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}

.logo-preview {
  width: 120px;
  height: 60px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.favicon-preview {
  width: 32px;
  height: 32px;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.favicon-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.logo-input {
  display: none;
}

.btn-logo-change {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  color: #4a5568;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-logo-change:hover {
  background: #edf2f7;
  color: #1a365d;
}

.backup-actions {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
}

.backup-actions h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1a365d;
  margin: 0 0 16px 0;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action.primary {
  background: #1a365d;
  color: white;
}

.btn-action.primary:hover {
  background: #2d3748;
}

.btn-action.secondary {
  background: #f7fafc;
  color: #4a5568;
  border: 1px solid #e2e8f0;
}

.btn-action.secondary:hover {
  background: #edf2f7;
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

  .tabs-header {
    flex-direction: column;
  }

  .tab-button {
    justify-content: center;
  }

  .modal-content.large {
    width: 95%;
    margin: 20px;
  }

  .action-buttons {
    flex-direction: column;
  }
}
</style>