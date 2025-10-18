
<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <transition name="toast">
        <div v-if="notification.show" class="toast-notification" :class="notification.type">
          <div class="toast-icon">
            <span class="material-symbols-outlined">{{ notificationIcon }}</span>
          </div>
          <div class="toast-content">
            <h4 class="toast-title">{{ notification.title }}</h4>
            <p class="toast-message">{{ notification.message }}</p>
          </div>
          <div class="toast-progress"></div>
        </div>
      </transition>

      <header class="modal-header">
        <h2>Personal Information</h2>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </header>

      <div class="profile-page">
        <div class="profile-header">
          <div class="avatar-section" @click="handleAvatarClick">
            <!-- Hiển thị avatar với base URL -->
            <img
              v-if="localUser.avatar_url"
              :src="getFullAvatarUrl(localUser.avatar_url)"
              class="avatar-img"
              alt="User Avatar"
            />
            <span
              v-else
              class="avatar-circle large"
              :style="{ backgroundColor: getAvatarColor(localUser.name || 'U') }"
            >
              {{ localUser.name?.charAt(0).toUpperCase() }}
            </span>

            <!-- Overlay với loading state -->
            <div class="avatar-overlay" :class="{ uploading: isUploadingAvatar }">
              <span class="material-symbols-outlined">
                {{ isUploadingAvatar ? 'progress_activity' : 'photo_camera' }}
              </span>
              {{ isUploadingAvatar ? 'Uploading...' : 'Change' }}
            </div>
            <input
              type="file"
              ref="fileInput"
              @change="handleAvatarUpload"
              accept="image/*"
              hidden
            />
          </div>

          <div class="user-basic-info grid-layout">
            <div class="form-group">
              <label for="fullName">Full Name</label>
              <input id="fullName" type="text" class="form-control" v-model="localUser.name" />
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input id="email" type="email" class="form-control" v-model="localUser.email" />
            </div>
            <div class="form-group">
              <label for="dob">Date of Birth</label>
              <input
                id="dob"
                type="date"
                class="form-control"
                v-model="formattedDOB"
                @change="updateDOB"
              />
            </div>
            <div class="form-group">
              <label for="gender">Gender</label>
              <select id="gender" class="form-control" v-model="localUser.gender">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label for="status">Status</label>
              <input
                id="status"
                type="text"
                class="form-control"
                v-model="localUser.status"
                readonly
              />
            </div>
          </div>
        </div>

        <div class="security-section">
          <h3>Security</h3>
          <div class="security-item">
            <div class="security-info">
              <h4>Change Password</h4>
              <p>Update your password for enhanced security.</p>
            </div>
            <button class="btn btn-secondary" @click="showPasswordForm = !showPasswordForm">
              {{ showPasswordForm ? 'Cancel' : 'Change' }}
            </button>
          </div>

          <transition name="fade">
            <div v-if="showPasswordForm" class="password-form">
              <input
                type="password"
                v-model="passwordForm.current"
                placeholder="Current Password"
                class="form-control"
              />
              <input
                type="password"
                v-model="passwordForm.newPass"
                placeholder="New Password"
                class="form-control"
              />
              <button
                class="btn btn-primary sm"
                @click="savePassword"
                :disabled="isChangingPassword"
              >
                {{ isChangingPassword ? 'Saving...' : 'Save Password' }}
              </button>
            </div>
          </transition>

          <div class="security-item">
            <div class="security-info">
              <h4>Two-Factor Authentication (2FA)</h4>
              <p>Add an extra layer of security to your account.</p>
            </div>
            <div class="security-action">
              <span class="status-tag" :class="twoFAEnabled ? 'enabled' : 'disabled'">
                {{ twoFAEnabled ? 'Enabled' : 'Disabled' }}
              </span>
              <button
                class="btn"
                :class="twoFAEnabled ? 'btn-danger' : 'btn-primary'"
                @click="toggle2FA"
                :disabled="isToggling2FA"
              >
                {{ isToggling2FA ? 'Processing...' : twoFAEnabled ? 'Disable' : 'Enable' }}
              </button>
            </div>
          </div>
        </div>

        <footer class="form-actions">
          <button class="btn btn-secondary" @click="$emit('close')">Close</button>
          <button class="btn btn-primary" @click="saveAllChanges" :disabled="isSavingProfile">
            <span class="material-symbols-outlined">save</span>
            {{ isSavingProfile ? 'Saving...' : 'Save Changes' }}
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script>
import axiosClient from '@/utils/axiosClient'

