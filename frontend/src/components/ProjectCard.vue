<template>
  <div
    class="project-card"
    :class="{
      trashed: isTrashed,
      editing: isEditing,
      creating: isCreating,
      failed: project.creationStatus === 'failed',
      retrying: project.isRetry,
      mobile: isMobile,
      selected: isSelected,
    }"
    @click="handleCardClick"
  >
    <!-- Project Content -->
    <div v-if="!isEditing" class="project-content">
      <div class="project-header">
        <h3>{{ project.name }}</h3>

        <span v-if="!isTrashed" class="project-type fab-container" :class="projectType">
          {{ projectType === 'my' ? 'My Project' : 'Shared Project' }}
        </span>
      </div>

      <p class="project-description">{{ project.description }}</p>

      <div class="project-meta">
        <div class="meta-left">
          <span class="update-time">
            {{ isTrashed ? 'Trashed' : 'Updated' }}
            {{ formatDate(isTrashed ? project.status.trashed_at : project.updatedAt) }}
          </span>

          <!-- Hiển thị version hiện tại -->
          <div v-if="!isTrashed && currentVersion" class="version-info">
            <span class="version-label">Version:</span>
            <span class="version-number">{{
              currentVersion.version_number ||
              `${currentVersion.version_major}.${currentVersion.version_minor}`
            }}</span>
          </div>
        </div>

        <div class="meta-right">
          <span class="project-members">
            <span class="material-symbols-outlined">group</span>
            {{ project.members?.filter((member) => member.status === 'accepted').length || 0 }}
          </span>

          <!-- Hiển thị số lượng changes và nút mở preview -->
          <div
            v-if="!isTrashed && pendingChangesCount > 0"
            class="changes-indicator"
            @click.stop="openPreview"
          >
            <span class="material-symbols-outlined">sync_alt</span>
            <span class="changes-count"
              >{{ pendingChangesCount }} change{{ pendingChangesCount > 1 ? 's' : '' }}</span
            >
          </div>

          <!-- FAB Menu -->
          <div v-if="!isTrashed" class="fab-container" @click.stop v-click-outside="closeFab">
            <button class="fab-main" @click="toggleFab">
              <span class="material-symbols-outlined">more_vert</span>
            </button>

            <div class="fab-options" :class="{ open }">
              <button
                v-for="(btn, i) in normalActions"
                :key="i"
                class="fab-btn"
                :class="`fab-${btn.type}`"
                :style="getStyle(i, normalActions.length)"
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
import { getVersionInProject } from '@/api/project'
import eventBus from '@/utils/eventBus'

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
      currentVersion: null,
      temporaryVersion: null, // Version tạm thời có pending changes
      pendingChangesCount: 0,
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
        this.project.status === 'retrying' ||
        this.project.isRetry
      )
    },
    projectType() {
      return this.isOwner ? 'my' : 'shared'
    },
    isViewer() {
      return !this.isOwner
    },
    normalActions() {
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
          icon: 'delete',
          title: 'Move to Trash',
          type: 'delete',
          action: this.confirmDelete,
          disabled: false,
        },
      ]
    },
  },
  async mounted() {
    this.checkMobile()
    window.addEventListener('resize', this.checkMobile)

    // Listen for changes-updated event from PreviewModal
    eventBus.on('project-changes-updated', this.handleProjectChangesUpdated)
    
    // Listen for project data updates from other pages (e.g., UsecaseManagement)
    eventBus.on('project-data-updated', this.handleProjectDataUpdated)

    // Load version và changes data
    if (!this.isTrashed) {
      await this.loadVersionData()
      await this.loadPendingChanges()
    }
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile)
    eventBus.off('project-changes-updated', this.handleProjectChangesUpdated)
    eventBus.off('project-data-updated', this.handleProjectDataUpdated)
  },
  watch: {
    'project._id': {
      immediate: true,
      async handler() {
        if (!this.isTrashed) {
          await this.loadVersionData()
          await this.loadPendingChanges()
        }
      },
    },
    currentVersion: {
      handler(newVersion) {
        // Khi currentVersion thay đổi, load lại pending changes
        if (newVersion && !this.isTrashed) {
          this.loadPendingChanges()
        }
      },
    },
  },

  methods: {
    async loadVersionData() {
      try {
        const response = await getVersionInProject(this.project._id)
        if (response.data && response.data.data) {
          const allVersions = response.data.data
          
          // Chỉ lấy version đã được approve (version_temporary = false) để hiển thị
          const approvedVersions = allVersions.filter(
            (v) => v.version_temporary === false || v.version_temporary === undefined
          )
          
          // Tìm version từ project.current_version (đã được approve) để hiển thị
          this.currentVersion =
            approvedVersions.find((v) => v._id === this.project.current_version) ||
            approvedVersions[0] ||
            null
          
          // Tìm version tạm thời (có thể có pending changes)
          this.temporaryVersion = allVersions.find(
            (v) => v.version_temporary === true
          ) || null
        }
      } catch (error) {
        console.error('Error loading version data:', error)
      }
    },

    async loadPendingChanges() {
      try {
        // Tìm version tạm thời có preview (pending changes)
        // Nếu không có version tạm thời, thử load từ currentVersion
        const versionToCheck = this.temporaryVersion || this.currentVersion
        
        if (!versionToCheck) {
          console.log('⚠️ No version to check for pending changes')
          this.pendingChangesCount = 0
          return
        }

        console.log('🔄 Loading pending changes for version:', versionToCheck._id, {
          isTemporary: versionToCheck.version_temporary === true
        })
        const response = await getPreview(versionToCheck._id)
        console.log('📦 Preview response:', response.data)
        
        if (response.data && response.data.data) {
          const changes = response.data.data.changes || []
          this.pendingChangesCount = changes.length
          console.log(`✅ Loaded ${this.pendingChangesCount} pending changes for project ${this.project._id}`)
        } else {
          this.pendingChangesCount = 0
          console.log('⚠️ No changes data in response')
        }
      } catch (error) {
        // Nếu lỗi 404 hoặc preview không tồn tại, không có pending changes
        if (error.response?.status === 404) {
          console.log('ℹ️ No preview found (no pending changes)')
          this.pendingChangesCount = 0
        } else {
          console.error('❌ Error loading pending changes:', error)
          this.pendingChangesCount = 0
        }
      }
    },

    async openPreview() {
      // Refresh data trước khi mở modal
      await this.loadVersionData()
      await this.loadPendingChanges()

      // Sử dụng version tạm thời nếu có (để xem pending changes)
      // Nếu không có, sử dụng currentVersion
      const versionToOpen = this.temporaryVersion || this.currentVersion
      
      if (!versionToOpen) {
        console.warn('⚠️ No version available to open preview')
        return
      }

      this.$emit('open-preview', {
        projectId: this.project._id,
        versionId: versionToOpen._id,
        versionData: versionToOpen,
        pendingChangesCount: this.pendingChangesCount,
      })
    },

    handleCardClick() {
      if (this.isEditing || this.isCreating) return

      if (this.isTrashed) {
        this.toggleSelection()
        return
      }

      this.openProject()
    },

    toggleSelection() {
      this.$emit('selection-toggle', this.project._id || this.project.id)
    },

    checkMobile() {
      this.isMobile = window.innerWidth <= 768
    },

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

    formatDate(dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      const d = String(date.getDate()).padStart(2, '0')
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const y = date.getFullYear()
      return `${d}/${m}/${y}`
    },
    async refreshProjectData() {
      await this.loadVersionData()
      await this.loadPendingChanges()
    },
    handleProjectChangesUpdated(event) {
      // Only refresh if this is the affected project
      if (event && event.projectId === this.project._id) {
        console.log('🔄 Refreshing ProjectCard after changes update:', event)
        this.refreshProjectData()
      }
    },
    handleProjectDataUpdated(event) {
      // Refresh when project data is updated from other pages (e.g., UsecaseManagement)
      if (event && event.projectId === this.project._id) {
        console.log('🔄 Refreshing ProjectCard after project data update:', event)
        this.refreshProjectData()
      }
    },
  },
}
</script>

