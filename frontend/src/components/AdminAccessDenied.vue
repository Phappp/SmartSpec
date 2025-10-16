<template>
  <div class="access-denied">
    <div class="access-denied-content">
      <div class="icon">
        <i class="fa-solid fa-shield-halved"></i>
      </div>
      
      <h1>Access Denied</h1>
      <p class="message">
        Bạn không có quyền truy cập vào Admin Panel. 
        Chỉ có quyền ADMIN mới có thể truy cập trang này.
      </p>
      
      <div class="user-info" v-if="userInfo">
        <p><strong>User:</strong> {{ userInfo.name || userInfo.email }}</p>
        <p><strong>Role:</strong> {{ userInfo.role || 'PARTICIPANT' }}</p>
      </div>
      
      <div class="actions">
        <button @click="goHome" class="btn-primary">
          <i class="fa-solid fa-home"></i>
          Về trang chủ
        </button>
        <button @click="logout" class="btn-secondary">
          <i class="fa-solid fa-sign-out-alt"></i>
          Đăng xuất
        </button>
      </div>
      
      <div class="help-text">
        <p>
          <i class="fa-solid fa-info-circle"></i>
          Nếu bạn nghĩ đây là lỗi, vui lòng liên hệ quản trị viên.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { getUserInfo, logout as authLogout } from '@/utils/authGuard'

const router = useRouter()

const userInfo = computed(() => getUserInfo())

const goHome = () => {
  console.log('🏠 Going to home page...')
  router.push('/dashboard')
}

const logout = () => {
  console.log('🚪 Logging out...')
  authLogout()
  router.push('/login')
}
</script>

<style scoped>
.access-denied {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.access-denied-content {
  background: white;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 100%;
}

.icon {
  font-size: 64px;
  color: #e53e3e;
  margin-bottom: 20px;
}

.icon i {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

h1 {
  color: #2d3748;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 16px;
}

.message {
  color: #4a5568;
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 24px;
}

.user-info {
  background: #f7fafc;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  text-align: left;
}

.user-info p {
  margin: 8px 0;
  color: #2d3748;
  font-size: 14px;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
}

.btn-primary {
  background: #3182ce;
  color: white;
}

.btn-primary:hover {
  background: #2c5aa0;
  transform: translateY(-2px);
}

.btn-secondary {
  background: #e2e8f0;
  color: #4a5568;
}

.btn-secondary:hover {
  background: #cbd5e0;
  transform: translateY(-2px);
}

.help-text {
  color: #718096;
  font-size: 14px;
}

.help-text i {
  color: #3182ce;
  margin-right: 8px;
}

@media (max-width: 480px) {
  .access-denied-content {
    padding: 24px;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 100%;
    justify-content: center;
  }
}
</style>
