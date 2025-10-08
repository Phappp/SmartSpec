<template>
  <div class="admin-dashboard">
    <!-- Material Icons -->
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
    <!-- Sidebar -->
    <div class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <i class="fa-brands fa-slack"></i>
          <h1>SmartSpec Admin</h1>
        </div>
      </div>
      
      <nav class="navigation">
        <ul>
          <li>
            <router-link to="/admin" :class="{ active: $route.path === '/admin' }">
              <i class=""></i>
              <span>Dashboard</span>
            </router-link>
          </li>
          <li>
            <router-link to="/admin/users" :class="{ active: $route.path === '/admin/users' }">
              <i class=""></i>
              <span>Quản lý người dùng</span>
            </router-link>
          </li>
          <li>
            <router-link to="/admin/api-keys" :class="{ active: $route.path === '/admin/api-keys' }">
              <i class=""></i>
              <span>Quản lý API Keys</span>
            </router-link>
          </li>
          <li>
            <router-link to="/admin/projects" :class="{ active: $route.path === '/admin/projects' }">
              <i class=""></i>
              <span>Quản lý dự án</span>
            </router-link>
          </li>
        </ul>
      </nav>
      
      <!-- User Account Section ở dưới cùng sidebar -->
      <div @click="toggleUserMenu" class="user-account">
        <div class="avatar">
          <img
            src="https://static.vecteezy.com/system/resources/previews/024/983/914/original/simple-user-default-icon-free-png.png"
            alt=""
          />
        </div>
        <div v-if="currentUser" class="user-info">
          <div class="user-name">{{ currentUser.name }}</div>
          <div class="user-email">{{ currentUser.email }}</div>
        </div>

        <!-- Dùng transition để fade/slide -->
        <transition name="fade-slide">
          <div v-if="showUserMenu" class="user-menu">
            <ul class="menu-list">
              <li><span class="material-symbols-outlined">help</span> Help</li>
              <li><span class="material-symbols-outlined">settings</span> Settings</li>
              <hr />
              <li @click.stop="logout">
                <span class="material-symbols-outlined">logout</span> Logout
              </li>
            </ul>
          </div>
        </transition>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Header -->
      <header class="header">
        <div class="header-left">
          <h2>{{ pageTitle }}</h2>
        </div>
        <div class="header-right">
          <!-- Avatar đã được di chuyển xuống sidebar -->
        </div>
      </header>

      <!-- Content Area -->
      <div class="content-area">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getUserInfo, logout as authLogout } from '@/utils/authGuard'

const router = useRouter()

// State
const showUserMenu = ref(false)
const currentUser = ref({
  name: 'Admin User',
  role: 'Super Admin',
  email: 'admin@smartspec.com'
})

// Computed
const pageTitle = computed(() => {
  const titles = {
    '/admin': 'Dashboard',
    '/admin/users': 'Quản lý người dùng',
    '/admin/api-keys': 'Quản lý API Keys',
    '/admin/projects': 'Quản lý dự án'
  }
  return titles[router.currentRoute.value.path] || 'Admin Panel'
})

// Methods
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
  
  if (showUserMenu.value) {
    document.addEventListener('click', handleClickOutside)
  } else {
    document.removeEventListener('click', handleClickOutside)
  }
}

const handleClickOutside = (event) => {
  const userMenu = document.querySelector('.user-menu')
  const userAccount = document.querySelector('.user-account')
  
  if (userMenu && !userMenu.contains(event.target) && !userAccount.contains(event.target)) {
    showUserMenu.value = false
    document.removeEventListener('click', handleClickOutside)
  }
}

const logout = () => {
  console.log('🚪 Logging out...')
  showUserMenu.value = false
  authLogout()
  router.push('/login')
}

onMounted(() => {
  console.log('🔧 Admin dashboard mounted')
  
  // Load user info from token
  const userInfo = getUserInfo()
  if (userInfo) {
    currentUser.value = {
      name: userInfo.name || 'Admin User',
      role: userInfo.role || 'ADMIN',
      email: userInfo.email || 'admin@smartspec.com'
    }
    console.log('👤 User info loaded:', currentUser.value)
  } else {
    console.warn('⚠️ No user info found, using default')
  }
})
</script>

<style scoped>
.admin-dashboard {
  display: flex;
  min-height: 100vh;
  background: #f8fafc;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Sidebar */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: 280px;
  background: white;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo i {
  font-size: 28px;
  color: #0a1a4d;
  
}

.logo h1 {
  font-size: 20px;
  font-weight: 700;
  color: #1a365d;
  margin: 0;
}

.navigation {
  padding: 24px 0;
  flex: 1;
}

.navigation ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.navigation li {
  margin-bottom: 4px;
}

.navigation a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  color: #64748b;
  text-decoration: none;
  transition: all 0.2s;
  font-weight: 500;
}

.navigation a:hover {
  background: #f1f5f9;
  color: #334155;
}

.navigation a.active {
  background: #dbeafe;
  color: #1e40af;
  border-right: 3px solid #3b82f6;
}

.navigation a i {
  width: 20px;
  text-align: center;
  font-size: 16px;
}

/* Main Content */
.main-content {
  margin-left: 280px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.header {
  background: white;
  padding: 20px 32px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-left h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1a365d;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 24px;
}



.content-area {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
}

/* Responsive */
@media (max-width: 1024px) {
  .sidebar {
    width: 240px;
  }
  
  .main-content {
    margin-left: 240px;
  }
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s;
  }
  
  .sidebar.open {
    transform: translateX(0);
  }
  
  .main-content {
    margin-left: 0;
  }
  
  .content-area {
    padding: 16px;
  }
}

/* User Account Section - New Style */
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
  cursor: pointer;
  margin-left: 12px;
}

.user-account:hover {
  background-color: #f5f5f5;
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

/* Transition animations */
.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.2s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
