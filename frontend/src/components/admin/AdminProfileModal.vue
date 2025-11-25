<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3><span class="material-symbols-outlined">person</span> Thông tin cá nhân</h3>
        <button class="close-btn" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="modal-body">
        <div class="avatar-section">
          <div class="avatar-upload">
            <div class="avatar-preview">
              <img :src="formData.avatar" alt="Avatar" />
              <div class="avatar-overlay">
                <span class="material-symbols-outlined">photo_camera</span>
              </div>
            </div>
            <input
              type="file"
              ref="avatarInput"
              @change="handleAvatarUpload"
              accept="image/*"
              class="avatar-input"
            />
            <button class="btn-avatar-change" @click="triggerAvatarUpload">Đổi ảnh đại diện</button>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
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
          </div>

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
              placeholder="Giới thiệu về bản thân..."
            ></textarea>
          </div>

          <div class="form-group">
            <label>Vai trò</label>
            <input type="text" :value="getRoleDisplay(formData.role)" class="form-input" disabled />
          </div>

          <div class="form-group">
            <label>Ngày tham gia</label>
            <input
              type="text"
              :value="formatDate(formData.createdAt)"
              class="form-input"
              disabled
            />
          </div>

          <div class="form-group">
            <label>Đăng nhập lần cuối</label>
            <input
              type="text"
              :value="formatDate(formData.lastLogin)"
              class="form-input"
              disabled
            />
          </div>
        </div>

        <div class="preferences-section">
          <h4>Cài đặt cá nhân</h4>
          <div class="preferences-grid">
            <div class="preference-item">
              <label>Ngôn ngữ</label>
              <select v-model="formData.preferences.language" class="form-input">
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </div>
            <div class="preference-item">
              <label>Giao diện</label>
              <select v-model="formData.preferences.theme" class="form-input">
                <option value="light">Sáng</option>
                <option value="dark">Tối</option>
                <option value="auto">Tự động</option>
              </select>
            </div>
            <div class="preference-item">
              <label>Múi giờ</label>
              <select v-model="formData.preferences.timezone" class="form-input">
                <option value="Asia/Ho_Chi_Minh">GMT+7 (Việt Nam)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
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
import axiosClient from '@/utils/axiosClient'
import { useToast } from 'vue-toastification'

const toast = useToast()
const emit = defineEmits(['close', 'updated'])

const avatarInput = ref(null)
const loading = ref(false)
const uploading = ref(false)

// 🧩 Dữ liệu form
const formData = reactive({
  name: '',
  email: '',
  gender: 'female',
  dob: '',
  avatar: '',
  status: 'ACTIVE',
  role: '',
  createdAt: '',
  lastLogin: '',
  preferences: {
    language: 'vi',
    theme: 'light',
    timezone: 'Asia/Ho_Chi_Minh',
  },
})

const errors = reactive({ name: '', email: '' })

// 🧩 Lấy thông tin user
const fetchUser = async () => {
  try {
    const res = await axiosClient.get('/api/auth/me')
    const user = res.data?.data
    if (!user) return

    formData.name = user.name
    formData.email = user.email
    formData.gender = user.gender || 'female'
    formData.status = user.status || 'ACTIVE'
    formData.role = user.system_role
    formData.createdAt = user.created_at
    formData.avatar = getFullAvatarUrl(user.avatar_url)
    formData.preferences.language = user.setting?.language || 'vi'
    formData.preferences.theme = user.setting?.theme || 'light'

    if (user.dob) {
      const d = new Date(user.dob)
      formData.dob = d.toISOString().split('T')[0]
    }
  } catch (err) {
    console.error('❌ Error fetching user:', err)
    toast.error('Không thể tải thông tin người dùng.')
  }
}

onMounted(fetchUser)

// 🖼️ Upload avatar
const triggerAvatarUpload = () => avatarInput.value?.click()

const handleAvatarUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    toast.warning('Chỉ chấp nhận định dạng JPEG, PNG, GIF, WebP.')
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    toast.warning('Kích thước tệp phải nhỏ hơn 5MB.')
    return
  }

  uploading.value = true
  try {
    const formDataUpload = new FormData()
    formDataUpload.append('avatar', file)
    const res = await axiosClient.post('/api/users/upload-avatar', formDataUpload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const newAvatar = getFullAvatarUrl(res.data.data.avatar_url)
    formData.avatar = newAvatar
    toast.success('Cập nhật ảnh đại diện thành công!')
  } catch (err) {
    console.error('Error uploading avatar:', err)
    toast.error(err.response?.data?.message || 'Tải ảnh thất bại!')
  } finally {
    uploading.value = false
    avatarInput.value.value = ''
  }
}

// 🧾 Validate form
const validateForm = () => {
  let valid = true
  errors.name = ''
  errors.email = ''

  if (!formData.name.trim()) {
    errors.name = 'Họ tên là bắt buộc.'
    valid = false
  }

  if (!formData.email.trim()) {
    errors.email = 'Email là bắt buộc.'
    valid = false
  } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
    errors.email = 'Email không hợp lệ.'
    valid = false
  }

  return valid
}

// 💾 Lưu thay đổi hồ sơ
const handleSave = async () => {
  if (loading.value) return // ✅ chống double-click
  if (!validateForm()) return

  loading.value = true

  try {
    const [year, month, day] = formData.dob
      ? formData.dob.split('-').map((x) => Number(x))
      : [null, null, null]

    const payload = {
      email: formData.email,
      name: formData.name,
      dob: year ? { day, month, year } : null,
      gender: formData.gender,
      avatar_url: formData.avatar.replace('http://localhost:8000', ''),
      status: formData.status,
    }

    const res = await axiosClient.patch('/api/users/update-profile', payload)

    toast.success(res.data?.message || 'Cập nhật hồ sơ thành công!')
    emit('updated', payload)
    setTimeout(() => emit('close'), 1200)
  } catch (err) {
    console.error('❌ Error updating profile:', err)
    toast.error(err.response?.data?.message || 'Cập nhật thất bại!')
  } finally {
    loading.value = false
  }
}

// 🌍 Helper
const getFullAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return ''
  if (avatarUrl.startsWith('http') || avatarUrl.startsWith('blob:')) return avatarUrl
  const baseUrl = 'http://localhost:8000'
  const cleanUrl = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`
  return `${baseUrl}${cleanUrl}`
}

const getRoleDisplay = (role) => {
  const map = { ADMIN: 'Quản trị viên', PARTICIPANT: 'Thành viên' }
  return map[role] || role
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
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

.avatar-section {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.avatar-upload {
  text-align: center;
}

.avatar-preview {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 auto 12px;
  border: 4px solid #e2e8f0;
  cursor: pointer;
  transition: border-color 0.2s;
}

.avatar-preview:hover {
  border-color: #1a365d;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.avatar-preview:hover .avatar-overlay {
  opacity: 1;
}

.avatar-overlay .material-symbols-outlined {
  color: white;
  font-size: 24px;
}

.avatar-input {
  display: none;
}

.btn-avatar-change {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  color: #4a5568;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-avatar-change:hover {
  background: #edf2f7;
  color: #1a365d;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
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

.form-input:disabled {
  background: #f7fafc;
  color: #718096;
}

.error-message {
  color: #e53e3e;
  font-size: 12px;
  margin-top: 4px;
}

.preferences-section {
  border-top: 1px solid #e2e8f0;
  padding-top: 24px;
}

.preferences-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1a365d;
  margin: 0 0 16px 0;
}

.preferences-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.preference-item {
  display: flex;
  flex-direction: column;
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
  min-width: 80px;
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

  .preferences-grid {
    grid-template-columns: 1fr;
  }

  .modal-content {
    width: 95%;
    margin: 20px;
  }
}
</style>