<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-content large">
      <div class="modal-header">
        <h3>Composite Key Details: {{ table.name }}</h3>
        <button class="btn-close" @click="close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <!-- Table Information -->
        <div class="info-section">
          <h4>Table Information</h4>
          <div class="info-grid">
            <div class="info-item">
              <label>Table Name</label>
              <span class="info-value">{{ table.name }}</span>
            </div>
            <div class="info-item">
              <label>Description</label>
              <span class="info-value">{{ table.description || 'No description' }}</span>
            </div>
            <div class="info-item">
              <label>Composite Key Columns</label>
              <span class="info-value">{{ compositeKeyColumns.length }}</span>
            </div>
            <div class="info-item">
              <label>Estimated Key Size</label>
              <span class="info-value">{{ keySize }} bytes</span>
            </div>
          </div>
        </div>

        <!-- Composite Key Structure -->
        <div class="columns-section">
          <div class="section-header">
            <h4>Composite Key Structure</h4>
            <div class="column-stats">
              <span class="stat">
                <span class="stat-dot primary"></span>
                Primary Key Columns: {{ compositeKeyColumns.length }}
              </span>
            </div>
          </div>

          <div class="columns-table">
            <div class="table-header">
              <div class="col-order">Order</div>
              <div class="col-name">Column Name</div>
              <div class="col-type">Data Type</div>
              <div class="col-attributes">Attributes</div>
              <div class="col-relations">Relations</div>
            </div>

            <div class="table-body">
              <div
                v-for="(column, index) in compositeKeyColumns"
                :key="column.name"
                class="table-row primary-key"
              >
                <div class="col-order">
                  <span class="order-badge">{{ index + 1 }}</span>
                </div>
                <div class="col-name">
                  <span class="column-name">{{ column.name }}</span>
                  <div class="column-badge primary">PK</div>
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
                    <span v-if="column.default" class="attribute default" title="Default Value">
                      DEFAULT: {{ column.default }}
                    </span>
                  </div>
                </div>

                <div class="col-relations">
                  <div v-if="column.is_foreign_key && column.references" class="relation-info">
                    <span class="material-symbols-outlined">arrow_right_alt</span>
                    References {{ column.references }}.id
                  </div>
                  <span v-else class="no-relation">—</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Performance Considerations -->
        <div class="performance-section">
          <h4>Performance Considerations</h4>
          <div class="considerations-grid">
            <div class="consideration-card" :class="getConsiderationClass('indexing')">
              <div class="consideration-header">
                <span class="material-symbols-outlined">speed</span>
                <span class="consideration-title">Indexing</span>
              </div>
              <p>
                Composite keys create a single index covering all key columns, which can improve
                query performance for searches using the key prefix.
              </p>
              <div class="consideration-status">
                <span class="status-dot" :class="getConsiderationClass('indexing')"></span>
                {{ getConsiderationText('indexing') }}
              </div>
            </div>

            <div class="consideration-card" :class="getConsiderationClass('storage')">
              <div class="consideration-header">
                <span class="material-symbols-outlined">storage</span>
                <span class="consideration-title">Storage</span>
              </div>
              <p>
                Larger key sizes may increase storage requirements for indexes and foreign key
                references.
              </p>
              <div class="consideration-status">
                <span class="status-dot" :class="getConsiderationClass('storage')"></span>
                {{ getConsiderationText('storage') }}
              </div>
            </div>

            <div class="consideration-card" :class="getConsiderationClass('foreign')">
              <div class="consideration-header">
                <span class="material-symbols-outlined">account_tree</span>
                <span class="consideration-title">Foreign Keys</span>
              </div>
              <p>
                Referencing tables must include all composite key columns in their foreign key
                constraints.
              </p>
              <div class="consideration-status">
                <span class="status-dot" :class="getConsiderationClass('foreign')"></span>
                {{ getConsiderationText('foreign') }}
              </div>
            </div>
          </div>
        </div>

        <!-- Related Foreign Keys -->
        <div v-if="relatedForeignKeys.length > 0" class="relationships-section">
          <h4>Related Foreign Keys ({{ relatedForeignKeys.length }})</h4>
          <div class="relationships-list">
            <div
              v-for="fk in relatedForeignKeys"
              :key="`${fk.fromTable}.${fk.column}`"
              class="relationship-card"
            >
              <div class="relationship-header">
                <span class="relationship-type">Foreign Key Reference</span>
                <span class="relationship-direction">Incoming</span>
              </div>

              <div class="relationship-tables">
                <span class="table-name">{{ fk.fromTable }}</span>
                <span class="relationship-arrow">
                  <span class="material-symbols-outlined">arrow_right_alt</span>
                </span>
                <span class="table-name current-table">{{ table.name }}</span>
              </div>

              <div class="relationship-description">
                Column <strong>{{ fk.column }}</strong> ({{ fk.columnType }}) references this
                composite key
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-section">
          <div class="sql-actions">
            <button class="btn-secondary" @click="convertToSingleKey">
              <span class="material-symbols-outlined">merge</span>
              Convert to Single Key
            </button>
            <button class="btn-secondary" @click="exportKeyInfo">
              <span class="material-symbols-outlined">download</span>
              Export Key Info
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-primary" @click="close">Close</button>
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
      // For now, we'll return empty array - in real implementation, query the database
      return []
    },

    keySize() {
      return this.compositeKeyColumns.reduce((size, col) => {
        const type = col.type?.toUpperCase() || ''
        if (type.includes('INT')) return size + 4
        if (type.includes('VARCHAR') || type.includes('CHAR')) {
          const length = parseInt(col.length) || 255
          return size + Math.min(length, 255)
        }
        if (type.includes('DECIMAL')) return size + 8
        return size + 4
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

    getConsiderationText(type) {
      const classes = this.getConsiderationClass(type)
      const texts = {
        good: 'Optimal',
        warning: 'Consideration Needed',
        critical: 'Critical Review',
      }
      return texts[classes] || 'Good'
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

.info-section {
  margin-bottom: 32px;
}

.info-section h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
}

.info-value {
  font-size: 0.875rem;
  color: #1f2937;
  font-weight: 500;
}

.columns-section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.section-header h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.column-stats {
  display: flex;
  gap: 16px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: #6b7280;
}

.stat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.stat-dot.primary {
  background: #3b82f6;
}

.columns-table {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 80px 2fr 1.5fr 2fr 1.5fr;
  gap: 16px;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
}

.table-body {
  max-height: 400px;
  overflow-y: auto;
}

.table-row {
  display: grid;
  grid-template-columns: 80px 2fr 1.5fr 2fr 1.5fr;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s ease;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background: #f9fafb;
}

.table-row.primary-key {
  background: #f0f9ff;
}

.col-order {
  display: flex;
  align-items: center;
}

.order-badge {
  background: #1a365d;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.8rem;
}

.col-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.column-name {
  font-weight: 500;
  color: #1f2937;
  font-size: 0.875rem;
}

.column-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  color: white;
}

.column-badge.primary {
  background: #3b82f6;
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

.attribute.default {
  background: #6b7280;
  color: white;
}

.col-relations {
  display: flex;
  align-items: center;
}

.relation-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #8b5cf6;
}

.relation-info .material-symbols-outlined {
  font-size: 14px;
}

.no-relation {
  color: #9ca3af;
  font-size: 0.875rem;
  font-style: italic;
}

.performance-section {
  margin-bottom: 32px;
}

.performance-section h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
}

.considerations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.consideration-card {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  transition: all 0.2s ease;
}

.consideration-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.consideration-card.good {
  border-left: 4px solid #10b981;
}

.consideration-card.warning {
  border-left: 4px solid #f59e0b;
}

.consideration-card.critical {
  border-left: 4px solid #ef4444;
}

.consideration-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.consideration-header .material-symbols-outlined {
  font-size: 18px;
  color: #6b7280;
}

.consideration-card.good .consideration-header .material-symbols-outlined {
  color: #10b981;
}

.consideration-card.warning .consideration-header .material-symbols-outlined {
  color: #f59e0b;
}

.consideration-card.critical .consideration-header .material-symbols-outlined {
  color: #ef4444;
}

.consideration-title {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.9rem;
}

.consideration-card p {
  margin: 0 0 12px 0;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.4;
}

.consideration-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-dot.good {
  background: #10b981;
}

.status-dot.warning {
  background: #f59e0b;
}

.status-dot.critical {
  background: #ef4444;
}

.relationships-section {
  margin-bottom: 32px;
}

.relationships-section h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
}

.relationships-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.relationship-card {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  transition: all 0.2s ease;
}

.relationship-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.relationship-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.relationship-type {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
}

.relationship-direction {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 12px;
}

.relationship-tables {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.table-name {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.table-name.current-table {
  color: #1a365d;
  font-weight: 600;
}

.relationship-arrow {
  color: #6b7280;
}

.relationship-arrow .material-symbols-outlined {
  font-size: 16px;
}

.relationship-description {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.4;
}

.action-section {
  margin-bottom: 24px;
}

.sql-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 6px;
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

.btn-primary {
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

.btn-primary:hover {
  background: #2d4a8a;
}

/* Responsive design */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 10px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
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

  .col-order::before {
    content: 'Order: ';
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

  .col-relations::before {
    content: 'Relations: ';
    font-weight: 600;
    color: #374151;
  }

  .considerations-grid {
    grid-template-columns: 1fr;
  }

  .sql-actions {
    flex-direction: column;
  }

  .sql-actions button {
    width: 100%;
  }
}
</style>