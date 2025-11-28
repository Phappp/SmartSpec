<template>
  <div class="chatbot-agent">
    <div v-if="errorMessage" class="error-banner">
      {{ errorMessage }}
    </div>
    <div class="chatbot-container">
      <LeftSidebar
        :selectedProject="selectedProject"
        :entities="entities"
        :projects="projects"
        @project-change="onProjectChange"
        @entity-select="onEntitySelect"
        @entity-drag-start="onEntityDragStart"
        @open-project-modal="showProjectModal = true"
      />

      <MainContent
        :selectedEntity="selectedEntity"
        :entityData="currentEntityData"
        :pendingOperations="currentPendingOperations"
        @add-to-chat="addContextToChat"
        @undo-operation="undoPendingOperation"
        @keep-operation="keepPendingOperation"
      />

      <RightSidebar
        :chatSessions="chatSessions"
        :currentChatId="currentChatId"
        :currentContexts="currentChatContexts"
        :isStreaming="isStreaming"
        @send-message="onSendMessage"
        @new-chat="createNewChat"
        @switch-chat="switchChat"
        @close-chat="closeChat"
        @add-context="addContextToChat"
        @remove-context="removeContext"
        @clear-contexts="clearAllContexts"
        @context-drag="onContextDrag"
        @drag-over="onDragOver"
        @drag-leave="onDragLeave"
        @drop="onDrop"
        @example-message="onExampleMessage"
      />
    </div>

    <!-- Project Selection Modal -->
    <ProjectModal
      :show="showProjectModal"
      :projects="projects"
      :selectedProject="selectedProject"
      @close="showProjectModal = false"
      @select="onProjectSelect"
    />

    <div v-if="dragHintVisible" class="drag-hint">🎯 Thả vào khung chat để thêm ngữ cảnh</div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import LeftSidebar from '@/components/chatbot/left_sidebar/LeftSidebar.vue'
import MainContent from '@/components/chatbot/main_content/MainContent.vue'
import RightSidebar from '@/components/chatbot/right_sidebar/RightSidebar.vue'
import ProjectModal from '@/components/chatbot/left_sidebar/ProjectModal.vue'
import chatbotApi from '@/api/chatbot'

const defaultEntitiesState = () => ({
  usecases: [],
  testcases: [],
  databases: [],
  umlDiagrams: {
    activity: [],
    usecase: [],
    sequence: [],
  },
})

