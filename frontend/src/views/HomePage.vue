<template>
  <div class="homepage">
    <div class="app-container">
      <Sidebar :user="user" @new="openNewProjectModal" @navigate="navigateTo" @logout="logout" />

      <div class="main-content">
        <header class="page-header">
          <h1>HOME PAGE</h1>
        </header>

        <div class="content-area">
          <!-- Hiển thị projects đang được tạo -->
          <div
            v-if="
              creatingProjects.length > 0 &&
              (currentView === 'my-projects' || currentView === 'recent-projects')
            "
            class="projects-view creating-projects-section"
          >
            <div class="projects-header">
              <h2>Creating Projects</h2>
              <p>{{ creatingProjects.length }} project(s) in progress</p>
            </div>
            <div class="projects-grid">
              <ProjectCard
                v-for="p in creatingProjects"
                :key="p._id"
                :project="p"
                :user="user"
                :is-creating="true"
                @open="openProject"
              />
            </div>
          </div>

          <div v-if="currentView === 'recent-projects'" class="projects-view">
            <div class="projects-header">
              <h2>Recent Projects</h2>
              <p></p>
            </div>
            <div class="projects-grid">
              <ProjectCard
                v-for="p in recentProjects"
                :key="p._id"
                :project="p"
                :user="user"
                @open="openProject"
                @edit="handleEditProject"
                @delete="confirmMoveToTrash"
              />
            </div>
          </div>

          <div v-if="currentView === 'my-projects'" class="projects-view">
            <div class="projects-header">
              <h2>My Projects</h2>
              <p>{{ myProjects.length }} projects found</p>
            </div>
            <div class="projects-grid">
              <ProjectCard
                v-for="p in myProjects"
                :key="p._id"
                :project="p"
                :user="user"
                @open="openProject"
                @edit="handleEditProject"
                @delete="confirmMoveToTrash"
              />
            </div>
          </div>

          <div v-if="currentView === 'shared-projects'" class="projects-view">
            <div class="projects-header">
              <h2>Shared Projects</h2>
              <p>{{ sharedProjects.length }} project found</p>
            </div>
            <div class="projects-grid">
              <ProjectCard
                v-for="p in sharedProjects"
                :key="p._id"
                :project="p"
                :user="user"
                @open="openProject"
                @edit="handleEditProject"
                @delete="confirmMoveToTrash"
              />
            </div>
          </div>

          <div v-if="currentView === 'trash'" class="trash-view projects-view">
            <div class="projects-header">
              <h2>Trashed Projects</h2>
              <p>{{ trashedProjects.length }} projects found</p>
            </div>
            <div v-if="trashedProjects.length > 0" class="projects-grid">
              <ProjectCard
                v-for="p in trashedProjects"
                :key="p._id"
                :project="p"
                :user="user"
                :is-trashed="true"
                @restore="restoreProject"
                @delete-permanently="confirmDeletePermanently"
              />
            </div>
            <div v-else class="empty-state">
              <div class="empty-icon">
                <span class="material-symbols-outlined">delete_outline</span>
              </div>
              <p>No projects found in Trash</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <NewProjectModal
      :show="isNewProjectModalVisible"
      :creating-projects="creatingProjects"
      @close="closeNewProjectModal"
      @close-during-creation="handleCloseDuringCreation"
      @project-created="handleProjectCreated"
    />
    <AppModal
      v-model="isAppModalVisible"
      :title="modalContent.title"
      :message="modalContent.message"
      :is-confirmation="modalContent.isConfirmation"
      @confirm="modalContent.onConfirm"
    />
  </div>
</template>

<script>
import Sidebar from '@/components/Sidebar.vue'
import NewProjectModal from '@/components/NewProjectForm.vue'
import ProjectCard from '@/components/ProjectCard.vue'
import AppModal from '@/components/AppModal.vue'
import {
  getMyProjects,
  getSharedProjects,
  getRecentProjects,
  deleteProject,
  getCurrentUser,
  getTrashedProjects,
  restoreProject as apiRestoreProject,
  updateProject,
  getVersionStatus,
} from '@/api/project'

