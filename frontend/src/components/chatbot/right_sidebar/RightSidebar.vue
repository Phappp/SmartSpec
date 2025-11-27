<template>
  <div class="sidebar-right">
    <ChatHeader
      :chatSessions="chatSessions"
      :currentChatId="currentChatId"
      @new-chat="$emit('new-chat')"
      @switch-chat="$emit('switch-chat', $event)"
      @close-chat="$emit('close-chat', $event)"
    />

    <ContextPanel
      :contexts="currentContexts"
      @remove-context="$emit('remove-context', $event)"
      @clear-contexts="$emit('clear-contexts')"
      @context-drag="$emit('context-drag', $event)"
    />

    <ChatMessages
      :messages="currentChatMessages"
      :isDragOver="isDragOver"
      :isThinking="isStreaming || isWaitingResponse"
      @drag-over="$emit('drag-over')"
      @drag-leave="$emit('drag-leave')"
      @drop="$emit('drop', $event)"
      @example-message="$emit('example-message', $event)"
    />

    <ChatInput
      @send-message="$emit('send-message', $event)"
      :isLoading="isStreaming || isWaitingResponse"
    />
  </div>
</template>

<script>
import { computed } from 'vue'
import ChatHeader from './ChatHeader.vue'
import ContextPanel from './ContextPanel.vue'
import ChatMessages from './ChatMessages.vue'
import ChatInput from './ChatInput.vue'

export default {
  name: 'RightSidebar',
  components: {
    ChatHeader,
    ContextPanel,
    ChatMessages,
    ChatInput,
  },
  props: {
    chatSessions: {
      type: Array,
      required: true,
    },
    currentChatId: {
      type: [Number, String],
      default: null,
    },
    currentContexts: {
      type: Array,
      default: () => [],
    },
    isStreaming: {
      type: Boolean,
      default: false,
    },
    isWaitingResponse: {
      type: Boolean,
      default: false,
    },
    isDragOver: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    'send-message',
    'new-chat',
    'switch-chat',
    'close-chat',
    'add-context',
    'remove-context',
    'clear-contexts',
    'context-drag',
    'drag-over',
    'drag-leave',
    'drop',
    'example-message',
  ],
  setup(props) {
    const currentChatMessages = computed(() => {
      const currentChat = props.chatSessions.find((chat) => chat.id === props.currentChatId)
      return currentChat ? currentChat.messages : []
    })

    return {
      currentChatMessages,
    }
  },
}
</script>

<style scoped>
.sidebar-right {
  width: 25%;
  min-width: 300px;
  background-color: #161b22;
  display: flex;
  flex-direction: column;
  height: 100vh;
}
</style>