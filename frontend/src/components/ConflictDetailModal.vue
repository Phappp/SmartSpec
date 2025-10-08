<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header">
        <h2>Use Case Details</h2>
        <div class="header-actions">
          <button
            v-if="showSkipButton"
            class="skip-conflict-btn"
            @click="$emit('skip-conflict')"
            :disabled="isSkipping"
          >
            <span v-if="isSkipping" class="button-spinner-small"></span>
            <span v-else class="material-symbols-outlined">close</span>
            {{ isSkipping ? 'Skipping...' : 'Skip Conflict' }}
          </button>
          <button class="close-btn" @click="$emit('close')">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="modal-body">
        <div class="details-grid">
          <!-- Row 1: Goal, Description, Context -->
          <div class="detail-row">
            <div class="detail-section">
              <h5>Goal</h5>
              <p>{{ useCase.goal || 'No goal specified' }}</p>
            </div>
            <div class="detail-section">
              <h5>Description</h5>
              <p>{{ useCase.reason || 'No description available' }}</p>
            </div>
            <div class="detail-section">
              <h5>Context</h5>
              <p>{{ useCase.context || 'No context specified' }}</p>
            </div>
          </div>

          <!-- Row 2: Main Flow (Full Width) -->
          <div class="detail-row">
            <div class="detail-section full-width">
              <h5>Main Flow</h5>
              <ol class="task-list">
                <li v-for="(task, i) in useCase.tasks" :key="i">{{ task }}</li>
                <li v-if="!useCase.tasks || useCase.tasks.length === 0">No tasks defined</li>
              </ol>
            </div>
          </div>

          <!-- Row 3: Preconditions & Postconditions -->
          <div class="detail-row">
            <div class="detail-section">
              <h5>Preconditions</h5>
              <ul class="condition-list">
                <li v-for="(item, i) in useCase.preconditions" :key="i">{{ item }}</li>
                <li v-if="!useCase.preconditions || useCase.preconditions.length === 0">None</li>
              </ul>
            </div>
            <div class="detail-section">
              <h5>Postconditions</h5>
              <ul class="condition-list">
                <li v-for="(item, i) in useCase.postconditions" :key="i">{{ item }}</li>
                <li v-if="!useCase.postconditions || useCase.postconditions.length === 0">None</li>
              </ul>
            </div>
          </div>

          <!-- Row 4: Inputs & Outputs -->
          <div class="detail-row">
            <div class="detail-section">
              <h5>Inputs</h5>
              <div class="tag-list">
                <span v-for="item in useCase.inputs" :key="item" class="tag tag-input">{{
                  item
                }}</span>
                <span v-if="!useCase.inputs || useCase.inputs.length === 0" class="tag tag-meta"
                  >None</span
                >
              </div>
            </div>
            <div class="detail-section">
              <h5>Outputs</h5>
              <div class="tag-list">
                <span v-for="item in useCase.outputs" :key="item" class="tag tag-output">{{
                  item
                }}</span>
                <span v-if="!useCase.outputs || useCase.outputs.length === 0" class="tag tag-meta"
                  >None</span
                >
              </div>
            </div>
          </div>

          <!-- Row 5: Triggers, Business Rules & Constraints -->
          <div class="detail-row">
            <div class="detail-section">
              <h5>Triggers</h5>
              <ul class="condition-list">
                <li v-for="(item, i) in useCase.triggers" :key="i">{{ item }}</li>
                <li v-if="!useCase.triggers || useCase.triggers.length === 0">None</li>
              </ul>
            </div>
            <div class="detail-section">
              <h5>Business Rules</h5>
              <ul class="condition-list">
                <li v-for="(item, i) in useCase.rules" :key="i">{{ item }}</li>
                <li v-if="!useCase.rules || useCase.rules.length === 0">None</li>
              </ul>
            </div>
            <div class="detail-section">
              <h5>Constraints</h5>
              <ul class="condition-list">
                <li v-for="(item, i) in useCase.constraints" :key="i">{{ item }}</li>
                <li v-if="!useCase.constraints || useCase.constraints.length === 0">None</li>
              </ul>
            </div>
          </div>

          <!-- Row 6: Exceptions (Full Width) -->
          <div class="detail-row">
            <div class="detail-section full-width">
              <h5>Exceptions</h5>
              <ul class="exception-list">
                <li v-for="(item, i) in useCase.exceptions" :key="i">
                  <span class="material-symbols-outlined">warning</span>
                  {{ item }}
                </li>
                <li v-if="!useCase.exceptions || useCase.exceptions.length === 0">
                  No exceptions defined
                </li>
              </ul>
            </div>
          </div>

          <!-- Row 7: Stakeholders & Related Use Cases -->
          <div class="detail-row">
            <div class="detail-section">
              <h5>Stakeholders</h5>
              <div class="tag-list">
                <span v-for="item in useCase.stakeholders" :key="item" class="tag tag-meta">{{
                  item
                }}</span>
                <span
                  v-if="!useCase.stakeholders || useCase.stakeholders.length === 0"
                  class="tag tag-meta"
                  >None</span
                >
              </div>
            </div>
            <div class="detail-section">
              <h5>Related Use Cases</h5>
              <div class="tag-list">
                <span
                  v-for="relatedId in useCase.related_usecases"
                  :key="relatedId"
                  class="tag tag-related"
                >
                  UC-{{ relatedId }}
                </span>
                <span
                  v-if="!useCase.related_usecases || useCase.related_usecases.length === 0"
                  class="tag tag-meta"
                  >None</span
                >
              </div>
            </div>
          </div>

          <!-- Row 8: Priority & Role -->
          <div class="detail-row">
            <div class="detail-section">
              <h5>Priority</h5>
              <p>
                <span class="priority-badge" :class="`priority-${useCase.priority || 'medium'}`">
                  {{ useCase.priority || 'Medium' }}
                </span>
              </p>
            </div>
            <div class="detail-section">
              <h5>Role</h5>
              <p>{{ useCase.role || 'No role specified' }}</p>
            </div>
          </div>

          <!-- Row 9: Feedback -->
          <div v-if="useCase.feedback" class="detail-row">
            <div class="detail-section full-width">
              <h5>Feedback</h5>
              <p>{{ useCase.feedback }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="close-button" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConflictDetailModal',
  props: {
    useCase: {
      type: Object,
      required: true,
      default: () => ({}),
    },
    showSkipButton: {
      type: Boolean,
      default: false,
    },
    isSkipping: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['close', 'skip-conflict'],
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
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 1200px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.skip-conflict-btn {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.skip-conflict-btn:hover:not(:disabled) {
  background: #e5e7eb;
  color: #374151;
}

.skip-conflict-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.close-btn {
  background: transparent;
  border: none;
  border-radius: 6px;
  padding: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
  background: white;
}

.details-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  align-items: start;
}

.detail-section {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  height: 100%;
  min-height: 120px;
  display: flex;
  flex-direction: column;
}

.detail-section.full-width {
  grid-column: 1 / -1;
}

.detail-section h5 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-section p {
  margin: 0;
  color: #4b5563;
  line-height: 1.5;
  font-size: 0.875rem;
  flex: 1;
}

.task-list,
.condition-list,
.exception-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-list {
  padding-left: 12px;
  list-style-type: decimal;
}

.task-list li,
.condition-list li {
  color: #4b5563;
  font-size: 0.875rem;
  line-height: 1.5;
}

.exception-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #dc2626;
  font-size: 0.875rem;
  line-height: 1.5;
}

.exception-list .material-symbols-outlined {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
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

.tag-related {
  background: #f3e8ff;
  color: #7c3aed;
}

.priority-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  display: inline-block;
}

.priority-high {
  background: #fee2e2;
  color: #dc2626;
}

.priority-medium {
  background: #fef3c7;
  color: #d97706;
}

.priority-low {
  background: #d1fae5;
  color: #059669;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
  background: #f8fafc;
  display: flex;
  justify-content: flex-end;
}

.close-button {
  background: #1a365d;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: #2d5aa0;
  transform: translateY(-1px);
}

.button-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
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

/* Scrollbar styling */
.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Responsive Design */
@media (max-width: 768px) {
  .modal-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .modal-content {
    max-width: 95%;
  }

  .detail-row {
    grid-template-columns: 1fr;
  }

  .detail-section {
    min-height: auto;
  }
}

@media (max-width: 480px) {
  .modal-body {
    padding: 16px;
  }

  .detail-row {
    gap: 12px;
  }
}
</style>