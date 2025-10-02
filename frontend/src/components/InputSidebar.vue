<template>
  <div class="sidebar">
    <div class="sidebar-item">
      <div class="sidebar-header">
        <h3>
          Inputs <span class="counter-badge">{{ inputs.length }}</span>
        </h3>

        <button class="add-input-btn" @click="$emit('add-input-click')">
          <span class="material-symbols-outlined">add</span>
        </button>
      </div>
      <ul class="file-list">
        <li
          v-for="input in inputs"
          :key="input._id"
          class="expandable-input-item"
          @click="toggleInput(input._id)"
        >
          <div class="input-summary">
            <div class="input-status">
              <span
                class="status-dot"
                :class="{ processed: input.is_processed, 'not-processed': !input.is_processed }"
                :title="input.is_processed ? 'Processed' : 'Not Processed'"
              ></span>
              <span class="material-symbols-outlined file-icon">notes</span>
            </div>
            <div class="input-info">
              <div class="input-main">
                <span class="clean-text">{{ getCleanText(input) }}</span>
              </div>
              <div class="input-meta">
                <span class="input-type">{{ input.type }}</span>
                <span class="input-language">{{ getLanguage(input) }}</span>
                <span class="input-date">{{ formatDate(input.updated_at) }}</span>
              </div>
            </div>
            <div class="quality-score">
              <div class="score-circle">
                <svg width="40" height="40" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="18" fill="none" stroke="#e5e7eb" stroke-width="4" />
                  <circle
                    cx="20"
                    cy="20"
                    r="18"
                    fill="none"
                    stroke="#10b981"
                    :stroke-dasharray="113.097"
                    :stroke-dashoffset="113.097 - 113.097 * getQualityScore(input)"
                    stroke-width="4"
                    stroke-linecap="round"
                    transform="rotate(-90 20 20)"
                  />
                </svg>
                <span class="score-text">{{ Math.round(getQualityScore(input) * 100) }}%</span>
              </div>
            </div>
            <button
              class="delete-input-btn"
              @click.stop="$emit('delete-input', input._id)"
              :disabled="isDeletingInput === input._id"
              :title="`Delete ${input.type} input`"
            >
              <span v-if="isDeletingInput === input._id" class="button-spinner-small"></span>
              <span v-else class="material-symbols-outlined">delete</span>
            </button>
          </div>
          <div v-if="expandedInputId === input._id" class="input-detail">
            <div class="input-details">
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">
                  <span
                    class="status-badge"
                    :class="{
                      processed: input.is_processed,
                      'not-processed': !input.is_processed,
                    }"
                  >
                    {{ input.is_processed ? 'Processed' : 'Not Processed' }}
                  </span>
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Type:</span>
                <span class="detail-value">{{ input.type }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Language:</span>
                <span class="detail-value">{{ getLanguage(input) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Updated:</span>
                <span class="detail-value">{{ formatDateTime(input.updated_at) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Quality:</span>
                <span class="detail-value">{{ Math.round(getQualityScore(input) * 100) }}%</span>
              </div>
              <div class="detail-row full-width">
                <span class="detail-label">Content:</span>
                <span class="detail-value content-text">{{ getCleanText(input) }}</span>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InputSidebar',
  props: {
    inputs: {
      type: Array,
      default: () => [],
    },
    isDeletingInput: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      expandedInputId: null,
    }
  },
  methods: {
    toggleInput(inputId) {
      this.expandedInputId = this.expandedInputId === inputId ? null : inputId
    },
    getCleanText(input) {
      return input.cleaned_text || input.clean_text || input.raw_text || 'No content available'
    },
    getLanguage(input) {
      return input.metadata?.language || input.language || 'Unknown'
    },
    getQualityScore(input) {
      return input.quality_score || 0
    },
    formatDate(dateString) {
      if (!dateString) return 'N/A'
      return new Date(dateString).toLocaleDateString('en-US')
    },
    formatDateTime(dateString) {
      if (!dateString) return 'N/A'
      return new Date(dateString).toLocaleString('en-US')
    },
  },
}
</script>

<style scoped>
.sidebar {
  flex: 1;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 20px;
}

.sidebar-item {
  margin-bottom: 25px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.sidebar-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 0;
  color: #111827;
}

.counter-badge {
  padding: 2px 8px;
  background: #e2e8f0;
  color: #475569;
  border-radius: 12px;
  font-weight: 600;
  margin-left: 8px;
}

.add-input-btn {
  background: linear-gradient(90deg, #1a365d6a, #2c52829a);
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(10px);
  color: #ffffff;
  border: 1px solid #c1bdbd1a;
  border-radius: 6px;
  padding: 4px 12px;
  font-weight: 600;
  cursor: pointer;
  align-self: center;
  box-shadow: 0 4px 6px rgba(77, 77, 77, 0.7);
}

.add-input-btn:hover {
  background: linear-gradient(90deg, #1a365d8a, #2c5282);
}

.add-input-btn span {
  font-size: 24px;
  transition: 0.2s ease;
}

.add-input-btn:hover span {
  transform: rotate(90deg);
}

.file-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.expandable-input-item {
  background: #f9fafb;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  border: 1px solid transparent;
  transition: border-color 0.2s ease;
}

.expandable-input-item:hover {
  border-color: #d1d5db;
}

.input-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
}

.input-status {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.processed {
  background-color: #10b981;
  box-shadow: 0 0 4px rgba(16, 185, 129, 0.4);
}

.status-dot.not-processed {
  background-color: #ef4444;
  box-shadow: 0 0 4px rgba(239, 68, 68, 0.4);
}

.file-icon {
  font-size: 18px;
  color: #6b7280;
}

.input-info {
  flex: 1;
  min-width: 0;
}

.input-main {
  margin-bottom: 4px;
  max-width: 200px;
}

.clean-text {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  color: #1f2937;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  pointer-events: none;
  user-select: none;
  overflow: hidden;
  text-overflow: ellipsis;
}

.input-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #6b7280;
}

.input-type,
.input-language,
.input-date {
  background: #e5e7eb;
  padding: 2px 6px;
  border-radius: 4px;
}

.quality-score {
  flex-shrink: 0;
}

.score-circle {
  position: relative;
  width: 40px;
  height: 40px;
}

.score-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 10px;
  font-weight: 600;
  color: #059669;
}

.delete-input-btn {
  background: transparent;
  border: none;
  border-radius: 4px;
  padding: 4px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-input-btn:hover:not(:disabled) {
  background: #fee2e2;
  color: #dc2626;
}

.delete-input-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.button-spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top: 2px solid #dc2626;
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

.input-detail {
  padding: 12px;
  border-top: 1px solid #e5e7eb;
  background: white;
  border-radius: 0 0 6px 6px;
}

.input-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.detail-row.full-width {
  flex-direction: column;
  align-items: stretch;
}

.detail-label {
  font-weight: 600;
  color: #374151;
  min-width: 60px;
  font-size: 12px;
}

.detail-value {
  color: #6b7280;
  font-size: 12px;
  word-break: break-word;
}

.detail-row.full-width .detail-value {
  margin-top: 4px;
}

.content-text {
  background: #f3f4f6;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  font-family: monospace;
  font-size: 11px;
  line-height: 1.4;
  max-height: 120px;
  overflow-y: auto;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.processed {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.not-processed {
  background: #fee2e2;
  color: #b91c1c;
}

@media (max-width: 768px) {
  .input-summary {
    flex-wrap: wrap;
    gap: 8px;
  }

  .quality-score {
    order: 1;
    margin-left: auto;
  }

  .delete-input-btn {
    order: 2;
  }

  .input-meta {
    flex-wrap: wrap;
    gap: 4px;
  }
}
</style>