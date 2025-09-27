<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="close">
    <div class="modal-card">
      <div v-if="!isConfirmation" class="icon-container">
        <span class="material-symbols-outlined"> check_circle </span>
      </div>
      <div class="modal-header">
        <h3 class="modal-title">{{ title }}</h3>
        <button v-if="!isConfirmation" class="modal-close" @click="close">✕</button>
      </div>
      <div class="modal-body">
        <p>{{ message }}</p>
      </div>
      <div class="modal-footer">
        <button v-if="!isConfirmation" class="btn btn-primary" @click="close">OK</button>
        <template v-else>
          <button class="btn btn-danger" @click="confirmAction">Confirm</button>
          <button class="btn btn-secondary" @click="close">Cancel</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AppModal',
  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: 'Notification' },
    message: { type: String, default: '' },
    isConfirmation: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'confirm'],
  methods: {
    close() {
      this.$emit('update:modelValue', false)
    },
    confirmAction() {
      this.$emit('confirm')
      this.close()
    },
  },
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  color: #333;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  text-align: center;
  padding: 20px;
}
.icon-container {
  margin-bottom: 20px;
}
.material-symbols-outlined {
  font-size: 60px;
  color: #4caf50;
}
.modal-header {
  margin-bottom: 10px;
}
.modal-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
}
.modal-close {
  display: none;
}
.modal-body {
  margin-bottom: 20px;
}
.modal-body p {
  font-size: 16px;
  line-height: 1.5;
  color: #555;
  margin: 0;
}
.modal-footer {
  display: flex;
  justify-content: center;
  gap: 10px;
}
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.2s;
}
.btn-primary {
  background-color: #007bff;
  color: white;
}
.btn-primary:hover {
  background-color: #0056b3;
}
.btn-danger {
  background-color: #dc3545;
  color: white;
}
.btn-danger:hover {
  background-color: #c82333;
}
.btn-secondary {
  background-color: #6c757d;
  color: white;
}
.btn-secondary:hover {
  background-color: #5a6268;
}
</style>