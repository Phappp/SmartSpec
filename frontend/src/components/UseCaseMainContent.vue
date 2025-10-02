<template>
  <div class="main-content">
    <div class="usecase-area">
      <div class="usecase-header">
        <h2>
          Use Cases <span class="counter-badge">{{ useCases.length }}</span>
        </h2>
      </div>
      <div v-for="(group, role) in groupedUseCases" :key="role" class="usecase-group">
        <h3 class="group-title">{{ role }}</h3>
        <ul class="usecase-list">
          <li v-for="uc in group" :key="uc.id" class="usecase-item" @click="toggleUseCase(uc.id)">
            <div class="usecase-summary">
              <div class="summary-left">
                <span class="usecase-id">[{{ uc.id }}]</span>
                <span class="usecase-name">{{ uc.name }}</span>
              </div>
              <span class="usecase-role">{{ uc.role }}</span>
            </div>
            <div v-if="expandedUseCaseId === uc.id" class="usecase-detail">
              <div class="usecase-grid">
                <div class="usecase-section span-2">
                  <h4>Goal</h4>
                  <p>{{ uc.goal }}</p>
                </div>
                <div class="usecase-section span-1">
                  <h4>Priority</h4>
                  <p>
                    <span :class="['priority-badge', `priority-${uc.priority}`]">{{
                      uc.priority
                    }}</span>
                  </p>
                </div>
                <div class="usecase-section span-3">
                  <h4>Reason</h4>
                  <p>{{ uc.reason }}</p>
                </div>

                <div class="usecase-section">
                  <h4>Preconditions</h4>
                  <ul class="detail-list">
                    <li v-for="(item, i) in uc.preconditions" :key="i">{{ item }}</li>
                    <li v-if="!uc.preconditions || uc.preconditions.length === 0">None</li>
                  </ul>
                </div>
                <div class="usecase-section">
                  <h4>Postconditions</h4>
                  <ul class="detail-list">
                    <li v-for="(item, i) in uc.postconditions" :key="i">{{ item }}</li>
                    <li v-if="!uc.postconditions || uc.postconditions.length === 0">None</li>
                  </ul>
                </div>
                <div class="usecase-section">
                  <h4>Triggers</h4>
                  <ul class="detail-list">
                    <li v-for="(item, i) in uc.triggers" :key="i">{{ item }}</li>
                    <li v-if="!uc.triggers || uc.triggers.length === 0">None</li>
                  </ul>
                </div>

                <div class="usecase-section span-3">
                  <h4>Tasks (Main Flow)</h4>
                  <ol class="detail-list ordered">
                    <li v-for="(task, i) in uc.tasks" :key="i">{{ task }}</li>
                  </ol>
                </div>

                <div class="usecase-section">
                  <h4>Inputs</h4>
                  <div class="tag-list">
                    <span v-for="item in uc.inputs" :key="item" class="tag tag-input">{{
                      item
                    }}</span>
                  </div>
                </div>
                <div class="usecase-section">
                  <h4>Outputs</h4>
                  <div class="tag-list">
                    <span v-for="item in uc.outputs" :key="item" class="tag tag-output">{{
                      item
                    }}</span>
                  </div>
                </div>
                <div class="usecase-section">
                  <h4>Context</h4>
                  <p>{{ uc.context }}</p>
                </div>

                <div class="usecase-section span-2">
                  <h4>Business Rules</h4>
                  <ul class="detail-list">
                    <li v-for="(item, i) in uc.rules" :key="i">{{ item }}</li>
                  </ul>
                </div>
                <div class="usecase-section">
                  <h4>Constraints</h4>
                  <ul class="detail-list">
                    <li v-for="(item, i) in uc.constraints" :key="i">{{ item }}</li>
                  </ul>
                </div>

                <div class="usecase-section span-3">
                  <h4>Exceptions (Alternate Flows)</h4>
                  <ul class="detail-list exception">
                    <li v-for="(item, i) in uc.exceptions" :key="i">
                      <span class="material-symbols-outlined">error</span>{{ item }}
                    </li>
                  </ul>
                </div>

                <div class="usecase-section">
                  <h4>Stakeholders</h4>
                  <div class="tag-list">
                    <span v-for="item in uc.stakeholders" :key="item" class="tag tag-meta">{{
                      item
                    }}</span>
                  </div>
                </div>
                <div class="usecase-section">
                  <h4>Related Usecases</h4>
                  <div class="tag-list">
                    <span v-for="item in uc.related_usecases" :key="item" class="tag tag-meta">{{
                      item
                    }}</span>
                  </div>
                </div>
                <div class="usecase-section">
                  <h4>Feedback</h4>
                  <p>{{ uc.feedback }}</p>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UseCaseMainContent',
  props: {
    useCases: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      expandedUseCaseId: null,
    }
  },
  computed: {
    groupedUseCases() {
      if (!this.useCases || this.useCases.length === 0) {
        return {}
      }
      return this.useCases.reduce((groups, uc) => {
        const role = uc.role || 'Undefined'
        if (!groups[role]) {
          groups[role] = []
        }
        groups[role].push(uc)
        return groups
      }, {})
    },
  },
  methods: {
    toggleUseCase(useCaseId) {
      this.expandedUseCaseId = this.expandedUseCaseId === useCaseId ? null : useCaseId
    },
  },
}
</script>

