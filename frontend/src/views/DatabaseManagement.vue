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
      <div class="content-header">
        <h2>Database Schema Management</h2>
        <button class="btn-primary" @click="showCreateTableModal = true">
          <span class="material-symbols-outlined">add</span>
          Create Table
        </button>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card tables">
          <div class="stat-icon">
            <span class="material-symbols-outlined">table</span>
          </div>
          <div class="stat-info">
            <h3>{{ databaseStats.tables }}</h3>
            <p>Total Tables</p>
          </div>
        </div>
        <div class="stat-card relationships">
          <div class="stat-icon">
            <span class="material-symbols-outlined">link</span>
          </div>
          <div class="stat-info">
            <h3>{{ databaseStats.relationships }}</h3>
            <p>Relationships</p>
          </div>
        </div>
        <div class="stat-card columns">
          <div class="stat-icon">
            <span class="material-symbols-outlined">view_column</span>
          </div>
          <div class="stat-info">
            <h3>{{ databaseStats.columns }}</h3>
            <p>Total Columns</p>
          </div>
        </div>
      </div>

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
          </div>
        </div>

        <!-- Diagram View -->
        <div v-if="viewMode === 'diagram'" class="schema-diagram">
          <div class="tables-container">
            <div
              v-for="table in databaseTables"
              :key="table.id"
              class="table-card"
              :style="{ top: table.position.y + 'px', left: table.position.x + 'px' }"
            >
              <div class="table-header">
                <h4>{{ table.name }}</h4>
                <div class="table-actions">
                  <button class="btn-icon" @click="editTable(table)" title="Edit">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="btn-icon danger" @click="deleteTable(table.id)" title="Delete">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
              <div class="table-columns">
                <div
                  v-for="column in table.columns"
                  :key="column.name"
                  class="table-column"
                  :class="{ primary: column.primaryKey, foreign: column.foreignKey }"
                >
                  <span class="column-name">{{ column.name }}</span>
                  <span class="column-type">{{ column.type }}</span>
                  <span v-if="column.primaryKey" class="column-badge pk">PK</span>
                  <span v-if="column.foreignKey" class="column-badge fk">FK</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- List View -->
        <div v-else class="schema-list">
          <div class="tables-list">
            <div v-for="table in databaseTables" :key="table.id" class="table-list-item">
              <div class="table-info">
                <h4>{{ table.name }}</h4>
                <p class="table-description">{{ table.description }}</p>
                <div class="table-meta">
                  <span class="meta-item">
                    <span class="material-symbols-outlined">view_column</span>
                    {{ table.columns.length }} columns
                  </span>
                  <span class="meta-item">
                    <span class="material-symbols-outlined">link</span>
                    {{ table.relationships }} relationships
                  </span>
                </div>
              </div>
              <div class="table-actions">
                <button class="btn-secondary" @click="viewTableDetails(table)">
                  <span class="material-symbols-outlined">visibility</span>
                  View
                </button>
                <button class="btn-secondary" @click="editTable(table)">
                  <span class="material-symbols-outlined">edit</span>
                  Edit
                </button>
                <button class="btn-danger" @click="deleteTable(table.id)">
                  <span class="material-symbols-outlined">delete</span>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SQL Preview -->
      <div class="sql-preview-section">
        <div class="section-header">
          <h3>SQL Preview</h3>
          <button class="btn-primary" @click="generateSQL">
            <span class="material-symbols-outlined">download</span>
            Generate SQL
          </button>
        </div>
        <div class="sql-preview">
          <pre><code>{{ generatedSQL }}</code></pre>
        </div>
      </div>
    </div>

    <!-- Create/Edit Table Modal -->
    <div v-if="showCreateTableModal || editingTable" class="modal-overlay">
      <div class="modal-content large">
        <div class="modal-header">
          <h3>{{ editingTable ? 'Edit Table' : 'Create New Table' }}</h3>
          <button class="btn-close" @click="closeModal">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="modal-body">
          <form @submit.prevent="saveTable">
            <div class="form-row">
              <div class="form-group">
                <label>Table Name</label>
                <input
                  v-model="tableForm.name"
                  type="text"
                  required
                  placeholder="Enter table name"
                />
              </div>
              <div class="form-group">
                <label>Description</label>
                <input
                  v-model="tableForm.description"
                  type="text"
                  placeholder="Enter table description"
                />
              </div>
            </div>

            <div class="form-group">
              <label>Columns</label>
              <div class="columns-list">
                <div v-for="(column, index) in tableForm.columns" :key="index" class="column-form">
                  <input v-model="column.name" type="text" placeholder="Column name" required />
                  <select v-model="column.type" required>
                    <option value="">Select type</option>
                    <option value="INT">INT</option>
                    <option value="VARCHAR">VARCHAR</option>
                    <option value="TEXT">TEXT</option>
                    <option value="DATE">DATE</option>
                    <option value="DATETIME">DATETIME</option>
                    <option value="BOOLEAN">BOOLEAN</option>
                  </select>
                  <input v-model="column.length" type="number" placeholder="Length" />
                  <div class="column-options">
                    <label class="checkbox-label">
                      <input
                        v-model="column.primaryKey"
                        type="checkbox"
                        @change="handlePrimaryKeyChange(index)"
                      />
                      PK
                    </label>
                    <label class="checkbox-label">
                      <input v-model="column.nullable" type="checkbox" />
                      Null
                    </label>
                    <label class="checkbox-label">
                      <input v-model="column.unique" type="checkbox" />
                      Unique
                    </label>
                  </div>
                  <button type="button" class="btn-icon danger" @click="removeColumn(index)">
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button type="button" class="btn-secondary" @click="addColumn">
                  <span class="material-symbols-outlined">add</span>
                  Add Column
                </button>
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-secondary" @click="closeModal">Cancel</button>
              <button type="submit" class="btn-primary">
                {{ editingTable ? 'Update' : 'Create' }} Table
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
  name: 'DatabaseManagement',
  components: {
    ProjectHeader,
  },
  data() {
    return {
      project: {},
      versions: [],
      selectedVersionId: null,

      databaseStats: {
        tables: 0,
        relationships: 0,
        columns: 0,
      },

      databaseTables: [],
      viewMode: 'diagram',

      showCreateTableModal: false,
      editingTable: null,

      tableForm: {
        name: '',
        description: '',
        columns: [
          {
            name: 'id',
            type: 'INT',
            length: null,
            primaryKey: true,
            nullable: false,
            unique: true,
          },
        ],
      },

      generatedSQL: '',

      toast: useToast(),
    }
  },
  async created() {
    const projectId = this.$route.params.id
    if (projectId) {
      await this.fetchProjectData(projectId)
      this.loadDatabaseTables()
      this.generateSQL()
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
      } catch (err) {
        console.error('Error fetching project details:', err)
        this.toast.error('Failed to load project data')
      }
    },

    loadDatabaseTables() {
      // Mock data - replace with actual API call
      this.databaseTables = [
        {
          id: 1,
          name: 'users',
          description: 'Stores user account information',
          position: { x: 50, y: 50 },
          columns: [
            { name: 'id', type: 'INT', primaryKey: true, foreignKey: false },
            { name: 'username', type: 'VARCHAR', primaryKey: false, foreignKey: false },
            { name: 'email', type: 'VARCHAR', primaryKey: false, foreignKey: false },
            { name: 'password', type: 'VARCHAR', primaryKey: false, foreignKey: false },
            { name: 'created_at', type: 'DATETIME', primaryKey: false, foreignKey: false },
          ],
          relationships: 2,
        },
        {
          id: 2,
          name: 'posts',
          description: 'Stores blog posts',
          position: { x: 400, y: 50 },
          columns: [
            { name: 'id', type: 'INT', primaryKey: true, foreignKey: false },
            { name: 'user_id', type: 'INT', primaryKey: false, foreignKey: true },
            { name: 'title', type: 'VARCHAR', primaryKey: false, foreignKey: false },
            { name: 'content', type: 'TEXT', primaryKey: false, foreignKey: false },
            { name: 'created_at', type: 'DATETIME', primaryKey: false, foreignKey: false },
          ],
          relationships: 1,
        },
        {
          id: 3,
          name: 'comments',
          description: 'Stores post comments',
          position: { x: 250, y: 300 },
          columns: [
            { name: 'id', type: 'INT', primaryKey: true, foreignKey: false },
            { name: 'post_id', type: 'INT', primaryKey: false, foreignKey: true },
            { name: 'user_id', type: 'INT', primaryKey: false, foreignKey: true },
            { name: 'comment', type: 'TEXT', primaryKey: false, foreignKey: false },
            { name: 'created_at', type: 'DATETIME', primaryKey: false, foreignKey: false },
          ],
          relationships: 2,
        },
      ]

      this.updateStats()
    },

    updateStats() {
      this.databaseStats.tables = this.databaseTables.length
      this.databaseStats.relationships = this.databaseTables.reduce(
        (sum, table) => sum + table.relationships,
        0
      )
      this.databaseStats.columns = this.databaseTables.reduce(
        (sum, table) => sum + table.columns.length,
        0
      )
    },

    // Table actions
    viewTableDetails(table) {
      this.toast.info(`Viewing details for table: ${table.name}`)
      // Implement table details view
    },

    editTable(table) {
      this.editingTable = table
      this.tableForm = {
        name: table.name,
        description: table.description,
        columns: table.columns.map((col) => ({
          ...col,
          length: col.length || null,
        })),
      }
    },

    deleteTable(tableId) {
      if (confirm('Are you sure you want to delete this table?')) {
        this.databaseTables = this.databaseTables.filter((table) => table.id !== tableId)
        this.updateStats()
        this.generateSQL()
        this.toast.success('Table deleted successfully')
      }
    },

    // Form methods
    addColumn() {
      this.tableForm.columns.push({
        name: '',
        type: '',
        length: null,
        primaryKey: false,
        nullable: true,
        unique: false,
      })
    },

    removeColumn(index) {
      if (this.tableForm.columns.length > 1) {
        this.tableForm.columns.splice(index, 1)
      }
    },

    handlePrimaryKeyChange(changedIndex) {
      if (this.tableForm.columns[changedIndex].primaryKey) {
        // Ensure only one primary key
        this.tableForm.columns.forEach((column, index) => {
          if (index !== changedIndex) {
            column.primaryKey = false
          }
        })
      }
    },

    saveTable() {
      if (this.editingTable) {
        // Update existing table
        const index = this.databaseTables.findIndex((t) => t.id === this.editingTable.id)
        if (index !== -1) {
          this.databaseTables[index] = {
            ...this.databaseTables[index],
            ...this.tableForm,
          }
        }
      } else {
        // Create new table
        const newTable = {
          id: Date.now(),
          ...this.tableForm,
          position: { x: Math.random() * 500, y: Math.random() * 400 },
          relationships: 0,
        }
        this.databaseTables.push(newTable)
      }

      this.updateStats()
      this.generateSQL()
      this.closeModal()
      this.toast.success(this.editingTable ? 'Table updated!' : 'Table created!')
    },

    generateSQL() {
      // Generate SQL from tables
      const sqlStatements = this.databaseTables
        .map((table) => {
          const columns = table.columns
            .map((col) => {
              let columnDef = `${col.name} ${col.type}`
              if (col.length) columnDef += `(${col.length})`
              if (!col.nullable) columnDef += ' NOT NULL'
              if (col.unique) columnDef += ' UNIQUE'
              if (col.primaryKey) columnDef += ' PRIMARY KEY'
              return columnDef
            })
            .join(',\n  ')

          return `CREATE TABLE ${table.name} (\n  ${columns}\n);`
        })
        .join('\n\n')

      this.generatedSQL = sqlStatements
    },

    closeModal() {
      this.showCreateTableModal = false
      this.editingTable = null
      this.tableForm = {
        name: '',
        description: '',
        columns: [
          {
            name: 'id',
            type: 'INT',
            length: null,
            primaryKey: true,
            nullable: false,
            unique: true,
          },
        ],
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

.stat-card.tables {
  border-left: 4px solid #3b82f6;
}

.stat-card.relationships {
  border-left: 4px solid #8b5cf6;
}

.stat-card.columns {
  border-left: 4px solid #10b981;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-card.tables .stat-icon {
  background: #dbeafe;
  color: #3b82f6;
}

.stat-card.relationships .stat-icon {
  background: #ede9fe;
  color: #8b5cf6;
}

.stat-card.columns .stat-icon {
  background: #d1fae5;
  color: #10b981;
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
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-secondary.active {
  background: #1a365d;
  color: white;
  border-color: #1a365d;
}

/* Diagram View */
.schema-diagram {
  padding: 20px;
  min-height: 500px;
  background: #f8fafc;
  position: relative;
}

.tables-container {
  position: relative;
  height: 500px;
}

.table-card {
  position: absolute;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  min-width: 200px;
  cursor: move;
}

.table-header {
  padding: 12px;
  background: #1a365d;
  color: white;
  border-radius: 8px 8px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-header h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.table-actions {
  display: flex;
  gap: 4px;
}

.btn-icon {
  padding: 4px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.btn-icon.danger:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #fecaca;
}

.table-columns {
  padding: 8px 0;
}

.table-column {
  padding: 6px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.table-column:last-child {
  border-bottom: none;
}

.table-column.primary {
  background: #f0f9ff;
}

.table-column.foreign {
  background: #fef7ff;
}

.column-name {
  font-weight: 500;
  color: #1f2937;
}

.column-type {
  color: #6b7280;
  font-family: 'Courier New', monospace;
}

.column-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.625rem;
  font-weight: 600;
  color: white;
}

.column-badge.pk {
  background: #3b82f6;
}

.column-badge.fk {
  background: #8b5cf6;
}

/* List View */
.schema-list {
  padding: 20px;
}

.tables-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.table-info h4 {
  margin: 0 0 8px 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.table-description {
  margin: 0 0 12px 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.table-meta {
  display: flex;
  gap: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #6b7280;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.btn-danger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-danger:hover {
  background: #dc2626;
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
}

.sql-preview pre {
  margin: 0;
  color: #e5e7eb;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  overflow-x: auto;
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
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.large {
  max-width: 700px;
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.columns-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.column-form {
  display: grid;
  grid-template-columns: 1fr 1fr 80px auto 40px;
  gap: 8px;
  align-items: center;
}

.column-options {
  display: flex;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #374151;
  cursor: pointer;
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