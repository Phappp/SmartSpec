<template>
  <div class="input-sidebar" :class="{ collapsed: isCollapsed }">
    <!-- Collapse Toggle Button -->
    <button
      class="collapse-toggle"
      @click="toggleCollapse"
      :title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
    >
      <span class="material-symbols-outlined">
        {{ isCollapsed ? 'chevron_left' : 'chevron_right' }}
      </span>
    </button>

    <div class="sidebar-content" :class="{ hidden: isCollapsed }">
      <div class="sidebar-section">
        <div class="section-header">
          <h3>
            Inputs
            <span class="counter-badge">{{ inputs.length }}</span>
          </h3>
          <button class="btn-primary" @click="$emit('add-input-click')">
            <span class="material-symbols-outlined">add</span>
            Add Input
          </button>
        </div>

        <!-- Filter Tabs - Compact in collapsed mode -->
        <div class="filter-tabs" :class="{ compact: isCollapsed }">
          <button
            v-for="filter in inputFilters"
            :key="filter.type"
            class="filter-tab"
            :class="{ active: activeFilter === filter.type }"
            @click="setActiveFilter(filter.type)"
            :title="filter.label"
          >
            <span class="material-symbols-outlined">{{ filter.icon }}</span>
            <span class="filter-label" v-if="!isCollapsed">{{ filter.label }}</span>
            <span class="filter-count" v-if="!isCollapsed">{{ getFilterCount(filter.type) }}</span>
            <span class="filter-count-badge" v-else>{{ getFilterCount(filter.type) }}</span>
          </button>
        </div>

        <div class="inputs-list">
          <div
            v-for="input in filteredInputs"
            :key="input._id"
            class="input-card"
            :class="[
              input.type,
              { expanded: expandedInputId === input._id, processed: input.is_processed },
            ]"
            @click="toggleInput(input._id)"
          >
            <div class="input-header">
              <div class="input-type-icon">
                <span class="material-symbols-outlined">{{ getTypeIcon(input.type) }}</span>
              </div>

              <div class="input-main-info" v-if="!isCollapsed">
                <h4 class="input-title">{{ getCleanText(input) }}</h4>
                <div class="input-meta">
                  <span class="quality-badge" :class="getQualityClass(input)">
                    {{ Math.round(getQualityScore(input) * 100) }}%
                  </span>
                </div>
              </div>

              <!-- Collapsed View -->
              <div class="input-collapsed" v-else>
                <span class="material-symbols-outlined mini-icon">{{
                  getTypeIcon(input.type)
                }}</span>
                <span class="status-dot" :class="{ processed: input.is_processed }"></span>
              </div>

              <div class="input-actions" v-if="!isCollapsed">
                <button
                  class="btn-icon danger"
                  @click.stop="$emit('delete-input', input._id)"
                  :disabled="isDeletingInput === input._id"
                  title="Delete input"
                >
                  <span v-if="isDeletingInput === input._id" class="button-spinner"></span>
                  <span v-else class="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>

            <!-- Expanded Details -->
            <div v-if="expandedInputId === input._id && !isCollapsed" class="input-details">
              <div class="details-grid">
                <div class="detail-item">
                  <span class="detail-label">Status</span>
                  <span class="detail-value">
                    <span class="status-badge" :class="{ processed: input.is_processed }">
                      {{ input.is_processed ? 'Processed' : 'Not Processed' }}
                    </span>
                  </span>
                </div>

                <div class="detail-item">
                  <span class="detail-label">Type</span>
                  <span class="detail-value">{{ input.type }}</span>
                </div>

                <div class="detail-item">
                  <span class="detail-label">Language</span>
                  <span class="detail-value">{{ getLanguage(input) }}</span>
                </div>

                <div class="detail-item full-width">
                  <span class="detail-label">Content</span>
                  <div class="content-preview">
                    {{ getCleanText(input, 200) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="filteredInputs.length === 0 && !isCollapsed" class="empty-state">
            <span class="material-symbols-outlined empty-icon">description</span>
            <p>No {{ activeFilter === 'all' ? '' : activeFilter }} inputs found</p>
            <button class="btn-secondary" @click="$emit('add-input-click')">
              <span class="material-symbols-outlined">add</span>
              Add Input
            </button>
          </div>

          <!-- Collapsed Empty State -->
          <div v-if="filteredInputs.length === 0 && isCollapsed" class="empty-state-collapsed">
            <span class="material-symbols-outlined">add</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Stats in Collapsed Mode -->
    <div class="collapsed-stats" v-if="isCollapsed">
      <div class="stat-item" :title="`Total inputs: ${inputs.length}`">
        <span class="material-symbols-outlined">description</span>
        <span class="stat-number">{{ inputs.length }}</span>
      </div>
      <div class="stat-item" :title="`Processed: ${processedCount}`">
        <span class="material-symbols-outlined success">check_circle</span>
        <span class="stat-number">{{ processedCount }}</span>
      </div>
      <div class="stat-item" :title="`Pending: ${pendingCount}`">
        <span class="material-symbols-outlined warning">schedule</span>
        <span class="stat-number">{{ pendingCount }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InputSidebar',
  props: {
    inputs: {
      type: Array,
      default: () => [],
    },
    isDeletingInput: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      expandedInputId: null,
      activeFilter: 'all',
      isCollapsed: false, // Default là hiển thị
      inputFilters: [
        { type: 'all', label: 'All', icon: 'apps' },
        { type: 'pdf', label: 'PDF', icon: 'picture_as_pdf' },
        { type: 'docx', label: 'DOCX', icon: 'description' },
        { type: 'image', label: 'Images', icon: 'image' },
        { type: 'audio', label: 'Audio', icon: 'audiotrack' },
        { type: 'text', label: 'Text', icon: 'text_snippet' },
      ],
    }
  },
  computed: {
    filteredInputs() {
      if (this.activeFilter === 'all') {
        return this.inputs
      }
      return this.inputs.filter((input) => input.type === this.activeFilter)
    },
    processedCount() {
      return this.inputs.filter((input) => input.is_processed).length
    },
    pendingCount() {
      return this.inputs.filter((input) => !input.is_processed).length
    },
  },
  mounted() {
    // Load trạng thái từ localStorage khi component được mount
    this.loadCollapsedState()
  },
  methods: {
    initSocketListeners() {
      if (socket) {
        socket.on('input_event', this.handleInputEvent)
        console.log('✅ InputSidebar: Socket listeners initialized')
      }
    },

    cleanupSocketListeners() {
      if (socket) {
        socket.off('input_event', this.handleInputEvent)
        console.log('🧹 InputSidebar: Socket listeners cleaned up')
      }
    },
    handleInputEvent(event) {
      console.log('📩 InputSidebar received input event:', event)

      // Bỏ qua events từ chính mình
      if (event.userId === this.currentUserId) {
        return
      }

      switch (event.type) {
        case 'INPUT_CREATED':
          this.handleRemoteInputCreated(event)
          break
        case 'INPUT_DELETED':
          this.handleRemoteInputDeleted(event)
          break
        case 'INPUTS_RELOAD':
          this.handleRemoteInputsReload(event)
          break
        default:
          console.warn('Unknown input event type:', event.type)
      }
    },

    handleRemoteInputCreated(event) {
      console.log('➕ Remote input created:', event.input)

      // Thêm input mới vào danh sách nếu chưa có
      if (!this.inputs.find((input) => input._id === event.input._id)) {
        this.$emit('input-added', event.input) // Emit event để parent cập nhật
      }
    },

    handleRemoteInputDeleted(event) {
      console.log('➖ Remote input deleted:', event.inputId)

      // Xóa input khỏi danh sách
      this.$emit('input-deleted', event.inputId) // Emit event để parent cập nhật
    },

    handleRemoteInputsReload(event) {
      console.log('🔄 Remote inputs reload:', event.inputs.length)

      // Cập nhật toàn bộ danh sách inputs
      this.$emit('inputs-reloaded', event.inputs) // Emit event để parent cập nhật
    },
    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed
      this.expandedInputId = null
      // Lưu trạng thái vào localStorage
      this.saveCollapsedState()
    },

    saveCollapsedState() {
      // Lưu trạng thái collapse vào localStorage với key duy nhất cho component này
      localStorage.setItem('inputSidebarCollapsed', JSON.stringify(this.isCollapsed))
    },

    loadCollapsedState() {
      // Load trạng thái từ localStorage
      const savedState = localStorage.getItem('inputSidebarCollapsed')
      if (savedState !== null) {
        this.isCollapsed = JSON.parse(savedState)
      }
    },

    toggleInput(inputId) {
      if (this.isCollapsed) {
        this.isCollapsed = false
        this.saveCollapsedState() // Lưu trạng thái khi auto-expand
        // Auto-expand the clicked input after expanding sidebar
        setTimeout(() => {
          this.expandedInputId = inputId
        }, 100)
      } else {
        this.expandedInputId = this.expandedInputId === inputId ? null : inputId
      }
    },

    setActiveFilter(filterType) {
      this.activeFilter = filterType
      this.expandedInputId = null
    },

    getFilterCount(filterType) {
      if (filterType === 'all') return this.inputs.length
      return this.inputs.filter((input) => input.type === filterType).length
    },

    getTypeIcon(type) {
      const icons = {
        pdf: 'picture_as_pdf',
        docx: 'description',
        image: 'image',
        audio: 'audiotrack',
        text: 'text_snippet',
      }
      return icons[type] || 'description'
    },

    getCleanText(input, maxLength = 60) {
      const text =
        input.cleaned_text || input.clean_text || input.raw_text || 'No content available'
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
    },

    getLanguage(input) {
      return input.metadata?.language || input.language || 'Unknown'
    },

    getQualityScore(input) {
      return input.quality_score || 0
    },

    getQualityClass(input) {
      const score = this.getQualityScore(input)
      if (score >= 0.8) return 'high'
      if (score >= 0.5) return 'medium'
      return 'low'
    },

    formatDate(dateString) {
      if (!dateString) return 'N/A'
      return new Date(dateString).toLocaleDateString('en-US')
    },

    formatDateTime(dateString) {
      if (!dateString) return 'N/A'
      return new Date(dateString).toLocaleString('en-US')
    },
  },

  // Optional: Lưu trạng thái khi component bị destroy (trong trường hợp trang bị reload)
  beforeUnmount() {
    this.saveCollapsedState()
  },
}
</script>
<style scoped>
.input-sidebar {
  position: relative;
  flex: 1;
  /* background: white; */
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  min-width: 280px;
  max-width: 400px;
}

