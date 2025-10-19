<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3><span class="material-symbols-outlined">add</span> Thêm API Key mới</h3>
        <button class="close-btn" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="modal-body">
        <div class="api-key-form">
          <div class="form-section">
            <h4>Thông tin API Key</h4>
            <div class="form-grid">
              <div class="form-group">
                <label>API Key *</label>
                <div class="input-with-actions">
                  <input
                    type="text"
                    v-model="formData.key_value"
                    class="form-input"
                    placeholder="Nhập API Key"
                    :class="{ 'with-action': formData.key_value }"
                  />
                  <button
                    v-if="formData.key_value"
                    class="btn-action"
                    @click="toggleKeyVisibility"
                    type="button"
                  >
                    <span class="material-symbols-outlined">
                      {{ showKey ? 'visibility_off' : 'visibility' }}
                    </span>
                  </button>
                </div>
                <span class="error-message" v-if="errors.key_value">{{ errors.key_value }}</span>
              </div>

              <div class="form-group">
                <label>Nhà cung cấp *</label>
                <select v-model="formData.provider" class="form-input">
                  <option value="">Chọn nhà cung cấp</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="claude">Anthropic Claude</option>
                </select>
                <span class="error-message" v-if="errors.provider">{{ errors.provider }}</span>
              </div>

              <div class="form-group">
                <label>Tên hiển thị</label>
                <input
                  type="text"
                  v-model="formData.display_name"
                  class="form-input"
                  placeholder="Nhập tên dễ nhận biết"
                />
              </div>

              <div class="form-group">
                <label>Trạng thái</label>
                <div class="status-toggle">
                  <label class="toggle-label">
                    <input type="checkbox" v-model="formData.is_active" />
                    <span class="toggle-slider"></span>
                    <span class="toggle-text">{{
                      formData.is_active ? 'Kích hoạt' : 'Vô hiệu hóa'
                    }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>Cấu hình sử dụng</h4>
            <div class="config-grid">
              <div class="form-group">
                <label>Giới hạn request/ngày</label>
                <input
                  type="number"
                  v-model="formData.daily_limit"
                  class="form-input"
                  placeholder="0 = không giới hạn"
                  min="0"
                />
                <span class="help-text">Số request tối đa mỗi ngày</span>
              </div>

              <div class="form-group">
                <label>Giới hạn request/phút</label>
                <input
                  type="number"
                  v-model="formData.rate_limit"
                  class="form-input"
                  placeholder="60"
                  min="1"
                />
                <span class="help-text">Số request tối đa mỗi phút</span>
              </div>

              <div class="form-group">
                <label>Ưu tiên sử dụng</label>
                <select v-model="formData.priority" class="form-input">
                  <option value="high">Cao</option>
                  <option value="medium" selected>Trung bình</option>
                  <option value="low">Thấp</option>
                </select>
                <span class="help-text">Key ưu tiên cao sẽ được sử dụng trước</span>
              </div>

              <div class="form-group">
                <label>Thời gian hết hạn</label>
                <input
                  type="date"
                  v-model="formData.expires_at"
                  class="form-input"
                  :min="minExpiryDate"
                />
                <span class="help-text">Để trống nếu không giới hạn thời gian</span>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>Quyền truy cập</h4>
            <div class="permissions-grid">
              <div class="permission-category">
                <h5>Chức năng chính</h5>
                <div class="permission-options">
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="formData.permissions.text_generation" />
                    <span class="checkmark"></span>
                    <span class="permission-text">Tạo văn bản</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="formData.permissions.code_generation" />
                    <span class="checkmark"></span>
                    <span class="permission-text">Tạo mã code</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="formData.permissions.analysis" />
                    <span class="checkmark"></span>
                    <span class="permission-text">Phân tích dữ liệu</span>
                  </label>
                </div>
              </div>

              <div class="permission-category">
                <h5>Mô hình AI</h5>
                <div class="permission-options">
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="formData.permissions.chat_models" />
                    <span class="checkmark"></span>
                    <span class="permission-text">Mô hình chat</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="formData.permissions.vision_models" />
                    <span class="checkmark"></span>
                    <span class="permission-text">Mô hình vision</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="formData.permissions.embedding_models" />
                    <span class="checkmark"></span>
                    <span class="permission-text">Mô hình embedding</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>Ghi chú & Mô tả</h4>
            <div class="form-group full-width">
              <textarea
                v-model="formData.description"
                class="form-input"
                rows="4"
                placeholder="Mô tả mục đích sử dụng, dự án liên quan, hoặc ghi chú đặc biệt..."
              ></textarea>
              <div class="char-counter">{{ formData.description.length }}/500 ký tự</div>
            </div>
          </div>

          <div class="security-notice" v-if="formData.key_value">
            <div class="security-icon">
              <span class="material-symbols-outlined">security</span>
            </div>
            <div class="security-content">
              <h5>Lưu ý bảo mật</h5>
              <p>
                API Key sẽ không thể xem lại sau khi tạo. Hãy đảm bảo bạn đã lưu trữ nó an toàn.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">Hủy</button>
        <button class="btn btn-primary" @click="handleAddApiKey" :disabled="loading">
          <span v-if="loading" class="loading-spinner"></span>
          {{ loading ? 'Đang thêm...' : 'Thêm API Key' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

const emit = defineEmits(['add', 'close'])

const loading = ref(false)
const showKey = ref(false)

const formData = reactive({
  key_value: '',
  provider: '',
  display_name: '',
  is_active: true,
  daily_limit: 1000,
  rate_limit: 60,
  priority: 'medium',
  expires_at: '',
  description: '',
  permissions: {
    text_generation: true,
    code_generation: true,
    analysis: true,
    chat_models: true,
    vision_models: false,
    embedding_models: false,
  },
})

const errors = reactive({
  key_value: '',
  provider: '',
})

const minExpiryDate = computed(() => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
})

const toggleKeyVisibility = () => {
  showKey.value = !showKey.value
}

const validateForm = () => {
  let isValid = true
  errors.key_value = ''
  errors.provider = ''

  if (!formData.key_value.trim()) {
    errors.key_value = 'API Key là bắt buộc'
    isValid = false
  } else if (formData.key_value.length < 10) {
    errors.key_value = 'API Key phải có ít nhất 10 ký tự'
    isValid = false
  }

  if (!formData.provider) {
    errors.provider = 'Nhà cung cấp là bắt buộc'
    isValid = false
  }

  return isValid
}

const handleAddApiKey = async () => {
  if (!validateForm()) return

  loading.value = true
  try {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const apiKeyData = {
      ...formData,
      created_by: 'current_user_id', // This would be set by backend
      created_at: new Date(),
      last_used: null,
      usage_count: 0,
    }

    emit('add', apiKeyData)

    // Reset form
    Object.assign(formData, {
      key_value: '',
      provider: '',
      display_name: '',
      is_active: true,
      daily_limit: 1000,
      rate_limit: 60,
      priority: 'medium',
      expires_at: '',
      description: '',
      permissions: {
        text_generation: true,
        code_generation: true,
        analysis: true,
        chat_models: true,
        vision_models: false,
        embedding_models: false,
      },
    })
    showKey.value = false
  } catch (error) {
    console.error('Error adding API key:', error)
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

.api-key-form {
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

.config-grid {
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

.input-with-actions {
  position: relative;
  display: flex;
  align-items: center;
}

.form-input.with-action {
  padding-right: 40px;
}

.btn-action {
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

.btn-action:hover {
  color: #1a365d;
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

.status-toggle {
  margin-top: 6px;
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

.permissions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.permission-category h5 {
  font-size: 14px;
  font-weight: 600;
  color: #4a5568;
  margin: 0 0 12px 0;
}

.permission-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  flex-shrink: 0;
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

.permission-text {
  font-size: 14px;
  color: #374151;
}

.char-counter {
  font-size: 12px;
  color: #718096;
  text-align: right;
  margin-top: 4px;
}

.security-notice {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #fffaf0;
  border: 1px solid #fed7d7;
  border-radius: 8px;
  margin-top: 16px;
}

.security-icon {
  color: #ed8936;
  flex-shrink: 0;
}

.security-content h5 {
  font-size: 14px;
  font-weight: 600;
  color: #c53030;
  margin: 0 0 4px 0;
}

.security-content p {
  font-size: 13px;
  color: #744210;
  margin: 0;
  line-height: 1.4;
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
  .form-grid,
  .config-grid,
  .permissions-grid {
    grid-template-columns: 1fr;
  }

  .modal-content {
    width: 95%;
    margin: 20px;
  }

  .security-notice {
    flex-direction: column;
    text-align: center;
  }
}
</style>