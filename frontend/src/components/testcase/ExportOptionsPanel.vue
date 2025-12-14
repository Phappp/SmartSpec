<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="export-modal">
      <div class="modal-header">
        <h3>Export Test Cases</h3>
        <button class="btn-icon close-btn" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-content">
        <div class="export-description">
          <p>Configure export: create sheets, assign test cases, and select fields</p>
        </div>

        <!-- Field Selection -->
        <div class="export-options">
          <div class="option-group">
            <label class="option-label">Select Fields to Export</label>
            <div class="fields-grid">
              <label
                v-for="field in availableFields"
                :key="field.key"
                class="field-option"
              >
                <input
                  type="checkbox"
                  :value="field.key"
                  v-model="selectedFields"
                />
                
                <span class="field-label">{{ field.label }}</span>
              </label>
            </div>
            <div class="field-actions">
              <button class="btn-text-small" @click="selectAllFields">Select All</button>
              <button class="btn-text-small" @click="deselectAllFields">Deselect All</button>
            </div>
          </div>

          <!-- Sheets Management -->
          <div class="option-group">
            <div class="sheets-header">
              <label class="option-label">Sheets Configuration</label>
              <button class="btn-add-sheet" @click="addSheet">
                <span class="material-symbols-outlined">add</span>
                Add Sheet
              </button>
            </div>
            <div v-if="sheets.length === 0" class="empty-sheets">
              <span class="material-symbols-outlined">info</span>
              <p>No sheets configured. Add a sheet to start organizing your export.</p>
            </div>
            <div v-else class="sheets-list">
              <div
                v-for="(sheet, index) in sheets"
                :key="sheet.id"
                class="sheet-item"
              >
                <div class="sheet-header">
                  <div class="sheet-info">
                    <input
                      v-model="sheet.name"
                      type="text"
                      class="sheet-name-input"
                      placeholder="Sheet name..."
                      @blur="validateSheetName(index)"
                    />
                    <span class="sheet-testcase-count">
                      {{ sheet.testCaseIds.length }} test case(s)
                    </span>
                  </div>
                  <div class="sheet-actions">
                    <button
                      class="btn-icon-small"
                      @click="openSheetTestcaseSelector(index)"
                      title="Select Test Cases"
                    >
                      <span class="material-symbols-outlined">playlist_add</span>
                    </button>
                    <button
                      class="btn-icon-small danger"
                      @click="removeSheet(index)"
                      title="Remove Sheet"
                      :disabled="sheets.length === 1"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
                <div v-if="sheet.testCaseIds.length > 0" class="sheet-testcases-preview">
                  <div
                    v-for="testcaseId in sheet.testCaseIds.slice(0, 3)"
                    :key="testcaseId"
                    class="preview-item"
                  >
                    {{ getTestCaseName(testcaseId) }}
                  </div>
                  <span v-if="sheet.testCaseIds.length > 3" class="preview-more">
                    +{{ sheet.testCaseIds.length - 3 }} more
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="option-group">
            <label class="option-label">Export Format</label>
            <div class="option-cards">
              <div class="option-card active">
                <div class="option-icon">
                  <span class="material-symbols-outlined">description</span>
                </div>
                <div class="option-info">
                  <h4>Detailed Excel Report</h4>
                  <p>Complete test case information with all details</p>
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectionMode === 'all'" class="option-group">
            <label class="option-label">Apply Current Filters</label>
            <div class="filter-info">
              <span class="filter-status">
                {{ hasActiveFilters ? 'Current filters will be applied' : 'No active filters' }}
              </span>
              <button v-if="hasActiveFilters" class="btn-text" @click="$emit('clearFilters')">
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="modal-actions">
          <button class="btn-secondary" @click="$emit('close')">Cancel</button>
          <button class="btn-primary export-action" @click="handleExport" :disabled="loading">
            <span class="material-symbols-outlined" v-if="!loading">download</span>
            <span class="spinner-small" v-else></span>
            {{ loading ? 'Exporting...' : 'Export Test Cases' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Test Case Selector Modal for Sheets -->
    <div v-if="showTestcaseSelector" class="modal-overlay" @click.self="closeTestcaseSelector">
      <div class="testcase-selector-modal">
        <div class="modal-header">
          <h3>Select Test Cases for {{ sheets[currentSheetIndex]?.name }}</h3>
          <button class="btn-icon close-btn" @click="closeTestcaseSelector">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-content">
          <!-- Tabs for Test Cases / Use Cases -->
          <div class="selector-tabs">
            <button
              class="tab-button"
              :class="{ active: selectorTab === 'testcases' }"
              @click="selectorTab = 'testcases'"
            >
              <span class="material-symbols-outlined">playlist_add</span>
              Test Cases
            </button>
            <button
              class="tab-button"
              :class="{ active: selectorTab === 'usecases' }"
              @click="selectorTab = 'usecases'"
            >
              <span class="material-symbols-outlined">list_alt</span>
              Use Cases
            </button>
          </div>

          <!-- Test Cases Tab -->
          <div v-if="selectorTab === 'testcases'" class="tab-content">
            <div class="search-box">
              <span class="material-symbols-outlined">search</span>
              <input
                v-model="testcaseSearchQuery"
                type="text"
                placeholder="Search test cases..."
                class="search-input"
              />
            </div>
            <div class="testcase-list-container">
              <div class="testcase-list">
                <label
                  v-for="testcase in filteredTestCasesForSheet"
                  :key="testcase._id || testcase.id"
                  class="testcase-option"
                >
                  <input
                    type="checkbox"
                    :value="String(testcase._id || testcase.id)"
                    :checked="isTestcaseSelected(testcase, currentSheetIndex)"
                    @change="toggleTestcaseForSheet(testcase, currentSheetIndex)"
                  />
                  
                  <div class="testcase-info">
                    <span class="testcase-title">{{ testcase.title || testcase.name }}</span>
                    <span class="testcase-desc">{{ testcase.description || 'No description' }}</span>
                  </div>
                </label>
                <div v-if="filteredTestCasesForSheet.length === 0" class="empty-testcases">
                  <span class="material-symbols-outlined">search_off</span>
                  <p>No test cases found</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Use Cases Tab -->
          <div v-if="selectorTab === 'usecases'" class="tab-content">
            <div class="search-box">
              <span class="material-symbols-outlined">search</span>
              <input
                v-model="usecaseSearchQueryInSelector"
                type="text"
                placeholder="Search use cases..."
                class="search-input"
              />
            </div>
            <div class="usecase-list-container">
              <div class="usecase-list">
                <div
                  v-for="usecase in filteredUseCasesInSelector"
                  :key="getUsecaseId(usecase)"
                  class="usecase-option-group"
                >
                  <div class="usecase-option-header">
                    <label class="usecase-checkbox-wrapper" @click.stop>
                      <input
                        type="checkbox"
                        :checked="isUsecaseFullySelected(usecase, currentSheetIndex)"
                        :indeterminate="isUsecasePartiallySelected(usecase, currentSheetIndex)"
                        @change="toggleUsecaseSelection(usecase, currentSheetIndex)"
                      />
                      
                    </label>
                    <div 
                      class="usecase-option clickable"
                      @click="toggleUsecaseExpand(usecase)"
                    >
                      <div class="usecase-info">
                        <div class="usecase-header">
                          <span class="usecase-name">{{ usecase.name }}</span>
                          <span class="usecase-badge" :class="{ 'badge-zero': getUsecaseTestCasesCount(usecase) === 0 }">
                            {{ getUsecaseTestCasesCount(usecase) }} test case(s)
                          </span>
                        </div>
                        <span class="usecase-goal">{{ usecase.goal || 'No goal' }}</span>
                      </div>
                      <span class="material-symbols-outlined expand-icon" :class="{ expanded: isUsecaseExpanded(usecase) }">
                        expand_more
                      </span>
                    </div>
                  </div>
                  <!-- Expanded Test Cases List -->
                  <div v-if="isUsecaseExpanded(usecase)" class="usecase-testcases-list">
                    <label
                      v-for="testcase in getUsecaseTestCases(usecase)"
                      :key="testcase._id || testcase.id"
                      class="testcase-option nested"
                      @click.stop
                    >
                      <input
                        type="checkbox"
                        :value="String(testcase._id || testcase.id)"
                        :checked="isTestcaseSelected(testcase, currentSheetIndex)"
                        @change="toggleTestcaseForSheet(testcase, currentSheetIndex)"
                      />
                      
                      <div class="testcase-info">
                        <span class="testcase-title">{{ testcase.title || testcase.name }}</span>
                        <span class="testcase-desc">{{ testcase.description || 'No description' }}</span>
                      </div>
                    </label>
                    <div v-if="getUsecaseTestCases(usecase).length === 0" class="empty-testcases-nested">
                      <span class="material-symbols-outlined">info</span>
                      <p>No test cases for this use case</p>
                    </div>
                  </div>
                </div>
                <div v-if="filteredUseCasesInSelector.length === 0" class="empty-usecases">
                  <span class="material-symbols-outlined">search_off</span>
                  <p>No use cases found</p>
                </div>
              </div>
            </div>
          </div>

          <div class="selected-count">
            {{ getSelectedCountForSheet(currentSheetIndex) }} test case(s) selected
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="closeTestcaseSelector">Cancel</button>
          <button class="btn-primary" @click="closeTestcaseSelector">Done</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'

export default {
  name: 'ExportOptionsPanel',
  props: {
    projectId: {
      type: String,
      required: true,
    },
    versionId: {
      type: String,
      default: null,
    },
    filters: {
      type: Object,
      default: () => ({}),
    },
    loading: {
      type: Boolean,
      default: false,
    },
    testCases: {
      type: Array,
      default: () => [],
    },
    requirements: {
      type: Array,
      default: () => [],
    },
    selectedTestCases: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['export', 'close', 'clearFilters'],
  setup(props, { emit }) {
    const toast = useToast()

    const selectorTab = ref('testcases') // 'testcases' or 'usecases'
    const usecaseSearchQueryInSelector = ref('')
    const expandedUsecases = ref(new Set()) // Track expanded usecases

    // Available fields for export
    const availableFields = [
      { key: 'test_case_id', label: 'Test Case ID', required: true },
      { key: 'test_case_name', label: 'Test Case Name/Title', required: true },
      { key: 'description', label: 'Description' },
      { key: 'module_feature', label: 'Module/Feature' },
      { key: 'test_priority', label: 'Test Priority' },
      { key: 'preconditions', label: 'Preconditions' },
      { key: 'test_data', label: 'Test Data' },
      { key: 'test_steps', label: 'Test Steps' },
      { key: 'expected_result', label: 'Expected Result' },
      { key: 'actual_result', label: 'Actual Result' },
      { key: 'status', label: 'Status' },
    ]

    const selectedFields = ref(
      availableFields.filter((f) => f.required).map((f) => f.key)
    )

    // Sheets management
    const sheets = ref([
      {
        id: Date.now(),
        name: 'Sheet 1',
        testCaseIds: [],
      },
    ])

    const showTestcaseSelector = ref(false)
    const currentSheetIndex = ref(0)
    const testcaseSearchQuery = ref('')

    const hasActiveFilters = computed(() => {
      return Object.keys(props.filters).some(
        (key) =>
          props.filters[key] !== undefined &&
          props.filters[key] !== null &&
          props.filters[key] !== ''
      )
    })

    const filteredUseCasesInSelector = computed(() => {
      if (!usecaseSearchQueryInSelector.value) {
        return props.requirements || []
      }
      const query = usecaseSearchQueryInSelector.value.toLowerCase()
      return (props.requirements || []).filter(
        (uc) =>
          uc.name?.toLowerCase().includes(query) ||
          uc.goal?.toLowerCase().includes(query) ||
          String(uc._id || uc.id || '').toLowerCase().includes(query)
      )
    })

    const getUsecaseId = (usecase) => {
      return String(usecase._id || usecase.id || '')
    }

    const getTestCaseName = (testcaseId) => {
      const testcase = (props.testCases || []).find(
        (tc) => String(tc._id || tc.id || '') === String(testcaseId)
      )
      return testcase?.title || testcase?.name || `Test Case ${String(testcaseId).substring(0, 8)}...`
    }

    // Get available testcases - always returns all testcases
    const getAvailableTestCases = computed(() => {
      return props.testCases || []
    })

    // Normalize ID for comparison (handle ObjectId, string, etc.)
    const normalizeId = (id) => {
      if (!id) return ''
      // If it's an object with toString method (like ObjectId), use toString
      if (typeof id === 'object' && id.toString) {
        return String(id.toString())
      }
      return String(id).trim()
    }

    // Check if two IDs match (case-insensitive, handle various formats)
    const idsMatch = (id1, id2) => {
      const normalized1 = normalizeId(id1)
      const normalized2 = normalizeId(id2)
      if (!normalized1 || !normalized2) return false
      return normalized1 === normalized2 || normalized1.toLowerCase() === normalized2.toLowerCase()
    }

    const getUsecaseTestCasesCount = (usecase) => {
      const usecaseId = normalizeId(usecase._id || usecase.id || usecase.requirement_id)
      if (!usecaseId) return 0
      
      return (props.testCases || []).filter((tc) => {
        const reqIds = tc.source_requirement_ids || []
        return reqIds.some((reqId) => idsMatch(reqId, usecaseId))
      }).length
    }

    const addUsecaseTestCases = (usecase, sheetIndex) => {
      const usecaseId = normalizeId(usecase._id || usecase.id || usecase.requirement_id)
      const sheet = sheets.value[sheetIndex]
      
      if (!sheet) {
        toast.error('Sheet not found')
        return
      }
      
      if (!usecaseId) {
        toast.error(`Invalid use case ID for: ${usecase.name}`)
        return
      }
      
      // Get all testcases for this usecase
      const usecaseTestCases = (props.testCases || []).filter((tc) => {
        const reqIds = tc.source_requirement_ids || []
        return reqIds.some((reqId) => idsMatch(reqId, usecaseId))
      })

      console.log('🔍 Add usecase testcases:', {
        usecaseId,
        usecaseName: usecase.name,
        usecaseFull: usecase,
        totalTestCases: props.testCases?.length || 0,
        foundTestCases: usecaseTestCases.length,
        sampleTestCases: usecaseTestCases.slice(0, 3).map(tc => ({
          id: tc._id || tc.id,
          title: tc.title,
          reqIds: tc.source_requirement_ids,
          normalizedReqIds: (tc.source_requirement_ids || []).map(normalizeId)
        })),
        sampleAllTestCases: (props.testCases || []).slice(0, 2).map(tc => ({
          id: tc._id || tc.id,
          title: tc.title,
          reqIds: tc.source_requirement_ids,
          normalizedReqIds: (tc.source_requirement_ids || []).map(normalizeId)
        }))
      })

      if (usecaseTestCases.length === 0) {
        toast.warning(`No test cases found for use case: ${usecase.name} (ID: ${usecaseId})`)
        return
      }

      // Add all testcases from this usecase (skip if already exists)
      let addedCount = 0
      usecaseTestCases.forEach((tc) => {
        const tcId = normalizeId(tc._id || tc.id)
        if (!tcId) return
        
        // Check if already in sheet
        const alreadyExists = sheet.testCaseIds.some((existingId) => idsMatch(existingId, tcId))
        if (!alreadyExists) {
          sheet.testCaseIds.push(tcId)
          addedCount++
        }
      })

      if (addedCount > 0) {
        toast.success(`Added ${addedCount} test case(s) from ${usecase.name}`)
      } else {
        toast.info('All test cases from this use case are already in the sheet')
      }
    }

    // Get testcases for a usecase
    const getUsecaseTestCases = (usecase) => {
      const usecaseId = normalizeId(usecase._id || usecase.id || usecase.requirement_id)
      if (!usecaseId) return []
      
      return (props.testCases || []).filter((tc) => {
        const reqIds = tc.source_requirement_ids || []
        return reqIds.some((reqId) => idsMatch(reqId, usecaseId))
      })
    }

    // Check if usecase is fully selected (all testcases selected)
    const isUsecaseFullySelected = (usecase, sheetIndex) => {
      const usecaseTestCases = getUsecaseTestCases(usecase)
      if (usecaseTestCases.length === 0) return false
      
      const sheet = sheets.value[sheetIndex]
      if (!sheet) return false
      
      return usecaseTestCases.every((tc) => {
        const tcId = normalizeId(tc._id || tc.id)
        return sheet.testCaseIds.some((id) => idsMatch(id, tcId))
      })
    }

    // Check if usecase is partially selected (some but not all testcases selected)
    const isUsecasePartiallySelected = (usecase, sheetIndex) => {
      const usecaseTestCases = getUsecaseTestCases(usecase)
      if (usecaseTestCases.length === 0) return false
      
      const sheet = sheets.value[sheetIndex]
      if (!sheet) return false
      
      const selectedCount = usecaseTestCases.filter((tc) => {
        const tcId = normalizeId(tc._id || tc.id)
        return sheet.testCaseIds.some((id) => idsMatch(id, tcId))
      }).length
      
      return selectedCount > 0 && selectedCount < usecaseTestCases.length
    }

    // Toggle usecase selection (select/deselect all testcases)
    const toggleUsecaseSelection = (usecase, sheetIndex) => {
      const usecaseTestCases = getUsecaseTestCases(usecase)
      const sheet = sheets.value[sheetIndex]
      
      if (!sheet) return
      
      const isFullySelected = isUsecaseFullySelected(usecase, sheetIndex)
      
      if (isFullySelected) {
        // Deselect all testcases
        usecaseTestCases.forEach((tc) => {
          const tcId = normalizeId(tc._id || tc.id)
          if (!tcId) return
          
          const existingIndex = sheet.testCaseIds.findIndex((id) => idsMatch(id, tcId))
          if (existingIndex > -1) {
            sheet.testCaseIds.splice(existingIndex, 1)
          }
        })
      } else {
        // Select all testcases
        usecaseTestCases.forEach((tc) => {
          const tcId = normalizeId(tc._id || tc.id)
          if (!tcId) return
          
          const alreadyExists = sheet.testCaseIds.some((id) => idsMatch(id, tcId))
          if (!alreadyExists) {
            sheet.testCaseIds.push(tcId)
          }
        })
      }
    }

    // Toggle usecase expand/collapse
    const toggleUsecaseExpand = (usecase) => {
      const usecaseId = getUsecaseId(usecase)
      if (expandedUsecases.value.has(usecaseId)) {
        expandedUsecases.value.delete(usecaseId)
      } else {
        expandedUsecases.value.add(usecaseId)
      }
    }

    // Check if usecase is expanded
    const isUsecaseExpanded = (usecase) => {
      const usecaseId = getUsecaseId(usecase)
      return expandedUsecases.value.has(usecaseId)
    }

    // Field selection methods
    const selectAllFields = () => {
      selectedFields.value = availableFields.map((f) => f.key)
    }

    const deselectAllFields = () => {
      selectedFields.value = availableFields.filter((f) => f.required).map((f) => f.key)
    }

    // Sheet management methods
    const addSheet = () => {
      sheets.value.push({
        id: Date.now() + Math.random(),
        name: `Sheet ${sheets.value.length + 1}`,
        testCaseIds: [],
      })
    }

    const removeSheet = (index) => {
      if (sheets.value.length > 1) {
        sheets.value.splice(index, 1)
      } else {
        toast.warning('At least one sheet is required')
      }
    }

    const validateSheetName = (index) => {
      const sheet = sheets.value[index]
      if (!sheet.name || sheet.name.trim() === '') {
        sheet.name = `Sheet ${index + 1}`
        toast.warning('Sheet name cannot be empty')
      }
    }

    const openSheetTestcaseSelector = (index) => {
      currentSheetIndex.value = index
      showTestcaseSelector.value = true
    }

    const closeTestcaseSelector = () => {
      showTestcaseSelector.value = false
      testcaseSearchQuery.value = ''
    }


    const filteredTestCasesForSheet = computed(() => {
      let testcases = getAvailableTestCases.value
      if (testcaseSearchQuery.value) {
        const query = testcaseSearchQuery.value.toLowerCase()
        testcases = testcases.filter(
          (tc) =>
            tc.title?.toLowerCase().includes(query) ||
            tc.description?.toLowerCase().includes(query) ||
            String(tc._id || tc.id).toLowerCase().includes(query)
        )
      }
      return testcases
    })

    const isTestcaseSelected = (testcase, sheetIndex) => {
      const testcaseId = normalizeId(testcase._id || testcase.id)
      const sheet = sheets.value[sheetIndex]
      if (!sheet) return false
      return sheet.testCaseIds.some((id) => idsMatch(id, testcaseId))
    }

    const toggleTestcaseForSheet = (testcase, sheetIndex) => {
      const testcaseId = normalizeId(testcase._id || testcase.id)
      const sheet = sheets.value[sheetIndex]
      if (!sheet) return
      
      const existingIndex = sheet.testCaseIds.findIndex((id) => idsMatch(id, testcaseId))
      if (existingIndex > -1) {
        sheet.testCaseIds.splice(existingIndex, 1)
      } else {
        sheet.testCaseIds.push(testcaseId)
      }
    }

    const getSelectedCountForSheet = (sheetIndex) => {
      return sheets.value[sheetIndex]?.testCaseIds.length || 0
    }

    const handleExport = () => {
      if (!props.projectId) {
        toast.error('Project ID is required for export')
        return
      }

      // Validate fields
      if (selectedFields.value.length === 0) {
        toast.warning('Please select at least one field to export')
        return
      }

      // Validate sheets
      const hasTestCases = sheets.value.some((sheet) => sheet.testCaseIds.length > 0)
      if (!hasTestCases) {
        toast.warning('Please add test cases to at least one sheet')
        return
      }

      // Validate sheet names
      const invalidSheets = sheets.value.filter(
        (sheet) => !sheet.name || sheet.name.trim() === ''
      )
      if (invalidSheets.length > 0) {
        toast.warning('Please provide names for all sheets')
        return
      }

      const exportConfig = {
        type: 'testcases',
        title: 'Test Cases Export',
        sheets: sheets.value.map((sheet) => ({
          name: sheet.name,
          testCaseIds: sheet.testCaseIds,
        })),
        fields: selectedFields.value,
        options: {
          ...props.filters,
          versionId: props.versionId,
        },
      }

      emit('export', exportConfig)
    }

    return {
      hasActiveFilters,
      selectorTab,
      usecaseSearchQueryInSelector,
      filteredUseCasesInSelector,
      getUsecaseId,
      getTestCaseName,
      getUsecaseTestCasesCount,
      addUsecaseTestCases,
      getUsecaseTestCases,
      isUsecaseFullySelected,
      isUsecasePartiallySelected,
      toggleUsecaseSelection,
      toggleUsecaseExpand,
      isUsecaseExpanded,
      handleExport,
      // Fields
      availableFields,
      selectedFields,
      selectAllFields,
      deselectAllFields,
      // Sheets
      sheets,
      addSheet,
      removeSheet,
      validateSheetName,
      openSheetTestcaseSelector,
      showTestcaseSelector,
      currentSheetIndex,
      closeTestcaseSelector,
      getAvailableTestCases,
      testcaseSearchQuery,
      filteredTestCasesForSheet,
      isTestcaseSelected,
      toggleTestcaseForSheet,
      getSelectedCountForSheet,
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
}

.export-modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a365d;
  margin: 0;
}

.close-btn {
  color: #6b7280;
}

.close-btn:hover {
  color: #374151;
  background: #f3f4f6;
}

.modal-content {
  padding: 1.5rem;
}

.export-description {
  text-align: center;
  margin-bottom: 1.5rem;
}

.export-description p {
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.option-cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  transition: all 0.2s ease;
  cursor: pointer;
}

.option-card.active {
  border-color: #1a365d;
  background: #f8fafc;
}

.option-card:hover:not(.active) {
  border-color: #cbd5e1;
}

.option-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a365d;
  color: white;
  flex-shrink: 0;
}

.option-info h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a365d;
  margin: 0 0 0.25rem 0;
}

.option-info p {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
}

.checkbox-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  color: #374151;
  font-size: 0.875rem;
}

.checkbox-option input {
  display: none;
}

.checkmark {
  width: 18px;
  height: 18px;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.checkbox-option input:checked + .checkmark {
  background: #1a365d;
  border-color: #1a365d;
}

.checkbox-option input:checked + .checkmark::after {
  content: '✓';
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.filter-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.filter-status {
  font-size: 0.875rem;
  color: #6b7280;
}

.btn-text {
  background: none;
  border: none;
  color: #1a365d;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.btn-text:hover {
  background: #e5e7eb;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn-primary,
.btn-secondary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.btn-primary {
  background: #1a365d;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #27446c;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.export-action {
  min-width: 140px;
  justify-content: center;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Selection Mode Styles */
.selection-mode {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.radio-option {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.radio-option:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.radio-option input[type="radio"] {
  margin-top: 0.125rem;
  accent-color: #1a365d;
  cursor: pointer;
}

.radio-option input[type="radio"]:checked + .radio-label .radio-title {
  color: #1a365d;
  font-weight: 600;
}

.radio-option:has(input[type="radio"]:checked) {
  border-color: #1a365d;
  background: #f0f4f8;
}

.radio-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.radio-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.radio-desc {
  font-size: 0.75rem;
  color: #6b7280;
}

/* Selected Test Cases */
.selection-count {
  font-weight: 400;
  color: #6b7280;
  font-size: 0.75rem;
}

.empty-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
}

.empty-selection .material-symbols-outlined {
  font-size: 2rem;
  color: #9ca3af;
  margin-bottom: 0.5rem;
}

.empty-selection p {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.selected-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.5rem;
  background: #f8fafc;
}

.selected-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  background: white;
  margin-bottom: 0.25rem;
}

.selected-item:last-child {
  margin-bottom: 0;
}

.selected-item .material-symbols-outlined {
  font-size: 1.25rem;
  color: #10b981;
}

.item-name {
  font-size: 0.875rem;
  color: #374151;
  flex: 1;
}

/* Use Case Selector */
.usecase-selector {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box .material-symbols-outlined {
  position: absolute;
  left: 0.75rem;
  color: #9ca3af;
  font-size: 1.25rem;
}

.search-box .search-input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.search-box .search-input:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

.usecase-list {
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.5rem;
  background: #f8fafc;
}

.usecase-option-group {
  margin-bottom: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  overflow: hidden;
}

.usecase-option-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.usecase-checkbox-wrapper {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  cursor: pointer;
  flex-shrink: 0;
}

.usecase-checkbox-wrapper input[type="checkbox"] {
  margin: 0;
  accent-color: #1a365d;
  cursor: pointer;
  width: 18px;
  height: 18px;
}

.usecase-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem;
  padding-left: 0;
  border-radius: 6px;
  cursor: default;
  transition: all 0.2s;
  flex: 1;
  background: transparent;
  border: none;
}

.usecase-option.clickable {
  cursor: pointer;
}

.usecase-option.clickable:hover {
  background: #f0f4f8;
}

.usecase-option input[type="checkbox"] {
  margin-top: 0.125rem;
  accent-color: #1a365d;
  cursor: pointer;
}

.usecase-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.usecase-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: #dbeafe;
  color: #1a365d;
  border-radius: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.usecase-badge.badge-zero {
  background: #f3f4f6;
  color: #6b7280;
}

.expand-icon {
  color: #6b7280;
  font-size: 1.5rem;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.usecase-testcases-list {
  padding: 0.5rem 0.75rem 0.75rem 2.5rem;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
}

.testcase-option.nested {
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background: white;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
}

.testcase-option.nested:hover {
  background: #f0f4f8;
  border-color: #cbd5e1;
}

.empty-testcases-nested {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  text-align: center;
  color: #9ca3af;
}

.empty-testcases-nested .material-symbols-outlined {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.empty-testcases-nested p {
  margin: 0;
  font-size: 0.75rem;
}

.usecase-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.usecase-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.usecase-goal {
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.4;
}

.empty-usecases {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.empty-usecases .material-symbols-outlined {
  font-size: 2rem;
  color: #9ca3af;
  margin-bottom: 0.5rem;
}

.empty-usecases p {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.selected-usecases-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #dbeafe;
  border-radius: 8px;
  color: #1a365d;
  font-size: 0.875rem;
  font-weight: 500;
}

.selected-usecases-summary .material-symbols-outlined {
  font-size: 1.25rem;
}

/* Fields Selection */
.fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.field-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.field-option:hover {
  background: white;
}

.field-option input[type="checkbox"] {
  accent-color: #1a365d;
}

.field-label {
  font-size: 0.875rem;
  color: #374151;
}

.field-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.btn-text-small {
  background: none;
  border: none;
  color: #1a365d;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.btn-text-small:hover {
  background: #e5e7eb;
}

/* Sheets Management */
.sheets-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.btn-add-sheet {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #1a365d;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-sheet:hover {
  background: #27446c;
}

.empty-sheets {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
}

.empty-sheets .material-symbols-outlined {
  font-size: 2rem;
  color: #9ca3af;
  margin-bottom: 0.5rem;
}

.empty-sheets p {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.sheets-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sheet-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  background: white;
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.sheet-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.sheet-name-input {
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  width: 100%;
  max-width: 300px;
}

.sheet-name-input:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

.sheet-testcase-count {
  font-size: 0.75rem;
  color: #6b7280;
}

.sheet-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon-small {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 6px;
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon-small:hover {
  background: #e5e7eb;
  color: #374151;
}

.btn-icon-small.danger {
  color: #ef4444;
}

.btn-icon-small.danger:hover {
  background: #fee2e2;
}

.btn-icon-small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sheet-testcases-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;
}

.preview-item {
  padding: 0.25rem 0.5rem;
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #374151;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-more {
  padding: 0.25rem 0.5rem;
  background: #dbeafe;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #1a365d;
  font-weight: 500;
}

/* Test Case Selector Modal */
.testcase-selector-modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.testcase-list-container {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
}

.testcase-list {
  padding: 0.5rem;
}

.testcase-option {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 0.25rem;
  background: white;
  border: 1px solid transparent;
}

.testcase-option:hover {
  background: #f0f4f8;
  border-color: #cbd5e1;
}

.testcase-option input[type="checkbox"] {
  margin-top: 0.125rem;
  accent-color: #1a365d;
  cursor: pointer;
}

.testcase-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.testcase-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.testcase-desc {
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.empty-testcases {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.empty-testcases .material-symbols-outlined {
  font-size: 2rem;
  color: #9ca3af;
  margin-bottom: 0.5rem;
}

.empty-testcases p {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.selected-count {
  padding: 0.75rem 1rem;
  background: #dbeafe;
  color: #1a365d;
  font-size: 0.875rem;
  font-weight: 500;
  border-top: 1px solid #e5e7eb;
}

@media (max-width: 768px) {
  .export-modal {
    width: 95%;
    margin: 1rem;
    max-width: 100%;
  }

  .modal-header,
  .modal-content {
    padding: 1rem;
  }

  .modal-actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    justify-content: center;
  }

  .usecase-list {
    max-height: 200px;
  }

  .selected-list {
    max-height: 150px;
  }

  .fields-grid {
    grid-template-columns: 1fr;
  }

  .testcase-selector-modal {
    width: 95%;
  }

  .selector-tabs {
    flex-direction: column;
  }

  .tab-content {
    min-height: 200px;
  }
}

/* Selector Tabs */
.selector-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: -2px;
}

.tab-button:hover {
  color: #1a365d;
  background: #f8fafc;
}

.tab-button.active {
  color: #1a365d;
  border-bottom-color: #1a365d;
}

.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.usecase-list-container {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
}
</style>