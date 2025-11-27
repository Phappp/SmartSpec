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

          <!-- Bulk Actions khi có project được chọn -->
          <div v-if="selectedProjects.length > 0" class="bulk-actions">
            <span class="selected-count">{{ selectedProjects.length }} selected</span>
            <button
              v-if="currentView !== 'trash'"
              @click="bulkMoveToTrash"
              class="btn-bulk btn-bulk-delete"
            >
              <span class="material-symbols-outlined">delete</span>
              Move to Trash
            </button>
            <button
              v-if="currentView === 'trash'"
              @click="bulkRestore"
              class="btn-bulk btn-bulk-restore"
            >
              <span class="material-symbols-outlined">restore</span>
              Restore
            </button>
            <button
              v-if="currentView === 'trash'"
              @click="bulkDeletePermanently"
              class="btn-bulk btn-bulk-delete"
            >
              <span class="material-symbols-outlined">delete_forever</span>
              Delete Permanently
            </button>
            <button @click="clearSelection" class="btn-bulk btn-bulk-cancel">
              <span class="material-symbols-outlined">close</span>
              Cancel
            </button>
          </div>

          <div v-else class="header-actions">
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

          <!-- Recent Projects -->
          <div v-if="currentView === 'recent-projects'" class="projects-view">
            <div class="section-header">
              <h2>Recent Projects</h2>
            </div>
            <div v-if="filteredProjects.length > 0" class="projects-grid">
              <ProjectCard
                v-for="p in filteredProjects"
                :key="p._id"
                :project="p"
                :show-multi-select="isMultiSelectMode"
                :is-selected="selectedProjects.includes(p._id)"
                :current-user-id="user?._id"
                @open="openProject"
                @edit="handleEditProject"
                @delete="confirmMoveToTrash"
                @share="openShareModal"
                @leave="handleLeaveProject"
                @restore="restoreProject"
                @delete-permanently="confirmDeletePermanently"
                @selection-toggle="handleSelectionToggle"
                @open-preview="openPreviewModal"
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
            </div>
            <div v-if="filteredProjects.length > 0" class="projects-grid">
              <ProjectCard
                v-for="p in filteredProjects"
                :key="p._id"
                :project="p"
                :show-multi-select="isMultiSelectMode"
                :is-selected="selectedProjects.includes(p._id)"
                :current-user-id="user?._id"
                @open="openProject"
                @edit="handleEditProject"
                @delete="confirmMoveToTrash"
                @share="openShareModal"
                @leave="handleLeaveProject"
                @restore="restoreProject"
                @delete-permanently="confirmDeletePermanently"
                @selection-toggle="handleSelectionToggle"
                @open-preview="openPreviewModal"
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
                :show-multi-select="isMultiSelectMode"
                :is-selected="selectedProjects.includes(p._id)"
                :current-user-id="user?._id"
                @open="openProject"
                @edit="handleEditProject"
                @delete="confirmMoveToTrash"
                @share="openShareModal"
                @leave="handleLeaveProject"
                @restore="restoreProject"
                @delete-permanently="confirmDeletePermanently"
                @selection-toggle="handleSelectionToggle"
                @open-preview="openPreviewModal"
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
                :is-trashed="true"
                :show-multi-select="isMultiSelectMode"
                :is-selected="selectedProjects.includes(p._id)"
                :current-user-id="user?._id"
                @open="openProject"
                @edit="handleEditProject"
                @delete="confirmMoveToTrash"
                @share="openShareModal"
                @leave="handleLeaveProject"
                @restore="restoreProject"
                @delete-permanently="confirmDeletePermanently"
                @selection-toggle="handleSelectionToggle"
                @open-preview="openPreviewModal"
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

    <!-- Modals -->
    <NewProjectModal
      :show="isNewProjectModalVisible"
      @close="closeNewProjectModal"
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

    <!-- Preview Modal -->
    <PreviewModal
      v-if="isPreviewModalVisible"
      :project="selectedProject"
      :preview-data="previewData"
      @close="closePreviewModal"
      @approve="handleApprovePreview"
      @revert="handleRevertChange"
      @bump-version="handleBumpVersion"
    />

    <AppModal
      v-model="isAppModalVisible"
      :title="modalContent.title"
      :message="modalContent.message"
      :is-confirmation="modalContent.isConfirmation"
      @confirm="modalContent.onConfirm"
    />

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
import PreviewModal from '@/components/PreviewModal.vue'
import {
  getMyProjects,
  getSharedProjects,
  getRecentProjects,
  deleteProject,
  getCurrentUser,
  getTrashedProjects,
  restoreProject as apiRestoreProject,
  updateProject,
} from '@/api/project'
import {
  getMyInvitations,
  getProjectInvites,
  cancelInvite,
  acceptInvite,
  rejectInvite,
  leaveProject,
} from '@/api/share'
import { getUserInfo, logout as authLogout } from '@/utils/authGuard'
import { socket } from '@/utils/socket'
import { getPreview, approvePreview, revertChange, bumpVersion } from '@/api/version'

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
    PreviewModal,
  },
  data() {
    return {
      isNewProjectModalVisible: false,
      showPersonalInfo: false,
      isShareModalVisible: false,
      isPreviewModalVisible: false,
      isInvitationsModalVisible: false,
      selectedProject: null,
      previewData: null,
      creationSuccess: false,
      currentView: 'recent-projects',
      user: null,
      recentProjects: [],
      myProjects: [],
      sharedProjects: [],
      trashedProjects: [],
      isAppModalVisible: false,
      modalContent: {
        title: '',
        message: '',
        isConfirmation: false,
        onConfirm: () => {},
      },
      toast: useToast(),

      // Filter states
      searchQuery: '',
      languageFilter: '',
      sortBy: 'updatedAt',
      isNotificationsVisible: false,
      myInvitations: [],
      sentInvitations: [],
      isMobile: false,

      // Multi-select states
      isMultiSelectMode: false,
      selectedProjects: [],
    }
  },
  mounted() {
    this.checkMobile()
    window.addEventListener('resize', this.checkMobile)

    socket.on('notification', (data) => {
      console.log('📩 Realtime notification received:', data)
      this.toast.info(`${data.title}: ${data.message}`, {
        dangerouslyHTMLString: true,
      })
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
    filteredProjects() {
      let filtered = this.currentProjects.filter(
        (project) =>
          project.name?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          project.description?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          false
      )

      // Filter by language
      if (this.languageFilter) {
        filtered = filtered.filter((project) => project.language === this.languageFilter)
      }

      // Sort projects
      filtered.sort((a, b) => {
        if (this.sortBy === 'name') {
          return a.name?.localeCompare(b.name || '') || 0
        }

        const dateA = new Date(a[this.sortBy] || 0)
        const dateB = new Date(b[this.sortBy] || 0)
        return dateB - dateA
      })

      return filtered
    },
  },
  created() {
    this.fetchInitialData()
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile)
    if (socket) {
      socket.off('notification')
      console.log('🧹 Socket listener removed on unmount')
    }
  },
  methods: {
    closePreviewModal() {
      this.isPreviewModalVisible = false
      this.selectedProject = null
      this.previewData = null
    },

    // Trong methods của HomePage.vue
    // Trong methods của HomePage.vue
    async handleApprovePreview({ changeType, comment }) {
      try {
        // DEBUG: Log to see what we're working with
        console.log('🔍 Debug version data:', {
          previewData: this.previewData,
          previewDataBaseVersionId: this.previewData?.base_version_id,
          previewDataBaseVersionIdType: typeof this.previewData?.base_version_id,
          previewDataBaseVersionIdValue: this.previewData?.base_version_id?._id,
          selectedProject: this.selectedProject,
          projectCurrentVersion: this.selectedProject?.current_version,
          projectCurrentVersionType: typeof this.selectedProject?.current_version,
        })

        // FIX: Extract versionId correctly from Proxy object
        let versionId = null

        // Priority 1: From previewData.base_version_id (handle Proxy object)
        if (this.previewData?.base_version_id) {
          const baseVersion = this.previewData.base_version_id
          // Handle both Proxy object and plain object
          if (baseVersion._id) {
            versionId = baseVersion._id
            console.log('📌 Using _id from previewData.base_version_id object:', versionId)
          } else if (typeof baseVersion === 'string') {
            versionId = baseVersion
            console.log('📌 Using string from previewData.base_version_id:', versionId)
          } else {
            // If it's a Proxy, try to access the underlying data
            try {
              versionId = baseVersion._id || JSON.parse(JSON.stringify(baseVersion))._id
              console.log('📌 Extracted _id from Proxy object:', versionId)
            } catch (e) {
              console.error('❌ Cannot extract _id from base_version_id:', baseVersion)
            }
          }
        }
        // Priority 2: From project current_version
        else if (this.selectedProject?.current_version) {
          const currentVersion = this.selectedProject.current_version
          if (typeof currentVersion === 'string') {
            versionId = currentVersion
            console.log('📌 Using versionId from project (string):', versionId)
          } else if (currentVersion && typeof currentVersion === 'object') {
            versionId = currentVersion._id || currentVersion.id
            console.log('📌 Using versionId from project (object):', versionId)
          }
        }

        // Validate versionId
        if (!versionId) {
          console.error('❌ No versionId found after extraction')
          this.toast.error('Cannot find version to approve')
          return
        }

        // Ensure versionId is a string and validate it
        const stringVersionId = String(versionId).trim()

        // Check if it's a valid MongoDB ObjectId format (24 hex characters)
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(stringVersionId)
        if (
          !stringVersionId ||
          stringVersionId === 'null' ||
          stringVersionId === 'undefined' ||
          !isValidObjectId
        ) {
          console.error('❌ Invalid versionId format:', {
            stringVersionId,
            isValidObjectId,
            length: stringVersionId?.length,
          })
          this.toast.error('Invalid version ID format')
          return
        }

        console.log('✅ Final versionId for API:', {
          original: versionId,
          stringVersionId: stringVersionId,
          type: typeof stringVersionId,
          isValidObjectId: isValidObjectId,
        })

        // Use the correct approvePreview API
        const response = await approvePreview(stringVersionId, changeType, comment)

        console.log('🎉 Approval response:', {
          status: response.status,
          data: response.data,
          success: response.data?.success,
          message: response.data?.message,
        })

        // FIX: Correct response handling logic
        if (response.status === 200 || response.status === 201) {
          // Success case - API call was successful
          this.toast.success(`Version ${changeType} released successfully!`)

          // Emit socket event and refresh data
          this.closePreviewModal()
          this.fetchInitialData() // Refresh project list

          // Emit socket event for real-time update
          if (socket) {
            socket.emit('version_approved', {
              projectId: this.selectedProject._id,
              versionId: stringVersionId,
              changeType,
              userId: this.user._id,
            })
          }
        } else {
          // API call succeeded but returned non-success status
          console.warn('⚠️ API returned non-success status:', response.status)
          const errorMessage = response.data?.message || 'Failed to approve changes'
          this.toast.error(errorMessage)
        }
      } catch (error) {
        console.error('❌ Error approving preview:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          url: error.config?.url,
        })

        // FIX: Better error message handling
        let errorMessage = 'Failed to approve changes. Please try again.'

        if (error.response?.data?.message) {
          errorMessage = error.response.data.message
        } else if (error.response?.status === 403) {
          errorMessage = 'Only project owner can approve changes'
        } else if (error.response?.status === 404) {
          errorMessage = 'Preview not found or already processed'
        } else if (error.response?.status === 500) {
          errorMessage = 'Server error occurred while approving changes'
        }

        this.toast.error(errorMessage)
      }
    },

    async openPreviewModal(project) {
      try {
        this.selectedProject = project

        console.log('🔍 Opening preview for project:', {
          projectId: project._id,
          projectName: project.name,
          currentVersion: project.current_version,
          currentVersionType: typeof project.current_version,
        })

        // FIX: Extract versionId correctly for getPreview
        let versionId = null

        if (project.current_version) {
          const currentVersion = project.current_version
          if (typeof currentVersion === 'string') {
            versionId = currentVersion
            console.log('📋 Using string versionId:', versionId)
          } else if (currentVersion && typeof currentVersion === 'object') {
            versionId = currentVersion._id || currentVersion.id
            console.log('📋 Using object versionId:', versionId)
          }
        }

        // Validate versionId
        if (!versionId) {
          console.error('❌ No versionId found for preview')
          this.toast.error('Project has no version to preview')
          return
        }

        const stringVersionId = String(versionId).trim()
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(stringVersionId)

        if (
          !stringVersionId ||
          stringVersionId === 'null' ||
          stringVersionId === 'undefined' ||
          !isValidObjectId
        ) {
          console.error('❌ Invalid versionId for preview:', {
            stringVersionId,
            isValidObjectId,
          })
          this.toast.error('Invalid version ID format')
          return
        }

        console.log('📋 Fetching preview with versionId:', stringVersionId)

        // Fetch preview data using the correct API
        const response = await getPreview(stringVersionId)

        console.log('📊 Preview response:', {
          versionId: stringVersionId,
          responseStatus: response.status,
          responseData: response.data,
        })

        if (response.data && response.data.data) {
          this.previewData = response.data.data
          this.isPreviewModalVisible = true

          console.log('✅ Preview data loaded:', {
            base_version_id: this.previewData.base_version_id,
            base_version_id_type: typeof this.previewData.base_version_id,
            base_version_id_value: this.previewData.base_version_id?._id,
            changesCount: this.previewData.changes?.length,
          })
        } else {
          this.toast.info('No pending changes for this project')
        }
      } catch (error) {
        console.error('Error fetching preview:', {
          error: error.message,
          url: error.config?.url,
          status: error.response?.status,
        })
        this.toast.error('Failed to load preview data')
      }
    },

    // Cập nhật các methods khác tương tự
    async handleRevertChange(changeId) {
      try {
        // FIX: Extract versionId correctly from Proxy object
        let versionId = null

        if (this.previewData?.base_version_id) {
          const baseVersion = this.previewData.base_version_id
          versionId = baseVersion._id || (typeof baseVersion === 'string' ? baseVersion : null)
        } else if (this.selectedProject?.current_version) {
          const currentVersion = this.selectedProject.current_version
          versionId = typeof currentVersion === 'string' ? currentVersion : currentVersion?._id
        }

        if (!versionId) {
          this.toast.error('Cannot find version to revert change')
          return
        }

        const stringVersionId = String(versionId).trim()
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(stringVersionId)

        if (!isValidObjectId) {
          console.error('❌ Invalid versionId for revert:', stringVersionId)
          this.toast.error('Invalid version ID')
          return
        }

        console.log('🔄 Reverting change:', { changeId, versionId: stringVersionId })

        const response = await revertChange(stringVersionId, changeId)

        console.log('✅ Revert successful:', response.data)
        this.toast.success('Change reverted successfully')

        // Refresh preview data
        this.openPreviewModal(this.selectedProject)
      } catch (error) {
        console.error('❌ Error reverting change:', error)
        this.toast.error('Failed to revert change')
      }
    },

    async handleBumpVersion(changeType) {
      try {
        // FIX: Extract versionId correctly from Proxy object
        let versionId = null

        if (this.previewData?.base_version_id) {
          const baseVersion = this.previewData.base_version_id
          versionId = baseVersion._id || (typeof baseVersion === 'string' ? baseVersion : null)
        } else if (this.selectedProject?.current_version) {
          const currentVersion = this.selectedProject.current_version
          versionId = typeof currentVersion === 'string' ? currentVersion : currentVersion?._id
        }

        if (!versionId) {
          this.toast.error('Cannot find version to bump')
          return
        }

        const stringVersionId = String(versionId).trim()
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(stringVersionId)

        if (!isValidObjectId) {
          console.error('❌ Invalid versionId for bump:', stringVersionId)
          this.toast.error('Invalid version ID')
          return
        }

        console.log('🚀 Bumping version:', { changeType, versionId: stringVersionId })

        const response = await bumpVersion(stringVersionId, changeType)

        console.log('✅ Version bump successful:', response.data)
        this.toast.success(`Version bumped to ${changeType} successfully`)

        this.closePreviewModal()
        this.fetchInitialData() // Refresh project list
      } catch (error) {
        console.error('❌ Error bumping version:', error)
        this.toast.error('Failed to bump version')
      }
    },

    // async openPreviewModal(project) {
    //   try {
    //     this.selectedProject = project

    //     console.log('🔍 Opening preview for project:', {
    //       projectId: project._id,
    //       currentVersion: project.current_version,
    //       currentVersionType: typeof project.current_version,
    //       currentVersionId: project.current_version?._id,
    //       currentVersionIdType: typeof project.current_version?._id,
    //     })

    //     // FIX: Extract versionId correctly for getPreview
    //     let versionId = project.current_version?._id || project.current_version

    //     if (versionId && typeof versionId === 'object') {
    //       versionId = versionId._id || versionId.toString()
    //     }

    //     if (!versionId || typeof versionId !== 'string') {
    //       console.error('❌ Invalid versionId for preview:', versionId)
    //       this.toast.error('Invalid version ID')
    //       return
    //     }

    //     // Fetch preview data using the correct API
    //     const response = await getPreview(versionId)

    //     console.log('📊 Preview response:', {
    //       versionId,
    //       responseData: response.data,
    //     })

    //     if (response.data && response.data.data) {
    //       this.previewData = response.data.data
    //       this.isPreviewModalVisible = true

    //       console.log('✅ Preview data loaded:', {
    //         base_version_id: this.previewData.base_version_id,
    //         base_version_id_type: typeof this.previewData.base_version_id,
    //         changesCount: this.previewData.changes?.length,
    //       })
    //     } else {
    //       this.toast.info('No pending changes for this project')
    //     }
    //   } catch (error) {
    //     console.error('Error fetching preview:', error)
    //     this.toast.error('Failed to load preview data')
    //   }
    // },

    // Existing methods remain exactly the same...
    toggleMultiSelectMode() {
      this.isMultiSelectMode = !this.isMultiSelectMode
      if (!this.isMultiSelectMode) {
        this.selectedProjects = []
      }
    },

    handleSelectionToggle(projectId) {
      const index = this.selectedProjects.indexOf(projectId)
      if (index > -1) {
        this.selectedProjects.splice(index, 1)
      } else {
        this.selectedProjects.push(projectId)
      }
    },

    clearSelection() {
      this.selectedProjects = []
      this.isMultiSelectMode = false
    },

    async bulkMoveToTrash() {
      if (this.selectedProjects.length === 0) return

      this.showConfirmation(
        'Confirm Bulk Move to Trash',
        `Are you sure you want to move ${this.selectedProjects.length} project(s) to trash?`,
        async () => {
          try {
            const promises = this.selectedProjects.map((projectId) => deleteProject(projectId))
            await Promise.all(promises)
            this.toast.success(
              `Moved ${this.selectedProjects.length} project(s) to trash successfully!`
            )
            this.clearSelection()
            this.fetchInitialData()
          } catch (err) {
            console.error('Bulk move to trash error', err)
            this.toast.error('Failed to move some projects to trash!')
          }
        }
      )
    },

    async bulkRestore() {
      if (this.selectedProjects.length === 0) return

      this.showConfirmation(
        'Confirm Bulk Restore',
        `Are you sure you want to restore ${this.selectedProjects.length} project(s)?`,
        async () => {
          try {
            const promises = this.selectedProjects.map((projectId) => apiRestoreProject(projectId))
            await Promise.all(promises)
            this.toast.success(`Restored ${this.selectedProjects.length} project(s) successfully!`)
            this.clearSelection()
            this.fetchInitialData()
          } catch (err) {
            console.error('Bulk restore error', err)
            this.toast.error('Failed to restore some projects!')
          }
        }
      )
    },

    async bulkDeletePermanently() {
      if (this.selectedProjects.length === 0) return

      this.showConfirmation(
        'Confirm Bulk Permanent Deletion',
        `This action is irreversible. Are you sure you want to permanently delete ${this.selectedProjects.length} project(s)?`,
        async () => {
          try {
            const promises = this.selectedProjects.map((projectId) => deleteProject(projectId))
            await Promise.all(promises)
            this.toast.success(
              `Permanently deleted ${this.selectedProjects.length} project(s) successfully!`
            )
            this.clearSelection()
            this.fetchInitialData()
          } catch (err) {
            console.error('Bulk permanent delete error', err)
            this.toast.error('Failed to permanently delete some projects!')
          }
        }
      )
    },

    checkMobile() {
      this.isMobile = window.innerWidth <= 768
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

        this.myInvitations = (invRes.data?.data || []).map((inv) => ({
          ...inv,
          id: inv.invite_id || inv._id,
        }))

        console.log(
          '📥 Loaded invitations:',
          this.myInvitations.map((inv) => ({
            id: inv.id,
            project: inv.projectName,
            hasToken: !!inv.invite_token,
          }))
        )

        this.loadSentInvitations()
      } catch (err) {
        console.error('Failed to fetch initial data:', err)
        if (err.response?.status === 401 || err.response?.status === 400) {
          this.logout()
        }
      }
    },
    async handleLeaveProject(projectId) {
      try {
        console.log('Leaving project:', projectId)
        await leaveProject(projectId)
        this.toast.success('You have left the project successfully.')
        this.fetchInitialData()
      } catch (err) {
        console.error('Leave project error:', err)
        if (err.response?.status === 403) {
          this.toast.error('You cannot leave a project you own. Please transfer ownership first.')
        } else if (err.response?.status === 404) {
          this.toast.error('Project not found or you are not a member.')
          this.fetchInitialData()
        } else {
          this.toast.error('Failed to leave project. Please try again.')
        }
      }
    },
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

        if (!inv.project_id || !inv.invitee?._id) {
          console.error('❌ Missing required data for acceptance:', inv)
          this.toast.error('Invalid invitation data - missing project or member ID')
          return
        }

        await acceptInvite(inv.project_id, inv.invitee._id, inv.invite_token)

        this.myInvitations = this.myInvitations.filter((i) => i.id !== inv.id)
        this.toast.success(`You have joined the project: ${inv.projectName}`)

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

        if (!inv.project_id || !inv.invitee?._id) {
          console.error('❌ Missing required data for rejection:', inv)
          this.toast.error('Invalid invitation data - missing project or member ID')
          return
        }

        await rejectInvite(inv.project_id, inv.invitee._id, inv.invite_token)

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
    handleProjectCreated(newProject) {
      if (newProject) {
        this.myProjects.unshift(newProject)
        this.recentProjects.unshift(newProject)
      }
      this.creationSuccess = true
    },
    navigateTo(view) {
      this.currentView = view
      this.clearSelection()
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
    },
    openProject(project) {
      if (this.isMultiSelectMode) return

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
/* Styles remain the same as original */
.homepage {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f9fafb;
  min-height: 100vh;
  overflow: hidden;
}

.app-container {
  display: flex;
  min-height: 100vh;
  overflow: hidden;
}

.main-content {
  flex: 1;
  background-color: #ffffff;
  margin-left: 250px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.main-content::-webkit-scrollbar {
  display: none;
}

.page-header {
  padding: 20px 30px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  min-height: 80px;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a365d;
  margin: 0;
}

/* Bulk Actions */
.bulk-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
}

.selected-count {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
  margin-right: 8px;
}

.btn-bulk {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-bulk-delete {
  background: #fee2e2;
  color: #dc2626;
}

.btn-bulk-delete:hover {
  background: #fecaca;
}

.btn-bulk-restore {
  background: #dcfce7;
  color: #16a34a;
}

.btn-bulk-restore:hover {
  background: #bbf7d0;
}

.btn-bulk-cancel {
  background: #f3f4f6;
  color: #374151;
}

.btn-bulk-cancel:hover {
  background: #e5e7eb;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.notifications-container {
  position: relative;
}

.notifications-btn,
.invitations-btn {
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notifications-btn:hover,
.invitations-btn:hover {
  background-color: #f3f4f6;
}

.notification-badge,
.invitation-badge {
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

.invitation-badge {
  background-color: #3b82f6;
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
  scrollbar-width: thin;
}

.invitations-list::-webkit-scrollbar {
  width: 6px;
}

.invitations-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
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

.content-area {
  padding: 0 30px 30px;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.content-area::-webkit-scrollbar {
  display: none;
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
  max-width: 100%;
  box-sizing: border-box;
}

.filter-controls {
  display: flex;
  gap: 12px;
  align-items: center;
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
  box-sizing: border-box;
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
  box-sizing: border-box;
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
  position: relative;
  top: 100px;
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
  max-width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  max-width: 100%;
  box-sizing: border-box;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  margin-top: 20px;
  max-width: 100%;
  box-sizing: border-box;
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
  margin: 0 auto;
}

.btn-primary:hover {
  background: #2d4a8a;
}

/* ===== RESPONSIVE STYLES ===== */
@media (max-width: 768px) {
  .app-container {
    flex-direction: column;
  }

  .main-content {
    margin-left: 0;
    margin-top: 60px;
  }

  .page-header {
    padding: 16px 20px;
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
    min-height: auto;
  }

  .page-header h1 {
    font-size: 1.25rem;
  }

  .bulk-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 8px;
  }

  .btn-bulk {
    padding: 6px 12px;
    font-size: 0.8rem;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .content-area {
    padding: 0 16px 16px;
  }

  .filter-section {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
    padding: 16px;
  }

  .filter-controls {
    flex-direction: column;
    width: 100%;
    gap: 12px;
  }

  .stat-text {
    position: relative;
    top: 230px;
    font-size: 12px;
    left: 70%;
  }

  .search-input-container {
    width: 100%;
  }

  .search-input {
    width: 100%;
  }

  .filter-select {
    width: 100%;
  }

  .filter-stats {
    justify-content: space-between;
    width: 100%;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .projects-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .section-header {
    margin-bottom: 20px;
  }

  .section-header h2 {
    font-size: 1.25rem;
  }

  .empty-state {
    padding: 40px 16px;
    margin-top: 0;
  }

  .empty-icon {
    width: 60px;
    height: 60px;
  }

  .empty-icon .material-symbols-outlined {
    font-size: 32px;
  }

  .empty-state h3 {
    font-size: 1.1rem;
  }

  .notifications-dropdown {
    width: 300px;
    right: -50px;
  }

  .invitation-item {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .invitation-actions {
    width: 100%;
    justify-content: space-between;
  }

  .btn-sm {
    flex: 1;
    padding: 8px 12px;
  }
}

@media (max-width: 480px) {
  .page-header {
    padding: 12px 16px;
  }

  .content-area {
    padding: 0 12px 12px;
  }

  .filter-section {
    padding: 12px;
  }

  .section-header h2 {
    font-size: 1.1rem;
  }

  .section-header p {
    font-size: 0.8rem;
  }

  .notifications-dropdown {
    width: 280px;
    right: 0px;
  }

  .empty-state {
    padding: 30px 12px;
  }

  .empty-icon {
    width: 50px;
    height: 50px;
  }

  .empty-icon .material-symbols-outlined {
    font-size: 28px;
  }

  .btn-primary {
    width: 100%;
    justify-content: center;
  }

  .invitations-btn,
  .notifications-btn {
    padding: 6px;
  }

  .invitation-badge,
  .notification-badge {
    width: 18px;
    height: 18px;
    font-size: 10px;
  }
}

@media (max-width: 360px) {
  .notifications-dropdown {
    width: 260px;
    right: 0px;
  }
  .stat-text {
    top: 240px;
    left: 70%;
    font-size: 12px;
  }
  .filter-stats {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
}
</style>