<style scoped>
/* Giữ nguyên tất cả CSS hiện có và thêm style mới */

.project-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 64px;
  margin-right: 36px;
  box-shadow: 0 4px 16px rgba(26, 54, 93, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.project-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: linear-gradient(135deg, rgba(26, 54, 93, 0.1) 0%, rgba(45, 74, 138, 0.1) 100%);
  transition: width 0.3s ease;
}

.project-card:hover:not(.trashed)::before {
  width: 4px;
}

.project-card:hover:not(.trashed) {
  box-shadow: 0 8px 32px rgba(26, 54, 93, 0.2), 0 0 0 1px rgba(26, 54, 93, 0.1);
  transform: translateY(-4px) scale(1.02);
  background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
}

.project-card.selected {
  border: 3px solid #1a365d;
  background: linear-gradient(135deg, #e6f2ff 0%, #dbeafe 100%);
  box-shadow: 0 8px 24px rgba(26, 54, 93, 0.25), 0 0 0 3px rgba(26, 54, 93, 0.1);
  animation: selectedPulse 2s ease-in-out infinite;
}

@keyframes selectedPulse {
  0%, 100% {
    box-shadow: 0 8px 24px rgba(26, 54, 93, 0.25), 0 0 0 3px rgba(26, 54, 93, 0.1);
  }
  50% {
    box-shadow: 0 8px 24px rgba(26, 54, 93, 0.35), 0 0 0 3px rgba(26, 54, 93, 0.2);
  }
}

.project-card.trashed.selected {
  background-color: #e8f4ff;
  border-color: #0056b3;
}

.project-card.trashed:not(.selected):hover {
  background-color: #f8f9fa;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.selection-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
}

.selection-checkbox input {
  width: 18px;
  height: 18px;
  cursor: pointer;
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
  font-weight: 700;
  background: linear-gradient(135deg, #1a365d 0%, #2d4a8a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}

.project-header h3:hover {
  transform: translateX(2px);
  filter: brightness(1.1);
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
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
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

.meta-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.version-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.version-label {
  color: #666;
}

.version-number {
  font-weight: 600;
  color: #1a365d;
  background: #e8f3ff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
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

/* Changes Indicator */
.changes-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  padding: 6px 12px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);
  position: relative;
  overflow: hidden;
}

.changes-indicator::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: left 0.5s;
}

.changes-indicator:hover::before {
  left: 100%;
}

.changes-indicator:hover {
  background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%);
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3);
  border-color: rgba(245, 158, 11, 0.5);
}

.changes-indicator .material-symbols-outlined {
  font-size: 14px;
}

.changes-count {
  font-weight: 600;
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
  z-index: 1;
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

/* ===== RESPONSIVE STYLES ===== */
@media (max-width: 768px) {
  .project-card {
    margin-right: 0;
    margin-bottom: 20px;
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
    font-size: 7px;
    padding: 1px 6px;
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

  .changes-indicator {
    font-size: 10px;
    padding: 3px 6px;
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
    top: 6px;
    left: 6px;
  }

  .selection-checkbox input {
    width: 16px;
    height: 16px;
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

  .changes-indicator {
    font-size: 9px;
    padding: 2px 4px;
  }
}
</style>