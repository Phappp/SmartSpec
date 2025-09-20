<template>
  <div class="project-card" :class="{ trashed: isTrashed }">
    <div class="project-header">
      <h3 @click="openProject">{{ project.name }}</h3>

      <span v-if="!isTrashed" class="project-type" :class="projectType">
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

        <div v-if="isTrashed" class="trashed-actions">
          <button class="action-btn restore-btn" @click="restoreProject" title="Restore">
            <span class="material-symbols-outlined">restore_from_trash</span>
          </button>
          <button
            class="action-btn permanent-delete-btn"
            @click="deletePermanently"
            title="Delete Permanently"
          >
            <span class="material-symbols-outlined">delete_forever</span>
          </button>
        </div>

        <button
          v-else-if="showDelete"
          class="delete-btn"
          @click="confirmDelete"
          title="Move to Trash"
        >
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProjectCard',
  props: {
    project: { type: Object, required: true },
    showDelete: { type: Boolean, default: true },
    isTrashed: { type: Boolean, default: false }, // MỚI: Prop để xác định trạng thái
  },
  computed: {
    projectType() {
      // Logic này có thể cần user object thay vì email từ localStorage để ổn định hơn
      // Tạm thời giữ nguyên
      const currentEmail = localStorage.getItem('email')
      return this.project.owner_id?.email === currentEmail ? 'my' : 'shared'
    },
  },
  methods: {
    openProject() {
      // Ngăn không cho mở project đã ở trong thùng rác
      if (this.isTrashed) return
      this.$emit('open', this.project)
    },
    confirmDelete() {
      // Emit sự kiện 'delete' (chuyển vào thùng rác)
      this.$emit('delete', this.project._id || this.project.id)
    },
    // MỚI: Các hàm cho hành động trong thùng rác
    restoreProject() {
      this.$emit('restore', this.project._id || this.project.id)
    },
    deletePermanently() {
      this.$emit('delete-permanently', this.project._id || this.project.id)
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
/* Giữ nguyên các style cũ */
.project-type {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  margin-left: 8px;
}
.project-type.my {
  background-color: #bdd6ef;
  color: #414141;
}
.project-type.shared {
  background-color: #d1e1eb;
  color: #5f5f5f;
}

/* MỚI: Style cho card và các nút hành động trong thùng rác */
.project-card.trashed {
  background-color: #f8f9fa; /* Màu nền hơi khác để phân biệt */
  border-left: 4px solid #adb5bd;
}
.project-card.trashed h3 {
  color: #6c757d; /* Màu chữ mờ hơn */
  cursor: default; /* Bỏ con trỏ tay */
}
.trashed-actions {
  display: flex;
  gap: 8px;
}
.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}
.action-btn:hover {
  background-color: #e9ecef;
}
.action-btn .material-symbols-outlined {
  font-size: 20px;
}
.restore-btn .material-symbols-outlined {
  color: #28a745; /* Màu xanh lá cho khôi phục */
}
.permanent-delete-btn .material-symbols-outlined {
  color: #dc3545; /* Màu đỏ cho xóa vĩnh viễn */
}
</style>