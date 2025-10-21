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
      @show-sharing="showSharingModal = true"
    />

    <!-- Navigation Tabs -->
    <div class="navigation-tabs">
      <button class="tab-button active" @click="navigateToUsecase">
        <span class="material-symbols-outlined">list_alt</span>
        Use Cases Management
      </button>
      <button class="tab-button" @click="navigateToOutput">
        <span class="material-symbols-outlined">output</span>
        Output Management
      </button>
    </div>

    <!-- Incremental Analysis Component -->
    <IncrementalAnalysis
      :is-processing-incremental="isProcessingIncremental"
      :show-incremental-button="showIncrementalButton"
      :unprocessed-inputs-count="unprocessedInputsCount"
      :processing-progress="processingProgress"
      :current-stage="currentStage"
      @start-incremental-analysis="startIncrementalAnalysis"
    />

    <!-- Conflict Resolution Section -->
    <HandleConflict
      :has-conflicts="hasConflicts"
      :pending-conflicts="pendingConflicts"
      :selected-resolutions="selectedResolutions"
      :is-finding-conflicts="isFindingConflicts"
      :is-resolving-conflicts="isResolvingConflicts"
      :is-skipping-conflict="isSkippingConflict"
      :can-resolve-all-conflicts="canResolveAllConflicts"
      :resolved-conflicts-count="resolvedConflictsCount"
      @find-conflicts="findAndHandleConflicts"
      @select-resolution="selectResolution"
      @resolve-all="resolveAllConflicts"
      @show-detail="showConflictDetail"
      @skip-conflict="skipConflict"
    />

    <div class="view-body">
      <UseCaseMainContent
        :use-cases="useCases"
        :project-id="project._id"
        :version-id="selectedVersionId"
        :loading="isManagingUsecase"
        :available-use-cases="availableUseCases"
        :project-data="project"
        @addUsecase="handleAddUsecase"
        @updateUsecase="handleUpdateUsecase"
        @deleteUsecase="handleDeleteUsecase"
      />
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

    <!-- Add Input Modal Component -->
    <AddInputModal
      v-if="showAddInputModal"
      :is-adding-input="isAddingInput"
      @close="showAddInputModal = false"
      @add-inputs="handleAddInputs"
    />

    <!-- Conflict Detail Modal -->
    <ConflictDetailModal
      v-if="showConflictDetailModal"
      :use-case="currentDetailUseCase"
      :show-skip-button="true"
      :is-skipping="isSkippingConflict"
      @close="showConflictDetailModal = false"
      @skip-conflict="skipCurrentConflict"
    />

    <!-- Sharing Modal -->
    <ProjectSharingModal
      v-if="showSharingModal"
      :project-id="project._id"
      @close="showSharingModal = false"
    />
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
  findProjectConflicts,
  resolveProjectConflict,
  skipConflict,
  usecaseApi,
} from '@/api/project'
import { useToast } from 'vue-toastification'
import AppModal from '@/components/AppModal.vue'
import ProjectHeader from '@/components/ProjectHeader.vue'
import UseCaseMainContent from '@/components/UseCaseMainContent.vue'
import InputSidebar from '@/components/InputSidebar.vue'
import HandleConflict from '@/components/HandleConflict.vue'
import ConflictDetailModal from '@/components/ConflictDetailModal.vue'
import AddInputModal from '@/components/AddInputModal.vue'
import IncrementalAnalysis from '@/components/IncrementalAnalysis.vue'
import ProjectSharingModal from '@/components/ProjectSharingModal.vue'
import { socket } from '@/utils/socket'

