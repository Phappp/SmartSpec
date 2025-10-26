<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Execute Test Case</h3>
        <button class="btn-close" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <div class="testcase-info">
          <h4>{{ testcase.title || 'Untitled Test Case' }}</h4>
          <div class="testcase-meta">
            <span class="type-badge" :class="testcase.test_type || 'integration'">
              {{ testcase.test_type || 'integration' }}
            </span>
            <span class="priority-badge" :class="testcase.priority || 'medium'">
              {{ testcase.priority || 'medium' }}
            </span>
          </div>
        </div>

        <form @submit.prevent="executeTestcase" class="execution-form">
          <!-- Execution Status -->
          <div class="form-section">
            <h5>Execution Result</h5>
            <div class="status-options">
              <label
                v-for="status in executionStatuses"
                :key="status.value"
                class="status-option"
                :class="{ selected: formData.status === status.value }"
              >
                <input
                  type="radio"
                  :value="status.value"
                  v-model="formData.status"
                  required
                  class="sr-only"
                />
                <span class="status-icon" :class="status.value">
                  <span class="material-symbols-outlined">{{ status.icon }}</span>
                </span>
                <span class="status-label">{{ status.label }}</span>
              </label>
            </div>
          </div>

          <!-- Actual Result -->
          <div class="form-section">
            <h5>Actual Result</h5>
            <textarea
              v-model="formData.actual_result"
              rows="4"
              placeholder="Describe the actual result observed during execution..."
              class="form-textarea"
            ></textarea>
          </div>

          <!-- Environment -->
          <div class="form-section">
            <h5>Execution Environment</h5>
            <div class="form-row">
              <div class="form-group">
                <label>Operating System</label>
                <input
                  v-model="formData.environment.os"
                  type="text"
                  placeholder="e.g., Windows 10, macOS 14"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>Browser</label>
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
                <label>Device</label>
                <input
                  v-model="formData.environment.device"
                  type="text"
                  placeholder="e.g., Desktop, Mobile, Tablet"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>URL</label>
                <input
                  v-model="formData.environment.url"
                  type="text"
                  placeholder="e.g., https://example.com"
                  class="form-input"
                />
              </div>
            </div>
          </div>

          <!-- Execution Logs -->
          <div class="form-section">
            <h5>Execution Logs</h5>
            <div class="logs-input">
              <div v-for="(log, index) in formData.execution_logs" :key="index" class="log-entry">
                <input
                  v-model="formData.execution_logs[index]"
                  type="text"
                  :placeholder="`Log entry ${index + 1}`"
                  class="form-input"
                />
                <button
                  type="button"
                  class="btn-icon danger"
                  @click="removeLog(index)"
                  :disabled="formData.execution_logs.length === 1"
                  title="Remove log entry"
                >
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
              <button type="button" class="btn-secondary small" @click="addLog">
                <span class="material-symbols-outlined">add</span>
                Add Log Entry
              </button>
            </div>
          </div>

          <!-- Exceptions -->
          <div
            class="form-section"
            v-if="formData.status === 'failed' || formData.status === 'blocked'"
          >
            <h5>Exceptions / Issues</h5>
            <div class="exceptions-input">
              <div
                v-for="(exception, index) in formData.exceptions"
                :key="index"
                class="exception-entry"
              >
                <div class="exception-header">
                  <input
                    v-model="exception.message"
                    type="text"
                    placeholder="Exception message or issue description"
                    class="form-input exception-message"
                  />
                  <select v-model="exception.type" class="form-select exception-type">
                    <option value="validation">Validation Error</option>
                    <option value="runtime">Runtime Error</option>
                    <option value="assertion">Assertion Failed</option>
                    <option value="system">System Error</option>
                    <option value="network">Network Issue</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div class="exception-details">
                  <div class="form-group compact">
                    <label>Step Number</label>
                    <input
                      v-model="exception.occurred_at_step"
                      type="number"
                      placeholder="Step"
                      min="1"
                      :max="testcase.steps ? testcase.steps.length : 10"
                      class="form-input"
                    />
                  </div>
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="exception.resolved" />
                    <span class="checkmark"></span>
                    Resolved
                  </label>
                </div>
                <button
                  type="button"
                  class="btn-icon danger"
                  @click="removeException(index)"
                  title="Remove exception"
                >
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
              <button type="button" class="btn-secondary small" @click="addException">
                <span class="material-symbols-outlined">add</span>
                Add Exception
              </button>
            </div>
          </div>

          <!-- Test Data Updates -->
          <div class="form-section" v-if="formData.test_data_updates.length > 0">
            <h5>Test Data Results</h5>
            <div class="test-data-updates">
              <div
                v-for="(data, index) in formData.test_data_updates"
                :key="index"
                class="data-update"
              >
                <h6>{{ data.name || `Test Data ${index + 1}` }}</h6>
                <textarea
                  v-model="data.actual_outputs_json"
                  rows="3"
                  placeholder='{"actual_result": "value", "status": "success"}'
                  class="form-textarea json-textarea"
                  @blur="validateDataJson(data)"
                  :class="{ error: data.json_error }"
                ></textarea>
                <div v-if="data.json_error" class="error-message">
                  <span class="material-symbols-outlined">error</span>
                  {{ data.json_error }}
                </div>
              </div>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="modal-actions">
            <button
              type="button"
              class="btn-secondary"
              @click="$emit('close')"
              :disabled="executing"
            >
              Cancel
            </button>
            <button type="submit" class="btn-primary" :disabled="executing || !formData.status">
              <span v-if="executing" class="spinner"></span>
              {{ executing ? 'Executing...' : 'Save Execution Result' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'

export default {
  name: 'TestcaseExecutionModal',
  props: {
    testcase: {
      type: Object,
      required: true,
      default: () => ({}),
    },
  },
  emits: ['close', 'execute'],
  setup(props, { emit }) {
    const toast = useToast()
    const executing = ref(false)

    const executionStatuses = ref([
      { value: 'passed', label: 'Passed', icon: 'check_circle' },
      { value: 'failed', label: 'Failed', icon: 'cancel' },
      { value: 'blocked', label: 'Blocked', icon: 'block' },
      // { value: 'in_progress', label: 'In Progress', icon: 'hourglass_empty' },
    ])

    const formData = ref({
      status: 'in_progress',
      actual_result: '',
      execution_logs: ['Test execution started'],
      environment: {
        os: '',
        browser: '',
        device: '',
        url: '',
      },
      exceptions: [],
      test_data_updates: [],
    })

    // Initialize form with testcase data
    const initializeForm = () => {
      if (props.testcase) {
        formData.value = {
          status: props.testcase.status || 'in_progress',
          actual_result: props.testcase.actual_result || '',
          execution_logs:
            props.testcase.execution_logs && props.testcase.execution_logs.length > 0
              ? [...props.testcase.execution_logs]
              : ['Test execution started'],
          environment: {
            os: props.testcase.environment?.os || '',
            browser: props.testcase.environment?.browser || '',
            device: props.testcase.environment?.device || '',
            url: props.testcase.environment?.url || '',
          },
          exceptions:
            props.testcase.exceptions && props.testcase.exceptions.length > 0
              ? props.testcase.exceptions.map((ex) => ({
                  ...ex,
                  resolved: ex.resolved || false,
                }))
              : [],
          test_data_updates:
            props.testcase.test_data && props.testcase.test_data.length > 0
              ? props.testcase.test_data.map((data, index) => ({
                  name: data.name || `Test Data ${index + 1}`,
                  actual_outputs_json: JSON.stringify(data.actual_outputs || {}, null, 2),
                  actual_outputs: data.actual_outputs || {},
                  json_error: '',
                }))
              : [],
        }
      }
    }

    const addLog = () => {
      formData.value.execution_logs.push('')
    }

    const removeLog = (index) => {
      if (formData.value.execution_logs.length > 1) {
        formData.value.execution_logs.splice(index, 1)
      }
    }

    const addException = () => {
      formData.value.exceptions.push({
        message: '',
        type: 'other',
        occurred_at_step: null,
        resolved: false,
      })
    }

    const removeException = (index) => {
      formData.value.exceptions.splice(index, 1)
    }

    const validateDataJson = (data) => {
      try {
        if (!data.actual_outputs_json || data.actual_outputs_json.trim() === '') {
          data.actual_outputs = {}
          data.json_error = ''
          return
        }

        const parsed = JSON.parse(data.actual_outputs_json)
        data.actual_outputs = parsed
        data.json_error = ''
      } catch (error) {
        data.json_error = 'Invalid JSON format: ' + error.message
      }
    }

    const executeTestcase = async () => {
      // Validate all JSON fields first
      formData.value.test_data_updates.forEach(validateDataJson)

      // Check for JSON errors
      const hasErrors = formData.value.test_data_updates.some((data) => data.json_error)
      if (hasErrors) {
        toast.error('Please fix JSON format errors in test data before saving')
        return
      }

      executing.value = true

      try {
        // Prepare execution data
        const executionData = {
          status: formData.value.status,
          actual_result: formData.value.actual_result.trim(),
          execution_logs: formData.value.execution_logs
            .filter((log) => log && log.trim().length > 0)
            .map((log) => log.trim()),
          environment: Object.fromEntries(
            Object.entries(formData.value.environment).filter(
              ([_, value]) => value && value.trim().length > 0
            )
          ),
          exceptions: formData.value.exceptions
            .filter((ex) => ex.message && ex.message.trim().length > 0)
            .map((ex) => ({
              ...ex,
              message: ex.message.trim(),
            })),
        }

        // Add test data updates if any
        if (formData.value.test_data_updates.length > 0) {
          executionData.test_data = formData.value.test_data_updates.map((data) => ({
            name: data.name,
            actual_outputs: data.actual_outputs,
          }))
        }

        emit('execute', executionData)
        toast.success('Test case execution saved successfully')
      } catch (error) {
        console.error('Error executing test case:', error)
        toast.error('Failed to save test case execution')
      } finally {
        executing.value = false
      }
    }

    onMounted(() => {
      initializeForm()
    })

    return {
      formData,
      executing,
      executionStatuses,
      addLog,
      removeLog,
      addException,
      removeException,
      validateDataJson,
      executeTestcase,
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

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 700px;
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

.testcase-info {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.testcase-info h4 {
  margin-bottom: 12px;
  color: #1f2937;
  font-weight: 600;
  line-height: 1.3;
}

.testcase-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.execution-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.form-section {
  margin-bottom: 28px;
}

.form-section h5 {
  margin-bottom: 16px;
  color: #374151;
  font-weight: 600;
  font-size: 1rem;
}

.status-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.status-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

.status-option:hover {
  border-color: #d1d5db;
  transform: translateY(-2px);
}

.status-option.selected {
  border-color: #1a365d;
  background: #eff6ff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.status-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.status-icon.passed {
  background: #d1fae5;
  color: #065f46;
}

.status-icon.failed {
  background: #fee2e2;
  color: #991b1b;
}

.status-icon.blocked {
  background: #fef3c7;
  color: #92400e;
}

.status-icon.in_progress {
  background: #dbeafe;
  color: #1e40af;
}

.status-label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
  text-align: center;
}

.status-option.selected .status-label {
  color: #1a365d;
}

.logs-input {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.log-entry {
  display: flex;
  gap: 12px;
  align-items: center;
}

.log-entry .form-input {
  flex: 1;
}

.exceptions-input {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.exception-entry {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
  position: relative;
}

.exception-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.exception-message {
  flex: 1;
}

.exception-type {
  width: 140px;
  flex-shrink: 0;
}

.exception-details {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.form-group.compact {
  margin-bottom: 0;
}

.form-group.compact label {
  font-size: 0.75rem;
  margin-bottom: 2px;
}

.form-group.compact .form-input {
  width: 80px;
}

.test-data-updates {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.data-update {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
}

.data-update h6 {
  margin-bottom: 12px;
  color: #374151;
  font-weight: 600;
  font-size: 0.875rem;
}

.json-textarea {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.4;
}

.json-textarea.error {
  border-color: #dc2626;
  background: #fef2f2;
}

.error-message {
  color: #dc2626;
  font-size: 0.75rem;
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.error-message .material-symbols-outlined {
  font-size: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .exception-header {
    flex-direction: column;
    gap: 8px;
  }

  .exception-type {
    width: 100%;
  }
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
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

.form-textarea {
  resize: vertical;
  min-height: 80px;
  line-height: 1.5;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
  user-select: none;
}

.checkbox-label input[type='checkbox'] {
  display: none;
}

.checkmark {
  width: 16px;
  height: 16px;
  border: 2px solid #d1d5db;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
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

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  font-weight: 500;
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
  padding: 6px 12px;
  font-size: 0.75rem;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
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
  margin-top: 24px;
  padding-top: 20px;
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

/* Badge styles */
.type-badge,
.priority-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.type-badge.unit {
  background: #dbeafe;
  color: #1e40af;
}
.type-badge.integration {
  background: #d1fae5;
  color: #065f46;
}
.type-badge.api {
  background: #f3e8ff;
  color: #7e22ce;
}
.type-badge.ui {
  background: #fef3c7;
  color: #92400e;
}

.priority-badge.critical {
  background: #fecaca;
  color: #991b1b;
}
.priority-badge.high {
  background: #fed7aa;
  color: #9a3412;
}
.priority-badge.medium {
  background: #fef08a;
  color: #854d0e;
}
.priority-badge.low {
  background: #dcfce7;
  color: #166534;
}
</style>