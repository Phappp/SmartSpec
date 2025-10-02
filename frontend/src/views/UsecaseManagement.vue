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
        <div class="version-section">
          <div class="version-selector">
            <span class="material-symbols-outlined">history</span>

            <div class="dropdown" @click="toggleDropdown">
              <span>{{ selectedLabel }}</span>
              <span class="material-symbols-outlined arrow" :class="{ open: isOpen }">
                <span class="material-symbols-outlined"> chevron_right </span>
              </span>
            </div>

            <ul v-if="isOpen" class="dropdown-menu">
              <li v-for="v in versions" :key="v._id" @click="selectVersion(v)">
                Version {{ v.version_number }} ({{ v.status }})
              </li>
            </ul>

            <button
              v-if="hasFailedVersion && !isRetrying"
              @click="handleRetry"
              class="retry-btn"
              :disabled="isPolling"
            >
              <span class="material-symbols-outlined">refresh</span>
              Retry Failed
            </button>
          </div>

          <!-- PROGRESS BAR HIỂN THỊ TRỰC TIẾP -->
          <div v-if="isRetrying" class="inline-progress-container">
            <div class="progress-info">
              <span class="stage-text">{{ currentStage }}</span>
              <span class="progress-percent">{{ processingProgress }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: processingProgress + '%' }"></div>
            </div>
            <div class="stage-description">{{ getStageDescription(currentStage) }}</div>
          </div>
        </div>

        <button class="members-button">
          <span class="material-symbols-outlined">group</span>
          {{ project.members ? project.members.length : 0 }} Members
        </button>
      </div>
    </div>

    <div class="view-body">
      <div class="main-content">
        <div class="usecase-area">
          <div class="usecase-header">
            <h2>Use Cases List ({{ useCases.length }})</h2>
          </div>
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
          <div class="sidebar-header">
            <h3>Inputs ({{ inputs.length }})</h3>
            <button class="add-input-btn" @click="showAddInputModal = true">
              <span class="material-symbols-outlined">add</span>
            </button>
          </div>
          <ul class="file-list">
            <li
              v-for="input in inputs"
              :key="input._id"
              class="expandable-input-item"
              @click="toggleInput(input._id)"
            >
              <div class="input-summary">
                <div class="input-status">
                  <span
                    class="status-dot"
                    :class="{ processed: input.is_processed, 'not-processed': !input.is_processed }"
                    :title="input.is_processed ? 'Processed' : 'Not Processed'"
                  ></span>
                  <span class="material-symbols-outlined file-icon">notes</span>
                </div>
                <div class="input-info">
                  <div class="input-main">
                    <span class="clean-text">{{ getCleanText(input) }}</span>
                  </div>
                  <div class="input-meta">
                    <span class="input-type">{{ input.type }}</span>
                    <span class="input-language">{{ getLanguage(input) }}</span>
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
                        :stroke-dashoffset="113.097 - 113.097 * getQualityScore(input)"
                        stroke-width="4"
                        stroke-linecap="round"
                        transform="rotate(-90 20 20)"
                      />
                    </svg>
                    <span class="score-text">{{ Math.round(getQualityScore(input) * 100) }}%</span>
                  </div>
                </div>
                <button
                  class="delete-input-btn"
                  @click.stop="openDeleteSpecificModal(input._id)"
                  :disabled="isDeletingInput === input._id"
                  :title="`Delete ${input.type} input`"
                >
                  <span v-if="isDeletingInput === input._id" class="button-spinner-small"></span>
                  <span v-else class="material-symbols-outlined">delete</span>
                </button>
              </div>
              <div v-if="expandedInputId === input._id" class="input-detail">
                <div class="input-details">
                  <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value">
                      <span
                        class="status-badge"
                        :class="{
                          processed: input.is_processed,
                          'not-processed': !input.is_processed,
                        }"
                      >
                        {{ input.is_processed ? 'Processed' : 'Not Processed' }}
                      </span>
                    </span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Type:</span>
                    <span class="detail-value">{{ input.type }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Language:</span>
                    <span class="detail-value">{{ getLanguage(input) }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Updated:</span>
                    <span class="detail-value">{{ formatDateTime(input.updated_at) }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Quality:</span>
                    <span class="detail-value"
                      >{{ Math.round(getQualityScore(input) * 100) }}%</span
                    >
                  </div>
                  <div class="detail-row full-width">
                    <span class="detail-label">Content:</span>
                    <span class="detail-value content-text">{{ getCleanText(input) }}</span>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <AppModal
      v-model="showModal"
      :title="modalTitle"
      :message="modalMessage"
      :isConfirmation="true"
      @confirm="handleConfirm"
    />

    <!-- Add Input Modal (giữ nguyên) -->
    <div v-if="showAddInputModal" class="modal-overlay" @click="showAddInputModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Add New Input</h3>
          <button class="close-btn" @click="showAddInputModal = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="input-section">
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

          <div class="input-section">
            <h4>Describe your project</h4>
            <textarea
              v-model="rawText"
              placeholder="Enter your describe here..."
              class="text-input"
              rows="6"
            ></textarea>
          </div>

          <div v-if="!canSubmit" class="validation-message">
            Please add at least one file or enter some text to proceed!
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="showAddInputModal = false">Cancel</button>
          <button class="submit-btn" @click="addInputs" :disabled="!canSubmit || isAddingInput">
            <span v-if="isAddingInput" class="button-spinner-small"></span>
            {{ isAddingInput ? 'Adding...' : 'Add Input' }}
          </button>
        </div>
      </div>
    </div>

    <!-- <div v-if="isAddingInput" class="mini-loading-overlay">
      <div class="mini-loading-content">
        <div class="mini-spinner"></div>
        <p>Adding input...</p>
      </div>
    </div> -->
  </div>
</template>

<script>
import {
  getProjectDetail,
  retryProjectAnalysis,
  getVersionStatus,
  addInputsToVersion,
  deleteSpecificInput,
} from '@/api/project'
import { useToast } from 'vue-toastification'
import AppModal from '@/components/AppModal.vue'

export default {
  name: 'ProjectDetailView',
  components: { AppModal },
  data() {
    return {
      project: {},
      versions: [],
      inputs: [],
      useCases: [],
      selectedVersionId: null,
      expandedUseCaseId: null,
      expandedInputId: null,
      showDescription: false,

      // Retry state
      isRetrying: false,
      processingProgress: 0,
      currentStage: 'Initializing...',
      pollingInterval: null,
      currentPollingVersionId: null,

      // UI state
      isOpen: false,
      showAddInputModal: false,
      selectedFiles: [],
      rawText: '',
      isAddingInput: false,
      showModal: false,
      modalTitle: '',
      modalMessage: '',
      confirmAction: null,
      isDeletingInput: null,

      toast: useToast(),
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
    canSubmit() {
      return this.selectedFiles.length > 0 || this.rawText.trim().length > 0
    },
    // Kiểm tra xem có version nào đang processing không
    hasProcessingVersion() {
      return this.versions.some((version) => version.status === 'processing')
    },
    processingVersion() {
      return this.versions.find((version) => version.status === 'processing')
    },
  },
  async created() {
    const projectId = this.$route.params.id
    if (projectId) {
      await this.fetchProjectData(projectId)
      // Kiểm tra và khôi phục polling nếu có version đang processing
      this.checkAndRestorePolling()
    }
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeUnmount() {
    this.cleanupPolling()
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
        this.inputs = result.inputs
        this.useCases = result.current_version ? result.current_version.requirement_model : []

        // Ưu tiên chọn current_version, nếu không có thì chọn version đầu tiên
        if (this.project.current_version) {
          this.selectedVersionId = this.project.current_version
        } else if (this.versions.length > 0) {
          this.selectedVersionId = this.versions[0]._id
        }
      } catch (err) {
        console.error('Error fetching project details:', err)
        this.toast.error('Failed to load project data')
      }
    },

    // Kiểm tra và khôi phục polling nếu có version đang processing
    checkAndRestorePolling() {
      if (this.hasProcessingVersion) {
        const processingVersion = this.processingVersion
        console.log('🔄 Found processing version, restoring polling:', processingVersion._id)

        this.isRetrying = true
        this.currentPollingVersionId = processingVersion._id
        this.startPolling(processingVersion._id)

        // Lấy progress hiện tại từ version
        if (processingVersion.progress) {
          this.processingProgress = processingVersion.progress
        }
        if (processingVersion.stage) {
          this.currentStage = this.formatStageName(processingVersion.stage)
        }
      }
    },

    // ========== RETRY FUNCTIONALITY ==========
    async handleRetry() {
      if (!this.failedVersion || this.isRetrying) return

      this.isRetrying = true
      this.processingProgress = 0
      this.currentStage = 'Initializing...'
      this.currentPollingVersionId = this.failedVersion._id

      try {
        // Lưu trạng thái retry vào localStorage để HomePage có thể đọc
        this.saveRetryState()

        await retryProjectAnalysis(this.project._id, this.failedVersion._id)
        this.startPolling(this.failedVersion._id)
      } catch (error) {
        console.error('Error retrying analysis:', error)
        this.handleRetryError('Failed to start retry process')
      }
    },

    startPolling(versionId) {
      this.cleanupPolling()

      this.pollingInterval = setInterval(async () => {
        try {
          const response = await getVersionStatus(versionId)
          const { status, version } = response.data.data

          console.log('📊 Polling update:', {
            versionId,
            status,
            progress: version?.progress,
            stage: version?.stage,
          })

          // Update progress from backend
          if (version) {
            this.updateProgressFromStage(version.stage || 'initializing')
            if (version.progress) {
              this.processingProgress = version.progress
            }
          }

          // Cập nhật localStorage với progress mới nhất
          this.saveRetryState()

          if (status !== 'processing') {
            this.stopPolling()
            // Xóa khỏi localStorage khi hoàn thành
            this.clearRetryState()

            if (status === 'completed' || status === 'has_conflicts') {
              this.handleRetrySuccess()
            } else {
              this.handleRetryFailure()
            }
          }
        } catch (error) {
          console.error('Error during polling:', error)
          this.handlePollingError()
        }
      }, 2000)
    },

    updateProgressFromStage(stage) {
      const stageProgressMap = {
        initializing: 15,
        input: 25,
        analyzing: 40,
        normalization: 70,
        finalizing: 90,
        completed: 100,
      }

      this.currentStage = this.formatStageName(stage)
      this.processingProgress = stageProgressMap[stage] || 0
    },

    formatStageName(stage) {
      const stageNames = {
        initializing: 'Initializing',
        input: 'Processing Inputs',
        analyzing: 'Analyzing Requirements',
        normalization: 'Normalizing Data',
        finalizing: 'Finalizing',
        completed: 'Completed',
      }
      return stageNames[stage] || stage.charAt(0).toUpperCase() + stage.slice(1)
    },

    getStageDescription(stage) {
      const descriptions = {
        Initializing: 'Preparing the analysis environment...',
        'Processing Inputs': 'Reading and processing your input files...',
        'Analyzing Requirements': 'Extracting use cases and requirements...',
        'Normalizing Data': 'Organizing and structuring the data...',
        Finalizing: 'Generating final documentation...',
        Completed: 'Analysis completed successfully!',
      }
      return descriptions[stage] || 'Processing your request...'
    },

    // Lưu trạng thái retry vào localStorage
    saveRetryState() {
      const retryState = {
        projectId: this.project._id,
        versionId: this.currentPollingVersionId,
        projectName: this.project.name,
        projectDescription: this.project.description,
        processingProgress: this.processingProgress,
        currentStage: this.currentStage,
        timestamp: new Date().getTime(),
        type: 'retry',
      }
      localStorage.setItem(`retry_${this.project._id}`, JSON.stringify(retryState))
    },

    // Xóa trạng thái retry khỏi localStorage
    clearRetryState() {
      localStorage.removeItem(`retry_${this.project._id}`)
    },

    cleanupPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval)
        this.pollingInterval = null
      }
    },

    stopPolling() {
      this.cleanupPolling()
      this.isRetrying = false
      this.currentPollingVersionId = null
    },

    cancelRetry() {
      this.cleanupPolling()
      this.isRetrying = false
      this.currentPollingVersionId = null
      this.clearRetryState()
      this.toast.info('Retry process cancelled.')

      // Refresh data để cập nhật trạng thái mới nhất
      this.fetchProjectData(this.project._id)
    },

    handleRetrySuccess() {
      this.processingProgress = 100
      this.currentStage = 'Completed'

      setTimeout(() => {
        this.isRetrying = false
        this.currentPollingVersionId = null
        this.fetchProjectData(this.project._id)
        this.toast.success('Retry completed successfully!')
      }, 1000)
    },

    handleRetryFailure() {
      this.isRetrying = false
      this.currentPollingVersionId = null
      this.fetchProjectData(this.project._id)
      this.toast.error('Retry failed. Please try again.')
    },

    handleRetryError(message) {
      this.isRetrying = false
      this.currentPollingVersionId = null
      this.clearRetryState()
      this.toast.error(message)
    },

    handlePollingError() {
      this.stopPolling()
      this.clearRetryState()
      this.toast.error('Error checking retry status.')
    },

    // ========== INPUT MANAGEMENT ==========
    triggerFileInput() {
      this.$refs.fileInput.click()
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
      event.target.value = ''
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

    async addInputs() {
      if (!this.canSubmit) return
      this.isAddingInput = true

      try {
        const versionId = this.selectedVersionId
        if (!versionId) {
          throw new Error('No version selected')
        }

        const formData = new FormData()
        if (this.selectedFiles.length > 0) {
          this.selectedFiles.forEach((file) => {
            formData.append('files', file)
          })
        }
        if (this.rawText.trim()) {
          formData.append('rawText', this.rawText.trim())
        }

        const minLoadingTime = new Promise((resolve) => setTimeout(resolve, 2000))
        const apiCall = addInputsToVersion(versionId, formData)

        const [_, response] = await Promise.all([minLoadingTime, apiCall])

        if (response.data && response.data.status === 'Success') {
          this.toast.success('Input added successfully!')
          this.resetInputForm()
          this.showAddInputModal = false
          await this.fetchProjectData(this.project._id)
        } else {
          this.toast.error(response.data.message || 'Failed to add input')
        }
      } catch (error) {
        console.error('Error adding inputs:', error)
        this.toast.error('Error adding input')
      } finally {
        this.isAddingInput = false
      }
    },

    resetInputForm() {
      this.selectedFiles = []
      this.rawText = ''
    },

    openDeleteSpecificModal(inputId) {
      this.modalTitle = 'Confirm Delete'
      this.modalMessage = 'Are you sure you want to delete this input?'
      this.showModal = true
      this.confirmAction = () => this.deleteSpecificInput(inputId)
    },

    async handleConfirm() {
      if (this.confirmAction) {
        await this.confirmAction()
      }
    },

    async deleteSpecificInput(inputId) {
      try {
        this.isDeletingInput = inputId
        const versionId = this.selectedVersionId
        if (!versionId) throw new Error('No version selected')

        const response = await deleteSpecificInput(versionId, inputId)
        if (response.data?.status === 'Success') {
          this.toast.success('Input deleted successfully!')
          await this.fetchProjectData(this.project._id)
        } else {
          this.toast.error(response.data?.message || 'Delete failed')
        }
      } catch (err) {
        console.error(err)
        this.toast.error('Error deleting input')
      } finally {
        this.isDeletingInput = null
      }
    },

    // Helper methods
    getCleanText(input) {
      return input.cleaned_text || input.clean_text || input.raw_text || 'No content available'
    },

    getLanguage(input) {
      return input.metadata?.language || input.language || 'Unknown'
    },

    getQualityScore(input) {
      return input.quality_score || 0
    },

    handleClickOutside(e) {
      const dropdown = this.$el.querySelector('.dropdown')
      if (dropdown && !dropdown.contains(e.target)) {
        this.isOpen = false
      }
    },

    toggleDropdown() {
      this.isOpen = !this.isOpen
    },

    selectVersion(v) {
      this.selectedVersionId = v._id
      this.isOpen = false
    },

    toggleUseCase(useCaseId) {
      this.expandedUseCaseId = this.expandedUseCaseId === useCaseId ? null : useCaseId
    },

    toggleInput(inputId) {
      this.expandedInputId = this.expandedInputId === inputId ? null : inputId
    },

    toggleDescription() {
      this.showDescription = !this.showDescription
    },

    formatDate(dateString) {
      if (!dateString) return 'N/A'
      return new Date(dateString).toLocaleDateString('en-US')
    },

    formatDateTime(dateString) {
      if (!dateString) return 'N/A'
      return new Date(dateString).toLocaleString('en-US')
    },

    goBack() {
      this.$router.push('/dashboard')
    },
  },
}
</script>
<style scoped>
/* Existing styles remain the same, adding new styles for new features */

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
  left: 36px;
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

/* New header styles for usecase area */
.usecase-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.input-actions {
  display: flex;
  gap: 10px;
}

.delete-unprocessed-btn {
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.delete-unprocessed-btn:hover:not(:disabled) {
  background: #d97706;
}

.delete-unprocessed-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.usecase-area h2 {
  margin-top: 0;
  margin-bottom: 0;
  color: #111827;
}

.usecase-group {
  margin-bottom: 25px;
}

.group-title {
  font-size: 16px;
  font-weight: bold;
  color: #374151;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 12px;
  text-transform: capitalize;
  background-color: #2222221a;
  padding: 6px 12px;
  border-radius: 5px;
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
  transition: all 0.2s ease;
  cursor: pointer;
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
.input-section h4 {
  font-weight: bold;
}
/* === CSS MỚI CHO PHẦN INPUT VỚI CHẤM MÀU === */
.sidebar-item {
  margin-bottom: 25px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.sidebar-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 0;
  color: #111827;
}

.add-input-btn {
  background-color: #8783831a;
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(10px);
  color: #000;
  border: 1px solid #0606061a;
  border-radius: 6px;
  padding: 4px 12px;
  font-weight: 600;
  cursor: pointer;
  align-self: center;
  opacity: 0.7;
  box-shadow: 0 4px 6px rgba(77, 77, 77, 0.1);
}

.add-input-btn:hover {
  opacity: 1;
}
.add-input-btn span {
  font-size: 24px;
  transition: 0.2s ease;
}
.add-input-btn:hover span {
  transform: rotate(90deg);
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

.input-status {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.processed {
  background-color: #10b981;
  box-shadow: 0 0 4px rgba(16, 185, 129, 0.4);
}

.status-dot.not-processed {
  background-color: #ef4444;
  box-shadow: 0 0 4px rgba(239, 68, 68, 0.4);
}

.file-icon {
  font-size: 18px;
  color: #6b7280;
}

.input-info {
  flex: 1;
  min-width: 0;
}

.input-main {
  margin-bottom: 4px;
  max-width: 200px;
}

.clean-text {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  color: #1f2937;
  display: -webkit-box;
  -webkit-line-clamp: 1; /* số dòng tối đa */
  -webkit-box-orient: vertical;
  pointer-events: none;
  user-select: none;
  overflow: hidden;
  text-overflow: ellipsis;
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

/* Delete input button */
.delete-input-btn {
  background: transparent;
  border: none;
  border-radius: 4px;
  padding: 4px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-input-btn:hover:not(:disabled) {
  background: #fee2e2;
  color: #dc2626;
}

.delete-input-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
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

.status-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.processed {
  background-color: #d1fae5;
  color: #065f46;
}

.status-badge.not-processed {
  background-color: #fee2e2;
  color: #b91c1c;
}

.content-text {
  background: #f3f4f6;
  padding: 8px 12px;
  border-radius: 4px;
  word-break: break-word;
  text-align: justify;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: #111827;
}

.close-btn {
  background: transparent;
  border: none;
  border-radius: 4px;
  padding: 4px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.input-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 20px;
}

.tab-btn {
  background: transparent;
  border: none;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.tab-btn.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.tab-btn:hover:not(.active) {
  color: #374151;
}

.tab-content {
  min-height: 200px;
}

.file-upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 20px;
}

.file-upload-area:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.upload-placeholder {
  color: #6b7280;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 10px;
  color: #9ca3af;
}

.file-types {
  font-size: 12px;
  margin-top: 8px;
  color: #9ca3af;
}

.selected-files h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #f9fafb;
  border-radius: 4px;
  margin-bottom: 4px;
}

.file-name {
  flex: 1;
  font-size: 14px;
  color: #374151;
}

.file-size {
  font-size: 12px;
  color: #6b7280;
}

.remove-file {
  background: transparent;
  border: none;
  border-radius: 4px;
  padding: 2px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
}

.remove-file:hover {
  background: #fee2e2;
  color: #dc2626;
}

.text-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.text-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e5e7eb;
}

.cancel-btn {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background: #e5e7eb;
}

.submit-btn {
  background: #1a365d;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
  background: #2563eb;
}

.submit-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}
.validation-message {
  font-size: 12px;
  color: #ef4444;
  margin-top: 4px;
}
/* Mini loading overlay */
/* .mini-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1001;
} */

.mini-loading-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.mini-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #f3f4f6;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 10px;
}

.mini-loading-content p {
  margin: 0;
  font-size: 14px;
  color: #374151;
}

/* Loading overlay */
.fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loading-box {
  background: white;
  padding: 30px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.spinner-flashlight {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

.loading-text {
  margin: 0;
  font-size: 16px;
  color: #374151;
  font-weight: 500;
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

  .input-summary {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .quality-score {
    align-self: flex-end;
  }

  .usecase-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .sidebar-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .modal-content {
    width: 95%;
    margin: 20px;
  }
}
/* PROCESSING STATUS STYLES */
.processing-status {
  width: 100%;
  margin-top: 25px;
  text-align: center;
}

.progress-container {
  width: 100%;
  margin: 15px 0;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
  color: #ece8e8;
  gap: 12px;
}

.stage-text {
  font-weight: 500;
  color: #ece8e8;
}

.progress-percent {
  font-weight: 600;
  color: #ece8e8;
}

.progress-bar {
  width: 300px;
  height: 10px;
  background-color: #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1a365d, #2c5282);
  border-radius: 8px;
  transition: width 0.5s ease-in-out;
  box-shadow: 0 2px 4px rgba(26, 54, 93, 0.3);
}

.stage-description {
  margin-top: 10px;
  font-size: 14px;
  color: #d1d5db;
  font-style: italic;
}

/* LOADING OVERLAY */
.fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(6px);
}

.loading-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  padding: 60px 40px 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  min-width: 400px;
}

.spinner-flashlight {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

.close-loading-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.close-loading-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

.close-loading-btn .material-symbols-outlined {
  font-size: 18px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
/* INLINE PROGRESS CONTAINER */
.inline-progress-container {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  min-width: 300px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a365d;
}

.cancel-retry-btn {
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.cancel-retry-btn:hover {
  background: #4b5563;
}

.cancel-retry-btn .material-symbols-outlined {
  font-size: 14px;
}

.inline-progress-container .progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
  color: #374151;
}

.inline-progress-container .stage-text {
  font-weight: 600;
  color: #1a365d;
}

.inline-progress-container .progress-percent {
  font-weight: 700;
  color: #1a365d;
}

.inline-progress-container .progress-bar {
  width: 100%;
  height: 6px;
  background-color: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}

.inline-progress-container .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1a365d, #2c5282);
  border-radius: 3px;
  transition: width 0.5s ease-in-out;
}

.inline-progress-container .stage-description {
  font-size: 11px;
  color: #6b7280;
  font-style: italic;
}
</style>