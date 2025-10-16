<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search)
    const accessToken = urlParams.get('access_token')
    const refreshToken = urlParams.get('refresh_token')
    const userId = urlParams.get('uid')
    const code = urlParams.get('code')

    if (accessToken && refreshToken) {
      // 👉 Đây là redirect từ backend đã xong
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('userId', userId)

      // Kiểm tra nếu là ADMIN thì chuyển vào trang admin
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]))
        if (payload.system_role === 'ADMIN') {
          console.log('✅ Google OAuth success - ADMIN user, redirecting to admin...')
          router.push('/admin')
        } else {
          console.log('✅ Google OAuth success - Regular user, redirecting to dashboard...')
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Error parsing token:', error)
        console.log('✅ Google OAuth success, redirecting to dashboard...')
        router.push('/dashboard')
      }
    } else if (code) {
      // 👉 Đây là redirect lần 1 từ Google
      // Gọi backend để đổi code sang token
      window.location.href = `http://localhost:8000/api/auth/google/oauth?code=${code}`
    } else {
      console.error('❌ Missing token or code from Google OAuth redirect')
      router.push('/login')
    }
  } catch (err) {
    console.error('❌ OAuth redirect parse error:', err)
    router.push('/login')
  }
})
</script>


<template>
  <div class="flex items-center justify-center h-screen">
    <p class="text-lg font-semibold">Đang đăng nhập bằng Google...</p>
  </div>
</template>
