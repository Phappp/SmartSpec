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
    <!-- Incremental Analysis Loading -->
    <div v-if="isProcessingIncremental" class="processing-banner">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">
          <h4>Incremental Analysis in Progress</h4>
          <p>Please wait while we analyze your inputs...</p>
          <small v-if="isRemoteProgress" class="remote-indicator">
            🔄 Updated from team member
          </small>
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
    isRemoteProgress: {
      type: Boolean,
      default: false,
    },
  },
  watch: {
    unprocessedInputsCount: {
      handler(newCount, oldCount) {
        // Tự động cập nhật hiển thị nút khi số lượng thay đổi
        if (newCount > 0 && !this.isProcessingIncremental && !this.isProcessingFailed) {
          this.$emit('update-button-visibility', true)
        }
      },
      immediate: true,
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
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
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

.loading-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  flex: 1;
}

.loading-text h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
}

.loading-text p {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
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