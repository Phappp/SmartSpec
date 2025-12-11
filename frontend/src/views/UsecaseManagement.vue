<template>
  <div class="project-detail-view">
    <div class="project-detail-view">
      <ProjectHeader
        :project="project"
        :versions="versions"
        :selected-version-id="selectedVersionId"
        :is-retrying="effectiveProcessingState.isRetrying"
        :active-users="activeUsers"
        @version-selected="handleVersionSelect"
        @version-rollback-completed="handleVersionRollbackCompleted"
        @retry-analysis="handleRetry"
        @go-back="goBack"
        @show-sharing="showSharingModal = true"
        @activeUsersUpdate="handleActiveUsersUpdate"
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
          :is-finding-conflicts="isFindingConflicts"
          :new-use-case-ids="newUseCaseIds"
          @addUsecase="handleAddUsecase"
          @updateUsecase="handleUpdateUsecase"
          @deleteUsecase="handleDeleteUsecase"
          @refresh="handleRefreshUsecases"
          @find-conflicts="findAndHandleConflicts"
          @remove-highlight="handleRemoveHighlight"
        />
        <!-- Trong template của UsecaseManagement.vue -->
        <InputSidebar
          :inputs="inputs"
          :is-deleting-input="isDeletingInput"
          :is-processing-incremental="effectiveProcessingState.isProcessingIncremental"
          :is-processing-failed="isProcessingFailed"
          :show-incremental-button="showIncrementalButton"
          :unprocessed-inputs-count="unprocessedInputsCount"
          :is-adding-input="isAddingInput"
          @delete-input="openDeleteSpecificModal"
          @input-added="handleInputAdded"
          @input-deleted="handleInputDeleted"
          @inputs-reloaded="handleInputsReloaded"
          @add-inputs="handleAddInputs"
          @start-incremental-analysis="startIncrementalAnalysis"
          @retry-incremental="retryIncrementalAnalysis"
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
  switchCurrentVersion,
} from '@/api/project'
import { useToast } from 'vue-toastification'
import AppModal from '@/components/AppModal.vue'
import ProjectHeader from '@/components/ProjectHeader.vue'
import UseCaseMainContent from '@/components/usecase/UseCaseMainContent.vue'
import InputSidebar from '@/components/usecase/InputSidebar.vue'
import HandleConflict from '@/components/usecase/HandleConflict.vue'
import ConflictDetailModal from '@/components/usecase/ConflictDetailModal.vue'
import ProjectSharingModal from '@/components/ProjectSharingModal.vue'
import { socket } from '@/utils/socket'
import eventBus from '@/utils/eventBus'
import {
  saveSelectedVersion,
  getSelectedOrDefaultVersion,
  filterApprovedVersions,
  isOwner as checkIsOwner,
} from '@/utils/versionSync'

