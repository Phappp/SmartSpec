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
        
        <!-- Admin Section - chỉ hiển thị cho ADMIN -->
        <li v-if="isAdmin" class="admin-section">
          <div class="admin-divider">
            <span>Admin</span>
          </div>
          <a
            class="sidebar-link admin-link"
            href="/admin"
            @click.prevent="navigateToAdmin"
          >
            <i class="fa-solid fa-shield-halved"></i>
            Admin Panel
          </a>
        </li>
      </ul>
    </nav>

    <div @click="toggleUserMenu" class="user-account">
      <div class="avatar">
        <img
          src="https://static.vecteezy.com/system/resources/previews/024/983/914/original/simple-user-default-icon-free-png.png"
          alt=""
        />
      </div>
      <div v-if="user" class="user-info">
        <div class="user-name">{{ user.name }}</div>
        <div class="user-email">{{ user.email }}</div>
      </div>

      <!-- Dùng transition để fade/slide -->
      <transition name="fade-slide">
        <div v-if="showUserMenu" class="user-menu">
          <ul class="menu-list">
            <li><span class="material-symbols-outlined">help</span> Help</li>
            <li><span class="material-symbols-outlined">settings</span> Settings</li>
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

export default {
  name: 'Sidebar',
  props: {
    // ✨ 1. Khai báo props để nhận 'user' từ HomePage
    user: {
      type: Object,
      default: () => null,
    },
  },
  data() {
    return {
      // user: null,
      showUserMenu: false,
      activeSection: 'recent-projects',
    }
  },
  computed: {
    userInitials() {
      if (!this.user || !this.user.name) return '...'
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
  mounted() {
    // 🔹 Đọc lại từ localStorage
    const savedSection = localStorage.getItem('activeSection')
    if (savedSection) {
      this.activeSection = savedSection
      this.$emit('navigate', savedSection) // gọi navigate ngay để đồng bộ
    }
  },
  methods: {
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
    navigateToAdmin() {
      console.log('🔐 Navigating to admin panel...')
      this.$router.push('/admin')
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
  gap: 8px;
  width: 100%;
  display: flex;
  padding-top: 12px;
  bottom: 0;
  padding-bottom: 12px;
  border-top: 1px solid #e0e0e0;
  align-items: center;
  justify-content: left;
  transition: 0.1s ease;
}

.user-account:hover {
  cursor: pointer;
  background-color: #efeeee;
}

.avatar {
  width: 40px;
  height: 40px;
  min-width: 40px;
  min-height: 40px;
  border-radius: 50%;
  background-color: #1a365d;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.25s ease;
}
.avatar img {
  width: 100%;
  height: 100%;
  padding: 3px;
  border-radius: 50%;
  object-fit: cover;
}
.user-menu {
  position: absolute;
  bottom: 80px;
  left: 0;
  width: 100%;
  min-height: 100px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 15px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  padding: 10px;
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
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
  color: #333;
}

.menu-list li span {
  font-size: 16px;
  width: 18px;
  text-align: center;
  color: #444;
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
  align-items: left;
  justify-content: center;
  border-bottom: 1px solid #eee;
  color: #333;
}

.user-name {
  display: -webkit-box;
  -webkit-line-clamp: 1; /* số dòng tối đa */
  -webkit-box-orient: vertical;
  font-weight: 600;
  font-size: 14px;
  padding-right: 10px;
  color: #333;
  margin-bottom: 2px;
  pointer-events: none;
  user-select: none;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 12px;
  color: #666;
  pointer-events: none;
  user-select: none;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  background: none;
  border: 1px solid #ddd;
  padding: 6px 12px;
  width: 100%;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background-color: #fee2e2;
  border-color: #fca5a5;
  color: #991b1b;
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

/* Admin Section Styles */
.admin-section {
  margin-top: 20px;
}

.admin-divider {
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-top: 1px solid #e0e0e0;
  margin-top: 8px;
  padding-top: 12px;
}

.admin-link {
  color: #d32f2f !important;
  font-weight: 600;
}

.admin-link:hover {
  background: #ffebee !important;
  color: #b71c1c !important;
}

.admin-link i {
  color: #d32f2f;
}
.fade-slide-enter-to,
.fade-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
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