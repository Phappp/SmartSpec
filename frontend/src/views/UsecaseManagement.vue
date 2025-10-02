<template>
  <div class="project-detail-view">
    <div class="view-header">
      <button class="back-button" @click="goBack">
        <span class="material-symbols-outlined">arrow_back</span>
        Back to Projects
      </button>
      <div class="project-info">
        <h2>{{ project.name }}</h2>
        <div class="description-container">
          <button class="toggle-description" @click="toggleDescription">
            <span class="material-symbols-outlined">
              {{ showDescription ? 'expand_less' : 'expand_more' }}
            </span>
            {{ showDescription ? 'Hide Description' : 'Show Description' }}
          </button>
          <div v-if="showDescription" class="project-description">
            <p>{{ project.description || 'No description available' }}</p>
          </div>
        </div>
      </div>
      <div class="actions">
        <div class="version-selector">
          <span class="material-symbols-outlined">history</span>

          <!-- Dropdown button -->
          <div class="dropdown" @click="toggleDropdown">
            <span>{{ selectedLabel }}</span>
            <span class="material-symbols-outlined arrow" :class="{ open: isOpen }">
              <span class="material-symbols-outlined"> chevron_right </span>
            </span>
          </div>

          <!-- Dropdown menu -->
          <ul v-if="isOpen" class="dropdown-menu">
            <li v-for="v in versions" :key="v._id" @click="selectVersion(v)">
              Version {{ v.version_number }} ({{ v.status }})
            </li>
          </ul>

          <!-- Retry button -->
          <button
            v-if="hasFailedVersion"
            @click="retryFailedVersion"
            class="retry-btn"
            :disabled="isRetrying"
          >
            <span v-if="isRetrying" class="button-spinner-small"></span>
            <span v-else class="material-symbols-outlined">refresh</span>
            {{ isRetrying ? 'Retrying...' : 'Retry Failed' }}
          </button>
        </div>
        <button class="members-button">
          <span class="material-symbols-outlined">group</span>
          {{ project.members ? project.members.length : 0 }} Members
        </button>
      </div>
    </div>

    <!-- FULLSCREEN LOADING OVERLAY -->
    <div v-if="overlayLoading" class="fullscreen-overlay">
      <div class="loading-box">
        <div class="spinner-flashlight"></div>
        <p class="loading-text">{{ loadingMessage }}</p>
      </div>
    </div>

    <div class="view-body">
      <!-- Phần main content và sidebar giữ nguyên -->
      <div class="main-content">
        <div class="usecase-area">
          <h2>Use Cases List ({{ useCases.length }})</h2>
          <div v-for="(group, role) in groupedUseCases" :key="role" class="usecase-group">
            <h3 class="group-title">{{ role }}</h3>
            <ul class="usecase-list">
              <li
                v-for="uc in group"
                :key="uc.id"
                class="usecase-item"
                @click="toggleUseCase(uc.id)"
              >
                <div class="usecase-summary">
                  <div class="summary-left">
                    <span class="usecase-id">[{{ uc.id }}]</span>
                    <span class="usecase-name">{{ uc.name }}</span>
                  </div>
                  <span class="usecase-role">{{ uc.role }}</span>
                </div>
                <div v-if="expandedUseCaseId === uc.id" class="usecase-detail">
                  <div class="usecase-grid">
                    <div class="usecase-section span-2">
                      <h4>Goal</h4>
                      <p>{{ uc.goal }}</p>
                    </div>
                    <div class="usecase-section span-1">
                      <h4>Priority</h4>
                      <p>
                        <span :class="['priority-badge', `priority-${uc.priority}`]">{{
                          uc.priority
                        }}</span>
                      </p>
                    </div>
                    <div class="usecase-section span-3">
                      <h4>Reason</h4>
                      <p>{{ uc.reason }}</p>
                    </div>

                    <div class="usecase-section">
                      <h4>Preconditions</h4>
                      <ul class="detail-list">
                        <li v-for="(item, i) in uc.preconditions" :key="i">{{ item }}</li>
                        <li v-if="!uc.preconditions || uc.preconditions.length === 0">None</li>
                      </ul>
                    </div>
                    <div class="usecase-section">
                      <h4>Postconditions</h4>
                      <ul class="detail-list">
                        <li v-for="(item, i) in uc.postconditions" :key="i">{{ item }}</li>
                        <li v-if="!uc.postconditions || uc.postconditions.length === 0">None</li>
                      </ul>
                    </div>
                    <div class="usecase-section">
                      <h4>Triggers</h4>
                      <ul class="detail-list">
                        <li v-for="(item, i) in uc.triggers" :key="i">{{ item }}</li>
                        <li v-if="!uc.triggers || uc.triggers.length === 0">None</li>
                      </ul>
                    </div>

                    <div class="usecase-section span-3">
                      <h4>Tasks (Main Flow)</h4>
                      <ol class="detail-list ordered">
                        <li v-for="(task, i) in uc.tasks" :key="i">{{ task }}</li>
                      </ol>
                    </div>

                    <div class="usecase-section">
                      <h4>Inputs</h4>
                      <div class="tag-list">
                        <span v-for="item in uc.inputs" :key="item" class="tag tag-input">{{
                          item
                        }}</span>
                      </div>
                    </div>
                    <div class="usecase-section">
                      <h4>Outputs</h4>
                      <div class="tag-list">
                        <span v-for="item in uc.outputs" :key="item" class="tag tag-output">{{
                          item
                        }}</span>
                      </div>
                    </div>
                    <div class="usecase-section">
                      <h4>Context</h4>
                      <p>{{ uc.context }}</p>
                    </div>

                    <div class="usecase-section span-2">
                      <h4>Business Rules</h4>
                      <ul class="detail-list">
                        <li v-for="(item, i) in uc.rules" :key="i">{{ item }}</li>
                      </ul>
                    </div>
                    <div class="usecase-section">
                      <h4>Constraints</h4>
                      <ul class="detail-list">
                        <li v-for="(item, i) in uc.constraints" :key="i">{{ item }}</li>
                      </ul>
                    </div>

                    <div class="usecase-section span-3">
                      <h4>Exceptions (Alternate Flows)</h4>
                      <ul class="detail-list exception">
                        <li v-for="(item, i) in uc.exceptions" :key="i">
                          <span class="material-symbols-outlined">error</span>{{ item }}
                        </li>
                      </ul>
                    </div>

                    <div class="usecase-section">
                      <h4>Stakeholders</h4>
                      <div class="tag-list">
                        <span v-for="item in uc.stakeholders" :key="item" class="tag tag-meta">{{
                          item
                        }}</span>
                      </div>
                    </div>
                    <div class="usecase-section">
                      <h4>Related Usecases</h4>
                      <div class="tag-list">
                        <span
                          v-for="item in uc.related_usecases"
                          :key="item"
                          class="tag tag-meta"
                          >{{ item }}</span
                        >
                      </div>
                    </div>
                    <div class="usecase-section">
                      <h4>Feedback</h4>
                      <p>{{ uc.feedback }}</p>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="sidebar">
        <div class="sidebar-item">
          <h3>Inputs ({{ inputs.length }})</h3>
          <ul class="file-list">
            <li
              v-for="input in inputs"
              :key="input._id"
              class="expandable-input-item"
              @click="toggleInput(input._id)"
            >
              <div class="input-summary">
                <span class="material-symbols-outlined">notes</span>
                <div class="input-info">
                  <div class="input-meta">
                    <span class="input-type">{{ input.type }}</span>
                    <span class="input-language">{{ input.metadata.language }}</span>
                    <span class="input-date">{{ formatDate(input.updated_at) }}</span>
                  </div>
                </div>
                <div class="quality-score">
                  <div class="score-circle">
                    <svg width="40" height="40" viewBox="0 0 40 40">
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        fill="none"
                        stroke="#e5e7eb"
                        stroke-width="4"
                      />
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        fill="none"
                        stroke="#10b981"
                        :stroke-dasharray="113.097"
                        :stroke-dashoffset="113.097 - 113.097 * (input.quality_score || 0)"
                        stroke-width="4"
                        stroke-linecap="round"
                        transform="rotate(-90 20 20)"
                      />
                    </svg>
                    <span class="score-text"
                      >{{ Math.round((input.quality_score || 0) * 100) }}%</span
                    >
                  </div>
                </div>
              </div>
              <div v-if="expandedInputId === input._id" class="input-detail">
                <div class="input-details">
                  <div class="detail-row">
                    <span class="detail-label">Type:</span>
                    <span class="detail-value">{{ input.type }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Language:</span>
                    <span class="detail-value">{{ input.metadata.language }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Updated:</span>
                    <span class="detail-value">{{ formatDateTime(input.updated_at) }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Quality:</span>
                    <span class="detail-value">{{ input.quality_score * 100 }}%</span>
                  </div>
                  <div class="detail-row full-width">
                    <span class="detail-label">Content:</span>
                    <span class="detail-value content-text">{{
                      input.cleaned_text || 'No content'
                    }}</span>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  getProjectDetail,
  generateDocumentation,
  retryProjectAnalysis,
  getVersionStatus,
} from '@/api/project'

export default {
  name: 'ProjectDetailView',
  data() {
    return {
      project: {},
      currentVersion: null,
      versions: [],
      inputs: [],
      useCases: [],
      chatLogs: [],
      selectedVersionId: null,
      prompt: '',
      expandedUseCaseId: null,
      expandedInputId: null,
      showDescription: false,
      isRetrying: false,
      pollingInterval: null,

      // loading overlay
      overlayLoading: false,
      loadingMessage: 'Retrying analysis...',
      messageInterval: null,
      messageIndex: 0,

      loadingMessages: [
        'Retrying analysis...',
        'Processing data...',
        'Generating results...',
        'Finalizing project...',
      ],

      // dropdown state
      isOpen: false,
    }
  },
  computed: {
    groupedUseCases() {
      if (!this.useCases || this.useCases.length === 0) {
        return {}
      }
      return this.useCases.reduce((groups, uc) => {
        const role = uc.role || 'Undefined'
        if (!groups[role]) {
          groups[role] = []
        }
        groups[role].push(uc)
        return groups
      }, {})
    },
    hasFailedVersion() {
      return this.versions.some((version) => version.status === 'failed')
    },
    failedVersion() {
      return this.versions.find((version) => version.status === 'failed')
    },
    selectedLabel() {
      const v = this.versions.find((x) => x._id === this.selectedVersionId)
      return v ? `Version ${v.version_number} (${v.status})` : 'Select version'
    },
  },
  async created() {
    const projectId = this.$route.params.id
    if (projectId) {
      await this.fetchProjectData(projectId)
    }

    // lắng nghe click ngoài dropdown
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeUnmount() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
    }
    if (this.messageInterval) {
      clearInterval(this.messageInterval)
    }
    document.removeEventListener('click', this.handleClickOutside)
  },
  methods: {
    async fetchProjectData(projectId) {
      try {
        const userId = 'CURRENT_LOGGED_IN_USER_ID'
        const { data } = await getProjectDetail(projectId, userId)
        const result = data.data || data
        this.project = result.project
        this.versions = result.versions
        this.currentVersion = result.current_version
        this.inputs = result.inputs
        this.chatLogs = result.chatLogs
        this.useCases = result.current_version ? result.current_version.requirement_model : []
        if (this.project.current_version) {
          this.selectedVersionId = this.project.current_version
        }
      } catch (err) {
        console.error('Error fetching project details:', err)
      }
    },

    // xử lý click ngoài dropdown
    handleClickOutside(e) {
      const dropdown = this.$el.querySelector('.dropdown')
      if (dropdown && !dropdown.contains(e.target)) {
        this.isOpen = false
      }
    },
    toggleDropdown() {
      this.isOpen = !this.isOpen
    },
    // chọn version
    selectVersion(v) {
      this.selectedVersionId = v._id
      this.isOpen = false
      console.log('Selected version ID:', this.selectedVersionId)
    },

    // Loading messages
    startLoadingMessages() {
      this.overlayLoading = true
      this.messageIndex = 0
      this.loadingMessage = this.loadingMessages[0]
      this.messageInterval = setInterval(() => {
        this.messageIndex = (this.messageIndex + 1) % this.loadingMessages.length
        this.loadingMessage = this.loadingMessages[this.messageIndex]
      }, 4000)
    },
    stopLoadingMessages() {
      this.overlayLoading = false
      if (this.messageInterval) {
        clearInterval(this.messageInterval)
        this.messageInterval = null
      }
    },

    // Polling check status
    startPolling(versionId) {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval)
      }

      this.pollingInterval = setInterval(async () => {
        try {
          const response = await getVersionStatus(versionId)
          const { status } = response.data.data

          console.log(`Polling status: ${status}`)

          if (status !== 'processing') {
            clearInterval(this.pollingInterval)
            this.pollingInterval = null

            if (status === 'completed' || status === 'has_conflicts') {
              console.log('Retry completed successfully! Reloading data...')
              this.stopLoadingMessages()
              this.isRetrying = false
              await this.fetchProjectData(this.project._id)
            } else {
              console.log('Retry failed')
              this.stopLoadingMessages()
              this.isRetrying = false
              await this.fetchProjectData(this.project._id)
            }
          }
        } catch (error) {
          console.error('Error during polling:', error)
          clearInterval(this.pollingInterval)
          this.pollingInterval = null
          this.stopLoadingMessages()
          this.isRetrying = false
        }
      }, 5000)
    },

    async retryFailedVersion() {
      if (!this.failedVersion || this.isRetrying) return

      this.isRetrying = true
      this.startLoadingMessages()

      try {
        console.log('Starting retry analysis...')
        await retryProjectAnalysis(this.project._id, this.failedVersion._id)

        this.startPolling(this.failedVersion._id)
      } catch (error) {
        console.error('Error retrying analysis:', error)
        this.stopLoadingMessages()
        this.isRetrying = false
        alert('Failed to retry analysis. Please try again.')
      }
    },

    // UI toggle helpers
    toggleUseCase(useCaseId) {
      this.expandedUseCaseId = this.expandedUseCaseId === useCaseId ? null : useCaseId
    },
    toggleInput(inputId) {
      this.expandedInputId = this.expandedInputId === inputId ? null : inputId
    },
    toggleDescription() {
      this.showDescription = !this.showDescription
    },

    // Format utils
    formatDate(dateString) {
      if (!dateString) return 'N/A'
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US')
    },
    formatDateTime(dateString) {
      if (!dateString) return 'N/A'
      const date = new Date(dateString)
      return date.toLocaleString('en-US')
    },
    goBack() {
      this.$router.push('/dashboard')
    },
  },
}
</script>


