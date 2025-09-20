<template>
  <div class="sidebar">
    <div class="brand-section">
      <div class="brand">
        <h2>SMART REQ</h2>
        <p>Generate professional software documentation using AI</p>
      </div>
      <button class="new-project-btn" @click="$emit('new')">+ New Project</button>
    </div>

    <nav class="navigation">
      <ul>
        <li><a href="#" @click.prevent="$emit('navigate','recent-projects')">Recent Projects</a></li>
        <li><a href="#" @click.prevent="$emit('navigate','my-projects')">My Projects</a></li>
        <li><a href="#" @click.prevent="$emit('navigate','shared-projects')">Shared Projects</a></li>
        <li><a href="#" @click.prevent="$emit('navigate','trash')">Trash</a></li>
      </ul>
    </nav>

    <div class="user-account">
      <div class="avatar" @click="toggleUserMenu">
        <span>{{ userInitials }}</span>
      </div>
      <div v-if="showUserMenu" class="user-menu">
        <div v-if="user" class="user-info">
          <div class="user-name">{{ user.name }}</div>
          <div class="user-email">{{ user.email }}</div>
        </div>
        <div class="user-actions">
          <button class="logout-btn" @click="handleLogout">Logout</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getCurrentUser } from '../api/project'; 

export default {
  name: 'Sidebar',
  data() {
    return {
      user: null,
      showUserMenu: false,
    };
  },
  computed: {
    userInitials() {
      if (!this.user || !this.user.name) return '...';
      const names = this.user.name.split(' ');
      if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return this.user.name.substring(0, 2).toUpperCase();
    }
  },
  created() {
    this.fetchUser();
  },
  methods: {
    async fetchUser() {
      try {
        // Gọi API để lấy thông tin người dùng đang đăng nhập
        const response = await getCurrentUser();
        this.user = response.data.user;
      } catch (error) {
        console.error("Failed to fetch user:", error);
        // Xử lý lỗi, ví dụ chuyển hướng về trang đăng nhập
        // this.$router.push('/login');
      }
    },
    toggleUserMenu() {
      this.showUserMenu = !this.showUserMenu;
    },
    handleLogout() {
      this.showUserMenu = false;
      this.$emit('logout');
    }
  }
}
</script>

