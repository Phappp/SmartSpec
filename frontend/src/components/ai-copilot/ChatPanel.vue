<template>
  <div class="chat-panel">
    <!-- Chat Header -->
    <div class="chat-header">
      <h3>
        <span class="material-symbols-outlined">smart_toy</span>
        AI Copilot
      </h3>
      <div class="header-actions">
        <button @click="createNewChat" class="new-chat-btn" title="New Chat">
          <span class="material-symbols-outlined">add</span>
        </button>
        <button @click="clearCurrentChat" class="clear-btn" title="Clear Chat">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>

    <!-- Chat Tabs -->
    <div class="chat-tabs">
      <div
        v-for="(chat, index) in chatSessions"
        :key="chat.id"
        class="chat-tab"
        :class="{ active: activeChatId === chat.id }"
        @click="switchChat(chat.id)"
      >
        <span class="tab-title">{{ chat.title || `Chat ${index + 1}` }}</span>
        <button
          v-if="chatSessions.length > 1"
          @click.stop="closeChat(chat.id)"
          class="close-tab-btn"
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>

    <!-- Context Items -->
    <div v-if="contextItems.length > 0" class="context-section">
      <div class="context-header">
        <span>Context ({{ contextItems.length }})</span>
      </div>
      <div class="context-items">
        <div
          v-for="ctx in contextItems"
          :key="ctx.id"
          class="context-item"
        >
          <span class="context-label">{{ ctx.label }}</span>
          <button @click="removeContext(ctx.id)" class="remove-context">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Messages -->
    <div class="messages-container" ref="messagesContainer">
      <div
        v-for="(message, index) in messages"
        :key="index"
        class="message"
        :class="message.role"
      >
        <div class="message-content">
          <div v-if="message.role === 'user'" class="user-message">
            {{ message.content }}
          </div>
          <div v-else-if="message.role === 'assistant'" class="assistant-message">
            <div v-html="formatMessage(message.content)"></div>
            <div v-if="message.actions && message.actions.length > 0" class="action-buttons">
              <button
                v-for="(action, idx) in message.actions"
                :key="idx"
                @click="applyAction(action)"
                class="action-btn apply"
              >
                <span class="material-symbols-outlined">check</span>
                Apply
              </button>
              <button
                @click="rejectAction(message.actions[0])"
                class="action-btn reject"
              >
                <span class="material-symbols-outlined">close</span>
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="loading" class="loading-indicator">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>

    <!-- Action Review Panel -->
    <div v-if="pendingAction" class="action-review-panel">
      <div class="review-header">
        <h4>Review Action</h4>
      </div>
      <div class="review-content">
        <div class="action-preview">
          <strong>Type:</strong> {{ pendingAction.type }}<br>
          <strong>Target:</strong> {{ pendingAction.target }}<br>
          <pre>{{ JSON.stringify(pendingAction.data, null, 2) }}</pre>
        </div>
        <div class="review-actions">
          <button @click="confirmAction" class="confirm-btn">
            <span class="material-symbols-outlined">check</span>
            Apply
          </button>
          <button @click="cancelAction" class="cancel-btn">
            <span class="material-symbols-outlined">close</span>
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="input-area">
      <textarea
        v-model="inputMessage"
        @keydown.enter.exact.prevent="sendMessage"
        @keydown.shift.enter.exact="newline"
        placeholder="Ask AI to create, update, or analyze..."
        class="chat-input"
        rows="1"
        ref="inputRef"
      ></textarea>
      <button
        @click="sendMessage"
        :disabled="loading || !inputMessage.trim()"
        class="send-btn"
      >
        <span class="material-symbols-outlined">send</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { chatWithAI, chatWithAIStream, applyAIAction } from '@/api/ai-copilot'

const props = defineProps({
  projectId: {
    type: String,
    required: true
  },
  versionId: {
    type: String,
    default: null
  },
  contextItems: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['context-removed', 'action-requested'])

// Storage key for chat sessions
const getStorageKey = () => {
  return `ai-copilot-chats-${props.projectId}`
}

// Load chat sessions from localStorage
const loadChatSessions = () => {
  try {
    const stored = localStorage.getItem(getStorageKey())
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed && parsed.length > 0) {
        return parsed
      }
    }
  } catch (error) {
    console.error('Error loading chat sessions:', error)
  }
  return [
    {
      id: `chat-${Date.now()}`,
      title: 'New Chat',
      messages: [],
      contextItems: [],
      createdAt: new Date().toISOString()
    }
  ]
}