<style scoped>
.project-detail-view {
  padding: 30px;
  background: #f9fafb;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 25px;
  background: white;
  padding: 15px 25px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 15px;
  padding: 8px 14px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-button:hover {
  background: #e5e7eb;
}

.project-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 50%;
}

.project-info h2 {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
}

/* CSS mới cho phần mô tả */
.description-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.toggle-description {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-description:hover {
  background: #e5e7eb;
  color: #374151;
}

.project-description {
  border-radius: 6px;
  padding: 8px 12px;
  width: 100%;
  max-width: 800px;
  text-align: justify;
}

.project-description p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.4;
  justify-self: center;
}

.actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.version-selector {
  padding: 0 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}
.version-selector select {
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  outline: none;
}

.dropdown {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
}

.arrow {
  margin-left: 8px;
  font-size: 12px;
  color: #6b7280;
  transition: transform 0.2s ease;
}

.arrow.open {
  transform: rotate(90deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 36px; /* đẩy sang phải để không đè icon */
  margin-top: 6px;
  min-width: 200px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
  z-index: 20;
}

.dropdown-menu li {
  padding: 8px 12px;
  width: 100%;
  font-size: 14px;
  cursor: pointer;
  list-style: none;
}

.dropdown-menu li:hover {
  background: #f3f4f6;
}

/* CSS cho nút retry */
.retry-btn {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
  margin-left: 8px;
}

.retry-btn:hover:not(:disabled) {
  background: #dc2626;
}

.retry-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

/* Spinner nhỏ cho nút retry */
.button-spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top: 2px solid white;
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

.members-button {
  padding: 8px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.view-body {
  display: flex;
  gap: 24px;
  flex: 1;
}

.main-content {
  flex: 3;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 20px;
  overflow-y: auto;
}

.sidebar {
  flex: 1;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 20px;
}

.usecase-area h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #111827;
}

.usecase-group {
  margin-bottom: 25px;
}

.group-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 12px;
}

