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

    <!-- Incremental Analysis Button -->
    <div v-if="showIncrementalButton" class="incremental-analysis-section">
      <div class="incremental-banner">
        <div class="banner-content">
          <span class="material-symbols-outlined banner-icon">update</span>
          <div class="banner-text">
            <h4>New Inputs Available</h4>
            <p>
              You have {{ unprocessedInputsCount }} unprocessed input(s). Run incremental analysis
              to update use cases.
            </p>
          </div>
        </div>
        <button
          class="incremental-btn"
          @click="startIncrementalAnalysis"
          :disabled="isProcessingIncremental"
        >
          <span v-if="isProcessingIncremental" class="button-spinner-small"></span>
          {{ isProcessingIncremental ? 'Analyzing...' : 'Analyze Incremental' }}
        </button>
      </div>
    </div>

    <!-- Conflict Resolution Section -->
    <div v-if="hasConflicts" class="conflicts-section">
      <div class="conflicts-header">
        <h3>Conflicts Detected</h3>
        <p>Please resolve the following conflicts to complete the analysis:</p>
      </div>

      <div class="conflicts-list">
        <div
          v-for="(conflict, index) in pendingConflicts"
          :key="conflict.conflict_id"
          class="conflict-item"
        >
          <div class="conflict-header">
            <h4>Conflict {{ index + 1 }}</h4>
            <span class="conflict-id">ID: {{ conflict.conflict_id }}</span>
          </div>

          <div class="conflict-comparison">
            <!-- Existing Use Case -->
            <div
              class="conflict-option"
              :class="{ selected: selectedResolutions[conflict.conflict_id] === 'old' }"
            >
              <div class="option-header">
                <span class="option-badge old">Existing</span>
                <div class="option-actions">
                  <button class="detail-btn" @click="showConflictDetail(conflict, 'old')">
                    <span class="material-symbols-outlined">visibility</span>
                    Detail
                  </button>
                  <button
                    class="select-option-btn"
                    :class="{ selected: selectedResolutions[conflict.conflict_id] === 'old' }"
                    @click="selectResolution(conflict.conflict_id, 'old')"
                  >
                    <span
                      v-if="selectedResolutions[conflict.conflict_id] === 'old'"
                      class="material-symbols-outlined"
                      >check_circle</span
                    >
                    {{
                      selectedResolutions[conflict.conflict_id] === 'old' ? 'Selected' : 'Select'
                    }}
                  </button>
                </div>
              </div>
              <div class="use-case-preview">
                <h5>{{ conflict.existing.name || conflict.existing.goal }}</h5>
                <p class="use-case-description">
                  {{ conflict.existing.description || 'No description' }}
                </p>
                <div class="use-case-meta">
                  <div v-if="conflict.existing.actors" class="meta-item">
                    <strong>Actors:</strong> {{ conflict.existing.actors.join(', ') }}
                  </div>
                  <div v-if="conflict.existing.preconditions" class="meta-item">
                    <strong>Preconditions:</strong> {{ conflict.existing.preconditions.join(', ') }}
                  </div>
                </div>
              </div>
            </div>

            <!-- New Use Case -->
            <div
              class="conflict-option"
              :class="{ selected: selectedResolutions[conflict.conflict_id] === 'new' }"
            >
              <div class="option-header">
                <span class="option-badge new">New</span>
                <div class="option-actions">
                  <button class="detail-btn" @click="showConflictDetail(conflict, 'new')">
                    <span class="material-symbols-outlined">visibility</span>
                    Detail
                  </button>
                  <button
                    class="select-option-btn"
                    :class="{ selected: selectedResolutions[conflict.conflict_id] === 'new' }"
                    @click="selectResolution(conflict.conflict_id, 'new')"
                  >
                    <span
                      v-if="selectedResolutions[conflict.conflict_id] === 'new'"
                      class="material-symbols-outlined"
                      >check_circle</span
                    >
                    {{
                      selectedResolutions[conflict.conflict_id] === 'new' ? 'Selected' : 'Select'
                    }}
                  </button>
                </div>
              </div>
              <div class="use-case-preview">
                <h5>{{ conflict.new.name || conflict.new.goal }}</h5>
                <p class="use-case-description">
                  {{ conflict.new.description || 'No description' }}
                </p>
                <div class="use-case-meta">
                  <div v-if="conflict.new.actors" class="meta-item">
                    <strong>Actors:</strong> {{ conflict.new.actors.join(', ') }}
                  </div>
                  <div v-if="conflict.new.preconditions" class="meta-item">
                    <strong>Preconditions:</strong> {{ conflict.new.preconditions.join(', ') }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="conflicts-actions">
        <button
          class="resolve-all-btn"
          @click="resolveAllConflicts"
          :disabled="!canResolveAllConflicts || isResolvingConflicts"
        >
          <span v-if="isResolvingConflicts" class="button-spinner-small"></span>
          {{
            isResolvingConflicts
              ? 'Resolving...'
              : `Resolve All (${resolvedConflictsCount}/${pendingConflicts.length})`
          }}
        </button>
      </div>
    </div>

    <div class="view-body">
      <UseCaseMainContent :use-cases="useCases" />
      <InputSidebar
        :inputs="inputs"
        :is-deleting-input="isDeletingInput"
        @add-input-click="showAddInputModal = true"
        @delete-input="openDeleteSpecificModal"
      />
    </div>

    <!-- Modals -->
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

    <!-- Processing Progress Modal -->
    <div v-if="showProcessingModal" class="modal-overlay">
      <div class="modal-content processing-modal">
        <div class="modal-header">
          <h3>{{ processingTitle }}</h3>
        </div>
        <div class="modal-body">
          <div class="progress-section">
            <div class="progress-info">
              <span class="current-stage">{{ currentStage }}</span>
              <span class="progress-percentage">{{ processingProgress }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: processingProgress + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Conflict Detail Modal -->
    <div v-if="showConflictDetailModal" class="modal-overlay">
      <div class="modal-content conflict-detail-modal">
        <div class="modal-header">
          <h3>Use Case Details</h3>
          <button class="close-btn" @click="showConflictDetailModal = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="detail-content">
            <div class="detail-section">
              <h4 class="detail-title">
                {{ currentDetailUseCase.name || currentDetailUseCase.goal }}
              </h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <label>ID:</label>
                  <span>{{ currentDetailUseCase.id || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <label>Role:</label>
                  <span>{{ currentDetailUseCase.role || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <label>Goal:</label>
                  <span>{{ currentDetailUseCase.goal || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <label>Reason:</label>
                  <span>{{ currentDetailUseCase.reason || 'N/A' }}</span>
                </div>
                <div class="detail-item full-width">
                  <label>Description:</label>
                  <span>{{ currentDetailUseCase.description || 'No description' }}</span>
                </div>
                <div class="detail-item full-width">
                  <label>Context:</label>
                  <span>{{ currentDetailUseCase.context || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <label>Priority:</label>
                  <span class="priority-badge" :class="currentDetailUseCase.priority">
                    {{ currentDetailUseCase.priority || 'N/A' }}
                  </span>
                </div>
              </div>
            </div>

            <div
              class="detail-section"
              v-if="currentDetailUseCase.actors && currentDetailUseCase.actors.length"
            >
              <h5>Actors</h5>
              <div class="tag-list">
                <span v-for="(actor, idx) in currentDetailUseCase.actors" :key="idx" class="tag">
                  {{ actor }}
                </span>
              </div>
            </div>

            <div
              class="detail-section"
              v-if="currentDetailUseCase.tasks && currentDetailUseCase.tasks.length"
            >
              <h5>Tasks</h5>
              <ul class="detail-list">
                <li v-for="(task, idx) in currentDetailUseCase.tasks" :key="idx">{{ task }}</li>
              </ul>
            </div>

            <div
              class="detail-section"
              v-if="currentDetailUseCase.preconditions && currentDetailUseCase.preconditions.length"
            >
              <h5>Preconditions</h5>
              <ul class="detail-list">
                <li v-for="(precondition, idx) in currentDetailUseCase.preconditions" :key="idx">
                  {{ precondition }}
                </li>
              </ul>
            </div>

            <div
              class="detail-section"
              v-if="
                currentDetailUseCase.postconditions && currentDetailUseCase.postconditions.length
              "
            >
              <h5>Postconditions</h5>
              <ul class="detail-list">
                <li v-for="(postcondition, idx) in currentDetailUseCase.postconditions" :key="idx">
                  {{ postcondition }}
                </li>
              </ul>
            </div>

            <div
              class="detail-section"
              v-if="currentDetailUseCase.inputs && currentDetailUseCase.inputs.length"
            >
              <h5>Inputs</h5>
              <ul class="detail-list">
                <li v-for="(input, idx) in currentDetailUseCase.inputs" :key="idx">{{ input }}</li>
              </ul>
            </div>

            <div
              class="detail-section"
              v-if="currentDetailUseCase.outputs && currentDetailUseCase.outputs.length"
            >
              <h5>Outputs</h5>
              <ul class="detail-list">
                <li v-for="(output, idx) in currentDetailUseCase.outputs" :key="idx">
                  {{ output }}
                </li>
              </ul>
            </div>

            <div
              class="detail-section"
              v-if="currentDetailUseCase.triggers && currentDetailUseCase.triggers.length"
            >
              <h5>Triggers</h5>
              <ul class="detail-list">
                <li v-for="(trigger, idx) in currentDetailUseCase.triggers" :key="idx">
                  {{ trigger }}
                </li>
              </ul>
            </div>

            <div
              class="detail-section"
              v-if="currentDetailUseCase.exceptions && currentDetailUseCase.exceptions.length"
            >
              <h5>Exceptions</h5>
              <ul class="detail-list">
                <li v-for="(exception, idx) in currentDetailUseCase.exceptions" :key="idx">
                  {{ exception }}
                </li>
              </ul>
            </div>

            <div
              class="detail-section"
              v-if="currentDetailUseCase.rules && currentDetailUseCase.rules.length"
            >
              <h5>Rules</h5>
              <ul class="detail-list">
                <li v-for="(rule, idx) in currentDetailUseCase.rules" :key="idx">{{ rule }}</li>
              </ul>
            </div>

            <div
              class="detail-section"
              v-if="currentDetailUseCase.stakeholders && currentDetailUseCase.stakeholders.length"
            >
              <h5>Stakeholders</h5>
              <div class="tag-list">
                <span
                  v-for="(stakeholder, idx) in currentDetailUseCase.stakeholders"
                  :key="idx"
                  class="tag"
                >
                  {{ stakeholder }}
                </span>
              </div>
            </div>

            <div
              class="detail-section"
              v-if="currentDetailUseCase.constraints && currentDetailUseCase.constraints.length"
            >
              <h5>Constraints</h5>
              <ul class="detail-list">
                <li v-for="(constraint, idx) in currentDetailUseCase.constraints" :key="idx">
                  {{ constraint }}
                </li>
              </ul>
            </div>

            <div
              class="detail-section"
              v-if="
                currentDetailUseCase.related_usecases &&
                currentDetailUseCase.related_usecases.length
              "
            >
              <h5>Related Use Cases</h5>
              <div class="tag-list">
                <span
                  v-for="(related, idx) in currentDetailUseCase.related_usecases"
                  :key="idx"
                  class="tag"
                >
                  {{ related }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="showConflictDetailModal = false">Close</button>
          <button class="submit-btn" @click="selectFromDetail" :disabled="!currentDetailConflict">
            Select This Version
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
  startIncrementalAnalysis,
  resolveConflict,
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

      // Incremental Analysis state
      isProcessingIncremental: false,
      showIncrementalButton: false,
      unprocessedInputsCount: 0,
      currentVersionDetails: null,

      // Conflict Resolution state
      hasConflicts: false,
      pendingConflicts: [],
      selectedResolutions: {},
      isResolvingConflicts: false,

      // Conflict Detail Modal
      showConflictDetailModal: false,
      currentDetailUseCase: {},
      currentDetailConflict: null,
      currentDetailType: null,

      // UI state
      showAddInputModal: false,
      showProcessingModal: false,
      processingTitle: '',
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
    canResolveAllConflicts() {
      return (
        this.resolvedConflictsCount === this.pendingConflicts.length &&
        this.pendingConflicts.length > 0
      )
    },
    resolvedConflictsCount() {
      return Object.keys(this.selectedResolutions).length
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

        this.currentVersionDetails = result.current_version || null

        this.useCases = this.currentVersionDetails
          ? this.currentVersionDetails.requirement_model
          : []

        if (this.currentVersionDetails) {
          this.selectedVersionId = this.currentVersionDetails._id
        } else if (this.versions.length > 0) {
          this.selectedVersionId = this.versions[0]._id
        }

        this.checkUnprocessedInputs()
        this.checkConflicts()

        return true
      } catch (err) {
        console.error('Error fetching project details:', err)
        this.toast.error('Failed to load project data')
        return false
      }
    },

    // ========== INCREMENTAL ANALYSIS ==========
    checkUnprocessedInputs() {
      this.unprocessedInputsCount = this.inputs.filter((input) => !input.is_processed).length
      this.showIncrementalButton = this.unprocessedInputsCount > 0
    },

    async startIncrementalAnalysis() {
      if (!this.selectedVersionId || this.isProcessingIncremental) return

      this.isProcessingIncremental = true
      this.processingProgress = 0
      this.currentStage = 'Initializing...'
      this.showProcessingModal = true
      this.processingTitle = 'Incremental Analysis'

      try {
        const response = await startIncrementalAnalysis(this.project._id, this.selectedVersionId)

        if (response.data && response.data.success) {
          this.startPolling(this.selectedVersionId, 'incremental')
        } else {
          throw new Error(response.data?.message || 'Failed to start incremental analysis')
        }
      } catch (error) {
        console.error('Error starting incremental analysis:', error)
        this.handleIncrementalError(error.message || 'Failed to start incremental analysis')
      }
    },

    // ========== CONFLICT RESOLUTION ==========
    checkConflicts() {
      if (this.currentVersionDetails && this.currentVersionDetails.pending_conflicts?.length > 0) {
        this.hasConflicts = true
        this.pendingConflicts = this.currentVersionDetails.pending_conflicts
        this.selectedResolutions = {}
      } else {
        this.hasConflicts = false
        this.pendingConflicts = []
      }
    },

    selectResolution(conflictId, resolution) {
      this.$set(this.selectedResolutions, conflictId, resolution)
    },

    showConflictDetail(conflict, type) {
      this.currentDetailConflict = conflict
      this.currentDetailType = type
      this.currentDetailUseCase = type === 'old' ? conflict.existing : conflict.new
      this.showConflictDetailModal = true
    },

    selectFromDetail() {
      if (this.currentDetailConflict && this.currentDetailType) {
        this.selectResolution(this.currentDetailConflict.conflict_id, this.currentDetailType)
        this.showConflictDetailModal = false
      }
    },

    async resolveAllConflicts() {
      if (!this.canResolveAllConflicts || this.isResolvingConflicts) return

      this.isResolvingConflicts = true

      try {
        const resolutionPromises = Object.entries(this.selectedResolutions).map(
          ([conflictId, resolution]) =>
            resolveConflict(this.project._id, this.selectedVersionId, conflictId, resolution)
        )

        await Promise.all(resolutionPromises)

        this.toast.success('All conflicts resolved successfully!')
        await this.fetchProjectData(this.project._id)

        this.hasConflicts = false
        this.pendingConflicts = []
        this.selectedResolutions = {}
      } catch (error) {
        console.error('Error resolving conflicts:', error)
        this.toast.error('Failed to resolve conflicts')
      } finally {
        this.isResolvingConflicts = false
      }
    },

    // ========== VERSION MANAGEMENT ==========
    handleVersionSelect(versionId) {
      this.selectedVersionId = versionId
      this.fetchProjectData(this.project._id)
    },

    // ========== ENHANCED POLLING ==========
    startPolling(versionId, mode = 'retry') {
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
            mode,
          })

          if (version) {
            this.updateProgressFromStage(version.stage || 'initializing')
            if (version.progress) {
              this.processingProgress = version.progress
            }
          }

          if (mode === 'retry') {
            this.saveRetryState()
          }

          if (status !== 'processing') {
            this.stopPolling()

            if (mode === 'retry') {
              this.clearRetryState()
            }

            if (status === 'completed' || status === 'has_conflicts') {
              this.handleProcessingSuccess(mode)
            } else {
              this.handleProcessingFailure(mode)
            }
          }
        } catch (error) {
          console.error('Error during polling:', error)
          this.handlePollingError(mode)
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
      this.isProcessingIncremental = false
      this.currentPollingVersionId = null
    },

    async handleProcessingSuccess(mode) {
      this.processingProgress = 100
      this.currentStage = 'Completed'
      this.showProcessingModal = false
      this.stopPolling()

      const fetchSuccess = await this.fetchProjectData(this.project._id)

      const currentVersion = this.versions.find((v) => v._id === this.selectedVersionId)
      const finalStatus = currentVersion ? currentVersion.status : 'completed'

      if (fetchSuccess && finalStatus === 'has_conflicts') {
        this.checkConflicts()
      }

      const message =
        mode === 'incremental' ? 'Incremental analysis completed!' : 'Retry completed successfully!'
      this.toast.success(message)
    },

    handleProcessingFailure(mode) {
      this.showProcessingModal = false
      this.stopPolling()
      this.fetchProjectData(this.project._id)

      const message =
        mode === 'incremental' ? 'Incremental analysis failed.' : 'Retry failed. Please try again.'
      this.toast.error(message)
    },

    handleIncrementalError(message) {
      this.isProcessingIncremental = false
      this.showProcessingModal = false
      this.toast.error(message)
    },

    handlePollingError(mode) {
      this.showProcessingModal = false
      this.stopPolling()
      const message =
        mode === 'incremental'
          ? 'Error checking incremental analysis status.'
          : 'Error checking retry status.'
      this.toast.error(message)
    },

    // ========== RETRY FUNCTIONALITY ==========
    async handleRetry() {
      if (!this.failedVersion || this.isRetrying) return

      this.isRetrying = true
      this.processingProgress = 0
      this.currentStage = 'Initializing...'
      this.showProcessingModal = true
      this.processingTitle = 'Retry Analysis'
      this.currentPollingVersionId = this.failedVersion._id

      try {
        this.saveRetryState()
        await retryProjectAnalysis(this.project._id, this.failedVersion._id)
        this.startPolling(this.failedVersion._id, 'retry')
      } catch (error) {
        console.error('Error retrying analysis:', error)
        this.handleRetryError('Failed to start retry process')
      }
    },

    handleRetryError(message) {
      this.isRetrying = false
      this.showProcessingModal = false
      this.currentPollingVersionId = null
      this.clearRetryState()
      this.toast.error(message)
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
/* Existing styles remain the same, adding only new styles for conflict detail */

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

/* Conflict Option Selection */
.conflict-option.selected {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.option-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.detail-btn {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.detail-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.use-case-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-item {
  font-size: 12px;
  color: #6b7280;
}

/* Conflict Detail Modal */
.conflict-detail-modal {
  max-width: 800px;
  max-height: 90vh;
}

.detail-content {
  padding: 0;
}

.detail-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-title {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 8px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-item span {
  font-size: 14px;
  color: #374151;
  word-break: break-word;
}

.priority-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.priority-badge.high {
  background: #fee2e2;
  color: #dc2626;
}

.priority-badge.medium {
  background: #fef3c7;
  color: #d97706;
}

.priority-badge.low {
  background: #d1fae5;
  color: #059669;
}

.detail-section h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 4px 8px;
  background: #e5e7eb;
  color: #374151;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.detail-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-list li {
  padding: 8px 12px;
  background: white;
  border-radius: 4px;
  font-size: 13px;
  color: #374151;
  border-left: 3px solid #3b82f6;
}

/* Existing styles remain unchanged below */
.incremental-analysis-section {
  margin-bottom: 24px;
}

.incremental-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.banner-icon {
  font-size: 32px;
}

.banner-text h4 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
}

.banner-text p {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
}

.incremental-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 10px 20px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.incremental-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.incremental-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.conflicts-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.conflicts-header h3 {
  margin: 0 0 8px 0;
  color: #dc2626;
  font-size: 20px;
}

.conflicts-header p {
  margin: 0;
  color: #6b7280;
}

.conflicts-list {
  margin: 20px 0;
}

.conflict-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  background: #f9fafb;
}

.conflict-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.conflict-header h4 {
  margin: 0;
  color: #374151;
}

.conflict-id {
  font-size: 12px;
  color: #6b7280;
  font-family: monospace;
}

.conflict-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.conflict-option {
  background: white;
  border-radius: 8px;
  padding: 16px;
  border: 2px solid #e5e7eb;
  transition: all 0.3s ease;
}

.conflict-option:hover {
  border-color: #d1d5db;
}

.option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.option-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.option-badge.old {
  background: #fef3c7;
  color: #92400e;
}

.option-badge.new {
  background: #d1fae5;
  color: #065f46;
}

.select-option-btn {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.select-option-btn:hover {
  background: #f3f4f6;
}

.select-option-btn.selected {
  background: #1a365d;
  color: white;
  border-color: #1a365d;
}

.use-case-preview h5 {
  margin: 0 0 8px 0;
  color: #111827;
  font-size: 16px;
}

.use-case-description {
  margin: 0 0 12px 0;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.4;
}

.conflicts-actions {
  display: flex;
  justify-content: flex-end;
}

.resolve-all-btn {
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.resolve-all-btn:hover:not(:disabled) {
  background: #b91c1c;
  transform: translateY(-1px);
}

.resolve-all-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

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

.processing-modal {
  max-width: 500px;
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

.progress-section {
  padding: 20px 0;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.current-stage {
  font-weight: 500;
  color: #374151;
}

.progress-percentage {
  font-weight: 600;
  color: #1a365d;
}

.progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1a365d, #2d5aa0);
  border-radius: 4px;
  transition: width 0.3s ease;
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
  background: #f3f4f6;
  color: #374151;
}

.text-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.text-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.validation-message {
  color: #dc2626;
  font-size: 14px;
  text-align: center;
  padding: 10px;
  background: #fef2f2;
  border-radius: 6px;
  margin-top: 10px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e5e7eb;
}

.cancel-btn {
  padding: 10px 20px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background: #f9fafb;
}

.submit-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #1a365d;
  color: white;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
  background: #2d5aa0;
}

.submit-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.button-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
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
    padding: 16px;
  }

  .view-body {
    flex-direction: column;
  }

  .incremental-banner {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .conflict-comparison {
    grid-template-columns: 1fr;
  }

  .modal-content {
    width: 95%;
    margin: 20px;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .option-actions {
    flex-direction: column;
    gap: 6px;
  }
}
</style>