<template>
  <div class="testcase-detail">
    <!-- Overview Card -->
    <div class="card overview-card">
      <div class="card-header">
        <div class="title-wrapper">
          <h3 v-if="!isEditing" class="card-title">{{ data.title || 'Untitled Test Case' }}</h3>
          <input
            v-else
            class="input title-input"
            v-model="formData.title"
            placeholder="Tên test case"
          />
          <div class="card-actions">
            <template v-if="!isEditing">
              <span :class="['status-badge', statusClass]">
                <i class="material-symbols-outlined">{{ statusIcon }}</i>
                {{ statusText }}
              </span>
              <span :class="['priority-badge', priorityClass]">
                <i class="material-symbols-outlined">flag</i>
                {{ priorityText }}
              </span>
              <span :class="['severity-badge', severityClass]" v-if="data.severity">
                <i class="material-symbols-outlined">warning</i>
                {{ severityText }}
              </span>
              <span class="type-badge">
                <i class="material-symbols-outlined">science</i>
                {{ data.test_type }}
              </span>
            </template>
            <template v-else>
              <select class="pill-input" v-model="formData.status">
                <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <select class="pill-input" v-model="formData.priority">
                <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <select class="pill-input" v-model="formData.severity">
                <option v-for="option in severityOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <select class="pill-input" v-model="formData.test_type">
                <option v-for="type in typeOptions" :key="type" :value="type">
                  {{ type }}
                </option>
              </select>
            </template>
          </div>
        </div>
        <div v-if="canEditControls" class="edit-toolbar">
          <button v-if="!isEditing" class="icon-button" @click="startEditing" title="Chỉnh sửa">
            <i class="material-symbols-outlined">edit</i>
          </button>
          <div v-else class="edit-actions">
            <button class="btn primary mini" @click="saveChanges">
              <i class="material-symbols-outlined">save</i>
              Lưu
            </button>
            <button class="btn ghost mini" @click="cancelEditing">
              <i class="material-symbols-outlined">close</i>
              Hủy
            </button>
          </div>
        </div>
      </div>

      <p v-if="!isEditing" class="card-description">{{ data.description || 'No description' }}</p>
      <textarea
        v-else
        class="textarea description-input"
        v-model="formData.description"
        placeholder="Mô tả test case"
      ></textarea>

      <!-- Project & Version Info -->
      <div class="meta-info-grid">
        <div class="meta-item" v-if="data.project_id">
          <span class="meta-label">Project:</span>
          <span class="meta-value">{{ data.project_id }}</span>
        </div>
        <div class="meta-item" v-if="data.version_id">
          <span class="meta-label">Version:</span>
          <span class="meta-value">{{ data.version_id }}</span>
        </div>
      </div>

      <div v-if="data.objectives && data.objectives.length" class="objectives-list">
        <strong>Objectives:</strong>
        <ul>
          <li v-for="obj in data.objectives" :key="obj">{{ obj }}</li>
        </ul>
      </div>

      <div
        v-if="data.source_requirement_ids && data.source_requirement_ids.length"
        class="source-requirements"
      >
        <strong>Source Requirements:</strong>
        <span v-for="reqId in data.source_requirement_ids" :key="reqId" class="requirement-tag">{{
          reqId
        }}</span>
      </div>

      <!-- Automation Info -->
      <div v-if="data.automation" class="automation-section">
        <div class="automation-header">
          <strong>Automation:</strong>
          <span
            :class="['automation-status', data.automation.is_automated ? 'automated' : 'manual']"
          >
            {{ data.automation.is_automated ? 'Automated' : 'Manual' }}
          </span>
        </div>
        <div v-if="data.automation.script_path" class="automation-detail">
          <span class="automation-label">Script:</span>
          <span class="automation-path">{{ data.automation.script_path }}</span>
        </div>
        <div v-if="data.automation.test_command" class="automation-detail">
          <span class="automation-label">Command:</span>
          <span class="automation-command">{{ data.automation.test_command }}</span>
        </div>
        <div v-if="data.automation.tags && data.automation.tags.length" class="automation-detail">
          <span class="automation-label">Tags:</span>
          <span v-for="tag in data.automation.tags" :key="tag" class="automation-tag">{{
            tag
          }}</span>
        </div>
      </div>
    </div>

    <!-- Stats Card -->
    <div class="grid-3">
      <div class="card stat-card">
        <div class="stat-value">{{ (data.steps || []).length }}</div>
        <div class="stat-label">
          <i class="material-symbols-outlined">list</i>
          Steps
        </div>
      </div>
      <div class="card stat-card">
        <div class="stat-value">{{ passedSteps }}/{{ (data.steps || []).length }}</div>
        <div class="stat-label">
          <i class="material-symbols-outlined">check_circle</i>
          Passed
        </div>
      </div>
      <div class="card stat-card">
        <div class="stat-value">{{ data.automation?.is_automated ? 'Automated' : 'Manual' }}</div>
        <div class="stat-label">
          <i class="material-symbols-outlined">play_arrow</i>
          Execution
        </div>
      </div>
    </div>

    <!-- Preconditions & Postconditions -->
    <div class="grid-2">
      <div v-if="data.preconditions && data.preconditions.length" class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">assignment</i>
          Preconditions
        </h4>
        <ul class="entity-list">
          <li v-for="precondition in data.preconditions" :key="precondition" class="entity-item">
            <i class="material-symbols-outlined entity-icon">checklist</i>
            <span class="entity-text">{{ precondition }}</span>
          </li>
        </ul>
      </div>

      <div v-if="data.postconditions && data.postconditions.length" class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">task_alt</i>
          Postconditions
        </h4>
        <ul class="entity-list">
          <li v-for="postcondition in data.postconditions" :key="postcondition" class="entity-item">
            <i class="material-symbols-outlined entity-icon">verified</i>
            <span class="entity-text">{{ postcondition }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Database Impact -->
    <div
      v-if="
        (data.database_tables && data.database_tables.length) ||
        (data.database_operations && data.database_operations.length)
      "
      class="card"
    >
      <h4 class="card-subheader">
        <i class="material-symbols-outlined">storage</i>
        Database Impact
      </h4>
      <div v-if="data.database_tables && data.database_tables.length" class="database-tables">
        <strong>Tables:</strong>
        <span v-for="table in data.database_tables" :key="table" class="table-tag">{{
          table
        }}</span>
      </div>
      <div
        v-if="data.database_operations && data.database_operations.length"
        class="database-operations"
      >
        <strong>Operations:</strong>
        <span v-for="op in data.database_operations" :key="op" class="operation-tag">{{ op }}</span>
      </div>
    </div>

    <!-- Test Steps Card -->
    <div class="card">
      <h4 class="card-subheader">
        <i class="material-symbols-outlined">playlist_add_check</i>
        Test Steps
      </h4>
      <div v-if="isEditing" class="steps-editor">
        <div
          v-for="(step, index) in formData.steps"
          :key="`edit-step-${index}`"
          class="step-edit-row"
        >
          <div class="step-number">{{ index + 1 }}</div>
          <div class="step-edit-content">
            <label>Hành động</label>
            <textarea
              class="textarea"
              v-model="step.action"
              placeholder="Mô tả hành động kiểm thử"
            ></textarea>
            <label>Kết quả mong đợi</label>
            <textarea
              class="textarea"
              v-model="step.expected_immediate_result"
              placeholder="Kết quả mong đợi"
            ></textarea>
            <label>Verification</label>
            <input
              class="input"
              v-model="step.verification_input"
              placeholder="Verification points (phân tách bởi dấu phẩy)"
            />
            <label>Actual Result</label>
            <textarea
              class="textarea"
              v-model="step.actualResult"
              placeholder="Kết quả thực tế"
            ></textarea>
            <label>Trạng thái</label>
            <select class="pill-input" v-model="step.status">
              <option
                v-for="option in statusOptions"
                :key="`step-status-${option.value}`"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
            <div class="step-inline-actions">
              <button class="icon-button" @click="removeStep(index)" title="Xóa bước">
                <i class="material-symbols-outlined">close</i>
              </button>
            </div>
          </div>
        </div>
        <button class="btn ghost mini" @click="addStep">
          <i class="material-symbols-outlined">add</i>
          Thêm bước
        </button>
      </div>
      <div v-else class="steps-container">
        <div
          v-for="(step, index) in data.steps || []"
          :key="index"
          class="step-item"
          :class="getStepStatusClass(step)"
        >
          <div class="step-number">{{ step.step_number || index + 1 }}</div>
          <div class="step-content">
            <p class="step-action">{{ step.action }}</p>
            <div v-if="step.input_data && Object.keys(step.input_data).length" class="step-input">
              <strong>Input Data:</strong>
              <pre class="input-data">{{ JSON.stringify(step.input_data, null, 2) }}</pre>
            </div>
            <p v-if="step.expected_immediate_result" class="step-expected">
              Expected: {{ step.expected_immediate_result }}
            </p>
            <p
              v-if="step.verification_points && step.verification_points.length"
              class="step-verification"
            >
              Verification: {{ step.verification_points.join(', ') }}
            </p>
            <p v-if="step.actualResult" class="step-actual">Actual: {{ step.actualResult }}</p>
          </div>
          <div class="step-status">
            <i class="material-symbols-outlined status-icon">{{ getStepStatusIcon(step) }}</i>
          </div>
        </div>
      </div>
    </div>

    <!-- Test Data -->
    <div v-if="data.test_data && data.test_data.length" class="card">
      <h4 class="card-subheader">
        <i class="material-symbols-outlined">data_table</i>
        Test Data
      </h4>
      <div class="test-data-container">
        <div v-for="(testData, index) in data.test_data" :key="index" class="test-data-item">
          <div class="test-data-header">
            <strong>{{ testData.name }}</strong>
          </div>
          <div
            v-if="testData.input_payload && Object.keys(testData.input_payload).length"
            class="test-data-section"
          >
            <span class="test-data-label">Input:</span>
            <pre class="test-data-content">{{
              JSON.stringify(testData.input_payload, null, 2)
            }}</pre>
          </div>
          <div
            v-if="testData.expected_output && Object.keys(testData.expected_output).length"
            class="test-data-section"
          >
            <span class="test-data-label">Expected Output:</span>
            <pre class="test-data-content">{{
              JSON.stringify(testData.expected_output, null, 2)
            }}</pre>
          </div>
          <div
            v-if="testData.validation_rules && testData.validation_rules.length"
            class="test-data-section"
          >
            <span class="test-data-label">Validation Rules:</span>
            <ul>
              <li v-for="rule in testData.validation_rules" :key="rule">{{ rule }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Expected Results -->
    <div v-if="data.expected_results" class="card">
      <h4 class="card-subheader">
        <i class="material-symbols-outlined">target</i>
        Expected Results
      </h4>
      <div
        v-if="data.expected_results.ui_level && data.expected_results.ui_level.length"
        class="expected-section"
      >
        <strong>UI Level:</strong>
        <ul>
          <li v-for="ui in data.expected_results.ui_level" :key="ui">{{ ui }}</li>
        </ul>
      </div>
      <div v-if="data.expected_results.api_level" class="expected-section">
        <strong>API Level:</strong>
        <div v-if="data.expected_results.api_level.status_code" class="api-detail">
          Status Code:
          <span class="status-code">{{ data.expected_results.api_level.status_code }}</span>
        </div>
        <div
          v-if="
            data.expected_results.api_level.response_schema &&
            Object.keys(data.expected_results.api_level.response_schema).length
          "
          class="api-detail"
        >
          Response Schema:
          <pre class="schema-json">{{
            JSON.stringify(data.expected_results.api_level.response_schema, null, 2)
          }}</pre>
        </div>
      </div>
      <div
        v-if="data.expected_results.database_level && data.expected_results.database_level.length"
        class="expected-section"
      >
        <strong>Database Level:</strong>
        <ul>
          <li v-for="db in data.expected_results.database_level" :key="db">{{ db }}</li>
        </ul>
      </div>
      <div v-if="data.expected_results.business_level" class="expected-section">
        <strong>Business Level:</strong>
        <p>{{ data.expected_results.business_level }}</p>
      </div>
    </div>

    <!-- Actual Result -->
    <div v-if="data.actual_result" class="card">
      <h4 class="card-subheader">
        <i class="material-symbols-outlined">fact_check</i>
        Actual Result
      </h4>
      <p class="actual-result-text">{{ data.actual_result }}</p>
    </div>

    <!-- Environment -->
    <div v-if="data.environment" class="card">
      <h4 class="card-subheader">
        <i class="material-symbols-outlined">computer</i>
        Environment
      </h4>
      <div class="environment-grid">
        <div v-if="data.environment.os" class="env-item">
          <span class="env-label">OS:</span>
          <span class="env-value">{{ data.environment.os }}</span>
        </div>
        <div v-if="data.environment.browser" class="env-item">
          <span class="env-label">Browser:</span>
          <span class="env-value">{{ data.environment.browser }}</span>
        </div>
        <div v-if="data.environment.database" class="env-item">
          <span class="env-label">Database:</span>
          <span class="env-value">{{ data.environment.database }}</span>
        </div>
        <div v-if="data.environment.device" class="env-item">
          <span class="env-label">Device:</span>
          <span class="env-value">{{ data.environment.device }}</span>
        </div>
        <div v-if="data.environment.runtime_env" class="env-item">
          <span class="env-label">Environment:</span>
          <span :class="['env-value', `env-${data.environment.runtime_env}`]">{{
            data.environment.runtime_env
          }}</span>
        </div>
      </div>
    </div>

    <!-- Exceptions -->
    <div v-if="data.exceptions && data.exceptions.length" class="card">
      <h4 class="card-subheader">
        <i class="material-symbols-outlined">error</i>
        Exceptions
      </h4>
      <div class="exceptions-container">
        <div v-for="(exception, index) in data.exceptions" :key="index" class="exception-item">
          <div class="exception-header">
            <span :class="['exception-type', `type-${exception.type}`]">{{ exception.type }}</span>
            <span :class="['exception-severity', `severity-${exception.severity}`]">{{
              exception.severity
            }}</span>
            <span v-if="exception.resolved" class="exception-resolved">Resolved</span>
          </div>
          <p class="exception-message">{{ exception.message }}</p>
          <div v-if="exception.occurred_at_step" class="exception-detail">
            Occurred at step: {{ exception.occurred_at_step }}
          </div>
        </div>
      </div>
    </div>

    <!-- Execution History -->
    <div v-if="data.execution_history && data.execution_history.length" class="card">
      <h4 class="card-subheader">
        <i class="material-symbols-outlined">history</i>
        Execution History
      </h4>
      <div class="history-container">
        <div v-for="(history, index) in data.execution_history" :key="index" class="history-item">
          <div class="history-header">
            <span :class="['history-result', `result-${history.result}`]">{{
              history.result
            }}</span>
            <span class="history-date">{{ formatDate(history.executed_at) }}</span>
            <span v-if="history.duration_ms" class="history-duration"
              >{{ history.duration_ms }}ms</span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Insights -->
    <div v-if="data.insights" class="card">
      <h4 class="card-subheader">
        <i class="material-symbols-outlined">insights</i>
        Insights & Analytics
      </h4>
      <div class="insights-grid">
        <div v-if="data.insights.stability_score !== null" class="insight-item">
          <span class="insight-label">Stability Score:</span>
          <span class="insight-value">{{ (data.insights.stability_score * 100).toFixed(1) }}%</span>
        </div>
        <div v-if="data.insights.failure_rate !== null" class="insight-item">
          <span class="insight-label">Failure Rate:</span>
          <span class="insight-value">{{ (data.insights.failure_rate * 100).toFixed(1) }}%</span>
        </div>
        <div v-if="data.insights.last_failure_reason" class="insight-item full-width">
          <span class="insight-label">Last Failure Reason:</span>
          <span class="insight-text">{{ data.insights.last_failure_reason }}</span>
        </div>
        <div v-if="data.insights.ai_recommendation" class="insight-item full-width">
          <span class="insight-label">AI Recommendation:</span>
          <span class="insight-text">{{ data.insights.ai_recommendation }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, reactive, ref, watch } from 'vue'

export default {
  name: 'TestcaseDetail',
  props: {
    data: {
      type: Object,
      required: true,
    },
    canEdit: {
      type: Boolean,
      default: false,
    },
    mode: {
      type: String,
      default: 'view',
    },
    isCreating: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['submit', 'cancel'],
  setup(props, { emit }) {
    const isEditing = ref(props.isCreating)
    const formData = reactive({
      title: '',
      description: '',
      status: 'not_executed',
      priority: 'medium',
      severity: 'medium',
      test_type: 'integration',
      steps: [],
    })

    const statusOptions = [
      { value: 'not_executed', label: 'Not Executed' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'passed', label: 'Passed' },
      { value: 'failed', label: 'Failed' },
      { value: 'blocked', label: 'Blocked' },
    ]

    const priorityOptions = [
      { value: 'critical', label: 'Critical' },
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' },
    ]

    const severityOptions = [
      { value: 'minor', label: 'Minor' },
      { value: 'major', label: 'Major' },
      { value: 'critical', label: 'Critical' },
    ]
    const typeOptions = ['unit', 'integration', 'api', 'ui', 'performance', 'security']

    const hydrateForm = () => {
      const source = props.data || {}
      formData.title = source.title || ''
      formData.description = source.description || ''
      formData.status = source.status || 'not_executed'
      formData.priority = source.priority || 'medium'
      formData.severity = source.severity || 'medium'
      formData.test_type = source.test_type || 'integration'
      formData.steps = Array.isArray(source.steps)
        ? source.steps.map((step, index) => ({
            step_number: step.step_number || index + 1,
            action: step.action || '',
            expected_immediate_result: step.expected_immediate_result || '',
            verification_points: Array.isArray(step.verification_points)
              ? [...step.verification_points]
              : [],
            verification_input: Array.isArray(step.verification_points)
              ? step.verification_points.join(', ')
              : '',
            actualResult: step.actualResult || '',
            status: step.status || 'not_executed',
          }))
        : []
    }

    watch(
      () => props.data,
      () => {
        if (!isEditing.value || props.mode !== 'create') {
          hydrateForm()
        }
      },
      { immediate: true }
    )

    watch(
      () => props.mode,
      (mode) => {
        if (mode === 'create') {
          isEditing.value = true
          hydrateForm()
        } else if (!props.canEdit) {
          isEditing.value = false
        }
      }
    )

    const canEditControls = computed(() => props.canEdit || props.mode === 'create')

    const startEditing = () => {
      if (!props.canEdit) return
      isEditing.value = true
      hydrateForm()
    }

    const cancelEditing = () => {
      if (props.mode === 'create') {
        emit('cancel')
        return
      }
      isEditing.value = false
      hydrateForm()
    }

    const cleanSteps = () =>
      formData.steps
        .map((step, index) => {
          const verificationPoints = step.verification_input
            ? step.verification_input
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean)
            : Array.isArray(step.verification_points)
            ? step.verification_points.filter(Boolean)
            : []
          return {
            step_number: Number(step.step_number) || index + 1,
            action: step.action || '',
            expected_immediate_result: step.expected_immediate_result || '',
            verification_points: verificationPoints,
            actualResult: step.actualResult || '',
            status: step.status || 'not_executed',
          }
        })
        .filter((step) => step.action || step.expected_immediate_result)

    const saveChanges = () => {
      // Transform severity trước khi gửi
      const transformedSeverity = formData.severity === 'medium' ? 'minor' : formData.severity

      const payload = {
        ...props.data,
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        severity: transformedSeverity, // Sử dụng giá trị đã transform
        test_type: formData.test_type,
        steps: cleanSteps(),
      }

      emit('submit', payload)
      if (props.mode !== 'create') {
        isEditing.value = false
      }
    }

    const addStep = () => {
      formData.steps.push({
        step_number: formData.steps.length + 1,
        action: '',
        expected_immediate_result: '',
        verification_points: [],
        verification_input: '',
        actualResult: '',
        status: 'not_executed',
      })
    }

    const removeStep = (index) => {
      formData.steps.splice(index, 1)
    }

    const currentStatus = computed(() => (isEditing.value ? formData.status : props.data.status))

    const statusClass = computed(() => {
      const statusMap = {
        passed: 'status-passed',
        failed: 'status-failed',
        blocked: 'status-blocked',
        not_executed: 'status-not-executed',
        in_progress: 'status-progress',
      }
      return statusMap[currentStatus.value] || 'status-default'
    })

    const statusIcon = computed(() => {
      const iconMap = {
        passed: 'check_circle',
        failed: 'error',
        blocked: 'block',
        not_executed: 'pending',
        in_progress: 'schedule',
      }
      return iconMap[currentStatus.value] || 'help'
    })

    const statusText = computed(() => {
      const statusMap = {
        passed: 'Passed',
        failed: 'Failed',
        blocked: 'Blocked',
        not_executed: 'Not Executed',
        in_progress: 'In Progress',
      }
      return statusMap[currentStatus.value] || currentStatus.value || 'N/A'
    })

    const currentPriority = computed(() =>
      isEditing.value ? formData.priority : props.data.priority
    )

    const priorityClass = computed(() => {
      const priorityMap = {
        critical: 'priority-critical',
        high: 'priority-high',
        medium: 'priority-medium',
        low: 'priority-low',
      }
      return priorityMap[currentPriority.value] || 'priority-default'
    })

    const priorityText = computed(() => {
      const priorityMap = {
        critical: 'Critical',
        high: 'High',
        medium: 'Medium',
        low: 'Low',
      }
      return priorityMap[currentPriority.value] || currentPriority.value || 'N/A'
    })

    const currentSeverity = computed(() =>
      isEditing.value ? formData.severity : props.data.severity
    )

    const severityClass = computed(() => {
      const severityMap = {
        critical: 'severity-critical',
        major: 'severity-major',
        minor: 'severity-minor',
      }
      return severityMap[currentSeverity.value] || 'severity-default'
    })

    const severityText = computed(() => {
      const severityMap = {
        critical: 'Critical',
        major: 'Major',
        minor: 'Minor',
      }
      return severityMap[currentSeverity.value] || currentSeverity.value || 'N/A'
    })

    const passedSteps = computed(() => {
      const steps = isEditing.value ? formData.steps : props.data.steps || []
      return steps.filter((step) => step.status === 'passed').length
    })

    const getStepStatusClass = (step) => {
      if (!step.status) return 'step-default'
      const statusMap = {
        passed: 'step-passed',
        failed: 'step-failed',
        blocked: 'step-blocked',
        not_executed: 'step-not-executed',
      }
      return statusMap[step.status] || 'step-default'
    }

    const getStepStatusIcon = (step) => {
      const iconMap = {
        passed: 'check_circle',
        failed: 'cancel',
        blocked: 'block',
        not_executed: 'pause_circle',
      }
      return iconMap[step.status] || 'radio_button_unchecked'
    }

    const formatDate = (dateString) => {
      if (!dateString) return ''
      return new Date(dateString).toLocaleString()
    }

    return {
      statusClass,
      statusIcon,
      statusText,
      priorityClass,
      priorityText,
      severityClass,
      severityText,
      passedSteps,
      getStepStatusClass,
      getStepStatusIcon,
      formatDate,
      isEditing,
      formData,
      canEditControls,
      startEditing,
      cancelEditing,
      saveChanges,
      addStep,
      removeStep,
      statusOptions,
      priorityOptions,
      severityOptions,
      typeOptions,
    }
  },
}
</script>

<style scoped>
.testcase-detail {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  background-color: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 20px;
}

.overview-card {
  background: linear-gradient(135deg, #161b22 0%, #1c2b41 100%);
  border: 1px solid #30363d;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}

.card-title {
  font-size: 20px;
  font-weight: 700;
  color: #7ee787;
  margin: 0;
}
.title-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.input {
  width: 100%;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 8px 10px;
  color: #f0f6fc;
  font-size: 14px;
}

.textarea {
  width: 100%;
  min-height: 64px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 8px 10px;
  color: #f0f6fc;
  font-size: 14px;
  resize: vertical;
}

.title-input {
  font-size: 20px;
  font-weight: 700;
}

.description-input {
  margin-top: 8px;
}

.pill-input {
  background: #21262d;
  border: 1px solid #30363d;
  color: #c9d1d9;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
}

.edit-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-actions {
  display: flex;
  gap: 6px;
}

.btn {
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn.mini {
  padding: 4px 8px;
  font-size: 12px;
}

.btn.primary {
  background: #238636;
  border-color: #2ea043;
  color: #fff;
}

.btn.ghost {
  background: transparent;
  border-color: #30363d;
  color: #c9d1d9;
}

.icon-button {
  border: 1px solid #30363d;
  background: transparent;
  color: #8b949e;
  border-radius: 4px;
  padding: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.icon-button:hover {
  border-color: #58a6ff;
  color: #58a6ff;

  flex: 1;
}

.card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.card-description {
  color: #8b949e;
  font-size: 14px;
  line-height: 1.5;
  margin: 0 0 12px 0;
}

.meta-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.meta-label {
  color: #8b949e;
  font-weight: 600;
}

.meta-value {
  color: #79c0ff;
  font-family: monospace;
  background-color: #0d1117;
  padding: 2px 6px;
  border-radius: 4px;
}

.automation-section {
  margin-top: 12px;
  padding: 12px;
  background-color: rgba(13, 17, 23, 0.5);
  border-radius: 6px;
  border: 1px solid #30363d;
}

.automation-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.automation-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.automation-status.automated {
  background-color: rgba(46, 160, 67, 0.15);
  color: #7ee787;
}

.automation-status.manual {
  background-color: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}

.automation-detail {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
  font-size: 12px;
}

.automation-label {
  color: #8b949e;
  font-weight: 600;
  min-width: 60px;
}

.automation-path,
.automation-command {
  color: #79c0ff;
  font-family: monospace;
  background-color: #0d1117;
  padding: 4px 8px;
  border-radius: 4px;
  flex: 1;
}

.automation-tag {
  display: inline-block;
  margin: 2px 4px 2px 0;
  padding: 2px 6px;
  background-color: rgba(158, 106, 220, 0.15);
  color: #d2a8ff;
  border-radius: 4px;
  font-size: 11px;
}

.grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}

.stat-card {
  text-align: center;
  padding: 20px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #f0f6fc;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 12px;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.stat-label .material-symbols-outlined {
  font-size: 16px;
}

.card-subheader {
  font-size: 16px;
  font-weight: 600;
  color: #f0f6fc;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-subheader .material-symbols-outlined {
  font-size: 20px;
  color: #7ee787;
}

.steps-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.steps-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step-edit-row {
  display: flex;
  gap: 12px;
}

.step-edit-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-edit-content label {
  font-size: 12px;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.step-inline-actions {
  display: flex;
  justify-content: flex-end;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #21262d;
  transition: all 0.2s;
}

.step-item:hover {
  border-color: #30363d;
  background-color: #1a212e;
}

.step-item.step-passed {
  border-left: 4px solid #7ee787;
  background-color: rgba(46, 160, 67, 0.05);
}

.step-item.step-failed {
  border-left: 4px solid #ff7b72;
  background-color: rgba(248, 81, 73, 0.05);
}

.step-item.step-not-executed {
  border-left: 4px solid #8b949e;
}

.step-number {
  background-color: rgba(56, 139, 253, 0.15);
  color: #79c0ff;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
  min-width: 0;
}

.step-action {
  font-weight: 500;
  color: #f0f6fc;
  margin-bottom: 8px;
  line-height: 1.4;
}

.step-input {
  margin-bottom: 8px;
}

.step-input strong {
  font-size: 12px;
  color: #8b949e;
}

.input-data {
  background-color: #0d1117;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #79c0ff;
  margin: 4px 0;
  overflow-x: auto;
}

.step-expected {
  font-size: 13px;
  color: #8b949e;
  margin-bottom: 4px;
  line-height: 1.4;
}

.step-actual {
  font-size: 13px;
  color: #c9d1d9;
  line-height: 1.4;
}

.step-status {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.status-icon {
  font-size: 20px;
}

.step-passed .status-icon {
  color: #7ee787;
}

.step-failed .status-icon {
  color: #ff7b72;
}

.step-not-executed .status-icon {
  color: #8b949e;
}

.status-badge,
.priority-badge,
.severity-badge,
.type-badge {
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-badge .material-symbols-outlined,
.priority-badge .material-symbols-outlined,
.severity-badge .material-symbols-outlined,
.type-badge .material-symbols-outlined {
  font-size: 14px;
}

.status-passed {
  background-color: rgba(46, 160, 67, 0.15);
  color: #7ee787;
}

.status-failed {
  background-color: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
}

.status-blocked {
  background-color: rgba(187, 128, 9, 0.15);
  color: #ffa657;
}

.status-not-executed {
  background-color: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}

.status-progress {
  background-color: rgba(56, 139, 253, 0.15);
  color: #79c0ff;
}

.status-default {
  background-color: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}

.priority-critical {
  background-color: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
}

.priority-high {
  background-color: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
}

.priority-medium {
  background-color: rgba(187, 128, 9, 0.15);
  color: #ffa657;
}

.priority-low {
  background-color: rgba(56, 139, 253, 0.15);
  color: #79c0ff;
}

.priority-default {
  background-color: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}

.severity-critical {
  background-color: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
}

.severity-major {
  background-color: rgba(187, 128, 9, 0.15);
  color: #ffa657;
}

.severity-minor {
  background-color: rgba(56, 139, 253, 0.15);
  color: #79c0ff;
}

.severity-default {
  background-color: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}

.type-badge {
  background-color: rgba(158, 106, 220, 0.15);
  color: #d2a8ff;
}

.objectives-list,
.source-requirements,
.database-tables,
.database-operations {
  margin-top: 12px;
  padding: 8px 0;
  font-size: 13px;
  color: #c9d1d9;
}

.objectives-list ul {
  margin: 8px 0 0 20px;
  padding: 0;
}

.objectives-list li {
  margin: 4px 0;
}

.requirement-tag,
.table-tag,
.operation-tag {
  display: inline-block;
  margin: 4px 8px 4px 0;
  padding: 4px 8px;
  background-color: rgba(56, 139, 253, 0.15);
  color: #79c0ff;
  border-radius: 4px;
  font-size: 12px;
}

.test-data-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.test-data-item {
  padding: 12px;
  background-color: rgba(13, 17, 23, 0.5);
  border-radius: 6px;
  border: 1px solid #30363d;
}

.test-data-header {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #30363d;
}

.test-data-section {
  margin: 8px 0;
}

.test-data-label {
  font-size: 12px;
  color: #8b949e;
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
}

.test-data-content {
  background-color: #0d1117;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #79c0ff;
  margin: 4px 0;
  overflow-x: auto;
}

.expected-section {
  margin-top: 12px;
  padding: 8px 0;
  color: #c9d1d9;
  font-size: 13px;
}

.expected-section strong {
  color: #f0f6fc;
  display: block;
  margin-bottom: 8px;
}

.expected-section ul {
  margin: 8px 0 0 20px;
  padding: 0;
}

.expected-section li {
  margin: 4px 0;
}

.api-detail {
  margin: 8px 0;
}

.status-code {
  color: #79c0ff;
  font-weight: 600;
}

.schema-json {
  background-color: #0d1117;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #79c0ff;
  margin: 4px 0;
  overflow-x: auto;
}

.actual-result-text {
  color: #c9d1d9;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

.environment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.env-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.env-label {
  font-size: 12px;
  color: #8b949e;
  font-weight: 600;
}

.env-value {
  font-size: 13px;
  color: #c9d1d9;
}

.env-production {
  color: #ff7b72;
}

.env-staging {
  color: #ffa657;
}

.env-local {
  color: #7ee787;
}

.exceptions-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.exception-item {
  padding: 12px;
  background-color: rgba(13, 17, 23, 0.5);
  border-radius: 6px;
  border: 1px solid #30363d;
}

.exception-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.exception-type,
.exception-severity,
.exception-resolved {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.type-validation {
  background-color: rgba(187, 128, 9, 0.15);
  color: #ffa657;
}
.type-runtime {
  background-color: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
}
.type-assertion {
  background-color: rgba(158, 106, 220, 0.15);
  color: #d2a8ff;
}
.type-system {
  background-color: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}
.type-other {
  background-color: rgba(56, 139, 253, 0.15);
  color: #79c0ff;
}

.severity-critical {
  background-color: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
}
.severity-high {
  background-color: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
}
.severity-medium {
  background-color: rgba(187, 128, 9, 0.15);
  color: #ffa657;
}
.severity-low {
  background-color: rgba(56, 139, 253, 0.15);
  color: #79c0ff;
}

.exception-resolved {
  background-color: rgba(46, 160, 67, 0.15);
  color: #7ee787;
}

.exception-message {
  color: #c9d1d9;
  font-size: 13px;
  margin: 0 0 8px 0;
}

.exception-detail {
  font-size: 12px;
  color: #8b949e;
}

.history-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  padding: 8px 12px;
  background-color: rgba(13, 17, 23, 0.5);
  border-radius: 4px;
  border: 1px solid #30363d;
}

.history-header {
  display: flex;
  gap: 12px;
  align-items: center;
}

.history-result {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.result-passed {
  background-color: rgba(46, 160, 67, 0.15);
  color: #7ee787;
}
.result-failed {
  background-color: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
}
.result-blocked {
  background-color: rgba(187, 128, 9, 0.15);
  color: #ffa657;
}

.history-date {
  font-size: 12px;
  color: #8b949e;
}

.history-duration {
  font-size: 12px;
  color: #79c0ff;
  font-family: monospace;
}

.insights-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.insight-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.insight-item.full-width {
  grid-column: 1 / -1;
}

.insight-label {
  font-size: 12px;
  color: #8b949e;
  font-weight: 600;
}

.insight-value {
  font-size: 16px;
  font-weight: 700;
  color: #7ee787;
}

.insight-text {
  font-size: 13px;
  color: #c9d1d9;
  line-height: 1.4;
}

.entity-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.entity-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.entity-icon {
  font-size: 18px;
  flex-shrink: 0;
  color: #7ee787;
}

.entity-text {
  color: #c9d1d9;
  font-size: 14px;
  line-height: 1.4;
}

/* Responsive */
@media (max-width: 768px) {
  .grid-3 {
    grid-template-columns: 1fr;
  }

  .grid-2 {
    grid-template-columns: 1fr;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .card-actions {
    justify-content: flex-start;
  }

  .meta-info-grid {
    grid-template-columns: 1fr;
  }

  .insights-grid {
    grid-template-columns: 1fr;
  }
}
</style>