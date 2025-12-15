<template>
  <div class="log-management-view">

    <!-- Log Management Content -->
    <div class="log-content">
      <!-- Main Content -->
      <div class="main-content">
        <!-- Log Cards Grid -->
        

        <!-- Enhanced Activity Logs Section -->
        <div class="activity-logs-section">
          <div class="section-header">
            <h3>Activity Logs</h3>
            <div class="controls-header">
              <!-- Compact Filter Controls -->
              <div class="compact-filter-controls">
                <div class="filter-select-group">
                  <div class="filter-icon-wrapper">
                    <button 
                      class="filter-icon-btn-compact" 
                      @click.stop="toggleTypeFilter"
                      :title="getTypeFilterLabel()"
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
                        :class="{ active: filters.type === 'all' }"
                        @click="setTypeFilter('all')"
                      >
                        <span class="material-symbols-outlined">filter_alt_off</span>
                        All Types
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: filters.type === 'testcase' }"
                        @click="setTypeFilter('testcase')"
                      >
                        <span class="material-symbols-outlined">play_arrow</span>
                        Test Cases
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: filters.type === 'database' }"
                        @click="setTypeFilter('database')"
                      >
                        <span class="material-symbols-outlined">storage</span>
                        Database
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: filters.type === 'uml' }"
                        @click="setTypeFilter('uml')"
                      >
                        <span class="material-symbols-outlined">schema</span>
                        UML Diagrams
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: filters.type === 'version' }"
                        @click="setTypeFilter('version')"
                      >
                        <span class="material-symbols-outlined">history</span>
                        Versions
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: filters.type === 'project' }"
                        @click="setTypeFilter('project')"
                      >
                        <span class="material-symbols-outlined">folder</span>
                        Projects
                      </button>
                    </div>
                  </div>
                  <div class="filter-icon-wrapper">
                    <button 
                      class="filter-icon-btn-compact" 
                      @click.stop="toggleActionFilter"
                      :title="getActionFilterLabel()"
                    >
                      <span class="material-symbols-outlined">tune</span>
                    </button>
                    <div 
                      v-if="showActionFilter" 
                      class="filter-dropdown-menu"
                      @click.stop
                    >
                      <button 
                        class="filter-option" 
                        :class="{ active: filters.action === 'all' }"
                        @click="setActionFilter('all')"
                      >
                        <span class="material-symbols-outlined">filter_alt_off</span>
                        All Actions
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: filters.action === 'create' }"
                        @click="setActionFilter('create')"
                      >
                        <span class="material-symbols-outlined">add</span>
                        Create
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: filters.action === 'update' }"
                        @click="setActionFilter('update')"
                      >
                        <span class="material-symbols-outlined">edit</span>
                        Update
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: filters.action === 'delete' }"
                        @click="setActionFilter('delete')"
                      >
                        <span class="material-symbols-outlined">delete</span>
                        Delete
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: filters.action === 'execute' }"
                        @click="setActionFilter('execute')"
                      >
                        <span class="material-symbols-outlined">play_arrow</span>
                        Execute
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: filters.action === 'export' }"
                        @click="setActionFilter('export')"
                      >
                        <span class="material-symbols-outlined">download</span>
                        Export
                      </button>
                    </div>
                  </div>
                  <div class="filter-icon-wrapper">
                    <button 
                      class="filter-icon-btn-compact" 
                      @click.stop="toggleUserFilter"
                      :title="getUserFilterLabel()"
                    >
                      <span class="material-symbols-outlined">person</span>
                    </button>
                    <div 
                      v-if="showUserFilter" 
                      class="filter-dropdown-menu"
                      @click.stop
                    >
                      <button 
                        class="filter-option" 
                        :class="{ active: filters.user === 'all' }"
                        @click="setUserFilter('all')"
                      >
                        <span class="material-symbols-outlined">filter_alt_off</span>
                        All Users
                      </button>
                      <button 
                        v-for="user in uniqueUsers" 
                        :key="user"
                        class="filter-option" 
                        :class="{ active: filters.user === user }"
                        @click="setUserFilter(user)"
                      >
                        <span class="material-symbols-outlined">account_circle</span>
                        {{ user }}
                      </button>
                    </div>
                  </div>
                  <button
                    @click="clearFilters"
                    class="clear-filters-button"
                    v-if="hasActiveFilters"
                  >
                    <span class="material-symbols-outlined">clear_all</span>
                  </button>
                </div>

                <!-- Combined Search and Refresh -->
                <div class="search-refresh-group">
                  <div class="search-input compact">
                    <span class="material-symbols-outlined">search</span>
                    <input
                      v-model="searchQuery"
                      @input="debouncedSearch"
                      placeholder="Search logs..."
                      type="text"
                    />
                  </div>

                  <button
                    @click="refreshActivities"
                    class="refresh-button compact"
                    :disabled="refreshing"
                  >
                    <span class="material-symbols-outlined" :class="{ spinning: refreshing }"
                      >refresh</span
                    >
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Logs Container with Loading State -->
          <div class="logs-container-wrapper">
            <!-- Loading State for Logs Only -->
            <div v-if="logsLoading" class="logs-loading-container">
              <div class="loading-spinner small"></div>
              <p>Loading activity logs...</p>
            </div>

            <!-- Error State for Logs Only -->
            <div v-else-if="logsError" class="logs-error-container">
              <span class="material-symbols-outlined">error</span>
              <p>{{ logsError }}</p>
              <button @click="loadRecentActivities" class="retry-button">Retry</button>
            </div>

            <!-- Logs Content -->
            <div v-else class="logs-container">
              <!-- Empty State -->
              <div v-if="filteredActivities.length === 0" class="empty-logs">
                <div class="empty-icon">
                  <span class="material-symbols-outlined">inbox</span>
                </div>
                <h3>Không có log nào</h3>
                <p v-if="hasActiveFilters">
                  Không tìm thấy log phù hợp với bộ lọc hiện tại
                </p>
                <p v-else>
                  Chưa có hoạt động nào được ghi lại
                </p>
                <div class="empty-actions">
                  <button @click="clearFilters" class="retry-button" v-if="hasActiveFilters">
                    <span class="material-symbols-outlined">clear_all</span>
                    Xóa bộ lọc
                  </button>
                  <button @click="refreshActivities" class="retry-button" v-else>
                    <span class="material-symbols-outlined">refresh</span>
                    Làm mới
                  </button>
                </div>
              </div>

              <!-- Logs List -->
              <div v-else class="logs-list">
                <div
                  v-for="activity in paginatedActivities"
                  :key="activity._id"
                  class="log-item"
                  :class="[
                    getActivityType(activity),
                    getActionType(activity),
                    { highlighted: isHighlighted(activity) },
                  ]"
                >
                  <div class="log-icon" :class="getActivityType(activity)">
                    <span class="material-symbols-outlined">{{ getActivityIcon(activity) }}</span>
                  </div>

                  <div class="log-content">
                    <div class="log-header">
                      <div class="log-user-info">
                        <div 
                          class="user-avatar-small"
                          :title="activity.user_id?.name || 'System'"
                        >
                          <img
                            v-if="activity.user_id?.avatar_url"
                            :src="activity.user_id.avatar_url"
                            :alt="activity.user_id.name"
                            @error="(e) => (e.target.style.display = 'none')"
                          />
                          <span v-else class="material-symbols-outlined">person</span>
                        </div>
                        <span class="log-user-name">{{ activity.user_id?.name || 'System' }}</span>
                        <span v-if="activity.performed_by_ai" class="ai-badge" title="Performed by AI">
                          <span class="material-symbols-outlined">smart_toy</span>
                          AI
                        </span>
                      </div>
                      <div class="log-action-badges">
                        <span class="log-action-badge">{{ formatAction(activity.action) }}</span>
                        <span class="log-target-badge">{{ formatTarget(activity.target_type) }}</span>
                        <span v-if="activity.version_number" class="log-version-badge" :title="`Version ${activity.version_number}`">
                          <span class="material-symbols-outlined">history</span>
                          v{{ activity.version_number }}
                        </span>
                      </div>
                    </div>

                    <div class="log-message">
                      <span v-html="highlightKeywords(formatActivityText(activity))"></span>
                    </div>

                    <div class="log-meta">
                      <div class="log-meta-left">
                        <span class="log-time" :title="formatFullTime(activity.created_at)">
                          <span class="material-symbols-outlined">schedule</span>
                          {{ formatTime(activity.created_at) }}
                        </span>
                        <span v-if="activity.affects_requirement" class="log-requirement-badge" title="Affects requirements">
                          <span class="material-symbols-outlined">description</span>
                          Requirement
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pagination -->
            <div v-if="filteredActivities.length > 0 && !logsLoading" class="pagination-controls">
              <div class="pagination-info">
                Showing {{ pagination.startIndex + 1 }}-{{ pagination.endIndex }} of
                {{ filteredActivities.length }} logs
              </div>

              <div class="pagination-buttons">
                <button
                  @click="prevPage"
                  :disabled="pagination.currentPage === 1"
                  class="pagination-btn"
                >
                  <span class="material-symbols-outlined">chevron_left</span>
                </button>

                <div class="page-numbers">
                  <button
                    v-for="page in visiblePages"
                    :key="page"
                    @click="goToPage(page)"
                    :class="{ active: page === pagination.currentPage }"
                    class="page-btn"
                  >
                    {{ page }}
                  </button>
                </div>

                <button
                  @click="nextPage"
                  :disabled="pagination.currentPage === pagination.totalPages"
                  class="pagination-btn"
                >
                  <span class="material-symbols-outlined">chevron_right</span>
                </button>
              </div>

              <div class="page-size-selector">
                <label>Show:</label>
                <select v-model="pagination.pageSize" @change="updatePagination">
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getProjectDetail } from '@/api/project'
import { getTestStatistics } from '@/api/testcase'
import { getDatabasesByVersion } from '@/api/project'
import { getProjectLogs } from '@/api/output'
import { useToast } from 'vue-toastification'
import { useActiveMembers } from '@/utils/useActiveMembers'
import {
  saveSelectedVersion,
  getSelectedOrDefaultVersion,
  filterApprovedVersions,
  isOwner as checkIsOwner,
} from '@/utils/versionSync'
import eventBus from '@/utils/eventBus'
import { socket } from '@/utils/socket'

