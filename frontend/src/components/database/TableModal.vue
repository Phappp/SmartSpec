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
              />
              <div class="form-hint">Use snake_case format (e.g., user_profiles)</div>
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea
                v-model="tableForm.description"
                rows="2"
                placeholder="Describe what this table stores..."
              ></textarea>
            </div>
          </div>

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
                :class="{ 'has-errors': hasColumnErrors(column) }"
              >
                <div class="column-main">
                  <input
                    v-model="column.name"
                    type="text"
                    placeholder="Column name"
                    required
                    pattern="[a-zA-Z_][a-zA-Z0-9_]*"
                    :class="{ error: !isValidColumnName(column.name) }"
                  />
                  <select v-model="column.type" required @change="handleTypeChange(column)">
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

                  <input
                    v-if="showLengthInput(column.type)"
                    v-model="column.length"
                    type="number"
                    placeholder="Length"
                    min="1"
                    :class="{ error: !isValidLength(column.length, column.type) }"
                  />
                  <input v-else v-model="column.default" type="text" placeholder="Default value" />

                  <div class="column-options">
                    <label
                      class="checkbox-label"
                      :title="
                        column.is_primary_key
                          ? 'Primary keys are automatically NOT NULL and UNIQUE'
                          : ''
                      "
                    >
                      <input
                        v-model="column.is_primary_key"
                        type="checkbox"
                        @change="handlePrimaryKeyChange(index)"
                      />
                      <span class="checkbox-custom"></span>
                      PK
                    </label>
                    <label
                      class="checkbox-label"
                      :title="column.nullable ? 'Allows NULL values' : 'Requires a value'"
                    >
                      <input
                        v-model="column.nullable"
                        type="checkbox"
                        :disabled="column.is_primary_key"
                      />
                      <span class="checkbox-custom"></span>
                      Null
                    </label>
                    <label class="checkbox-label" title="Values must be unique across the table">
                      <input
                        v-model="column.unique"
                        type="checkbox"
                        :disabled="column.is_primary_key"
                      />
                      <span class="checkbox-custom"></span>
                      Unique
                    </label>
                    <label class="checkbox-label" title="References another table">
                      <input
                        v-model="column.is_foreign_key"
                        type="checkbox"
                        @change="handleForeignKeyChange(index)"
                      />
                      <span class="checkbox-custom"></span>
                      FK
                    </label>
                  </div>

                  <button
                    type="button"
                    class="btn-icon danger"
                    @click="removeColumn(index)"
                    :disabled="tableForm.columns.length <= 1"
                    title="Remove column"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>

                <div v-if="column.is_foreign_key" class="foreign-key-section">
                  <label>References Table</label>
                  <select v-model="column.references" required class="foreign-key-select">
                    <option value="">Select table to reference</option>
                    <option
                      v-for="availableTable in normalizedAvailableTables"
                      :key="availableTable.name"
                      :value="availableTable.name"
                    >
                      {{ availableTable.name }}
                    </option>
                    <!-- Manual option cho các references đã tồn tại nhưng không có trong danh sách -->
                    <option
                      v-if="
                        column.references &&
                        !normalizedAvailableTables.some((t) => t.name === column.references)
                      "
                      :value="column.references"
                      style="color: #f59e0b; font-style: italic"
                    >
                      {{ column.references }} (existing)
                    </option>
                  </select>
                  <div class="form-hint">
                    Foreign key will reference the primary key of the selected table
                  </div>
                </div>

                <div v-if="hasColumnErrors(column)" class="column-errors">
                  <span v-for="error in getColumnErrors(column)" :key="error" class="error-message">
                    {{ error }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="tableForm.columns.length === 0" class="no-columns">
              <span class="material-symbols-outlined">info</span>
              <p>Add at least one column to the table</p>
            </div>
          </div>

          <div class="form-section">
            <h4>Preview</h4>
            <div class="sql-preview">
              <pre><code>{{ generateTableSQL() }}</code></pre>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="$emit('close')">Cancel</button>
            <button type="submit" class="btn-primary" :disabled="!isFormValid">
              <span class="material-symbols-outlined">{{ table ? 'save' : 'add' }}</span>
              {{ table ? 'Update' : 'Create' }} Table
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
    }
  },
  computed: {
    isFormValid() {
      if (!this.tableForm.name || !this.isValidTableName(this.tableForm.name)) {
        return false
      }

      if (this.tableForm.columns.length === 0) {
        return false
      }

      // Check if all columns are valid
      return this.tableForm.columns.every(
        (column) =>
          this.isValidColumnName(column.name) &&
          column.type &&
          (!column.is_foreign_key || column.references) &&
          this.isValidLength(column.length, column.type)
      )
    },
    normalizedAvailableTables() {
      if (!Array.isArray(this.availableTables)) {
        console.warn('❌ [TableModal] availableTables is not an array:', this.availableTables)
        return []
      }
      return this.availableTables
        .map((table) => {
          // Nếu table là string, convert thành object
          if (typeof table === 'string') {
            return { name: table }
          }
          // Nếu table là object, đảm bảo có property name
          return {
            name: table.name || table.tableName || table._id || '',
            // Giữ nguyên các property khác nếu có
            ...table,
          }
        })
        .filter((table) => table.name) // Lọc bỏ những table không có name
    },
  },
  watch: {
    availableTables: {
      immediate: true,
      handler(newTables) {
        console.log('🔍 [TableModal] Available tables received:', newTables)
        console.log('🔍 [TableModal] Normalized tables:', this.normalizedAvailableTables)
      },
    },
    table: {
      immediate: true,
      handler(newTable) {
        if (newTable) {
          console.log('🔍 [TableModal] Editing table:', newTable.name)
          console.log(
            '🔍 [TableModal] Table columns:',
            newTable.columns?.map((col) => ({
              name: col.name,
              references: col.references,
              is_foreign_key: col.is_foreign_key,
            }))
          )

          this.tableForm = {
            name: newTable.name,
            description: newTable.description || '',
            columns: (newTable.columns || []).map((col) => ({
              ...col,
              length: col.length || null,
              nullable: col.nullable !== undefined ? col.nullable : true,
              unique: col.unique || false,
              references: col.references || '',
              default: col.default || null,
            })),
          }

          // DEBUG: Log foreign key columns after form setup
          setTimeout(() => {
            const fkColumns = this.tableForm.columns.filter((col) => col.is_foreign_key)
            console.log('🔍 [TableModal] FK columns in form:', fkColumns)
          }, 100)
        } else {
          this.resetForm()
        }
      },
    },
  },
  mounted() {
    setTimeout(() => {
      this.debugForeignKeys()
    }, 200)
  },
  methods: {
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
    },

    addColumn() {
      this.tableForm.columns.push({
        name: '',
        type: 'VARCHAR',
        length: 255,
        is_primary_key: false,
        is_foreign_key: false,
        nullable: true,
        unique: false,
        references: '',
        default: null,
      })
    },

    removeColumn(index) {
      if (this.tableForm.columns.length > 1) {
        this.tableForm.columns.splice(index, 1)
      }
    },

    handlePrimaryKeyChange(changedIndex) {
      if (this.tableForm.columns[changedIndex].is_primary_key) {
        // Ensure only one primary key
        this.tableForm.columns.forEach((column, index) => {
          if (index !== changedIndex) {
            column.is_primary_key = false
            // Primary keys are automatically NOT NULL and UNIQUE
            if (column.is_primary_key) {
              column.nullable = false
              column.unique = true
            }
          } else {
            // Set primary key constraints
            column.nullable = false
            column.unique = true
          }
        })
      }
    },

    handleForeignKeyChange(index) {
      const column = this.tableForm.columns[index]
      if (!column.is_foreign_key) {
        column.references = ''
      } else {
        // Foreign keys cannot be primary keys
        column.is_primary_key = false
      }
    },

    handleTypeChange(column) {
      // Set default lengths for certain types
      const defaultLengths = {
        VARCHAR: 255,
        CHAR: 1,
        DECIMAL: '10,2',
      }

      if (defaultLengths[column.type] && !column.length) {
        column.length = defaultLengths[column.type]
      }

      // Clear length for types that don't need it
      if (!this.showLengthInput(column.type)) {
        column.length = null
      }
    },

    showLengthInput(type) {
      const typesWithLength = ['VARCHAR', 'CHAR', 'DECIMAL', 'INT', 'BIGINT', 'SMALLINT', 'TINYINT']
      return typesWithLength.includes(type)
    },

    isValidTableName(name) {
      return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
    },

    isValidColumnName(name) {
      return name && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
    },

    isValidLength(length, type) {
      if (!this.showLengthInput(type)) return true
      if (!length) return false

      if (type === 'DECIMAL') {
        return /^\d+,\d+$/.test(length)
      }

      return !isNaN(length) && length > 0
    },

    hasColumnErrors(column) {
      return this.getColumnErrors(column).length > 0
    },

    getColumnErrors(column) {
      const errors = []

      if (!this.isValidColumnName(column.name)) {
        errors.push('Invalid column name')
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
        } else {
          errors.push('Valid length is required')
        }
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

          if (col.length && this.showLengthInput(col.type)) {
            columnDef += `(${col.length})`
          }

          if (!col.nullable) columnDef += ' NOT NULL'
          if (col.unique) columnDef += ' UNIQUE'
          if (col.is_primary_key) columnDef += ' PRIMARY KEY AUTO_INCREMENT'
          if (col.default) columnDef += ` DEFAULT ${col.default}`

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

    saveTable() {
      if (!this.isFormValid) return

      // Clean up the data before saving
      const cleanedData = {
        ...this.tableForm,
        columns: this.tableForm.columns.map((col) => ({
          ...col,
          length: this.showLengthInput(col.type) ? col.length : null,
          // Ensure primary key constraints
          nullable: col.is_primary_key ? false : col.nullable,
          unique: col.is_primary_key ? true : col.unique,
        })),
      }

      this.$emit('save', cleanedData)
    },

    debugForeignKeys() {
      const fkColumns = this.tableForm.columns.filter((col) => col.is_foreign_key)
      console.log('🔍 [DEBUG] Current FK columns:', fkColumns)
      console.log('🔍 [DEBUG] Available tables:', this.normalizedAvailableTables)

      fkColumns.forEach((fkCol) => {
        const exists = this.normalizedAvailableTables.some(
          (table) => table.name === fkCol.references
        )
        console.log(
          `🔍 [DEBUG] FK "${fkCol.name}" references "${fkCol.references}" - exists: ${exists}`
        )
      })
    },
  },
}
</script>

<style scoped>
/* Giữ nguyên toàn bộ CSS từ file cũ */
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
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-content.large {
  max-width: 900px;
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

.form-hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 4px;
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
}

.column-form.has-errors {
  border-color: #fecaca;
  background: #fef2f2;
}

.column-form:hover {
  border-color: #d1d5db;
}

.column-main {
  display: grid;
  grid-template-columns: 1fr 1fr 100px auto 40px;
  gap: 12px;
  align-items: start;
  margin-bottom: 12px;
}

.column-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: #374151;
  cursor: pointer;
  white-space: nowrap;
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
}

.checkbox-label input[type='checkbox']:checked + .checkbox-custom {
  background: #1a365d;
  border-color: #1a365d;
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

.foreign-key-section {
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.foreign-key-section label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
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
}

.error-message {
  display: block;
  font-size: 0.75rem;
  color: #ef4444;
  margin-bottom: 2px;
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
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.no-columns p {
  margin: 0;
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
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 10px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .column-main {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .column-options {
    justify-content: flex-start;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .modal-actions button {
    width: 100%;
  }
}
</style>