export default {
  name: 'ProjectDetailView',
  components: {
    AppModal,
    ProjectHeader,
    UseCaseMainContent,
    InputSidebar,
    HandleConflict,
    ConflictDetailModal,
    AddInputModal,
    IncrementalAnalysis,
    ProjectSharingModal,
  },
  data() {
    return {
      project: {},
      versions: [],
      inputs: [],
      useCases: [],
      selectedVersionId: null,
      showSharingModal: false,

      // ========== RETRY STATE ==========
      isRetrying: false,
      processingProgress: 0,
      currentStage: 'Initializing...',
      pollingInterval: null,
      currentPollingVersionId: null,

      // ========== INCREMENTAL ANALYSIS STATE ==========
      isProcessingIncremental: false,
      showIncrementalButton: false,
      unprocessedInputsCount: 0,
      currentVersionDetails: null,

      // ========== CONFLICT RESOLUTION STATE ==========
      hasConflicts: false,
      pendingConflicts: [],
      selectedResolutions: {},
      isResolvingConflicts: false,
      isFindingConflicts: false,
      isSkippingConflict: false,

      // ========== MODAL STATES ==========
      showConflictDetailModal: false,
      currentDetailUseCase: {},
      showAddInputModal: false,
      showModal: false,
      modalTitle: '',
      modalMessage: '',
      confirmAction: null,

      // ========== INPUT MANAGEMENT ==========
      isAddingInput: false,
      isDeletingInput: null,

      // ========== USECASE =============
      isManagingUsecase: false,
      currentEditingUseCase: null,

      // ========== REALTIME STATE ==========
      isSocketConnected: false,

      toast: useToast(),
    }
  },
  computed: {
    // ========== VERSION STATUS COMPUTED ==========
    hasFailedVersion() {
      return this.versions.some((version) => version.status === 'failed')
    },
    failedVersion() {
      return this.versions.find((version) => version.status === 'failed')
    },
    hasProcessingVersion() {
      return this.versions.some((version) => version.status === 'processing')
    },
    processingVersion() {
      return this.versions.find((version) => version.status === 'processing')
    },

    // ========== CONFLICT RESOLUTION COMPUTED ==========
    canResolveAllConflicts() {
      return (
        this.resolvedConflictsCount === this.pendingConflicts.length &&
        this.pendingConflicts.length > 0
      )
    },
    resolvedConflictsCount() {
      return Object.keys(this.selectedResolutions).length
    },
    availableUseCases() {
      if (!this.useCases || this.useCases.length === 0) {
        return []
      }

      return this.useCases
        .map((uc) => ({
          id: uc.id,
          name: uc.name,
        }))
        .filter((uc) => !this.currentEditingUseCase || uc.id !== this.currentEditingUseCase.id)
    },

    // ========== REALTIME COMPUTED ==========
    currentUserId() {
      return localStorage.getItem('userId')
    },
  },

  // ========== LIFECYCLE HOOKS ==========
  async created() {
    const projectId = this.$route.params.id
    if (projectId) {
      await this.fetchProjectData(projectId)
      this.checkAndRestorePolling()
      this.checkIncrementalProcessingStatus()

      // Initialize socket connection
      this.initSocketConnection(projectId)
    }
    document.addEventListener('click', this.handleClickOutside)
  },

  beforeUnmount() {
    this.cleanupPolling()
    this.cleanupSocketConnection()
    document.removeEventListener('click', this.handleClickOutside)
  },

  methods: {
    // ========== SOCKET & REALTIME METHODS ==========
    initSocketConnection(projectId) {
      if (!socket) return

      // Socket event listeners
      socket.on('connect', () => {
        this.isSocketConnected = true
        console.log('✅ Connected to socket server')
        this.joinProjectRoom(projectId)
      })

      socket.on('disconnect', () => {
        this.isSocketConnected = false
        console.log('❌ Disconnected from socket server')
      })

      socket.on('usecase_event', this.handleUsecaseEvent)

      // Join project room if already connected
      if (socket.connected) {
        this.joinProjectRoom(projectId)
      }
    },

    joinProjectRoom(projectId) {
      if (socket && projectId) {
        socket.emit('join_project', projectId)
        console.log(`✅ Joined project room: project_${projectId}`)
      }
    },

    cleanupSocketConnection() {
      if (socket) {
        socket.off('connect')
        socket.off('disconnect')
        socket.off('usecase_event', this.handleUsecaseEvent)

        // Leave project room
        if (this.project._id) {
          socket.emit('leave_project', this.project._id)
        }
      }
    },

    handleUsecaseEvent(event) {
      console.log('📩 Realtime usecase event received:', event)

      // Bỏ qua events từ chính mình
      if (event.userId === this.currentUserId) {
        return
      }

      switch (event.type) {
        case 'USECASE_CREATED':
          this.handleRemoteUsecaseCreated(event)
          break
        case 'USECASE_UPDATED':
          this.handleRemoteUsecaseUpdated(event)
          break
        case 'USECASE_DELETED':
          this.handleRemoteUsecaseDeleted(event)
          break
        case 'USECASES_RELOAD':
          this.handleRemoteUsecasesReload(event)
          break
        default:
          console.warn('Unknown usecase event type:', event.type)
      }
    },

    handleRemoteUsecaseCreated(event) {
      this.toast.info(`New usecase created by team: ${event.usecase.name}`)

      // Thêm usecase mới vào danh sách
      if (!this.useCases.find((uc) => uc.id === event.usecase.id)) {
        this.useCases.push(event.usecase)

        // Trigger UI update
        this.$forceUpdate()
      }
    },

    handleRemoteUsecaseUpdated(event) {
      this.toast.info(`Usecase updated by team: ${event.usecase.name}`)

      // Cập nhật usecase trong danh sách
      const index = this.useCases.findIndex((uc) => uc.id === event.usecase.id)
      if (index !== -1) {
        this.useCases.splice(index, 1, event.usecase)

        // Nếu đang edit usecase này, close modal
        if (this.currentEditingUseCase?.id === event.usecase.id) {
          this.currentEditingUseCase = null
        }

        // Trigger UI update
        this.$forceUpdate()
      }
    },

    handleRemoteUsecaseDeleted(event) {
      this.toast.info(`Usecase deleted by team: ${event.usecaseId}`)

      // Xóa usecase khỏi danh sách
      this.useCases = this.useCases.filter((uc) => uc.id !== event.usecaseId)

      // Trigger UI update
      this.$forceUpdate()
    },

    handleRemoteUsecasesReload(event) {
      this.toast.info('Usecases updated by team')
      this.useCases = event.usecases
      this.$forceUpdate()
    },

    // ========== NAVIGATION METHODS ==========
    navigateToUsecase() {
      // Đã ở trang usecase management
    },

    navigateToOutput() {
      this.$router.push({
        name: 'OutputManagement',
        params: { id: this.project._id },
      })
    },

    // ========== DATA FETCHING ==========
    async fetchProjectData(projectId) {
      try {
        const userId = this.currentUserId
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
        this.checkConflictsOnLoad()
        this.checkUnprocessedInputs()
        this.checkConflicts()

        return true
      } catch (err) {
        console.error('Error fetching project details:', err)
        this.toast.error('Failed to load project data')
        return false
      }
    },

    async fetchUseCases() {
      if (!this.selectedVersionId) return

      try {
        const response = await usecaseApi.getUsecases(this.selectedVersionId)
        this.useCases = response.data.data || []
      } catch (error) {
        console.error('Error fetching use cases:', error)
        this.toast.error('Failed to load use cases')
      }
    },

    // ========== USECASE MANAGEMENT ==========
    async handleAddUsecase(data) {
      this.isManagingUsecase = true
      try {
        console.log('🚀 Sending usecase data to BE:', data)

        // 🔥 VALIDATION PHÍA FE TRƯỚC KHI GỬI
        const requiredFields = ['name', 'role', 'goal', 'reason', 'priority']
        const missingFields = requiredFields.filter((field) => !data[field])

        // if (missingFields.length > 0) {
        //   throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`)
        // }

        // if (!data.tasks || data.tasks.length === 0 || !data.tasks[0]?.trim()) {
        //   throw new Error('At least one task is required')
        // }

        const response = await usecaseApi.createUsecase(this.selectedVersionId, data)

        if (response.data && response.data.status === 'Success') {
          this.toast.success('Use case created successfully')
          await this.fetchUseCases()
          await this.fetchProjectData(this.project._id)
        } else {
          const errorMessage = response.data?.message || 'Failed to create use case'
          throw new Error(errorMessage)
        }
      } catch (error) {
        console.error('❌ Error creating use case:', error)
        const errorMessage =
          error.response?.data?.message || error.message || 'Failed to create use case'
        this.toast.error(errorMessage)
      } finally {
        this.isManagingUsecase = false
      }
    },

    async handleUpdateUsecase({ usecaseId, data }) {
      this.isManagingUsecase = true
      try {
        const response = await usecaseApi.updateUsecase(this.selectedVersionId, usecaseId, data)

        if (response.data.status === 'Success') {
          this.toast.success('Use case updated successfully')
          await this.fetchUseCases()
          await this.fetchProjectData(this.project._id)
        } else {
          throw new Error(response.data.message || 'Failed to update use case')
        }
      } catch (error) {
        console.error('Error updating use case:', error)
        this.toast.error(
          error.response?.data?.error || error.message || 'Failed to update use case'
        )
        throw error
      } finally {
        this.isManagingUsecase = false
      }
    },

    async handleDeleteUsecase(usecaseId) {
      this.isManagingUsecase = true
      try {
        const response = await usecaseApi.deleteUsecase(this.selectedVersionId, usecaseId)

        if (response.data.status === 'Success') {
          this.toast.success('Use case deleted successfully')
          await this.fetchProjectData(this.project._id)
        } else {
          throw new Error(response.data.message || 'Failed to delete use case')
        }
      } catch (error) {
        console.error('Error deleting use case:', error)
        this.toast.error(
          error.response?.data?.error || error.message || 'Failed to delete use case'
        )
        throw error
      } finally {
        this.isManagingUsecase = false
      }
    },

    // ========== CONFLICT RESOLUTION ==========
    async findAndHandleConflicts() {
      if (!this.selectedVersionId) {
        this.toast.error('Please select a version first.')
        return
      }
      this.isFindingConflicts = true
      try {
        await findProjectConflicts(this.project._id, this.selectedVersionId)
        this.toast.success('Scan completed! Refreshing data...')
        await this.fetchProjectData(this.project._id)
      } catch (error) {
        console.error('Error finding conflicts:', error)
        this.toast.error(error.response?.data?.error || 'Failed to scan for duplicates.')
      } finally {
        this.isFindingConflicts = false
      }
    },

    checkConflictsOnLoad() {
      const currentVersion = this.versions.find((v) => v._id === this.selectedVersionId)
      if (currentVersion && currentVersion.pending_conflicts?.length > 0) {
        this.hasConflicts = true
        this.pendingConflicts = currentVersion.pending_conflicts
        this.selectedResolutions = {}
      } else {
        this.hasConflicts = false
        this.pendingConflicts = []
      }
    },

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

    selectResolution(conflictId, useCaseId) {
      this.selectedResolutions = {
        ...this.selectedResolutions,
        [conflictId]: useCaseId,
      }
    },

    showConflictDetail(useCase) {
      this.currentDetailUseCase = useCase
      this.showConflictDetailModal = true
    },

    async resolveAllConflicts() {
      if (!this.canResolveAllConflicts || this.isResolvingConflicts) return

      this.isResolvingConflicts = true

      let resolvedCount = 0
      const totalToResolve = this.resolvedConflictsCount

      try {
        for (const [conflictId, keepUseCaseId] of Object.entries(this.selectedResolutions)) {
          const payload = {
            conflict_id: conflictId,
            keep_use_case_id: keepUseCaseId,
          }

          await resolveProjectConflict(this.project._id, this.selectedVersionId, payload)

          resolvedCount++
        }

        this.toast.success(`${resolvedCount} conflict(s) resolved successfully!`)
        await this.fetchProjectData(this.project._id)
      } catch (error) {
        console.error('Error resolving conflicts:', error)
        this.toast.error(
          error.response?.data?.error ||
            `Failed to resolve conflicts after ${resolvedCount} successes.`
        )
      } finally {
        this.isResolvingConflicts = false
      }
    },

    // ========== CONFLICT SKIPPING ==========
    async skipConflict(conflictId) {
      if (!this.selectedVersionId || !conflictId) return

      this.isSkippingConflict = true
      try {
        await skipConflict(this.selectedVersionId, conflictId)
        this.toast.success('Conflict skipped successfully')

        await this.fetchProjectData(this.project._id)
      } catch (error) {
        console.error('Error skipping conflict:', error)
        this.toast.error(error.response?.data?.error || 'Failed to skip conflict')
      } finally {
        this.isSkippingConflict = false
      }
    },

    async skipCurrentConflict() {
      if (this.currentDetailUseCase?.conflict_id) {
        await this.skipConflict(this.currentDetailUseCase.conflict_id)
        this.showConflictDetailModal = false
      }
    },

    // ========== INCREMENTAL ANALYSIS ==========
    checkUnprocessedInputs() {
      this.unprocessedInputsCount = this.inputs.filter((input) => !input.is_processed).length
      this.showIncrementalButton = this.unprocessedInputsCount > 0 && !this.isProcessingIncremental
    },

    async checkIncrementalProcessingStatus() {
      try {
        const response = await getVersionStatus(this.selectedVersionId)
        const { status, version } = response.data.data

        if (status === 'processing' && version.is_processing) {
          this.isProcessingIncremental = true
          this.processingProgress = version.progress || 0
          this.currentStage = this.formatStageName(version.stage || 'initializing')
          this.startPolling(this.selectedVersionId, 'incremental')
        }
      } catch (error) {
        console.error('Error checking processing status:', error)
      }
    },

    async startIncrementalAnalysis() {
      if (!this.selectedVersionId || this.isProcessingIncremental) return

      this.isProcessingIncremental = true
      this.processingProgress = 0
      this.currentStage = 'Initializing...'
      this.showIncrementalButton = false

      try {
        const response = await startIncrementalAnalysis(this.project._id, this.selectedVersionId)

        if (response.data && response.data.success) {
          setTimeout(() => {
            this.startPolling(this.selectedVersionId, 'incremental')
          }, 500)
        } else {
          throw new Error(response.data?.message || 'Failed to start incremental analysis')
        }
      } catch (error) {
        console.error('Error starting incremental analysis:', error)
        this.handleIncrementalError(error.message || 'Failed to start incremental analysis')
      }
    },

    // ========== VERSION MANAGEMENT ==========
    handleVersionSelect(versionId) {
      this.selectedVersionId = versionId
      this.fetchProjectData(this.project._id)
    },

    // ========== POLLING & PROGRESS MANAGEMENT ==========
    startPolling(versionId, mode = 'retry') {
      this.cleanupPolling()

      this.pollingInterval = setInterval(async () => {
        try {
          const response = await getVersionStatus(versionId)
          const { status, version } = response.data.data

          if (version) {
            this.processingProgress = version.progress || this.processingProgress
            this.currentStage = this.formatStageName(version.stage || 'initializing')

            if (mode === 'incremental' && status === 'processing') {
              this.isProcessingIncremental = true
            }
          }

          if (mode === 'retry') {
            this.saveRetryState()
          }

          if (status !== 'processing') {
            this.stopPolling()
            if (mode === 'retry') this.clearRetryState()

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
      this.stopPolling()
      this.fetchProjectData(this.project._id)

      const message =
        mode === 'incremental' ? 'Incremental analysis failed.' : 'Retry failed. Please try again.'
      this.toast.error(message)
    },

    handleIncrementalError(message) {
      this.isProcessingIncremental = false
      this.showIncrementalButton = true
      this.toast.error(message)
    },

    handlePollingError(mode) {
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
      this.currentPollingVersionId = null
      this.clearRetryState()
      this.toast.error(message)
    },

    // ========== INPUT MANAGEMENT ==========
    async handleAddInputs(formData) {
      this.isAddingInput = true

      try {
        const versionId = this.selectedVersionId
        if (!versionId) {
          throw new Error('No version selected')
        }

        const minLoadingTime = new Promise((resolve) => setTimeout(resolve, 2000))
        const apiCall = addInputsToVersion(versionId, formData)

        const [_, response] = await Promise.all([minLoadingTime, apiCall])

        if (response.data && response.data.status === 'Success') {
          this.toast.success('Input added successfully!')
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

/* Navigation Tabs */
.navigation-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  padding: 0 8px;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-button:hover {
  border-color: #1a365d;
  color: #1a365d;
}

.tab-button.active {
  background: #1a365d;
  border-color: #1a365d;
  color: white;
}

.tab-button .material-symbols-outlined {
  font-size: 20px;
}
/* CSS remains the same as original */
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

.navigation-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  padding: 0 8px;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-button:hover {
  border-color: #1a365d;
  color: #1a365d;
}

.tab-button.active {
  background: #1a365d;
  border-color: #1a365d;
  color: white;
}

.tab-button .material-symbols-outlined {
  font-size: 20px;
}
</style>