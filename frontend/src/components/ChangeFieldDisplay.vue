<template>
  <div class="change-field-display">
    <div
      v-for="(value, key) in filteredData"
      :key="key"
      class="field-item"
      :class="getFieldClass(key)"
    >
      <div class="field-label">
        <span class="field-name">{{ formatFieldName(key) }}</span>
        <span v-if="isImportantField(key)" class="important-badge">Important</span>
      </div>
      <div class="field-value">
        <FieldValueRenderer
          :value="value"
          :field-name="key"
          :entity-type="entityType"
        />
      </div>
    </div>
  </div>
</template>

<script>
import FieldValueRenderer from './FieldValueRenderer.vue'

export default {
  name: 'ChangeFieldDisplay',
  components: {
    FieldValueRenderer,
  },
  props: {
    data: {
      type: Object,
      required: true,
    },
    entityType: {
      type: String,
      default: '',
    },
  },
  computed: {
    filteredData() {
      // Chỉ lấy các trường cần thiết dựa trên entityType
      const importantFields = this.getImportantFields()
      const filtered = {}
      
      for (const key in this.data) {
        if (importantFields.includes(key) || this.shouldIncludeField(key)) {
          filtered[key] = this.data[key]
        }
      }
      
      return filtered
    },
  },
  methods: {
    getImportantFields() {
      const fieldMap = {
        requirement: ['name', 'goal', 'priority', 'role', 'tasks'],
        input: ['name', 'type', 'description', 'format'],
        output: ['name', 'type', 'description', 'format'],
        database: ['name', 'description'],
        table: ['name', 'description', 'columns'],
        column: ['name', 'type', 'nullable', 'is_primary_key'],
        relationship: ['from_table', 'to_table', 'type'],
        testcase: ['title', 'description', 'status', 'priority', 'test_type'],
        uml: ['name', 'description', 'type'],
        activity_diagram: ['name', 'description', 'nodes', 'edges'],
        sequence_diagram: ['name', 'description', 'lifelines', 'messages'],
        usecase_diagram: ['name', 'description', 'actors', 'usecases'],
      }
      
      return fieldMap[this.entityType] || ['name', 'description', 'id']
    },
    shouldIncludeField(key) {
      // Loại bỏ các trường không cần thiết
      const excludeFields = [
        '_id',
        '__v',
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
        'position',
        'metadata',
        'internal',
      ]
      
      return !excludeFields.includes(key) && !key.startsWith('_')
    },
    isImportantField(key) {
      return this.getImportantFields().includes(key)
    },
    getFieldClass(key) {
      return {
        'field-important': this.isImportantField(key),
        'field-secondary': !this.isImportantField(key),
      }
    },
    formatFieldName(key) {
      // Format field name để hiển thị đẹp hơn
      return key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase())
    },
    getFieldComponent(key) {
      return 'FieldValueRenderer'
    },
  },
}
</script>

<style scoped>
.change-field-display {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field-item {
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.field-item.field-important {
  border-left: 4px solid #1a365d;
  background: #f8fafc;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.field-name {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.important-badge {
  padding: 2px 6px;
  background: #1a365d;
  color: white;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
}

.field-value {
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>

