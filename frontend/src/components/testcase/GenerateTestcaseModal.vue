<template>
  <div class="modal-overlay" @click.self="handleClose">
    <div class="modal-content large">
      <div class="modal-header">
        <h2>Generate Test Cases</h2>
        <button class="btn-close" @click="handleClose">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <!-- Requirements Selection -->
        <div class="selection-section">
          <h3 class="section-title">Select Requirements</h3>
          <p class="section-subtitle">Choose requirements to generate test cases from</p>

          <div class="selection-container">
            <div class="selection-header">
              <div class="selection-info">
                <span class="selected-count">{{ selectedRequirements.length }} selected</span>
                <span class="total-count">{{ filteredRequirements.length }} of {{ requirements.length }} total</span>
              </div>
              <div class="selection-actions">
                <button
                  class="btn btn-sm btn-secondary"
                  @click="selectAll"
                  :disabled="requirements.length === 0"
                >
                  Select All
                </button>
                <button class="btn btn-sm btn-secondary" @click="clearSelection">Clear All</button>
              </div>
            </div>

            <!-- Search Box -->
            <div class="search-box">
              <span class="material-symbols-outlined search-icon">search</span>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search requirements by name or goal..."
                class="search-input"
                @input="handleSearch"
              />
              <button
                v-if="searchQuery"
                class="clear-search-btn"
                @click="clearSearch"
                title="Clear search"
              >
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="selection-list">
              <div
                v-for="requirement in filteredRequirements"
                :key="getRequirementId(requirement)"
                class="selection-item"
                :class="{ selected: isRequirementSelected(requirement) }"
                @click="toggleRequirement(requirement)"
              >
                <input
                  type="checkbox"
                  :checked="isRequirementSelected(requirement)"
                  @change="toggleRequirement(requirement)"
                />
                <div class="item-content">
                  <h4 class="item-title">{{ requirement.name }}</h4>
                  <p class="item-description">{{ requirement.goal }}</p>
                </div>
              </div>

              <div v-if="requirements.length === 0" class="empty-selection">
                <span class="material-symbols-outlined">list_alt</span>
                <p>No requirements available for this version</p>
                <p class="empty-hint">Please create requirements first</p>
              </div>
              <div v-else-if="filteredRequirements.length === 0" class="empty-selection">
                <span class="material-symbols-outlined">search_off</span>
                <p>No requirements found matching "{{ searchQuery }}"</p>
                <p class="empty-hint">Try a different search term</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Configuration Options -->
        <div class="configuration-section">
          <h3 class="section-title">Generation Options</h3>

          <div class="configuration-grid">
            <div class="form-group">
              <label class="form-label">Test Type</label>
              <select v-model="configuration.testType" class="form-select">
                <option value="all">All Types</option>
                <!-- <option value="unit">Unit</option> -->
                <option value="integration">Integration</option>
                <option value="api">API</option>
                <option value="ui">UI</option>
                <option value="performance">Performance</option>
                <option value="security">Security</option>
              </select>
            </div>

            <!-- Language is automatically set from project settings -->

            <div class="form-group">
              <label class="form-label">Priority Level</label>
              <select v-model="configuration.priority" class="form-select">
                <option value="auto">Auto-detect</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        <!-- ✅ BỎ: Draft Management và Preview Section - không cần nữa vì save trực tiếp -->

        <!-- Actions -->
        <div class="action-section">
          <div class="action-buttons">
            <button class="btn btn-secondary" @click="handleClose" :disabled="generating">Cancel</button>

            <div class="primary-actions">
              <button
                class="btn btn-primary"
                @click="generateTestCases"
                :disabled="selectedRequirements.length === 0 || generating"
              >
                <span v-if="generating" class="spinner"></span>
                {{
                  generating
                    ? 'Generating & Saving...'
                    : `Generate & Save Test Cases (${selectedRequirements.length})`
                }}
              </button>
            </div>
          </div>
        </div>

        <!-- Loading Overlay -->
        <div v-if="generating" class="loading-overlay">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-text">
              <!-- Estimate Phase -->
              <div v-if="estimateInfo.isEstimating" class="progress-stage">
                <h4>
                  <span class="material-symbols-outlined stage-icon">calculate</span>
                  Estimating Test Cases...
                </h4>
                <p class="progress-info">Analyzing your requirements to determine the number of test cases...</p>
              </div>
              
              <!-- Estimate Received -->
              <div v-else-if="estimateInfo.estimated_count > 0 && batchProgress.currentBatch === 0" class="progress-stage">
                <h4>
                  <span class="material-symbols-outlined stage-icon success">check_circle</span>
                  Estimated {{ estimateInfo.estimated_count }} Test Cases
                </h4>
                <p v-if="estimateInfo.summary" class="progress-info">{{ estimateInfo.summary }}</p>
                <p class="progress-detail">Preparing to generate {{ estimateInfo.estimated_batches }} batch(es)...</p>
              </div>

              <!-- Generating Phase -->
              <div v-else-if="batchProgress.currentBatch > 0 && batchProgress.currentBatch <= batchProgress.totalBatches" class="progress-stage">
                <h4>
                  <span class="material-symbols-outlined stage-icon">auto_awesome</span>
                  <span v-if="batchProgress.testcasesInBatch === 0">
                    Generating Batch {{ batchProgress.currentBatch }}/{{ batchProgress.totalBatches }}
                  </span>
                  <span v-else>
                    Generated {{ batchProgress.testcasesInBatch }} Test Cases
                  </span>
                </h4>
                <p class="progress-info">
                  <span v-if="batchProgress.testcasesInBatch === 0">
                    Generating test cases for batch {{ batchProgress.currentBatch }}...
                  </span>
                  <span v-else>
                    Batch {{ batchProgress.currentBatch }}/{{ batchProgress.totalBatches }} completed
                  </span>
                </p>
                <div class="progress-bar-container">
                  <div class="progress-bar" :style="{ width: `${(batchProgress.currentBatch / (batchProgress.totalBatches || 1)) * 100}%` }"></div>
                </div>
                <p class="progress-detail">
                  {{ batchProgress.currentBatch }} of {{ batchProgress.totalBatches }} batches 
                  ({{ estimateInfo.estimated_count || batchProgress.totalCount }} total test cases)
                </p>
              </div>

              <!-- Saving Phase -->
              <div v-else-if="batchProgress.savedCount > 0 && batchProgress.savedCount < batchProgress.totalCount" class="progress-stage">
                <h4>
                  <span class="material-symbols-outlined stage-icon">save</span>
                  Saving {{ batchProgress.savedCount }}/{{ batchProgress.totalCount }} Test Cases
                </h4>
                <p class="progress-info">Saving generated test cases to database...</p>
                <div class="progress-bar-container">
                  <div class="progress-bar" :style="{ width: `${(batchProgress.savedCount / batchProgress.totalCount) * 100}%` }"></div>
                </div>
              </div>

              <!-- Completed Phase -->
              <div v-else-if="!generating && estimateInfo.estimated_count > 0" class="progress-stage completed">
                <h4>
                  <span class="material-symbols-outlined stage-icon success">check_circle</span>
                  Generation Completed!
                </h4>
                <p class="progress-info">Successfully generated and saved {{ estimateInfo.estimated_count }} test cases.</p>
              </div>

              <!-- Default Loading -->
              <div v-else class="progress-stage">
                <h4>Generating...</h4>
                <p class="progress-info">Processing your requirements...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ✅ BỎ: Custom Confirmation Modal - không cần nữa -->
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { testcaseApi } from '@/api/testcase'

