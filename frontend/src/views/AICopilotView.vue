<template>
  <div class="ai-copilot-container">
    <!-- 3-Lane Layout -->
    <div class="ai-copilot-layout">
      <!-- Lane 1: Project Data Tree -->
      <div class="lane-left" :class="{ 'collapsed': leftCollapsed }">
        <div class="lane-header">
          <h3>
            <span class="material-symbols-outlined">folder</span>
            Project Data
          </h3>
          <button @click="leftCollapsed = !leftCollapsed" class="collapse-btn">
            <span class="material-symbols-outlined">{{ leftCollapsed ? 'chevron_right' : 'chevron_left' }}</span>
          </button>
        </div>
        <ProjectDataTree
          v-if="!leftCollapsed"
          :project-id="projectId"
          :version-id="versionId"
          @item-selected="handleItemSelected"
          @item-dragged="handleItemDragged"
          @project-changed="handleProjectChanged"
        />
      </div>

      <!-- Resizer -->
      <div class="resizer" @mousedown="startResize('left')"></div>

      <!-- Lane 2: Visualization -->
      <div class="lane-center" :class="{ 'collapsed': centerCollapsed }">
        <div class="lane-header">
          <h3>
            <span class="material-symbols-outlined">dashboard</span>
            Visualization
          </h3>
          <div class="header-actions">
            <button @click="centerCollapsed = !centerCollapsed" class="collapse-btn">
              <span class="material-symbols-outlined">{{ centerCollapsed ? 'chevron_right' : 'chevron_left' }}</span>
            </button>
          </div>
        </div>
        <VisualizationView
          v-if="!centerCollapsed"
          :item="selectedItem"
          :item-type="selectedItemType"
          :project-id="projectId"
          :version-id="versionId"
          @item-updated="handleItemUpdated"
          @refresh-requested="handleRefreshRequested"
        />
      </div>

      <!-- Resizer -->
      <div class="resizer" @mousedown="startResize('right')"></div>

      <!-- Lane 3: Chat Panel -->
      <div class="lane-right">
        <ChatPanel
          :project-id="projectId"
          :version-id="versionId"
          :context-items="contextItems"
          @context-removed="removeContext"
          @action-requested="handleActionRequest"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProjectDataTree from '@/components/ai-copilot/ProjectDataTree.vue'
import VisualizationView from '@/components/ai-copilot/VisualizationView.vue'
import ChatPanel from '@/components/ai-copilot/ChatPanel.vue'

const route = useRoute()
const router = useRouter()
const projectId = computed(() => route.params.id)
const versionId = ref(null)
const projectDataTreeRef = ref(null)

// UI State
const leftCollapsed = ref(false)
const centerCollapsed = ref(false)
const selectedItem = ref(null)
const selectedItemType = ref(null)
const contextItems = ref([])

// Editor content
const editorContent = ref('')

// Resize functionality
let isResizing = false
let resizeType = null

