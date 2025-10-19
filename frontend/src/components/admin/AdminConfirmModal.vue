<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-content confirm-modal">
      <div class="modal-header" :class="type">
        <div class="header-icon">
          <span class="material-symbols-outlined">{{ getIcon() }}</span>
        </div>
        <div class="header-content">
          <h3>{{ title }}</h3>
          <p>{{ message }}</p>
        </div>
        <button class="close-btn" @click="$emit('cancel')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <slot>
          <div class="confirmation-content">
            <p class="warning-text" v-if="warning">{{ warning }}</p>
            <div class="input-group" v-if="requiresConfirmation">
              <label :for="inputId">Nhập "{{ confirmationText }}" để xác nhận:</label>
              <input
                :id="inputId"
                type="text"
                v-model="confirmationInput"
                class="form-input"
                :placeholder="`Nhập ${confirmationText}`"
              />
            </div>
          </div>
        </slot>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('cancel')">
          {{ cancelText }}
        </button>
        <button
          class="btn"
          :class="confirmButtonClass"
          @click="handleConfirm"
          :disabled="!isConfirmEnabled"
        >
          <span v-if="loading" class="loading-spinner"></span>
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  confirmText: {
    type: String,
    default: 'Xác nhận',
  },
  cancelText: {
    type: String,
    default: 'Hủy',
  },
  type: {
    type: String,
    default: 'warning',
    validator: (value) => ['info', 'warning', 'danger', 'success'].includes(value),
  },
  requiresConfirmation: {
    type: Boolean,
    default: false,
  },
  confirmationText: {
    type: String,
    default: 'DELETE',
  },
  warning: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['confirm', 'cancel'])

const confirmationInput = ref('')
const inputId = `confirm-input-${Math.random().toString(36).substr(2, 9)}`

const isConfirmEnabled = computed(() => {
  if (props.requiresConfirmation) {
    return confirmationInput.value === props.confirmationText
  }
  return true
})

const confirmButtonClass = computed(() => {
  const baseClass =
    {
      'btn-danger': props.type === 'danger',
      'btn-warning': props.type === 'warning',
      'btn-success': props.type === 'success',
      'btn-info': props.type === 'info',
    }[props.type] || 'btn-primary'

  return baseClass
})

const getIcon = () => {
  const icons = {
    info: 'info',
    warning: 'warning',
    danger: 'error',
    success: 'check_circle',
  }
  return icons[props.type] || 'help'
}

const handleConfirm = () => {
  if (isConfirmEnabled.value) {
    emit('confirm')
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content.confirm-modal {
  max-width: 500px;
  width: 90%;
}

.modal-header {
  padding: 24px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  border-radius: 12px 12px 0 0;
}

.modal-header.info {
  background: #ebf8ff;
  color: #2b6cb0;
}

.modal-header.warning {
  background: #fffaf0;
  color: #d69e2e;
}

.modal-header.danger {
  background: #fed7d7;
  color: #c53030;
}

.modal-header.success {
  background: #f0fff4;
  color: #276749;
}

.header-icon {
  flex-shrink: 0;
}

.header-icon .material-symbols-outlined {
  font-size: 32px;
}

.header-content {
  flex: 1;
}

.header-content h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.header-content p {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
}

.close-btn {
  background: none;
  border: none;
  color: currentColor;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
}

.close-btn:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.1);
}

.modal-body {
  padding: 24px;
}

.confirmation-content {
  text-align: center;
}

.warning-text {
  color: #e53e3e;
  font-weight: 500;
  margin-bottom: 16px;
  padding: 12px;
  background: #fed7d7;
  border-radius: 6px;
  border: 1px solid #feb2b2;
}

.input-group {
  text-align: left;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

.modal-footer {
  padding: 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #1a365d;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2d3748;
}

.btn-secondary {
  background: #f7fafc;
  color: #374151;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  background: #edf2f7;
}

.btn-danger {
  background: #e53e3e;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c53030;
}

.btn-warning {
  background: #ed8936;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: #dd6b20;
}

.btn-success {
  background: #38a169;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #2f855a;
}

.btn-info {
  background: #3182ce;
  color: white;
}

.btn-info:hover:not(:disabled) {
  background: #2b6cb0;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .modal-content.confirm-modal {
    width: 95%;
    margin: 20px;
  }

  .modal-header {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .modal-footer {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>