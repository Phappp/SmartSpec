<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content large">
      <div class="modal-header">
        <h3>{{ isEdit ? 'Edit Test Case' : 'Create Test Case' }}</h3>
        <button class="btn-close" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="saveTestcase" class="testcase-form">
          <!-- Basic Information -->
          <div class="form-section">
            <h4>Basic Information</h4>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Title <span class="required">*</span></label>
                <input
                  v-model="formData.title"
                  type="text"
                  required
                  placeholder="Enter test case title"
                  class="form-input"
                  :class="{ error: !formData.title }"
                />
                <div v-if="!formData.title" class="error-message">Title is required</div>
              </div>
              <div class="form-group">
                <label class="form-label">Test Type <span class="required">*</span></label>
                <select v-model="formData.test_type" required class="form-select">
                  <option value="">Select type</option>
                  <option value="unit">Unit</option>
                  <option value="integration">Integration</option>
                  <option value="api">API</option>
                  <option value="ui">UI</option>
                  <option value="performance">Performance</option>
                  <option value="security">Security</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea
                v-model="formData.description"
                rows="3"
                placeholder="Enter test case description"
                class="form-textarea"
              ></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Priority <span class="required">*</span></label>
                <select v-model="formData.priority" required class="form-select">
                  <option value="">Select priority</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Status <span class="required">*</span></label>
                <select v-model="formData.status" required class="form-select">
                  <option value="not_executed">Not Executed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Requirements Mapping -->
          <div class="form-section" v-if="requirements && requirements.length > 0">
            <h4>Requirements Mapping</h4>
            <div class="form-group">
              <label class="form-label">Related Requirements</label>
              <div class="requirements-selection">
                <div v-for="req in requirements" :key="req.id" class="requirement-checkbox">
                  <input
                    type="checkbox"
                    :value="req.id"
                    v-model="formData.source_requirement_ids"
                    :id="`req-${req.id}`"
                    class="checkbox-input"
                  />
                  <label :for="`req-${req.id}`" class="checkbox-label requirement-label">
                    <span class="req-name">{{ req.name || `Requirement ${req.id}` }}</span>
                    <span class="req-goal">{{ req.goal || 'No description' }}</span>
                  </label>
                </div>
              </div>
              <div v-if="formData.source_requirement_ids.length > 0" class="selected-count">
                {{ formData.source_requirement_ids.length }} requirement(s) selected
              </div>
            </div>
          </div>

          <!-- Database Integration -->
          <div class="form-section">
            <h4>Database Integration</h4>
            <div class="form-group">
              <label class="form-label">Database Tables</label>
              <div class="tables-input">
                <div class="selected-tables" v-if="formData.database_tables.length > 0">
                  <span v-for="table in formData.database_tables" :key="table" class="table-tag">
                    {{ table }}
                    <button
                      type="button"
                      @click="removeTable(table)"
                      class="remove-table"
                      title="Remove table"
                    >
                      <span class="material-symbols-outlined">close</span>
                    </button>
                  </span>
                </div>
                <div class="table-input-group">
                  <input
                    v-model="newTable"
                    type="text"
                    placeholder="Add database table..."
                    class="form-input table-input"
                    @keydown.enter.prevent="addTable"
                  />
                  <button
                    type="button"
                    class="btn-secondary small"
                    @click="addTable"
                    :disabled="!newTable.trim()"
                  >
                    <span class="material-symbols-outlined">add</span>
                    Add Table
                  </button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Database Operations</label>
              <div class="operations-selection">
                <label v-for="op in databaseOperations" :key="op.value" class="operation-checkbox">
                  <input
                    type="checkbox"
                    :value="op.value"
                    v-model="formData.database_operations"
                    class="checkbox-input"
                  />
                  <span class="operation-label">{{ op.label }}</span>
                </label>
              </div>
              <div v-if="formData.database_operations.length > 0" class="selected-count">
                {{ formData.database_operations.length }} operation(s) selected
              </div>
            </div>
          </div>

          <!-- Test Steps -->
          <div class="form-section">
            <h4>Test Steps</h4>
            <div class="test-steps">
              <div v-for="(step, index) in formData.steps" :key="index" class="test-step">
                <div class="step-header">
                  <span class="step-number">Step {{ index + 1 }}</span>
                  <button
                    type="button"
                    class="btn-icon danger"
                    @click="removeStep(index)"
                    :disabled="formData.steps.length === 1"
                    title="Remove step"
                  >
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
                <textarea
                  v-model="formData.steps[index]"
                  :placeholder="`Describe step ${index + 1}...`"
                  rows="2"
                  class="form-textarea step-textarea"
                ></textarea>
              </div>
              <button type="button" class="btn-secondary" @click="addStep">
                <span class="material-symbols-outlined">add</span>
                Add Step
              </button>
            </div>
          </div>

          <!-- Expected Result -->
          <div class="form-section">
            <h4>Expected Result</h4>
            <div class="form-group">
              <textarea
                v-model="formData.expected_result"
                rows="3"
                placeholder="Describe the expected result after executing all steps..."
                class="form-textarea"
              ></textarea>
            </div>
          </div>

          <!-- Test Data -->
          <div class="form-section">
            <h4>Test Data</h4>
            <div class="test-data-section">
              <div v-for="(data, index) in formData.test_data" :key="index" class="test-data-item">
                <div class="data-header">
                  <input
                    v-model="data.name"
                    type="text"
                    placeholder="Data scenario name"
                    class="form-input data-name"
                  />
                  <button
                    type="button"
                    class="btn-icon danger"
                    @click="removeTestData(index)"
                    :disabled="formData.test_data.length === 1"
                    title="Remove test data"
                  >
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>

                <div class="data-fields">
                  <div class="data-field">
                    <label class="form-label">Inputs</label>
                    <textarea
                      v-model="data.inputsJson"
                      rows="3"
                      placeholder='{"field1": "value1", "field2": "value2"}'
                      class="form-textarea json-textarea"
                      :class="{ error: data.inputsError }"
                      @blur="validateJson(data, 'inputs')"
                    ></textarea>
                    <div v-if="data.inputsError" class="error-message">
                      <span class="material-symbols-outlined">error</span>
                      {{ data.inputsError }}
                    </div>
                  </div>

                  <div class="data-field">
                    <label class="form-label">Expected Outputs</label>
                    <textarea
                      v-model="data.expectedOutputsJson"
                      rows="3"
                      placeholder='{"result": "expected_value"}'
                      class="form-textarea json-textarea"
                      :class="{ error: data.expectedOutputsError }"
                      @blur="validateJson(data, 'expectedOutputs')"
                    ></textarea>
                    <div v-if="data.expectedOutputsError" class="error-message">
                      <span class="material-symbols-outlined">error</span>
                      {{ data.expectedOutputsError }}
                    </div>
                  </div>
                </div>
              </div>

              <button type="button" class="btn-secondary" @click="addTestData">
                <span class="material-symbols-outlined">add</span>
                Add Test Data Scenario
              </button>
            </div>
          </div>

          <!-- Environment -->
          <div class="form-section">
            <h4>Test Environment</h4>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Operating System</label>
                <input
                  v-model="formData.environment.os"
                  type="text"
                  placeholder="e.g., Windows 10, Ubuntu 20.04"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Browser</label>
                <input
                  v-model="formData.environment.browser"
                  type="text"
                  placeholder="e.g., Chrome 119, Firefox 120"
                  class="form-input"
                />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Device</label>
                <input
                  v-model="formData.environment.device"
                  type="text"
                  placeholder="e.g., Desktop, Mobile, Tablet"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">URL</label>
                <input
                  v-model="formData.environment.url"
                  type="text"
                  placeholder="e.g., https://example.com"
                  class="form-input"
                />
              </div>
            </div>
          </div>

          <!-- Automation -->
          <div class="form-section">
            <h4>Automation</h4>
            <div class="form-row">
              <div class="form-group checkbox-group">
                <label class="checkbox-label automation-checkbox">
                  <input
                    type="checkbox"
                    v-model="formData.automation.is_automated"
                    class="checkbox-input"
                  />
                  <span class="checkmark"></span>
                  This test case is automated
                </label>
              </div>
            </div>

            <div v-if="formData.automation.is_automated" class="automation-details">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Script Path</label>
                  <input
                    v-model="formData.automation.script_path"
                    type="text"
                    placeholder="e.g., /tests/login/test_login.py"
                    class="form-input"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Tool</label>
                  <input
                    v-model="formData.automation.tool"
                    type="text"
                    placeholder="e.g., Selenium, Cypress, Jest"
                    class="form-input"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="$emit('close')" :disabled="saving">
              Cancel
            </button>
            <button
              type="submit"
              class="btn-primary"
              :disabled="saving || !formData.title || !formData.test_type"
            >
              <span v-if="saving" class="spinner"></span>
              {{ saving ? 'Saving...' : isEdit ? 'Update' : 'Create' }} Test Case
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { useToast } from 'vue-toastification'

