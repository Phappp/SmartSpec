<template>
  <div class="database-management-view">
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
        <span class="material-symbols-outlined">storage</span>
        Database
      </button>
    </div>

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
            <h2>{{ database.name }}</h2>
            <p class="description">{{ database.description }}</p>
          </div>
          <div class="header-actions">
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
                Export
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

        <!-- SQL Preview -->
        <div class="sql-preview-section">
          <div class="section-header">
            <h3>SQL Preview</h3>
            <div class="sql-actions">
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
            <pre><code>{{ generatedSQL }}</code></pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Table Modal -->
    <TableModal
      v-if="showCreateTableModal || editingTable"
      :table="editingTable"
      :available-tables="availableTables"
      :loading="loadingAvailableTables"
      @save="saveTable"
      @close="closeModal"
    />

    <!-- Relationship Management Modal -->
    <RelationshipModal
      v-if="showRelationshipModal"
      :relationships="relationships"
      :tables="databaseTables"
      @save-relationship="addRelationship"
      @remove-relationship="removeRelationship"
      @close="showRelationshipModal = false"
    />

    <!-- Table Details Modal -->
    <TableDetailsModal
      v-if="selectedTable"
      :table="selectedTable"
      :relationships="getTableRelationships(selectedTable.name)"
      @close="selectedTable = null"
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
} from '@/api/project'
import { useToast } from 'vue-toastification'
import ProjectHeader from '@/components/ProjectHeader.vue'
import DatabaseStats from '@/components/database/DatabaseStats.vue'
import DatabaseDiagram from '@/components/database/DatabaseDiagram.vue'
import DatabaseList from '@/components/database/DatabaseList.vue'
import TableModal from '@/components/database/TableModal.vue'
import RelationshipModal from '@/components/database/RelationshipModal.vue'
import TableDetailsModal from '@/components/database/TableDetailsModal.vue'

