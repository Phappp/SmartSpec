<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content large">
      <div class="modal-header">
        <h3>Table Details: {{ table.name }}</h3>
        <button class="btn-close" @click="$emit('close')">
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
              <label>Total Columns</label>
              <span class="info-value">{{ table.columns?.length || 0 }}</span>
            </div>
            <div class="info-item">
              <label>Relationships</label>
              <span class="info-value">{{ relationships.length }}</span>
            </div>
          </div>
        </div>

        <!-- Columns Section -->
        <div class="columns-section">
          <div class="section-header">
            <h4>Columns ({{ table.columns?.length || 0 }})</h4>
            <div class="column-stats">
              <span class="stat">
                <span class="stat-dot primary"></span>
                Primary Keys: {{ primaryKeyCount }}
              </span>
              <span class="stat">
                <span class="stat-dot foreign"></span>
                Foreign Keys: {{ foreignKeyCount }}
              </span>
            </div>
          </div>

          <div class="columns-table">
            <div class="table-header">
              <div class="col-name">Column Name</div>
              <div class="col-type">Data Type</div>
              <div class="col-attributes">Attributes</div>
              <div class="col-relations">Relations</div>
            </div>

            <div class="table-body">
              <div
                v-for="column in table.columns || []"
                :key="column.name"
                class="table-row"
                :class="{
                  'primary-key': column.is_primary_key,
                  'foreign-key': column.is_foreign_key,
                }"
              >
                <div class="col-name">
                  <span class="column-name">{{ column.name }}</span>
                  <div v-if="column.is_primary_key" class="column-badge primary">PK</div>
                  <div v-if="column.is_foreign_key" class="column-badge foreign">FK</div>
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

        <!-- Relationships Section -->
        <div v-if="relationships.length > 0" class="relationships-section">
          <h4>Relationships ({{ relationships.length }})</h4>
          <div class="relationships-list">
            <div
              v-for="relationship in relationships"
              :key="`${relationship.from_table}-${relationship.to_table}`"
              class="relationship-card"
              :class="relationship.type"
            >
              <div class="relationship-header">
                <span class="relationship-type">{{
                  formatRelationshipType(relationship.type)
                }}</span>
                <span class="relationship-direction">
                  {{ relationship.from_table === table.name ? 'Outgoing' : 'Incoming' }}
                </span>
              </div>

              <div class="relationship-tables">
                <span
                  class="table-name"
                  :class="{ 'current-table': relationship.from_table === table.name }"
                >
                  {{ relationship.from_table }}
                </span>
                <span class="relationship-arrow">
                  <span class="material-symbols-outlined">arrow_right_alt</span>
                </span>
                <span
                  class="table-name"
                  :class="{ 'current-table': relationship.to_table === table.name }"
                >
                  {{ relationship.to_table }}
                </span>
              </div>

              <div class="relationship-description">
                {{ getRelationshipDescription(relationship) }}
              </div>
            </div>
          </div>
        </div>

        <!-- SQL Preview -->
        <div class="sql-section">
          <h4>SQL Definition</h4>
          <div class="sql-preview">
            <pre><code>{{ generateTableSQL() }}</code></pre>
          </div>
          <div class="sql-actions">
            <button class="btn-secondary" @click="copySQL">
              <span class="material-symbols-outlined">content_copy</span>
              Copy SQL
            </button>
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
  name: 'TableDetailsModal',
  props: {
    table: {
      type: Object,
      required: true,
    },
    relationships: {
      type: Array,
      default: () => [],
    },
  },
  computed: {
    primaryKeyCount() {
      return this.table.columns?.filter((col) => col.is_primary_key).length || 0
    },
    foreignKeyCount() {
      return this.table.columns?.filter((col) => col.is_foreign_key).length || 0
    },
  },
  methods: {
    formatRelationshipType(type) {
      const types = {
        'one-to-one': 'One-to-One',
        'one-to-many': 'One-to-Many',
        'many-to-one': 'Many-to-One',
        'many-to-many': 'Many-to-Many',
      }
      return types[type] || type
    },

    getRelationshipDescription(relationship) {
      const { from_table, to_table, type } = relationship
      const isOutgoing = from_table === this.table.name

      const descriptions = {
        'one-to-one': isOutgoing
          ? `One record in this table relates to exactly one record in ${to_table}`
          : `One record in ${from_table} relates to exactly one record in this table`,
        'one-to-many': isOutgoing
          ? `One record in this table can relate to many records in ${to_table}`
          : `Many records in ${from_table} can relate to one record in this table`,
        'many-to-one': isOutgoing
          ? `Many records in this table can relate to one record in ${to_table}`
          : `One record in ${from_table} can relate to many records in this table`,
        'many-to-many': `Many records in ${from_table} relate to many records in ${to_table}`,
      }

      return descriptions[type] || 'Relationship between tables'
    },

    generateTableSQL() {
      const columns = (this.table.columns || [])
        .map((col) => {
          let columnDef = `  ${col.name} ${col.type}`
          if (col.length) columnDef += `(${col.length})`
          if (!col.nullable) columnDef += ' NOT NULL'
          if (col.unique) columnDef += ' UNIQUE'
          if (col.is_primary_key) columnDef += ' PRIMARY KEY AUTO_INCREMENT'
          if (col.default) columnDef += ` DEFAULT ${col.default}`
          return columnDef
        })
        .join(',\n')

      const foreignKeys = (this.table.columns || [])
        .filter((col) => col.is_foreign_key && col.references)
        .map((col) => `  FOREIGN KEY (${col.name}) REFERENCES ${col.references}(id)`)
        .join(',\n')

      const constraints = foreignKeys ? `,\n${foreignKeys}` : ''

      return `CREATE TABLE ${this.table.name} (\n${columns}${constraints}\n);`
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

.stat-dot.foreign {
  background: #8b5cf6;
}

.columns-table {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 1.5fr 2fr 1.5fr;
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
  grid-template-columns: 2fr 1.5fr 2fr 1.5fr;
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

.table-row.foreign-key {
  background: #faf5ff;
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

.column-badge.foreign {
  background: #8b5cf6;
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

.relationship-card.one-to-one {
  border-left: 4px solid #3b82f6;
}

.relationship-card.one-to-many {
  border-left: 4px solid #10b981;
}

.relationship-card.many-to-one {
  border-left: 4px solid #f59e0b;
}

.relationship-card.many-to-many {
  border-left: 4px solid #8b5cf6;
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

.sql-section {
  margin-bottom: 24px;
}

.sql-section h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 12px;
}

.sql-preview {
  background: #1f2937;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.sql-preview pre {
  margin: 0;
  color: #e5e7eb;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.4;
}

.sql-actions {
  display: flex;
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
}
</style>