.usecase-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.usecase-item {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.usecase-item:hover {
  border-color: #9ca3af;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.usecase-summary {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.usecase-id {
  font-family: monospace;
  font-size: 14px;
  color: #6b7280;
}

.usecase-name {
  font-weight: 600;
  color: #1f2937;
}

.usecase-role {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 12px;
  background-color: #e0e7ff;
  color: #4338ca;
  font-weight: 500;
}

/* === CSS MỚI CHO PHẦN CHI TIẾT USE CASE === */
.usecase-detail {
  padding: 16px;
  border-top: 1px solid #e5e7eb;
  margin-top: 12px;
}

.usecase-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.usecase-section {
  background: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  font-size: 14px;
}

.usecase-section.span-1 {
  grid-column: span 1;
}

.usecase-section.span-2 {
  grid-column: span 2;
}

.usecase-section.span-3 {
  grid-column: span 3;
}

.usecase-section h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.usecase-section p {
  margin: 0;
  line-height: 1.5;
  color: #4b5563;
}

.detail-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-list.ordered {
  padding-left: 20px;
  list-style-type: decimal;
}

.detail-list li {
  line-height: 1.5;
  color: #4b5563;
}

.detail-list.exception li {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #b91c1c;
}

.detail-list.exception .material-symbols-outlined {
  font-size: 16px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.tag-input {
  background: #e0e7ff;
  color: #3730a3;
}

.tag-output {
  background: #d1fae5;
  color: #065f46;
}

.tag-meta {
  background: #e5e7eb;
  color: #374151;
}

.priority-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
}

.priority-high {
  background-color: #fee2e2;
  color: #b91c1c;
}

.priority-medium {
  background-color: #fef3c7;
  color: #b45309;
}

.priority-low {
  background-color: #dbeafe;
  color: #1e40af;
}

/* CSS cho Sidebar Input */
.sidebar-item {
  margin-bottom: 25px;
}

.sidebar-item h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #111827;
}

