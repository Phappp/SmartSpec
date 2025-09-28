<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="close">
    <div class="modal-card">
      <div class="icon-container">
        <span v-if="type === 'success'" class="material-symbols-outlined success"
          >check_circle</span
        >
        <span v-else-if="type === 'error'" class="material-symbols-outlined error">cancel</span>
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
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-card {
  width: 100%;
  max-width: 420px;
  background: transparent;
  color: #fff;
  border-radius: 12px;
  box-shadow: none;
  overflow: hidden;
  text-align: center;
}
.modal-header {
  display: none;
}
.modal-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #fff;
}
.modal-close {
  display: none;
}
.modal-body {
  padding: 20px;
  font-size: 18px;
  line-height: 1.5;
  color: #fff;
}
.modal-footer {
  display: flex;
  justify-content: center;
  gap: 36px;
  padding: 15px;
}

.btn {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  border: none;
  font-weight: 600;
  transition: .2s ease;
  min-width: 80px;
  opacity: 0.9;

}

.btn:hover {
  opacity: 1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  scale: 1.05;
}

.btn-primary {
  background: #4caf50;
  color: white;
}

.btn-danger {
  background: red;
  color: white;
}

.btn-secondary {
  background: gray;
  color: white;
}

.success {
  color: white; /* tick trắng */
  font-size: 48px;
}

.error {
  color: red; /* x đỏ */
  font-size: 48px;
}
</style>