<template>
  <div class="handle-conflict-view">
    <!-- Conflict Resolution Section -->
    <div class="content-header">
      <div class="header-info">
        <h2>Conflict Resolution</h2>
        <p>Manage duplicate use cases in your project</p>
      </div>
      <div class="header-actions">
        <button class="btn-primary" @click="$emit('find-conflicts')" :disabled="isFindingConflicts">
          <span v-if="isFindingConflicts" class="button-spinner-small"></span>
          <span v-else class="material-symbols-outlined">rule</span>
          {{ isFindingConflicts ? 'Scanning...' : 'Scan for Duplicates' }}
        </button>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="stats-grid" v-if="hasConflicts">
      <div class="stat-card total">
        <div class="stat-icon">
          <span class="material-symbols-outlined">warning</span>
        </div>
        <div class="stat-info">
          <h3>{{ pendingConflicts.length }}</h3>
          <p>Total Conflicts</p>
        </div>
      </div>
      <div class="stat-card resolved">
        <div class="stat-icon">
          <span class="material-symbols-outlined">check_circle</span>
        </div>
        <div class="stat-info">
          <h3>{{ resolvedConflictsCount }}</h3>
          <p>Resolved</p>
        </div>
      </div>
      <div class="stat-card pending">
        <div class="stat-icon">
          <span class="material-symbols-outlined">schedule</span>
        </div>
        <div class="stat-info">
          <h3>{{ pendingConflicts.length - resolvedConflictsCount }}</h3>
          <p>Pending</p>
        </div>
      </div>
      <div class="stat-card progress">
        <div class="stat-icon">
          <span class="material-symbols-outlined">trending_up</span>
        </div>
        <div class="stat-info">
          <h3>{{ Math.round((resolvedConflictsCount / pendingConflicts.length) * 100) || 0 }}%</h3>
          <p>Completion</p>
        </div>
      </div>
    </div>

    <div v-if="hasConflicts" class="conflicts-section">
      <div class="section-header">
        <h3>Duplicate Use Cases Detected</h3>
        <p>
          We found {{ pendingConflicts.length }} group(s) of duplicate use cases. Please select one
          version to keep from each group, or skip conflicts you want to handle later.
        </p>
      </div>

      <div class="conflicts-list">
        <div
          v-for="(conflict, index) in pendingConflicts"
          :key="conflict.conflict_id"
          class="conflict-item"
        >
          <div class="conflict-header">
            <div class="conflict-title">
              <h4>Conflict Group {{ index + 1 }}</h4>
              <span class="conflict-id">ID: {{ conflict.conflict_id }}</span>
            </div>
            <div class="conflict-actions">
              <button
                class="btn-secondary"
                @click="$emit('skip-conflict', conflict.conflict_id)"
                :disabled="isSkippingConflict"
                title="Skip this conflict for now"
              >
                <span class="material-symbols-outlined">close</span>
                Skip
              </button>
            </div>
          </div>

          <div class="conflict-options-grid">
            <div
              v-for="useCase in conflict.items"
              :key="getUsecaseId(useCase)"
              class="conflict-option"
              :class="{ selected: selectedResolutions[conflict.conflict_id] === getUsecaseId(useCase) }"
              @click="$emit('select-resolution', conflict.conflict_id, getUsecaseId(useCase))"
            >
              <div class="option-header">
                <span class="option-badge">ID: {{ getUsecaseId(useCase) }}</span>
                <button
                  class="select-btn"
                  :class="{ selected: selectedResolutions[conflict.conflict_id] === getUsecaseId(useCase) }"
                >
                  <span
                    v-if="selectedResolutions[conflict.conflict_id] === getUsecaseId(useCase)"
                    class="material-symbols-outlined"
                    >check_circle</span
                  >
                  <span v-else class="material-symbols-outlined">radio_button_unchecked</span>
                  {{
                    selectedResolutions[conflict.conflict_id] === getUsecaseId(useCase) ? 'Selected' : 'Select'
                  }}
                </button>
              </div>
              <div class="use-case-preview">
                <h5>{{ useCase.name || useCase.goal }}</h5>
                <p class="use-case-description">
                  {{ useCase.reason || 'No description provided.' }}
                </p>
                <div class="use-case-actions">
                  <button class="btn-outline" @click.stop="$emit('show-detail', useCase)">
                    <span class="material-symbols-outlined">visibility</span>
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="conflicts-footer">
        <div class="footer-info">
          <span class="resolved-count">
            Resolved: <strong>{{ resolvedConflictsCount }}/{{ pendingConflicts.length }}</strong>
          </span>
          <span class="completion-text">
            {{ completionStatus }}
          </span>
        </div>
        <div class="footer-actions">
          <button
            class="btn-resolve"
            @click="$emit('resolve-all')"
            :disabled="!canResolveAllConflicts || isResolvingConflicts"
          >
            <span v-if="isResolvingConflicts" class="button-spinner-small"></span>
            <span v-else class="material-symbols-outlined">checklist</span>
            {{ isResolvingConflicts ? 'Resolving...' : `Resolve All (${resolvedConflictsCount})` }}
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <span class="material-symbols-outlined">check_circle</span>
      </div>
      <h3>No Conflicts Found</h3>
      <p>Your project use cases are clean and free of duplicates.</p>
      <!-- <button class="btn-primary" @click="$emit('find-conflicts')">
        <span class="material-symbols-outlined">search</span>
        Scan for Duplicates
      </button> -->
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
    isSkippingConflict: {
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
  emits: ['find-conflicts', 'select-resolution', 'resolve-all', 'show-detail', 'skip-conflict'],
  computed: {
    completionStatus() {
      const percentage = Math.round(
        (this.resolvedConflictsCount / this.pendingConflicts.length) * 100
      )
      if (percentage === 0) return 'No conflicts resolved yet'
      if (percentage === 100) return 'All conflicts resolved!'
      return `${percentage}% complete`
    },
  },
  methods: {
    // Helper: Get usecase ID (support both _id and id for backward compatibility)
    getUsecaseId(uc) {
      if (!uc) return ''
      // Handle ObjectId from backend (conflict.items are ObjectIds)
      if (typeof uc === 'string') return uc
      if (uc._id) return String(uc._id)
      if (uc.id) return String(uc.id)
      return ''
    },
  },
}
</script>

