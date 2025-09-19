<template>
  <div class="homepage">
    <div class="app-container">
      <Sidebar :user="user" @new="navigateTo('new-project')" @navigate="navigateTo" @logout="logout" />

      <div class="main-content">
        <header class="page-header">
          <h1>HOMEPAGE - {{ getPageTitle() }}</h1>
        </header>

        <div class="content-area">
          <!-- recent -->
          <div v-if="currentView === 'recent-projects'" class="projects-view">
            <div class="projects-header">
              <h2>Recent Projects</h2>
              <p>{{ recentProjects.length }} projects found</p>
            </div>
            <div class="projects-grid">
              <ProjectCard v-for="p in recentProjects" :key="p.id" :project="p" @open="openProject" :showDelete="false" />
            </div>
          </div>

          <!-- my projects -->
          <div v-if="currentView === 'my-projects'" class="projects-view">
            <div class="projects-header">
              <h2>My Projects</h2>
              <p>{{ myProjects.length }} projects found</p>
            </div>
            <div class="projects-grid">
              <ProjectCard v-for="p in myProjects" :key="p.id" :project="p" @open="openProject" @delete="deleteProject" />
            </div>
          </div>

          <!-- shared projects -->
          <div v-if="currentView === 'shared-projects'" class="projects-view">
            <div class="projects-header">
              <h2>Shared Projects</h2>
              <p>{{ sharedProjects.length }} project found</p>
            </div>
            <div class="projects-grid">
              <ProjectCard v-for="p in sharedProjects" :key="p.id" :project="p" @open="openProject" :showDelete="false" />
            </div>
          </div>

          <!-- new project (component) -->
          <div v-if="currentView === 'new-project'">
            <NewProjectForm @cancel="navigateTo('recent-projects')" />
          </div>

          <!-- trash -->
          <div v-if="currentView === 'trash'" class="trash-view">
            <div class="projects-header">
              <h2>Trash</h2>
              <p>0 projects found</p>
            </div>
            <div class="empty-state">
              <div class="empty-icon"><span class="material-symbols-outlined">delete_outline</span></div>
              <p>No projects found</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Sidebar from '@/components/Sidebar.vue';
import NewProjectForm from '@/components/NewProjectForm.vue';
import ProjectCard from '@/components/ProjectCard.vue';
import { getMyProjects, getSharedProjects, getRecentProjects, deleteProject, restoreProject } from '@/api/project';

export default {
  name: 'Homepage',
  components: { Sidebar, NewProjectForm, ProjectCard },
  data() {
    return {
      currentView: 'recent-projects',
      user: { name: 'John Doe', email: 'john.doe@example.com' },
      recentProjects: [],
      myProjects: [],
      sharedProjects: []
    };
  },
  created() {
    this.fetchAll();
  },
  methods: {
    navigateTo(view) { this.currentView = view; },
    getPageTitle() {
      const titles = {
        'recent-projects': 'Recent Projects',
        'my-projects': 'My Projects',
        'shared-projects': 'Shared Projects',
        'new-project': 'New Project',
        'trash': 'Trash'
      };
      return titles[this.currentView] || 'Dashboard';
    },
    async fetchAll() {
      try {
        const [myRes, sharedRes, recentRes] = await Promise.allSettled([
          getMyProjects(), getSharedProjects(), getRecentProjects()
        ]);
        if (myRes.status === 'fulfilled') this.myProjects = myRes.value.data?.data || [];
        if (sharedRes.status === 'fulfilled') this.sharedProjects = sharedRes.value.data?.data || [];
        if (recentRes.status === 'fulfilled') this.recentProjects = recentRes.value.data?.data || [];
      } catch (err) {
        console.error('Fetch projects error', err);
      }
    },
    openProject(project) {
      const id = project._id || project.id;
      if (id) this.$router.push({ name: 'Editor', params: { id } });
    },
    async deleteProject(projectId) {
      if (!confirm('Bạn có chắc muốn xóa dự án này?')) return;
      try {
        await deleteProject(projectId);
        this.myProjects = this.myProjects.filter(p => p._id !== projectId && p.id !== projectId);
        this.recentProjects = this.recentProjects.filter(p => p._id !== projectId && p.id !== projectId);
        this.sharedProjects = this.sharedProjects.filter(p => p._id !== projectId && p.id !== projectId);
      } catch (err) {
        console.error('delete error', err);
        alert('Xóa thất bại');
      }
    },
    async restoreProject(projectId) {
      try {
        await restoreProject(projectId);
        this.fetchAll();
      } catch (err) {
        console.error('restore error', err);
        alert('Khôi phục thất bại');
      }
    },
    logout() { alert('Logout functionality would be implemented here'); }
  }
};
</script>
<style scoped>
.empty-icon .material-symbols-outlined {
  font-size: 64px; /* Bạn có thể thay đổi giá trị này */
}
</style>
