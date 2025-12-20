<template>
  <div class="project-layout">
    <ProjectHeader
      v-if="project"
      :project="project"
      :versions="versions"
      :selected-version-id="selectedVersionId"
      :is-retrying="isRetrying"
      :active-users="activeUsers"
      @version-selected="handleVersionSelect"
      @version-rollback-completed="handleVersionRollbackCompleted"
      @retry-analysis="handleRetry"
      @go-back="goBack"
      @show-sharing="handleShowSharing"
    />

    <!-- LLM Process Progress Indicator -->
    <div v-if="groupedProcessesByUser.length > 0" class="llm-progress-section">
      <div
        v-for="userGroup in groupedProcessesByUser"
        :key="userGroup.userId"
        class="user-process-group"
      >
        <!-- User Avatar -->
        <div class="user-avatar-container">
          <div class="user-avatar">
            <img
              v-if="userGroup.userInfo?.avatar"
              :src="getFullAvatarUrl(userGroup.userInfo.avatar)"
              :alt="userGroup.userInfo.name || 'User'"
              @error="handleAvatarError"
            />
            <div v-else class="avatar-placeholder">
              {{ getUserInitials(userGroup.userInfo?.name || 'U') }}
            </div>
          </div>
        </div>

        <!-- Processes for this user -->
        <div class="user-processes-row">
          <div
            v-for="process in userGroup.processes"
            :key="`${userGroup.userId}-${process.type}`"
            class="llm-progress-item"
            :class="{
              'status-success': process.status === 'success',
              'status-failed': process.status === 'failed',
            }"
          >
            <div class="progress-header">
              <div class="progress-title">
                <span class="material-symbols-outlined process-icon">{{ getProcessIcon(process.type) }}</span>
                <span class="process-name">{{ getProcessName(process.type) }}</span>
              </div>
              <div class="progress-header-right">
                <!-- Hiển thị số lượng usecase/testcase đã gen / ước tính ở góc trên bên phải -->
                <div v-if="(process.type === 'usecase' || process.type === 'testcase') && (process.batchProgress?.savedCount > 0 || process.batchProgress?.totalCount > 0 || process.estimateInfo?.estimated_count > 0)" class="usecase-count-display-header">
                  <span class="usecase-count-number">{{ process.batchProgress?.savedCount || 0 }}</span>
                  <span class="usecase-count-separator">/</span>
                  <span class="usecase-count-total">{{ process.batchProgress?.totalCount || process.estimateInfo?.estimated_count || 0 }}</span>
                </div>
              <!-- Close button for success/failed states -->
              <button
                v-if="process.status === 'success' || process.status === 'failed'"
                class="close-process-btn"
                @click="removeProcess(process)"
                title="Close"
              >
                <span class="material-symbols-outlined">close</span>
              </button>
              </div>
            </div>
            
            <!-- Success State -->
            <div v-if="process.status === 'success'" class="progress-stages">
              <div class="progress-stage success-stage">
                <div class="stage-content">
                  <span class="material-symbols-outlined stage-icon success-icon">check_circle</span>
                  <span class="stage-text">Completed successfully!</span>
                </div>
              </div>
            </div>

            <!-- Failed State -->
            <div v-else-if="process.status === 'failed'" class="progress-stages">
              <div class="progress-stage failed-stage">
                <div class="stage-content">
                  <span class="material-symbols-outlined stage-icon failed-icon">error</span>
                  <span class="stage-text">{{ process.errorMessage || 'Generation failed' }}</span>
                </div>
              </div>
            </div>

            <!-- Processing States -->
            <div v-else class="progress-stages">
              <!-- Agent State và Message (ưu tiên hiển thị) -->
              <div v-if="process.agentState || process.agentMessage" class="progress-stage">
                <div class="stage-content">
                  <span class="material-symbols-outlined stage-icon" :class="getAgentStateIconClass(process.agentState)">{{ getAgentStateIcon(process.agentState) }}</span>
                  <div class="stage-text-container">
                    <span class="stage-text stage-title">{{ getAgentStateTitle(process.agentState) }}</span>
                    <span v-if="process.agentMessage" class="stage-text stage-message">{{ process.agentMessage }}</span>
                  </div>
                </div>
              </div>

              <!-- Estimate Phase -->
              <div v-else-if="process.stage === 'estimating'" class="progress-stage">
                <div class="stage-content">
                  <span class="material-symbols-outlined stage-icon spinning">calculate</span>
                  <span class="stage-text">Estimating...</span>
                </div>
              </div>
              
              <!-- Estimate Received - Only show for usecase and testcase -->
              <div v-else-if="(process.type === 'usecase' || process.type === 'testcase') && process.estimateInfo?.estimated_count > 0 && (!process.batchProgress || process.batchProgress.currentBatch === 0)" class="progress-stage">
                <div class="stage-content">
                  <span class="material-symbols-outlined stage-icon success pulse">check_circle</span>
                  <div class="stage-text-container">
                    <span class="stage-text stage-title">Estimated {{ process.estimateInfo.estimated_count }} items</span>
                  </div>
                </div>
              </div>

              <!-- Generating Phase với Batch Info -->
              <div v-else-if="process.batchProgress?.currentBatch > 0" class="progress-stage">
                <div class="stage-content">
                  <span class="material-symbols-outlined stage-icon pulsing">auto_awesome</span>
                  <div class="stage-text-container">
                    <span class="stage-text stage-title">
                    Generating Batch {{ process.batchProgress.currentBatch }}/{{ process.batchProgress.totalBatches }}
                  </span>
                  </div>
                </div>
              </div>

              <!-- Saving Phase -->
              <div v-else-if="process.batchProgress?.savedCount > 0 && process.batchProgress.savedCount < (process.batchProgress.totalCount || process.estimateInfo?.estimated_count || 0)" class="progress-stage">
                <div class="stage-content">
                  <span class="material-symbols-outlined stage-icon spinning">save</span>
                  <div class="stage-text-container">
                    <span class="stage-text stage-title">Saving...</span>
                  </div>
                </div>
              </div>

              <!-- Default Stage -->
              <div v-else class="progress-stage">
                <div class="stage-content">
                  <span class="material-symbols-outlined stage-icon spinning">sync</span>
                  <span class="stage-text">{{ process.stage || 'Processing...' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="navigation-tabs">
      <button 
        class="tab-button" 
        :class="{ active: isActiveTab('usecase') }"
        @click="navigateToTab('usecase')"
      >
        <span class="material-symbols-outlined">list_alt</span>
        Use Cases
      </button>
      
      <button 
        class="tab-button" 
        :class="{ active: isActiveTab('testcases') }"
        @click="navigateToTab('testcases')"
      >
        <span class="material-symbols-outlined">play_arrow</span>
        Test Cases
      </button>
      <button 
        class="tab-button" 
        :class="{ active: isActiveTab('database') }"
        @click="navigateToTab('database')"
      >
        <span class="material-symbols-outlined">storage</span>
        Database
      </button>
      <button 
        class="tab-button" 
        :class="{ active: isActiveTab('uml') }"
        @click="navigateToTab('uml')"
      >
        <span class="material-symbols-outlined">account_tree</span>
        UML
      </button>
      <button 
        class="tab-button" 
        :class="{ active: isActiveTab('output') }"
        @click="navigateToTab('output')"
      >
        <span class="material-symbols-outlined">output</span>
        Logs
      </button>
    </div>

    <!-- Router View với keep-alive để giữ state -->
    <div class="router-view-container">
      <keep-alive :include="['UsecaseManagement', 'OutputManagement', 'TestcaseManagement', 'DatabaseManagement', 'UmlManagement']">
        <router-view 
          :key="`${projectId}-${selectedVersionId}`"
        />
      </keep-alive>
    </div>

    <!-- Sharing Modal -->
    <ProjectSharingModal
      v-if="showSharingModal && project"
      :project-id="project._id"
      @close="showSharingModal = false"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import ProjectHeader from '@/components/ProjectHeader.vue'
import ProjectSharingModal from '@/components/ProjectSharingModal.vue'
import { getProjectDetail } from '@/api/project'
import { getVersionsByProject } from '@/api/version'
import { useActiveMembers } from '@/utils/useActiveMembers'
import { socket } from '@/utils/socket'
import { translateErrorMessage } from '@/utils/errorMessages'
import eventBus from '@/utils/eventBus'

export default {
  name: 'ProjectLayout',
  components: {
    ProjectHeader,
    ProjectSharingModal,
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const toast = useToast()
    const { activeUsers, initSocketConnection, cleanupSocketConnection } = useActiveMembers()

    // State
    const project = ref(null)
    const versions = ref([])
    const selectedVersionId = ref(null)
    const isRetrying = ref(false)
    const showSharingModal = ref(false)
    const projectId = computed(() => route.params.id)

    // LLM Process tracking - Store by userId and processType
    const llmProcesses = ref({}) // Format: { 'userId_processType': { userId, type, ...process } }

    // Storage key for this project
    const getStorageKey = () => {
      return `llmProcesses_${projectId.value}`
    }

    // Save processes to localStorage
    const saveProcessesToStorage = () => {
      try {
        if (!projectId.value) return
        
        const processesToSave = {}
        const now = Date.now()
        const MAX_AGE = 2 * 60 * 60 * 1000 // 2 hours
        
        // Only save active processes and check age
        Object.entries(llmProcesses.value).forEach(([key, process]) => {
          if (process && process.isProcessing) {
            // Check if process is not too old
            const processAge = now - (process.timestamp || now)
            if (processAge < MAX_AGE) {
              processesToSave[key] = {
                ...process,
                savedAt: now,
              }
            }
          }
        })
        
        localStorage.setItem(getStorageKey(), JSON.stringify(processesToSave))
        console.log('💾 Saved LLM processes to storage:', Object.keys(processesToSave).length, 'processes')
      } catch (error) {
        console.error('❌ Error saving processes to storage:', error)
      }
    }

    // Restore processes from localStorage
    const restoreProcessesFromStorage = () => {
      try {
        if (!projectId.value) return
        
        const saved = localStorage.getItem(getStorageKey())
        if (!saved) return
        
        const savedProcesses = JSON.parse(saved)
        const now = Date.now()
        const MAX_AGE = 2 * 60 * 60 * 1000 // 2 hours
        
        // Restore only valid processes (processing, success, or failed)
        Object.entries(savedProcesses).forEach(([key, process]) => {
          if (process) {
            const processAge = now - (process.savedAt || now)
            if (processAge < MAX_AGE) {
              // Restore process but update timestamp
              // Ensure status field exists (for old saved processes)
              const restoredProcess = {
                ...process,
                timestamp: process.savedAt || now,
                status: process.status || (process.isProcessing ? 'processing' : 'success'),
              }
              
              // ✅ Không tự động xóa success states - giữ lại để user đóng thủ công
              llmProcesses.value[key] = restoredProcess
            }
          }
        })
        
        if (Object.keys(llmProcesses.value).length > 0) {
          console.log('🔄 Restored LLM processes from storage:', Object.keys(llmProcesses.value).length, 'processes')
        }
      } catch (error) {
        console.error('❌ Error restoring processes from storage:', error)
        // Clear corrupted data
        localStorage.removeItem(getStorageKey())
      }
    }

    // Clear processes from storage
    const clearProcessesFromStorage = () => {
      try {
        if (!projectId.value) return
        localStorage.removeItem(getStorageKey())
        console.log('🗑️ Cleared LLM processes from storage')
      } catch (error) {
        console.error('❌ Error clearing processes from storage:', error)
      }
    }


    // Fetch project data
    const fetchProjectData = async () => {
      if (!projectId.value) return

      try {
        const { data } = await getProjectDetail(projectId.value)
        const result = data.data || data
        project.value = result.project || {}
        versions.value = Array.isArray(result.versions) ? result.versions : []

        // Set selected version
        if (!selectedVersionId.value && project.value.current_version) {
          selectedVersionId.value = project.value.current_version._id || project.value.current_version
        }

        // Initialize socket for active users
        if (project.value._id) {
          initSocketConnection(project.value._id)
        }
      } catch (error) {
        console.error('Error fetching project:', error)
        toast.error('Failed to load project data')
      }
    }

    // Fetch versions
    const fetchVersions = async () => {
      if (!projectId.value) return

      try {
        const response = await getVersionsByProject(projectId.value)
        versions.value = Array.isArray(response.data) ? response.data : []
      } catch (error) {
        console.error('Error fetching versions:', error)
        versions.value = [] // Đảm bảo luôn là array
      }
    }

    // Navigation
    const navigateToTab = (tab) => {
      const tabRoutes = {
        usecase: `/project/${projectId.value}/editor`,
        output: `/project/${projectId.value}/output`,
        testcases: `/project/${projectId.value}/testcases`,
        database: `/project/${projectId.value}/database`,
        uml: `/project/${projectId.value}/uml`,
      }

      if (tabRoutes[tab] && route.path !== tabRoutes[tab]) {
        router.push(tabRoutes[tab])
      }
    }

    const isActiveTab = (tab) => {
      return currentTab.value === tab
    }

    const currentTab = computed(() => {
      const path = route.path
      if (path.includes('/testcases')) return 'testcases'
      if (path.includes('/database')) return 'database'
      if (path.includes('/uml')) return 'uml'
      if (path.includes('/output')) return 'output'
      if (path.includes('/editor')) return 'usecase'
      return 'usecase' // default
    })

    // Remove process manually
    const removeProcess = (process) => {
      const processKey = `${process.userId}_${process.type}`
      delete llmProcesses.value[processKey]
      saveProcessesToStorage()
    }

    // Group processes by userId
    const groupedProcessesByUser = computed(() => {
      const groups = {}
      
      // Group processes by userId - include all processes (processing, success, failed)
      Object.values(llmProcesses.value).forEach((process) => {
        if (!process) return
        
        const userId = process.userId || 'unknown'
        if (!groups[userId]) {
          groups[userId] = {
            userId,
            processes: [],
            userInfo: null,
          }
        }
        groups[userId].processes.push(process)
      })
      
      // Get user info from activeUsers
      Object.keys(groups).forEach((userId) => {
        const user = activeUsers.value.find((u) => u.userId === userId)
        if (user) {
          groups[userId].userInfo = {
            name: user.name,
            email: user.email,
            avatar: user.avatar,
          }
        } else {
          // Fallback if user not in activeUsers
          groups[userId].userInfo = {
            name: 'User',
            email: '',
            avatar: null,
          }
        }
      })
      
      // Convert to array and sort by userId (current user first)
      const currentUserId = localStorage.getItem('userId')
      return Object.values(groups).sort((a, b) => {
        if (a.userId === currentUserId) return -1
        if (b.userId === currentUserId) return 1
        return a.userId.localeCompare(b.userId)
      })
    })

    // Process icon and name helpers
    const getProcessIcon = (type) => {
      const icons = {
        usecase: 'description',
        database: 'storage',
        testcase: 'bug_report',
        uml: 'account_tree',
      }
      return icons[type] || 'sync'
    }

    const getProcessName = (type) => {
      const names = {
        usecase: 'Use Cases',
        database: 'Database',
        testcase: 'Test Cases',
        uml: 'UML Diagrams',
      }
      return names[type] || 'Processing'
    }

    // ✅ Helper: Get agent state title (V1 + V2)
    const getAgentStateTitle = (state) => {
      const titles = {
        // V1 States
        'ESTIMATE_USECASE_COUNT': 'Đang ước tính usecases',
        'ESTIMATE_TESTCASE_COUNT': 'Đang ước tính testcases',
        'BATCH_PLANNING': 'Đang lập kế hoạch batches',
        'GENERATE_BATCH': 'Đang generate',
        'VERIFY_RESULTS': 'Đang kiểm tra kết quả',
        'REPLAN_MISSING': 'Đang lập kế hoạch retry',
        'GENERATE_RETRY': 'Đang retry',
        'DONE': 'Hoàn thành',
        // V2 States (Testcase Generation - Orchestrator Style)
        'ESTIMATE_WITH_COMMITMENT': 'Đang ước tính',
        'RETRY_MISSING': 'Đang retry usecases thiếu',
        'FINAL_VALIDATION': 'Đang validate toàn bộ testcases',
        'ATOMIC_SAVE': 'Đang lưu tất cả testcases vào database'
      }
      return titles[state] || 'Đang xử lý...'
    }

    // ✅ Helper: Get agent state icon (V1 + V2)
    const getAgentStateIcon = (state) => {
      const icons = {
        // V1 States
        'ESTIMATE_USECASE_COUNT': 'calculate',
        'ESTIMATE_TESTCASE_COUNT': 'calculate',
        'BATCH_PLANNING': 'list_alt',
        'GENERATE_BATCH': 'auto_awesome',
        'VERIFY_RESULTS': 'verified',
        'REPLAN_MISSING': 'refresh',
        'GENERATE_RETRY': 'sync',
        'DONE': 'check_circle',
        // V2 States
        'ESTIMATE_WITH_COMMITMENT': 'fact_check',
        'RETRY_MISSING': 'replay',
        'FINAL_VALIDATION': 'verified_user',
        'ATOMIC_SAVE': 'save'
      }
      return icons[state] || 'sync'
    }

    // ✅ Helper: Get agent state icon class (V1 + V2)
    const getAgentStateIconClass = (state) => {
      if (state === 'DONE') return 'success'
      if (state === 'GENERATE_RETRY' || state === 'REPLAN_MISSING' || state === 'RETRY_MISSING') return 'pulsing'
      if (state === 'GENERATE_BATCH') return 'pulsing'
      if (state === 'VERIFY_RESULTS' || state === 'FINAL_VALIDATION') return 'spinning'
      if (state === 'ATOMIC_SAVE') return 'spinning' // Spinning icon for atomic save
      return 'spinning'
    }

    // User avatar helpers
    const getFullAvatarUrl = (avatarUrl) => {
      if (!avatarUrl) return ''
      if (avatarUrl.startsWith('http') || avatarUrl.startsWith('blob:')) {
        return avatarUrl
      }
      const cleanUrl = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`
      const baseUrl = 'http://localhost:8000'
      return `${baseUrl}${cleanUrl}`
    }

    const getUserInitials = (name) => {
      if (!name) return 'U'
      const names = name.split(' ')
      if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }

    const handleAvatarError = (event) => {
      const img = event.target
      img.style.display = 'none'
      const placeholder = img.nextElementSibling
      if (placeholder && placeholder.classList.contains('avatar-placeholder')) {
        placeholder.style.display = 'flex'
      }
    }

    // Handle progress events from socket
    const handleLLMProgressEvent = (event) => {
      // Debug log để kiểm tra event structure
      console.log('📥 Received LLM progress event:', {
        type: event.type,
        stage: event.stage,
        progress: event.progress,
        isProcessing: event.isProcessing,
        errors: event.errors,
        errorMessage: event.errorMessage,
        error: event.error,
        hasErrors: event.errors && event.errors.length > 0,
      })
      
      // Determine process type from event
      let processType = null
      if (event.type === 'INCREMENTAL_PROGRESS' || event.type === 'ESTIMATE_RECEIVED') {
        // Usecase generation
        processType = 'usecase'
      } else if (event.type === 'DATABASE_PROGRESS') {
        processType = 'database'
      } else if (event.type === 'TESTCASE_PROGRESS') {
        processType = 'testcase'
      } else if (event.type === 'UML_PROGRESS') {
        processType = 'uml'
      }
      
      if (!processType) return
      
      // Only handle if same version
      const currentVersionId = selectedVersionId.value
      if (event.versionId && event.versionId !== currentVersionId) {
        return
      }
      
      // Get userId from event
      const userId = event.userId || localStorage.getItem('userId') || 'unknown'
      const processKey = `${userId}_${processType}`
      
      // Update process state
      if (event.type === 'ESTIMATE_RECEIVED') {
        llmProcesses.value[processKey] = {
          userId,
          type: processType,
          isProcessing: true,
          status: 'processing',
          progress: 10,
          stage: 'estimate_received',
          agentState: 'ESTIMATE_USECASE_COUNT', // ✅ Thêm agentState
          agentMessage: `Đã ước tính: ${event.estimate.estimated_count} usecases, ${event.estimate.estimated_batches} batches`, // ✅ Thêm agentMessage
          estimateInfo: event.estimate,
          batchProgress: {
            currentBatch: 0,
            totalBatches: event.estimate.estimated_batches,
            savedCount: 0,
            totalCount: event.estimate.estimated_count,
          },
          timestamp: Date.now(),
        }
        // Save to storage
        saveProcessesToStorage()
      } else if (event.type === 'INCREMENTAL_PROGRESS' || event.type?.includes('PROGRESS')) {
        const progress = event.progress || 0
        const stage = event.stage || 'processing'
        const existingProcess = llmProcesses.value[processKey]
        
        // ✅ QUAN TRỌNG: Nếu process cũ đã hoàn thành (success) và event mới là process mới đang xử lý
        // thì cần reset lại hoàn toàn để tránh hiển thị trạng thái "Hoàn thành" khi đang gen mới
        const isNewProcessStarting = existingProcess?.status === 'success' && 
                                     (event.isProcessing === true || 
                                      (stage !== 'completed' && stage !== 'failed' && stage !== 'error'))
        
        if (isNewProcessStarting) {
          console.log(`🔄 [${processType}] Resetting completed process for new generation`, {
            oldStatus: existingProcess?.status,
            newStage: stage,
            isProcessing: event.isProcessing
          })
          // Reset process về trạng thái ban đầu - xóa hoàn toàn process cũ
          delete llmProcesses.value[processKey]
          saveProcessesToStorage()
        }
        
        // Lấy lại existingProcess sau khi có thể đã reset
        const currentProcess = llmProcesses.value[processKey]
        
        // ✅ QUAN TRỌNG: Kiểm tra failed TRƯỚC khi kiểm tra success
        // Backend có thể gửi stage: "completed" nhưng vẫn có errors (partial success)
        const hasErrors = Array.isArray(event.errors) && event.errors.length > 0
        const hasErrorMessage = event.error || event.errorMessage || event.message
        
        // Debug log cho testcase
        if (processType === 'testcase') {
          console.log('🔍 Testcase event check:', {
            stage,
            progress,
            isProcessing: event.isProcessing,
            errors: event.errors,
            errorMessage: event.errorMessage,
            error: event.error,
            hasErrors,
            hasErrorMessage,
          })
        }
        
        // ✅ Kiểm tra failed: stage === 'failed' HOẶC có errors
        if (stage === 'failed' || stage === 'error' || event.error || event.status === 'failed' || event.status === 'error' || hasErrors) {
          // Format error message thân thiện với người dùng
          const rawErrorMsg = hasErrors 
            ? event.errors.join('; ') 
            : (event.error || event.errorMessage || event.message || 'Generation failed')
          
          // Format error message để thân thiện hơn
          const friendlyErrorMsg = translateErrorMessage(rawErrorMsg)
          
          llmProcesses.value[processKey] = {
            userId,
            type: processType,
            isProcessing: false,
            status: 'failed',
            progress: existingProcess?.progress || progress,
            stage: 'failed',
            errorMessage: friendlyErrorMsg,
            agentState: existingProcess?.agentState || null, // ✅ Giữ agentState
            agentMessage: existingProcess?.agentMessage || null, // ✅ Giữ agentMessage
            estimateInfo: existingProcess?.estimateInfo || null,
            batchProgress: existingProcess?.batchProgress || null,
            timestamp: existingProcess?.timestamp || Date.now(),
          }
          saveProcessesToStorage()
          console.log('❌ Process failed:', processKey, friendlyErrorMsg)
          return
        }
        
        // Check if process completed successfully (chỉ khi không phải failed và không có errors)
        // ✅ QUAN TRỌNG: Kiểm tra hasErrors và hasErrorMessage TRƯỚC khi set success
        // ✅ Cũng kiểm tra agentState === 'DONE' hoặc stage === 'completed'
        // ✅ Ưu tiên kiểm tra stage === 'completed' trước (backend đang emit đúng)
        const isCompleted = (stage === 'completed' && !hasErrors && !hasErrorMessage) ||
                           (!event.isProcessing && progress >= 100 && stage !== 'failed' && stage !== 'error' && !hasErrors && !hasErrorMessage) ||
                           (event.agentState === 'DONE')
        
        if (isCompleted) {
          llmProcesses.value[processKey] = {
            userId,
            type: processType,
            isProcessing: false,
            status: 'success',
            progress: 100,
            stage: 'completed',
            agentState: 'DONE', // ✅ Set agentState khi hoàn thành
            agentMessage: event.message || currentProcess?.agentMessage || 'Hoàn thành', // ✅ Giữ agentMessage
            estimateInfo: currentProcess?.estimateInfo || null,
            batchProgress: currentProcess?.batchProgress || null,
            timestamp: currentProcess?.timestamp || Date.now(),
          }
          saveProcessesToStorage()
          
          // ✅ Emit event khi database generation hoàn thành để tự động refresh data
          if (processType === 'database') {
            eventBus.emit('database-generation-completed', {
              projectId: projectId.value,
              versionId: event.versionId || selectedVersionId.value,
              userId,
            })
            console.log('📢 Emitted database-generation-completed event')
          }
          
          // ✅ Không tự động xóa - chỉ xóa khi user đóng thủ công
          return
        }
        
        // ✅ Cập nhật savedCount: ưu tiên từ batchInfo.savedCount (từ backend)
        // Nếu không có, tính từ usecasesInBatch + previous savedCount
        let savedCount = event.batchInfo?.savedCount
        
        if (savedCount === undefined || savedCount === null) {
          // Fallback: tính từ previous + usecasesInBatch
          const previousSavedCount = currentProcess?.batchProgress?.savedCount || 0
          const currentBatchUsecases = event.batchInfo?.usecasesInBatch || 0
          
          // Nếu có usecasesInBatch > 0, có thể là batch mới đã save
          if (currentBatchUsecases > 0) {
            savedCount = previousSavedCount + currentBatchUsecases
          } else {
            savedCount = previousSavedCount
          }
        }
        
        // Update processing state
        llmProcesses.value[processKey] = {
          userId,
          type: processType,
          isProcessing: event.isProcessing !== false,
          status: 'processing',
          progress: Math.min(progress, 100),
          stage,
          agentState: event.agentState || currentProcess?.agentState || null, // ✅ Thêm agentState
          agentMessage: event.message || currentProcess?.agentMessage || null, // ✅ Thêm agentMessage
          estimateInfo: currentProcess?.estimateInfo || null,
          batchProgress: {
            currentBatch: event.batchInfo?.currentBatch || currentProcess?.batchProgress?.currentBatch || 0,
            totalBatches: event.batchInfo?.totalBatches || currentProcess?.batchProgress?.totalBatches || currentProcess?.estimateInfo?.estimated_batches || 0,
            savedCount: savedCount, // ✅ Sử dụng savedCount đã tính
            totalCount: event.batchInfo?.totalCount || currentProcess?.batchProgress?.totalCount || currentProcess?.estimateInfo?.estimated_count || 0,
            // ✅ Thêm testcasesInBatch cho testcase type
            testcasesInBatch: event.batchInfo?.testcasesInBatch || 0,
            usecasesInBatch: event.batchInfo?.usecasesInBatch || 0,
          },
          timestamp: currentProcess?.timestamp || Date.now(),
        }
        
        // Save to storage
        saveProcessesToStorage()
      }
    }

    // Initialize socket listeners for LLM progress
    const initLLMProgressListeners = () => {
      if (!socket) {
        console.warn('⚠️ Socket not available for LLM progress tracking')
        return
      }
      
      // Listen to input events (usecase generation)
      socket.on('input_event', (event) => {
        if (event.type === 'INCREMENTAL_PROGRESS' || event.type === 'ESTIMATE_RECEIVED') {
          handleLLMProgressEvent(event)
        }
      })
      
      // Listen to other process events (database, testcase, uml)
      socket.on('testcase_event', (event) => {
        // ✅ Đảm bảo giữ nguyên tất cả fields từ event, đặc biệt là errors
        handleLLMProgressEvent({
          ...event,
          type: 'TESTCASE_PROGRESS',
          // Đảm bảo errors và errorMessage được giữ lại
          errors: event.errors,
          errorMessage: event.errorMessage,
          error: event.error,
        })
      })
      
      socket.on('uml_event', (event) => {
        // ✅ Đảm bảo giữ nguyên tất cả fields từ event, đặc biệt là errors
        console.log('📥 [UML Event] Received:', {
          stage: event.stage,
          progress: event.progress,
          isProcessing: event.isProcessing,
          errors: event.errors,
          errorMessage: event.errorMessage,
        })
        handleLLMProgressEvent({
          ...event,
          type: 'UML_PROGRESS',
          // Đảm bảo errors và errorMessage được giữ lại
          errors: event.errors,
          errorMessage: event.errorMessage,
          error: event.error,
        })
      })
      
      socket.on('database_event', (event) => {
        // ✅ Đảm bảo giữ nguyên tất cả fields từ event, đặc biệt là errors
        console.log('📥 [Database Event] Received:', {
          stage: event.stage,
          progress: event.progress,
          isProcessing: event.isProcessing,
          errors: event.errors,
          errorMessage: event.errorMessage,
        })
        handleLLMProgressEvent({
          ...event,
          type: 'DATABASE_PROGRESS',
          // Đảm bảo errors và errorMessage được giữ lại
          errors: event.errors,
          errorMessage: event.errorMessage,
          error: event.error,
        })
      })

      // 🔥 REALTIME: Listen for project events (e.g., member accepted invitation)
      socket.on('project_event', (event) => {
        if (event.type === 'MEMBER_ACCEPTED' && event.projectId === projectId.value) {
          console.log('📥 [Project Event] Member accepted:', event.member)
          // Refetch project data để cập nhật members count
          fetchProjectData()
        }
      })
    }

    // Cleanup socket listeners
    const cleanupLLMProgressListeners = () => {
      if (!socket) return
      
      socket.off('input_event')
      socket.off('database_event')
      socket.off('testcase_event')
      socket.off('uml_event')
      socket.off('project_event')
    }

    // Event handlers
    const handleVersionSelect = (versionId) => {
      selectedVersionId.value = versionId
      // Emit to child components
      window.dispatchEvent(new CustomEvent('version-selected', { detail: { versionId } }))
    }

    const handleVersionRollbackCompleted = () => {
      fetchVersions()
      fetchProjectData()
      window.dispatchEvent(new CustomEvent('version-rollback-completed'))
    }

    const handleRetry = (userId) => {
      isRetrying.value = true
      window.dispatchEvent(new CustomEvent('retry-analysis', { detail: { userId } }))
    }

    const goBack = () => {
      router.push('/dashboard')
    }

    const handleShowSharing = () => {
      showSharingModal.value = true
    }

    // Child component update handlers
    const handleProjectUpdate = (updatedProject) => {
      if (updatedProject) {
        project.value = updatedProject
      }
    }

    const handleVersionsUpdate = (updatedVersions) => {
      if (updatedVersions) {
        versions.value = Array.isArray(updatedVersions) ? updatedVersions : []
      }
    }

    const handleSelectedVersionUpdate = (versionId) => {
      if (versionId) {
        selectedVersionId.value = versionId
      }
    }

    const handleActiveUsersUpdate = (users) => {
      // activeUsers is managed by useActiveMembers hook
      // This can be used if views need to update active users
    }

    const handleRetryingUpdate = (retrying) => {
      isRetrying.value = retrying
    }

    // Watch route changes
    watch(() => route.params.id, (newId, oldId) => {
      if (newId !== oldId) {
        fetchProjectData()
        fetchVersions()
      }
    }, { immediate: true })

    // Provide data cho child components (phải gọi trước return)
    provide('projectLayout', {
      project,
      versions,
      selectedVersionId,
      activeUsers,
      handleVersionSelect,
      handleVersionRollbackCompleted,
      handleRetry,
      handleShowSharing,
      updateProject: handleProjectUpdate,
      updateVersions: handleVersionsUpdate,
      updateSelectedVersion: handleSelectedVersionUpdate,
      updateRetrying: handleRetryingUpdate,
    })

    // Watch llmProcesses to auto-save to storage
    watch(
      () => llmProcesses.value,
      () => {
        saveProcessesToStorage()
      },
      { deep: true }
    )

    // Watch projectId to restore processes when project changes
    watch(
      () => projectId.value,
      (newProjectId, oldProjectId) => {
        if (newProjectId && newProjectId !== oldProjectId) {
          // Clear old processes
          llmProcesses.value = {}
          // Restore processes for new project
          restoreProcessesFromStorage()
        }
      }
    )

    // Lifecycle
    onMounted(() => {
      fetchProjectData()
      fetchVersions()
      
      // Restore processes from storage
      restoreProcessesFromStorage()
      
      // Initialize LLM progress listeners
      initLLMProgressListeners()
    })

    onUnmounted(() => {
      if (project.value?._id) {
        cleanupSocketConnection()
      }
      
      // Cleanup LLM progress listeners
      cleanupLLMProgressListeners()
    })

    return {
      project,
      versions,
      selectedVersionId,
      isRetrying,
      activeUsers,
      showSharingModal,
      projectId,
      currentTab,
      navigateToTab,
      isActiveTab,
      handleVersionSelect,
      handleVersionRollbackCompleted,
      handleRetry,
      goBack,
      handleShowSharing,
      handleProjectUpdate,
      handleVersionsUpdate,
      handleSelectedVersionUpdate,
      handleActiveUsersUpdate,
      handleRetryingUpdate,
      groupedProcessesByUser,
      getProcessIcon,
      getProcessName,
      getFullAvatarUrl,
      getUserInitials,
      handleAvatarError,
      removeProcess,
      getAgentStateTitle,
      getAgentStateIcon,
      getAgentStateIconClass,
    }
  },
}
</script>

<style scoped>
.project-layout {
  min-height: 100vh;
  background: #f5f7fa;
}

/* LLM Process Progress Section */
.llm-progress-section {
  background: white;
  border-bottom: 1px solid #e1e5e9;
  padding: 12px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* User Process Group - Each user gets a row */
.user-process-group {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  animation: fadeInUp 0.3s ease-out;
}

/* User Avatar Container */
.user-avatar-container {
  flex-shrink: 0;
  padding-top: 8px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #e1e5e9;
  position: relative;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

/* User Processes Row - All processes for this user on one row */
.user-processes-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  flex: 1;
}

.llm-progress-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e1e5e9;
  min-width: 200px;
  flex: 1;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

/* Hiệu ứng shimmer lướt qua toàn bộ thẻ khi đang loading */
.llm-progress-item:not(.status-success):not(.status-failed)::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(26, 54, 93, 0.1),
    transparent
  );
  animation: shimmerSweep 2.5s infinite;
  pointer-events: none;
  z-index: 1;
}

.llm-progress-item.status-success {
  background: #f0fdf4;
  border-color: #10b981;
}

.llm-progress-item.status-failed {
  background: #fef2f2;
  border-color: #ef4444;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  position: relative;
}

.progress-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.process-icon {
  font-size: 18px;
  color: #1a365d;
}

.process-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a365d;
}

.progress-percentage {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1a365d;
}

.progress-stages {
  margin-bottom: 8px;
}

.progress-stage {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stage-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stage-icon {
  font-size: 16px;
  color: #1a365d;
  transition: all 0.3s ease;
}

.stage-icon.success {
  color: #10b981;
}

.stage-icon.success-icon {
  color: #10b981;
  font-size: 18px;
}

.stage-icon.failed-icon {
  color: #ef4444;
  font-size: 18px;
}

.stage-icon.spinning {
  color: #3b82f6;
  animation: spin 1.5s linear infinite;
}

.stage-icon.pulsing {
  color: #8b5cf6;
  animation: pulseBlink 1.2s ease-in-out infinite;
}

.stage-icon.pulse {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

@keyframes pulseBlink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

@keyframes shimmerSweep {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

.stage-text {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
}

.stage-text-container {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.stage-text.stage-title {
  font-weight: 600;
  color: #1a365d;
}

.stage-text.stage-message {
  font-size: 0.7rem;
  color: #64748b;
  opacity: 0.9;
}

/* Usecase Count Display - Thu gọn, bỏ animation */
.usecase-count-display {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 4px;
  padding: 4px 8px;
  background: rgba(26, 54, 93, 0.05);
  border-radius: 6px;
  border: 1px solid rgba(26, 54, 93, 0.1);
}

/* Usecase Count Display ở header (góc trên bên phải) */
.usecase-count-display-header {
  display: flex;
  align-items: baseline;
  gap: 2px;
  padding: 2px 6px;
  background: rgba(26, 54, 93, 0.08);
  border-radius: 4px;
  border: 1px solid rgba(26, 54, 93, 0.15);
  font-size: 0.75rem;
}

.usecase-count-number {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1a365d;
  min-width: 24px;
  text-align: right;
}

.usecase-count-display-header .usecase-count-number {
  font-size: 0.75rem;
  min-width: 20px;
}

.usecase-count-separator {
  font-size: 0.875rem;
  font-weight: 500;
  color: #64748b;
  margin: 0 2px;
}

.usecase-count-display-header .usecase-count-separator {
  font-size: 0.75rem;
  margin: 0 1px;
}

.usecase-count-total {
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  min-width: 24px;
  text-align: left;
}

.usecase-count-display-header .usecase-count-total {
  font-size: 0.75rem;
  min-width: 20px;
}

.usecase-count-label {
  font-size: 0.7rem;
  color: #94a3b8;
  font-weight: 500;
  margin-left: 2px;
}

.success-stage .stage-text {
  color: #059669;
  font-weight: 600;
}

.failed-stage .stage-text {
  color: #dc2626;
  font-weight: 500;
}

.close-process-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #8a94a6;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  padding: 0;
}

.close-process-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #1a365d;
}

.close-process-btn .material-symbols-outlined {
  font-size: 18px;
}


.progress-bar {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1a365d 0%, #2c5282 50%, #3d6ba8 100%);
  border-radius: 4px;
  transition: width 0.5s ease-in-out;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(26, 54, 93, 0.3);
}

/* Shimmer effect for progress bar */
.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

.navigation-tabs {
  display: flex;
  gap: 8px;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e1e5e9;
  overflow-x: auto;
  position: sticky;
  top: 0;
  z-index: 5;
}

.router-view-container {
  flex: 1;
  min-height: 0;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #64748b;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.tab-button:hover {
  background: #f1f5f9;
  color: #1a365d;
}

.tab-button.active {
  background: #1a365d;
  color: white;
}

.tab-button .material-symbols-outlined {
  font-size: 20px;
}

@media (max-width: 768px) {
  .llm-progress-section {
    padding: 12px 16px;
  }

  .navigation-tabs {
    padding: 12px 16px;
    gap: 4px;
  }

  .tab-button {
    padding: 8px 12px;
    font-size: 0.875rem;
  }

  .tab-button .material-symbols-outlined {
    font-size: 18px;
  }
}
</style>

