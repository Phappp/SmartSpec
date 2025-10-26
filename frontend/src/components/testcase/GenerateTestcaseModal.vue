<template>
  <div class="modal-overlay">
    <div class="modal-content large">
      <div class="modal-header">
        <h3>Generate Test Cases</h3>
        <button class="btn-close" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <!-- Generation Options -->
        <div class="generation-options">
          <div class="option-group">
            <label class="option-label">Source</label>
            <div class="option-buttons">
              <button
                class="option-button"
                :class="{ active: source === 'requirements' }"
                @click="source = 'requirements'"
              >
                <span class="material-symbols-outlined">list_alt</span>
                From Requirements
              </button>
              <button
                class="option-button"
                :class="{ active: source === 'database' }"
                @click="source = 'database'"
              >
                <span class="material-symbols-outlined">database</span>
                From Database Schema
              </button>
            </div>
          </div>

          <div class="option-group">
            <label class="option-label">Language</label>
            <select v-model="language" class="form-select">
              <option value="vi-VN">Vietnamese</option>
              <option value="en-US">English</option>
            </select>
          </div>
        </div>

        <!-- Requirements Selection -->
        <div v-if="source === 'requirements'" class="selection-section">
          <h4>Select Requirements</h4>
          <div class="selection-actions">
            <button class="btn-secondary small" @click="selectAllRequirements">Select All</button>
            <button class="btn-secondary small" @click="clearSelection">Clear All</button>
          </div>
          <div class="requirements-list">
            <div
              v-for="req in requirements"
              :key="req.id"
              class="requirement-item"
              :class="{ selected: selectedRequirements.includes(req.id) }"
              @click="toggleRequirement(req.id)"
            >
              <input
                type="checkbox"
                :checked="selectedRequirements.includes(req.id)"
                @change="toggleRequirement(req.id)"
              />
              <div class="req-info">
                <div class="req-name">{{ req.name }}</div>
                <div class="req-goal">{{ req.goal }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Database Tables Selection -->
        <div v-else class="selection-section">
          <h4>Select Database Tables</h4>
          <div class="selection-actions">
            <button class="btn-secondary small" @click="selectAllTables">Select All</button>
            <button class="btn-secondary small" @click="clearSelection">Clear All</button>
          </div>
          <div class="tables-list">
            <div
              v-for="table in databaseTables"
              :key="table.name"
              class="table-item"
              :class="{ selected: selectedTables.includes(table.name) }"
              @click="toggleTable(table.name)"
            >
              <input
                type="checkbox"
                :checked="selectedTables.includes(table.name)"
                @change="toggleTable(table.name)"
              />
              <div class="table-info">
                <div class="table-name">{{ table.name }}</div>
                <div class="table-columns">{{ table.columns?.length }} columns</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Preview -->
        <div v-if="previewTestCases.length > 0" class="preview-section">
          <h4>Preview ({{ previewTestCases.length }} test cases)</h4>
          <div class="preview-list">
            <div v-for="testcase in previewTestCases" :key="testcase.title" class="preview-item">
              <div class="preview-title">{{ testcase.title }}</div>
              <div class="preview-details">
                <span class="preview-type">{{ testcase.test_type }}</span>
                <span class="preview-priority">{{ testcase.priority }}</span>
                <span class="preview-tables" v-if="testcase.database_tables">
                  {{ testcase.database_tables.join(', ') }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="generating" class="generating-state">
          <div class="spinner"></div>
          <p>Generating test cases with AI...</p>
        </div>

        <!-- Actions -->
        <div class="modal-actions">
          <button class="btn-secondary" @click="$emit('close')">Cancel</button>
          <button
            v-if="previewTestCases.length === 0"
            class="btn-primary"
            @click="generatePreview"
            :disabled="!canGenerate || generating"
          >
            Generate Preview
          </button>
          <button v-else class="btn-primary" @click="confirmGeneration" :disabled="generating">
            {{ generating ? 'Generating...' : `Create ${previewTestCases.length} Test Cases` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { testcaseApi } from '@/api/testcase'

export default {
  name: 'GenerateTestcaseModal',
  props: {
    projectId: String,
    versionId: String,
    requirements: Array,
    databaseSchema: Object,
  },
  emits: ['close', 'generate'],
  setup(props, { emit }) {
    const toast = useToast()

    const source = ref('requirements')
    const language = ref('vi-VN')
    const selectedRequirements = ref([])
    const selectedTables = ref([])
    const previewTestCases = ref([])
    const generating = ref(false)

    const databaseTables = computed(() => {
      return props.databaseSchema?.tables || []
    })

    const canGenerate = computed(() => {
      if (source.value === 'requirements') {
        return selectedRequirements.value.length > 0
      } else {
        return selectedTables.value.length > 0
      }
    })

    const selectAllRequirements = () => {
      selectedRequirements.value = props.requirements.map((req) => req.id)
    }

    const selectAllTables = () => {
      selectedTables.value = databaseTables.value.map((table) => table.name)
    }

    const clearSelection = () => {
      selectedRequirements.value = []
      selectedTables.value = []
      previewTestCases.value = []
    }

    const toggleRequirement = (reqId) => {
      const index = selectedRequirements.value.indexOf(reqId)
      if (index > -1) {
        selectedRequirements.value.splice(index, 1)
      } else {
        selectedRequirements.value.push(reqId)
      }
    }

    const toggleTable = (tableName) => {
      const index = selectedTables.value.indexOf(tableName)
      if (index > -1) {
        selectedTables.value.splice(index, 1)
      } else {
        selectedTables.value.push(tableName)
      }
    }

    const generatePreview = async () => {
      generating.value = true
      try {
        console.log('🔍 DEBUG PROPS:', {
          projectId: props.projectId,
          versionId: props.versionId,
          requirementsCount: props.requirements?.length,
          databaseSchema: props.databaseSchema,
          selectedRequirements: selectedRequirements.value,
          selectedTables: selectedTables.value,
        })

        let response
        if (source.value === 'requirements') {
          // Sử dụng simplified API với requirement IDs
          response = await testcaseApi.generateTestCasesSimplified(
            props.projectId,
            props.versionId,
            {
              selectedRequirementIds: selectedRequirements.value,
              language: language.value,
            }
          )
        } else {
          // Sử dụng database API với selected tables
          response = await testcaseApi.generateTestCasesFromDatabase(
            props.projectId,
            props.versionId,
            {
              language: language.value,
              selectedTableNames: selectedTables.value,
            }
          )
        }

        previewTestCases.value = response.data.data || response.data
        toast.success(`Generated ${previewTestCases.value.length} test cases`)
      } catch (error) {
        console.error('❌ Error generating test cases:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        })

        const errorMessage = error.response?.data?.message || 'Unknown error'
        if (errorMessage.includes('database') || errorMessage.includes('schema')) {
          toast.error('Database schema not found. Please generate database schema first.')
        } else {
          toast.error('Failed to generate test cases: ' + errorMessage)
        }
      } finally {
        generating.value = false
      }
    }

    const confirmGeneration = () => {
      emit('generate', previewTestCases.value)
      emit('close')
    }

    return {
      source,
      language,
      selectedRequirements,
      selectedTables,
      previewTestCases,
      generating,
      databaseTables,
      canGenerate,
      selectAllRequirements,
      selectAllTables,
      clearSelection,
      toggleRequirement,
      toggleTable,
      generatePreview,
      confirmGeneration,
    }
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
}

.modal-content.large {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.btn-close {
  padding: 4px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #6b7280;
}

.btn-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 20px;
}

.generation-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.option-buttons {
  display: flex;
  gap: 8px;
}

.option-button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.option-button:hover {
  border-color: #1a365d;
}

.option-button.active {
  border-color: #1a365d;
  background: #1a365d;
  color: white;
}

.form-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
}

.selection-section {
  margin-bottom: 24px;
}

.selection-section h4 {
  margin-bottom: 12px;
  color: #374151;
  font-size: 1rem;
}

.selection-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.btn-secondary.small {
  padding: 6px 12px;
  font-size: 0.875rem;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-secondary.small:hover {
  background: #e5e7eb;
}

.requirements-list,
.tables-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.requirement-item,
.table-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  transition: background 0.3s ease;
}

.requirement-item:last-child,
.table-item:last-child {
  border-bottom: none;
}

.requirement-item:hover,
.table-item:hover {
  background: #f9fafb;
}

.requirement-item.selected,
.table-item.selected {
  background: #eff6ff;
}

.req-info .req-name {
  font-weight: 600;
  color: #1f2937;
}

.req-info .req-goal {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 2px;
}

.table-info .table-name {
  font-weight: 600;
  color: #1f2937;
}

.table-info .table-columns {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 2px;
}

.preview-section {
  margin-bottom: 24px;
}

.preview-section h4 {
  margin-bottom: 12px;
  color: #374151;
  font-size: 1rem;
}

.preview-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.preview-item {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.preview-item:last-child {
  border-bottom: none;
}

.preview-title {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.preview-details {
  display: flex;
  gap: 12px;
  font-size: 0.875rem;
  color: #6b7280;
}

.preview-type,
.preview-priority,
.preview-tables {
  padding: 2px 6px;
  background: #f3f4f6;
  border-radius: 4px;
}

.generating-state {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.generating-state .spinner {
  border: 3px solid #f3f4f6;
  border-top: 3px solid #1a365d;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #1a365d;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-primary:hover:not(:disabled) {
  background: #2d4a8a;
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-secondary:hover {
  background: #e5e7eb;
}
</style>