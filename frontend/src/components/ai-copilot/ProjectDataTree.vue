<template>
  <div class="project-data-tree">
    <!-- Back Button -->
    <div class="back-button-container">
      <button @click="goBackToProjects" class="back-btn">
        <span class="material-symbols-outlined">arrow_back</span>
        <span>Back to Projects</span>
      </button>
    </div>

    <!-- Project Selector -->
    <div class="project-selector">
      <div class="selector-header">
        <span class="material-symbols-outlined">folder</span>
        <span>Select Project</span>
      </div>
      <select v-model="selectedProjectId" @change="handleProjectChange" class="project-select">
        <option v-for="proj in availableProjects" :key="proj._id" :value="proj._id">
          {{ proj.name }}
        </option>
      </select>
    </div>

    <!-- Statistics -->
    <div class="statistics">
      <div class="stat-item">
        <span class="stat-label">Use Cases:</span>
        <span class="stat-value">{{ usecasesCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Test Cases:</span>
        <span class="stat-value">{{ testcasesCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Tables:</span>
        <span class="stat-value">{{ tablesCount }}</span>
      </div>
    </div>

    <!-- Search -->
    <div class="tree-search">
      <span class="material-symbols-outlined search-icon">search</span>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search..."
        class="search-input"
      />
    </div>

    <!-- Tree View -->
    <div class="tree-container" v-if="!loading">
      <TreeNode
        v-for="node in filteredTree"
        :key="node.id"
        :node="node"
        :level="0"
        @item-selected="handleItemSelected"
        @item-dragged="handleItemDragged"
        @item-deleted="handleItemDeleted"
        @item-created="handleItemCreated"
      />
    </div>

    <div v-else class="loading">Loading...</div>

    <!-- Add Item Button -->
    <div class="tree-actions">
      <button @click="showAddMenu = !showAddMenu" class="add-btn">
        <span class="material-symbols-outlined">add</span>
        <span>Add Item</span>
      </button>
      <div v-if="showAddMenu" class="add-menu">
        <button @click="createItem('usecase')">
          <span class="material-symbols-outlined">description</span>
          Use Case
        </button>
        <button @click="createItem('testcase')">
          <span class="material-symbols-outlined">checklist</span>
          Test Case
        </button>
        <button @click="createItem('table')">
          <span class="material-symbols-outlined">table_chart</span>
          Database Table
        </button>
        <button @click="createItem('requirement')">
          <span class="material-symbols-outlined">article</span>
          Requirement
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import TreeNode from './TreeNode.vue'
import { 
  usecaseApi,
  getDatabasesByVersion 
} from '@/api/project'
import {getTestCasesByProject, testcaseApi } from '@/api/testcase'

const props = defineProps({
  projectId: {
    type: String,
    required: true
  },
  versionId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['item-selected', 'item-dragged', 'project-changed', 'go-back'])

const router = useRouter()

const goBackToProjects = () => {
  emit('go-back')
  router.push({ name: 'Dashboard' })
}

// State
const loading = ref(true)
const searchQuery = ref('')
const showAddMenu = ref(false)
const selectedProjectId = ref(props.projectId)
const availableProjects = ref([])

// Tree data
const treeData = ref({
  usecases: [],
  testcases: [],
  database: null,
  requirements: []
})

// Computed statistics
const usecasesCount = computed(() => treeData.value.usecases?.length || 0)
const testcasesCount = computed(() => treeData.value.testcases?.length || 0)
const tablesCount = computed(() => {
  if (!treeData.value.database) return 0
  // Database can be a single object with tables array, or it can be in children
  if (treeData.value.database.tables && Array.isArray(treeData.value.database.tables)) {
    return treeData.value.database.tables.length
  }
  if (treeData.value.database.children && Array.isArray(treeData.value.database.children)) {
    // Count tables in children
    return treeData.value.database.children.filter(child => child.type === 'table').length
  }
  return 0
})

// Computed filtered tree
const filteredTree = computed(() => {
  const tree = [
    {
      id: 'usecases',
      label: `Use Cases (${usecasesCount.value})`,
      type: 'folder',
      children: filterItems(treeData.value.usecases, 'usecase'),
      icon: 'description'
    },
    {
      id: 'testcases',
      label: `Test Cases (${testcasesCount.value})`,
      type: 'folder',
      children: filterItems(treeData.value.testcases, 'testcase'),
      icon: 'checklist'
    },
    {
      id: 'database',
      label: `Database Schema (${tablesCount.value} tables)`,
      type: 'folder',
      children: treeData.value.database ? [treeData.value.database] : [],
      icon: 'storage'
    },
    {
      id: 'requirements',
      label: 'Requirements',
      type: 'folder',
      children: filterItems(treeData.value.requirements, 'requirement'),
      icon: 'article'
    }
  ]

  return tree.filter(node => {
    if (!searchQuery.value) return true
    return node.label.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
           node.children.some(child => 
             (child.name || child.title || '').toLowerCase().includes(searchQuery.value.toLowerCase())
           )
  })
})

const filterItems = (items, type) => {
  if (!items || !Array.isArray(items)) return []
  if (!searchQuery.value) {
    // Ensure usecase items have 'id' field preserved
    return items.map(item => {
      const mapped = { ...item, type }
      // For usecases, ensure 'id' field is preserved (not _id)
      if (type === 'usecase' && !mapped.id && mapped._id) {
        // If only _id exists, try to use it as id (but this shouldn't happen)
        console.warn('Usecase missing id field, using _id:', mapped)
      }
      return mapped
    })
  }
  
  const query = searchQuery.value.toLowerCase()
  return items
    .filter(item => 
      (item.name || item.title || '').toLowerCase().includes(query) ||
      (item.description || '').toLowerCase().includes(query)
    )
    .map(item => {
      const mapped = { ...item, type }
      // For usecases, ensure 'id' field is preserved
      if (type === 'usecase' && !mapped.id && mapped._id) {
        console.warn('Usecase missing id field, using _id:', mapped)
      }
      return mapped
    })
}

// Load data
const loadData = async () => {
  loading.value = true
  try {
    // Load Use Cases
    if (props.versionId) {
      try {
        const usecasesRes = await usecaseApi.getUsecases(props.versionId)
        // Parse response: could be usecasesRes.data.data or usecasesRes.data
        const usecasesData = usecasesRes.data?.data || usecasesRes.data || []
        treeData.value.usecases = Array.isArray(usecasesData) ? usecasesData : []
        console.log('✅ Loaded use cases:', treeData.value.usecases.length)
      } catch (error) {
        console.error('Error loading use cases:', error)
        treeData.value.usecases = []
      }
    }

    // Load Test Cases
    try {
      const projectIdToUse = selectedProjectId.value || props.projectId
      const testcasesRes = await getTestCasesByProject(projectIdToUse, props.versionId ? { versionId: props.versionId } : {})
      // Parse response: could be testcasesRes.data.data or testcasesRes.data
      const testcasesData = testcasesRes.data?.data || testcasesRes.data || []
      treeData.value.testcases = Array.isArray(testcasesData) ? testcasesData : []
      console.log('✅ Loaded test cases:', treeData.value.testcases.length)
    } catch (error) {
      console.error('Error loading test cases:', error)
      treeData.value.testcases = []
    }

    // Load Database
    if (props.versionId) {
      try {
        const dbRes = await getDatabasesByVersion(props.versionId)
        // Parse response: could be dbRes.data.data or dbRes.data
        const dbData = dbRes.data?.data || dbRes.data || []
        if (Array.isArray(dbData) && dbData.length > 0) {
          const db = dbData[0]
          // Store database reference for table updates
          treeData.value.database = {
            ...db,
            type: 'database',
            _id: db._id,
            name: db.name || 'Database',
            children: (db.tables || []).map(table => ({
              ...table,
              type: 'table',
              _id: table._id || table.name,
              name: table.name,
              databaseId: db._id,
              children: (table.columns || []).map(col => ({
                ...col,
                type: 'column',
                name: col.name,
                tableName: table.name,
                databaseId: db._id,
                _id: `${table.name}_${col.name}`
              }))
            }))
          }
          console.log('✅ Loaded database with', db.tables?.length || 0, 'tables')
        } else {
          treeData.value.database = null
        }
      } catch (error) {
        console.error('Error loading database:', error)
        treeData.value.database = null
      }
    }

    // Load Requirements (from inputs/requirement_model in version)
    // TODO: Load from inputs API if needed
    treeData.value.requirements = []
    
    console.log('✅ Project data loaded:', {
      usecases: treeData.value.usecases.length,
      testcases: treeData.value.testcases.length,
      database: treeData.value.database ? 'loaded' : 'none',
      requirements: treeData.value.requirements.length
    })
  } catch (error) {
    console.error('Error loading project data:', error)
  } finally {
    loading.value = false
  }
}

// Event handlers
const handleItemSelected = (item, type) => {
  emit('item-selected', item, type)
}

const handleItemDragged = (item, type) => {
  emit('item-dragged', item, type)
}

const handleItemDeleted = async (item, type) => {
  try {
    // Delete based on type
    if (type === 'usecase' && props.versionId) {
      // Backend tìm usecase bằng field 'id' trong requirement_model, không phải '_id'
      const usecaseId = item.id || item._id
      if (!usecaseId) {
        alert('Usecase ID not found')
        return
      }
      console.log('Deleting usecase:', { versionId: props.versionId, usecaseId })
      await usecaseApi.deleteUsecase(props.versionId, usecaseId)
    } else if (type === 'testcase') {
      await testcaseApi.deleteTestCase(item._id)
    }
    
    // Reload data
    await loadData()
  } catch (error) {
    console.error('Error deleting item:', error)
    const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message
    alert('Failed to delete item: ' + errorMsg)
  }
}

const handleItemCreated = async () => {
  await loadData()
}

const createItem = (itemType) => {
  showAddMenu.value = false
  // Emit event to create new item
  // This will be handled by parent or a modal
  emit('item-created', itemType)
}

// Handle project change
const handleProjectChange = async () => {
  emit('project-changed', selectedProjectId.value)
  // Reload data with new project
  await loadData()
}

// Watch for project/version changes
watch(() => props.projectId, (newId) => {
  selectedProjectId.value = newId
  loadData()
})

watch(() => props.versionId, () => {
  loadData()
})

// Load available projects
const loadProjects = async () => {
  try {
    const { getMyProjects, getSharedProjects } = await import('@/api/project')
    const [myProjectsRes, sharedProjectsRes] = await Promise.all([
      getMyProjects(),
      getSharedProjects()
    ])
    const myProjects = myProjectsRes.data?.data || myProjectsRes.data || []
    const sharedProjects = sharedProjectsRes.data?.data || sharedProjectsRes.data || []
    availableProjects.value = [...myProjects, ...sharedProjects]
    
    // Set current project as selected if not already set
    if (!selectedProjectId.value && props.projectId) {
      selectedProjectId.value = props.projectId
    }
  } catch (error) {
    console.error('Error loading projects:', error)
  }
}

// Expose reload function
const reloadData = () => {
  loadData()
}

defineExpose({
  reloadData
})

onMounted(async () => {
  await loadProjects()
  await loadData()
})
</script>

<style scoped>
.project-data-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.back-button-container {
  padding: 12px;
  border-bottom: 1px solid #3e3e42;
}

.back-btn {
  width: 100%;
  padding: 8px 12px;
  background: #2d2d30;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  color: #cccccc;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.back-btn:hover {
  background: #3e3e42;
  border-color: #0e639c;
}

.back-btn .material-symbols-outlined {
  font-size: 18px;
}

.statistics {
  padding: 12px;
  border-bottom: 1px solid #3e3e42;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background: #2d2d30;
  border-radius: 4px;
}

.stat-label {
  font-size: 12px;
  color: #858585;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #0e639c;
}

.project-selector {
  padding: 12px;
  border-bottom: 1px solid #3e3e42;
  background: #2d2d30;
}

.selector-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #858585;
  font-weight: 500;
}

.selector-header .material-symbols-outlined {
  font-size: 18px;
}

.project-select {
  width: 100%;
  padding: 8px 12px;
  background: #3c3c3c;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  color: #cccccc;
  font-size: 13px;
  cursor: pointer;
}

.project-select:focus {
  outline: none;
  border-color: #0e639c;
}

.tree-search {
  padding: 12px;
  border-bottom: 1px solid #3e3e42;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 24px;
  color: #858585;
  font-size: 18px;
  pointer-events: none;
}

.search-input {
  padding-left: 40px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  background: #3c3c3c;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  color: #cccccc;
  font-size: 13px;
}

.search-input:focus {
  outline: none;
  border-color: #0e639c;
}

.tree-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.loading {
  padding: 20px;
  text-align: center;
  color: #858585;
}

.tree-actions {
  padding: 12px;
  border-top: 1px solid #3e3e42;
  position: relative;
}

.add-btn {
  width: 100%;
  padding: 8px;
  background: #0e639c;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.add-btn .material-symbols-outlined {
  font-size: 18px;
}

.add-btn:hover {
  background: #1177bb;
}

.add-menu {
  position: absolute;
  bottom: 100%;
  left: 12px;
  right: 12px;
  margin-bottom: 8px;
  background: #2d2d30;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.add-menu button {
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: #cccccc;
  text-align: left;
  cursor: pointer;
  border-radius: 2px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.add-menu button .material-symbols-outlined {
  font-size: 18px;
}

.add-menu button:hover {
  background: #3e3e42;
}
</style>
