<template>
  <div class="sidebar">
    <div class="brand-section">
      <div class="brand">
        <h2>
          <router-link class="logo-link">
            <i class="fa-brands fa-slack"></i>
          </router-link>
          SMART SPEC
        </h2>
        <p>Generate professional software documentation using AI</p>
      </div>
      <button class="new-project-btn" @click="$emit('new')">
        <i class="fa-solid fa-plus"></i> New Project
      </button>
    </div>

    <nav class="navigation">
      <ul>
        <li>
          <a
            class="sidebar-link"
            href="#"
            :class="{ active: activeSection === 'recent-projects' }"
            @click.prevent="navigate('recent-projects')"
          >
            <i class="fa-solid fa-clock"></i>
            Recent
          </a>
        </li>
        <li>
          <a
            class="sidebar-link"
            href="#"
            :class="{ active: activeSection === 'my-projects' }"
            @click.prevent="navigate('my-projects')"
          >
            <i class="fa-brands fa-space-awesome"></i>
            Projects
          </a>
        </li>
        <li>
          <a
            class="sidebar-link"
            href="#"
            :class="{ active: activeSection === 'shared-projects' }"
            @click.prevent="navigate('shared-projects')"
          >
            <i class="fa-regular fa-star"></i>
            Shared
          </a>
        </li>
        <li>
          <a
            class="sidebar-link"
            href="#"
            :class="{ active: activeSection === 'trash' }"
            @click.prevent="navigate('trash')"
          >
            <i class="fa-solid fa-trash-can"></i>
            Trashed
          </a>
        </li>
      </ul>
    </nav>

    <div @click="toggleUserMenu" class="user-account">
      <div class="avatar">
        <!-- FIX: Thêm safe checking và full URL -->
        <img
          v-if="user && user.avatar_url"
          :src="getFullAvatarUrl(user.avatar_url)"
          @error="handleAvatarError"
          alt="User Avatar"
        />
        <div v-else class="avatar-placeholder">
          {{ userInitials }}
        </div>
      </div>

      <div v-if="user" class="user-info">
        <div class="user-name">{{ user.name || 'User' }}</div>
        <div class="user-email">{{ user.email || 'user@example.com' }}</div>
      </div>
      <div v-else class="user-info">
        <div class="user-name">Loading...</div>
        <div class="user-email">...</div>
      </div>

      <transition name="fade-slide">
        <div v-if="showUserMenu" class="user-menu">
          <ul class="menu-list">
            <li><span class="material-symbols-outlined">help</span> Help</li>
            <li @click.stop="$emit('open-personal')">
              <span class="material-symbols-outlined">settings</span> Settings
            </li>
            <hr />
            <li @click.stop="handleLogout">
              <span class="material-symbols-outlined">logout</span> Logout
            </li>
          </ul>
        </div>
      </transition>
    </div>
  </div>
</template>

<script>
import { isAdmin } from '../utils/authGuard'
import axiosClient from '@/utils/axiosClient'

