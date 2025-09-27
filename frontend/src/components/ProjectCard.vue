<template>
  <div @click="openProject" class="project-card" :class="{ trashed: isTrashed }">
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

        <!-- FAB menu -->
        <div class="fab-container" @mouseenter="open = true" @mouseleave="open = false" @click.stop>
          <button class="fab-main">
            <span class="material-symbols-outlined">more_vert</span>
          </button>

          <!-- thêm :class="{ open }" -->
          <div class="fab-options" :class="{ open }">
            <button
              v-for="(btn, i) in isTrashed ? trashedActions : normalActions"
              :key="i"
              class="fab-btn"
              :class="`fab-${btn.type}`"
              :style="getStyle(i, isTrashed ? trashedActions.length : normalActions.length)"
              @click.stop="btn.action"
              :title="btn.title"
            >
              <span class="material-symbols-outlined">{{ btn.icon }}</span>
            </button>
          </div>
        </div>
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
    isTrashed: { type: Boolean, default: false },
  },
  data() {
    return {
      open: false,
    }
  },
  computed: {
    projectType() {
      const currentUserId = localStorage.getItem('userId')
      if (!this.project.owner_id || !currentUserId) return 'shared'

      if (typeof this.project.owner_id === 'object') {
        return this.project.owner_id._id === currentUserId ? 'my' : 'shared'
      }
      if (typeof this.project.owner_id === 'string') {
        return this.project.owner_id === currentUserId ? 'my' : 'shared'
      }
      return 'shared'
    },
    normalActions() {
      return [
        { icon: 'delete', title: 'Move to Trash', type: 'delete', action: this.confirmDelete },
        { icon: 'share', title: 'Share', type: 'share', action: () => alert('Share clicked') },
        {
          icon: 'palette',
          title: 'Change Color',
          type: 'palette',
          action: () => alert('Change color'),
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
        },
        {
          icon: 'delete_forever',
          title: 'Delete Permanently',
          type: 'delete',
          action: this.deletePermanently,
        },
      ]
    },
  },
  methods: {
    getStyle(index, total) {
      const angle = (360 / total) * index
      const rad = (angle * Math.PI) / 180
      const radius = 50 // bán kính vòng tròn
      const x = Math.cos(rad) * radius
      const y = Math.sin(rad) * radius
      return {
        transform: `translate(${x}px, ${-y}px)`,
      }
    },
    openProject() {
      if (this.isTrashed) return
      this.$emit('open', this.project)
    },
    confirmDelete() {
      this.$emit('delete', this.project._id || this.project.id)
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
  margin-right: 32px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  cursor: pointer;
}

.project-card:hover:not(.trashed) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
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
  font-size: 14px;
  margin: 6px 0 12px;
  line-height: 1.5;
  text-align: left;
}

.project-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
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

/* Trạng thái trashed */
.project-card.trashed {
  background-color: #fdfdfd;
  border: 1px dashed #ccc;
  opacity: 0.85;
}

.project-card.trashed h3 {
  color: #888;
}

.trashed-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  transition: background-color 0.2s;
}
.action-btn:hover {
  background-color: #f0f0f0;
}

.action-btn .material-symbols-outlined {
  font-size: 20px;
}
.restore-btn .material-symbols-outlined {
  color: #28a745;
}
.permanent-delete-btn .material-symbols-outlined {
  color: #dc3545;
}

.delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: background-color 0.2s;
}
.delete-btn:hover {
  background-color: #f8d7da;
}
.delete-btn .material-symbols-outlined {
  font-size: 20px;
  color: #dc3545;
}
/* FAB Container */
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
}

/* Vòng tròn chứa các nút con */
.fab-options {
  position: absolute;
  top: 45%;
  left: 45%;
  width: 150px; /* to hơn bán kính 70 */
  height: 150px;
  margin-left: -70px;
  margin-top: -70px;
  border-radius: 50%;
  pointer-events: none; /* không block chuột */
}

.fab-options.open {
  pointer-events: auto; /* bật khi hover container */
  background: transparent;
  border: 1px solid #ddd;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(3px);
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

/* Khi open thì hiện nút con */
.fab-options.open .fab-btn {
  opacity: 1;
  transform: translate(var(--x), var(--y)) scale(1);
}
.fab-options.open .fab-btn:hover {
  translate: 0;
  scale: 1.4;
}
/* Delete (đỏ) */
.fab-btn.fab-delete:hover {
  background: #dc3545;
  color: #fff;
}

/* Restore (xanh lá) */
.fab-btn.fab-restore:hover {
  background: #28a745;
  color: #fff;
}

/* Share (xanh dương) */
.fab-btn.fab-share:hover {
  background: #0d6efd;
  color: #fff;
}

/* Palette (tím) */
.fab-btn.fab-palette:hover {
  background: #6f42c1;
  color: #fff;
}
/* Cha: nút nav */
.nav-item {
  position: relative;
  background: #222;
  color: #fff;
  padding: 12px 20px;
  transition: background 0.3s ease;
}

/* Con: submenu */
.nav-subitem {
  background: #333;
  padding: 10px 18px;
  transition: background 0.3s ease, box-shadow 0.3s ease;
}

/* Khi hover vào con thì cha cũng sáng */
.nav-subitem:hover {
  background: #444;
  box-shadow: 0 0 10px rgba(0, 255, 150, 0.6);
}

/* dùng selector để làm cha sáng khi hover con */
.nav-item:hover,
.nav-item:has(.nav-subitem:hover) {
  background: linear-gradient(to right, #00ff99, #004466);
}
/* Khi hover vào nút con thì cha fab-container sáng */
.fab-container:hover .fab-main {
  background: linear-gradient(135deg, #00ff99, #004466);
  color: #fff;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.6);
  transition: all 0.3s ease;
}

/* Hiệu ứng lan tỏa khi hover nút con */
.fab-options.open .fab-btn:hover {
  scale: 1.2;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.8);
}

/* Nếu muốn cha sáng chỉ khi hover vào nút con (không phải khi hover cả container) */
.fab-options .fab-btn:hover ~ .fab-main,
.fab-options .fab-btn:hover::before {
  background: linear-gradient(135deg, #cccecd, #ffffff);
  color: #fff;
}
</style>
