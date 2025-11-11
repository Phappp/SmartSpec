<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="export-progress-modal">
      <div class="modal-header">
        <h3>{{ progress.title }}</h3>
        <button
          class="btn-icon"
          @click="$emit('cancel')"
          :disabled="progress.status === 'exporting'"
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-content">
        <!-- Progress Bar -->
        <div class="progress-section">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${progress.progress}%` }"
              :class="progress.status"
            ></div>
          </div>
          <div class="progress-info">
            <span class="progress-text">{{ getStatusText() }}</span>
            <span class="progress-percentage">{{ progress.progress }}%</span>
          </div>
        </div>

        <!-- Status Messages -->
        <div class="status-section">
          <div class="status-item" :class="{ active: progress.status === 'preparing' }">
            <span class="status-icon">
              <span class="material-symbols-outlined" v-if="progress.status === 'preparing'">
                hourglass_empty
              </span>
              <span class="material-symbols-outlined" v-else-if="progress.status === 'exporting'">
                autorenew
              </span>
              <span class="material-symbols-outlined" v-else-if="progress.status === 'completed'">
                check_circle
              </span>
              <span class="material-symbols-outlined" v-else-if="progress.status === 'error'">
                error
              </span>
              <span class="material-symbols-outlined" v-else> pending </span>
            </span>
            <div class="status-info">
              <span class="status-title">{{ getStatusTitle() }}</span>
              <span class="status-description">{{ getStatusDescription() }}</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-section">
          <button
            v-if="progress.status === 'exporting'"
            class="btn-secondary"
            @click="$emit('cancel')"
          >
            <span class="material-symbols-outlined">cancel</span>
            Cancel Export
          </button>
          <button
            v-else-if="progress.status === 'completed'"
            class="btn-primary"
            @click="$emit('close')"
          >
            <span class="material-symbols-outlined">check</span>
            Done
          </button>
          <button
            v-else-if="progress.status === 'error'"
            class="btn-primary"
            @click="$emit('retry')"
          >
            <span class="material-symbols-outlined">refresh</span>
            Retry
          </button>
          <button v-else class="btn-secondary" @click="$emit('close')">
            <span class="material-symbols-outlined">close</span>
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ExportProgressModal',
  props: {
    progress: {
      type: Object,
      required: true,
      default: () => ({
        show: false,
        title: '',
        progress: 0,
        status: 'idle', // 'preparing', 'exporting', 'completed', 'error'
      }),
    },
  },
  emits: ['close', 'cancel', 'retry'],
  setup(props) {
    const getStatusText = () => {
      const statusMap = {
        preparing: 'Preparing export...',
        exporting: 'Exporting data...',
        completed: 'Export completed!',
        error: 'Export failed',
        idle: 'Ready to export',
      }
      return statusMap[props.progress.status] || 'Processing...'
    }

    const getStatusTitle = () => {
      const titleMap = {
        preparing: 'Preparing Data',
        exporting: 'Generating Report',
        completed: 'Export Complete',
        error: 'Export Failed',
        idle: 'Ready',
      }
      return titleMap[props.progress.status] || 'Processing'
    }

    const getStatusDescription = () => {
      const descMap = {
        preparing: 'Collecting and formatting test case data...',
        exporting: 'Creating Excel file with multiple sheets...',
        completed: 'Your report has been successfully generated and downloaded.',
        error: 'An error occurred during export. Please try again.',
        idle: 'Click export to begin the process.',
      }
      return descMap[props.progress.status] || 'Processing your request...'
    }

    return {
      getStatusText,
      getStatusTitle,
      getStatusDescription,
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

.export-progress-modal {
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
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.modal-content {
  padding: 1.5rem;
}

.progress-section {
  margin-bottom: 2rem;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: #1a365d;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-fill.preparing {
  background: #f59e0b;
}

.progress-fill.exporting {
  background: #3b82f6;
  animation: pulse 2s infinite;
}

.progress-fill.completed {
  background: #10b981;
}

.progress-fill.error {
  background: #ef4444;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.progress-percentage {
  font-size: 0.875rem;
  color: var(--text-primary);
  font-weight: 600;
}

.status-section {
  margin-bottom: 2rem;
}

.status-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-color);
}

.status-item.active {
  border-color: #1a365d;
  background: rgba(26, 54, 93, 0.05);
}

.status-icon {
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

.status-item.preparing .status-icon {
  background: #f59e0b;
}

.status-item.exporting .status-icon {
  background: #3b82f6;
}

.status-item.completed .status-icon {
  background: #10b981;
}

.status-item.error .status-icon {
  background: #ef4444;
}

.status-info {
  flex: 1;
}

.status-title {
  display: block;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.status-description {
  display: block;
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.action-section {
  display: flex;
  justify-content: center;
}

.action-section .btn-primary,
.action-section .btn-secondary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
}

@media (max-width: 768px) {
  .export-progress-modal {
    width: 95%;
    margin: 1rem;
  }

  .modal-header,
  .modal-content {
    padding: 1rem;
  }

  .status-item {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }

  .status-icon {
    align-self: center;
  }
}
</style>