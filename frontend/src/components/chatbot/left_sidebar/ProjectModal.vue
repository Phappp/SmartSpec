<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>Chọn Dự Án</h2>
        <button class="close-btn" @click="$emit('close')">
          <i class="material-symbols-outlined">close</i>
        </button>
      </div>

      <div class="modal-body">
        <div class="projects-grid">
          <div
            v-for="project in projects"
            :key="project.id"
            class="project-card"
            :class="{ active: String(project.id) === String(selectedProject) }"
            @click="$emit('select', project.id)"
          >
            <div class="project-header">
              <h3 class="project-name">{{ project.name }}</h3>
              <span class="project-status" :class="project.status">
                {{ project.status === 'active' ? 'Đang hoạt động' : 'Tạm dừng' }}
              </span>
            </div>

            <p class="project-description">{{ project.description }}</p>

            <div class="project-meta">
              <div class="meta-item">
                <i class="material-symbols-outlined">people</i>
                <span class="meta-text">{{ project.members }} thành viên</span>
              </div>
              <div class="meta-item">
                <i class="material-symbols-outlined">calendar_today</i>
                <span class="meta-text">Cập nhật: {{ project.lastUpdated }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="$emit('close')">Đóng</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProjectModal',
  props: {
    show: {
      type: Boolean,
      required: true,
    },
    projects: {
      type: Array,
      required: true,
    },
    selectedProject: {
      type: [Number, String],
      default: null,
    },
  },
  emits: ['close', 'select'],
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(13, 17, 23, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #30363d;
  background: #161b22;
}

.modal-header h2 {
  color: #f0f6fc;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: #8b949e;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background: #21262d;
  color: #f0f6fc;
}

.modal-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.project-card {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.project-card:hover {
  border-color: #58a6ff;
  transform: translateY(-2px);
}

.project-card.active {
  border-color: #58a6ff;
  background: rgba(88, 166, 255, 0.1);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.project-name {
  color: #f0f6fc;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.project-status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.project-status.active {
  background: rgba(46, 160, 67, 0.15);
  color: #7ee787;
}

.project-status.inactive {
  background: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
}

.project-description {
  color: #8b949e;
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 16px;
}

.project-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #8b949e;
  font-size: 12px;
}

.meta-item .material-symbols-outlined {
  font-size: 14px;
}

.project-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #21262d;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #58a6ff;
  border-radius: 3px;
  transition: width 0.3s;
}

.progress-text {
  color: #8b949e;
  font-size: 12px;
  min-width: 80px;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #30363d;
  display: flex;
  justify-content: flex-end;
}

.btn-secondary {
  background: #21262d;
  color: #c9d1d9;
  border: 1px solid #30363d;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btn-secondary:hover {
  background: #30363d;
  border-color: #8b949e;
}

.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: #161b22;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: #484f58;
}
</style>