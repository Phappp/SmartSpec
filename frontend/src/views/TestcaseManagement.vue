<template>
  <div class="testcase-management-view">
    <ProjectHeader
      :project="project"
      :versions="versions"
      :selected-version-id="selectedVersionId"
      :active-users="activeUsers"
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
      <!-- Action Header -->
      <div class="action-header">
        <div class="header-left">
          <h2>Test Case Management</h2>
          <p class="subtitle">Manage and execute test cases for your requirements</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" @click="showGenerateModal = true">
            <span class="material-symbols-outlined">auto_awesome</span>
            Generate Test Cases
          </button>
          <button class="btn-primary" @click="showCreateModal = true">
            <span class="material-symbols-outlined">add</span>
            Create Manual
          </button>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card total">
          <div class="stat-icon">
            <span class="material-symbols-outlined">format_list_numbered</span>
          </div>
          <div class="stat-info">
            <h3>{{ statistics.total }}</h3>
            <p>Total Test Cases</p>
          </div>
        </div>
        <div class="stat-card passed">
          <div class="stat-icon">
            <span class="material-symbols-outlined">check_circle</span>
          </div>
          <div class="stat-info">
            <h3>{{ statistics.passed }}</h3>
            <p>Passed</p>
          </div>
        </div>
        <div class="stat-card failed">
          <div class="stat-icon">
            <span class="material-symbols-outlined">cancel</span>
          </div>
          <div class="stat-info">
            <h3>{{ statistics.failed }}</h3>
            <p>Failed</p>
          </div>
        </div>
        <div class="stat-card pending">
          <div class="stat-icon">
            <span class="material-symbols-outlined">schedule</span>
          </div>
          <div class="stat-info">
            <h3>{{ statistics.not_executed }}</h3>
            <p>Not Executed</p>
          </div>
        </div>
        <div class="stat-card coverage">
          <div class="stat-icon">
            <span class="material-symbols-outlined">database</span>
          </div>
          <div class="stat-info">
            <h3>{{ statistics.coverage }}%</h3>
            <p>Database Coverage</p>
          </div>
        </div>
      </div>

      <!-- Filters and Search -->
      <div class="filters-section">
        <div class="filter-group">
          <div class="search-input-wrapper">
            <span class="material-symbols-outlined search-icon">search</span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search test cases..."
              class="search-input"
            />
          </div>
          <select v-model="statusFilter" class="filter-select">
            <option value="">All Status</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="blocked">Blocked</option>
            <option value="not_executed">Not Executed</option>
            <option value="in_progress">In Progress</option>
          </select>
          <select v-model="testTypeFilter" class="filter-select">
            <option value="">All Types</option>
            <option value="unit">Unit</option>
            <option value="integration">Integration</option>
            <option value="api">API</option>
            <option value="ui">UI</option>
            <option value="performance">Performance</option>
            <option value="security">Security</option>
          </select>
          <select v-model="priorityFilter" class="filter-select">
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button class="btn-secondary clear-filters" @click="clearFilters">
            <span class="material-symbols-outlined">clear_all</span>
            Clear
          </button>
        </div>
        <div class="view-actions">
          <button class="btn-icon" @click="refreshData" title="Refresh" :disabled="loading">
            <span class="material-symbols-outlined" :class="{ spinning: loading }">refresh</span>
          </button>
          <button class="btn-icon" @click="exportTestCases" title="Export">
            <span class="material-symbols-outlined">download</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading test cases...</p>
      </div>

      <!-- Test Cases Table -->
      <div v-else class="testcases-table">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th class="checkbox-column">
                  <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
                </th>
                <th class="title-column">Title</th>
                <th class="type-column">Type</th>
                <th class="priority-column">Priority</th>
                <th class="status-column">Status</th>
                <th class="tables-column">Database Tables</th>
                <th class="date-column">Last Executed</th>
                <th class="actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="testcase in filteredTestCases"
                :key="testcase._id"
                :class="{ selected: selectedTestCases.includes(testcase._id) }"
                class="testcase-row"
              >
                <td class="checkbox-column">
                  <input type="checkbox" :value="testcase._id" v-model="selectedTestCases" />
                </td>
                <td class="title-column">
                  <div class="testcase-title">
                    <div class="title-main">{{ testcase.title || 'Untitled Test Case' }}</div>
                    <div class="title-desc" v-if="testcase.description">
                      {{ testcase.description }}
                    </div>
                  </div>
                </td>
                <td class="type-column">
                  <span class="type-badge" :class="testcase.test_type || 'integration'">
                    {{ testcase.test_type || 'integration' }}
                  </span>
                </td>
                <td class="priority-column">
                  <span class="priority-badge" :class="testcase.priority || 'medium'">
                    {{ testcase.priority || 'medium' }}
                  </span>
                </td>
                <td class="status-column">
                  <span class="status-badge" :class="testcase.status || 'not_executed'">
                    {{ testcase.status || 'not_executed' }}
                  </span>
                </td>
                <td class="tables-column">
                  <div class="database-tags">
                    <span
                      v-for="table in testcase.database_tables || []"
                      :key="table"
                      class="table-tag"
                    >
                      {{ table }}
                    </span>
                    <span
                      v-if="!testcase.database_tables || testcase.database_tables.length === 0"
                      class="no-tables"
                    >
                      -
                    </span>
                  </div>
                </td>
                <td class="date-column">
                  <span class="last-executed">
                    {{ formatDate(testcase.executed_at) || 'Never' }}
                  </span>
                </td>
                <td class="actions-column">
                  <div class="action-buttons">
                    <button
                      class="btn-icon success"
                      @click="executeTestcase(testcase._id)"
                      :title="testcase.status === 'in_progress' ? 'In Progress' : 'Execute'"
                      :disabled="testcase.status === 'in_progress'"
                    >
                      <span class="material-symbols-outlined">
                        {{ testcase.status === 'in_progress' ? 'hourglass_empty' : 'play_arrow' }}
                      </span>
                    </button>
                    <button class="btn-icon" @click="viewTestcase(testcase)" title="View Details">
                      <span class="material-symbols-outlined">visibility</span>
                    </button>
                    <button class="btn-icon" @click="editTestcase(testcase)" title="Edit">
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      class="btn-icon danger"
                      @click="deleteTestcase(testcase._id)"
                      title="Delete"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div v-if="filteredTestCases.length === 0" class="empty-state">
            <span class="material-symbols-outlined">playlist_remove</span>
            <h3>No test cases found</h3>
            <p v-if="searchQuery || statusFilter || testTypeFilter || priorityFilter">
              Try adjusting your filters or search terms.
            </p>
            <p v-else>
              Create your first test case or generate them automatically from requirements.
            </p>
            <div class="empty-state-actions">
              <button class="btn-primary" @click="showGenerateModal = true">
                Generate Test Cases
              </button>
              <button class="btn-secondary" @click="showCreateModal = true">Create Manual</button>
            </div>
          </div>
        </div>

        <!-- Bulk Actions -->
        <div v-if="selectedTestCases.length > 0" class="bulk-actions">
          <div class="bulk-info">
            <span class="material-symbols-outlined">check_circle</span>
            {{ selectedTestCases.length }} test cases selected
          </div>
          <div class="bulk-buttons">
            <button class="btn-secondary success" @click="bulkExecute('passed')">
              <span class="material-symbols-outlined">check_circle</span>
              Mark as Passed
            </button>
            <button class="btn-secondary warning" @click="bulkExecute('failed')">
              <span class="material-symbols-outlined">cancel</span>
              Mark as Failed
            </button>
            <button class="btn-secondary danger" @click="bulkDelete">
              <span class="material-symbols-outlined">delete</span>
              Delete Selected
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Generate Test Cases Modal -->
    <GenerateTestcaseModal
      v-if="showGenerateModal"
      :project-id="project._id"
      :version-id="selectedVersionId"
      :requirements="requirements"
      :database-schema="databaseSchema"
      @close="showGenerateModal = false"
      @generate="handleGenerateTestCases"
    />

    <!-- Create/Edit Test Case Modal -->
    <TestcaseFormModal
      v-if="showCreateModal || editingTestcase"
      :testcase="editingTestcase"
      :project-id="project._id"
      :version-id="selectedVersionId"
      :requirements="requirements"
      @close="closeModal"
      @save="handleSaveTestcase"
    />

    <!-- Test Case Details Modal -->
    <TestcaseDetailModal
      v-if="viewingTestcase"
      :testcase="viewingTestcase"
      @close="viewingTestcase = null"
      @execute="executeTestcase(viewingTestcase._id)"
      @edit="editTestcase(viewingTestcase)"
    />

    <!-- Execution Modal -->
    <TestcaseExecutionModal
      v-if="executingTestcase"
      :testcase="executingTestcase"
      @close="executingTestcase = null"
      @execute="handleExecuteTestcase"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import ProjectHeader from '@/components/ProjectHeader.vue'
