<template>
  <div class="chat-header">
    <div class="header-top">
      <h2>Chat Assistant</h2>
      <button class="new-chat-btn" @click="$emit('new-chat')">
        <span class="btn-icon">+</span>
      </button>
    </div>

    <div class="chat-tabs-container">
      <div class="chat-tabs" ref="tabsContainer">
        <div
          v-for="chat in chatSessions"
          :key="chat.id"
          class="chat-tab"
          :class="{ active: currentChatId === chat.id }"
          @click="$emit('switch-chat', chat.id)"
        >
          <div class="tab-content">
            <span class="tab-title">{{ chat.title || `Chat ${chat.id}` }}</span>
            <span class="tab-time">{{ formatTime(chat.createdAt) }}</span>
          </div>
          <button
            v-if="chatSessions.length > 1"
            class="close-tab-btn"
            @click.stop="$emit('close-chat', chat.id)"
          >
            ×
          </button>
        </div>
      </div>

      <!-- Scroll indicators -->
      <button v-if="canScrollLeft" class="scroll-btn scroll-left" @click="scrollTabs(-100)">
        ‹
      </button>
      <button v-if="canScrollRight" class="scroll-btn scroll-right" @click="scrollTabs(100)">
        ›
      </button>
    </div>

    <!-- <div class="chat-stats">
      <div class="stat">
        <span class="stat-value">{{ totalMessages }}</span>
        <span class="stat-label">Messages</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ activeContexts }}</span>
        <span class="stat-label">Contexts</span>
      </div>
    </div> -->
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'

export default {
  name: 'ChatHeader',
  props: {
    chatSessions: {
      type: Array,
      required: true,
    },
    currentChatId: {
      type: [Number, String],
      default: null,
    },
  },
  emits: ['new-chat', 'switch-chat', 'close-chat'],
  setup(props) {
    const tabsContainer = ref(null)
    const canScrollLeft = ref(false)
    const canScrollRight = ref(false)

    const totalMessages = computed(() => {
      return props.chatSessions.reduce((total, chat) => total + chat.messages.length, 0)
    })

    const activeContexts = computed(() => {
      const currentChat = props.chatSessions.find((chat) => chat.id === props.currentChatId)
      return currentChat ? currentChat.contexts.length : 0
    })

    const formatTime = (date) => {
      if (!date) return ''
      const now = new Date()
      const chatDate = new Date(date)
      const diffMs = now - chatDate
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)

      if (diffMins < 1) return 'Now'
      if (diffMins < 60) return `${diffMins}m`
      if (diffHours < 24) return `${diffHours}h`
      return chatDate.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })
    }

    const checkScroll = () => {
      if (!tabsContainer.value) return

      const { scrollLeft, scrollWidth, clientWidth } = tabsContainer.value
      canScrollLeft.value = scrollLeft > 0
      canScrollRight.value = scrollLeft < scrollWidth - clientWidth - 1
    }

    const scrollTabs = (amount) => {
      if (tabsContainer.value) {
        tabsContainer.value.scrollLeft += amount
      }
    }

    onMounted(() => {
      if (tabsContainer.value) {
        tabsContainer.value.addEventListener('scroll', checkScroll)
        checkScroll()
      }
    })

    onUnmounted(() => {
      if (tabsContainer.value) {
        tabsContainer.value.removeEventListener('scroll', checkScroll)
      }
    })

    return {
      tabsContainer,
      canScrollLeft,
      canScrollRight,
      totalMessages,
      activeContexts,
      formatTime,
      scrollTabs,
      checkScroll,
    }
  },
}
</script>

<style scoped>
.chat-header {
  background-color: #161b22;
  border-bottom: 1px solid #21262d;
  padding: 16px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.header-top h2 {
  font-size: 18px;
  font-weight: 600;
  color: #f0f6fc;
  margin: 0;
}

.new-chat-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 32px;
  font-weight: 500;
  background: transparent;
  transition: all 0.2s;
}

.new-chat-btn:hover {
  background-color: #30363d;
}
.new-chat-btn .btn-icon {
  font-size: 24px;
  background: transparent;
  color: white;
}
.btn-icon {
  font-size: 16px;
  font-weight: 600;
}

.chat-tabs-container {
  position: relative;
  margin-bottom: 12px;
}

.chat-tabs {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: 4px;
}

.chat-tabs::-webkit-scrollbar {
  display: none;
}

.chat-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: #0d1117;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid #30363d;
  transition: all 0.2s;
  flex-shrink: 0;
  min-width: 120px;
  max-width: 200px;
}

.chat-tab:hover {
  border-color: #484f58;
  background-color: #1a212e;
}

.chat-tab.active {
  background-color: #1c2b41;
  border-color: #58a6ff;
}

.tab-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tab-title {
  font-size: 12px;
  font-weight: 500;
  color: #c9d1d9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-tab.active .tab-title {
  color: #f0f6fc;
}

.tab-time {
  font-size: 10px;
  color: #6e7681;
}

.close-tab-btn {
  background: none;
  border: none;
  color: #8b949e;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 2px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: all 0.2s;
}

.chat-tab:hover .close-tab-btn {
  opacity: 1;
}

.close-tab-btn:hover {
  background-color: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
}

.scroll-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background-color: #0d1117;
  border: 1px solid #30363d;
  color: #c9d1d9;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  transition: all 0.2s;
}

.scroll-btn:hover {
  background-color: #1a212e;
  border-color: #58a6ff;
}

.scroll-left {
  left: 0;
}

.scroll-right {
  right: 0;
}

.chat-stats {
  display: flex;
  gap: 16px;
  padding-top: 8px;
  border-top: 1px solid #21262d;
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #f0f6fc;
}

.stat-label {
  font-size: 11px;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>