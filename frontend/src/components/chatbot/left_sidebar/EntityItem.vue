<template>
  <div
    class="entity-item"
    :class="{
      active: isActive,
      draggable: true,
      [entityType]: true,
      compact: isCompact,
    }"
    @click="onClick"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <div class="entity-main">
      <i class="material-symbols-outlined entity-icon">{{ icon }}</i>
      <div class="entity-info">
        <div class="entity-name" :title="name">{{ displayName }}</div>
        <div class="entity-description" :title="description">{{ displayDescription }}</div>
      </div>
    </div>

    <div class="entity-meta">
      <span v-if="status" :class="['status-badge', statusClass]">
        {{ statusText }}
      </span>
      <span v-if="priority" :class="['priority-badge', priorityClass]">
        {{ priorityText }}
      </span>
    </div>

    <!-- Quick action buttons -->
    <div class="entity-actions">
      <button class="action-btn chat-btn" @click.stop="addToChat" title="Thêm vào chat">
        <i class="material-symbols-outlined">chat</i>
      </button>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'EntityItem',
  props: {
    entity: {
      type: Object,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isCompact: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['select', 'drag-start', 'add-to-chat'],
  setup(props, { emit }) {
    // Entity data với xử lý tên dài
    const entityId = computed(() => props.entity.id ?? props.entity._id ?? props.entity.uuid ?? null)
    const name = computed(() => props.entity.name || props.entity.title || props.entity.tableName || 'Unnamed')
    const displayName = computed(() => {
      const maxLength = props.isCompact ? 25 : 35
      const raw = name.value || 'Unnamed'
      return raw.length > maxLength ? raw.substring(0, maxLength) + '...' : raw
    })

    const description = computed(() => props.entity.description || props.entity.summary || 'Không có mô tả')
    const displayDescription = computed(() => {
      const maxLength = props.isCompact ? 40 : 60
      const raw = description.value || ''
      return raw.length > maxLength ? raw.substring(0, maxLength) + '...' : raw
    })

    const status = computed(() => props.entity.status)
    const priority = computed(() => props.entity.priority)

    // Icons for different entity types using Material Icons
    const icon = computed(() => {
      const icons = {
        usecase: 'description',
        testcase: 'science',
        database: 'storage',
        'uml-activity': 'swap_horiz',
        'uml-usecase': 'group',
        'uml-sequence': 'fast_forward',
        uml: 'account_tree',
      }
      return icons[props.type] || 'article'
    })

    const entityType = computed(() => `type-${props.type}`)

    // Status and priority styling
    const statusClass = computed(() => {
      const statusClasses = {
        approved: 'status-approved',
        draft: 'status-draft',
        in_progress: 'status-progress',
        completed: 'status-completed',
        passed: 'status-passed',
        failed: 'status-failed',
        not_executed: 'status-not-executed',
        blocked: 'status-blocked',
      }
      return statusClasses[props.entity.status] || 'status-default'
    })

    const statusText = computed(() => {
      const statusTexts = {
        approved: 'Đã duyệt',
        draft: 'Bản nháp',
        in_progress: 'Đang làm',
        completed: 'Hoàn thành',
        passed: 'Passed',
        failed: 'Failed',
        not_executed: 'Chưa chạy',
        blocked: 'Bị chặn',
      }
      return statusTexts[props.entity.status] || props.entity.status
    })

    const priorityClass = computed(() => {
      const priorityClasses = {
        high: 'priority-high',
        medium: 'priority-medium',
        low: 'priority-low',
        critical: 'priority-critical',
      }
      return priorityClasses[props.entity.priority] || 'priority-default'
    })

    const priorityText = computed(() => {
      const priorityTexts = {
        high: 'Cao',
        medium: 'Trung bình',
        low: 'Thấp',
        critical: 'Rất cao',
      }
      return priorityTexts[props.entity.priority] || props.entity.priority
    })

    // Methods
    const onClick = () => {
      emit('select', {
        type: props.type,
        id: entityId.value ?? props.entity.id,
        name: name.value,
        data: props.entity,
      })
    }

    const onDragStart = (event) => {
      const dragData = {
        type: props.type,
        id: entityId.value ?? props.entity.id,
        name: name.value,
        data: props.entity,
      }
      event.dataTransfer.setData('application/json', JSON.stringify(dragData))
      event.dataTransfer.effectAllowed = 'copy'

      // Add visual feedback
      event.target.classList.add('dragging')

      emit('drag-start', event, dragData)
    }

    const onDragEnd = (event) => {
      event.target.classList.remove('dragging')
    }

    const addToChat = () => {
      const contextData = {
        type: props.type,
        id: entityId.value ?? props.entity.id,
        name: name.value,
        data: props.entity,
      }
      emit('add-to-chat', contextData)
    }

    return {
      entityId,
      name,
      displayName,
      description,
      displayDescription,
      status,
      priority,
      icon,
      entityType,
      statusClass,
      statusText,
      priorityClass,
      priorityText,
      onClick,
      onDragStart,
      onDragEnd,
      addToChat,
    }
  },
}
</script>

<style scoped>
.entity-item {
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid #21262d;
  transition: all 0.2s;
  position: relative;
  background-color: #0d1117;
}

.entity-item.compact {
  padding: 8px 10px;
}

.entity-item:hover {
  background-color: #1a212e;
  transform: translateX(2px);
}

.entity-item.active {
  background-color: #1c2b41;
  border-left: 3px solid #58a6ff;
}

.entity-item.dragging {
  opacity: 0.6;
  background-color: #1c2b41;
  border: 2px dashed #58a6ff;
}

.entity-item:last-child {
  border-bottom: none;
}

.entity-main {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
}

.entity-item.compact .entity-main {
  margin-bottom: 4px;
}

.entity-icon {
  font-size: 16px;
  color: #58a6ff;
  margin-top: 2px;
  flex-shrink: 0;
}

.entity-item.compact .entity-icon {
  font-size: 14px;
}

.entity-info {
  flex: 1;
  min-width: 0;
}

.entity-name {
  font-size: 12px;
  font-weight: 500;
  color: #f0f6fc;
  margin-bottom: 3px;
  line-height: 1.3;
  word-wrap: break-word;
}

.entity-item.compact .entity-name {
  font-size: 11px;
  margin-bottom: 2px;
}

.entity-description {
  font-size: 10px;
  color: #8b949e;
  line-height: 1.3;
  word-wrap: break-word;
}

.entity-item.compact .entity-description {
  font-size: 9px;
}

.entity-meta {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.entity-item.compact .entity-meta {
  margin-bottom: 4px;
}

.status-badge,
.priority-badge {
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.2px;
}

.entity-item.compact .status-badge,
.entity-item.compact .priority-badge {
  font-size: 8px;
  padding: 1px 3px;
}

/* Status colors */
.status-approved,
.status-passed,
.status-completed {
  background: rgba(46, 160, 67, 0.15);
  color: #7ee787;
}

.status-draft,
.status-not-executed {
  background: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}

.status-progress {
  background: rgba(88, 166, 255, 0.15);
  color: #79c0ff;
}

.status-failed,
.status-blocked {
  background: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
}

/* Priority colors */
.priority-high,
.priority-critical {
  background: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
}

.priority-medium {
  background: rgba(255, 166, 87, 0.15);
  color: #ffa657;
}

.priority-low {
  background: rgba(46, 160, 67, 0.15);
  color: #7ee787;
}

.entity-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  opacity: 0;
  transition: opacity 0.2s;
  display: flex;
  gap: 2px;
}

.entity-item.compact .entity-actions {
  top: 4px;
  right: 4px;
}

.entity-item:hover .entity-actions {
  opacity: 1;
}

.action-btn {
  background: rgba(33, 38, 45, 0.8);
  border: 1px solid #30363d;
  border-radius: 3px;
  padding: 3px;
  cursor: pointer;
  font-size: 10px;
  transition: all 0.2s;
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8b949e;
}

.entity-item.compact .action-btn {
  padding: 2px;
  font-size: 9px;
}

.action-btn:hover {
  background: #58a6ff;
  border-color: #58a6ff;
  transform: scale(1.1);
  color: white;
}

.chat-btn:hover {
  background: #7ee787;
  border-color: #7ee787;
}

/* Entity type specific borders */
.entity-item.type-usecase {
  border-left: 2px solid rgba(121, 192, 255, 0.3);
}

.entity-item.type-testcase {
  border-left: 2px solid rgba(126, 231, 135, 0.3);
}

.entity-item.type-database {
  border-left: 2px solid rgba(210, 168, 255, 0.3);
}

.entity-item.type-uml,
.entity-item.type-uml-activity,
.entity-item.type-uml-usecase,
.entity-item.type-uml-sequence {
  border-left: 2px solid rgba(255, 166, 87, 0.3);
}

.entity-item.active.type-usecase {
  border-left: 3px solid #79c0ff;
}

.entity-item.active.type-testcase {
  border-left: 3px solid #7ee787;
}

.entity-item.active.type-database {
  border-left: 3px solid #d2a8ff;
}

.entity-item.active.type-uml,
.entity-item.active.type-uml-activity,
.entity-item.active.type-uml-usecase,
.entity-item.active.type-uml-sequence {
  border-left: 3px solid #ffa657;
}
</style>