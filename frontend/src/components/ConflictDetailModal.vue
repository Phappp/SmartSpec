<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header">
        <h2>Use Case Details</h2>
        <button class="close-btn" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Content -->
      <div class="modal-body">
        <!-- Use Case Name -->
        <div class="detail-section">
          <h3 class="section-title">Use Case Name</h3>
          <p class="detail-content">{{ useCase.use_case_name || 'N/A' }}</p>
        </div>

        <!-- Description -->
        <div class="detail-section">
          <h3 class="section-title">Description</h3>
          <p class="detail-content">{{ useCase.description || 'No description available' }}</p>
        </div>

        <!-- Actors -->
        <div class="detail-section">
          <h3 class="section-title">Actors</h3>
          <div class="actors-list">
            <span v-for="actor in useCase.actors" :key="actor" class="actor-tag">
              {{ actor }}
            </span>
            <span v-if="!useCase.actors || useCase.actors.length === 0" class="no-data">
              No actors specified
            </span>
          </div>
        </div>

        <!-- Preconditions -->
        <div class="detail-section">
          <h3 class="section-title">Preconditions</h3>
          <ul class="preconditions-list">
            <li
              v-for="(precondition, index) in useCase.preconditions"
              :key="index"
              class="precondition-item"
            >
              {{ precondition }}
            </li>
            <li v-if="!useCase.preconditions || useCase.preconditions.length === 0" class="no-data">
              No preconditions specified
            </li>
          </ul>
        </div>

        <!-- Postconditions -->
        <div class="detail-section">
          <h3 class="section-title">Postconditions</h3>
          <ul class="postconditions-list">
            <li
              v-for="(postcondition, index) in useCase.postconditions"
              :key="index"
              class="postcondition-item"
            >
              {{ postcondition }}
            </li>
            <li
              v-if="!useCase.postconditions || useCase.postconditions.length === 0"
              class="no-data"
            >
              No postconditions specified
            </li>
          </ul>
        </div>

        <!-- Normal Flow -->
        <div class="detail-section">
          <h3 class="section-title">Normal Flow</h3>
          <ol class="flow-list">
            <li v-for="(step, index) in useCase.normal_flow" :key="index" class="flow-step">
              {{ step }}
            </li>
            <li v-if="!useCase.normal_flow || useCase.normal_flow.length === 0" class="no-data">
              No normal flow steps specified
            </li>
          </ol>
        </div>

        <!-- Alternative Flows -->
        <div
          v-if="useCase.alternative_flows && useCase.alternative_flows.length > 0"
          class="detail-section"
        >
          <h3 class="section-title">Alternative Flows</h3>
          <div
            v-for="(flow, index) in useCase.alternative_flows"
            :key="index"
            class="alternative-flow"
          >
            <h4 class="alternative-flow-title">
              {{ flow.flow_name || `Alternative Flow ${index + 1}` }}
            </h4>
            <ol class="flow-list">
              <li v-for="(step, stepIndex) in flow.steps" :key="stepIndex" class="flow-step">
                {{ step }}
              </li>
            </ol>
          </div>
        </div>

        <!-- Exception Flows -->
        <div
          v-if="useCase.exception_flows && useCase.exception_flows.length > 0"
          class="detail-section"
        >
          <h3 class="section-title">Exception Flows</h3>
          <div v-for="(flow, index) in useCase.exception_flows" :key="index" class="exception-flow">
            <h4 class="exception-flow-title">
              {{ flow.flow_name || `Exception Flow ${index + 1}` }}
            </h4>
            <ol class="flow-list">
              <li v-for="(step, stepIndex) in flow.steps" :key="stepIndex" class="flow-step">
                {{ step }}
              </li>
            </ol>
          </div>
        </div>

        <!-- Includes -->
        <div v-if="useCase.includes && useCase.includes.length > 0" class="detail-section">
          <h3 class="section-title">Includes</h3>
          <div class="includes-list">
            <span v-for="include in useCase.includes" :key="include" class="include-tag">
              {{ include }}
            </span>
          </div>
        </div>

        <!-- Extends -->
        <div v-if="useCase.extends && useCase.extends.length > 0" class="detail-section">
          <h3 class="section-title">Extends</h3>
          <div class="extends-list">
            <span v-for="extend in useCase.extends" :key="extend" class="extend-tag">
              {{ extend }}
            </span>
          </div>
        </div>

        <!-- Priority -->
        <div class="detail-section">
          <h3 class="section-title">Priority</h3>
          <p class="detail-content">
            <span
              :class="['priority-badge', `priority-${useCase.priority?.toLowerCase() || 'medium'}`]"
            >
              {{ useCase.priority || 'Medium' }}
            </span>
          </p>
        </div>

        <!-- Status -->
        <div class="detail-section">
          <h3 class="section-title">Status</h3>
          <p class="detail-content">
            <span :class="['status-badge', `status-${useCase.status?.toLowerCase() || 'draft'}`]">
              {{ useCase.status || 'Draft' }}
            </span>
          </p>
        </div>

        <!-- Notes -->
        <div v-if="useCase.notes" class="detail-section">
          <h3 class="section-title">Notes</h3>
          <p class="detail-content">{{ useCase.notes }}</p>
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
  },
  emits: ['close'],
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
  max-width: 800px;
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

.detail-section {
  margin-bottom: 24px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
}

.detail-content {
  margin: 0;
  color: #4b5563;
  line-height: 1.6;
  font-size: 14px;
}

.actors-list,
.includes-list,
.extends-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.actor-tag,
.include-tag,
.extend-tag {
  background: #e0e7ff;
  color: #3730a3;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}

.preconditions-list,
.postconditions-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.precondition-item,
.postcondition-item {
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.5;
}

.precondition-item:last-child,
.postcondition-item:last-child {
  border-bottom: none;
}

.flow-list {
  list-style: none;
  padding: 0;
  margin: 0;
  counter-reset: flow-counter;
}

.flow-step {
  counter-increment: flow-counter;
  padding: 12px 0 12px 36px;
  border-bottom: 1px solid #f3f4f6;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.5;
  position: relative;
}

.flow-step:last-child {
  border-bottom: none;
}

.flow-step::before {
  content: counter(flow-counter);
  position: absolute;
  left: 0;
  top: 12px;
  width: 24px;
  height: 24px;
  background: #1a365d;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.alternative-flow,
.exception-flow {
  margin-bottom: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
}

.alternative-flow:last-child,
.exception-flow:last-child {
  margin-bottom: 0;
}

.alternative-flow-title,
.exception-flow-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.alternative-flow .flow-list,
.exception-flow .flow-list {
  margin: 0;
}

.alternative-flow .flow-step,
.exception-flow .flow-step {
  padding-left: 32px;
  border-bottom-color: #e5e7eb;
}

.alternative-flow .flow-step::before,
.exception-flow .flow-step::before {
  background: #3b82f6;
  width: 20px;
  height: 20px;
  top: 12px;
  font-size: 11px;
}

.priority-badge,
.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
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

.status-draft {
  background: #f3f4f6;
  color: #6b7280;
}

.status-approved {
  background: #d1fae5;
  color: #059669;
}

.status-rejected {
  background: #fee2e2;
  color: #dc2626;
}

.status-in-review {
  background: #fef3c7;
  color: #d97706;
}

.no-data {
  color: #9ca3af;
  font-style: italic;
  font-size: 14px;
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
</style>