<template>
  <div class="testcase-management-view">

    <div class="testcase-content">
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
        v-if="showExportModal && project._id"
        :project-id="project._id"
        :version-id="selectedVersionId"
        :filters="currentFilters"
        :loading="exportLoading"
        :test-cases="testCases"
        :requirements="requirements"
        :selected-test-cases="selectedTestCases"
        @export="handleExport"
        @close="showExportModal = false"
        @clearFilters="clearFilters"
      />
      <div class="export-section">
        <div class="action-buttons-group">
          <button class="btn-secondary" @click="showGenerateModal = true" :disabled="loading">
            <span class="material-symbols-outlined">auto_awesome</span>
            Generate Test Cases
          </button>
          <button class="btn-primary" @click="showCreateModal = true" :disabled="loading">
            <span class="material-symbols-outlined">add</span>
            Create Manual
          </button>
          <button
            class="btn-secondary export-btn"
            @click="openExportModal"
            :disabled="loading || !project._id"
          >
            <span class="material-symbols-outlined">download</span>
            Export Test Cases
          </button>
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
              :disabled="loading"
            />
          </div>
          <div class="filter-icon-wrapper">
            <button 
              class="filter-icon-btn" 
              @click.stop="toggleStatusFilter"
              :title="getStatusFilterLabel()"
              :disabled="loading"
            >
              <span class="material-symbols-outlined">check_circle</span>
            </button>
            <div 
              v-if="showStatusFilter" 
              class="filter-dropdown-menu"
              @click.stop
            >
              <button 
                class="filter-option" 
                :class="{ active: statusFilter === '' }"
                @click="setStatusFilter('')"
              >
                <span class="material-symbols-outlined">filter_alt_off</span>
                All Status
              </button>
              <button 
                class="filter-option" 
                :class="{ active: statusFilter === 'passed' }"
                @click="setStatusFilter('passed')"
              >
                <span class="material-symbols-outlined">check_circle</span>
                Passed
              </button>
              <button 
                class="filter-option" 
                :class="{ active: statusFilter === 'failed' }"
                @click="setStatusFilter('failed')"
              >
                <span class="material-symbols-outlined">cancel</span>
                Failed
              </button>
              <button 
                class="filter-option" 
                :class="{ active: statusFilter === 'blocked' }"
                @click="setStatusFilter('blocked')"
              >
                <span class="material-symbols-outlined">block</span>
                Blocked
              </button>
              <button 
                class="filter-option" 
                :class="{ active: statusFilter === 'not_executed' }"
                @click="setStatusFilter('not_executed')"
              >
                <span class="material-symbols-outlined">schedule</span>
                Not Executed
              </button>
              <button 
                class="filter-option" 
                :class="{ active: statusFilter === 'in_progress' }"
                @click="setStatusFilter('in_progress')"
              >
                <span class="material-symbols-outlined">hourglass_empty</span>
                In Progress
              </button>
            </div>
          </div>
          <div class="filter-icon-wrapper">
            <button 
              class="filter-icon-btn" 
              @click.stop="toggleTypeFilter"
              :title="getTypeFilterLabel()"
              :disabled="loading"
            >
              <span class="material-symbols-outlined">category</span>
            </button>
            <div 
              v-if="showTypeFilter" 
              class="filter-dropdown-menu"
              @click.stop
            >
              <button 
                class="filter-option" 
                :class="{ active: testTypeFilter === '' }"
                @click="setTypeFilter('')"
              >
                <span class="material-symbols-outlined">filter_alt_off</span>
                All Types
              </button>
              <button 
                class="filter-option" 
                :class="{ active: testTypeFilter === 'unit' }"
                @click="setTypeFilter('unit')"
              >
                <span class="material-symbols-outlined">science</span>
                Unit
              </button>
              <button 
                class="filter-option" 
                :class="{ active: testTypeFilter === 'integration' }"
                @click="setTypeFilter('integration')"
              >
                <span class="material-symbols-outlined">hub</span>
                Integration
              </button>
              <button 
                class="filter-option" 
                :class="{ active: testTypeFilter === 'api' }"
                @click="setTypeFilter('api')"
              >
                <span class="material-symbols-outlined">api</span>
                API
              </button>
              <button 
                class="filter-option" 
                :class="{ active: testTypeFilter === 'ui' }"
                @click="setTypeFilter('ui')"
              >
                <span class="material-symbols-outlined">web</span>
                UI
              </button>
              <button 
                class="filter-option" 
                :class="{ active: testTypeFilter === 'performance' }"
                @click="setTypeFilter('performance')"
              >
                <span class="material-symbols-outlined">speed</span>
                Performance
              </button>
              <button 
                class="filter-option" 
                :class="{ active: testTypeFilter === 'security' }"
                @click="setTypeFilter('security')"
              >
                <span class="material-symbols-outlined">security</span>
                Security
              </button>
            </div>
          </div>
          <div class="filter-icon-wrapper">
            <button 
              class="filter-icon-btn" 
              @click.stop="togglePriorityFilter"
              :title="getPriorityFilterLabel()"
              :disabled="loading"
            >
              <span class="material-symbols-outlined">priority_high</span>
            </button>
            <div 
              v-if="showPriorityFilter" 
              class="filter-dropdown-menu"
              @click.stop
            >
              <button 
                class="filter-option" 
                :class="{ active: priorityFilter === '' }"
                @click="setPriorityFilter('')"
              >
                <span class="material-symbols-outlined">filter_alt_off</span>
                All Priorities
              </button>
              <button 
                class="filter-option" 
                :class="{ active: priorityFilter === 'critical' }"
                @click="setPriorityFilter('critical')"
              >
                <span class="material-symbols-outlined">error</span>
                Critical
              </button>
              <button 
                class="filter-option" 
                :class="{ active: priorityFilter === 'high' }"
                @click="setPriorityFilter('high')"
              >
                <span class="material-symbols-outlined">priority_high</span>
                High
              </button>
              <button 
                class="filter-option" 
                :class="{ active: priorityFilter === 'medium' }"
                @click="setPriorityFilter('medium')"
              >
                <span class="material-symbols-outlined">remove</span>
                Medium
              </button>
              <button 
                class="filter-option" 
                :class="{ active: priorityFilter === 'low' }"
                @click="setPriorityFilter('low')"
              >
                <span class="material-symbols-outlined">arrow_downward</span>
                Low
              </button>
            </div>
          </div>
          <button class="btn-secondary clear-filters" @click="clearFilters" :disabled="loading">
            <span class="material-symbols-outlined">clear_all</span>
            Clear
          </button>
        </div>
        <div class="view-actions">
          <!-- Column Visibility Toggle -->
          <div class="column-visibility-menu">
            <button class="btn-icon" @click="showColumnMenu = !showColumnMenu" title="Column Options">
              <span class="material-symbols-outlined">view_column</span>
            </button>
            <div v-if="showColumnMenu" class="column-menu-dropdown" @click.stop>
              <div class="column-menu-header">
                <h4>Show/Hide Columns</h4>
                <button class="btn-close-menu" @click="showColumnMenu = false">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
              <div class="column-menu-content">
                <label
                  v-for="column in columnOptions"
                  :key="column.key"
                  class="column-menu-item"
                  :class="{ disabled: column.required }"
                >
                  <input
                    type="checkbox"
                    :checked="visibleColumns[column.key]"
                    :disabled="column.required"
                    @change="toggleColumn(column.key)"
                  />
                  <span class="column-label">{{ column.label }}</span>
                  <span v-if="column.required" class="required-badge">Required</span>
                </label>
              </div>
              <div class="column-menu-footer">
                <button class="btn-reset-columns" @click="resetColumns">Reset to Default</button>
              </div>
            </div>
          </div>
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
                <th v-if="visibleColumns.type" class="type-column">Type</th>
                <th v-if="visibleColumns.priority" class="priority-column">Priority</th>
                <th class="status-column">Status</th>
                <th v-if="visibleColumns.database_tables" class="tables-column">Database Tables</th>
                <th v-if="visibleColumns.requirements" class="requirements-column">Requirements</th>
                <th v-if="visibleColumns.last_executed" class="date-column">Last Executed</th>
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
                <td v-if="visibleColumns.type" class="type-column">
                  <span class="type-badge" :class="testcase.test_type || 'integration'">
                    {{ testcase.test_type || 'integration' }}
                  </span>
                </td>
                <td v-if="visibleColumns.priority" class="priority-column">
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
                <td v-if="visibleColumns.database_tables" class="tables-column">
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
                <td v-if="visibleColumns.requirements" class="requirements-column">
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
                <td v-if="visibleColumns.last_executed" class="date-column">
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
import axiosClient from '@/utils/axiosClient'
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
    const showColumnMenu = ref(false)

    // Column visibility
    const columnOptions = [
      { key: 'type', label: 'Type', required: false },
      { key: 'priority', label: 'Priority', required: false },
      { key: 'database_tables', label: 'Database Tables', required: false },
      { key: 'requirements', label: 'Requirements', required: false },
      { key: 'last_executed', label: 'Last Executed', required: false },
    ]

    const defaultVisibleColumns = {
      type: true,
      priority: true,
      database_tables: true,
      requirements: true,
      last_executed: true,
    }

    // Load column visibility function (must be defined before use)
    const loadColumnVisibility = () => {
      try {
        const saved = localStorage.getItem('testcaseColumnVisibility')
        if (saved) {
          const parsed = JSON.parse(saved)
          // Merge with defaults to ensure all keys exist
          return { ...defaultVisibleColumns, ...parsed }
        }
      } catch (error) {
        console.error('Error loading column visibility:', error)
      }
      return { ...defaultVisibleColumns }
    }

    const visibleColumns = ref(loadColumnVisibility())

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
    
    // Filter dropdown states
    const showStatusFilter = ref(false)
    const showTypeFilter = ref(false)
    const showPriorityFilter = ref(false)

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

        // Check if custom sheets and fields are provided
        if (exportConfig.sheets && exportConfig.fields) {
          // Custom export with sheets and fields - use POST request
          try {
            const response = await axiosClient.post(
              `/api/testcases/projects/${project.value._id}/export-excel`,
              {
                versionId: exportConfig.options.versionId,
                sheets: exportConfig.sheets,
                fields: exportConfig.fields,
                ...exportConfig.options,
              },
              {
                responseType: 'blob',
              }
            )

            // Download the file
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `testcases-${project.value._id}-${Date.now()}.xlsx`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
          } catch (error) {
            throw error
          }
        } else {
          // Default export - use GET request
          const exportParams = {
            ...exportConfig.options,
          }

          // Handle different selection modes
          if (exportConfig.selectionMode === 'selected' && exportConfig.options.testCaseIds) {
            exportParams.testCaseIds = exportConfig.options.testCaseIds
          } else if (exportConfig.selectionMode === 'usecase' && exportConfig.options.requirementIds) {
            exportParams.requirementIds = exportConfig.options.requirementIds
          }

          const result = await testcaseApi.handleExcelExport(
            testcaseApi.exportTestCasesToExcel,
            project.value._id,
            exportParams,
            `testcases-${project.value._id}-${Date.now()}.xlsx`
          )
        }

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

    const handleGenerateTestCases = async (savedTestCases) => {
      // ✅ MỚI: Test cases đã được save vào DB từ backend, chỉ cần refresh
      console.log('✅ Test cases generation completed, refreshing list...')
      
      // Đóng modal trước khi refresh để UX mượt hơn
      showGenerateModal.value = false
      
      // Refresh test cases list (đã có loading state trong loadTestCases)
      await loadTestCases()
      
      // Toast đã được hiển thị trong modal, không cần hiển thị lại
      // Chỉ log để debug
      const count = savedTestCases?.length || 0
      if (count > 0) {
        console.log(`✅ Refreshed ${count} new test cases`)
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
      showStatusFilter.value = false
      showTypeFilter.value = false
      showPriorityFilter.value = false
    }
    
    // Filter dropdown methods
    const toggleStatusFilter = () => {
      showStatusFilter.value = !showStatusFilter.value
      showTypeFilter.value = false
      showPriorityFilter.value = false
    }
    const toggleTypeFilter = () => {
      showTypeFilter.value = !showTypeFilter.value
      showStatusFilter.value = false
      showPriorityFilter.value = false
    }
    const togglePriorityFilter = () => {
      showPriorityFilter.value = !showPriorityFilter.value
      showStatusFilter.value = false
      showTypeFilter.value = false
    }
    const setStatusFilter = (value) => {
      statusFilter.value = value
      showStatusFilter.value = false
      loadTestCases()
    }
    const setTypeFilter = (value) => {
      testTypeFilter.value = value
      showTypeFilter.value = false
      loadTestCases()
    }
    const setPriorityFilter = (value) => {
      priorityFilter.value = value
      showPriorityFilter.value = false
      loadTestCases()
    }
    const getStatusFilterLabel = () => {
      if (statusFilter.value === '') return 'All Status'
      const labels = {
        passed: 'Passed',
        failed: 'Failed',
        blocked: 'Blocked',
        not_executed: 'Not Executed',
        in_progress: 'In Progress',
      }
      return labels[statusFilter.value] || 'All Status'
    }
    const getTypeFilterLabel = () => {
      if (testTypeFilter.value === '') return 'All Types'
      return testTypeFilter.value.charAt(0).toUpperCase() + testTypeFilter.value.slice(1)
    }
    const getPriorityFilterLabel = () => {
      if (priorityFilter.value === '') return 'All Priorities'
      return priorityFilter.value.charAt(0).toUpperCase() + priorityFilter.value.slice(1)
    }
    const handleClickOutsideFilters = (event) => {
      if (!event.target.closest('.filter-icon-wrapper')) {
        showStatusFilter.value = false
        showTypeFilter.value = false
        showPriorityFilter.value = false
      }
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

    const navigateToLog = () => {
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

    const openExportModal = () => {
      if (!project.value._id) {
        toast.warning('Please wait for project data to load')
        return
      }
      showExportModal.value = true
    }

    // Column visibility methods
    const saveColumnVisibility = () => {
      try {
        localStorage.setItem('testcaseColumnVisibility', JSON.stringify(visibleColumns.value))
      } catch (error) {
        console.error('Error saving column visibility:', error)
      }
    }

    const toggleColumn = (columnKey) => {
      if (visibleColumns.value[columnKey] !== undefined) {
        visibleColumns.value[columnKey] = !visibleColumns.value[columnKey]
        saveColumnVisibility()
      }
    }

    const resetColumns = () => {
      visibleColumns.value = { ...defaultVisibleColumns }
      saveColumnVisibility()
      toast.info('Column visibility reset to default')
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

    // Close column menu when clicking outside
    const handleClickOutsideColumnMenu = (event) => {
      if (showColumnMenu.value && !event.target.closest('.column-visibility-menu')) {
        showColumnMenu.value = false
      }
    }

    // ✅ Handle testcase socket events để tự refresh khi có testcase mới
    const handleTestcaseEvent = (event) => {
      console.log('📥 [TestcaseManagement] Received testcase event:', event.type, event)
      
      // Chỉ xử lý nếu cùng versionId
      if (event.versionId && event.versionId !== selectedVersionId.value) {
        console.log('⚠️ [TestcaseManagement] Event versionId mismatch, ignoring:', event.versionId, 'vs', selectedVersionId.value)
        return
      }
      
      // Nếu testcase generation hoàn thành (completed hoặc DONE), refresh list
      if (event.type === 'TESTCASE_PROGRESS') {
        // Kiểm tra nếu đã hoàn thành (stage = completed hoặc agentState = DONE hoặc progress = 100 và không processing)
        const isCompleted = event.stage === 'completed' || 
                           event.agentState === 'DONE' || 
                           (!event.isProcessing && event.progress >= 100) ||
                           (event.message && event.message.includes('Hoàn thành'))
        
        if (isCompleted) {
          console.log('✅ [TestcaseManagement] Testcase generation completed, refreshing list...')
          // Delay một chút để đảm bảo backend đã save xong
          setTimeout(() => {
            loadTestCases()
          }, 1500)
        }
      } else if (event.type === 'ESTIMATE_RECEIVED') {
        // Khi nhận estimate, không cần refresh nhưng có thể log
        console.log('📊 [TestcaseManagement] Estimate received:', event.estimate)
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
        // ✅ Thêm listener cho testcase events
        socket.on('testcase_event', handleTestcaseEvent)
        console.log('✅ Version socket listeners initialized for TestcaseManagement')
      }

      // Add click outside listener for column menu
      document.addEventListener('click', handleClickOutsideColumnMenu)
      // Add click outside listener for filter dropdowns
      document.addEventListener('click', handleClickOutsideFilters)
    })

    onUnmounted(() => {
      cleanupSocketConnection()
      
      // Remove event listener
      eventBus.off('version-approved', handleVersionApproved)
      
      // Cleanup version socket listeners
      if (socket) {
        socket.off('version_event', handleVersionEvent)
        // ✅ Cleanup testcase event listener
        socket.off('testcase_event', handleTestcaseEvent)
      }

      // Remove click outside listener
      document.removeEventListener('click', handleClickOutsideColumnMenu)
      document.removeEventListener('click', handleClickOutsideFilters)
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
      showStatusFilter,
      showTypeFilter,
      showPriorityFilter,

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

      // Column visibility
      showColumnMenu,
      visibleColumns,
      columnOptions,

      // Methods
      handleVersionSelect,
      navigateToUsecase,
      navigateToLog,
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
      toggleStatusFilter,
      toggleTypeFilter,
      togglePriorityFilter,
      setStatusFilter,
      setTypeFilter,
      setPriorityFilter,
      getStatusFilterLabel,
      getTypeFilterLabel,
      getPriorityFilterLabel,
      handleClickOutsideFilters,
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
      toggleColumn,
      resetColumns,
      openExportModal,
      handleTestcaseEvent, // ✅ Export handleTestcaseEvent để có thể cleanup
    }
  },
}
</script>

<style scoped>
/* Modern UI Styles */
.testcase-management-view {
  padding: 30px;
  min-height: 100vh;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%);
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

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
  transition: all 0.2s ease;
}

.btn-text:hover {
  color: var(--text-primary);
  transform: translateY(-1px);
}


.testcase-content {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
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
  background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(26, 54, 93, 0.25);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #2d4a7c 0%, #1a365d 100%);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(26, 54, 93, 0.35);
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
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, rgba(26, 54, 93, 0.3), transparent);
  transform: translateX(-100%);
  transition: transform 0.5s ease;
}