.input-sidebar.collapsed {
  max-height: 250px;
  min-width: 80px;
  max-width: 80px;
  padding: 16px 12px;
}

.collapse-toggle {
  position: absolute;
  top: 12px;
  right: -12px;
  width: 24px;
  height: 24px;
  background: #1a365d;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.3s ease;
  z-index: 10;
}

.collapse-toggle:hover {
  background: #2d4a8a;
  transform: scale(1.1);
}

.sidebar-content {
  transition: opacity 0.3s ease;
}

.sidebar-content.hidden {
  max-height: 12px;
  opacity: 0;
  pointer-events: none;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.counter-badge {
  background: #e5e7eb;
  color: #374151;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #1a365d;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.btn-primary:hover {
  background: #2d4a8a;
}

/* Filter Tabs */
.filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 20px;
  padding: 0;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.filter-tabs.compact {
  flex-direction: column;
  gap: 2px;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
  justify-content: center;
}

.filter-tabs.compact .filter-tab {
  padding: 8px;
  justify-content: center;
}

.filter-tab:hover {
  color: #374151;
  background: #f1f5f9;
}

.filter-tab.active {
  background: white;
  color: #1a365d;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filter-label {
  white-space: nowrap;
}

.filter-count {
  background: #e5e7eb;
  color: #374151;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 0.625rem;
  font-weight: 600;
}

.filter-count-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #ef4444;
  color: white;
  padding: 1px 4px;
  border-radius: 8px;
  font-size: 0.5rem;
  font-weight: 700;
  min-width: 12px;
  text-align: center;
}

