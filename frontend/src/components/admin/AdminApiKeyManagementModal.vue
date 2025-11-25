<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content extra-large">
      <div class="modal-header">
        <h3><span class="material-symbols-outlined">key</span> Quản lý API Keys</h3>
        <div class="header-actions">
          <div class="search-box">
            <span class="material-symbols-outlined">search</span>
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Tìm kiếm API Key..."
              class="search-input"
            />
          </div>
          <button class="btn btn-primary" @click="showAddApiKeyModal = true">
            <span class="material-symbols-outlined">add</span>
            Thêm API Key
          </button>
          <button class="close-btn" @click="$emit('close')">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <div class="modal-body">
        <!-- Filters -->
        <div class="filters-section">
          <div class="filter-group">
            <label>Nhà cung cấp:</label>
            <select v-model="filters.provider" class="filter-select">
              <option value="all">Tất cả</option>
              <option value="gemini">Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="claude">Claude</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Trạng thái:</label>
            <select v-model="filters.status" class="filter-select">
              <option value="all">Tất cả</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Ngừng hoạt động</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Sắp xếp:</label>
            <select v-model="filters.sortBy" class="filter-select">
              <option value="created_at">Ngày tạo</option>
              <option value="last_used">Sử dụng cuối</option>
              <option value="usage">Lượt sử dụng</option>
            </select>
          </div>
          <button class="btn btn-secondary" @click="resetFilters">
            <span class="material-symbols-outlined">refresh</span>
            Đặt lại
          </button>
        </div>

        <!-- API Keys Grid -->
        <div class="api-keys-grid">
          <div
            v-for="apiKey in filteredApiKeys"
            :key="apiKey.id"
            class="api-key-card"
            :class="{ inactive: !apiKey.is_active }"
          >
            <div class="card-header">
              <div class="provider-info">
                <div class="provider-logo" :class="apiKey.provider">
                  <span class="material-symbols-outlined">key</span>
                </div>
                <div class="provider-details">
                  <h4>{{ getProviderDisplay(apiKey.provider) }}</h4>
                  <p class="key-name">{{ apiKey.display_name || 'Không có tên' }}</p>
                </div>
              </div>
              <div class="card-actions">
                <button
                  class="btn-icon"
                  @click="toggleApiKeyStatus(apiKey)"
                  :title="apiKey.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'"
                >
                  <span class="material-symbols-outlined" :class="{ active: apiKey.is_active }">
                    {{ apiKey.is_active ? 'toggle_on' : 'toggle_off' }}
                  </span>
                </button>
                <button class="btn-icon" @click="editApiKey(apiKey)" title="Chỉnh sửa">
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <button class="btn-icon danger" @click="deleteApiKey(apiKey)" title="Xóa">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>

            <div class="card-body">
              <div class="key-preview">
                <code class="key-value">{{ maskApiKey(apiKey.key_value) }}</code>
                <button class="btn-copy" @click="copyApiKey(apiKey)" title="Sao chép">
                  <span class="material-symbols-outlined">content_copy</span>
                </button>
              </div>

              <div class="key-stats">
                <div class="stat-item">
                  <span class="stat-label">Sử dụng</span>
                  <span class="stat-value">{{ apiKey.usage_count || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Hạn sử dụng</span>
                  <span class="stat-value">{{ formatExpiry(apiKey.expires_at) }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Ưu tiên</span>
                  <span class="stat-value priority" :class="apiKey.priority">
                    {{ getPriorityDisplay(apiKey.priority) }}
                  </span>
                </div>
              </div>

              <div class="key-meta">
                <div class="meta-item">
                  <span class="material-symbols-outlined">person</span>
                  <span>{{ apiKey.created_by_name || 'System' }}</span>
                </div>
                <div class="meta-item">
                  <span class="material-symbols-outlined">schedule</span>
                  <span>{{ formatDate(apiKey.created_at) }}</span>
                </div>
                <div class="meta-item" v-if="apiKey.last_used">
                  <span class="material-symbols-outlined">update</span>
                  <span>{{ formatLastUsed(apiKey.last_used) }}</span>
                </div>
              </div>

              <div class="key-limits">
                <div class="limit-item">
                  <span class="limit-label">Giới hạn/ngày:</span>
                  <span class="limit-value">{{ apiKey.daily_limit || 'Không giới hạn' }}</span>
                </div>
                <div class="limit-item">
                  <span class="limit-label">Rate limit:</span>
                  <span class="limit-value">{{ apiKey.rate_limit || 60 }}/phút</span>
                </div>
              </div>

              <div class="key-description" v-if="apiKey.description">
                <p>{{ apiKey.description }}</p>
              </div>
            </div>

            <div class="card-footer">
              <div class="status-indicator" :class="{ active: apiKey.is_active }">
                <div class="status-dot"></div>
                <span class="status-text">{{
                  apiKey.is_active ? 'Đang hoạt động' : 'Ngừng hoạt động'
                }}</span>
              </div>
              <div class="usage-indicator">
                <div class="usage-bar">
                  <div
                    class="usage-fill"
                    :style="{ width: getUsagePercentage(apiKey) + '%' }"
                    :class="getUsageLevel(apiKey)"
                  ></div>
                </div>
                <span class="usage-text">{{ getUsagePercentage(apiKey) }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredApiKeys.length === 0" class="empty-state">
          <span class="material-symbols-outlined">key_off</span>
          <h4>Không tìm thấy API Key</h4>
          <p>Không có API Key nào phù hợp với tiêu chí tìm kiếm của bạn.</p>
          <button class="btn btn-primary" @click="resetFilters">
            <span class="material-symbols-outlined">refresh</span>
            Đặt lại bộ lọc
          </button>
        </div>

        <!-- Pagination -->
        <div v-if="filteredApiKeys.length > 0" class="pagination-section">
          <div class="pagination-info">Hiển thị {{ filteredApiKeys.length }} API Key</div>
        </div>
      </div>
    </div>

    <!-- Add API Key Modal -->
    <AdminAddApiKeyModal
      v-if="showAddApiKeyModal"
      @add="handleAddApiKey"
      @close="showAddApiKeyModal = false"
    />

    <!-- Edit API Key Modal -->
    <AdminEditApiKeyModal
      v-if="showEditApiKeyModal"
      :apiKey="editingApiKey"
      @save="handleUpdateApiKey"
      @close="showEditApiKeyModal = false"
    />

    <!-- Delete Confirmation Modal -->
    <AdminConfirmModal
      v-if="showDeleteModal"
      title="Xóa API Key"
      :message="`Bạn có chắc chắn muốn xóa API Key ${
        deletingApiKey?.display_name || 'này'
      }? Hành động này không thể hoàn tác.`"
      confirm-text="Xóa"
      cancel-text="Hủy"
      type="danger"
      @confirm="confirmDeleteApiKey"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import AdminAddApiKeyModal from './AdminAddApiKeyModal.vue'
// import AdminEditApiKeyModal from './AdminEditApiKeyModal.vue'
import AdminConfirmModal from './AdminConfirmModal.vue'
import AdminEditApiKeyModal from './AdminEditApiKeyModal.vue'
import axiosClient from '@/utils/axiosClient'
import { useToast } from 'vue-toastification'

const toast = useToast()
// Modal states
const showAddApiKeyModal = ref(false)
const showEditApiKeyModal = ref(false)
const showDeleteModal = ref(false)

// Data
const apiKeys = ref([])
const editingApiKey = ref(null)
const deletingApiKey = ref(null)

const searchQuery = ref('')
const filters = reactive({
  provider: 'all',
  status: 'all',
  sortBy: 'created_at',
})


// Computed
const filteredApiKeys = computed(() => {
  let filtered = apiKeys.value.filter((apiKey) => {
    const matchesSearch =
      apiKey.display_name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      apiKey.key_value?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      apiKey.description?.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesProvider = filters.provider === 'all' || apiKey.provider === filters.provider
    const matchesStatus =
      filters.status === 'all' ||
      (filters.status === 'active' && apiKey.is_active) ||
      (filters.status === 'inactive' && !apiKey.is_active)

    return matchesSearch && matchesProvider && matchesStatus
  })

  // Sort
  filtered.sort((a, b) => {
    switch (filters.sortBy) {
      case 'last_used':
        return new Date(b.last_used || 0) - new Date(a.last_used || 0)
      case 'usage':
        return (b.usage_count || 0) - (a.usage_count || 0)
      default:
        return new Date(b.created_at) - new Date(a.created_at)
    }
  })

  return filtered
})

// Methods
const loadApiKeys = async () => {
  try {
    const res = await axiosClient.get('/api/keys')
    if (res.data && res.data.status === 'Success') {
      apiKeys.value = res.data.data.map((item) => ({
        id: item.id,
        key_value: item.key_value,
        provider: item.provider,
        is_active: item.is_active,
        created_by: item.created_by,
        created_at: new Date(item.createAt),
        updated_at: new Date(item.updatedAt),
        // các field không có từ backend thì để mặc định
        display_name: item.display_name || '(Không có tên)',
        usage_count: item.usage_count || 0,
        daily_limit: item.daily_limit || null,
        rate_limit: item.rate_limit || null,
        priority: item.priority || 'medium',
        description: item.description || '',
        expires_at: item.expires_at || null,
        created_by_name: item.created_by_name || 'System',
        last_used: item.last_used || null,
      }))
      console.log('✅ API Keys loaded:', apiKeys.value)
    } else {
      console.error('❌ Failed to load API keys:', res.data)
      toast.error('Không thể tải danh sách API Key')
    }
  } catch (error) {
    console.error('❌ Error loading API keys:', error)
    toast.error('Lỗi khi tải danh sách API Key')
  }
}

const toggleApiKeyStatus = async (apiKey) => {
  const oldStatus = apiKey.is_active
  apiKey.is_active = !apiKey.is_active

  try {
    const res = await axiosClient.patch(`/api/keys/${apiKey.id}`, {
      is_active: apiKey.is_active,
    })

    if (res.data && res.data.status === 'Success') {
      toast.success(
        apiKey.is_active
          ? 'API Key đã được kích hoạt '
          : 'API Key đã bị vô hiệu hóa '
      )
    } else {
      // Nếu API trả lỗi thì khôi phục trạng thái cũ
      apiKey.is_active = oldStatus
      toast.error('Không thể cập nhật trạng thái API Key')
      console.error('❌ Response:', res.data)
    }
  } catch (error) {
    // Nếu lỗi mạng/API → khôi phục trạng thái cũ
    apiKey.is_active = oldStatus
    console.error('❌ Lỗi khi cập nhật trạng thái API Key:', error)
    toast.error('Đã xảy ra lỗi khi thay đổi trạng thái')
  }
}

const editApiKey = (apiKey) => {
  editingApiKey.value = { ...apiKey }
  showEditApiKeyModal.value = true
}

const deleteApiKey = (apiKey) => {
  deletingApiKey.value = apiKey
  showDeleteModal.value = true
}

const confirmDeleteApiKey = async () => {
  if (!deletingApiKey.value) return
  try {
    const id = deletingApiKey.value.id
    const res = await axiosClient.delete(`/api/keys/${id}`)
    if (res.data && res.data.status === 'Success') {
      apiKeys.value = apiKeys.value.filter((key) => key.id !== id)
      toast.success('Đã xóa API Key thành công')
    } else {
      toast.error('Không thể xóa API Key')
    }
  } catch (error) {
    console.error('❌ Error deleting API key:', error)
    toast.error('Lỗi khi xóa API Key')
  } finally {
    showDeleteModal.value = false
    deletingApiKey.value = null
  }
}

const handleAddApiKey = (apiKeyData) => {
  const newApiKey = {
    id: Date.now().toString(),
    ...apiKeyData,
    usage_count: 0,
    last_used: null,
    created_at: new Date(),
    created_by_name: 'Current User',
  }
  apiKeys.value.unshift(newApiKey)
  showAddApiKeyModal.value = false
}

const handleUpdateApiKey = (apiKeyData) => {
  const index = apiKeys.value.findIndex((key) => key.id === apiKeyData.id)
  if (index > -1) {
    apiKeys.value[index] = { ...apiKeys.value[index], ...apiKeyData }
  }
  showEditApiKeyModal.value = false
}

const copyApiKey = async (apiKey) => {
  try {
    await navigator.clipboard.writeText(apiKey.key_value)
    // Show success message
    console.log('API Key copied to clipboard')
  } catch (err) {
    console.error('Failed to copy API Key:', err)
  }
}

const maskApiKey = (key) => {
  if (!key) return ''
  const visibleChars = 8
  return key.substring(0, visibleChars) + '*'.repeat(key.length - visibleChars)
}

const getProviderDisplay = (provider) => {
  const providers = {
    gemini: 'Google Gemini',
    openai: 'OpenAI',
    claude: 'Anthropic Claude',
  }
  return providers[provider] || provider
}

const getPriorityDisplay = (priority) => {
  const priorities = {
    high: 'Cao',
    medium: 'Trung bình',
    low: 'Thấp',
  }
  return priorities[priority] || priority
}

const formatExpiry = (date) => {
  if (!date) return 'Không hạn'
  const expiryDate = new Date(date)
  const today = new Date()
  const diffTime = expiryDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'Đã hết hạn'
  if (diffDays === 0) return 'Hết hạn hôm nay'
  if (diffDays === 1) return '1 ngày nữa'
  if (diffDays < 30) return `${diffDays} ngày nữa`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} tháng nữa`
  return `${Math.floor(diffDays / 365)} năm nữa`
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('vi-VN')
}

const formatLastUsed = (date) => {
  if (!date) return 'Chưa sử dụng'
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  if (hours < 24) return `${hours} giờ trước`
  return `${days} ngày trước`
}

const getUsagePercentage = (apiKey) => {
  if (!apiKey.daily_limit) return 0
  return Math.min(Math.round((apiKey.usage_count / apiKey.daily_limit) * 100), 100)
}

const getUsageLevel = (apiKey) => {
  const percentage = getUsagePercentage(apiKey)
  if (percentage >= 90) return 'high'
  if (percentage >= 70) return 'medium'
  return 'low'
}

const resetFilters = () => {
  searchQuery.value = ''
  filters.provider = 'all'
  filters.status = 'all'
  filters.sortBy = 'created_at'
}

onMounted(() => {
  loadApiKeys()
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content.extra-large {
  max-width: 1200px;
  width: 95%;
  max-height: 90vh;
  background: white;
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.modal-header h3 {
  margin: 0;
  color: #1a365d;
  font-size: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  justify-content: flex-end;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 300px;
}

.search-box .material-symbols-outlined {
  position: absolute;
  left: 12px;
  color: #718096;
  font-size: 20px;
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 40px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

.close-btn {
  background: none;
  border: none;
  color: #718096;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #f7fafc;
  color: #1a365d;
}

.modal-body {
  padding: 0;
  display: flex;
  flex-direction: column;
  height: calc(90vh - 90px);
}

.filters-section {
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  background: #f7fafc;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
  white-space: nowrap;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  min-width: 120px;
}

.api-keys-grid {
  flex: 1;
  overflow: auto;
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  align-content: start;
}

.api-key-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
}

.api-key-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.api-key-card.inactive {
  opacity: 0.7;
  background: #f7fafc;
}

.card-header {
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.provider-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
}

.provider-logo {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.provider-logo.gemini {
  background: linear-gradient(135deg, #1a73e8, #34a853);
  color: white;
}

.provider-logo.openai {
  background: linear-gradient(135deg, #412e89, #8b5cf6);
  color: white;
}

.provider-logo.claude {
  background: linear-gradient(135deg, #ff6b35, #ff8e53);
  color: white;
}

.provider-details h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1a365d;
}

.key-name {
  margin: 0;
  font-size: 14px;
  color: #718096;
}

.card-actions {
  display: flex;
  gap: 4px;
}

.btn-icon {
  background: none;
  border: none;
  color: #718096;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: #edf2f7;
  color: #1a365d;
}

.btn-icon.danger:hover {
  background: #fed7d7;
  color: #c53030;
}

.btn-icon .material-symbols-outlined.active {
  color: #38a169;
}

.card-body {
  padding: 16px;
}

.key-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f7fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.key-value {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #4a5568;
  word-break: break-all;
}

.btn-copy {
  background: none;
  border: none;
  color: #718096;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-copy:hover {
  background: #edf2f7;
  color: #1a365d;
}

.key-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-label {
  font-size: 11px;
  color: #718096;
  margin-bottom: 2px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #1a365d;
}

.stat-value.priority.high {
  color: #e53e3e;
}

.stat-value.priority.medium {
  color: #ed8936;
}

.stat-value.priority.low {
  color: #38a169;
}

.key-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f7fafc;
  border-radius: 6px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #718096;
}

.meta-item .material-symbols-outlined {
  font-size: 14px;
  width: 16px;
}

.key-limits {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.limit-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.limit-label {
  color: #718096;
}

.limit-value {
  color: #4a5568;
  font-weight: 500;
}

.key-description {
  padding: 12px;
  background: #fffaf0;
  border: 1px solid #fed7d7;
  border-radius: 6px;
  margin-top: 12px;
}

.key-description p {
  margin: 0;
  font-size: 13px;
  color: #744210;
  line-height: 1.4;
}

.card-footer {
  padding: 12px 16px;
  border-top: 1px solid #e2e8f0;
  background: #f7fafc;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e53e3e;
}

.status-indicator.active .status-dot {
  background: #38a169;
}

.status-text {
  font-size: 12px;
  color: #718096;
  font-weight: 500;
}

.usage-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.usage-bar {
  width: 60px;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.usage-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.usage-fill.low {
  background: #38a169;
}

.usage-fill.medium {
  background: #ed8936;
}

.usage-fill.high {
  background: #e53e3e;
}

.usage-text {
  font-size: 11px;
  color: #718096;
  font-weight: 600;
  min-width: 30px;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: #718096;
  grid-column: 1 / -1;
}

.empty-state .material-symbols-outlined {
  font-size: 64px;
  color: #cbd5e0;
  margin-bottom: 16px;
}

.empty-state h4 {
  font-size: 18px;
  font-weight: 600;
  color: #4a5568;
  margin: 0 0 8px 0;
}

.empty-state p {
  margin: 0 0 20px 0;
}

.pagination-section {
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f7fafc;
}

.pagination-info {
  font-size: 14px;
  color: #718096;
  text-align: center;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.btn-primary {
  background: #1a365d;
  color: white;
}

.btn-primary:hover {
  background: #2d3748;
}

.btn-secondary {
  background: #f7fafc;
  color: #374151;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  background: #edf2f7;
}

@media (max-width: 768px) {
  .modal-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .header-actions {
    justify-content: space-between;
  }

  .filters-section {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    justify-content: space-between;
  }

  .api-keys-grid {
    grid-template-columns: 1fr;
    padding: 16px;
  }

  .key-stats {
    grid-template-columns: 1fr;
  }

  .key-limits {
    grid-template-columns: 1fr;
  }

  .card-footer {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }

  .usage-indicator {
    justify-content: space-between;
  }
}
</style>