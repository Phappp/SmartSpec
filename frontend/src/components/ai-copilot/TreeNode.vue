<template>
  <div class="tree-node">
    <div
      class="node-content"
      :class="{ 'selected': isSelected, 'draggable': isDraggable, 'no-click': node.type === 'column' }"
      :style="{ paddingLeft: `${level * 16 + 8}px` }"
      @click="handleClick"
      @dblclick="handleDoubleClick"
      @dragstart="handleDragStart"
      @dragover.prevent
      @drop="handleDrop"
      :draggable="node.type !== 'column'"
    >
      <span class="node-icon material-symbols-outlined">{{ node.icon || getIcon() }}</span>
      <span class="node-label">{{ node.label || node.name || node.title }}</span>
      <div class="node-actions" v-if="!isFolder && node.type !== 'column'">
        <button @click.stop="handleDelete" class="delete-btn">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>

    <!-- Children -->
    <div v-if="isExpanded && node.children && node.children.length > 0" class="node-children">
      <TreeNode
        v-for="child in node.children"
        :key="child.id || child._id || child.name"
        :node="child"
        :level="level + 1"
        @item-selected="$emit('item-selected', $event, child.type || node.type)"
        @item-dragged="$emit('item-dragged', $event, child.type || node.type)"
        @item-deleted="$emit('item-deleted', $event, child.type || node.type)"
        @item-created="$emit('item-created', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  level: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['item-selected', 'item-dragged', 'item-deleted', 'item-created'])

const isExpanded = ref(props.node.type !== 'table') // Tables start collapsed
const isSelected = ref(false)

const isFolder = computed(() => {
  return props.node.type === 'folder' || (props.node.children && props.node.children.length > 0)
})

const isDraggable = computed(() => {
  return !isFolder.value && (props.node.type === 'usecase' || props.node.type === 'testcase' || 
         props.node.type === 'table' || props.node.type === 'column' || props.node.type === 'requirement')
})

const getIcon = () => {
  const type = props.node.type
  const icons = {
    usecase: 'description',
    testcase: 'checklist',
    table: 'table_chart',
    column: 'view_column',
    requirement: 'article',
    database: 'storage',
    folder: isExpanded.value ? 'folder_open' : 'folder'
  }
  return icons[type] || 'description'
}

let clickTimer = null

const handleClick = () => {
  // For tables: single click = select, double click = expand/collapse columns
  if (props.node.type === 'table') {
    // Clear any pending single click
    if (clickTimer) {
      clearTimeout(clickTimer)
      clickTimer = null
    }
    
    // Set timer for single click (select table)
    clickTimer = setTimeout(() => {
      isSelected.value = true
      emit('item-selected', props.node, props.node.type)
      clickTimer = null
    }, 250) // 250ms delay to detect double click
  } else if (isFolder.value) {
    isExpanded.value = !isExpanded.value
  } else {
    // Don't allow clicking on columns
    if (props.node.type === 'column') {
      return
    }
    isSelected.value = true
    emit('item-selected', props.node, props.node.type)
  }
}

const handleDoubleClick = () => {
  // Clear single click timer
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
  }
  
  // For tables: double click = expand/collapse columns
  if (props.node.type === 'table') {
    isExpanded.value = !isExpanded.value
  } else if (isFolder.value) {
    isExpanded.value = !isExpanded.value
  }
}

const handleDragStart = (e) => {
  if (!isDraggable.value) {
    e.preventDefault()
    return
  }

  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('application/json', JSON.stringify({
    item: props.node,
    type: props.node.type
  }))
}

const handleDrop = (e) => {
  e.preventDefault()
  // Handle drop if needed for reordering
}

const handleDelete = () => {
  if (confirm('Are you sure you want to delete this item?')) {
    emit('item-deleted', props.node, props.node.type)
  }
}
</script>

<style scoped>
.tree-node {
  user-select: none;
}

.node-content {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
  gap: 8px;
}

.node-content:has(.node-label:has-text) {
  /* Column nodes should not be clickable */
}

.node-content.no-click {
  cursor: default;
  opacity: 0.7;
  pointer-events: none;
}

.node-content:hover {
  background: #2a2d2e;
}

.node-content.selected {
  background: #094771;
}

.node-content.draggable {
  cursor: grab;
}

.node-content.draggable:active {
  cursor: grabbing;
}

.node-icon {
  font-size: 18px;
  flex-shrink: 0;
  color: #858585;
}

.node-label {
  flex: 1;
  font-size: 13px;
  color: #cccccc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.node-content:hover .node-actions {
  opacity: 1;
}

.delete-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #858585;
  transition: all 0.2s;
}

.delete-btn:hover {
  background: #5a1d1d;
  color: #f48771;
}

.delete-btn .material-symbols-outlined {
  font-size: 16px;
}

.node-children {
  margin-left: 0;
}
</style>