.file-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.expandable-input-item {
  background: #f9fafb;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  border: 1px solid transparent;
  transition: border-color 0.2s ease;
}

.expandable-input-item:hover {
  border-color: #d1d5db;
}

.input-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
}

.input-info {
  flex: 1;
  min-width: 0;
}

.input-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #6b7280;
}

.input-type,
.input-language,
.input-date {
  background: #e5e7eb;
  padding: 2px 6px;
  border-radius: 4px;
}

.quality-score {
  flex-shrink: 0;
}

.score-circle {
  position: relative;
  width: 40px;
  height: 40px;
}

.score-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 10px;
  font-weight: 600;
  color: #059669;
}

.input-detail {
  padding: 0 12px 12px;
  margin-top: 8px;
  border-top: 1px solid #e5e7eb;
}

.input-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 6px 0;
}

.detail-row.full-width {
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-weight: 600;
  color: #374151;
  min-width: 80px;
  font-size: 14px;
}

.detail-value {
  font-size: 14px;
  color: #4b5563;
  flex: 1;
  max-height: 200px;
  overflow-y: auto;
}

.content-text {
  background: #f3f4f6;
  padding: 8px 12px;
  border-radius: 4px;
  word-break: break-word;
  text-align: justify;
}

@media (max-width: 1200px) {
  .usecase-grid {
    grid-template-columns: 1fr 1fr;
  }
  .usecase-section.span-3 {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .view-body {
    flex-direction: column;
  }
  .usecase-grid {
    grid-template-columns: 1fr;
  }
  .usecase-section.span-2,
  .usecase-section.span-3 {
    grid-column: span 1;
  }

  .view-header {
    flex-direction: column;
    gap: 15px;
    align-items: center;
  }

  .project-info {
    max-width: 100%;
    order: 2;
  }

  .back-button {
    order: 1;
    align-self: flex-start;
  }

  .actions {
    order: 3;
    align-self: flex-end;
    flex-direction: column;
    gap: 10px;
  }

  .version-selector {
    flex-direction: column;
    align-items: flex-start;
  }

  .retry-btn {
    margin-left: 0;
    margin-top: 8px;
  }
}
</style>