<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content medium">
      <div class="modal-header">
        <h3><span class="material-symbols-outlined">edit</span> Chỉnh sửa dự án</h3>
        <button class="close-btn" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <form class="form-grid">
          <div class="form-group">
            <label for="name">Tên dự án</label>
            <input v-model="form.name" id="name" type="text" />
          </div>

          <div class="form-group">
            <label for="description">Mô tả</label>
            <textarea v-model="form.description" id="description" rows="3"></textarea>
          </div>

          <div class="form-group">
            <label for="language">Ngôn ngữ</label>
            <select v-model="form.language" id="language">
              <option value="vi-VN">Tiếng Việt</option>
              <option value="en-US">English</option>
            </select>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">Hủy</button>
        <button class="btn btn-primary" @click="saveEdit">Lưu thay đổi</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({ project: Object })
const emit = defineEmits(['save', 'close'])

const form = reactive({
  name: '',
  description: '',
  language: '',
})

watch(
  () => props.project,
  (newVal) => {
    if (newVal) Object.assign(form, newVal)
  },
  { immediate: true }
)

const saveEdit = () => {
  console.log('💾 Dự án đã chỉnh sửa:', form)
  alert('✅ Lưu thay đổi thành công!')
  emit('save', { ...form })
}
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

.modal-content.medium {
  max-width: 600px;
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
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background: #1a365d;
  color: #fff;
}

.btn-primary:hover {
  background: #2c5282;
}

.btn-secondary {
  background: #edf2f7;
  color: #2d3748;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

.btn-icon {
  background: none;
  border: none;
  color: #718096;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
}

.btn-icon:hover {
  background: #edf2f7;
  color: #1a365d;
}

.btn-icon.danger:hover {
  background: #fed7d7;
  color: #c53030;
}

.close-btn {
  background: none;
  border: none;
  color: #718096;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
}

.close-btn:hover {
  background: #f7fafc;
  color: #1a365d;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group label {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
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
