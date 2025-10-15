<template>
  <div class="api-keys-management">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1>Quản lý API Keys</h1>
        <p>Tổng cộng {{ totalApiKeys }} API keys</p>
      </div>
      <div class="header-right">
        <button class="btn btn-primary" @click="showAddApiKeyModal = true">
          <i class="fas fa-plus"></i>
          Thêm API Key
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-card">
      <div class="filters">
        <div class="filter-group">
          <label>Nhà cung cấp</label>
          <select v-model="filters.provider" @change="applyFilters">
            <option value="">Tất cả nhà cung cấp</option>
            <option value="gemini">Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="claude">Claude</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Trạng thái</label>
          <select v-model="filters.status" @change="applyFilters">
            <option value="">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Không hoạt động</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Tìm kiếm</label>
          <input
            type="text"
            v-model="filters.search"
            @input="applyFilters"
            placeholder="Tìm theo tên, key..."
            class="search-input"
          />
        </div>
        <button class="btn btn-secondary" @click="resetFilters">
          <span class="material-symbols-outlined"> filter_list_off </span>
          Xóa bộ lọc
        </button>
      </div>
    </div>

    <!-- API Keys Table -->
    <div class="table-card">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
              </th>
              <th>API Key</th>
              <th>Nhà cung cấp</th>
              <th>Người tạo</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Lần sử dụng cuối</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="apiKey in filteredApiKeys"
              :key="apiKey.id"
              :class="{ selected: selectedApiKeys.includes(apiKey.id) }"
            >
              <td>
                <input type="checkbox" v-model="selectedApiKeys" :value="apiKey.id" />
              </td>
              <td>
                <div class="key-cell">
                  <code class="api-key">{{ maskApiKey(apiKey.key) }}</code>
                  <button
                    class="copy-btn"
                    @click="copyApiKey(apiKey.key)"
                    title="Copy key"
                  >
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
              </td>
              <td>
                <div class="provider-cell">
                  <span class="provider-icon" :class="getProviderClass(apiKey.provider)">
                    <i :class="getProviderIcon(apiKey.provider)"></i>
                  </span>
                  <span class="provider-name">{{ apiKey.provider }}</span>
                </div>
              </td>
              <td>
                <div class="creator-cell">
                  <div class="creator-avatar">{{ apiKey.creator.charAt(0) }}</div>
                  <span>{{ apiKey.creator }}</span>
                </div>
              </td>
              <td>
                <div class="status-cell">
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      :checked="apiKey.active"
                      @change="toggleApiKey(apiKey)"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                  <span class="status-text">{{
                    apiKey.active ? "Hoạt động" : "Không hoạt động"
                  }}</span>
                </div>
              </td>
              <td>{{ formatDate(apiKey.createdAt) }}</td>
              <td>{{ formatDate(apiKey.lastUsed) }}</td>
              <td>
                <div class="action-buttons">
                  <button
                    class="action-btn blue"
                    @click="viewApiKey(apiKey)"
                    title="Xem chi tiết"
                  >
                    <i class="fas fa-eye"></i>
                  </button>
                  <button
                    class="action-btn green"
                    @click="editApiKey(apiKey)"
                    title="Chỉnh sửa"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    class="action-btn orange"
                    @click="testApiKey(apiKey)"
                    title="Test key"
                  >
                    <i class="fas fa-vial"></i>
                  </button>
                  <button
                    class="action-btn red"
                    @click="deleteApiKey(apiKey)"
                    title="Xóa"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination">
        <div class="pagination-info">
          Hiển thị {{ (currentPage - 1) * itemsPerPage + 1 }} -
          {{ Math.min(currentPage * itemsPerPage, totalApiKeys) }} trong tổng số
          {{ totalApiKeys }} API keys
        </div>
        <div class="pagination-controls">
          <button
            class="btn btn-secondary"
            @click="previousPage"
            :disabled="currentPage === 1"
          >
            <span class="material-symbols-outlined"> arrow_back_ios </span>
          </button>
          <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
          <button
            class="btn btn-secondary"
            @click="nextPage"
            :disabled="currentPage === totalPages"
          >
            <span class="material-symbols-outlined"> arrow_forward_ios </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Actions -->
    <div v-if="selectedApiKeys.length > 0" class="bulk-actions">
      <div class="bulk-info">Đã chọn {{ selectedApiKeys.length }} API keys</div>
      <div class="bulk-buttons">
        <button class="btn btn-secondary" @click="bulkActivate">
          <i class="fas fa-check"></i>
          Kích hoạt
        </button>
        <button class="btn btn-secondary" @click="bulkDeactivate">
          <i class="fas fa-times"></i>
          Vô hiệu hóa
        </button>
        <button class="btn btn-danger" @click="bulkDelete">
          <i class="fas fa-trash"></i>
          Xóa
        </button>
      </div>
    </div>

    <!-- Add API Key Modal -->
    <div
      v-if="showAddApiKeyModal"
      class="modal-overlay"
      @click.self="showAddApiKeyModal = false"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h2>Thêm API Key mới</h2>
          <button class="close-btn" @click="showAddApiKeyModal = false">&times;</button>
        </div>
        <form @submit.prevent="addApiKey" class="modal-body">
          <div class="form-group">
            <label>API Key *</label>
            <input
              type="text"
              v-model="newApiKey.key"
              required
              class="form-input"
              placeholder="Nhập API key..."
            />
            <small class="form-help">API key sẽ được mã hóa và lưu trữ an toàn</small>
          </div>
          <div class="form-group">
            <label>Nhà cung cấp *</label>
            <select v-model="newApiKey.provider" required class="form-input">
              <option value="">Chọn nhà cung cấp</option>
              <option value="gemini">Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="claude">Claude</option>
            </select>
          </div>
          <div class="form-group">
            <label>Tên hiển thị</label>
            <input
              type="text"
              v-model="newApiKey.name"
              class="form-input"
              placeholder="Tên dễ nhớ cho API key..."
            />
          </div>
          <div class="form-group">
            <label>Mô tả</label>
            <textarea
              v-model="newApiKey.description"
              class="form-input"
              rows="3"
              placeholder="Mô tả về API key này..."
            ></textarea>
          </div>
          <div class="form-group">
            <label>Trạng thái</label>
            <select v-model="newApiKey.active" class="form-input">
              <option :value="true">Hoạt động</option>
              <option :value="false">Không hoạt động</option>
            </select>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="showAddApiKeyModal = false"
            >
              Hủy
            </button>
            <button type="submit" class="btn btn-primary">Thêm API Key</button>
          </div>
        </form>
      </div>
    </div>

    <!-- API Key Detail Modal -->
    <div
      v-if="showApiKeyDetailModal"
      class="modal-overlay"
      @click.self="showApiKeyDetailModal = false"
    >
      <div class="modal-content large">
        <div class="modal-header">
          <h2>Chi tiết API Key</h2>
          <button class="close-btn" @click="showApiKeyDetailModal = false">
            &times;
          </button>
        </div>
        <div class="modal-body" v-if="selectedApiKey">
          <div class="api-key-detail-grid">
            <div class="detail-section">
              <h3>Thông tin cơ bản</h3>
              <div class="detail-item">
                <label>API Key:</label>
                <div class="key-display">
                  <code>{{ maskApiKey(selectedApiKey.key) }}</code>
                  <button class="copy-btn" @click="copyApiKey(selectedApiKey.key)">
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
              </div>
              <div class="detail-item">
                <label>Nhà cung cấp:</label>
                <div class="provider-info">
                  <span
                    class="provider-icon"
                    :class="getProviderClass(selectedApiKey.provider)"
                  >
                    <i :class="getProviderIcon(selectedApiKey.provider)"></i>
                  </span>
                  <span>{{ selectedApiKey.provider }}</span>
                </div>
              </div>
              <div class="detail-item">
                <label>Trạng thái:</label>
                <div class="status-info">
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      :checked="selectedApiKey.active"
                      @change="toggleApiKey(selectedApiKey)"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                  <span>{{
                    selectedApiKey.active ? "Hoạt động" : "Không hoạt động"
                  }}</span>
                </div>
              </div>
            </div>
            <div class="detail-section">
              <h3>Thông tin hệ thống</h3>
              <div class="detail-item">
                <label>Người tạo:</label>
                <span>{{ selectedApiKey.creator }}</span>
              </div>
              <div class="detail-item">
                <label>Ngày tạo:</label>
                <span>{{ formatDate(selectedApiKey.createdAt) }}</span>
              </div>
              <div class="detail-item">
                <label>Lần sử dụng cuối:</label>
                <span>{{ formatDate(selectedApiKey.lastUsed) }}</span>
              </div>
              <div class="detail-item">
                <label>Số lần sử dụng:</label>
                <span>{{ selectedApiKey.usageCount || 0 }}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showApiKeyDetailModal = false">
              Đóng
            </button>
            <button class="btn btn-primary" @click="editApiKey(selectedApiKey)">
              Chỉnh sửa
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
// NOTE: API Keys APIs cần từ BE:
// GET /api/admin/api-keys, GET /api/admin/api-keys/:id, POST /api/admin/api-keys,
// PUT /api/admin/api-keys/:id, DELETE /api/admin/api-keys/:id,
// PATCH /api/admin/api-keys/:id/status, POST /api/admin/api-keys/:id/test,
// POST /api/admin/api-keys/bulk-action
import {
  getApiKeys,
  createApiKey,
  updateApiKey,
  deleteApiKey as apiDeleteApiKey,
  toggleApiKeyStatus,
  testApiKey as apiTestApiKey,
  bulkApiKeyAction,
} from "@/api/admin";