.stat-card:hover::before {
  transform: translateX(100%);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(26, 54, 93, 0.2);
  border-color: rgba(26, 54, 93, 0.2);
}

.stat-card.total {
  border-left: 4px solid #3b82f6;
  background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
}

.stat-card.passed {
  border-left: 4px solid #10b981;
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
}

.stat-card.failed {
  border-left: 4px solid #ef4444;
  background: linear-gradient(135deg, #ffffff 0%, #fef2f2 100%);
}

.stat-card.pending {
  border-left: 4px solid #f59e0b;
  background: linear-gradient(135deg, #ffffff 0%, #fffbeb 100%);
}

.stat-card.coverage {
  border-left: 4px solid #8b5cf6;
  background: linear-gradient(135deg, #ffffff 0%, #faf5ff 100%);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.stat-icon::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.stat-card:hover .stat-icon {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.stat-card:hover .stat-icon::before {
  opacity: 1;
}

.stat-card.total .stat-icon {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.stat-card.passed .stat-icon {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.stat-card.failed .stat-icon {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.stat-card.pending .stat-icon {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.stat-card.coverage .stat-icon {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
}

.stat-info h3 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 4px;
  background: linear-gradient(135deg, #1a365d 0%, #2d4a8a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(26, 54, 93, 0.12);
  transition: box-shadow 0.3s ease;
}

.filters-section:hover {
  box-shadow: 0 8px 30px rgba(26, 54, 93, 0.15);
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
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.875rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.search-input:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 4px rgba(26, 54, 93, 0.1), 0 4px 12px rgba(26, 54, 93, 0.15);
  transform: translateY(-1px);
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

/* Filter Icon Buttons */
.filter-icon-wrapper {
  position: relative;
  display: inline-block;
}

.filter-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 40px;
  height: 40px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-icon-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(26, 54, 93, 0.1), transparent);
  transition: left 0.5s;
}

.filter-icon-btn:hover:not(:disabled)::before {
  left: 100%;
}

.filter-icon-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-color: #1a365d;
  color: #1a365d;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(26, 54, 93, 0.15);
}

.filter-icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.filter-icon-btn .material-symbols-outlined {
  font-size: 20px;
}

.filter-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  min-width: 180px;
  max-width: 300px;
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  border-left: 3px solid transparent;
}

.filter-option::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: linear-gradient(135deg, rgba(26, 54, 93, 0.1) 0%, rgba(45, 74, 138, 0.1) 100%);
  transition: width 0.3s ease;
}

.filter-option:hover::before {
  width: 100%;
}

.filter-option:hover {
  background: linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%);
  padding-left: 20px;
}

.filter-option.active {
  background: linear-gradient(90deg, #e6f2ff 0%, #dbeafe 100%);
  color: #1a365d;
  font-weight: 600;
  border-left-color: #1a365d;
  padding-left: 20px;
}

.filter-option .material-symbols-outlined {
  font-size: 18px;
  color: #6b7280;
}

.filter-option.active .material-symbols-outlined {
  color: #1a365d;
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
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(26, 54, 93, 0.12);
  transition: box-shadow 0.3s ease;
}

.sorting-section:hover {
  box-shadow: 0 8px 30px rgba(26, 54, 93, 0.15);
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
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  color: #1a365d;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.sort-option:hover {
  border-color: #1a365d;
  color: #1a365d;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(26, 54, 93, 0.15);
}

.sort-option.active {
  background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%);
  border-color: #1a365d;
  color: white;
  box-shadow: 0 4px 12px rgba(26, 54, 93, 0.25);
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
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(26, 54, 93, 0.12);
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.testcases-table:hover {
  box-shadow: 0 8px 30px rgba(26, 54, 93, 0.15);
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
  position: relative;
}

td {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  position: relative;
}

.checkbox-column {
  width: 50px;
  min-width: 50px;
  text-align: center;
  padding: 1rem 0.5rem;
}

.id-column {
  width: 70px;
  min-width: 70px;
  text-align: center;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 1rem 0.5rem;
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
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.testcase-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: linear-gradient(135deg, rgba(26, 54, 93, 0.1) 0%, rgba(45, 74, 138, 0.1) 100%);
  transition: width 0.3s ease;
}

.testcase-row:hover::before {
  width: 4px;
}

.testcase-row.row-even {
  background-color: #ffffff;
}

.testcase-row.row-odd {
  background-color: #f8fafc;
}

.testcase-row:hover {
  background: linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%);
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.1);
}

.testcase-row.selected {
  background: linear-gradient(90deg, #e6f2ff 0%, #dbeafe 100%);
  border-left: 4px solid #1a365d;
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
  padding: 0.375rem 0.875rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.type-badge:hover,
.priority-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
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
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  animation: float 3s ease-in-out infinite;
  position: relative;
}

.empty-state .material-symbols-outlined::before {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1a365d, #2d4a8a);
  opacity: 0.1;
  z-index: -1;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.2;
  }
}

.empty-state h3 {
  font-size: 1.25rem;
  background: linear-gradient(135deg, #1a365d 0%, #2d4a8a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.5rem 0;
  font-weight: 700;
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
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  padding: 1rem 1.5rem;
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(26, 54, 93, 0.25);
  border: 2px solid #1a365d;
  width: 70%;
  max-width: 800px;
  z-index: 1000;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
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
  border-top: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
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
  border: 1.5px solid #e2e8f0;
  background: white;
  color: var(--text-primary);
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.page-number:hover {
  border-color: #1a365d;
  color: #1a365d;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(26, 54, 93, 0.15);
}

.page-number.active {
  background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%);
  border-color: #1a365d;
  color: white;
  box-shadow: 0 4px 12px rgba(26, 54, 93, 0.25);
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

  .action-buttons-group {
    flex-direction: column;
    align-items: stretch;
  }

  .action-buttons-group .btn-primary,
  .action-buttons-group .btn-secondary {
    width: 100%;
    justify-content: center;
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
  padding: 1.5rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(26, 54, 93, 0.12);
  transition: box-shadow 0.3s ease;
}

.export-section:hover {
  box-shadow: 0 8px 30px rgba(26, 54, 93, 0.15);
}

.action-buttons-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-end;
  width: 100%;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: white;
  color: #1a365d;
  border: 1.5px solid #1a365d;
  border-radius: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.15);
}

.export-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(26, 54, 93, 0.3);
}

.export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Column Visibility Menu */
.column-visibility-menu {
  position: relative;
}

.column-menu-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--border-color);
  min-width: 280px;
  z-index: 1000;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.column-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.column-menu-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-close-menu {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-close-menu:hover {
  background: var(--background-color);
  color: var(--text-primary);
}

.column-menu-content {
  padding: 8px 0;
  max-height: 300px;
  overflow-y: auto;
}

.column-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
}

.column-menu-item:hover:not(.disabled) {
  background: var(--background-color);
}

.column-menu-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.column-menu-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #1a365d;
}

.column-menu-item.disabled input[type="checkbox"] {
  cursor: not-allowed;
}

.column-label {
  flex: 1;
  font-size: 0.875rem;
  color: var(--text-primary);
  font-weight: 500;
}

.required-badge {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-style: italic;
}

.column-menu-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border-color);
}

.btn-reset-columns {
  width: 100%;
  padding: 8px 16px;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset-columns:hover {
  background: var(--border-color);
  border-color: #1a365d;
  color: #1a365d;
}
</style>