export default {
  name: 'DatabaseManagement',
  components: {
    ProjectHeader,
    DatabaseStats,
    DatabaseDiagram,
    DatabaseList,
    TableModal,
    RelationshipModal,
    TableDetailsModal,
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
        relatedUsecases: 0,
      },

      viewMode: 'diagram',

      showCreateTableModal: false,
      showRelationshipModal: false,
      editingTable: null,
      selectedTable: null,
      availableTables: [],
      loadingAvailableTables: false,
      generatedSQL: '',

      toast: useToast(),
    }
  },
  computed: {
    debugAvailableTables() {
      console.log('🔍 [DEBUG] availableTables:', this.availableTables)
      console.log('🔍 [DEBUG] Type:', typeof this.availableTables)
      console.log('🔍 [DEBUG] Is array:', Array.isArray(this.availableTables))
      console.log('🔍 [DEBUG] Has data property:', this.availableTables?.data)
      return this.availableTables
    },
  },
  async created() {
    const projectId = this.$route.params.id
    if (projectId) {
      await this.fetchProjectData(projectId)
      await this.loadDatabaseData()
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

    goBack() {
      this.$router.push('/dashboard')
    },

    // Data methods
    async fetchProjectData(projectId) {
      try {
        const { data } = await getProjectDetail(projectId)
        const result = data.data || data
        this.project = result.project || result
        this.versions = result.versions || []

        if (this.versions.length > 0) {
          this.selectedVersionId = this.versions[0]._id
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

    async generateDatabaseSchema() {
      if (!this.selectedVersionId) {
        this.toast.error('Please select a version first')
        return
      }

      this.generatingSchema = true
      try {
        const { data } = await generateDatabaseSchema(this.selectedVersionId)
        this.toast.success('Database schema generated successfully!')
        await this.loadDatabaseData()
      } catch (err) {
        console.error('Error generating database schema:', err)
        this.toast.error(err.response?.data?.message || 'Failed to generate database schema')
      } finally {
        this.generatingSchema = false
      }
    },

    updateStats() {
      this.databaseStats.tables = this.databaseTables.length
      this.databaseStats.relationships = this.relationships.length
      this.databaseStats.columns = this.databaseTables.reduce(
        (sum, table) => sum + (table.columns?.length || 0),
        0
      )

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
          await updateDatabase(this.database._id, {
            relationships: this.relationships,
          })
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
          await updateDatabase(this.database._id, {
            relationships: this.relationships,
          })
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

    async deleteTable(tableId) {
      if (!confirm('Are you sure you want to delete this table? This action cannot be undone.')) {
        return
      }

      try {
        if (this.database?._id) {
          await deleteTableFromDatabase(this.database._id, tableId)
        }

        const tableToDelete = this.databaseTables.find((t) => t._id === tableId)
        this.databaseTables = this.databaseTables.filter((table) => table._id !== tableId)

        // Remove relationships involving this table
        if (tableToDelete) {
          this.relationships = this.relationships.filter(
            (rel) => rel.from_table !== tableToDelete.name && rel.to_table !== tableToDelete.name
          )
        }

        this.updateStats()
        this.generateSQL()
        this.toast.success('Table deleted successfully')
      } catch (err) {
        console.error('Error deleting table:', err)
        this.toast.error('Failed to delete table')
      }
    },

    async saveTable(tableData) {
      // 1) Bỏ qua hoàn toàn nếu payload liên quan vị trí/positions hoặc không phải object bảng
      if (
        !tableData ||
        typeof tableData !== 'object' ||
        Array.isArray(tableData) ||
        'positions' in tableData // batch vị trí hoặc nhầm payload
      ) {
        return
      }

      // 2) Nếu payload chỉ có position/_id/name (kéo thả) → bỏ qua
      const keys = Object.keys(tableData)
      const isPositionOnly =
        keys.length > 0 &&
        keys.every((k) => ['_id', 'name', 'position'].includes(k)) &&
        !tableData.columns

      if (isPositionOnly) {
        return
      }

      // 3) Chỉ cho phép cập nhật khi thực sự có thay đổi cấu trúc
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

        // TẠO BẢN SAO CỦA DATABASE TABLES ĐỂ THỰC HIỆN SYNC
        let updatedTables = [...this.databaseTables]

        // PHÂN BIỆT RÕ RÀNG GIỮA CREATE VÀ UPDATE
        if (this.editingTable) {
          // UPDATE EXISTING TABLE - sử dụng tên gốc để xác định bảng cần update
          const originalTableName = this.editingTable.name
          console.log('🔄 Updating table:', originalTableName, '→', tableData.name)

          await updateTableInDatabase(this.database._id, originalTableName, tableData)

          // Cập nhật local state
          const index = updatedTables.findIndex((t) => t.name === originalTableName)
          if (index !== -1) {
            // Giữ nguyên position khi update
            const updatedTable = {
              ...tableData,
              position: updatedTables[index].position,
            }
            updatedTables[index] = updatedTable

            // 🔥 REAL-TIME SYNC: PHÁT HIỆN VÀ CẬP NHẬT FK KHI PK THAY ĐỔI
            const pkChanges = this.detectPKTypeChanges(this.editingTable, tableData)
            if (Object.keys(pkChanges).length > 0) {
              console.log('🎯 PK type changes detected:', pkChanges)
              updatedTables = this.syncForeignKeyTypes(updatedTables, pkChanges)
            }
          }

          this.toast.success('Table updated successfully!')
        } else {
          // CREATE NEW TABLE
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

        // 🔄 CẬP NHẬT STATE VỚI DỮ LIỆU ĐÃ SYNC
        this.databaseTables = updatedTables
        this.updateStats()
        this.generateSQL()

        // Force diagram re-render với data mới
        this.$nextTick(() => {
          console.log('🔄 Database tables updated, diagram should re-render')
        })

        this.closeModal()
      } catch (err) {
        console.error('Error saving table:', err)
        this.toast.error(err.response?.data?.message || 'Failed to save table')
      }
    },

    // THÊM 2 METHODS MỚI ĐỂ SYNC FK
    methods: {
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
          // Clone table để tránh mutation
          const updatedTable = { ...table }

          if (updatedTable.columns) {
            updatedTable.columns = updatedTable.columns.map((column) => {
              // Nếu column là FK và reference đến table có PK thay đổi
              if (column.is_foreign_key && column.references && pkChanges[column.references]) {
                const newType = pkChanges[column.references]
                console.log(
                  `🔄 Syncing FK: ${table.name}.${column.name} ${column.type} → ${newType}`
                )

                return {
                  ...column,
                  type: newType,
                  // Reset length nếu type mới không hỗ trợ length
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
    },

    closeModal() {
      this.showCreateTableModal = false
      this.editingTable = null // QUAN TRỌNG: Reset editing state
      this.availableTables = []
    },

    handleVersionSelect(versionId) {
      this.selectedVersionId = versionId
      this.loadDatabaseData()
    },

    // SQL Generation
    generateSQL() {
      if (!this.databaseTables || this.databaseTables.length === 0) {
        this.generatedSQL = '-- No tables to generate SQL for'
        return
      }

      const sqlStatements = this.databaseTables
        .map((table) => {
          const columns = (table.columns || [])
            .map((col) => {
              let columnDef = `${col.name} ${col.type}`
              if (col.length) columnDef += `(${col.length})`
              if (!col.nullable) columnDef += ' NOT NULL'
              if (col.unique) columnDef += ' UNIQUE'
              if (col.is_primary_key) columnDef += ' PRIMARY KEY AUTO_INCREMENT'
              if (col.default) columnDef += ` DEFAULT ${col.default}`
              return columnDef
            })
            .join(',\n  ')

          const foreignKeys = (table.columns || [])
            .filter((col) => col.is_foreign_key && col.references)
            .map((col) => {
              return `FOREIGN KEY (${col.name}) REFERENCES ${col.references}(id)`
            })
            .join(',\n  ')

          const constraints = foreignKeys ? `,\n  ${foreignKeys}` : ''

          return `CREATE TABLE ${table.name} (\n  ${columns}${constraints}\n);`
        })
        .join('\n\n')

      this.generatedSQL = sqlStatements
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
      link.download = `${this.database?.name || 'database'}-schema.sql`
      link.click()
      URL.revokeObjectURL(url)
    },

    exportSchema() {
      const schemaData = {
        database: this.database,
        tables: this.databaseTables,
        relationships: this.relationships,
        generatedSQL: this.generatedSQL,
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
    async loadAvailableTables(excludeTable = null) {
      if (!this.database?._id) return

      this.loadingAvailableTables = true
      try {
        const response = await getAvailableTablesForReferences(this.database._id, excludeTable)

        // Xử lý Proxy object để lấy array thực
        let availableTablesData = response.data

        // Nếu là Proxy object, truy cập property data
        if (
          availableTablesData &&
          availableTablesData.data &&
          Array.isArray(availableTablesData.data)
        ) {
          availableTablesData = availableTablesData.data
        }

        // ĐẢM BẢO LUÔN LÀ MẢNG
        this.availableTables = Array.isArray(availableTablesData) ? availableTablesData : []

        console.log('📋 Available tables loaded:', this.availableTables)
        console.log('📋 Type:', typeof this.availableTables)
        console.log('📋 Is array:', Array.isArray(this.availableTables))
      } catch (error) {
        console.error('Failed to load available tables:', error)
        this.availableTables = [] // Luôn là mảng rỗng nếu có lỗi
        this.toast.error('Failed to load available tables')
      } finally {
        this.loadingAvailableTables = false
      }
    },
    // Trong methods của DatabaseManagement.vue
    // TRONG DatabaseManagement.vue - SỬA PHƯƠNG THỨC handleSavePositions
    async handleSavePositions({ databaseId, positionUpdates }, callback) {
      console.log('✅✅✅ HÀM HANDLE_SAVE_POSITIONS ĐÃ ĐƯỢC GỌI (ĐÚNG LUỒNG) ✅✅✅')
      try {
        // LẤY DANH SÁCH TÊN BẢNG HIỆN CÓ TỪ STATE
        const currentTableNames = new Set(this.databaseTables.map((t) => t.name))

        // LỌC RA CÁC UPDATE HỢP LỆ
        const validPositionUpdates = positionUpdates.filter((update) => {
          if (currentTableNames.has(update.tableName)) {
            return true
          }
          // Ghi log cảnh báo nếu có bảng không khớp
          console.warn(
            `[Data Sync Warning] Attempted to save position for a non-existent table: "${update.tableName}". This update will be skipped.`
          )
          return false
        })

        // Nếu không có gì để cập nhật, không cần gọi API
        if (validPositionUpdates.length === 0) {
          console.log('No valid table positions to save.')
          if (callback) callback(true) // Gọi callback thành công vì không có gì sai
          return
        }

        console.log('🔄 Saving positions for valid tables:', {
          databaseId,
          tableCount: validPositionUpdates.length,
          tableNames: validPositionUpdates.map((u) => u.tableName),
        })

        // GỌI API VỚI DỮ LIỆU ĐÃ ĐƯỢC LỌC
        const response = await updateMultipleTablePositions(databaseId, validPositionUpdates)

        console.log('✅ Backend response:', response)

        if (callback) callback(true)
        // this.toast.success('Table positions saved successfully')
      } catch (error) {
        console.error('❌ Failed to save positions:', error)
        if (callback) callback(false)
        const errorMessage = error.response?.data?.message || error.message
        this.toast.error(`Failed to save positions: ${errorMessage}`)
        console.error('Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          tablesInDb: this.databaseTables.map((t) => t.name),
          tablesInRequest: positionUpdates.map((u) => u.tableName), // Log dữ liệu gốc để debug
        })
      }
    },

    handleTablesUpdated(updatedTables) {
      // Cập nhật local state với tables mới
      this.databaseTables = updatedTables
      this.updateStats()
      this.generateSQL()
    },
    async savePositionsIndividually(databaseId, positionUpdates) {
      try {
        console.log('Trying individual position updates...')

        const updatePromises = positionUpdates.map((update) =>
          updateTablePosition(databaseId, update.tableName, update.position)
        )

        await Promise.all(updatePromises)
        // this.toast.success('Table positions saved (individual updates)')
        console.log('Individual position updates completed')
      } catch (individualError) {
        console.error('Individual updates also failed:', individualError)
        this.toast.error('Failed to save positions after retry')
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
        // Clone table để tránh mutation
        const updatedTable = { ...table }

        if (updatedTable.columns) {
          updatedTable.columns = updatedTable.columns.map((column) => {
            // Nếu column là FK và reference đến table có PK thay đổi
            if (column.is_foreign_key && column.references && pkChanges[column.references]) {
              const newType = pkChanges[column.references]
              console.log(`🔄 Syncing FK: ${table.name}.${column.name} → ${newType}`)

              return {
                ...column,
                type: newType,
                // Reset length nếu cần
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
      ]
      return typesWithoutLength.includes(type)
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
  margin: 0;
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
  padding: 20px;
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
}

.sql-actions {
  display: flex;
  gap: 12px;
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