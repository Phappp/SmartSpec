<template>
  <div
    @click="openProject"
    class="project-card"
    :class="{
      trashed: isTrashed,
      editing: isEditing,
      creating: isCreating,
      failed: project.creationStatus === 'failed',
      retrying: project.isRetry, // THÊM class retrying
    }"
  >
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
          <!-- SỬ DỤNG computed property -->
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
    <div v-if="!isEditing" class="project-content">
      <div class="project-header">
        <h3>{{ project.name }}</h3>

        <span v-if="!isTrashed" class="project-type fab-container" :class="projectType">
          {{ projectType === 'my' ? 'My Project' : 'Shared Project' }}
        </span>
      </div>

      <p class="project-description">{{ project.description }}</p>

      <div class="project-meta">
        <span class="update-time">
          {{ isTrashed ? 'Trashed' : 'Updated' }}
          {{ formatDate(isTrashed ? project.status.trashed_at : project.updatedAt) }}
        </span>

        <div class="meta-right">
          <span class="project-members">
            <span class="material-symbols-outlined">group</span>
            {{ project.members?.length || 0 }}
          </span>

          <div class="fab-container" @click.stop v-click-outside="closeFab">
            <button class="fab-main" @click="toggleFab">
              <span class="material-symbols-outlined">more_vert</span>
            </button>

            <div class="fab-options" :class="{ open }">
              <button
                v-for="(btn, i) in isTrashed ? trashedActions : normalActions"
                :key="i"
                class="fab-btn"
                :class="`fab-${btn.type}`"
                :style="getStyle(i, isTrashed ? trashedActions.length : normalActions.length)"
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

export default {
  name: 'ProjectCard',
  directives: {
    'click-outside': clickOutside,
  },
  props: {
    project: { type: Object, required: true },
    showDelete: { type: Boolean, default: true },
    isTrashed: { type: Boolean, default: false },
  },
  data() {
    return {
      open: false,
      isEditing: false,
      editForm: {
        name: '',
        description: '',
      },
    }
  },
  computed: {
    isOwner() {
      const currentUserId = localStorage.getItem('userId')
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
        this.project.status === 'retrying' || // THÊM điều kiện này
        this.project.isRetry // THÊM điều kiện này
      )
    },

    // COMPUTED PROPERTY MỚI: Hiển thị label phù hợp
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

    normalActions() {
      // Nếu là viewer (không phải owner), chỉ có nút Leave
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

      // Nếu là owner, có đầy đủ quyền
      return [
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
        {
          icon: 'palette',
          title: 'Change Color',
          type: 'palette',
          action: () => this.changeColor(),
          disabled: false,
        },
        {
          icon: 'delete',
          title: 'Move to Trash',
          type: 'delete',
          action: this.confirmDelete,
          disabled: false,
        },
      ]
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
  methods: {
    toggleFab() {
      this.open = !this.open
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
      // Emit event để parent xử lý retry
      this.$emit('retry-creation', this.project._id)
    },
    changeColor() {
      alert('Change color clicked')
    },

    shareProject() {
      alert('Share clicked')
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
      const angle = (360 / total) * index
      const rad = (angle * Math.PI) / 180
      const radius = 50
      const x = Math.cos(rad) * radius
      const y = Math.sin(rad) * radius
      return {
        transform: `translate(${x}px, ${-y}px)`,
      }
    },

    // Trong methods
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
      this.closeFab()
    },

    deletePermanently() {
      this.$emit('delete-permanently', this.project._id || this.project.id)
      this.closeFab()
    },

    formatDate(dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
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
  margin-bottom: 64px;
  margin-right: 36px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  cursor: pointer;
  position: relative;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.project-card:hover:not(.trashed) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.32);
}

.project-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.project-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.project-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #222;
  margin: 0;
  cursor: pointer;
  transition: color 0.2s;
}

.project-header h3:hover {
  color: #007bff;
}

.project-type {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.project-type.my {
  background-color: #e8f3ff;
  color: #0066cc;
}
.project-type.shared {
  background-color: #f3f8f6;
  color: #198754;
}

.project-description {
  color: #555;
  font-size: 13px;
  margin: 6px 0 12px;
  line-height: 1.5;
  text-align: left;
}

.project-description {
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
}

.project-card.trashed h3 {
  color: #888;
}

.fab-container {
  position: relative;
  display: inline-block;
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

.fab-container:hover .fab-main {
  transition: 0.2s ease;
  background: #0000001a;
  box-shadow: 0 0 12px rgba(121, 118, 118, 0.6);
}

/* Edit Form Styles */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  margin-bottom: 0;
}

.inline-input,
.inline-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border 0.3s ease;
  box-sizing: border-box;
}

.inline-input:focus,
.inline-textarea:focus {
  outline: none;
  border-color: #007bff;
}

.inline-input {
  font-size: 18px;
  font-weight: 600;
  height: 36px;
}

.inline-textarea {
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: #f8f9fa;
  color: #333;
}

.btn-cancel:hover {
  background: #e9ecef;
}

.btn-save {
  background: #1a365d;
  opacity: 0.8;
  color: white;
}

.btn-save:hover {
  opacity: 1;
}

/* Ensure consistent height when editing */
.project-card.editing {
  min-height: 140px;
  justify-content: flex-start;
}

.fab-btn:disabled {
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
  cursor: not-allowed;
}

.fab-btn:disabled:hover {
  background: rgb(73, 73, 73);
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
  transform: scale(1);
}
/* Creating State Styles */
/* Creating State Styles */
.project-card.creating {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 2px dashed #1a365d;
  cursor: not-allowed;
  opacity: 0.9;
}

.creating-state {
  padding: 4px;
}

.creating-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.creating-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a365d;
  margin: 0;
  flex: 1;
}

.creating-badge {
  background: #1a365d;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
}

.creating-badge.failed {
  background: #ef4444;
}

.creating-description {
  color: #666;
  font-size: 14px;
  margin: 8px 0 16px;
  line-height: 1.4;
}

.creating-progress {
  margin: 16px 0;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
  color: #666;
}

.stage-text {
  font-weight: 500;
}

.progress-percent {
  font-weight: 600;
  color: #1a365d;
}

.progress-bar {
  height: 6px;
  background-color: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1a365d, #2c5282);
  border-radius: 3px;
  transition: width 0.5s ease-in-out;
}

.creating-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e9ecef;
}

.creating-note {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #6c757d;
  font-style: italic;
}

.creating-note .material-symbols-outlined {
  font-size: 14px;
}

/* Failed State */
.project-card.failed {
  border-color: #ef4444;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
}

.creating-failed {
  text-align: center;
  padding: 16px 0;
}

.failed-icon {
  font-size: 32px;
  color: #ef4444;
  margin-bottom: 8px;
}

.failed-message {
  color: #ef4444;
  font-size: 14px;
  margin-bottom: 12px;
  font-weight: 500;
}

.retry-btn {
  background: #ef4444;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.3s;
}

.retry-btn:hover {
  background: #dc2626;
}

/* Ẩn FAB menu và normal content khi đang creating */
.project-card.creating .project-content,
.project-card.creating .fab-container {
  display: none !important;
}
</style>