export default {
  name: 'TestcaseFormModal',
  props: {
    testcase: {
      type: Object,
      default: null,
    },
    projectId: String,
    versionId: String,
    requirements: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const toast = useToast()
    const saving = ref(false)
    const newTable = ref('')

    const databaseOperations = ref([
      { value: 'select', label: 'SELECT' },
      { value: 'insert', label: 'INSERT' },
      { value: 'update', label: 'UPDATE' },
      { value: 'delete', label: 'DELETE' },
      { value: 'create', label: 'CREATE' },
      { value: 'alter', label: 'ALTER' },
    ])

    const formData = ref({
      title: '',
      description: '',
      test_type: 'integration',
      source_requirement_ids: [],
      database_tables: [],
      database_operations: ['select'],
      steps: [''],
      expected_result: '',
      priority: 'medium',
      status: 'not_executed',
      test_data: [
        {
          name: 'Default Test Data',
          inputsJson: '{}',
          expectedOutputsJson: '{}',
          inputs: {},
          expected_outputs: {},
          actual_outputs: {},
          inputsError: '',
          expectedOutputsError: '',
        },
      ],
      environment: {
        os: '',
        browser: '',
        device: '',
        url: '',
      },
      automation: {
        is_automated: false,
        script_path: '',
        tool: '',
      },
    })

    const isEdit = computed(() => !!props.testcase)

    // Initialize form with testcase data if editing
    const initializeForm = () => {
      if (props.testcase) {
        formData.value = {
          title: props.testcase.title || '',
          description: props.testcase.description || '',
          test_type: props.testcase.test_type || 'integration',
          source_requirement_ids: props.testcase.source_requirement_ids || [],
          database_tables: props.testcase.database_tables || [],
          database_operations: props.testcase.database_operations || ['select'],
          steps:
            props.testcase.steps && props.testcase.steps.length > 0
              ? [...props.testcase.steps]
              : [''],
          expected_result: props.testcase.expected_result || '',
          priority: props.testcase.priority || 'medium',
          status: props.testcase.status || 'not_executed',
          test_data:
            props.testcase.test_data && props.testcase.test_data.length > 0
              ? props.testcase.test_data.map((data, index) => ({
                  name: data.name || `Test Data ${index + 1}`,
                  inputsJson: JSON.stringify(data.inputs || {}, null, 2),
                  expectedOutputsJson: JSON.stringify(data.expected_outputs || {}, null, 2),
                  inputs: data.inputs || {},
                  expected_outputs: data.expected_outputs || {},
                  actual_outputs: data.actual_outputs || {},
                  inputsError: '',
                  expectedOutputsError: '',
                }))
              : [
                  {
                    name: 'Default Test Data',
                    inputsJson: '{}',
                    expectedOutputsJson: '{}',
                    inputs: {},
                    expected_outputs: {},
                    actual_outputs: {},
                    inputsError: '',
                    expectedOutputsError: '',
                  },
                ],
          environment: {
            os: props.testcase.environment?.os || '',
            browser: props.testcase.environment?.browser || '',
            device: props.testcase.environment?.device || '',
            url: props.testcase.environment?.url || '',
          },
          automation: {
            is_automated: props.testcase.automation?.is_automated || false,
            script_path: props.testcase.automation?.script_path || '',
            tool: props.testcase.automation?.tool || '',
          },
        }
      }
    }

    const addStep = () => {
      formData.value.steps.push('')
    }

    const removeStep = (index) => {
      if (formData.value.steps.length > 1) {
        formData.value.steps.splice(index, 1)
      }
    }

    const addTable = () => {
      const tableName = newTable.value.trim()
      if (tableName && !formData.value.database_tables.includes(tableName)) {
        formData.value.database_tables.push(tableName)
        newTable.value = ''
      }
    }

    const removeTable = (table) => {
      const index = formData.value.database_tables.indexOf(table)
      if (index > -1) {
        formData.value.database_tables.splice(index, 1)
      }
    }

    const addTestData = () => {
      formData.value.test_data.push({
        name: `Test Data ${formData.value.test_data.length + 1}`,
        inputsJson: '{}',
        expectedOutputsJson: '{}',
        inputs: {},
        expected_outputs: {},
        actual_outputs: {},
        inputsError: '',
        expectedOutputsError: '',
      })
    }

    const removeTestData = (index) => {
      if (formData.value.test_data.length > 1) {
        formData.value.test_data.splice(index, 1)
      }
    }

    const validateJson = (data, field) => {
      const jsonField = field === 'inputs' ? 'inputsJson' : 'expectedOutputsJson'
      const targetField = field === 'inputs' ? 'inputs' : 'expected_outputs'
      const errorField = field === 'inputs' ? 'inputsError' : 'expectedOutputsError'

      try {
        if (!data[jsonField] || data[jsonField].trim() === '') {
          data[targetField] = {}
          data[errorField] = ''
          return
        }

        const parsed = JSON.parse(data[jsonField])
        data[targetField] = parsed
        data[errorField] = ''
      } catch (error) {
        data[errorField] = 'Invalid JSON format: ' + error.message
      }
    }

    const saveTestcase = async () => {
      // Validate required fields
      if (!formData.value.title || !formData.value.test_type) {
        toast.error('Please fill in all required fields')
        return
      }

      // Validate all JSON fields
      formData.value.test_data.forEach((data) => {
        validateJson(data, 'inputs')
        validateJson(data, 'expectedOutputs')
      })

      // Check for JSON errors
      const hasErrors = formData.value.test_data.some(
        (data) => data.inputsError || data.expectedOutputsError
      )

      if (hasErrors) {
        toast.error('Please fix JSON format errors in test data')
        return
      }

      saving.value = true

      try {
        // Prepare final data
        const finalData = {
          ...formData.value,
          test_data: formData.value.test_data.map((data) => ({
            name: data.name,
            inputs: data.inputs,
            expected_outputs: data.expected_outputs,
            actual_outputs: data.actual_outputs || {},
          })),
        }

        emit('save', finalData)
        toast.success(`Test case ${isEdit.value ? 'updated' : 'created'} successfully`)
      } catch (error) {
        console.error('Error saving test case:', error)
        toast.error(`Failed to ${isEdit.value ? 'update' : 'create'} test case`)
      } finally {
        saving.value = false
      }
    }

    onMounted(() => {
      initializeForm()
    })

    watch(() => props.testcase, initializeForm, { immediate: true })

    return {
      formData,
      saving,
      newTable,
      databaseOperations,
      isEdit,
      addStep,
      removeStep,
      addTable,
      removeTable,
      addTestData,
      removeTestData,
      validateJson,
      saveTestcase,
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
  padding: 20px;
}

.modal-content.large {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
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
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 24px;
}

.testcase-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.form-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.form-section:last-of-type {
  border-bottom: none;
  margin-bottom: 0;
}

.form-section h4 {
  margin-bottom: 20px;
  color: #374151;
  font-weight: 600;
  font-size: 1.125rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.required {
  color: #dc2626;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  background: white;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

.form-input.error,
.form-textarea.error {
  border-color: #dc2626;
  background: #fef2f2;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
  line-height: 1.5;
}

.requirements-selection {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  background: #fafafa;
}

.requirement-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 8px;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s ease;
}

.requirement-checkbox:hover {
  background: #f8fafc;
}

.requirement-checkbox:last-child {
  border-bottom: none;
}

.checkbox-input {
  margin-top: 2px;
}

.requirement-label {
  flex: 1;
  margin: 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.req-name {
  display: block;
  font-weight: 500;
  color: #1f2937;
  font-size: 0.875rem;
}

.req-goal {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.4;
}

.selected-count {
  margin-top: 8px;
  font-size: 0.75rem;
  color: #6b7280;
  font-style: italic;
}

.tables-input {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.selected-tables {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 40px;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fafafa;
}

.table-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #e5e7eb;
  color: #374151;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
}

.remove-table {
  padding: 2px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.remove-table:hover {
  background: #d1d5db;
  color: #374151;
}

.table-input-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.table-input {
  flex: 1;
}

.operations-selection {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.operation-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

.operation-checkbox:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.operation-checkbox:has(.checkbox-input:checked) {
  border-color: #1a365d;
  background: #eff6ff;
}

.operation-label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.operation-checkbox:has(.checkbox-input:checked) .operation-label {
  color: #1a365d;
  font-weight: 600;
}

.test-steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.test-step {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #fafafa;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.step-number {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.step-textarea {
  min-height: 60px;
  background: white;
}

.test-data-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.test-data-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  background: #fafafa;
}

.data-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}

.data-name {
  flex: 1;
  margin: 0;
}

.data-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 768px) {
  .data-fields {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.data-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.json-textarea {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.4;
  min-height: 100px;
}

.error-message {
  color: #dc2626;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 4px;
}

.error-message .material-symbols-outlined {
  font-size: 16px;
}

.checkbox-group {
  margin-bottom: 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
  user-select: none;
  margin: 0;
}

.automation-checkbox {
  font-weight: 500;
}

.checkbox-input {
  display: none;
}

.checkmark {
  width: 18px;
  height: 18px;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.checkbox-label input[type='checkbox']:checked + .checkmark {
  background: #1a365d;
  border-color: #1a365d;
}

.checkbox-label input[type='checkbox']:checked + .checkmark::after {
  content: '✓';
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.automation-details {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary.small {
  padding: 8px 12px;
  font-size: 0.75rem;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #1a365d;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.btn-primary:hover:not(:disabled) {
  background: #2d4a8a;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

.btn-icon {
  padding: 6px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-icon:hover:not(:disabled) {
  background: #f3f4f6;
  color: #374151;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon.danger:hover:not(:disabled) {
  background: #fee2e2;
  color: #dc2626;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>