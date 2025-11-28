<template>
  <div class="database-detail">
    <!-- Overview Card -->
    <div class="card overview-card">
      <div class="card-header">
        <div class="title-wrapper">
          <h3 v-if="!isEditing" class="card-title">{{ data.name }}</h3>
          <input
            v-else
            class="input title-input"
            v-model="formData.name"
            placeholder="Tên database"
          />
          <div class="card-actions">
            <span class="table-count">
              <i class="material-symbols-outlined">table_chart</i>
              {{ tableCount }} tables
            </span>
          </div>
        </div>
        <div v-if="canEditControls" class="edit-toolbar">
          <button v-if="!isEditing" class="icon-button" @click="startEditing" title="Chỉnh sửa">
            <i class="material-symbols-outlined">edit</i>
          </button>
          <div v-else class="edit-actions">
            <button class="btn primary mini" @click="saveChanges">
              <i class="material-symbols-outlined">save</i>
              Lưu
            </button>
            <button class="btn ghost mini" @click="cancelEditing">
              <i class="material-symbols-outlined">close</i>
              Hủy
            </button>
          </div>
        </div>
      </div>
      <p v-if="!isEditing" class="card-description">{{ data.description }}</p>
      <textarea
        v-else
        class="textarea description-input"
        v-model="formData.description"
        placeholder="Mô tả database"
      ></textarea>
    </div>

    <!-- Tables -->
    <div
      v-for="(table, tableIndex) in isEditing ? formData.tables : data.tables"
      :key="isEditing ? `table-${tableIndex}` : table.name"
      class="table-card"
      :draggable="!isEditing"
      @dragstart="!isEditing && onTableDragStart($event, table)"
      @dragend="!isEditing && onTableDragEnd($event)"
    >
      <div class="table-header">
        <h4 class="table-name">
          <i class="material-symbols-outlined drag-icon">drag_indicator</i>
          <span v-if="!isEditing">{{ table.name }}</span>
          <input
            v-else
            class="input"
            v-model="formData.tables[tableIndex].name"
            placeholder="Tên bảng"
          />
        </h4>
        <span class="table-columns">
          <i class="material-symbols-outlined">view_column</i>
          {{
            (isEditing ? formData.tables[tableIndex].columns.length : table.columns.length)
          }}
          columns
        </span>
      </div>
      <p v-if="!isEditing && table.description" class="table-description">{{ table.description }}</p>
      <textarea
        v-else-if="isEditing"
        class="textarea description-input"
        v-model="formData.tables[tableIndex].description"
        placeholder="Mô tả bảng"
      ></textarea>

      <div v-if="!isEditing" class="table-container">
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
      <div v-else class="columns-editor">
        <div
          v-for="(column, columnIndex) in formData.tables[tableIndex].columns"
          :key="`column-${columnIndex}`"
          class="column-edit-card"
        >
          <div class="column-edit-grid">
            <input class="input" v-model="column.name" placeholder="Column name" />
            <input class="input" v-model="column.type" placeholder="Type" />
            <input class="input" v-model="column.length" placeholder="Length" />
          </div>
          <div class="column-flags">
            <label><input type="checkbox" v-model="column.isPrimaryKey" />Primary</label>
            <label><input type="checkbox" v-model="column.isForeignKey" />Foreign</label>
            <label><input type="checkbox" v-model="column.unique" />Unique</label>
            <label><input type="checkbox" v-model="column.nullable" />Nullable</label>
          </div>
          <input
            class="input"
            v-model="column.references"
            placeholder="References (table.column)"
          />
          <textarea
            class="textarea"
            v-model="column.description"
            placeholder="Mô tả cột"
          ></textarea>
          <div class="column-actions">
            <button class="icon-button" @click="removeColumn(tableIndex, columnIndex)" title="Xóa cột">
              <i class="material-symbols-outlined">delete</i>
            </button>
          </div>
        </div>
        <button class="btn ghost mini" @click="addColumn(tableIndex)">
          <i class="material-symbols-outlined">add</i>
          Thêm cột
        </button>
        <button class="btn ghost mini danger" @click="removeTable(tableIndex)">
          <i class="material-symbols-outlined">delete</i>
          Xóa bảng
        </button>
      </div>
    </div>

    <button v-if="isEditing" class="btn ghost mini" @click="addTable">
      <i class="material-symbols-outlined">add</i>
      Thêm bảng
    </button>

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
import { reactive, ref, watch, computed } from 'vue'