export default {
  name: 'OutputManagement',
  components: {
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
        coverage: 0,
      },
      databaseStats: {
        tables: 0,
        relationships: 0,
        columns: 0,
      },
      umlStats: {
        usecase: 0,
        activity: 0,
        sequence: 0,
      },

      // Activity logs
      recentActivities: [],
      logsLoading: false,
      logsError: null,
      refreshing: false,

      // Enhanced logging system
      filters: {
        type: 'all',
        action: 'all',
        user: 'all',
      },
      showTypeFilter: false,
      showActionFilter: false,
      showUserFilter: false,
      searchQuery: '',
      searchTimeout: null,

      pagination: {
        currentPage: 1,
        pageSize: 10,
        totalPages: 0,
        startIndex: 0,
        endIndex: 0,
      },

      toast: useToast(),
      isRetrying: false,
    }
  },
  computed: {
    // Get unique users from activities
    uniqueUsers() {
      const users = new Set()
      this.recentActivities.forEach((activity) => {
        if (activity.user_id?.name) {
          users.add(activity.user_id.name)
        }
      })
      return Array.from(users)
    },

    // Check if any filters are active
    hasActiveFilters() {
      return (
        this.filters.type !== 'all' ||
        this.filters.action !== 'all' ||
        this.filters.user !== 'all' ||
        this.searchQuery !== ''
      )
    },

    // Filter activities based on current filters and search
    filteredActivities() {
      let filtered = this.recentActivities

      // Apply type filter
      if (this.filters.type !== 'all') {
        filtered = filtered.filter(
          (activity) => this.getActivityType(activity) === this.filters.type
        )
      }

      // Apply action filter
      if (this.filters.action !== 'all') {
        filtered = filtered.filter((activity) => activity.action.includes(this.filters.action))
      }

      // Apply user filter
      if (this.filters.user !== 'all') {
        filtered = filtered.filter((activity) => activity.user_id?.name === this.filters.user)
      }

      // Apply search filter
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter((activity) => {
          const text = this.formatActivityText(activity).toLowerCase()
          const user = activity.user_id?.name?.toLowerCase() || ''
          const action = activity.action.toLowerCase()
          const target = activity.target_type?.toLowerCase() || ''
          return (
            text.includes(query) ||
            user.includes(query) ||
            action.includes(query) ||
            target.includes(query)
          )
        })
      }

      return filtered
    },

    // Paginated activities
    paginatedActivities() {
      const start = (this.pagination.currentPage - 1) * this.pagination.pageSize
      const end = start + parseInt(this.pagination.pageSize)
      return this.filteredActivities.slice(start, end)
    },

    // Calculate visible pages for pagination
    visiblePages() {
      const pages = []
      const total = this.pagination.totalPages
      const current = this.pagination.currentPage

      if (total <= 7) {
        for (let i = 1; i <= total; i++) pages.push(i)
      } else {
        if (current <= 4) {
          for (let i = 1; i <= 5; i++) pages.push(i)
          pages.push('...')
          pages.push(total)
        } else if (current >= total - 3) {
          pages.push(1)
          pages.push('...')
          for (let i = total - 4; i <= total; i++) pages.push(i)
        } else {
          pages.push(1)
          pages.push('...')
          for (let i = current - 1; i <= current + 1; i++) pages.push(i)
          pages.push('...')
          pages.push(total)
        }
      }

      return pages
    },
  },
  watch: {
    filteredActivities: {
      handler() {
        this.updatePagination()
      },
      immediate: true,
    },
  },
  async created() {
    await this.initializeData()
    
    // Listen for version-approved event from PreviewModal
    eventBus.on('version-approved', this.handleVersionApproved)
    
    // Init version socket listeners
    if (this.project._id) {
      this.initVersionSocketListeners(this.project._id)
    }
    
    // Add click outside listener for filter dropdowns
    document.addEventListener('click', this.handleClickOutsideFilters)
  },
  beforeUnmount() {
    if (this.project._id) {
      this.cleanupSocketConnection(this.project._id)
      this.cleanupVersionSocketListeners()
    }
    
    // Remove event listener
    eventBus.off('version-approved', this.handleVersionApproved)
    
    // Remove click outside listener
    document.removeEventListener('click', this.handleClickOutsideFilters)
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
    navigateToActivityDiagrams() {
      this.$router.push({
        name: 'ActivityDiagramManagement',
        params: { id: this.project._id },
      })
    },

    // Data initialization
    async initializeData() {
      try {
        const projectId = this.$route.params.id
        if (!projectId) {
          throw new Error('Project ID is required')
        }

        await this.fetchProjectData(projectId)
        await this.loadLogStats()
        await this.loadRecentActivities()

        this.initSocketConnection(projectId)
      } catch (err) {
        console.error('Error initializing data:', err)
        this.toast.error('Failed to load project data')
      }
    },

    async refreshActivities() {
      try {
        this.refreshing = true
        await this.loadRecentActivities()
        this.toast.success('Activities refreshed')
      } catch (err) {
        console.error('Error refreshing activities:', err)
        this.toast.error('Failed to refresh activities')
      } finally {
        this.refreshing = false
      }
    },

    // Data fetching
    async fetchProjectData(projectId) {
      try {
        const { data } = await getProjectDetail(projectId)
        const result = data.data || data
        this.project = result.project
        // Lọc bỏ version tạm thời, chỉ giữ version đã được approve
        const allVersions = result.versions || []
        this.versions = filterApprovedVersions(allVersions)

        // Sử dụng version sync utility
        const currentVersionId = result.current_version?._id
        this.selectedVersionId = getSelectedOrDefaultVersion(
          projectId,
          this.versions,
          currentVersionId
        )
        
        if (this.selectedVersionId) {
          saveSelectedVersion(projectId, this.selectedVersionId)
        }
      } catch (err) {
        console.error('Error fetching project details:', err)
        throw err
      }
    },

    async loadLogStats() {
      try {
        const projectId = this.$route.params.id
        const versionId = this.selectedVersionId

        // Load test case statistics
        if (projectId) {
          try {
            const testStatsResponse = await getTestStatistics(projectId, versionId)
            const testStats = testStatsResponse.data?.data || testStatsResponse.data

            if (testStats) {
              this.testCaseStats = {
                total: testStats.totalTestCases || 0,
                passed: testStats.passedTestCases || 0,
                failed: testStats.failedTestCases || 0,
                coverage: testStats.requirementCoverage || 0,
              }
            }
          } catch (err) {
            console.warn('Could not load test case stats:', err)
          }

          // Load database statistics
          if (versionId) {
            try {
              const dbResponse = await getDatabasesByVersion(versionId)
              const databases = dbResponse.data?.data || dbResponse.data

              if (databases && databases.length > 0) {
                const database = databases[0]
                this.databaseStats = {
                  tables: database.tables?.length || 0,
                  relationships: database.relationships?.length || 0,
                  columns: this.countTotalColumns(database.tables || []),
                }
              }
            } catch (err) {
              console.warn('Could not load database stats:', err)
            }
          }
        }
      } catch (err) {
        console.error('Error loading log stats:', err)
      }
    },

    async loadRecentActivities() {
      try {
        this.logsLoading = true
        this.logsError = null

        const projectId = this.$route.params.id

        const response = await getProjectLogs(projectId, {
          limit: 200,
          sort: '-created_at',
          populate: {
            path: 'user_id',
            model: 'users',
            select: 'name email avatar_url',
          },
        })

        const logsData = response.data?.data || response.data
        this.recentActivities = logsData?.items || logsData || []

        console.log('Loaded activities:', this.recentActivities.length)
      } catch (err) {
        console.error('Error loading recent activities:', err)
        this.logsError =
          err.response?.data?.message || err.message || 'Failed to load activity logs'
        this.recentActivities = []
      } finally {
        this.logsLoading = false
      }
    },

    countTotalColumns(tables) {
      return tables.reduce((total, table) => total + (table.columns?.length || 0), 0)
    },

    // Enhanced activity methods
    getActivityType(activity) {
      if (activity.target_type === 'testcases' || activity.action.includes('testcase')) {
        return 'testcase'
      } else if (
        activity.target_type === 'databases' ||
        activity.action.includes('table') ||
        activity.action.includes('column') ||
        activity.action.includes('relation')
      ) {
        return 'database'
      } else if (activity.target_type.includes('diagram') || activity.action.includes('diagram')) {
        return 'uml'
      } else if (activity.target_type === 'versions' || activity.action.includes('version')) {
        return 'version'
      } else if (activity.target_type === 'projects' || activity.action.includes('project')) {
        return 'project'
      }
      return 'default'
    },

    getActivityLevel(activity) {
      if (activity.action.includes('delete') || activity.action.includes('error')) {
        return 'error'
      } else if (activity.action.includes('create')) {
        return 'success'
      } else if (activity.action.includes('update')) {
        return 'warning'
      } else if (activity.action.includes('execute') || activity.action.includes('export')) {
        return 'info'
      }
      return 'default'
    },

    getActionType(activity) {
      const action = activity.action?.toLowerCase() || ''
      if (action.includes('create') || action.includes('generate') || action.includes('add')) {
        return 'action-create'
      } else if (action.includes('delete') || action.includes('remove')) {
        return 'action-delete'
      } else if (action.includes('update') || action.includes('edit') || action.includes('modify')) {
        return 'action-update'
      }
      return 'action-default'
    },

    getActivityIcon(activity) {
      const type = this.getActivityType(activity)

      const icons = {
        testcase: {
          create: 'add',
          update: 'edit',
          delete: 'delete',
          execute: 'play_arrow',
          default: 'play_arrow',
        },
        database: {
          create: 'add_box',
          update: 'edit_note',
          delete: 'delete_forever',
          default: 'storage',
        },
        uml: {
          create: 'schema',
          update: 'edit_document',
          delete: 'delete',
          export: 'download',
          default: 'schema',
        },
        version: {
          create: 'add_circle',
          update: 'edit_note',
          delete: 'delete',
          default: 'history',
        },
        project: {
          create: 'create_new_folder',
          update: 'edit_document',
          delete: 'delete',
          default: 'folder',
        },
        default: 'info',
      }

      const action = activity.action.split('_').pop()
      return icons[type]?.[action] || icons[type]?.default || 'info'
    },

    formatActivityText(activity) {
      // Use details.message if available (preferred)
      if (activity.details?.message) {
        return activity.details.message
      }

      // Fallback to default formatting with better messages
      const userName = activity.user_id?.name || 'System'
      const action = activity.action
      const targetType = activity.target_type

      // Enhanced action mapping with more context
      const actionMap = {
        // Input operations
        create_input: `${userName} added new input`,
        update_input: `${userName} updated input`,
        delete_input: `${userName} removed input`,

        // Test cases
        generate_output: activity.target_type === 'testcases' 
          ? `${userName} generated ${activity.details?.after?.count || 'test cases'}`
          : activity.target_type === 'activity_diagrams'
          ? `${userName} generated activity diagram "${activity.details?.after?.name || ''}"`
          : activity.target_type === 'sequence_diagrams'
          ? `${userName} generated sequence diagram "${activity.details?.after?.name || ''}"`
          : activity.target_type === 'usecase_diagrams'
          ? `${userName} generated usecase diagram "${activity.details?.after?.name || ''}"`
          : `${userName} generated ${targetType}`,
        update_output: `${userName} updated ${targetType}`,
        delete_output: `${userName} deleted ${targetType}`,
        export_data: `${userName} exported ${targetType}`,

        // Database operations
        create_table: `${userName} created table "${activity.details?.after?.name || ''}"`,
        update_table: `${userName} updated table`,
        delete_table: `${userName} deleted table`,
        create_column: `${userName} added column`,
        update_column: `${userName} updated column`,
        delete_column: `${userName} removed column`,
        create_relation: `${userName} created relationship`,
        update_relation: `${userName} updated relationship`,
        delete_relation: `${userName} deleted relationship`,

        // Version operations
        create_version: `${userName} created version ${activity.version_number || ''}`,
        update_version: `${userName} updated version ${activity.version_number || ''}`,
        delete_version: `${userName} deleted version ${activity.version_number || ''}`,
        rollback: `${userName} rolled back to version ${activity.details?.after?.version_number || ''}`,

        // Project operations
        create_project: `${userName} created project "${activity.details?.after?.name || ''}"`,
        update_project: `${userName} updated project`,
        delete_project: `${userName} deleted project`,
        restore_project: `${userName} restored project`,

        // Usecase/Requirement operations
        generate_data: `${userName} generated usecase${activity.details?.after?.length ? ` (${activity.details.after.length} items)` : ''}`,
        update_data: `${userName} updated usecase`,
        delete_data: `${userName} deleted usecase`,
        resolve_conflict: `${userName} resolved conflict`,

        // Member operations
        invite_member: `${userName} invited member`,
        accept_invite: `${userName} accepted invitation`,
        reject_invite: `${userName} rejected invitation`,
        cancel_invite: `${userName} cancelled invitation`,
        remove_member: `${userName} removed member`,
        leave_project: `${userName} left project`,
        change_member_role: `${userName} changed member role`,

        // User operations
        create_user: `${userName} created user account`,
        update_user: `${userName} updated user account`,
        login: `${userName} logged in`,
        logout: `${userName} logged out`,
        failed_login: `Failed login attempt`,
      }

      return actionMap[action] || `${userName} performed ${action.replace(/_/g, ' ')} on ${targetType}`
    },

    formatAction(action) {
      return action
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    },

    formatTarget(targetType) {
      if (!targetType) return ''
      return targetType
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    },

    highlightKeywords(text) {
      if (!this.searchQuery) return text

      const regex = new RegExp(`(${this.searchQuery})`, 'gi')
      return text.replace(regex, '<mark class="highlight">$1</mark>')
    },

    isHighlighted(activity) {
      if (!this.searchQuery) return false

      const text = this.formatActivityText(activity).toLowerCase()
      return text.includes(this.searchQuery.toLowerCase())
    },

    formatTime(timestamp) {
      const now = new Date()
      const activityTime = new Date(timestamp)
      const diffInMinutes = Math.floor((now - activityTime) / (1000 * 60))

      if (diffInMinutes < 1) return 'Vừa xong'
      if (diffInMinutes < 60) return `${diffInMinutes} phút trước`
      if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60)
        return `${hours} giờ trước`
      }
      const days = Math.floor(diffInMinutes / 1440)
      return `${days} ngày trước`
    },

    formatFullTime(timestamp) {
      const date = new Date(timestamp)
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },

    formatLevel(level) {
      const levelMap = {
        info: 'Thông tin',
        warning: 'Cảnh báo',
        error: 'Lỗi',
        success: 'Thành công',
        default: 'Mặc định'
      }
      return levelMap[level] || level
    },

    getLevelIcon(level) {
      const iconMap = {
        info: 'info',
        warning: 'warning',
        error: 'error',
        success: 'check_circle',
        default: 'circle'
      }
      return iconMap[level] || 'circle'
    },

    // Filter methods
    applyFilters() {
      this.pagination.currentPage = 1
    },

    clearFilters() {
      this.filters = {
        type: 'all',
        action: 'all',
        user: 'all',
      }
      this.searchQuery = ''
      this.pagination.currentPage = 1
      this.showTypeFilter = false
      this.showActionFilter = false
      this.showUserFilter = false
    },
    
    // Filter dropdown methods
    toggleTypeFilter() {
      this.showTypeFilter = !this.showTypeFilter
      this.showActionFilter = false
      this.showUserFilter = false
    },
    toggleActionFilter() {
      this.showActionFilter = !this.showActionFilter
      this.showTypeFilter = false
      this.showUserFilter = false
    },
    toggleUserFilter() {
      this.showUserFilter = !this.showUserFilter
      this.showTypeFilter = false
      this.showActionFilter = false
    },
    setTypeFilter(value) {
      this.filters.type = value
      this.showTypeFilter = false
      this.applyFilters()
    },
    setActionFilter(value) {
      this.filters.action = value
      this.showActionFilter = false
      this.applyFilters()
    },
    setUserFilter(value) {
      this.filters.user = value
      this.showUserFilter = false
      this.applyFilters()
    },
    getTypeFilterLabel() {
      if (this.filters.type === 'all') return 'All Types'
      const labels = {
        testcase: 'Test Cases',
        database: 'Database',
        uml: 'UML Diagrams',
        version: 'Versions',
        project: 'Projects',
      }
      return labels[this.filters.type] || this.filters.type
    },
    getActionFilterLabel() {
      if (this.filters.action === 'all') return 'All Actions'
      return this.filters.action.charAt(0).toUpperCase() + this.filters.action.slice(1)
    },
    getUserFilterLabel() {
      if (this.filters.user === 'all') return 'All Users'
      return this.filters.user
    },
    handleClickOutsideFilters(event) {
      if (!event.target.closest('.filter-icon-wrapper')) {
        this.showTypeFilter = false
        this.showActionFilter = false
        this.showUserFilter = false
      }
    },

    debouncedSearch() {
      clearTimeout(this.searchTimeout)
      this.searchTimeout = setTimeout(() => {
        this.applyFilters()
      }, 300)
    },

    // Pagination methods
    updatePagination() {
      const totalItems = this.filteredActivities.length
      const pageSize = parseInt(this.pagination.pageSize)

      this.pagination.totalPages = Math.ceil(totalItems / pageSize)
      this.pagination.startIndex = (this.pagination.currentPage - 1) * pageSize
      this.pagination.endIndex = Math.min(this.pagination.startIndex + pageSize, totalItems)

      if (
        this.pagination.currentPage > this.pagination.totalPages &&
        this.pagination.totalPages > 0
      ) {
        this.pagination.currentPage = this.pagination.totalPages
      }
    },

    prevPage() {
      if (this.pagination.currentPage > 1) {
        this.pagination.currentPage--
      }
    },

    nextPage() {
      if (this.pagination.currentPage < this.pagination.totalPages) {
        this.pagination.currentPage++
      }
    },

    goToPage(page) {
      if (page !== '...') {
        this.pagination.currentPage = page
      }
    },

    handleVersionSelect(versionId) {
      // Chỉ Owner mới được phép select version
      if (!checkIsOwner(this.project)) {
        this.toast.warning('Only project owner can switch versions')
        return
      }
      
      const oldVersionId = this.selectedVersionId
      this.selectedVersionId = versionId
      // Lưu vào localStorage để đồng bộ
      saveSelectedVersion(this.project._id, versionId)
      
      // Emit socket event để các thành viên khác biết version đã được switch
      if (socket && socket.connected) {
        const userId = localStorage.getItem('userId')
        socket.emit('version_event', {
          type: 'VERSION_SWITCHED',
          projectId: this.project._id,
          userId: userId,
          toVersionId: versionId,
          fromVersionId: oldVersionId,
          timestamp: new Date(),
        })
        console.log('📡 Emitted VERSION_SWITCHED socket event')
      }
      
      this.loadLogStats()
    },

    /**
     * Xử lý khi version được approve thành công từ PreviewModal
     */
    async handleVersionApproved(event) {
      // Chỉ xử lý nếu là project hiện tại
      if (!event || event.projectId !== this.project._id) {
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
        await this.fetchProjectData(this.project._id)

        // Đảm bảo version mới có trong danh sách (thêm vào nếu chưa có)
        let newVersionObj = this.versions.find((v) => v._id === versionId)
        
        if (!newVersionObj) {
          // Nếu chưa có trong danh sách, thử fetch lại một lần nữa
          console.log('🔄 Version not found, fetching project data again...')
          await new Promise((resolve) => setTimeout(resolve, 500))
          await this.fetchProjectData(this.project._id)
          newVersionObj = this.versions.find((v) => v._id === versionId)
        }

        // Nếu vẫn chưa có và có version object từ event, thêm vào
        if (!newVersionObj && version) {
          // Chỉ thêm nếu version đã được approve (version_temporary = false)
          if (version.version_temporary === false || version.version_temporary === undefined) {
            this.versions.push(version)
            newVersionObj = version
            console.log('✅ Added new approved version to list:', versionId)
          }
        }

        // Force set selectedVersionId ngay cả khi chưa có trong danh sách
        // Vì version đã được approve rồi, nên chắc chắn sẽ có
        this.selectedVersionId = versionId

        // Lưu vào localStorage để đồng bộ với các trang khác
        saveSelectedVersion(this.project._id, versionId)

        // Refresh log stats với version mới
        this.loadLogStats()

        // Thông báo cho user
        this.toast.success(`Switched to approved version: ${newVersion || versionId}`)

        this.$forceUpdate()
      } catch (error) {
        console.error('❌ Error handling version-approved event:', error)
        this.toast.error('Failed to switch to approved version')
      }
    },

    handleRetry() {
      this.isRetrying = true
      // Implementation here
    },

    goBack() {
      this.$router.push('/dashboard')
    },

    // Socket methods for version events
    initVersionSocketListeners(projectId) {
      if (!socket) return
      if (socket.connected) {
        socket.emit('join_project', projectId)
      }
      socket.on('version_event', this.handleVersionEvent)
      console.log('✅ Version socket listeners initialized for OutputManagement')
    },

    cleanupVersionSocketListeners() {
      if (socket) {
        socket.off('version_event', this.handleVersionEvent)
      }
    },

    handleVersionEvent(event) {
      const currentUserId = localStorage.getItem('userId')
      if (event.userId === currentUserId) return

      switch (event.type) {
        case 'VERSION_SWITCHED':
          this.handleRemoteVersionSwitched(event)
          break
        case 'VERSION_CREATED':
          this.handleRemoteVersionCreated(event)
          break
      }
    },

    async handleRemoteVersionSwitched(event) {
      if (event.projectId !== this.project._id) return
      this.selectedVersionId = event.toVersionId
      saveSelectedVersion(this.project._id, event.toVersionId)
      this.loadLogStats()
      const version = this.versions.find((v) => v._id === event.toVersionId)
      if (version) {
        this.toast.info(`Version switched to: ${version.version_number || event.toVersionId}`)
      }
    },

    async handleRemoteVersionCreated(event) {
      if (event.projectId !== this.project._id) return
      await this.fetchProjectData(this.project._id)
      if (event.version && (event.version.version_temporary === false || event.version.version_temporary === undefined)) {
        const exists = this.versions.find((v) => v._id === event.version._id)
        if (!exists) {
          this.versions.push(event.version)
        }
        this.selectedVersionId = event.version._id
        saveSelectedVersion(this.project._id, event.version._id)
        this.loadLogStats()
        this.toast.info(`New version created: ${event.version.version_number || event.version._id}`)
      }
    },
  },
}
</script>

