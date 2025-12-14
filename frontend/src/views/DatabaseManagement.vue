<template>
  <div class="database-management-view">

    <div class="database-content">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading database schema...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <span class="material-symbols-outlined">error</span>
        <h3>Failed to load database</h3>
        <p>{{ error }}</p>
        <button class="btn-primary" @click="loadDatabaseData">
          <span class="material-symbols-outlined">refresh</span>
          Retry
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="!database && !loading" class="empty-state">
        <span class="material-symbols-outlined">database</span>
        <h3>No Database Schema</h3>
        <p>Generate a database schema from your use cases to get started</p>
        <button class="btn-primary" @click="generateDatabaseSchema" :disabled="generatingSchema">
          <span class="material-symbols-outlined">auto_awesome</span>
          {{ generatingSchema ? 'Generating...' : 'Generate Database Schema' }}
        </button>
      </div>

      <!-- Main Content -->
      <div v-else-if="database" class="database-main-content">
        <div class="content-header">
          <div class="header-left">
            <!-- <h2>Database Management</h2>
            <p class="description">{{ database.description }}</p> -->
            <div class="database-meta">
              <span class="meta-item">
                <span class="material-symbols-outlined">table</span>
                {{ databaseStats.tables }} tables
              </span>
              <span class="meta-item">
                <span class="material-symbols-outlined">key</span>
                {{ databaseStats.compositeKeys }} composite keys
              </span>
              <span class="meta-item">
                <span class="material-symbols-outlined">link</span>
                {{ databaseStats.relationships }} relationships
              </span>
            </div>
          </div>
          <div class="header-actions">
            <button class="btn-secondary" @click="showCompositeKeyModal = true">
              <span class="material-symbols-outlined">key</span>
              Manage Composite Keys
            </button>
            <button class="btn-secondary" @click="showRelationshipModal = true">
              <span class="material-symbols-outlined">link</span>
              Manage Relationships
            </button>
            <button
              class="btn-secondary"
              @click="generateDatabaseSchema"
              :disabled="generatingSchema"
            >
              <span class="material-symbols-outlined">refresh</span>
              {{ generatingSchema ? 'Regenerating...' : 'Regenerate' }}
            </button>
            <button class="btn-primary" @click="showCreateTableModal = true">
              <span class="material-symbols-outlined">add</span>
              Create Table
            </button>
          </div>
        </div>

        <!-- Statistics Cards -->
        <DatabaseStats :stats="databaseStats" />

        <!-- Database Schema Visualization -->
        <div class="schema-section">
          <div class="section-header">
            <h3>Database Schema</h3>
            <div class="view-options">
              <button
                class="btn-secondary"
                :class="{ active: viewMode === 'diagram' }"
                @click="viewMode = 'diagram'"
              >
                <span class="material-symbols-outlined">schema</span>
                Diagram View
              </button>
              <button
                class="btn-secondary"
                :class="{ active: viewMode === 'list' }"
                @click="viewMode = 'list'"
              >
                <span class="material-symbols-outlined">list</span>
                List View
              </button>
              <button class="btn-secondary" @click="exportSchema">
                <span class="material-symbols-outlined">download</span>
                Export Schema
              </button>
              <button class="btn-secondary" @click="exportSQL">
                <span class="material-symbols-outlined">code</span>
                Export SQL
              </button>
            </div>
          </div>

          <!-- Diagram View -->
          <DatabaseDiagram
            v-if="viewMode === 'diagram'"
            :tables="databaseTables"
            :relationships="relationships"
            :database-id="database?._id"
            :auto-save-enabled="true"
            :history-enabled="true"
            @table-edit="editTable"
            @table-delete="deleteTable"
            @table-view="viewTableDetails"
            @save-positions="handleSavePositions"
            @tables-updated="handleTablesUpdated"
          />

          <!-- List View -->
          <DatabaseList
            v-else
            :tables="databaseTables"
            :relationships="relationships"
            @table-edit="editTable"
            @table-delete="deleteTable"
            @table-view="viewTableDetails"
          />
        </div>

        <!-- SQL Preview với multiple dialects -->
        <div class="sql-preview-section">
          <div class="section-header">
            <h3>SQL Preview</h3>
            <div class="sql-actions">
              <!-- SQL Dialect Selector -->
              <div class="sql-dialect-selector">
                <div class="filter-icon-wrapper">
                  <button 
                    class="filter-icon-btn" 
                    @click.stop="toggleDialectFilter"
                    :title="`SQL Dialect: ${getDialectName(selectedSQLDialect)}`"
                  >
                    <span class="material-symbols-outlined">database</span>
                  </button>
                  <div 
                    v-if="showDialectFilter" 
                    class="filter-dropdown-menu"
                    @click.stop
                  >
                    <button 
                      class="filter-option" 
                      :class="{ active: selectedSQLDialect === 'mysql' }"
                      @click="setDialect('mysql')"
                    >
                      <span class="material-symbols-outlined">storage</span>
                      MySQL
                    </button>
                    <button 
                      class="filter-option" 
                      :class="{ active: selectedSQLDialect === 'sqlserver' }"
                      @click="setDialect('sqlserver')"
                    >
                      <span class="material-symbols-outlined">dns</span>
                      SQL Server
                    </button>
                    <button 
                      class="filter-option" 
                      :class="{ active: selectedSQLDialect === 'postgresql' }"
                      @click="setDialect('postgresql')"
                    >
                      <span class="material-symbols-outlined">cloud</span>
                      PostgreSQL
                    </button>
                    <button 
                      class="filter-option" 
                      :class="{ active: selectedSQLDialect === 'oracle' }"
                      @click="setDialect('oracle')"
                    >
                      <span class="material-symbols-outlined">account_tree</span>
                      Oracle
                    </button>
                    <button 
                      class="filter-option" 
                      :class="{ active: selectedSQLDialect === 'sqlite' }"
                      @click="setDialect('sqlite')"
                    >
                      <span class="material-symbols-outlined">folder_data</span>
                      SQLite
                    </button>
                  </div>
                </div>
              </div>

              <button class="btn-secondary" @click="copySQL">
                <span class="material-symbols-outlined">content_copy</span>
                Copy SQL
              </button>
              <button class="btn-primary" @click="downloadSQL">
                <span class="material-symbols-outlined">download</span>
                Download SQL File
              </button>
            </div>
          </div>
          <div class="sql-preview">
            <div class="sql-header">
              <span class="dialect-badge">{{ getDialectName(selectedSQLDialect) }}</span>
            </div>
            <pre><code>{{ generatedSQL }}</code></pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals (giữ nguyên) -->
    <TableModal
      v-if="showCreateTableModal || editingTable"
      :table="editingTable"
      :available-tables="availableTables"
      :loading="loadingAvailableTables"
      @save="saveTable"
      @close="closeModal"
    />

    <CompositeKeyModal
      v-if="showCompositeKeyModal"
      :tables="databaseTables"
      @create-composite-key="createCompositeKey"
      @convert-to-single="convertToSingleKey"
      @close="showCompositeKeyModal = false"
    />

    <RelationshipModal
      v-if="showRelationshipModal"
      :relationships="relationships"
      :tables="databaseTables"
      @save-relationship="addRelationship"
      @remove-relationship="removeRelationship"
      @close="showRelationshipModal = false"
    />

    <TableDetailsModal
      v-if="selectedTable"
      :table="selectedTable"
      :relationships="getTableRelationships(selectedTable.name)"
      @close="selectedTable = null"
    />

    <CompositeKeyDetailsModal
      v-if="selectedCompositeKeyTable"
      :table="selectedCompositeKeyTable"
      :composite-key-info="selectedCompositeKeyInfo"
      @close="selectedCompositeKeyTable = null"
      @convert-to-single="convertToSingleKey"
    />
  </div>
