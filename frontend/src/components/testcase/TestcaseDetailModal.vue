<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content xlarge">
      <div class="modal-header">
        <h2>Test Case Details</h2>
        <div class="header-actions">
          <button class="btn btn-primary" @click="executeTestcase">
            <span class="material-symbols-outlined">play_arrow</span>
            Execute
          </button>
          <button class="btn btn-secondary" @click="editTestcase">
            <span class="material-symbols-outlined">edit</span>
            Edit
          </button>
          <button class="btn-close" @click="$emit('close')">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <div class="modal-body">
        <!-- Header Section -->
        <div class="detail-header">
          <div class="title-section">
            <h1>{{ testcase.title || 'Untitled Test Case' }}</h1>
            <div class="meta-tags">
              <span class="badge type" :class="testcase.test_type">
                {{ testcase.test_type }}
              </span>
              <span class="badge priority" :class="testcase.priority">
                {{ testcase.priority }}
              </span>
              <span class="badge status" :class="testcase.status">
                {{ testcase.status }}
              </span>
            </div>
          </div>

          <div class="description-section" v-if="testcase.description">
            <p>{{ testcase.description }}</p>
          </div>

          <!-- Preconditions & Postconditions -->
          <div class="condition-sections" v-if="hasConditions">
            <div
              class="condition-section"
              v-if="testcase.preconditions && testcase.preconditions.length > 0"
            >
              <h4>Preconditions</h4>
              <ul class="condition-list">
                <li v-for="(condition, index) in testcase.preconditions" :key="index">
                  {{ condition }}
                </li>
              </ul>
            </div>

            <div
              class="condition-section"
              v-if="testcase.postconditions && testcase.postconditions.length > 0"
            >
              <h4>Postconditions</h4>
              <ul class="condition-list">
                <li v-for="(condition, index) in testcase.postconditions" :key="index">
                  {{ condition }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="detail-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab-btn"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <span class="material-symbols-outlined">{{ tab.icon }}</span>
            {{ tab.label }}
          </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <!-- Test Steps Tab -->
          <div v-if="activeTab === 'steps'" class="tab-panel">
            <div class="panel-section">
              <h3 class="panel-title">Test Steps</h3>
              <div class="steps-list">
                <div
                  v-for="(step, index) in formattedSteps"
                  :key="step._id?.$oid || index"
                  class="step-item"
                >
                  <div class="step-number">{{ step.step_number || index + 1 }}</div>
                  <div class="step-content">
                    <div class="step-main">
                      <div class="step-action">{{ step.action }}</div>

                      <!-- Input Data Section -->
                      <div
                        v-if="step.input_data && Object.keys(step.input_data).length > 0"
                        class="step-data-section"
                      >
                        <h5 class="data-title">Input Data:</h5>
                        <div class="data-content">
                          <div v-for="(value, key) in step.input_data" :key="key" class="data-item">
                            <span class="data-key">{{ formatKey(key) }}:</span>
                            <span class="data-value">{{
                              typeof value === 'object' ? formatJson(value) : value
                            }}</span>
                          </div>
                        </div>
                      </div>

                      <!-- Expected Immediate Result -->
                      <div v-if="step.expected_immediate_result" class="step-result-section">
                        <h5 class="result-title">Expected Immediate Result:</h5>
                        <p class="result-text">{{ step.expected_immediate_result }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="!formattedSteps || formattedSteps.length === 0" class="empty-state">
                  <span class="material-symbols-outlined">list_alt</span>
                  <p>No test steps defined</p>
                </div>
              </div>
            </div>

            <div class="panel-section">
              <h3 class="panel-title">Expected Results</h3>
              <div class="expected-results-container">
                <!-- UI Level Results -->
                <div
                  v-if="
                    testcase.expected_results?.ui_level &&
                    testcase.expected_results.ui_level.length > 0
                  "
                  class="result-level"
                >
                  <h4 class="result-level-title">
                    <span class="material-symbols-outlined">desktop_windows</span>
                    UI Level
                  </h4>
                  <ul class="result-list">
                    <li v-for="(result, index) in testcase.expected_results.ui_level" :key="index">
                      {{ result }}
                    </li>
                  </ul>
                </div>

                <!-- API Level Results -->
                <div v-if="testcase.expected_results?.api_level" class="result-level">
                  <h4 class="result-level-title">
                    <span class="material-symbols-outlined">api</span>
                    API Level
                  </h4>
                  <div class="api-results">
                    <div class="api-item" v-if="testcase.expected_results.api_level.status_code">
                      <strong>Status Code:</strong>
                      {{ testcase.expected_results.api_level.status_code }}
                    </div>
                    <div
                      class="api-item"
                      v-if="testcase.expected_results.api_level.response_schema"
                    >
                      <strong>Response Schema:</strong>
                      <pre class="json-data small">{{
                        formatJson(testcase.expected_results.api_level.response_schema)
                      }}</pre>
                    </div>
                  </div>
                </div>

                <!-- Database Level Results -->
                <div
                  v-if="
                    testcase.expected_results?.database_level &&
                    testcase.expected_results.database_level.length > 0
                  "
                  class="result-level"
                >
                  <h4 class="result-level-title">
                    <span class="material-symbols-outlined">storage</span>
                    Database Level
                  </h4>
                  <ul class="result-list">
                    <li
                      v-for="(result, index) in testcase.expected_results.database_level"
                      :key="index"
                    >
                      {{ result }}
                    </li>
                  </ul>
                </div>

                <!-- Business Level Results -->
                <div v-if="testcase.expected_results?.business_level" class="result-level">
                  <h4 class="result-level-title">
                    <span class="material-symbols-outlined">business_center</span>
                    Business Level
                  </h4>
                  <p class="business-result">{{ testcase.expected_results.business_level }}</p>
                </div>

                <div v-if="!testcase.expected_results" class="empty-state">
                  <span class="material-symbols-outlined">check_circle</span>
                  <p>No expected results defined</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Test Data Tab -->
          <div v-if="activeTab === 'data'" class="tab-panel">
            <div class="test-data-grid">
              <div
                v-for="(data, index) in testcase.test_data"
                :key="data._id?.$oid || index"
                class="data-scenario"
              >
                <h4 class="scenario-title">{{ data.name || `Test Data ${index + 1}` }}</h4>

                <div class="data-columns">
                  <div class="data-column">
                    <h5>Input Payload</h5>
                    <pre class="json-data small">{{ formatJson(data.input_payload) }}</pre>
                  </div>

                  <div class="data-column">
                    <h5>Expected Output</h5>
                    <pre class="json-data small">{{ formatJson(data.expected_output) }}</pre>
                  </div>

                  <div
                    class="data-column"
                    v-if="data.validation_rules && data.validation_rules.length > 0"
                  >
                    <h5>Validation Rules</h5>
                    <ul class="validation-rules">
                      <li v-for="(rule, ruleIndex) in data.validation_rules" :key="ruleIndex">
                        {{ rule }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div
                v-if="!testcase.test_data || testcase.test_data.length === 0"
                class="empty-state"
              >
                <span class="material-symbols-outlined">data_table</span>
                <p>No test data defined</p>
              </div>
            </div>
          </div>

          <!-- Database Tab -->
          <div v-if="activeTab === 'database'" class="tab-panel">
            <div class="database-info">
              <div class="info-grid">
                <div class="info-item">
                  <h4>Database Tables</h4>
                  <div class="tables-list">
                    <span v-for="table in testcase.database_tables" :key="table" class="table-tag">
                      {{ table }}
                    </span>
                    <div
                      v-if="!testcase.database_tables || testcase.database_tables.length === 0"
                      class="empty-state"
                    >
                      <span class="material-symbols-outlined">table</span>
                      <p>No database tables specified</p>
                    </div>
                  </div>
                </div>

                <div class="info-item">
                  <h4>Database Operations</h4>
                  <div class="operations-list">
                    <span
                      v-for="op in testcase.database_operations"
                      :key="op"
                      class="operation-tag"
                    >
                      {{ op.toUpperCase() }}
                    </span>
                    <div
                      v-if="
                        !testcase.database_operations || testcase.database_operations.length === 0
                      "
                      class="empty-state"
                    >
                      <span class="material-symbols-outlined">settings</span>
                      <p>No database operations specified</p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-if="testcase.source_requirement_ids && testcase.source_requirement_ids.length > 0"
                class="requirements-section"
              >
                <h4>Related Requirements</h4>
                <div class="requirements-list">
                  <div
                    v-for="reqId in testcase.source_requirement_ids"
                    :key="reqId"
                    class="requirement-item"
                  >
                    <span class="req-id">#{{ reqId }}</span>
                    <span class="req-name">{{ getRequirementName(reqId) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Execution History Tab -->
          <div v-if="activeTab === 'execution'" class="tab-panel">
            <div class="execution-history">
              <!-- Current Execution -->
              <div v-if="testcase.executed_at" class="execution-current">
                <h3>Last Execution</h3>
                <div class="execution-details">
                  <div class="execution-meta">
                    <div class="meta-item">
                      <strong>Date:</strong> {{ formatDate(testcase.executed_at) }}
                    </div>
                    <div class="meta-item" v-if="testcase.executed_by">
                      <strong>Executed By:</strong> {{ getExecutedByName(testcase.executed_by) }}
                    </div>
                    <div class="meta-item">
                      <strong>Duration:</strong>
                      {{
                        testcase.automation?.last_run_duration
                          ? `${testcase.automation.last_run_duration}s`
                          : 'N/A'
                      }}
                    </div>
                  </div>

                  <div v-if="testcase.actual_result" class="execution-result">
                    <h4>Actual Result</h4>
                    <p>{{ testcase.actual_result }}</p>
                  </div>

                  <div
                    v-if="testcase.execution_logs && testcase.execution_logs.length > 0"
                    class="execution-logs"
                  >
                    <h4>Execution Logs</h4>
                    <div class="logs-list">
                      <div
                        v-for="(log, index) in testcase.execution_logs"
                        :key="index"
                        class="log-entry"
                      >
                        {{ log }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Exceptions -->
              <div
                v-if="testcase.exceptions && testcase.exceptions.length > 0"
                class="exceptions-section"
              >
                <h3>Exceptions & Issues</h3>
                <div class="exceptions-list">
                  <div
                    v-for="(exception, index) in testcase.exceptions"
                    :key="index"
                    class="exception-item"
                  >
                    <div class="exception-header">
                      <span class="exception-type">{{ exception.type || 'unknown' }}</span>
                      <span class="exception-status" :class="{ resolved: exception.resolved }">
                        {{ exception.resolved ? 'Resolved' : 'Pending' }}
                      </span>
                    </div>
                    <div class="exception-message">
                      {{ exception.message || 'No message provided' }}
                    </div>
                    <div v-if="exception.occurred_at_step" class="exception-meta">
                      Occurred at step: {{ exception.occurred_at_step }}
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="!testcase.executed_at" class="empty-state large">
                <span class="material-symbols-outlined">play_arrow</span>
                <h4>No Execution History</h4>
                <p>This test case has not been executed yet.</p>
                <button class="btn btn-primary" @click="executeTestcase">Execute Test Case</button>
              </div>
            </div>
          </div>

          <!-- Environment & Automation Tab -->
          <div v-if="activeTab === 'environment'" class="tab-panel">
            <div class="environment-automation">
              <div class="info-grid">
                <!-- Automation Information -->
                <div class="info-section">
                  <h3>Automation Details</h3>
                  <div class="info-list">
                    <div class="info-item">
                      <label>Automation Status:</label>
                      <span
                        :class="
                          testcase.automation?.is_automated ? 'status-automated' : 'status-manual'
                        "
                      >
                        {{ testcase.automation?.is_automated ? 'Automated' : 'Manual' }}
                      </span>
                    </div>
                    <div class="info-item" v-if="testcase.automation?.script_path">
                      <label>Script Path:</label>
                      <span>{{ testcase.automation.script_path }}</span>
                    </div>
                    <div class="info-item" v-if="testcase.automation?.test_command">
                      <label>Test Command:</label>
                      <code class="command-text">{{ testcase.automation.test_command }}</code>
                    </div>
                    <div
                      class="info-item"
                      v-if="testcase.automation?.tags && testcase.automation.tags.length > 0"
                    >
                      <label>Tags:</label>
                      <div class="tags-list">
                        <span v-for="tag in testcase.automation.tags" :key="tag" class="tag">
                          {{ tag }}
                        </span>
                      </div>
                    </div>
                    <div
                      v-if="!testcase.automation || !testcase.automation.is_automated"
                      class="empty-state"
                    >
                      <span class="material-symbols-outlined">smart_toy</span>
                      <p>This test case is not automated</p>
                    </div>
                  </div>
                </div>

                <!-- Execution Logs Format -->
                <div class="info-section" v-if="testcase.execution_logs_format">
                  <h3>Execution Logs Format</h3>
                  <div class="info-list">
                    <div class="info-item" v-if="testcase.execution_logs_format.timestamp">
                      <label>Timestamp Format:</label>
                      <span>{{ testcase.execution_logs_format.timestamp }}</span>
                    </div>
                    <div class="info-item" v-if="testcase.execution_logs_format.screenshot_path">
                      <label>Screenshot Path:</label>
                      <span>{{ testcase.execution_logs_format.screenshot_path }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Additional Metadata -->
              <div class="metadata-section">
                <h3>Additional Information</h3>
                <div class="metadata-grid">
                  <div class="metadata-item">
                    <label>Created At:</label>
                    <span>{{ formatDate(testcase.createdAt) || 'Unknown' }}</span>
                  </div>
                  <div class="metadata-item">
                    <label>Last Updated:</label>
                    <span>{{ formatDate(testcase.updatedAt) || 'Unknown' }}</span>
                  </div>
                  <div class="metadata-item" v-if="testcase.created_by">
                    <label>Created By:</label>
                    <span>{{ formatUserId(testcase.created_by.email) }}</span>
                  </div>
                  <!-- <div class="metadata-item" v-if="testcase.project_id">
                    <label>Project ID:</label>
                    <span>{{ formatObjectId(testcase.project_id) }}</span>
                  </div> -->
                  <!-- <div class="metadata-item" v-if="testcase.version_id">
                    <label>Version ID:</label>
                    <span>{{ formatObjectId(testcase.version_id) }}</span>
                  </div> -->
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'

export default {
  name: 'TestcaseDetailModal',
  props: {
    testcase: {
      type: Object,
      required: true,
    },
  },
  emits: ['close', 'execute', 'edit'],
  setup(props, { emit }) {
    const activeTab = ref('steps')

    const tabs = [
      { id: 'steps', label: 'Test Steps', icon: 'list' },
      { id: 'data', label: 'Test Data', icon: 'data_table' },
      { id: 'database', label: 'Database', icon: 'database' },
      { id: 'execution', label: 'Execution', icon: 'history' },
      { id: 'environment', label: 'Environment', icon: 'settings' },
    ]

    const hasConditions = computed(() => {
      return (
        (props.testcase.preconditions && props.testcase.preconditions.length > 0) ||
        (props.testcase.postconditions && props.testcase.postconditions.length > 0)
      )
    })

    const formattedSteps = computed(() => {
      if (!props.testcase.steps) return []

      // Nếu steps là array của strings đơn giản
      if (typeof props.testcase.steps[0] === 'string') {
        return props.testcase.steps.map((step, index) => ({
          step_number: index + 1,
          action: step,
        }))
      }

      // Nếu steps là array của objects với cấu trúc đầy đủ
      return props.testcase.steps.map((step) => ({
        step_number: step.step_number,
        action: step.action,
        input_data: step.input_data,
        expected_immediate_result: step.expected_immediate_result,
        _id: step._id,
      }))
    })

    const formatJson = (obj) => {
      if (!obj || Object.keys(obj).length === 0) {
        return '{}'
      }
      return JSON.stringify(obj, null, 2)
    }

    const formatKey = (key) => {
      return key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    }

    const formatDate = (dateString) => {
      if (!dateString) return null
      const date =
        typeof dateString === 'object' && dateString.$date
          ? new Date(dateString.$date)
          : new Date(dateString)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    const formatObjectId = (objId) => {
      if (typeof objId === 'object' && objId.$oid) {
        return objId.$oid
      }
      return objId
    }

    const formatUserId = (userId) => {
      if (typeof userId === 'object' && userId.$oid) {
        return `User ${userId.$oid.substring(0, 8)}...`
      }
      return userId
    }

    const getRequirementName = (reqId) => {
      return `Requirement ${reqId}`
    }

    const getExecutedByName = (executedBy) => {
      if (typeof executedBy === 'string') return executedBy
      if (executedBy?.name) return executedBy.name
      return 'Unknown User'
    }

    const executeTestcase = () => {
      emit('execute')
    }

    const editTestcase = () => {
      emit('edit')
    }

    onMounted(() => {
      // Auto-select execution tab if test case has execution history
      if (props.testcase.executed_at) {
        activeTab.value = 'execution'
      }
    })

    return {
      activeTab,
      tabs,
      hasConditions,
      formattedSteps,
      formatJson,
      formatKey,
      formatDate,
      formatObjectId,
      formatUserId,
      getRequirementName,
      getExecutedByName,
      executeTestcase,
      editTestcase,
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border: 1px solid;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  font-size: 0.875rem;
}

.btn-primary {
  background: #1a365d;
  border-color: #1a365d;
  color: white;
}

.btn-primary:hover {
  background: #2d3748;
  border-color: #2d3748;
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

.detail-header {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.title-section h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 1rem;
  line-height: 1.3;
}

.meta-tags {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.description-section {
  margin-top: 1rem;
}

.description-section p {
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}

.detail-tabs {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 2rem;
  gap: 0.5rem;
  overflow-x: auto;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #64748b;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  font-size: 0.875rem;
}

.tab-btn:hover {
  color: #374151;
  background: #f8fafc;
}

.tab-btn.active {
  color: #1a365d;
  border-bottom-color: #1a365d;
  background: #f0f4f8;
}

.tab-content {
  min-height: 400px;
}

.tab-panel {
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

.panel-section {
  margin-bottom: 2rem;
}

.panel-section:last-child {
  margin-bottom: 0;
}

.panel-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
  border-left: 4px solid #1a365d;
  padding-left: 0.75rem;
}

/* Enhanced Steps Styling */
.steps-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.step-item {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  transition: all 0.3s ease;
  margin-bottom: 1rem;
}

.step-item:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.step-number {
  width: 2.5rem;
  height: 2.5rem;
  background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
  font-size: 0.875rem;
  box-shadow: 0 2px 4px rgba(26, 54, 93, 0.2);
}

.step-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.step-main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.step-action {
  color: #2d3748;
  line-height: 1.6;
  font-size: 1rem;
  font-weight: 500;
}

/* Data Section Styling */
.step-data-section {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 1rem;
  border-left: 4px solid #1a365d;
}

.data-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a365d;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.data-title::before {
  content: 'data_object';
  font-family: 'Material Symbols Outlined';
  font-size: 1rem;
}

.data-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.data-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #f7fafc;
  border-radius: 4px;
  border-left: 2px solid #2d3748;
}

.data-key {
  font-weight: 600;
  color: #1a365d;
  font-size: 0.875rem;
  min-width: 80px;
  text-transform: capitalize;
}

.data-value {
  color: #4a5568;
  font-size: 0.875rem;
  flex: 1;
  word-break: break-all;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: #edf2f7;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
}

/* Result Section Styling */
.step-result-section {
  background: #f0fff4;
  border: 1px solid #9ae6b4;
  border-radius: 6px;
  padding: 1rem;
  border-left: 4px solid #38a169;
}

.result-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #276749;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.result-title::before {
  content: 'check_circle';
  font-family: 'Material Symbols Outlined';
  font-size: 1rem;
}

.result-text {
  color: #2d3748;
  line-height: 1.5;
  font-size: 0.875rem;
  margin: 0;
}

.expected-result {
  padding: 1.5rem;
  background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
  border-radius: 8px;
  border-left: 4px solid #2b6cb0;
  color: white;
}

.expected-result p {
  color: white;
  line-height: 1.6;
  margin: 0;
  font-size: 1rem;
}

.test-data-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.data-scenario {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  background: #f8fafc;
}

.scenario-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
  border-left: 4px solid #1a365d;
  padding-left: 0.75rem;
}

.data-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.data-column h5 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.json-data {
  background: #1f2937;
  color: #e5e7eb;
  padding: 1rem;
  border-radius: 6px;
  font-size: 0.75rem;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  line-height: 1.4;
}

.json-data.actual {
  background: #fffbeb;
  color: #92400e;
  border: 1px solid #fcd34d;
}

.database-info {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.info-item h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
  border-left: 4px solid #1a365d;
  padding-left: 0.75rem;
}

.tables-list,
.operations-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.table-tag {
  padding: 0.5rem 1rem;
  background: #e2e8f0;
  color: #475569;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

.operation-tag {
  padding: 0.5rem 0.75rem;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.requirements-section {
  border-top: 1px solid #e2e8f0;
  padding-top: 1.5rem;
}

.requirements-section h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
  border-left: 4px solid #1a365d;
  padding-left: 0.75rem;
}

.requirements-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.requirement-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.req-id {
  font-weight: 600;
  color: #1a365d;
  font-size: 0.875rem;
}

.req-name {
  color: #64748b;
  font-size: 0.875rem;
}

.execution-history {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.execution-details {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.execution-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.meta-item {
  color: #64748b;
  font-size: 0.875rem;
}

.execution-result h4,
.execution-logs h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.75rem;
  border-left: 4px solid #1a365d;
  padding-left: 0.75rem;
}

.execution-result p {
  color: #374151;
  line-height: 1.6;
  margin: 0;
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.log-entry {
  padding: 0.75rem;
  background: white;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.75rem;
  border: 1px solid #e2e8f0;
  line-height: 1.4;
}

.exceptions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.exception-item {
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fef2f2;
}

.exception-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.exception-type {
  padding: 0.25rem 0.75rem;
  background: #fef3c7;
  color: #92400e;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.exception-status {
  padding: 0.25rem 0.75rem;
  background: #fecaca;
  color: #991b1b;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.exception-status.resolved {
  background: #d1fae5;
  color: #065f46;
}

.exception-message {
  color: #374151;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.exception-meta {
  font-size: 0.875rem;
  color: #64748b;
}

.environment-automation {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.info-section h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
  border-left: 4px solid #1a365d;
  padding-left: 0.75rem;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.info-item label {
  font-weight: 500;
  color: #64748b;
  font-size: 0.875rem;
}

.info-item span {
  color: #374151;
  font-size: 0.875rem;
}

.status-automated {
  color: #059669;
  font-weight: 600;
}

.status-manual {
  color: #d97706;
  font-weight: 600;
}

.metadata-section {
  border-top: 1px solid #e2e8f0;
  padding-top: 1.5rem;
}

.metadata-section h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
  border-left: 4px solid #1a365d;
  padding-left: 0.75rem;
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.metadata-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.metadata-item label {
  font-weight: 500;
  color: #64748b;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metadata-item span {
  color: #374151;
  font-size: 0.875rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: #64748b;
}

.empty-state.large {
  padding: 4rem 2rem;
}

.empty-state .material-symbols-outlined {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state.large .material-symbols-outlined {
  font-size: 4rem;
}

.empty-state h4 {
  color: #475569;
  margin-bottom: 0.5rem;
}

.empty-state p {
  margin-bottom: 1.5rem;
}

.badge {
  display: inline-block;
  padding: 0.5rem 1rem;
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

.badge.status.passed {
  background: #d1fae5;
  color: #059669;
}

.badge.status.failed {
  background: #fee2e2;
  color: #dc2626;
}

.badge.status.blocked {
  background: #fef3c7;
  color: #d97706;
}

.badge.status.not_executed {
  background: #f1f5f9;
  color: #64748b;
}

.badge.status.in_progress {
  background: #dbeafe;
  color: #2563eb;
}

@media (max-width: 768px) {
  .modal-content.xlarge {
    margin: 1rem;
    max-height: calc(100vh - 2rem);
  }

  .modal-body {
    padding: 1rem;
  }

  .modal-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .header-actions {
    justify-content: space-between;
  }

  .detail-tabs {
    flex-wrap: wrap;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .data-columns {
    grid-template-columns: 1fr;
  }

  .execution-meta {
    flex-direction: column;
    gap: 1rem;
  }

  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .metadata-grid {
    grid-template-columns: 1fr;
  }

  .step-item {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .step-number {
    align-self: flex-start;
  }

  .data-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .data-key {
    min-width: auto;
  }
}

.condition-sections {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-top: 1.5rem;
}

.condition-section h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.75rem;
  border-left: 4px solid #1a365d;
  padding-left: 0.75rem;
}

.condition-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.condition-list li {
  padding: 0.5rem 0;
  color: #64748b;
  border-bottom: 1px solid #f1f5f9;
  line-height: 1.5;
}

.condition-list li:last-child {
  border-bottom: none;
}

.expected-results-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.result-level {
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.result-level-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #1a365d;
  margin-bottom: 1rem;
}

.result-list {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin: 0;
}

.result-list li {
  color: #374151;
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

.api-results {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.api-item {
  color: #374151;
  line-height: 1.6;
}

.business-result {
  color: #374151;
  line-height: 1.6;
  margin: 0;
  font-style: italic;
}

.validation-rules {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin: 0;
}

.validation-rules li {
  color: #374151;
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  padding: 0.25rem 0.75rem;
  background: #e2e8f0;
  color: #475569;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.command-text {
  background: #1f2937;
  color: #e5e7eb;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.75rem;
}

/* Responsive updates */
@media (max-width: 768px) {
  .condition-sections {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .data-columns {
    grid-template-columns: 1fr;
  }
}
</style>