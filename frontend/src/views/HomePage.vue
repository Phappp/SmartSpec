<template>
  <div class="homepage">
    <div class="app-container">
      <Sidebar :user="user" @new="openNewProjectModal" @navigate="navigateTo" @logout="logout" />

      <div class="main-content">
        <header class="page-header">
          <h1>HOME PAGE</h1>
        </header>

        <div class="content-area">
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
      @close="closeNewProjectModal"
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
  updateProject, // Thêm import updateProject
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
      isAppModalVisible: false,
      modalContent: {
        title: '',
        message: '',
        isConfirmation: false,
        onConfirm: () => {},
      },
    }
  },
  created() {
    this.fetchInitialData()
  },
  methods: {
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

    // --- Original Methods Modified ---
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
    handleProjectCreated() {
      this.fetchInitialData()
      this.creationSuccess = true
    },
    navigateTo(view) {
      this.currentView = view
    },

    // --- Xử lý Edit Project ---
    async handleEditProject({ projectId, data }) {
      try {
        await updateProject(projectId, data)
        this.showNotification('Success', 'Project updated successfully!')

        // Cập nhật local data mà không cần refetch toàn bộ
        this.updateProjectInLists(projectId, data)
      } catch (err) {
        console.error('Update project error', err)
        this.showNotification('Error', 'Failed to update project!')
      }
    },

    // Cập nhật project trong các danh sách local
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

    async fetchInitialData() {
      try {
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
      } catch (err) {
        console.error('Failed to fetch initial data:', err)
        if (err.response?.status === 401 || err.response?.status === 400) {
          this.logout()
        }
      }
    },
    openProject(project) {
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
</style>