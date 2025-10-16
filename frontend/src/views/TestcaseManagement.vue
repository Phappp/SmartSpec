<template>
  <div class="testcase-management-view">
    <ProjectHeader
      :project="project"
      :versions="versions"
      :selected-version-id="selectedVersionId"
      @version-selected="handleVersionSelect"
      @go-back="goBack"
    />

    <!-- Navigation Tabs -->
    <div class="navigation-tabs">
      <button class="tab-button" @click="navigateToUsecase">
        <span class="material-symbols-outlined">list_alt</span>
        Use Cases
      </button>
      <button class="tab-button" @click="navigateToOutput">
        <span class="material-symbols-outlined">output</span>
        Output
      </button>
      <button class="tab-button active">
        <span class="material-symbols-outlined">play_arrow</span>
        Test Cases
      </button>
    </div>

    <div class="testcase-content">
      <div class="content-header">
        <h2>Test Case Management</h2>
        <button class="btn-primary" @click="showCreateModal = true">
          <span class="material-symbols-outlined">add</span>
          Create Test Case
        </button>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card total">
          <div class="stat-icon">
            <span class="material-symbols-outlined">format_list_numbered</span>
          </div>
          <div class="stat-info">
            <h3>{{ testCaseStats.total }}</h3>
            <p>Total Test Cases</p>
          </div>
        </div>
        <div class="stat-card passed">
          <div class="stat-icon">
            <span class="material-symbols-outlined">check_circle</span>
          </div>
          <div class="stat-info">
            <h3>{{ testCaseStats.passed }}</h3>
            <p>Passed</p>
          </div>
        </div>
        <div class="stat-card failed">
          <div class="stat-icon">
            <span class="material-symbols-outlined">cancel</span>
          </div>
          <div class="stat-info">
            <h3>{{ testCaseStats.failed }}</h3>
            <p>Failed</p>
          </div>
        </div>
        <div class="stat-card pending">
          <div class="stat-icon">
            <span class="material-symbols-outlined">schedule</span>
          </div>
          <div class="stat-info">
            <h3>{{ testCaseStats.pending }}</h3>
            <p>Pending</p>
          </div>
        </div>
      </div>

      <!-- Test Cases Table -->
      <div class="testcases-table">
        <div class="table-header">
          <h3>Test Cases</h3>
          <div class="table-actions">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search test cases..."
              class="search-input"
            />
            <select v-model="statusFilter" class="filter-select">
              <option value="">All Status</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Use Case</th>
                <th>Status</th>
                <th>Last Run</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="testcase in filteredTestCases" :key="testcase.id">
                <td class="testcase-id">#{{ testcase.id }}</td>
                <td class="testcase-name">{{ testcase.name }}</td>
                <td class="usecase-name">{{ testcase.usecase }}</td>
                <td>
                  <span class="status-badge" :class="testcase.status">
                    {{ testcase.status }}
                  </span>
                </td>
                <td class="last-run">{{ testcase.lastRun }}</td>
                <td class="actions">
                  <button class="btn-icon" @click="runTest(testcase.id)" title="Run Test">
                    <span class="material-symbols-outlined">play_arrow</span>
                  </button>
                  <button class="btn-icon" @click="editTestcase(testcase)" title="Edit">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button
                    class="btn-icon danger"
                    @click="deleteTestcase(testcase.id)"
                    title="Delete"
                  >
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Create/Edit Test Case Modal -->
    <div v-if="showCreateModal || editingTestcase" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingTestcase ? 'Edit Test Case' : 'Create New Test Case' }}</h3>
          <button class="btn-close" @click="closeModal">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="modal-body">
          <form @submit.prevent="saveTestcase">
            <div class="form-group">
              <label>Test Case Name</label>
              <input
                v-model="testcaseForm.name"
                type="text"
                required
                placeholder="Enter test case name"
              />
            </div>

            <div class="form-group">
              <label>Related Use Case</label>
              <select v-model="testcaseForm.usecaseId" required>
                <option value="">Select use case</option>
                <option v-for="usecase in availableUseCases" :key="usecase.id" :value="usecase.id">
                  {{ usecase.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>Description</label>
              <textarea
                v-model="testcaseForm.description"
                rows="3"
                placeholder="Enter test case description"
              ></textarea>
            </div>

            <div class="form-group">
              <label>Test Steps</label>
              <div class="test-steps">
                <div v-for="(step, index) in testcaseForm.steps" :key="index" class="test-step">
                  <input
                    v-model="step.description"
                    type="text"
                    :placeholder="`Step ${index + 1}`"
                  />
                  <input v-model="step.expected" type="text" placeholder="Expected result" />
                  <button type="button" class="btn-icon danger" @click="removeStep(index)">
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button type="button" class="btn-secondary" @click="addStep">
                  <span class="material-symbols-outlined">add</span>
                  Add Step
                </button>
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-secondary" @click="closeModal">Cancel</button>
              <button type="submit" class="btn-primary">
                {{ editingTestcase ? 'Update' : 'Create' }} Test Case
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getProjectDetail } from '@/api/project'
import { useToast } from 'vue-toastification'
import ProjectHeader from '@/components/ProjectHeader.vue'

export default {
  name: 'TestcaseManagement',
  components: {
    ProjectHeader,
  },
  data() {
    return {
      project: {},
      versions: [],
      selectedVersionId: null,

      testCaseStats: {
        total: 0,
        passed: 0,
        failed: 0,
        pending: 0,
      },

      testCases: [],
      searchQuery: '',
      statusFilter: '',

      showCreateModal: false,
      editingTestcase: null,

      testcaseForm: {
        name: '',
        usecaseId: '',
        description: '',
        steps: [{ description: '', expected: '' }],
      },

      availableUseCases: [],

      toast: useToast(),
    }
  },
  computed: {
    filteredTestCases() {
      let filtered = this.testCases

      if (this.searchQuery) {
        filtered = filtered.filter(
          (tc) =>
            tc.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
            tc.usecase.toLowerCase().includes(this.searchQuery.toLowerCase())
        )
      }

      if (this.statusFilter) {
        filtered = filtered.filter((tc) => tc.status === this.statusFilter)
      }

      return filtered
    },
  },
  async created() {
    const projectId = this.$route.params.id
    if (projectId) {
      await this.fetchProjectData(projectId)
      this.loadTestCases()
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
      this.$router.push({
        name: 'OutputManagement',
        params: { id: this.project._id },
      })
    },

    // Data methods
    async fetchProjectData(projectId) {
      try {
        const userId = 'CURRENT_LOGGED_IN_USER_ID'
        const { data } = await getProjectDetail(projectId, userId)
        const result = data.data || data
        this.project = result.project
        this.versions = result.versions

        if (this.versions.length > 0) {
          this.selectedVersionId = this.versions[0]._id
        }

        // Load available use cases for dropdown
        this.loadAvailableUseCases()
      } catch (err) {
        console.error('Error fetching project details:', err)
        this.toast.error('Failed to load project data')
      }
    },

    loadAvailableUseCases() {
      // Mock data - replace with actual API call
      this.availableUseCases = [
        { id: 1, name: 'User Login' },
        { id: 2, name: 'Create Account' },
        { id: 3, name: 'Reset Password' },
        { id: 4, name: 'View Profile' },
      ]
    },

    loadTestCases() {
      // Mock data - replace with actual API call
      this.testCases = [
        {
          id: 1,
          name: 'TC001 - Successful Login',
          usecase: 'User Login',
          status: 'passed',
          lastRun: '2024-01-15 10:30',
        },
        {
          id: 2,
          name: 'TC002 - Invalid Credentials',
          usecase: 'User Login',
          status: 'passed',
          lastRun: '2024-01-15 10:32',
        },
        {
          id: 3,
          name: 'TC003 - Create New Account',
          usecase: 'Create Account',
          status: 'failed',
          lastRun: '2024-01-14 14:20',
        },
        {
          id: 4,
          name: 'TC004 - Password Reset',
          usecase: 'Reset Password',
          status: 'pending',
          lastRun: 'Not run yet',
        },
      ]

      this.updateStats()
    },

    updateStats() {
      this.testCaseStats.total = this.testCases.length
      this.testCaseStats.passed = this.testCases.filter((tc) => tc.status === 'passed').length
      this.testCaseStats.failed = this.testCases.filter((tc) => tc.status === 'failed').length
      this.testCaseStats.pending = this.testCases.filter((tc) => tc.status === 'pending').length
    },

    // Test case actions
    runTest(testcaseId) {
      this.toast.info(`Running test case #${testcaseId}`)
      // Implement test execution logic
    },

    editTestcase(testcase) {
      this.editingTestcase = testcase
      this.testcaseForm = {
        name: testcase.name,
        usecaseId: this.availableUseCases.find((uc) => uc.name === testcase.usecase)?.id || '',
        description: 'Mock description', // In real app, get from API
        steps: [{ description: 'Step 1', expected: 'Expected result 1' }],
      }
    },

    deleteTestcase(testcaseId) {
      if (confirm('Are you sure you want to delete this test case?')) {
        this.testCases = this.testCases.filter((tc) => tc.id !== testcaseId)
        this.updateStats()
        this.toast.success('Test case deleted successfully')
      }
    },

    // Form methods
    addStep() {
      this.testcaseForm.steps.push({ description: '', expected: '' })
    },

    removeStep(index) {
      if (this.testcaseForm.steps.length > 1) {
        this.testcaseForm.steps.splice(index, 1)
      }
    },

    saveTestcase() {
      // Implement save logic
      this.toast.success(this.editingTestcase ? 'Test case updated!' : 'Test case created!')
      this.closeModal()
    },

    closeModal() {
      this.showCreateModal = false
      this.editingTestcase = null
      this.testcaseForm = {
        name: '',
        usecaseId: '',
        description: '',
        steps: [{ description: '', expected: '' }],
      }
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
.testcase-management-view {
  padding: 30px;
  background: #f9fafb;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.testcase-content {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.content-header h2 {
  font-size: 2rem;
  font-weight: 700;
  color: #1a365d;
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

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-card.total {
  border-left: 4px solid #3b82f6;
}

.stat-card.passed {
  border-left: 4px solid #10b981;
}

.stat-card.failed {
  border-left: 4px solid #ef4444;
}

.stat-card.pending {
  border-left: 4px solid #f59e0b;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
}

.stat-card.total .stat-icon {
  background: #dbeafe;
  color: #3b82f6;
}

.stat-card.passed .stat-icon {
  background: #d1fae5;
  color: #10b981;
}

.stat-card.failed .stat-icon {
  background: #fee2e2;
  color: #ef4444;
}

.stat-card.pending .stat-icon {
  background: #fef3c7;
  color: #f59e0b;
}

.stat-info h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-info p {
  color: #6b7280;
  font-size: 0.875rem;
}

/* Test Cases Table */
.testcases-table {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
}

.table-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.table-actions {
  display: flex;
  gap: 12px;
}

.search-input,
.filter-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.search-input {
  width: 250px;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #f9fafb;
}

th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
  border-bottom: 1px solid #e5e7eb;
}

td {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.testcase-id {
  font-family: 'Courier New', monospace;
  color: #6b7280;
  font-weight: 600;
}

.testcase-name {
  font-weight: 500;
  color: #1f2937;
}

.usecase-name {
  color: #6b7280;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.status-badge.passed {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.failed {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.last-run {
  color: #6b7280;
  font-size: 0.875rem;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  padding: 6px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.3s ease;
}

.btn-icon:hover {
  background: #f3f4f6;
  color: #374151;
}

.btn-icon.danger:hover {
  background: #fee2e2;
  color: #dc2626;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.btn-close {
  padding: 4px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #6b7280;
}

.btn-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.test-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.test-step {
  display: flex;
  gap: 12px;
  align-items: center;
}

.test-step input {
  flex: 1;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

/* Navigation Tabs */
.navigation-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  padding: 0 8px;
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
</style>