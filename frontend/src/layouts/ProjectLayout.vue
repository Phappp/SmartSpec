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
          >
            <div class="progress-header">
              <div class="progress-title">
                <span class="material-symbols-outlined process-icon">{{ getProcessIcon(process.type) }}</span>
                <span class="process-name">{{ getProcessName(process.type) }}</span>
              </div>
            </div>
            
            <!-- Progress Stages -->
            <div class="progress-stages">
              <!-- Estimate Phase -->
              <div v-if="process.stage === 'estimating'" class="progress-stage">
                <div class="stage-content">
                  <span class="material-symbols-outlined stage-icon spinning">calculate</span>
                  <span class="stage-text">Estimating...</span>
                </div>
              </div>
              
              <!-- Estimate Received - Only show for usecase and testcase -->
              <div v-else-if="(process.type === 'usecase' || process.type === 'testcase') && process.estimateInfo?.estimated_count > 0 && (!process.batchProgress || process.batchProgress.currentBatch === 0)" class="progress-stage">
                <div class="stage-content">
                  <span class="material-symbols-outlined stage-icon success pulse">check_circle</span>
                  <span class="stage-text">Estimated {{ process.estimateInfo.estimated_count }} items</span>
                </div>
              </div>

              <!-- Generating Phase -->
              <div v-else-if="process.batchProgress?.currentBatch > 0" class="progress-stage">
                <div class="stage-content">
                  <span class="material-symbols-outlined stage-icon pulsing">auto_awesome</span>
                  <span class="stage-text">
                    Generating Batch {{ process.batchProgress.currentBatch }}/{{ process.batchProgress.totalBatches }}
                  </span>
                </div>
              </div>

              <!-- Saving Phase -->
              <div v-else-if="process.batchProgress?.savedCount > 0 && process.batchProgress.savedCount < process.batchProgress.totalCount" class="progress-stage">
                <div class="stage-content">
                  <span class="material-symbols-outlined stage-icon">save</span>
                  <span class="stage-text">
                    Saving {{ process.batchProgress.savedCount }}/{{ process.batchProgress.totalCount }}
                  </span>
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
        
        // Restore only valid processes
        Object.entries(savedProcesses).forEach(([key, process]) => {
          if (process && process.isProcessing) {
            const processAge = now - (process.savedAt || now)
            if (processAge < MAX_AGE) {
              // Restore process but update timestamp
              llmProcesses.value[key] = {
                ...process,
                timestamp: process.savedAt || now,
              }
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

    // Group processes by userId
    const groupedProcessesByUser = computed(() => {
      const groups = {}
      
      // Group processes by userId
      Object.values(llmProcesses.value).forEach((process) => {
        if (!process || !process.isProcessing) return
        
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
          progress: 10,
          stage: 'estimate_received',
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
        
        llmProcesses.value[processKey] = {
          userId,
          type: processType,
          isProcessing: event.isProcessing !== false,
          progress: Math.min(progress, 100),
          stage,
          estimateInfo: existingProcess?.estimateInfo || null,
          batchProgress: {
            currentBatch: event.batchInfo?.currentBatch || existingProcess?.batchProgress?.currentBatch || 0,
            totalBatches: event.batchInfo?.totalBatches || existingProcess?.batchProgress?.totalBatches || 0,
            savedCount: event.batchInfo?.savedCount || existingProcess?.batchProgress?.savedCount || 0,
            totalCount: event.batchInfo?.totalCount || existingProcess?.batchProgress?.totalCount || 0,
          },
          timestamp: existingProcess?.timestamp || Date.now(),
        }
        
        // Save to storage
        saveProcessesToStorage()
        
        // Clear process when completed
        if (!event.isProcessing && progress >= 100) {
          setTimeout(() => {
            delete llmProcesses.value[processKey]
            saveProcessesToStorage()
          }, 2000)
        }
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
      socket.on('database_event', (event) => {
        handleLLMProgressEvent({ ...event, type: 'DATABASE_PROGRESS' })
      })
      
      socket.on('testcase_event', (event) => {
        handleLLMProgressEvent({ ...event, type: 'TESTCASE_PROGRESS' })
      })
      
      socket.on('uml_event', (event) => {
        handleLLMProgressEvent({ ...event, type: 'UML_PROGRESS' })
      })
    }

    // Cleanup socket listeners
    const cleanupLLMProgressListeners = () => {
      if (!socket) return
      
      socket.off('input_event')
      socket.off('database_event')
      socket.off('testcase_event')
      socket.off('uml_event')
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

.stage-icon.spinning {
  color: #3b82f6;
  animation: spin 1.5s linear infinite;
}

.stage-icon.pulsing {
  color: #8b5cf6;
  animation: pulse 1.5s ease-in-out infinite;
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

.stage-text {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
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

