<template>
  <div class="project-detail-view">
    <ProjectHeader
      :project="project"
      :versions="versions"
      :selected-version-id="selectedVersionId"
      :is-retrying="isRetrying"
      :processing-progress="processingProgress"
      :current-stage="currentStage"
      @version-selected="handleVersionSelect"
      @retry-analysis="handleRetry"
      @go-back="goBack"
    />

    <div class="view-body">
      <UseCaseMainContent :use-cases="useCases" />
      <InputSidebar
        :inputs="inputs"
        :is-deleting-input="isDeletingInput"
        @add-input-click="showAddInputModal = true"
        @delete-input="openDeleteSpecificModal"
      />
    </div>

    <AppModal
      v-model="showModal"
      :title="modalTitle"
      :message="modalMessage"
      :isConfirmation="true"
      @confirm="handleConfirm"
    />

    <!-- Add Input Modal -->
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
import ProjectHeader from '@/components/ProjectHeader.vue'
import UseCaseMainContent from '@/components/UseCaseMainContent.vue'
import InputSidebar from '@/components/InputSidebar.vue'

export default {
  name: 'ProjectDetailView',
  components: {
    AppModal,
    ProjectHeader,
    UseCaseMainContent,
    InputSidebar,
  },
  data() {
    return {
      project: {},
      versions: [],
      inputs: [],
      useCases: [],
      selectedVersionId: null,

      // Retry state
      isRetrying: false,
      processingProgress: 0,
      currentStage: 'Initializing...',
      pollingInterval: null,
      currentPollingVersionId: null,

      // UI state
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
    hasFailedVersion() {
      return this.versions.some((version) => version.status === 'failed')
    },
    failedVersion() {
      return this.versions.find((version) => version.status === 'failed')
    },
    canSubmit() {
      return this.selectedFiles.length > 0 || this.rawText.trim().length > 0
    },
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

    // ========== VERSION MANAGEMENT ==========
    handleVersionSelect(versionId) {
      this.selectedVersionId = versionId
      // TODO: Load use cases và inputs cho version được chọn
      this.fetchProjectData(this.project._id)
    },

    // ========== RETRY FUNCTIONALITY ==========
    async handleRetry() {
      if (!this.failedVersion || this.isRetrying) return

      this.isRetrying = true
      this.processingProgress = 0
      this.currentStage = 'Initializing...'
      this.currentPollingVersionId = this.failedVersion._id

      try {
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

          this.saveRetryState()

          if (status !== 'processing') {
            this.stopPolling()
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

    // Kiểm tra và khôi phục polling nếu có version đang processing
    checkAndRestorePolling() {
      if (this.hasProcessingVersion) {
        const processingVersion = this.processingVersion
        console.log('🔄 Found processing version, restoring polling:', processingVersion._id)

        this.isRetrying = true
        this.currentPollingVersionId = processingVersion._id
        this.startPolling(processingVersion._id)

        if (processingVersion.progress) {
          this.processingProgress = processingVersion.progress
        }
        if (processingVersion.stage) {
          this.currentStage = this.formatStageName(processingVersion.stage)
        }
      }
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

    // ========== HELPER METHODS ==========
    handleClickOutside(e) {
      const dropdown = this.$el.querySelector('.dropdown')
      if (dropdown && !dropdown.contains(e.target)) {
        // Note: Dropdown logic is now handled in ProjectHeader component
      }
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

.view-body {
  display: flex;
  gap: 24px;
  flex: 1;
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

.input-section {
  margin-bottom: 20px;
}

.input-section h4 {
  font-weight: bold;
  margin-bottom: 10px;
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

.selected-files h5 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.file-list {
  list-style: none;
  padding: 0;
  margin: 0;
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
  background: #0a4399;
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

@media (max-width: 768px) {
  .project-detail-view {
    padding: 15px;
  }

  .view-body {
    flex-direction: column;
  }

  .modal-content {
    width: 95%;
    margin: 20px;
  }
}
</style>