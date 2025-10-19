<template>
  <div class="homepage">
    <div class="app-container">
      <Sidebar
        :user="user"
        @new="openNewProjectModal"
        @navigate="navigateTo"
        @logout="logout"
        @open-personal="openPersonalInfo"
      />

      <div class="main-content">
        <header class="page-header">
          <h1>HOME PAGE</h1>
          <div class="header-actions">
            <button @click="openInvitationsModal" class="btn-icon invitations-btn">
              <span class="material-symbols-outlined">group</span>
              <span v-if="sentInvitations.length > 0" class="invitation-badge">
                {{ sentInvitations.length }}
              </span>
            </button>

            <div class="notifications-container">
              <button @click="toggleNotifications" class="btn-icon notifications-btn">
                <span class="material-symbols-outlined">notifications</span>
                <span v-if="notificationCount > 0" class="notification-badge">{{
                  notificationCount
                }}</span>
              </button>

              <div v-if="isNotificationsVisible" class="notifications-dropdown">
                <div class="dropdown-header">
                  <h3>Project Invitations</h3>
                </div>
                <ul v-if="myInvitations.length > 0" class="invitations-list">
                  <li v-for="inv in myInvitations" :key="inv.id" class="invitation-item">
                    <div class="invitation-details">
                      <p>
                        <strong>{{ inv.invitedBy }}</strong> has invited you to join a project as a
                        <strong>{{ inv.role }}</strong
                        >.
                      </p>
                      <small
                        >Project: <strong>{{ inv.projectName }}</strong></small
                      >
                    </div>
                    <div class="invitation-actions">
                      <button @click="handleAcceptInvitation(inv)" class="btn btn-sm btn-primary">
                        Accept
                      </button>
                      <button @click="handleRejectInvitation(inv)" class="btn btn-sm btn-secondary">
                        Decline
                      </button>
                    </div>
                  </li>
                </ul>
                <div v-else class="empty-invitations">
                  <p>No pending invitations.</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div class="content-area">
          <!-- Filter Section -->
          <div class="filter-section" v-if="currentView !== 'trash'">
            <div class="filter-controls">
              <div class="search-input-container">
                <span class="material-symbols-outlined search-icon">search</span>
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search projects..."
                  class="search-input"
                />
              </div>
              <select v-model="languageFilter" class="filter-select">
                <option value="">All Languages</option>
                <option value="vi-VN">Vietnamese</option>
                <option value="en-US">English</option>
              </select>
              <select v-model="sortBy" class="filter-select">
                <option value="updatedAt">Last Updated</option>
                <option value="createdAt">Date Created</option>
                <option value="name">Name</option>
              </select>
            </div>
            <div class="filter-stats">
              <span class="stat-text">{{ filteredProjects.length }} projects found</span>
              <span v-if="languageFilter" class="language-badge" :class="languageFilter">
                {{ languageLabel }}
              </span>
            </div>
          </div>

          <!-- Hiển thị projects đang được tạo -->
          <div
            v-if="filteredCreatingProjects.length > 0 && currentView !== 'trash'"
            class="projects-view creating-projects-section"
          >
            <div class="section-header">
              <h2>Creating Projects</h2>
              <p>{{ filteredCreatingProjects.length }} project(s) in progress</p>
            </div>
            <div class="projects-grid">
              <ProjectCard
                v-for="p in filteredCreatingProjects"
                :key="p._id"
                :project="p"
                :user="user"
                :is-creating="true"
                @open="openProject"
                @retry-creation="retryCreatingProject"
                @leave="handleLeaveProject"
              />
            </div>
          </div>

          <!-- Recent Projects -->
          <div v-if="currentView === 'recent-projects'" class="projects-view">
            <div class="section-header">
              <h2>Recent Projects</h2>
              <p>Your recently accessed projects</p>
            </div>
            <div v-if="filteredProjects.length > 0" class="projects-grid">
              <ProjectCard
                v-for="p in filteredProjects"
                :key="p._id"
                :project="p"
                :user="user"
                @open="openProject"
                @edit="handleEditProject"
                @delete="confirmMoveToTrash"
                @share="openShareModal"
                @leave="handleLeaveProject"
              />
            </div>
            <div v-else class="empty-state">
              <div class="empty-icon">
                <span class="material-symbols-outlined">folder_open</span>
              </div>
              <h3>No Recent Projects</h3>
              <p>Projects you've recently worked on will appear here</p>
              <button class="btn-primary" @click="openNewProjectModal">
                <span class="material-symbols-outlined">add</span>
                Create New Project
              </button>
            </div>
          </div>

          <!-- My Projects -->
          <div v-if="currentView === 'my-projects'" class="projects-view">
            <div class="section-header">
              <h2>My Projects</h2>
              <p>Projects you own</p>
            </div>
            <div v-if="filteredProjects.length > 0" class="projects-grid">
              <ProjectCard
                v-for="p in filteredProjects"
                :key="p._id"
                :project="p"
                :user="user"
                @open="openProject"
                @edit="handleEditProject"
                @delete="confirmMoveToTrash"
                @share="openShareModal"
                @leave="handleLeaveProject"
              />
            </div>
            <div v-else class="empty-state">
              <div class="empty-icon">
                <span class="material-symbols-outlined">create_new_folder</span>
              </div>
              <h3>No Projects</h3>
              <p>Create your first project to get started</p>
              <button class="btn-primary" @click="openNewProjectModal">
                <span class="material-symbols-outlined">add</span>
                Create New Project
              </button>
            </div>
          </div>

          <!-- Shared Projects -->
          <div v-if="currentView === 'shared-projects'" class="projects-view">
            <div class="section-header">
              <h2>Shared Projects</h2>
              <p>Projects shared with you</p>
            </div>
            <div v-if="filteredProjects.length > 0" class="projects-grid">
              <ProjectCard
                v-for="p in filteredProjects"
                :key="p._id"
                :project="p"
                :user="user"
                @open="openProject"
                @edit="handleEditProject"
                @delete="confirmMoveToTrash"
                @share="openShareModal"
                @leave="handleLeaveProject"
              />
            </div>
            <div v-else class="empty-state">
              <div class="empty-icon">
                <span class="material-symbols-outlined">people</span>
              </div>
              <h3>No Shared Projects</h3>
              <p>Projects shared with you will appear here</p>
            </div>
          </div>

          <!-- Trash -->
          <div v-if="currentView === 'trash'" class="projects-view">
            <div class="section-header">
              <h2>Trashed Projects</h2>
              <p>Projects moved to trash</p>
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
                @share="openShareModal"
                @leave="handleLeaveProject"
              />
            </div>
            <div v-else class="empty-state">
              <div class="empty-icon">
                <span class="material-symbols-outlined">delete_outline</span>
              </div>
              <h3>Trash is Empty</h3>
              <p>No projects found in trash</p>
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
    <PersonalInfor
      v-if="showPersonalInfo"
      :user="user"
      @close="showPersonalInfo = false"
      @avatar-updated="handleAvatarUpdated"
    />
    <ProjectSharingModal
      v-if="isShareModalVisible"
      :project-id="selectedProject._id"
      @close="closeShareModal"
    />

    <AppModal
      v-model="isAppModalVisible"
      :title="modalContent.title"
      :message="modalContent.message"
      :is-confirmation="modalContent.isConfirmation"
      @confirm="modalContent.onConfirm"
    />
    <!-- Modal xem invitations -->
    <InvitationsModal
      v-if="isInvitationsModalVisible"
      :sent-invitations="sentInvitations"
      :received-invitations="myInvitations"
      @close="closeInvitationsModal"
      @cancel-invite="handleCancelInvite"
      @accept-invite="handleAcceptInvitation"
      @reject-invite="handleRejectInvitation"
    />
  </div>
