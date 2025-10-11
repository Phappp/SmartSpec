<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-container composite-key-details-modal">
      <div class="modal-header">
        <h2>Composite Key Details</h2>
        <button class="btn-close" @click="close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-content">
        <!-- Table Information -->
        <div class="info-section">
          <h3>{{ table.name }}</h3>
          <p class="table-description" v-if="table.description">{{ table.description }}</p>
        </div>

        <!-- Composite Key Structure -->
        <div class="key-structure-section">
          <h4>Composite Key Structure</h4>
          <div class="key-columns-list">
            <div
              v-for="(column, index) in compositeKeyColumns"
              :key="column.name"
              class="key-column-item"
            >
              <div class="column-order">
                <span class="order-number">{{ index + 1 }}</span>
                <span class="order-label">Order</span>
              </div>
              <div class="column-details">
                <div class="column-name-type">
                  <span class="name">{{ column.name }}</span>
                  <span class="type"
                    >{{ column.type }}{{ column.length ? `(${column.length})` : '' }}</span
                  >
                </div>
                <div class="column-metadata">
                  <span v-if="column.is_foreign_key" class="meta-item fk">
                    <span class="material-symbols-outlined">link</span>
                    References {{ column.references }}
                  </span>
                  <span v-if="!column.nullable" class="meta-item not-null">
                    <span class="material-symbols-outlined">lock</span>
                    NOT NULL
                  </span>
                  <span v-if="column.unique" class="meta-item unique">
                    <span class="material-symbols-outlined">star</span>
                    UNIQUE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Performance Considerations -->
        <div class="performance-section">
          <h4>Performance Considerations</h4>
          <div class="considerations-list">
            <div class="consideration-item" :class="getConsiderationClass('indexing')">
              <span class="material-symbols-outlined">speed</span>
              <div>
                <strong>Indexing</strong>
                <p>
                  Composite keys create a single index covering all key columns, which can improve
                  query performance for searches using the key prefix.
                </p>
              </div>
            </div>
            <div class="consideration-item" :class="getConsiderationClass('storage')">
              <span class="material-symbols-outlined">storage</span>
              <div>
                <strong>Storage</strong>
                <p>
                  Larger key sizes may increase storage requirements for indexes and foreign key
                  references.
                </p>
              </div>
            </div>
            <div class="consideration-item" :class="getConsiderationClass('foreign')">
              <span class="material-symbols-outlined">account_tree</span>
              <div>
                <strong>Foreign Keys</strong>
                <p>
                  Referencing tables must include all composite key columns in their foreign key
                  constraints.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Related Foreign Keys -->
        <div v-if="relatedForeignKeys.length > 0" class="foreign-keys-section">
          <h4>Related Foreign Keys</h4>
          <div class="foreign-keys-list">
            <div
              v-for="fk in relatedForeignKeys"
              :key="`${fk.fromTable}.${fk.column}`"
              class="foreign-key-item"
            >
              <div class="fk-info">
                <span class="fk-column">{{ fk.fromTable }}.{{ fk.column }}</span>
                <span class="fk-relationship">→ References this composite key</span>
              </div>
              <div class="fk-type">{{ fk.columnType }}</div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-section">
          <button class="btn-secondary" @click="convertToSingleKey">
            <span class="material-symbols-outlined">merge</span>
            Convert to Single Key
          </button>
          <button class="btn-primary" @click="exportKeyInfo">
            <span class="material-symbols-outlined">download</span>
            Export Key Information
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CompositeKeyDetailsModal',
  props: {
    table: {
      type: Object,
      required: true,
    },
    compositeKeyInfo: {
      type: Object,
      default: null,
    },
  },
  computed: {
    compositeKeyColumns() {
      if (this.compositeKeyInfo?.columns) {
        return this.compositeKeyInfo.columns
      }

      // Fallback: extract from table columns
      return (this.table.columns || [])
        .filter((col) => col.is_primary_key)
        .sort((a, b) => (a.primary_key_order || 0) - (b.primary_key_order || 0))
    },

    relatedForeignKeys() {
      // This would typically come from the database relationships
      // For now, we'll extract from table columns that reference this table
      const foreignKeys = []

      // In a real implementation, you would query the database for tables
      // that have foreign keys referencing this table's composite key

      return foreignKeys
    },

    keySize() {
      return this.compositeKeyColumns.reduce((size, col) => {
        // Estimate size based on data type
        const type = col.type?.toUpperCase() || ''
        if (type.includes('INT')) return size + 4
        if (type.includes('VARCHAR') || type.includes('CHAR')) {
          const length = parseInt(col.length) || 255
          return size + Math.min(length, 255)
        }
        if (type.includes('DECIMAL')) return size + 8
        return size + 4 // default
      }, 0)
    },
  },
  methods: {
    close() {
      this.$emit('close')
    },

    getConsiderationClass(type) {
      const considerations = {
        indexing: this.keySize <= 32 ? 'good' : this.keySize <= 64 ? 'warning' : 'critical',
        storage: this.keySize <= 16 ? 'good' : this.keySize <= 32 ? 'warning' : 'critical',
        foreign: this.compositeKeyColumns.some((col) => col.is_foreign_key) ? 'warning' : 'good',
      }
      return considerations[type] || 'good'
    },

    convertToSingleKey() {
      if (
        confirm(
          `Convert table "${this.table.name}" from composite key to single key? This will require selecting a primary column.`
        )
      ) {
        this.$emit('convert-to-single', this.table)
        this.close()
      }
    },

    exportKeyInfo() {
      const keyInfo = {
        table: this.table.name,
        compositeKey: {
          columns: this.compositeKeyColumns.map((col) => ({
            name: col.name,
            type: col.type,
            length: col.length,
            order: col.primary_key_order,
          })),
          totalColumns: this.compositeKeyColumns.length,
          estimatedSize: this.keySize,
        },
        exportDate: new Date().toISOString(),
      }

      const dataStr = JSON.stringify(keyInfo, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `composite-key-${this.table.name}.json`
      link.click()
      URL.revokeObjectURL(url)
    },
  },
}
</script>

