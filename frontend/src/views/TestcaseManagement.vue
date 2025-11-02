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
          <!-- 🆕 THÊM NÚT ENHANCE -->
          <!-- <button class="btn-secondary" @click="showEnhanceModal = true">
            <span class="material-symbols-outlined">blur_medium</span>
            Enhance Test Cases
          </button> -->
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
              @input="handleSearch"
            />
          </div>
          <select v-model="statusFilter" class="filter-select" @change="applyFilters">
            <option value="">All Status</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="blocked">Blocked</option>
            <option value="not_executed">Not Executed</option>
            <option value="in_progress">In Progress</option>
          </select>
          <select v-model="testTypeFilter" class="filter-select" @change="applyFilters">
            <option value="">All Types</option>
            <option value="unit">Unit</option>
            <option value="integration">Integration</option>
            <option value="api">API</option>
            <option value="ui">UI</option>
            <option value="performance">Performance</option>
            <option value="security">Security</option>
          </select>
          <select v-model="priorityFilter" class="filter-select" @change="applyFilters">
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

      <!-- Sorting Controls -->
      <div class="sorting-section">
        <div class="sort-label">Sort by:</div>
        <div class="sort-options">
          <button
            class="sort-option"
            :class="{
              active: sortField === 'title',
              'sort-desc': sortField === 'title' && sortDirection === 'desc',
            }"
            @click="setSort('title')"
          >
            Title
            <span class="material-symbols-outlined sort-icon">
              {{
                sortField === 'title' && sortDirection === 'desc'
                  ? 'arrow_downward'
                  : 'arrow_upward'
              }}
            </span>
          </button>
          <button
            class="sort-option"
            :class="{
              active: sortField === 'test_type',
              'sort-desc': sortField === 'test_type' && sortDirection === 'desc',
            }"
            @click="setSort('test_type')"
          >
            Type
            <span class="material-symbols-outlined sort-icon">
              {{
                sortField === 'test_type' && sortDirection === 'desc'
                  ? 'arrow_downward'
                  : 'arrow_upward'
              }}
            </span>
          </button>
          <button
            class="sort-option"
            :class="{
              active: sortField === 'priority',
              'sort-desc': sortField === 'priority' && sortDirection === 'desc',
            }"
            @click="setSort('priority')"
          >
            Priority
            <span class="material-symbols-outlined sort-icon">
              {{
                sortField === 'priority' && sortDirection === 'desc'
                  ? 'arrow_downward'
                  : 'arrow_upward'
              }}
            </span>
          </button>
          <button
            class="sort-option"
            :class="{
              active: sortField === 'status',
              'sort-desc': sortField === 'status' && sortDirection === 'desc',
            }"
            @click="setSort('status')"
          >
            Status
            <span class="material-symbols-outlined sort-icon">
              {{
                sortField === 'status' && sortDirection === 'desc'
                  ? 'arrow_downward'
                  : 'arrow_upward'
              }}
            </span>
          </button>
          <button
            class="sort-option"
            :class="{
              active: sortField === 'executed_at',
              'sort-desc': sortField === 'executed_at' && sortDirection === 'desc',
            }"
            @click="setSort('executed_at')"
          >
            Last Executed
            <span class="material-symbols-outlined sort-icon">
              {{
                sortField === 'executed_at' && sortDirection === 'desc'
                  ? 'arrow_downward'
                  : 'arrow_upward'
              }}
            </span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading && !hasMoreData" class="loading-state">
        <div class="spinner"></div>
        <p>Loading test cases...</p>
      </div>

      <!-- Test Cases Table -->
      <div v-else class="testcases-table">
        <div class="table-container" ref="tableContainer" @scroll="handleScroll">
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
                v-for="testcase in displayedTestCases"
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

          <!-- Loading more indicator -->
          <div v-if="loading && hasMoreData" class="loading-more">
            <div class="spinner small"></div>
            <p>Loading more test cases...</p>
          </div>

          <!-- Empty State -->
          <div v-if="displayedTestCases.length === 0 && !loading" class="empty-state">
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
            <button class="btn-secondary warning" @click="bulkExecute('passed')">
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

    <!-- 🆕 ENHANCE TEST CASES MODAL -->
    <EnhanceTestcaseModal
      v-if="showEnhanceModal"
      :project-id="project._id"
      :version-id="selectedVersionId"
      :requirements="requirements"
      :existing-test-cases="testCases"
      @close="showEnhanceModal = false"
      @enhance="handleEnhanceTestCases"
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import ProjectHeader from '@/components/ProjectHeader.vue'
import GenerateTestcaseModal from '@/components/testcase/GenerateTestcaseModal.vue'
import EnhanceTestcaseModal from '@/components/testcase/EnhanceTestcaseModal.vue' // 🆕 IMPORT MODAL MỚI
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
    EnhanceTestcaseModal, // 🆕 THÊM COMPONENT MỚI
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
    const tableContainer = ref(null)

    // UI states - 🆕 THÊM showEnhanceModal
    const showGenerateModal = ref(false)
    const showEnhanceModal = ref(false) // 🆕 STATE MỚI
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

    // Sorting
    const sortField = ref('title')
    const sortDirection = ref('asc')

    // Infinite scroll
    const displayedTestCases = ref([])
    const itemsPerPage = 50
    const currentPage = ref(1)
    const hasMoreData = ref(true)

    // Load sorting preferences from localStorage
    const loadSortingPreferences = () => {
      try {
        const savedSort = localStorage.getItem('testcaseSorting')
        if (savedSort) {
          const { field, direction } = JSON.parse(savedSort)
          sortField.value = field || 'title'
          sortDirection.value = direction || 'asc'
        }
      } catch (error) {
        console.warn('Failed to load sorting preferences:', error)
      }
    }

    // Save sorting preferences to localStorage
    const saveSortingPreferences = () => {
      try {
        localStorage.setItem(
          'testcaseSorting',
          JSON.stringify({
            field: sortField.value,
            direction: sortDirection.value,
          })
        )
      } catch (error) {
        console.warn('Failed to save sorting preferences:', error)
      }
    }

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
      let filtered = [...testCases.value]

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

      // Apply sorting
      filtered.sort((a, b) => {
        let aValue = a[sortField.value]
        let bValue = b[sortField.value]

        // Handle special cases for sorting
        if (sortField.value === 'executed_at') {
          aValue = aValue ? new Date(aValue).getTime() : 0
          bValue = bValue ? new Date(bValue).getTime() : 0
        }

        // Handle empty values
        if (!aValue && bValue) return sortDirection.value === 'asc' ? -1 : 1
        if (aValue && !bValue) return sortDirection.value === 'asc' ? 1 : -1
        if (!aValue && !bValue) return 0

        // Compare values
        if (aValue < bValue) return sortDirection.value === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection.value === 'asc' ? 1 : -1
        return 0
      })

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

        // Reset selection và infinite scroll khi data thay đổi
        selectedTestCases.value = []
        selectAll.value = false
        currentPage.value = 1
        hasMoreData.value = true
        loadMoreData()
      } catch (error) {
        console.error('❌ Error loading test cases:', error)
        toast.error('Failed to load test cases')
        testCases.value = []
      } finally {
        loading.value = false
      }
    }

    // Infinite scroll - load more data
    const loadMoreData = () => {
      const startIndex = (currentPage.value - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      const newItems = filteredTestCases.value.slice(startIndex, endIndex)

      if (currentPage.value === 1) {
        displayedTestCases.value = newItems
      } else {
        displayedTestCases.value = [...displayedTestCases.value, ...newItems]
      }

      hasMoreData.value = endIndex < filteredTestCases.value.length
    }

    // Handle scroll for infinite loading
    const handleScroll = () => {
      if (!tableContainer.value || loading.value || !hasMoreData.value) return

      const { scrollTop, scrollHeight, clientHeight } = tableContainer.value
      const scrollThreshold = 100 // pixels from bottom

      if (scrollTop + clientHeight >= scrollHeight - scrollThreshold) {
        currentPage.value += 1
        loadMoreData()
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

    // 🆕 HANDLE ENHANCE TEST CASES
    const handleEnhanceTestCases = async (enhancementData) => {
      if (!project.value._id || !selectedVersionId.value) {
        toast.error('Project and version must be selected')
        return
      }

      try {
        console.log(
          '🔄 Enhancing test cases with new requirements:',
          enhancementData.newRequirementIds
        )
        const { data } = await testcaseApi.enhanceTestCases(
          project.value._id,
          selectedVersionId.value,
          enhancementData
        )

        toast.success(
          `Successfully enhanced test cases! Added ${data.summary?.added || 0} new test cases`
        )
        await loadTestCases() // Reload để cập nhật statistics
        showEnhanceModal.value = false
      } catch (error) {
        console.error('❌ Error enhancing test cases:', error)
        const errorMessage = error.response?.data?.message || error.message
        toast.error(`Failed to enhance test cases: ${errorMessage}`)
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
      currentPage.value = 1
      loadMoreData()
    }

    const applyFilters = () => {
      currentPage.value = 1
      loadMoreData()
    }

    const handleSearch = () => {
      clearTimeout(window.searchTimeout)
      window.searchTimeout = setTimeout(() => {
        applyFilters()
      }, 500)
    }

    const toggleSelectAll = () => {
      if (selectAll.value) {
        selectedTestCases.value = displayedTestCases.value.map((tc) => tc._id)
      } else {
        selectedTestCases.value = []
      }
    }

    const setSort = (field) => {
      if (sortField.value === field) {
        // Toggle direction if same field
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
      } else {
        // New field, default to ascending
        sortField.value = field
        sortDirection.value = 'asc'
      }

      // Save to localStorage
      saveSortingPreferences()

      // Reset to first page and reload data
      currentPage.value = 1
      loadMoreData()
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
      loadSortingPreferences()
      await loadAllData()
    })

    onUnmounted(() => {
      console.log('🧹 Cleaning up TestcaseManagement')
      cleanupSocketConnection()
    })

    // Watchers
    watch(
      () => route.params.id,
      async (newId) => {
        if (newId) {
          console.log('🔄 Route changed, reloading data for project:', newId)
          await loadAllData()
        }
      }
    )

    watch(
      () => selectedVersionId.value,
      (newVersionId) => {
        if (newVersionId) {
          console.log('🔄 Version changed, reloading requirements and schema')
          fetchRequirements()
          fetchDatabaseSchema()
          loadTestCases()
        }
      }
    )

    watch(
      () => filteredTestCases.value,
      () => {
        // Reset infinite scroll when filters change
        currentPage.value = 1
        loadMoreData()
      }
    )

    watch(selectedTestCases, (newSelection) => {
      selectAll.value =
        newSelection.length > 0 && newSelection.length === displayedTestCases.value.length
    })

    return {
      // Data
      project,
      versions,
      selectedVersionId,
      requirements,
      databaseSchema,
      testCases,
      loading,
      tableContainer,
      displayedTestCases,
      hasMoreData,
      activeUsers,

      // UI states - 🆕 THÊM showEnhanceModal
      showGenerateModal,
      showEnhanceModal,
      showCreateModal,
      editingTestcase,
      viewingTestcase,
      executingTestcase,

      // Filters and selection
      searchQuery,
      statusFilter,
      testTypeFilter,
      priorityFilter,
      selectedTestCases,
      selectAll,

      // Sorting
      sortField,
      sortDirection,

      // Computed
      statistics,
      initSocketConnection,

      // Methods
      handleVersionSelect,
      navigateToUsecase,
      navigateToOutput,
      goBack,
      handleGenerateTestCases,
      handleEnhanceTestCases, // 🆕 THÊM METHOD MỚI
      handleSaveTestcase,
      executeTestcase,
      handleExecuteTestcase,
      bulkExecute,
      bulkDelete,
      deleteTestcase,
      viewTestcase,
      editTestcase,
      closeModal,
      refreshData,
      clearFilters,
      applyFilters,
      handleSearch,
      toggleSelectAll,
      setSort,
      exportTestCases,
      formatDate,
      handleScroll,
      fetchProjectData,
    }
  },
}
</script>

<style scoped>
.testcase-management-view {
  padding: 30px;
  min-height: 100vh;
  background: var(--background-color);
}

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

.testcase-content {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.action-header {
  display: flex;
  justify-content: between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.header-left h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
}

.subtitle {
  color: var(--text-secondary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.btn-primary,
.btn-secondary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #1a365d;
  color: white;
}

.btn-primary:hover {
  background: #27446c;
  color: white;
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--background-color);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--border-color);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  border-radius: 6px;
  background: var(--background-color);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.btn-icon.success {
  color: var(--success-color);
}

.btn-icon.success:hover {
  background: var(--success-light);
}

.btn-icon.danger {
  color: var(--error-color);
}

.btn-icon.danger:hover {
  background: var(--error-light);
}

/* Stats Grid */
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
  justify-content: between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  max-width: 300px;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
}

.search-input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px var(--primary-light);
}

