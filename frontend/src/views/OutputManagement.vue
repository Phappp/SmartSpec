<template>
  <div class="output-management-view">
    <ProjectHeader
      :project="project"
      :versions="versions"
      :selected-version-id="selectedVersionId"
      :is-retrying="isRetrying"
      :processing-progress="processingProgress"
      :current-stage="currentStage"
      :active-users="activeUsers"
      @version-selected="handleVersionSelect"
      @retry-analysis="handleRetry"
      @go-back="goBack"
    />

    <!-- Navigation Tabs -->
    <div class="navigation-tabs">
      <button class="tab-button" @click="navigateToUsecase">
        <span class="material-symbols-outlined">list_alt</span>
        Use Cases Management
      </button>
      <button class="tab-button active" @click="navigateToOutput">
        <span class="material-symbols-outlined">output</span>
        Output Management
      </button>
    </div>

    <!-- Output Management Content -->
    <div class="output-content">
      <div class="output-header">
        <h2>Output Management</h2>
        <p class="subtitle">
          Manage test cases, database schemas, and UML diagrams for your project
        </p>
      </div>

      <!-- Output Cards Grid -->
      <div class="output-cards-grid">
        <!-- Test Case Management Card -->
        <div class="output-card" @click="navigateToTestcase">
          <div class="card-icon testcase">
            <span class="material-symbols-outlined">play_arrow</span>
          </div>
          <div class="card-content">
            <h3>Test Case Management</h3>
            <p>Create, manage and execute test cases for your use cases</p>
            <div class="card-stats">
              <span class="stat">
                <strong>{{ testCaseStats.total }}</strong> Total
              </span>
              <span class="stat">
                <strong>{{ testCaseStats.passed }}</strong> Passed
              </span>
              <span class="stat">
                <strong>{{ testCaseStats.failed }}</strong> Failed
              </span>
            </div>
          </div>
          <div class="card-arrow">
            <span class="material-symbols-outlined">arrow_forward</span>
          </div>
        </div>

        <!-- Database Management Card -->
        <div class="output-card" @click="navigateToDatabase">
          <div class="card-icon database">
            <span class="material-symbols-outlined">storage</span>
          </div>
          <div class="card-content">
            <h3>Database Management</h3>
            <p>Design and manage database schemas and relationships</p>
            <div class="card-stats">
              <span class="stat">
                <strong>{{ databaseStats.tables }}</strong> Tables
              </span>
              <span class="stat">
                <strong>{{ databaseStats.relationships }}</strong> Relationships
              </span>
            </div>
          </div>
          <div class="card-arrow">
            <span class="material-symbols-outlined">arrow_forward</span>
          </div>
        </div>

        <!-- UML Management Card -->
        <div class="output-card" @click="navigateToUml">
          <div class="card-icon uml">
            <span class="material-symbols-outlined">schema</span>
          </div>
          <div class="card-content">
            <h3>UML Diagram Management</h3>
            <p>Create and manage UML diagrams for system design</p>
            <div class="card-stats">
              <span class="stat">
                <strong>{{ umlStats.usecase }}</strong> Use Case
              </span>
              <span class="stat">
                <strong>{{ umlStats.activity }}</strong> Activity
              </span>
              <span class="stat">
                <strong>{{ umlStats.sequence }}</strong> Sequence
              </span>
            </div>
          </div>
          <div class="card-arrow">
            <span class="material-symbols-outlined">arrow_forward</span>
          </div>
        </div>
      </div>

      <!-- Recent Activity Section -->
      <div class="recent-activity">
        <h3>Recent Activity</h3>
        <div class="activity-list">
          <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
            <div class="activity-icon" :class="activity.type">
              <span class="material-symbols-outlined">{{ getActivityIcon(activity.type) }}</span>
            </div>
            <div class="activity-content">
              <p class="activity-text">{{ activity.text }}</p>
              <span class="activity-time">{{ activity.time }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getProjectDetail } from '@/api/project'