// State
const showAddApiKeyModal = ref(false);
const showApiKeyDetailModal = ref(false);
const selectedApiKey = ref(null);
const selectedApiKeys = ref([]);
const selectAll = ref(false);
const currentPage = ref(1);
const itemsPerPage = ref(10);

const filters = ref({
  provider: "",
  status: "",
  search: "",
});

const newApiKey = ref({
  key: "",
  provider: "",
  name: "",
  description: "",
  active: true,
});

const apiKeys = ref([]);

// Computed
const totalApiKeys = computed(() => apiKeys.value.length);

const filteredApiKeys = computed(() => {
  let result = apiKeys.value;

  if (filters.value.provider) {
    result = result.filter(
      (apiKey) => apiKey.provider.toLowerCase() === filters.value.provider
    );
  }

  if (filters.value.status) {
    const isActive = filters.value.status === "active";
    result = result.filter((apiKey) => apiKey.active === isActive);
  }

  if (filters.value.search) {
    const search = filters.value.search.toLowerCase();
    result = result.filter(
      (apiKey) =>
        apiKey.name?.toLowerCase().includes(search) ||
        apiKey.key.toLowerCase().includes(search) ||
        apiKey.creator.toLowerCase().includes(search)
    );
  }

  return result;
});

const totalPages = computed(() =>
  Math.ceil(filteredApiKeys.value.length / itemsPerPage.value)
);