// Save chat sessions to localStorage
const saveChatSessions = () => {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(chatSessions.value))
  } catch (error) {
    console.error('Error saving chat sessions:', error)
  }
}

// State
const chatSessions = ref(loadChatSessions())
const activeChatId = ref(chatSessions.value[0]?.id || `chat-${Date.now()}`)
const inputMessage = ref('')
const loading = ref(false)
const pendingAction = ref(null)
const messagesContainer = ref(null)
const inputRef = ref(null)

// Computed
const activeChat = computed(() => {
  return chatSessions.value.find(chat => chat.id === activeChatId.value) || chatSessions.value[0]
})

const messages = computed(() => activeChat.value.messages)

// Sync context items from props to active chat (merge, don't overwrite)
watch(() => props.contextItems, (newItems) => {
  if (activeChat.value && newItems.length > 0) {
    const existingIds = new Set(activeChat.value.contextItems.map(c => c.id))
    const newContextItems = newItems.filter(c => !existingIds.has(c.id))
    if (newContextItems.length > 0) {
      activeChat.value.contextItems = [...activeChat.value.contextItems, ...newContextItems]
      saveChatSessions()
    }
  }
}, { deep: true })

const contextItems = computed(() => {
  return activeChat.value?.contextItems || []
})

// Computed context summary
const contextSummary = computed(() => {
  return props.contextItems.map(ctx => ({
    type: ctx.type,
    id: ctx.item._id || ctx.item.id,
    name: ctx.item.name || ctx.item.title || 'Unknown'
  }))
})

// Chat management
const createNewChat = () => {
  const newChatId = `chat-${Date.now()}`
  chatSessions.value.push({
    id: newChatId,
    title: 'New Chat',
    messages: [],
    contextItems: [],
    createdAt: new Date().toISOString()
  })
  activeChatId.value = newChatId
  inputMessage.value = ''
  saveChatSessions()
}

const switchChat = (chatId) => {
  activeChatId.value = chatId
  inputMessage.value = ''
}

const closeChat = (chatId) => {
  if (chatSessions.value.length <= 1) return
  
  const index = chatSessions.value.findIndex(chat => chat.id === chatId)
  if (index > -1) {
    chatSessions.value.splice(index, 1)
    
    // Switch to another chat if closing active one
    if (activeChatId.value === chatId) {
      activeChatId.value = chatSessions.value[0]?.id || `chat-${Date.now()}`
    }
    saveChatSessions()
  }
}

const clearCurrentChat = () => {
  if (confirm('Clear all messages in this chat?')) {
    activeChat.value.messages = []
    activeChat.value.contextItems = []
    saveChatSessions()
  }
}