export default {
  name: 'DatabaseDetail',
  props: {
    data: {
      type: Object,
      required: true,
    },
    canEdit: {
      type: Boolean,
      default: false,
    },
    mode: {
      type: String,
      default: 'view',
    },
    isCreating: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['submit', 'cancel'],
  setup(props, { emit }) {
    const isEditing = ref(props.isCreating)
    const formData = reactive({
      name: '',
      description: '',
      tables: [],
    })

    const cloneTables = (tables = []) =>
      tables.map((table) => ({
        name: table.name || '',
        description: table.description || '',
        columns: Array.isArray(table.columns)
          ? table.columns.map((column) => ({
              name: column.name || '',
              type: column.type || '',
              length: column.length || '',
              isPrimaryKey: !!column.isPrimaryKey,
              isForeignKey: !!column.isForeignKey,
              nullable: column.nullable !== false,
              unique: !!column.unique,
              references: column.references || '',
              description: column.description || '',
            }))
          : [],
      }))

    const hydrateForm = () => {
      const source = props.data || {}
      formData.name = source.name || ''
      formData.description = source.description || ''
      formData.tables = cloneTables(source.tables || [])
    }

    watch(
      () => props.data,
      () => {
        if (!isEditing.value || props.mode !== 'create') {
          hydrateForm()
        }
      },
      { immediate: true }
    )

    watch(
      () => props.mode,
      (mode) => {
        if (mode === 'create') {
          isEditing.value = true
          hydrateForm()
        } else if (!props.canEdit) {
          isEditing.value = false
        }
      }
    )

    const canEditControls = computed(() => props.canEdit || props.mode === 'create')

    const startEditing = () => {
      if (!props.canEdit) return
      isEditing.value = true
      hydrateForm()
    }

    const cancelEditing = () => {
      if (props.mode === 'create') {
        emit('cancel')
        return
      }
      isEditing.value = false
      hydrateForm()
    }

    const saveChanges = () => {
      const payload = {
        ...props.data,
        name: formData.name,
        description: formData.description,
        tables: formData.tables.map((table) => ({
          ...table,
          columns: table.columns.map((column) => ({
            name: column.name,
            type: column.type,
            length: column.length,
            isPrimaryKey: column.isPrimaryKey,
            isForeignKey: column.isForeignKey,
            nullable: column.nullable,
            unique: column.unique,
            references: column.references,
            description: column.description,
          })),
        })),
      }
      emit('submit', payload)
      if (props.mode !== 'create') {
        isEditing.value = false
      }
    }

    const addTable = () => {
      formData.tables.push({
        name: `table_${formData.tables.length + 1}`,
        description: '',
        columns: [],
      })
    }

    const removeTable = (index) => {
      formData.tables.splice(index, 1)
    }

    const addColumn = (tableIndex) => {
      formData.tables[tableIndex].columns.push({
        name: `column_${formData.tables[tableIndex].columns.length + 1}`,
        type: 'varchar',
        length: '',
        isPrimaryKey: false,
        isForeignKey: false,
        nullable: true,
        unique: false,
        references: '',
        description: '',
      })
    }

    const removeColumn = (tableIndex, columnIndex) => {
      formData.tables[tableIndex].columns.splice(columnIndex, 1)
    }

    const onTableDragStart = (event, table) => {
      if (isEditing.value) return
      const dragData = {
        type: 'database-table',
        id: table.name,
        name: table.name,
        data: {
          ...table,
          databaseName: props.data.name,
          databaseId: props.data.id || props.data._id,
        },
      }
      event.dataTransfer.setData('application/json', JSON.stringify(dragData))
      event.dataTransfer.effectAllowed = 'copy'
      event.currentTarget.classList.add('dragging')
    }

    const onTableDragEnd = (event) => {
      event.currentTarget.classList.remove('dragging')
    }

    const tableCount = computed(() =>
      isEditing.value
        ? formData.tables.length
        : Array.isArray(props.data.tables)
        ? props.data.tables.length
        : 0
    )

    return {
      isEditing,
      formData,
      canEditControls,
      startEditing,
      cancelEditing,
      saveChanges,
      addTable,
      removeTable,
      addColumn,
      removeColumn,
      onTableDragStart,
      onTableDragEnd,
      tableCount,
    }
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

.title-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.input {
  width: 100%;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 8px 10px;
  color: #f0f6fc;
  font-size: 14px;
}

.textarea {
  width: 100%;
  min-height: 60px;
  background: #0d1117;
.pill-input {
  background: #21262d;
  border: 1px solid #30363d;
  color: #c9d1d9;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
}

  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 8px 10px;
  color: #f0f6fc;
  font-size: 14px;
  resize: vertical;
}

.title-input {
  font-size: 20px;
  font-weight: 700;
}

.edit-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-actions {
  display: flex;
  gap: 6px;
}

.btn {
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn.mini {
  padding: 4px 8px;
  font-size: 12px;
}

.btn.primary {
  background: #238636;
  border-color: #2ea043;
  color: #fff;
}

.btn.ghost {
  background: transparent;
  border-color: #30363d;
  color: #c9d1d9;
}

.btn.danger {
  border-color: #f85149;
  color: #ff7b72;
}

.icon-button {
  border: 1px solid #30363d;
  background: transparent;
  color: #8b949e;
  border-radius: 4px;
  padding: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.icon-button:hover {
  border-color: #58a6ff;
  color: #58a6ff;
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

.columns-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 0;
}

.column-edit-card {
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 12px;
  background: rgba(13, 17, 23, 0.5);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column-edit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
}

.column-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #8b949e;
}

.column-flags label {
  display: flex;
  align-items: center;
  gap: 4px;
}

.column-actions {
  display: flex;
  justify-content: flex-end;
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