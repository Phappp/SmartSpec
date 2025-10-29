<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container enhance-modal">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="header-content">
          <span class="material-symbols-outlined">auto_awesome</span>
          <div class="header-text">
            <h2>Enhance Test Cases</h2>
            <p>Generate enhanced test cases to replace existing ones</p>
          </div>
        </div>
        <button class="close-button" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Progress Steps -->
      <div class="progress-steps">
        <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
          <div class="step-number">1</div>
          <span class="step-label">Select Requirements</span>
        </div>
        <div class="step-connector" :class="{ completed: currentStep > 1 }"></div>
        <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
          <div class="step-number">2</div>
          <span class="step-label">Generate & Compare</span>
        </div>
        <div class="step-connector" :class="{ completed: currentStep > 2 }"></div>
        <div class="step" :class="{ active: currentStep === 3 }">
          <div class="step-number">3</div>
          <span class="step-label">Save Results</span>
        </div>
      </div>

      <!-- Step 1: Select Requirements -->
      <div v-if="currentStep === 1" class="step-content">
        <div class="section-header">
          <h3>Select Requirements to Enhance</h3>
          <p>Choose requirements to replace existing test cases with enhanced versions</p>
        </div>

        <!-- Requirements Selection -->
        <div class="requirements-selection">
          <div class="selection-header">
            <div class="search-box">
              <span class="material-symbols-outlined">search</span>
              <input
                v-model="requirementSearch"
                type="text"
                placeholder="Search requirements..."
                class="search-input"
              />
            </div>
            <div class="selection-actions">
              <button class="btn-text" @click="selectAllRequirements">
                {{ allRequirementsSelected ? 'Deselect All' : 'Select All' }}
              </button>
              <span class="selection-count">{{ selectedRequirementIds.length }} selected</span>
            </div>
          </div>

          <div class="requirements-list">
            <div
              v-for="requirement in filteredRequirements"
              :key="requirement.id"
              class="requirement-item"
              :class="{ selected: selectedRequirementIds.includes(requirement.id) }"
              @click="toggleRequirement(requirement.id)"
            >
              <div class="requirement-checkbox">
                <span
                  class="material-symbols-outlined checkbox-icon"
                  :class="{ checked: selectedRequirementIds.includes(requirement.id) }"
                >
                  {{
                    selectedRequirementIds.includes(requirement.id)
                      ? 'check_box'
                      : 'check_box_outline_blank'
                  }}
                </span>
              </div>
              <div class="requirement-content">
                <div class="requirement-name">{{ requirement.name || 'Unnamed Requirement' }}</div>
                <div class="requirement-desc" v-if="requirement.description">
                  {{ requirement.description }}
                </div>
                <div class="requirement-meta">
                  <span class="meta-tag type">{{ requirement.type || 'functional' }}</span>
                  <span class="meta-tag priority" :class="requirement.priority || 'medium'">
                    {{ requirement.priority || 'medium' }}
                  </span>
                </div>
              </div>
              <div class="existing-testcases">
                <span class="testcase-count" v-if="getExistingTestCasesCount(requirement.id) > 0">
                  {{ getExistingTestCasesCount(requirement.id) }} existing
                </span>
                <span class="testcase-count none" v-else>No test cases</span>
              </div>
            </div>

            <div v-if="filteredRequirements.length === 0" class="empty-requirements">
              <span class="material-symbols-outlined">search_off</span>
              <p>No requirements found matching your search</p>
            </div>
          </div>
        </div>

        <!-- Coverage Summary -->
        <div class="coverage-summary">
          <div class="summary-card">
            <div class="summary-icon">
              <span class="material-symbols-outlined">assignment</span>
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ selectedRequirementIds.length }}</div>
              <div class="summary-label">Requirements Selected</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon">
              <span class="material-symbols-outlined">play_arrow</span>
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ estimatedNewTestCases }}</div>
              <div class="summary-label">Estimated Test Cases</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon">
              <span class="material-symbols-outlined">swap_horiz</span>
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ totalExistingTestCasesForSelected }}</div>
              <div class="summary-label">To Be Replaced</div>
            </div>
          </div>
        </div>

        <!-- Generation Options -->
        <div class="generation-options">
          <h4>Generation Options</h4>
          <div class="options-grid">
            <label class="option-checkbox">
              <input type="checkbox" v-model="generationOptions.includeEdgeCases" />
              <span class="checkmark"></span>
              <span class="option-label">Include edge cases</span>
            </label>
            <label class="option-checkbox">
              <input type="checkbox" v-model="generationOptions.includeNegativeTests" />
              <span class="checkmark"></span>
              <span class="option-label">Include negative test cases</span>
            </label>
            <label class="option-checkbox">
              <input type="checkbox" v-model="generationOptions.enhanceExisting" />
              <span class="checkmark"></span>
              <span class="option-label">Enhance existing test cases</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Step 2: Generate & Compare -->
      <div v-if="currentStep === 2" class="step-content">
        <div class="section-header">
          <h3>Review Enhanced Test Cases</h3>
          <p>Compare the enhanced test cases with existing ones</p>
        </div>

        <!-- Generation Status -->
        <div v-if="!hasGenerated" class="generation-prompt">
          <div class="prompt-card">
            <div class="prompt-icon">
              <span class="material-symbols-outlined">auto_awesome</span>
            </div>
            <div class="prompt-content">
              <h4>Ready to Generate</h4>
              <p>Generate enterprise-standard test cases to replace existing ones</p>
              <button
                class="btn-primary generate-btn"
                @click="generateTestCases"
                :disabled="generating"
              >
                <span v-if="generating" class="spinner small"></span>
                {{ generating ? 'Generating...' : 'Generate Enhanced Test Cases' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Generation Progress -->
        <div v-if="generating" class="generation-progress">
          <div class="progress-card">
            <div class="progress-icon">
              <span class="material-symbols-outlined">auto_awesome</span>
            </div>
            <div class="progress-content">
              <h4>Generating Enhanced Test Cases...</h4>
              <p>AI is creating enterprise-standard test cases to replace existing ones</p>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${generationProgress}%` }"></div>
              </div>
              <div class="progress-stats">
                <span>Estimated time: 30-60 seconds</span>
                <span>{{ Math.round(generationProgress) }}% complete</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Comparison Interface -->
        <div v-if="hasGenerated && !generating" class="comparison-interface">
          <!-- Comparison Tabs -->
          <div class="comparison-tabs">
            <div class="tab-buttons">
              <button
                class="tab-button"
                :class="{ active: activeTab === 'preview' }"
                @click="activeTab = 'preview'"
              >
                <span class="material-symbols-outlined">visibility</span>
                Preview Enhanced
              </button>
              <button
                class="tab-button"
                :class="{ active: activeTab === 'comparison' }"
                @click="activeTab = 'comparison'"
              >
                <span class="material-symbols-outlined">compare</span>
                Side by Side
              </button>
              <button
                class="tab-button"
                :class="{ active: activeTab === 'coverage' }"
                @click="activeTab = 'coverage'"
              >
                <span class="material-symbols-outlined">analytics</span>
                Coverage Analysis
              </button>
            </div>

            <!-- Preview Tab -->
            <div v-if="activeTab === 'preview'" class="tab-content preview-tab">
              <div class="preview-header">
                <h4>Enhanced Test Cases ({{ generatedTestCases.length }})</h4>
                <button class="btn-secondary" @click="regenerateTestCases" :disabled="generating">
                  <span class="material-symbols-outlined">refresh</span>
                  Regenerate
                </button>
              </div>

              <div class="testcases-preview">
                <div
                  v-for="(testcase, index) in generatedTestCases"
                  :key="index"
                  class="testcase-preview-item"
                >
                  <div class="testcase-header">
                    <div class="testcase-title-section">
                      <span class="testcase-title">{{ testcase.title }}</span>
                      <span class="testcase-badge enhanced">ENHANCED</span>
                    </div>
                    <div class="testcase-meta">
                      <span class="testcase-type" :class="testcase.test_type || 'integration'">
                        {{ testcase.test_type || 'integration' }}
                      </span>
                      <span class="testcase-priority" :class="testcase.priority || 'medium'">
                        {{ testcase.priority || 'medium' }}
                      </span>
                    </div>
                  </div>

                  <div class="testcase-content">
                    <div class="testcase-desc" v-if="testcase.description">
                      {{ testcase.description }}
                    </div>

                    <div class="testcase-details">
                      <div class="detail-item">
                        <span class="detail-label">Steps:</span>
                        <span class="detail-value">{{ testcase.steps?.length || 0 }}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">Database Tables:</span>
                        <span class="detail-value">{{
                          testcase.database_tables?.join(', ') || 'None'
                        }}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">Requirements:</span>
                        <span class="detail-value">{{
                          testcase.source_requirement_ids?.join(', ') || 'None'
                        }}</span>
                      </div>
                    </div>

                    <!-- Steps Preview -->
                    <div class="steps-preview" v-if="testcase.steps && testcase.steps.length > 0">
                      <div class="steps-header">Test Steps:</div>
                      <div class="steps-list">
                        <div
                          v-for="step in testcase.steps"
                          :key="step.step_number"
                          class="step-item"
                        >
                          <span class="step-number">{{ step.step_number }}</span>
                          <span class="step-action">{{ step.action }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Side by Side Comparison Tab -->
            <div v-if="activeTab === 'comparison'" class="tab-content comparison-tab">
              <div class="comparison-header">
                <h4>Before vs After Enhancement</h4>
                <div class="comparison-stats-quick">
                  <div class="quick-stat">
                    <span class="stat-label">Current:</span>
                    <span class="stat-value">{{ existingTestCasesForSelected.length }}</span>
                  </div>
                  <div class="quick-stat">
                    <span class="stat-label">Enhanced:</span>
                    <span class="stat-value enhanced">{{ generatedTestCases.length }}</span>
                  </div>
                  <div class="quick-stat">
                    <span class="stat-label">Change:</span>
                    <span class="stat-value" :class="testCaseChangeClass">{{
                      testCaseChangeText
                    }}</span>
                  </div>
                </div>
              </div>

              <div class="comparison-columns">
                <!-- Before Column -->
                <div class="column before-column">
                  <div class="column-header">
                    <h5>Before Enhancement</h5>
                    <span class="column-badge"
                      >{{ existingTestCasesForSelected.length }} test cases</span
                    >
                  </div>

                  <div class="testcase-comparison-list">
                    <div
                      v-for="testcase in existingTestCasesForSelected"
                      :key="testcase.id"
                      class="comparison-testcase existing"
                    >
                      <div class="testcase-title">{{ testcase.title }}</div>
                      <div class="testcase-meta-compact">
                        <span class="testcase-type">{{ testcase.test_type || 'integration' }}</span>
                        <span class="testcase-steps">{{ testcase.steps?.length || 0 }} steps</span>
                      </div>
                      <div class="testcase-requirements">
                        {{ testcase.source_requirement_ids?.join(', ') || 'No requirements' }}
                      </div>
                    </div>
                    <div v-if="existingTestCasesForSelected.length === 0" class="no-testcases">
                      No existing test cases for selected requirements
                    </div>
                  </div>

                  <div class="coverage-summary-compact">
                    <h6>Current Coverage</h6>
                    <div class="coverage-stats">
                      <div class="coverage-stat">
                        <span class="coverage-value">{{
                          existingTestCasesForSelected.length
                        }}</span>
                        <span class="coverage-label">Test Cases</span>
                      </div>
                      <div class="coverage-stat">
                        <span class="coverage-value">{{ currentDatabaseTables.length }}</span>
                        <span class="coverage-label">Database Tables</span>
                      </div>
                      <div class="coverage-stat">
                        <span class="coverage-value">{{ currentTestTypesCovered.length }}</span>
                        <span class="coverage-label">Test Types</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- After Column -->
                <div class="column after-column">
                  <div class="column-header">
                    <h5>After Enhancement</h5>
                    <span class="column-badge enhanced"
                      >{{ generatedTestCases.length }} test cases</span
                    >
                  </div>

                  <div class="testcase-comparison-list">
                    <div
                      v-for="(testcase, index) in generatedTestCases"
                      :key="'new-' + index"
                      class="comparison-testcase enhanced"
                    >
                      <div class="testcase-title">{{ testcase.title }}</div>
                      <div class="testcase-meta-compact">
                        <span class="testcase-type">{{ testcase.test_type || 'integration' }}</span>
                        <span class="testcase-steps">{{ testcase.steps?.length || 0 }} steps</span>
                      </div>
                      <div class="testcase-requirements enhanced">
                        {{ testcase.source_requirement_ids?.join(', ') || 'No requirements' }}
                      </div>
                      <div class="enhanced-indicator">ENHANCED</div>
                    </div>
                    <div v-if="generatedTestCases.length === 0" class="no-testcases">
                      No enhanced test cases generated
                    </div>
                  </div>

                  <div class="coverage-summary-compact enhanced">
                    <h6>Enhanced Coverage</h6>
                    <div class="coverage-stats">
                      <div class="coverage-stat">
                        <span class="coverage-value">{{ generatedTestCases.length }}</span>
                        <span class="coverage-label">Test Cases</span>
                        <span class="coverage-diff" :class="testCaseChangeClass">{{
                          testCaseChangeText
                        }}</span>
                      </div>
                      <div class="coverage-stat">
                        <span class="coverage-value">{{ enhancedDatabaseTables.length }}</span>
                        <span class="coverage-label">Database Tables</span>
                        <span class="coverage-diff" :class="databaseChangeClass">{{
                          databaseChangeText
                        }}</span>
                      </div>
                      <div class="coverage-stat">
                        <span class="coverage-value">{{ enhancedTestTypesCovered.length }}</span>
                        <span class="coverage-label">Test Types</span>
                        <span class="coverage-diff" :class="testTypeChangeClass">{{
                          testTypeChangeText
                        }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Coverage Analysis Tab -->
            <div v-if="activeTab === 'coverage'" class="tab-content coverage-tab">
              <div class="coverage-header">
                <h4>Coverage Improvement Analysis</h4>
                <div class="coverage-overview">
                  <div class="overview-card">
                    <div class="overview-value">{{ testCaseChangePercentage }}%</div>
                    <div class="overview-label">Test Case Change</div>
                  </div>
                </div>
              </div>

              <div class="coverage-grid">
                <!-- Test Cases Coverage -->
                <div class="coverage-card">
                  <h5>Test Cases Coverage</h5>
                  <div class="coverage-progress">
                    <div class="progress-labels">
                      <span>Before: {{ existingTestCasesForSelected.length }}</span>
                      <span>After: {{ generatedTestCases.length }}</span>
                    </div>
                    <div class="progress-bar">
                      <div
                        class="progress-fill before"
                        :style="{ width: existingTestCasesPercentage + '%' }"
                      ></div>
                      <div
                        class="progress-fill after"
                        :style="{ width: generatedTestCasesPercentage + '%' }"
                      ></div>
                    </div>
                    <div class="progress-improvement">
                      <span class="improvement-value">{{ testCaseChangeText }} test cases</span>
                      <span class="improvement-percent" :class="testCaseChangeClass">
                        {{ testCaseChangePercentage }}%
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Database Coverage -->
                <div class="coverage-card">
                  <h5>Database Coverage</h5>
                  <div class="coverage-metrics">
                    <div class="metric-row">
                      <span class="metric-label">Tables Covered:</span>
                      <div class="metric-values">
                        <span class="metric-before">{{ currentDatabaseTables.length }}</span>
                        <span class="metric-arrow">→</span>
                        <span class="metric-after">{{ enhancedDatabaseTables.length }}</span>
                        <span class="metric-diff" :class="databaseChangeClass">{{
                          databaseChangeText
                        }}</span>
                      </div>
                    </div>
                    <div class="metric-row">
                      <span class="metric-label">New Tables:</span>
                      <span class="metric-new-tables">{{
                        newDatabaseTables.join(', ') || 'None'
                      }}</span>
                    </div>
                  </div>
                </div>

                <!-- Test Types Coverage -->
                <div class="coverage-card">
                  <h5>Test Types Coverage</h5>
                  <div class="types-comparison">
                    <div class="types-before">
                      <div class="types-label">Before:</div>
                      <div class="types-list">
                        <span
                          v-for="type in currentTestTypesCovered"
                          :key="'before-' + type"
                          class="type-tag"
                        >
                          {{ type }}
                        </span>
                        <span v-if="currentTestTypesCovered.length === 0" class="type-tag none">
                          None
                        </span>
                      </div>
                    </div>
                    <div class="types-after">
                      <div class="types-label">After:</div>
                      <div class="types-list">
                        <span
                          v-for="type in enhancedTestTypesCovered"
                          :key="'after-' + type"
                          class="type-tag enhanced"
                        >
                          {{ type }}
                        </span>
                        <span v-if="enhancedTestTypesCovered.length === 0" class="type-tag none">
                          None
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Enterprise Metrics -->
                <div class="coverage-card">
                  <h5>Quality Metrics</h5>
                  <div class="enterprise-metrics">
                    <div class="enterprise-metric">
                      <span class="metric-name">Steps per Test Case:</span>
                      <div class="metric-value">
                        <span class="value-before">{{ currentAvgSteps.toFixed(1) }}</span>
                        <span class="value-arrow">→</span>
                        <span class="value-after">{{ enhancedAvgSteps.toFixed(1) }}</span>
                      </div>
                    </div>
                    <div class="enterprise-metric">
                      <span class="metric-name">Test Data Coverage:</span>
                      <div class="metric-value">
                        <span class="value-before">{{ currentTestDataCoverage }}%</span>
                        <span class="value-arrow">→</span>
                        <span class="value-after">{{ enhancedTestDataCoverage }}%</span>
                      </div>
                    </div>
                    <div class="enterprise-metric">
                      <span class="metric-name">Total Steps:</span>
                      <div class="metric-value">
                        <span class="value-before">{{ currentTotalSteps }}</span>
                        <span class="value-arrow">→</span>
                        <span class="value-after">{{ enhancedTotalSteps }}</span>
                        <span class="value-diff" :class="stepsChangeClass">{{
                          stepsChangeText
                        }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Save Results -->
      <div v-if="currentStep === 3" class="step-content">
        <div class="confirmation-content">
          <div class="success-icon">
            <span class="material-symbols-outlined">check_circle</span>
          </div>
          <h3>Enhancement Complete!</h3>
          <p>Your test cases have been successfully enhanced and saved</p>

          <div class="enhancement-results">
            <div class="result-card success">
              <div class="result-icon">
                <span class="material-symbols-outlined">swap_horiz</span>
              </div>
              <div class="result-info">
                <div class="result-value">{{ savedResults.replaced || 0 }}</div>
                <div class="result-label">Test Cases Replaced</div>
              </div>
            </div>
            <div class="result-card info">
              <div class="result-icon">
                <span class="material-symbols-outlined">table_chart</span>
              </div>
              <div class="result-info">
                <div class="result-value">{{ savedResults.databaseTables || 0 }}</div>
                <div class="result-label">Database Tables Covered</div>
              </div>
            </div>
            <div class="result-card warning">
              <div class="result-icon">
                <span class="material-symbols-outlined">assignment</span>
              </div>
              <div class="result-info">
                <div class="result-value">{{ savedResults.requirementsCovered || 0 }}</div>
                <div class="result-label">Requirements Covered</div>
              </div>
            </div>
          </div>

          <div class="action-buttons">
            <button class="btn-secondary" @click="viewTestCases">
              <span class="material-symbols-outlined">visibility</span>
              View Test Cases
            </button>
            <button class="btn-primary" @click="generateMore">
              <span class="material-symbols-outlined">add</span>
              Enhance More
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <div class="footer-actions">
          <button class="btn-secondary" @click="handleBack" v-if="currentStep > 1">
            <span class="material-symbols-outlined">arrow_back</span>
            Back
          </button>
          <button class="btn-secondary" @click="$emit('close')" v-if="currentStep === 1">
            Cancel
          </button>
        </div>
        <div class="footer-primary">
          <button
            class="btn-primary"
            @click="handleNext"
            :disabled="!canProceed || generating || saving"
            v-if="currentStep < 3"
          >
            <span v-if="(currentStep === 2 && generating) || saving" class="spinner small"></span>
            <span v-else>
              {{ getNextButtonText }}
              <span class="material-symbols-outlined">
                {{ getNextButtonIcon }}
              </span>
            </span>
          </button>
          <button class="btn-primary" @click="handleFinish" v-else>
            Finish
            <span class="material-symbols-outlined">check</span>
          </button>
        </div>
      </div>

      <!-- Loading Overlay -->
      <div v-if="saving" class="loading-overlay">
        <div class="loading-content">
          <div class="spinner large"></div>
          <h3>Replacing Test Cases...</h3>
          <p>Please wait while we replace your test cases with enhanced versions</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { testcaseApi } from '@/api/testcase'

export default {
  name: 'EnhanceTestcaseModal',
  props: {
    projectId: {
      type: String,
      required: true,
    },
    versionId: {
      type: String,
      required: true,
    },
    requirements: {
      type: Array,
      default: () => [],
    },
    existingTestCases: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['close', 'enhanced', 'view-testcases'],
  setup(props, { emit }) {
    const toast = useToast()

    // Reactive state
    const currentStep = ref(1)
    const generating = ref(false)
    const saving = ref(false)
    const generationProgress = ref(0)
    const activeTab = ref('preview')
    const requirementSearch = ref('')
    const selectedRequirementIds = ref([])
    const generatedTestCases = ref([])
    const savedResults = ref({})

    // Generation options
    const generationOptions = ref({
      includeEdgeCases: true,
      includeNegativeTests: true,
      enhanceExisting: false,
    })

    // Computed properties
    const filteredRequirements = computed(() => {
      if (!requirementSearch.value) return props.requirements
      const searchTerm = requirementSearch.value.toLowerCase()
      return props.requirements.filter(
        (req) =>
          (req.name && req.name.toLowerCase().includes(searchTerm)) ||
          (req.description && req.description.toLowerCase().includes(searchTerm))
      )
    })

    const allRequirementsSelected = computed(
      () =>
        selectedRequirementIds.value.length === filteredRequirements.value.length &&
        filteredRequirements.value.length > 0
    )

    const estimatedNewTestCases = computed(() => selectedRequirementIds.value.length * 4)

    const existingTestCasesForSelected = computed(() => {
      return props.existingTestCases.filter(
        (tc) =>
          tc.source_requirement_ids &&
          tc.source_requirement_ids.some((reqId) => selectedRequirementIds.value.includes(reqId))
      )
    })

    const totalExistingTestCasesForSelected = computed(
      () => existingTestCasesForSelected.value.length
    )

    const hasGenerated = computed(() => generatedTestCases.value.length > 0)

    // Change calculations
    const testCaseChange = computed(
      () => generatedTestCases.value.length - existingTestCasesForSelected.value.length
    )
    const testCaseChangeText = computed(() => {
      const change = testCaseChange.value
      if (change > 0) return `+${change}`
      if (change < 0) return `${change}`
      return '0'
    })
    const testCaseChangeClass = computed(() => {
      const change = testCaseChange.value
      if (change > 0) return 'positive'
      if (change < 0) return 'negative'
      return 'neutral'
    })
    const testCaseChangePercentage = computed(() => {
      if (existingTestCasesForSelected.value.length === 0) return 100
      return Math.round((testCaseChange.value / existingTestCasesForSelected.value.length) * 100)
    })

    // Coverage and comparison computed properties
    const currentDatabaseTables = computed(() => {
      const tables = new Set()
      existingTestCasesForSelected.value.forEach((tc) => {
        if (tc.database_tables) tc.database_tables.forEach((table) => tables.add(table))
      })
      return Array.from(tables)
    })

    const enhancedDatabaseTables = computed(() => {
      const tables = new Set()
      generatedTestCases.value.forEach((tc) => {
        if (tc.database_tables) tc.database_tables.forEach((table) => tables.add(table))
      })
      return Array.from(tables)
    })

    const newDatabaseTables = computed(() =>
      enhancedDatabaseTables.value.filter((table) => !currentDatabaseTables.value.includes(table))
    )

    const databaseChangeText = computed(() => {
      const change = newDatabaseTables.value.length
      if (change > 0) return `+${change}`
      return '0'
    })
    const databaseChangeClass = computed(() =>
      newDatabaseTables.value.length > 0 ? 'positive' : 'neutral'
    )

    const currentTestTypesCovered = computed(() => {
      const types = new Set()
      existingTestCasesForSelected.value.forEach((tc) => {
        if (tc.test_type) types.add(tc.test_type)
      })
      return Array.from(types)
    })

    const enhancedTestTypesCovered = computed(() => {
      const types = new Set()
      generatedTestCases.value.forEach((tc) => {
        if (tc.test_type) types.add(tc.test_type)
      })
      return Array.from(types)
    })

    const newTestTypes = computed(() =>
      enhancedTestTypesCovered.value.filter((type) => !currentTestTypesCovered.value.includes(type))
    )

    const testTypeChangeText = computed(() => {
      const change = newTestTypes.value.length
      if (change > 0) return `+${change}`
      return '0'
    })
    const testTypeChangeClass = computed(() =>
      newTestTypes.value.length > 0 ? 'positive' : 'neutral'
    )

    const currentTotalSteps = computed(() =>
      existingTestCasesForSelected.value.reduce((total, tc) => total + (tc.steps?.length || 0), 0)
    )

    const enhancedTotalSteps = computed(() =>
      generatedTestCases.value.reduce((total, tc) => total + (tc.steps?.length || 0), 0)
    )

    const stepsChangeText = computed(() => {
      const change = enhancedTotalSteps.value - currentTotalSteps.value
      if (change > 0) return `+${change}`
      if (change < 0) return `${change}`
      return '0'
    })
    const stepsChangeClass = computed(() => {
      const change = enhancedTotalSteps.value - currentTotalSteps.value
      if (change > 0) return 'positive'
      if (change < 0) return 'negative'
      return 'neutral'
    })

    const currentAvgSteps = computed(() => {
      if (existingTestCasesForSelected.value.length === 0) return 0
      return currentTotalSteps.value / existingTestCasesForSelected.value.length
    })

    const enhancedAvgSteps = computed(() => {
      if (generatedTestCases.value.length === 0) return 0
      return enhancedTotalSteps.value / generatedTestCases.value.length
    })

    const currentTestDataCoverage = computed(() => {
      const withTestData = existingTestCasesForSelected.value.filter(
        (tc) => tc.test_data && tc.test_data.length > 0
      ).length
      if (existingTestCasesForSelected.value.length === 0) return 0
      return Math.round((withTestData / existingTestCasesForSelected.value.length) * 100)
    })

    const enhancedTestDataCoverage = computed(() => {
      const withTestData = generatedTestCases.value.filter(
        (tc) => tc.test_data && tc.test_data.length > 0
      ).length
      if (generatedTestCases.value.length === 0) return 0
      return Math.round((withTestData / generatedTestCases.value.length) * 100)
    })

    const existingTestCasesPercentage = computed(() => {
      const max = Math.max(
        existingTestCasesForSelected.value.length,
        generatedTestCases.value.length
      )
      if (max === 0) return 0
      return (existingTestCasesForSelected.value.length / max) * 100
    })

    const generatedTestCasesPercentage = computed(() => {
      const max = Math.max(
        existingTestCasesForSelected.value.length,
        generatedTestCases.value.length
      )
      if (max === 0) return 0
      return (generatedTestCases.value.length / max) * 100
    })

    const canProceed = computed(() => {
      switch (currentStep.value) {
        case 1:
          return selectedRequirementIds.value.length > 0
        case 2:
          return generatedTestCases.value.length > 0
        case 3:
          return true
        default:
          return false
      }
    })

    const getNextButtonText = computed(() => {
      switch (currentStep.value) {
        case 1:
          return 'Generate Enhanced Test Cases'
        case 2:
          return 'Replace Test Cases'
        default:
          return 'Continue'
      }
    })

    const getNextButtonIcon = computed(() => {
      switch (currentStep.value) {
        case 1:
          return 'auto_awesome'
        case 2:
          return 'swap_horiz'
        default:
          return 'arrow_forward'
      }
    })

    // Methods
    const toggleRequirement = (requirementId) => {
      const index = selectedRequirementIds.value.indexOf(requirementId)
      if (index > -1) {
        selectedRequirementIds.value.splice(index, 1)
      } else {
        selectedRequirementIds.value.push(requirementId)
      }
    }

    const selectAllRequirements = () => {
      if (allRequirementsSelected.value) {
        selectedRequirementIds.value = []
      } else {
        selectedRequirementIds.value = filteredRequirements.value.map((req) => req.id)
      }
    }

    const getExistingTestCasesCount = (requirementId) =>
      props.existingTestCases.filter(
        (tc) => tc.source_requirement_ids && tc.source_requirement_ids.includes(requirementId)
      ).length

    const generateTestCases = async () => {
      generating.value = true
      generationProgress.value = 0

      try {
        const progressInterval = setInterval(() => {
          generationProgress.value += Math.random() * 10
          if (generationProgress.value >= 90) clearInterval(progressInterval)
        }, 500)

        const response = await testcaseApi.generateTestCases(props.projectId, props.versionId, {
          selectedRequirementIds: selectedRequirementIds.value,
          language: 'vi-VN',
          replaceExisting: true,
          ...generationOptions.value,
        })

        clearInterval(progressInterval)
        generationProgress.value = 100
        generatedTestCases.value = response.data.data || []
        toast.success(`Generated ${generatedTestCases.value.length} enhanced test cases!`)
      } catch (error) {
        console.error('Error generating enhanced test cases:', error)
        const errorMessage =
          error.response?.data?.message || 'Failed to generate enhanced test cases'
        toast.error(errorMessage)
      } finally {
        generating.value = false
      }
    }

    const regenerateTestCases = async () => {
      generatedTestCases.value = []
      await generateTestCases()
    }

    const saveTestCases = async () => {
      saving.value = true
      try {
        // First delete existing test cases for selected requirements
        if (existingTestCasesForSelected.value.length > 0) {
          const deletePromises = existingTestCasesForSelected.value.map((testcase) =>
            testcaseApi.deleteTestCase(testcase.id)
          )
          await Promise.all(deletePromises)
        }

        // Then save the enhanced test cases using saveTestCases API
        const response = await testcaseApi.saveTestCases(props.projectId, props.versionId, {
          testCases: generatedTestCases.value.map((testcase) => ({
            ...testcase,
            project_id: props.projectId,
            version_id: props.versionId,
          })),
        })

        savedResults.value = {
          replaced: existingTestCasesForSelected.value.length,
          enhanced: generatedTestCases.value.length,
          databaseTables: enhancedDatabaseTables.value.length,
          requirementsCovered: selectedRequirementIds.value.length,
        }

        toast.success(
          `Successfully replaced ${existingTestCasesForSelected.value.length} test cases with ${generatedTestCases.value.length} enhanced versions!`
        )
        emit('enhanced', {
          replacedTestCases: existingTestCasesForSelected.value,
          enhancedTestCases: generatedTestCases.value,
          savedResults: savedResults.value,
        })
      } catch (error) {
        console.error('Error replacing test cases:', error)
        const errorMessage = error.response?.data?.message || 'Failed to replace test cases'
        toast.error(errorMessage)
      } finally {
        saving.value = false
      }
    }

    const handleNext = async () => {
      if (currentStep.value === 1) {
        currentStep.value = 2
      } else if (currentStep.value === 2) {
        await saveTestCases()
        currentStep.value = 3
      }
    }

    const handleBack = () => {
      if (currentStep.value > 1) currentStep.value--
    }

    const handleFinish = () => emit('close')

    const viewTestCases = () => {
      emit('view-testcases')
      emit('close')
    }

    const generateMore = () => {
      currentStep.value = 1
      generatedTestCases.value = []
      savedResults.value = {}
      selectedRequirementIds.value = []
    }

    onMounted(() => {
      if (props.requirements.length > 0) {
        selectedRequirementIds.value = props.requirements.slice(0, 2).map((req) => req.id)
      }
    })

    return {
      // State
      currentStep,
      generating,
      saving,
      generationProgress,
      activeTab,
      requirementSearch,
      selectedRequirementIds,
      generatedTestCases,
      savedResults,
      generationOptions,

      // Computed
      filteredRequirements,
      allRequirementsSelected,
      estimatedNewTestCases,
      hasGenerated,
      existingTestCasesForSelected,
      totalExistingTestCasesForSelected,
      testCaseChangeText,
      testCaseChangeClass,
      testCaseChangePercentage,
      currentDatabaseTables,
      enhancedDatabaseTables,
      newDatabaseTables,
      databaseChangeText,
      databaseChangeClass,
      currentTestTypesCovered,
      enhancedTestTypesCovered,
      newTestTypes,
      testTypeChangeText,
      testTypeChangeClass,
      currentTotalSteps,
      enhancedTotalSteps,
      stepsChangeText,
      stepsChangeClass,
      currentAvgSteps,
      enhancedAvgSteps,
      currentTestDataCoverage,
      enhancedTestDataCoverage,
      existingTestCasesPercentage,
      generatedTestCasesPercentage,
      canProceed,
      getNextButtonText,
      getNextButtonIcon,

      // Methods
      toggleRequirement,
      selectAllRequirements,
      getExistingTestCasesCount,
      generateTestCases,
      regenerateTestCases,
      handleNext,
      handleBack,
      handleFinish,
      viewTestCases,
      generateMore,
    }
  },
}
</script>

<style scoped>
/* Base Modal Styles */
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
  padding: 20px;
}

.modal-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.enhance-modal {
  min-height: 600px;
}

/* Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px 32px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
  color: white;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-content .material-symbols-outlined {
  font-size: 2rem;
}

.header-text h2 {
  margin: 0 0 4px 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.header-text p {
  margin: 0;
  opacity: 0.9;
  font-size: 0.875rem;
}

.close-button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  color: white;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Progress Steps */
.progress-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 32px;
  background: #f7fafc;
  border-bottom: 1px solid #e2e8f0;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 100px;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e2e8f0;
  color: #718096;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

.step.active .step-number {
  background: #1a365d;
  color: white;
  box-shadow: 0 4px 12px rgba(26, 54, 93, 0.4);
}

.step.completed .step-number {
  background: #38a169;
  color: white;
}

.step-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #718096;
  text-align: center;
}

.step.active .step-label {
  color: #1a365d;
  font-weight: 600;
}

.step-connector {
  flex: 1;
  height: 2px;
  background: #e2e8f0;
  margin: 0 16px;
  transition: background 0.3s ease;
}

.step-connector.completed {
  background: #38a169;
}

/* Step Content */
.step-content {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
}

.section-header {
  margin-bottom: 24px;
}

.section-header h3 {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
}

.section-header p {
  margin: 0;
  color: #718096;
  font-size: 0.875rem;
}

/* Requirements Selection */
.requirements-selection {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 24px;
}

.selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f7fafc;
  border-bottom: 1px solid #e2e8f0;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 300px;
}

.search-box .material-symbols-outlined {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #a0aec0;
  font-size: 1.1rem;
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 40px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
}

.selection-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-text {
  background: none;
  border: none;
  color: #1a365d;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.btn-text:hover {
  background: rgba(26, 54, 93, 0.1);
}

.selection-count {
  font-size: 0.875rem;
  color: #718096;
  font-weight: 500;
}

.requirements-list {
  max-height: 300px;
  overflow-y: auto;
}

.requirement-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  transition: background 0.2s ease;
  gap: 12px;
}

.requirement-item:hover {
  background: #f7fafc;
}

.requirement-item.selected {
  background: rgba(26, 54, 93, 0.05);
  border-left: 3px solid #1a365d;
}

.requirement-checkbox {
  flex-shrink: 0;
}

.checkbox-icon {
  color: #a0aec0;
  font-size: 1.25rem;
  transition: color 0.2s ease;
}

.checkbox-icon.checked {
  color: #1a365d;
}

.requirement-content {
  flex: 1;
  min-width: 0;
}

.requirement-name {
  font-weight: 500;
  color: #2d3748;
  margin-bottom: 4px;
}

.requirement-desc {
  font-size: 0.875rem;
  color: #718096;
  margin-bottom: 8px;
  line-height: 1.4;
}

.requirement-meta {
  display: flex;
  gap: 8px;
}

.meta-tag {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.meta-tag.type {
  background: #bee3f8;
  color: #1a365d;
}

.meta-tag.priority {
  background: #fef3c7;
  color: #92400e;
}

.meta-tag.priority.high {
  background: #fed7d7;
  color: #c53030;
}

.meta-tag.priority.low {
  background: #c6f6d5;
  color: #276749;
}

.existing-testcases {
  flex-shrink: 0;
}

.testcase-count {
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 12px;
  background: #f7fafc;
  color: #718096;
}

.testcase-count.none {
  background: #fef3c7;
  color: #92400e;
}

.empty-requirements {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #a0aec0;
}

.empty-requirements .material-symbols-outlined {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

/* Coverage Summary */
.coverage-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.summary-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: #bee3f8;
  color: #1a365d;
  display: flex;
  align-items: center;
  justify-content: center;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2d3748;
  line-height: 1;
}

.summary-label {
  font-size: 0.875rem;
  color: #718096;
  margin-top: 4px;
}

/* Generation Options */
.generation-options {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
}

.generation-options h4 {
  margin: 0 0 16px 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #2d3748;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.option-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: background 0.2s ease;
}

.option-checkbox:hover {
  background: #f7fafc;
}

.option-checkbox input {
  display: none;
}

.checkmark {
  width: 18px;
  height: 18px;
  border: 2px solid #e2e8f0;
  border-radius: 4px;
  position: relative;
  transition: all 0.2s ease;
}

.option-checkbox input:checked + .checkmark {
  background: #1a365d;
  border-color: #1a365d;
}

.option-checkbox input:checked + .checkmark::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.option-label {
  font-size: 0.875rem;
  color: #2d3748;
}

/* Generation Prompt */
.generation-prompt {
  margin-bottom: 24px;
}

.prompt-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: #ebf8ff;
  border: 1px solid #bee3f8;
  border-radius: 8px;
}

.prompt-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background: #3182ce;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.prompt-content h4 {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
}

.prompt-content p {
  margin: 0 0 16px 0;
  color: #718096;
}

.generate-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* Generation Progress */
.generation-progress {
  margin-bottom: 24px;
}

.progress-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(135deg, #f0fff4 0%, #e6fffa 100%);
  border: 1px solid #9ae6b4;
  border-radius: 8px;
}

.progress-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background: #38a169;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-content h4 {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
}

.progress-content p {
  margin: 0 0 16px 0;
  color: #718096;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #38a169, #48bb78);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-stats {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: #718096;
}

/* Comparison Tabs */
.comparison-tabs {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.tab-buttons {
  display: flex;
  background: #f7fafc;
  border-bottom: 1px solid #e2e8f0;
}

.tab-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 20px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  color: #718096;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button.active {
  color: #1a365d;
  border-bottom-color: #1a365d;
  background: white;
}

.tab-button:hover:not(.active) {
  background: rgba(26, 54, 93, 0.05);
}

.tab-content {
  padding: 24px;
}

/* Preview Tab */
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.preview-header h4 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
}

.testcases-preview {
  max-height: 400px;
  overflow-y: auto;
}

.testcase-preview-item {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.testcase-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.testcase-title-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.testcase-title {
  font-weight: 600;
  color: #2d3748;
  line-height: 1.4;
}

.testcase-badge.new {
  background: #38a169;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.testcase-meta {
  display: flex;
  gap: 8px;
}

.testcase-type,
.testcase-priority {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.testcase-type {
  background: #bee3f8;
  color: #1a365d;
}

.testcase-priority.high {
  background: #fed7d7;
  color: #c53030;
}

.testcase-priority.medium {
  background: #fef3c7;
  color: #92400e;
}

.testcase-priority.low {
  background: #c6f6d5;
  color: #276749;
}

.testcase-content {
  space-y: 12px;
}

.testcase-desc {
  color: #718096;
  font-size: 0.875rem;
  line-height: 1.4;
  margin-bottom: 12px;
}

.testcase-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.detail-label {
  font-weight: 500;
  color: #4a5568;
  font-size: 0.875rem;
}

.detail-value {
  color: #718096;
  font-size: 0.875rem;
}

.steps-preview {
  border-top: 1px solid #e2e8f0;
  padding-top: 12px;
}

.steps-header {
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 8px;
  font-size: 0.875rem;
}

.steps-list {
  space-y: 6px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-number {
  width: 20px;
  height: 20px;
  background: #e2e8f0;
  color: #4a5568;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.step-action {
  color: #718096;
  font-size: 0.875rem;
  line-height: 1.4;
}

.step-more {
  color: #a0aec0;
  font-size: 0.75rem;
  font-style: italic;
  margin-left: 28px;
}

/* Comparison Tab */
.comparison-tab {
  padding: 0;
}

.comparison-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #f7fafc;
  border-bottom: 1px solid #e2e8f0;
}

.comparison-stats-quick {
  display: flex;
  gap: 20px;
}

.quick-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 0.75rem;
  color: #718096;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #2d3748;
}

.stat-value.positive {
  color: #38a169;
}

.stat-value.total {
  color: #3182ce;
}

.comparison-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  min-height: 500px;
}

.column {
  padding: 20px;
  overflow-y: auto;
}

.before-column {
  background: #f7fafc;
  border-right: 1px solid #e2e8f0;
}

.after-column {
  background: linear-gradient(135deg, #f0fff4 0%, #e6fffa 100%);
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.column-header h5 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #2d3748;
}

.column-badge {
  padding: 4px 8px;
  background: #e2e8f0;
  color: #4a5568;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.column-badge.new {
  background: #38a169;
  color: white;
}

.testcase-comparison-list {
  space-y: 8px;
  margin-bottom: 20px;
}

.comparison-testcase {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
  position: relative;
}

.comparison-testcase.existing {
  border-left: 3px solid #e2e8f0;
}

.comparison-testcase.existing-dimmed {
  border-left: 3px solid #e2e8f0;
  opacity: 0.6;
}

.comparison-testcase.new {
  border-left: 3px solid #38a169;
  background: #f0fff4;
}

.testcase-title {
  font-weight: 500;
  color: #2d3748;
  margin-bottom: 6px;
  line-height: 1.3;
  font-size: 0.875rem;
}

.testcase-meta-compact {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.testcase-type,
.testcase-steps {
  font-size: 0.75rem;
  color: #718096;
}

.testcase-requirements {
  font-size: 0.7rem;
  color: #a0aec0;
  font-style: italic;
}

.testcase-requirements.new {
  color: #38a169;
  font-weight: 500;
}

.new-indicator {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #38a169;
  color: white;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 0.6rem;
  font-weight: 700;
}

.more-items {
  text-align: center;
  padding: 8px;
  color: #a0aec0;
  font-size: 0.75rem;
  font-style: italic;
}

.more-items.new {
  color: #38a169;
  font-weight: 500;
}

.coverage-summary-compact {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
}

.coverage-summary-compact.enhanced {
  background: #e6fffa;
  border-color: #81e6d9;
}

.coverage-summary-compact h6 {
  margin: 0 0 8px 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #2d3748;
}

.coverage-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.coverage-stat {
  text-align: center;
}

.coverage-value {
  display: block;
  font-size: 1.125rem;
  font-weight: 700;
  color: #2d3748;
  line-height: 1;
}

.coverage-label {
  font-size: 0.7rem;
  color: #718096;
  margin-top: 2px;
}

.coverage-diff {
  font-size: 0.6rem;
  font-weight: 600;
  margin-top: 2px;
}

.coverage-diff.positive {
  color: #38a169;
}

/* Coverage Tab */
.coverage-tab {
  padding: 0;
}

.coverage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #f7fafc;
  border-bottom: 1px solid #e2e8f0;
}

.coverage-overview {
  display: flex;
  gap: 16px;
}

.overview-card {
  text-align: center;
  padding: 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  min-width: 120px;
}

.overview-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #38a169;
  line-height: 1;
}

.overview-label {
  font-size: 0.75rem;
  color: #718096;
  margin-top: 4px;
}

.coverage-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 20px;
}

.coverage-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
}

.coverage-card h5 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
}

.coverage-progress {
  space-y: 8px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #718096;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 4px;
}

.progress-fill.before {
  background: #a0aec0;
  z-index: 1;
}

.progress-fill.after {
  background: #38a169;
  z-index: 2;
}

.progress-improvement {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
}

.improvement-value {
  color: #2d3748;
  font-weight: 500;
}

.improvement-percent {
  color: #38a169;
  font-weight: 600;
}

.coverage-metrics {
  space-y: 8px;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.metric-label {
  font-size: 0.875rem;
  color: #4a5568;
}

.metric-values {
  display: flex;
  align-items: center;
  gap: 4px;
}

.metric-before,
.metric-after {
  font-size: 0.875rem;
  font-weight: 500;
}

.metric-before {
  color: #718096;
}

.metric-after {
  color: #2d3748;
}

.metric-arrow {
  color: #a0aec0;
}

.metric-diff {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 4px;
}

.metric-diff.positive {
  background: #c6f6d5;
  color: #276749;
}

.metric-new-tables {
  font-size: 0.75rem;
  color: #718096;
  font-style: italic;
}

.types-comparison {
  space-y: 8px;
}

.types-before,
.types-after {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.types-label {
  font-size: 0.75rem;
  color: #718096;
  min-width: 50px;
  padding-top: 2px;
}

.types-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.type-tag {
  padding: 2px 6px;
  background: #e2e8f0;
  color: #4a5568;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 500;
}

.type-tag.existing {
  background: #bee3f8;
  color: #1a365d;
}

.type-tag.new {
  background: #c6f6d5;
  color: #276749;
}

.enterprise-metrics {
  space-y: 6px;
}

.enterprise-metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.metric-name {
  font-size: 0.875rem;
  color: #4a5568;
}

.metric-value {
  display: flex;
  align-items: center;
  gap: 4px;
}

.value-before,
.value-after {
  font-size: 0.875rem;
  font-weight: 500;
}

.value-before {
  color: #718096;
}

.value-after {
  color: #2d3748;
}

.value-arrow {
  color: #a0aec0;
}

.value-diff {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 4px;
}

.value-diff.positive {
  background: #c6f6d5;
  color: #276749;
}

/* Confirmation Content */
.confirmation-content {
  text-align: center;
  padding: 40px 20px;
}

.success-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #c6f6d5;
  color: #38a169;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

.success-icon .material-symbols-outlined {
  font-size: 3rem;
}

.confirmation-content h3 {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #2d3748;
}

.confirmation-content p {
  margin: 0 0 32px 0;
  color: #718096;
  font-size: 1rem;
}

.enhancement-results {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.result-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
}

.result-card.success {
  background: #c6f6d5;
  border: 1px solid #38a169;
}

.result-card.info {
  background: #bee3f8;
  border: 1px solid #3182ce;
}

.result-card.warning {
  background: #fef3c7;
  border: 1px solid #d69e2e;
}

.result-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-card.success .result-icon {
  background: #38a169;
  color: white;
}

.result-card.info .result-icon {
  background: #3182ce;
  color: white;
}

.result-card.warning .result-icon {
  background: #d69e2e;
  color: white;
}

.result-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
}

.result-label {
  font-size: 0.875rem;
  color: #718096;
  margin-top: 4px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 24px;
}

/* Modal Footer */
.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  border-top: 1px solid #e2e8f0;
  background: #f7fafc;
}

.footer-actions {
  display: flex;
  gap: 12px;
}

.footer-primary {
  display: flex;
  gap: 12px;
}

.btn-primary,
.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
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
  background: #2d3748;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  background: #e2e8f0;
  color: #a0aec0;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: white;
  color: #2d3748;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  background: #f7fafc;
}

/* Loading Overlay */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-content {
  text-align: center;
  color: #2d3748;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top: 3px solid #1a365d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

.spinner.small {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid white;
  margin: 0;
}

.spinner.large {
  width: 60px;
  height: 60px;
  border-width: 4px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-content h3 {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.loading-content p {
  margin: 0;
  color: #718096;
  font-size: 0.875rem;
}

/* Responsive */
@media (max-width: 768px) {
  .modal-container {
    margin: 20px;
    max-height: calc(100vh - 40px);
  }

  .modal-header {
    padding: 20px 24px;
  }

  .step-content {
    padding: 24px;
  }

  .progress-steps {
    padding: 20px 24px;
  }

  .step {
    min-width: 80px;
  }

  .step-label {
    font-size: 0.7rem;
  }

  .comparison-columns {
    grid-template-columns: 1fr;
  }

  .before-column {
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }

  .coverage-grid {
    grid-template-columns: 1fr;
  }

  .tab-buttons {
    flex-direction: column;
  }

  .modal-footer {
    padding: 16px 24px;
    flex-direction: column;
    gap: 16px;
  }

  .footer-actions,
  .footer-primary {
    width: 100%;
    justify-content: center;
  }

  .action-buttons {
    flex-direction: column;
  }
}
.testcase-badge.enhanced {
  background: #d69e2e;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.stat-value.enhanced {
  color: #d69e2e;
}

.column-badge.enhanced {
  background: #d69e2e;
  color: white;
}

.comparison-testcase.enhanced {
  border-left: 3px solid #d69e2e;
  background: #fef3c7;
}

.testcase-requirements.enhanced {
  color: #d69e2e;
  font-weight: 500;
}

.enhanced-indicator {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #d69e2e;
  color: white;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 0.6rem;
  font-weight: 700;
}

.type-tag.enhanced {
  background: #fef3c7;
  color: #92400e;
}

.type-tag.none {
  background: #e2e8f0;
  color: #718096;
  font-style: italic;
}

.no-testcases {
  text-align: center;
  padding: 20px;
  color: #a0aec0;
  font-style: italic;
}

.coverage-diff.negative {
  color: #e53e3e;
}

.coverage-diff.neutral {
  color: #718096;
}

.value-diff.negative {
  background: #fed7d7;
  color: #c53030;
}

.value-diff.neutral {
  background: #e2e8f0;
  color: #718096;
}
.testcase-badge.enhanced {
  background: #d69e2e;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.stat-value.enhanced {
  color: #d69e2e;
}

.column-badge.enhanced {
  background: #d69e2e;
  color: white;
}

.comparison-testcase.enhanced {
  border-left: 3px solid #d69e2e;
  background: #fef3c7;
}

.testcase-requirements.enhanced {
  color: #d69e2e;
  font-weight: 500;
}

.enhanced-indicator {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #d69e2e;
  color: white;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 0.6rem;
  font-weight: 700;
}

.type-tag.enhanced {
  background: #fef3c7;
  color: #92400e;
}

.type-tag.none {
  background: #e2e8f0;
  color: #718096;
  font-style: italic;
}

.no-testcases {
  text-align: center;
  padding: 20px;
  color: #a0aec0;
  font-style: italic;
}

.coverage-diff.negative {
  color: #e53e3e;
}

.coverage-diff.neutral {
  color: #718096;
}

.value-diff.negative {
  background: #fed7d7;
  color: #c53030;
}

.value-diff.neutral {
  background: #e2e8f0;
  color: #718096;
}
</style>