export default {
  name: 'Sidebar',
  props: {
    user: {
      type: Object,
      default: () => null,
    },
  },
  data() {
    return {
      showUserMenu: false,
      activeSection: 'recent-projects',
      avatarLoadError: false,
      localUser: null, // Backup user data
    }
  },
  computed: {
    userInitials() {
      if (!this.user || !this.user.name) return 'U'
      const names = this.user.name.split(' ')
      if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      }
      return this.user.name.substring(0, 2).toUpperCase()
    },
    isAdmin() {
      return isAdmin()
    },
  },
  watch: {
    // Watch for user prop changes
    user: {
      handler(newUser) {
        console.log('🔄 Sidebar user prop changed:', newUser?.avatar_url)
        if (newUser) {
          this.localUser = { ...newUser }
        }
      },
      deep: true, // 🔥 Quan trọng: watch nested changes
      immediate: true,
    },
  },
  mounted() {
    // 🔹 Đọc lại từ localStorage
    const savedSection = localStorage.getItem('activeSection')
    if (savedSection) {
      this.activeSection = savedSection
      this.$emit('navigate', savedSection) // gọi navigate ngay để đồng bộ
    }

    // 🔹 Fetch user data if not provided via props
    if (!this.user) {
      this.fetchUser()
    }
  },
  methods: {
    // FIX: Hàm tạo full avatar URL
    getFullAvatarUrl(avatarUrl) {
      if (!avatarUrl) {
        console.log('❌ No avatar_url provided')
        return ''
      }

      // Nếu đã là full URL hoặc blob URL
      if (avatarUrl.startsWith('http') || avatarUrl.startsWith('blob:')) {
        console.log('✅ Already full URL:', avatarUrl)
        return avatarUrl
      }

      // Đảm bảo giữ nguyên toàn bộ URL
      const cleanUrl = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`
      const baseUrl = 'http://localhost:8000'
      const fullUrl = `${baseUrl}${cleanUrl}`

      console.log('🔗 Sidebar constructed avatar URL:', fullUrl)
      return fullUrl
    },

    // FIX: Xử lý lỗi load avatar
    handleAvatarError(event) {
      console.error('❌ Sidebar avatar load failed:', event.target.src)
      this.avatarLoadError = true

      // Fallback to placeholder
      const img = event.target
      img.style.display = 'none'
    },

    // FIX: Fetch user data với error handling
    async fetchUser() {
      try {
        console.log('🔄 Sidebar fetching user data...')
        const res = await axiosClient.get('/api/auth/me')
        this.localUser = res.data?.data || {}
        console.log('✅ Sidebar user data loaded:', this.localUser)
      } catch (error) {
        console.error('❌ Failed to fetch user in sidebar:', error)
        this.localUser = {
          name: 'User',
          email: 'user@example.com',
          avatar_url: '',
        }
      }
    },

    toggleUserMenu() {
      this.showUserMenu = !this.showUserMenu

      if (this.showUserMenu) {
        document.addEventListener('click', this.handleClickOutside)
      } else {
        document.removeEventListener('click', this.handleClickOutside)
      }
    },

    handleClickOutside(event) {
      const userMenu = this.$el.querySelector('.user-menu')
      const userAccount = this.$el.querySelector('.user-account')

      if (userMenu && !userMenu.contains(event.target) && !userAccount.contains(event.target)) {
        this.showUserMenu = false
        document.removeEventListener('click', this.handleClickOutside)
      }
    },

    handleLogout() {
      this.showUserMenu = false
      this.$emit('logout')
    },

    navigate(section) {
      this.activeSection = section
      localStorage.setItem('activeSection', section)
      this.$emit('navigate', section)
    },
  },
}
</script>

<style scoped>
.fa-slack {
  font-size: 28px;
  color: #0a1a4d;
}

.sidebar {
  position: fixed;
  height: 100vh;
  width: 250px;
  background: #fff;
  display: flex;
  flex-direction: column;
  padding: 20px 16px 20px 0;
  border-radius: 0 0px 16px 0; /* bo góc phải */
  transition: all 0.3s ease;
  border-right: 1px solid #e0e0e0;
}

.brand h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.brand p {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
  margin-bottom: 20px;
  margin-left: 4px;
}

.new-project-btn {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  background-color: #1a365d;
  color: white;
  border: none;
  padding: 13px 15px;
  border-radius: 16px;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: 30px;
  width: 100%;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
}

.new-project-btn i {
  position: absolute;
  left: 1.4em;
  font-weight: bold;
  font-size: 1.3rem;
  transition: transform 0.3s ease;
}

.new-project-btn:hover i {
  transform: rotate(180deg);
}

.new-project-btn:hover {
  transform: translateY(-2px);
  background-color: #2c5282;
}

.navigation ul {
  list-style: none;
  padding: 0;
}

.navigation li {
  margin-bottom: 8px;
}

.navigation a {
  display: block;
  padding: 8px 12px;
  color: #666;
  text-decoration: none;
  font-size: 14px;
  border-radius: 10px;
  transition: all 0.25s ease;
  cursor: pointer;
}

.navigation a:hover {
  background-color: #f0f0f0;
  color: #333;
  transform: scale(1.02);
}

.navigation a.active {
  background-color: #909095ff;
  font-weight: bold;
  color: #fff;
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.2);
}

.sidebar-link i {
  margin-right: 10px;
  width: 16px;
  text-align: center;
}

/* User Account Section */
.user-account {
  position: absolute;
  gap: 12px;
  width: 100%;
  display: flex;
  padding: 12px;
  bottom: 0;
  border-top: 1px solid #e0e0e0;
  align-items: center;
  justify-content: flex-start;
  transition: 0.1s ease;
  cursor: pointer;
  background: #fff;
}

.user-account:hover {
  background-color: #f8f9fa;
}

.avatar {
  width: 40px;
  height: 40px;
  min-width: 40px;
  min-height: 40px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  background-color: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.25s ease;
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 14px;
  font-weight: 600;
}

.user-menu {
  position: absolute;
  bottom: 80px;
  left: 10px;
  right: 10px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  padding: 8px 0;
  animation: fadeIn 0.2s ease;
}

.menu-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.menu-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
  color: #333;
  font-size: 14px;
}

.menu-list li span {
  font-size: 18px;
  width: 20px;
  text-align: center;
  color: #666;
}

.menu-list li:hover {
  background-color: #f5f5f5;
}

.menu-list hr {
  border: none;
  border-top: 1px solid #eee;
  margin: 6px 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  flex: 1;
  min-width: 0; /* Important for text overflow */
}

.user-name {
  font-weight: 600;
  font-size: 14px;
  color: #333;
  margin-bottom: 2px;
  pointer-events: none;
  user-select: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.user-email {
  font-size: 12px;
  color: #666;
  pointer-events: none;
  user-select: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

/* transition cho user-menu */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
  }
}
</style>