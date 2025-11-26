<template>
  <div
    class="chat-messages"
    ref="messagesContainer"
    :class="{ 'drag-over': isDragOver, 'has-contexts': hasContexts }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <div v-if="messages.length === 0" class="welcome-message">
      <div class="material-symbols-outlined welcome-icon">smart_toy</div>
      <h3 class="welcome-title">Welcome to Chat Assistant</h3>
      <p class="welcome-description">
        I can help you analyze use cases, create test cases, design databases, and more.
      </p>
      <div class="welcome-examples">
        <div class="example-section">
          <h4>Try asking me:</h4>
          <div class="example-items">
            <button
              class="example-btn"
              @click="emitExample('Create test cases for the login use case')"
            >
              "Create test cases for the login use case"
            </button>
            <button
              class="example-btn"
              @click="emitExample('Analyze the database schema for relationships')"
            >
              "Analyze the database schema for relationships"
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="messages-list">
      <div
        v-for="message in messages"
        :key="message.id"
        :class="['message', `message-${message.sender}`]"
      >
        <div class="message-avatar">
          <span v-if="message.sender === 'user'" class="material-symbols-outlined avatar-user"
            >person</span
          >
          <span v-else class="material-symbols-outlined avatar-bot">smart_toy</span>
        </div>
        <div class="message-content">
          <div class="message-text">
            <template v-if="message.isStreaming">
              <span class="streaming-text">{{ message.displayText }}</span>
            </template>
            <template v-else>
              {{ message.text }}
            </template>
          </div>
          <div class="message-time">{{ message.time }}</div>
        </div>
      </div>
    </div>

    <div v-if="isDragOver" class="drag-overlay">
      <div class="drag-content">
        <span class="material-symbols-outlined drag-icon">target</span>
        <span class="drag-text">Drop to add context</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick, watch } from 'vue'

export default {
  name: 'ChatMessages',
  props: {
    messages: {
      type: Array,
      default: () => [],
    },
    isDragOver: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['drop', 'drag-over', 'drag-leave', 'example-message'],
  setup(props, { emit }) {
    const messagesContainer = ref(null)
    const hasContexts = computed(() =>
      props.messages.some((msg) => msg.contexts && msg.contexts.length > 0)
    )

    const scrollToBottom = () => {
      if (messagesContainer.value) {
        nextTick(() => {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        })
      }
    }

    // Auto scroll when new messages arrive or streaming updates
    watch(
      () => props.messages,
      () => {
        scrollToBottom()
      },
      { deep: true }
    )

    const onDragOver = (event) => {
      event.preventDefault()
      emit('drag-over', event)
    }

    const onDragLeave = (event) => {
      emit('drag-leave', event)
    }

    const onDrop = (event) => {
      event.preventDefault()
      emit('drop', event)
    }

    const emitExample = (text) => {
      emit('example-message', text)
    }

    onMounted(() => {
      scrollToBottom()
    })

    return {
      messagesContainer,
      hasContexts,
      scrollToBottom,
      onDragOver,
      onDragLeave,
      onDrop,
      emitExample,
    }
  },
}
</script>

<style scoped>
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  position: relative;
  transition: all 0.3s ease;
  background-color: #0d1117;
}

.chat-messages.drag-over {
  background-color: rgba(88, 166, 255, 0.05);
  border: 2px dashed #58a6ff;
}

.welcome-message {
  text-align: center;
  padding: 40px 20px;
  color: #8b949e;
}

.welcome-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: #58a6ff;
}

.welcome-title {
  font-size: 20px;
  font-weight: 600;
  color: #f0f6fc;
  margin: 0 0 12px 0;
}

.welcome-description {
  font-size: 14px;
  line-height: 1.5;
  margin: 0 0 30px 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.welcome-examples {
  max-width: 400px;
  margin: 0 auto;
}

.example-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #f0f6fc;
  margin: 0 0 12px 0;
  text-align: left;
}

.example-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.example-btn {
  background-color: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 12px 16px;
  color: #c9d1d9;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1.4;
}

.example-btn:hover {
  background-color: #1a212e;
  border-color: #58a6ff;
  transform: translateY(-1px);
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  gap: 12px;
  animation: messageSlide 0.3s ease;
}

.message-user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  user-select: none;
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none; /* IE/Edge */
}

.message-user .message-avatar {
  background-color: rgba(56, 139, 253, 0.15);
  color: #388bfd;
}

.message-bot .message-avatar {
  background-color: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}

.message-content {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-user .message-content {
  align-items: flex-end;
}

.message-text {
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
}

.message-user .message-text {
  background-color: #1c2b41;
  color: #f0f6fc;
  max-width: 100%;
  border-bottom-right-radius: 4px;
}

.message-bot .message-text {
  background-color: #21262d;
  color: #f0f6fc;
  border-bottom-left-radius: 4px;
}

.streaming-text {
  display: inline;
}

.message-time {
  font-size: 11px;
  color: #6e7681;
  padding: 0 4px;
  user-select: none;
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none; /* IE/Edge */
}

.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(88, 166, 255, 0.1);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border: 2px dashed #58a6ff;
  border-radius: 8px;
}

.drag-content {
  text-align: center;
  color: #58a6ff;
}

.drag-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
}

.drag-text {
  font-size: 14px;
  font-weight: 600;
}

@keyframes messageSlide {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: #0d1117;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #484f58;
}
</style>