.filter-tab.active .filter-count {
  background: #1a365d;
  color: white;
}

/* Inputs List */
.inputs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 500px;
  overflow-y: auto;
}

.input-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.input-card:hover {
  border-color: #d1d5db;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.input-card.expanded {
  border-color: #1a365d;
  background: white;
}

.input-card.processed {
  border-left: 3px solid #10b981;
}

.input-card:not(.processed) {
  border-left: 3px solid #ef4444;
}

.input-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  min-height: 48px;
}

.input-type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: #e5e7eb;
  color: #6b7280;
  flex-shrink: 0;
}

.input-card.pdf .input-type-icon {
  background: #fee2e2;
  color: #dc2626;
}

.input-card.docx .input-type-icon {
  background: #dbeafe;
  color: #3b82f6;
}

.input-card.image .input-type-icon {
  background: #f0f9ff;
  color: #0ea5e9;
}

.input-card.audio .input-type-icon {
  background: #f3e8ff;
  color: #a855f7;
}

.input-card.text .input-type-icon {
  background: #f0fdf4;
  color: #22c55e;
}

.input-main-info {
  flex: 1;
  min-width: 0;
}

.input-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.input-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.quality-badge {
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 0.625rem;
  font-weight: 700;
}

.quality-badge.high {
  background: #d1fae5;
  color: #065f46;
}

