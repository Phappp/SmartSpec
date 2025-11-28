<template>
  <div
    @click="handleCardClick"
    class="project-card"
    :class="{
      trashed: isTrashed,
      editing: isEditing,
      creating: isCreating,
      failed: project.creationStatus === 'failed',
      retrying: project.isRetry,
      mobile: isMobile,
      selected: isSelected,
      'has-changes': hasPendingChanges && isOwner,
    }"
  >
    <!-- Selection checkbox - LUÔN HIỂN THỊ KHI Ở TRONG THÙNG RÁC -->
    <div v-if="isTrashed && showMultiSelect" class="selection-checkbox">
      <input type="checkbox" :checked="isSelected" @click.stop="toggleSelection" />
    </div>

    <!-- Pending Changes Badge - CHỈ HIỂN THỊ CHO OWNER -->
    <div
      v-if="hasPendingChanges && isOwner && !isTrashed"
      class="changes-indicator"
      @click.stop="openPreview"
    >
      <span class="changes-badge">
        <span class="material-symbols-outlined">sync</span>
        {{ pendingChangesCount }} change{{ pendingChangesCount !== 1 ? 's' : '' }}
      </span>
    </div>

    <!-- TRẠNG THÁI ĐANG TẠO HOẶC RETRY -->
    <div v-if="isCreating" class="creating-state">
      <div class="creating-header">
        <h3 class="creating-title">{{ project.name }}</h3>
        <span
          class="creating-badge"
          :class="{
            failed: project.creationStatus === 'failed',
            retrying: project.isRetry,
          }"
        >
          {{ creatingLabel }}
        </span>
      </div>

      <p class="creating-description">{{ project.description }}</p>

      <!-- HIỂN THỊ PROGRESS BAR KHI ĐANG TẠO HOẶC RETRY -->
      <div v-if="project.creationStatus !== 'failed'" class="creating-progress">
        <div class="progress-info">
          <span class="stage-text">{{ project.currentStage }}</span>
          <span class="progress-percent">{{ project.processingProgress }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: project.processingProgress + '%' }"></div>
        </div>
      </div>

      <!-- HIỂN THỊ LỖI KHI FAILED -->
      <div v-else class="creating-failed">
        <span class="material-symbols-outlined failed-icon">error</span>
        <p class="failed-message">
          {{ project.isRetry ? 'Retry failed' : 'Project creation failed' }}
        </p>
        <button class="retry-btn" @click.stop="retryCreation">Retry</button>
      </div>

      <div class="creating-footer">
        <span class="creating-note">
          <span class="material-symbols-outlined">schedule</span>
          {{
            project.creationStatus === 'failed'
              ? project.isRetry
                ? 'Retry failed - Will be removed soon'
                : 'Creation failed - Will be removed soon'
              : project.isRetry
              ? 'Project is being retried in background'
              : 'Project is being created in background'
          }}
        </span>
      </div>
    </div>

    <!-- NORMAL PROJECT VIEW -->
    <div v-else-if="!isEditing" class="project-content">
      <div class="project-header">
        <div class="title-section">
          <h3>{{ project.name }}</h3>
          <!-- Version Info -->
          <div v-if="!isTrashed" class="version-info">
            <span class="version-badge">v{{ currentVersion }}</span>
            <span
              v-if="hasPendingChanges && isOwner"
              class="pending-indicator"
              title="Pending changes"
            ></span>
          </div>
        </div>

        <span v-if="!isTrashed" class="project-type" :class="projectType">
          {{ projectType === 'my' ? 'My Project' : 'Shared Project' }}
        </span>
      </div>

      <p class="project-description">{{ project.description }}</p>

      <div class="project-meta">
        <span class="update-time">
          {{ isTrashed ? 'Trashed' : 'Updated' }}
          {{ formatDate(isTrashed ? project.status?.trashed_at : project.updatedAt) }}
        </span>

        <div class="meta-right">
          <span class="project-members">
            <span class="material-symbols-outlined">group</span>
            {{ activeMembersCount }}
          </span>

          <!-- ẨN FAB MENU KHI Ở TRONG THÙNG RÁC -->
          <div v-if="!isTrashed" class="fab-container" @click.stop v-click-outside="closeFab">
            <button class="fab-main" @click="toggleFab">
              <span class="material-symbols-outlined">more_vert</span>
            </button>

            <div class="fab-options" :class="{ open }">
              <!-- Preview Button - CHỈ HIỂN THỊ CHO OWNER KHI CÓ CHANGES -->
              <button
                v-if="isOwner && hasPendingChanges"
                class="fab-btn fab-preview"
                :style="getStyle(0, fabActions.length)"
                @click.stop="openPreview"
                title="Review Changes"
              >
                <span class="material-symbols-outlined">visibility</span>
              </button>

              <button
                v-for="(btn, i) in fabActions"
                :key="btn.type"
                class="fab-btn"
                :class="`fab-${btn.type}`"
                :style="
                  getStyle(
                    i + (isOwner && hasPendingChanges ? 1 : 0),
                    fabActions.length + (isOwner && hasPendingChanges ? 1 : 0)
                  )
                "
                @click.stop="btn.action"
                :title="btn.title"
                :disabled="btn.disabled"
              >
                <span class="material-symbols-outlined">{{ btn.icon }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Form (inline) -->
    <div v-else class="edit-form" @click.stop>
      <div class="form-group">
        <input
          v-model="editForm.name"
          type="text"
          placeholder="Project name"
          class="form-input inline-input"
          ref="nameInput"
          @keyup.enter="saveProject"
          @keyup.esc="cancelEdit"
          @click.stop
        />
      </div>

      <div class="form-group">
        <textarea
          v-model="editForm.description"
          placeholder="Project description"
          class="form-textarea inline-textarea"
          rows="2"
          @keyup.esc="cancelEdit"
          @click.stop
        ></textarea>
      </div>

      <div class="edit-actions">
        <button class="btn btn-cancel" @click.stop="cancelEdit">Cancel</button>
        <button class="btn btn-save" @click.stop="saveProject">Save</button>
      </div>
    </div>
  </div>
</template>

<script>
// Custom directive for click outside
const clickOutside = {
  beforeMount(el, binding) {
    el.clickOutsideEvent = function (event) {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event)
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent)
  },
}

