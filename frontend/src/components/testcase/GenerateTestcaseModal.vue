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
                <span class="total-count">{{ requirements.length }} total</span>
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

            <div class="selection-list">
              <div
                v-for="requirement in requirements"
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
                  <div class="item-meta">
                    <span class="meta-tag type">{{ requirement.type || 'Functional' }}</span>
                    <span
                      v-if="requirement.priority"
                      class="meta-tag priority"
                      :class="requirement.priority"
                    >
                      {{ requirement.priority }}
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="requirements.length === 0" class="empty-selection">
                <span class="material-symbols-outlined">list_alt</span>
                <p>No requirements available for this version</p>
                <p class="empty-hint">Please create requirements first</p>
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

        <!-- Draft Management -->
        <div v-if="hasDraft" class="draft-section">
          <div class="draft-banner">
            <div class="draft-info">
              <span class="material-symbols-outlined">draft</span>
              <div>
                <h4>Draft Found</h4>
                <p>You have unsaved test cases from your previous session</p>
              </div>
            </div>
            <div class="draft-actions">
              <button class="btn btn-secondary" @click="restoreDraft">Restore Draft</button>
              <button class="btn btn-secondary" @click="discardDraft">Discard</button>
            </div>
          </div>
        </div>

        <!-- Preview Section -->
        <div v-if="previewTestCases.length > 0" class="preview-section">
          <div class="preview-header-section">
            <h3 class="section-title">Preview ({{ previewTestCases.length }} test cases)</h3>
            <div class="preview-actions">
              <button class="btn btn-sm btn-secondary" @click="toggleAllDetails">
                <span class="material-symbols-outlined">
                  {{ showAllDetails ? 'visibility_off' : 'visibility' }}
                </span>
                {{ showAllDetails ? 'Hide All' : 'Show All' }}
              </button>
              <button class="btn btn-sm btn-secondary" @click="saveDraft">
                <span class="material-symbols-outlined">save</span>
                {{ savingDraft ? 'Saving...' : hasUnsavedChanges ? 'Save Draft' : 'Draft Saved' }}
              </button>
            </div>
          </div>

          <div class="preview-container">
            <div class="preview-stats-bar">
              <div class="stat-item">
                <span class="stat-label">Test Types:</span>
                <span class="stat-value">{{ testTypeDistribution }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Tables Covered:</span>
                <span class="stat-value">{{ coverageStats.tablesCovered }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Requirements Covered:</span>
                <span class="stat-value">{{ coverageStats.requirementsCovered }}</span>
              </div>
            </div>

            <div class="preview-list">
              <div v-for="(testcase, index) in previewTestCases" :key="index" class="preview-item">
                <div class="preview-main" @click="toggleDetail(index)">
                  <div class="preview-header">
                    <h4 class="preview-title">{{ formatTestCaseTitle(testcase) }}</h4>
                    <div class="preview-badges">
                      <span class="badge type" :class="testcase.test_type">
                        {{ testcase.test_type }}
                      </span>
                      <span class="badge priority" :class="testcase.priority">
                        {{ testcase.priority }}
                      </span>
                      <span class="material-symbols-outlined expand-icon">
                        {{ expandedDetails.includes(index) ? 'expand_less' : 'expand_more' }}
                      </span>
                    </div>
                  </div>

                  <div class="preview-meta">
                    <span
                      v-if="testcase.database_tables && testcase.database_tables.length > 0"
                      class="table-info"
                    >
                      <span class="material-symbols-outlined">table</span>
                      {{ testcase.database_tables.join(', ') }}
                    </span>
                    <span v-if="testcase.source_requirement_ids" class="requirement-info">
                      <span class="material-symbols-outlined">label</span>
                      {{ testcase.source_requirement_ids.join(', ') }}
                    </span>
                  </div>
                </div>

                <!-- Collapsible Detail Section -->
                <div v-if="expandedDetails.includes(index)" class="preview-detail">
                  <div class="detail-section">
                    <h5>Description</h5>
                    <p>{{ testcase.description || 'No description provided' }}</p>
                  </div>

                  <div
                    v-if="testcase.objectives && testcase.objectives.length > 0"
                    class="detail-section"
                  >
                    <h5>Objectives</h5>
                    <ul>
                      <li v-for="(objective, objIndex) in testcase.objectives" :key="objIndex">
                        {{ objective }}
                      </li>
                    </ul>
                  </div>

                  <div v-if="testcase.steps && testcase.steps.length > 0" class="detail-section">
                    <h5>Test Steps ({{ testcase.steps.length }})</h5>
                    <div class="steps-list">
                      <div
                        v-for="(step, stepIndex) in testcase.steps"
                        :key="stepIndex"
                        class="step-item"
                      >
                        <div class="step-number">{{ step.step_number }}</div>
                        <div class="step-content">
                          <div class="step-action">{{ step.action }}</div>
                          <div v-if="step.expected_immediate_result" class="step-expected">
                            Expected: {{ step.expected_immediate_result }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="testcase.expected_results" class="detail-section">
                    <h5>Expected Results</h5>
                    <div class="expected-results">
                      <div
                        v-if="
                          testcase.expected_results.ui_level &&
                          testcase.expected_results.ui_level.length > 0
                        "
                      >
                        <strong>UI Level:</strong>
                        <ul>
                          <li
                            v-for="(uiResult, uiIndex) in testcase.expected_results.ui_level"
                            :key="uiIndex"
                          >
                            {{ uiResult }}
                          </li>
                        </ul>
                      </div>
                      <div
                        v-if="
                          testcase.expected_results.api_level &&
                          testcase.expected_results.api_level.status_code
                        "
                      >
                        <strong>API Level:</strong> Status
                        {{ testcase.expected_results.api_level.status_code }}
                      </div>
                      <div v-if="testcase.expected_results.business_level">
                        <strong>Business Level:</strong>
                        {{ testcase.expected_results.business_level }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="action-section">
          <div class="action-buttons">
            <button class="btn btn-secondary" @click="handleClose">Cancel</button>

            <div class="primary-actions">
              <button
                v-if="previewTestCases.length === 0"
                class="btn btn-primary"
                @click="generateTestCases"
                :disabled="selectedRequirements.length === 0 || generating"
              >
                <span v-if="generating" class="spinner"></span>
                {{
                  generating
                    ? 'Generating...'
                    : `Generate Test Cases (${selectedRequirements.length})`
                }}
              </button>

              <button
                v-else
                class="btn btn-primary"
                @click.once="confirmGeneration"
                :disabled="generating || saving"
              >
                <span v-if="saving" class="spinner"></span>
                {{ saving ? 'Saving...' : `Create ${previewTestCases.length} Test Cases` }}
              </button>

              <button
                v-if="previewTestCases.length > 0"
                class="btn btn-secondary"
                @click="regenerate"
                :disabled="generating"
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>

        <!-- Loading Overlay -->
        <div v-if="generating" class="loading-overlay">
          <div class="loading-content">
            <div class="spinner large"></div>
            <h3>Generating Test Cases</h3>
            <p>AI is creating comprehensive test cases based on your selection...</p>
            <div class="generation-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${generationProgress}%` }"></div>
              </div>
              <span class="progress-text">{{ generationProgress }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Confirmation Modal -->
    <div v-if="showConfirmModal" class="modal-overlay confirm-overlay">
      <div class="modal-content medium">
        <div class="modal-header">
          <h3>Confirm Action</h3>
          <button class="btn-close" @click="showConfirmModal = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <p>{{ confirmMessage }}</p>
          <div class="confirm-actions">
            <!-- ĐÚNG -->
            <button
              class="btn btn-secondary"
              @click="executeCancelAction ? executeCancelAction() : (showConfirmModal = false)"
            >
              {{ confirmedCancelAction ? "Don't Save" : 'Cancel' }}
            </button>
            <button class="btn btn-primary" @click="executeConfirmedAction">
              {{ confirmedCancelAction ? 'Save Draft' : 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    </div>
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
    const saving = ref(false)
    const savingDraft = ref(false)
    const selectedRequirements = ref([])
    const previewTestCases = ref([])
    const expandedDetails = ref([])
    const showAllDetails = ref(false)
    const showConfirmModal = ref(false)
    const confirmMessage = ref('')
    const confirmedAction = ref(null)
    const generationProgress = ref(0)
    const hasUnsavedChanges = ref(false)
    const confirmedCancelAction = ref(null)
    const hasDraft = ref(false)

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

    // Draft management
    const draftKey = computed(() => `testcase_draft_${props.projectId}_${props.versionId}`)

    // Computed properties
    const coverageStats = computed(() => {
      const tablesCovered = new Set()
      const requirementsCovered = new Set()

      previewTestCases.value.forEach((tc) => {
        if (tc.database_tables) {
          tc.database_tables.forEach((table) => tablesCovered.add(table))
        }
        if (tc.source_requirement_ids) {
          tc.source_requirement_ids.forEach((reqId) => requirementsCovered.add(reqId))
        }
      })

      return {
        tablesCovered: tablesCovered.size,
        requirementsCovered: requirementsCovered.size,
      }
    })

    const testTypeDistribution = computed(() => {
      const distribution = {}
      previewTestCases.value.forEach((tc) => {
        const type = tc.test_type || 'unknown'
        distribution[type] = (distribution[type] || 0) + 1
      })

      return Object.entries(distribution)
        .map(([type, count]) => `${type} (${count})`)
        .join(', ')
    })

    // Helper: Get requirement ID (support both _id and id for backward compatibility)
    const getRequirementId = (req) => {
      if (!req) return ''
      return String(req._id || req.id || req.requirement_id || '')
    }

    // Check if requirement is selected
    const isRequirementSelected = (requirement) => {
      const reqId = getRequirementId(requirement)
      if (!reqId) return false
      return selectedRequirements.value.includes(reqId)
    }

    // Methods
    const selectAll = () => {
      selectedRequirements.value = props.requirements
        .map((req) => getRequirementId(req))
        .filter((id) => id && id !== '')
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
      if (previewTestCases.value.length > 0) {
        hasUnsavedChanges.value = true
      }
    }

    // THAY THẾ - Chỉ watch previewTestCases với logic đơn giản
    watch(
      () => previewTestCases.value,
      (newTestCases, oldTestCases) => {
        // Chỉ set hasUnsavedChanges = true khi có test cases mới được generate
        // và không phải đang restore từ draft
        if (newTestCases.length > 0 && newTestCases !== oldTestCases) {
          hasUnsavedChanges.value = true
        }
      },
      { deep: true }
    )

    const toggleDetail = (index) => {
      const detailIndex = expandedDetails.value.indexOf(index)
      if (detailIndex > -1) {
        expandedDetails.value.splice(detailIndex, 1)
      } else {
        expandedDetails.value.push(index)
      }
    }

    const toggleAllDetails = () => {
      if (showAllDetails.value) {
        expandedDetails.value = []
      } else {
        expandedDetails.value = previewTestCases.value.map((_, index) => index)
      }
      showAllDetails.value = !showAllDetails.value
    }

    const formatTestCaseTitle = (testcase) => {
      const requirementIds = testcase.source_requirement_ids || []
      if (requirementIds.length === 0) {
        return testcase.title || 'Untitled Test Case'
      }

      const firstReqId = requirementIds[0]
      const requirement = props.requirements.find((req) => {
        const reqId = getRequirementId(req)
        return reqId === String(firstReqId) || reqId === firstReqId
      })
      const requirementName = requirement?.name || 'Unknown Requirement'
      const baseTitle = testcase.title || 'Test Scenario'

      return `[${firstReqId}] - ${requirementName} - ${baseTitle}`
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
      previewTestCases.value = []

      // Filter out null/undefined/empty values and validate
      const validRequirementIds = selectedRequirements.value
        .filter((id) => id != null && id !== '' && String(id).trim() !== '' && String(id).toLowerCase() !== 'null' && String(id).toLowerCase() !== 'undefined')

      if (validRequirementIds.length === 0) {
        toast.error('Please select at least one valid requirement')
        return
      }

      // ✅ DEBUG: Log before generation
      console.log('🔍 DEBUG - Starting generation with requirements:', {
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

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        if (generationProgress.value < 90) {
          generationProgress.value += 10
        }
      }, 500)

      try {
        const response = await testcaseApi.generateTestCases(props.projectId, props.versionId, {
          selectedRequirementIds: validRequirementIds,
          language: configuration.value.language,
          testType: configuration.value.testType,
        })

        clearInterval(progressInterval)
        generationProgress.value = 100

        // ✅ DEBUG: Log the API response
        console.log('🔍 DEBUG - Generation API response:', response)
        console.log('🔍 DEBUG - Raw response data:', response.data)

        const generatedTestCases = response.data.data || response.data || []
        console.log('🔍 DEBUG - Generated test cases count:', generatedTestCases.length)
        console.log(
          '🔍 DEBUG - Generated test cases:',
          JSON.parse(JSON.stringify(generatedTestCases))
        )

        previewTestCases.value = generatedTestCases
        hasUnsavedChanges.value = true

        if (previewTestCases.value.length === 0) {
          toast.warning(
            'No test cases were generated. Please try different requirements or options.'
          )
        } else {
          toast.success(`Generated ${previewTestCases.value.length} test cases`)
          // Auto-expand first item
          if (previewTestCases.value.length > 0) {
            expandedDetails.value = [0]
          }
        }
      } catch (error) {
        console.error('❌ DEBUG - Error generating test cases:', error)
        console.error('❌ DEBUG - Error response:', error.response)
        clearInterval(progressInterval)
        
        // Sử dụng formatErrorForDisplay để hiển thị lỗi thân thiện
        const { formatErrorForDisplay } = await import('@/utils/errorMessages')
        const errorMessage = formatErrorForDisplay(error, 'Không thể tạo test case. Vui lòng thử lại.')

        toast.error(errorMessage)

        previewTestCases.value = []
        hasUnsavedChanges.value = false
      } finally {
        generating.value = false
        generationProgress.value = 0
      }
    }

    const regenerate = () => {
      previewTestCases.value = []
      expandedDetails.value = []
      showAllDetails.value = false
      hasUnsavedChanges.value = false
    }

    const saveDraft = async () => {
      if (previewTestCases.value.length === 0) {
        toast.error('No test cases to save as draft')
        return
      }

      savingDraft.value = true
      try {
        const draftData = {
          testCases: previewTestCases.value,
          configuration: configuration.value,
          selectedRequirements: selectedRequirements.value,
          timestamp: new Date().toISOString(),
        }

        localStorage.setItem(draftKey.value, JSON.stringify(draftData))
        hasUnsavedChanges.value = false
        hasDraft.value = true // ← Thêm dòng này
        toast.success('Draft saved successfully')
      } catch (error) {
        console.error('Error saving draft:', error)
        toast.error('Failed to save draft')
      } finally {
        savingDraft.value = false
      }
    }

    const restoreDraft = () => {
      try {
        const draft = localStorage.getItem(draftKey.value)
        if (draft) {
          const draftData = JSON.parse(draft)
          previewTestCases.value = draftData.testCases || []
          configuration.value = draftData.configuration || configuration.value
          selectedRequirements.value = draftData.selectedRequirements || []
          hasUnsavedChanges.value = false
          hasDraft.value = true // ← Thêm dòng này
          toast.success('Draft restored successfully')
        }
      } catch (error) {
        console.error('Error restoring draft:', error)
        toast.error('Failed to restore draft')
      }
    }

    const discardDraft = () => {
      showConfirmation(
        'Are you sure you want to discard the saved draft? This action cannot be undone.',
        () => {
          localStorage.removeItem(draftKey.value)
          hasUnsavedChanges.value = false
          hasDraft.value = false // ← Cập nhật state

          // Clear preview nếu đang hiển thị draft
          if (previewTestCases.value.length > 0) {
            previewTestCases.value = []
            expandedDetails.value = []
            showAllDetails.value = false
          }

          toast.success('Draft discarded')
        }
      )
    }

    const confirmGeneration = () => {
      // ✅ THÊM: Double click prevention
      if (saving.value) {
        console.log('⚠️ confirmGeneration blocked - already saving')
        return
      }

      console.log('🔍 DEBUG - confirmGeneration called')
      showConfirmation(`Are you sure you want to create this test cases?`, executeGeneration)
    }

    const executeGeneration = async () => {
      console.log('🔍 DEBUG - executeGeneration CALLED - Check if this logs twice')

      // ✅ THÊM: Double execution prevention
      if (saving.value) {
        console.log('⚠️ BLOCKED: Already saving, ignoring duplicate call')
        return
      }

      if (previewTestCases.value.length === 0) {
        toast.error('No test cases to save')
        return
      }

      saving.value = true
      console.log('🔍 DEBUG - Setting saving = true')

      try {
        console.log('🔍 DEBUG - Calling saveTestCases API...')

        const requestBody = {
          testCases: previewTestCases.value,
        }

        const response = await testcaseApi.saveTestCases(
          props.projectId,
          props.versionId,
          requestBody
        )

        console.log('🔍 DEBUG - saveTestCases API response received')
        console.log('Response count:', response.data?.count)

        const savedCount = response.data?.count || previewTestCases.value.length

        // Clear draft và reset unsaved changes
        localStorage.removeItem(draftKey.value)
        hasUnsavedChanges.value = false
        hasDraft.value = false

        console.log('✅ DEBUG - Successfully saved:', savedCount, 'test cases')

        toast.success(`Successfully created ${savedCount} test cases`)
        emit('generate', response.data?.data || previewTestCases.value)
        handleClose()
      } catch (error) {
        console.error('❌ DEBUG - Error in executeGeneration:', error)
        const { formatErrorForDisplay } = await import('@/utils/errorMessages')
        const errorMessage = formatErrorForDisplay(error, 'Không thể lưu test case. Vui lòng thử lại.')
        toast.error(errorMessage)
      } finally {
        saving.value = false
        console.log('🔍 DEBUG - Setting saving = false')
      }
    }
    const showConfirmation = (message, confirmAction, cancelAction = null) => {
      confirmMessage.value = message
      confirmedAction.value = confirmAction
      confirmedCancelAction.value = cancelAction
      showConfirmModal.value = true
    }

    const executeConfirmedAction = () => {
      if (confirmedAction.value) {
        confirmedAction.value()
      }
      showConfirmModal.value = false
      confirmedAction.value = null
      confirmedCancelAction.value = null
    }

    // Thêm method mới cho cancel action
    const executeCancelAction = () => {
      if (confirmedCancelAction.value) {
        confirmedCancelAction.value()
      }
      showConfirmModal.value = false
      confirmedAction.value = null
      confirmedCancelAction.value = null
    }

    const checkDraft = () => {
      try {
        const draft = localStorage.getItem(draftKey.value)
        if (!draft) {
          hasDraft.value = false
          return false
        }

        const draftData = JSON.parse(draft)
        hasDraft.value = draftData.testCases && draftData.testCases.length > 0
        return hasDraft.value
      } catch (error) {
        console.error('Error checking draft:', error)
        hasDraft.value = false
        return false
      }
    }

    const handleClose = () => {
      if (hasUnsavedChanges.value && previewTestCases.value.length > 0) {
        showConfirmation(
          'You have unsaved test cases. Do you want to save them as draft before closing?',
          () => {
            saveDraft().finally(() => {
              emit('close')
            })
          },
          () => {
            // Thêm dòng này
            emit('close')
          }
        )
      } else {
        emit('close')
      }
    }

    // Lifecycle
    onMounted(() => {
      // Auto-select all requirements if there are few
      if (props.requirements.length > 0 && props.requirements.length <= 10) {
        selectedRequirements.value = props.requirements
          .map((req) => getRequirementId(req))
          .filter((id) => id && id !== '')
      }

      // Check for existing draft - SỬA THÀNH checkDraft()
      if (checkDraft()) {
        toast.info('Draft found for this project')
      }
    })

    onUnmounted(() => {
      // Cleanup any intervals
      const intervals = []
      intervals.forEach((interval) => clearInterval(interval))
    })

    return {
      generating,
      saving,
      savingDraft,
      selectedRequirements,
      previewTestCases,
      expandedDetails,
      showAllDetails,
      showConfirmModal,
      confirmMessage,
      configuration,
      coverageStats,
      testTypeDistribution,
      generationProgress,
      hasDraft,
      getRequirementId,
      isRequirementSelected,
      selectAll,
      clearSelection,
      toggleRequirement,
      toggleDetail,
      toggleAllDetails,
      formatTestCaseTitle,
      generateTestCases,
      regenerate,
      saveDraft,
      restoreDraft,
      discardDraft,
      confirmGeneration,
      executeConfirmedAction,
      handleClose,
      checkDraft,
      executeCancelAction,
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
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content.large {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
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
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
  position: sticky;
  top: 0;
  z-index: 10;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.btn-close {
  padding: 0.5rem;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  background: #e2e8f0;
  color: #475569;
}

.modal-body {
  padding: 2rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.section-subtitle {
  color: #64748b;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
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
  transition: background-color 0.2s;
}

.preview-item:last-child {
  border-bottom: none;
}

.preview-item:hover {
  background: #f8fafc;
}

.preview-main {
  padding: 1.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
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
  color: #1e293b;
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
  transition: transform 0.2s;
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
  border-radius: 8px;
  overflow: hidden;
}

.selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #f8fafc;
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

.selection-list {
  max-height: 300px;
  overflow-y: auto;
}

.selection-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.2s;
}

.selection-item:hover {
  background: #f8fafc;
}

.selection-item.selected {
  background: #eff6ff;
  border-left: 3px solid #1a365d;
}

.selection-item:last-child {
  border-bottom: none;
}

.item-content {
  flex: 1;
}

.item-title {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.item-description {
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.4;
  margin-bottom: 0.75rem;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.meta-tag {
  padding: 0.25rem 0.5rem;
  background: #e2e8f0;
  color: #475569;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
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
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  transition: all 0.2s;
}

.form-select:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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
}

.btn-primary:hover:not(:disabled) {
  background: #1f3b62;
  border-color: #1f3b62;
}

.btn-primary:disabled {
  background: #9ca3af;
  border-color: #9ca3af;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  border-color: #d1d5db;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3b8;
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
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.loading-content {
  text-align: center;
  max-width: 400px;
  padding: 2rem;
}

.loading-content h3 {
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.loading-content p {
  color: #64748b;
  margin-bottom: 1.5rem;
}

.generation-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #1a365d;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.875rem;
  color: #64748b;
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