// Methods
const applyFilters = () => {
  currentPage.value = 1;
};

const resetFilters = () => {
  filters.value = {
    provider: "",
    status: "",
    search: "",
  };
  currentPage.value = 1;
};

const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedApiKeys.value = filteredApiKeys.value.map((apiKey) => apiKey.id);
  } else {
    selectedApiKeys.value = [];
  }
};

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const maskApiKey = (key) => {
  if (!key) return "";
  if (key.length <= 8) return key;
  return key.substring(0, 8) + "***" + key.substring(key.length - 4);
};

const copyApiKey = async (key) => {
  try {
    await navigator.clipboard.writeText(key);
    // TODO: Show success notification
    console.log("API key copied to clipboard");
  } catch (err) {
    console.error("Failed to copy API key:", err);
  }
};

const getProviderClass = (provider) => {
  const classes = {
    OpenAI: "provider-openai",
    Claude: "provider-claude",
    Gemini: "provider-gemini",
  };
  return classes[provider] || "provider-default";
};

const getProviderIcon = (provider) => {
  const icons = {
    OpenAI: "fas fa-robot",
    Claude: "fas fa-brain",
    Gemini: "fas fa-gem",
  };
  return icons[provider] || "fas fa-key";
};

const formatDate = (dateString) => {
  if (!dateString) {
    return '';
  }

  try {
    const date = new Date(dateString);
    // Kiểm tra xem date có hợp lệ không
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString("vi-VN");
  } catch (error) {
    console.error('Error formatting date:', error, 'dateString:', dateString);
    return '';
  }
};

const viewApiKey = (apiKey) => {
  selectedApiKey.value = apiKey;
  showApiKeyDetailModal.value = true;
};

const editApiKey = async (apiKey) => {
  // NOTE: PUT /api/admin/api-keys/:id
  try {
    await updateApiKey(apiKey.id, apiKey);
    await loadApiKeys();
  } catch (e) {}
};

const testApiKey = async (apiKey) => {
  // NOTE: POST /api/admin/api-keys/:id/test
  try {
    await apiTestApiKey(apiKey.id);
  } catch (e) {}
};

const deleteApiKey = async (apiKey) => {
  if (
    !confirm(
      `Bạn có chắc chắn muốn xóa API key ${apiKey.name || apiKey.key.substring(0, 8)}?`
    )
  )
    return;
  try {
    await apiDeleteApiKey(apiKey.id);
    await loadApiKeys();
  } catch (e) {}
};

const toggleApiKey = async (apiKey) => {
  // NOTE: PATCH /api/admin/api-keys/:id/status
  try {
    await toggleApiKeyStatus(apiKey.id, !apiKey.active);
    await loadApiKeys();
  } catch (e) {}
};

const addApiKey = async () => {
  // NOTE: POST /api/admin/api-keys
  try {
    await createApiKey(newApiKey.value);
    showAddApiKeyModal.value = false;
    newApiKey.value = { key: "", provider: "", name: "", description: "", active: true };
    await loadApiKeys();
  } catch (e) {}
};