export default {
  name: 'Homepage',
  components: {
    Sidebar,
    NewProjectModal,
    ProjectCard,
    AppModal,
  },
  data() {
    return {
      isNewProjectModalVisible: false,
      creationSuccess: false,
      currentView: 'recent-projects',
      user: null,
      recentProjects: [],
      myProjects: [],
      sharedProjects: [],
      trashedProjects: [],
      creatingProjects: [],
      isAppModalVisible: false,
      modalContent: {
        title: '',
        message: '',
        isConfirmation: false,
        onConfirm: () => {},
      },
      pollingIntervals: {},
    }
  },
  created() {
    this.fetchInitialData()
  },
  beforeUnmount() {
    this.cleanupAllPolling()
  },
  methods: {
    // --- Dọn dẹp polling ---
    cleanupAllPolling() {
      Object.values(this.pollingIntervals).forEach((interval) => {
        clearInterval(interval)
      })
      this.pollingIntervals = {}
    },

    // --- Modal Methods ---
    showNotification(title, message) {
      this.modalContent = {
        title,
        message,
        isConfirmation: false,
      }
      this.isAppModalVisible = true
    },

    showConfirmation(title, message, onConfirm) {
      this.modalContent = {
        title,
        message,
        isConfirmation: true,
        onConfirm,
      }
      this.isAppModalVisible = true
    },

    // --- Methods mới cho creating projects ---
    openNewProjectModal() {
      this.isNewProjectModalVisible = true
    },

    closeNewProjectModal() {
      this.isNewProjectModalVisible = false
      if (this.creationSuccess) {
        this.navigateTo('my-projects')
        this.creationSuccess = false
      }
    },

    handleCloseDuringCreation(creationData) {
      console.log('📝 Received creation data:', creationData)

      if (!creationData.pollingData?.versionId) {
        console.error('❌ No versionId provided for polling')
        this.showNotification(
          'Error',
          'Cannot track project creation progress. Please check the project later.'
        )
        this.isNewProjectModalVisible = false
        return
      }

      const tempProject = {
        _id: 'creating-' + Date.now(),
        name: creationData.projectData.name,
        description: creationData.projectData.description,
        status: 'creating',
        processingProgress: creationData.processingProgress || 0,
        currentStage: creationData.currentStage || 'Initializing...',
        creationStatus: creationData.creationStatus || 'polling',
        isTemp: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        members: [],
        pollingData: creationData.pollingData,
      }

      this.creatingProjects.unshift(tempProject)
      this.isNewProjectModalVisible = false

      this.startPollingForProject(tempProject._id, creationData.pollingData)

      if (this.currentView !== 'my-projects') {
        this.navigateTo('my-projects')
      }
    },

    // PHƯƠNG THỨC MỚI: Khôi phục retry processes từ localStorage
    restoreRetryProcesses() {
      const retryKeys = Object.keys(localStorage).filter((key) => key.startsWith('retry_'))

      retryKeys.forEach((key) => {
        try {
          const retryState = JSON.parse(localStorage.getItem(key))
          if (retryState && retryState.type === 'retry') {
            console.log('🔄 Restoring retry process:', retryState)

            // Kiểm tra xem retry process này đã tồn tại chưa
            const existingIndex = this.creatingProjects.findIndex(
              (p) => p.pollingData?.projectId === retryState.projectId && p.isRetry
            )

            if (existingIndex === -1) {
              const tempProject = {
                _id: `retry-${Date.now()}`,
                name: retryState.projectName,
                description: retryState.projectDescription,
                status: 'retrying', // THAY ĐỔI: từ 'creating' thành 'retrying'
                processingProgress: retryState.processingProgress || 0,
                currentStage: retryState.currentStage || 'Initializing...',
                creationStatus: 'polling',
                isTemp: true,
                isRetry: true, // QUAN TRỌNG: đánh dấu đây là retry
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                members: [],
                pollingData: {
                  projectId: retryState.projectId,
                  versionId: retryState.versionId,
                  projectName: retryState.projectName,
                  projectDescription: retryState.projectDescription,
                  type: 'retry',
                },
              }

              this.creatingProjects.unshift(tempProject)
              this.startPollingForProject(tempProject._id, tempProject.pollingData)
            }
          }
        } catch (error) {
          console.error('Error restoring retry process:', error)
          localStorage.removeItem(key)
        }
      })
    },

    startPollingForProject(tempProjectId, pollingData) {
      console.log('🚀 Starting polling for project:', tempProjectId, pollingData)

      const interval = setInterval(async () => {
        try {
          const response = await getVersionStatus(pollingData.versionId)
          const { status, version, project } = response.data.data

          console.log('📊 Polling update:', {
            tempProjectId,
            status,
            progress: version?.progress,
            stage: version?.stage,
          })

          // Cập nhật tiến độ lên project card
          this.updateCreatingProjectProgress(tempProjectId, {
            processingProgress: version?.progress || 0,
            currentStage: version?.stage || 'Processing',
            creationStatus: status,
          })

          // Cập nhật localStorage cho retry processes
          if (pollingData.type === 'retry') {
            const retryState = {
              projectId: pollingData.projectId,
              versionId: pollingData.versionId,
              projectName: pollingData.projectName,
              projectDescription: pollingData.projectDescription,
              processingProgress: version?.progress || 0,
              currentStage: version?.stage || 'Processing',
              timestamp: new Date().getTime(),
              type: 'retry',
            }
            localStorage.setItem(`retry_${pollingData.projectId}`, JSON.stringify(retryState))
          }

          if (status !== 'processing') {
            const isReallyCompleted =
              status === 'completed' ||
              status === 'has_conflicts' ||
              version?.progress === 100 ||
              version?.stage === 'completed'

            if (isReallyCompleted) {
              clearInterval(interval)
              delete this.pollingIntervals[tempProjectId]

              // Xóa khỏi localStorage khi hoàn thành
              if (pollingData.type === 'retry') {
                localStorage.removeItem(`retry_${pollingData.projectId}`)
              }

              this.updateCreatingProjectProgress(tempProjectId, {
                processingProgress: 100,
                currentStage: 'Completed',
                creationStatus: 'completed',
              })

              setTimeout(() => {
                this.moveCreatingToRealProject(tempProjectId, project)
              }, 2000)
            }
          }
        } catch (error) {
          console.error('Polling error:', error)
          if (this.pollingIntervals[tempProjectId]?.retryCount > 3) {
            clearInterval(interval)
            delete this.pollingIntervals[tempProjectId]
            this.markCreatingProjectFailed(tempProjectId)
          } else {
            this.pollingIntervals[tempProjectId].retryCount =
              (this.pollingIntervals[tempProjectId]?.retryCount || 0) + 1
          }
        }
      }, 3000)

      this.pollingIntervals[tempProjectId] = {
        interval,
        retryCount: 0,
      }
    },

    updateCreatingProjectProgress(tempProjectId, progressData) {
      const projectIndex = this.creatingProjects.findIndex((p) => p._id === tempProjectId)
      if (projectIndex !== -1) {
        this.creatingProjects[projectIndex] = {
          ...this.creatingProjects[projectIndex],
          processingProgress: progressData.processingProgress,
          currentStage: progressData.currentStage,
          creationStatus: progressData.creationStatus,
          updatedAt: new Date().toISOString(),
        }
      }
    },

    moveCreatingToRealProject(tempProjectId, realProject) {
      const projectIndex = this.creatingProjects.findIndex((p) => p._id === tempProjectId)
      if (projectIndex !== -1) {
        this.creatingProjects.splice(projectIndex, 1)
        this.myProjects.unshift(realProject)
        this.recentProjects.unshift(realProject)
        this.showNotification('Success', `Project "${realProject.name}" created successfully!`)
      }
    },

    markCreatingProjectFailed(tempProjectId) {
      const projectIndex = this.creatingProjects.findIndex((p) => p._id === tempProjectId)
      if (projectIndex !== -1) {
        this.creatingProjects[projectIndex] = {
          ...this.creatingProjects[projectIndex],
          creationStatus: 'failed',
          currentStage: 'Failed',
          processingProgress: 0,
        }

        // Xóa khỏi localStorage khi failed
        const project = this.creatingProjects[projectIndex]
        if (project.pollingData?.type === 'retry') {
          localStorage.removeItem(`retry_${project.pollingData.projectId}`)
        }

        setTimeout(() => {
          this.creatingProjects = this.creatingProjects.filter((p) => p._id !== tempProjectId)
        }, 30000)
      }
    },

    handleProjectCreated(newProject) {
      if (newProject) {
        this.creatingProjects = this.creatingProjects.filter(
          (p) => !p._id.includes('creating-') || p.name !== newProject.name
        )
        this.myProjects.unshift(newProject)
        this.recentProjects.unshift(newProject)
      }
      this.creationSuccess = true
    },

    navigateTo(view) {
      this.currentView = view
    },

    async handleEditProject({ projectId, data }) {
      try {
        await updateProject(projectId, data)
        this.showNotification('Success', 'Project updated successfully!')
        this.updateProjectInLists(projectId, data)
      } catch (err) {
        console.error('Update project error', err)
        this.showNotification('Error', 'Failed to update project!')
      }
    },

    updateProjectInLists(projectId, newData) {
      const updateProjectInArray = (array) => {
        const index = array.findIndex((p) => (p._id || p.id) === projectId)
        if (index !== -1) {
          array[index] = { ...array[index], ...newData }
        }
      }

      updateProjectInArray(this.recentProjects)
      updateProjectInArray(this.myProjects)
      updateProjectInArray(this.sharedProjects)
      updateProjectInArray(this.creatingProjects)
    },

    async fetchInitialData() {
      try {
        this.cleanupOldCreatingProjects()

        const [userRes, myRes, sharedRes, recentRes, trashedRes] = await Promise.all([
          getCurrentUser(),
          getMyProjects(),
          getSharedProjects(),
          getRecentProjects(),
          getTrashedProjects(),
        ])

        this.user = userRes.data.data
        this.myProjects = myRes.data?.data || []
        this.sharedProjects = sharedRes.data?.data || []
        this.recentProjects = recentRes.data?.data || []
        this.trashedProjects = trashedRes.data?.data || []

        // Khôi phục retry processes sau khi fetch data
        this.$nextTick(() => {
          this.restoreRetryProcesses()
        })
      } catch (err) {
        console.error('Failed to fetch initial data:', err)
        if (err.response?.status === 401 || err.response?.status === 400) {
          this.logout()
        }
      }
    },

    cleanupOldCreatingProjects() {
      const now = new Date().getTime()
      this.creatingProjects = this.creatingProjects.filter((p) => {
        if (p.isTemp) {
          const createdTime = new Date(p.createdAt).getTime()
          return now - createdTime < 7200000 // 2 giờ
        }
        return true
      })
    },

    openProject(project) {
      if (project.isTemp) return
      const id = project._id || project.id
      if (id) this.$router.push({ name: 'Editor', params: { id } })
    },

    confirmMoveToTrash(projectId) {
      this.showConfirmation(
        'Confirm Move to Trash',
        'Are you sure you want to move this project to the trash?',
        () => this.moveToTrash(projectId)
      )
    },

    async moveToTrash(projectId) {
      try {
        await deleteProject(projectId)
        this.showNotification('Success', 'Project moved to trash successfully!')
        this.fetchInitialData()
      } catch (err) {
        console.error('Move to trash error', err)
        this.showNotification('Error', 'Failed to move project to trash!')
      }
    },

    async restoreProject(projectId) {
      try {
        await apiRestoreProject(projectId)
        this.showNotification('Success', 'Project restored successfully.')
        this.fetchInitialData()
      } catch (err) {
        console.error('Restore error', err)
        this.showNotification('Error', 'Failed to restore project!')
      }
    },

    confirmDeletePermanently(projectId) {
      this.showConfirmation(
        'Confirm Permanent Deletion',
        'This action is irreversible. Are you sure you want to permanently delete this project?',
        () => this.deleteProjectPermanently(projectId)
      )
    },

    async deleteProjectPermanently(projectId) {
      try {
        await deleteProject(projectId)
        this.showNotification('Success', 'Project permanently deleted!')
        this.fetchInitialData()
      } catch (err) {
        console.error('Permanent delete error', err)
        this.showNotification('Error', 'Failed to permanently delete project!')
      }
    },

    logout() {
      this.cleanupAllPolling()
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('userId')
      localStorage.removeItem('email')
      this.$router.push('/login')
    },
  },
}
</script>
<style scoped>
.homepage {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f5f5f5;
}
.app-container {
  display: flex;
  min-height: 100vh;
}
.main-content {
  flex: 1;
  background-color: #ffffff;
  margin-left: 250px;
}
.page-header {
  padding: 20px 30px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f8f9fa;
}
.page-header h1 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}
.content-area {
  padding: 30px;
}
.projects-header {
  margin-bottom: 30px;
  text-align: left;
}
.projects-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
}
.projects-header p {
  font-size: 14px;
  color: #666;
  min-height: 24px;
}
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}
.trash-view {
  text-align: center;
}
.empty-state {
  margin-top: 60px;
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 20px;
}
.empty-icon .material-symbols-outlined {
  font-size: 64px;
  color: #9ca3af;
}
.empty-state p {
  font-size: 16px;
  color: #666;
}
@media (max-width: 768px) {
  .app-container {
    flex-direction: column;
  }
  .projects-grid {
    grid-template-columns: 1fr;
  }
}
/* Styles cho section projects đang tạo */
.creating-projects-section {
  border-bottom: 2px solid #e3f2fd;
  padding-bottom: 30px;
  margin-bottom: 30px;
}

.creating-projects-section .projects-header h2 {
  color: #1a365d;
}

.creating-projects-section .projects-header p {
  color: #2c5282;
  font-weight: 500;
}
</style>