<template>
  <div class="handle-conflict-view">
    <!-- Conflict Resolution Section -->
    <!-- Header removed - button moved to UseCaseMainContent -->

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
        <div class="header-content">
          <h3>Duplicate Use Cases Detected</h3>
          <p>
            We found {{ pendingConflicts.length }} group(s) of duplicate use cases. Please select one
            version to keep from each group, or skip conflicts you want to handle later.
          </p>
        </div>
        <button
          class="section-collapse-toggle"
          @click="toggleConflictsSection"
          :title="isConflictsSectionCollapsed ? 'Expand conflicts section' : 'Collapse conflicts section'"
        >
          <span class="material-symbols-outlined">
            {{ isConflictsSectionCollapsed ? 'expand_more' : 'expand_less' }}
          </span>
        </button>
      </div>

      <transition name="slide-fade">
        <div v-show="!isConflictsSectionCollapsed" class="conflicts-list">
          <div
            v-for="(conflict, index) in pendingConflicts"
            :key="conflict.conflict_id"
            class="conflict-item"
          >
          <div class="conflict-header">
            <div class="conflict-title">
              <button
                class="collapse-toggle"
                @click.stop="toggleConflict(conflict.conflict_id)"
                :title="isCollapsed(conflict.conflict_id) ? 'Expand' : 'Collapse'"
              >
                <span class="material-symbols-outlined">
                  {{ isCollapsed(conflict.conflict_id) ? 'expand_more' : 'expand_less' }}
                </span>
              </button>
              <div class="title-content">
                <h4>Conflict Group {{ index + 1 }}</h4>
                <span class="conflict-id">Reference: {{ formatConflictId(conflict.conflict_id) }}</span>
              </div>
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

          <div v-show="!isCollapsed(conflict.conflict_id)" class="conflict-options-grid">
            <div
              v-for="useCase in conflict.items"
              :key="getUsecaseId(useCase)"
              class="conflict-option"
              :class="{ selected: selectedResolutions[conflict.conflict_id] === getUsecaseId(useCase) }"
              @click="handleSelectResolution(conflict.conflict_id, getUsecaseId(useCase))"
            >
              <div class="option-header">
                <span class="option-badge">{{ formatUsecaseId(useCase) }}</span>
                <button
                  class="select-btn"
                  :class="{ selected: selectedResolutions[conflict.conflict_id] === getUsecaseId(useCase) }"
                  @click.stop="handleSelectResolution(conflict.conflict_id, getUsecaseId(useCase))"
                >
                  <span
                    v-if="selectedResolutions[conflict.conflict_id] === getUsecaseId(useCase)"
                    class="material-symbols-outlined"
                    >check_circle</span
                  >
                  <span v-else class="material-symbols-outlined">radio_button_unchecked</span>
                  {{
                    selectedResolutions[conflict.conflict_id] === getUsecaseId(useCase) ? 'Deselect' : 'Select'
                  }}
                </button>
              </div>
              <div class="use-case-preview">
                <h5>{{ getUsecaseDisplayName(useCase) }}</h5>
                <p class="use-case-description">
                  {{ getUsecaseDescription(useCase) }}
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
      </transition>

      <transition name="slide-fade">
        <div v-show="!isConflictsSectionCollapsed" class="conflicts-footer">
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
      </transition>
    </div>

    <!-- Empty State - Hidden when no conflicts -->
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
  data() {
    return {
      collapsedConflicts: new Set(), // Track which conflicts are collapsed
      isConflictsSectionCollapsed: false, // Track if conflicts section is collapsed
    }
  },
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
    // Toggle collapse/expand for conflicts section
    toggleConflictsSection() {
      this.isConflictsSectionCollapsed = !this.isConflictsSectionCollapsed
    },
    // Toggle collapse/expand for a conflict
    toggleConflict(conflictId) {
      if (this.collapsedConflicts.has(conflictId)) {
        this.collapsedConflicts.delete(conflictId)
      } else {
        this.collapsedConflicts.add(conflictId)
      }
    },
    // Check if a conflict is collapsed
    isCollapsed(conflictId) {
      return this.collapsedConflicts.has(conflictId)
    },
    // Handle select/deselect resolution
    handleSelectResolution(conflictId, useCaseId) {
      const currentSelection = this.selectedResolutions[conflictId]
      // If clicking on already selected item, deselect it
      if (currentSelection === useCaseId) {
        this.$emit('select-resolution', conflictId, null)
      } else {
        this.$emit('select-resolution', conflictId, useCaseId)
      }
    },
    // Helper: Get usecase ID (support both _id and id for backward compatibility)
    getUsecaseId(uc) {
      if (!uc) return ''
      // Handle ObjectId from backend (conflict.items are ObjectIds)
      if (typeof uc === 'string') return uc
      if (uc._id) return String(uc._id)
      if (uc.id) return String(uc.id)
      return ''
    },
    // Helper: Format usecase ID to short readable format
    formatUsecaseId(uc) {
      if (!uc) return 'UC-???'
      const id = this.getUsecaseId(uc)
      if (id.length > 8) {
        return `UC-${id.substring(0, 8)}...`
      }
      return `UC-${id}`
    },
    // Helper: Get usecase display name
    getUsecaseDisplayName(uc) {
      if (!uc) {
        console.warn('⚠️ getUsecaseDisplayName: uc is null/undefined')
        return 'Unknown Use Case'
      }
      
      // Check if uc is a populated usecase object
      const hasName = uc && (uc.name || uc.goal)
      const isString = typeof uc === 'string'
      const isObjectId = uc && typeof uc === 'object' && !hasName
      
      if (isString || isObjectId) {
        console.warn('⚠️ getUsecaseDisplayName: uc is not populated:', {
          uc,
          type: typeof uc,
          isString,
          isObjectId,
          hasName
        })
        return `Use Case ID: ${this.getUsecaseId(uc)}`
      }
      
      return uc.name || uc.goal || 'Unnamed Use Case'
    },
    // Helper: Get usecase description
    getUsecaseDescription(uc) {
      if (!uc) {
        console.warn('⚠️ getUsecaseDescription: uc is null/undefined')
        return 'No description provided.'
      }
      
      // Check if uc is a populated usecase object
      const hasDescription = uc && (uc.description || uc.business_reason || uc.reason)
      const isString = typeof uc === 'string'
      const isObjectId = uc && typeof uc === 'object' && !hasDescription
      
      if (isString || isObjectId) {
        console.warn('⚠️ getUsecaseDescription: uc is not populated:', {
          uc,
          type: typeof uc,
          isString,
          isObjectId,
          hasDescription
        })
        return 'Use case details are being loaded...'
      }
      
      return uc.description || uc.business_reason || uc.reason || 'No description provided.'
    },
    // Helper: Format conflict ID to short readable format
    formatConflictId(conflictId) {
      if (!conflictId) return 'CONF-???'
      const id = String(conflictId)
      if (id.length > 8) {
        return `CONF-${id.substring(0, 8)}...`
      }
      return `CONF-${id}`
    },
  },
}
</script>

