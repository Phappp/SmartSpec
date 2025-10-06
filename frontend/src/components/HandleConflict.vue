<template>
  <div>
    <!-- Conflict Resolution Section -->
    <div class="actions-toolbar">
      <button class="action-btn" @click="$emit('find-conflicts')" :disabled="isFindingConflicts">
        <span v-if="isFindingConflicts" class="button-spinner-small"></span>
        <span v-else class="material-symbols-outlined">rule</span>
        {{ isFindingConflicts ? 'Scanning...' : 'Find Duplicates' }}
      </button>
    </div>

    <div v-if="hasConflicts" class="conflicts-section">
      <div class="conflicts-header">
        <h3>Conflicts Detected</h3>
        <p>
          We found {{ pendingConflicts.length }} group(s) of duplicate use cases. Please select one
          version to keep from each group.
        </p>
      </div>

      <div class="conflicts-list">
        <div
          v-for="(conflict, index) in pendingConflicts"
          :key="conflict.conflict_id"
          class="conflict-item"
        >
          <div class="conflict-header">
            <h4>Conflict Group {{ index + 1 }}</h4>
            <span class="conflict-id">ID: {{ conflict.conflict_id }}</span>
          </div>

          <div class="conflict-options-grid">
            <div
              v-for="useCase in conflict.items"
              :key="useCase.id"
              class="conflict-option"
              :class="{ selected: selectedResolutions[conflict.conflict_id] === useCase.id }"
              @click="$emit('select-resolution', conflict.conflict_id, useCase.id)"
            >
              <div class="option-header">
                <span class="option-badge old">{{ useCase.id }}</span>
                <button
                  class="select-option-btn"
                  :class="{ selected: selectedResolutions[conflict.conflict_id] === useCase.id }"
                >
                  <span
                    v-if="selectedResolutions[conflict.conflict_id] === useCase.id"
                    class="material-symbols-outlined"
                    >check_circle</span
                  >
                  {{
                    selectedResolutions[conflict.conflict_id] === useCase.id
                      ? 'Selected'
                      : 'Select to Keep'
                  }}
                </button>
              </div>
              <div class="use-case-preview">
                <h5>{{ useCase.name || useCase.goal }}</h5>
                <p class="use-case-description">
                  {{ useCase.reason || 'No reason provided.' }}
                </p>
                <button class="detail-btn" @click.stop="$emit('show-detail', useCase)">
                  <span class="material-symbols-outlined">visibility</span>
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="conflicts-actions">
        <button
          class="resolve-all-btn"
          @click="$emit('resolve-all')"
          :disabled="!canResolveAllConflicts || isResolvingConflicts"
        >
          <span v-if="isResolvingConflicts" class="button-spinner-small"></span>
          {{
            isResolvingConflicts
              ? 'Resolving...'
              : `Resolve All Selected (${resolvedConflictsCount}/${pendingConflicts.length})`
          }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HandleConflict',
  props: {
    hasConflicts: {
      type: Boolean,
      default: false,
    },
    pendingConflicts: {
      type: Array,
      default: () => [],
    },
    selectedResolutions: {
      type: Object,
      default: () => ({}),
    },
    isFindingConflicts: {
      type: Boolean,
      default: false,
    },
    isResolvingConflicts: {
      type: Boolean,
      default: false,
    },
    canResolveAllConflicts: {
      type: Boolean,
      default: false,
    },
    resolvedConflictsCount: {
      type: Number,
      default: 0,
    },
  },
  emits: ['find-conflicts', 'select-resolution', 'resolve-all', 'show-detail'],
}
</script>

<style scoped>
.actions-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.action-btn {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.conflicts-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.conflicts-header h3 {
  margin: 0 0 8px 0;
  color: #dc2626;
  font-size: 20px;
}

.conflicts-header p {
  margin: 0;
  color: #6b7280;
}

.conflicts-list {
  margin: 20px 0;
}

.conflict-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  background: #f9fafb;
}

.conflict-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.conflict-header h4 {
  margin: 0;
  color: #374151;
}

.conflict-id {
  font-size: 12px;
  color: #6b7280;
  font-family: monospace;
}

.conflict-options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.conflict-option {
  background: white;
  border-radius: 8px;
  padding: 16px;
  border: 2px solid #e5e7eb;
  transition: all 0.3s ease;
  cursor: pointer;
}

.conflict-option:hover {
  border-color: #d1d5db;
}

.conflict-option.selected {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.option-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.option-badge.old {
  background: #fef3c7;
  color: #92400e;
}

.select-option-btn {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.select-option-btn:hover {
  background: #f3f4f6;
}

.select-option-btn.selected {
  background: #1a365d;
  color: white;
  border-color: #1a365d;
}

.use-case-preview h5 {
  margin: 0 0 8px 0;
  color: #111827;
  font-size: 16px;
}

.use-case-description {
  margin: 0 0 12px 0;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.4;
}

.detail-btn {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.detail-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.conflicts-actions {
  display: flex;
  justify-content: flex-end;
}

.resolve-all-btn {
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.resolve-all-btn:hover:not(:disabled) {
  background: #b91c1c;
  transform: translateY(-1px);
}

.resolve-all-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
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

@media (max-width: 768px) {
  .conflict-options-grid {
    grid-template-columns: 1fr;
  }

  .conflict-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .actions-toolbar {
    justify-content: center;
  }
}
</style>