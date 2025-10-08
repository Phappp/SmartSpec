// src/api/admin.js
import axiosClient from "@/utils/axiosClient";
import { isAuthenticated, isAdmin, isTokenExpired, logout } from "@/utils/authGuard";

/**
 * Interceptor phụ — nếu token hết hạn hoặc không phải admin thì logout
 */
axiosClient.interceptors.request.use((config) => {
  if (!isAuthenticated() || !isAdmin() || isTokenExpired()) {
    console.warn("⚠️ Token invalid or expired — logging out");
    logout();
    window.location.href = "/login";
    return Promise.reject("Unauthorized");
  }
  return config;
});

// ==================== DASHBOARD ====================
export const getDashboardStats = () => axiosClient.get(`/api/admin/dashboard/stats`);
export const getRecentActivities = () => axiosClient.get(`/api/admin/dashboard/activities`);

// ==================== USER PROFILE MANAGEMENT ====================
/**
 * Update user profile
 * @param {Object} profileData - Profile data including name, dob, gender, avatar_url, status
 * @returns {Promise} API response
 */
export const updateProfile = (profileData) => {
  return axiosClient.patch('/api/users/update-profile', profileData);
};

/**
 * Change user password
 * @param {Object} passwordData - { oldPassword, newPassword }
 * @returns {Promise} API response
 */
export const changePassword = (passwordData) => {
  return axiosClient.post('/api/users/change-password', passwordData);
};

/**
 * Change user email
 * @param {string} newEmail - New email address
 * @returns {Promise} API response
 */
export const changeEmail = (newEmail) => {
  return axiosClient.post('/api/users/change-email', { newEmail });
};

// ==================== ADMIN USER MANAGEMENT ====================
/**
 * Get all users (Admin only)
 * @returns {Promise} API response
 */
export const getUsers = () => {
  console.log('Calling getUsers API...');
  return axiosClient.get('/api/users');
};

/**
 * Get user by ID (Admin only)
 * @param {string} id - User ID
 * @returns {Promise} API response
 */
export const getUserById = (id) => {
  console.log('Calling getUserById API with ID:', id);
  return axiosClient.get(`/api/users/${id}`);
};

/**
 * Create new user
 * @param {Object} data - User data
 * @returns {Promise} API response
 */
export const createUser = (data) => {
  console.log('Calling createUser API with data:', data);
  return axiosClient.post(`/api/auth/register`, data);
};

/**
 * Update user by ID (Admin only)
 * @param {string} id - User ID
 * @param {Object} userData - User data
 * @returns {Promise} API response
 */
export const updateUser = (id, userData) => {
  console.log('Calling updateUser API with ID:', id, 'data:', userData);
  return axiosClient.patch(`/api/users/${id}`, userData);
};

/**
 * Delete user by ID (Admin only)
 * @param {string} id - User ID
 * @returns {Promise} API response
 */
export const deleteUser = (id) => {
  console.log('Calling deleteUser API with ID:', id);
  return axiosClient.delete(`/api/users/${id}`);
};

/**
 * Reset user password by ID (Admin only)
 * @param {string} id - User ID
 * @returns {Promise} API response
 */
export const resetUserPassword = (id) => {
  console.log('Calling resetUserPassword API with ID:', id);
  return axiosClient.put(`/api/users/reset-password/${id}`);
};

/**
 * Search users by name or email (Admin only)
 * @param {string} content - Search content
 * @returns {Promise} API response
 */
export const searchUsers = (content) => {
  console.log('Calling searchUsers API with content:', content);
  return axiosClient.post('/api/users/search', { 
    content 
  });
};

/**
 * Filter users by criteria (Admin only)
 * @param {Object} filters - { system_role, status, gender }
 * @returns {Promise} API response
 */
export const filterUsers = (filters) => {
  console.log('Calling filterUsers API with filters:', filters);
  return axiosClient.post('/api/users/filter', filters);
};

// Legacy functions for backward compatibility
export const toggleUserStatus = (id, active) =>
  axiosClient.patch(`/api/users/${id}/status`, { active });
export const bulkUserAction = (userIds, action) =>
  axiosClient.post(`/api/users/bulk-action`, { userIds, action });

// ==================== API KEYS ====================
export const getApiKeys = (params = {}) => axiosClient.get(`/api/keys`, { params });
export const getApiKeyById = (id) => axiosClient.get(`/api/keys/${id}`);
export const createApiKey = (data) => axiosClient.post(`/api/keys`, data);
export const updateApiKey = (id, data) => axiosClient.patch(`/api/keys/${id}`, data);
export const deleteApiKey = (id) => axiosClient.delete(`/api/keys/${id}`);
export const toggleApiKeyStatus = (id, active) =>
  axiosClient.patch(`/api/api-keys/${id}/status`, { active });
export const testApiKey = (id) => axiosClient.post(`/api/api-keys/${id}/test`);
export const bulkApiKeyAction = (ids, action) =>
  axiosClient.post(`/api/api-keys/bulk-action`, { apiKeyIds: ids, action });

// ==================== PROJECTS ====================
export const getProjects = (params = {}) =>
  axiosClient.get(`/api/projects/myproject`, { params });
export const getProjectById = (id) => axiosClient.get(`/api/projects/${id}`);
export const deleteProject = (id) => axiosClient.delete(`/api/projects/${id}`);

// ==================== SYSTEM ====================
export const getSystemInfo = () => axiosClient.get(`/api/admin/system/info`);
export const getSystemLogs = (params = {}) => axiosClient.get(`/api/admin/system/logs`, { params });

// ==================== EXPORT DEFAULT ====================
export default {
  getDashboardStats,
  getRecentActivities,
  // User Profile Management
  updateProfile,
  changePassword,
  changeEmail,
  // Admin User Management
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  searchUsers,
  filterUsers,
  toggleUserStatus,
  bulkUserAction,
  getApiKeys,
  getApiKeyById,
  createApiKey,
  updateApiKey,
  deleteApiKey,
  toggleApiKeyStatus,
  testApiKey,
  bulkApiKeyAction,
  getProjects,
  getProjectById,
  deleteProject,
  getSystemInfo,
  getSystemLogs,
};
