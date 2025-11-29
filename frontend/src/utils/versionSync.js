/**
 * Utility để đồng bộ version selection giữa các trang
 * Lưu selectedVersionId vào localStorage theo projectId
 * Chỉ Owner mới được phép select version
 */

const STORAGE_KEY_PREFIX = 'selected_version_'

/**
 * Lưu selected version cho project
 * @param {string} projectId - ID của project
 * @param {string} versionId - ID của version được chọn
 */
export function saveSelectedVersion(projectId, versionId) {
  if (!projectId || !versionId) return
  try {
    const key = `${STORAGE_KEY_PREFIX}${projectId}`
    localStorage.setItem(key, versionId)
    console.log('💾 Saved selected version:', { projectId, versionId })
  } catch (error) {
    console.error('Error saving selected version:', error)
  }
}

/**
 * Lấy selected version cho project
 * @param {string} projectId - ID của project
 * @returns {string|null} - ID của version được chọn hoặc null
 */
export function getSelectedVersion(projectId) {
  if (!projectId) return null
  try {
    const key = `${STORAGE_KEY_PREFIX}${projectId}`
    return localStorage.getItem(key)
  } catch (error) {
    console.error('Error getting selected version:', error)
    return null
  }
}

/**
 * Xóa selected version cho project
 * @param {string} projectId - ID của project
 */
export function clearSelectedVersion(projectId) {
  if (!projectId) return
  try {
    const key = `${STORAGE_KEY_PREFIX}${projectId}`
    localStorage.removeItem(key)
    console.log('🗑️ Cleared selected version for project:', projectId)
  } catch (error) {
    console.error('Error clearing selected version:', error)
  }
}

/**
 * Kiểm tra user có phải là Owner không
 * @param {Object} project - Project object
 * @returns {boolean}
 */
export function isOwner(project) {
  if (!project) return false
  const currentUserId = localStorage.getItem('userId')
  if (!currentUserId) return false

  const ownerId = project.owner_id?._id || project.owner_id
  if (!ownerId) return false

  return ownerId.toString() === currentUserId.toString()
}

/**
 * Lọc bỏ các version tạm thời (chưa được approve)
 * @param {Array} versions - Danh sách versions
 * @returns {Array} - Danh sách versions đã được approve
 */
export function filterApprovedVersions(versions) {
  if (!versions || versions.length === 0) return []
  
  // Chỉ lấy các version đã được approve (version_temporary = false hoặc không có field này)
  return versions.filter((v) => v.version_temporary === false || v.version_temporary === undefined)
}

/**
 * Lấy selected version hoặc version mặc định (chỉ từ các version đã được approve)
 * @param {string} projectId - ID của project
 * @param {Array} versions - Danh sách versions (có thể bao gồm version tạm thời)
 * @param {string} currentVersionId - ID của current version từ backend
 * @returns {string|null} - ID của version được chọn
 */
export function getSelectedOrDefaultVersion(projectId, versions, currentVersionId) {
  if (!versions || versions.length === 0) return null

  // Lọc bỏ version tạm thời
  const approvedVersions = filterApprovedVersions(versions)
  if (approvedVersions.length === 0) return null

  // Ưu tiên: saved version > current version > first approved version
  const savedVersionId = getSelectedVersion(projectId)
  if (savedVersionId) {
    const savedVersion = approvedVersions.find((v) => v._id === savedVersionId)
    if (savedVersion) {
      return savedVersionId
    }
  }

  if (currentVersionId) {
    const currentVersion = approvedVersions.find((v) => v._id === currentVersionId)
    if (currentVersion) {
      return currentVersionId
    }
  }

  return approvedVersions[0]?._id || null
}

