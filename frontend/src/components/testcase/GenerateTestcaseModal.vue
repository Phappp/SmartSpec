<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content large">
      <div class="modal-header">
        <h2>Generate Test Cases</h2>
        <button class="btn-close" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <!-- Progress Steps -->
        <div class="progress-steps">
          <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
            <div class="step-number">1</div>
            <div class="step-label">Configuration</div>
          </div>
          <div class="step-connector" :class="{ completed: currentStep > 1 }"></div>
          <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
            <div class="step-number">2</div>
            <div class="step-label">Selection</div>
          </div>
          <div class="step-connector" :class="{ completed: currentStep > 2 }"></div>
          <div class="step" :class="{ active: currentStep === 3, completed: currentStep > 3 }">
            <div class="step-number">3</div>
            <div class="step-label">Preview</div>
          </div>
        </div>

        <!-- Step 1: Configuration -->
        <div v-if="currentStep === 1" class="step-content">
          <h3 class="step-title">Generation Configuration</h3>

          <div class="configuration-options">
            <div class="option-group">
              <!-- <label class="option-label">Source Type</label> -->
              <div class="source-options">
                <div
                  v-for="source in sourceTypes"
                  :key="source.id"
                  class="source-option"
                  :class="{ selected: selectedSource === source.id }"
                  @click="selectSource(source.id)"
                >
                  <div class="source-icon">
                    <span class="material-symbols-outlined">{{ source.icon }}</span>
                  </div>
                  <div class="source-info">
                    <h4>{{ source.title }}</h4>
                    <p>{{ source.description }}</p>
                  </div>
                  <div class="source-check">
                    <span class="material-symbols-outlined" v-if="selectedSource === source.id">
                      check_circle
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="option-group">
              <label class="option-label">Generation Options</label>
              <div class="generation-options">
                <div class="form-group">
                  <label class="form-label">Language</label>
                  <select v-model="configuration.language" class="form-select">
                    <option value="vi-VN">Vietnamese</option>
                    <option value="en-US">English</option>
                  </select>
                </div>

                <!-- <div class="form-group">
                  <label class="form-label">Test Type Focus</label>
                  <select v-model="configuration.testTypeFocus" class="form-select">
                    <option value="all">All Test Types</option>
                    <option value="unit">Unit Tests Only</option>
                    <option value="integration">Integration Tests Only</option>
                    <option value="api">API Tests Only</option>
                    <option value="ui">UI Tests Only</option>
                  </select>
                </div> -->

                <!-- <div class="checkbox-group">
                  <label class="checkbox-item">
                    <input type="checkbox" v-model="configuration.includeDatabaseOperations" />
                    <span class="checkmark"></span>
                    <span class="checkbox-label">Include Database Operations</span>
                  </label>

                  <label class="checkbox-item">
                    <input type="checkbox" v-model="configuration.includeTestData" />
                    <span class="checkmark"></span>
                    <span class="checkbox-label">Generate Test Data</span>
                  </label>

                  <label class="checkbox-item">
                    <input type="checkbox" v-model="configuration.includeAutomation" />
                    <span class="checkmark"></span>
                    <span class="checkbox-label">Include Automation Scripts</span>
                  </label>
                </div> -->
              </div>
            </div>
          </div>

          <div class="step-actions">
            <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
            <button class="btn btn-primary" @click="nextStep" :disabled="!selectedSource">
              Continue to Selection
            </button>
          </div>
        </div>

        <!-- Step 2: Selection -->
        <div v-if="currentStep === 2" class="step-content">
          <h3 class="step-title">
            {{
              selectedSource === 'requirements' ? 'Select Requirements' : 'Select Database Tables'
            }}
          </h3>

          <div class="selection-container">
            <div class="selection-header">
              <div class="selection-info">
                <span class="selected-count"> {{ getSelectedCount }} selected </span>
              </div>
              <div class="selection-actions">
                <button class="btn btn-sm btn-secondary" @click="selectAll">Select All</button>
                <button class="btn btn-sm btn-secondary" @click="clearSelection">Clear All</button>
              </div>
            </div>

            <div class="selection-list">
              <!-- Requirements Selection -->
              <div v-if="selectedSource === 'requirements'" class="requirements-selection">
                <div
                  v-for="requirement in requirements"
                  :key="requirement.id"
                  class="selection-item"
                  :class="{ selected: selectedRequirements.includes(requirement.id) }"
                  @click="toggleRequirement(requirement.id)"
                >
                  <input
                    type="checkbox"
                    :checked="selectedRequirements.includes(requirement.id)"
                    @change="toggleRequirement(requirement.id)"
                  />
                  <div class="item-content">
                    <h4 class="item-title">{{ requirement.name }}</h4>
                    <p class="item-description">{{ requirement.goal }}</p>
                    <div class="item-meta">
                      <span class="meta-tag">{{ requirement.type || 'Functional' }}</span>
                      <span class="meta-tag" v-if="requirement.priority">
                        {{ requirement.priority }}
                      </span>
                    </div>
                  </div>
                </div>

                <div v-if="requirements.length === 0" class="empty-selection">
                  <span class="material-symbols-outlined">list_alt</span>
                  <p>No requirements available for this version</p>
                </div>
              </div>

              <!-- Database Tables Selection -->
              <div v-else class="tables-selection">
                <div
                  v-for="table in databaseTables"
                  :key="table.name"
                  class="selection-item"
                  :class="{ selected: selectedTables.includes(table.name) }"
                  @click="toggleTable(table.name)"
                >
                  <input
                    type="checkbox"
                    :checked="selectedTables.includes(table.name)"
                    @change="toggleTable(table.name)"
                  />
                  <div class="item-content">
                    <h4 class="item-title">{{ table.name }}</h4>
                    <p class="item-description">
                      {{ table.columns?.length || 0 }} columns
                      <span v-if="table.description">• {{ table.description }}</span>
                    </p>
                    <div class="item-meta">
                      <span
                        v-for="column in table.columns?.slice(0, 3)"
                        :key="column.name"
                        class="meta-tag column"
                      >
                        {{ column.name }}: {{ column.type }}
                      </span>
                      <span v-if="table.columns?.length > 3" class="meta-tag more">
                        +{{ table.columns.length - 3 }} more
                      </span>
                    </div>
                  </div>
                </div>

                <div v-if="databaseTables.length === 0" class="empty-selection">
                  <span class="material-symbols-outlined">database</span>
                  <p>No database schema available for this version</p>
                  <p class="empty-hint">Please generate database schema first</p>
                </div>
              </div>
            </div>
          </div>

          <div class="step-actions">
            <button class="btn btn-secondary" @click="prevStep">Back</button>
            <button
              class="btn btn-primary"
              @click="generatePreview"
              :disabled="getSelectedCount === 0 || generating"
            >
              <span v-if="generating" class="spinner"></span>
              {{ generating ? 'Generating...' : `Generate Preview (${getSelectedCount} items)` }}
            </button>
          </div>
        </div>

        <!-- Step 3: Preview -->
        <div v-if="currentStep === 3" class="step-content">
          <h3 class="step-title">Generated Test Cases Preview</h3>

          <div class="preview-container">
            <div class="preview-header">
              <div class="preview-stats">
                <span class="stat">
                  <strong>{{ previewTestCases.length }}</strong> test cases generated
                </span>
                <span class="stat">
                  <strong>{{ coverageStats.tablesCovered }}</strong> tables covered
                </span>
                <span class="stat">
                  <strong>{{ coverageStats.operationsCovered }}</strong> operations
                </span>
              </div>
              <div class="preview-actions">
                <button class="btn btn-sm btn-secondary" @click="regenerate">
                  <span class="material-symbols-outlined">refresh</span>
                  Regenerate
                </button>
              </div>
            </div>

            <div class="preview-list">
              <div v-for="(testcase, index) in previewTestCases" :key="index" class="preview-item">
                <div class="preview-main">
                  <h4 class="preview-title">{{ testcase.title }}</h4>
                  <p class="preview-description" v-if="testcase.description">
                    {{ testcase.description }}
                  </p>
                  <div class="preview-meta">
                    <span class="badge type" :class="testcase.test_type">
                      {{ testcase.test_type }}
                    </span>
                    <span class="badge priority" :class="testcase.priority">
                      {{ testcase.priority }}
                    </span>
                    <span
                      v-if="testcase.database_tables && testcase.database_tables.length > 0"
                      class="table-info"
                    >
                      <span class="material-symbols-outlined">table</span>
                      {{ testcase.database_tables.join(', ') }}
                    </span>
                  </div>
                </div>

                <div class="preview-details">
                  <div class="detail-section">
                    <strong>Steps:</strong> {{ testcase.steps?.length || 0 }}
                  </div>
                  <div class="detail-section">
                    <strong>Test Data:</strong> {{ testcase.test_data?.length || 0 }} scenarios
                  </div>
                  <div
                    v-if="testcase.database_operations && testcase.database_operations.length > 0"
                    class="detail-section"
                  >
                    <strong>Operations:</strong> {{ testcase.database_operations.join(', ') }}
                  </div>
                </div>
              </div>
            </div>

            <div v-if="previewTestCases.length === 0" class="empty-preview">
              <span class="material-symbols-outlined">auto_awesome</span>
              <h4>No Test Cases Generated</h4>
              <p>Try adjusting your selection or generation options</p>
              <button class="btn btn-secondary" @click="regenerate">Try Again</button>
            </div>
          </div>

          <div class="step-actions">
            <button class="btn btn-secondary" @click="prevStep">Back</button>
            <button
              class="btn btn-primary"
              @click="confirmGeneration"
              :disabled="previewTestCases.length === 0"
            >
              Create {{ previewTestCases.length }} Test Cases
            </button>
          </div>
        </div>

        <!-- Loading Overlay -->
        <div v-if="generating" class="loading-overlay">
          <div class="loading-content">
            <div class="spinner large"></div>
            <h3>Generating Test Cases</h3>
            <p>AI is creating comprehensive test cases based on your selection...</p>
            <!-- <div class="loading-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
              </div>
              <span class="progress-text">{{ progress }}%</span>
            </div>-->
          </div> 
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { testcaseApi } from '@/api/testcase'