import { useToast } from 'vue-toastification'
import ProjectHeader from '@/components/ProjectHeader.vue'
import { useActiveMembers } from '@/utils/useActiveMembers'
export default {
  name: 'OutputManagement',
  components: {
    ProjectHeader,
  },
  setup() {
    const { activeUsers, initSocketConnection, cleanupSocketConnection } = useActiveMembers()
    return {
      activeUsers,
      initSocketConnection,
      cleanupSocketConnection,
    }
  },
  data() {
    return {
      project: {},
      versions: [],
      selectedVersionId: null,

      // Stats data
      testCaseStats: {
        total: 0,
        passed: 0,
        failed: 0,
      },
      databaseStats: {
        tables: 0,
        relationships: 0,
      },
      umlStats: {
        usecase: 0,
        activity: 0,
        sequence: 0,
      },

      // Recent activities
      recentActivities: [
        {
          id: 1,
          type: 'testcase',
          text: 'New test case created for "User Login"',
          time: '2 hours ago',
        },
        {
          id: 2,
          type: 'database',
          text: 'Database schema updated with new tables',
          time: '1 day ago',
        },
        {
          id: 3,
          type: 'uml',
          text: 'Use case diagram generated successfully',
          time: '2 days ago',
        },
      ],

      toast: useToast(),
    }
  },
  async created() {
    const projectId = this.$route.params.id
    if (projectId) {
      await this.fetchProjectData(projectId)
      // ✅ GỌI initSocketConnection với projectId
      this.initSocketConnection(projectId)
    }
  },
  beforeUnmount() {
    // ✅ GỌI cleanupSocketConnection với projectId
    if (this.project._id) {
      this.cleanupSocketConnection(this.project._id)
    }
  },
  methods: {
    // Navigation methods
    navigateToUsecase() {
      this.$router.push({
        name: 'Editor',
        params: { id: this.project._id },
      })
    },

    navigateToOutput() {
      // Already on output management page
    },

    navigateToTestcase() {
      this.$router.push({
        name: 'TestcaseManagement',
        params: { id: this.project._id },
      })
    },

    navigateToDatabase() {
      this.$router.push({
        name: 'DatabaseManagement',
        params: { id: this.project._id },
      })
    },

    navigateToUml() {
      this.$router.push({
        name: 'UmlManagement',
        params: { id: this.project._id },
      })
    },

    // Data fetching
    async fetchProjectData(projectId) {
      try {
        const userId = localStorage.getItem('userId') // ✅ SỬA: dùng real userId
        const { data } = await getProjectDetail(projectId, userId)
        const result = data.data || data
        this.project = result.project
        this.versions = result.versions

        if (this.versions.length > 0) {
          this.selectedVersionId = this.versions[0]._id
        }

        this.loadOutputStats()
      } catch (err) {
        console.error('Error fetching project details:', err)
        this.toast.error('Failed to load project data')
      }
    },

    loadOutputStats() {
      // Mock data - replace with actual API calls
      this.testCaseStats = {
        total: 12,
        passed: 8,
        failed: 4,
      }
      this.databaseStats = {
        tables: 6,
        relationships: 15,
      }
      this.umlStats = {
        usecase: 3,
        activity: 2,
        sequence: 1,
      }
    },

    getActivityIcon(type) {
      const icons = {
        testcase: 'play_arrow',
        database: 'storage',
        uml: 'schema',
      }
      return icons[type] || 'info'
    },

    handleVersionSelect(versionId) {
      this.selectedVersionId = versionId
      this.fetchProjectData(this.project._id)
    },

    goBack() {
      this.$router.push('/dashboard')
    },
  },
}
</script>

<style scoped>
.output-management-view {
  padding: 30px;
  background: #f9fafb;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.output-content {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.output-header {
  text-align: center;
  margin-bottom: 40px;
}

.output-header h2 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1a365d;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 1.1rem;
  color: #6b7280;
}

/* Output Cards Grid */
.output-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
  margin-bottom: 60px;
}

.output-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;
}

.output-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  border-color: #1a365d;
}

.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon.testcase {
  background: linear-gradient(135deg, #10b981, #059669);
}

.card-icon.database {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.card-icon.uml {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}

.card-icon .material-symbols-outlined {
  font-size: 28px;
  color: white;
}

.card-content {
  flex: 1;
}

.card-content h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
}

.card-content p {
  color: #6b7280;
  margin-bottom: 12px;
  line-height: 1.5;
}

.card-stats {
  display: flex;
  gap: 16px;
}

.stat {
  font-size: 0.875rem;
  color: #6b7280;
}

.stat strong {
  color: #1a365d;
  font-weight: 600;
}

.card-arrow .material-symbols-outlined {
  color: #9ca3af;
  font-size: 20px;
  transition: color 0.3s ease;
}

.output-card:hover .card-arrow .material-symbols-outlined {
  color: #1a365d;
}

/* Recent Activity */
.recent-activity {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.recent-activity h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 20px;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  transition: background-color 0.3s ease;
}

.activity-item:hover {
  background: #f9fafb;
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-icon.testcase {
  background: #d1fae5;
}

.activity-icon.database {
  background: #dbeafe;
}

.activity-icon.uml {
  background: #ede9fe;
}

.activity-icon .material-symbols-outlined {
  font-size: 20px;
}

.activity-icon.testcase .material-symbols-outlined {
  color: #059669;
}

.activity-icon.database .material-symbols-outlined {
  color: #1d4ed8;
}

.activity-icon.uml .material-symbols-outlined {
  color: #7c3aed;
}

.activity-content {
  flex: 1;
}

.activity-text {
  color: #374151;
  margin-bottom: 4px;
}

.activity-time {
  font-size: 0.875rem;
  color: #9ca3af;
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
</style>