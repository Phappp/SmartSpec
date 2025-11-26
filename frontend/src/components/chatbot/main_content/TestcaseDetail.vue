<template>
  <div class="testcase-detail">
    <!-- Overview Card -->
    <div class="card overview-card">
      <div class="card-header">
        <h3 class="card-title">{{ data.title }}</h3>
        <div class="card-actions">
          <span :class="['status-badge', statusClass]">
            <i class="material-symbols-outlined">{{ statusIcon }}</i>
            {{ statusText }}
          </span>
          <span :class="['priority-badge', priorityClass]">
            <i class="material-symbols-outlined">flag</i>
            {{ priorityText }}
          </span>
          <span class="type-badge">
            <i class="material-symbols-outlined">science</i>
            {{ data.testType }}
          </span>
        </div>
      </div>
      <p class="card-description">{{ data.description }}</p>
      <div v-if="data.automation" class="automation-info">
        <span class="automation-label">Automated:</span>
        <span class="automation-value">{{ data.automation.isAutomated ? 'Yes' : 'No' }}</span>
        <span v-if="data.automation.scriptPath" class="automation-path">{{
          data.automation.scriptPath
        }}</span>
      </div>
    </div>

    <!-- Stats Card -->
    <div class="grid-3">
      <div class="card stat-card">
        <div class="stat-value">{{ data.steps.length }}</div>
        <div class="stat-label">
          <i class="material-symbols-outlined">list</i>
          Steps
        </div>
      </div>
      <div class="card stat-card">
        <div class="stat-value">{{ passedSteps }}/{{ data.steps.length }}</div>
        <div class="stat-label">
          <i class="material-symbols-outlined">check_circle</i>
          Passed
        </div>
      </div>
      <div class="card stat-card">
        <div class="stat-value">{{ data.automation?.isAutomated ? 'Automated' : 'Manual' }}</div>
        <div class="stat-label">
          <i class="material-symbols-outlined">play_arrow</i>
          Execution
        </div>
      </div>
    </div>

    <!-- Test Steps Card -->
    <div class="card">
      <h4 class="card-subheader">
        <i class="material-symbols-outlined">playlist_add_check</i>
        Test Steps
      </h4>
      <div class="steps-container">
        <div
          v-for="step in data.steps"
          :key="step.stepNumber"
          class="step-item"
          :class="getStepStatusClass(step)"
        >
          <div class="step-number">{{ step.stepNumber }}</div>
          <div class="step-content">
            <p class="step-action">{{ step.action }}</p>
            <p class="step-expected">Expected: {{ step.expectedResult }}</p>
            <p v-if="step.actualResult" class="step-actual">Actual: {{ step.actualResult }}</p>
          </div>
          <div class="step-status">
            <i v-if="step.actualResult" class="material-symbols-outlined status-icon">{{
              getStepStatusIcon(step)
            }}</i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'TestcaseDetail',
  props: {
    data: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const statusClass = computed(() => {
      const statusMap = {
        passed: 'status-passed',
        failed: 'status-failed',
        not_executed: 'status-not-executed',
        in_progress: 'status-progress',
      }
      return statusMap[props.data.status] || 'status-default'
    })

    const statusIcon = computed(() => {
      const iconMap = {
        passed: 'check_circle',
        failed: 'error',
        not_executed: 'pending',
        in_progress: 'schedule',
      }
      return iconMap[props.data.status] || 'help'
    })

    const statusText = computed(() => {
      const statusMap = {
        passed: 'Passed',
        failed: 'Failed',
        not_executed: 'Not Executed',
        in_progress: 'In Progress',
      }
      return statusMap[props.data.status] || props.data.status
    })

    const priorityClass = computed(() => {
      const priorityMap = {
        high: 'priority-high',
        medium: 'priority-medium',
        low: 'priority-low',
      }
      return priorityMap[props.data.priority] || 'priority-default'
    })

    const priorityText = computed(() => {
      const priorityMap = {
        high: 'High',
        medium: 'Medium',
        low: 'Low',
      }
      return priorityMap[props.data.priority] || props.data.priority
    })

    const passedSteps = computed(() => {
      return props.data.steps.filter(
        (step) => step.actualResult && step.actualResult.includes('PASS')
      ).length
    })

    const getStepStatusClass = (step) => {
      if (!step.actualResult) return 'step-not-executed'
      return step.actualResult.includes('PASS') ? 'step-passed' : 'step-failed'
    }

    const getStepStatusIcon = (step) => {
      if (!step.actualResult) return 'radio_button_unchecked'
      return step.actualResult.includes('PASS') ? 'check_circle' : 'cancel'
    }

    return {
      statusClass,
      statusIcon,
      statusText,
      priorityClass,
      priorityText,
      passedSteps,
      getStepStatusClass,
      getStepStatusIcon,
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

.automation-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #8b949e;
}

.automation-label {
  font-weight: 600;
}

.automation-value {
  color: #7ee787;
}

.automation-path {
  color: #79c0ff;
  font-family: monospace;
  background-color: #0d1117;
  padding: 4px 8px;
  border-radius: 4px;
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
  margin-bottom: 4px;
  line-height: 1.4;
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

.status-not-executed {
  background-color: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}

.status-progress {
  background-color: rgba(187, 128, 9, 0.15);
  color: #ffa657;
}

.status-default {
  background-color: rgba(139, 148, 158, 0.15);
  color: #8b949e;
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

.type-badge {
  background-color: rgba(158, 106, 220, 0.15);
  color: #d2a8ff;
}
</style>