<style scoped>
.handle-conflict-view {
  padding: 0;
  margin-bottom: 32px;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(26, 54, 93, 0.25);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #2d4a7c 0%, #1a365d 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(26, 54, 93, 0.35);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.1);
  border: 2px solid transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, rgba(26, 54, 93, 0.3), transparent);
  transform: translateX(-100%);
  transition: transform 0.5s ease;
}

.stat-card:hover::before {
  transform: translateX(100%);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(26, 54, 93, 0.2);
  border-color: rgba(26, 54, 93, 0.2);
}

.stat-card.total {
  border-left: 4px solid #f59e0b;
  background: linear-gradient(135deg, #ffffff 0%, #fffbeb 100%);
}

.stat-card.resolved {
  border-left: 4px solid #10b981;
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
}

.stat-card.pending {
  border-left: 4px solid #6b7280;
  background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
}

.stat-card.progress {
  border-left: 4px solid #3b82f6;
  background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.stat-icon::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.stat-card:hover .stat-icon {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.stat-card:hover .stat-icon::before {
  opacity: 1;
}

.stat-card.total .stat-icon {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.stat-card.resolved .stat-icon {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.stat-card.pending .stat-icon {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
  color: white;
}

.stat-card.progress .stat-icon {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.stat-info h3 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 4px;
  background: linear-gradient(135deg, #1a365d 0%, #2d4a8a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

.stat-info p {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
  font-weight: 500;
}

/* Conflicts Section */
.conflicts-section {
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(26, 54, 93, 0.12);
  transition: box-shadow 0.3s ease;
}

.conflicts-section:hover {
  box-shadow: 0 8px 30px rgba(26, 54, 93, 0.15);
}

.section-header {
  margin-bottom: 30px;
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.header-content {
  flex: 1;
}

.section-header h3 {
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1a365d 0%, #2d4a8a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 8px 0;
  letter-spacing: -0.01em;
}

.section-header p {
  color: #6b7280;
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
}

.section-collapse-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  min-width: 40px;
  min-height: 40px;
  border: 2px solid #e5e7eb;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  color: #6b7280;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-collapse-toggle:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-color: #1a365d;
  color: #1a365d;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(26, 54, 93, 0.15);
}

.section-collapse-toggle:active {
  transform: scale(0.95);
}

.section-collapse-toggle .material-symbols-outlined {
  font-size: 24px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

.conflicts-list {
  margin: 0;
}

.conflict-item {
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.1);
  position: relative;
  overflow: hidden;
}

.conflict-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%);
  transition: width 0.3s ease;
}

.conflict-item:hover::before {
  width: 4px;
}

.conflict-item:hover {
  border-color: #f59e0b;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.2);
  transform: translateX(2px);
}

.conflict-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.conflict-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.collapse-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  padding: 0;
  flex-shrink: 0;
}

.collapse-toggle:hover {
  background: #f3f4f6;
  color: #374151;
}

.collapse-toggle:active {
  transform: scale(0.95);
}

.collapse-toggle .material-symbols-outlined {
  font-size: 24px;
  transition: transform 0.2s ease;
  user-select: none;
}

.title-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conflict-title h4 {
  margin: 0;
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
  border-radius: 12px;
  padding: 20px;
  border: 2px solid #e5e7eb;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.conflict-option::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: linear-gradient(135deg, rgba(26, 54, 93, 0.1) 0%, rgba(45, 74, 138, 0.1) 100%);
  transition: width 0.3s ease;
}

.conflict-option:hover::before {
  width: 4px;
}

.conflict-option:hover {
  border-color: #1a365d;
  box-shadow: 0 4px 16px rgba(26, 54, 93, 0.15);
  transform: translateX(4px) translateY(-2px);
}

.conflict-option.selected {
  border-color: #1a365d;
  background: linear-gradient(135deg, #e6f2ff 0%, #dbeafe 100%);
  transform: translateX(4px) translateY(-2px);
  box-shadow: 0 6px 20px rgba(26, 54, 93, 0.2);
}

.conflict-option.selected::before {
  width: 4px;
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
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
}

.btn-resolve:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);
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

/* Slide-fade transition for conflicts section */
.slide-fade-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-20px);
  max-height: 0;
}

.slide-fade-enter-to {
  opacity: 1;
  transform: translateY(0);
  max-height: 5000px;
}

.slide-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 5000px;
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
  max-height: 0;
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