<style scoped>
.output-management-view {
  padding: 30px;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
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

.log-content {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.log-header {
  text-align: center;
  margin-bottom: 40px;
}

.main-content {
  margin-top: 40px;
  animation: fadeInUp 0.6s ease;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.output-header h2 {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1a365d 0%, #2d4a8a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 1.1rem;
  color: #6b7280;
}

/* Output Cards Grid */
.output-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.log-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.1);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;
}

.log-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(26, 54, 93, 0.15);
  border-color: #1a365d;
}

.card-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon.testcase {
  background: linear-gradient(135deg, #1a365d, #2d4a7c);
}

.card-icon.database {
  background: linear-gradient(135deg, #1a365d, #2d4a7c);
}

.card-icon.uml {
  background: linear-gradient(135deg, #1a365d, #2d4a7c);
}

.card-icon .material-symbols-outlined {
  font-size: 24px;
  color: white;
}

.card-content {
  flex: 1;
}

.card-content h3 {
  font-size: 1.2rem;
  font-weight: 600;
  color: #1a365d;
  margin-bottom: 8px;
}

.card-content p {
  color: #6b7280;
  line-height: 1.5;
  font-size: 0.9rem;
}

.card-arrow .material-symbols-outlined {
  color: #9ca3af;
  font-size: 18px;
  transition: color 0.3s ease;
}

.log-card:hover .card-arrow .material-symbols-outlined {
  color: #1a365d;
}

/* Enhanced Activity Logs Section */
.activity-logs-section {
  background: white;
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(26, 54, 93, 0.12);
  margin-bottom: 40px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: visible;
  border: 1px solid rgba(226, 232, 240, 0.8);
  transition: all 0.3s ease;
}

.activity-logs-section:hover {
  box-shadow: 0 8px 30px rgba(26, 54, 93, 0.15);
}

.section-header {
  flex-direction: column;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 16px;
  overflow: visible;
  position: relative;
  padding-bottom: 20px;
  border-bottom: 2px solid #f1f5f9;
}

.section-header h3 {
  font-size: 1.75rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1a365d 0%, #2d4a8a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  white-space: nowrap;
  position: relative;
  padding-left: 12px;
}

.section-header h3::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 24px;
  background: linear-gradient(135deg, #1a365d 0%, #2d4a8a 100%);
  border-radius: 2px;
}

.controls-header {
  flex: 1;
  width: 100%;
  overflow: visible !important;
  position: relative;
  z-index: 1;
}

/* Compact Filter Controls */
.compact-filter-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  gap: 12px;
  overflow: visible;
}

.filter-select-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  overflow: visible;
}

.filter-select {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 100px;
}

.filter-select:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 2px rgba(26, 54, 93, 0.1);
}

