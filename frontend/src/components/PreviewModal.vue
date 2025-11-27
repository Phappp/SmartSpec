<template>
  <div class="modal-overlay" @click="close">
    <div class="preview-modal" @click.stop>
      <div class="modal-header">
        <h2>Review Changes</h2>
        <button class="close-btn" @click="close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-content">
        <!-- Project Info -->
        <div class="project-info">
          <h3>{{ project.name }}</h3>
          <p class="project-description">{{ project.description }}</p>
          <div class="version-info">
            <span class="current-version">
              Current Version: v{{ project.current_version?.version_number || '1.0' }}
            </span>
            <span class="changes-count">
              {{ changes.length }} change{{ changes.length !== 1 ? 's' : '' }} pending
            </span>
          </div>
        </div>

        <!-- Changes Summary -->
        <div class="changes-summary">
          <div class="summary-card">
            <div class="summary-item" v-for="stat in changeStats" :key="stat.type">
              <span class="summary-label">{{ stat.label }}</span>
              <span class="summary-value" :class="`count-${stat.type}`">{{ stat.count }}</span>
            </div>
          </div>
        </div>

        <!-- Changes List -->
        <div class="changes-section">
          <div class="section-header">
            <h3>Changes Preview</h3>
            <div class="view-options">
              <button
                class="view-option-btn"
                :class="{ active: viewMode === 'side-by-side' }"
                @click="viewMode = 'side-by-side'"
              >
                <span class="material-symbols-outlined">compare_arrows</span>
                Side by Side
              </button>
              <button
                class="view-option-btn"
                :class="{ active: viewMode === 'unified' }"
                @click="viewMode = 'unified'"
              >
                <span class="material-symbols-outlined">merge</span>
                Unified View
              </button>
            </div>
          </div>

          <div v-if="changes.length > 0" class="changes-list">
            <div
              v-for="change in changes"
              :key="change.change_id"
              class="change-item"
              :class="`change-${change.change_type}`"
            >
              <div class="change-header">
                <div class="change-meta">
                  <span class="change-type-badge" :class="change.change_type">
                    {{ getChangeTypeLabel(change.change_type) }}
                  </span>
                  <span class="entity-type">{{ formatEntityType(change.entity_type) }}</span>
                  <span class="change-id" v-if="change.entity_id">
                    ID: {{ shortenId(change.entity_id) }}
                  </span>
                </div>
                <span class="change-time">{{ formatTime(change.add_at) }}</span>
              </div>

              <!-- Side by Side Comparison -->
              <div v-if="viewMode === 'side-by-side'" class="comparison-view side-by-side">
                <div class="comparison-column old-version">
                  <div class="column-header">
                    <span class="material-symbols-outlined">history</span>
                    Before
                  </div>
                  <div class="column-content">
                    <template v-if="change.change_type === 'added'">
                      <div class="empty-state">
                        <span class="material-symbols-outlined">add_circle</span>
                        <p>New {{ formatEntityType(change.entity_type) }}</p>
                      </div>
                    </template>
                    <template v-else>
                      <DiffView
                        :data="change.before_snapshot"
                        :type="change.entity_type"
                        mode="before"
                      />
                    </template>
                  </div>
                </div>

                <div class="comparison-column new-version">
                  <div class="column-header">
                    <span class="material-symbols-outlined">edit</span>
                    After
                  </div>
                  <div class="column-content">
                    <template v-if="change.change_type === 'deleted'">
                      <div class="empty-state deleted">
                        <span class="material-symbols-outlined">delete</span>
                        <p>{{ formatEntityType(change.entity_type) }} Deleted</p>
                      </div>
                    </template>
                    <template v-else>
                      <DiffView
                        :data="change.after_snapshot"
                        :type="change.entity_type"
                        mode="after"
                        :before-data="change.before_snapshot"
                      />
                    </template>
                  </div>
                </div>
              </div>

              <!-- Unified View -->
              <div v-else class="comparison-view unified">
                <DiffView
                  :before-data="change.before_snapshot"
                  :after-data="change.after_snapshot"
                  :type="change.entity_type"
                  :change-type="change.change_type"
                  mode="unified"
                />
              </div>

              <div class="change-actions">
                <button
                  class="btn btn-revert"
                  @click="revertChange(change.change_id)"
                  :disabled="!canRevert(change)"
                  :title="getRevertTooltip(change)"
                >
                  <span class="material-symbols-outlined">undo</span>
                  Revert Change
                </button>
              </div>
            </div>
          </div>

          <div v-else class="empty-changes">
            <span class="material-symbols-outlined">check_circle</span>
            <p>No pending changes to review</p>
            <small>All changes have been processed or reverted</small>
          </div>
        </div>

        <!-- Approval Section -->
        <div class="approval-section" v-if="changes.length > 0">
          <h3>Version Approval</h3>
          <div class="approval-actions">
            <div class="version-type-selector">
              <label>Release Type:</label>
              <div class="radio-group">
                <label class="radio-option" v-for="option in versionOptions" :key="option.value">
                  <input type="radio" v-model="selectedVersionType" :value="option.value" />
                  <span class="radio-label"> {{ option.label }} (v{{ option.version }}) </span>
                  <span class="version-description">{{ option.description }}</span>
                </label>
              </div>
            </div>

            <div class="comment-section">
              <label>Release Notes (Optional):</label>
              <textarea
                v-model="approvalComment"
                placeholder="Describe what changed in this version..."
                class="comment-input"
                rows="3"
              ></textarea>
            </div>

            <div class="action-buttons">
              <button class="btn btn-secondary" @click="close">Cancel</button>
              <button
                class="btn btn-primary"
                @click="approveChanges"
                :disabled="changes.length === 0"
              >
                <span class="material-symbols-outlined">rocket_launch</span>
                Release Version
                {{ selectedVersionType === 'minor' ? nextMinorVersion : nextMajorVersion }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// Enhanced DiffView component with better visualization
const DiffView = {
  name: 'DiffView',
  props: {
    beforeData: { type: [Object, Array, String], default: null },
    afterData: { type: [Object, Array, String], default: null },
    data: { type: [Object, Array, String], default: null },
    type: { type: String, default: '' },
    mode: { type: String, default: 'side-by-side' },
    changeType: { type: String, default: 'updated' },
  },
  computed: {
    displayData() {
      if (this.mode === 'before') return this.beforeData || this.data
      if (this.mode === 'after') return this.afterData || this.data
      return null
    },

    changes() {
      if (!this.beforeData || !this.afterData) return []

      const before = this.normalizeData(this.beforeData)
      const after = this.normalizeData(this.afterData)

      return this.compareObjects(before, after)
    },

    hasChanges() {
      return this.changes.length > 0
    },
  },
  methods: {
    normalizeData(data) {
      if (typeof data === 'string') {
        try {
          return JSON.parse(data)
        } catch {
          return data
        }
      }
      return data
    },

    compareObjects(before, after, path = '') {
      const changes = []

      if (typeof before !== 'object' || typeof after !== 'object') {
        if (before !== after) {
          changes.push({
            path: path || 'value',
            before: this.formatValue(before),
            after: this.formatValue(after),
            type: 'modified',
          })
        }
        return changes
      }

      // Compare all keys from both objects
      const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})])

      for (const key of allKeys) {
        const currentPath = path ? `${path}.${key}` : key
        const beforeVal = before?.[key]
        const afterVal = after?.[key]

        if (!(key in before)) {
          // New property
          changes.push({
            path: currentPath,
            before: null,
            after: this.formatValue(afterVal),
            type: 'added',
          })
        } else if (!(key in after)) {
          // Removed property
          changes.push({
            path: currentPath,
            before: this.formatValue(beforeVal),
            after: null,
            type: 'removed',
          })
        } else if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
          // Modified property - only show meaningful changes
          if (typeof beforeVal === 'object' && typeof afterVal === 'object') {
            changes.push(...this.compareObjects(beforeVal, afterVal, currentPath))
          } else {
            // Only show if the change is meaningful (not just whitespace or case changes)
            const beforeStr = String(beforeVal || '').trim()
            const afterStr = String(afterVal || '').trim()

            if (beforeStr !== afterStr) {
              changes.push({
                path: currentPath,
                before: this.formatValue(beforeVal),
                after: this.formatValue(afterVal),
                type: 'modified',
              })
            }
          }
        }
      }

      return changes
    },

    formatValue(value) {
      if (value === null || value === undefined) return 'null'
      if (typeof value === 'boolean') return value ? 'true' : 'false'
      if (Array.isArray(value)) return `[${value.length} items]`
      if (typeof value === 'object') {
        // For objects, show only key count for better visualization
        const keys = Object.keys(value || {})
        return keys.length > 0 ? `{${keys.length} properties}` : '{}'
      }
      return String(value)
    },

    renderSingleView() {
      const data = this.displayData

      if (!data) {
        return '<div class="no-data">No data available</div>'
      }

      if (typeof data === 'string') {
        return `<pre class="data-content">${this.escapeHtml(data)}</pre>`
      }

      // For objects, show only essential information
      const essentialProperties = this.getEssentialProperties(data, this.type)
      const properties = essentialProperties
        .map(
          ([key, value]) =>
            `<div class="property">
          <span class="property-name">${key}:</span>
          <span class="property-value">${this.escapeHtml(this.formatValue(value))}</span>
        </div>`
        )
        .join('')

      return `<div class="object-view">${properties}</div>`
    },

    getEssentialProperties(data, type) {
      const essentialKeys = {
        requirement: ['name', 'goal', 'priority', 'role'],
        testcase: ['title', 'status', 'priority', 'test_type'],
        database: ['name', 'description', 'tables_count'],
        table: ['name', 'description', 'columns_count'],
        column: ['name', 'type', 'is_primary_key'],
        usecase_diagram: ['name', 'description', 'actors_count'],
        sequence_diagram: ['name', 'description', 'lifelines_count'],
        activity_diagram: ['name', 'description', 'nodes_count'],
        input: ['type', 'original_filename', 'processing_status'],
        output: ['type', 'status'],
      }

      const keys = essentialKeys[type] || Object.keys(data || {}).slice(0, 5) // Limit to 5 properties
      return keys.map((key) => [key, data?.[key]]).filter(([_, value]) => value !== undefined)
    },

    renderDiffView() {
      if (this.changes.length === 0) {
        return '<div class="no-changes">No changes detected</div>'
      }

      const diffLines = this.changes
        .map(
          (change, index) =>
            `<div class="diff-line diff-${change.type}">
          <span class="diff-path">${this.escapeHtml(this.shortenPath(change.path))}</span>
          <span class="diff-before">${this.escapeHtml(change.before || '')}</span>
          <span class="material-symbols-outlined diff-arrow">arrow_right_alt</span>
          <span class="diff-after">${this.escapeHtml(change.after || '')}</span>
        </div>`
        )
        .join('')

      return `<div class="diff-view">${diffLines}</div>`
    },

    renderUnifiedView() {
      const changes = this.changes

      if (changes.length === 0) {
        return '<div class="no-changes">No changes detected</div>'
      }

      const unifiedLines = changes
        .map((change, index) => {
          const marker = change.type === 'added' ? '+' : change.type === 'removed' ? '-' : '±'
          return `
          <div class="unified-line unified-${change.type}">
            <span class="change-marker">${marker}</span>
            <span class="change-path">${this.escapeHtml(this.shortenPath(change.path))}</span>
            ${
              change.type !== 'added'
                ? `<span class="change-before">${this.escapeHtml(change.before || '')}</span>`
                : ''
            }
            ${
              change.type !== 'removed'
                ? `<span class="change-after">${this.escapeHtml(change.after || '')}</span>`
                : ''
            }
          </div>`
        })
        .join('')

      return `<div class="unified-diff">${unifiedLines}</div>`
    },

    shortenPath(path) {
      // Shorten long paths for better visualization
      const parts = path.split('.')
      if (parts.length > 3) {
        return `...${parts.slice(-3).join('.')}`
      }
      return path
    },

    escapeHtml(unsafe) {
      if (unsafe === null || unsafe === undefined) return ''
      return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    },
  },
  template: `
    <div v-if="mode === 'unified'" v-html="renderUnifiedView()"></div>
    <div v-else-if="mode === 'side-by-side' && (beforeData && afterData)" v-html="renderDiffView()"></div>
    <div v-else v-html="renderSingleView()"></div>
  `,
}