.filter-select {
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: white;
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  min-width: 120px;
}

.filter-select:focus {
  outline: none;
  border-color: #1a365d;
}

.clear-filters {
  padding: 0.75rem 1rem;
}

.view-actions {
  display: flex;
  gap: 0.5rem;
}

/* Sorting Section */
.sorting-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.sort-label {
  font-weight: 500;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.sort-options {
  display: flex;
  gap: 0.5rem;
}

.sort-option {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: white;
  color: #1a365d;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sort-option:hover {
  border-color: #1a365d;
  color: #1a365d;
}

.sort-option.active {
  background: #1a365d;
  border-color: #1a365d;
  color: white;
}

.sort-option.sort-desc .sort-icon {
  transform: rotate(180deg);
}

.sort-icon {
  font-size: 1rem;
  transition: transform 0.2s ease;
}

/* Table */
.testcases-table {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.table-container {
  max-height: 600px;
  overflow-y: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 10;
}

th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.875rem;
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
}

td {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.checkbox-column {
  width: 40px;
  text-align: center;
}

.title-column {
  min-width: 250px;
}

.type-column,
.priority-column,
.status-column {
  width: 120px;
}

.tables-column {
  min-width: 150px;
}

.date-column {
  width: 140px;
}

.actions-column {
  width: 160px;
}

.testcase-row {
  transition: background-color 0.2s ease;
}

.testcase-row:hover {
  background: var(--background-color);
}

.testcase-row.selected {
  background: var(--primary-light);
}

.testcase-title .title-main {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.testcase-title .title-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* Badges */
.type-badge,
.priority-badge,
.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.type-badge.unit {
  background: var(--success-light);
  color: var(--success-color);
}

.type-badge.integration {
  background: var(--info-light);
  color: var(--info-color);
}

.type-badge.api {
  background: var(--primary-light);
  color: #1a365d;
}

.type-badge.ui {
  background: var(--warning-light);
  color: var(--warning-color);
}

.type-badge.performance {
  background: var(--purple-light);
  color: var(--purple-color);
}

.type-badge.security {
  background: var(--error-light);
  color: var(--error-color);
}

.priority-badge.critical {
  background: var(--error-light);
  color: var(--error-color);
}

.priority-badge.high {
  background: var(--warning-light);
  color: var(--warning-color);
}

.priority-badge.medium {
  background: var(--info-light);
  color: var(--info-color);
}

.priority-badge.low {
  background: var(--success-light);
  color: var(--success-color);
}

.status-badge.passed {
  background: var(--success-light);
  color: var(--success-color);
}

.status-badge.failed {
  background: var(--error-light);
  color: var(--error-color);
}

.status-badge.blocked {
  background: var(--warning-light);
  color: var(--warning-color);
}

.status-badge.not_executed {
  background: var(--gray-light);
  color: var(--gray-color);
}

.status-badge.in_progress {
  background: var(--info-light);
  color: var(--info-color);
}

.database-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.table-tag {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: var(--background-color);
  color: var(--text-secondary);
  border-radius: 4px;
  font-size: 0.75rem;
}

.no-tables {
  color: var(--text-tertiary);
  font-style: italic;
}

.last-executed {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

/* Loading States */
.loading-state,
.loading-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid var(--border-color);
  border-top: 2px solid #1a365d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.spinner.small {
  width: 1.5rem;
  height: 1.5rem;
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

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-state .material-symbols-outlined {
  font-size: 4rem;
  color: var(--text-tertiary);
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: var(--text-secondary);
  margin: 0 0 2rem 0;
  max-width: 400px;
}

.empty-state-actions {
  display: flex;
  gap: 1rem;
}
.empty-state-actions button:hover {
  opacity: 0.9;
  border: 1px solid #1a365d;
  color: #121212;
}
/* Bulk Actions */
.bulk-actions {
  display: flex;
  gap: 1pc;
  border-radius: 15px;
  justify-self: center;
  justify-content: center;
  width: 70%;
  border: 2px solid #000;
  left: 0;
  right: 0;
  position: fixed;
  background-color: #fff;
  flex-direction: column;
  bottom: 20px;
  justify-content: between;
  align-items: center;
  padding: 1rem 1.5rem;
}

.bulk-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #1a365d;
  font-weight: 500;
}

.bulk-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-secondary.success {
  background: var(--success-light);
  color: var(--success-color);
  border-color: var(--success-color);
}

.btn-secondary.warning {
  background: var(--warning-light);
  color: var(--warning-color);
  border-color: var(--warning-color);
}

.btn-secondary.danger {
  background: var(--error-light);
  color: var(--error-color);
  border-color: var(--error-color);
}

/* Responsive */
@media (max-width: 1024px) {
  .testcase-content {
    padding: 1rem;
  }

  .action-header {
    flex-direction: column;
    gap: 1rem;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .filters-section {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    flex-wrap: wrap;
  }

  .search-input-wrapper {
    max-width: none;
  }
}

@media (max-width: 768px) {
  .navigation-tabs {
    padding: 0 1rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .sorting-section {
    flex-direction: column;
    align-items: stretch;
  }

  .sort-options {
    flex-wrap: wrap;
  }

  .table-container {
    overflow-x: auto;
  }

  .bulk-actions {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .bulk-buttons {
    justify-content: center;
  }
}
/* 🆕 CSS MỚI CHO NÚT ENHANCE */
.btn-secondary.success {
  background: var(--success-light);
  color: var(--success-color);
  border: 1px solid var(--success-color);
}

.btn-secondary.success:hover {
  background: var(--success-color);
  color: white;
}

/* 🆕 CSS CHO BULK ACTIONS FIXED */
.bulk-actions {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 2px solid #1a365d;
  width: 70%;
  max-width: 800px;
  z-index: 1000;
}

.bulk-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #1a365d;
  font-weight: 500;
}

.bulk-buttons {
  display: flex;
  gap: 0.5rem;
}

/* 🆕 RESPONSIVE CHO BULK ACTIONS */
@media (max-width: 768px) {
  .bulk-actions {
    width: 90%;
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .bulk-buttons {
    justify-content: center;
    flex-wrap: wrap;
  }
}

/* 🆕 HEADER ACTIONS SPACING */
.header-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* 🆕 ENHANCE BUTTON SPECIFIC STYLES */
.btn-secondary.success .material-symbols-outlined {
  font-size: 1.1rem;
}

/* Giữ nguyên các style cũ khác */
.testcase-management-view {
  padding: 30px;
  min-height: 100vh;
  background: var(--background-color);
}

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

.testcase-content {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.action-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.header-left h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
}

.subtitle {
  color: var(--text-secondary);
  margin: 0;
}
</style>