<template>
  <div>
    <div v-if="isProcessingFailed" class="error-banner">
      <div class="error-content">
        <span class="material-symbols-outlined error-icon">error</span>
        <div class="error-text">
          <h4>Incremental Analysis Failed</h4>
          <p>Analysis completed with errors. Please check and retry.</p>
          <small v-if="isRemoteProgress" class="remote-indicator">
            ⚠️ Failed from team member
          </small>
        </div>
        <button class="retry-btn-small" @click="$emit('retry-incremental')">
          <span class="material-symbols-outlined">refresh</span>
          Retry
        </button>
      </div>
    </div>
    <!-- Incremental Analysis Progress -->
    <div v-if="isProcessingIncremental" class="processing-banner">
      <div class="progress-content">
        <span class="material-symbols-outlined progress-icon">update</span>
        <div class="progress-text">
          <h4>Incremental Analysis in Progress</h4>
          <p>{{ currentStage }} - {{ processingProgress }}%</p>
          <small v-if="isRemoteProgress" class="remote-indicator">
            🔄 Updated from team member
          </small>
        </div>
        <div class="progress-bar-small">
          <div class="progress-fill" :style="{ width: processingProgress + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- Incremental Analysis Button -->
    <div
      v-if="showIncrementalButton && !isProcessingIncremental && !isProcessingFailed"
      class="incremental-analysis-section"
    >
      <div class="incremental-banner">
        <div class="banner-content">
          <span class="material-symbols-outlined banner-icon">update</span>
          <div class="banner-text">
            <h4>New Inputs Available</h4>
            <p>
              You have {{ unprocessedInputsCount }} unprocessed input(s). Run incremental analysis
              to update use cases.
            </p>
          </div>
        </div>
        <button
          class="incremental-btn"
          @click="$emit('start-incremental-analysis')"
          :disabled="isProcessingIncremental"
        >
          <span v-if="isProcessingIncremental" class="button-spinner-small"></span>
          {{ isProcessingIncremental ? 'Analyzing...' : 'Analyze Incremental' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'IncrementalAnalysis',
  props: {
    isProcessingIncremental: {
      type: Boolean,
      default: false,
    },
    isProcessingFailed: {
      type: Boolean,
      default: false,
    },
    showIncrementalButton: {
      type: Boolean,
      default: false,
    },
    unprocessedInputsCount: {
      type: Number,
      default: 0,
    },
    processingProgress: {
      type: Number,
      default: 0,
    },
    currentStage: {
      type: String,
      default: 'Initializing...',
    },
    isRemoteProgress: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['start-incremental-analysis', 'retry-incremental'],
}
</script>

<style scoped>
.incremental-analysis-section {
  margin-bottom: 24px;
}

.incremental-banner {
  background: linear-gradient(135deg, #24518f 0%, #30435f 100%);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.banner-icon {
  font-size: 32px;
}

.banner-text h4 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
}

.banner-text p {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
}

.incremental-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 10px 20px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.incremental-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.incremental-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.processing-banner {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 24px;
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.progress-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.progress-icon {
  font-size: 28px;
}

.progress-text {
  flex: 1;
}

.progress-text h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
}

.progress-text p {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
}

.progress-bar-small {
  width: 120px;
  height: 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-small .progress-fill {
  height: 100%;
  background: white;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.button-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
.remote-indicator {
  opacity: 0.7;
  font-size: 0.75rem;
  margin-top: 4px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.error-banner {
  background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 24px;
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
.error-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.error-icon {
  font-size: 28px;
}

.error-text {
  flex: 1;
}

.error-text h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
}

.error-text p {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
}

.retry-btn-small {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 8px 16px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
}

.retry-btn-small:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

/* Update processing banner for consistency */
.processing-banner {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 24px;
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
</style>