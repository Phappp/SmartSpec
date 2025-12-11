<template>
  <div class="input-sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-content" :class="{ hidden: isCollapsed }">
      <div class="sidebar-section">
        <div class="section-header">
          <div class="header-left">
            <button
              class="collapse-toggle"
              @click="toggleCollapse"
              :title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
            >
              <span class="material-symbols-outlined toggle-icon">menu</span>
            </button>
            <h3>
              Inputs
              <span class="counter-badge">{{ inputs.length }}</span>
            </h3>
          </div>
          <button 
            class="btn-primary" 
            @click="toggleAddForm"
            :class="{ active: showAddForm }"
          >
            <span class="material-symbols-outlined">{{ showAddForm ? 'close' : 'add' }}</span>
            {{ showAddForm ? 'Cancel' : 'Add Input' }}
          </button>
        </div>

        <!-- Add Input Form (Inline) -->
        <div v-if="showAddForm && !isCollapsed" class="add-input-form">
          <div class="form-section">
            <h4>Upload Files</h4>
            <div class="file-upload-area" @click="triggerFileInput">
              <input
                type="file"
                ref="fileInput"
                @change="handleFileSelect"
                multiple
                accept=".docx,.pdf,.jpg,.jpeg,.png,.gif,.mp3,.wav,.m4a"
                style="display: none"
              />
              <div class="upload-placeholder">
                <span class="material-symbols-outlined upload-icon">cloud_upload</span>
                <p>Click to upload files</p>
                <p class="file-types">Supported: DOCX, PDF, Images, Audio files</p>
              </div>
            </div>
            <div v-if="selectedFiles.length > 0" class="selected-files">
              <h5>Selected Files ({{ selectedFiles.length }})</h5>
              <ul class="file-list">
                <li v-for="(file, index) in selectedFiles" :key="index" class="file-item">
                  <span class="material-symbols-outlined file-icon">description</span>
                  <span class="file-name">{{ file.name }}</span>
                  <span class="file-size">({{ formatFileSize(file.size) }})</span>
                  <button class="remove-file" @click="removeFile(index)">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div class="form-section">
            <h4>Or Enter Text</h4>
            <textarea
              v-model="rawText"
              placeholder="Describe your requirements, use cases, or system specifications here..."
              class="text-input"
              rows="4"
            ></textarea>
          </div>

          <div v-if="!canSubmit" class="validation-message">
            Please add at least one file or enter some text to proceed!
          </div>

          <div class="form-actions">
            <button class="submit-btn" @click="handleSubmit" :disabled="!canSubmit || isAddingInput">
              <span v-if="isAddingInput" class="button-spinner-small"></span>
              <span v-else class="material-symbols-outlined">check</span>
              {{ isAddingInput ? 'Adding...' : 'Add Input' }}
            </button>
          </div>
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

        <!-- Incremental Analysis Section -->
        <div v-if="!isCollapsed" class="incremental-section">
          <!-- Error Banner -->
          <div v-if="isProcessingFailed" class="error-banner">
            <div class="error-content">
              <span class="material-symbols-outlined error-icon">error</span>
              <div class="error-text">
                <h4>Analysis Failed</h4>
                <p>Please check and retry.</p>
              </div>
              <button class="retry-btn-small" @click="$emit('retry-incremental')">
                <span class="material-symbols-outlined">refresh</span>
                Retry
              </button>
            </div>
          </div>

          <!-- Processing Banner -->
          <div v-if="isProcessingIncremental" class="processing-banner">
            <div class="loading-content">
              <div class="loading-spinner"></div>
              <div class="loading-text">
                <h4>Analyzing...</h4>
                <p>Processing your inputs...</p>
              </div>
            </div>
          </div>

          <!-- Incremental Analysis Button -->
          <div
            v-if="showIncrementalButton && !isProcessingIncremental && !isProcessingFailed"
            class="incremental-banner"
          >
            <div class="banner-content">
              <span class="material-symbols-outlined banner-icon">update</span>
              <div class="banner-text">
                <h4>New Inputs Available</h4>
                <p>
                  {{ unprocessedInputsCount }} unprocessed input(s) ready for analysis.
                </p>
              </div>
            </div>
            <button
              class="incremental-btn"
              @click="$emit('start-incremental-analysis')"
              :disabled="isProcessingIncremental"
            >
              <span v-if="isProcessingIncremental" class="button-spinner-small"></span>
              <span v-else class="material-symbols-outlined">play_arrow</span>
              {{ isProcessingIncremental ? 'Analyzing...' : 'Analyze' }}
            </button>
          </div>
        </div>

        <div class="inputs-list">
          <div
            v-for="input in sortedFilteredInputs"
            :key="input._id"
            class="input-card"
            :class="[
              input.type,
              { 
                expanded: expandedInputId === input._id, 
                processed: input.is_processed,
                loading: input._isLoading,
                error: input._isError
              },
            ]"
            @click="toggleInput(input._id)"
          >
            <div class="input-header">
              <div class="input-type-icon">
                <span class="material-symbols-outlined">{{ getTypeIcon(input.type) }}</span>
              </div>

              <div class="input-main-info" v-if="!isCollapsed">
                <h4 class="input-title">
                  <span v-if="input._isLoading" class="loading-indicator-inline">
                    <!-- <span class="button-spinner-small"></span> -->
                    {{ getCleanText(input) }}
                  </span>
                  <span v-else>{{ getCleanText(input) }}</span>
                </h4>
                <div class="input-meta">
                  <span v-if="input._isLoading" class="status-badge loading-badge">
                    <span class="button-spinner-small"></span>
                    Uploading...
                  </span>
                  <span v-else-if="input._isError" class="status-badge error-badge">
                    <span class="material-symbols-outlined">error</span>
                    Failed
                  </span>
                  <span v-else class="quality-badge" :class="getQualityClass(input)">
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
                    {{ getCleanText(input, 2000000) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="filteredInputs.length === 0 && !isCollapsed" class="empty-state">
            <span class="material-symbols-outlined empty-icon">description</span>
            <p v-if="activeFilter === 'all'">
              No inputs added yet. Add your first input to get started.
            </p>
            <p v-else>
              No {{ activeFilter }} inputs found. Try a different filter or add new inputs.
            </p>
            <button class="btn-secondary" @click="toggleAddForm">
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
      <!-- Processing Indicator when collapsed -->
      <div 
        v-if="isProcessingIncremental" 
        class="stat-item processing" 
        title="Analyzing... Click to expand"
        @click="toggleCollapse"
      >
        <div class="loading-spinner-small"></div>
        <span class="stat-label">Analyzing</span>
      </div>
      <div 
        v-else-if="isProcessingFailed" 
        class="stat-item error" 
        title="Analysis Failed. Click to expand"
        @click="toggleCollapse"
      >
        <span class="material-symbols-outlined error-icon">error</span>
        <span class="stat-label">Failed</span>
      </div>
      <div 
        v-else-if="showIncrementalButton" 
        class="stat-item pending" 
        :title="`${unprocessedInputsCount} unprocessed inputs. Click to expand`"
        @click="toggleCollapse"
      >
        <span class="material-symbols-outlined warning">update</span>
        <span class="stat-number">{{ unprocessedInputsCount }}</span>
      </div>
      
      <div 
        class="stat-item" 
        :title="`Total inputs: ${inputs.length}. Click to expand`"
        @click="toggleCollapse"
      >
        <span class="material-symbols-outlined">description</span>
        <span class="stat-number">{{ inputs.length }}</span>
      </div>
      <div 
        class="stat-item" 
        :title="`Processed: ${processedCount}. Click to expand`"
        @click="toggleCollapse"
      >
        <span class="material-symbols-outlined success">check_circle</span>
        <span class="stat-number">{{ processedCount }}</span>
      </div>
      <div 
        class="stat-item" 
        :title="`Pending: ${pendingCount}. Click to expand`"
        @click="toggleCollapse"
      >
        <span class="material-symbols-outlined warning">schedule</span>
        <span class="stat-number">{{ pendingCount }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InputSidebar',
  emits: ['add-input-click', 'delete-input', 'input-added', 'input-deleted', 'inputs-reloaded', 'start-incremental-analysis', 'retry-incremental'],
  props: {
    inputs: {
      type: Array,
      default: () => [],
    },
    isDeletingInput: {
      type: String,
      default: null,
    },
    isProcessingIncremental: {
      type: Boolean,
      default: false,
    },
    isProcessingFailed: {
      type: Boolean,
      default: false,
    },
    showIncrementalButton: {
      type: Boolean,
      default: false,
    },
    unprocessedInputsCount: {
      type: Number,
      default: 0,
    },
    isAddingInput: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      expandedInputId: null,
      activeFilter: 'all',
      isCollapsed: false, // Default là hiển thị
      showAddForm: false, // Toggle form thêm input
      selectedFiles: [], // Files đã chọn
      rawText: '', // Raw text input
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
    sortedFilteredInputs() {
      // Sort: is_processed = false ở trên, sau đó sort theo thời gian mới đến cũ
      return [...this.filteredInputs].sort((a, b) => {
        // Ưu tiên: is_processed = false luôn ở trên
        if (a.is_processed !== b.is_processed) {
          return a.is_processed ? 1 : -1
        }
        
        // Nếu cùng trạng thái processed, sort theo thời gian mới đến cũ
        const timeA = new Date(a.created_at || a.createdAt || 0).getTime()
        const timeB = new Date(b.created_at || b.createdAt || 0).getTime()
        return timeB - timeA // Mới nhất ở trên (descending)
      })
    },
    canSubmit() {
      return this.selectedFiles.length > 0 || this.rawText.trim().length > 0
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
    // this.loadCollapsedState()
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
      if (!dateString) return 'Not available'
      return new Date(dateString).toLocaleDateString('en-US')
    },

    formatDateTime(dateString) {
      if (!dateString) return 'Not available'
      return new Date(dateString).toLocaleString('en-US')
    },
    // Add Input Form Methods
    toggleAddForm() {
      this.showAddForm = !this.showAddForm
      if (!this.showAddForm) {
        this.resetForm()
      }
    },
    triggerFileInput() {
      this.$refs.fileInput?.click()
    },
    handleFileSelect(event) {
      const files = Array.from(event.target.files)
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'audio/mpeg',
        'audio/wav',
        'audio/mp4',
      ]

      const validFiles = files.filter((file) => allowedTypes.includes(file.type))
      this.selectedFiles = [...this.selectedFiles, ...validFiles]
      if (event.target) {
        event.target.value = ''
      }
    },
    removeFile(index) {
      this.selectedFiles.splice(index, 1)
    },
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },
    handleSubmit() {
      if (!this.canSubmit) return

      const formData = new FormData()
      const tempInputData = {
        files: [],
        rawText: null
      }
      
      if (this.selectedFiles.length > 0) {
        this.selectedFiles.forEach((file) => {
          formData.append('files', file)
          tempInputData.files.push({
            name: file.name,
            size: file.size,
            type: file.type
          })
        })
      }
      if (this.rawText.trim()) {
        formData.append('rawText', this.rawText.trim())
        tempInputData.rawText = this.rawText.trim()
      }

      this.$emit('add-inputs', { formData, tempInputData })
      this.resetForm()
      this.showAddForm = false
    },
    resetForm() {
      this.selectedFiles = []
      this.rawText = ''
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = ''
      }
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
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  min-width: 280px;
  max-width: 380px;
  width: 100%;
  height: 100%;
  max-height: calc(100vh - 200px);
  overflow: hidden;
  background: white;
}

.input-sidebar.collapsed {
  min-width: 80px;
  max-width: 80px;
  padding: 12px;
  max-height: calc(100vh - 200px);
}

.collapse-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  background: transparent;
  color: #6b7280;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
}