export default {
  name: 'ChatbotAgent',
  components: {
    LeftSidebar,
    MainContent,
    RightSidebar,
    ProjectModal,
  },
  setup() {
    const projects = ref([])
    const selectedProject = ref(null)
    const currentVersionId = ref(null)
    const selectedEntity = ref(null)
    const dragHintVisible = ref(false)
    const isDragOver = ref(false)
    const isStreaming = ref(false)
    const isWaitingResponse = ref(false)
    const showProjectModal = ref(false)
    const streamingInterval = ref(null)
    const errorMessage = ref('')

    const chatSessions = ref([])
    const currentChatId = ref(null)
    const entities = ref(defaultEntitiesState())

    const loadingStates = ref({
      projects: false,
      knowledge: false,
      conversations: false,
    })

    const unwrap = (response) => response?.data?.data ?? response?.data ?? {}

    const normalizeEntities = (data = {}) => ({
      usecases: data.usecases || [],
      testcases: data.testcases || [],
      databases: data.databases || [],
      umlDiagrams: {
        activity: data.umlDiagrams?.activity || [],
        usecase: data.umlDiagrams?.usecase || [],
        sequence: data.umlDiagrams?.sequence || [],
      },
    })

    const findChatById = (chatId) =>
      chatSessions.value.find((chat) => String(chat.id) === String(chatId))

    const updateConversationContexts = (conversationId, contexts) => {
      const chat = findChatById(conversationId)
      if (chat) {
        chat.contexts = contexts || []
      }
    }

    // Computed properties
    const currentEntityData = computed(() => {
      if (!selectedEntity.value) return null

      // Nếu selectedEntity đã có kèm data (từ hành động read của LLM) thì ưu tiên dùng luôn
      if (selectedEntity.value.data) {
        return selectedEntity.value.data
      }

      if (selectedEntity.value.type === 'uml') {
        const umlType = selectedEntity.value.umlType
        const diagramList = entities.value.umlDiagrams?.[umlType] || []
        return diagramList.find((item) => String(item.id) === String(selectedEntity.value.id)) || null
      } else {
        const key = `${selectedEntity.value.type}s`
        const entityList = entities.value[key] || []
        return entityList.find((item) => String(item.id) === String(selectedEntity.value.id)) || null
      }
    })

    const currentChatContexts = computed(() => {
      const currentChat = findChatById(currentChatId.value)
      return currentChat ? currentChat.contexts : []
    })

    // Methods
    const onProjectChange = (projectId) => {
      selectedProject.value = projectId
      selectedEntity.value = null
      currentVersionId.value = null
      currentChatId.value = null
      chatSessions.value = []
      entities.value = defaultEntitiesState()
      showProjectModal.value = false
    }

    const onProjectSelect = (projectId) => {
      onProjectChange(projectId)
    }

    const onEntitySelect = (entity) => {
      selectedEntity.value = entity
    }

    const onEntityDragStart = (event, entity) => {
      event.dataTransfer.setData('application/json', JSON.stringify(entity))
      event.dataTransfer.effectAllowed = 'copy'
      dragHintVisible.value = true
    }

    const onContextDrag = (contextId) => {
      removeContext(contextId)
    }

    const onDragOver = () => {
      isDragOver.value = true
    }

    const onDragLeave = () => {
      isDragOver.value = false
    }

    const onDrop = (event) => {
      isDragOver.value = false
      try {
        const droppedData = JSON.parse(event.dataTransfer.getData('application/json'))
        addContextToChat(droppedData)
      } catch (error) {
        console.error('Error processing dropped data:', error)
      }
    }

    const onExampleMessage = (message) => {
      onSendMessage(message)
    }

    // Chat management
    const loadProjects = async () => {
      loadingStates.value.projects = true
      try {
        const response = await chatbotApi.getProjects()
        const payload = unwrap(response)
        projects.value = payload?.projects || []
        if (!selectedProject.value && projects.value.length > 0) {
          selectedProject.value = projects.value[0].id
        }
      } catch (error) {
        console.error('Không thể tải danh sách dự án', error)
        errorMessage.value = error?.response?.data?.message || 'Không thể tải danh sách dự án'
      } finally {
        loadingStates.value.projects = false
      }
    }

    const loadKnowledgeBase = async (projectId) => {
      if (!projectId) return
      loadingStates.value.knowledge = true
      try {
        const response = await chatbotApi.getKnowledgeBase(projectId, currentVersionId.value)
        const payload = unwrap(response)
        if (String(projectId) !== String(selectedProject.value)) {
          return
        }
        entities.value = normalizeEntities(payload?.entities)
        currentVersionId.value = payload?.versionId || currentVersionId.value
      } catch (error) {
        console.error('Không thể tải dữ liệu dự án', error)
        errorMessage.value = error?.response?.data?.message || 'Không thể tải dữ liệu dự án'
        entities.value = defaultEntitiesState()
      } finally {
        loadingStates.value.knowledge = false
      }
    }

    const mapConversation = (conversation) => ({
      id: conversation.id,
      title: conversation.title || `Chat ${conversation.id}`,
      messages: conversation.messages || [],
      contexts: conversation.contexts || [],
      createdAt: conversation.createdAt || new Date().toISOString(),
      pendingOperations: conversation.pendingOperations || [],
    })

    const replacePendingOperations = (conversationId, operations = []) => {
      const chat = findChatById(conversationId)
      if (!chat) return
      chat.pendingOperations = operations
    }

    const appendPendingOperations = (conversationId, operations = []) => {
      const chat = findChatById(conversationId)
      if (!chat) return
      const map = new Map()
      operations.forEach((op) => {
        map.set(String(op.id), op)
      })
      ;(chat.pendingOperations || []).forEach((op) => {
        if (!map.has(String(op.id))) {
          map.set(String(op.id), op)
        }
      })
      chat.pendingOperations = Array.from(map.values())
    }

    const loadPendingOperations = async (conversationId) => {
      if (!conversationId) return
      try {
        const response = await chatbotApi.getPendingOperations(conversationId)
        const payload = unwrap(response)
        replacePendingOperations(conversationId, payload || [])
      } catch (error) {
        console.error('Không thể tải danh sách thay đổi tạm thời', error)
      }
    }

    const loadConversations = async (projectId) => {
      if (!projectId) return
      loadingStates.value.conversations = true
      try {
        const response = await chatbotApi.getConversations(projectId, currentVersionId.value)
        const payload = unwrap(response)
        if (String(projectId) !== String(selectedProject.value)) {
          return
        }
        currentVersionId.value = payload?.versionId || currentVersionId.value
        const conversations = payload?.conversations || []
        chatSessions.value = conversations.map(mapConversation)

        if (chatSessions.value.length === 0) {
          await createNewChat()
        } else if (
          !currentChatId.value ||
          !chatSessions.value.some((chat) => String(chat.id) === String(currentChatId.value))
        ) {
          currentChatId.value = chatSessions.value[0].id
        }
        if (currentChatId.value) {
          loadPendingOperations(currentChatId.value)
        }
      } catch (error) {
        console.error('Không thể tải hội thoại', error)
        errorMessage.value = error?.response?.data?.message || 'Không thể tải hội thoại'
        chatSessions.value = []
      } finally {
        loadingStates.value.conversations = false
      }
    }

    const fetchProjectData = async (projectId) => {
      await Promise.all([loadKnowledgeBase(projectId), loadConversations(projectId)])
    }

    const createNewChat = async () => {
      if (!selectedProject.value) return
      try {
        const response = await chatbotApi.createConversation({
          projectId: selectedProject.value,
          versionId: currentVersionId.value,
        })
        const payload = unwrap(response)
        if (payload?.conversation) {
          const conversation = mapConversation(payload.conversation)
          chatSessions.value = [conversation, ...chatSessions.value]
          currentChatId.value = conversation.id
          conversation.pendingOperations = []
        }
      } catch (error) {
        console.error('Không thể tạo hội thoại', error)
        errorMessage.value = error?.response?.data?.message || 'Không thể tạo hội thoại'
      }
    }

    const switchChat = (chatId) => {
      if (!chatSessions.value.some((chat) => String(chat.id) === String(chatId))) return
      currentChatId.value = chatId
      loadPendingOperations(chatId)
    }

    const closeChat = async (chatId) => {
      if (!chatId || chatSessions.value.length <= 1) return
      try {
        await chatbotApi.deleteConversation(chatId)
      } catch (error) {
        console.error('Không thể đóng hội thoại', error)
      } finally {
        chatSessions.value = chatSessions.value.filter((chat) => String(chat.id) !== String(chatId))
        if (!chatSessions.value.length) {
          currentChatId.value = null
        } else if (String(currentChatId.value) === String(chatId)) {
        currentChatId.value = chatSessions.value[0].id
          loadPendingOperations(currentChatId.value)
        }
      }
    }

    const addContextToChat = async (contextData) => {
      if (!contextData || !currentChatId.value) return
      
      // Xử lý database-table: chuyển thành database type với data là table
      let normalizedType = contextData.type?.startsWith('uml') ? 'uml' : contextData.type
      let contextPayload = {
        type: normalizedType,
        entityId: contextData.id,
        name: contextData.name,
        data: contextData.data,
      }
      
      // Nếu là database-table, chuyển thành database type và đảm bảo data có đầy đủ thông tin
      if (contextData.type === 'database-table') {
        normalizedType = 'database'
        contextPayload = {
          type: 'database',
          entityId: contextData.data?.databaseId || contextData.id,
          name: contextData.data?.databaseName || contextData.name,
          data: {
            // Giữ nguyên database info nếu có
            ...(contextData.data?.databaseId ? {
              id: contextData.data.databaseId,
              name: contextData.data.databaseName,
            } : {}),
            // Thêm table vào data
            table: contextData.data,
          },
        }
      }
      
      try {
        const response = await chatbotApi.addContext(currentChatId.value, contextPayload)
        const payload = unwrap(response)
        updateConversationContexts(currentChatId.value, payload?.contexts || [])
      } catch (error) {
        console.error('Không thể thêm ngữ cảnh', error)
      }
    }

    const removeContext = async (contextId) => {
      if (!contextId || !currentChatId.value) return
      try {
        const response = await chatbotApi.removeContext(currentChatId.value, contextId)
        const payload = unwrap(response)
        updateConversationContexts(currentChatId.value, payload?.contexts || [])
      } catch (error) {
        console.error('Không thể xóa ngữ cảnh', error)
      }
    }

    const clearAllContexts = async () => {
      if (!currentChatId.value) return
      try {
        await chatbotApi.clearContexts(currentChatId.value)
        updateConversationContexts(currentChatId.value, [])
      } catch (error) {
        console.error('Không thể xóa toàn bộ ngữ cảnh', error)
      }
    }

    const undoPendingOperation = async (operationId) => {
      if (!operationId || !currentChatId.value) return
      try {
        await chatbotApi.undoOperation(operationId)
        await loadPendingOperations(currentChatId.value)
        if (selectedProject.value) {
          await loadKnowledgeBase(selectedProject.value)
        }
      } catch (error) {
        console.error('Không thể hoàn tác thay đổi', error)
      }
    }

    const keepPendingOperation = async (operationId) => {
      if (!operationId || !currentChatId.value) return
      try {
        await chatbotApi.keepOperation(operationId)
        await loadPendingOperations(currentChatId.value)
      } catch (error) {
        console.error('Không thể xác nhận thay đổi', error)
      }
    }

    // Streaming message simulation
    const simulateStreaming = (fullText, messageId) => {
      const currentChat = findChatById(currentChatId.value)
      if (!currentChat) return

      const message = currentChat.messages.find((m) => String(m.id) === String(messageId))
      if (!message) return

      let charIndex = 0
      const typingSpeed = 30 // milliseconds per character

      if (streamingInterval.value) {
        clearInterval(streamingInterval.value)
      }

      streamingInterval.value = setInterval(() => {
        if (charIndex < fullText.length) {
          message.displayText += fullText.charAt(charIndex)
          charIndex++
        } else {
          // Streaming finished
          clearInterval(streamingInterval.value)
          streamingInterval.value = null
          isStreaming.value = false
          message.isStreaming = false
          message.text = message.displayText
          delete message.displayText
        }
      }, typingSpeed)
    }

    const onSendMessage = async (messageText) => {
      const trimmed = messageText?.trim()
      if (!trimmed || !currentChatId.value || isStreaming.value) return

      // Clear previous error before sending a new message
      errorMessage.value = ''

      try {
        console.debug('[Chatbot] sending message', {
          conversationId: currentChatId.value,
          text: trimmed,
        })
        isWaitingResponse.value = true

        const response = await chatbotApi.sendMessage(currentChatId.value, trimmed)
        const payload = unwrap(response)

        console.debug('[Chatbot] sendMessage payload', {
          hasUserMessage: !!payload?.userMessage,
          botMessagesCount: Array.isArray(payload?.botMessages) ? payload.botMessages.length : 0,
          actionsCount: Array.isArray(payload?.actions) ? payload.actions.length : 0,
          operationsCount: Array.isArray(payload?.operations) ? payload.operations.length : 0,
        })

        const currentChat = findChatById(currentChatId.value)
        if (!currentChat) return

        if (payload?.userMessage) {
          currentChat.messages.push(payload.userMessage)
        }

        // Nhiều bot messages: hiển thị ngay các message đầu, stream message cuối
        if (payload?.botMessages?.length) {
          const msgs = payload.botMessages
          const last = msgs[msgs.length - 1]

          msgs.slice(0, -1).forEach((m) => {
            currentChat.messages.push(m)
          })

          if (last) {
            currentChat.messages.push({
              id: last.id,
              sender: 'bot',
              text: '',
              displayText: '',
              isStreaming: true,
              time: last.time,
              type: last.type || 'text',
            })
            isStreaming.value = true
            simulateStreaming(last.text || '', last.id)
          }
        } else if (payload?.botMessage) {
          currentChat.messages.push({
            id: payload.botMessage.id,
            sender: 'bot',
            text: '',
            displayText: '',
            isStreaming: true,
            time: payload.botMessage.time,
            type: payload.botMessage.type || 'text',
          })
          isStreaming.value = true
          simulateStreaming(payload.botMessage.text || '', payload.botMessage.id)
        }

        // Nếu có actions từ BE (đặc biệt là READ), tự động select entity tương ứng cho main content
        if (Array.isArray(payload?.actions) && payload.actions.length) {
          const firstRead = payload.actions.find(
            (a) => a?.success && a.action === 'read' && a.data
          )
          if (firstRead) {
            const data = firstRead.data
            const rawType = firstRead.entityType || firstRead.entity_type || 'usecase'
            let mappedType = rawType
            const extra = {}

            if (rawType.startsWith('uml-')) {
              const umlType = rawType.replace('uml-', '')
              mappedType = 'uml'
              extra.umlType = umlType
            }

            console.debug('[Chatbot] auto-select entity from action', {
              rawType,
              mappedType,
              id: data?.id || firstRead.entityId,
            })

            selectedEntity.value = {
              type: mappedType,
              id: data?.id || firstRead.entityId,
              name: data?.name || data?.title || firstRead.entityId,
              data,
              ...extra,
            }
          }
        }

        if (payload?.operations?.length) {
          appendPendingOperations(currentChatId.value, payload.operations)
        } else {
          loadPendingOperations(currentChatId.value)
        }
      } catch (error) {
        console.error('Không thể gửi tin nhắn', error)
        errorMessage.value =
          error?.response?.data?.message || 'Không thể gửi tin nhắn, vui lòng thử lại sau'
        // Ensure streaming state is cleaned up on error
        if (streamingInterval.value) {
          clearInterval(streamingInterval.value)
          streamingInterval.value = null
        }
        isStreaming.value = false
      } finally {
        isWaitingResponse.value = false
      }
    }

    // Event listeners
    const handleDragEnd = () => {
      dragHintVisible.value = false
      isDragOver.value = false
    }

    onMounted(() => {
      loadProjects()
      document.addEventListener('dragend', handleDragEnd)
      document.addEventListener('drop', handleDragEnd)
    })

    onUnmounted(() => {
      if (streamingInterval.value) {
        clearInterval(streamingInterval.value)
      }
      document.removeEventListener('dragend', handleDragEnd)
      document.removeEventListener('drop', handleDragEnd)
    })

    watch(
      selectedProject,
      (projectId) => {
        if (projectId) {
          fetchProjectData(projectId)
        }
      },
      { immediate: false }
    )

    const currentPendingOperations = computed(() => {
      const chat = findChatById(currentChatId.value)
      return chat?.pendingOperations || []
    })

    return {
      selectedProject,
      selectedEntity,
      entities,
      projects,
      chatSessions,
      currentChatId,
      currentEntityData,
      currentChatContexts,
      currentPendingOperations,
      dragHintVisible,
      isDragOver,
      isStreaming,
      isWaitingResponse,
      showProjectModal,
      errorMessage,
      loadingStates,
      onProjectChange,
      onProjectSelect,
      onEntitySelect,
      onEntityDragStart,
      onContextDrag,
      onDragOver,
      onDragLeave,
      onDrop,
      onExampleMessage,
      createNewChat,
      switchChat,
      closeChat,
      addContextToChat,
      removeContext,
      clearAllContexts,
      undoPendingOperation,
      keepPendingOperation,
      onSendMessage,
    }
  },
}
</script>

<style scoped>
.chatbot-agent {
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background-color: #0d1117;
  color: #c9d1d9;
  height: 100vh;
  overflow: hidden;
}

.error-banner {
  background-color: #da3633;
  color: #f0f6fc;
  padding: 8px 16px;
  font-size: 13px;
  border-bottom: 1px solid #ff7b72;
}

.chatbot-container {
  display: flex;
  height: 100vh;
  background-color: #0d1117;
}

.drag-hint {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(88, 166, 255, 0.9);
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  z-index: 1000;
  pointer-events: none;
  animation: fadeInOut 2s ease-in-out;
  font-family: 'Roboto', sans-serif;
}

@keyframes fadeInOut {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}
</style>