/* Filter Icon Buttons */
.filter-icon-wrapper {
  position: relative;
  display: inline-block;
  z-index: 10;
}

/* Đảm bảo dropdown cuối cùng (user filter) mở về bên trái để không bị tràn */
.filter-icon-wrapper:nth-child(3) .filter-dropdown-menu {
  right: 0;
  left: auto;
}

/* Đảm bảo container không cắt dropdown */
.controls-header {
  overflow: visible !important;
}

.compact-filter-controls {
  overflow: visible !important;
}

.filter-icon-btn-compact {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 36px;
  height: 36px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.filter-icon-btn-compact::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(26, 54, 93, 0.1), transparent);
  transition: left 0.5s;
}

.filter-icon-btn-compact:hover::before {
  left: 100%;
}

.filter-icon-btn-compact:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-color: #1a365d;
  color: #1a365d;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(26, 54, 93, 0.15);
}

.filter-icon-btn-compact .material-symbols-outlined {
  font-size: 18px;
}

.filter-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  max-width: 300px;
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
  animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
}

.filter-dropdown-menu::-webkit-scrollbar {
  width: 6px;
}

.filter-dropdown-menu::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.filter-dropdown-menu::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.filter-dropdown-menu::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
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
  gap: 12px;
  width: 100%;
  padding: 12px 18px;
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
  background: linear-gradient(135deg, #1a365d 0%, #2d4a8a 100%);
  transition: width 0.3s ease;
}

