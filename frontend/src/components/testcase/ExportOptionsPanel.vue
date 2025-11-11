<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="export-modal">
      <div class="modal-header">
        <h3>Export Test Cases</h3>
        <button class="btn-icon close-btn" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-content">
        <div class="export-description">
          <p>Export all test cases with detailed information to Excel format</p>
        </div>

        <!-- Export Options -->
        <div class="export-options">
          <div class="option-group">
            <label class="option-label">Export Format</label>
            <div class="option-cards">
              <div class="option-card active">
                <div class="option-icon">
                  <span class="material-symbols-outlined">description</span>
                </div>
                <div class="option-info">
                  <h4>Detailed Excel Report</h4>
                  <p>Complete test case information with all details</p>
                </div>
              </div>
            </div>
          </div>

          <div class="option-group">
            <label class="option-label">Data Selection</label>
            <div class="checkbox-options">
              <label class="checkbox-option">
                <input type="checkbox" v-model="includeSteps" />
                <span class="checkmark"></span>
                Include test steps
              </label>
              <label class="checkbox-option">
                <input type="checkbox" v-model="includeExecutionHistory" />
                <span class="checkmark"></span>
                Include execution history
              </label>
              <label class="checkbox-option">
                <input type="checkbox" v-model="includeAttachments" />
                <span class="checkmark"></span>
                Include attachment references
              </label>
            </div>
          </div>

          <div class="option-group">
            <label class="option-label">Apply Current Filters</label>
            <div class="filter-info">
              <span class="filter-status">
                {{ hasActiveFilters ? 'Current filters will be applied' : 'No active filters' }}
              </span>
              <button v-if="hasActiveFilters" class="btn-text" @click="$emit('clearFilters')">
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="modal-actions">
          <button class="btn-secondary" @click="$emit('close')">Cancel</button>
          <button class="btn-primary export-action" @click="handleExport" :disabled="loading">
            <span class="material-symbols-outlined" v-if="!loading">download</span>
            <span class="spinner-small" v-else></span>
            {{ loading ? 'Exporting...' : 'Export Test Cases' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'

export default {
  name: 'ExportOptionsPanel',
  props: {
    projectId: {
      type: String,
      required: true,
    },
    versionId: {
      type: String,
      default: null,
    },
    filters: {
      type: Object,
      default: () => ({}),
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['export', 'close', 'clearFilters'],
  setup(props, { emit }) {
    const toast = useToast()

    const includeSteps = ref(true)
    const includeExecutionHistory = ref(true)
    const includeAttachments = ref(false)

    const hasActiveFilters = computed(() => {
      return Object.keys(props.filters).some(
        (key) =>
          props.filters[key] !== undefined &&
          props.filters[key] !== null &&
          props.filters[key] !== ''
      )
    })

    const handleExport = () => {
      if (!props.projectId) {
        toast.error('Project ID is required for export')
        return
      }

      const exportConfig = {
        type: 'testcases',
        title: 'Test Cases Export',
        options: {
          ...props.filters,
          versionId: props.versionId,
          includeSteps: includeSteps.value,
          includeExecutionHistory: includeExecutionHistory.value,
          includeAttachments: includeAttachments.value,
        },
      }

      emit('export', exportConfig)
    }

    return {
      includeSteps,
      includeExecutionHistory,
      includeAttachments,
      hasActiveFilters,
      handleExport,
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
}

.export-modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a365d;
  margin: 0;
}

.close-btn {
  color: #6b7280;
}

.close-btn:hover {
  color: #374151;
  background: #f3f4f6;
}

.modal-content {
  padding: 1.5rem;
}

.export-description {
  text-align: center;
  margin-bottom: 1.5rem;
}

.export-description p {
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.option-cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  transition: all 0.2s ease;
  cursor: pointer;
}

.option-card.active {
  border-color: #1a365d;
  background: #f8fafc;
}

.option-card:hover:not(.active) {
  border-color: #cbd5e1;
}

.option-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a365d;
  color: white;
  flex-shrink: 0;
}

.option-info h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a365d;
  margin: 0 0 0.25rem 0;
}

.option-info p {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
}

.checkbox-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  color: #374151;
  font-size: 0.875rem;
}

.checkbox-option input {
  display: none;
}

.checkmark {
  width: 18px;
  height: 18px;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.checkbox-option input:checked + .checkmark {
  background: #1a365d;
  border-color: #1a365d;
}

.checkbox-option input:checked + .checkmark::after {
  content: '✓';
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.filter-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.filter-status {
  font-size: 0.875rem;
  color: #6b7280;
}

.btn-text {
  background: none;
  border: none;
  color: #1a365d;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.btn-text:hover {
  background: #e5e7eb;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn-primary,
.btn-secondary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.btn-primary {
  background: #1a365d;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #27446c;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.export-action {
  min-width: 140px;
  justify-content: center;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid white;
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

@media (max-width: 768px) {
  .export-modal {
    width: 95%;
    margin: 1rem;
  }

  .modal-header,
  .modal-content {
    padding: 1rem;
  }

  .modal-actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    justify-content: center;
  }
}
</style>