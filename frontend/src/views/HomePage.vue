<template>
  <div class="homepage">
    <div class="app-container">
      <Sidebar
        :user="user"
        @new="navigateTo('new-project')"
        @navigate="navigateTo"
        @logout="logout"
      />

      <div class="main-content">
        <header class="page-header">
          <h1>HOMEPAGE - {{ getPageTitle() }}</h1>
        </header>

        <div class="content-area">
          <div v-if="currentView === 'recent-projects'" class="projects-view">
            <div class="projects-header">
              <h2>Recent Projects</h2>
              <p>{{ recentProjects.length }} projects found</p>
            </div>
            <div v-if="isLoading"><p>Loading...</p></div>
            <div v-else class="projects-grid">
              <ProjectCard
                v-for="p in recentProjects"
                :key="p._id || p.id"
                :project="p"
                @open="openProject"
                :showDelete="false"
              />
            </div>
          </div>

          <div v-if="currentView === 'my-projects'" class="projects-view">
            <div class="projects-header">
              <h2>My Projects</h2>
              <p>{{ myProjects.length }} projects found</p>
            </div>
            <div v-if="isLoading"><p>Loading...</p></div>
            <div v-else class="projects-grid">
              <ProjectCard
                v-for="p in myProjects"
                :key="p._id || p.id"
                :project="p"
                @open="openProject"
                @delete="deleteProject"
              />
            </div>
          </div>

          <div v-if="currentView === 'shared-projects'" class="projects-view">
            <div class="projects-header">
              <h2>Shared Projects</h2>
              <p>{{ sharedProjects.length }} project found</p>
            </div>
            <div v-if="isLoading"><p>Loading...</p></div>
            <div v-else class="projects-grid">
              <ProjectCard
                v-for="p in sharedProjects"
                :key="p._id || p.id"
                :project="p"
                @open="openProject"
                :showDelete="false"
              />
            </div>
          </div>

          <div v-if="currentView === 'new-project'">
            <NewProjectForm @cancel="navigateTo('my-projects')" />
          </div>

          <div v-if="currentView === 'trash'" class="projects-view">
            <div class="projects-header">
              <h2>Trash</h2>
              <p>{{ trashedProjects.length }} projects found</p>
            </div>

            <div v-if="isLoading" class="loading-state">
              <p>Loading trashed projects...</p>
            </div>

            <div v-else-if="trashedProjects.length > 0" class="projects-grid">
              <ProjectCard
                v-for="p in trashedProjects"
                :key="p._id || p.id"
                :project="p"
                :is-trashed="true"
                @restore="restoreProject"
                @delete-permanently="deleteProjectPermanently"
              />
            </div>

            <div v-else class="empty-state">
              <div class="empty-icon">
                <span class="material-symbols-outlined">delete_outline</span>
              </div>
              <p>No projects found in trash</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Sidebar from '@/components/Sidebar.vue'
import NewProjectForm from '@/components/NewProjectForm.vue'
import ProjectCard from '@/components/ProjectCard.vue'
import {
  getMyProjects,
  getSharedProjects,
  getRecentProjects,
  deleteProject,
  restoreProject,
  getTrashedProjects,
} from '@/api/project'

