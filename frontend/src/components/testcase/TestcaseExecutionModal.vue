<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content xlarge">
      <div class="modal-header">
        <h2>Execute Test Case</h2>
        <button class="btn-close" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <!-- Test Case Info -->
        <div class="testcase-info">
          <h3>{{ testcase.title || 'Untitled Test Case' }}</h3>
          <div class="testcase-meta">
            <span class="badge type" :class="testcase.test_type">
              {{ testcase.test_type }}
            </span>
            <span class="badge priority" :class="testcase.priority">
              {{ testcase.priority }}
            </span>
            <span class="current-status"
              >Current Status: {{ formatStatus(testcase.status) || 'Not Executed' }}</span
            >
          </div>
          <p v-if="testcase.description" class="testcase-description">{{ testcase.description }}</p>
        </div>

        <form @submit.prevent="handleExecute" class="execution-form">
          <!-- Execution Status -->
          <div class="form-section">
            <h4 class="section-title">
              <span class="material-symbols-outlined">play_circle</span>
              Execution Result
            </h4>

            <div class="status-options">
              <label
                v-for="status in executionStatuses"
                :key="status.value"
                class="status-option"
                :class="{ selected: formData.status === status.value }"
              >
                <input
                  type="radio"
                  v-model="formData.status"
                  :value="status.value"
                  required
                  class="sr-only"
                />
                <div class="status-content">
                  <span class="status-icon" :class="status.value">
                    <span class="material-symbols-outlined">{{ status.icon }}</span>
                  </span>
                  <span class="status-label">{{ status.label }}</span>
                </div>
              </label>
            </div>
          </div>

          <!-- Step-by-Step Execution -->
          <div class="form-section" v-if="testcase.steps && testcase.steps.length > 0">
            <h4 class="section-title">
              <span class="material-symbols-outlined">playlist_play</span>
              Step-by-Step Execution
            </h4>

            <div class="steps-execution">
              <div
                v-for="(step, index) in testcase.steps"
                :key="step._id?.$oid || index"
                class="execution-step"
              >
                <div class="step-header">
                  <div class="step-number">Step {{ step.step_number || index + 1 }}</div>
                  <div class="step-status">
                    <select
                      v-model="getStepResult(index).status"
                      class="form-select small"
                      @change="updateStepStatus(index)"
                    >
                      <option value="not_executed">Not Executed</option>
                      <option value="passed">Passed</option>
                      <option value="failed">Failed</option>
                      <option value="skipped">Skipped</option>
                    </select>
                  </div>
                </div>

                <div class="step-content">
                  <div class="step-action">{{ step.action }}</div>

                  <div
                    v-if="step.input_data && Object.keys(step.input_data).length > 0"
                    class="step-input-data"
                  >
                    <strong>Input Data:</strong>
                    <pre class="json-data small">{{ formatJson(step.input_data) }}</pre>
                  </div>

                  <div class="step-actual-result">
                    <label class="form-label"
                      >Actual Result for Step {{ step.step_number || index + 1 }}</label
                    >
                    <textarea
                      v-model="getStepResult(index).actual_result"
                      class="form-textarea small"
                      rows="2"
                      placeholder="What actually happened in this step..."
                    ></textarea>
                  </div>

                  <div v-if="step.expected_immediate_result" class="step-expected">
                    <strong>Expected:</strong> {{ step.expected_immediate_result }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Actual Result -->
          <div class="form-section">
            <h4 class="section-title">
              <span class="material-symbols-outlined">description</span>
              Overall Actual Result
            </h4>

            <div class="form-group">
              <textarea
                v-model="formData.actual_result"
                class="form-textarea"
                rows="4"
                placeholder="Describe the overall actual result of the test execution..."
                required
              ></textarea>
            </div>
          </div>

          <!-- Execution Environment -->
          <div class="form-section">
            <h4 class="section-title">
              <span class="material-symbols-outlined">computer</span>
              Execution Environment
            </h4>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Operating System</label>
                <input
                  v-model="formData.environment.os"
                  type="text"
                  class="form-input"
                  placeholder="Windows 11, macOS Ventura, Ubuntu 22.04..."
                />
              </div>

              <div class="form-group">
                <label class="form-label">Browser</label>
                <input
                  v-model="formData.environment.browser"
                  type="text"
                  class="form-input"
                  placeholder="Chrome 119, Firefox 120, Safari 17..."
                />
              </div>

              <div class="form-group">
                <label class="form-label">Device</label>
                <input
                  v-model="formData.environment.device"
                  type="text"
                  class="form-input"
                  placeholder="Desktop, Mobile iPhone 15, Tablet iPad..."
                />
              </div>

              <div class="form-group">
                <label class="form-label">URL</label>
                <input
                  v-model="formData.environment.url"
                  type="text"
                  class="form-input"
                  placeholder="https://example.com/test-environment"
                />
              </div>
            </div>
          </div>

          <!-- Test Data Results -->
          <div v-if="hasTestData" class="form-section">
            <h4 class="section-title">
              <span class="material-symbols-outlined">data_table</span>
              Test Data Execution Results
            </h4>

            <div class="test-data-results">
              <div
                v-for="(data, index) in formData.test_data_results"
                :key="index"
                class="test-data-result"
              >
                <div class="data-header">
                  <h5>{{ data.name || `Test Data ${index + 1}` }}</h5>
                  <select v-model="data.execution_status" class="form-select small">
                    <option value="not_executed">Not Executed</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                <div class="data-content">
                  <div class="data-original">
                    <div class="data-field">
                      <label class="form-label">Input Payload</label>
                      <pre class="json-data small">{{
                        formatJson(testcase.test_data[index]?.input_payload || {})
                      }}</pre>
                    </div>
                    <div class="data-field">
                      <label class="form-label">Expected Output</label>
                      <pre class="json-data small">{{
                        formatJson(testcase.test_data[index]?.expected_output || {})
                      }}</pre>
                    </div>
                  </div>

                  <div class="data-actual">
                    <label class="form-label">Actual Outputs (JSON)</label>
                    <textarea
                      v-model="data.actual_outputs_json"
                      class="form-textarea json-textarea"
                      rows="4"
                      placeholder='{"actual_result": "value", "status": "success", "details": {}}'
                      :class="{ error: data.json_error }"
                      @blur="validateDataJson(data)"
                    ></textarea>
                    <div v-if="data.json_error" class="error-message">
                      <span class="material-symbols-outlined">error</span>
                      {{ data.json_error }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Execution Logs -->
          <div class="form-section">
            <h4 class="section-title">
              <span class="material-symbols-outlined">list</span>
              Execution Logs
            </h4>

            <div class="logs-container">
              <div v-for="(log, index) in formData.execution_logs" :key="index" class="log-item">
                <div class="log-timestamp">
                  {{ new Date().toLocaleTimeString() }}
                </div>
                <input
                  v-model="formData.execution_logs[index]"
                  type="text"
                  class="form-input"
                  :placeholder="`Log entry ${index + 1}`"
                />
                <button
                  type="button"
                  class="btn-icon danger"
                  @click="removeLog(index)"
                  :disabled="formData.execution_logs.length === 1"
                >
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>

              <button type="button" class="btn-add-log" @click="addLog">
                <span class="material-symbols-outlined">add</span>
                Add Log Entry
              </button>
            </div>
          </div>

          <!-- Exceptions & Issues -->
          <div v-if="showExceptionsSection" class="form-section">
            <h4 class="section-title">
              <span class="material-symbols-outlined">error</span>
              Exceptions & Issues
            </h4>

            <div class="exceptions-container">
              <div
                v-for="(exception, index) in formData.exceptions"
                :key="index"
                class="exception-item"
              >
                <div class="exception-header">
                  <input
                    v-model="exception.message"
                    type="text"
                    class="form-input"
                    placeholder="Exception message or issue description"
                    required
                  />
                  <select v-model="exception.type" class="form-select">
                    <option value="validation">Validation Error</option>
                    <option value="runtime">Runtime Error</option>
                    <option value="assertion">Assertion Failed</option>
                    <option value="system">System Error</option>
                    <option value="network">Network Issue</option>
                    <option value="timeout">Timeout</option>
                    <option value="data">Data Issue</option>
                    <option value="environment">Environment Issue</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div class="exception-details">
                  <div class="form-group compact">
                    <label class="form-label">Step Number</label>
                    <select v-model="exception.occurred_at_step" class="form-select">
                      <option value="">N/A</option>
                      <option
                        v-for="step in testcase.steps"
                        :key="step.step_number"
                        :value="step.step_number"
                      >
                        Step {{ step.step_number }}
                      </option>
                    </select>
                  </div>

                  <div class="form-group compact">
                    <label class="form-label">Severity</label>
                    <select v-model="exception.severity" class="form-select">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <label class="checkbox-item">
                    <input type="checkbox" v-model="exception.resolved" />
                    <span class="checkmark"></span>
                    <span class="checkbox-label">Resolved</span>
                  </label>
                </div>

                <button type="button" class="btn-icon danger" @click="removeException(index)">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>

              <button type="button" class="btn-add-exception" @click="addException">
                <span class="material-symbols-outlined">add</span>
                Add Exception
              </button>
            </div>
          </div>

          <!-- Screenshots & Attachments -->
          <div class="form-section">
            <h4 class="section-title">
              <span class="material-symbols-outlined">image</span>
              Screenshots & Attachments
            </h4>

            <div class="attachments-container">
              <div class="attachments-list">
                <div
                  v-for="(attachment, index) in formData.attachments"
                  :key="index"
                  class="attachment-item"
                >
                  <div class="attachment-preview">
                    <span class="material-symbols-outlined">description</span>
                  </div>
                  <div class="attachment-info">
                    <input
                      v-model="attachment.name"
                      type="text"
                      class="form-input"
                      placeholder="Attachment name"
                    />
                    <input
                      v-model="attachment.path"
                      type="text"
                      class="form-input"
                      placeholder="/screenshots/step1.png"
                    />
                  </div>
                  <button type="button" class="btn-icon danger" @click="removeAttachment(index)">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>

              <button type="button" class="btn-add-attachment" @click="addAttachment">
                <span class="material-symbols-outlined">add</span>
                Add Attachment
              </button>
            </div>
          </div>

          <!-- Execution Summary -->
          <div class="form-section summary-section">
            <h4 class="section-title">
              <span class="material-symbols-outlined">summarize</span>
              Execution Summary
            </h4>

            <div class="summary-grid">
              <div class="summary-item">
                <label>Total Steps:</label>
                <span>{{ testcase.steps?.length || 0 }}</span>
              </div>
              <div class="summary-item">
                <label>Passed Steps:</label>
                <span class="passed">{{ passedStepsCount }}</span>
              </div>
              <div class="summary-item">
                <label>Failed Steps:</label>
                <span class="failed">{{ failedStepsCount }}</span>
              </div>
              <div class="summary-item">
                <label>Execution Time:</label>
                <span>{{ formData.execution_duration || 0 }} seconds</span>
              </div>
              <div class="summary-item">
                <label>Test Data Executed:</label>
                <span
                  >{{ executedTestDataCount }}/{{ formData.test_data_results?.length || 0 }}</span
                >
              </div>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="$emit('close')">
              <span class="material-symbols-outlined">cancel</span>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="executing || !formData.status">
              <span v-if="executing" class="spinner"></span>
              <span class="material-symbols-outlined" v-else>save</span>
              {{ executing ? 'Saving Execution...' : 'Save Execution Result' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'

export default {
  name: 'TestcaseExecutionModal',
  props: {
    testcase: {
      type: Object,
      required: true,
    },
  },
  emits: ['close', 'execute'],
  setup(props, { emit }) {
    const toast = useToast()
    const executing = ref(false)

    const executionStatuses = [
      { value: 'passed', label: 'Passed', icon: 'check_circle' },
      { value: 'failed', label: 'Failed', icon: 'cancel' },
      { value: 'blocked', label: 'Blocked', icon: 'block' },
      { value: 'in_progress', label: 'In Progress', icon: 'hourglass_empty' },
    ]

    const formData = ref({
      status: '',
      actual_result: '',
      execution_logs: ['Test execution started at ' + new Date().toLocaleString()],
      environment: {
        os: '',
        browser: '',
        device: '',
        url: '',
      },
      exceptions: [],
      test_data_results: [],
      step_results: [],
      attachments: [],
      execution_duration: 0,
      executed_by: 'current_user',
      executed_at: new Date().toISOString(),
    })

    const showExceptionsSection = computed(() => {
      return formData.value.status === 'failed' || formData.value.status === 'blocked'
    })

    const hasTestData = computed(() => {
      return props.testcase.test_data && props.testcase.test_data.length > 0
    })

    const passedStepsCount = computed(() => {
      return formData.value.step_results.filter((step) => step && step.status === 'passed').length
    })

    const failedStepsCount = computed(() => {
      return formData.value.step_results.filter((step) => step && step.status === 'failed').length
    })

    const executedTestDataCount = computed(() => {
      return formData.value.test_data_results.filter(
        (data) => data && data.execution_status !== 'not_executed'
      ).length
    })

    // Safe accessor for step results
    const getStepResult = (index) => {
      if (!formData.value.step_results[index]) {
        formData.value.step_results[index] = {
          step_number: index + 1,
          status: 'not_executed',
          actual_result: '',
          executed_at: null,
        }
      }
      return formData.value.step_results[index]
    }

    const formatStatus = (status) => {
      const statusMap = {
        not_executed: 'Not Executed',
        in_progress: 'In Progress',
        passed: 'Passed',
        failed: 'Failed',
        blocked: 'Blocked',
      }
      return statusMap[status] || status
    }

    const formatJson = (obj) => {
      if (!obj || Object.keys(obj).length === 0) {
        return '{}'
      }
      return JSON.stringify(obj, null, 2)
    }

    const initializeForm = () => {
      if (props.testcase) {
        // Initialize step results safely
        const stepResults = []
        if (props.testcase.steps && props.testcase.steps.length > 0) {
          props.testcase.steps.forEach((step, index) => {
            stepResults[index] = {
              step_number: step.step_number || index + 1,
              status: 'not_executed',
              actual_result: '',
              executed_at: null,
            }
          })
        }

        // Initialize test data results
        const testDataResults =
          props.testcase.test_data?.map((data, index) => ({
            name: data.name || `Test Data ${index + 1}`,
            execution_status: 'not_executed',
            actual_outputs_json: JSON.stringify(data.actual_outputs || {}, null, 2),
            actual_outputs: data.actual_outputs || {},
            json_error: '',
          })) || []

        formData.value = {
          status: props.testcase.status || '',
          actual_result: props.testcase.actual_result || '',
          execution_logs: props.testcase.execution_logs?.length
            ? [...props.testcase.execution_logs]
            : ['Test execution started at ' + new Date().toLocaleString()],
          environment: {
            os: props.testcase.environment?.os || '',
            browser: props.testcase.environment?.browser || '',
            device: props.testcase.environment?.device || '',
            url: props.testcase.environment?.url || '',
          },
          exceptions: props.testcase.exceptions?.length
            ? props.testcase.exceptions.map((ex) => ({
                ...ex,
                resolved: ex.resolved || false,
                severity: ex.severity || 'medium',
              }))
            : [],
          test_data_results: testDataResults,
          step_results: stepResults,
          attachments: props.testcase.attachments || [],
          execution_duration: props.testcase.execution_duration || 0,
          executed_by: props.testcase.executed_by || 'current_user',
          executed_at: props.testcase.executed_at || new Date().toISOString(),
        }
      }
    }

    const updateStepStatus = (index) => {
      const stepResult = getStepResult(index)
      stepResult.executed_at = new Date().toISOString()

      // Auto-add log entry for step status change
      const step = props.testcase.steps[index]
      const status = stepResult.status
      const logEntry = `Step ${step.step_number} ${status}: ${step.action.substring(0, 50)}...`
      formData.value.execution_logs.push(logEntry)
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
        severity: 'medium',
        resolved: false,
      })
    }

    const removeException = (index) => {
      formData.value.exceptions.splice(index, 1)
    }

    const addAttachment = () => {
      formData.value.attachments.push({
        name: '',
        path: '',
        type: 'screenshot',
      })
    }

    const removeAttachment = (index) => {
      formData.value.attachments.splice(index, 1)
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
        data.json_error = `Invalid JSON: ${error.message}`
      }
    }

    const handleExecute = async () => {
      // Validate required fields
      if (!formData.value.status) {
        toast.error('Please select an execution status')
        return
      }

      if (!formData.value.actual_result.trim()) {
        toast.error('Please provide an overall actual result')
        return
      }

      // Validate all JSON fields
      formData.value.test_data_results.forEach(validateDataJson)

      // Check for JSON errors
      const hasErrors = formData.value.test_data_results.some((data) => data.json_error)
      if (hasErrors) {
        toast.error('Please fix JSON format errors in test data results')
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
          step_results: formData.value.step_results.filter((step) => step), // Filter out undefined
          test_data: formData.value.test_data_results.map((data) => ({
            name: data.name,
            actual_outputs: data.actual_outputs,
            execution_status: data.execution_status,
          })),
          attachments: formData.value.attachments.filter((att) => att.name && att.path),
          execution_duration: formData.value.execution_duration,
          executed_by: formData.value.executed_by,
          executed_at: new Date().toISOString(),
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
      showExceptionsSection,
      hasTestData,
      passedStepsCount,
      failedStepsCount,
      executedTestDataCount,
      getStepResult,
      formatStatus,
      formatJson,
      updateStepStatus,
      addLog,
      removeLog,
      addException,
      removeException,
      addAttachment,
      removeAttachment,
      validateDataJson,
      handleExecute,
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

.modal-content.xlarge {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 1000px;
  max-height: 95vh;
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

.testcase-info {
  margin-bottom: 2rem;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.testcase-info h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 1rem;
  line-height: 1.4;
}

.testcase-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.current-status {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.testcase-description {
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

.execution-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.form-section {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #f1f5f9;
}

.form-section:last-of-type {
  border-bottom: none;
  margin-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1.5rem;
}

.section-title .material-symbols-outlined {
  font-size: 1.25rem;
  color: #64748b;
}

.status-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

.status-option {
  cursor: pointer;
}

.status-option .sr-only {
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

.status-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  transition: all 0.3s ease;
}

.status-option:hover .status-content {
  border-color: #cbd5e1;
  transform: translateY(-2px);
}

.status-option.selected .status-content {
  border-color: #1a365d;
  background: #f0f4f8;
  box-shadow: 0 4px 6px -1px rgba(26, 54, 93, 0.1);
}

.status-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.status-icon.passed {
  background: #d1fae5;
  color: #059669;
}

.status-icon.failed {
  background: #fee2e2;
  color: #dc2626;
}

.status-icon.blocked {
  background: #fef3c7;
  color: #d97706;
}

.status-icon.in_progress {
  background: #dbeafe;
  color: #2563eb;
}

.status-label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.status-option.selected .status-label {
  color: #1a365d;
}

.steps-execution {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.execution-step {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  background: #f8fafc;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.step-number {
  font-weight: 600;
  color: #1a365d;
  font-size: 1rem;
}

.step-status .form-select.small {
  width: 140px;
  padding: 0.5rem;
  font-size: 0.75rem;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.step-action {
  color: #374151;
  line-height: 1.5;
}

.step-input-data {
  font-size: 0.875rem;
}

.step-input-data strong {
  color: #374151;
  display: block;
  margin-bottom: 0.5rem;
}

.step-actual-result {
  margin-top: 1rem;
}

.step-expected {
  padding: 0.75rem;
  background: #f0fff4;
  border: 1px solid #9ae6b4;
  border-radius: 6px;
  color: #276749;
  font-size: 0.875rem;
}

.json-data {
  background: #1f2937;
  color: #e5e7eb;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  line-height: 1.4;
}

.json-data.small {
  font-size: 0.7rem;
  padding: 0.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group.compact {
  margin-bottom: 0;
}

.form-group.compact .form-label {
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: all 0.2s;
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

.form-textarea.small {
  min-height: 60px;
}

.form-textarea.error {
  border-color: #dc2626;
  background: #fef2f2;
}

.json-textarea {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.75rem;
  line-height: 1.4;
  min-height: 100px;
}

.error-message {
  color: #dc2626;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.test-data-results {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.test-data-result {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  background: #f8fafc;
}

.data-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.data-header h5 {
  margin: 0;
  color: #374151;
  font-weight: 600;
}

.data-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.data-original {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.data-actual {
  margin-top: 1rem;
}

.logs-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.log-item {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.log-timestamp {
  font-size: 0.75rem;
  color: #64748b;
  min-width: 80px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.log-item .form-input {
  flex: 1;
  margin: 0;
}

.btn-add-log,
.btn-add-exception,
.btn-add-attachment {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: white;
  border: 2px dashed #d1d5db;
  border-radius: 6px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  justify-content: center;
}

.btn-add-log:hover,
.btn-add-exception:hover,
.btn-add-attachment:hover {
  border-color: #1a365d;
  color: #1a365d;
  background: #f0f4f8;
}

.exceptions-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.exception-item {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  position: relative;
}

.exception-header {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.exception-header .form-input {
  flex: 1;
  margin: 0;
}

.exception-header .form-select {
  width: 160px;
  flex-shrink: 0;
}

.exception-details {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.attachments-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.attachment-item {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
}

.attachment-preview {
  width: 3rem;
  height: 3rem;
  background: #f1f5f9;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

.attachment-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.summary-section {
  background: #f8fafc;
  border-radius: 8px;
  padding: 1.5rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.summary-item label {
  font-weight: 500;
  color: #64748b;
  font-size: 0.875rem;
}

.summary-item span {
  font-weight: 600;
  color: #374151;
}

.summary-item .passed {
  color: #059669;
}

.summary-item .failed {
  color: #dc2626;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-item input[type='checkbox'] {
  display: none;
}

.checkmark {
  width: 1rem;
  height: 1rem;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.checkbox-item input[type='checkbox']:checked + .checkmark {
  background: #1a365d;
  border-color: #1a365d;
}

.checkbox-item input[type='checkbox']:checked + .checkmark::after {
  content: '✓';
  color: white;
  font-size: 0.75rem;
  font-weight: bold;
}

.checkbox-label {
  font-size: 0.875rem;
  color: #374151;
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
  border-color: #1a365d;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2d3748;
  border-color: #2d3748;
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

.btn-icon {
  padding: 0.5rem;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon:hover:not(:disabled) {
  background: #f1f5f9;
  color: #475569;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon.danger:hover:not(:disabled) {
  background: #fee2e2;
  color: #dc2626;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e2e8f0;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.badge {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.badge.type.unit {
  background: #dbeafe;
  color: #1d4ed8;
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
  .modal-content.xlarge {
    margin: 1rem;
    max-height: calc(100vh - 2rem);
  }

  .modal-body {
    padding: 1rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .status-options {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }

  .step-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .exception-header {
    flex-direction: column;
    gap: 0.75rem;
  }

  .exception-header .form-select {
    width: 100%;
  }

  .data-original {
    grid-template-columns: 1fr;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
  }

  .attachment-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .attachment-info {
    width: 100%;
  }
}
</style>