export default {
  name: 'GenerateTestcaseModal',
  props: {
    projectId: String,
    versionId: String,
    project: {
      type: Object,
      default: null,
    },
    requirements: {
      type: Array,
      default: () => [],
    },
    databaseSchema: {
      type: Object,
      default: null,
    },
  },
  emits: ['close', 'generate'],
  setup(props, { emit }) {
    const toast = useToast()

    // State management
    const generating = ref(false)
    const selectedRequirements = ref([])
    const showConfirmModal = ref(false)
    const confirmMessage = ref('')
    const confirmedAction = ref(null)
    const generationProgress = ref(0)
    const confirmedCancelAction = ref(null)
    const searchQuery = ref('')
    
    // Estimate and Batch Progress (similar to InputSidebar)
    const estimateInfo = ref({
      estimated_count: 0,
      summary: '',
      estimated_batches: 0,
      isEstimating: false
    })
    
    const batchProgress = ref({
      currentBatch: 0,
      totalBatches: 0,
      testcasesInBatch: 0,
      savedCount: 0,
      totalCount: 0
    })

    // Configuration
    const configuration = ref({
      testType: 'all',
      language: 'vi-VN', // Will be set from project
      priority: 'auto',
    })
    
    // Set language from project when available
    watch(() => props.project, (newProject) => {
      if (newProject?.language) {
        configuration.value.language = newProject.language
      }
    }, { immediate: true })

    // ✅ BỎ: Draft management và computed properties không cần thiết

    // Helper: Get requirement ID (support both _id and id for backward compatibility)
    const getRequirementId = (req) => {
      if (!req) return ''
      return String(req._id || req.id || req.requirement_id || '')
    }

    // Filtered requirements based on search query
    const filteredRequirements = computed(() => {
      if (!searchQuery.value.trim()) {
        return props.requirements || []
      }

      const query = searchQuery.value.toLowerCase().trim()
      return (props.requirements || []).filter((req) => {
        const name = (req.name || '').toLowerCase()
        const goal = (req.goal || '').toLowerCase()
        const type = (req.type || '').toLowerCase()
        const priority = (req.priority || '').toLowerCase()
        
        return (
          name.includes(query) ||
          goal.includes(query) ||
          type.includes(query) ||
          priority.includes(query)
        )
      })
    })

    // Handle search input
    const handleSearch = () => {
      // Search is handled by computed property
    }

    // Clear search
    const clearSearch = () => {
      searchQuery.value = ''
    }

    // Check if requirement is selected
    const isRequirementSelected = (requirement) => {
      const reqId = getRequirementId(requirement)
      if (!reqId) return false
      return selectedRequirements.value.includes(reqId)
    }

    // Methods
    const selectAll = () => {
      // Select all filtered requirements (or all if no search)
      const requirementsToSelect = filteredRequirements.value.length > 0 
        ? filteredRequirements.value 
        : props.requirements
      
      const newSelectedIds = requirementsToSelect
        .map((req) => getRequirementId(req))
        .filter((id) => id && id !== '')
      
      // Merge with existing selections to avoid deselecting items not in current filter
      const existingIds = new Set(selectedRequirements.value)
      newSelectedIds.forEach(id => existingIds.add(id))
      selectedRequirements.value = Array.from(existingIds)
    }

    const clearSelection = () => {
      selectedRequirements.value = []
    }

    const toggleRequirement = (requirement) => {
      const reqId = getRequirementId(requirement)
      if (!reqId) {
        console.warn('⚠️ Cannot toggle requirement with no ID:', requirement)
        return
      }
      
      const index = selectedRequirements.value.indexOf(reqId)
      if (index > -1) {
        selectedRequirements.value.splice(index, 1)
      } else {
        selectedRequirements.value.push(reqId)
      }
    }

    const generateTestCases = async () => {
      if (selectedRequirements.value.length === 0) {
        toast.error('Please select at least one requirement')
        return
      }

      if (!props.projectId || !props.versionId) {
        toast.error('Project and version must be selected')
        return
      }

      generating.value = true
      generationProgress.value = 0
      
      // Reset estimate and batch progress
      estimateInfo.value = {
        estimated_count: 0,
        summary: '',
        estimated_batches: 0,
        isEstimating: true
      }
      batchProgress.value = {
        currentBatch: 0,
        totalBatches: 0,
        testcasesInBatch: 0,
        savedCount: 0,
        totalCount: 0
      }

      // Filter out null/undefined/empty values and validate
      const validRequirementIds = selectedRequirements.value
        .filter((id) => id != null && id !== '' && String(id).trim() !== '' && String(id).toLowerCase() !== 'null' && String(id).toLowerCase() !== 'undefined')

      if (validRequirementIds.length === 0) {
        toast.error('Please select at least one valid requirement')
        generating.value = false
        return
      }

      console.log('🔍 Starting test case generation with requirements:', {
        original: selectedRequirements.value,
        filtered: validRequirementIds,
        requirements: props.requirements.map(req => ({
          _id: req._id,
          id: req.id,
          requirement_id: req.requirement_id,
          name: req.name,
          computedId: getRequirementId(req)
        }))
      })

      // Simulate estimate phase (2-3 seconds)
      setTimeout(() => {
        if (generating.value) {
          // Simulate estimate result
          const estimatedCount = Math.max(10, validRequirementIds.length * 5)
          const estimatedBatches = Math.ceil(estimatedCount / 20)
          
          estimateInfo.value = {
            estimated_count: estimatedCount,
            summary: `Estimated ${estimatedCount} test cases from ${validRequirementIds.length} requirement(s)`,
            estimated_batches: estimatedBatches,
            isEstimating: false
          }
          
          batchProgress.value.totalBatches = estimatedBatches
          batchProgress.value.totalCount = estimatedCount
        }
      }, 2000)

      // Simulate batch progress
      let currentBatch = 0
      const batchInterval = setInterval(() => {
        if (!generating.value) {
          clearInterval(batchInterval)
          return
        }
        
        if (estimateInfo.value.isEstimating) {
          return // Wait for estimate
        }
        
        if (currentBatch < estimateInfo.value.estimated_batches) {
          currentBatch++
          batchProgress.value.currentBatch = currentBatch
          batchProgress.value.testcasesInBatch = 0
          
          // Simulate testcases in batch after a delay
          setTimeout(() => {
            if (generating.value && batchProgress.value.currentBatch === currentBatch) {
              const batchSize = currentBatch === estimateInfo.value.estimated_batches 
                ? estimateInfo.value.estimated_count - (currentBatch - 1) * 20
                : 20
              batchProgress.value.testcasesInBatch = batchSize
              batchProgress.value.savedCount = Math.min(
                currentBatch * 20,
                estimateInfo.value.estimated_count
              )
            }
          }, 1000)
        } else {
          clearInterval(batchInterval)
        }
      }, 3000)

      try {
        // ✅ MỚI: Gọi API generate - sẽ tự động estimate, chia batch, và save vào DB
        const response = await testcaseApi.generateTestCases(props.projectId, props.versionId, {
          selectedRequirementIds: validRequirementIds,
          language: configuration.value.language,
          testType: configuration.value.testType,
        })

        clearInterval(batchInterval)
        
        // Update with actual results
        const savedTestCases = response.data.data || response.data || []
        const savedCount = savedTestCases.length || 0
        
        // Update progress with actual saved count
        batchProgress.value.savedCount = savedCount
        batchProgress.value.totalCount = savedCount
        if (estimateInfo.value.estimated_count === 0) {
          estimateInfo.value.estimated_count = savedCount
          estimateInfo.value.estimated_batches = Math.ceil(savedCount / 20)
        }
        
        // Show completion briefly
        await new Promise(resolve => setTimeout(resolve, 1000))

        console.log('✅ Test case generation completed:', {
          savedCount,
          response: response.data
        })

        if (savedCount === 0) {
          toast.warning('No test cases were generated. Please try different requirements or options.')
        } else {
          toast.success(`Successfully generated and saved ${savedCount} test cases`)
          // ✅ Đóng modal và emit event để parent refresh test cases
          emit('generate', savedTestCases)
          handleClose()
        }
      } catch (error) {
        console.error('❌ Error generating test cases:', error)
        clearInterval(batchInterval)
        
        const { formatErrorForDisplay } = await import('@/utils/errorMessages')
        const errorMessage = formatErrorForDisplay(error, 'Không thể tạo test case. Vui lòng thử lại.')
        toast.error(errorMessage)
      } finally {
        generating.value = false
        generationProgress.value = 0
        // Reset after a brief delay to show completion
        setTimeout(() => {
          estimateInfo.value = {
            estimated_count: 0,
            summary: '',
            estimated_batches: 0,
            isEstimating: false
          }
          batchProgress.value = {
            currentBatch: 0,
            totalBatches: 0,
            testcasesInBatch: 0,
            savedCount: 0,
            totalCount: 0
          }
        }, 2000)
      }
    }

    // ✅ BỎ: Các methods không cần thiết nữa (showConfirmation, executeConfirmedAction, executeCancelAction, checkDraft)

    const handleClose = () => {
      // ✅ BỎ: Không cần check unsaved changes nữa vì save trực tiếp
      emit('close')
    }

    // Lifecycle
    onMounted(() => {
      // Auto-select all requirements if there are few
      if (props.requirements.length > 0 && props.requirements.length <= 10) {
        selectedRequirements.value = props.requirements
          .map((req) => getRequirementId(req))
          .filter((id) => id && id !== '')
      }

      // ✅ BỎ: Không check draft nữa
    })

    onUnmounted(() => {
      // Cleanup any intervals
      const intervals = []
      intervals.forEach((interval) => clearInterval(interval))
    })

    return {
      generating,
      selectedRequirements,
      configuration,
      generationProgress,
      searchQuery,
      filteredRequirements,
      estimateInfo,
      batchProgress,
      getRequirementId,
      isRequirementSelected,
      selectAll,
      clearSelection,
      toggleRequirement,
      handleSearch,
      clearSearch,
      generateTestCases,
      handleClose,
    }
  },
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content.large {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-content.medium {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.confirm-overlay {
  z-index: 1001;
}

.modal-header {
  padding: 1.75rem 2rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a365d;
  margin: 0;
  letter-spacing: -0.02em;
}

.btn-close {
  padding: 0.5rem;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: #f1f5f9;
  color: #1a365d;
  transform: scale(1.1);
}

.btn-close:active {
  transform: scale(0.95);
}

.modal-body {
  padding: 2rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a365d;
  margin-bottom: 0.5rem;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-title::before {
  content: '';
  width: 4px;
  height: 1.25rem;
  background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%);
  border-radius: 2px;
}

.section-subtitle {
  color: #64748b;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
}

.selection-section,
.configuration-section,
.preview-section {
  margin-bottom: 2rem;
}

.configuration-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

/* Draft Section */
.draft-section {
  margin-bottom: 2rem;
}

.draft-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
}

.draft-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.draft-info h4 {
  margin: 0 0 0.25rem 0;
  color: #856404;
}

.draft-info p {
  margin: 0;
  color: #856404;
  font-size: 0.875rem;
}

.draft-actions {
  display: flex;
  gap: 0.5rem;
}

/* Preview Header */
.preview-header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.preview-actions {
  display: flex;
  gap: 0.5rem;
}

.preview-container {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.preview-stats-bar {
  display: flex;
  gap: 2rem;
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.875rem;
}

.stat-item {
  display: flex;
  gap: 0.5rem;
}

.stat-label {
  color: #64748b;
  font-weight: 500;
}

.stat-value {
  color: #374151;
  font-weight: 600;
}

.preview-list {
  max-height: 400px;
  overflow-y: auto;
}

.preview-item {
  border-bottom: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.preview-item:last-child {
  border-bottom: none;
}

.preview-item:hover {
  background: #f8fafc;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.preview-main {
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preview-main:hover {
  background: #f1f5f9;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.preview-title {
  font-weight: 600;
  color: #1a365d;
  margin: 0;
  flex: 1;
  font-size: 1rem;
  line-height: 1.4;
}

.preview-badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.expand-icon {
  color: #64748b;
  font-size: 1.25rem;
  transition: transform 0.2s ease;
}

.preview-main:hover .expand-icon {
  color: #1a365d;
  transform: scale(1.1);
}

.preview-meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.table-info,
.requirement-info {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #64748b;
}

/* Detail Section */
.preview-detail {
  padding: 0 1.5rem 1.5rem 1.5rem;
  background: #fafbfc;
  border-top: 1px solid #e2e8f0;
}

.detail-section {
  margin-bottom: 1.5rem;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section h5 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.75rem 0;
}

.detail-section p {
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
}

.detail-section ul {
  margin: 0;
  padding-left: 1.5rem;
  color: #64748b;
  font-size: 0.875rem;
}

.detail-section li {
  margin-bottom: 0.25rem;
  line-height: 1.4;
}

/* Steps List */
.steps-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.step-item {
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.step-number {
  width: 2rem;
  height: 2rem;
  background: #1a365d;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-action {
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.step-expected {
  color: #64748b;
  font-size: 0.75rem;
  font-style: italic;
}

/* Expected Results */
.expected-results {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.expected-results > div {
  padding: 0.75rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.expected-results strong {
  color: #374151;
  font-size: 0.875rem;
}

.expected-results ul {
  margin: 0.5rem 0 0 0;
}

/* Selection styles (keep existing) */
.selection-container {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s ease;
}

.selection-container:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
}

.selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border-bottom: 1px solid #e2e8f0;
}

.selected-count {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.total-count {
  color: #64748b;
  font-size: 0.875rem;
  margin-left: 0.5rem;
}

.selection-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
}

/* Search Box */
.search-box {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.search-box:focus-within {
  background: #f8fafc;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
}

.search-icon {
  position: absolute;
  left: 1.25rem;
  color: #9ca3af;
  font-size: 1.25rem;
  pointer-events: none;
  transition: color 0.2s ease;
}

.search-box:focus-within .search-icon {
  color: #1a365d;
}

.search-input {
  width: 100%;
  padding: 0.625rem 2.5rem 0.625rem 2.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #374151;
  background: #f8fafc;
  transition: all 0.2s ease;
}

.search-input::placeholder {
  color: #9ca3af;
}

.search-input:focus {
  outline: none;
  border-color: #1a365d;
  background: white;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

.clear-search-btn {
  position: absolute;
  right: 1.25rem;
  padding: 0.25rem;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.clear-search-btn:hover {
  background: #f1f5f9;
  color: #1a365d;
}

.clear-search-btn .material-symbols-outlined {
  font-size: 1.125rem;
}

.selection-list {
  max-height: 300px;
  overflow-y: auto;
}

.selection-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.selection-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%);
  transition: width 0.2s ease;
}

.selection-item:hover {
  background: #f8fafc;
  transform: translateX(2px);
}

.selection-item:hover::before {
  width: 3px;
}

.selection-item.selected {
  background: linear-gradient(90deg, #eff6ff 0%, #f0f9ff 100%);
  border-left: 3px solid #1a365d;
}

.selection-item.selected::before {
  width: 3px;
}

.selection-item.selected:hover {
  background: linear-gradient(90deg, #dbeafe 0%, #e0f2fe 100%);
}

.selection-item:last-child {
  border-bottom: none;
}

.selection-item input[type="checkbox"] {
  width: 20px;
  height: 20px;
  margin-top: 2px;
  cursor: pointer;
  accent-color: #1a365d;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.selection-item input[type="checkbox"]:hover {
  transform: scale(1.1);
}

.selection-item input[type="checkbox"]:checked {
  transform: scale(1.05);
}

.item-content {
  flex: 1;
}

.item-title {
  font-weight: 600;
  color: #1a365d;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  line-height: 1.4;
  transition: color 0.2s ease;
}

.selection-item:hover .item-title {
  color: #1a365d;
}

.item-description {
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.meta-tag {
  padding: 0.375rem 0.75rem;
  background: #e2e8f0;
  color: #475569;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.meta-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.meta-tag.priority.critical {
  background: #fee2e2;
  color: #dc2626;
}

.meta-tag.priority.high {
  background: #fed7aa;
  color: #ea580c;
}

.meta-tag.priority.medium {
  background: #fef3c7;
  color: #d97706;
}

.meta-tag.priority.low {
  background: #d1fae5;
  color: #059669;
}

.empty-selection {
  text-align: center;
  padding: 3rem 2rem;
  color: #64748b;
}

.empty-selection .material-symbols-outlined {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
  color: #94a3b8;
}

.empty-hint {
  font-size: 0.875rem;
  color: #94a3b8;
  margin-top: 0.5rem;
}

.empty-hint {
  font-size: 0.875rem;
  color: #94a3b8;
  margin-top: 0.5rem;
}

/* Form styles */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.form-select {
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  transition: all 0.2s ease;
  cursor: pointer;
}

.form-select:hover {
  border-color: #9ca3af;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.form-select:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

/* Action Section */
.action-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e2e8f0;
}

.action-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.primary-actions {
  display: flex;
  gap: 1rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  font-size: 0.875rem;
}

.btn-primary {
  background: #1a365d;
  border-color: #1a365d;
  color: white;
  box-shadow: 0 2px 4px rgba(26, 54, 93, 0.2);
}

.btn-primary:hover:not(:disabled) {
  background: #1f3b62;
  border-color: #1f3b62;
  box-shadow: 0 4px 8px rgba(26, 54, 93, 0.3);
  transform: translateY(-1px);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(26, 54, 93, 0.2);
}

.btn-primary:disabled {
  background: #9ca3af;
  border-color: #9ca3af;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-secondary {
  background: white;
  border-color: #d1d5db;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3b8;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.btn-secondary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-secondary:disabled {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
}

/* Loading */
.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner.large {
  justify-self: center;
  width: 3rem;
  height: 3rem;
  border-width: 3px;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  animation: fadeIn 0.2s ease-out;
}

.loading-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 500px;
  padding: 2rem;
  text-align: left;
}

.loading-content h3 {
  color: #1a365d;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.loading-content p {
  color: #64748b;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(26, 54, 93, 0.3);
  border-top: 2px solid #1a365d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  flex-shrink: 0;
  margin: 0 auto 1rem;
}

.loading-text {
  flex: 1;
  text-align: left;
}

.loading-text h4 {
  margin: 0 0 6px 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a365d;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stage-icon {
  font-size: 18px;
  opacity: 0.9;
  color: #1a365d;
}

.stage-icon.success {
  color: #10b981;
}

.progress-info {
  margin: 4px 0;
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.5;
}

.progress-detail {
  margin: 6px 0 0 0;
  color: #94a3b8;
  font-size: 0.75rem;
}

.progress-bar-container {
  width: 100%;
  height: 4px;
  background: rgba(26, 54, 93, 0.1);
  border-radius: 2px;
  margin: 8px 0;
  overflow: hidden;
}

.progress-bar-container .progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #1a365d 0%, #2d4a7c 100%);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-stage {
  width: 100%;
}

.progress-stage.completed h4 {
  color: #10b981;
}

.generation-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-bar {
  width: 100%;
  height: 10px;
  background: #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1a365d 0%, #2d4a7c 100%);
  transition: width 0.3s ease;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(26, 54, 93, 0.3);
}

.progress-text {
  font-size: 0.875rem;
  color: #1a365d;
  font-weight: 600;
}

/* Badges */
.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.badge.type.unit {
  background: #dbeafe;
  color: #203c63;
}

.badge.type.integration {
  background: #d1fae5;
  color: #059669;
}

.badge.type.api {
  background: #f3e8ff;
  color: #7c3aed;
}

.badge.type.ui {
  background: #fef3c7;
  color: #d97706;
}

.badge.type.performance {
  background: #fce7f3;
  color: #be185d;
}

.badge.type.security {
  background: #dcfce7;
  color: #166534;
}

.badge.priority.critical {
  background: #fee2e2;
  color: #dc2626;
}

.badge.priority.high {
  background: #fed7aa;
  color: #ea580c;
}

.badge.priority.medium {
  background: #fef3c7;
  color: #d97706;
}

.badge.priority.low {
  background: #d1fae5;
  color: #059669;
}

/* Confirm Actions */
.confirm-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

/* Responsive */
@media (max-width: 768px) {
  .modal-content.large {
    margin: 1rem;
    max-height: calc(100vh - 2rem);
  }

  .modal-body {
    padding: 1rem;
  }

  .configuration-grid {
    grid-template-columns: 1fr;
  }

  .preview-header-section {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .preview-actions {
    justify-content: center;
  }

  .preview-stats-bar {
    flex-direction: column;
    gap: 0.75rem;
  }

  .action-buttons {
    flex-direction: column;
    gap: 1rem;
  }

  .primary-actions {
    width: 100%;
    flex-direction: column;
  }

  .primary-actions .btn {
    width: 100%;
    justify-content: center;
  }

  .selection-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .selection-actions {
    justify-content: center;
  }

  .draft-banner {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .draft-info {
    flex-direction: column;
    text-align: center;
  }

  .preview-header {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .preview-badges {
    align-self: flex-end;
  }
}
</style>