<style scoped>
.composite-key-details-modal {
  max-width: 700px;
  max-height: 90vh;
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

.info-section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.info-section h3 {
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 1.3rem;
}

.table-description {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.key-structure-section {
  margin-bottom: 24px;
}

.key-structure-section h4 {
  margin: 0 0 16px 0;
  color: #374151;
  font-size: 1.1rem;
  font-weight: 600;
}

.key-columns-list {
  display: grid;
  gap: 12px;
}

.key-column-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.column-order {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 60px;
}

.order-number {
  background: #1a365d;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
}

.order-label {
  font-size: 0.7rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.column-details {
  flex: 1;
}

.column-name-type {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.column-name-type .name {
  font-weight: 600;
  font-size: 1rem;
  color: #1f2937;
}

.column-name-type .type {
  font-size: 0.8rem;
  color: #6b7280;
  background: #e5e7eb;
  padding: 2px 6px;
  border-radius: 4px;
}

.column-metadata {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  padding: 2px 6px;
  border-radius: 4px;
}

.meta-item.fk {
  background: #e0e7ff;
  color: #3730a3;
}

.meta-item.not-null {
  background: #fef3c7;
  color: #92400e;
}

.meta-item.unique {
  background: #d1fae5;
  color: #065f46;
}

.meta-item .material-symbols-outlined {
  font-size: 14px;
}

.performance-section {
  margin-bottom: 24px;
}

.performance-section h4 {
  margin: 0 0 16px 0;
  color: #374151;
  font-size: 1.1rem;
  font-weight: 600;
}

.considerations-list {
  display: grid;
  gap: 12px;
}

.consideration-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.consideration-item.good {
  border-left: 4px solid #10b981;
}

.consideration-item.warning {
  border-left: 4px solid #f59e0b;
}

.consideration-item.critical {
  border-left: 4px solid #ef4444;
}

.consideration-item .material-symbols-outlined {
  margin-top: 2px;
  color: #6b7280;
}

.consideration-item.good .material-symbols-outlined {
  color: #10b981;
}

.consideration-item.warning .material-symbols-outlined {
  color: #f59e0b;
}

.consideration-item.critical .material-symbols-outlined {
  color: #ef4444;
}

.consideration-item strong {
  display: block;
  margin-bottom: 4px;
  color: #1f2937;
}

.consideration-item p {
  margin: 0;
  font-size: 0.9rem;
  color: #6b7280;
  line-height: 1.4;
}

.foreign-keys-section {
  margin-bottom: 24px;
}

.foreign-keys-section h4 {
  margin: 0 0 16px 0;
  color: #374151;
  font-size: 1.1rem;
  font-weight: 600;
}

.foreign-keys-list {
  display: grid;
  gap: 8px;
}

.foreign-key-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.fk-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fk-column {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.9rem;
}

.fk-relationship {
  font-size: 0.8rem;
  color: #6b7280;
}

.fk-type {
  font-size: 0.8rem;
  color: #6b7280;
  background: #e5e7eb;
  padding: 2px 6px;
  border-radius: 4px;
}

.action-section {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.btn-primary,
.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #1a365d;
  color: white;
}

.btn-primary:hover {
  background: #2d4a8a;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #e5e7eb;
}
</style>