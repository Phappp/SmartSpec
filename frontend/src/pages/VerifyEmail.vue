<template>
  <div class="verification-container">
    <div v-if="loading" class="spinner"></div>
    <div v-if="success" class="message success">
      <p>{{ success }}</p>
      <p>Đang chuyển hướng bạn...</p>
    </div>
    <div v-if="error" class="message error">
      <p>{{ error }}</p>
      <p>Đang chuyển hướng bạn...</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const error = ref('')
const success = ref('')

onMounted(async () => {
  const token = route.query.token

  if (!token) {
    error.value = 'Không tìm thấy token xác thực.'
    loading.value = false
    setTimeout(() => router.push({ path: '/register', query: { verify_status: 'failed' } }), 2000)
    return
  }

  try {
    const res = await axios.post('http://localhost:8000/api/auth/verify-email', { token })
    loading.value = false

    if (res.data.status === 'Success' && res.data.data === true) {
      success.value = 'Xác thực email thành công!'
      localStorage.setItem('emailVerified', 'true')
      // Chuyển hướng về trang đăng ký (không cần query param khi thành công)
      setTimeout(() => router.push({ path: '/register' }), 1500)
    } else {
      error.value = res.data.message || 'Xác thực thất bại.'
      setTimeout(() => router.push({ path: '/register', query: { verify_status: 'failed' } }), 2000)
    }
  } catch (err) {
    console.error(err)
    loading.value = false
    error.value = 'Lỗi xác thực email. Vui lòng thử lại.'
    setTimeout(() => router.push({ path: '/register', query: { verify_status: 'failed' } }), 2000)
  }
})
</script>

<style scoped>
.verification-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-family: sans-serif;
}
.message {
  text-align: center;
  padding: 20px;
  border-radius: 8px;
}
.success {
  color: #1db954;
}
.error {
  color: #e22134;
}
.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: #09f;
  animation: spin 1s ease infinite;
}
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>