import { getPreview } from '@/api/version'

export default {
  name: 'ProjectCard',
  directives: {
    'click-outside': clickOutside,
  },
  props: {
    project: { type: Object, required: true },
    showDelete: { type: Boolean, default: true },
    isTrashed: { type: Boolean, default: false },
    isSelected: { type: Boolean, default: false },
    showMultiSelect: { type: Boolean, default: false },
    currentUserId: { type: String, default: '' },
  },
  data() {
    return {
      open: false,
      isEditing: false,
      editForm: {
        name: '',
        description: '',
      },
      isMobile: false,
      pendingChangesCount: 0,
      hasPendingChanges: false,
      isLoadingChanges: false,
    }
  },
  computed: {
    isOwner() {
      const currentUserId = this.currentUserId || localStorage.getItem('userId')
      if (!this.project.owner_id || !currentUserId) return false

      if (typeof this.project.owner_id === 'object') {
        return this.project.owner_id._id === currentUserId
      }
      if (typeof this.project.owner_id === 'string') {
        return this.project.owner_id === currentUserId
      }
      return false
    },
    isCreating() {
      return (
        this.project.isTemp ||
        this.project.creationStatus === 'creating' ||
        this.project.creationStatus === 'polling' ||
        this.project.status === 'retrying' ||
        this.project.isRetry
      )
    },
    creatingLabel() {
      if (this.project.isRetry) {
        return 'Retrying...'
      }
      return this.project.creationStatus === 'failed' ? 'Failed' : 'Creating...'
    },
    projectType() {
      return this.isOwner ? 'my' : 'shared'
    },
    isViewer() {
      return !this.isOwner
    },
    activeMembersCount() {
      return this.project.members?.filter((member) => member.status === 'accepted').length || 0
    },
    currentVersion() {
      return this.project.current_version?.version_number || '1.0'
    },
    fabActions() {
      if (this.isViewer) {
        return [
          {
            icon: 'logout',
            title: 'Leave Project',
            type: 'leave',
            action: this.leaveProject,
            disabled: false,
          },
        ]
      }
      const actions = [
        {
          icon: 'edit',
          title: 'Edit Project',
          type: 'edit',
          action: this.startEditing,
          disabled: false,
        },
        {
          icon: 'share',
          title: 'Share',
          type: 'share',
          action: () => this.shareProject(),
          disabled: false,
        },
      ]

      if (this.showDelete) {
        actions.push({
          icon: 'delete',
          title: 'Move to Trash',
          type: 'delete',
          action: this.confirmDelete,
          disabled: false,
        })
      }

      return actions
    },
    trashedActions() {
      return [
        {
          icon: 'restore_from_trash',
          title: 'Restore',
          type: 'restore',
          action: this.restoreProject,
          disabled: false,
        },
        {
          icon: 'delete_forever',
          title: 'Delete Permanently',
          type: 'delete',
          action: this.deletePermanently,
          disabled: false,
        },
      ]
    },
  },
  mounted() {
    this.checkMobile()
    window.addEventListener('resize', this.checkMobile)
    this.loadPendingChanges()
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile)
  },
  methods: {
    async loadPendingChanges() {
      if (!this.isOwner || this.isTrashed || !this.project.current_version) return

      try {
        this.isLoadingChanges = true
        const versionId = this.project.current_version._id || this.project.current_version
        const response = await getPreview(versionId)

        if (response.data && response.data.data) {
          const previewData = response.data.data
          this.pendingChangesCount = previewData.changes?.length || 0
          this.hasPendingChanges = this.pendingChangesCount > 0
        } else {
          this.pendingChangesCount = 0
          this.hasPendingChanges = false
        }
      } catch (error) {
        console.error('Error loading pending changes:', error)
        this.pendingChangesCount = 0
        this.hasPendingChanges = false
      } finally {
        this.isLoadingChanges = false
      }
    },
    openPreview() {
      if (!this.isOwner) return
      this.$emit('open-preview', this.project)
      this.closeFab()
    },
    handleCardClick() {
      // Nếu đang trong chế độ chỉnh sửa hoặc đang tạo, không làm gì cả
      if (this.isEditing || this.isCreating) return

      // Nếu đang trong thùng rác và có chế độ chọn nhiều - kích hoạt chọn nhiều
      if (this.isTrashed && this.showMultiSelect) {
        this.toggleSelection()
        return
      }

      // Xử lý bình thường cho các trường hợp khác - mở project
      this.openProject()
    },
    toggleSelection() {
      this.$emit('selection-toggle', this.project._id || this.project.id)
    },
    checkMobile() {
      this.isMobile = window.innerWidth <= 768
    },
    toggleFab() {
      if (this.isMobile) {
        // Trên mobile, hiển thị menu đơn giản
        this.open = !this.open
      } else {
        this.open = !this.open
      }
    },
    closeFab() {
      this.open = false
    },
    startEditing() {
      this.editForm = {
        name: this.project.name,
        description: this.project.description || '',
      }
      this.isEditing = true
      this.closeFab()

      this.$nextTick(() => {
        this.$refs.nameInput?.focus()
      })
    },
    retryCreation() {
      this.$emit('retry-creation', this.project._id)
    },
    shareProject() {
      this.$emit('share', this.project)
      this.closeFab()
    },
    leaveProject() {
      this.$emit('leave', this.project._id || this.project.id)
      this.closeFab()
    },
    cancelEdit(event) {
      if (event) {
        event.stopPropagation()
      }
      this.isEditing = false
      this.editForm = {
        name: '',
        description: '',
      }
    },
    async saveProject(event) {
      if (event) {
        event.stopPropagation()
      }

      if (!this.editForm.name.trim()) {
        alert('Project name is required')
        return
      }

      try {
        this.$emit('edit', {
          projectId: this.project._id || this.project.id,
          data: {
            name: this.editForm.name.trim(),
            description: this.editForm.description.trim(),
          },
        })

        this.isEditing = false
      } catch (error) {
        console.error('Error updating project:', error)
        alert('Failed to update project')
      }
    },
    getStyle(index, total) {
      if (this.isMobile) {
        // Trên mobile, hiển thị menu dạng list thẳng đứng
        return {
          transform: 'none',
          position: 'static',
          margin: '4px 0',
          width: '100%',
          borderRadius: '6px',
        }
      }

      const angle = (360 / total) * index
      const rad = (angle * Math.PI) / 180
      const radius = 50
      const x = Math.cos(rad) * radius
      const y = Math.sin(rad) * radius
      return {
        transform: `translate(${x}px, ${-y}px)`,
      }
    },
    openProject() {
      if (this.isTrashed || this.isEditing || this.isCreating) return
      this.$emit('open', this.project)
    },
    confirmDelete() {
      this.$emit('delete', this.project._id || this.project.id)
      this.closeFab()
    },
    restoreProject() {
      this.$emit('restore', this.project._id || this.project.id)
    },
    deletePermanently() {
      this.$emit('delete-permanently', this.project._id || this.project.id)
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      const now = new Date()
      const diffTime = Math.abs(now - date)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 1) return 'Yesterday'
      if (diffDays < 7) return `${diffDays} days ago`
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`

      const d = String(date.getDate()).padStart(2, '0')
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const y = date.getFullYear()
      return `${d}/${m}/${y}`
    },
  },
}
</script>

<style scoped>
.project-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 2px solid transparent;
}

.project-card:hover:not(.trashed) {
  /* transform: translateY(-2px); */
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
  /* border-color: #e2e8f0; */
}

.project-card.selected {
  border: 2px solid #007bff;
  background-color: #f0f8ff;
  box-shadow: 0 4px 16px rgba(0, 123, 255, 0.15);
}

.project-card.has-changes {
  border-left: 4px solid #ff6b35;
  background: linear-gradient(135deg, #fff 0%, #fff9f5 100%);
}

/* Thêm hiệu ứng cho thẻ được chọn trong thùng rác */
.project-card.trashed.selected {
  background-color: #e8f4ff;
  border-color: #0056b3;
}

/* Hiệu ứng hover cho thẻ trong thùng rác */
.project-card.trashed:not(.selected):hover {
  background-color: #f8f9fa;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Selection checkbox */
.selection-checkbox {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
}

.selection-checkbox input {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #007bff;
}

/* Changes Indicator */
.changes-indicator {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 20;
}

.changes-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #ff6b35, #ff8e53);
  color: white;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  animation: pulse 2s infinite;
}

.changes-badge:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 107, 53, 0.4);
}

.changes-badge .material-symbols-outlined {
  font-size: 14px;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.project-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.project-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
}

.title-section {
  flex: 1;
  min-width: 0;
}

.project-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #222;
  margin: 0 0 8px 0;
  cursor: pointer;
  transition: color 0.2s;
  line-height: 1.3;
}

.project-header h3:hover {
  color: #007bff;
}

.version-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-badge {
  background: #e8f3ff;
  color: #0066cc;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.pending-indicator {
  width: 8px;
  height: 8px;
  background: #ff6b35;
  border-radius: 50%;
  animation: blink 2s infinite;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0.3;
  }
}

.project-type {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.project-type.my {
  background: #e8f3ff;
  color: #0066cc;
}

.project-type.shared {
  background: #f3f8f6;
  color: #198754;
}

.project-description {
  color: #555;
  font-size: 13px;
  margin: 6px 0 12px;
  line-height: 1.5;
  text-align: left;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-header h3 {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #777;
}

.meta-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-members {
  display: flex;
  align-items: center;
  gap: 4px;
}

.project-members .material-symbols-outlined {
  font-size: 18px;
  color: #555;
}

.project-card.trashed {
  background-color: #fdfdfd;
  border: 1px dashed #ccc;
  opacity: 0.85;
  cursor: pointer;
}

.project-card.trashed h3 {
  color: #888;
}

/* ẨN FAB container khi ở trong thùng rác */
.project-card.trashed .fab-container {
  display: none !important;
}

.fab-container {
  position: relative;
  display: inline-block;
  background: transparent;
}

.fab-main {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  font-size: 20px;
  background: transparent;
  transition: background 0.3s ease;
}

.fab-main:hover {
  color: #222;
}

.fab-options {
  position: absolute;
  top: 45%;
  left: 45%;
  width: 150px;
  height: 150px;
  margin-left: -70px;
  margin-top: -70px;
  border-radius: 50%;
  pointer-events: none;
}

.fab-options.open {
  pointer-events: auto;
  background: transparent;
  border: 1px solid #ddd;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(6px);
  z-index: 10;
}
.project-card:hover .fab-options.open {
  z-index: 10;
}
.fab-btn {
  position: absolute;
  top: 36%;
  left: 38%;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgb(73, 73, 73);
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.3s ease;
}

.fab-options.open .fab-btn {
  opacity: 1;
  transform: translate(var(--x), var(--y)) scale(1);
}

.fab-options.open .fab-btn:hover {
  transform: translate(var(--x), var(--y)) scale(1.2);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.8);
  scale: 1.1;
}

.fab-btn.fab-delete {
  background: #dc35452a;
  color: #000000;
}
.fab-btn.fab-delete:hover {
  background: #dc3545;
  color: #fff;
}

.fab-btn.fab-edit {
  background: #ffc1072a;
  color: #000000;
}
.fab-btn.fab-edit:hover {
  background: #ffc107;
  color: #000;
}

.fab-btn.fab-restore {
  background: #28a7452a;
  color: #000000;
}
.fab-btn.fab-restore:hover {
  background: #28a745;
  color: #fff;
}

.fab-btn.fab-share {
  background: #0d6efd2a;
  color: #000000;
}
.fab-btn.fab-share:hover {
  background: #0d6efd;
  color: #fff;
}

.fab-btn.fab-palette {
  background: #6f42c12a;
  color: #000000;
}
.fab-btn.fab-palette:hover {
  background: #6f42c1;
  color: #fff;
}

.fab-btn.fab-leave {
  background: #fd7e142a;
  color: #000000;
}
.fab-btn.fab-leave:hover {
  background: #fd7e14;
  color: #fff;
}

.fab-btn.fab-preview {
  background: #ff6b352a;
  color: #000000;
}
.fab-btn.fab-preview:hover {
  background: #ff6b35;
  color: #fff;
}

.fab-container:hover .fab-main {
  transition: 0.2s ease;
  background: #0000001a;
  box-shadow: 0 0 12px rgba(121, 118, 118, 0.6);
}

/* Creating State Styles */
.creating-state {
  width: 100%;
}

.creating-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.creating-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.creating-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.creating-badge:not(.failed):not(.retrying) {
  background: #dbeafe;
  color: #1e40af;
}

.creating-badge.failed {
  background: #fecaca;
  color: #dc2626;
}

.creating-badge.retrying {
  background: #fef3c7;
  color: #d97706;
}

.creating-description {
  color: #64748b;
  font-size: 14px;
  margin-bottom: 16px;
  line-height: 1.5;
}

.creating-progress {
  margin-bottom: 16px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: #64748b;
}

.stage-text {
  font-weight: 500;
}

.progress-percent {
  font-weight: 700;
  color: #3b82f6;
}

.progress-bar {
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.creating-failed {
  text-align: center;
  padding: 20px;
  color: #dc2626;
}

.failed-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.7;
}

.failed-message {
  margin: 0 0 16px 0;
  font-weight: 600;
}

.retry-btn {
  padding: 8px 20px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: #b91c1c;
  transform: translateY(-1px);
}

.creating-footer {
  text-align: center;
}

.creating-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  color: #94a3b8;
}

/* Edit Form Styles */
.edit-form {
  width: 100%;
}

.form-group {
  margin-bottom: 16px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.edit-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: #f1f5f9;
  color: #64748b;
}

.btn-cancel:hover {
  background: #e2e8f0;
}

.btn-save {
  background: #3b82f6;
  color: white;
}

.btn-save:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

/* ===== RESPONSIVE STYLES ===== */
@media (max-width: 768px) {
  .project-card {
    margin-right: 0;
    margin-bottom: 16px;
    padding: 12px 16px;
    min-height: 120px;
  }

  .project-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .project-header h3 {
    font-size: 16px;
    max-width: 100%;
  }

  .project-type {
    font-size: 9px;
    padding: 3px 8px;
  }

  .project-description {
    font-size: 12px;
    margin: 4px 0 8px;
  }

  .project-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .meta-right {
    width: 100%;
    justify-content: space-between;
  }

  /* Mobile FAB menu */
  .fab-options {
    position: fixed;
    top: auto !important;
    left: 50% !important;
    bottom: 20px;
    transform: translateX(-50%);
    width: 90%;
    max-width: 300px;
    height: auto;
    border-radius: 12px;
    background: transparent;
    margin: 0;
  }

  .fab-options.open .fab-btn {
    position: static;
    transform: none !important;
    width: 100%;
    height: 44px;
    border-radius: 8px;
    margin: 2px 0;
    opacity: 1;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0 16px;
    gap: 12px;
  }

  .fab-btn span {
    font-size: 20px;
  }

  .creating-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .creating-title {
    font-size: 16px;
  }

  .creating-badge {
    align-self: flex-start;
  }

  .edit-actions {
    flex-direction: column;
    gap: 8px;
  }

  .btn {
    width: 100%;
    padding: 10px;
  }

  .selection-checkbox {
    top: 8px;
    left: 8px;
  }

  .selection-checkbox input {
    width: 16px;
    height: 16px;
  }

  .changes-badge {
    font-size: 11px;
    padding: 5px 10px;
  }
}

@media (max-width: 480px) {
  .project-card {
    padding: 10px 12px;
    min-height: 110px;
  }

  .project-header h3 {
    font-size: 15px;
  }

  .project-description {
    font-size: 11px;
    -webkit-line-clamp: 3;
  }

  .creating-title {
    font-size: 15px;
  }

  .creating-description {
    font-size: 12px;
  }

  .fab-options.open {
    position: fixed;
    top: 0;
    min-width: 90vw;
  }

  .fab-main {
    width: 32px;
    height: 32px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .fab-main span {
    font-size: 24px;
  }

  .changes-badge {
    font-size: 10px;
    padding: 4px 8px;
  }

  .version-badge {
    font-size: 10px;
  }
}
</style>