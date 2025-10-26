<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content large">
      <div class="modal-header">
        <h3>Test Case Details</h3>
        <div class="header-actions">
          <button class="btn-icon" @click="executeTestcase" title="Execute">
            <span class="material-symbols-outlined">play_arrow</span>
          </button>
          <button class="btn-icon" @click="editTestcase" title="Edit">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button class="btn-close" @click="$emit('close')">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <div class="modal-body">
        <!-- Header Info -->
        <div class="detail-header">
          <div class="title-section">
            <h2>{{ testcase.title || 'Untitled Test Case' }}</h2>
            <div class="meta-tags">
              <span class="type-badge" :class="testcase.test_type">
                {{ testcase.test_type || 'integration' }}
              </span>
              <span class="priority-badge" :class="testcase.priority">
                {{ testcase.priority || 'medium' }}
              </span>
              <span class="status-badge" :class="testcase.status">
                {{ testcase.status || 'not_executed' }}
              </span>
            </div>
          </div>
          <div class="description-section" v-if="testcase.description">
            <p>{{ testcase.description }}</p>
          </div>
        </div>

        <!-- Main Content Tabs -->
        <div class="detail-tabs">
          <button
            class="tab-button"
            :class="{ active: activeTab === 'steps' }"
            @click="activeTab = 'steps'"
          >
            Test Steps
          </button>
          <button
            class="tab-button"
            :class="{ active: activeTab === 'data' }"
            @click="activeTab = 'data'"
          >
            Test Data
          </button>
          <button
            class="tab-button"
            :class="{ active: activeTab === 'database' }"
            @click="activeTab = 'database'"
          >
            Database
          </button>
          <button
            class="tab-button"
            :class="{ active: activeTab === 'execution' }"
            @click="activeTab = 'execution'"
          >
            Execution History
          </button>
        </div>

        <!-- Test Steps Tab -->
        <div v-if="activeTab === 'steps'" class="tab-content">
          <div class="steps-section">
            <div class="section-header">
              <h4>Test Steps</h4>
            </div>
            <div class="steps-list">
              <div v-for="(step, index) in testcase.steps" :key="index" class="step-item">
                <div class="step-number">{{ index + 1 }}</div>
                <div class="step-content">
                  <div class="step-description">{{ step }}</div>
                </div>
              </div>
              <div v-if="!testcase.steps || testcase.steps.length === 0" class="no-data">
                No steps defined
              </div>
            </div>
          </div>

          <div class="expected-result-section">
            <h4>Expected Result</h4>
            <div class="expected-result">
              {{ testcase.expected_result || 'No expected result specified' }}
            </div>
          </div>
        </div>

        <!-- Test Data Tab -->
        <div v-if="activeTab === 'data'" class="tab-content">
          <div class="test-data-section">
            <div v-for="(data, index) in testcase.test_data" :key="index" class="data-scenario">
              <h5>{{ data.name || `Test Data ${index + 1}` }}</h5>

              <div class="data-grid">
                <div class="data-column">
                  <h6>Inputs</h6>
                  <pre class="json-data">{{ formatJson(data.inputs) }}</pre>
                </div>

                <div class="data-column">
                  <h6>Expected Outputs</h6>
                  <pre class="json-data">{{ formatJson(data.expected_outputs) }}</pre>
                </div>

                <div
                  v-if="data.actual_outputs && Object.keys(data.actual_outputs).length > 0"
                  class="data-column"
                >
                  <h6>Actual Outputs</h6>
                  <pre class="json-data actual">{{ formatJson(data.actual_outputs) }}</pre>
                </div>
              </div>
            </div>
            <div v-if="!testcase.test_data || testcase.test_data.length === 0" class="no-data">
              No test data defined
            </div>
          </div>
        </div>

        <!-- Database Tab -->
        <div v-if="activeTab === 'database'" class="tab-content">
          <div class="database-section">
            <div class="db-info-grid">
              <div class="db-info-item">
                <label>Database Tables</label>
                <div class="tables-list">
                  <span
                    v-for="table in testcase.database_tables"
                    :key="table"
                    class="table-tag large"
                  >
                    {{ table }}
                  </span>
                  <span
                    v-if="!testcase.database_tables || testcase.database_tables.length === 0"
                    class="no-data"
                  >
                    No tables specified
                  </span>
                </div>
              </div>

              <div class="db-info-item">
                <label>Database Operations</label>
                <div class="operations-list">
                  <span v-for="op in testcase.database_operations" :key="op" class="operation-tag">
                    {{ op.toUpperCase() }}
                  </span>
                  <span
                    v-if="
                      !testcase.database_operations || testcase.database_operations.length === 0
                    "
                    class="no-data"
                  >
                    No operations specified
                  </span>
                </div>
              </div>
            </div>

            <div
              class="requirements-mapping"
              v-if="testcase.source_requirement_ids && testcase.source_requirement_ids.length > 0"
            >
              <h5>Related Requirements</h5>
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
        <div v-if="activeTab === 'execution'" class="tab-content">
          <div class="execution-section">
            <div class="current-execution" v-if="testcase.executed_at">
              <h5>Last Execution</h5>
              <div class="execution-info">
                <div class="execution-meta">
                  <span class="meta-item">
                    <strong>Date:</strong> {{ formatDate(testcase.executed_at) }}
                  </span>
                  <span class="meta-item" v-if="testcase.executed_by">
                    <strong>By:</strong> {{ getExecutedByName(testcase.executed_by) }}
                  </span>
                  <span class="meta-item">
                    <strong>Duration:</strong>
                    {{
                      testcase.automation?.last_run_duration
                        ? `${testcase.automation.last_run_duration}s`
                        : 'N/A'
                    }}
                  </span>
                </div>

                <div class="execution-result" v-if="testcase.actual_result">
                  <h6>Actual Result</h6>
                  <p>{{ testcase.actual_result }}</p>
                </div>

                <div
                  class="execution-logs"
                  v-if="testcase.execution_logs && testcase.execution_logs.length > 0"
                >
                  <h6>Execution Logs</h6>
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

            <div
              class="exceptions-section"
              v-if="testcase.exceptions && testcase.exceptions.length > 0"
            >
              <h5>Exceptions</h5>
              <div class="exceptions-list">
                <div
                  v-for="(exception, index) in testcase.exceptions"
                  :key="index"
                  class="exception-item"
                >
                  <div class="exception-header">
                    <span class="exception-type">{{ exception.type || 'unknown' }}</span>
                    <span class="exception-resolved" :class="{ resolved: exception.resolved }">
                      {{ exception.resolved ? 'Resolved' : 'Pending' }}
                    </span>
                  </div>
                  <div class="exception-message">{{ exception.message || 'No message' }}</div>
                  <div class="exception-meta" v-if="exception.occurred_at_step">
                    Occurred at step: {{ exception.occurred_at_step }}
                  </div>
                </div>
              </div>
            </div>

            <div v-if="!testcase.executed_at" class="no-execution">
              <p>This test case has not been executed yet.</p>
            </div>
          </div>
        </div>

        <!-- Environment & Automation -->
        <div class="additional-info">
          <div class="info-section">
            <h5>Environment</h5>
            <div class="environment-info">
              <div class="env-item" v-if="testcase.environment?.os">
                <strong>OS:</strong> {{ testcase.environment.os }}
              </div>
              <div class="env-item" v-if="testcase.environment?.browser">
                <strong>Browser:</strong> {{ testcase.environment.browser }}
              </div>
              <div class="env-item" v-if="testcase.environment?.device">
                <strong>Device:</strong> {{ testcase.environment.device }}
              </div>
              <div class="env-item" v-if="testcase.environment?.url">
                <strong>URL:</strong> {{ testcase.environment.url }}
              </div>
              <div
                v-if="!testcase.environment || Object.keys(testcase.environment).length === 0"
                class="no-data"
              >
                No environment information
              </div>
            </div>
          </div>

          <div class="info-section">
            <h5>Automation</h5>
            <div class="automation-info">
              <div class="auto-item" v-if="testcase.automation?.is_automated">
                <strong>Status:</strong> Automated
              </div>
              <div class="auto-item" v-if="testcase.automation?.script_path">
                <strong>Script:</strong> {{ testcase.automation.script_path }}
              </div>
              <div class="auto-item" v-if="testcase.automation?.tool">
                <strong>Tool:</strong> {{ testcase.automation.tool }}
              </div>
              <div v-if="!testcase.automation || !testcase.automation.is_automated" class="no-data">
                Not automated
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'TestcaseDetailModal',
  props: {
    testcase: {
      type: Object,
      required: true,
      default: () => ({}),
    },
  },
  emits: ['close', 'execute', 'edit'],
  setup(props, { emit }) {
    const activeTab = ref('steps')

    const formatJson = (obj) => {
      if (!obj || Object.keys(obj).length === 0) {
        return '{}'
      }
      return JSON.stringify(obj, null, 2)
    }

    const formatDate = (dateString) => {
      if (!dateString) return null
      return new Date(dateString).toLocaleString()
    }

    const getRequirementName = (reqId) => {
      // This would typically come from props or store
      return `Requirement ${reqId}` // Placeholder
    }

    const getExecutedByName = (executedBy) => {
      if (typeof executedBy === 'string') return executedBy
      if (executedBy?.name) return executedBy.name
      return 'Unknown'
    }

    const executeTestcase = () => {
      emit('execute')
    }

    const editTestcase = () => {
      emit('edit')
    }

    return {
      activeTab,
      formatJson,
      formatDate,
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

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
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

.btn-icon {
  padding: 6px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 24px;
}

.detail-header {
  margin-bottom: 24px;
}

.title-section h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a365d;
  margin-bottom: 12px;
  line-height: 1.3;
}

.meta-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.description-section {
  margin-top: 12px;
}

.description-section p {
  color: #6b7280;
  line-height: 1.5;
  margin: 0;
}

.detail-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 24px;
  gap: 4px;
}