.filter-option:hover {
  background: linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%);
  padding-left: 20px;
}

.filter-option:hover::before {
  width: 3px;
}

.filter-option.active {
  background: linear-gradient(90deg, #e6f2ff 0%, #dbeafe 100%);
  color: #1a365d;
  font-weight: 600;
  border-left-color: #1a365d;
  padding-left: 20px;
}

.filter-option.active::before {
  width: 3px;
}

.filter-option .material-symbols-outlined {
  font-size: 18px;
  color: #6b7280;
}

.filter-option.active .material-symbols-outlined {
  color: #1a365d;
}

.search-refresh-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.search-input.compact {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 300px;
}

.search-input.compact .material-symbols-outlined {
  position: absolute;
  left: 14px;
  color: #94a3b8;
  font-size: 18px;
  z-index: 1;
  transition: color 0.3s ease;
}

.search-input.compact input {
  width: 100%;
  padding: 10px 12px 10px 40px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.875rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.search-input.compact:focus-within .material-symbols-outlined {
  color: #1a365d;
}

.search-input.compact input:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 4px rgba(26, 54, 93, 0.1), 0 4px 12px rgba(26, 54, 93, 0.15);
  transform: translateY(-1px);
}

.refresh-button.compact {
  padding: 8px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.refresh-button.compact::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(26, 54, 93, 0.1), transparent);
  transition: left 0.5s;
}

