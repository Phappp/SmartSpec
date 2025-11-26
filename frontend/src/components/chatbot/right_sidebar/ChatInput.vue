<template>
  <div class="chat-input">
    <div class="input-container">
      <div class="input-wrapper">
        <textarea
          v-model="messageText"
          @keydown="onKeyDown"
          @input="onInput"
          placeholder="Type your message... (Shift + Enter for new line)"
          class="message-input"
          :disabled="isLoading"
          rows="1"
          ref="textareaRef"
        ></textarea>

        <div class="input-actions">
          <button
            class="send-btn"
            :class="{ loading: isLoading }"
            @click="sendMessage"
            :disabled="!canSend || isLoading"
          >
            <span v-if="isLoading" class="loading-spinner"></span>
            <span v-else class="material-symbols-outlined send-icon">send</span>
          </button>
        </div>
      </div>

      <!-- <div class="quick-actions">
        <button
          v-for="action in quickActions"
          :key="action.id"
          class="quick-action-btn"
          @click="emitQuickAction(action.prompt)"
          :disabled="isLoading"
        >
          <span class="material-symbols-outlined action-icon">{{ action.icon }}</span>
          <span class="action-text">{{ action.text }}</span>
        </button>
      </div> -->
    </div>
  </div>
</template>

<script>
import { ref, computed, nextTick } from 'vue'

export default {
  name: 'ChatInput',
  props: {
    isLoading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['send-message'],
  setup(props, { emit }) {
    const messageText = ref('')
    const textareaRef = ref(null)

    const canSend = computed(() => {
      return messageText.value.trim().length > 0 && !props.isLoading
    })

    const quickActions = ref([
      {
        id: 1,
        icon: 'science',
        text: 'Test Cases',
        prompt: 'Can you help me create test cases for this use case?',
      },
      {
        id: 2,
        icon: 'storage',
        text: 'Database',
        prompt: 'Analyze this database schema and suggest improvements.',
      },
      {
        id: 3,
        icon: 'description',
        text: 'Use Case',
        prompt: 'Help me analyze this use case and identify missing requirements.',
      },
      {
        id: 4,
        icon: 'search',
        text: 'Review',
        prompt: 'Review this component and suggest any issues or improvements.',
      },
    ])

    const autoResize = () => {
      if (textareaRef.value) {
        textareaRef.value.style.height = 'auto'
        textareaRef.value.style.height = Math.min(textareaRef.value.scrollHeight, 120) + 'px'
      }
    }

    const onInput = () => {
      autoResize()
    }

    const onKeyDown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        sendMessage()
      }
    }

    const sendMessage = () => {
      if (!canSend.value) return

      const text = messageText.value.trim()
      if (text) {
        emit('send-message', text)
        messageText.value = ''
        resetTextarea()
      }
    }

    const resetTextarea = () => {
      if (textareaRef.value) {
        textareaRef.value.style.height = 'auto'
      }
    }

    const emitQuickAction = (prompt) => {
      emit('send-message', prompt)
    }

    return {
      messageText,
      textareaRef,
      canSend,
      quickActions,
      onInput,
      onKeyDown,
      sendMessage,
      emitQuickAction,
    }
  },
}
</script>

<style scoped>
.chat-input {
  padding: 16px;
  margin-bottom: 32px;
  background-color: #161b22;
  border-top: 1px solid #21262d;
}

.input-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.message-input {
  flex: 1;
  background-color: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 12px 16px;
  color: #f0f6fc;
  font-size: 14px;
  line-height: 1.4;
  resize: none;
  min-height: 66px;
  max-height: 120px;
  transition: all 0.2s;
  font-family: inherit;
}

.message-input:focus {
  outline: none;
  border-color: #58a6ff;
  box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.1);
}

.message-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.message-input::placeholder {
  color: #6e7681;
}

.input-actions {
  flex-shrink: 0;
}

.send-btn {
  width: 36px;
  height: 36px;
  background-color: #238636;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  position: relative;
}

.send-btn:hover:not(:disabled) {
  background-color: #2ea043;
  transform: translateY(-1px);
}

.send-btn:disabled {
  background-color: #30363d;
  cursor: not-allowed;
  opacity: 0.6;
}

.send-btn.loading {
  background-color: #1871c9;
}

.send-icon {
  font-size: 18px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid white;
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

.quick-actions {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.quick-actions::-webkit-scrollbar {
  height: 4px;
}

.quick-actions::-webkit-scrollbar-track {
  background: #161b22;
}

.quick-actions::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 2px;
}

.quick-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 8px 12px;
  color: #c9d1d9;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  white-space: nowrap;
}

.quick-action-btn:hover:not(:disabled) {
  background-color: #1a212e;
  border-color: #58a6ff;
}

.quick-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-icon {
  font-size: 16px;
}

.action-text {
  font-weight: 500;
}
</style>