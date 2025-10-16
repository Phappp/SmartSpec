<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content large">
      <div class="modal-header">
        <h3>Manage Composite Keys</h3>
        <button class="btn-close" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <!-- Create Composite Key Section -->
        <div class="form-section">
          <div class="section-header">
            <h4>Create Composite Key</h4>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Select Table</label>
              <select v-model="selectedTable" class="form-select">
                <option value="">Choose a table...</option>
                <option
                  v-for="table in availableTables"
                  :key="table.name"
                  :value="table"
                  :disabled="table.primaryKeyCount > 1"
                >
                  {{ table.name }}
                  <template v-if="table.primaryKeyCount > 1">
                    (Already has composite key)
                  </template>
                  <template v-else-if="table.primaryKeyCount === 1"> (Single key) </template>
                  <template v-else> (No primary key) </template>
                </option>
              </select>
            </div>
          </div>

          <div v-if="selectedTable" class="columns-section">
            <h4>Select Columns for Composite Key</h4>
            <div class="columns-table">
              <div class="table-header">
                <div class="col-select">Select</div>
                <div class="col-name">Column Name</div>
                <div class="col-type">Data Type</div>
                <div class="col-attributes">Attributes</div>
              </div>

              <div class="table-body">
                <div
                  v-for="column in selectableColumns"
                  :key="column.name"
                  class="table-row"
                  :class="{ selected: selectedColumns.includes(column.name) }"
                  @click="toggleColumn(column)"
                >
                  <div class="col-select">
                    <div class="checkbox-wrapper">
                      <input
                        type="checkbox"
                        :checked="selectedColumns.includes(column.name)"
                        @change="toggleColumn(column)"
                        class="checkbox-input"
                      />
                      <span class="checkmark"></span>
                    </div>
                  </div>
                  <div class="col-name">
                    <span class="column-name">{{ column.name }}</span>
                  </div>
                  <div class="col-type">
                    <span class="data-type">{{ column.type }}</span>
                    <span v-if="column.length" class="type-length">({{ column.length }})</span>
                  </div>
                  <div class="col-attributes">
                    <div class="attribute-list">
                      <span v-if="!column.nullable" class="attribute not-null" title="Not Null"
                        >NN</span
                      >
                      <span v-if="column.unique" class="attribute unique" title="Unique">UQ</span>
                      <span
                        v-if="column.is_foreign_key"
                        class="attribute foreign"
                        title="Foreign Key"
                        >FK</span
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="selectedColumns.length > 0" class="selected-columns-section">
              <h4>Selected Columns Order</h4>
              <div class="selected-columns-list">
                <div
                  v-for="(columnName, index) in selectedColumns"
                  :key="columnName"
                  class="selected-column-item"
                >
                  <div class="column-order">
                    <span class="order-badge">{{ index + 1 }}</span>
                  </div>
                  <div class="column-details">
                    <span class="column-name">{{ columnName }}</span>
                    <span class="column-type">{{ getColumnType(columnName) }}</span>
                  </div>
                  <div class="column-actions">
                    <button
                      class="btn-icon"
                      @click.stop="moveColumn(index, -1)"
                      :disabled="index === 0"
                      title="Move up"
                    >
                      <span class="material-symbols-outlined">arrow_upward</span>
                    </button>
                    <button
                      class="btn-icon"
                      @click.stop="moveColumn(index, 1)"
                      :disabled="index === selectedColumns.length - 1"
                      title="Move down"
                    >
                      <span class="material-symbols-outlined">arrow_downward</span>
                    </button>
                    <button
                      class="btn-icon danger"
                      @click.stop="removeColumn(columnName)"
                      title="Remove"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="validationError" class="validation-summary error">
              <span class="material-symbols-outlined">error</span>
              <div>
                <strong>Validation Error:</strong>
                <p>{{ validationError }}</p>
              </div>
            </div>

            <div class="form-actions">
              <button
                class="btn-primary"
                @click="createCompositeKey"
                :disabled="!canCreateCompositeKey"
              >
                <span class="material-symbols-outlined">key</span>
                Create Composite Key
              </button>
            </div>
          </div>
        </div>

        <!-- Existing Composite Keys Section -->
        <div class="form-section">
          <div class="section-header">
            <h4>Existing Composite Keys</h4>
          </div>

          <div v-if="compositeKeyTables.length === 0" class="no-data">
            <span class="material-symbols-outlined">key_off</span>
            <p>No composite keys found</p>
          </div>

          <div v-else class="composite-keys-list">
            <div v-for="table in compositeKeyTables" :key="table.name" class="composite-key-card">
              <div class="key-header">
                <div class="table-info">
                  <span class="table-name">{{ table.name }}</span>
                  <span class="key-stats">
                    {{ table.compositeKey.columns.length }} column composite key
                  </span>
                </div>
                <div class="key-badge">Composite Key</div>
              </div>

              <div class="key-columns">
                <div
                  v-for="(col, index) in table.compositeKey.columns"
                  :key="col.name"
                  class="key-column-item"
                >
                  <div class="column-order">
                    <span class="order-badge">{{ index + 1 }}</span>
                  </div>
                  <div class="column-details">
                    <span class="column-name">{{ col.name }}</span>
                    <span class="column-type"
                      >{{ col.type }}{{ col.length ? `(${col.length})` : '' }}</span
                    >
                  </div>
                  <div class="column-attributes">
                    <div class="attribute-list">
                      <span v-if="!col.nullable" class="attribute not-null" title="Not Null"
                        >NN</span
                      >
                      <span v-if="col.unique" class="attribute unique" title="Unique">UQ</span>
                      <span v-if="col.is_foreign_key" class="attribute foreign" title="Foreign Key"
                        >FK</span
                      >
                    </div>
                  </div>
                </div>
              </div>

              <div class="key-actions">
                <button class="btn-secondary" @click="convertToSingle(table)">
                  <span class="material-symbols-outlined">merge</span>
                  Convert to Single Key
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-primary" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CompositeKeyModal',
  props: {
    tables: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      selectedTable: null,
      selectedColumns: [],
      validationError: '',
    }
  },
  computed: {
    availableTables() {
      return this.tables
        .map((table) => {
          const primaryKeys = table.columns?.filter((col) => col.is_primary_key) || []
          return {
            ...table,
            primaryKeyCount: primaryKeys.length,
            hasCompositeKey: primaryKeys.length > 1,
          }
        })
        .filter((table) => !table.hasCompositeKey && table.columns?.length >= 2)
    },

    compositeKeyTables() {
      return this.tables
        .map((table) => {
          const primaryKeys = table.columns?.filter((col) => col.is_primary_key) || []
          if (primaryKeys.length > 1) {
            return {
              ...table,
              compositeKey: {
                columns: primaryKeys.sort(
                  (a, b) => (a.primary_key_order || 0) - (b.primary_key_order || 0)
                ),
              },
            }
          }
          return null
        })
        .filter(Boolean)
    },

    selectableColumns() {
      if (!this.selectedTable) return []
      return (this.selectedTable.columns || [])
        .filter((column) => !column.nullable)
        .sort((a, b) => a.name.localeCompare(b.name))
    },

    canCreateCompositeKey() {
      return this.selectedTable && this.selectedColumns.length >= 2 && !this.validationError
    },
  },
  watch: {
    selectedColumns(newColumns) {
      this.validateSelection()
    },
  },
  methods: {
    toggleColumn(column) {
      const index = this.selectedColumns.indexOf(column.name)
      if (index === -1) {
        this.selectedColumns.push(column.name)
      } else {
        this.selectedColumns.splice(index, 1)
      }
    },

    getColumnType(columnName) {
      const column = this.selectableColumns.find((col) => col.name === columnName)
      return column ? `${column.type}${column.length ? `(${column.length})` : ''}` : ''
    },

    moveColumn(index, direction) {
      if (index + direction < 0 || index + direction >= this.selectedColumns.length) return

      const newIndex = index + direction
      const columns = [...this.selectedColumns]
      const [movedColumn] = columns.splice(index, 1)
      columns.splice(newIndex, 0, movedColumn)
      this.selectedColumns = columns
    },

    removeColumn(columnName) {
      this.selectedColumns = this.selectedColumns.filter((name) => name !== columnName)
    },

    validateSelection() {
      this.validationError = ''

      if (this.selectedColumns.length < 2) {
        this.validationError = 'Select at least 2 columns for composite key'
        return
      }

      const selectedColumnObjects = this.selectableColumns.filter((col) =>
        this.selectedColumns.includes(col.name)
      )

      const hasForeignKey = selectedColumnObjects.some((col) => col.is_foreign_key)
      if (hasForeignKey) {
        this.validationError = 'Foreign key columns are not recommended for composite primary keys'
        return
      }

      const hasTextTypes = selectedColumnObjects.some((col) =>
        ['TEXT', 'LONGTEXT', 'BLOB', 'LONGBLOB'].includes(col.type)
      )
      if (hasTextTypes) {
        this.validationError = 'Text/BLOB types are not suitable for primary keys'
        return
      }
    },

    createCompositeKey() {
      if (!this.canCreateCompositeKey) return

      this.$emit('create-composite-key', {
        tableName: this.selectedTable.name,
        columnNames: this.selectedColumns,
      })

      this.selectedTable = null
      this.selectedColumns = []
      this.validationError = ''
    },

    convertToSingle(table) {
      this.$emit('convert-to-single', table)
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
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-content.large {
  max-width: 1000px;
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

.form-section {
  margin-bottom: 32px;
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

.form-row {
  display: grid;
  grid-template-columns: 1fr;
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

.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  font-family: inherit;
}

.form-select:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

.columns-section {
  margin-top: 24px;
}

.columns-section h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
}

.columns-table {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 24px;
}

.table-header {
  display: grid;
  grid-template-columns: 60px 2fr 1.5fr 2fr;
  gap: 16px;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
}

.table-body {
  max-height: 300px;
  overflow-y: auto;
}

.table-row {
  display: grid;
  grid-template-columns: 60px 2fr 1.5fr 2fr;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s ease;
  cursor: pointer;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background: #f9fafb;
}

.table-row.selected {
  background: #f0f9ff;
  border-left: 3px solid #3b82f6;
}

.col-select {
  display: flex;
  align-items: center;
}

.checkbox-wrapper {
  position: relative;
  display: inline-block;
}

.checkbox-input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  position: relative;
  height: 18px;
  width: 18px;
  background-color: #fff;
  border: 2px solid #d1d5db;
  border-radius: 3px;
  transition: all 0.2s ease;
}

.checkbox-input:checked ~ .checkmark {
  background-color: #3b82f6;
  border-color: #3b82f6;
}

.checkbox-input:checked ~ .checkmark:after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.col-name {
  display: flex;
  align-items: center;
}

.column-name {
  font-weight: 500;
  color: #1f2937;
  font-size: 0.875rem;
}

.col-type {
  display: flex;
  align-items: center;
  gap: 4px;
}

.data-type {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: #1f2937;
}

.type-length {
  font-size: 0.75rem;
  color: #6b7280;
}

.col-attributes {
  display: flex;
  align-items: center;
}

.attribute-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.attribute {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 600;
  color: white;
}

.attribute.not-null {
  background: #ef4444;
}

.attribute.unique {
  background: #10b981;
}

.attribute.foreign {
  background: #8b5cf6;
}

.selected-columns-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.selected-columns-section h4 {
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
}

.selected-columns-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selected-column-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.column-order {
  display: flex;
  align-items: center;
}

.order-badge {
  background: #1a365d;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.8rem;
}

.column-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.column-details .column-name {
  font-weight: 600;
  font-size: 0.875rem;
}

.column-details .column-type {
  font-size: 0.75rem;
  color: #6b7280;
  font-family: 'Courier New', monospace;
}

.column-actions {
  display: flex;
  gap: 4px;
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

.validation-summary strong {
  display: block;
  margin-bottom: 4px;
}

.validation-summary p {
  margin: 0;
  font-size: 0.875rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
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

.no-data {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 8px;
  border: 2px dashed #e5e7eb;
}

.no-data .material-symbols-outlined {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.no-data p {
  margin: 0;
  font-size: 0.875rem;
}

.composite-keys-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.composite-key-card {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  transition: all 0.2s ease;
}

.composite-key-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.key-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.table-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.table-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.9rem;
}

.key-stats {
  font-size: 0.75rem;
  color: #6b7280;
}

.key-badge {
  background: #1a365d;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
}

.key-columns {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.key-column-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: #f8fafc;
  border-radius: 4px;
}

.key-actions {
  display: flex;
  justify-content: flex-end;
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
  font-size: 0.875rem;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  background: #f9fafb;
  border-radius: 0 0 12px 12px;
}

/* Responsive design */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 10px;
  }

  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .table-header {
    display: none;
  }

  .table-row {
    padding: 16px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    margin-bottom: 8px;
  }

  .col-select::before {
    content: 'Select: ';
    font-weight: 600;
    color: #374151;
  }

  .col-name::before {
    content: 'Column: ';
    font-weight: 600;
    color: #374151;
  }

  .col-type::before {
    content: 'Type: ';
    font-weight: 600;
    color: #374151;
  }

  .col-attributes::before {
    content: 'Attributes: ';
    font-weight: 600;
    color: #374151;
  }

  .selected-column-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .column-actions {
    align-self: flex-end;
  }

  .key-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .key-actions {
    justify-content: flex-start;
    width: 100%;
  }

  .key-actions button {
    width: 100%;
  }
}
</style>