.refresh-button.compact:hover:not(:disabled)::before {
  left: 100%;
}

.refresh-button.compact:hover:not(:disabled) {
  border-color: #1a365d;
  color: #1a365d;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  transform: translateY(-2px) rotate(180deg);
  box-shadow: 0 4px 12px rgba(26, 54, 93, 0.15);
}

.refresh-button.compact:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.clear-filters-button {
  padding: 8px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.clear-filters-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.1), transparent);
  transition: left 0.5s;
}

.clear-filters-button:hover::before {
  left: 100%;
}

.clear-filters-button:hover {
  border-color: #ef4444;
  color: #ef4444;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
}

/* Logs Container Wrapper */
.logs-container-wrapper {
  position: relative;
  min-height: 200px;
}

.logs-loading-container,
.logs-error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  animation: fadeInUp 0.5s ease;
}

.logs-loading-container {
  color: #64748b;
}

.logs-error-container {
  color: #ef4444;
  animation: fadeInUp 0.5s ease;
}

.logs-error-container .material-symbols-outlined {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.8;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.loading-spinner.small {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #1a365d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.1);
}

/* Logs Container */
.logs-container {
  max-height: 600px;
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  width: 100%;
  box-sizing: border-box;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.04);
}

.logs-container::-webkit-scrollbar {
  width: 8px;
}