export default {
  name: 'PreviewModal',
  components: {
    DiffView,
  },
  props: {
    project: {
      type: Object,
      required: true,
    },
    previewData: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      selectedVersionType: 'minor',
      approvalComment: '',
      viewMode: 'side-by-side',
    }
  },
  computed: {
    changes() {
      return this.previewData?.changes || []
    },

    changeStats() {
      const stats = {
        added: { label: 'Added', count: 0, type: 'added' },
        updated: { label: 'Modified', count: 0, type: 'updated' },
        deleted: { label: 'Deleted', count: 0, type: 'deleted' },
      }

      this.changes.forEach((change) => {
        if (stats[change.change_type]) {
          stats[change.change_type].count++
        }
      })

      return Object.values(stats)
    },

    versionOptions() {
      return [
        {
          value: 'minor',
          label: 'Minor Release',
          version: this.nextMinorVersion,
          description: 'Backward compatible changes, new features',
        },
        {
          value: 'major',
          label: 'Major Release',
          version: this.nextMajorVersion,
          description: 'Breaking changes, major updates',
        },
      ]
    },

    nextMinorVersion() {
      const current = this.project.current_version?.version_number || '1.0'
      const [major, minor] = current.split('.').map(Number)
      return `${major}.${minor + 1}`
    },

    nextMajorVersion() {
      const current = this.project.current_version?.version_number || '1.0'
      const [major] = current.split('.').map(Number)
      return `${major + 1}.0`
    },
  },
  methods: {
    close() {
      this.$emit('close')
    },

    getChangeTypeLabel(type) {
      const labels = {
        added: 'New',
        updated: 'Modified',
        deleted: 'Deleted',
      }
      return labels[type] || type
    },

    formatEntityType(type) {
      return type
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    },

    shortenId(id) {
      return id ? id.substring(0, 8) + '...' : ''
    },

    formatTime(dateString) {
      if (!dateString) return ''
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    },

    canRevert(change) {
      return change.change_type !== 'added' // Can't revert additions as they don't have before state
    },

    getRevertTooltip(change) {
      if (!this.canRevert(change)) {
        return 'Cannot revert newly added items'
      }
      return `Revert this ${change.change_type} change`
    },

    revertChange(changeId) {
      this.$emit('revert', changeId)
    },

    approveChanges() {
      this.$emit('approve', {
        changeType: this.selectedVersionType,
        comment: this.approvalComment,
      })
    },
  },
}
</script>

