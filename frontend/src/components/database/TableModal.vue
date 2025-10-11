<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content large">
      <div class="modal-header">
        <h3>{{ table ? 'Edit Table' : 'Create New Table' }}</h3>
        <button class="btn-close" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="saveTable">
          <!-- Table Basic Info -->
          <div class="form-row">
            <div class="form-group">
              <label>Table Name <span class="required">*</span></label>
              <input
                v-model="tableForm.name"
                type="text"
                required
                placeholder="e.g., users, products, orders"
                pattern="[a-zA-Z_][a-zA-Z0-9_]*"
                title="Table name must start with a letter or underscore and contain only letters, numbers, and underscores"
                :class="{
                  error: !isValidTableName(tableForm.name) && tableForm.name,
                  warning: tableForm.name.length > 50,
                }"
                maxlength="64"
                @input="checkForChanges"
              />
              <div class="form-hint">
                <span v-if="tableForm.name.length > 50" class="warning-text">
                  ⚠️ Table name should be under 50 characters for better readability
                </span>
                <span v-else>Use snake_case format (e.g., user_profiles)</span>
              </div>
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea
                v-model="tableForm.description"
                rows="2"
                placeholder="Describe what this table stores..."
                @input="checkForChanges"
              ></textarea>
            </div>
          </div>

          <!-- Table Statistics -->
          <div class="table-stats" v-if="tableForm.columns.length > 0">
            <div class="stat-item">
              <span class="stat-number">{{ tableForm.columns.length }}</span>
              <span class="stat-label">Columns</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ primaryKeyCount }}</span>
              <span class="stat-label">Primary Keys</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ foreignKeyCount }}</span>
              <span class="stat-label">Foreign Keys</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ indexedColumnCount }}</span>
              <span class="stat-label">Indexed</span>
            </div>
          </div>

          <!-- Performance Warnings -->
          <div v-if="hasPerformanceWarnings" class="performance-warnings">
            <div class="warning-header">
              <span class="material-symbols-outlined">warning</span>
              <span>Performance Considerations</span>
            </div>
            <ul>
              <li v-if="indexedColumnCount > 10">
                ⚠️ High number of indexed columns ({{ indexedColumnCount }}) may impact performance
              </li>
              <li v-if="largeColumnCount > 3">
                ⚠️ Consider normalizing {{ largeColumnCount }} large object columns
              </li>
              <li v-if="!hasTimestamps">
                💡 Consider adding 'created_at' and 'updated_at' for audit trail
              </li>
              <li v-if="!hasSoftDelete">
                💡 Consider adding 'deleted_at' for soft delete functionality
              </li>
            </ul>
          </div>

          <!-- Columns Section -->
          <div class="form-section">
            <div class="section-header">
              <h4>Columns</h4>
              <button type="button" class="btn-secondary small" @click="addColumn">
                <span class="material-symbols-outlined">add</span>
                Add Column
              </button>
            </div>

            <div class="columns-list">
              <div
                v-for="(column, index) in tableForm.columns"
                :key="index"
                class="column-form"
                :class="{
                  'has-errors': hasColumnErrors(column),
                  'primary-key': column.is_primary_key,
                  'foreign-key': column.is_foreign_key,
                }"
              >
                <div class="column-header">
                  <span class="column-badge pk" v-if="column.is_primary_key">PK</span>
                  <span class="column-badge fk" v-if="column.is_foreign_key">FK</span>
                  <span class="column-badge unique" v-if="column.unique">UNIQUE</span>
                  <span class="column-badge nullable" v-if="column.nullable">NULL</span>
                  <span class="column-index">#{{ index + 1 }}</span>
                </div>

                <div class="column-main">
                  <!-- Column Name -->
                  <div class="input-group">
                    <label>Column Name</label>
                    <input
                      v-model="column.name"
                      type="text"
                      placeholder="column_name"
                      required
                      pattern="[a-zA-Z_][a-zA-Z0-9_]*"
                      :class="{
                        error: !isValidColumnName(column.name) && column.name,
                        warning: column.name.length > 50,
                      }"
                      maxlength="64"
                      @input="checkForChanges"
                    />
                    <div class="form-hint small" v-if="column.name.length > 50">
                      ⚠️ Long column names may cause issues
                    </div>
                  </div>

                  <!-- Data Type -->
                  <div class="input-group">
                    <label>Data Type</label>
                    <select
                      v-model="column.type"
                      required
                      :class="{ error: !column.type }"
                      @change="handleTypeChange(column, index)"
                    >
                      <option value="">Select type</option>
                      <optgroup label="Numeric">
                        <option value="INT">INT</option>
                        <option value="BIGINT">BIGINT</option>
                        <option value="SMALLINT">SMALLINT</option>
                        <option value="TINYINT">TINYINT</option>
                        <option value="DECIMAL">DECIMAL</option>
                        <option value="FLOAT">FLOAT</option>
                        <option value="DOUBLE">DOUBLE</option>
                      </optgroup>
                      <optgroup label="String">
                        <option value="VARCHAR">VARCHAR</option>
                        <option value="CHAR">CHAR</option>
                        <option value="TEXT">TEXT</option>
                        <option value="LONGTEXT">LONGTEXT</option>
                      </optgroup>
                      <optgroup label="Date & Time">
                        <option value="DATE">DATE</option>
                        <option value="DATETIME">DATETIME</option>
                        <option value="TIMESTAMP">TIMESTAMP</option>
                        <option value="TIME">TIME</option>
                      </optgroup>
                      <optgroup label="Boolean">
                        <option value="BOOLEAN">BOOLEAN</option>
                        <option value="TINYINT(1)">TINYINT(1)</option>
                      </optgroup>
                      <optgroup label="Binary">
                        <option value="BLOB">BLOB</option>
                        <option value="LONGBLOB">LONGBLOB</option>
                      </optgroup>
                    </select>
                  </div>

                  <!-- Length/Precision -->
                  <div class="input-group">
                    <label v-if="showLengthInput(column.type)">Length/Precision</label>
                    <div v-if="showLengthInput(column.type)" class="length-input-container">
                      <input
                        v-model="column.length"
                        type="text"
                        :placeholder="getLengthPlaceholder(column.type)"
                        :class="{
                          error: !isValidLength(column.length, column.type) && column.length,
                        }"
                        @input="checkForChanges"
                      />
                      <div v-if="column.type === 'DECIMAL'" class="form-hint small">
                        Format: precision,scale (e.g., 10,2)
                      </div>
                    </div>
                    <div v-else class="empty-space"></div>
                  </div>

                  <!-- Default Value -->
                  <div class="input-group">
                    <label>Default Value</label>
                    <div class="default-input-container">
                      <input
                        v-model="column.default"
                        type="text"
                        :placeholder="getDefaultPlaceholder(column.type)"
                        :class="{
                          error: !isValidDefault(column.default, column.type) && column.default,
                        }"
                        @input="checkForChanges"
                      />
                      <div class="form-hint small">
                        {{ getDefaultHint(column.type) }}
                      </div>
                    </div>
                  </div>

                  <!-- Column Options -->
                  <div class="column-options">
                    <div class="options-group">
                      <label
                        class="checkbox-label primary"
                        :title="
                          column.is_primary_key
                            ? 'Primary keys are automatically NOT NULL and UNIQUE'
                            : 'Mark as primary key'
                        "
                      >
                        <input
                          v-model="column.is_primary_key"
                          type="checkbox"
                          @change="handlePrimaryKeyChange(index)"
                        />
                        <span class="checkbox-custom"></span>
                        <span class="option-text">Primary Key</span>
                      </label>

                      <label
                        class="checkbox-label"
                        :title="column.nullable ? 'Allows NULL values' : 'Requires a value'"
                      >
                        <input
                          v-model="column.nullable"
                          type="checkbox"
                          :disabled="column.is_primary_key"
                          @change="checkForChanges"
                        />
                        <span class="checkbox-custom"></span>
                        <span class="option-text">Nullable</span>
                      </label>
                    </div>

                    <div class="options-group">
                      <label class="checkbox-label" title="Values must be unique across the table">
                        <input
                          v-model="column.unique"
                          type="checkbox"
                          :disabled="column.is_primary_key"
                          @change="checkForChanges"
                        />
                        <span class="checkbox-custom"></span>
                        <span class="option-text">Unique</span>
                      </label>

                      <label class="checkbox-label foreign" title="References another table">
                        <input
                          v-model="column.is_foreign_key"
                          type="checkbox"
                          @change="handleForeignKeyChange(index)"
                        />
                        <span class="checkbox-custom"></span>
                        <span class="option-text">Foreign Key</span>
                      </label>
                    </div>
                  </div>

                  <!-- Remove Button -->
                  <button
                    type="button"
                    class="btn-icon danger"
                    @click="removeColumn(index)"
                    :disabled="tableForm.columns.length <= 1"
                    title="Remove column"
                  >
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>

                <!-- Foreign Key Section -->
                <div v-if="column.is_foreign_key" class="foreign-key-section">
                  <div class="foreign-key-header">
                    <span class="material-symbols-outlined">link</span>
                    <span>Foreign Key Reference</span>
                  </div>
                  <div class="foreign-key-row">
                    <div class="input-group">
                      <label>References Table <span class="required">*</span></label>
                      <select
                        v-model="column.references"
                        required
                        class="foreign-key-select"
                        :class="{ error: column.is_foreign_key && !column.references }"
                        @change="handleForeignKeyTableChange(column)"
                      >
                        <option value="">Select table to reference</option>
                        <option
                          v-for="availableTable in normalizedAvailableTables"
                          :key="availableTable.name"
                          :value="availableTable.name"
                        >
                          {{ availableTable.name }}
                          <template
                            v-if="
                              availableTable.primaryKeys && availableTable.primaryKeys.length > 0
                            "
                          >
                            (PK: {{ availableTable.primaryKeys[0].type }})
                          </template>
                        </option>
                      </select>
                    </div>

                    <!-- Auto-sync foreign key type -->
                    <div v-if="column.references" class="foreign-key-info">
                      <div class="form-hint">
                        <span class="material-symbols-outlined">info</span>
                        Foreign key will reference primary key of
                        <strong>{{ column.references }}</strong>
                        <template v-if="getReferencedTablePrimaryKey(column.references)">
                          ({{ getReferencedTablePrimaryKey(column.references).type }})
                        </template>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Column Errors -->
                <div v-if="hasColumnErrors(column)" class="column-errors">
                  <span class="material-symbols-outlined">error</span>
                  <div class="error-list">
                    <span
                      v-for="error in getColumnErrors(column)"
                      :key="error"
                      class="error-message"
                    >
                      {{ error }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="tableForm.columns.length === 0" class="no-columns">
              <span class="material-symbols-outlined">table</span>
              <p>Add at least one column to the table</p>
              <button type="button" class="btn-secondary" @click="addColumn">
                <span class="material-symbols-outlined">add</span>
                Add First Column
              </button>
            </div>
          </div>

          <!-- Validation Summary -->
          <div v-if="hasFormErrors" class="validation-summary error">
            <span class="material-symbols-outlined">error</span>
            <div>
              <strong>Please fix the following errors:</strong>
              <ul>
                <li v-for="error in formErrors" :key="error">{{ error }}</li>
              </ul>
            </div>
          </div>

          <!-- SQL Preview -->
          <div class="form-section">
            <div class="section-header">
              <h4>SQL Preview</h4>
              <button type="button" class="btn-secondary small" @click="copySQL">
                <span class="material-symbols-outlined">content_copy</span>
                Copy SQL
              </button>
            </div>
            <div class="sql-preview">
              <!-- <pre><code>{{ generateTableSQL() }}</code></pre> -->
            </div>
          </div>

          <!-- Modal Actions -->
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="$emit('close')">
              <span class="material-symbols-outlined">cancel</span>
              Cancel
            </button>
            <button type="submit" class="btn-primary" :disabled="!isFormValid || saving">
              <span class="material-symbols-outlined">{{ table ? 'save' : 'add' }}</span>
              {{ saving ? 'Saving...' : table ? 'Update' : 'Create' }} Table
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TableModal',
  props: {
    table: {
      type: Object,
      default: null,
    },
    availableTables: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      tableForm: {
        name: '',
        description: '',
        columns: [
          {
            name: 'id',
            type: 'INT',
            length: null,
            is_primary_key: true,
            is_foreign_key: false,
            nullable: false,
            unique: true,
            references: '',
            default: null,
          },
        ],
      },
      originalData: null,
      hasChanges: false,
      saving: false,
    }
  },
  computed: {
    tablesWithPKChanges() {
      const changes = {}
      this.tableForm.columns.forEach((col) => {
        if (col.is_primary_key && col.originalType !== col.type) {
          changes[this.tableForm.name] = col.type
        }
      })
      return changes // THIẾU DÒNG NÀY
    },

    isFormValid() {
      // Check table name
      if (!this.tableForm.name || !this.isValidTableName(this.tableForm.name)) {
        return false
      }

      // Check table name length
      if (this.tableForm.name.length > 64) {
        return false
      }

      // Check at least one column
      if (this.tableForm.columns.length === 0) {
        return false
      }

      // Check all columns are valid
      return this.tableForm.columns.every(
        (column) =>
          this.isValidColumnName(column.name) &&
          column.type &&
          column.name.length <= 64 &&
          (!column.is_foreign_key || column.references) &&
          this.isValidLength(column.length, column.type) &&
          this.isValidDefault(column.default, column.type)
      )
    },

    hasFormErrors() {
      return this.formErrors.length > 0
    },

    formErrors() {
      const errors = []

      // Table name errors
      if (this.tableForm.name && !this.isValidTableName(this.tableForm.name)) {
        errors.push(
          'Table name must start with a letter or underscore and contain only letters, numbers, and underscores'
        )
      }

      if (this.tableForm.name.length > 64) {
        errors.push('Table name cannot exceed 64 characters')
      }

      // Column errors
      this.tableForm.columns.forEach((column, index) => {
        const columnErrors = this.getColumnErrors(column)
        if (columnErrors.length > 0) {
          errors.push(
            `Column ${index + 1} (${column.name || 'unnamed'}): ${columnErrors.join(', ')}`
          )
        }
      })

      // Foreign key type validation
      this.tableForm.columns.forEach((column, index) => {
        if (column.is_foreign_key && column.references && column.type) {
          const pkType = this.getReferencedTablePrimaryKeyType(column.references)
          if (pkType && column.type !== pkType) {
            errors.push(
              `Column ${index + 1} (${column.name}): Foreign key type (${
                column.type
              }) must match referenced table's primary key type (${pkType})`
            )
          }
        }
      })

      // Check for duplicate column names
      const columnNames = this.tableForm.columns.map((col) => col.name.toLowerCase())
      const duplicateColumns = columnNames.filter(
        (name, index) => columnNames.indexOf(name) !== index
      )
      if (duplicateColumns.length > 0) {
        errors.push(
          `Duplicate column names found: ${Array.from(new Set(duplicateColumns)).join(', ')}`
        )
      }

      // Check primary key constraints
      const primaryKeyCount = this.tableForm.columns.filter((col) => col.is_primary_key).length
      if (primaryKeyCount === 0) {
        errors.push('Table must have at least one primary key')
      }
      if (primaryKeyCount > 1) {
        errors.push('Table can only have one primary key')
      }

      return errors
    },

    normalizedAvailableTables() {
      if (!Array.isArray(this.availableTables)) {
        console.warn('❌ [TableModal] availableTables is not an array:', this.availableTables)
        return []
      }

      return this.availableTables
        .map((table) => {
          if (typeof table === 'string') {
            return { name: table, primaryKeys: [] }
          }
          return {
            name: table.name || table.tableName || table._id || '',
            primaryKeys:
              table.primaryKeys || table.columns?.filter((col) => col.is_primary_key) || [],
            ...table,
          }
        })
        .filter((table) => table.name && table.name !== this.tableForm.name) // Exclude self-reference
    },

    // Statistics
    primaryKeyCount() {
      return this.tableForm.columns.filter((col) => col.is_primary_key).length
    },

    foreignKeyCount() {
      return this.tableForm.columns.filter((col) => col.is_foreign_key).length
    },

    indexedColumnCount() {
      return this.tableForm.columns.filter(
        (col) => col.is_primary_key || col.unique || col.is_foreign_key
      ).length
    },

    largeColumnCount() {
      return this.tableForm.columns.filter((col) =>
        ['TEXT', 'LONGTEXT', 'BLOB', 'LONGBLOB'].includes(col.type)
      ).length
    },

    hasTimestamps() {
      return this.tableForm.columns.some((col) =>
        ['created_at', 'updated_at'].includes(col.name.toLowerCase())
      )
    },

    hasSoftDelete() {
      return this.tableForm.columns.some((col) => col.name.toLowerCase() === 'deleted_at')
    },

    hasPerformanceWarnings() {
      return (
        this.indexedColumnCount > 10 ||
        this.largeColumnCount > 3 ||
        !this.hasTimestamps ||
        !this.hasSoftDelete
      )
    },
  },
  watch: {
    tablesWithPKChanges: {
      deep: true,
      handler(newChanges) {
        if (Object.keys(newChanges).length > 0) {
          this.updateReferencingFKs(newChanges)
        }
      },
    },

    table: {
      immediate: true,
      handler(newTable) {
        if (newTable) {
          console.log('🔍 [TableModal] Editing table:', newTable.name)
          this.originalData = JSON.parse(JSON.stringify(newTable))
          this.tableForm = this.normalizeTableData(newTable)
          this.hasChanges = false
        } else {
          this.resetForm()
        }
      },
    },
  },
  methods: {
    normalizeTableData(tableData) {
      return {
        name: tableData.name,
        description: tableData.description || '',
        columns: (tableData.columns || []).map((col) => {
          let type = col.type || ''
          let length = col.length

          // Extract type and length from type string like "VARCHAR(255)"
          if (type.includes('(') && type.includes(')')) {
            const match = type.match(/^([^(]+)\(([^)]+)\)$/)
            if (match) {
              type = match[1]
              length = match[2]
            }
          }

          return {
            name: col.name || '',
            type: type,
            originalType: col.type || type, // Lưu type gốc để theo dõi thay đổi
            length: length !== undefined && length !== null ? String(length) : null,
            is_primary_key: col.is_primary_key || false,
            is_foreign_key: col.is_foreign_key || false,
            nullable: col.is_primary_key ? false : col.nullable !== undefined ? col.nullable : true,
            unique: col.is_primary_key ? true : col.unique || false,
            references: col.references || '',
            default: col.default || null,
            related_usecase_ids: col.related_usecase_ids || [],
          }
        }),
      }
    },

    resetForm() {
      this.tableForm = {
        name: '',
        description: '',
        columns: [
          {
            name: 'id',
            type: 'INT',
            length: null,
            is_primary_key: true,
            is_foreign_key: false,
            nullable: false,
            unique: true,
            references: '',
            default: null,
          },
        ],
      }
      this.originalData = null
      this.hasChanges = true
    },

    addColumn() {
      this.tableForm.columns.push({
        name: '',
        type: 'VARCHAR',
        length: '255',
        is_primary_key: false,
        is_foreign_key: false,
        nullable: true,
        unique: false,
        references: '',
        default: null,
      })
      this.checkForChanges()
    },

    removeColumn(index) {
      if (this.tableForm.columns.length > 1) {
        this.tableForm.columns.splice(index, 1)
        this.checkForChanges()
      }
    },

    handlePrimaryKeyChange(changedIndex) {
      const column = this.tableForm.columns[changedIndex]

      if (column.is_primary_key) {
        // Unset other primary keys
        this.tableForm.columns.forEach((col, index) => {
          if (index !== changedIndex) {
            col.is_primary_key = false
            // Reset auto-set properties for non-primary keys
            col.nullable = true
            col.unique = false
          }
        })

        // Set primary key properties
        column.nullable = false
        column.unique = true
        column.is_foreign_key = false // PK cannot be FK
        column.references = ''

        // Ghi nhận type change để sync FK
        if (column.originalType !== column.type) {
          console.log(`🔄 PK type changed from ${column.originalType} to ${column.type}`)
        }

        // Suggest naming convention
        if (!column.name.toLowerCase().endsWith('_id') && column.name.toLowerCase() !== 'id') {
          console.warn(
            `💡 Consider naming primary key as 'id' or ending with '_id': ${column.name}`
          )
        }
      }

      this.checkForChanges()
    },

    handleForeignKeyChange(index) {
      const column = this.tableForm.columns[index]

      if (column.is_foreign_key) {
        column.is_primary_key = false // FK cannot be PK
        // Suggest naming convention
        if (!column.name.toLowerCase().endsWith('_id')) {
          console.warn(`💡 Foreign key columns should typically end with '_id': ${column.name}`)
        }
        // Auto-sync type with referenced table's PK if available
        if (column.references) {
          this.syncForeignKeyType(column)
        }
      } else {
        column.references = ''
      }

      this.checkForChanges()
    },

    handleForeignKeyTableChange(column) {
      if (column.references) {
        this.syncForeignKeyType(column)
      }
      this.checkForChanges()
    },

    syncForeignKeyType(column) {
      const pkType = this.getReferencedTablePrimaryKeyType(column.references)
      if (pkType && column.type !== pkType) {
        column.type = pkType
        // Reset length for the new type
        this.handleTypeChange(column, this.tableForm.columns.indexOf(column))
      }
    },

    getReferencedTablePrimaryKey(tableName) {
      const table = this.normalizedAvailableTables.find((t) => t.name === tableName)
      return table?.primaryKeys?.[0] || null
    },

    getReferencedTablePrimaryKeyType(tableName) {
      const pk = this.getReferencedTablePrimaryKey(tableName)
      return pk?.type || null
    },

    handleTypeChange(column, index) {
      const defaultLengths = {
        VARCHAR: '255',
        CHAR: '1',
        DECIMAL: '10,2',
        INT: null,
        BIGINT: null,
        SMALLINT: null,
        TINYINT: null,
      }

      // Set default length if available and column doesn't have one
      if (defaultLengths[column.type] !== undefined && (!column.length || column.length === '')) {
        column.length = defaultLengths[column.type]
      }

      // Clear length if type doesn't support it
      if (!this.showLengthInput(column.type)) {
        column.length = null
      }

      // Reset default value when type changes
      if (column.default) {
        column.default = null
      }

      // Nếu là PK, trigger FK sync
      if (column.is_primary_key && column.originalType !== column.type) {
        console.log(`🔄 PK type changed, will sync referencing FKs`)
      }

      this.checkForChanges()
    },

    showLengthInput(type) {
      const baseType = type.split('(')[0].toUpperCase()
      const typesWithLength = ['VARCHAR', 'CHAR', 'DECIMAL', 'INT', 'BIGINT', 'SMALLINT', 'TINYINT']
      return typesWithLength.includes(baseType)
    },

    getLengthPlaceholder(type) {
      const baseType = type.split('(')[0].toUpperCase()
      if (baseType === 'DECIMAL') return '10,2'
      if (['INT', 'BIGINT', 'SMALLINT', 'TINYINT'].includes(baseType)) return 'Length (optional)'
      return 'Length'
    },

    getDefaultPlaceholder(type) {
      const baseType = type.split('(')[0].toUpperCase()
      const placeholders = {
        BOOLEAN: 'true/false',
        'TINYINT(1)': '1/0',
        DATETIME: 'CURRENT_TIMESTAMP',
        TIMESTAMP: 'CURRENT_TIMESTAMP',
        DATE: 'CURDATE()',
        TIME: 'CURTIME()',
        INT: '0',
        VARCHAR: "'value'",
        TEXT: "'text'",
        DECIMAL: '0.00',
        FLOAT: '0.0',
        DOUBLE: '0.0',
      }
      return placeholders[baseType] || 'Default value'
    },

    getDefaultHint(type) {
      const hints = {
        BOOLEAN: 'true/false',
        'TINYINT(1)': '1/0',
        DATETIME: 'MySQL time function',
        TIMESTAMP: 'MySQL time function',
        DATE: 'MySQL date function',
        TIME: 'MySQL time function',
        VARCHAR: 'Use quotes for text',
        TEXT: 'Use quotes for text',
      }
      return hints[type] || 'Default value'
    },

    isValidTableName(name) {
      return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
    },

    isValidColumnName(name) {
      return name && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
    },

    isValidLength(length, type) {
      if (!this.showLengthInput(type)) return true

      if (type === 'DECIMAL') {
        if (!length || length === '') return false
        const parts = length.split(',')
        if (parts.length !== 2) return false

        const precision = parseInt(parts[0])
        const scale = parseInt(parts[1])
        return (
          !isNaN(precision) &&
          !isNaN(scale) &&
          precision > 0 &&
          scale >= 0 &&
          scale <= precision &&
          precision <= 65
        )
      }

      if (['INT', 'BIGINT', 'SMALLINT', 'TINYINT'].includes(type)) {
        if (!length || length === '') return true
        const numLength = parseInt(length)
        return !isNaN(numLength) && numLength > 0 && numLength <= 255
      }

      if (['VARCHAR', 'CHAR'].includes(type)) {
        if (!length || length === '') return false
        const numLength = parseInt(length)
        return !isNaN(numLength) && numLength > 0 && numLength <= 65535
      }

      return true
    },

    isValidDefault(value, type) {
      if (!value || value === '') return true

      // Check for NULL value
      if (value.toUpperCase() === 'NULL') return true

      // Boolean types
      if (['BOOLEAN', 'TINYINT(1)'].includes(type)) {
        const validBooleans = ['true', 'false', '1', '0', 'TRUE', 'FALSE']
        return validBooleans.includes(value.toUpperCase())
      }

      // Numeric types
      if (['INT', 'BIGINT', 'SMALLINT', 'TINYINT', 'FLOAT', 'DOUBLE', 'DECIMAL'].includes(type)) {
        if (value === 'NULL') return true
        return !isNaN(Number(value)) || value === 'NULL'
      }

      // Date/Time types with MySQL functions
      if (['DATETIME', 'TIMESTAMP', 'DATE', 'TIME'].includes(type)) {
        const validTimeFunctions = ['CURRENT_TIMESTAMP', 'NOW()', 'CURDATE()', 'CURTIME()']
        return validTimeFunctions.includes(value.toUpperCase()) || value === 'NULL'
      }

      // String types - basic quote validation
      if (['VARCHAR', 'CHAR', 'TEXT', 'LONGTEXT'].includes(type)) {
        return true // Relaxed validation for strings
      }

      return true
    },

    hasColumnErrors(column) {
      return this.getColumnErrors(column).length > 0
    },

    getColumnErrors(column) {
      const errors = []

      if (!column.name) {
        errors.push('Column name is required')
      } else if (!this.isValidColumnName(column.name)) {
        errors.push('Invalid column name format')
      } else if (column.name.length > 64) {
        errors.push('Column name cannot exceed 64 characters')
      }

      if (!column.type) {
        errors.push('Column type is required')
      }

      if (column.is_foreign_key && !column.references) {
        errors.push('Foreign key must reference a table')
      }

      if (this.showLengthInput(column.type) && !this.isValidLength(column.length, column.type)) {
        if (column.type === 'DECIMAL') {
          errors.push('DECIMAL requires format like "10,2"')
        } else if (['VARCHAR', 'CHAR'].includes(column.type)) {
          errors.push('Valid length is required')
        } else if (['INT', 'BIGINT', 'SMALLINT', 'TINYINT'].includes(column.type)) {
          errors.push('Length must be between 1 and 255')
        }
      }

      if (column.default && !this.isValidDefault(column.default, column.type)) {
        errors.push('Invalid default value for this data type')
      }

      // Check for SQL keywords in column names
      const sqlKeywords = [
        'select',
        'insert',
        'update',
        'delete',
        'where',
        'group',
        'order',
        'table',
      ]
      if (sqlKeywords.includes(column.name.toLowerCase())) {
        errors.push('Column name is a SQL keyword - may cause issues')
      }

      return errors
    },

    generateTableSQL() {
      if (!this.tableForm.name || this.tableForm.columns.length === 0) {
        return '-- Complete the form to see SQL preview'
      }

      const columns = this.tableForm.columns
        .map((col) => {
          if (!col.name || !col.type) return null

          let columnDef = `  ${col.name} ${col.type}`

          if (
            col.length &&
            this.showLengthInput(col.type) &&
            this.isValidLength(col.length, col.type)
          ) {
            columnDef += `(${col.length})`
          }

          if (!col.nullable) columnDef += ' NOT NULL'
          if (col.unique) columnDef += ' UNIQUE'
          if (col.is_primary_key) columnDef += ' PRIMARY KEY AUTO_INCREMENT'

          if (col.default) {
            if (['VARCHAR', 'CHAR', 'TEXT', 'LONGTEXT'].includes(col.type)) {
              const formattedDefault =
                col.default.startsWith("'") && col.default.endsWith("'")
                  ? col.default
                  : `'${col.default}'`
              columnDef += ` DEFAULT ${formattedDefault}`
            } else {
              columnDef += ` DEFAULT ${col.default}`
            }
          }

          return columnDef
        })
        .filter(Boolean)
        .join(',\n')

      const foreignKeys = this.tableForm.columns
        .filter((col) => col.is_foreign_key && col.references)
        .map((col) => `  FOREIGN KEY (${col.name}) REFERENCES ${col.references}(id)`)
        .join(',\n')

      const constraints = foreignKeys ? `,\n${foreignKeys}` : ''

      return `CREATE TABLE ${this.tableForm.name} (\n${columns}${constraints}\n);`
    },

    async copySQL() {
      try {
        await navigator.clipboard.writeText(this.generateTableSQL())
        // You might want to add a toast notification here
        console.log('SQL copied to clipboard')
      } catch (err) {
        console.error('Failed to copy SQL:', err)
      }
    },

    async saveTable() {
      if (!this.isFormValid || this.saving) return

      this.saving = true

      try {
        const cleanedData = {
          ...this.tableForm,
          columns: this.tableForm.columns.map((col) => {
            const cleanedColumn = {
              ...col,
              nullable: col.is_primary_key ? false : col.nullable,
              unique: col.is_primary_key ? true : col.unique,
            }

            // Clean up length values
            if (!this.showLengthInput(col.type)) {
              cleanedColumn.length = null
            } else if (col.length) {
              if (['INT', 'BIGINT', 'SMALLINT', 'TINYINT', 'VARCHAR', 'CHAR'].includes(col.type)) {
                const numLength = Number(col.length)
                if (!isNaN(numLength)) {
                  cleanedColumn.length = numLength
                }
              }
              // DECIMAL length stays as string "10,2"
            }

            return cleanedColumn
          }),
        }

        console.log('💾 [TableModal] Saving table data:', cleanedData)
        this.$emit('save', cleanedData)
      } catch (error) {
        console.error('❌ [TableModal] Error saving table:', error)
      } finally {
        this.saving = false
      }
    },

    checkForChanges() {
      if (!this.table) {
        this.hasChanges = true
        return
      }

      const currentData = JSON.stringify(this.normalizeFormData(this.tableForm))
      const originalData = JSON.stringify(this.normalizeFormData(this.originalData))

      this.hasChanges = currentData !== originalData
    },

    normalizeFormData(formData) {
      return {
        name: formData.name,
        description: formData.description,
        columns: formData.columns
          .map((col) => ({
            name: col.name,
            type: col.type,
            length: col.length,
            is_primary_key: col.is_primary_key,
            is_foreign_key: col.is_foreign_key,
            nullable: col.nullable,
            unique: col.unique,
            references: col.references,
            default: col.default,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }
    },
    updateReferencingFKs(pkChanges) {
      this.tableForm.columns.forEach((col) => {
        if (col.is_foreign_key && col.references && pkChanges[col.references]) {
          const newType = pkChanges[col.references]
          console.log(`🔄 Auto-updating FK ${col.name} type from ${col.type} to ${newType}`)

          // Cập nhật type
          col.type = newType

          // Reset length nếu type mới không hỗ trợ length
          if (!this.showLengthInput(newType)) {
            col.length = null
          }

          // Set default length nếu type mới có length mặc định
          this.handleTypeChange(col, this.tableForm.columns.indexOf(col))
        }
      })
    },
  },
}
</script>

<style scoped>
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
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 1000px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-content.large {
  max-width: 1100px;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9fafb;
  border-radius: 12px 12px 0 0;
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.btn-close {
  padding: 6px;
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

.btn-close:hover {
  background: #e5e7eb;
  color: #374151;
}

.modal-body {
  padding: 24px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.required {
  color: #ef4444;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

.form-group input.error,
.form-group select.error {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.form-group input.warning,
.form-group select.warning {
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
}

.form-hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 4px;
}

.form-hint.small {
  font-size: 0.7rem;
  margin-top: 2px;
}

.warning-text {
  color: #f59e0b;
  font-weight: 500;
}

/* Table Statistics */
.table-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a365d;
}

.stat-label {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Performance Warnings */
.performance-warnings {
  margin-bottom: 24px;
  padding: 16px;
  background: #fffbeb;
  border: 1px solid #fef3c7;
  border-radius: 8px;
}

.warning-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 600;
  color: #92400e;
}

.warning-header .material-symbols-outlined {
  color: #f59e0b;
  font-size: 18px;
}

.performance-warnings ul {
  margin: 0;
  padding-left: 20px;
  color: #92400e;
}

.performance-warnings li {
  margin-bottom: 4px;
  font-size: 0.875rem;
}

.form-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.btn-secondary.small {
  padding: 8px 12px;
  font-size: 0.875rem;
}

.columns-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.column-form {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
  transition: all 0.2s ease;
  position: relative;
}

.column-form.has-errors {
  border-color: #fecaca;
  background: #fef2f2;
}

.column-form.primary-key {
  border-left: 4px solid #10b981;
  background: #f0fdf4;
}

.column-form.foreign-key {
  border-left: 4px solid #3b82f6;
  background: #eff6ff;
}

.column-form:hover {
  border-color: #d1d5db;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.column-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.column-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.column-badge.pk {
  background: #10b981;
  color: white;
}

.column-badge.fk {
  background: #3b82f6;
  color: white;
}

.column-badge.unique {
  background: #8b5cf6;
  color: white;
}

.column-badge.nullable {
  background: #6b7280;
  color: white;
}

.column-index {
  font-size: 0.75rem;
  color: #6b7280;
  margin-left: auto;
}

.column-main {
  display: grid;
  grid-template-columns: 1fr 1fr 120px 140px auto 40px;
  gap: 12px;
  align-items: start;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-group label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0;
}

.length-input-container,
.default-input-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.empty-space {
  height: 42px;
}

.column-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.options-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: #374151;
  cursor: pointer;
  white-space: nowrap;
  padding: 4px 0;
}

.checkbox-label.primary {
  color: #059669;
  font-weight: 600;
}

.checkbox-label.foreign {
  color: #2563eb;
  font-weight: 600;
}

.checkbox-label input[type='checkbox'] {
  display: none;
}

.checkbox-custom {
  width: 16px;
  height: 16px;
  border: 2px solid #d1d5db;
  border-radius: 3px;
  background: white;
  position: relative;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.checkbox-label input[type='checkbox']:checked + .checkbox-custom {
  background: #1a365d;
  border-color: #1a365d;
}

.checkbox-label.primary input[type='checkbox']:checked + .checkbox-custom {
  background: #059669;
  border-color: #059669;
}

.checkbox-label.foreign input[type='checkbox']:checked + .checkbox-custom {
  background: #2563eb;
  border-color: #2563eb;
}

.checkbox-label input[type='checkbox']:checked + .checkbox-custom::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 10px;
  font-weight: bold;
}

.checkbox-label input[type='checkbox']:disabled + .checkbox-custom {
  background: #f3f4f6;
  border-color: #d1d5db;
  cursor: not-allowed;
}

.option-text {
  font-size: 0.75rem;
}

.btn-icon {
  padding: 6px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 24px;
}

.btn-icon:hover:not(:disabled) {
  background: #e5e7eb;
  color: #374151;
}

.btn-icon.danger:hover:not(:disabled) {
  background: #fef2f2;
  color: #ef4444;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Foreign Key Section */
.foreign-key-section {
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
  margin-top: 12px;
}

.foreign-key-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: #2563eb;
}

.foreign-key-header .material-symbols-outlined {
  font-size: 18px;
}

.foreign-key-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.foreign-key-info {
  margin-top: 4px;
  padding: 8px;
  background: #eff6ff;
  border-radius: 4px;
  border-left: 3px solid #3b82f6;
}

.foreign-key-info .form-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: #1e40af;
}

.foreign-key-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.column-errors {
  margin-top: 8px;
  padding: 8px;
  background: #fef2f2;
  border-radius: 4px;
  border-left: 3px solid #ef4444;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.column-errors .material-symbols-outlined {
  color: #ef4444;
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.error-message {
  display: block;
  font-size: 0.75rem;
  color: #dc2626;
  margin-bottom: 2px;
}

.validation-summary {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  align-items: flex-start;
}

.validation-summary.error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
}

.validation-summary ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.validation-summary li {
  margin-bottom: 4px;
}

.no-columns {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 8px;
  border: 2px dashed #e5e7eb;
}

.no-columns .material-symbols-outlined {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.no-columns p {
  margin: 0 0 16px 0;
  font-size: 0.875rem;
}

.sql-preview {
  background: #1f2937;
  border-radius: 6px;
  padding: 16px;
  margin-top: 8px;
}

.sql-preview pre {
  margin: 0;
  color: #e5e7eb;
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  line-height: 1.4;
  overflow-x: auto;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #1a365d;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;
  font-size: 0.875rem;
}

.btn-primary:hover:not(:disabled) {
  background: #2d4a8a;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #9ca3af;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.875rem;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

/* Responsive design */
@media (max-width: 1024px) {
  .column-main {
    grid-template-columns: 1fr 1fr 100px 120px auto 40px;
    gap: 8px;
  }
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 10px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .table-stats {
    flex-wrap: wrap;
    justify-content: space-around;
  }

  .column-main {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .column-options {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 12px;
  }

  .options-group {
    flex-direction: row;
    gap: 12px;
  }

  .btn-icon {
    margin-top: 0;
    align-self: center;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .modal-actions button {
    width: 100%;
  }
}
</style>