</template>

<script>
import { getProjectDetail } from '@/api/project'
import {
  generateDatabaseSchema,
  getDatabasesByVersion,
  getDatabaseById,
  updateDatabase,
  deleteDatabase,
  addTableToDatabase,
  updateTableInDatabase,
  deleteTableFromDatabase,
  getAvailableTablesForReferences,
  updateMultipleTablePositions,
  updateTablePosition,
  getCompositeKeyInfo,
  createCompositeKey,
  convertToSingleKey,
  getDatabaseStats,
  exportDatabaseSQL,
  validateTableStructure,
} from '@/api/project'
import { useToast } from 'vue-toastification'
import DatabaseStats from '@/components/database/DatabaseStats.vue'
import DatabaseDiagram from '@/components/database/DatabaseDiagram/DatabaseDiagram.vue'
import DatabaseList from '@/components/database/DatabaseList.vue'
import TableModal from '@/components/database/TableModal.vue'
import RelationshipModal from '@/components/database/RelationshipModal.vue'
import TableDetailsModal from '@/components/database/TableDetailsModal.vue'
import CompositeKeyModal from '@/components/database/CompositeKeyModal.vue'
import CompositeKeyDetailsModal from '@/components/database/CompositeKeyDetailsModal.vue'
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
  name: 'DatabaseManagement',
  components: {
    DatabaseStats,
    DatabaseDiagram,
    DatabaseList,
    TableModal,
    RelationshipModal,
    TableDetailsModal,
    CompositeKeyModal,
    CompositeKeyDetailsModal,
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
      database: null,
      databaseTables: [],
      relationships: [],

      loading: false,
      error: null,
      generatingSchema: false,

      databaseStats: {
        tables: 0,
        relationships: 0,
        columns: 0,
        compositeKeys: 0,
        relatedUsecases: 0,
      },

      viewMode: 'diagram',
      selectedSQLDialect: 'mysql', // Mặc định là MySQL
      showDialectFilter: false,

      showCreateTableModal: false,
      showRelationshipModal: false,
      showCompositeKeyModal: false,
      editingTable: null,
      selectedTable: null,
      selectedCompositeKeyTable: null,
      selectedCompositeKeyInfo: null,
      availableTables: [],
      loadingAvailableTables: false,
      generatedSQL: '',

      toast: useToast(),
    }
  },
  computed: {
    compositeKeyTables() {
      return this.databaseTables
        .map((table) => {
          const primaryKeys = table.columns?.filter((col) => col.is_primary_key) || []
          if (primaryKeys.length > 1) {
            return {
              ...table,
              compositeKey: {
                columns: primaryKeys.sort(
                  (a, b) => (a.primary_key_order || 0) - (b.primary_key_order || 0)
                ),
                isComposite: true,
              },
            }
          }
          return null
        })
        .filter(Boolean)
    },
  },
  watch: {
    selectedSQLDialect() {
      this.generateSQL()
    },
    databaseTables: {
      deep: true,
      handler() {
        this.generateSQL()
      },
    },
    relationships: {
      deep: true,
      handler() {
        this.generateSQL()
      },
    },
  },
  async created() {
    const projectId = this.$route.params.id
    if (projectId) {
      await this.fetchProjectData(projectId)
      await this.loadDatabaseData() // ✅ TÍNH NĂNG HIỆN TẠI - GIỮ NGUYÊN

      // ✅ THÊM: Init socket connection cho active members
      this.initSocketConnection(projectId)
      
      // ✅ THÊM: Init version socket listeners
      this.initVersionSocketListeners(projectId)
    }
    
    // Listen for version-approved event from PreviewModal
    eventBus.on('version-approved', this.handleVersionApproved)
    
    // Add click outside listener for dialect filter
    document.addEventListener('click', this.handleClickOutsideDialectFilter)
  },
  beforeUnmount() {
    // ✅ THÊM: Cleanup socket connection
    if (this.project?._id) {
      this.cleanupSocketConnection(this.project._id)
      this.cleanupVersionSocketListeners()
    }
    
    // Remove event listener
    eventBus.off('version-approved', this.handleVersionApproved)
    
    // Remove click outside listener
    document.removeEventListener('click', this.handleClickOutsideDialectFilter)
  },
  methods: {
    // Navigation methods
    navigateToUsecase() {
      this.$router.push({
        name: 'Editor',
        params: { id: this.project._id },
      })
    },

    navigateToLog() {
      this.$router.push({
        name: 'OutputManagement',
        params: { id: this.project._id },
      })
    },

    goBack() {
      this.$router.push('/dashboard')
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
      
      this.loadDatabaseData()
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

        // Refresh database data với version mới
        await this.loadDatabaseData()

        // Thông báo cho user
        this.toast.success(`Switched to approved version: ${newVersion || versionId}`)

        this.$forceUpdate()
      } catch (error) {
        console.error('❌ Error handling version-approved event:', error)
        this.toast.error('Failed to switch to approved version')
      }
    },

    // Data methods
    async fetchProjectData(projectId) {
      try {
        const { data } = await getProjectDetail(projectId)
        const result = data.data || data
        this.project = result.project || result
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
        this.toast.error('Failed to load project data')
      }
    },

    async loadDatabaseData() {
      if (!this.selectedVersionId) return

      this.loading = true
      this.error = null

      try {
        const { data: databasesData } = await getDatabasesByVersion(this.selectedVersionId)
        const databases = databasesData.data || databasesData

        if (databases && databases.length > 0) {
          const databaseId = databases[0]._id
          const { data: databaseDetail } = await getDatabaseById(databaseId)
          this.database = databaseDetail.data || databaseDetail
          this.databaseTables = this.database.tables || []
          this.relationships = this.database.relationships || []

          await this.loadDatabaseStats()
          this.updateStats()
          this.generateSQL()
        } else {
          this.database = null
          this.databaseTables = []
          this.relationships = []
        }
      } catch (err) {
        console.error('Error loading database:', err)
        this.error = err.response?.data?.message || 'Failed to load database schema'
        this.toast.error(this.error)
      } finally {
        this.loading = false
      }
    },

    async loadDatabaseStats() {
      if (!this.database?._id) return

      try {
        const { data: statsData } = await getDatabaseStats(this.database._id)
        const stats = statsData.data || statsData
        this.databaseStats = { ...this.databaseStats, ...stats }
      } catch (error) {
        console.error('Failed to load database stats:', error)
      }
    },

    updateStats() {
      this.databaseStats.tables = this.databaseTables.length
      this.databaseStats.relationships = this.relationships.length
      this.databaseStats.columns = this.databaseTables.reduce(
        (sum, table) => sum + (table.columns?.length || 0),
        0
      )
      this.databaseStats.compositeKeys = this.compositeKeyTables.length

      this.databaseStats.relatedUsecases = this.databaseTables.reduce((count, table) => {
        const tableUsecases = new Set()
        table.columns?.forEach((column) => {
          column.related_usecase_ids?.forEach((usecaseId) => {
            tableUsecases.add(usecaseId)
          })
        })
        return count + tableUsecases.size
      }, 0)
    },

    async generateDatabaseSchema() {
      if (!this.selectedVersionId) {
        this.toast.error('Vui lòng chọn version trước')
        return
      }

      this.generatingSchema = true
      try {
        const { data } = await generateDatabaseSchema(this.selectedVersionId)
        this.toast.success('Tạo database schema thành công!')
        await this.loadDatabaseData()
      } catch (err) {
        console.error('Error generating database schema:', err)
        const { formatErrorForDisplay } = await import('@/utils/errorMessages')
        const errorMessage = formatErrorForDisplay(err, 'Không thể tạo database schema. Vui lòng thử lại.')
        this.toast.error(errorMessage)
      } finally {
        this.generatingSchema = false
      }
    },

    // SQL Generation với multiple dialects
    generateSQL() {
      if (!this.databaseTables || this.databaseTables.length === 0) {
        this.generatedSQL = '-- No tables to generate SQL for'
        return
      }

      switch (this.selectedSQLDialect) {
        case 'mysql':
          this.generatedSQL = this.generateMySQLSQL()
          break
        case 'sqlserver':
          this.generatedSQL = this.generateSQLServerSQL()
          break
        case 'postgresql':
          this.generatedSQL = this.generatePostgreSQLSQL()
          break
        case 'oracle':
          this.generatedSQL = this.generateOracleSQL()
          break
        case 'sqlite':
          this.generatedSQL = this.generateSQLiteSQL()
          break
        default:
          this.generatedSQL = this.generateMySQLSQL()
      }
    },

    generateMySQLSQL() {
      const sqlStatements = this.databaseTables
        .map((table) => {
          const primaryKeys = table.columns?.filter((col) => col.is_primary_key) || []
          const hasPK = primaryKeys.length > 0

          const columns = (table.columns || [])
            .map((col) => {
              let columnDef = `\`${col.name}\` ${col.type}`

              if (col.length) columnDef += `(${col.length})`
              if (!col.nullable) columnDef += ' NOT NULL'
              if (col.unique && !col.is_primary_key) columnDef += ' UNIQUE'

              if (col.is_primary_key && col.type.includes('INT')) {
                columnDef += ' AUTO_INCREMENT'
              }

              if (col.default) {
                columnDef += this.formatDefaultValue(col.default, col.type, 'mysql')
              }

              return `  ${columnDef}`
            })
            .join(',\n')

          let constraints = []

          if (hasPK) {
            const pkColumnNames = primaryKeys
              .sort((a, b) => (a.primary_key_order || 0) - (b.primary_key_order || 0))
              .map((col) => `\`${col.name}\``)
              .join(', ')
            constraints.push(`  PRIMARY KEY (${pkColumnNames})`)
          }

          const foreignKeys = (table.columns || [])
            .filter((col) => col.is_foreign_key && col.references)
            .map((col) => {
              const referencedTable = this.databaseTables.find((t) => t.name === col.references)
              const referencedPKs = referencedTable?.columns?.filter((c) => c.is_primary_key) || []
              const pkColumnName = referencedPKs.length === 1 ? referencedPKs[0].name : 'id'
              return `  FOREIGN KEY (\`${col.name}\`) REFERENCES \`${col.references}\`(\`${pkColumnName}\`)`
            })

          constraints = [...constraints, ...foreignKeys]

          let sql = `CREATE TABLE \`${table.name}\` (\n${columns}`
          if (constraints.length > 0) {
            sql += `,\n${constraints.join(',\n')}`
          }
          sql += '\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;'
          return sql
        })
        .join('\n\n')

      return sqlStatements
    },

    generateSQLServerSQL() {
      const sqlStatements = this.databaseTables
        .map((table) => {
          const primaryKeys = table.columns?.filter((col) => col.is_primary_key) || []
          const hasPK = primaryKeys.length > 0

          const columns = (table.columns || [])
            .map((col) => {
              let columnDef = `[${col.name}] ${this.mapDataType(col.type, 'sqlserver')}`

              if (col.length) columnDef += `(${col.length})`
              if (!col.nullable) columnDef += ' NOT NULL'
              if (col.unique && !col.is_primary_key) columnDef += ' UNIQUE'

              if (col.is_primary_key && col.type.includes('INT')) {
                columnDef += ' IDENTITY(1,1)'
              }

              if (col.default) {
                columnDef += this.formatDefaultValue(col.default, col.type, 'sqlserver')
              }

              return `  ${columnDef}`
            })
            .join(',\n')

          let constraints = []

          if (hasPK) {
            const pkColumnNames = primaryKeys
              .sort((a, b) => (a.primary_key_order || 0) - (b.primary_key_order || 0))
              .map((col) => `[${col.name}]`)
              .join(', ')
            constraints.push(`  CONSTRAINT PK_${table.name} PRIMARY KEY (${pkColumnNames})`)
          }

          const foreignKeys = (table.columns || [])
            .filter((col) => col.is_foreign_key && col.references)
            .map((col) => {
              const referencedTable = this.databaseTables.find((t) => t.name === col.references)
              const referencedPKs = referencedTable?.columns?.filter((c) => c.is_primary_key) || []
              const pkColumnName = referencedPKs.length === 1 ? referencedPKs[0].name : 'id'
              return `  CONSTRAINT FK_${table.name}_${col.name} FOREIGN KEY ([${col.name}]) REFERENCES [${col.references}]([${pkColumnName}])`
            })

          constraints = [...constraints, ...foreignKeys]

          let sql = `CREATE TABLE [${table.name}] (\n${columns}`
          if (constraints.length > 0) {
            sql += `,\n${constraints.join(',\n')}`
          }
          sql += '\n);'
          return sql
        })
        .join('\n\n')

      return sqlStatements
    },

    generatePostgreSQLSQL() {
      const sqlStatements = this.databaseTables
        .map((table) => {
          const primaryKeys = table.columns?.filter((col) => col.is_primary_key) || []
          const hasPK = primaryKeys.length > 0

          const columns = (table.columns || [])
            .map((col) => {
              let columnDef = `"${col.name}" ${this.mapDataType(col.type, 'postgresql')}`

              if (col.length) columnDef += `(${col.length})`
              if (!col.nullable) columnDef += ' NOT NULL'
              if (col.unique && !col.is_primary_key) columnDef += ' UNIQUE'

              if (col.is_primary_key && col.type.includes('SERIAL')) {
                columnDef = `"${col.name}" SERIAL`
              }

              if (col.default) {
                columnDef += this.formatDefaultValue(col.default, col.type, 'postgresql')
              }

              return `  ${columnDef}`
            })
            .join(',\n')

          let constraints = []

          if (hasPK) {
            const pkColumnNames = primaryKeys
              .sort((a, b) => (a.primary_key_order || 0) - (b.primary_key_order || 0))
              .map((col) => `"${col.name}"`)
              .join(', ')
            constraints.push(`  PRIMARY KEY (${pkColumnNames})`)
          }

          const foreignKeys = (table.columns || [])
            .filter((col) => col.is_foreign_key && col.references)
            .map((col) => {
              const referencedTable = this.databaseTables.find((t) => t.name === col.references)
              const referencedPKs = referencedTable?.columns?.filter((c) => c.is_primary_key) || []
              const pkColumnName = referencedPKs.length === 1 ? referencedPKs[0].name : 'id'
              return `  FOREIGN KEY ("${col.name}") REFERENCES "${col.references}"("${pkColumnName}")`
            })

          constraints = [...constraints, ...foreignKeys]

          let sql = `CREATE TABLE "${table.name}" (\n${columns}`
          if (constraints.length > 0) {
            sql += `,\n${constraints.join(',\n')}`
          }
          sql += '\n);'
          return sql
        })
        .join('\n\n')

      return sqlStatements
    },

    generateOracleSQL() {
      const sqlStatements = this.databaseTables
        .map((table) => {
          const primaryKeys = table.columns?.filter((col) => col.is_primary_key) || []
          const hasPK = primaryKeys.length > 0

          const columns = (table.columns || [])
            .map((col) => {
              let columnDef = `"${col.name}" ${this.mapDataType(col.type, 'oracle')}`

              if (col.length) columnDef += `(${col.length})`
              if (!col.nullable) columnDef += ' NOT NULL'
              if (col.unique && !col.is_primary_key) columnDef += ' UNIQUE'

              if (col.default) {
                columnDef += this.formatDefaultValue(col.default, col.type, 'oracle')
              }

              return `  ${columnDef}`
            })
            .join(',\n')

          let constraints = []

          if (hasPK) {
            const pkColumnNames = primaryKeys
              .sort((a, b) => (a.primary_key_order || 0) - (b.primary_key_order || 0))
              .map((col) => `"${col.name}"`)
              .join(', ')
            constraints.push(`  CONSTRAINT PK_${table.name} PRIMARY KEY (${pkColumnNames})`)
          }

          const foreignKeys = (table.columns || [])
            .filter((col) => col.is_foreign_key && col.references)
            .map((col) => {
              const referencedTable = this.databaseTables.find((t) => t.name === col.references)
              const referencedPKs = referencedTable?.columns?.filter((c) => c.is_primary_key) || []
              const pkColumnName = referencedPKs.length === 1 ? referencedPKs[0].name : 'id'
              return `  CONSTRAINT FK_${table.name}_${col.name} FOREIGN KEY ("${col.name}") REFERENCES "${col.references}"("${pkColumnName}")`
            })

          constraints = [...constraints, ...foreignKeys]

          let sql = `CREATE TABLE "${table.name}" (\n${columns}`
          if (constraints.length > 0) {
            sql += `,\n${constraints.join(',\n')}`
          }
          sql += '\n);'
          return sql
        })
        .join('\n\n')

      return sqlStatements
    },

    generateSQLiteSQL() {
      const sqlStatements = this.databaseTables
        .map((table) => {
          const primaryKeys = table.columns?.filter((col) => col.is_primary_key) || []
          const hasPK = primaryKeys.length > 0

          const columns = (table.columns || [])
            .map((col) => {
              let columnDef = `"${col.name}" ${this.mapDataType(col.type, 'sqlite')}`

              if (!col.nullable) columnDef += ' NOT NULL'
              if (col.unique && !col.is_primary_key) columnDef += ' UNIQUE'

              if (col.is_primary_key) {
                columnDef += ' PRIMARY KEY'
                if (col.type.includes('INT')) {
                  columnDef += ' AUTOINCREMENT'
                }
              }

              if (col.default) {
                columnDef += this.formatDefaultValue(col.default, col.type, 'sqlite')
              }

              return `  ${columnDef}`
            })
            .join(',\n')

          let sql = `CREATE TABLE "${table.name}" (\n${columns}`

          // SQLite doesn't support named foreign key constraints in column definitions
          const foreignKeys = (table.columns || [])
            .filter((col) => col.is_foreign_key && col.references && !col.is_primary_key)
            .map((col) => {
              const referencedTable = this.databaseTables.find((t) => t.name === col.references)
              const referencedPKs = referencedTable?.columns?.filter((c) => c.is_primary_key) || []
              const pkColumnName = referencedPKs.length === 1 ? referencedPKs[0].name : 'id'
              return `  FOREIGN KEY ("${col.name}") REFERENCES "${col.references}"("${pkColumnName}")`
            })

          if (foreignKeys.length > 0) {
            sql += `,\n${foreignKeys.join(',\n')}`
          }

          sql += '\n);'
          return sql
        })
        .join('\n\n')

      return sqlStatements
    },

    mapDataType(originalType, dialect) {
      const typeMap = {
        mysql: {
          VARCHAR: 'VARCHAR',
          INT: 'INT',
          BIGINT: 'BIGINT',
          TEXT: 'TEXT',
          DATETIME: 'DATETIME',
          TIMESTAMP: 'TIMESTAMP',
          BOOLEAN: 'TINYINT(1)',
          DECIMAL: 'DECIMAL',
        },
        sqlserver: {
          VARCHAR: 'VARCHAR',
          INT: 'INT',
          BIGINT: 'BIGINT',
          TEXT: 'TEXT',
          DATETIME: 'DATETIME2',
          TIMESTAMP: 'DATETIME2',
          BOOLEAN: 'BIT',
          DECIMAL: 'DECIMAL',
        },
        postgresql: {
          VARCHAR: 'VARCHAR',
          INT: 'INTEGER',
          BIGINT: 'BIGINT',
          TEXT: 'TEXT',
          DATETIME: 'TIMESTAMP',
          TIMESTAMP: 'TIMESTAMP',
          BOOLEAN: 'BOOLEAN',
          DECIMAL: 'DECIMAL',
        },
        oracle: {
          VARCHAR: 'VARCHAR2',
          INT: 'NUMBER',
          BIGINT: 'NUMBER',
          TEXT: 'CLOB',
          DATETIME: 'DATE',
          TIMESTAMP: 'TIMESTAMP',
          BOOLEAN: 'NUMBER(1)',
          DECIMAL: 'NUMBER',
        },
        sqlite: {
          VARCHAR: 'TEXT',
          INT: 'INTEGER',
          BIGINT: 'INTEGER',
          TEXT: 'TEXT',
          DATETIME: 'TEXT',
          TIMESTAMP: 'TEXT',
          BOOLEAN: 'INTEGER',
          DECIMAL: 'REAL',
        },
      }

      return typeMap[dialect]?.[originalType?.toUpperCase()] || originalType
    },

    formatDefaultValue(defaultValue, columnType, dialect) {
      if (!defaultValue) return ''

      const upperType = columnType?.toUpperCase() || ''

      if (['VARCHAR', 'CHAR', 'TEXT', 'LONGTEXT'].some((t) => upperType.includes(t))) {
        if (defaultValue === 'CURRENT_TIMESTAMP') {
          if (dialect === 'mysql') return ' DEFAULT CURRENT_TIMESTAMP'
          if (dialect === 'postgresql') return ' DEFAULT NOW()'
          if (dialect === 'sqlserver') return ' DEFAULT GETDATE()'
          if (dialect === 'oracle') return ' DEFAULT SYSDATE'
          if (dialect === 'sqlite') return ' DEFAULT CURRENT_TIMESTAMP'
        }

        if (defaultValue.startsWith("'") && defaultValue.endsWith("'")) {
          return ` DEFAULT ${defaultValue}`
        }
        return ` DEFAULT '${defaultValue}'`
      }

      if (defaultValue === 'CURRENT_TIMESTAMP') {
        if (dialect === 'mysql') return ' DEFAULT CURRENT_TIMESTAMP'
        if (dialect === 'postgresql') return ' DEFAULT NOW()'
        if (dialect === 'sqlserver') return ' DEFAULT GETDATE()'
        if (dialect === 'oracle') return ' DEFAULT SYSDATE'
        if (dialect === 'sqlite') return ' DEFAULT CURRENT_TIMESTAMP'
      }

      return ` DEFAULT ${defaultValue}`
    },

    getDialectName(dialect) {
      const names = {
        mysql: 'MySQL',
        sqlserver: 'SQL Server',
        postgresql: 'PostgreSQL',
        oracle: 'Oracle',
        sqlite: 'SQLite',
      }
      return names[dialect] || 'MySQL'
    },

    async copySQL() {
      try {
        await navigator.clipboard.writeText(this.generatedSQL)
        this.toast.success('SQL copied to clipboard!')
      } catch (err) {
        console.error('Failed to copy SQL:', err)
        this.toast.error('Failed to copy SQL')
      }
    },

    downloadSQL() {
      const blob = new Blob([this.generatedSQL], { type: 'text/sql' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${this.database?.name || 'database'}-schema-${this.selectedSQLDialect}.sql`
      link.click()
      URL.revokeObjectURL(url)
    },

    async exportSQL() {
      try {
        const { data: sqlData } = await exportDatabaseSQL(this.database._id)
        const sql = sqlData.data?.sql || sqlData.sql || sqlData

        const blob = new Blob([sql], { type: 'text/sql' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${this.database?.name || 'database'}-schema-export.sql`
        link.click()
        URL.revokeObjectURL(url)

        this.toast.success('SQL exported successfully')
      } catch (error) {
        console.error('Failed to export SQL:', error)
        this.toast.error('Failed to export SQL')
      }
    },

    exportSchema() {
      const schemaData = {
        database: this.database,
        tables: this.databaseTables,
        relationships: this.relationships,
        generatedSQL: this.generatedSQL,
        sqlDialect: this.selectedSQLDialect,
        exportDate: new Date().toISOString(),
      }

      const dataStr = JSON.stringify(schemaData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${this.database?.name || 'database'}-schema-${new Date().getTime()}.json`
      link.click()
      URL.revokeObjectURL(url)
    },

    // Composite Key methods
    async viewCompositeKeyDetails(table) {
      try {
        this.selectedCompositeKeyTable = table
        const { data: keyInfo } = await getCompositeKeyInfo(this.database._id, table.name)
        this.selectedCompositeKeyInfo = keyInfo.data || keyInfo
      } catch (error) {
        console.error('Failed to load composite key info:', error)
        this.toast.error('Failed to load composite key details')
      }
    },

    async createCompositeKey({ tableName, columnNames }) {
      try {
        await createCompositeKey(this.database._id, tableName, columnNames)
        this.toast.success(`Composite key created for table ${tableName}`)
        await this.loadDatabaseData()
        this.showCompositeKeyModal = false
      } catch (error) {
        console.error('Failed to create composite key:', error)
        this.toast.error(error.response?.data?.message || 'Failed to create composite key')
      }
    },

    async convertToSingleKey(table) {
      if (!table.compositeKey?.columns?.length) return

      const firstPKColumn = table.compositeKey.columns[0]
      const suggestedColumn = table.columns.find((col) => col.name === 'id') || firstPKColumn

      if (
        confirm(
          `Convert table "${table.name}" from composite key to single key using "${suggestedColumn.name}"?`
        )
      ) {
        try {
          await convertToSingleKey(this.database._id, table.name, suggestedColumn.name)
          this.toast.success(`Converted to single key using ${suggestedColumn.name}`)
          await this.loadDatabaseData()
        } catch (error) {
          console.error('Failed to convert to single key:', error)
          this.toast.error(error.response?.data?.message || 'Failed to convert to single key')
        }
      }
    },

    // Relationship methods
    getTableRelationships(tableName) {
      return this.relationships.filter(
        (rel) => rel.from_table === tableName || rel.to_table === tableName
      )
    },

    async addRelationship(relationship) {
      try {
        this.relationships.push(relationship)

        if (this.database?._id) {
          const response = await updateDatabase(this.database._id, {
            relationships: this.relationships,
          })
          // ✅ Cập nhật selectedVersionId nếu có version mới được bump
          // Response format: { message, data, version, newVersionId }
          const newVersionId = response.data?.newVersionId
          if (newVersionId) {
            this.selectedVersionId = newVersionId
            saveSelectedVersion(this.project._id, this.selectedVersionId)
            console.log('🔄 Updated selectedVersionId to new version:', this.selectedVersionId)
            // Reload database data để đồng bộ với version mới
            await this.loadDatabaseData()
          }
        }

        this.updateStats()
        this.generateSQL()
        this.toast.success('Relationship added successfully')
      } catch (err) {
        console.error('Error adding relationship:', err)
        this.toast.error('Failed to add relationship')
      }
    },

    async removeRelationship(index) {
      try {
        this.relationships.splice(index, 1)

        if (this.database?._id) {
          const response = await updateDatabase(this.database._id, {
            relationships: this.relationships,
          })
          // ✅ Cập nhật selectedVersionId nếu có version mới được bump
          // Response format: { message, data, version, newVersionId }
          const newVersionId = response.data?.newVersionId
          if (newVersionId) {
            this.selectedVersionId = newVersionId
            saveSelectedVersion(this.project._id, this.selectedVersionId)
            console.log('🔄 Updated selectedVersionId to new version:', this.selectedVersionId)
            // Reload database data để đồng bộ với version mới
            await this.loadDatabaseData()
          }
        }

        this.updateStats()
        this.generateSQL()
        this.toast.success('Relationship removed successfully')
      } catch (err) {
        console.error('Error removing relationship:', err)
        this.toast.error('Failed to remove relationship')
      }
    },

    // Table actions
    viewTableDetails(table) {
      this.selectedTable = table
    },

    async editTable(table) {
      console.log('✏️ Editing table:', table.name)
      this.editingTable = { ...table }
      this.loadingAvailableTables = true

      try {
        const response = await getAvailableTablesForReferences(this.database._id, table.name)
        let availableTablesData = response.data

        if (
          availableTablesData &&
          availableTablesData.data &&
          Array.isArray(availableTablesData.data)
        ) {
          availableTablesData = availableTablesData.data
        }

        this.availableTables = Array.isArray(availableTablesData) ? availableTablesData : []
        console.log('📋 Available tables for edit:', this.availableTables)
      } catch (error) {
        console.error('Failed to load available tables:', error)
        this.availableTables = []
        this.toast.error('Failed to load available tables')
      } finally {
        this.loadingAvailableTables = false
      }
    },

    async deleteTable(deleteData) {
      const tableName =
        typeof deleteData === 'string' ? deleteData : deleteData.tableName || deleteData.name

      if (!tableName) {
        console.error('Invalid delete data:', deleteData)
        return
      }

      if (!confirm(`Xóa bảng "${tableName}"?`)) return

      try {
        await deleteTableFromDatabase(this.database._id, tableName)

        this.databaseTables = this.databaseTables.filter((table) => table.name !== tableName)
        this.relationships = this.relationships.filter(
          (rel) => rel.from_table !== tableName && rel.to_table !== tableName
        )

        this.updateStats()
        this.generateSQL()
        this.toast.success(`Đã xóa bảng "${tableName}"`)
      } catch (err) {
        console.error('❌ Delete error:', err)
        this.toast.error('Xóa thất bại: ' + (err.response?.data?.message || err.message))
      }
    },

    async saveTable(tableData) {
      if (
        !tableData ||
        typeof tableData !== 'object' ||
        Array.isArray(tableData) ||
        'positions' in tableData
      ) {
        return
      }

      const keys = Object.keys(tableData)
      const isPositionOnly =
        keys.length > 0 &&
        keys.every((k) => ['_id', 'name', 'position'].includes(k)) &&
        !tableData.columns

      if (isPositionOnly) {
        return
      }

      const allowedEditKeys = ['_id', 'name', 'description', 'columns']
      if (!keys.some((k) => allowedEditKeys.includes(k))) {
        return
      }

      console.log('💾 Saving table:', tableData.name, 'Editing mode:', !!this.editingTable)

      try {
        if (!this.database?._id) {
          this.toast.error('No database selected')
          return
        }

        let updatedTables = [...this.databaseTables]

        if (this.editingTable) {
          const originalTableName = this.editingTable.name
          console.log('🔄 Updating table:', originalTableName, '→', tableData.name)

          await updateTableInDatabase(this.database._id, originalTableName, tableData)

          const index = updatedTables.findIndex((t) => t.name === originalTableName)
          if (index !== -1) {
            const updatedTable = {
              ...tableData,
              position: updatedTables[index].position,
            }
            updatedTables[index] = updatedTable

            const pkChanges = this.detectPKTypeChanges(this.editingTable, tableData)
            if (Object.keys(pkChanges).length > 0) {
              console.log('🎯 PK type changes detected:', pkChanges)
              updatedTables = this.syncForeignKeyTypes(updatedTables, pkChanges)
            }
          }

          this.toast.success('Table updated successfully!')
        } else {
          console.log('🆕 Creating new table:', tableData.name)

          const newTable = {
            ...tableData,
            position: { x: Math.random() * 500, y: Math.random() * 400 },
          }
          const { data } = await addTableToDatabase(this.database._id, newTable)
          const createdTable = data.data || data
          updatedTables.push(createdTable)

          this.toast.success('Table created successfully!')
        }

        this.databaseTables = updatedTables
        this.updateStats()
        this.generateSQL()

        this.$nextTick(() => {
          console.log('🔄 Database tables updated, diagram should re-render')
        })

        this.closeModal()
      } catch (err) {
        console.error('Error saving table:', err)
        this.toast.error(err.response?.data?.message || 'Failed to save table')
      }
    },

    detectPKTypeChanges(oldTable, newTable) {
      const changes = {}

      const oldPK = oldTable.columns?.find((col) => col.is_primary_key)
      const newPK = newTable.columns?.find((col) => col.is_primary_key)

      if (oldPK && newPK && oldPK.type !== newPK.type) {
        changes[newTable.name] = newPK.type
        console.log(`🎯 PK type changed: ${oldTable.name} ${oldPK.type} → ${newPK.type}`)
      }

      return changes
    },

    syncForeignKeyTypes(tables, pkChanges) {
      return tables.map((table) => {
        const updatedTable = { ...table }

        if (updatedTable.columns) {
          updatedTable.columns = updatedTable.columns.map((column) => {
            if (column.is_foreign_key && column.references && pkChanges[column.references]) {
              const newType = pkChanges[column.references]
              console.log(`🔄 Syncing FK: ${table.name}.${column.name} ${column.type} → ${newType}`)

              return {
                ...column,
                type: newType,
                length: this.shouldResetLength(newType) ? null : column.length,
              }
            }
            return column
          })
        }

        return updatedTable
      })
    },

    shouldResetLength(type) {
      const typesWithoutLength = [
        'TEXT',
        'LONGTEXT',
        'BLOB',
        'LONGBLOB',
        'BOOLEAN',
        'DATE',
        'DATETIME',
        'TIMESTAMP',
        'TIME',
      ]
      return typesWithoutLength.includes(type?.toUpperCase())
    },

    // Dialect filter methods
    toggleDialectFilter() {
      this.showDialectFilter = !this.showDialectFilter
    },
    setDialect(value) {
      this.selectedSQLDialect = value
      this.showDialectFilter = false
    },
    getDialectName(dialect) {
      const names = {
        mysql: 'MySQL',
        sqlserver: 'SQL Server',
        postgresql: 'PostgreSQL',
        oracle: 'Oracle',
        sqlite: 'SQLite',
      }
      return names[dialect] || dialect
    },
    handleClickOutsideDialectFilter(event) {
      if (!event.target.closest('.filter-icon-wrapper')) {
        this.showDialectFilter = false
      }
    },
    closeModal() {
      this.showCreateTableModal = false
      this.editingTable = null
      this.availableTables = []
    },

    // Position handling
    async handleSavePositions({ databaseId, positionUpdates }, callback) {
      console.log('✅✅✅ HÀM HANDLE_SAVE_POSITIONS ĐÃ ĐƯỢC GỌI ✅✅✅')
      try {
        const currentTableNames = new Set(this.databaseTables.map((t) => t.name))
        const validPositionUpdates = positionUpdates.filter((update) => {
          if (currentTableNames.has(update.tableName)) {
            return true
          }
          console.warn(
            `[Data Sync Warning] Attempted to save position for a non-existent table: "${update.tableName}". This update will be skipped.`
          )
          return false
        })

        if (validPositionUpdates.length === 0) {
          console.log('No valid table positions to save.')
          if (callback) callback(true)
          return
        }

        console.log('🔄 Saving positions for valid tables:', {
          databaseId,
          tableCount: validPositionUpdates.length,
          tableNames: validPositionUpdates.map((u) => u.tableName),
        })

        const response = await updateMultipleTablePositions(databaseId, validPositionUpdates)
        console.log('✅ Backend response:', response)

        if (callback) callback(true)
      } catch (error) {
        console.error('❌ Failed to save positions:', error)
        if (callback) callback(false)
        const errorMessage = error.response?.data?.message || error.message
        this.toast.error(`Failed to save positions: ${errorMessage}`)
      }
    },

    handleTablesUpdated(updatedTables) {
      this.databaseTables = updatedTables
      this.updateStats()
      this.generateSQL()
    },

    // Socket methods for version events
    initVersionSocketListeners(projectId) {
      if (!socket) return

      // Join project room if not already joined
      if (socket.connected) {
        socket.emit('join_project', projectId)
      }

      // Listen for version events
      socket.on('version_event', this.handleVersionEvent)
      console.log('✅ Version socket listeners initialized for DatabaseManagement')
    },

    cleanupVersionSocketListeners() {
      if (socket) {
        socket.off('version_event', this.handleVersionEvent)
        console.log('🧹 Version socket listeners cleaned up')
      }
    },

    handleVersionEvent(event) {
      console.log('📩 Realtime version event received in DatabaseManagement:', event)

      // Bỏ qua events từ chính mình
      const currentUserId = localStorage.getItem('userId')
      if (event.userId === currentUserId) return

      switch (event.type) {
        case 'VERSION_SWITCHED':
          this.handleRemoteVersionSwitched(event)
          break
        case 'VERSION_CREATED':
          this.handleRemoteVersionCreated(event)
          break
        default:
          console.log('ℹ️ Unhandled version event type:', event.type)
      }
    },

    async handleRemoteVersionSwitched(event) {
      console.log('🔄 Remote version switched event:', event)
      
      if (event.projectId !== this.project._id) return

      const { toVersionId } = event

      // Cập nhật selectedVersionId
      this.selectedVersionId = toVersionId
      saveSelectedVersion(this.project._id, toVersionId)

      // Refresh data với version mới
      await this.loadDatabaseData()

      // Thông báo cho user
      const version = this.versions.find((v) => v._id === toVersionId)
      if (version) {
        this.toast.info(`Version switched to: ${version.version_number || toVersionId}`)
      }
    },

    async handleRemoteVersionCreated(event) {
      console.log('🆕 Remote version created event:', event)
      
      if (event.projectId !== this.project._id) return

      // Refresh project data để lấy version mới
      await this.fetchProjectData(this.project._id)

      // Nếu có version trong event, thêm vào danh sách
      if (event.version) {
        const exists = this.versions.find((v) => v._id === event.version._id)
        if (!exists && (event.version.version_temporary === false || event.version.version_temporary === undefined)) {
          this.versions.push(event.version)
        }
      }

      // Tự động switch sang version mới nếu được approve
      if (event.version && (event.version.version_temporary === false || event.version.version_temporary === undefined)) {
        this.selectedVersionId = event.version._id
        saveSelectedVersion(this.project._id, event.version._id)
        await this.loadDatabaseData()
        this.toast.info(`New version created: ${event.version.version_number || event.version._id}`)
      }
    },
  },
}
</script>

<style scoped>
.database-management-view {
  padding: 30px;
  background: #f9fafb;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.database-content {
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
}

.header-left h2 {
  font-size: 2rem;
  font-weight: 700;
  color: #1a365d;
  margin-bottom: 8px;
}

.header-left .description {
  color: #6b7280;
  font-size: 1rem;
  margin: 0 0 16px 0;
}

.database-meta {
  display: flex;
  gap: 20px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  color: #6b7280;
}

.meta-item .material-symbols-outlined {
  font-size: 16px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
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

.btn-primary:hover:not(:disabled) {
  background: #2d4a8a;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

/* SQL Dialect Selector */
.sql-dialect-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 16px;
}

.sql-dialect-selector label {
  font-size: 0.9rem;
  color: #374151;
  font-weight: 500;
}
.database-main-content {
  margin-top: 20px;
}
.dialect-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 0.9rem;
  cursor: pointer;
}

.dialect-select:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
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
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 40px;
  height: 40px;
}

.filter-icon-btn:hover {
  background: #f9fafb;
  border-color: #1a365d;
  color: #1a365d;
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
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 180px;
  z-index: 100;
  overflow: hidden;
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
  transition: all 0.2s ease;
}

.filter-option:hover {
  background: #f9fafb;
}

.filter-option.active {
  background: #e6f2ff;
  color: #1a365d;
  font-weight: 500;
}

.filter-option .material-symbols-outlined {
  font-size: 18px;
  color: #6b7280;
}

.filter-option.active .material-symbols-outlined {
  color: #1a365d;
}

/* SQL Preview Header */
.sql-header {
  padding: 12px 20px;
  background: #374151;
  border-bottom: 1px solid #4b5563;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dialect-badge {
  background: #1a365d;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Quick Actions Panel */
.quick-actions-panel {
  background: white;
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.panel-header h3 {
  margin: 0;
  color: #374151;
  font-size: 1.1rem;
  font-weight: 600;
}

.panel-header .material-symbols-outlined {
  color: #ea580c;
}

.badge {
  background: #ea580c;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.composite-tables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 20px;
}

.composite-table-card {
  background: #fef7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.composite-table-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #fdba74;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.table-name {
  font-weight: 600;
  color: #9a3412;
  font-size: 1rem;
}

.key-size {
  background: #ea580c;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.key-columns-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.key-column-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 4px;
}

.column-order {
  background: #ea580c;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
}

.column-name {
  font-weight: 500;
  font-size: 0.9rem;
  color: #374151;
}

.column-type {
  font-size: 0.7rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 1px 4px;
  border-radius: 2px;
}

.more-columns {
  font-size: 0.8rem;
  color: #6b7280;
  text-align: center;
  padding: 4px;
}

.card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-icon {
  background: none;
  border: none;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: #e5e7eb;
  color: #374151;
}

/* Loading, Error, Empty States */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.loading-state .spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #1a365d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-state .material-symbols-outlined,
.empty-state .material-symbols-outlined {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-state .material-symbols-outlined {
  color: #ef4444;
}

.empty-state .material-symbols-outlined {
  color: #9ca3af;
}

.error-state h3,
.empty-state h3 {
  font-size: 1.5rem;
  margin-bottom: 8px;
  color: #1f2937;
}

.error-state p,
.empty-state p {
  color: #6b7280;
  margin-bottom: 20px;
}

/* Schema Section */
.schema-section {
  background: white;
  border-radius: 12px;
  margin-bottom: 30px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 2px solid #0000005a;
}

.section-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.view-options {
  display: flex;
  gap: 8px;
}

.btn-secondary.active {
  background: #1a365d;
  color: white;
  border-color: #1a365d;
}

/* SQL Preview */
.sql-preview-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.sql-preview {
  padding: 0;
  background: #1f2937;
  border-radius: 0 0 12px 12px;
  max-height: 400px;
  overflow-y: auto;
}

.sql-preview pre {
  margin: 0;
  color: #e5e7eb;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  padding: 20px;
}

.sql-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

</style>