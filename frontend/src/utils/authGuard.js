// Authentication Guard cho Admin Panel
import { useRouter } from 'vue-router'
import axios from 'axios'
/**
 * Kiểm tra user có đăng nhập không
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken')
  return !!token
}

/**
 * Kiểm tra user có role ADMIN không
 */
export const isAdmin = () => {
  try {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken')
    if (!token) return false
    
    // Decode JWT token để lấy payload
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.system_role === 'ADMIN'
  } catch (error) {
    console.error('Error checking admin role:', error)
    return false
  }
}

/**
 * Lấy thông tin user từ token
 */
export const getUserInfo = () => {
  try {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken')
    if (!token) return null
    
    const payload = JSON.parse(atob(token.split('.')[1]))
    return {
      id: payload.sub || payload._id,
      email: payload.email,
      name: payload.name,
      role: payload.system_role,
      isAdmin: payload.system_role === 'ADMIN'
    }
  } catch (error) {
    console.error('Error getting user info:', error)
    return null
  }
}

/**
 * Middleware để bảo vệ admin routes
 */
export const adminGuard = (to, from, next) => {
  console.log('🔐 Checking admin access...')
  
  if (!isAuthenticated()) {
    console.log('❌ Not authenticated, redirecting to login')
    next('/login')
    return
  }
  
  if (!isAdmin()) {
    console.log('❌ Not admin, redirecting to access denied')
    next('/admin/access-denied')
    return
  }
  
  console.log('✅ Admin access granted')
  next()
}

/**
 * Middleware để bảo vệ authenticated routes
 */
export const authGuard = (to, from, next) => {
  console.log('🔐 Checking authentication...')
  
  if (!isAuthenticated()) {
    console.log('❌ Not authenticated, redirecting to login')
    next('/login')
    return
  }
  
  console.log('✅ Authentication granted')
  next()
}

/**
 * Logout function
 */
export const logout = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken')
    console.log('refreshToken before logout:', refreshToken)

    if (refreshToken) {
      await axios.post('http://localhost:8000/api/auth/logout', { refresh_token: refreshToken })
    }
  } catch (error) {
    console.error('Logout API error:', error)
  } finally {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('adminToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userId')
    localStorage.removeItem('email')
    console.log('🚪 Logged out')
  }
}

/**
 * Kiểm tra token có hết hạn không
 */
export const isTokenExpired = () => {
  try {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken')
    if (!token) return true
    
    const payload = JSON.parse(atob(token.split('.')[1]))
    const currentTime = Date.now() / 1000
    return payload.exp < currentTime
  } catch (error) {
    console.error('Error checking token expiration:', error)
    return true
  }
}