const bulkActivate = async () => {
  // NOTE: POST /api/admin/api-keys/bulk-action { action: 'activate' }
  try {
    await bulkApiKeyAction(selectedApiKeys.value, "activate");
    await loadApiKeys();
  } catch (e) {}
};

const bulkDeactivate = async () => {
  // NOTE: POST /api/admin/api-keys/bulk-action { action: 'deactivate' }
  try {
    await bulkApiKeyAction(selectedApiKeys.value, "deactivate");
    await loadApiKeys();
  } catch (e) {}
};

const bulkDelete = async () => {
  if (
    !confirm(
      `Bạn có chắc chắn muốn xóa ${selectedApiKeys.value.length} API keys đã chọn?`
    )
  )
    return;
  // NOTE: POST /api/admin/api-keys/bulk-action { action: 'delete' }
  try {
    await bulkApiKeyAction(selectedApiKeys.value, "delete");
    await loadApiKeys();
  } catch (e) {}
};

const loadApiKeys = async () => {
  // NOTE: GET /api/admin/api-keys?provider=&status=&q=&page=&size=
  try {
    const res = await getApiKeys({
      provider: filters.value.provider || undefined,
      status: filters.value.status || undefined,
      q: filters.value.search || undefined,
      page: currentPage.value,
      size: itemsPerPage.value,
    });
    // Kỳ vọng schema: { items: [], total: number }
    apiKeys.value = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
  } catch (e) {
    apiKeys.value = [];
  }
};

onMounted(() => {
  loadApiKeys();
});
</script>

<style scoped>
.api-keys-management {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.header-left h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.header-left p {
  color: #64748b;
  margin: 0;
}

/* Filters */
.filters-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.filters {
  display: flex;
  gap: 20px;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 150px;
}

.filter-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.filter-group select,
.search-input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  transition: all 0.2s;
}

.filter-group select:focus,
.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-input {
  min-width: 250px;
}

/* Table */
.table-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: #f8fafc;
}

.data-table th {
  padding: 16px 20px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #e2e8f0;
}

.data-table td {
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 14px;
  color: #374151;
}

.data-table tr:hover {
  background: #f8fafc;
}

.data-table tr.selected {
  background: #dbeafe;
}

/* Key Cell */
.key-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.api-key {
  font-family: "Courier New", monospace;
  font-size: 13px;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 4px;
  color: #374151;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copy-btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: #f1f5f9;
  color: #3b82f6;
}

/* Provider Cell */
.provider-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.provider-icon {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.provider-openai {
  background: #10b981;
  color: white;
}

.provider-google {
  background: #4285f4;
  color: white;
}

.provider-claude {
  background: #ff6b35;
  color: white;
}

.provider-gemini {
  background: #8b5cf6;
  color: white;
}

.provider-azure {
  background: #0078d4;
  color: white;
}

.provider-default {
  background: #6b7280;
  color: white;
}

.provider-name {
  font-weight: 500;
  color: #374151;
}

/* Creator Cell */
.creator-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.creator-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

/* Status Cell */
.status-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #3b82f6;
}

input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.status-text {
  font-size: 12px;
  color: #64748b;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 14px;
}

.action-btn.blue {
  background: #dbeafe;
  color: #1e40af;
}

.action-btn.blue:hover {
  background: #3b82f6;
  color: white;
}

.action-btn.green {
  background: #dcfce7;
  color: #166534;
}

.action-btn.green:hover {
  background: #22c55e;
  color: white;
}

.action-btn.orange {
  background: #fed7aa;
  color: #9a3412;
}

.action-btn.orange:hover {
  background: #ea580c;
  color: white;
}

.action-btn.red {
  background: #fee2e2;
  color: #991b1b;
}

.action-btn.red:hover {
  background: #ef4444;
  color: white;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-top: 1px solid #e2e8f0;
}

.pagination-info {
  color: #64748b;
  font-size: 14px;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-info {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

/* Bulk Actions */
.bulk-actions {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 16px 24px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 20px;
  z-index: 1000;
}

.bulk-info {
  color: #374151;
  font-weight: 500;
}

.bulk-buttons {
  display: flex;
  gap: 8px;
}

/* Buttons */
.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #f1f5f9;
  color: #374151;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.large {
  max-width: 700px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #374151;
}

.modal-body {
  padding: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-help {
  font-size: 12px;
  color: #64748b;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #e2e8f0;
}

/* API Key Detail */
.api-key-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.detail-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item label {
  font-weight: 500;
  color: #64748b;
}

.detail-item span {
  color: #1e293b;
}

.key-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.provider-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Responsive */
@media (max-width: 768px) {
  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    min-width: auto;
  }

  .search-input {
    min-width: auto;
  }

  .api-key-detail-grid {
    grid-template-columns: 1fr;
  }

  .bulk-actions {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
