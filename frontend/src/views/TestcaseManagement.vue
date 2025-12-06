<template>
  <div class="testcase-management-view">
    <ProjectHeader
      :project="project"
      :versions="versions"
      :selected-version-id="selectedVersionId"
      :active-users="activeUsers"
      @version-selected="handleVersionSelect"
      @go-back="goBack"
      @show-sharing="showSharingModal = true"
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
          <button class="btn-secondary" @click="showGenerateModal = true" :disabled="loading">
            <span class="material-symbols-outlined">auto_awesome</span>
            Generate Test Cases
          </button>
          <button class="btn-primary" @click="showCreateModal = true" :disabled="loading">
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
            <h3>{{ statistics.total || 0 }}</h3>
            <p>Total Test Cases</p>
          </div>
        </div>
        <div class="stat-card passed">
          <div class="stat-icon">
            <span class="material-symbols-outlined">check_circle</span>
          </div>
          <div class="stat-info">
            <h3>{{ statistics.passed || 0 }}</h3>
            <p>Passed</p>
          </div>
        </div>
        <div class="stat-card failed">
          <div class="stat-icon">
            <span class="material-symbols-outlined">cancel</span>
          </div>
          <div class="stat-info">
            <h3>{{ statistics.failed || 0 }}</h3>
            <p>Failed</p>
          </div>
        </div>
        <div class="stat-card pending">
          <div class="stat-icon">
            <span class="material-symbols-outlined">schedule</span>
          </div>
          <div class="stat-info">
            <h3>{{ statistics.not_executed || 0 }}</h3>
            <p>Not Executed</p>
          </div>
        </div>
        <div class="stat-card coverage">
          <div class="stat-icon">
            <span class="material-symbols-outlined"> full_coverage </span>
          </div>
          <div class="stat-info">
            <h3>{{ coveragePercentage }}%</h3>
            <p>Requirement Coverage</p>
          </div>
        </div>
      </div>

      <!-- Export Modal -->
      <ExportOptionsPanel
        v-if="showExportModal"
        :project-id="project._id"
        :version-id="selectedVersionId"
        :filters="currentFilters"
        :loading="exportLoading"
        @export="handleExport"
        @close="showExportModal = false"
        @clearFilters="clearFilters"
      />
      <div class="export-section">
        <button
          class="btn-secondary export-btn"
          @click="showExportModal = true"
          :disabled="loading"
        >
          <span class="material-symbols-outlined">download</span>
          Export Test Cases
        </button>
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
              :disabled="loading"
            />
          </div>
          <select
            v-model="statusFilter"
            class="filter-select"
            @change="loadTestCases"
            :disabled="loading"
          >
            <option value="">All Status</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="blocked">Blocked</option>
            <option value="not_executed">Not Executed</option>
            <option value="in_progress">In Progress</option>
          </select>
          <select
            v-model="testTypeFilter"
            class="filter-select"
            @change="loadTestCases"
            :disabled="loading"
          >
            <option value="">All Types</option>
            <option value="unit">Unit</option>
            <option value="integration">Integration</option>
            <option value="api">API</option>
            <option value="ui">UI</option>
            <option value="performance">Performance</option>
            <option value="security">Security</option>
          </select>
          <select
            v-model="priorityFilter"
            class="filter-select"
            @change="loadTestCases"
            :disabled="loading"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button class="btn-secondary clear-filters" @click="clearFilters" :disabled="loading">
            <span class="material-symbols-outlined">clear_all</span>
            Clear
          </button>
        </div>
        <div class="view-actions">
          <button class="btn-icon" @click="loadTestCases" title="Refresh" :disabled="loading">
            <span class="material-symbols-outlined" :class="{ spinning: loading }">refresh</span>
          </button>
          <button
            class="btn-icon"
            @click="showExportPanel = !showExportPanel"
            title="Export Options"
          >
            <span class="material-symbols-outlined">download</span>
          </button>
        </div>
      </div>

      <!-- Export Panel Toggle -->
      <div v-if="showExportPanel" class="export-panel-toggle">
        <button class="btn-text" @click="showExportPanel = false">
          <span class="material-symbols-outlined">close</span>
          Hide Export Options
        </button>
      </div>

      <!-- Sorting Options -->
      <div class="sorting-section">
        <span class="sort-label">Sort by:</span>
        <div class="sort-options">
          <button
            class="sort-option"
            :class="{ active: sortBy === 'title' }"
            @click="setSort('title')"
          >
            Title
            <span
              class="material-symbols-outlined sort-icon"
              :class="{ 'sort-desc': sortOrder === 'desc' }"
            >
              unfold_more
            </span>
          </button>
          <button
            class="sort-option"
            :class="{ active: sortBy === 'priority' }"
            @click="setSort('priority')"
          >
            Priority
            <span
              class="material-symbols-outlined sort-icon"
              :class="{ 'sort-desc': sortOrder === 'desc' }"
            >
              unfold_more
            </span>
          </button>
          <button
            class="sort-option"
            :class="{ active: sortBy === 'status' }"
            @click="setSort('status')"
          >
            Status
            <span
              class="material-symbols-outlined sort-icon"
              :class="{ 'sort-desc': sortOrder === 'desc' }"
            >
              unfold_more
            </span>
          </button>
          <button
            class="sort-option"
            :class="{ active: sortBy === 'executed_at' }"
            @click="setSort('executed_at')"
          >
            Last Executed
            <span
              class="material-symbols-outlined sort-icon"
              :class="{ 'sort-desc': sortOrder === 'desc' }"
            >
              unfold_more
            </span>
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
                  <input
                    type="checkbox"
                    v-model="selectAll"
                    @change="toggleSelectAll"
                    :disabled="testCases.length === 0"
                  />
                </th>
                <th class="id-column">ID</th>
                <th class="title-column">Title</th>
                <th class="type-column">Type</th>
                <th class="priority-column">Priority</th>
                <th class="status-column">Status</th>
                <th class="tables-column">Database Tables</th>
                <th class="requirements-column">Requirements</th>
                <th class="date-column">Last Executed</th>
                <th class="actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(testcase, index) in paginatedTestCases"
                :key="testcase._id"
                :class="{
                  selected: selectedTestCases.includes(testcase._id),
                  'row-even': index % 2 === 0,
                  'row-odd': index % 2 !== 0,
                }"
                class="testcase-row"
              >
                <td class="checkbox-column">
                  <input
                    type="checkbox"
                    :value="testcase._id"
                    v-model="selectedTestCases"
                    :disabled="testcase.status === 'in_progress'"
                  />
                </td>
                <td class="id-column">
                  <span class="testcase-id">{{ getTestcaseIndex(index) }}</span>
                </td>
                <td class="title-column">
                  <div class="testcase-title">
                    <div class="title-main">{{ formatTestCaseTitle(testcase) }}</div>
                    <div v-if="testcase.description" class="title-desc">
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
                  <div class="status-icon-wrapper" :title="testcase.status || 'not_executed'">
                    <span
                      class="material-symbols-outlined status-icon"
                      :class="testcase.status || 'not_executed'"
                    >
                      {{ getStatusIcon(testcase.status) }}
                    </span>
                  </div>
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
                <td class="requirements-column">
                  <div class="requirement-tags">
                    <span
                      v-for="reqId in testcase.source_requirement_ids || []"
                      :key="reqId"
                      class="requirement-tag"
                      :title="`Requirement ID: ${reqId}`"
                    >
                      {{ getRequirementName(reqId) || `Req-${String(reqId).substring(0, 8)}...` }}
                    </span>
                    <span
                      v-if="
                        !testcase.source_requirement_ids ||
                        testcase.source_requirement_ids.length === 0
                      "
                      class="no-requirements"
                    >
                      No requirements
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
          <div v-if="testCases.length === 0" class="empty-state">
            <span class="material-symbols-outlined">playlist_remove</span>
            <h3>No test cases found</h3>
            <p v-if="hasActiveFilters">Try adjusting your filters or search terms.</p>
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

        <!-- Pagination -->
        <div v-if="testCases.length > 0" class="pagination">
          <div class="pagination-info">
            Showing {{ pagination.startIndex + 1 }} to {{ pagination.endIndex }} of
            {{ testCases.length }} test cases
          </div>
          <div class="pagination-controls">
            <button class="btn-icon" @click="previousPage" :disabled="pagination.currentPage === 1">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <div class="page-numbers">
              <button
                v-for="page in visiblePages"
                :key="page"
                class="page-number"
                :class="{ active: page === pagination.currentPage }"
                @click="goToPage(page)"
              >
                {{ page }}
              </button>
            </div>
            <button
              class="btn-icon"
              @click="nextPage"
              :disabled="pagination.currentPage === pagination.totalPages"
            >
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
          <div class="page-size-selector">
            <label for="pageSize">Show:</label>
            <select
              id="pageSize"
              v-model="pagination.pageSize"
              @change="handlePageSizeChange"
              class="page-size-select"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        <!-- Bulk Actions -->
        <div v-if="selectedTestCases.length > 0" class="bulk-actions">
          <div class="bulk-info">
            <span class="material-symbols-outlined">check_circle</span>
            {{ selectedTestCases.length }} test cases selected
          </div>
          <div class="bulk-buttons">
            <button class="btn-secondary" @click="bulkExecute('passed')" :disabled="loading">
              <span class="material-symbols-outlined">check_circle</span>
              Mark as Passed
            </button>
            <button class="btn-secondary" @click="bulkExecute('failed')" :disabled="loading">
              <span class="material-symbols-outlined">cancel</span>
              Mark as Failed
            </button>
            <button class="btn-secondary" @click="bulkExecute('not_executed')" :disabled="loading">
              <span class="material-symbols-outlined">schedule</span>
              Mark as Not Executed
            </button>
            <button class="btn-secondary" @click="bulkDelete" :disabled="loading">
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
      :project="project"
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

    <!-- Export Progress Modal -->
    <ExportProgressModal
      v-if="exportProgress.show"
      :progress="exportProgress"
      @cancel="cancelExport"
    />

    <!-- Sharing Modal -->
    <ProjectSharingModal
      v-if="showSharingModal"
      :project-id="project._id"
      @close="showSharingModal = false"
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
import ExportOptionsPanel from '@/components/testcase/ExportOptionsPanel.vue'
import ExportProgressModal from '@/components/testcase/ExportProgressModal.vue'
import ProjectSharingModal from '@/components/ProjectSharingModal.vue'
import { useActiveMembers } from '@/utils/useActiveMembers'
import { getProjectDetail, usecaseApi, getDatabasesByVersion } from '@/api/project'
import { testcaseApi } from '@/api/testcase'
import {
  saveSelectedVersion,
  getSelectedOrDefaultVersion,
  filterApprovedVersions,
  isOwner as checkIsOwner,
} from '@/utils/versionSync'
import eventBus from '@/utils/eventBus'
import { socket } from '@/utils/socket'