.tab-button {
  padding: 12px 20px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #6b7280;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.tab-button:hover {
  color: #374151;
}

.tab-button.active {
  color: #1a365d;
  border-bottom-color: #1a365d;
}

.tab-content {
  min-height: 300px;
}

.section-header {
  margin-bottom: 16px;
}

.section-header h4 {
  color: #374151;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.step-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
  transition: border-color 0.2s ease;
}

.step-item:hover {
  border-color: #d1d5db;
}

.step-number {
  width: 32px;
  height: 32px;
  background: #1a365d;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
  font-size: 0.875rem;
}

.step-content {
  flex: 1;
  display: flex;
  align-items: center;
}

.step-description {
  line-height: 1.5;
  color: #374151;
}

.expected-result-section h4 {
  margin-bottom: 12px;
}

.expected-result {
  padding: 16px;
  background: #f0f9ff;
  border-radius: 8px;
  border-left: 4px solid #0ea5e9;
  color: #374151;
  line-height: 1.5;
}

.data-scenario {
  margin-bottom: 24px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
}

.data-scenario h5 {
  margin-bottom: 16px;
  color: #374151;
  font-weight: 600;
}

.data-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 768px) {
  .data-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.data-column h6 {
  margin-bottom: 8px;
  color: #6b7280;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.json-data {
  background: #1f2937;
  color: #e5e7eb;
  padding: 16px;
  border-radius: 6px;
  font-size: 0.875rem;
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

.db-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

@media (max-width: 768px) {
  .db-info-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

.db-info-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.tables-list,
.operations-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.table-tag.large {
  padding: 8px 12px;
  background: #e5e7eb;
  color: #374151;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

.operation-tag {
  padding: 6px 10px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.requirements-mapping h5 {
  margin-bottom: 12px;
  color: #374151;
  font-weight: 600;
}

.requirements-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.requirement-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
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
  color: #6b7280;
  font-size: 0.875rem;
}

.execution-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.execution-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.meta-item {
  color: #6b7280;
  font-size: 0.875rem;
}

.execution-result h6,
.execution-logs h6 {
  margin-bottom: 8px;
  color: #374151;
  font-weight: 600;
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 150px;
  overflow-y: auto;
  padding: 8px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.log-entry {
  padding: 8px 12px;
  background: white;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  border: 1px solid #e2e8f0;
}

.exceptions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.exception-item {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fef2f2;
}

.exception-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.exception-type {
  padding: 4px 8px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.exception-resolved {
  padding: 4px 8px;
  background: #fecaca;
  color: #991b1b;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.exception-resolved.resolved {
  background: #d1fae5;
  color: #065f46;
}

.exception-message {
  color: #374151;
  margin-bottom: 8px;
  line-height: 1.4;
}

.exception-meta {
  font-size: 0.875rem;
  color: #6b7280;
}

.additional-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

@media (max-width: 768px) {
  .additional-info {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

.info-section h5 {
  margin-bottom: 12px;
  color: #374151;
  font-weight: 600;
}

.environment-info,
.automation-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.env-item,
.auto-item {
  color: #6b7280;
  font-size: 0.875rem;
  padding: 4px 0;
}

.env-item strong,
.auto-item strong {
  color: #374151;
}

.no-data {
  color: #9ca3af;
  font-style: italic;
  text-align: center;
  padding: 20px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px dashed #d1d5db;
}

.no-execution {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
}

/* Badge styles */
.type-badge,
.priority-badge,
.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Type badges */
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
.type-badge.performance {
  background: #fce7f3;
  color: #be185d;
}
.type-badge.security {
  background: #fecaca;
  color: #991b1b;
}

/* Priority badges */
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

/* Status badges */
.status-badge.passed {
  background: #d1fae5;
  color: #065f46;
}
.status-badge.failed {
  background: #fee2e2;
  color: #991b1b;
}
.status-badge.blocked {
  background: #fef3c7;
  color: #92400e;
}
.status-badge.not_executed {
  background: #f3f4f6;
  color: #6b7280;
}
.status-badge.in_progress {
  background: #dbeafe;
  color: #1e40af;
}
</style>