<template>
  <div class="usecase-detail">
    <!-- Overview Card -->
    <div class="card overview-card">
      <div class="card-header">
        <h3 class="card-title">{{ data.name }}</h3>
        <div class="card-actions">
          <span :class="['status-badge', statusClass]">
            <i class="material-symbols-outlined">{{ statusIcon }}</i>
            {{ statusText }}
          </span>
          <span :class="['priority-badge', priorityClass]">
            <i class="material-symbols-outlined">flag</i>
            {{ priorityText }}
          </span>
        </div>
      </div>
      <p class="card-description">{{ data.goal || data.description || 'No description' }}</p>
      <div v-if="data.reason" class="card-reason"><strong>Lý do:</strong> {{ data.reason }}</div>
      <div v-if="data.feedback" class="card-feedback">
        <strong>Feedback:</strong> {{ formatFeedback(data.feedback) }}
      </div>
    </div>

    <!-- Two Column Layout -->
    <div class="grid-2">
      <!-- Actors Card -->
      <div class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">people</i>
          Actors / Role
        </h4>
        <div v-if="data.role" class="role-info">
          <div class="role-name">{{ data.role.name || 'N/A' }}</div>
          <div v-if="data.role.description" class="role-description">
            {{ data.role.description }}
          </div>
        </div>
        <ul v-else-if="data.actors && data.actors.length" class="entity-list">
          <li v-for="actor in data.actors" :key="actor" class="entity-item">
            <i class="material-symbols-outlined entity-icon">person</i>
            <span class="entity-text">{{ actor }}</span>
          </li>
        </ul>
        <div v-else class="empty-state">
          <i class="material-symbols-outlined">inbox</i>
          <span class="empty-text">No actors</span>
        </div>
      </div>

      <!-- Preconditions Card -->
      <div class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">assignment</i>
          Preconditions
        </h4>
        <ul class="entity-list" v-if="data.preconditions && data.preconditions.length">
          <li v-for="precondition in data.preconditions" :key="precondition" class="entity-item">
            <i class="material-symbols-outlined entity-icon">checklist</i>
            <span class="entity-text">{{ precondition }}</span>
          </li>
        </ul>
        <div v-else class="empty-state">
          <i class="material-symbols-outlined">inbox</i>
          <span class="empty-text">No preconditions</span>
        </div>
      </div>
    </div>

    <!-- Main Flow / Tasks Card -->
    <div class="card">
      <h4 class="card-subheader">
        <i class="material-symbols-outlined">play_arrow</i>
        Main Flow / Tasks
      </h4>
      <ol class="steps-list">
        <li
          v-for="(step, index) in data.tasks || data.mainFlow || []"
          :key="index"
          class="step-item"
        >
          <div class="step-number">{{ index + 1 }}</div>
          <div class="step-content">{{ step }}</div>
        </li>
      </ol>
    </div>

    <!-- Additional Info Grid -->
    <div class="grid-2">
      <!-- Inputs Card -->
      <div v-if="data.inputs && data.inputs.length" class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">input</i>
          Inputs
        </h4>
        <ul class="entity-list">
          <li v-for="input in data.inputs" :key="input" class="entity-item">
            <i class="material-symbols-outlined entity-icon">arrow_downward</i>
            <span class="entity-text">{{ input }}</span>
          </li>
        </ul>
      </div>

      <!-- Outputs Card -->
      <div v-if="data.outputs && data.outputs.length" class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">output</i>
          Outputs
        </h4>
        <ul class="entity-list">
          <li v-for="output in data.outputs" :key="output" class="entity-item">
            <i class="material-symbols-outlined entity-icon">arrow_upward</i>
            <span class="entity-text">{{ output }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Postconditions Card -->
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

    <!-- Rules & Triggers -->
    <div class="grid-2">
      <div v-if="data.rules && data.rules.length" class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">rule</i>
          Rules
        </h4>
        <ul class="entity-list">
          <li v-for="rule in data.rules" :key="rule" class="entity-item">
            <i class="material-symbols-outlined entity-icon">gavel</i>
            <span class="entity-text">{{ rule }}</span>
          </li>
        </ul>
      </div>

      <div v-if="data.triggers && data.triggers.length" class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">bolt</i>
          Triggers
        </h4>
        <ul class="entity-list">
          <li v-for="trigger in data.triggers" :key="trigger" class="entity-item">
            <i class="material-symbols-outlined entity-icon">flash_on</i>
            <span class="entity-text">{{ trigger }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Exceptions & Related Usecases -->
    <div class="grid-2">
      <div v-if="data.exceptions && data.exceptions.length" class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">error</i>
          Exceptions
        </h4>
        <ul class="entity-list">
          <li v-for="exception in data.exceptions" :key="exception" class="entity-item">
            <i class="material-symbols-outlined entity-icon">warning</i>
            <span class="entity-text">{{ exception }}</span>
          </li>
        </ul>
      </div>

      <div v-if="data.related_usecases && data.related_usecases.length" class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">link</i>
          Related Use Cases
        </h4>
        <ul class="entity-list">
          <li v-for="related in data.related_usecases" :key="related" class="entity-item">
            <i class="material-symbols-outlined entity-icon">share</i>
            <span class="entity-text">{{ related }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Stakeholders & Constraints -->
    <div class="grid-2">
      <div v-if="data.stakeholders && data.stakeholders.length" class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">groups</i>
          Stakeholders
        </h4>
        <ul class="entity-list">
          <li v-for="stakeholder in data.stakeholders" :key="stakeholder" class="entity-item">
            <i class="material-symbols-outlined entity-icon">person</i>
            <span class="entity-text">{{ stakeholder }}</span>
          </li>
        </ul>
      </div>

      <div v-if="data.constraints && data.constraints.length" class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">lock</i>
          Constraints
        </h4>
        <ul class="entity-list">
          <li v-for="constraint in data.constraints" :key="constraint" class="entity-item">
            <i class="material-symbols-outlined entity-icon">block</i>
            <span class="entity-text">{{ constraint }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Context & Metadata -->
    <div class="card">
      <h4 class="card-subheader">
        <i class="material-symbols-outlined">info</i>
        Context & Metadata
      </h4>
      <div v-if="data.context" class="context-text">{{ data.context }}</div>

      <div class="metadata-grid" v-if="hasMetadata">
        <div class="metadata-item" v-if="data.id">
          <span class="metadata-label">ID:</span>
          <span class="metadata-value">{{ data.id }}</span>
        </div>
        <div class="metadata-item" v-if="data.version">
          <span class="metadata-label">Version:</span>
          <span class="metadata-value">{{ data.version }}</span>
        </div>
        <div class="metadata-item" v-if="data.created_at">
          <span class="metadata-label">Created:</span>
          <span class="metadata-value">{{ formatDate(data.created_at) }}</span>
        </div>
        <div class="metadata-item" v-if="data.updated_at">
          <span class="metadata-label">Updated:</span>
          <span class="metadata-value">{{ formatDate(data.updated_at) }}</span>
        </div>
      </div>
    </div>

    <!-- Conflicts Section (if any) -->
    <div v-if="data.conflicts && data.conflicts.length" class="card conflicts-card">
      <h4 class="card-subheader conflict-header">
        <i class="material-symbols-outlined">warning</i>
        Conflicts ({{ data.conflicts.length }})
      </h4>
      <div v-for="conflict in data.conflicts" :key="conflict.conflict_id" class="conflict-item">
        <div class="conflict-id">Conflict ID: {{ conflict.conflict_id }}</div>
        <div class="conflict-items">
          <div v-for="item in conflict.items" :key="item.id" class="conflict-use-case">
            <strong>{{ item.name }}</strong> - {{ item.goal }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'UsecaseDetail',
  props: {
    data: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const statusClass = computed(() => {
      const statusMap = {
        approved: 'status-approved',
        draft: 'status-draft',
        in_progress: 'status-progress',
        processing: 'status-progress',
        completed: 'status-approved',
        failed: 'status-failed',
        has_conflicts: 'status-conflict',
      }
      return statusMap[props.data.status] || 'status-default'
    })

    const statusIcon = computed(() => {
      const iconMap = {
        approved: 'verified',
        draft: 'edit',
        in_progress: 'schedule',
        processing: 'schedule',
        completed: 'check_circle',
        failed: 'error',
        has_conflicts: 'warning',
      }
      return iconMap[props.data.status] || 'help'
    })

    const statusText = computed(() => {
      const statusMap = {
        approved: 'Approved',
        draft: 'Draft',
        in_progress: 'In Progress',
        processing: 'Processing',
        completed: 'Completed',
        failed: 'Failed',
        has_conflicts: 'Has Conflicts',
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

    const hasMetadata = computed(() => {
      return props.data.id || props.data.version || props.data.created_at || props.data.updated_at
    })

    const formatFeedback = (feedback) => {
      if (typeof feedback === 'string') return feedback
      if (typeof feedback === 'object') return JSON.stringify(feedback, null, 2)
      return String(feedback)
    }

    const formatDate = (date) => {
      if (!date) return 'N/A'
      return new Date(date).toLocaleString()
    }

    return {
      statusClass,
      statusIcon,
      statusText,
      priorityClass,
      priorityText,
      hasMetadata,
      formatFeedback,
      formatDate,
    }
  },
}
</script>

<style scoped>
.usecase-detail {
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
}

.card-title {
  font-size: 20px;
  font-weight: 700;
  color: #79c0ff;
  margin: 0;
  flex: 1;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.card-description {
  color: #8b949e;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}

.card-subheader {
  font-size: 16px;
  font-weight: 600;
  color: #f0f6fc;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-subheader .material-symbols-outlined {
  font-size: 20px;
  color: #79c0ff;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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
  color: #79c0ff;
}

.entity-text {
  color: #c9d1d9;
  font-size: 14px;
  line-height: 1.4;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #6e7681;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-state .material-symbols-outlined {
  font-size: 24px;
}

.empty-text {
  font-size: 14px;
}

.steps-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #21262d;
}

.step-item:last-child {
  border-bottom: none;
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
  color: #c9d1d9;
  font-size: 14px;
  line-height: 1.5;
  flex: 1;
}

.status-badge,
.priority-badge {
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
.priority-badge .material-symbols-outlined {
  font-size: 14px;
}

.status-approved {
  background-color: rgba(46, 160, 67, 0.15);
  color: #7ee787;
}

.status-draft {
  background-color: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}

.status-progress {
  background-color: rgba(187, 128, 9, 0.15);
  color: #ffa657;
}

.status-failed {
  background-color: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
}

.status-conflict {
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

.card-reason,
.card-feedback {
  margin-top: 12px;
  padding: 12px;
  background-color: rgba(56, 139, 253, 0.1);
  border-radius: 6px;
  color: #c9d1d9;
  font-size: 13px;
  line-height: 1.5;
}

.card-feedback {
  background-color: rgba(187, 128, 9, 0.1);
}

.card-reason strong,
.card-feedback strong {
  color: #79c0ff;
}

.role-info {
  padding: 8px 0;
}

.role-name {
  font-weight: 600;
  color: #f0f6fc;
  font-size: 15px;
  margin-bottom: 4px;
}

.role-description {
  color: #8b949e;
  font-size: 13px;
  line-height: 1.4;
}

.context-text {
  color: #c9d1d9;
  font-size: 14px;
  line-height: 1.6;
  padding: 8px 0;
  margin-bottom: 12px;
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.metadata-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #21262d;
}

.metadata-item:last-child {
  border-bottom: none;
}

.metadata-label {
  font-weight: 600;
  color: #8b949e;
  font-size: 13px;
}

.metadata-value {
  color: #c9d1d9;
  font-size: 13px;
  font-family: monospace;
}

.conflicts-card {
  border-left: 4px solid #ffa657;
}

.conflict-header {
  color: #ffa657;
}

.conflict-item {
  padding: 12px;
  margin-bottom: 12px;
  background-color: rgba(187, 128, 9, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(187, 128, 9, 0.3);
}

.conflict-item:last-child {
  margin-bottom: 0;
}

.conflict-id {
  font-size: 12px;
  color: #ffa657;
  font-weight: 600;
  margin-bottom: 8px;
}

.conflict-use-case {
  padding: 8px;
  background-color: rgba(139, 148, 158, 0.1);
  border-radius: 4px;
  margin-bottom: 4px;
  font-size: 13px;
}

.conflict-use-case:last-child {
  margin-bottom: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }

  .card-header {
    flex-direction: column;
    gap: 12px;
  }

  .card-actions {
    align-self: flex-start;
  }

  .metadata-grid {
    grid-template-columns: 1fr;
  }
}
</style>