import GenerateTestcaseModal from '@/components/testcase/GenerateTestcaseModal.vue'
import TestcaseFormModal from '@/components/testcase/TestcaseFormModal.vue'
import TestcaseDetailModal from '@/components/testcase/TestcaseDetailModal.vue'
import TestcaseExecutionModal from '@/components/testcase/TestcaseExecutionModal.vue'
import { useActiveMembers } from '@/utils/useActiveMembers'
import { getProjectDetail, usecaseApi, getDatabasesByVersion } from '@/api/project'
import { testcaseApi } from '@/api/testcase'

export default {
  name: 'TestcaseManagement',
  components: {
    ProjectHeader,
    GenerateTestcaseModal,
    TestcaseFormModal,
    TestcaseDetailModal,
    TestcaseExecutionModal,
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const toast = useToast()
    const { activeUsers, initSocketConnection, cleanupSocketConnection } = useActiveMembers()

    // Reactive data
    const project = ref({})
    const versions = ref([])
    const selectedVersionId = ref(null)
    const requirements = ref([])
    const databaseSchema = ref(null)
    const testCases = ref([])
    const loading = ref(false)

    // UI states
    const showGenerateModal = ref(false)
    const showCreateModal = ref(false)
    const editingTestcase = ref(null)
    const viewingTestcase = ref(null)
    const executingTestcase = ref(null)

    // Filters
    const searchQuery = ref('')
    const statusFilter = ref('')
    const testTypeFilter = ref('')
    const priorityFilter = ref('')
    const selectedTestCases = ref([])
    const selectAll = ref(false)

    // Computed statistics với fallback data
    const statistics = computed(() => {
      if (testCases.value.length > 0) {
        const total = testCases.value.length
        const passed = testCases.value.filter((tc) => tc.status === 'passed').length
        const failed = testCases.value.filter((tc) => tc.status === 'failed').length
        const not_executed = testCases.value.filter((tc) => tc.status === 'not_executed').length
        const in_progress = testCases.value.filter((tc) => tc.status === 'in_progress').length
        const blocked = testCases.value.filter((tc) => tc.status === 'blocked').length

        // Tính database coverage từ database schema thực tế
        const tablesCovered = new Set()
        testCases.value.forEach((tc) => {
          if (tc.database_tables && Array.isArray(tc.database_tables)) {
            tc.database_tables.forEach((table) => tablesCovered.add(table))
          }
        })

        const totalTables = databaseSchema.value?.tables?.length || 0
        const coverage = totalTables > 0 ? Math.round((tablesCovered.size / totalTables) * 100) : 0

        return {
          total,
          passed,
          failed,
          not_executed,
          in_progress,
          blocked,
          coverage,
        }
      }

      // Fallback data khi không có test cases
      return {
        total: 0,
        passed: 0,
        failed: 0,
        not_executed: 0,
        in_progress: 0,
        blocked: 0,
        coverage: 0,
      }
    })

    // Computed filtered test cases
    const filteredTestCases = computed(() => {
      let filtered = testCases.value

      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(
          (tc) =>
            tc.title?.toLowerCase().includes(query) ||
            tc.description?.toLowerCase().includes(query) ||
            (tc.source_requirement_ids &&
              Array.isArray(tc.source_requirement_ids) &&
              tc.source_requirement_ids.some((id) =>
                requirements.value
                  .find((r) => r.id === id)
                  ?.name?.toLowerCase()
                  .includes(query)
              ))
        )
      }

      if (statusFilter.value) {
        filtered = filtered.filter((tc) => tc.status === statusFilter.value)
      }

      if (testTypeFilter.value) {
        filtered = filtered.filter((tc) => tc.test_type === testTypeFilter.value)
      }

      if (priorityFilter.value) {
        filtered = filtered.filter((tc) => tc.priority === priorityFilter.value)
      }

      return filtered
    })

    // Methods
    const fetchProjectData = async () => {
      try {
        const projectId = route.params.id
        if (!projectId) {
          toast.error('Project ID is required')
          return
        }

        console.log('🔄 Fetching project data for:', projectId)
        const { data } = await getProjectDetail(projectId)
        const result = data.data || data
        project.value = result.project || {}
        versions.value = result.versions || []

        if (versions.value.length > 0 && !selectedVersionId.value) {
          selectedVersionId.value = versions.value[0]._id
          console.log('✅ Auto-selected version:', selectedVersionId.value)
        }

        // Initialize socket connection
        if (project.value._id) {
          initSocketConnection(project.value._id)
        }
      } catch (error) {
        console.error('❌ Error fetching project:', error)
        toast.error('Failed to load project data')
      }
    }

    const fetchRequirements = async () => {
      if (!selectedVersionId.value) {
        console.log('❌ No version selected for requirements')
        return
      }

      try {
        console.log('🔄 Fetching requirements for version:', selectedVersionId.value)
        const { data } = await usecaseApi.getUsecases(selectedVersionId.value)
        requirements.value = data.data || data || []
        console.log(`✅ Loaded ${requirements.value.length} requirements`)
      } catch (error) {
        console.error('❌ Error fetching requirements:', error)
        requirements.value = []
      }
    }

    const fetchDatabaseSchema = async () => {
      if (!selectedVersionId.value) {
        console.log('❌ No version selected for database schema')
        return
      }

      try {
        console.log(`🗄️ Fetching database schema for version ${selectedVersionId.value}`)
        const { data } = await getDatabasesByVersion(selectedVersionId.value)

        if (data && data.data && data.data.length > 0) {
          databaseSchema.value = data.data[0]
          console.log('✅ Database schema loaded:', databaseSchema.value)
        } else if (data && data.length > 0) {
          databaseSchema.value = data[0]
          console.log('✅ Database schema loaded (fallback):', databaseSchema.value)
        } else {
          console.warn('⚠️ No database found for this version')
          databaseSchema.value = null
        }
      } catch (error) {
        console.error('❌ Error fetching database schema:', error)
        databaseSchema.value = null
      }
    }

    const loadTestCases = async () => {
      if (!project.value._id) {
        console.log('❌ No project ID available for loading test cases')
        return
      }

      loading.value = true
      try {
        const params = {
          versionId: selectedVersionId.value,
          status: statusFilter.value || undefined,
          test_type: testTypeFilter.value || undefined,
          priority: priorityFilter.value || undefined,
        }

        console.log('🔄 Loading test cases for project:', project.value._id)
        const { data } = await testcaseApi.getTestCasesByProject(project.value._id, params)
        testCases.value = data.data || data || []
        console.log(`✅ Loaded ${testCases.value.length} test cases`)

        // Reset selection khi data thay đổi
        selectedTestCases.value = []
        selectAll.value = false
      } catch (error) {
        console.error('❌ Error loading test cases:', error)
        toast.error('Failed to load test cases')
        testCases.value = []
      } finally {
        loading.value = false
      }
    }

    const handleGenerateTestCases = async (generatedTestCases) => {
      if (!project.value._id || !selectedVersionId.value) {
        toast.error('Project and version must be selected')
        return
      }

      try {
        console.log('💾 Saving generated test cases:', generatedTestCases.length)
        await testcaseApi.saveTestCases(project.value._id, selectedVersionId.value, {
          testCases: generatedTestCases,
        })
        toast.success(`Successfully generated ${generatedTestCases.length} test cases`)
        await loadTestCases() // Reload để cập nhật statistics
      } catch (error) {
        console.error('❌ Error saving generated test cases:', error)
        const errorMessage = error.response?.data?.message || error.message
        toast.error(`Failed to save test cases: ${errorMessage}`)
      }
    }

    const handleSaveTestcase = async (testcaseData) => {
      try {
        if (editingTestcase.value) {
          console.log('✏️ Updating test case:', editingTestcase.value._id)
          await testcaseApi.updateTestCase(editingTestcase.value._id, testcaseData)
          toast.success('Test case updated successfully')
        } else {
          console.log('🆕 Creating new test case')
          await testcaseApi.saveTestCases(project.value._id, selectedVersionId.value, {
            testCases: [testcaseData],
          })
          toast.success('Test case created successfully')
        }
        await loadTestCases() // Reload để cập nhật statistics
        closeModal()
      } catch (error) {
        console.error('❌ Error saving test case:', error)
        const errorMessage = error.response?.data?.message || error.message
        toast.error(`Failed to save test case: ${errorMessage}`)
      }
    }

    const executeTestcase = (testcaseId) => {
      const testcase = testCases.value.find((tc) => tc._id === testcaseId)
      if (testcase) {
        executingTestcase.value = testcase
      } else {
        toast.error('Test case not found')
      }
    }

    const handleExecuteTestcase = async (executionData) => {
      if (!executingTestcase.value) {
        toast.error('No test case selected for execution')
        return
      }

      try {
        console.log('🎯 Executing test case:', executingTestcase.value._id)
        await testcaseApi.executeTestCase(executingTestcase.value._id, executionData)
        toast.success('Test case executed successfully')
        await loadTestCases() // Reload để cập nhật data
        executingTestcase.value = null
      } catch (error) {
        console.error('❌ Error executing test case:', error)
        const errorMessage = error.response?.data?.message || error.message
        toast.error(`Failed to execute test case: ${errorMessage}`)
      }
    }

    const bulkExecute = async (status) => {
      if (selectedTestCases.value.length === 0) {
        toast.warning('No test cases selected')
        return
      }

      try {
        console.log(`⚡ Bulk executing ${selectedTestCases.value.length} test cases as ${status}`)
        await testcaseApi.bulkExecuteTestCases(project.value._id, {
          testCaseIds: selectedTestCases.value,
          executionData: { status },
        })
        toast.success(`Marked ${selectedTestCases.value.length} test cases as ${status}`)
        selectedTestCases.value = []
        selectAll.value = false
        await loadTestCases()
      } catch (error) {
        console.error('❌ Error bulk executing:', error)
        const errorMessage = error.response?.data?.message || error.message
        toast.error(`Failed to update test cases: ${errorMessage}`)
      }
    }

    const bulkDelete = async () => {
      if (selectedTestCases.value.length === 0) {
        toast.warning('No test cases selected')
        return
      }

      if (
        !confirm(
          `Are you sure you want to delete ${selectedTestCases.value.length} test cases? This action cannot be undone.`
        )
      ) {
        return
      }

      try {
        console.log(`🗑️ Bulk deleting ${selectedTestCases.value.length} test cases`)
        // Sử dụng bulk delete nếu có, hoặc delete từng cái
        await Promise.all(selectedTestCases.value.map((id) => testcaseApi.deleteTestCase(id)))
        toast.success(`Deleted ${selectedTestCases.value.length} test cases`)
        selectedTestCases.value = []
        selectAll.value = false
        await loadTestCases()
      } catch (error) {
        console.error('❌ Error bulk deleting:', error)
        const errorMessage = error.response?.data?.message || error.message
        toast.error(`Failed to delete test cases: ${errorMessage}`)
      }
    }

    const deleteTestcase = async (testcaseId) => {
      if (
        !confirm('Are you sure you want to delete this test case? This action cannot be undone.')
      ) {
        return
      }

      try {
        console.log('🗑️ Deleting test case:', testcaseId)
        await testcaseApi.deleteTestCase(testcaseId)
        toast.success('Test case deleted successfully')
        await loadTestCases()
      } catch (error) {
        console.error('❌ Error deleting test case:', error)
        const errorMessage = error.response?.data?.message || error.message
        toast.error(`Failed to delete test case: ${errorMessage}`)
      }
    }

    const viewTestcase = (testcase) => {
      viewingTestcase.value = testcase
    }

    const editTestcase = (testcase) => {
      editingTestcase.value = testcase
    }

    const closeModal = () => {
      showCreateModal.value = false
      editingTestcase.value = null
    }

    const refreshData = () => {
      console.log('🔄 Refreshing data...')
      loadTestCases()
      fetchRequirements()
      fetchDatabaseSchema()
    }

    const clearFilters = () => {
      searchQuery.value = ''
      statusFilter.value = ''
      testTypeFilter.value = ''
      priorityFilter.value = ''
      selectedTestCases.value = []
      selectAll.value = false
    }

    const toggleSelectAll = () => {
      if (selectAll.value) {
        selectedTestCases.value = filteredTestCases.value.map((tc) => tc._id)
      } else {
        selectedTestCases.value = []
      }
    }

    const exportTestCases = () => {
      toast.info('Export feature will be available soon')
    }

    const formatDate = (dateString) => {
      if (!dateString) return null
      try {
        return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      } catch (error) {
        return 'Invalid Date'
      }
    }

    const handleVersionSelect = (versionId) => {
      console.log('🎯 Version selected:', versionId)
      selectedVersionId.value = versionId
      refreshData()
    }

    const navigateToUsecase = () => {
      if (project.value._id) {
        router.push({ name: 'Editor', params: { id: project.value._id } })
      } else {
        toast.error('Project not loaded')
      }
    }

    const navigateToOutput = () => {
      if (project.value._id) {
        router.push({ name: 'OutputManagement', params: { id: project.value._id } })
      } else {
        toast.error('Project not loaded')
      }
    }

    const goBack = () => {
      router.push('/dashboard')
    }

    const loadAllData = async () => {
      loading.value = true
      try {
        console.log('🚀 Loading all test case management data...')
        await fetchProjectData()
        await fetchRequirements()
        await fetchDatabaseSchema()
        await loadTestCases()
        console.log('✅ All data loaded successfully')
      } catch (error) {
        console.error('❌ Error loading data:', error)
        toast.error('Failed to load project data')
      } finally {
        loading.value = false
      }
    }

    // Lifecycle
    onMounted(async () => {
      console.log('🏁 TestcaseManagement mounted')
      await loadAllData()
    })

    onUnmounted(() => {
      if (project.value._id) {
        cleanupSocketConnection(project.value._id)
      }
      console.log('🧹 TestcaseManagement unmounted')
    })

    // Watch for version changes
    watch(selectedVersionId, (newVersionId) => {
      if (newVersionId) {
        console.log('🔄 Version changed to:', newVersionId)
        fetchRequirements()
        fetchDatabaseSchema()
        loadTestCases()
      }
    })

    // Watch for filter changes với debounce
    let filterTimeout
    watch([searchQuery, statusFilter, testTypeFilter, priorityFilter], () => {
      clearTimeout(filterTimeout)
      filterTimeout = setTimeout(() => {
        loadTestCases()
      }, 300)
    })

    return {
      // Data
      project,
      versions,
      selectedVersionId,
      requirements,
      testCases,
      statistics,
      loading,
      activeUsers,

      // UI States
      showGenerateModal,
      showCreateModal,
      editingTestcase,
      viewingTestcase,
      executingTestcase,

      // Filters
      searchQuery,
      statusFilter,
      testTypeFilter,
      priorityFilter,
      selectedTestCases,
      selectAll,
      filteredTestCases,

      // Methods
      handleVersionSelect,
      handleGenerateTestCases,
      handleSaveTestcase,
      handleExecuteTestcase,
      executeTestcase,
      bulkExecute,
      bulkDelete,
      deleteTestcase,
      viewTestcase,
      editTestcase,
      closeModal,
      refreshData,
      clearFilters,
      toggleSelectAll,
      exportTestCases,
      formatDate,
      navigateToUsecase,
      navigateToOutput,
      goBack,
    }
  },
}
</script>