// Send message
const sendMessage = async () => {
  // Early validation
  if (!inputMessage.value || typeof inputMessage.value !== 'string') {
    console.error('Invalid input message:', inputMessage.value)
    return
  }
  
  const trimmedMessage = inputMessage.value.trim()
  if (!trimmedMessage || loading.value) {
    return
  }

  const userMessage = trimmedMessage
  inputMessage.value = ''
  
  console.log('Sending message:', {
    messageLength: userMessage.length,
    messagePreview: userMessage.substring(0, 50),
    projectId: props.projectId,
    versionId: props.versionId
  })
  
  // Update chat title if first message
  if (activeChat.value.messages.length === 0 && activeChat.value.title === 'New Chat') {
    activeChat.value.title = userMessage.substring(0, 30) + (userMessage.length > 30 ? '...' : '')
    saveChatSessions()
  }
  
  // Add user message
  activeChat.value.messages.push({
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString()
  })
  saveChatSessions()

  loading.value = true
  scrollToBottom()

  // Create assistant message for streaming
  const assistantMessage = {
    role: 'assistant',
    content: '',
    actions: [],
    timestamp: new Date().toISOString()
  }
  activeChat.value.messages.push(assistantMessage)

  try {
    // Double-check message is valid
    if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
      console.error('Empty message after validation, aborting chat')
      assistantMessage.content = 'Please enter a message'
      loading.value = false
      activeChat.value.messages.pop() // Remove empty assistant message
      saveChatSessions()
      return
    }

    // Build conversation history from current chat
    const conversationHistory = activeChat.value.messages
      .slice(0, -2) // Exclude the user message and assistant message we just added
      .filter(msg => msg.role && msg.content && msg.content.trim()) // Filter out empty messages
      .map(msg => ({
        role: msg.role,
        content: msg.content.trim()
      }))

    // Use streaming
    // Ensure all values are properly formatted
    const chatData = {
      projectId: String(props.projectId || ''),
      versionId: props.versionId ? String(props.versionId) : null,
      message: String(userMessage).trim(),
      context: Array.isArray(contextSummary.value) ? contextSummary.value : [],
      conversationHistory: Array.isArray(conversationHistory) ? conversationHistory : []
    }
    
    // Final validation
    if (!chatData.message || chatData.message.length === 0) {
      console.error('Message is empty after processing:', { userMessage, chatData })
      assistantMessage.content = 'Error: Message cannot be empty'
      loading.value = false
      activeChat.value.messages.pop()
      saveChatSessions()
      return
    }
    
    // Debug log
    console.log('Sending chat request (final):', {
      projectId: chatData.projectId,
      versionId: chatData.versionId,
      messageLength: chatData.message.length,
      message: chatData.message,
      messageType: typeof chatData.message,
      contextLength: chatData.context.length,
      conversationHistoryLength: chatData.conversationHistory.length,
      chatDataKeys: Object.keys(chatData)
    })
    
    await chatWithAIStream(
      chatData,
      (chunk) => {
        // Append chunk to assistant message
        assistantMessage.content += chunk
        saveChatSessions()
        scrollToBottom()
      },
      () => {
        // Streaming complete
        loading.value = false
        saveChatSessions()
        scrollToBottom()
      },
      (error) => {
        // Error occurred
        console.error('Chat error:', error)
        const errorMsg = error.message || error.toString()
        assistantMessage.content = `Sorry, I encountered an error: ${errorMsg}. Please try again.`
        loading.value = false
        saveChatSessions()
        scrollToBottom()
      }
    )
  } catch (error) {
    console.error('Chat error:', error)
    const errorMsg = error.message || error.toString()
    assistantMessage.content = `Sorry, I encountered an error: ${errorMsg}. Please check the console for details.`
    loading.value = false
    saveChatSessions()
    scrollToBottom()
  }
}

// Format message (markdown support)
const formatMessage = (content) => {
  // Simple markdown formatting
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

// Apply action
const applyAction = async (action) => {
  try {
    await applyAIAction({
      projectId: props.projectId,
      versionId: props.versionId,
      action
    })
    
    activeChat.value.messages.push({
      role: 'assistant',
      content: `✓ Action applied successfully: ${action.type} on ${action.target}`,
      timestamp: new Date().toISOString()
    })
    saveChatSessions()
    
    pendingAction.value = null
    emit('action-requested', action)
  } catch (error) {
    console.error('Action error:', error)
    activeChat.value.messages.push({
      role: 'assistant',
      content: 'Failed to apply action. Please try again.',
      timestamp: new Date().toISOString()
    })
    saveChatSessions()
  }
}

const rejectAction = (action) => {
  pendingAction.value = null
  messages.value.push({
    role: 'assistant',
    content: 'Action cancelled.'
  })
}

const confirmAction = () => {
  if (pendingAction.value) {
    applyAction(pendingAction.value)
  }
}

const cancelAction = () => {
  pendingAction.value = null
}

// Remove context
const removeContext = (contextId) => {
  if (activeChat.value) {
    activeChat.value.contextItems = activeChat.value.contextItems.filter(c => c.id !== contextId)
  }
  emit('context-removed', contextId)
}

// Scroll to bottom
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Newline handler
const newline = () => {
  // Allow shift+enter for newline
}

// Auto-resize textarea
watch(inputMessage, () => {
  if (inputRef.value) {
    inputRef.value.style.height = 'auto'
    inputRef.value.style.height = `${Math.min(inputRef.value.scrollHeight, 150)}px`
  }
})

// Scroll on new messages
watch(() => activeChat.value.messages, () => {
  scrollToBottom()
}, { deep: true })
</script>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #2d2d30;
  border-bottom: 1px solid #3e3e42;
}