.logs-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.logs-container::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%);
  border-radius: 4px;
}

.logs-container::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
}

.empty-logs {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
  text-align: center;
  color: #64748b;
  animation: fadeInUp 0.6s ease;
}

.empty-icon {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  animation: float 3s ease-in-out infinite;
  position: relative;
}

.empty-icon::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1a365d, #2d4a8a);
  opacity: 0.1;
  z-index: -1;
  animation: pulse 2s ease-in-out infinite;
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

.empty-icon .material-symbols-outlined {
  font-size: 56px;
  color: #64748b;
  animation: spin 20s linear infinite;
}

.empty-logs h3 {
  font-size: 1.2rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.empty-logs p {
  margin: 0 0 20px 0;
  font-size: 0.9rem;
  color: #64748b;
  max-width: 400px;
}

.empty-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.empty-actions .retry-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* Log Items */
.logs-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.log-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  background: white;
  border-left: 5px solid transparent;
  overflow: hidden;
  word-wrap: break-word;
  overflow-wrap: break-word;
  margin: 4px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.log-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: linear-gradient(135deg, rgba(26, 54, 93, 0.1) 0%, rgba(45, 74, 138, 0.1) 100%);
  transition: width 0.3s ease;
}

.log-item:hover::before {
  width: 100%;
}

.log-item:last-child {
  border-bottom: none;
}

/* Màu nền theo action type */
.log-item.action-create {
  background: linear-gradient(90deg, #f0fdf4 0%, #dcfce7 100%);
  border-left-color: #10b981;
}

.log-item.action-create:hover {
  background: linear-gradient(90deg, #dcfce7 0%, #bbf7d0 100%);
  transform: translateX(4px) translateY(-2px);
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.25);
  border-left-width: 6px;
}

.log-item.action-delete {
  background: linear-gradient(90deg, #fef2f2 0%, #fee2e2 100%);
  border-left-color: #ef4444;
}

.log-item.action-delete:hover {
  background: linear-gradient(90deg, #fee2e2 0%, #fecaca 100%);
  transform: translateX(4px) translateY(-2px);
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.25);
  border-left-width: 6px;
}

.log-item.action-update {
  background: linear-gradient(90deg, #eff6ff 0%, #dbeafe 100%);
  border-left-color: #3b82f6;
}

.log-item.action-update:hover {
  background: linear-gradient(90deg, #dbeafe 0%, #bfdbfe 100%);
  transform: translateX(4px) translateY(-2px);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.25);
  border-left-width: 6px;
}

.log-item.action-default {
  background: linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%);
  border-left-color: #94a3b8;
}

.log-item.action-default:hover {
  background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 100%);
  transform: translateX(4px) translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border-left-width: 6px;
}

.log-item.highlighted {
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);
}

/* Log Type Colors - chỉ dùng cho icon */
.log-item.testcase .log-icon {
  background: transparent;
}

.log-item.database .log-icon {
  background: transparent;
}

.log-item.uml .log-icon {
  background: transparent;
}

.log-item.version .log-icon {
  background: transparent;
}

.log-item.project .log-icon {
  background: transparent;
}

