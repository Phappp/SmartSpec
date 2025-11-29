<template>
  <div class="field-value-renderer">
    <!-- String value -->
    <div v-if="isString" class="value-string">{{ value }}</div>

    <!-- Number value -->
    <div v-else-if="isNumber" class="value-number">{{ value }}</div>

    <!-- Boolean value -->
    <div v-else-if="isBoolean" class="value-boolean">
      <span class="boolean-badge" :class="{ true: value, false: !value }">
        {{ value ? 'Yes' : 'No' }}
      </span>
    </div>

    <!-- Array value -->
    <div v-else-if="isArray" class="value-array">
      <div v-for="(item, index) in value" :key="index" class="array-item">
        <span class="array-index">{{ index + 1 }}.</span>
        <FieldValueRenderer
          v-if="isComplexValue(item)"
          :value="item"
          :field-name="fieldName"
          :entity-type="entityType"
        />
        <span v-else class="simple-value">{{ formatSimpleValue(item) }}</span>
      </div>
      <div v-if="value.length === 0" class="empty-array">Empty</div>
    </div>

    <!-- Object value -->
    <div v-else-if="isObject" class="value-object">
      <div v-for="(val, key) in value" :key="key" class="object-item">
        <span class="object-key">{{ formatKey(key) }}:</span>
        <FieldValueRenderer
          v-if="isComplexValue(val)"
          :value="val"
          :field-name="key"
          :entity-type="entityType"
        />
        <span v-else class="simple-value">{{ formatSimpleValue(val) }}</span>
      </div>
    </div>

    <!-- Null/Undefined -->
    <div v-else class="value-null">
      <span class="null-badge">Not set</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FieldValueRenderer',
  props: {
    value: {
      required: true,
    },
    fieldName: {
      type: String,
      default: '',
    },
    entityType: {
      type: String,
      default: '',
    },
  },
  computed: {
    isString() {
      return typeof this.value === 'string'
    },
    isNumber() {
      return typeof this.value === 'number'
    },
    isBoolean() {
      return typeof this.value === 'boolean'
    },
    isArray() {
      return Array.isArray(this.value)
    },
    isObject() {
      return this.value !== null && typeof this.value === 'object' && !Array.isArray(this.value)
    },
  },
  methods: {
    formatKey(key) {
      return key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    },
    isComplexValue(val) {
      return (
        val !== null &&
        typeof val === 'object' &&
        (Array.isArray(val) || (typeof val === 'object' && Object.keys(val).length > 0))
      )
    },
    formatSimpleValue(val) {
      if (val === null || val === undefined) return 'Not set'
      if (typeof val === 'boolean') return val ? 'Yes' : 'No'
      return String(val)
    },
  },
}
</script>

<style scoped>
.field-value-renderer {
  width: 100%;
}

.value-string {
  word-wrap: break-word;
  white-space: pre-wrap;
}

.value-number {
  font-weight: 600;
  color: #1a365d;
}

.value-boolean {
  display: inline-block;
}

.boolean-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
  font-size: 0.875rem;
}

.boolean-badge.true {
  background: #d1fae5;
  color: #166534;
}

.boolean-badge.false {
  background: #fee2e2;
  color: #991b1b;
}

.value-array {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.array-item {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: #f9fafb;
  border-radius: 4px;
  border-left: 3px solid #1a365d;
}

.array-index {
  font-weight: 600;
  color: #6b7280;
  min-width: 24px;
}

.value-object {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  background: #f9fafb;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
}

.object-item {
  display: flex;
  gap: 8px;
  padding: 4px 0;
}

.object-key {
  font-weight: 600;
  color: #374151;
  min-width: 120px;
}

.value-null {
  display: inline-block;
}

.null-badge {
  padding: 4px 8px;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 4px;
  font-size: 0.875rem;
  font-style: italic;
}

.empty-array {
  color: #9ca3af;
  font-style: italic;
  padding: 8px;
  text-align: center;
}
</style>