<style scoped>
.testcase-management-view {
  padding: 24px;
  background: #f8fafc;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.testcase-content {
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.action-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  gap: 20px;
}

.header-left h2 {
  font-size: 2rem;
  font-weight: 700;
  color: #1a365d;
  margin-bottom: 8px;
  line-height: 1.2;
}

.subtitle {
  color: #6b7280;
  font-size: 1rem;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #1a365d;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  font-size: 0.875rem;
}

.btn-primary:hover {
  background: #2d4a8a;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(26, 54, 93, 0.2);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  font-weight: 500;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #9ca3af;
  transform: translateY(-1px);
}

.btn-secondary.success {
  background: #d1fae5;
  color: #065f46;
  border-color: #a7f3d0;
}

.btn-secondary.success:hover {
  background: #a7f3d0;
}

.btn-secondary.warning {
  background: #fef3c7;
  color: #92400e;
  border-color: #fde68a;
}

.btn-secondary.warning:hover {
  background: #fde68a;
}

.btn-secondary.danger {
  background: #fee2e2;
  color: #991b1b;
  border-color: #fecaca;
}

.btn-secondary.danger:hover {
  background: #fecaca;
}

.btn-icon {
  padding: 8px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover:not(:disabled) {
  background: #f3f4f6;
  color: #374151;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon.danger:hover:not(:disabled) {
  background: #fee2e2;
  color: #dc2626;
}

.btn-icon.success:hover:not(:disabled) {
  background: #d1fae5;
  color: #065f46;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border: 1px solid #e5e7eb;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
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

.stat-card.coverage {
  border-left: 4px solid #8b5cf6;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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

.stat-card.coverage .stat-icon {
  background: #ede9fe;
  color: #8b5cf6;
}

.stat-info h3 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 4px;
  color: #1f2937;
  line-height: 1;
}

.stat-info p {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
  font-weight: 500;
}

/* Filters Section */
.filters-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  flex: 1;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #9ca3af;
  z-index: 1;
}

.search-input {
  padding: 10px 12px 10px 40px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  width: 280px;
  background: white;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

.filter-select {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 140px;
}

.filter-select:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

.clear-filters {
  padding: 10px 16px;
}

.view-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 80px 20px;
  color: #6b7280;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.spinner {
  border: 3px solid #f3f4f6;
  border-top: 3px solid #1a365d;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Test Cases Table */
.testcases-table {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1000px;
}

thead {
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
}

th {
  padding: 16px 12px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.checkbox-column {
  width: 40px;
  padding-left: 16px;
}

.title-column {
  min-width: 250px;
}

.type-column {
  width: 120px;
}

.priority-column {
  width: 100px;
}

.status-column {
  width: 120px;
}

.tables-column {
  min-width: 150px;
}

.date-column {
  width: 120px;
}

.actions-column {
  width: 140px;
}

td {
  padding: 16px 12px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: top;
}

.testcase-row:hover {
  background: #f9fafb;
}

.testcase-row.selected {
  background: #eff6ff;
}

.testcase-title .title-main {
  font-weight: 600;
  color: #1f2937;
  line-height: 1.4;
  margin-bottom: 4px;
}

.testcase-title .title-desc {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.4;
}

/* Badges */
.type-badge,
.priority-badge,
.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}

/* Type badges */
.type-badge.unit {
  background: #dbeafe;
  color: #1e40af;
}
.type-badge.integration {
  background: #d1fae5;
  color: #065f46;
}
.type-badge.api {
  background: #f3e8ff;
  color: #7e22ce;
}
.type-badge.ui {
  background: #fef3c7;
  color: #92400e;
}
.type-badge.performance {
  background: #fce7f3;
  color: #be185d;
}
.type-badge.security {
  background: #fecaca;
  color: #991b1b;
}

/* Priority badges */
.priority-badge.critical {
  background: #fecaca;
  color: #991b1b;
}
.priority-badge.high {
  background: #fed7aa;
  color: #9a3412;
}
.priority-badge.medium {
  background: #fef08a;
  color: #854d0e;
}
.priority-badge.low {
  background: #dcfce7;
  color: #166534;
}

/* Status badges */
.status-badge.passed {
  background: #d1fae5;
  color: #065f46;
}
.status-badge.failed {
  background: #fee2e2;
  color: #991b1b;
}
.status-badge.blocked {
  background: #fef3c7;
  color: #92400e;
}
.status-badge.not_executed {
  background: #f3f4f6;
  color: #6b7280;
}
.status-badge.in_progress {
  background: #dbeafe;
  color: #1e40af;
}

.database-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.table-tag {
  padding: 4px 8px;
  background: #e5e7eb;
  color: #374151;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
}

.no-tables {
  color: #9ca3af;
  font-style: italic;
  font-size: 0.875rem;
}

.last-executed {
  color: #6b7280;
  font-size: 0.875rem;
  white-space: nowrap;
}

.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

/* Bulk Actions */
.bulk-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
  gap: 16px;
}

.bulk-info {
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 8px;
}

.bulk-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* Navigation Tabs */
.navigation-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  padding: 0 4px;
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
  text-decoration: none;
}