<style scoped>
.handle-conflict-view {
  padding: 0;
  margin-bottom: 32px;
}

/* Content Header */
.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  margin-top: 20px;
  padding: 0;
}

.header-info h2 {
  font-size: 2rem;
  font-weight: 700;
  color: #1a365d;
  margin: 0 0 8px 0;
}

.header-info p {
  color: #6b7280;
  margin: 0;
  font-size: 1rem;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #1a365d;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-primary:hover:not(:disabled) {
  background: #2d4a8a;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-card.total {
  border-left: 4px solid #f59e0b;
}

.stat-card.resolved {
  border-left: 4px solid #10b981;
}

.stat-card.pending {
  border-left: 4px solid #6b7280;
}

.stat-card.progress {
  border-left: 4px solid #3b82f6;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-card.total .stat-icon {
  background: #fef3c7;
  color: #f59e0b;
}

.stat-card.resolved .stat-icon {
  background: #d1fae5;
  color: #10b981;
}

.stat-card.pending .stat-icon {
  background: #f3f4f6;
  color: #6b7280;
}

.stat-card.progress .stat-icon {
  background: #dbeafe;
  color: #3b82f6;
}

.stat-info h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-info p {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
}

/* Conflicts Section */
.conflicts-section {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-header {
  margin-bottom: 30px;
  text-align: left;
}

.section-header h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.section-header p {
  color: #6b7280;
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
}

.conflicts-list {
  margin: 0;
}

.conflict-item {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  background: #fafafa;
  transition: all 0.3s ease;
}

.conflict-item:hover {
  border-color: #d1d5db;
}

.conflict-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.conflict-title h4 {
  margin: 0 0 4px 0;
  color: #374151;
  font-size: 1.125rem;
  font-weight: 600;
}

.conflict-id {
  font-size: 0.75rem;
  color: #6b7280;
  font-family: 'Courier New', monospace;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.conflict-options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.conflict-option {
  background: white;
  border-radius: 8px;
  padding: 20px;
  border: 2px solid #e5e7eb;
  transition: all 0.3s ease;
  cursor: pointer;
}

.conflict-option:hover {
  border-color: #d1d5db;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.conflict-option.selected {
  border-color: #1a365d;
  background: #f0f4ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(26, 54, 93, 0.15);
}

.option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.option-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #f3f4f6;
  color: #374151;
  font-family: 'Courier New', monospace;
}

.select-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.select-btn:hover {
  background: #f9fafb;
}

.select-btn.selected {
  background: #1a365d;
  color: white;
  border-color: #1a365d;
}

.use-case-preview h5 {
  margin: 0 0 12px 0;
  color: #1f2937;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.4;
}

.use-case-description {
  margin: 0 0 16px 0;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
}

.use-case-actions {
  display: flex;
  gap: 8px;
}

.btn-outline {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  color: #1a365d;
  border: 1px solid #1a365d;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-outline:hover {
  background: #1a365d;
  color: white;
}

/* Conflicts Footer */
.conflicts-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.footer-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resolved-count {
  color: #374151;
  font-size: 0.875rem;
}

.completion-text {
  color: #6b7280;
  font-size: 0.75rem;
}

.btn-resolve {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-resolve:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-resolve:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: #d1fae5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon .material-symbols-outlined {
  font-size: 40px;
  color: #10b981;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #374151;
  font-size: 1.25rem;
  font-weight: 600;
}

.empty-state p {
  margin: 0 0 24px 0;
  color: #6b7280;
  font-size: 0.875rem;
}

/* Spinner */
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

/* Responsive Design */
@media (max-width: 768px) {
  .content-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .conflict-options-grid {
    grid-template-columns: 1fr;
  }

  .conflict-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .conflicts-footer {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .footer-info {
    text-align: center;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .conflicts-section {
    padding: 20px;
  }

  .conflict-item {
    padding: 16px;
  }
}
</style>