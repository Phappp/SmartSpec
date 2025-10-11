<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-container composite-key-modal">
      <div class="modal-header">
        <h2>Manage Composite Keys</h2>
        <button class="btn-close" @click="close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-content">
        <!-- Create Composite Key Section -->
        <div class="section">
          <h3>Create Composite Key</h3>
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
                <template v-if="table.primaryKeyCount > 1"> (Already has composite key) </template>
                <template v-else-if="table.primaryKeyCount === 1"> (Single key) </template>
                <template v-else> (No primary key) </template>
              </option>
            </select>
          </div>

          <div v-if="selectedTable" class="columns-section">
            <label>Select Columns for Composite Key</label>
            <div class="columns-list">
              <div
                v-for="column in selectableColumns"
                :key="column.name"
                class="column-item"
                :class="{ selected: selectedColumns.includes(column.name) }"
                @click="toggleColumn(column)"
              >
                <div class="column-info">
                  <span class="column-name">{{ column.name }}</span>
                  <span class="column-type"
                    >{{ column.type }}{{ column.length ? `(${column.length})` : '' }}</span
                  >
                </div>
                <div class="column-constraints">
                  <span v-if="column.nullable" class="constraint nullable">NULL</span>
                  <span v-if="column.unique" class="constraint unique">UNIQUE</span>
                  <span v-if="column.is_foreign_key" class="constraint fk">FK</span>
                </div>
                <div class="column-order" v-if="selectedColumns.includes(column.name)">
                  {{ getColumnOrder(column.name) }}
                </div>
              </div>
            </div>

            <div v-if="selectedColumns.length > 0" class="selected-columns">
              <h4>Selected Columns (Order: {{ selectedColumns.join(' → ') }})</h4>
              <div class="order-controls">
                <button
                  class="btn-secondary btn-sm"
                  @click="reorderColumns(-1)"
                  :disabled="selectedColumns.length <= 1"
                >
                  <span class="material-symbols-outlined">arrow_upward</span>
                  Move Up
                </button>
                <button
                  class="btn-secondary btn-sm"
                  @click="reorderColumns(1)"
                  :disabled="selectedColumns.length <= 1"
                >
                  <span class="material-symbols-outlined">arrow_downward</span>
                  Move Down
                </button>
              </div>
            </div>

            <div v-if="validationError" class="validation-error">
              <span class="material-symbols-outlined">error</span>
              {{ validationError }}
            </div>

            <div class="action-buttons">
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
        <div class="section">
          <h3>Existing Composite Keys</h3>
          <div v-if="compositeKeyTables.length === 0" class="empty-state">
            <span class="material-symbols-outlined">key_off</span>
            <p>No composite keys found</p>
          </div>
          <div v-else class="composite-keys-list">
            <div v-for="table in compositeKeyTables" :key="table.name" class="composite-key-item">
              <div class="key-header">
                <span class="table-name">{{ table.name }}</span>
                <span class="key-badge">{{ table.compositeKey.columns.length }} columns</span>
              </div>
              <div class="key-columns">
                <div
                  v-for="(col, index) in table.compositeKey.columns"
                  :key="col.name"
                  class="key-column"
                >
                  <span class="order">{{ index + 1 }}</span>
                  <span class="name">{{ col.name }}</span>
                  <span class="type">{{ col.type }}</span>
                </div>
              </div>
              <div class="key-actions">
                <button class="btn-secondary btn-sm" @click="convertToSingle(table)">
                  <span class="material-symbols-outlined">merge</span>
                  Convert to Single Key
                </button>
              </div>
            </div>
          </div>
        </div>
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
    // Tables that can have composite keys (not already composite)
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

    // Tables that already have composite keys
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

    // Columns that can be selected for composite key
    selectableColumns() {
      if (!this.selectedTable) return []
      return (this.selectedTable.columns || [])
        .filter((column) => !column.nullable) // Cannot use nullable columns in composite key
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
    close() {
      this.$emit('close')
    },

    toggleColumn(column) {
      const index = this.selectedColumns.indexOf(column.name)
      if (index === -1) {
        this.selectedColumns.push(column.name)
      } else {
        this.selectedColumns.splice(index, 1)
      }
    },

    getColumnOrder(columnName) {
      return this.selectedColumns.indexOf(columnName) + 1
    },

    reorderColumns(direction) {
      if (this.selectedColumns.length <= 1) return

      // Simple reordering logic - in a real app you might want drag & drop
      if (direction === -1) {
        // Move up - not implemented in this simple version
        console.log('Move up functionality would go here')
      } else {
        // Move down - not implemented in this simple version
        console.log('Move down functionality would go here')
      }
    },

    validateSelection() {
      this.validationError = ''

      if (this.selectedColumns.length < 2) {
        this.validationError = 'Select at least 2 columns for composite key'
        return
      }

      // Check for foreign key constraints
      const selectedColumnObjects = this.selectableColumns.filter((col) =>
        this.selectedColumns.includes(col.name)
      )

      const hasForeignKey = selectedColumnObjects.some((col) => col.is_foreign_key)
      if (hasForeignKey) {
        this.validationError = 'Foreign key columns are not recommended for composite primary keys'
        return
      }

      // Check data type compatibility
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

      // Reset form
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
.composite-key-modal {
  overflow: hidden;
  border: 1px solid #ddd;
  align-self: center;
  background: white;
  justify-self: center;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  position: fixed;
  width: 80vw;
  height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 1.5rem;
}

.btn-close {
  background: none;
  border: none;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-content {
  padding: 20px;
}

.section {
  margin-bottom: 30px;
}

.section h3 {
  margin: 0 0 16px 0;
  color: #374151;
  font-size: 1.1rem;
  font-weight: 600;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
}

.columns-section label {
  display: block;
  margin-bottom: 12px;
  font-weight: 500;
  color: #374151;
}

.columns-list {
  display: grid;
  gap: 8px;
  margin-bottom: 20px;
}

.column-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.column-item:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.column-item.selected {
  border-color: #1a365d;
  background: #1a365d;
  color: white;
}

.column-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.column-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.column-type {
  font-size: 0.8rem;
  opacity: 0.7;
}

.column-item.selected .column-type {
  opacity: 0.9;
}

.column-constraints {
  display: flex;
  gap: 4px;
}

.constraint {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.constraint.nullable {
  background: #fef3c7;
  color: #92400e;
}

.constraint.unique {
  background: #d1fae5;
  color: #065f46;
}

.constraint.fk {
  background: #e0e7ff;
  color: #3730a3;
}

.column-item.selected .constraint {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.column-order {
  background: white;
  color: #1a365d;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
}

.selected-columns {
  background: #f8fafc;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.selected-columns h4 {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: #374151;
}

.order-controls {
  display: flex;
  gap: 8px;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.8rem;
}

.validation-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 0.9rem;
  margin-bottom: 16px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #1a365d;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
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
  padding: 8px 12px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.empty-state .material-symbols-outlined {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.composite-keys-list {
  display: grid;
  gap: 16px;
}

.composite-key-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.key-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.table-name {
  font-weight: 600;
  color: #1f2937;
}

.key-badge {
  background: #1a365d;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.key-columns {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.key-column {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: #f8fafc;
  border-radius: 4px;
}

.key-column .order {
  background: #1a365d;
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

.key-column .name {
  font-weight: 600;
  font-size: 0.9rem;
}

.key-column .type {
  font-size: 0.8rem;
  color: #6b7280;
}

.key-actions {
  display: flex;
  justify-content: flex-end;
}
</style>