</template>

<script>
import { useToast } from 'vue-toastification'
import Sidebar from '@/components/Sidebar.vue'
import PersonalInfor from '../components/PersonalInfor.vue'
import ProjectSharingModal from '@/components/ProjectSharingModal.vue'
import NewProjectModal from '@/components/NewProjectForm.vue'
import ProjectCard from '@/components/ProjectCard.vue'
import AppModal from '@/components/AppModal.vue'
import InvitationsModal from '@/components/InvitationsModal.vue'
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
  getMyInvitations,
  getProjectInvites,
  cancelInvite,
  acceptInvite,
  rejectInvite,
  leaveProject,
} from '@/api/project'
import { getUserInfo, logout as authLogout } from '@/utils/authGuard'
import axiosClient from '@/utils/axiosClient'
import { socket } from '@/utils/socket'
export default {
  name: 'Homepage',
  components: {
    Sidebar,
    NewProjectModal,
    ProjectCard,
    AppModal,
    PersonalInfor,
    ProjectSharingModal,
    InvitationsModal,
  },
  data() {
    return {
      isNewProjectModalVisible: false,
      showPersonalInfo: false,
      isShareModalVisible: false,
      isInvitationsModalVisible: false,
      selectedProject: null,
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
      toast: useToast(),

      // Filter states
      searchQuery: '',
      languageFilter: '',
      sortBy: 'updatedAt',
      isNotificationsVisible: false,
      myInvitations: [],
      sentInvitations: [],
    }
  },
  mounted() {
    socket.on('notification', (data) => {
      console.log('📩 Realtime notification received:', data)
      // Cho phép HTML render đúng
      this.toast.info(`${data.title}: ${data.message}`, {
        dangerouslyHTMLString: true,
      })
      // Cập nhật danh sách realtime
      if (data.type === 'invitation' || data.title?.includes('Request to join')) {
        this.fetchMyInvitationsRealtime()
      }
      if (
        data.title?.includes('Joined') ||
        data.title?.includes('Declined') ||
        data.title?.includes('Left')
      ) {
        this.fetchInitialData()
      }
    })
  },
  computed: {
    notificationCount() {
      return this.myInvitations.length
    },
    currentProjects() {
      switch (this.currentView) {
        case 'recent-projects':
          return this.recentProjects
        case 'my-projects':
          return this.myProjects
        case 'shared-projects':
          return this.sharedProjects
        default:
          return []
      }
    },
    languageLabel() {
      const labels = {
        'vi-VN': 'Vietnamese',
        'en-US': 'English',
      }
      return labels[this.languageFilter] || this.languageFilter
    },
    filteredCreatingProjects() {
      return this.creatingProjects.filter((project) =>
        project.name.toLowerCase().includes(this.searchQuery.toLowerCase())
      )
    },
    filteredProjects() {
      let filtered = this.currentProjects.filter(
        (project) =>
          project.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          (project.description &&
            project.description.toLowerCase().includes(this.searchQuery.toLowerCase()))
      )

      // Filter by language
      if (this.languageFilter) {
        filtered = filtered.filter((project) => project.language === this.languageFilter)
      }

      // Sort projects
      filtered.sort((a, b) => {
        if (this.sortBy === 'name') {
          return a.name.localeCompare(b.name)
        }
        return new Date(b[this.sortBy]) - new Date(a[this.sortBy])
      })

      return filtered
    },
  },
  created() {
    this.fetchInitialData()
  },
  beforeUnmount() {
    this.cleanupAllPolling()
    if (socket) {
      socket.off('notification')
      console.log('🧹 Socket listener removed on unmount')
    }
  },
  methods: {
    // --- Dọn dẹp polling ---
    cleanupAllPolling() {
      Object.values(this.pollingIntervals).forEach((interval) => {
        clearInterval(interval)
      })
      this.pollingIntervals = {}
    },
    async fetchMyInvitationsRealtime() {
      try {
        const invRes = await getMyInvitations()
        this.myInvitations = (invRes.data?.data || []).map((inv) => ({
          id: inv._id,
          project_id: inv.project_id,
          projectName: inv.project_name || 'Unnamed Project',
          role: inv.role,
          invitedBy: inv.inviter?.name || 'Unknown',
          date: inv.created_at,
          invitee: inv.invitee,
          invite_token: inv.invite_token,
        }))
        console.log('🔄 Invitations updated via realtime socket')
      } catch (error) {
        console.error('❌ Failed to fetch invitations via socket:', error)
      }
    },
    async fetchInitialData() {
      try {
        const [userRes, myRes, sharedRes, recentRes, trashedRes, invRes] = await Promise.all([
          getCurrentUser(),
          getMyProjects(),
          getSharedProjects(),
          getRecentProjects(),
          getTrashedProjects(),
          getMyInvitations(),
        ])

        this.user = userRes.data.data
        this.myProjects = myRes.data?.data || []
        this.sharedProjects = sharedRes.data?.data || []
        this.recentProjects = recentRes.data?.data || []
        this.trashedProjects = trashedRes.data?.data || []

        // 🔥 FIXED: Đảm bảo lấy đúng token từ API response
        this.myInvitations = (invRes.data?.data || []).map((inv) => ({
          id: inv._id || inv.invite_id,
          project_id: inv.project_id,
          projectName: inv.project_name || 'Unnamed Project',
          role: inv.role,
          invitedBy: inv.inviter?.name || 'Unknown',
          date: inv.created_at,
          invitee: inv.invitee,
          invite_token: inv.invite_token, // 🔥 QUAN TRỌNG: Đảm bảo có token
        }))

        console.log(
          '📥 Loaded invitations:',
          this.myInvitations.map((inv) => ({
            id: inv.id,
            project: inv.projectName,
            hasToken: !!inv.invite_token,
          }))
        )

        // Load sent invitations
        this.loadSentInvitations()

        // Khôi phục retry processes
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

    // Trong methods của HomePage.vue
    async handleLeaveProject(projectId) {
      try {
        console.log('Leaving project:', projectId)

        // Gọi API leave project
        await leaveProject(projectId)

        this.toast.success('You have left the project successfully.')

        // Refresh data
        this.fetchInitialData()
      } catch (err) {
        console.error('Leave project error:', err)

        if (err.response?.status === 403) {
          this.toast.error('You cannot leave a project you own. Please transfer ownership first.')
        } else if (err.response?.status === 404) {
          this.toast.error('Project not found or you are not a member.')
          this.fetchInitialData() // Refresh anyway
        } else {
          this.toast.error('Failed to leave project. Please try again.')
        }
      }
    },

    // --- ✨ NOTIFICATION METHODS ---
    toggleNotifications() {
      this.isNotificationsVisible = !this.isNotificationsVisible
    },

    async handleAcceptInvitation(inv) {
      try {
        console.log('🎯 Accepting invitation:', {
          id: inv.id,
          project_id: inv.project_id,
          memberId: inv.invitee?._id,
          token: inv.invite_token ? '***' : 'MISSING',
        })

        // 🔥 FIXED: Kiểm tra kỹ dữ liệu trước khi gọi API
        if (!inv.project_id || !inv.invitee?._id) {
          console.error('❌ Missing required data for acceptance:', inv)
          this.toast.error('Invalid invitation data - missing project or member ID')
          return
        }

        // 🔥 FIXED: Sử dụng API đã sửa
        await acceptInvite(inv.project_id, inv.invitee._id, inv.invite_token)

        // Cập nhật UI ngay lập tức
        this.myInvitations = this.myInvitations.filter((i) => i.id !== inv.id)
        this.toast.success(`You have joined the project: ${inv.projectName}`)

        // Refresh project lists
        this.fetchInitialData()
      } catch (err) {
        console.error('❌ Accept invitation error:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        })

        if (err.response?.status === 400) {
          const errorMsg = err.response?.data?.message || 'Invalid request'
          this.toast.error(`Failed to accept: ${errorMsg}`)
        } else if (err.response?.status === 404) {
          this.toast.error('Invitation not found or already processed.')
          // Xóa invitation khỏi danh sách nếu không tìm thấy
          this.myInvitations = this.myInvitations.filter((i) => i.id !== inv.id)
        } else if (err.response?.status === 403) {
          this.toast.error('Invalid or expired token.')
          this.myInvitations = this.myInvitations.filter((i) => i.id !== inv.id)
        } else {
          this.toast.error('Failed to accept the invitation. Please try again.')
        }
      }
    },

    async handleRejectInvitation(inv) {
      try {
        console.log('🎯 Rejecting invitation:', {
          id: inv.id,
          project_id: inv.project_id,
          memberId: inv.invitee?._id,
          token: inv.invite_token ? '***' : 'MISSING',
        })

        // 🔥 FIXED: Kiểm tra kỹ dữ liệu trước khi gọi API
        if (!inv.project_id || !inv.invitee?._id) {
          console.error('❌ Missing required data for rejection:', inv)
          this.toast.error('Invalid invitation data - missing project or member ID')
          return
        }

        // 🔥 FIXED: Sử dụng API đã sửa
        await rejectInvite(inv.project_id, inv.invitee._id, inv.invite_token)

        // Cập nhật UI ngay lập tức
        this.myInvitations = this.myInvitations.filter((i) => i.id !== inv.id)
        this.toast.info('You have declined the invitation.')
      } catch (err) {
        console.error('❌ Reject invitation error:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        })

        if (err.response?.status === 400) {
          const errorMsg = err.response?.data?.message || 'Invalid request'
          this.toast.error(`Failed to decline: ${errorMsg}`)
        } else if (err.response?.status === 404) {
          this.toast.error('Invitation not found or already processed.')
          this.myInvitations = this.myInvitations.filter((i) => i.id !== inv.id)
        } else if (err.response?.status === 403) {
          this.toast.error('Invalid or expired token.')
          this.myInvitations = this.myInvitations.filter((i) => i.id !== inv.id)
        } else {
          this.toast.error('Failed to decline the invitation. Please try again.')
        }
      }
    },

    // --- MODAL METHODS ---
    openPersonalInfo() {
      this.showPersonalInfo = true
    },

    openShareModal(project) {
      this.selectedProject = project
      this.isShareModalVisible = true
    },

    closeShareModal() {
      this.isShareModalVisible = false
      this.fetchInitialData()
    },

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

    // --- PROJECT CREATION METHODS ---
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
        this.toast.error('Cannot track project creation progress. Please check the project later!')
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

    // Khôi phục retry processes từ localStorage
    restoreRetryProcesses() {
      const retryKeys = Object.keys(localStorage).filter((key) => key.startsWith('retry_'))

      retryKeys.forEach((key) => {
        try {
          const retryState = JSON.parse(localStorage.getItem(key))
          if (retryState && retryState.type === 'retry') {
            console.log('🔄 Restoring retry process:', retryState)

            const existingIndex = this.creatingProjects.findIndex(
              (p) => p.pollingData?.projectId === retryState.projectId && p.isRetry
            )

            if (existingIndex === -1) {
              const tempProject = {
                _id: `retry-${Date.now()}`,
                name: retryState.projectName,
                description: retryState.projectDescription,
                status: 'retrying',
                processingProgress: retryState.processingProgress || 0,
                currentStage: retryState.currentStage || 'Initializing...',
                creationStatus: 'polling',
                isTemp: true,
                isRetry: true,
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
        this.toast.success(`Project created successfully!`)
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
        this.toast.success(`Project updated successfully!`)
        this.updateProjectInLists(projectId, data)
      } catch (err) {
        console.error('Update project error', err)
        this.toast.error(`Failed to update project!`)
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
        this.toast.success(`Project trashed successfully!`)
        this.fetchInitialData()
      } catch (err) {
        console.error('Move to trash error', err)
        this.toast.error(`Failed to trash project!`)
      }
    },

    async restoreProject(projectId) {
      try {
        await apiRestoreProject(projectId)
        this.toast.success(`Project restored successfully!`)
        this.fetchInitialData()
      } catch (err) {
        console.error('Restore error', err)
        this.toast.error(`Failed to restore project!`)
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
        this.toast.success(`Project deleted successfully!`)
        this.fetchInitialData()
      } catch (err) {
        console.error('Permanent delete error', err)
        this.toast.error(`Failed to permanently delete project!`)
      }
    },

    async logout() {
      console.log('🚪 Logged out')
      if (socket && socket.connected) {
        socket.disconnect()
        console.log('🔌 Socket disconnected on logout')
      }
      await authLogout()
      this.$router.push('/login')
    },

    handleAvatarUpdated(avatarData) {
      console.log('🔄 Avatar updated in PersonalInfo:', avatarData)

      if (this.user && avatarData.avatar_url) {
        this.user.avatar_url = avatarData.avatar_url
        this.$forceUpdate()
        this.fetchUserData()
      }
    },

    async fetchUserData() {
      try {
        const userRes = await getCurrentUser()
        this.user = userRes.data.data
        console.log('✅ User data refreshed after avatar update')
      } catch (error) {
        console.error('❌ Failed to refresh user data:', error)
      }
    },

    // INVITATION MODAL METHODS
    openInvitationsModal() {
      this.isInvitationsModalVisible = true
      this.loadSentInvitations()
    },

    closeInvitationsModal() {
      this.isInvitationsModalVisible = false
    },

    async loadSentInvitations() {
      try {
        const myProjects = await getMyProjects()
        let allSentInvites = []

        for (const project of myProjects.data.data) {
          try {
            const response = await getProjectInvites(project._id)
            if (response.data && response.data.data) {
              const projectInvites = response.data.data.map((invite) => ({
                ...invite,
                projectName: project.name,
                projectId: project._id,
              }))
              allSentInvites = [...allSentInvites, ...projectInvites]
            }
          } catch (error) {
            console.warn(`Cannot get invites for project ${project._id}:`, error.message)
            // Fallback: lấy từ members có status pending
            const pendingMembers = project.members?.filter((m) => m.status === 'pending') || []
            const projectInvites = pendingMembers.map((member) => ({
              invite_id: member._id || `temp-${Date.now()}`,
              project_id: project._id,
              projectName: project.name,
              role: member.role,
              status: member.status,
              created_at: member.invited_at,
              invitee: {
                _id: member.user_id?._id || member.user_id,
                name: member.user_id?.name || 'Unknown',
                email: member.user_id?.email || 'No email',
              },
              inviter: {
                _id: member.invited_by?._id || member.invited_by,
                name: member.invited_by?.name || 'Unknown',
                email: member.invited_by?.email || 'No email',
              },
            }))
            allSentInvites = [...allSentInvites, ...projectInvites]
          }
        }

        this.sentInvitations = allSentInvites
      } catch (error) {
        console.error('Error loading sent invitations:', error)
        this.toast.error('Failed to load sent invitations')
      }
    },

    async handleCancelInvite(invitation) {
      try {
        await cancelInvite(invitation.project_id, invitation.invitee._id)
        this.toast.success('Invitation canceled successfully')

        this.sentInvitations = this.sentInvitations.filter(
          (inv) => inv.invite_id !== invitation.invite_id
        )

        this.fetchInitialData()
      } catch (error) {
        console.error('Error canceling invitation:', error)
        this.toast.error('Failed to cancel invitation')
      }
    },
  },
}
</script>

<style scoped>
.homepage {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f9fafb;
  min-height: 100vh;
}

/* ✨ NEW: Styles for Notifications Dropdown */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notifications-container {
  position: relative;
}

.notifications-btn {
  position: relative;
}

.notification-badge {
  position: absolute;
  top: -5px;
  right: -8px;
  background-color: #ef4444;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.notifications-dropdown {
  position: absolute;
  top: 120%;
  right: 0;
  width: 350px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #e5e7eb;
  z-index: 100;
  overflow: hidden;
}

.dropdown-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.dropdown-header h3 {
  margin: 0;
  font-size: 1rem;
}

.invitations-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 400px;
  overflow-y: auto;
}

.invitation-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
}

.invitation-item:last-child {
  border-bottom: none;
}

.invitation-details p {
  margin: 0;
  font-weight: 500;
}

.invitation-details small {
  color: #6b7280;
}

.invitation-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.empty-invitations {
  padding: 24px;
  text-align: center;
  color: #6b7280;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 0.8rem;
}

.app-container {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  background-color: #ffffff;
  margin-left: 250px;
  display: flex;
  flex-direction: column;
}

.page-header {
  padding: 20px 30px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #ffffff;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a365d;
  margin: 0;
}

/* Navigation Tabs */
.navigation-tabs {
  display: flex;
  gap: 12px;
  margin: 0 30px 24px;
  padding: 0 8px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 16px;
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

.content-area {
  padding: 0 30px 30px;
  flex: 1;
}

/* Filter Section */
.filter-section {
  background: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 30px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-left: 0;
}

.search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #6b7280;
  font-size: 20px;
}

.search-input {
  padding: 10px 12px 10px 40px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  width: 300px;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #1a365d;
}

.filter-select {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.3s ease;
}

.filter-select:focus {
  outline: none;
  border-color: #1a365d;
}

.filter-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-text {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.language-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.language-badge.vi-VN {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #93c5fd;
}

.language-badge.en-US {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}

/* Section Headers */
.section-header {
  margin-bottom: 30px;
  text-align: left;
}

.section-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a365d;
  margin-bottom: 8px;
}

.section-header p {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

/* Projects Grid */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

/* Creating Projects Section */
.creating-projects-section {
  border-bottom: 2px solid #e3f2fd;
  padding-bottom: 30px;
  margin-bottom: 30px;
}

.creating-projects-section .section-header h2 {
  color: #1a365d;
}

.creating-projects-section .section-header p {
  color: #2c5282;
  font-weight: 500;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  margin-top: 20px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon .material-symbols-outlined {
  font-size: 40px;
  color: #9ca3af;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #374151;
  font-size: 1.25rem;
  font-weight: 600;
}

.empty-state p {
  margin: 0 0 24px 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #1a365d;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-primary:hover {
  background: #2d4a8a;
}

/* Responsive Design */
@media (max-width: 768px) {
  .app-container {
    flex-direction: column;
  }

  .main-content {
    margin-left: 0;
  }

  .projects-grid {
    grid-template-columns: 1fr;
  }

  .filter-section {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .filter-controls {
    flex-direction: column;
  }

  .search-input {
    width: 100%;
  }

  .filter-stats {
    justify-content: space-between;
  }

  .navigation-tabs {
    flex-wrap: wrap;
    margin: 0 16px 16px;
  }

  .content-area {
    padding: 0 16px 16px;
  }
}

.invitations-btn {
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.3s;
}

.invitations-btn:hover {
  background-color: #f3f4f6;
}

.invitation-badge {
  position: absolute;
  top: -5px;
  right: -8px;
  background-color: #3b82f6;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}
</style>