.log-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.log-icon::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.log-item:hover .log-icon {
  transform: scale(1.15) rotate(5deg);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.log-item:hover .log-icon::before {
  opacity: 1;
}

.log-icon.testcase {
  background: #d1fae5;
  color: #047857;
}

.log-icon.database {
  background: #dbeafe;
  color: #1d4ed8;
}

.log-icon.uml {
  background: #ede9fe;
  color: #7c3aed;
}

.log-icon.version {
  background: #fef3c7;
  color: #d97706;
}

.log-icon.project {
  background: #fee2e2;
  color: #dc2626;
}

.log-icon .material-symbols-outlined {
  font-size: 16px;
}

.log-content {
  flex: 1;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.log-user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.user-avatar-small {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.user-avatar-small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar-small .material-symbols-outlined {
  font-size: 16px;
  color: #64748b;
}

.log-user-name {
  font-weight: 600;
  color: #1a365d;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ai-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.65rem;
  font-weight: 600;
  margin-left: 4px;
}

.ai-badge .material-symbols-outlined {
  font-size: 12px;
}

.log-action-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  max-width: 100%;
  overflow: hidden;
}

.log-action-badge {
  background: linear-gradient(135deg, #1a365d 0%, #2d4a8a 100%);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(26, 54, 93, 0.2);
  transition: all 0.3s ease;
}

.log-action-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(26, 54, 93, 0.3);
}

.log-target-badge {
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  color: #475569;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.log-target-badge:hover {
  background: linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.log-version-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #d97706;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(217, 119, 6, 0.2);
  transition: all 0.3s ease;
}

.log-version-badge:hover {
  background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.3);
}

.log-version-badge .material-symbols-outlined {
  font-size: 14px;
}

.log-message {
  margin-bottom: 8px;
  line-height: 1.5;
  color: #1e293b;
  font-size: 0.9rem;
  font-weight: 500;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
  border-left: 3px solid transparent;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
}

.log-item.action-create .log-message {
  border-left-color: #10b981;
  background: rgba(255, 255, 255, 0.8);
}

.log-item.action-delete .log-message {
  border-left-color: #ef4444;
  background: rgba(255, 255, 255, 0.8);
}

.log-item.action-update .log-message {
  border-left-color: #3b82f6;
  background: rgba(255, 255, 255, 0.8);
}

.log-message :deep(.highlight) {
  background: #fef3c7;
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: 600;
}

.log-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 0.75rem;
  margin-top: 4px;
}

.log-meta-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.log-time {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #64748b;
  font-weight: 500;
}

.log-time .material-symbols-outlined {
  font-size: 14px;
}

.log-requirement-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #dbeafe;
  color: #1e40af;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.65rem;
  font-weight: 600;
}

.log-requirement-badge .material-symbols-outlined {
  font-size: 12px;
}


.log-level.error {
  background: #fecaca;
  color: #dc2626;
}

.log-level.success {
  background: #bbf7d0;
  color: #16a34a;
}

.log-level.warning {
  background: #fed7aa;
  color: #ea580c;
}

.log-level.info {
  background: #bae6fd;
  color: #0284c7;
}

.log-level.default {
  background: #e5e7eb;
  color: #6b7280;
}

/* Pagination Controls */
.pagination-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  flex-wrap: wrap;
  gap: 12px;
}

.pagination-info {
  color: #6b7280;
  font-size: 0.8rem;
}

.pagination-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pagination-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.875rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.pagination-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(26, 54, 93, 0.1), transparent);
  transition: left 0.5s;
}

.pagination-btn:hover:not(:disabled)::before {
  left: 100%;
}

.pagination-btn:hover:not(:disabled) {
  border-color: #1a365d;
  color: #1a365d;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(26, 54, 93, 0.15);
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: #f1f5f9;
}

.page-numbers {
  display: flex;
  gap: 6px;
}

.page-btn {
  width: 36px;
  height: 36px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.page-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #1a365d 0%, #2d4a8a 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.page-btn:hover::before {
  opacity: 0.1;
}

.page-btn:hover {
  border-color: #1a365d;
  color: #1a365d;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(26, 54, 93, 0.15);
}

.page-btn.active {
  background: linear-gradient(135deg, #1a365d 0%, #2d4a8a 100%);
  border-color: #1a365d;
  color: white;
  box-shadow: 0 4px 16px rgba(26, 54, 93, 0.3);
  transform: translateY(-2px);
}

.page-btn.active::before {
  opacity: 0;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-size-selector label {
  color: #6b7280;
  font-size: 0.8rem;
}

.page-size-selector select {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 0.8rem;
  cursor: pointer;
}


.retry-button {
  padding: 10px 20px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #1a365d 0%, #2d4a8a 100%);
  color: white;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.2);
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.retry-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.retry-button:hover::before {
  left: 100%;
}

.retry-button:hover {
  background: linear-gradient(135deg, #2d4a8a 0%, #3d5a9a 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(26, 54, 93, 0.3);
}

.retry-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.2);
}

/* Animations */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.spinning {
  animation: spin 1s linear infinite;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .output-management-view {
    padding: 20px;
  }

  .output-cards-grid {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
}

@media (max-width: 768px) {
  .output-management-view {
    padding: 16px;
  }

  .output-cards-grid {
    grid-template-columns: 1fr;
  }

  .section-header {
    flex-direction: column;
    align-items: stretch;
  }

  .controls-header {
    width: 100%;
  }

  .compact-filter-controls {
    gap: 8px;
  }

  .filter-select-group {
    justify-content: space-between;
  }

  .filter-select {
    flex: 1;
    min-width: calc(33.333% - 6px);
  }

  .search-refresh-group {
    width: 100%;
  }

  .search-input.compact {
    max-width: none;
  }

  .pagination-controls {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }

  .pagination-buttons {
    justify-content: center;
  }


  .log-header h2 {
    font-size: 2rem;
  }
}

@media (max-width: 480px) {
  .output-management-view {
    padding: 12px;
  }

  .log-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .log-user-info {
    width: 100%;
  }

  .log-action-badges {
    width: 100%;
    justify-content: flex-start;
  }

  .log-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .log-meta-left {
    width: 100%;
  }

  .filter-select-group {
    flex-direction: column;
  }

  .filter-select {
    min-width: auto;
    width: 100%;
  }

  .log-icon {
    width: 32px;
    height: 32px;
  }

  .log-message {
    font-size: 0.85rem;
    padding: 6px 10px;
  }
}
</style>