<style scoped>
/* All existing styles remain exactly the same */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.preview-modal {
  background: white;
  border-radius: 16px;
  width: 95%;
  max-width: 1200px;
  max-height: 95vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.modal-header h2 {
  margin: 0;
  color: #1a365d;
  font-size: 1.75rem;
  font-weight: 700;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 12px;
  border-radius: 8px;
  color: #64748b;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #e2e8f0;
  color: #475569;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.project-info {
  background: linear-gradient(135deg, #1a365d 0%, #2d4a8a 100%);
  color: white;
  padding: 24px 32px;
}

.project-info h3 {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.project-description {
  margin: 0 0 16px 0;
  opacity: 0.9;
  font-size: 1rem;
}

.version-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.current-version {
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  backdrop-filter: blur(10px);
}

.changes-count {
  background: #f59e0b;
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.changes-summary {
  padding: 20px 32px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.summary-card {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  max-width: 400px;
}

.summary-item {
  text-align: center;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.summary-label {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.summary-value {
  display: block;
  font-size: 2rem;
  font-weight: 800;
}

.count-added {
  color: #10b981;
}
.count-updated {
  color: #f59e0b;
}
.count-deleted {
  color: #ef4444;
}

.changes-section {
  padding: 24px 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h3 {
  margin: 0;
  color: #1a365d;
  font-size: 1.25rem;
  font-weight: 600;
}

.view-options {
  display: flex;
  gap: 8px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 8px;
}

.view-option-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-option-btn.active {
  background: white;
  color: #1a365d;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.view-option-btn:hover:not(.active) {
  color: #475569;
}

.changes-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.change-item {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.change-item:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.change-item.change-added {
  border-left: 4px solid #10b981;
}

.change-item.change-updated {
  border-left: 4px solid #f59e0b;
}

.change-item.change-deleted {
  border-left: 4px solid #ef4444;
}

.change-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.change-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.change-type-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.change-type-badge.added {
  background: #dcfce7;
  color: #166534;
}

.change-type-badge.updated {
  background: #fef3c7;
  color: #92400e;
}

.change-type-badge.deleted {
  background: #fee2e2;
  color: #991b1b;
}

.entity-type {
  background: #e2e8f0;
  color: #475569;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.change-id {
  color: #64748b;
  font-size: 0.75rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.change-time {
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Comparison Views */
.comparison-view {
  padding: 20px;
}

.side-by-side {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.comparison-column {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.column-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 600;
  color: #475569;
}

.old-version .column-header {
  color: #ef4444;
}

.new-version .column-header {
  color: #10b981;
}

.column-content {
  padding: 16px;
  min-height: 120px;
  max-height: 300px;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #94a3b8;
  text-align: center;
}

.empty-state.deleted {
  color: #ef4444;
}

.empty-state .material-symbols-outlined {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.change-actions {
  padding: 16px 20px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
}

.btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-revert {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #f59e0b;
}

.btn-revert:hover:not(:disabled) {
  background: #fde68a;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

.btn-primary {
  background: linear-gradient(135deg, #1a365d 0%, #2d4a8a 100%);
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #2d4a8a 0%, #3b82f6 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.empty-changes {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
}

.empty-changes .material-symbols-outlined {
  font-size: 64px;
  color: #10b981;
  margin-bottom: 16px;
  opacity: 0.7;
}

.empty-changes p {
  margin: 0 0 8px 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.empty-changes small {
  font-size: 0.875rem;
  opacity: 0.8;
}

.approval-section {
  border-top: 1px solid #e2e8f0;
  padding: 24px 32px;
  background: #f8fafc;
}

.approval-section h3 {
  margin: 0 0 20px 0;
  color: #1a365d;
  font-size: 1.25rem;
  font-weight: 600;
}

.approval-actions {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.version-type-selector label,
.comment-section label {
  display: block;
  margin-bottom: 12px;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.radio-option:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.radio-option input[type='radio'] {
  margin-top: 2px;
}

.radio-label {
  font-weight: 600;
  color: #1a365d;
  font-size: 0.875rem;
}

.version-description {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 4px;
}

.radio-option input[type='radio']:checked + .radio-label {
  color: #1a365d;
}

.radio-option input[type='radio']:checked ~ .version-description {
  color: #475569;
}

.radio-option input[type='radio']:checked {
  accent-color: #1a365d;
}

.comment-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s ease;
}

.comment-input:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* Diff View Styles */
:deep(.diff-view) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
}

:deep(.diff-line) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  margin: 2px 0;
  border-radius: 4px;
}

:deep(.diff-added) {
  background: #dcfce7;
  color: #166534;
}

:deep(.diff-removed) {
  background: #fee2e2;
  color: #991b1b;
}

:deep(.diff-modified) {
  background: #fef3c7;
  color: #92400e;
}

:deep(.diff-path) {
  font-weight: 600;
  min-width: 120px;
}

:deep(.diff-before) {
  text-decoration: line-through;
  opacity: 0.7;
}

:deep(.diff-arrow) {
  font-size: 16px;
  opacity: 0.5;
}

:deep(.diff-after) {
  font-weight: 600;
}

:deep(.unified-diff) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
}

:deep(.unified-line) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  margin: 1px 0;
  border-radius: 4px;
}

:deep(.unified-added) {
  background: #dcfce7;
  color: #166534;
}

:deep(.unified-removed) {
  background: #fee2e2;
  color: #991b1b;
}

:deep(.unified-modified) {
  background: #fef3c7;
  color: #92400e;
}

:deep(.change-marker) {
  font-weight: 700;
  min-width: 16px;
  text-align: center;
}

:deep(.change-path) {
  font-weight: 600;
  min-width: 120px;
}

:deep(.change-before) {
  text-decoration: line-through;
  opacity: 0.7;
  margin-right: 8px;
}

:deep(.change-after) {
  font-weight: 600;
}

:deep(.object-view) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
}

:deep(.property) {
  display: flex;
  gap: 8px;
  padding: 2px 0;
}

:deep(.property-name) {
  font-weight: 600;
  color: #1a365d;
}

:deep(.property-value) {
  color: #475569;
}

:deep(.no-data),
:deep(.no-changes) {
  color: #94a3b8;
  font-style: italic;
  text-align: center;
  padding: 20px;
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
  }

  .preview-modal {
    width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .modal-header,
  .project-info,
  .changes-summary,
  .changes-section,
  .approval-section {
    padding: 16px 20px;
  }

  .summary-card {
    grid-template-columns: 1fr;
    max-width: none;
  }

  .section-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .view-options {
    align-self: center;
  }

  .side-by-side {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .change-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .change-meta {
    width: 100%;
    justify-content: space-between;
  }

  .action-buttons {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }

  .radio-group {
    gap: 8px;
  }

  .radio-option {
    padding: 12px;
  }
}

@media (max-width: 480px) {
  .modal-header h2 {
    font-size: 1.5rem;
  }

  .project-info h3 {
    font-size: 1.25rem;
  }

  .version-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>