<style scoped>
.main-content {
  flex: 3;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 20px;
  overflow-y: auto;
}

.usecase-header {
  display: flex;
  justify-content: left;
  align-items: center;
  margin-bottom: 20px;
  font-weight: bold;
  font-size: 100%;
}

.usecase-header h2 {
  font-weight: bold;
}

.usecase-header span {
  font-size: 18px;
}

.counter-badge {
  padding: 2px 8px;
  background: #e2e8f0;
  color: #475569;
  border-radius: 12px;
  font-weight: 600;
  margin-left: 8px;
}

.usecase-area h2 {
  margin-top: 0;
  margin-bottom: 0;
  color: #111827;
}

.usecase-group {
  margin-bottom: 25px;
}

.group-title {
  font-size: 16px;
  font-weight: bold;
  color: #374151;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 12px;
  text-transform: capitalize;
  background-color: #2222221a;
  padding: 6px 12px;
  border-radius: 5px;
}

.usecase-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.usecase-item {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 10px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.usecase-item:hover {
  border-color: #9ca3af;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.usecase-summary {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.usecase-id {
  font-family: monospace;
  font-size: 14px;
  color: #6b7280;
}

.usecase-name {
  font-weight: 600;
  color: #1f2937;
}

.usecase-role {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 12px;
  background-color: #e0e7ff;
  color: #4338ca;
  font-weight: 500;
}

.usecase-detail {
  padding: 16px;
  border-top: 1px solid #e5e7eb;
  margin-top: 12px;
}

.usecase-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.usecase-section {
  background: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  font-size: 14px;
}

.usecase-section.span-1 {
  grid-column: span 1;
}

.usecase-section.span-2 {
  grid-column: span 2;
}

.usecase-section.span-3 {
  grid-column: span 3;
}

.usecase-section h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.usecase-section p {
  margin: 0;
  line-height: 1.5;
  color: #4b5563;
}

.detail-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-list.ordered {
  padding-left: 20px;
  list-style-type: decimal;
}

.detail-list li {
  line-height: 1.5;
  color: #4b5563;
}

.detail-list.exception li {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #b91c1c;
}

.detail-list.exception .material-symbols-outlined {
  font-size: 16px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.tag-input {
  background: #e0e7ff;
  color: #3730a3;
}

.tag-output {
  background: #d1fae5;
  color: #065f46;
}

.tag-meta {
  background: #e5e7eb;
  color: #374151;
}

.priority-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
}

.priority-high {
  background-color: #fee2e2;
  color: #b91c1c;
}

.priority-medium {
  background-color: #fef3c7;
  color: #b45309;
}

.priority-low {
  background-color: #dbeafe;
  color: #1e40af;
}

@media (max-width: 1200px) {
  .usecase-grid {
    grid-template-columns: 1fr 1fr;
  }
  .usecase-section.span-3 {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .usecase-grid {
    grid-template-columns: 1fr;
  }
  .usecase-section.span-2,
  .usecase-section.span-3 {
    grid-column: span 1;
  }

  .usecase-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
</style>