export default {
  name: 'TestcaseManagement',
  components: {
    ProjectHeader,
    GenerateTestcaseModal,
    TestcaseFormModal,
    TestcaseDetailModal,
    TestcaseExecutionModal,
    ExportOptionsPanel,
    ExportProgressModal,
    ProjectSharingModal,
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
    const exportLoading = ref(false)
    const showExportPanel = ref(false)

    // UI states
    const showGenerateModal = ref(false)
    const showCreateModal = ref(false)
    const editingTestcase = ref(null)
    const viewingTestcase = ref(null)
    const executingTestcase = ref(null)
    const showSharingModal = ref(false)

    // Filters and sorting
    const searchQuery = ref('')
    const statusFilter = ref('')
    const testTypeFilter = ref('')
    const priorityFilter = ref('')
    const sortBy = ref('title')
    const sortOrder = ref('asc')
    const selectedTestCases = ref([])
    const selectAll = ref(false)

    const showExportModal = ref(false)
    // Export progress
    const exportProgress = ref({
      show: false,
      title: '',
      progress: 0,
      status: 'idle',
    })

    // Pagination
    const pagination = ref({
      currentPage: 1,
      pageSize: 25,
      totalPages: 1,
      startIndex: 0,
      endIndex: 0,
    })

    // Computed properties
    const hasActiveFilters = computed(() => {
      return searchQuery.value || statusFilter.value || testTypeFilter.value || priorityFilter.value
    })

    const currentFilters = computed(() => ({
      test_type: testTypeFilter.value,
      status: statusFilter.value,
      priority: priorityFilter.value,
      versionId: selectedVersionId.value,
    }))

    const statistics = computed(() => {
      const total = testCases.value.length
      const passed = testCases.value.filter((tc) => tc.status === 'passed').length
      const failed = testCases.value.filter((tc) => tc.status === 'failed').length
      const not_executed = testCases.value.filter((tc) => tc.status === 'not_executed').length
      const in_progress = testCases.value.filter((tc) => tc.status === 'in_progress').length
      const blocked = testCases.value.filter((tc) => tc.status === 'blocked').length

      return {
        total,
        passed,
        failed,
        not_executed,
        in_progress,
        blocked,
      }
    })

    const coveragePercentage = computed(() => {
      if (requirements.value.length === 0) return 0

      const coveredRequirements = new Set()
      testCases.value.forEach((tc) => {
        if (tc.source_requirement_ids) {
          tc.source_requirement_ids.forEach((reqId) => coveredRequirements.add(reqId))
        }
      })

      return Math.round((coveredRequirements.size / requirements.value.length) * 100)
    })

    const sortedTestCases = computed(() => {
      let sorted = [...testCases.value]

      // Apply sorting
      sorted.sort((a, b) => {
        let aValue = a[sortBy.value]
        let bValue = b[sortBy.value]

        // Handle special cases for priority sorting
        if (sortBy.value === 'priority') {
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          aValue = priorityOrder[aValue] || 0
          bValue = priorityOrder[bValue] || 0
        }

        // Handle date sorting
        if (sortBy.value === 'executed_at') {
          aValue = aValue ? new Date(aValue).getTime() : 0
          bValue = bValue ? new Date(bValue).getTime() : 0
        }

        if (sortOrder.value === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
        }
      })

      return sorted
    })

    const paginatedTestCases = computed(() => {
      const startIndex = (pagination.value.currentPage - 1) * pagination.value.pageSize
      const endIndex = startIndex + pagination.value.pageSize

      pagination.value.startIndex = startIndex
      pagination.value.endIndex = Math.min(endIndex, sortedTestCases.value.length)
      pagination.value.totalPages = Math.ceil(
        sortedTestCases.value.length / pagination.value.pageSize
      )

      return sortedTestCases.value.slice(startIndex, endIndex)
    })

    const visiblePages = computed(() => {
      const pages = []
      const totalPages = pagination.value.totalPages
      const currentPage = pagination.value.currentPage

      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        if (currentPage <= 4) {
          for (let i = 1; i <= 5; i++) {
            pages.push(i)
          }
          pages.push('...')
          pages.push(totalPages)
        } else if (currentPage >= totalPages - 3) {
          pages.push(1)
          pages.push('...')
          for (let i = totalPages - 4; i <= totalPages; i++) {
            pages.push(i)
          }
        } else {
          pages.push(1)
          pages.push('...')
          for (let i = currentPage - 1; i <= currentPage + 1; i++) {
            pages.push(i)
          }
          pages.push('...')
          pages.push(totalPages)
        }
      }

      return pages
    })

    // Methods
    const getStatusIcon = (status) => {
      const statusIcons = {
        passed: 'check_circle',
        failed: 'cancel',
        blocked: 'block',
        not_executed: 'schedule',
        in_progress: 'hourglass_empty',
      }
      return statusIcons[status] || 'schedule'
    }

    const getTestcaseIndex = (index) => {
      const startIndex = (pagination.value.currentPage - 1) * pagination.value.pageSize
      return startIndex + index + 1
    }

    const fetchProjectData = async () => {
      try {
        const projectId = route.params.id
        if (!projectId) {
          toast.error('Project ID is required')
          return
        }

        const { data } = await getProjectDetail(projectId)
        const result = data.data || data
        project.value = result.project || {}
        // Lọc bỏ version tạm thời, chỉ giữ version đã được approve
        const allVersions = result.versions || []
        versions.value = filterApprovedVersions(allVersions)

        // Sử dụng version sync utility
        const currentVersionId = result.current_version?._id
        if (!selectedVersionId.value) {
          selectedVersionId.value = getSelectedOrDefaultVersion(
            projectId,
            versions.value,
            currentVersionId
          )
          
          if (selectedVersionId.value) {
            saveSelectedVersion(projectId, selectedVersionId.value)
          }
        }

        if (project.value._id) {
          initSocketConnection(project.value._id)
        }
      } catch (error) {
        console.error('Error fetching project:', error)
        toast.error('Failed to load project data')
      }
    }

    const fetchRequirements = async () => {
      if (!selectedVersionId.value) return

      try {
        const { data } = await usecaseApi.getUsecases(selectedVersionId.value)
        requirements.value = data.data || data || []
      } catch (error) {
        console.error('Error fetching requirements:', error)
        requirements.value = []
      }
    }

    const fetchDatabaseSchema = async () => {
      if (!selectedVersionId.value) return

      try {
        const { data } = await getDatabasesByVersion(selectedVersionId.value)
        if (data?.data?.[0]) {
          databaseSchema.value = data.data[0]
        } else if (data?.[0]) {
          databaseSchema.value = data[0]
        } else {
          databaseSchema.value = null
        }
      } catch (error) {
        console.error('Error fetching database schema:', error)
        databaseSchema.value = null
      }
    }

    const loadTestCases = async () => {
      if (!project.value._id) return

      loading.value = true
      try {
        const params = {
          versionId: selectedVersionId.value,
          status: statusFilter.value || undefined,
          test_type: testTypeFilter.value || undefined,
          priority: priorityFilter.value || undefined,
          search: searchQuery.value || undefined, // Thêm search parameter
        }

        // Sử dụng hàm getTestCasesByProject thông thường (vì đã hỗ trợ search)
        const { data } = await testcaseApi.getTestCasesByProject(project.value._id, params)
        testCases.value = data.data || data || []

        // Reset selection and pagination
        selectedTestCases.value = []
        selectAll.value = false
        pagination.value.currentPage = 1
      } catch (error) {
        console.error('Error loading test cases:', error)
        toast.error('Failed to load test cases')
        testCases.value = []
      } finally {
        loading.value = false
      }
    }

    // Export Methods
    const handleExport = async (exportConfig) => {
      exportLoading.value = true
      exportProgress.value = {
        show: true,
        title: exportConfig.title,
        progress: 0,
        status: 'preparing',
      }

      try {
        exportProgress.value.status = 'exporting'
        exportProgress.value.progress = 30

        // Chỉ xử lý export test cases
        const result = await testcaseApi.handleExcelExport(
          testcaseApi.exportTestCasesToExcel,
          project.value._id,
          exportConfig.options,
          `testcases-${project.value._id}-${Date.now()}.xlsx`
        )

        exportProgress.value.progress = 100
        exportProgress.value.status = 'completed'

        toast.success(`Successfully exported ${exportConfig.title}`)
        showExportModal.value = false

        // Auto-close progress modal after 2 seconds
        setTimeout(() => {
          exportProgress.value.show = false
        }, 2000)
      } catch (error) {
        console.error('Export error:', error)
        exportProgress.value.status = 'error'
        const { formatErrorForDisplay } = require('@/utils/errorMessages')
        toast.error(formatErrorForDisplay(error, 'Failed to export test cases. Please try again.'))
      } finally {
        exportLoading.value = false
      }
    }

    const cancelExport = () => {
      exportProgress.value.show = false
      exportLoading.value = false
      toast.info('Export cancelled')
    }

    const formatTestCaseTitle = (testcase) => {
      const existingFormatRegex = /^\[.*\] - .* - .*/
      if (existingFormatRegex.test(testcase.title)) {
        return testcase.title
      }

      const requirementIds = testcase.source_requirement_ids || []

      if (requirementIds.length === 0) {
        return testcase.title || 'Untitled Test Case'
      }

      const firstReqId = requirementIds[0]
      const requirementName = getRequirementName(firstReqId)
      const baseTitle = testcase.title || 'Test Scenario'

      // Show requirement name instead of ID
      return requirementName ? `${requirementName} - ${baseTitle}` : baseTitle
    }

    const getRequirementName = (requirementId) => {
      // Support both _id and id for backward compatibility
      const requirement = requirements.value.find((req) => {
        const reqId = String(req._id || req.id || '')
        const searchId = String(requirementId || '')
        return reqId === searchId || reqId.toLowerCase() === searchId.toLowerCase()
      })
      return requirement?.name || 'Unknown Requirement'
    }

    const handleGenerateTestCases = async (generatedTestCases) => {
      if (!project.value._id || !selectedVersionId.value) {
        toast.error('Project and version must be selected')
        return
      }

      try {
        // ✅ ĐÃ SỬA: Gửi nguyên bản, không format lại title
        await testcaseApi.saveTestCases(project.value._id, selectedVersionId.value, {
          testCases: generatedTestCases, // Dùng trực tiếp không format
        })

        showGenerateModal.value = false
        await loadTestCases()
      } catch (error) {
        console.error('Error saving generated test cases:', error)
        const { formatErrorForDisplay } = require('@/utils/errorMessages')
        const errorMessage = formatErrorForDisplay(error, 'An error occurred')
        toast.error(`Failed to save test cases: ${errorMessage}`)
      }
    }

    // const formatGeneratedTestCaseTitle = (testcase) => {
    //   const requirementIds = testcase.source_requirement_ids || []

    //   if (requirementIds.length === 0) {
    //     return testcase.title || 'Generated Test Case'
    //   }

    //   const firstReqId = requirementIds[0]
    //   const requirementName = getRequirementName(firstReqId)
    //   const testScenario = testcase.title || 'Test Scenario'

    //   return `[${firstReqId}] - ${requirementName} - ${testScenario}`
    // }

    const handleSaveTestcase = async (testcaseData) => {
      try {
        if (editingTestcase.value) {
          await testcaseApi.updateTestCase(editingTestcase.value._id, testcaseData)
          toast.success('Test case updated successfully')
        } else {
          await testcaseApi.saveTestCases(project.value._id, selectedVersionId.value, {
            testCases: [testcaseData],
          })
          toast.success('Test case created successfully')
        }
        await loadTestCases()
        closeModal()
      } catch (error) {
        console.error('Error saving test case:', error)
        const { formatErrorForDisplay } = require('@/utils/errorMessages')
        const errorMessage = formatErrorForDisplay(error, 'An error occurred')
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
        await testcaseApi.executeTestCase(executingTestcase.value._id, executionData)
        // toast.success('Test case executed successfully')
        await loadTestCases()
        executingTestcase.value = null
      } catch (error) {
        console.error('Error executing test case:', error)
        const { formatErrorForDisplay } = require('@/utils/errorMessages')
        const errorMessage = formatErrorForDisplay(error, 'An error occurred')
        toast.error(`Failed to execute test case: ${errorMessage}`)
      }
    }

    const bulkExecute = async (status) => {
      if (selectedTestCases.value.length === 0) {
        toast.warning('No test cases selected')
        return
      }

      try {
        await testcaseApi.bulkExecuteTestCases(project.value._id, {
          testCaseIds: selectedTestCases.value,
          executionData: { status },
        })
        toast.success(`Marked ${selectedTestCases.value.length} test cases as ${status}`)
        selectedTestCases.value = []
        selectAll.value = false
        await loadTestCases()
      } catch (error) {
        console.error('Error bulk executing:', error)
        const { formatErrorForDisplay } = require('@/utils/errorMessages')
        const errorMessage = formatErrorForDisplay(error, 'An error occurred')
        toast.error(`Failed to update test cases: ${errorMessage}`)
      }
    }

    const bulkDelete = async () => {
      if (selectedTestCases.value.length === 0) {
        toast.warning('No test cases selected')
        return
      }

      if (
        !confirm(`Are you sure you want to delete ${selectedTestCases.value.length} test cases?`)
      ) {
        return
      }

      try {
        await testcaseApi.bulkDeleteTestCases(project.value._id, {
          testCaseIds: selectedTestCases.value,
        })
        toast.success(`Deleted ${selectedTestCases.value.length} test cases`)
        selectedTestCases.value = []
        selectAll.value = false
        await loadTestCases()
      } catch (error) {
        console.error('Error bulk deleting:', error)
        const { formatErrorForDisplay } = require('@/utils/errorMessages')
        const errorMessage = formatErrorForDisplay(error, 'An error occurred')
        toast.error(`Failed to delete test cases: ${errorMessage}`)
      }
    }

    const deleteTestcase = async (testcaseId) => {
      if (!confirm('Are you sure you want to delete this test case?')) {
        return
      }

      try {
        await testcaseApi.deleteTestCase(testcaseId)
        toast.success('Test case deleted successfully')
        await loadTestCases()
      } catch (error) {
        console.error('Error deleting test case:', error)
        const { formatErrorForDisplay } = require('@/utils/errorMessages')
        const errorMessage = formatErrorForDisplay(error, 'An error occurred')
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

    const clearFilters = () => {
      searchQuery.value = ''
      statusFilter.value = ''
      testTypeFilter.value = ''
      priorityFilter.value = ''
    }

    const handleSearch = () => {
      clearTimeout(window.searchTimeout)
      window.searchTimeout = setTimeout(() => {
        // Lưu reference đến input trước khi search
        const searchInput = document.querySelector('.search-input')

        pagination.value.currentPage = 1
        loadTestCases().finally(() => {
          // Khôi phục focus sau khi search hoàn thành
          if (searchInput) {
            searchInput.focus()
          }
        })
      }, 500)
    }

    const toggleSelectAll = () => {
      if (selectAll.value) {
        selectedTestCases.value = paginatedTestCases.value.map((tc) => tc._id)
      } else {
        selectedTestCases.value = []
      }
    }

    const setSort = (field) => {
      if (sortBy.value === field) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
      } else {
        sortBy.value = field
        sortOrder.value = 'asc'
      }
    }

    const goToPage = (page) => {
      if (page !== '...') {
        pagination.value.currentPage = page
      }
    }

    const previousPage = () => {
      if (pagination.value.currentPage > 1) {
        pagination.value.currentPage--
      }
    }

    const nextPage = () => {
      if (pagination.value.currentPage < pagination.value.totalPages) {
        pagination.value.currentPage++
      }
    }

    const handlePageSizeChange = () => {
      pagination.value.currentPage = 1
    }

    const handleVersionSelect = (versionId) => {
      // Chỉ Owner mới được phép select version
      if (!checkIsOwner(project.value)) {
        toast.warning('Only project owner can switch versions')
        return
      }
      
      const oldVersionId = selectedVersionId.value
      selectedVersionId.value = versionId
      // Lưu vào localStorage để đồng bộ
      saveSelectedVersion(project.value._id, versionId)
      
      // Emit socket event để các thành viên khác biết version đã được switch
      if (socket && socket.connected) {
        const userId = localStorage.getItem('userId')
        socket.emit('version_event', {
          type: 'VERSION_SWITCHED',
          projectId: project.value._id,
          userId: userId,
          toVersionId: versionId,
          fromVersionId: oldVersionId,
          timestamp: new Date(),
        })
        console.log('📡 Emitted VERSION_SWITCHED socket event')
      }
      
      loadAllData()
    }

    const handleVersionEvent = (event) => {
      const currentUserId = localStorage.getItem('userId')
      if (event.userId === currentUserId) return

      switch (event.type) {
        case 'VERSION_SWITCHED':
          handleRemoteVersionSwitched(event)
          break
        case 'VERSION_CREATED':
          handleRemoteVersionCreated(event)
          break
      }
    }

    const handleRemoteVersionSwitched = async (event) => {
      if (event.projectId !== project.value._id) return
      selectedVersionId.value = event.toVersionId
      saveSelectedVersion(project.value._id, event.toVersionId)
      await loadAllData()
      const version = versions.value.find((v) => v._id === event.toVersionId)
      if (version) {
        toast.info(`Version switched to: ${version.version_number || event.toVersionId}`)
      }
    }

    const handleRemoteVersionCreated = async (event) => {
      if (event.projectId !== project.value._id) return
      await fetchProjectData()
      if (event.version && (event.version.version_temporary === false || event.version.version_temporary === undefined)) {
        const exists = versions.value.find((v) => v._id === event.version._id)
        if (!exists) {
          versions.value.push(event.version)
        }
        selectedVersionId.value = event.version._id
        saveSelectedVersion(project.value._id, event.version._id)
        await loadAllData()
        toast.info(`New version created: ${event.version.version_number || event.version._id}`)
      }
    }

    /**
     * Xử lý khi version được approve thành công từ PreviewModal
     */
    const handleVersionApproved = async (event) => {
      // Chỉ xử lý nếu là project hiện tại
      if (!event || event.projectId !== project.value._id) {
        return
      }

      console.log('✅ Version approved event received:', event)

      const { versionId, version, newVersion } = event

      if (!versionId) {
        console.warn('⚠️ Invalid version-approved event: missing versionId', event)
        return
      }

      try {
        // Đợi một chút để backend cập nhật xong
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Refresh project data để lấy version mới
        await fetchProjectData()

        // Đảm bảo version mới có trong danh sách (thêm vào nếu chưa có)
        let newVersionObj = versions.value.find((v) => v._id === versionId)
        
        if (!newVersionObj) {
          // Nếu chưa có trong danh sách, thử fetch lại một lần nữa
          console.log('🔄 Version not found, fetching project data again...')
          await new Promise((resolve) => setTimeout(resolve, 500))
          await fetchProjectData()
          newVersionObj = versions.value.find((v) => v._id === versionId)
        }

        // Nếu vẫn chưa có và có version object từ event, thêm vào
        if (!newVersionObj && version) {
          // Chỉ thêm nếu version đã được approve (version_temporary = false)
          if (version.version_temporary === false || version.version_temporary === undefined) {
            versions.value.push(version)
            newVersionObj = version
            console.log('✅ Added new approved version to list:', versionId)
          }
        }

        // Force set selectedVersionId ngay cả khi chưa có trong danh sách
        // Vì version đã được approve rồi, nên chắc chắn sẽ có
        selectedVersionId.value = versionId

        // Lưu vào localStorage để đồng bộ với các trang khác
        saveSelectedVersion(project.value._id, versionId)

        // Refresh all data với version mới
        await loadAllData()

        // Thông báo cho user
        toast.success(`Switched to approved version: ${newVersion || versionId}`)
      } catch (error) {
        console.error('❌ Error handling version-approved event:', error)
        toast.error('Failed to switch to approved version')
      }
    }

    const navigateToUsecase = () => {
      if (project.value._id) {
        router.push({ name: 'Editor', params: { id: project.value._id } })
      }
    }

    const navigateToOutput = () => {
      if (project.value._id) {
        router.push({ name: 'OutputManagement', params: { id: project.value._id } })
      }
    }

    const goBack = () => {
      router.push('/dashboard')
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

    const loadAllData = async () => {
      loading.value = true
      try {
        await fetchProjectData()
        await fetchRequirements()
        await fetchDatabaseSchema()
        await loadTestCases()
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Failed to load project data')
      } finally {
        loading.value = false
      }
    }

    // Lifecycle
    onMounted(async () => {
      await loadAllData()
      
      // Listen for version-approved event from PreviewModal
      eventBus.on('version-approved', handleVersionApproved)
      
      // Init version socket listeners
      if (project.value._id && socket) {
        if (socket.connected) {
          socket.emit('join_project', project.value._id)
        }
        socket.on('version_event', handleVersionEvent)
        console.log('✅ Version socket listeners initialized for TestcaseManagement')
      }
    })

    onUnmounted(() => {
      cleanupSocketConnection()
      
      // Remove event listener
      eventBus.off('version-approved', handleVersionApproved)
      
      // Cleanup version socket listeners
      if (socket) {
        socket.off('version_event', handleVersionEvent)
      }
    })

    // Watchers
    watch(
      () => route.params.id,
      async (newId) => {
        if (newId) {
          await loadAllData()
        }
      }
    )

    watch(
      () => selectedVersionId.value,
      (newVersionId) => {
        if (newVersionId) {
          fetchRequirements()
          fetchDatabaseSchema()
          loadTestCases()
        }
      }
    )

    watch(selectedTestCases, (newSelection) => {
      selectAll.value =
        newSelection.length > 0 && newSelection.length === paginatedTestCases.value.length
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
      exportLoading,
      activeUsers,
      showExportPanel,

      // UI states
      showGenerateModal,
      showCreateModal,
      editingTestcase,
      viewingTestcase,
      executingTestcase,
      showSharingModal,

      // Filters and selection
      searchQuery,
      statusFilter,
      testTypeFilter,
      priorityFilter,
      sortBy,
      sortOrder,
      selectedTestCases,
      selectAll,

      // Export
      exportProgress,
      currentFilters,

      // Pagination
      pagination,
      paginatedTestCases,
      visiblePages,

      // Computed
      statistics,
      hasActiveFilters,
      coveragePercentage,

      //Export
      showExportModal,

      // Methods
      handleVersionSelect,
      navigateToUsecase,
      navigateToOutput,
      goBack,
      handleGenerateTestCases,
      handleSaveTestcase,
      executeTestcase,
      handleExecuteTestcase,
      bulkExecute,
      bulkDelete,
      deleteTestcase,
      viewTestcase,
      editTestcase,
      closeModal,
      loadTestCases,
      clearFilters,
      handleSearch,
      toggleSelectAll,
      setSort,
      goToPage,
      previousPage,
      nextPage,
      handlePageSizeChange,
      handleExport,
      cancelExport,
      formatDate,
      formatTestCaseTitle,
      getRequirementName,
      getStatusIcon,
      getTestcaseIndex,
    }
  },
}
</script>

<style scoped>
/* Giữ nguyên tất cả các styles từ phiên bản trước và thêm styles mới */

.export-panel-toggle {
  display: flex;
  justify-content: center;
  margin: 1rem 0;
}

.btn-text {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  padding: 0.5rem;
}

.btn-text:hover {
  color: var(--text-primary);
}

/* Các styles khác giữ nguyên từ phiên bản trước */
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

.header-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
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

.btn-secondary.success {
  background: var(--success-light);
  color: var(--success-color);
  border: 1px solid var(--success-color);
}

.btn-secondary.success:hover {
  background: var(--success-color);
  color: white;
}

.btn-secondary.warning {
  background: var(--warning-light);
  color: var(--warning-color);
  border: 1px solid var(--warning-color);
}

.btn-secondary.warning:hover {
  background: var(--warning-color);
  color: white;
}

.btn-secondary.danger {
  background: var(--error-light);
  color: var(--error-color);
  border: 1px solid var(--error-color);
}

.btn-secondary.danger:hover {
  background: var(--error-color);
  color: white;
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

.id-column {
  width: 60px;
  text-align: center;
  font-weight: 500;
  color: var(--text-secondary);
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

.requirements-column {
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

.testcase-row.row-even {
  background-color: #ffffff;
}

.testcase-row.row-odd {
  background-color: #f8fafc;
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

.testcase-id {
  font-weight: 500;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

/* Status Icons */
.status-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-icon {
  font-size: 1.5rem;
  border-radius: 50%;
}

.status-icon.passed {
  color: #10b981;
}

.status-icon.failed {
  color: #ef4444;
}

.status-icon.blocked {
  color: #f59e0b;
}

.status-icon.not_executed {
  color: #6b7280;
}

.status-icon.in_progress {
  color: #3b82f6;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

/* Badges */
.type-badge,
.priority-badge {
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

.requirement-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.requirement-tag {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: var(--primary-light);
  color: #1a365d;
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: 'Courier New', monospace;
}

.no-requirements {
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

/* Pagination Styles */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  background: white;
}

.pagination-info {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

.page-number {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  background: white;
  color: var(--text-primary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.page-number:hover {
  border-color: #1a365d;
  color: #1a365d;
}

.page-number.active {
  background: #1a365d;
  border-color: #1a365d;
  color: white;
}

.page-number:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-size-selector label {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.page-size-select {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: white;
  color: var(--text-primary);
  font-size: 0.875rem;
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

  .requirements-column {
    display: none;
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
    width: 90%;
  }

  .bulk-buttons {
    justify-content: center;
    flex-wrap: wrap;
  }

  .pagination {
    flex-direction: column;
    gap: 1rem;
  }

  .pagination-controls {
    order: -1;
  }

  .page-size-selector {
    order: 1;
  }
}
.export-section {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1.5rem;
  padding: 0 1.5rem;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: white;
  color: #1a365d;
  border: 1px solid #1a365d;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.export-btn:hover:not(:disabled) {
  background: #1a365d;
  color: white;
  transform: translateY(-1px);
}

.export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>