.chat-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #cccccc;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-header h3 .material-symbols-outlined {
  font-size: 20px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.new-chat-btn,
.clear-btn {
  background: transparent;
  border: 1px solid #3e3e42;
  color: #cccccc;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.new-chat-btn:hover,
.clear-btn:hover {
  background: #3e3e42;
}

.new-chat-btn .material-symbols-outlined,
.clear-btn .material-symbols-outlined {
  font-size: 18px;
}

.chat-tabs {
  display: flex;
  gap: 4px;
  padding: 8px;
  background: #252526;
  border-bottom: 1px solid #3e3e42;
  overflow-x: auto;
}

.chat-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #2d2d30;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #858585;
  transition: all 0.2s;
  white-space: nowrap;
}

.chat-tab:hover {
  background: #3e3e42;
  color: #cccccc;
}

.chat-tab.active {
  background: #0e639c;
  border-color: #0e639c;
  color: white;
}

.tab-title {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-tab-btn {
  background: transparent;
  border: none;
  color: inherit;
  padding: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.close-tab-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

.close-tab-btn .material-symbols-outlined {
  font-size: 16px;
}

.context-section {
  padding: 12px 16px;
  background: #252526;
  border-bottom: 1px solid #3e3e42;
}

.context-header {
  font-size: 12px;
  color: #858585;
  margin-bottom: 8px;
}

.context-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.context-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #094771;
  border-radius: 4px;
  font-size: 12px;
}

.context-label {
  color: #cccccc;
}

.remove-context {
  background: transparent;
  border: none;
  color: #cccccc;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  transition: all 0.2s;
}

.remove-context:hover {
  color: #f48771;
  background: rgba(244, 135, 113, 0.1);
}

.remove-context .material-symbols-outlined {
  font-size: 16px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  flex-direction: column;
}

.message.user {
  align-items: flex-end;
}

.message.assistant {
  align-items: flex-start;
}

.message-content {
  max-width: 80%;
}

.user-message {
  background: #0e639c;
  color: white;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
}

.assistant-message {
  background: #2d2d30;
  color: #cccccc;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
}

.assistant-message code {
  background: #1e1e1e;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn .material-symbols-outlined {
  font-size: 16px;
}

.action-btn.apply {
  background: #0e7c0e;
  color: white;
}

.action-btn.reject {
  background: #5a1d1d;
  color: white;
}

.action-btn:hover {
  opacity: 0.8;
}

.loading-indicator {
  padding: 12px;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  background: #858585;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}

.action-review-panel {
  border-top: 1px solid #3e3e42;
  background: #2d2d30;
  padding: 16px;
}

.review-header h4 {
  margin: 0 0 12px 0;
  color: #cccccc;
  font-size: 14px;
}

.action-preview {
  background: #1e1e1e;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 12px;
  font-size: 12px;
  color: #cccccc;
}

.action-preview pre {
  margin: 8px 0 0 0;
  padding: 8px;
  background: #252526;
  border-radius: 4px;
  overflow-x: auto;
}

.review-actions {
  display: flex;
  gap: 8px;
}

.confirm-btn,
.cancel-btn {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.confirm-btn .material-symbols-outlined,
.cancel-btn .material-symbols-outlined {
  font-size: 18px;
}

.confirm-btn {
  background: #0e7c0e;
  color: white;
}

.cancel-btn {
  background: #5a1d1d;
  color: white;
}

.input-area {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #2d2d30;
  border-top: 1px solid #3e3e42;
}

.chat-input {
  flex: 1;
  padding: 10px 12px;
  background: #3c3c3c;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  color: #cccccc;
  font-size: 14px;
  resize: none;
  max-height: 150px;
  font-family: inherit;
}

.chat-input:focus {
  outline: none;
  border-color: #0e639c;
}

.send-btn {
  padding: 10px;
  background: #0e639c;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
}

.send-btn .material-symbols-outlined {
  font-size: 20px;
}

.send-btn:hover:not(:disabled) {
  background: #1177bb;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