const startResize = (type) => {
  isResizing = true
  resizeType = type
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

const handleResize = (e) => {
  if (!isResizing) return
  
  const container = document.querySelector('.ai-copilot-layout')
  if (!container) return

  const rect = container.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percentage = (x / rect.width) * 100

  if (resizeType === 'left') {
    document.documentElement.style.setProperty('--left-width', `${Math.max(20, Math.min(40, percentage))}%`)
  } else if (resizeType === 'right') {
    const leftWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--left-width')) || 25
    const centerWidth = Math.max(30, Math.min(50, percentage - leftWidth))
    document.documentElement.style.setProperty('--center-width', `${centerWidth}%`)
  }
}

const stopResize = () => {
  isResizing = false
  resizeType = null
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

// Item selection
const handleItemSelected = (item, type) => {
  selectedItem.value = item
  selectedItemType.value = type
  editorContent.value = JSON.stringify(item, null, 2)
}

// Drag & Drop context
const handleItemDragged = (item, type) => {
  const contextId = `${type}-${item._id || item.id || item.name}`
  if (!contextItems.value.find(c => c.id === contextId)) {
    contextItems.value.push({
      id: contextId,
      type,
      item,
      label: item.name || item.title || `${type}-${item._id || item.id || item.name}`
    })
  }
}

const removeContext = (contextId) => {
  contextItems.value = contextItems.value.filter(c => c.id !== contextId)
}

// Content changes
const handleContentChanged = (content) => {
  editorContent.value = content
}

// Save changes
const saveChanges = async () => {
  if (!selectedItem.value || !selectedItemType.value) return
  
  try {
    // Parse JSON content
    const updatedData = JSON.parse(editorContent.value)
    
    // Call appropriate API based on item type
    // This will be implemented based on the API structure
    console.log('Saving:', selectedItemType.value, updatedData)
    
    // TODO: Implement save logic
  } catch (error) {
    console.error('Error saving:', error)
    alert('Invalid JSON format')
  }
}

// AI Action handling
const handleActionRequest = async (action) => {
  // Handle AI actions (Create/Update/Delete)
  console.log('AI Action:', action)
  // TODO: Implement action handling
}

// Handle item updated from visualization
const handleItemUpdated = async (updatedItem, itemType) => {
  try {
    console.log('Item updated:', itemType, updatedItem)
    // Item is already saved in VisualizationView
    // Just refresh the tree
    handleRefreshRequested()
  } catch (error) {
    console.error('Error updating item:', error)
    alert('Failed to update item')
  }
}

// Handle refresh request
const handleRefreshRequested = () => {
  // Reload tree data
  if (projectDataTreeRef.value && projectDataTreeRef.value.reloadData) {
    projectDataTreeRef.value.reloadData()
  }
}

// Handle project change from tree
const handleProjectChanged = (newProjectId) => {
  // Navigate to new project's AI Copilot
  router.push({
    name: 'AICopilot',
    params: { id: newProjectId },
    query: versionId.value ? { versionId: versionId.value } : {}
  })
}

// Load version ID
onMounted(async () => {
  // Load current version for project
  try {
    // Try to get versionId from query first
    if (route.query.versionId) {
      versionId.value = route.query.versionId
    } else {
      // Load project detail to get current version
      const { getProjectDetail } = await import('@/api/project')
      const response = await getProjectDetail(projectId.value)
      const projectData = response.data?.data || response.data
      versionId.value = projectData?.project?.current_version || projectData?.current_version?._id || null
    }
    console.log('✅ Loaded version ID:', versionId.value)
  } catch (error) {
    console.error('Error loading version ID:', error)
    versionId.value = null
  }
})

onUnmounted(() => {
  stopResize()
})
</script>

<style scoped>
.ai-copilot-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  color: #d4d4d4;
}

.ai-copilot-layout {
  display: flex;
  height: 100%;
  overflow: hidden;
}

/* Lane Styles */
.lane-left,
.lane-center,
.lane-right {
  display: flex;
  flex-direction: column;
  background: #252526;
  border-right: 1px solid #3e3e42;
  overflow: hidden;
  transition: width 0.2s;
}

.lane-left {
  width: var(--left-width, 25%);
  min-width: 200px;
}

.lane-center {
  width: var(--center-width, 35%);
  min-width: 300px;
}

.lane-right {
  flex: 1;
  min-width: 400px;
}

.lane-left.collapsed,
.lane-center.collapsed {
  width: 0;
  min-width: 0;
  border: none;
}

.lane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #2d2d30;
  border-bottom: 1px solid #3e3e42;
}

.lane-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #cccccc;
  display: flex;
  align-items: center;
  gap: 8px;
}

.lane-header h3 .material-symbols-outlined {
  font-size: 18px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.collapse-btn {
  background: transparent;
  border: 1px solid #3e3e42;
  color: #cccccc;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapse-btn .material-symbols-outlined {
  font-size: 18px;
}

.collapse-btn:hover,
.save-btn:hover {
  background: #3e3e42;
}

.save-btn {
  background: #0e639c;
  border-color: #0e639c;
}

.save-btn:hover {
  background: #1177bb;
}

/* Resizer */
.resizer {
  width: 4px;
  background: #1e1e1e;
  cursor: col-resize;
  position: relative;
}

.resizer:hover {
  background: #0e639c;
}

.resizer::after {
  content: '';
  position: absolute;
  left: -2px;
  right: -2px;
  top: 0;
  bottom: 0;
}
</style>