<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content large">
      <div class="modal-header">
        <h3>Manage Relationships</h3>
        <button class="btn-close" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <!-- Add Relationship Form -->
        <div class="relationship-form">
          <h4>Add New Relationship</h4>
          <div class="form-row">
            <div class="form-group">
              <label>From Table <span class="required">*</span></label>
              <select v-model="newRelationship.from_table" required @change="validateRelationship">
                <option value="">Select source table</option>
                <option v-for="table in tables" :key="table._id || table.name" :value="table.name">
                  {{ table.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>To Table <span class="required">*</span></label>
              <select v-model="newRelationship.to_table" required @change="validateRelationship">
                <option value="">Select target table</option>
                <option
                  v-for="table in availableTargetTables"
                  :key="table._id || table.name"
                  :value="table.name"
                >
                  {{ table.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Relationship Type <span class="required">*</span></label>
              <select v-model="newRelationship.type" required @change="validateRelationship">
                <option value="one-to-one">One-to-One</option>
                <option value="one-to-many">One-to-Many</option>
                <option value="many-to-one">Many-to-One</option>
                <option value="many-to-many">Many-to-Many</option>
              </select>
            </div>
          </div>

          <div v-if="relationshipPreview" class="relationship-preview">
            <div class="preview-header">
              <span class="material-symbols-outlined">info</span>
              <strong>Relationship Preview:</strong>
            </div>
            <div class="preview-content">
              {{ relationshipPreview }}
            </div>
            <div class="preview-hint" v-if="relationshipHint">
              {{ relationshipHint }}
            </div>
          </div>

          <div v-if="relationshipError" class="relationship-error">
            <span class="material-symbols-outlined">error</span>
            {{ relationshipError }}
          </div>

          <button class="btn-primary" @click="addRelationship" :disabled="!canAddRelationship">
            <span class="material-symbols-outlined">add</span>
            Add Relationship
          </button>
        </div>

        <!-- Existing Relationships -->
        <div class="relationships-list">
          <div class="section-header">
            <h4>Current Relationships ({{ relationships.length }})</h4>
            <div class="relationship-stats">
              <span class="stat-item">
                <span class="stat-dot one-to-one"></span>
                One-to-One: {{ getRelationshipCount('one-to-one') }}
              </span>
              <span class="stat-item">
                <span class="stat-dot one-to-many"></span>
                One-to-Many: {{ getRelationshipCount('one-to-many') }}
              </span>
              <span class="stat-item">
                <span class="stat-dot many-to-one"></span>
                Many-to-One: {{ getRelationshipCount('many-to-one') }}
              </span>
              <span class="stat-item">
                <span class="stat-dot many-to-many"></span>
                Many-to-Many: {{ getRelationshipCount('many-to-many') }}
              </span>
            </div>
          </div>

          <div v-if="relationships.length === 0" class="empty-relationships">
            <span class="material-symbols-outlined">link_off</span>
            <p>No relationships defined yet</p>
            <p class="hint">Add relationships to establish connections between your tables</p>
          </div>

          <div v-else class="relationships-grid">
            <div
              v-for="(relationship, index) in relationships"
              :key="`${relationship.from_table}-${relationship.to_table}-${index}`"
              class="relationship-item"
              :class="relationship.type"
            >
              <div class="relationship-info">
                <div class="relationship-type">
                  <span class="type-badge" :class="relationship.type">
                    {{ formatRelationshipType(relationship.type) }}
                  </span>
                </div>
                <div class="relationship-tables">
                  <span class="from-table">{{ relationship.from_table }}</span>
                  <span class="relationship-arrow">
                    <span class="material-symbols-outlined">arrow_right_alt</span>
                  </span>
                  <span class="to-table">{{ relationship.to_table }}</span>
                </div>
                <div class="relationship-meta">
                  <span class="meta-item">
                    <span class="material-symbols-outlined">schema</span>
                    Requires foreign key in {{ relationship.from_table }}
                  </span>
                </div>
              </div>
              <div class="relationship-actions">
                <button
                  class="btn-icon danger"
                  @click="removeRelationship(index)"
                  title="Delete relationship"
                >
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RelationshipModal',
  props: {
    relationships: {
      type: Array,
      default: () => [],
    },
    tables: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      newRelationship: {
        from_table: '',
        to_table: '',
        type: 'one-to-many',
      },
      relationshipError: '',
      relationshipPreview: '',
      relationshipHint: '',
    }
  },
  computed: {
    availableTargetTables() {
      if (!this.newRelationship.from_table) {
        return this.tables
      }
      return this.tables.filter((table) => table.name !== this.newRelationship.from_table)
    },

    canAddRelationship() {
      return (
        this.newRelationship.from_table &&
        this.newRelationship.to_table &&
        this.newRelationship.type &&
        !this.relationshipError
      )
    },
  },
  methods: {
    validateRelationship() {
      this.relationshipError = ''
      this.relationshipPreview = ''
      this.relationshipHint = ''

      if (!this.newRelationship.from_table || !this.newRelationship.to_table) {
        return
      }

      // Check if tables are the same
      if (this.newRelationship.from_table === this.newRelationship.to_table) {
        this.relationshipError = 'Cannot create relationship between the same table'
        return
      }

      // Check if relationship already exists
      const exists = this.relationships.some(
        (rel) =>
          rel.from_table === this.newRelationship.from_table &&
          rel.to_table === this.newRelationship.to_table
      )

      if (exists) {
        this.relationshipError = 'This relationship already exists'
        return
      }

      // Generate preview
      this.generatePreview()
    },

    generatePreview() {
      const { from_table, to_table, type } = this.newRelationship

      const previews = {
        'one-to-one': `One record in ${from_table} relates to one record in ${to_table}`,
        'one-to-many': `One record in ${from_table} relates to many records in ${to_table}`,
        'many-to-one': `Many records in ${from_table} relate to one record in ${to_table}`,
        'many-to-many': `Many records in ${from_table} relate to many records in ${to_table}`,
      }

      this.relationshipPreview = previews[type]

      // Generate hints
      const hints = {
        'one-to-one': `Add a foreign key in ${from_table} referencing ${to_table}.id (with UNIQUE constraint)`,
        'one-to-many': `Add a foreign key in ${to_table} referencing ${from_table}.id`,
        'many-to-one': `Add a foreign key in ${from_table} referencing ${to_table}.id`,
        'many-to-many': `Create a junction table with foreign keys to both ${from_table} and ${to_table}`,
      }

      this.relationshipHint = hints[type]
    },

    addRelationship() {
      if (!this.canAddRelationship) return

      this.$emit('save-relationship', { ...this.newRelationship })

      // Reset form
      this.newRelationship = {
        from_table: '',
        to_table: '',
        type: 'one-to-many',
      }
      this.relationshipError = ''
      this.relationshipPreview = ''
      this.relationshipHint = ''
    },

    removeRelationship(index) {
      if (confirm('Are you sure you want to delete this relationship?')) {
        this.$emit('remove-relationship', index)
      }
    },

    getRelationshipCount(type) {
      return this.relationships.filter((rel) => rel.type === type).length
    },

    formatRelationshipType(type) {
      const types = {
        'one-to-one': '1:1',
        'one-to-many': '1:N',
        'many-to-one': 'N:1',
        'many-to-many': 'N:N',
      }
      return types[type] || type
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

.relationship-form {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.relationship-form h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
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

.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  background: white;
}

.form-group select:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

.relationship-preview {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.preview-header .material-symbols-outlined {
  font-size: 16px;
  color: #0ea5e9;
}

.preview-header strong {
  font-size: 0.875rem;
  color: #0c4a6e;
}

.preview-content {
  font-size: 0.875rem;
  color: #0369a1;
  margin-bottom: 4px;
}

.preview-hint {
  font-size: 0.75rem;
  color: #0ea5e9;
  font-style: italic;
}

.relationship-error {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 16px;
  color: #dc2626;
  font-size: 0.875rem;
}

.relationship-error .material-symbols-outlined {
  font-size: 16px;
  flex-shrink: 0;
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

.relationships-list {
  margin-top: 24px;
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

.relationship-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-item {
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

.stat-dot.one-to-one {
  background: #3b82f6;
}

.stat-dot.one-to-many {
  background: #10b981;
}

.stat-dot.many-to-one {
  background: #f59e0b;
}

.stat-dot.many-to-many {
  background: #8b5cf6;
}

.empty-relationships {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 8px;
  border: 2px dashed #e5e7eb;
}

.empty-relationships .material-symbols-outlined {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-relationships p {
  margin: 0 0 8px 0;
  font-size: 0.875rem;
}

.empty-relationships .hint {
  font-size: 0.75rem;
  opacity: 0.7;
}

.relationships-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.relationship-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.relationship-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.relationship-item.one-to-one {
  border-left: 4px solid #3b82f6;
}

.relationship-item.one-to-many {
  border-left: 4px solid #10b981;
}

.relationship-item.many-to-one {
  border-left: 4px solid #f59e0b;
}

.relationship-item.many-to-many {
  border-left: 4px solid #8b5cf6;
}

.relationship-info {
  flex: 1;
}

.relationship-type {
  margin-bottom: 8px;
}

.type-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  color: white;
}

.type-badge.one-to-one {
  background: #3b82f6;
}

.type-badge.one-to-many {
  background: #10b981;
}

.type-badge.many-to-one {
  background: #f59e0b;
}

.type-badge.many-to-many {
  background: #8b5cf6;
}

.relationship-tables {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.from-table,
.to-table {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.875rem;
}

.relationship-arrow {
  color: #6b7280;
}

.relationship-arrow .material-symbols-outlined {
  font-size: 16px;
}

.relationship-meta {
  display: flex;
  gap: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #6b7280;
}

.meta-item .material-symbols-outlined {
  font-size: 14px;
}

.relationship-actions {
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

.btn-icon:hover {
  background: #e5e7eb;
  color: #374151;
}

.btn-icon.danger:hover {
  background: #fef2f2;
  color: #ef4444;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  background: #f9fafb;
  border-radius: 0 0 12px 12px;
}

.btn-secondary {
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
    gap: 12px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .relationship-stats {
    width: 100%;
    justify-content: space-between;
  }

  .relationship-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .relationship-actions {
    align-self: flex-end;
  }
}
</style>