export default {
  name: 'Homepage',
  components: { Sidebar, NewProjectForm, ProjectCard },
  data() {
    return {
      currentView: 'recent-projects',
      user: { name: 'John Doe', email: 'john.doe@example.com' },
      recentProjects: [],
      myProjects: [],
      sharedProjects: [],
      trashedProjects: [],
      isLoading: false,
    }
  },
  created() {
    // Lấy thông tin user và các project ban đầu
    this.fetchInitialData()
  },
  methods: {
    async navigateTo(view) {
      this.currentView = view
      // Tải dữ liệu thùng rác chỉ khi người dùng click vào
      if (view === 'trash') {
        await this.fetchTrashedProjects()
      }
    },
    getPageTitle() {
      const titles = {
        'recent-projects': 'Recent Projects',
        'my-projects': 'My Projects',
        'shared-projects': 'Shared Projects',
        'new-project': 'New Project',
        trash: 'Trash',
      }
      return titles[this.currentView] || 'Dashboard'
    },
    async fetchInitialData() {
      // Cập nhật thông tin user thật
      const userEmail = localStorage.getItem('email')
      if (userEmail) {
        this.user.email = userEmail
        // Bạn có thể gọi API lấy tên đầy đủ của user ở đây nếu cần
      }
      await this.fetchAll()
    },
    async fetchAll() {
      this.isLoading = true
      try {
        // Chạy song song các API để tăng tốc độ tải
        const [myRes, sharedRes, recentRes] = await Promise.all([
          getMyProjects(),
          getSharedProjects(),
          getRecentProjects(),
        ])
        this.myProjects = myRes.data?.data || []
        this.sharedProjects = sharedRes.data?.data || []
        this.recentProjects = recentRes.data?.data || []
      } catch (err) {
        console.error('Fetch projects error', err)
      } finally {
        this.isLoading = false
      }
    },
    async fetchTrashedProjects() {
      this.isLoading = true
      try {
        const response = await getTrashedProjects()
        this.trashedProjects = response.data?.data || []
      } catch (err) {
        console.error('Fetch trashed projects error', err)
        this.trashedProjects = []
      } finally {
        this.isLoading = false
      }
    },
    openProject(project) {
      const id = project._id || project.id
      if (id) this.$router.push({ name: 'Editor', params: { id } })
    },
    async deleteProject(projectId) {
      if (!confirm('Bạn có chắc muốn chuyển dự án này vào thùng rác?')) return
      try {
        await deleteProject(projectId)
        // Cập nhật UI ngay lập tức để người dùng thấy thay đổi
        this.myProjects = this.myProjects.filter((p) => (p._id || p.id) !== projectId)
      } catch (err) {
        console.error('Move to trash error', err)
        alert('Chuyển vào thùng rác thất bại')
      }
    },
    async restoreProject(projectId) {
      try {
        await restoreProject(projectId)
        this.trashedProjects = this.trashedProjects.filter((p) => (p._id || p.id) !== projectId)
        await this.fetchAll() // Tải lại các danh sách chính
        alert('Khôi phục dự án thành công!')
      } catch (err) {
        console.error('Restore error', err)
        alert('Khôi phục thất bại')
      }
    },
    async deleteProjectPermanently(projectId) {
      if (!confirm('HÀNH ĐỘNG NÀY SẼ XÓA VĨNH VIỄN DỰ ÁN VÀ KHÔNG THỂ HOÀN TÁC. Bạn có chắc chắn?'))
        return
      try {
        await deleteProject(projectId)
        this.trashedProjects = this.trashedProjects.filter((p) => (p._id || p.id) !== projectId)
        alert('Đã xóa vĩnh viễn dự án.')
      } catch (err) {
        console.error('Permanent delete error', err)
        alert('Xóa vĩnh viễn thất bại')
      }
    },
    logout() {
      // Dọn dẹp localStorage và chuyển hướng
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
  display: flex;
  height: 100vh;
  background-color: #f8f9fa;
}
.app-container {
  display: flex;
  flex-grow: 1;
}
.main-content {
  flex-grow: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.page-header {
  margin-bottom: 24px;
}
.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #212529;
}
.content-area {
  flex-grow: 1;
}
.projects-view {
  /* Style chung cho các view danh sách project */
}
.projects-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.projects-header h2 {
  font-size: 20px;
  font-weight: 600;
}
.projects-header p {
  color: #6c757d;
}
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 64px;
  color: #6c757d;
  background-color: #fff;
  border-radius: 8px;
  border: 1px dashed #dee2e6;
}
.empty-icon .material-symbols-outlined {
  font-size: 64px;
  color: #adb5bd;
}
.loading-state {
  text-align: center;
  padding: 64px;
  color: #6c757d;
}
</style>