export default {
  name: 'ProjectDetailView',
  components: {
    AppModal,
    ProjectHeader,
    UseCaseMainContent,
    InputSidebar,
    HandleConflict,
    ConflictDetailModal,
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
      activeUsers: [],
      isProcessingFailed: false,

      // ========== RETRY STATE ==========
      isRetrying: false,
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
      previousUseCaseIds: new Set(), // Track usecase IDs để detect mới
      newUseCaseIds: new Set(), // Track usecases mới để highlight

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
    // Đảm bảo chỉ một state được active
    effectiveProcessingState() {
      if (this.isProcessingIncremental && this.isRetrying) {
        // Nếu cả hai đều true, ưu tiên incremental
        console.warn('⚠️ Both states active, prioritizing incremental')
        return { isProcessingIncremental: true, isRetrying: false }
      }
      return {
        isProcessingIncremental: this.isProcessingIncremental,
        isRetrying: this.isRetrying,
      }
    },
    hasProcessingFailed() {
      const currentVersion = this.versions.find((v) => v._id === this.selectedVersionId)
      console.log('🔍 Checking failed state:', {
        versionStatus: currentVersion?.status,
        progress: this.processingProgress,
        isProcessing: this.isProcessingIncremental,
        isRetrying: this.isRetrying,
      })

      return (
        currentVersion &&
        currentVersion.status === 'failed' &&
        // CHO PHÉP hiển thị ngay cả khi isRetrying là true (vì có thể cả 2 process cùng chạy)
        !this.isProcessingIncremental
        // BỎ: !this.isRetrying
      )
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

    // Listen for version-approved event from PreviewModal
    eventBus.on('version-approved', this.handleVersionApproved)
  },

  beforeUnmount() {
    this.cleanupPolling()
    this.cleanupSocketConnection()
    document.removeEventListener('click', this.handleClickOutside)

    // Remove event listener
    eventBus.off('version-approved', this.handleVersionApproved)
  },
  watch: {
    activeUsers: {
      handler(newVal, oldVal) {
        console.log('🎯 ACTIVE USERS WATCHER TRIGGERED!')
        console.log('📊 Old length:', oldVal?.length)
        console.log('📊 New length:', newVal?.length)
        console.log('📊 New data:', newVal)
      },
      immediate: true,
      deep: true,
    },
    hasProcessingFailed: {
      handler(newVal, oldVal) {
        console.log('🔄 Failed state changed:', { old: oldVal, new: newVal })
        this.isProcessingFailed = newVal
      },
      immediate: true,
    },
  },
  methods: {
    // ========== SOCKET & REALTIME METHODS ==========
    initSocketConnection(projectId) {
      if (!socket) return

      socket.auth = { userId: this.currentUserId }

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

      // Existing usecase events
      socket.on('usecase_event', this.handleUsecaseEvent)

      // ✅ CẬP NHẬT: Input events - xử lý tất cả input events trong 1 handler
      socket.on('input_event', (event) => {
        console.log('📩 Raw input event received:', event.type)

        if (event.type === 'INCREMENTAL_PROGRESS') {
          this.handleIncrementalProgress(event)
        } else {
          this.handleInputEvent(event) // Tất cả input events khác qua đây
        }
      })

      // Presence events
      socket.on('user_joined', this.handleUserJoined)
      socket.on('user_left', this.handleUserLeft)

      // cho version events
      socket.on('version_event', this.handleVersionEvent)

      // Join project room if already connected
      if (socket.connected) {
        this.joinProjectRoom(projectId)
      }

      if (!socket.connected) {
        socket.connect()
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
        // ✅ QUAN TRỌNG: Disconnect tất cả listeners trước khi leave room
        socket.off('connect')
        socket.off('disconnect')
        socket.off('usecase_event', this.handleUsecaseEvent)
        socket.off('input_event', this.handleInputEvent)

        // ✅ THÊM: Presence cleanup
        socket.off('user_joined', this.handleUserJoined)
        socket.off('user_left', this.handleUserLeft)

        socket.off('version_event', this.handleVersionEvent)
        
        // ✅ THÊM: Cleanup incremental progress listener
        socket.off('INCREMENTAL_PROGRESS')
        
        // Leave project room
        if (this.project._id) {
          try {
          socket.emit('leave_project', this.project._id)
          } catch (error) {
            console.warn('⚠️ Error leaving project room:', error)
          }
        }
      }
    },
    handleUserJoined(event) {
      console.log('👤 User joined event received:', event)
      console.log('🔄 Current activeUsers before:', this.activeUsers)
      console.log('🔄 New activeUsers from event:', event.activeUsers)

      // ✅ LUÔN cập nhật activeUsers với dữ liệu mới nhất từ server
      this.activeUsers = event.activeUsers || []

      console.log('🔄 ActiveUsers after update:', this.activeUsers)
      console.log('🔄 Active users count:', this.activeUsers.length)

      if (event.userId !== this.currentUserId) {
        // this.toast.info(`${event.userInfo?.name || 'Someone'} joined the project`)
      } else {
        console.log('🔕 Skipped notification for own join event')
      }
    },

    handleUserLeft(event) {
      console.log('👤 User left event received:', event)
      console.log('🚪 Current activeUsers before:', this.activeUsers)
      console.log('🚪 New activeUsers from event:', event.activeUsers)

      // ✅ FIX TẠM: Nếu server gửi sai activeUsers, tự filter
      let updatedActiveUsers = event.activeUsers || []

      // Nếu user left vẫn còn trong activeUsers, tự động remove
      if (updatedActiveUsers.some((user) => user.userId === event.userId)) {
        console.log('⚠️ Server sent incorrect activeUsers, filtering manually...')
        updatedActiveUsers = updatedActiveUsers.filter((user) => user.userId !== event.userId)
      }

      this.activeUsers = updatedActiveUsers

      console.log('🚪 ActiveUsers after manual fix:', this.activeUsers)
      console.log('🚪 Active users count:', this.activeUsers.length)

      if (event.userId !== this.currentUserId) {
        // this.toast.info(`${event.userInfo?.name || 'Someone'} left the project`)
      }
    },

    // Trong UsecaseManagement.vue - handleInputEvent
    // Trong UsecaseManagement.vue - handleInputEvent
    handleVersionEvent(event) {
      console.log('📩 Realtime version event received:', event)

      // Bỏ qua events từ chính mình
      if (event.userId === this.currentUserId) return

      switch (event.type) {
        case 'VERSION_UPDATED':
          this.handleRemoteVersionUpdated(event)
          break
        case 'VERSION_DELETED':
          this.handleRemoteVersionDeleted(event)
          break
        case 'VERSION_SWITCHED':
          this.handleSwitchedVersion(event)
          break
        case 'VERSION_CREATED':
          this.handleRemoteVersionBumped(event)
          break
        default:
          console.warn('Unknown version event type:', event.type)
      }
    },

    async handleRemoteVersionBumped(event) {
      const version = event.version
      if (!version) return

      // 1. Cập nhật danh sách version
      await this.fetchProjectData(this.project._id)

      // 2. Chuyển sang version mới
      this.selectedVersionId = version._id
      this.currentVersionDetails = version

      // 3. Fetch usecases cho version mới
      await this.fetchUseCases()

      // 4. Tải lại toàn bộ dữ liệu của version mới (nếu cần)
      const res = await getProjectDetail(this.project._id, this.selectedVersionId)

      this.toast.info(`Switched to new version: ${version.version_number || version._id}`)
    },

    /**
     * Xử lý khi version được approve thành công từ PreviewModal
     */
    async handleVersionApproved(event) {
      // Chỉ xử lý nếu là project hiện tại
      if (!event || event.projectId !== this.project._id) {
        return
      }

      console.log('✅ Version approved event received:', event)

      const { versionId, version, newVersion } = event

      if (!versionId) {
        console.warn('⚠️ Invalid version-approved event: missing versionId', event)
        return
      }

      try {
        // Đợi một chút để backend cập nhật xong
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Refresh project data để lấy version mới
        await this.fetchProjectData(this.project._id)

        // Đảm bảo version mới có trong danh sách (thêm vào nếu chưa có)
        let newVersionObj = this.versions.find((v) => v._id === versionId)

        if (!newVersionObj) {
          // Nếu chưa có trong danh sách, thử fetch lại một lần nữa
          console.log('🔄 Version not found, fetching project data again...')
          await new Promise((resolve) => setTimeout(resolve, 500))
          await this.fetchProjectData(this.project._id)
          newVersionObj = this.versions.find((v) => v._id === versionId)
        }

        // Nếu vẫn chưa có và có version object từ event, thêm vào
        if (!newVersionObj && version) {
          // Chỉ thêm nếu version đã được approve (version_temporary = false)
          if (version.version_temporary === false || version.version_temporary === undefined) {
            this.versions.push(version)
            newVersionObj = version
            console.log('✅ Added new approved version to list:', versionId)
          }
        }

        // Force set selectedVersionId ngay cả khi chưa có trong danh sách
        // Vì version đã được approve rồi, nên chắc chắn sẽ có
        this.selectedVersionId = versionId
        if (newVersionObj) {
          this.currentVersionDetails = newVersionObj
        }

        // Lưu vào localStorage để đồng bộ với các trang khác
        saveSelectedVersion(this.project._id, versionId)

        // Refresh use cases với version mới (từ API, không từ requirement_model)
        await this.fetchUseCases()

        // Thông báo cho user
        this.toast.success(`Switched to approved version: ${newVersion || versionId}`)

        this.$forceUpdate()
      } catch (error) {
        console.error('❌ Error handling version-approved event:', error)
        this.toast.error('Failed to switch to approved version')
      }
    },

    async handleSwitchedVersion(event) {
      const versionId = event.versionId || event.toVersionId
      if (!versionId) return
      let version = this.versions.find((v) => v._id === versionId)
      if (!version) {
        version = this.versions.find((v) => v._id === versionId)
      }

      if (!version) return
      await this.fetchProjectData(this.project._id)
      this.selectedVersionId = version._id
      this.currentVersionDetails = version

      // Fetch usecases cho version mới
      await this.fetchUseCases()

      this.toast.info(`Switched to version: ${version.version_number || version._id}`)
      this.$forceUpdate()
    },

    async handleRemoteVersionDeleted(event) {
      const deletedId = event.versionId
      if (!deletedId) return

      // Xóa khỏi danh sách version
      this.versions = this.versions.filter((v) => v._id !== deletedId)

      // Nếu version hiện tại bị xóa
      if (this.selectedVersionId === deletedId) {
        // Chọn version đầu tiên còn lại (nếu có)
        if (this.versions.length > 0) {
          this.selectedVersionId = this.versions[0]._id
          await this.fetchProjectData(this.project._id)
          this.toast.info(`Current version was deleted. Switched to latest version.`)
        } else {
          // Không còn version nào
          this.selectedVersionId = null
          this.useCases = []
          this.inputs = []
          this.toast.info(`All versions deleted by team.`)
        }
      } else {
        this.toast.info(`A version was deleted by team.`)
      }

      this.$forceUpdate()
    },
    handleRemoteVersionUpdated(event) {},

    handleInputEvent(event) {
      console.log('📩 Realtime input event received:', event)

      // Bỏ qua events từ chính mình
      if (event.userId === this.currentUserId) {
        return
      }

      switch (event.type) {
        case 'INPUT_CREATED':
          this.toast.info(`New input added by team`)
          this.handleRemoteInputCreated(event)
          break
        case 'INPUTS_ADDED_SUMMARY':
          if (event.newInputsCount > 0) {
            this.toast.info(`${event.newInputsCount} new input(s) added by team`)
          }
          this.fetchProjectData(this.project._id)
          break
        case 'INPUT_DELETED':
          // 🚫 GIỜ SẼ KHÔNG CÓ EVENT NÀY NỮA
          this.toast.info(`Input deleted by team`)
          this.handleRemoteInputDeleted(event)
          break
        case 'INPUT_DELETED_SUMMARY':
          // ✅ EVENT XÓA MỚI - CHỈ 1 TOAST
          this.toast.info(`Input deleted by team`)
          this.fetchProjectData(this.project._id) // Refresh data
          break
        case 'INPUTS_RELOAD':
          this.handleRemoteInputsReload(event)
          break
        case 'INPUTS_UPDATED':
          this.handleInputsUpdated(event)
          break
        default:
          console.warn('Unknown input event type:', event.type)
      }
    },

    handleRemoteInputCreated(event) {
      // 🚫 ĐÃ CHUYỂN TOAST LÊN TRÊN - chỉ xử lý data
      if (!this.inputs.find((input) => input._id === event.input._id)) {
        this.inputs.push(event.input)
        this.$forceUpdate()
      }
    },

    handleRemoteInputDeleted(event) {
      // 🚫 ĐÃ CHUYỂN TOAST LÊN TRÊN - chỉ xử lý data
      this.inputs = this.inputs.filter((input) => input._id !== event.inputId)
      this.$forceUpdate()
    },

    handleRemoteInputsReload(event) {
      // 🚫 KHÔNG hiển thị toast - chỉ cập nhật data
      console.log('🔄 Reloading inputs list (no toast)')
      this.inputs = event.inputs
      this.$forceUpdate()
    },

    handleInputsUpdated(event) {
      console.log('📊 Received inputs updated event:', event)

      // Bỏ qua events từ chính mình
      if (event.userId === this.currentUserId) {
        return
      }

      // Cập nhật số lượng unprocessed inputs
      this.unprocessedInputsCount = event.unprocessedCount
      this.showIncrementalButton = this.unprocessedInputsCount > 0 && !this.isProcessingIncremental

      // 🚫 COMMENT LẠI - KHÔNG HIỂN THỊ TOAST Ở ĐÂY
      // this.toast.info(`Inputs updated - ${event.unprocessedCount} unprocessed`);

      console.log(`📊 Updated unprocessed inputs: ${event.unprocessedCount}`)
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
      this.toast.info(`Usecase updated by team - ${event.usecase.id}`)

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
    // Trong methods của UsecaseManagement.vue
    handleVersionRollbackCompleted() {
      this.fetchProjectData(this.project._id)
    },

    // ========== DATA FETCHING ==========
    async fetchProjectData(projectId) {
      try {
        const userId = this.currentUserId
        const { data } = await getProjectDetail(projectId, userId)
        const result = data.data || data
        this.project = result.project

        // Lọc bỏ version tạm thời, chỉ giữ version đã được approve
        const allVersions = result.versions || []
        this.versions = filterApprovedVersions(allVersions)

        this.inputs = result.inputs

        this.currentVersionDetails = result.current_version || null

        // Sử dụng version sync utility để lấy selected version
        const currentVersionId = this.currentVersionDetails?._id
        this.selectedVersionId = getSelectedOrDefaultVersion(
          this.project._id,
          this.versions,
          currentVersionId
        )

        // Lưu selected version vào localStorage
        if (this.selectedVersionId) {
          saveSelectedVersion(this.project._id, this.selectedVersionId)
          // Fetch usecases từ API thay vì từ requirement_model
          await this.fetchUseCases()
        } else {
          this.useCases = []
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
        const newUseCases = response.data.data || []
        
        // ✅ Load previousUseCaseIds từ localStorage
        const storageKey = `previousUseCaseIds_${this.selectedVersionId}`
        const savedPreviousIds = localStorage.getItem(storageKey)
        if (savedPreviousIds) {
          try {
            this.previousUseCaseIds = new Set(JSON.parse(savedPreviousIds))
          } catch (e) {
            console.warn('Failed to parse saved previousUseCaseIds:', e)
            this.previousUseCaseIds = new Set()
          }
        }
        
        // ✅ Detect usecases mới
        const currentIds = new Set(newUseCases.map(uc => String(uc._id || uc.id)))
        
        // Nếu previousUseCaseIds rỗng (lần đầu load), set nó = currentIds mà không highlight
        if (this.previousUseCaseIds.size === 0) {
          this.previousUseCaseIds = new Set(currentIds)
          // Lưu vào localStorage
          localStorage.setItem(storageKey, JSON.stringify(Array.from(this.previousUseCaseIds)))
        } else {
          // Tìm usecases mới (có trong current nhưng không có trong previous)
          const newlyAddedIds = new Set()
          currentIds.forEach(id => {
            if (!this.previousUseCaseIds.has(id)) {
              newlyAddedIds.add(id)
            }
          })
          
          // Nếu có usecases mới, thêm vào newUseCaseIds để highlight
          if (newlyAddedIds.size > 0) {
            newlyAddedIds.forEach(id => this.newUseCaseIds.add(id))
            console.log(`✨ Detected ${newlyAddedIds.size} new usecase(s):`, Array.from(newlyAddedIds))
          }
        }
        
        // Cập nhật previousUseCaseIds với tất cả currentIds
        this.previousUseCaseIds = new Set(currentIds)
        // Lưu vào localStorage
        localStorage.setItem(storageKey, JSON.stringify(Array.from(this.previousUseCaseIds)))
        
        this.useCases = newUseCases
      } catch (error) {
        console.error('Error fetching use cases:', error)
        this.toast.error('Failed to load use cases')
      }
    },

    async handleRefreshUsecases() {
      await this.fetchUseCases()
      await this.fetchProjectData(this.project._id)
    },

    // ========== USECASE MANAGEMENT ==========
    async handleAddUsecase(data) {
      this.isManagingUsecase = true
      try {
        console.log('🚀 Sending usecase data to BE:', data)

        // 🔥 FIX: Kiểm tra nếu data là SubmitEvent thì không xử lý
        if (data instanceof SubmitEvent || data.isTrusted) {
          console.warn('⚠️ Received SubmitEvent instead of usecase data, skipping...')
          return
        }

        // 🔥 VALIDATION PHÍA FE TRƯỚC KHI GỬI - CẬP NHẬT CHO ROLE MỚI
        const requiredFields = ['name', 'goal', 'reason', 'priority']
        const missingFields = requiredFields.filter((field) => !data[field])

        // Kiểm tra role riêng vì giờ là object
        if (!data.role || !data.role.name || !data.role.name.trim()) {
          missingFields.push('role')
        }

        // if (missingFields.length > 0) {
        //   throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`)
        // }

        // if (!data.tasks || data.tasks.length === 0 || !data.tasks[0]?.trim()) {
        //   throw new Error('At least one task is required')
        // }

        // 🔥 ĐẢM BẢO ROLE CÓ CẤU TRÚC ĐÚNG TRƯỚC KHI GỬI
        const payload = {
          ...data,
          role: {
            id:
              data.role?.id ||
              `role_${data.role?.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}`,
            name: data.role?.name || '',
          },
        }

        // 🔥 FIX: Loại bỏ các trường không cần thiết
        delete payload._vts
        delete payload.isTrusted
        delete payload.submitter
        delete payload.target

        console.log('📤 Final payload with normalized role:', JSON.stringify(payload, null, 2))

        const response = await usecaseApi.createUsecase(this.selectedVersionId, payload)

        if (response.data && response.data.status === 'Success') {
          // ✅ Cập nhật selectedVersionId nếu có version mới được bump
          if (response.data.data?.newVersionId) {
            this.selectedVersionId = response.data.data.newVersionId
            saveSelectedVersion(this.project._id, this.selectedVersionId)
            console.log('🔄 Updated selectedVersionId to new version:', this.selectedVersionId)
          }
          this.toast.success('Use case created successfully')
          await this.fetchUseCases()
          await this.fetchProjectData(this.project._id)
        } else {
          const errorMessage = response.data?.message || 'Failed to create use case'
          throw new Error(errorMessage)
        }
      } catch (error) {
        console.error('❌ Error creating use case:', error)

        // 🔥 FIX: Log chi tiết lỗi từ BE
        if (error.response?.data) {
          console.error('🔍 BE Error details:', error.response.data)
        }

        const { formatErrorForDisplay } = require('@/utils/errorMessages')
        const errorMessage = formatErrorForDisplay(error, 'Failed to create use case. Please try again.')
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
          // ✅ Cập nhật selectedVersionId nếu có version mới được bump
          if (response.data.data?.newVersionId) {
            this.selectedVersionId = response.data.data.newVersionId
            saveSelectedVersion(this.project._id, this.selectedVersionId)
            console.log('🔄 Updated selectedVersionId to new version:', this.selectedVersionId)
          }
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
          // ✅ Cập nhật selectedVersionId nếu có version mới được bump
          if (response.data.data?.newVersionId) {
            this.selectedVersionId = response.data.data.newVersionId
            saveSelectedVersion(this.project._id, this.selectedVersionId)
            console.log('🔄 Updated selectedVersionId to new version:', this.selectedVersionId)
          }
          this.toast.success('Use case deleted successfully')
          await this.fetchUseCases()
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
        const { formatErrorForDisplay } = require('@/utils/errorMessages')
        this.toast.error(formatErrorForDisplay(error, 'Failed to skip conflict. Please try again.'))
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
          // QUAN TRỌNG: Chỉ set incremental nếu KHÔNG có retry đang chạy
          if (!this.isRetrying) {
            this.isProcessingIncremental = true
            this.startPolling(this.selectedVersionId, 'incremental')
          }
        }
      } catch (error) {
        console.error('Error checking processing status:', error)
      }
    },

    async startIncrementalAnalysis() {
      if (!this.selectedVersionId || this.isProcessingIncremental) return

      this.isProcessingIncremental = true
      this.isProcessingFailed = false
      this.showIncrementalButton = false

      try {
        const response = await startIncrementalAnalysis(
          this.project._id,
          this.selectedVersionId,
          this.currentUserId
        )

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
    // handleVersionSelect(versionId) {
    //   this.selectedVersionId = versionId
    //   this.fetchProjectData(this.project._id)
    // },
    async handleVersionSelect(versionId) {
      try {
        if (!versionId) {
          this.toast.warning('Please select a valid version')
          return
        }

        // Chỉ Owner mới được phép select version
        if (!checkIsOwner(this.project)) {
          this.toast.warning('Only project owner can switch versions')
          return
        }

        const res = await switchCurrentVersion(this.project._id, versionId)

        if (!res?.data) throw new Error('No response from server')
        if (res.data.status !== 'Success') {
          throw new Error(res.data.message || 'Failed to switch version')
        }

        const oldVersionId = this.selectedVersionId
        this.selectedVersionId = versionId
        // Fetch usecases cho version mới
        await this.fetchUseCases()
        // Lưu vào localStorage để đồng bộ giữa các trang
        saveSelectedVersion(this.project._id, versionId)

        // Emit socket event để các thành viên khác biết version đã được switch
        if (socket && socket.connected) {
          const userId = localStorage.getItem('userId')
          socket.emit('version_event', {
            type: 'VERSION_SWITCHED',
            projectId: this.project._id,
            userId: userId,
            toVersionId: versionId,
            fromVersionId: oldVersionId,
            timestamp: new Date(),
          })
          console.log('📡 Emitted VERSION_SWITCHED socket event')
        }

        await this.fetchProjectData(this.project._id)
        this.$forceUpdate()
        this.toast.success('Switched to new working version')
      } catch (error) {
        console.warn('⚠️ Version switch failed:', error?.message || error)
        this.toast.error('Failed to switch version')
      }
    },
    // ========== POLLING & LOADING MANAGEMENT ==========
    startPolling(versionId, mode = 'retry') {
      this.cleanupPolling()

      this.pollingInterval = setInterval(async () => {
        try {
          const response = await getVersionStatus(versionId)
          const { status, version } = response.data.data

          if (version && mode === 'incremental' && status === 'processing') {
              this.isProcessingIncremental = true
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

    async checkAndRestorePolling() {
      if (this.hasProcessingVersion) {
        const processingVersion = this.processingVersion
        console.log('🔄 Found processing version, restoring polling:', processingVersion._id)

        // QUAN TRỌNG: Xác định mode dựa trên version details
        const isIncremental =
          processingVersion.is_incremental ||
          (processingVersion.progress > 0 && processingVersion.progress < 100)

        if (isIncremental) {
          this.isProcessingIncremental = true
        } else {
          this.isRetrying = true
        }

        this.currentPollingVersionId = processingVersion._id
        this.startPolling(processingVersion._id, isIncremental ? 'incremental' : 'retry')
      }
    },

    saveRetryState() {
      const retryState = {
        projectId: this.project._id,
        versionId: this.currentPollingVersionId,
        projectName: this.project.name,
        projectDescription: this.project.description,
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
      // ✅ Đảm bảo reset state khi cleanup để tránh lỗi khi chuyển trang
      this.isRetrying = false
      this.isProcessingIncremental = false
      this.currentPollingVersionId = null
    },

    stopPolling() {
      this.cleanupPolling()
      this.isRetrying = false
      this.isProcessingIncremental = false
      this.currentPollingVersionId = null
    },

    async handleProcessingSuccess(mode) {
      this.stopPolling()
      this.isProcessingFailed = false // Reset failed state

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

      // QUAN TRỌNG: Đảm bảo reset states đúng cách
      if (mode === 'incremental') {
        this.isProcessingIncremental = false
        this.isProcessingFailed = true
      } else {
        this.isRetrying = false
        this.isProcessingFailed = false
      }

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
    async handleRetry(userId) {
      // NHẬN userId từ ProjectHeader
      if (!this.failedVersion || this.isRetrying) return

      this.isRetrying = true
      this.isProcessingFailed = false
      this.currentPollingVersionId = this.failedVersion._id

      try {
        this.saveRetryState()

        // TRUYỀN userId vào API call
        await retryProjectAnalysis(
          this.project._id,
          this.failedVersion._id,
          userId // truyền userId
        )

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
    async handleAddInputs({ formData, tempInputData }) {
      this.isAddingInput = true

      // Tạo input tạm thời với loading state
      const tempInputs = []
      if (tempInputData.files && tempInputData.files.length > 0) {
        tempInputData.files.forEach((file) => {
          const tempInput = {
            _id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            _isLoading: true,
            _isTemp: true,
            type: this.getFileType(file.type),
            cleaned_text: file.name,
            clean_text: file.name,
            raw_text: file.name,
            is_processed: false,
            created_at: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            metadata: {
              filename: file.name,
              size: file.size
            }
          }
          tempInputs.push(tempInput)
        })
      }
      if (tempInputData.rawText) {
        const tempInput = {
          _id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          _isLoading: true,
          _isTemp: true,
          type: 'text',
          cleaned_text: tempInputData.rawText.substring(0, 100) + (tempInputData.rawText.length > 100 ? '...' : ''),
          clean_text: tempInputData.rawText.substring(0, 100) + (tempInputData.rawText.length > 100 ? '...' : ''),
          raw_text: tempInputData.rawText,
          is_processed: false,
          created_at: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }
        tempInputs.push(tempInput)
      }

      // Thêm inputs tạm thời vào đầu danh sách
      this.inputs = [...tempInputs, ...this.inputs]

      try {
        const versionId = this.selectedVersionId
        if (!versionId) {
          throw new Error('No version selected')
        }

        const minLoadingTime = new Promise((resolve) => setTimeout(resolve, 2000))
        const apiCall = addInputsToVersion(versionId, formData)

        const [_, response] = await Promise.all([minLoadingTime, apiCall])

        if (response.data && response.data.status === 'Success') {
          // ✅ Cập nhật selectedVersionId nếu có version mới được bump
          if (response.data.data?.newVersionId) {
            this.selectedVersionId = response.data.data.newVersionId
            saveSelectedVersion(this.project._id, this.selectedVersionId)
            console.log('🔄 Updated selectedVersionId to new version:', this.selectedVersionId)
          }
          
          // Xóa inputs tạm thời và fetch data mới
          this.inputs = this.inputs.filter(input => !input._isTemp)
          await this.fetchProjectData(this.project._id)
          this.toast.success('Input added successfully!')
        } else {
          // Đánh dấu inputs tạm thời là lỗi
          tempInputs.forEach(tempInput => {
            const index = this.inputs.findIndex(i => i._id === tempInput._id)
            if (index !== -1) {
              this.inputs[index]._isLoading = false
              this.inputs[index]._isError = true
            }
          })
          const { formatErrorForDisplay } = require('@/utils/errorMessages')
          this.toast.error(formatErrorForDisplay({ response: { data: response.data } }, 'Failed to add input. Please try again.'))
          
          // Xóa inputs lỗi sau 5 giây
          setTimeout(() => {
            this.inputs = this.inputs.filter(input => !input._isTemp || !input._isError)
          }, 5000)
        }
      } catch (error) {
        console.error('Error adding inputs:', error)
        // Đánh dấu inputs tạm thời là lỗi
        tempInputs.forEach(tempInput => {
          const index = this.inputs.findIndex(i => i._id === tempInput._id)
          if (index !== -1) {
            this.inputs[index]._isLoading = false
            this.inputs[index]._isError = true
          }
        })
        this.toast.error('Error adding input')
        
        // Xóa inputs lỗi sau 5 giây
        setTimeout(() => {
          this.inputs = this.inputs.filter(input => !input._isTemp || !input._isError)
        }, 5000)
      } finally {
        this.isAddingInput = false
      }
    },
    
    getFileType(mimeType) {
      if (mimeType.includes('pdf')) return 'pdf'
      if (mimeType.includes('word') || mimeType.includes('document')) return 'docx'
      if (mimeType.includes('image')) return 'image'
      if (mimeType.includes('audio')) return 'audio'
      return 'text'
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
          // ✅ Cập nhật selectedVersionId nếu có version mới được bump
          if (response.data.data?.newVersionId) {
            this.selectedVersionId = response.data.data.newVersionId
            saveSelectedVersion(this.project._id, this.selectedVersionId)
            console.log('🔄 Updated selectedVersionId to new version:', this.selectedVersionId)
          }
          this.toast.success('Input deleted successfully!')
          await this.fetchProjectData(this.project._id)
        } else {
          const { formatErrorForDisplay } = require('@/utils/errorMessages')
          this.toast.error(formatErrorForDisplay({ response: { data: response.data } }, 'Failed to delete input. Please try again.'))
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
      if (!this.$el || !e || !e.target) return
      const dropdown = this.$el.querySelector('.dropdown')
      if (dropdown && !dropdown.contains(e.target)) {
        // Note: Dropdown logic is now handled in ProjectHeader component
      }
    },

    goBack() {
      this.$router.push('/dashboard')
    },
    handleActiveUsersUpdate(activeUsers) {
      console.log('🔄 Active users updated in parent:', activeUsers)
      this.activeUsers = activeUsers
    },
    handleIncrementalProgress(event) {
      console.log('📊 Received incremental progress event:', event)

      // Chỉ xử lý nếu cùng versionId
      if (event.versionId !== this.selectedVersionId) {
        return
      }

      // Bỏ qua events từ chính mình (đã có polling)
      if (event.userId === this.currentUserId) {
        console.log('🔕 Skipping own progress event')
        return
      }

      // Cập nhật UI state
      this.isProcessingIncremental = event.isProcessing

      console.log(`🔄 Updated loading state from realtime: ${event.isProcessing ? 'processing' : 'completed'}`)

      // Nếu hoàn thành, refresh data sau 1 giây
      if (!event.isProcessing) {
        console.log('✅ Incremental analysis completed via realtime, refreshing data...')
        setTimeout(() => {
          this.fetchProjectData(this.project._id)
        }, 1000)
      }
    },
    stopPolling() {
      this.cleanupPolling()
      this.isRetrying = false
      this.isProcessingIncremental = false
      this.currentPollingVersionId = null
    },
    async retryIncrementalAnalysis() {
      console.log('🔄 Retry incremental analysis triggered')

      if (this.isProcessingIncremental || this.isRetrying) {
        this.toast.warning('Analysis is already in progress')
        return
      }

      this.isProcessingFailed = false
      this.isProcessingIncremental = true

      try {
        const response = await startIncrementalAnalysis(
          this.project._id,
          this.selectedVersionId,
          this.currentUserId
        )

        if (response.data && response.data.success) {
          // this.toast.success('Retrying incremental analysis...')
          setTimeout(() => {
            this.startPolling(this.selectedVersionId, 'incremental')
          }, 500)
        } else {
          throw new Error(response.data?.message || 'Failed to retry incremental analysis')
        }
      } catch (error) {
        console.error('Error retrying incremental analysis:', error)
        this.isProcessingFailed = true
        this.isProcessingIncremental = false
        const { formatErrorForDisplay } = require('@/utils/errorMessages')
        this.toast.error(formatErrorForDisplay(error, 'Failed to retry incremental analysis. Please try again.'))
      }
    },
    // Handle remove highlight when user hovers
    handleRemoveHighlight(usecaseId) {
      this.newUseCaseIds.delete(usecaseId)
      // ✅ QUAN TRỌNG: Thêm vào previousUseCaseIds và lưu vào localStorage
      this.previousUseCaseIds.add(usecaseId)
      if (this.selectedVersionId) {
        const storageKey = `previousUseCaseIds_${this.selectedVersionId}`
        localStorage.setItem(storageKey, JSON.stringify(Array.from(this.previousUseCaseIds)))
      }
    },
  },
}
</script>

<style scoped>
/* CSS remains the same as original */
.project-detail-view {
  padding: 15px;
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
  background: white;
  border-bottom: 1px solid var(--border-color);
  padding: 0 2rem;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button:hover {
  color: #1a365d;
  background: var(--background-color);
}

.tab-button.active {
  color: #1a365d;
  border-bottom-color: #1a365d;
}

.tab-button .material-symbols-outlined {
  font-size: 20px;
}

.tab-button .material-symbols-outlined {
  font-size: 20px;
}
</style>