<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content large">
      <div class="modal-header">
        <h3>
          <span class="material-symbols-outlined">info</span>
          Chi tiết dự án
        </h3>
        <button class="close-btn" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body details">
        <div class="detail-grid">
          <div class="detail-item">
            <label>Tên dự án:</label>
            <p>{{ project.name }}</p>
          </div>
          <div class="detail-item">
            <label>Mô tả:</label>
            <p>{{ project.description || '—' }}</p>
          </div>
          <div class="detail-item">
            <label>Ngôn ngữ:</label>
            <p>{{ formatLanguage(project.language) }}</p>
          </div>
          <div class="detail-item">
            <label>Chủ sở hữu:</label>
            <p>{{ project.owner?.email || 'Không xác định' }}</p>
          </div>
          <div class="detail-item">
            <label>Trạng thái:</label>
            <p>
              <span
                class="status-badge"
                :class="project.isTrashed ? 'archived' : 'active'"
              >
                {{ project.isTrashed ? 'Đã lưu trữ' : 'Đang hoạt động' }}
              </span>
            </p>
          </div>
          <div class="detail-item">
            <label>Số lượng thành viên:</label>
            <p>{{ project.memberCount }}</p>
          </div>
          <div class="detail-item">
            <label>Đã chấp nhận:</label>
            <p>{{ project.acceptedMembers }}</p>
          </div>
          <div class="detail-item">
            <label>Đang chờ duyệt:</label>
            <p>{{ project.pendingMembers }}</p>
          </div>
          <div class="detail-item">
            <label>Ngày tạo:</label>
            <p>{{ formatDate(project.createdAt) }}</p>
          </div>
          <div class="detail-item">
            <label>Lần cập nhật gần nhất:</label>
            <p>{{ formatDate(project.updatedAt) }}</p>
          </div>
          <div class="detail-item">
            <label>Lần truy cập cuối:</label>
            <p>{{ formatDate(project.lastAccessedAt) }}</p>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">Đóng</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  project: {
    type: Object,
    required: true,
  },
});

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

const formatLanguage = (lang) => {
  const map = {
    'vi-VN': 'Tiếng Việt',
    'en-US': 'Tiếng Anh',
  };
  return map[lang] || lang || 'Không rõ';
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.25s ease;
}

.modal-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  width: 100%;
  display: flex;
  flex-direction: column;
  animation: scaleIn 0.25s ease;
}

.modal-content.large {
  max-width: 900px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1a365d;
}

.modal-body {
  padding: 24px;
  background: #fff;
  color: #1a202c;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.detail-item label {
  font-weight: 600;
  color: #374151;
}

.detail-item p {
  margin: 4px 0 0;
  color: #4a5568;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}
.status-badge.active {
  background: #def7ec;
  color: #046c4e;
}
.status-badge.archived {
  background: #fee2e2;
  color: #991b1b;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f9fafb;
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: #edf2f7;
  color: #2d3748;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
