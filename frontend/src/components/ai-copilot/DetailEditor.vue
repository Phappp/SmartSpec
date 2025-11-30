<template>
  <div class="detail-editor">
    <div v-if="!item" class="empty-state">
      <p>Select an item from the tree to view/edit details</p>
    </div>

    <div v-else class="editor-container">
      <!-- Editor Mode Toggle -->
      <div class="editor-mode">
        <button
          v-for="mode in editorModes"
          :key="mode"
          @click="currentMode = mode"
          :class="{ active: currentMode === mode }"
          class="mode-btn"
        >
          {{ mode }}
        </button>
      </div>

      <!-- JSON Editor -->
      <div v-if="currentMode === 'JSON'" class="json-editor">
        <textarea
          v-model="jsonContent"
          @input="handleContentChange"
          class="json-textarea"
          spellcheck="false"
        ></textarea>
      </div>

      <!-- Markdown Editor -->
      <div v-else-if="currentMode === 'Markdown'" class="markdown-editor">
        <textarea
          v-model="markdownContent"
          @input="handleContentChange"
          class="markdown-textarea"
        ></textarea>
        <div class="markdown-preview" v-html="renderedMarkdown"></div>
      </div>

      <!-- Form Editor -->
      <div v-else-if="currentMode === 'Form'" class="form-editor">
        <div v-for="field in formFields" :key="field.key" class="form-field">
          <label>{{ field.label }}</label>
          <input
            v-if="field.type === 'text'"
            v-model="formData[field.key]"
            @input="handleFormChange"
            type="text"
          />
          <textarea
            v-else-if="field.type === 'textarea'"
            v-model="formData[field.key]"
            @input="handleFormChange"
            rows="3"
          ></textarea>
          <select
            v-else-if="field.type === 'select'"
            v-model="formData[field.key]"
            @change="handleFormChange"
          >
            <option v-for="opt in field.options" :key="opt" :value="opt">
              {{ opt }}
            </option>
          </select>
        </div>
      </div>

      <!-- Item Info -->
      <div class="item-info">
        <div class="info-badge">
          <span class="info-label">Type:</span>
          <span class="info-value">{{ itemType }}</span>
        </div>
        <div class="info-badge" v-if="item._id">
          <span class="info-label">ID:</span>
          <span class="info-value">{{ item._id }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  item: {
    type: Object,
    default: null
  },
  itemType: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['content-changed'])

const editorModes = ['JSON', 'Markdown', 'Form']
const currentMode = ref('JSON')

const jsonContent = ref('')
const markdownContent = ref('')
const formData = ref({})

// Computed
const renderedMarkdown = computed(() => {
  return marked(markdownContent.value || '')
})

const formFields = computed(() => {
  if (!props.item || !props.itemType) return []
  
  const fieldsMap = {
    usecase: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'goal', label: 'Goal', type: 'textarea' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high'] }
    ],
    testcase: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'test_type', label: 'Test Type', type: 'select', options: ['integration', 'api', 'ui', 'performance', 'security'] }
    ],
    table: [
      { key: 'name', label: 'Table Name', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' }
    ]
  }
  
  return fieldsMap[props.itemType] || []
})

// Watch for item changes
watch(() => props.item, (newItem) => {
  if (newItem) {
    jsonContent.value = JSON.stringify(newItem, null, 2)
    markdownContent.value = convertToMarkdown(newItem)
    formData.value = { ...newItem }
  }
}, { immediate: true })

// Convert item to markdown
const convertToMarkdown = (item) => {
  if (!item) return ''
  
  let md = `# ${item.name || item.title || 'Item'}\n\n`
  
  if (item.description) {
    md += `${item.description}\n\n`
  }
  
  if (item.goal) {
    md += `## Goal\n${item.goal}\n\n`
  }
  
  if (item.tasks && Array.isArray(item.tasks)) {
    md += `## Tasks\n`
    item.tasks.forEach((task, i) => {
      md += `${i + 1}. ${task}\n`
    })
    md += '\n'
  }
  
  if (item.steps && Array.isArray(item.steps)) {
    md += `## Steps\n`
    item.steps.forEach((step, i) => {
      md += `${i + 1}. ${step.action || step}\n`
    })
    md += '\n'
  }
  
  return md
}

// Handle content changes
const handleContentChange = () => {
  let content = ''
  
  if (currentMode.value === 'JSON') {
    content = jsonContent.value
  } else if (currentMode.value === 'Markdown') {
    content = markdownContent.value
  } else {
    content = JSON.stringify(formData.value, null, 2)
  }
  
  emit('content-changed', content)
}

const handleFormChange = () => {
  handleContentChange()
}

// Get current content
const getCurrentContent = () => {
  if (currentMode.value === 'JSON') {
    try {
      return JSON.parse(jsonContent.value)
    } catch {
      return null
    }
  } else if (currentMode.value === 'Form') {
    return formData.value
  }
  return null
}

defineExpose({
  getCurrentContent
})
</script>

<style scoped>
.detail-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #858585;
  font-size: 14px;
}

.editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-mode {
  display: flex;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid #3e3e42;
  background: #2d2d30;
}

.mode-btn {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid #3e3e42;
  color: #cccccc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.mode-btn:hover {
  background: #3e3e42;
}

.mode-btn.active {
  background: #0e639c;
  border-color: #0e639c;
}

.json-editor,
.markdown-editor,
.form-editor {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.json-textarea,
.markdown-textarea {
  flex: 1;
  padding: 16px;
  background: #1e1e1e;
  color: #d4d4d4;
  border: none;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  outline: none;
}

.markdown-editor {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.markdown-preview {
  padding: 16px;
  background: #1e1e1e;
  color: #d4d4d4;
  overflow-y: auto;
  border-left: 1px solid #3e3e42;
}

.form-editor {
  flex-direction: column;
  padding: 16px;
  overflow-y: auto;
}

.form-field {
  margin-bottom: 16px;
}

.form-field label {
  display: block;
  margin-bottom: 6px;
  color: #cccccc;
  font-size: 13px;
  font-weight: 500;
}

.form-field input,
.form-field textarea,
.form-field select {
  width: 100%;
  padding: 8px 12px;
  background: #3c3c3c;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  color: #cccccc;
  font-size: 13px;
}

.form-field input:focus,
.form-field textarea:focus,
.form-field select:focus {
  outline: none;
  border-color: #0e639c;
}

.item-info {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid #3e3e42;
  background: #2d2d30;
}

.info-badge {
  display: flex;
  gap: 6px;
  font-size: 12px;
}

.info-label {
  color: #858585;
}

.info-value {
  color: #cccccc;
  font-family: monospace;
}
</style>
