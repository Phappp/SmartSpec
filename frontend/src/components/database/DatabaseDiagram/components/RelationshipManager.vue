<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Manage Relationships</h3>
        <button class="btn-icon" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <!-- Add New Relationship Form -->
        <div class="relationship-form">
          <h4>{{ editingRelationship ? 'Edit Relationship' : 'Add New Relationship' }}</h4>

          <div class="form-row">
            <div class="form-group">
              <label>From Table</label>
              <select
                :value="newRelationship.from_table"
                @change="$emit('update-from-table', $event.target.value)"
              >
                <option value="">Select Table</option>
                <option v-for="table in localTables" :key="table.name" :value="table.name">
                  {{ table.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>From Column</label>
              <select
                :value="newRelationship.from_column"
                @change="$emit('update-from-column', $event.target.value)"
                :disabled="!newRelationship.from_table"
              >
                <option value="">Select Column</option>
                <option v-for="column in fromTableColumns" :key="column.name" :value="column.name">
                  {{ column.name }} ({{ column.type }})
                </option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>To Table</label>
              <select
                :value="newRelationship.to_table"
                @change="$emit('update-to-table', $event.target.value)"
              >
                <option value="">Select Table</option>
                <option v-for="table in localTables" :key="table.name" :value="table.name">
                  {{ table.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>To Column</label>
              <select
                :value="newRelationship.to_column"
                @change="$emit('update-to-column', $event.target.value)"
                :disabled="!newRelationship.to_table"
              >
                <option value="">Select Column</option>
                <option v-for="column in toTableColumns" :key="column.name" :value="column.name">
                  {{ column.name }} ({{ column.type }})
                </option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Relationship Type</label>
              <select
                :value="newRelationship.type"
                @change="$emit('update-type', $event.target.value)"
              >
                <option value="one-to-one">One to One</option>
                <option value="one-to-many">One to Many</option>
                <option value="many-to-one">Many to One</option>
                <option value="many-to-many">Many to Many</option>
              </select>
            </div>

            <div class="form-group">
              <label>Display Layer</label>
              <select
                :value="newRelationship.layer"
                @change="$emit('update-layer', $event.target.value)"
              >
                <option value="over">On Top of Tables</option>
                <option value="under">Under Tables</option>
              </select>
            </div>
          </div>

          <div class="form-actions">
            <button
              class="btn btn-secondary"
              @click="$emit('cancel-edit')"
              v-if="editingRelationship"
            >
              Cancel
            </button>
            <button class="btn btn-primary" @click="$emit('save')" :disabled="!isRelationshipValid">
              {{ editingRelationship ? 'Update' : 'Add' }} Relationship
            </button>
          </div>
        </div>

        <!-- Existing Relationships List -->
        <div class="relationships-list">
          <h4>Existing Relationships</h4>
          <div v-if="manualRelationships.length === 0" class="empty-state">
            No manual relationships defined
          </div>
          <div v-else class="relationship-items">
            <div
              v-for="relationship in manualRelationships"
              :key="relationship._id || `${relationship.from_table}-${relationship.from_column}`"
              class="relationship-item"
              :class="{ selected: isRelationshipSelected(relationship) }"
            >
              <div class="relationship-info">
                <div class="relationship-type-badge" :class="relationship.type">
                  {{ formatRelationshipType(relationship.type) }}
                </div>
                <div class="relationship-details">
                  <strong>{{ relationship.from_table }}</strong
                  >.{{ relationship.from_column }}
                  <span class="relationship-arrow">→</span>
                  <strong>{{ relationship.to_table }}</strong
                  >.{{ relationship.to_column }}
                </div>
                <div class="relationship-layer">
                  {{ relationship.layer === 'over' ? 'On Top' : 'Under' }}
                </div>
              </div>
              <div class="relationship-actions">
                <button class="btn-icon" @click="$emit('edit', relationship)" title="Edit">
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <button
                  class="btn-icon danger"
                  @click="$emit('delete', relationship)"
                  title="Delete"
                >
                  <span class="material-symbols-outlined">delete</span>
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
  name: 'RelationshipManager',
  props: {
    editingRelationship: Object,
    newRelationship: Object,
    localTables: Array,
    fromTableColumns: Array,
    toTableColumns: Array,
    manualRelationships: Array,
    isRelationshipValid: Boolean,
    selectedRelationship: Object,
  },
  emits: [
    'close',
    'update-from-table',
    'update-from-column',
    'update-to-table',
    'update-to-column',
    'update-type',
    'update-layer',
    'save',
    'cancel-edit',
    'edit',
    'delete',
  ],
  methods: {
    formatRelationshipType(type) {
      const typeMap = {
        'one-to-one': '1:1',
        'one-to-many': '1:N',
        'many-to-one': 'N:1',
        'many-to-many': 'N:N',
      }
      return typeMap[type] || type
    },
    isRelationshipSelected(relationship) {
      return this.selectedRelationship === relationship
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
  z-index: 2000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.modal-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 600;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

/* Relationship Form */
.relationship-form {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
}

.relationship-form h4 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-group select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  transition: border-color 0.2s ease;
}

.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
}

/* Relationships List */
.relationships-list h4 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
  font-style: italic;
}

.relationship-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.relationship-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.relationship-item:hover {
  border-color: #d1d5db;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.relationship-item.selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.relationship-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.relationship-type-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  min-width: 32px;
  text-align: center;
}

.relationship-details {
  flex: 1;
  font-size: 14px;
  color: #374151;
}

.relationship-arrow {
  margin: 0 8px;
  color: #9ca3af;
}

.relationship-layer {
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
}

.relationship-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.relationship-item:hover .relationship-actions {
  opacity: 1;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: #3b82f6;
  color: white;
}

.btn-icon.danger:hover {
  background: #ef4444;
  color: white;
}

.relationship-type-badge.one-to-one {
  background: #06eea5;
}

.relationship-type-badge.one-to-many {
  background: #d6ff07;
}

.relationship-type-badge.many-to-one {
  background: #02eaff;
}

.relationship-type-badge.many-to-many {
  background: #d97706;
}

/* Responsive Design */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .modal-content {
    width: 95%;
    margin: 20px;
  }
}
</style>