.tab-button:hover {
  border-color: #1a365d;
  color: #1a365d;
  transform: translateY(-1px);
}

.tab-button.active {
  background: #1a365d;
  border-color: #1a365d;
  color: white;
}

.tab-button .material-symbols-outlined {
  font-size: 20px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #6b7280;
  background: white;
}

.empty-state .material-symbols-outlined {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.empty-state p {
  margin-bottom: 24px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.empty-state-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .testcase-management-view {
    padding: 16px;
  }

  .action-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .header-actions {
    justify-content: flex-start;
  }

  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
  }

  .filters-section {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    justify-content: space-between;
  }

  .search-input {
    width: 100%;
    max-width: 300px;
  }
}

@media (max-width: 768px) {
  .navigation-tabs {
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .stat-card {
    padding: 16px;
  }

  .stat-icon {
    width: 44px;
    height: 44px;
  }

  .stat-info h3 {
    font-size: 1.5rem;
  }

  .filter-group {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input,
  .filter-select {
    width: 100%;
    max-width: none;
  }

  .bulk-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .bulk-buttons {
    justify-content: stretch;
  }

  .bulk-buttons .btn-secondary {
    flex: 1;
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .header-left h2 {
    font-size: 1.5rem;
  }

  .action-buttons {
    flex-direction: column;
    gap: 4px;
  }

  .empty-state-actions {
    flex-direction: column;
    align-items: center;
  }

  .empty-state-actions .btn-primary,
  .empty-state-actions .btn-secondary {
    width: 200px;
    justify-content: center;
  }
}
</style>