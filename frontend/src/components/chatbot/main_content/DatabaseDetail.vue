<template>
  <div class="database-detail">
    <!-- Overview Card -->
    <div class="card overview-card">
      <div class="card-header">
        <h3 class="card-title">{{ data.name }}</h3>
        <div class="card-actions">
          <span class="table-count">
            <i class="material-symbols-outlined">table_chart</i>
            {{ data.tables.length }} tables
          </span>
        </div>
      </div>
      <p class="card-description">{{ data.description }}</p>
    </div>

    <!-- Tables -->
    <div 
      v-for="table in data.tables" 
      :key="table.name" 
      class="table-card"
      draggable="true"
      @dragstart="onTableDragStart($event, table)"
      @dragend="onTableDragEnd"
    >
      <div class="table-header">
        <h4 class="table-name">
          <i class="material-symbols-outlined drag-icon">drag_indicator</i>
          {{ table.name }}
        </h4>
        <span class="table-columns">
          <i class="material-symbols-outlined">view_column</i>
          {{ table.columns.length }} columns
        </span>
      </div>
      <p v-if="table.description" class="table-description">{{ table.description }}</p>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Column Name</th>
              <th>Type</th>
              <th>Constraints</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="column in table.columns" :key="column.name">
              <td>
                <div class="column-name-container">
                  <span class="column-name">{{ column.name }}</span>
                  <span v-if="column.isPrimaryKey" class="primary-key-icon" title="Primary Key">
                    <i class="material-symbols-outlined">vpn_key</i>
                  </span>
                  <span v-if="column.isForeignKey" class="foreign-key-icon" title="Foreign Key">
                    <i class="material-symbols-outlined">link</i>
                  </span>
                </div>
              </td>
              <td>
                <code class="column-type">{{ column.type }}</code>
                <span v-if="column.length" class="column-length">({{ column.length }})</span>
              </td>
              <td>
                <div class="constraints">
                  <span v-if="column.isPrimaryKey" class="constraint primary">PRIMARY</span>
                  <span v-if="!column.nullable" class="constraint not-null">NOT NULL</span>
                  <span v-if="column.unique" class="constraint unique">UNIQUE</span>
                  <span
                    v-if="column.references"
                    class="constraint foreign"
                    :title="column.references"
                    >FOREIGN</span
                  >
                </div>
              </td>
              <td>
                <span v-if="column.description" class="column-description">{{
                  column.description
                }}</span>
                <span v-else class="column-no-description">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Relationships -->
    <div v-if="data.relationships && data.relationships.length" class="card">
      <h4 class="card-subheader">
        <i class="material-symbols-outlined">account_tree</i>
        Database Relationships
      </h4>
      <div class="relationships-list">
        <div
          v-for="rel in data.relationships"
          :key="rel.fromTable + rel.toTable"
          class="relationship-item"
        >
          <div class="relationship-type">{{ rel.type }}</div>
          <div class="relationship-tables">
            <span class="table-from">{{ rel.fromTable }}</span>
            <i class="material-symbols-outlined relationship-arrow">arrow_forward</i>
            <span class="table-to">{{ rel.toTable }}</span>
          </div>
          <div v-if="rel.description" class="relationship-description">{{ rel.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DatabaseDetail',
  props: {
    data: {
      type: Object,
      required: true,
    },
  },
  emits: ['add-to-chat'],
  methods: {
    onTableDragStart(event, table) {
      const dragData = {
        type: 'database-table',
        id: table.name,
        name: table.name,
        data: {
          ...table,
          databaseName: this.data.name,
          databaseId: this.data.id || this.data._id,
        },
      }
      event.dataTransfer.setData('application/json', JSON.stringify(dragData))
      event.dataTransfer.effectAllowed = 'copy'
      event.currentTarget.classList.add('dragging')
    },
    onTableDragEnd(event) {
      event.currentTarget.classList.remove('dragging')
    },
  },
}
</script>

<style scoped>
.database-detail {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  background-color: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 20px;
}

.overview-card {
  background: linear-gradient(135deg, #161b22 0%, #1c2b41 100%);
  border: 1px solid #30363d;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.card-title {
  font-size: 20px;
  font-weight: 700;
  color: #d2a8ff;
  margin: 0;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.table-count {
  background-color: rgba(158, 106, 220, 0.15);
  color: #d2a8ff;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.table-count .material-symbols-outlined {
  font-size: 16px;
}

.card-description {
  color: #8b949e;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}

.table-card {
  background-color: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  overflow: hidden;
  cursor: grab;
  transition: all 0.2s;
}

.table-card:hover {
  border-color: #58a6ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(88, 166, 255, 0.2);
}

.table-card.dragging {
  opacity: 0.6;
  cursor: grabbing;
  border: 2px dashed #58a6ff;
}

.table-header {
  background-color: rgba(158, 106, 220, 0.1);
  padding: 16px 20px;
  border-bottom: 1px solid #30363d;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-name {
  font-size: 16px;
  font-weight: 600;
  color: #d2a8ff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.drag-icon {
  font-size: 18px;
  color: #8b949e;
  cursor: grab;
}

.table-card:hover .drag-icon {
  color: #58a6ff;
}

.table-columns {
  background-color: rgba(139, 148, 158, 0.15);
  color: #8b949e;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.table-columns .material-symbols-outlined {
  font-size: 16px;
}

.table-description {
  padding: 12px 20px;
  margin: 0;
  color: #8b949e;
  font-size: 14px;
  border-bottom: 1px solid #21262d;
  background-color: #0d1117;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th {
  background-color: #0d1117;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #f0f6fc;
  border-bottom: 1px solid #30363d;
  white-space: nowrap;
}

.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #21262d;
  color: #c9d1d9;
}

.data-table tr:last-child td {
  border-bottom: none;
}

.data-table tr:hover td {
  background-color: #1a212e;
}

.column-name-container {
  display: flex;
  align-items: center;
  gap: 6px;
}

.column-name {
  font-family: monospace;
  color: #f0f6fc;
  font-weight: 500;
}

.primary-key-icon,
.foreign-key-icon {
  display: flex;
  align-items: center;
}

.primary-key-icon .material-symbols-outlined {
  color: #ffa657;
  font-size: 16px;
}

.foreign-key-icon .material-symbols-outlined {
  color: #79c0ff;
  font-size: 16px;
}

.column-type {
  background-color: rgba(56, 139, 253, 0.15);
  color: #79c0ff;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

.column-length {
  color: #8b949e;
  font-size: 11px;
  margin-left: 4px;
}

.constraints {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.constraint {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.constraint.primary {
  background-color: rgba(187, 128, 9, 0.15);
  color: #ffa657;
}

.constraint.not-null {
  background-color: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
}

.constraint.unique {
  background-color: rgba(56, 139, 253, 0.15);
  color: #79c0ff;
}

.constraint.foreign {
  background-color: rgba(158, 106, 220, 0.15);
  color: #d2a8ff;
}

.column-description {
  color: #8b949e;
  font-size: 12px;
}

.column-no-description {
  color: #484f58;
  font-style: italic;
}

.card-subheader {
  font-size: 16px;
  font-weight: 600;
  color: #f0f6fc;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-subheader .material-symbols-outlined {
  font-size: 20px;
  color: #d2a8ff;
}

.relationships-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.relationship-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: #0d1117;
  border-radius: 6px;
  border: 1px solid #21262d;
}

.relationship-type {
  background-color: rgba(158, 106, 220, 0.15);
  color: #d2a8ff;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 80px;
  text-align: center;
}

.relationship-tables {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.table-from,
.table-to {
  font-family: monospace;
  color: #f0f6fc;
  font-weight: 500;
}

.relationship-arrow {
  color: #8b949e;
  font-size: 18px;
}

.relationship-description {
  color: #8b949e;
  font-size: 12px;
  text-align: right;
  flex: 1;
}
</style>