.quality-badge.medium {
  background: #fef3c7;
  color: #92400e;
}

.quality-badge.low {
  background: #fee2e2;
  color: #b91c1c;
}

/* Collapsed View */
.input-collapsed {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.mini-icon {
  font-size: 20px;
  color: #6b7280;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ef4444;
}

.status-dot.processed {
  background: #10b981;
}

.input-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-icon {
  padding: 6px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: #f3f4f6;
  color: #374151;
}

.btn-icon.danger:hover {
  background: #fee2e2;
  color: #dc2626;
}

.btn-icon:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.button-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid #dc2626;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Input Details */
.input-details {
  padding: 12px;
  border-top: 1px solid #e5e7eb;
  background: #f8fafc;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 0.875rem;
  color: #6b7280;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.processed {
  background: #d1fae5;
  color: #065f46;
}

.status-badge:not(.processed) {
  background: #fee2e2;
  color: #b91c1c;
}

.content-preview {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
  font-size: 0.75rem;
  line-height: 1.4;
  color: #4b5563;
  max-height: 80px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
}

/* Empty States */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.empty-state-collapsed {
  text-align: center;
  padding: 20px;
  color: #d1d5db;
}

.empty-icon {
  font-size: 48px;
  color: #d1d5db;
  margin-bottom: 12px;
}

.empty-state p {
  margin: 0 0 16px 0;
  font-size: 0.875rem;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

/* Collapsed Stats */
.collapsed-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: #f8fafc;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.stat-item:hover {
  background: #f1f5f9;
}

.stat-item .material-symbols-outlined {
  font-size: 16px;
  color: #6b7280;
}

.stat-item .material-symbols-outlined.success {
  color: #10b981;
}

.stat-item .material-symbols-outlined.warning {
  color: #f59e0b;
}

.stat-number {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1f2937;
}

@media (max-width: 768px) {
  .input-sidebar {
    min-width: auto;
    max-width: none;
  }

  .input-sidebar.collapsed {
    min-width: 60px;
    max-width: 60px;
    padding: 12px 8px;
  }

  .filter-tabs {
    flex-wrap: wrap;
  }
}
</style>