.collapse-toggle:hover {
  background: #f1f5f9;
  color: #1a365d;
}

.collapse-toggle:active {
  background: #e5e7eb;
}

.collapse-toggle.collapsed-mode {
  position: absolute;
  top: 0px;
  left: 50%;
  transform: translateX(-50%);
  width:28px;
  height: px;
  background: #1a365d;
  color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.collapse-toggle.collapsed-mode:hover {
  background: #2d4a8a;
  transform: translateX(-50%) translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
}

.collapse-toggle.collapsed-mode:active {
  transform: translateX(-50%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle-icon {
  font-size: 20px;
  transition: transform 0.3s ease;
}

.collapse-toggle.collapsed-mode .toggle-icon {
  font-size: 24px;
  transform: rotate(180deg);
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  transition: opacity 0.3s ease;
}

.sidebar-content.hidden {
  opacity: 0;
  pointer-events: none;
  max-height: 0;
  overflow: hidden;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 12px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-bottom: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.section-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
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
  gap: 6px;
  padding: 6px 12px;
  background: #1a365d;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.3s ease;
  white-space: nowrap;
  flex-shrink: 0;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.btn-primary:hover {
  background: #2d4a8a;
}

.btn-primary.active {
  background: #dc2626;
}

.btn-primary.active:hover {
  background: #b91c1c;
}

/* Filter Tabs */
.filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 0;
  padding: 8px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  flex-shrink: 0;
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
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  margin-top: 0;
}

/* Custom scrollbar for inputs-list */
.inputs-list::-webkit-scrollbar {
  width: 6px;
}

.inputs-list::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.inputs-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.inputs-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
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

.input-card:not(.processed):not(.loading):not(.error) {
  border-left: 3px solid #ef4444;
}

.input-card.loading {
  border-left: 3px solid #3b82f6;
  background: #f0f9ff;
  animation: pulseLoading 2s ease-in-out infinite;
}

.input-card.error {
  border-left: 3px solid #dc2626;
  background: #fef2f2;
}

@keyframes pulseLoading {
  0%, 100% {
    background: #f0f9ff;
  }
  50% {
    background: #e0f2fe;
  }
}

.loading-indicator-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.error-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.error-badge .material-symbols-outlined {
  font-size: 14px;
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
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-item:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
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

.stat-label {
  font-size: 0.625rem;
  font-weight: 600;
  color: #1f2937;
  text-align: center;
  margin-top: 2px;
}

.stat-item.processing {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.stat-item.processing .stat-label {
  color: white;
}

.stat-item.error {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.stat-item.error .stat-label {
  color: white;
}

.stat-item.error .error-icon {
  color: white;
}

.stat-item.pending {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.stat-item.pending .stat-number {
  color: white;
}

.stat-item.pending .material-symbols-outlined {
  color: white;
}

.loading-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Incremental Analysis Styles */
.incremental-section {
  margin-bottom: 12px;
  flex-shrink: 0;
}

.incremental-banner {
  background: linear-gradient(135deg, #1a365d 0%, #2d4a8a 100%);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  color: white;
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.15);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.banner-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.banner-text {
  flex: 1;
  min-width: 0;
}

.banner-text h4 {
  margin: 0 0 2px 0;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.2;
}

.banner-text p {
  margin: 0;
  opacity: 0.9;
  font-size: 0.75rem;
  line-height: 1.3;
}

.incremental-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  padding: 8px 14px;
  color: white;
  font-weight: 500;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  flex-shrink: 0;
}

.incremental-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.incremental-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.processing-banner {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 10px;
  padding: 12px 16px;
  color: white;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
  margin-bottom: 12px;
}

.loading-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  flex-shrink: 0;
}

.loading-text {
  flex: 1;
}

.loading-text h4 {
  margin: 0 0 2px 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.loading-text p {
  margin: 0;
  opacity: 0.9;
  font-size: 0.75rem;
}

.error-banner {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border-radius: 10px;
  padding: 12px 16px;
  color: white;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
  margin-bottom: 12px;
}

.error-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.error-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.error-text {
  flex: 1;
  min-width: 0;
}

.error-text h4 {
  margin: 0 0 2px 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.error-text p {
  margin: 0;
  opacity: 0.9;
  font-size: 0.75rem;
}

.retry-btn-small {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  padding: 6px 12px;
  color: white;
  font-weight: 500;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.retry-btn-small:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.button-spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
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

  .incremental-banner {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .banner-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .incremental-btn {
    width: 100%;
    justify-content: center;
  }
}

/* Add Input Form Styles */
.add-input-form {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  flex-shrink: 0;
  max-height: 450px;
  overflow-y: auto;
  overflow-x: hidden;
}

.form-section {
  margin-bottom: 12px;
}

.form-section:last-of-type {
  margin-bottom: 0;
}

.form-section h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
}

.file-upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 16px 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.file-upload-area:hover {
  border-color: #1a365d;
  background: #f8fafc;
}

.upload-placeholder {
  color: #6b7280;
}

.upload-icon {
  font-size: 28px;
  margin-bottom: 6px;
  color: #9ca3af;
  display: block;
}

.upload-placeholder p {
  margin: 4px 0;
  font-size: 0.875rem;
}

.file-types {
  font-size: 0.75rem;
  color: #9ca3af;
}

.selected-files {
  margin-top: 8px;
  max-height: 150px;
  overflow-y: auto;
}

.selected-files h5 {
  margin: 0 0 8px 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
}

.file-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.75rem;
}

.file-icon {
  font-size: 16px;
  color: #6b7280;
  flex-shrink: 0;
}

.file-name {
  flex: 1;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.file-size {
  font-size: 0.7rem;
  color: #6b7280;
  flex-shrink: 0;
}

.remove-file {
  background: transparent;
  border: none;
  border-radius: 4px;
  padding: 2px 4px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.remove-file:hover {
  background: #f3f4f6;
  color: #dc2626;
}

.remove-file .material-symbols-outlined {
  font-size: 16px;
}

.text-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  resize: vertical;
  transition: border-color 0.2s ease;
  font-family: inherit;
  line-height: 1.5;
  box-sizing: border-box;
  min-height: 80px;
  max-height: 120px;
}

.text-input:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

.validation-message {
  color: #dc2626;
  font-size: 0.75rem;
  text-align: center;
  padding: 8px;
  background: #fef2f2;
  border-radius: 6px;
  margin-top: 8px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.submit-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: #1a365d;
  color: white;
  font-weight: 500;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.submit-btn:hover:not(:disabled) {
  background: #12337c;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>