export default {
  name: 'PersonalInfor',
  data() {
    return {
      localUser: {
        name: '',
        email: '',
        gender: '',
        avatar_url: '',
        status: '',
        dob: { day: '', month: '', year: '' },
      },
      formattedDOB: '',
      showPasswordForm: false,
      passwordForm: { current: '', newPass: '' },
      twoFAEnabled: false,

      // Loading states
      isUploadingAvatar: false,
      isSavingProfile: false,
      isChangingPassword: false,
      isToggling2FA: false,

      // Notification
      notification: {
        show: false,
        type: 'success',
        title: '',
        message: '',
      },
      notificationTimeout: null,
    }
  },
  computed: {
    notificationIcon() {
      switch (this.notification.type) {
        case 'error':
          return 'error'
        case 'warning':
          return 'warning'
        case 'success':
        default:
          return 'check_circle'
      }
    },
  },
  async mounted() {
    await this.fetchUser()

    // Debug sau khi fetch user
    console.log('🔍 After fetchUser:', {
      avatar_url: this.localUser.avatar_url,
      fullUrl: this.getFullAvatarUrl(this.localUser.avatar_url),
    })
  },
  methods: {
    // Lấy full URL cho avatar
    getFullAvatarUrl(avatarUrl) {
      console.log('🖼️ Original avatar_url from DB:', avatarUrl)

      if (!avatarUrl) return ''
      if (avatarUrl.startsWith('http')) return avatarUrl
      if (avatarUrl.startsWith('blob:')) return avatarUrl

      // Đảm bảo giữ nguyên toàn bộ URL, không xử lý gì thêm
      const cleanUrl = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`
      const baseUrl = 'http://localhost:8000'
      const fullUrl = `${baseUrl}${cleanUrl}`

      console.log('🔗 Constructed avatar URL:', fullUrl)
      return fullUrl
    },

    // Hiển thị notification
    showNotification(payload) {
      this.notification.type = payload.type
      this.notification.title = payload.title
      this.notification.message = payload.message
      this.notification.show = true

      if (this.notificationTimeout) {
        clearTimeout(this.notificationTimeout)
      }

      this.notificationTimeout = setTimeout(() => {
        this.notification.show = false
      }, 3000)
    },

    async fetchUser() {
      try {
        const res = await axiosClient.get('/api/auth/me')
        const user = res.data?.data
        if (!user) return

        let formatted = ''
        if (user.dob) {
          const d = new Date(user.dob)
          formatted = d.toISOString().split('T')[0]
        }

        this.localUser = {
          name: user.name || '',
          email: user.email || '',
          gender: user.gender || 'female',
          status: user.status || 'ACTIVE',
          avatar_url: user.avatar_url || '',
          dob: user.dob
            ? {
                day: new Date(user.dob).getUTCDate(),
                month: new Date(user.dob).getUTCMonth() + 1,
                year: new Date(user.dob).getUTCFullYear(),
              }
            : { day: '', month: '', year: '' },
        }
        this.formattedDOB = formatted
        this.twoFAEnabled = user.isTwoFactorEnabled || false
      } catch (err) {
        console.error('Error fetching user:', err.response?.data || err.message)
        this.showNotification({
          type: 'error',
          title: 'Error',
          message: 'Could not load user information.',
        })
      }
    },

    updateDOB() {
      if (!this.formattedDOB) return
      const [year, month, day] = this.formattedDOB.split('-').map(Number)
      this.localUser.dob = { day, month, year }
    },

    // UPLOAD AVATAR - FUNCTION MỚI
    handleAvatarClick() {
      this.$refs.fileInput.click()
    },

    async handleAvatarUpload(e) {
      const file = e.target.files[0]
      if (!file) return

      // Validate file
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        this.showNotification({
          type: 'error',
          title: 'Invalid File',
          message: 'Only JPEG, PNG, GIF, and WebP images are allowed.',
        })
        return
      }

      // Validate file size (5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        this.showNotification({
          type: 'error',
          title: 'File Too Large',
          message: 'File size must be less than 5MB.',
        })
        return
      }

      this.isUploadingAvatar = true

      try {
        // Tạo FormData
        const formData = new FormData()
        formData.append('avatar', file)

        // Gọi API upload
        const response = await axiosClient.post('/api/users/upload-avatar', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })

        // Cập nhật avatar_url từ response
        const newAvatarUrl = response.data.data.avatar_url
        this.localUser.avatar_url = newAvatarUrl

        // 🔥 QUAN TRỌNG: Emit event để thông báo avatar đã thay đổi
        this.$emit('avatar-updated', {
          avatar_url: newAvatarUrl,
          user: this.localUser,
        })

        this.showNotification({
          type: 'success',
          title: 'Success',
          message: 'Avatar uploaded successfully!',
        })
      } catch (err) {
        console.error('Error uploading avatar:', err.response?.data || err.message)
        this.showNotification({
          type: 'error',
          title: 'Upload Failed',
          message: err.response?.data?.message || 'Failed to upload avatar.',
        })
      } finally {
        this.isUploadingAvatar = false
        // Reset file input
        this.$refs.fileInput.value = ''
      }
    },

    async toggle2FA() {
      this.isToggling2FA = true
      try {
        const enable = !this.twoFAEnabled
        await axiosClient.post('/api/auth/toggle-2fa', { enable })
        this.twoFAEnabled = enable
        this.showNotification({
          type: 'success',
          title: 'Success',
          message: `2FA ${enable ? 'enabled' : 'disabled'} successfully!`,
        })
      } catch (err) {
        console.error(err)
        this.showNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to toggle 2FA.',
        })
      } finally {
        this.isToggling2FA = false
      }
    },

    async saveAllChanges() {
      this.isSavingProfile = true
      try {
        const payload = {
          email: this.localUser.email,
          name: this.localUser.name,
          dob: this.localUser.dob.year ? this.localUser.dob : null,
          gender: this.localUser.gender?.toLowerCase(),
          status: this.localUser.status?.toUpperCase(),
          // KHÔNG gửi avatar_url ở đây vì đã upload riêng
        }

        await axiosClient.patch('/api/users/update-profile', payload)
        this.showNotification({
          type: 'success',
          title: 'Success',
          message: 'Profile updated successfully!',
        })

        setTimeout(() => this.$emit('close'), 1000)
      } catch (err) {
        console.error('Error updating profile:', err.response?.data || err.message)
        this.showNotification({
          type: 'error',
          title: 'Error',
          message: err.response?.data?.message || 'Update failed.',
        })
      } finally {
        this.isSavingProfile = false
      }
    },

    async savePassword() {
      this.isChangingPassword = true
      try {
        const { current, newPass } = this.passwordForm
        if (!current || !newPass) {
          this.showNotification({
            type: 'warning',
            title: 'Warning',
            message: 'Please fill in all password fields.',
          })
          return
        }

        await axiosClient.post('/api/users/change-password', {
          oldPassword: current,
          newPassword: newPass,
        })

        this.showPasswordForm = false
        this.passwordForm = { current: '', newPass: '' }
        this.showNotification({
          type: 'success',
          title: 'Success',
          message: 'Password changed successfully!',
        })
      } catch (err) {
        console.error(err)
        this.showNotification({
          type: 'error',
          title: 'Error',
          message: err.response?.data?.message || 'Failed to change password.',
        })
      } finally {
        this.isChangingPassword = false
      }
    },

    getAvatarColor(name) {
      const colors = ['#4A90E2', '#50E3C2', '#B8E986', '#F5A623', '#D0021B', '#BD10E0']
      return colors[(name?.charCodeAt(0) || 0) % colors.length]
    },
  },
}
</script>

<style scoped>
/* FIXED: CSS variables and syntax correction */
.modal-overlay {
  --primary-color: #0c2f68;
  --primary-hover-color: #103a95;
  --secondary-color: #e5e7eb;
  --secondary-hover-color: #d1d5db;
  --danger-color: #ef4444;
  --danger-hover-color: #dc2626;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --background-color: #ffffff;
  --form-control-bg: #f9fafb;
  --border-color: #d1d5db;
  --border-radius-md: 8px;
  --border-radius-lg: 16px;

  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: var(--background-color);
  width: 90%;
  max-width: 800px;
  border-radius: var(--border-radius-lg);
  padding: 20px 28px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  overflow: hidden; /* Important for positioning the toast */
  position: relative; /* Important for positioning the toast */
  max-height: 95vh;
}

/* ===== NEW: Notification Styles ===== */
@keyframes progressBar {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.toast-notification {
  position: absolute;
  top: 20px;
  right: 28px;
  display: flex;
  align-items: flex-start;
  padding: 14px;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  min-width: 300px;
  max-width: 350px;
  z-index: 9999;
  color: #fff;
  border-left: 5px solid;
  overflow: hidden;
}

.toast-notification.success {
  background-color: #2f855a;
  border-color: #276749;
}
.toast-notification.error {
  background-color: #c53030;
  border-color: #9b2c2c;
}
.toast-notification.warning {
  background-color: #dd6b20;
  border-color: #b75618;
}

.toast-icon {
  margin-right: 12px;
  font-size: 24px;
}
.toast-content {
  flex-grow: 1;
}
.toast-title {
  margin: 0;
  font-weight: 600;
  font-size: 15px;
}
.toast-message {
  margin: 2px 0 0;
  font-size: 13px;
  opacity: 0.9;
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.6);
  animation: progressBar 2s linear forwards;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}
.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}
.close-btn {
  border: none;
  background: none;
  font-size: 30px;
  cursor: pointer;
  color: var(--text-secondary);
  line-height: 1;
}
.profile-header {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 20px;
}
.avatar-section {
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
}
.avatar-img,
.avatar-circle.large {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  object-fit: cover;
  background: #e2e8f0;
  font-size: 42px;
  font-weight: 600;
  color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
}
.avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 13px;
  opacity: 0;
  transition: opacity 0.25s ease;
}
.avatar-section:hover .avatar-overlay {
  opacity: 1;
}
.avatar-overlay .material-symbols-outlined {
  margin-bottom: 2px;
}
.user-basic-info.grid-layout {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 20px;
  width: 100%;
}
.form-group {
  display: flex;
  flex-direction: column;
}
.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 2px;
}
.form-control {
  padding: 8px 12px;
  font-size: 14px;
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-color);
  background-color: var(--form-control-bg);
  transition: border-color 0.2s, box-shadow 0.2s;
  color: var(--text-primary);
}
.form-control:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}
.security-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}
.security-section h3 {
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 12px;
}
.security-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}
.security-item + .security-item {
  border-top: 1px solid #f3f4f6;
}
.security-info h4 {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}
.security-info p {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}
.security-action {
  display: flex;
  align-items: center;
  gap: 12px;
}
.status-tag {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 999px;
  text-transform: uppercase;
}
.status-tag.enabled {
  background-color: #d1fae5;
  color: #076d50;
}
.status-tag.disabled {
  background-color: #e5e7eb;
  color: #565f6b;
}
.password-form {
  background-color: #f9fafb;
  padding: 12px;
  border-radius: var(--border-radius-md);
  margin-top: -4px;
  margin-bottom: 8px;
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 10px;
  align-items: center;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: var(--border-radius-md);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.btn .material-symbols-outlined {
  font-size: 18px;
}
.btn-primary {
  background-color: var(--primary-color);
  color: #fff;
}
.btn-primary:hover {
  background-color: var(--primary-hover-color);
}
.btn-secondary {
  background-color: var(--secondary-color);
  color: #374151;
  border: 1px solid var(--border-color);
}
.btn-secondary:hover {
  background-color: var(--secondary-hover-color);
}
.btn-danger {
  background-color: var(--danger-color);
  color: #fff;
}
.btn-danger:hover {
  background-color: var(--danger-hover-color);
}
.form-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
.avatar-overlay.uploading {
  background: rgba(0, 0, 0, 0.7);
}

.avatar-overlay.uploading .material-symbols-outlined {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>