<template>
  <div v-if="isVisible" class="preview-modal-overlay" @click.self="closeModal">
    <div class="preview-modal">
      <!-- Header -->
      <div class="modal-header">
        <div class="header-left">
          <h2>Review Changes</h2>
          <div class="project-info">
            <span class="project-name">{{ projectData?.name }}</span>
            <span class="version-info">Current Version: {{ currentVersion?.version_number }}</span>
          </div>
        </div>
        <div class="header-right">
          <button class="btn-close" @click="closeModal">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- Changes List -->
        <div class="changes-section">
          <div class="section-header">
            <h3>Pending Changes ({{ filteredChanges.length }}/{{ changes.length }})</h3>
            <div class="section-actions">
              <!-- Search Input -->
              <div class="search-wrapper">
                <span class="material-symbols-outlined search-icon">search</span>
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search..."
                  class="search-input"
                  @input="handleSearch"
                />
              </div>
              <!-- Filter Dropdown -->
              <div class="filter-wrapper">
                <select v-model="filterType" class="filter-select" @change="handleFilter" title="Filter by item type">
                  <option value="all">All Types</option>
                  <option value="requirement">Requirements</option>
                  <option value="testcase">Test Cases</option>
                  <option value="database">Database</option>
                  <option value="activity_diagram">Activity Diagrams</option>
                  <option value="sequence_diagram">Sequence Diagrams</option>
                  <option value="usecase_diagram">Use Case Diagrams</option>
                </select>
              </div>
              <div class="filter-wrapper">
                <select v-model="filterChangeType" class="filter-select" @change="handleFilter" title="Filter by change type">
                  <option value="all">All Changes</option>
                  <option value="added">Added</option>
                  <option value="updated">Updated</option>
                  <option value="deleted">Deleted</option>
                </select>
              </div>
              <button class="btn-refresh" @click="refreshPreview" :disabled="isLoading" title="Refresh">
                <span class="material-symbols-outlined">refresh</span>
              </button>
            </div>
          </div>

          <div v-if="isLoading" class="loading-state">
            <span class="material-symbols-outlined spin">sync</span>
            Loading changes...
          </div>

          <div v-else-if="changes.length === 0" class="empty-state">
            <span class="material-symbols-outlined">check_circle</span>
            <p>No pending changes</p>
          </div>

          <div v-else-if="filteredChanges.length === 0" class="empty-state">
            <span class="material-symbols-outlined">search_off</span>
            <p>No changes match your filters</p>
          </div>

          <div v-else class="changes-list">
            <!-- Bulk Actions Bar -->
            <div v-if="selectedChanges.length > 0" class="bulk-actions-bar">
              <span class="bulk-info">{{ selectedChanges.length }} selected</span>
              <button class="btn-bulk-revert" @click="bulkRevertChanges">
                <span class="material-symbols-outlined">undo</span>
                Undo Selected
              </button>
              <button class="btn-bulk-clear" @click="clearSelection">
                <span class="material-symbols-outlined">close</span>
                Clear Selection
              </button>
            </div>

            <div
              v-for="change in filteredChanges"
              :key="change.change_id"
              class="change-item"
              :class="{ 
                selected: selectedChangeId === change.change_id,
                'bulk-selected': selectedChanges.includes(change.change_id)
              }"
              @click="selectChange(change.change_id)"
            >
              
              <div class="change-content">
                <div class="change-header">
                  <span class="entity-type" :class="change.entity_type">
                    {{ formatEntityTypeShort(change.entity_type) }}
                  </span>
                  <span class="change-type" :class="change.change_type">
                    {{ formatChangeType(change.change_type) }}
                  </span>
                </div>
                <div class="change-details">
                  <span class="entity-name" v-if="change.entity_name">
                    {{ change.entity_name }}
                  </span>
                </div>
                <div class="change-footer">
                  <span class="change-time">
                    {{ formatDate(change.add_at) }}
                  </span>
                  <button
                    class="btn-revert"
                    @click.stop="revertChange(change.change_id)"
                    title="Undo this change"
                  >
                    <span class="material-symbols-outlined">undo</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Change Comparison -->
        <div class="comparison-section" v-if="selectedChange">
          <div class="section-header">
            <h3>Change Details</h3>
            <div class="change-navigation">
              <button class="btn-nav" @click="selectPreviousChange" :disabled="!hasPreviousChange">
                <span class="material-symbols-outlined">chevron_left</span>
              </button>
              <span class="nav-info"> {{ currentChangeIndex + 1 }} of {{ filteredChanges.length }} </span>
              <button class="btn-nav" @click="selectNextChange" :disabled="!hasNextChange">
                <span class="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>

          <div class="comparison-content">
            <!-- Side-by-side comparison với visualization -->
            <ChangeVisualization
              :before-snapshot="selectedChange.before_snapshot"
              :after-snapshot="selectedChange.after_snapshot"
              :entity-type="selectedChange.entity_type"
            />
          </div>
        </div>

        <!-- No Change Selected -->
        <div v-else class="no-selection">
          <div class="no-selection-content">
            <span class="material-symbols-outlined">compare_arrows</span>
            <h3>Select a change to view details</h3>
            <p>Click on any change from the list to see the before and after comparison</p>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="modal-footer">
        <div class="footer-left">
          <button class="btn-secondary" @click="closeModal" :disabled="isApproving">Cancel</button>
        </div>

        <div class="footer-right" v-if="changes.length > 0">
          <!-- Release Version Selection -->
          <div class="version-selection">
            <label>Release as version:</label>
            <div class="version-options">
              <label class="version-option">
                <input
                  type="radio"
                  v-model="selectedBumpType"
                  value="minor"
                  :disabled="isApproving"
                />
                <span class="radio-label">Minor Update ({{ nextMinorVersion }})</span>
              </label>
              <label class="version-option">
                <input
                  type="radio"
                  v-model="selectedBumpType"
                  value="major"
                  :disabled="isApproving"
                />
                <span class="radio-label">Major Update ({{ nextMajorVersion }})</span>
              </label>
            </div>
          </div>

          <!-- Action Buttons -->
          <button
            class="btn-primary"
            @click="approveChanges"
            :disabled="isApproving || changes.length === 0"
          >
            <span v-if="isApproving" class="material-symbols-outlined spin">sync</span>
            <span v-else class="material-symbols-outlined">publish</span>
            {{ isApproving ? 'Releasing...' : `Release ${changes.length} Change${changes.length > 1 ? 's' : ''}` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getPreview, approveVersion, revertChange, bumpVersion } from '@/api/version'
import { getProjectDetail } from '@/api/project'
import { useToast } from 'vue-toastification'
import ChangeVisualization from './ChangeVisualization.vue'

export default {
  name: 'PreviewModal',
  components: {
    ChangeVisualization,
  },
  props: {
    isVisible: {
      type: Boolean,
      default: false,
    },
    projectId: {
      type: String,
      default: '',
    },
    versionId: {
      type: String,
      default: '',
    },
    versionData: {
      type: Object,
      default: () => ({}),
    },
  },
  data() {
    return {
      isLoading: false,
      isApproving: false,
      changes: [],
      selectedChangeId: null,
      selectedBumpType: 'minor',
      projectData: null,
      currentVersion: null,
      toast: null,
      isApproved: false, // Flag để biết đã approve thành công
      // Filter & Search
      searchQuery: '',
      filterType: 'all',
      filterChangeType: 'all',
      selectedChanges: [], // For bulk actions
      refreshInterval: null, // For auto-refresh
    }
  },
  created() {
    this.toast = useToast()
  },
  computed: {
    selectedChange() {
      return this.filteredChanges.find((change) => change.change_id === this.selectedChangeId) || null
    },
    currentChangeIndex() {
      return this.filteredChanges.findIndex((change) => change.change_id === this.selectedChangeId)
    },
    hasPreviousChange() {
      return this.currentChangeIndex > 0
    },
    hasNextChange() {
      return this.currentChangeIndex < this.filteredChanges.length - 1
    },
    nextMinorVersion() {
      if (!this.currentVersion) return '?.?'
      const major = this.currentVersion.version_major || 1
      const minor = (this.currentVersion.version_minor || 0) + 1
      return `${major}.${minor}`
    },
    nextMajorVersion() {
      if (!this.currentVersion) return '?.?'
      const major = (this.currentVersion.version_major || 1) + 1
      return `${major}.0`
    },
    // Filtered changes based on search and filters
    filteredChanges() {
      let filtered = this.changes

      // Filter by entity type
      if (this.filterType !== 'all') {
        filtered = filtered.filter(change => change.entity_type === this.filterType)
      }

      // Filter by change type
      if (this.filterChangeType !== 'all') {
        filtered = filtered.filter(change => change.change_type === this.filterChangeType)
      }

      // Search filter
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(change => {
          const entityType = this.formatEntityType(change.entity_type).toLowerCase()
          const changeType = this.formatChangeType(change.change_type).toLowerCase()
          const entityId = (change.entity_id || '').toLowerCase()
          return entityType.includes(query) || 
                 changeType.includes(query) || 
                 entityId.includes(query)
        })
      }

      return filtered
    },
  },
  watch: {
    isVisible: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          // Reset flag khi mở modal mới
          this.isApproved = false
          this.loadData()
          // Start auto-refresh every 5 seconds
          this.startAutoRefresh()
        } else {
          // Reset khi modal đóng
          this.stopAutoRefresh()
          this.resetModalState()
        }
      },
    },
  },
  methods: {
    async loadData() {
      this.isLoading = true
      try {
        // Load project details
        const projectResponse = await getProjectDetail(this.projectId)
        this.projectData = projectResponse.data?.data || null

        // Set current version
        this.currentVersion = this.versionData

        // Load preview changes
        await this.loadPreviewChanges()
      } catch (error) {
        console.error('Error loading preview data:', error)
      } finally {
        this.isLoading = false
      }
    },

    async loadPreviewChanges() {
      try {
        const response = await getPreview(this.versionId)
        
        // Check response format
        const responseData = response.data?.data || response.data
        
        if (responseData) {
          const newChanges = responseData.changes || []
          this.changes = newChanges

          // Xử lý selection sau khi load changes mới
          this.handleSelectionAfterRefresh()
        } else {
          // No preview data (có thể đã bị xóa sau khi approve)
          this.changes = []
          this.selectedChangeId = null
        }
      } catch (error) {
        console.error('Error loading preview changes:', error)
        
        // Nếu lỗi là "Preview not found" hoặc "Preview has been deleted", không hiển thị lỗi
        const errorMessage = error.response?.data?.message || error.message || ''
        if (errorMessage.includes('Preview has been deleted') || 
            errorMessage.includes('Preview not found') ||
            error.response?.status === 404) {
          console.log('ℹ️ Preview has been deleted (likely after approval)')
          this.changes = []
          this.selectedChangeId = null
        } else {
          // Các lỗi khác vẫn hiển thị
          this.changes = []
          this.selectedChangeId = null
        }
      }
    },

    // Method mới để xử lý selection sau khi refresh
    handleSelectionAfterRefresh() {
      if (this.changes.length === 0) {
        this.selectedChangeId = null
        return
      }

      // Nếu đang có change được chọn và nó vẫn tồn tại trong danh sách mới, giữ nguyên
      if (this.selectedChangeId) {
        const selectedChangeExists = this.changes.some(
          (change) => change.change_id === this.selectedChangeId
        )
        if (selectedChangeExists) {
          return // Giữ nguyên selection hiện tại
        }
      }

      // Nếu không có selection hoặc selection cũ không tồn tại, chọn change đầu tiên
      this.selectedChangeId = this.changes[0].change_id
    },

    async refreshPreview() {
      await this.loadPreviewChanges()
    },

    selectChange(changeId) {
      this.selectedChangeId = changeId
    },

    selectPreviousChange() {
      if (this.hasPreviousChange) {
        const newIndex = this.currentChangeIndex - 1
        if (newIndex >= 0 && newIndex < this.filteredChanges.length) {
          this.selectedChangeId = this.filteredChanges[newIndex].change_id
        }
      }
    },

    selectNextChange() {
      if (this.hasNextChange) {
        const newIndex = this.currentChangeIndex + 1
        if (newIndex >= 0 && newIndex < this.filteredChanges.length) {
          this.selectedChangeId = this.filteredChanges[newIndex].change_id
        }
      }
    },

    async revertChange(changeId) {
      try {
        const userId = localStorage.getItem('userId')
        if (!userId) {
          return
        }

        console.log('🔧 Undo change called:', {
          versionId: this.versionId,
          changeId: changeId,
        })

        // Call API to undo change
        await revertChange(this.versionId, changeId)

        // Refresh immediately
        await this.refreshPreviewData()

        // IMPORTANT: Emit event to notify parent component of changes
        this.$emit('changes-updated', {
          projectId: this.projectId,
          versionId: this.versionId,
          changeId: changeId,
          action: 'reverted',
        })
      } catch (error) {
        console.error('Error undoing change:', error)
        await this.refreshPreviewData()
        this.$emit('changes-updated', {
          projectId: this.projectId,
          versionId: this.versionId,
          action: 'revert_failed',
        })
      }
    },

    async refreshPreviewData() {
      try {
        const currentSelectedChangeId = this.selectedChangeId

        // Load lại danh sách changes
        await this.loadPreviewChanges()

        // Kiểm tra xem change đang chọn có còn trong danh sách mới không
        const selectedChangeStillExists = this.changes.some(
          (change) => change.change_id === currentSelectedChangeId
        )

        if (!selectedChangeStillExists && this.changes.length > 0) {
          this.selectedChangeId = this.changes[0].change_id
        } else if (this.changes.length === 0) {
          this.selectedChangeId = null
        }

        // Emit event để component cha biết có thay đổi
        this.$emit('changes-updated')
      } catch (error) {
        console.error('Error refreshing preview data:', error)
      }
    },

    async approveChanges() {
      this.isApproving = true
      try {
        const userId = localStorage.getItem('userId')
        if (!userId) {
          this.toast.error('Unable to identify user. Please log in again.')
          this.isApproving = false
          return
        }

        console.log('🚀 Starting release process...', {
          versionId: this.versionId,
          versionType: this.selectedBumpType,
          changesCount: this.changes.length,
        })

        // Release the preview as new version
        const approveResponse = await approveVersion(
          this.versionId,
          this.selectedBumpType,
          `Released ${this.changes.length} changes`
        )

        console.log('📦 Release response:', approveResponse.data)

        // Check response format: backend returns { status: "Success", message: "...", data: {...} }
        const responseStatus = approveResponse.data?.status || approveResponse.data?.success
        const isSuccess = responseStatus === 'Success' || responseStatus === true

        if (isSuccess) {
          // Save changes count before clearing
          const changesCount = this.changes.length
          
          // Get new version from response data or calculate it
          const releasedVersion = approveResponse.data?.data?.version
          let newVersion
          
          if (releasedVersion) {
            // Use version from backend response
            newVersion = releasedVersion.version_number || 
              `${releasedVersion.version_major}.${releasedVersion.version_minor}`
          } else {
            // Fallback: calculate from current version
            newVersion =
              this.selectedBumpType === 'major' ? this.nextMajorVersion : this.nextMinorVersion
          }
          
          console.log('✅ Release successful, new version:', newVersion)

          // Thông báo thành công
          this.toast.success(
            `Successfully released ${changesCount} change(s) as version ${newVersion}`
          )

          // Clear changes list because preview is deleted after release
          this.changes = []
          this.selectedChangeId = null
          
          // Set flag to indicate successful release
          this.isApproved = true

          // Emit success event with full information
          this.$emit('approved', {
            bumpType: this.selectedBumpType,
            changesCount: changesCount,
            newVersion: newVersion,
            version: releasedVersion,
          })

          // Wait a bit to ensure event is emitted before closing modal
          await new Promise((resolve) => setTimeout(resolve, 100))

          // Close modal after successful release
          this.closeModal()
        } else {
          // Handle failed response
          const errorMessage = approveResponse.data?.message || 'Release failed'
          throw new Error(errorMessage)
        }
      } catch (error) {
        console.error('❌ Error releasing changes:', error)
        
        // Thông báo thất bại
        const errorMessage =
          error.response?.data?.message || 
          error.response?.data?.error ||
          error.message || 
          'Failed to approve changes'
        
        const { formatErrorForDisplay } = require('@/utils/errorMessages')
        this.toast.error(formatErrorForDisplay(error, 'Failed to release changes. Please try again.'))
      } finally {
        this.isApproving = false
      }
    },

    formatEntityType(entityType) {
      const types = {
        requirement: 'Requirement',
        input: 'Input',
        output: 'Output',
        database: 'Database',
        table: 'Table',
        column: 'Column',
        relationship: 'Relationship',
        testcase: 'Test Case',
        uml: 'UML Diagram',
        activity_diagram: 'Activity Diagram',
        sequence_diagram: 'Sequence Diagram',
        usecase_diagram: 'Use Case Diagram',
      }
      return types[entityType] || entityType
    },
    formatEntityTypeShort(entityType) {
      const shortTypes = {
        requirement: 'REQ',
        input: 'INP',
        output: 'OUT',
        database: 'DB',
        table: 'TBL',
        column: 'COL',
        relationship: 'REL',
        testcase: 'TST',
        uml: 'UML',
        activity_diagram: 'ACT',
        sequence_diagram: 'SEQ',
        usecase_diagram: 'UC',
      }
      return shortTypes[entityType] || entityType.substring(0, 3).toUpperCase()
    },

    formatChangeType(changeType) {
      const types = {
        added: 'Added',
        updated: 'Updated',
        deleted: 'Deleted',
      }
      return types[changeType] || changeType
    },

    formatSnapshot(snapshot) {
      if (typeof snapshot === 'string') {
        try {
          return JSON.stringify(JSON.parse(snapshot), null, 2)
        } catch {
          return snapshot
        }
      }
      return JSON.stringify(snapshot, null, 2)
    },

    formatDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${hours}:${minutes} ${day}/${month}/${year}`
    },

    formatEntityId(entityId) {
      if (!entityId) return ''
      const idStr = String(entityId)
      // If it's a MongoDB ObjectId (24 hex characters), show shortened version
      if (idStr.length === 24 && /^[a-f0-9]{24}$/i.test(idStr)) {
        return `ID: ${idStr.substring(0, 8)}...`
      }
      // Otherwise show full ID if short, or truncated if long
      if (idStr.length > 16) {
        return `ID: ${idStr.substring(0, 12)}...`
      }
      return `ID: ${idStr}`
    },

    resetModalState() {
      this.selectedChangeId = null
      this.selectedBumpType = 'minor'
      this.changes = []
      this.projectData = null
      this.currentVersion = null
      this.isApproved = false
      this.searchQuery = ''
      this.filterType = 'all'
      this.filterChangeType = 'all'
      this.selectedChanges = []
    },
    // Filter & Search handlers
    handleSearch() {
      // Search is handled by computed property
      // Auto-select first change if current selection is filtered out
      if (this.selectedChangeId && !this.filteredChanges.find(c => c.change_id === this.selectedChangeId)) {
        if (this.filteredChanges.length > 0) {
          this.selectedChangeId = this.filteredChanges[0].change_id
        } else {
          this.selectedChangeId = null
        }
      }
    },
    handleFilter() {
      // Filter is handled by computed property
      // Auto-select first change if current selection is filtered out
      if (this.selectedChangeId && !this.filteredChanges.find(c => c.change_id === this.selectedChangeId)) {
        if (this.filteredChanges.length > 0) {
          this.selectedChangeId = this.filteredChanges[0].change_id
        } else {
          this.selectedChangeId = null
        }
      }
    },
    // Bulk actions
    toggleBulkSelection(changeId) {
      const index = this.selectedChanges.indexOf(changeId)
      if (index > -1) {
        this.selectedChanges.splice(index, 1)
      } else {
        this.selectedChanges.push(changeId)
      }
    },
    clearSelection() {
      this.selectedChanges = []
    },
    async bulkRevertChanges() {
      if (this.selectedChanges.length === 0) return

      const count = this.selectedChanges.length
      try {
        const confirmMessage = `Are you sure you want to undo ${count} change(s)? This will remove them from the pending changes list.`
        if (!confirm(confirmMessage)) {
          return
        }

        // Undo all selected changes
        const revertPromises = this.selectedChanges.map(changeId =>
          revertChange(this.versionId, changeId)
        )

        await Promise.all(revertPromises)

        // Refresh preview
        await this.refreshPreviewData()

        // Clear selection
        this.selectedChanges = []

        this.toast.success(`Successfully undone ${count} change(s)`)
      } catch (error) {
        console.error('Error undoing changes:', error)
        const { formatErrorForDisplay } = require('@/utils/errorMessages')
        this.toast.error(formatErrorForDisplay(error, 'Failed to undo some changes. Please try again.'))
        // Still refresh and clear selection
        await this.refreshPreviewData()
        this.selectedChanges = []
      }
    },
    // Auto-refresh
    startAutoRefresh() {
      this.stopAutoRefresh() // Clear any existing interval
      this.refreshInterval = setInterval(() => {
        if (this.isVisible && !this.isLoading && !this.isApproving) {
          this.loadPreviewChanges()
        }
      }, 5000) // Refresh every 5 seconds
    },
    stopAutoRefresh() {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval)
        this.refreshInterval = null
      }
    },

    async closeModal() {
      console.log('🔒 Closing preview modal and emitting events', {
        isApproved: this.isApproved,
        hasChanges: this.changes.length > 0,
      })

      try {
        // Stop auto-refresh
        this.stopAutoRefresh()

        // 1. Emit event để component cha biết modal sắp đóng và cần refresh data
        // Chỉ emit nếu chưa approve (vì sau khi approve, preview đã bị xóa)
        if (!this.isApproved) {
          this.$emit('modal-closing', {
            projectId: this.projectId,
            versionId: this.versionId,
            hasChanges: this.changes.length > 0,
          })
        }

        // 2. Đợi một chút để đảm bảo event được xử lý
        await new Promise((resolve) => setTimeout(resolve, 50))

        // 3. Đóng modal
        this.$emit('close')

        // 4. Reset state sau khi đóng
        this.resetModalState()

        console.log('✅ Modal closed successfully')
      } catch (error) {
        console.error('Error closing modal:', error)
        // Vẫn phải đóng modal ngay cả khi có lỗi
        this.stopAutoRefresh()
        this.$emit('close')
        this.resetModalState()
      }
    },
  },
}
</script>

<style scoped>
.preview-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.preview-modal {
  background: white;
  border-radius: 12px;
  width: 95vw;
  max-width: 1400px;
  height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
  border-radius: 12px 12px 0 0;
}

.header-left h2 {
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 24px;
  font-weight: 700;
}

.project-info {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.project-name {
  font-weight: 500;
  color: #6b7280;
  font-size: 0.875rem;
}

.version-info {
  background: #e5e7eb;
  color: #374151;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

.btn-close {
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

.btn-close:hover {
  background: #f3f4f6;
  color: #374151;
}

/* Content */
.modal-content {
  flex: 1;
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 0;
  overflow: hidden;
}

/* Changes List */
.changes-section {
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 10;
}

.section-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #1f2937;
  font-weight: 600;
}

.btn-refresh {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 32px;
  height: 32px;
}

.btn-refresh .material-symbols-outlined {
  font-size: 18px;
}

.btn-refresh:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
  color: #374151;
}

.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.changes-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  scrollbar-width: thin;
  scrollbar-color: rgba(26, 54, 93, 0.2) transparent;
}

.changes-list::-webkit-scrollbar {
  width: 8px;
}

.changes-list::-webkit-scrollbar-track {
  background: transparent;
}

.changes-list::-webkit-scrollbar-thumb {
  background: rgba(26, 54, 93, 0.2);
  border-radius: 4px;
}

.changes-list::-webkit-scrollbar-thumb:hover {
  background: rgba(26, 54, 93, 0.3);
}

.change-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
  position: relative;
}

.change-item:hover {
  border-color: #9ca3af;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.change-item.selected {
  border-color: #1a365d;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.change-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.change-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.entity-type {
  font-size: 0.75rem;
  font-weight: 600;
  color: #1f2937;
  padding: 3px 8px;
  border-radius: 6px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  letter-spacing: 0.05em;
  min-width: 40px;
  text-align: center;
}

.change-type {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.change-type.added {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #065f46;
  border: 1px solid rgba(5, 95, 70, 0.2);
}

.change-type.updated {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  border: 1px solid rgba(146, 64, 14, 0.2);
}

.change-type.deleted {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #991b1b;
  border: 1px solid rgba(153, 27, 27, 0.2);
}

.change-details {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: #4b5563;
  min-height: 20px;
}

.entity-name {
  font-weight: 500;
  color: #1f2937;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.change-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  gap: 8px;
}

.change-time {
  font-weight: 400;
  color: #6b7280;
  font-size: 0.75rem;
  white-space: nowrap;
  margin-left: auto;
}

.btn-revert {
  background: #fee2e2;
  border: 1px solid #fecaca;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  color: #dc2626;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}

.btn-revert .material-symbols-outlined {
  font-size: 16px;
}

.btn-revert:hover {
  background: #fecaca;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6b7280;
  text-align: center;
  gap: 16px;
}

.loading-state .material-symbols-outlined,
.empty-state .material-symbols-outlined {
  font-size: 3rem;
  color: #9ca3af;
}

.empty-state p {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  margin: 0;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Comparison Section */
.comparison-section,
.no-selection {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.comparison-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 20px;
  overflow: hidden;
}

.change-navigation {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-nav {
  background: white;
  border: 1px solid #d1d5db;
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-nav:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
  color: #374151;
}

.btn-nav:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-info {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
  padding: 0 8px;
}

.comparison-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  flex: 1;
  min-height: 0;
}

.comparison-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  color: #374151;
}

.before-panel .panel-header {
  color: #dc2626;
}

.after-panel .panel-header {
  color: #16a34a;
}

.panel-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
  background: #fafafa;
}

.json-view {
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #374151;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6b7280;
  text-align: center;
  gap: 8px;
}


.no-selection-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6b7280;
  text-align: center;
  gap: 16px;
  padding: 40px;
}

.no-selection-content .material-symbols-outlined {
  font-size: 3rem;
  color: #d1d5db;
}

.no-selection-content h3 {
  color: #1f2937;
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.no-selection-content p {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
  max-width: 400px;
}

/* Footer */
.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
  background: #f8fafc;
  border-radius: 0 0 12px 12px;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.version-selection {
  display: flex;
  align-items: center;
  gap: 12px;
}

.version-selection > label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.version-options {
  display: flex;
  gap: 16px;
}

.version-option {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 0.875rem;
}

.version-option input[type="radio"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #1a365d;
}

.radio-label {
  color: #374151;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.01em;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-primary {
  background: #1a365d;
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: #2d4a8a;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .preview-modal {
    width: 98vw;
    height: 95vh;
  }

  .modal-content {
    grid-template-columns: 350px 1fr;
  }
}

@media (max-width: 768px) {
  .preview-modal-overlay {
    padding: 10px;
  }

  .preview-modal {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }

  .modal-content {
    grid-template-columns: 1fr;
    grid-template-rows: 300px 1fr;
  }

  .changes-section {
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }

  .comparison-view {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }

  .footer-right {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .version-selection {
    justify-content: space-between;
  }

  .summary-content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .modal-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .project-info {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .section-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .change-header {
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
  }

  .change-details {
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
  }
}

/* Search & Filter Styles */
.search-input {
  padding: 8px 10px 8px 32px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  width: 140px;
  transition: border-color 0.3s ease;
  background: white;
  color: #1f2937;
}

.search-input::placeholder {
  color: #9ca3af;
}

.search-input:focus {
  outline: none;
  border-color: #1a365d;
  width: 160px;
}

.search-input:hover:not(:focus) {
  border-color: #9ca3af;
}

.filter-select {
  padding: 8px 24px 8px 8px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  color: #1f2937;
  cursor: pointer;
  transition: border-color 0.3s ease;
  min-width: 60px;
}

.filter-select:hover {
  border-color: #9ca3af;
}

.filter-select:focus {
  outline: none;
  border-color: #1a365d;
}

/* Bulk Actions Styles */
.bulk-actions-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 8px;
  border-radius: 8px;
  margin-left: 12px;
  margin-right: 12px;
  margin-top: 8px;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bulk-info {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.875rem;
}

.btn-bulk-revert,
.btn-bulk-clear {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.btn-bulk-revert {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fecaca;
}

.btn-bulk-revert:hover {
  background: #fecaca;
}

.btn-bulk-clear {
  background: #f3f4f6;
  color: #374151;
}

.btn-bulk-clear:hover {
  background: #e5e7eb;
}

/* Bulk Selection Checkbox */
.bulk-checkbox {
  display: flex;
  align-items: center;
  margin-right: 8px;
  flex-shrink: 0;
}

.bulk-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.change-item.bulk-selected {
  background: #f0f8ff;
  border-color: #3b82f6;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 8px;
  font-size: 18px;
  color: #718096;
  pointer-events: none;
  z-index: 1;
}

.filter-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.filter-icon {
  position: absolute;
  left: 6px;
  font-size: 18px;
  color: #718096;
  pointer-events: none;
  z-index: 1;
}
</style>