<template>
  <div class="context-panel" :class="{ collapsed: isCollapsed }">
    <div class="context-header" @click="toggleCollapse">
      <div class="header-left">
        <span class="material-symbols-outlined collapse-icon">{{
          isCollapsed ? 'chevron_right' : 'expand_more'
        }}</span>
        <span class="header-title">Context</span>
        <span class="context-count">({{ contexts.length }})</span>
      </div>
      <div class="header-actions" v-if="!isCollapsed">
        <button class="action-btn" @click.stop="clearAll" title="Clear all contexts">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>

    <div v-if="!isCollapsed" class="context-content">
      <div v-if="contexts.length === 0" class="empty-contexts">
        <span class="material-symbols-outlined empty-icon">target</span>
        <p class="empty-text">No contexts added</p>
        <p class="empty-hint">Drag entities from left sidebar to add context</p>
      </div>

      <div v-else class="context-items">
        <div
          v-for="context in contexts"
          :key="context.id"
          class="context-item"
          :class="getContextTypeClass(context.type)"
          draggable="true"
          @dragstart="onDragStart($event, context.id)"
        >
          <div class="context-item-header">
            <span class="context-type">{{ getContextTypeLabel(context.type) }}</span>
            <button class="remove-btn" @click="removeContext(context.id)">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="context-item-body">
            <div class="context-name">{{ context.name }}</div>
            <div class="context-preview">{{ getContextPreview(context) }}</div>
          </div>
          <div class="context-item-footer">
            <span class="context-time">{{ formatTime(context.addedAt) }}</span>
            <span class="drag-hint">Drag to remove</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'ContextPanel',
  props: {
    contexts: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['remove-context', 'clear-contexts', 'context-drag'],
  setup(props, { emit }) {
    const isCollapsed = ref(false)

    const toggleCollapse = () => {
      isCollapsed.value = !isCollapsed.value
    }

    const removeContext = (contextId) => {
      emit('remove-context', contextId)
    }

    const clearAll = () => {
      emit('clear-contexts')
    }

    const onDragStart = (event, contextId) => {
      event.dataTransfer.setData('text/plain', `remove-context:${contextId}`)
      event.dataTransfer.effectAllowed = 'move'
      emit('context-drag', contextId)
    }

    const getContextTypeClass = (type) => {
      const typeClasses = {
        usecase: 'type-usecase',
        testcase: 'type-testcase',
        database: 'type-database',
        uml: 'type-uml',
      }
      return typeClasses[type] || 'type-default'
    }

    const getContextTypeLabel = (type) => {
      const typeLabels = {
        usecase: 'Use Case',
        testcase: 'Test Case',
        database: 'Database',
        uml: 'UML Diagram',
      }
      return typeLabels[type] || 'Context'
    }

    const getContextPreview = (context) => {
      if (context.data?.description) {
        return context.data.description.length > 80
          ? context.data.description.substring(0, 80) + '...'
          : context.data.description
      }
      return 'No description available'
    }

    const formatTime = (date) => {
      if (!date) return ''
      const now = new Date()
      const contextDate = new Date(date)
      const diffMs = now - contextDate
      const diffMins = Math.floor(diffMs / 60000)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      return contextDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }

    return {
      isCollapsed,
      toggleCollapse,
      removeContext,
      clearAll,
      onDragStart,
      getContextTypeClass,
      getContextTypeLabel,
      getContextPreview,
      formatTime,
    }
  },
}
</script>

<style scoped>
.context-panel {
  background-color: #0d1117;
  border-bottom: 1px solid #21262d;
  transition: all 0.3s ease;
}

.context-panel.collapsed {
  max-height: 40px;
  overflow: hidden;
}

.context-header {
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s;
}

.context-header:hover {
  background-color: #1a212e;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.collapse-icon {
  font-size: 18px;
  color: #8b949e;
  width: 18px;
  text-align: center;
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: #f0f6fc;
}

.context-count {
  font-size: 12px;
  color: #8b949e;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  background: none;
  border: none;
  color: #8b949e;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  font-size: 16px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background-color: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
}

.context-content {
  max-height: 200px;
  overflow-y: auto;
  padding: 0 16px 12px;
}

.empty-contexts {
  text-align: center;
  padding: 20px;
  color: #6e7681;
}

.empty-icon {
  font-size: 24px;
  display: block;
  margin-bottom: 8px;
  color: #58a6ff;
}

.empty-text {
  font-size: 14px;
  margin: 0 0 4px 0;
}

.empty-hint {
  font-size: 12px;
  margin: 0;
}

.context-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.context-item {
  background-color: #161b22;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 8px;
  cursor: move;
  transition: all 0.2s;
  animation: slideIn 0.3s ease;
}

.context-item:hover {
  border-color: #58a6ff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.context-item.type-usecase {
  border-left: 3px solid #79c0ff;
}

.context-item.type-testcase {
  border-left: 3px solid #7ee787;
}

.context-item.type-database {
  border-left: 3px solid #d2a8ff;
}

.context-item.type-uml {
  border-left: 3px solid #ffa657;
}

.context-item.type-default {
  border-left: 3px solid #8b949e;
}

.context-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.context-type {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: 4px;
}

.type-usecase .context-type {
  background-color: rgba(121, 192, 255, 0.15);
  color: #79c0ff;
}

.type-testcase .context-type {
  background-color: rgba(126, 231, 135, 0.15);
  color: #7ee787;
}

.type-database .context-type {
  background-color: rgba(210, 168, 255, 0.15);
  color: #d2a8ff;
}

.type-uml .context-type {
  background-color: rgba(255, 166, 87, 0.15);
  color: #ffa657;
}

.type-default .context-type {
  background-color: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}

.remove-btn {
  background: none;
  border: none;
  color: #8b949e;
  cursor: pointer;
  font-size: 16px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  padding: 0;
  opacity: 0;
  transition: all 0.2s;
}

.context-item:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  background-color: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
}

.remove-btn .material-symbols-outlined {
  font-size: 16px;
}

.context-item-body {
  margin-bottom: 6px;
}

.context-name {
  font-size: 13px;
  font-weight: 600;
  color: #f0f6fc;
  margin-bottom: 4px;
  line-height: 1.3;
}

.context-preview {
  font-size: 11px;
  color: #8b949e;
  line-height: 1.3;
}

.context-item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.context-time {
  font-size: 10px;
  color: #6e7681;
}

.drag-hint {
  font-size: 9px;
  color: #484f58;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  opacity: 0;
  transition: opacity 0.2s;
}

.context-item:hover .drag-hint {
  opacity: 1;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scrollbar */
.context-content::-webkit-scrollbar {
  width: 4px;
}

.context-content::-webkit-scrollbar-track {
  background: #0d1117;
}

.context-content::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 2px;
}

.context-content::-webkit-scrollbar-thumb:hover {
  background: #484f58;
}
</style>