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
      <p class="card-description">{{ data.description }}</p>
    </div>

    <!-- Two Column Layout -->
    <div class="grid-2">
      <!-- Actors Card -->
      <div class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">people</i>
          Actors
        </h4>
        <ul class="entity-list">
          <li v-for="actor in data.actors" :key="actor" class="entity-item">
            <i class="material-symbols-outlined entity-icon">person</i>
            <span class="entity-text">{{ actor }}</span>
          </li>
        </ul>
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

    <!-- Main Flow Card -->
    <div class="card">
      <h4 class="card-subheader">
        <i class="material-symbols-outlined">play_arrow</i>
        Main Flow
      </h4>
      <ol class="steps-list">
        <li v-for="(step, index) in data.mainFlow" :key="index" class="step-item">
          <div class="step-number">{{ index + 1 }}</div>
          <div class="step-content">{{ step }}</div>
        </li>
      </ol>
    </div>

    <!-- Postconditions Card (if exists) -->
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
      }
      return statusMap[props.data.status] || 'status-default'
    })

    const statusIcon = computed(() => {
      const iconMap = {
        approved: 'verified',
        draft: 'edit',
        in_progress: 'schedule',
      }
      return iconMap[props.data.status] || 'help'
    })

    const statusText = computed(() => {
      const statusMap = {
        approved: 'Approved',
        draft: 'Draft',
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

    return {
      statusClass,
      statusIcon,
      statusText,
      priorityClass,
      priorityText,
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
</style>