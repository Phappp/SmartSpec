import axios from 'axios'

// Base URL for admin API endpoints (Vite env)
// NOTE: cấu hình qua VITE_API_URL, ví dụ: http://localhost:8000/api
// Mặc định trỏ về BE port 8000 theo .env backend của bạn
const API_BASE_URL = (import.meta?.env?.VITE_API_URL) || 'http://localhost:8000/api'

// Create axios instance for admin API calls
// NOTE: BE không có prefix /admin, sử dụng trực tiếp /api
const adminApi = axios.create({
  baseURL: `${API_BASE_URL}`,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Fallback instance for non-admin endpoints (e.g., /api/users)
const rootApi = axios.create({
  baseURL: `${API_BASE_URL}`,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add auth token to requests
adminApi.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem('adminToken')
  const accessToken = localStorage.getItem('accessToken')
  const token = adminToken || accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

rootApi.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem('adminToken')
  const accessToken = localStorage.getItem('accessToken')
  const token = adminToken || accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle response errors
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // NOTE: Không redirect để vẫn vào được trang /admin khi BE chưa có role-check API
    // UI sẽ tự hiển thị rỗng nếu lỗi
    return Promise.reject(error)
  }
)

// ==================== DASHBOARD API ====================

/**
 * Lấy thống kê tổng quan cho dashboard
 * @returns {Promise} Dashboard statistics
 */
export const getDashboardStats = async () => {
  try {
    // NOTE: BE chưa có endpoint dashboard stats, tạm thời tạo mock data
    // TODO: Tạo endpoint GET /api/admin/dashboard/stats trong BE
    const mockStats = {
      totalUsers: 0,
      activeUsers: 0,
      totalProjects: 0,
      activeApiKeys: 0,
      userRoleStats: [],
      apiProviderStats: []
    }
    
    // Thử lấy data từ các endpoint hiện có
    try {
      const [usersRes, projectsRes, apiKeysRes] = await Promise.allSettled([
        adminApi.get('/users'),
        adminApi.get('/projects/myproject'),
        adminApi.get('/keys')
      ])
      
      if (usersRes.status === 'fulfilled') {
        const users = usersRes.value.data?.items || usersRes.value.data || []
        mockStats.totalUsers = users.length
        mockStats.activeUsers = users.filter(u => u.active !== false).length
        
        // Phân bố theo role
        const roleCount = {}
        users.forEach(user => {
          const role = user.role || user.system_role || 'PARTICIPANT'
          roleCount[role] = (roleCount[role] || 0) + 1
        })
        mockStats.userRoleStats = Object.entries(roleCount).map(([name, count]) => ({
          name,
          count,
          percentage: Math.round((count / users.length) * 100),
          color: name === 'ADMIN' ? 'blue' : 'green'
        }))
      }
      
      if (projectsRes.status === 'fulfilled') {
        const projects = projectsRes.value.data?.items || projectsRes.value.data || []
        mockStats.totalProjects = projects.length
      }
      
      if (apiKeysRes.status === 'fulfilled') {
        const apiKeys = apiKeysRes.value.data?.items || apiKeysRes.value.data || []
        mockStats.activeApiKeys = apiKeys.filter(k => k.active !== false).length
        
        // Phân bố theo provider
        const providerCount = {}
        apiKeys.forEach(key => {
          const provider = key.provider || 'Unknown'
          providerCount[provider] = (providerCount[provider] || 0) + 1
        })
        mockStats.apiProviderStats = Object.entries(providerCount).map(([name, count]) => ({
          name,
          count,
          percentage: Math.round((count / apiKeys.length) * 100),
          color: name === 'OpenAI' ? 'green' : name === 'Gemini' ? 'purple' : 'blue'
        }))
      }
    } catch (e) {
      console.warn('Error fetching dashboard data from existing endpoints:', e)
    }
    
    return mockStats
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    throw error
  }
}

/**
 * Lấy hoạt động gần đây
 * @returns {Promise} Recent activities
 */
export const getRecentActivities = async () => {
  try {
    // NOTE: BE chưa có endpoint activities, tạm thời tạo mock data
    // TODO: Tạo endpoint GET /api/admin/dashboard/activities trong BE
    const mockActivities = [
      {
        id: 1,
        type: 'user',
        icon: 'fas fa-user-plus',
        description: 'Người dùng mới đăng ký',
        time: '2 phút trước',
        status: 'success',
        statusText: 'Thành công'
      },
      {
        id: 2,
        type: 'api',
        icon: 'fas fa-key',
        description: 'API key mới được tạo',
        time: '15 phút trước',
        status: 'success',
        statusText: 'Thành công'
      },
      {
        id: 3,
        type: 'project',
        icon: 'fas fa-folder',
        description: 'Dự án mới được tạo',
        time: '1 giờ trước',
        status: 'success',
        statusText: 'Thành công'
      }
    ]
    
    return mockActivities
  } catch (error) {
    console.error('Error fetching recent activities:', error)
    throw error
  }
}

// ==================== USER MANAGEMENT API ====================

/**
 * Lấy danh sách người dùng với phân trang và bộ lọc
 * @param {Object} params - Query parameters
 * @returns {Promise} Users list with pagination
 */
export const getUsers = async (params = {}) => {
  try {
    // NOTE: BE có endpoint GET /api/users (admin only)
    const response = await adminApi.get('/users', { params })
    console.log('Raw API response:', response.data) // Debug log
    return response.data
  } catch (error) {
    console.error('Error fetching users:', error)
    throw error
  }
}

/**
 * Lấy thông tin chi tiết người dùng
 * @param {string} userId - User ID
 * @returns {Promise} User details
 */
export const getUserById = async (userId) => {
  try {
    // NOTE: BE có endpoint GET /api/users/:id (admin only)
    const response = await adminApi.get(`/users/${userId}`)
    return response.data
  } catch (error) {
    console.error('Error fetching user details:', error)
    throw error
  }
}

/**
 * Tạo người dùng mới
 * @param {Object} userData - User data
 * @returns {Promise} Created user
 */
export const createUser = async (userData) => {
  try {
    // NOTE: BE không có endpoint tạo user từ admin, sử dụng register endpoint
    // TODO: Tạo endpoint POST /api/users (admin only) trong BE
    const response = await adminApi.post('/auth/register', userData)
    return response.data
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

/**
 * Cập nhật thông tin người dùng
 * @param {string} userId - User ID
 * @param {Object} userData - Updated user data
 * @returns {Promise} Updated user
 */
export const updateUser = async (userId, userData) => {
  try {
    // NOTE: BE có endpoint PATCH /api/users/:id (admin only)
    const response = await adminApi.patch(`/users/${userId}`, userData)
    return response.data
  } catch (error) {
    console.error('Error updating user:', error)
    throw error
  }
}

/**
 * Xóa người dùng
 * @param {string} userId - User ID
 * @returns {Promise} Deletion result
 */
export const deleteUser = async (userId) => {
  try {
    // NOTE: BE có endpoint DELETE /api/users/:id (admin only)
    const response = await adminApi.delete(`/users/${userId}`)
    return response.data
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}

/**
 * Đặt lại mật khẩu người dùng
 * @param {string} userId - User ID
 * @param {Object} passwordData - Password data with oldPassword and newPassword
 * @param {string} passwordData.oldPassword - Old password
 * @param {string} passwordData.newPassword - New password
 * @returns {Promise} Reset result
 */
export const resetUserPassword = async (userId, passwordData) => {
  try {
    // NOTE: BE có endpoint POST /api/users/change-password với body { oldPassword, newPassword }
    const response = await adminApi.post(`/users/change-password`, {
      ...passwordData,
      userId, // Include userId if backend needs it
    })
    return response.data
  } catch (error) {
    console.error("Error resetting user password:", error)
    throw error
  }
}

/**
 * Thay đổi trạng thái người dùng (kích hoạt/vô hiệu hóa)
 * @param {string} userId - User ID
 * @param {boolean} active - Active status
 * @returns {Promise} Update result
 */
export const toggleUserStatus = async (userId, active) => {
  try {
    const response = await adminApi.patch(`/users/${userId}/status`, { active })
    return response.data
  } catch (error) {
    console.error('Error toggling user status:', error)
    throw error
  }
}

/**
 * Thực hiện hành động hàng loạt cho người dùng
 * @param {Array} userIds - Array of user IDs
 * @param {string} action - Action to perform
 * @returns {Promise} Bulk action result
 */
export const bulkUserAction = async (userIds, action) => {
  try {
    const response = await adminApi.post('/users/bulk-action', {
      userIds,
      action
    })
    return response.data
  } catch (error) {
    console.error('Error performing bulk user action:', error)
    throw error
  }
}

// ==================== API KEYS MANAGEMENT API ====================

/**
 * Lấy danh sách API keys với phân trang và bộ lọc
 * @param {Object} params - Query parameters
 * @returns {Promise} API keys list with pagination
 */
export const getApiKeys = async (params = {}) => {
  try {
    // NOTE: BE có endpoint GET /api/keys
    const response = await adminApi.get('/keys', { params })
    return response.data
  } catch (error) {
    console.error('Error fetching API keys:', error)
    throw error
  }
}

/**
 * Lấy thông tin chi tiết API key
 * @param {string} apiKeyId - API Key ID
 * @returns {Promise} API key details
 */
export const getApiKeyById = async (apiKeyId) => {
  try {
    // NOTE: BE có endpoint GET /api/keys/:id
    const response = await adminApi.get(`/keys/${apiKeyId}`)
    return response.data
  } catch (error) {
    console.error('Error fetching API key details:', error)
    throw error
  }
}

/**
 * Tạo API key mới
 * @param {Object} apiKeyData - API key data
 * @returns {Promise} Created API key
 */
export const createApiKey = async (apiKeyData) => {
  try {
    // NOTE: BE có endpoint POST /api/keys
    const response = await adminApi.post('/keys', apiKeyData)
    return response.data
  } catch (error) {
    console.error('Error creating API key:', error)
    throw error
  }
}

/**
 * Cập nhật thông tin API key
 * @param {string} apiKeyId - API Key ID
 * @param {Object} apiKeyData - Updated API key data
 * @returns {Promise} Updated API key
 */
export const updateApiKey = async (apiKeyId, apiKeyData) => {
  try {
    // NOTE: BE có endpoint PATCH /api/keys/:id
    const response = await adminApi.patch(`/keys/${apiKeyId}`, apiKeyData)
    return response.data
  } catch (error) {
    console.error('Error updating API key:', error)
    throw error
  }
}

/**
 * Xóa API key
 * @param {string} apiKeyId - API Key ID
 * @returns {Promise} Deletion result
 */
export const deleteApiKey = async (apiKeyId) => {
  try {
    // NOTE: BE có endpoint DELETE /api/keys/:id
    const response = await adminApi.delete(`/keys/${apiKeyId}`)
    return response.data
  } catch (error) {
    console.error('Error deleting API key:', error)
    throw error
  }
}

/**
 * Thay đổi trạng thái API key (kích hoạt/vô hiệu hóa)
 * @param {string} apiKeyId - API Key ID
 * @param {boolean} active - Active status
 * @returns {Promise} Update result
 */
export const toggleApiKeyStatus = async (apiKeyId, active) => {
  try {
    const response = await adminApi.patch(`/api-keys/${apiKeyId}/status`, { active })
    return response.data
  } catch (error) {
    console.error('Error toggling API key status:', error)
    throw error
  }
}

/**
 * Test API key
 * @param {string} apiKeyId - API Key ID
 * @returns {Promise} Test result
 */
export const testApiKey = async (apiKeyId) => {
  try {
    const response = await adminApi.post(`/api-keys/${apiKeyId}/test`)
    return response.data
  } catch (error) {
    console.error('Error testing API key:', error)
    throw error
  }
}

/**
 * Thực hiện hành động hàng loạt cho API keys
 * @param {Array} apiKeyIds - Array of API key IDs
 * @param {string} action - Action to perform
 * @returns {Promise} Bulk action result
 */
export const bulkApiKeyAction = async (apiKeyIds, action) => {
  try {
    const response = await adminApi.post('/api-keys/bulk-action', {
      apiKeyIds,
      action
    })
    return response.data
  } catch (error) {
    console.error('Error performing bulk API key action:', error)
    throw error
  }
}

// ==================== PROJECT MANAGEMENT API ====================

/**
 * Lấy danh sách dự án với phân trang và bộ lọc
 * @param {Object} params - Query parameters
 * @returns {Promise} Projects list with pagination
 */
export const getProjects = async (params = {}) => {
  try {
    // NOTE: BE có endpoint GET /api/projects/myproject (user's projects)
    // TODO: Tạo endpoint GET /api/projects (admin only) để lấy tất cả projects
    const response = await adminApi.get('/projects/myproject', { params })
    return response.data
  } catch (error) {
    console.error('Error fetching projects:', error)
    throw error
  }
}

/**
 * Lấy thông tin chi tiết dự án
 * @param {string} projectId - Project ID
 * @returns {Promise} Project details
 */
export const getProjectById = async (projectId) => {
  try {
    // NOTE: BE có endpoint GET /api/projects/:projectId
    const response = await adminApi.get(`/projects/${projectId}`)
    return response.data
  } catch (error) {
    console.error('Error fetching project details:', error)
    throw error
  }
}

/**
 * Xóa dự án
 * @param {string} projectId - Project ID
 * @returns {Promise} Deletion result
 */
export const deleteProject = async (projectId) => {
  try {
    // NOTE: BE có endpoint DELETE /api/projects/:projectId
    const response = await adminApi.delete(`/projects/${projectId}`)
    return response.data
  } catch (error) {
    console.error('Error deleting project:', error)
    throw error
  }
}

// ==================== SYSTEM API ====================

/**
 * Lấy thông tin hệ thống
 * @returns {Promise} System information
 */
export const getSystemInfo = async () => {
  try {
    // NOTE: BE chưa có endpoint system info
    // TODO: Tạo endpoint GET /api/admin/system/info trong BE
    const mockSystemInfo = {
      version: '1.0.0',
      uptime: '2 days, 5 hours',
      memory: '512MB',
      cpu: '2.5%'
    }
    return mockSystemInfo
  } catch (error) {
    console.error('Error fetching system info:', error)
    throw error
  }
}

/**
 * Lấy logs hệ thống
 * @param {Object} params - Query parameters
 * @returns {Promise} System logs
 */
export const getSystemLogs = async (params = {}) => {
  try {
    // NOTE: BE chưa có endpoint system logs
    // TODO: Tạo endpoint GET /api/admin/system/logs trong BE
    const mockLogs = [
      {
        id: 1,
        level: 'INFO',
        message: 'User login successful',
        timestamp: new Date().toISOString(),
        source: 'auth'
      },
      {
        id: 2,
        level: 'WARN',
        message: 'API rate limit exceeded',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        source: 'api'
      }
    ]
    return { items: mockLogs, total: mockLogs.length }
  } catch (error) {
    console.error('Error fetching system logs:', error)
    throw error
  }
}

export default adminApi