export default {
  name: 'GenerateTestcaseModal',
  props: {
    projectId: String,
    versionId: String,
    requirements: {
      type: Array,
      default: () => [],
    },
    databaseSchema: {
      type: Object,
      default: null,
    },
  },
  emits: ['close', 'generate'],
  setup(props, { emit }) {
    const toast = useToast()

    const currentStep = ref(1)
    const selectedSource = ref('requirements')
    const generating = ref(false)
    const progress = ref(0)

    const selectedRequirements = ref([])
    const selectedTables = ref([])
    const previewTestCases = ref([])

    const configuration = ref({
      language: 'vi-VN',
      testTypeFocus: 'all',
      includeDatabaseOperations: true,
      includeTestData: true,
      includeAutomation: false,
    })

    const sourceTypes = [
      // {
      //   id: 'requirements',
      //   title: 'From Requirements',
      //   icon: 'list_alt',
      //   description:
      //     'Generate test cases based on selected requirements and their acceptance criteria',
      // },
      // {
      //   id: 'database',
      //   title: 'From Database Schema',
      //   icon: 'database',
      //   description: 'Generate test cases based on database tables, relationships, and operations',
      // },
    ]

    const databaseTables = computed(() => {
      return props.databaseSchema?.tables || []
    })

    const getSelectedCount = computed(() => {
      return selectedSource.value === 'requirements'
        ? selectedRequirements.value.length
        : selectedTables.value.length
    })

    const coverageStats = computed(() => {
      const tablesCovered = new Set()
      const operationsCovered = new Set()

      previewTestCases.value.forEach((tc) => {
        if (tc.database_tables) {
          tc.database_tables.forEach((table) => tablesCovered.add(table))
        }
        if (tc.database_operations) {
          tc.database_operations.forEach((op) => operationsCovered.add(op))
        }
      })

      return {
        tablesCovered: tablesCovered.size,
        operationsCovered: operationsCovered.size,
      }
    })

    const selectSource = (source) => {
      selectedSource.value = source
    }

    const nextStep = () => {
      if (currentStep.value < 3) {
        currentStep.value++
      }
    }

    const prevStep = () => {
      if (currentStep.value > 1) {
        currentStep.value--
      }
    }

    const selectAll = () => {
      if (selectedSource.value === 'requirements') {
        selectedRequirements.value = props.requirements.map((req) => req.id)
      } else {
        selectedTables.value = databaseTables.value.map((table) => table.name)
      }
    }

    const clearSelection = () => {
      if (selectedSource.value === 'requirements') {
        selectedRequirements.value = []
      } else {
        selectedTables.value = []
      }
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

    const simulateProgress = () => {
      progress.value = 0
      const interval = setInterval(() => {
        progress.value += Math.random() * 10
        if (progress.value >= 100) {
          progress.value = 100
          clearInterval(interval)
        }
      }, 200)
    }

    const generatePreview = async () => {
      if (getSelectedCount.value === 0) {
        toast.error('Please select at least one item to generate test cases')
        return
      }

      generating.value = true
      simulateProgress()

      try {
        let response

        if (selectedSource.value === 'requirements') {
          response = await testcaseApi.generateTestCasesSimplified(
            props.projectId,
            props.versionId,
            {
              selectedRequirementIds: selectedRequirements.value,
              language: configuration.value.language,
              testTypeFocus: configuration.value.testTypeFocus,
              includeDatabaseOperations: configuration.value.includeDatabaseOperations,
              includeTestData: configuration.value.includeTestData,
            }
          )
        } else {
          response = await testcaseApi.generateTestCasesFromDatabase(
            props.projectId,
            props.versionId,
            {
              selectedTableNames: selectedTables.value,
              language: configuration.value.language,
              testTypeFocus: configuration.value.testTypeFocus,
              includeDatabaseOperations: configuration.value.includeDatabaseOperations,
              includeTestData: configuration.value.includeTestData,
            }
          )
        }

        previewTestCases.value = response.data.data || response.data || []
        nextStep()
        toast.success(`Generated ${previewTestCases.value.length} test cases`)
      } catch (error) {
        console.error('Error generating test cases:', error)
        const errorMessage = error.response?.data?.message || 'Failed to generate test cases'

        if (errorMessage.includes('database') || errorMessage.includes('schema')) {
          toast.error('Database schema not found. Please generate database schema first.')
        } else if (errorMessage.includes('requirements')) {
          toast.error('No requirements found for the selected version.')
        } else {
          toast.error(errorMessage)
        }
      } finally {
        generating.value = false
        progress.value = 0
      }
    }

    const regenerate = () => {
      currentStep.value = 2
    }

    const confirmGeneration = () => {
      emit('generate', previewTestCases.value)
      emit('close')
    }

    onMounted(() => {
      // Auto-select all if few items
      if (props.requirements.length > 0 && props.requirements.length <= 10) {
        selectedRequirements.value = props.requirements.map((req) => req.id)
      }

      if (databaseTables.value.length > 0 && databaseTables.value.length <= 5) {
        selectedTables.value = databaseTables.value.map((table) => table.name)
      }
    })
    

    return {
      currentStep,
      selectedSource,
      generating,
      progress,
      selectedRequirements,
      selectedTables,
      previewTestCases,
      configuration,
      sourceTypes,
      databaseTables,
      getSelectedCount,
      coverageStats,
      selectSource,
      nextStep,
      prevStep,
      selectAll,
      clearSelection,
      toggleRequirement,
      toggleTable,
      generatePreview,
      regenerate,
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
  padding: 1rem;
}

.modal-content.large {
  background: white;
  border-radius: 12px;
  width: 100%;
  height: 90vh;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
  position: sticky;
  top: 0;
  z-index: 10;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.btn-close {
  padding: 0.5rem;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  background: #e2e8f0;
  color: #475569;
}

.modal-body {
  padding: 2rem;
}

.progress-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
  gap: 0.5rem;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  min-width: 80px;
}

.step-number {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  background: #e2e8f0;
  color: #64748b;
  transition: all 0.3s ease;
}

.step.active .step-number {
  background: #1a365d;
  color: white;
}

.step.completed .step-number {
  background: #135495;
  color: white;
}

.step-label {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
  text-align: center;
}

.step.active .step-label {
  color: #1a365d;
  font-weight: 600;
}

.step-connector {
  flex: 1;
  height: 2px;
  background: #e2e8f0;
  margin: 0 0.5rem;
  transition: background 0.3s ease;
}

.step-connector.completed {
  background: #1a365d;
}

.step-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.step-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 1.5rem;
  text-align: center;
}

.configuration-options {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.option-label {
  font-weight: 600;
  color: #374151;
  font-size: 1rem;
}

.source-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.source-option {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
  position: relative;
}

.source-option:hover {
  border-color: #cbd5e1;
  transform: translateY(-2px);
}

.source-option.selected {
  border-color: #1a365d;
  background: #eff6ff;
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1);
}

.source-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 8px;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  flex-shrink: 0;
}

.source-option.selected .source-icon {
  background: #1a365d;
  color: white;
}

.source-info {
  flex: 1;
}

.source-info h4 {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.source-info p {
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.4;
  margin: 0;
}

.source-check {
  color: #1a365d;
  flex-shrink: 0;
}

.generation-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.form-select {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  transition: all 0.2s;
}

.form-select:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  transition: all 0.2s;
}

.checkbox-item:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.checkbox-item input[type='checkbox'] {
  display: none;
}

.checkmark {
  width: 1.125rem;
  height: 1.125rem;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.checkbox-item input[type='checkbox']:checked + .checkmark {
  background: #1a365d;
  border-color: #3b82f6;
}

.checkbox-item input[type='checkbox']:checked + .checkmark::after {
  content: '✓';
  color: white;
  font-size: 0.75rem;
  font-weight: bold;
}

.checkbox-label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.selection-container {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.selected-count {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.selection-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
}

.selection-list {
  max-height: 400px;
  overflow-y: auto;
}

.selection-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.2s;
}

.selection-item:hover {
  background: #f8fafc;
}

.selection-item.selected {
  background: #eff6ff;
  border-left: 3px solid #1a365d;
}

.selection-item:last-child {
  border-bottom: none;
}

.selection-item input[type='checkbox'] {
  margin-top: 0.25rem;
  flex-shrink: 0;
}

.item-content {
  flex: 1;
}

.item-title {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.item-description {
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.4;
  margin-bottom: 0.75rem;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.meta-tag {
  padding: 0.25rem 0.5rem;
  background: #e2e8f0;
  color: #475569;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.meta-tag.column {
  background: #dbeafe;
  color: #1a365d;
}

.meta-tag.more {
  background: #f1f5f9;
  color: #64748b;
  font-style: italic;
}

.empty-selection {
  text-align: center;
  padding: 3rem 2rem;
  color: #64748b;
}

.empty-selection .material-symbols-outlined {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-hint {
  font-size: 0.875rem;
  color: #94a3b8;
  margin-top: 0.5rem;
}

.preview-container {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.preview-stats {
  display: flex;
  gap: 1.5rem;
}

.stat {
  color: #64748b;
  font-size: 0.875rem;
}

.stat strong {
  color: #374151;
  font-weight: 600;
}

.preview-list {
  max-height: 400px;
  overflow-y: auto;
}

.preview-item {
  padding: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  transition: all 0.2s;
}

.preview-item:hover {
  background: #f8fafc;
}

.preview-item:last-child {
  border-bottom: none;
}

.preview-main {
  margin-bottom: 1rem;
}

.preview-title {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.preview-description {
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.4;
  margin-bottom: 0.75rem;
}

.preview-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.table-info {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #64748b;
}

.preview-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  font-size: 0.875rem;
  color: #64748b;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.empty-preview {
  text-align: center;
  padding: 3rem 2rem;
  color: #64748b;
}

.empty-preview .material-symbols-outlined {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-preview h4 {
  color: #475569;
  margin-bottom: 0.5rem;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e2e8f0;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.btn-primary {
  background: #1a365d;
  border-color: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1f3b62;
  border-color: #2563eb;
}

.btn-primary:disabled {
  background: #9ca3af;
  border-color: #9ca3af;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  border-color: #d1d5db;
  color: #374151;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #9ca3b8;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner.large {
  width: 3rem;
  height: 3rem;
  border-width: 3px;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.loading-content {
  text-align: center;
  max-width: 400px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-content h3 {
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.loading-content p {
  color: #64748b;
  margin-bottom: 1.5rem;
}
.spinner {
  margin-bottom: 8px;
}
.loading-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #1a365d;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 600;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.badge.type.unit {
  background: #dbeafe;
  color: #203c63;
}

.badge.type.integration {
  background: #d1fae5;
  color: #059669;
}

.badge.type.api {
  background: #f3e8ff;
  color: #7c3aed;
}

.badge.type.ui {
  background: #fef3c7;
  color: #d97706;
}

.badge.priority.critical {
  background: #fee2e2;
  color: #dc2626;
}

.badge.priority.high {
  background: #fed7aa;
  color: #ea580c;
}

.badge.priority.medium {
  background: #fef3c7;
  color: #d97706;
}

.badge.priority.low {
  background: #d1fae5;
  color: #059669;
}

@media (max-width: 768px) {
  .modal-content.large {
    margin: 1rem;
    max-height: calc(100vh - 2rem);
  }

  .modal-body {
    padding: 1rem;
  }

  .source-options {
    grid-template-columns: 1fr;
  }

  .progress-steps {
    flex-wrap: wrap;
    gap: 1rem;
  }

  .step-connector {
    display: none;
  }

  .preview-stats {
    flex-direction: column;
    gap: 0.5rem;
  }

  .preview-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .step-actions {
    flex-direction: column;
    gap: 1rem;
  }

  .step-actions .btn {
    width: 100%;
    justify-content: center;
  }
}

</style>