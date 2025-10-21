<template>
  <div v-if="show" class="modal-overlay" @click="close">
    <div class="modal-content" @click.stop>
      <!-- Header -->
      <div class="modal-header">
        <div class="header-content">
          <h2>{{ isEditing ? 'Edit Use Case' : 'Create New Use Case' }}</h2>
          <p class="subtitle">
            {{
              isEditing
                ? 'Update the details of this use case'
                : 'Define a new use case for your system'
            }}
          </p>
        </div>
        <button class="close-btn" @click="close" aria-label="Close modal">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Progress indicator for multi-step form -->
      <div class="progress-indicator" v-if="useSteps">
        <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
          <span class="step-number">1</span>
          <span class="step-label">Basic Info</span>
        </div>
        <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
          <span class="step-number">2</span>
          <span class="step-label">Details</span>
        </div>
        <div class="step" :class="{ active: currentStep === 3 }">
          <span class="step-number">3</span>
          <span class="step-label">Review</span>
        </div>
      </div>

      <!-- Form Content -->
      <form @submit.prevent="submitForm" class="usecase-form">
        <!-- Step 1: Basic Information -->
        <div v-if="!useSteps || currentStep === 1" class="form-step">
          <div class="step-header">
            <h3>Basic Information</h3>
            <p>Define the core elements of your use case</p>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label for="name" class="required">Use Case Name</label>
              <input
                id="name"
                v-model="localForm.name"
                type="text"
                required
                placeholder="e.g., User Login"
                :class="{ error: fieldErrors.name }"
                @blur="validateField('name')"
              />
              <div v-if="fieldErrors.name" class="error-message">{{ fieldErrors.name }}</div>
            </div>

            <div class="form-group">
              <label for="role" class="required">Role</label>
              <input
                id="role"
                v-model="localForm.role"
                type="text"
                required
                placeholder="e.g., User, Admin, System"
                :class="{ error: fieldErrors.role }"
                @blur="validateField('role')"
              />
              <div v-if="fieldErrors.role" class="error-message">{{ fieldErrors.role }}</div>
            </div>

            <div class="form-group span-2">
              <label for="goal" class="required">Goal</label>
              <textarea
                id="goal"
                v-model="localForm.goal"
                required
                placeholder="What is the main objective this use case accomplishes?"
                rows="3"
                :class="{ error: fieldErrors.goal }"
                @blur="validateField('goal')"
              ></textarea>
              <div v-if="fieldErrors.goal" class="error-message">{{ fieldErrors.goal }}</div>
            </div>

            <div class="form-group span-2">
              <label for="reason" class="required">Reason</label>
              <textarea
                id="reason"
                v-model="localForm.reason"
                required
                placeholder="Why is this use case needed? What problem does it solve?"
                rows="3"
                :class="{ error: fieldErrors.reason }"
                @blur="validateField('reason')"
              ></textarea>
              <div v-if="fieldErrors.reason" class="error-message">{{ fieldErrors.reason }}</div>
            </div>

            <div class="form-group">
              <label for="priority" class="required">Priority</label>
              <div class="priority-selector">
                <button
                  type="button"
                  class="priority-option"
                  :class="{ active: localForm.priority === 'high' }"
                  @click="localForm.priority = 'high'"
                >
                  <span class="priority-indicator high"></span>
                  High
                </button>
                <button
                  type="button"
                  class="priority-option"
                  :class="{ active: localForm.priority === 'medium' }"
                  @click="localForm.priority = 'medium'"
                >
                  <span class="priority-indicator medium"></span>
                  Medium
                </button>
                <button
                  type="button"
                  class="priority-option"
                  :class="{ active: localForm.priority === 'low' }"
                  @click="localForm.priority = 'low'"
                >
                  <span class="priority-indicator low"></span>
                  Low
                </button>
              </div>
            </div>

            <div class="form-group span-2">
              <label for="context">Context</label>
              <textarea
                id="context"
                v-model="localForm.context"
                placeholder="Describe the situation or environment where this use case occurs"
                rows="2"
              ></textarea>
              <div class="field-help">Optional: Helps understand the circumstances</div>
            </div>
          </div>
        </div>

        <!-- Step 2: Detailed Information -->
        <div v-if="!useSteps || currentStep === 2" class="form-step">
          <div class="step-header">
            <h3>Process & Requirements</h3>
            <p>Define the flow, inputs, outputs, and constraints</p>
          </div>

          <div class="form-grid">
            <!-- Main Flow -->
            <div class="form-group span-3">
              <label class="required">Main Flow (Tasks)</label>
              <div class="array-input">
                <div v-for="(task, index) in localForm.tasks" :key="index" class="array-item">
                  <div class="step-number">{{ index + 1 }}</div>
                  <input
                    v-model="localForm.tasks[index]"
                    type="text"
                    placeholder="Describe a step in the main flow"
                    required
                    :class="{ error: fieldErrors.tasks && fieldErrors.tasks[index] }"
                    @blur="validateTasks()"
                  />
                  <button
                    type="button"
                    class="remove-item-btn"
                    @click="removeArrayItem('tasks', index)"
                    :disabled="localForm.tasks.length <= 1"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button type="button" class="add-item-btn" @click="addArrayItem('tasks')">
                  <span class="material-symbols-outlined">add</span>
                  Add Step
                </button>
              </div>
              <div v-if="fieldErrors.tasks" class="error-message">
                At least one task step is required
              </div>
            </div>

            <!-- Inputs & Outputs -->
            <div class="form-group">
              <label>Inputs</label>
              <div class="array-input">
                <div v-for="(input, index) in localForm.inputs" :key="index" class="array-item">
                  <input
                    v-model="localForm.inputs[index]"
                    type="text"
                    placeholder="Data or trigger required"
                  />
                  <button
                    type="button"
                    class="remove-item-btn"
                    @click="removeArrayItem('inputs', index)"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button type="button" class="add-item-btn" @click="addArrayItem('inputs')">
                  <span class="material-symbols-outlined">add</span>
                  Add Input
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>Outputs</label>
              <div class="array-input">
                <div v-for="(output, index) in localForm.outputs" :key="index" class="array-item">
                  <input
                    v-model="localForm.outputs[index]"
                    type="text"
                    placeholder="Result or data produced"
                  />
                  <button
                    type="button"
                    class="remove-item-btn"
                    @click="removeArrayItem('outputs', index)"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button type="button" class="add-item-btn" @click="addArrayItem('outputs')">
                  <span class="material-symbols-outlined">add</span>
                  Add Output
                </button>
              </div>
            </div>

            <!-- Conditions -->
            <div class="form-group">
              <label>Preconditions</label>
              <div class="array-input">
                <div
                  v-for="(precondition, index) in localForm.preconditions"
                  :key="index"
                  class="array-item"
                >
                  <input
                    v-model="localForm.preconditions[index]"
                    type="text"
                    placeholder="Condition that must be true before"
                  />
                  <button
                    type="button"
                    class="remove-item-btn"
                    @click="removeArrayItem('preconditions', index)"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button type="button" class="add-item-btn" @click="addArrayItem('preconditions')">
                  <span class="material-symbols-outlined">add</span>
                  Add Precondition
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>Postconditions</label>
              <div class="array-input">
                <div
                  v-for="(postcondition, index) in localForm.postconditions"
                  :key="index"
                  class="array-item"
                >
                  <input
                    v-model="localForm.postconditions[index]"
                    type="text"
                    placeholder="State after completion"
                  />
                  <button
                    type="button"
                    class="remove-item-btn"
                    @click="removeArrayItem('postconditions', index)"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button type="button" class="add-item-btn" @click="addArrayItem('postconditions')">
                  <span class="material-symbols-outlined">add</span>
                  Add Postcondition
                </button>
              </div>
            </div>

            <!-- Triggers & Exceptions -->
            <div class="form-group">
              <label>Triggers</label>
              <div class="array-input">
                <div v-for="(trigger, index) in localForm.triggers" :key="index" class="array-item">
                  <input
                    v-model="localForm.triggers[index]"
                    type="text"
                    placeholder="Event that starts the use case"
                  />
                  <button
                    type="button"
                    class="remove-item-btn"
                    @click="removeArrayItem('triggers', index)"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button type="button" class="add-item-btn" @click="addArrayItem('triggers')">
                  <span class="material-symbols-outlined">add</span>
                  Add Trigger
                </button>
              </div>
            </div>

            <div class="form-group span-2">
              <label>Exceptions (Alternate Flows)</label>
              <div class="array-input">
                <div
                  v-for="(exception, index) in localForm.exceptions"
                  :key="index"
                  class="array-item"
                >
                  <input
                    v-model="localForm.exceptions[index]"
                    type="text"
                    placeholder="What happens when things go wrong"
                  />
                  <button
                    type="button"
                    class="remove-item-btn"
                    @click="removeArrayItem('exceptions', index)"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button type="button" class="add-item-btn" @click="addArrayItem('exceptions')">
                  <span class="material-symbols-outlined">add</span>
                  Add Exception
                </button>
              </div>
            </div>

            <!-- Rules & Constraints -->
            <div class="form-group span-2">
              <label>Business Rules</label>
              <div class="array-input">
                <div v-for="(rule, index) in localForm.rules" :key="index" class="array-item">
                  <input
                    v-model="localForm.rules[index]"
                    type="text"
                    placeholder="Rule that governs this use case"
                  />
                  <button
                    type="button"
                    class="remove-item-btn"
                    @click="removeArrayItem('rules', index)"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button type="button" class="add-item-btn" @click="addArrayItem('rules')">
                  <span class="material-symbols-outlined">add</span>
                  Add Business Rule
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>Constraints</label>
              <div class="array-input">
                <div
                  v-for="(constraint, index) in localForm.constraints"
                  :key="index"
                  class="array-item"
                >
                  <input
                    v-model="localForm.constraints[index]"
                    type="text"
                    placeholder="Limitation or restriction"
                  />
                  <button
                    type="button"
                    class="remove-item-btn"
                    @click="removeArrayItem('constraints', index)"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button type="button" class="add-item-btn" @click="addArrayItem('constraints')">
                  <span class="material-symbols-outlined">add</span>
                  Add Constraint
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Relationships & Review -->
        <div v-if="!useSteps || currentStep === 3" class="form-step">
          <div class="step-header">
            <h3>Relationships & Review</h3>
            <p>Connect to stakeholders and related use cases</p>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>Stakeholders</label>
              <div class="array-input">
                <div
                  v-for="(stakeholder, index) in localForm.stakeholders"
                  :key="index"
                  class="array-item"
                >
                  <input
                    v-model="localForm.stakeholders[index]"
                    type="text"
                    placeholder="Person or role with interest"
                  />
                  <button
                    type="button"
                    class="remove-item-btn"
                    @click="removeArrayItem('stakeholders', index)"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button type="button" class="add-item-btn" @click="addArrayItem('stakeholders')">
                  <span class="material-symbols-outlined">add</span>
                  Add Stakeholder
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>Related Use Cases</label>
              <div class="array-input">
                <div
                  v-for="(relatedId, index) in localForm.related_usecases"
                  :key="index"
                  class="array-item"
                >
                  <select
                    v-model="localForm.related_usecases[index]"
                    class="related-usecase-select"
                  >
                    <option value="">Select a use case</option>
                    <option
                      v-for="usecase in availableUseCases"
                      :key="usecase.id"
                      :value="usecase.id"
                      :disabled="
                        isCurrentUseCase(usecase.id) || isAlreadySelected(usecase.id, index)
                      "
                    >
                      {{ usecase.id }} - {{ usecase.name }}
                    </option>
                  </select>
                  <button
                    type="button"
                    class="remove-item-btn"
                    @click="removeArrayItem('related_usecases', index)"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button
                  type="button"
                  class="add-item-btn"
                  @click="addArrayItem('related_usecases')"
                  :disabled="!hasAvailableUseCases"
                >
                  <span class="material-symbols-outlined">add</span>
                  Add Related Use Case
                </button>
                <div v-if="!hasAvailableUseCases" class="field-help">
                  No more use cases available to add
                </div>
              </div>
            </div>

            <div class="form-group span-2">
              <label for="feedback">Feedback & Notes</label>
              <textarea
                id="feedback"
                v-model="localForm.feedback"
                placeholder="Any additional notes, feedback, or comments about this use case"
                rows="3"
              ></textarea>
            </div>

            <!-- Review Section (only in step 3) -->
            <div v-if="useSteps && currentStep === 3" class="form-group span-3">
              <div class="review-section">
                <h4>Review Your Use Case</h4>
                <div class="review-grid">
                  <div class="review-item">
                    <span class="review-label">Name:</span>
                    <span class="review-value">{{ localForm.name || 'Not provided' }}</span>
                  </div>
                  <div class="review-item">
                    <span class="review-label">Role:</span>
                    <span class="review-value">{{ localForm.role || 'Not provided' }}</span>
                  </div>
                  <div class="review-item">
                    <span class="review-label">Priority:</span>
                    <span class="review-value priority-tag" :class="localForm.priority">
                      {{ localForm.priority || 'Not set' }}
                    </span>
                  </div>
                  <div class="review-item span-2">
                    <span class="review-label">Goal:</span>
                    <span class="review-value">{{ localForm.goal || 'Not provided' }}</span>
                  </div>
                  <div class="review-item">
                    <span class="review-label">Tasks:</span>
                    <span class="review-value"
                      >{{ localForm.tasks.filter((t) => t.trim()).length }} steps</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <div class="action-left">
            <button
              v-if="useSteps && currentStep > 1"
              type="button"
              class="secondary-btn"
              @click="previousStep"
              :disabled="submitting"
            >
              <span class="material-symbols-outlined">arrow_back</span>
              Previous
            </button>
          </div>

          <div class="action-right">
            <button type="button" class="secondary-btn" @click="close" :disabled="submitting">
              Cancel
            </button>

            <button
              v-if="useSteps && currentStep < 3"
              type="button"
              class="primary-btn"
              @click="nextStep"
              :disabled="!canProceedToNextStep"
            >
              Next
              <span class="material-symbols-outlined">arrow_forward</span>
            </button>

            <button v-else type="submit" class="primary-btn" :disabled="submitting || !isFormValid">
              <span v-if="submitting" class="loading-spinner"></span>
              {{ submitting ? 'Saving...' : isEditing ? 'Update Use Case' : 'Create Use Case' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AddEditUseCaseModal',
  props: {
    show: {
      type: Boolean,
      required: true,
    },
    isEditing: {
      type: Boolean,
      default: false,
    },
    usecaseData: {
      type: Object,
      default: () => ({}),
    },
    submitting: {
      type: Boolean,
      default: false,
    },
    useSteps: {
      type: Boolean,
      default: true, // Enable multi-step form for better UX with complex forms
    },
    availableUseCases: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      localForm: this.getEmptyForm(),
      currentStep: 1,
      fieldErrors: {},
    }
  },
  computed: {
    isFormValid() {
      // Check required fields
      const requiredFields = ['name', 'role', 'goal', 'reason']
      for (const field of requiredFields) {
        if (!this.localForm[field]?.trim()) return false
      }

      // Check tasks
      if (
        !Array.isArray(this.localForm.tasks) ||
        this.localForm.tasks.length === 0 ||
        !this.localForm.tasks[0]?.trim()
      ) {
        return false
      }

      return true
    },
    canProceedToNextStep() {
      // Validate current step before proceeding
      if (this.currentStep === 1) {
        const step1Fields = ['name', 'role', 'goal', 'reason']
        return step1Fields.every((field) => this.localForm[field]?.trim())
      } else if (this.currentStep === 2) {
        return (
          Array.isArray(this.localForm.tasks) &&
          this.localForm.tasks.length > 0 &&
          this.localForm.tasks[0]?.trim()
        )
      }
      return true
    },
    hasAvailableUseCases() {
      if (!this.availableUseCases.length) return false

      const currentSelected = this.localForm.related_usecases.filter((id) => id)
      return currentSelected.length < this.availableUseCases.length - (this.isEditing ? 1 : 0)
    },
  },
  watch: {
    usecaseData: {
      handler(newData) {
        if (newData && Object.keys(newData).length > 0) {
          this.localForm = { ...this.getEmptyForm(), ...newData }
        } else {
          this.localForm = this.getEmptyForm()
        }
        // Reset step when opening with new data
        this.currentStep = 1
        this.fieldErrors = {}
      },
      immediate: true,
    },
  },
  methods: {
    close() {
      this.$emit('close')
      // Reset form state when closing
      this.currentStep = 1
      this.fieldErrors = {}
    },

    submitForm() {
      if (this.isEditing && !this.localForm.id) {
        console.warn('⚠️ No usecase ID provided — skipping submit.')
        return
      }

      // Final validation
      if (!this.validateForm()) {
        // If using steps and there are errors, go to the first step with errors
        if (this.useSteps) {
          if (
            !this.localForm.name?.trim() ||
            !this.localForm.role?.trim() ||
            !this.localForm.goal?.trim() ||
            !this.localForm.reason?.trim()
          ) {
            this.currentStep = 1
          } else if (
            !Array.isArray(this.localForm.tasks) ||
            this.localForm.tasks.length === 0 ||
            !this.localForm.tasks[0]?.trim()
          ) {
            this.currentStep = 2
          }
        }
        return
      }

      // Clean data
      const cleanedForm = this.cleanFormData()
      if (!this.isEditing) {
        delete cleanedForm.id
      }
      console.log('📤 Data being sent to BE:', JSON.stringify(cleanedForm, null, 2))
      console.log('✅ Submitting form with ID:', cleanedForm.id)
      this.$emit('submit', cleanedForm)
    },

    validateForm() {
      this.fieldErrors = {}

      // Required fields
      const requiredFields = [
        { key: 'name', label: 'Use Case Name' },
        { key: 'role', label: 'Role' },
        { key: 'goal', label: 'Goal' },
        { key: 'reason', label: 'Reason' },
      ]

      for (const field of requiredFields) {
        if (!this.localForm[field.key]?.trim()) {
          this.fieldErrors[field.key] = `${field.label} is required`
        }
      }

      // Tasks validation
      if (
        !Array.isArray(this.localForm.tasks) ||
        this.localForm.tasks.length === 0 ||
        !this.localForm.tasks[0]?.trim()
      ) {
        this.fieldErrors.tasks = 'At least one task is required'
      }

      return Object.keys(this.fieldErrors).length === 0
    },

    validateField(fieldName) {
      if (fieldName === 'tasks') {
        this.validateTasks()
        return
      }

      const requiredFields = ['name', 'role', 'goal', 'reason']
      if (requiredFields.includes(fieldName) && !this.localForm[fieldName]?.trim()) {
        this.fieldErrors[fieldName] = 'This field is required'
      } else {
        delete this.fieldErrors[fieldName]
      }
    },

    validateTasks() {
      if (
        !Array.isArray(this.localForm.tasks) ||
        this.localForm.tasks.length === 0 ||
        !this.localForm.tasks[0]?.trim()
      ) {
        this.fieldErrors.tasks = 'At least one task is required'
      } else {
        delete this.fieldErrors.tasks
      }
    },

    cleanFormData() {
      const cleanedForm = { ...this.localForm }

      // Clean array fields - đảm bảo luôn là array
      const arrayFields = [
        'tasks',
        'inputs',
        'outputs',
        'preconditions',
        'postconditions',
        'triggers',
        'rules',
        'constraints',
        'exceptions',
        'stakeholders',
        'related_usecases',
      ]

      arrayFields.forEach((field) => {
        if (!Array.isArray(cleanedForm[field])) {
          cleanedForm[field] = []
        } else {
          cleanedForm[field] = cleanedForm[field]
            .map((item) => (typeof item === 'string' ? item.trim() : item))
            .filter((item) => item && item !== '')
        }
      })

      // Đảm bảo tasks có ít nhất một item
      if (cleanedForm.tasks.length === 0) {
        cleanedForm.tasks = ['']
      }

      // Đảm bảo context có giá trị mặc định nếu empty
      if (!cleanedForm.context || cleanedForm.context.trim() === '') {
        cleanedForm.context = ''
      }

      // Đảm bảo feedback có giá trị phù hợp
      if (!cleanedForm.feedback || cleanedForm.feedback.trim() === '') {
        cleanedForm.feedback = null // hoặc '' tùy BE xử lý
      }

      // Đảm bảo priority hợp lệ
      if (!['low', 'medium', 'high'].includes(cleanedForm.priority)) {
        cleanedForm.priority = 'medium'
      }

      return cleanedForm
    },

    nextStep() {
      if (this.currentStep < 3) {
        // Validate current step before proceeding
        if (this.currentStep === 1 && !this.canProceedToNextStep) {
          this.validateForm() // This will set fieldErrors
          return
        }
        this.currentStep++
      }
    },

    previousStep() {
      if (this.currentStep > 1) {
        this.currentStep--
      }
    },

    addArrayItem(field) {
      if (!this.localForm[field]) {
        this.localForm[field] = []
      }
      this.localForm[field].push('')
    },

    removeArrayItem(field, index) {
      if (this.localForm[field] && this.localForm[field].length > 1) {
        this.localForm[field].splice(index, 1)
      } else if (field !== 'tasks') {
        // For non-required arrays, we can empty them
        this.localForm[field] = []
      } else {
        // For tasks, we always need at least one
        this.localForm[field] = ['']
      }
    },

    getEmptyForm() {
      return {
        name: '',
        role: '',
        goal: '',
        reason: '',
        priority: 'medium',
        context: '',
        tasks: [''],
        inputs: [],
        outputs: [],
        preconditions: [],
        postconditions: [],
        triggers: [],
        rules: [],
        constraints: [],
        exceptions: [],
        stakeholders: [],
        related_usecases: [],
        feedback: '',
      }
    },

    // Kiểm tra xem use case có phải là use case hiện tại không
    isCurrentUseCase(usecaseId) {
      return this.isEditing && this.localForm.id === usecaseId
    },

    // Kiểm tra xem use case đã được chọn trong các mục khác chưa
    isAlreadySelected(usecaseId, currentIndex) {
      return this.localForm.related_usecases.some(
        (id, index) => index !== currentIndex && id === usecaseId
      )
    },
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
  padding: 20px;
  animation: fadeIn 0.2s ease-out;
}

.modal-content {
  position: relative;
  min-height: 650px;
  background: white;
  border-radius: 12px;
  max-width: 1000px;
  width: 100%;
  padding: 12px 0px;
  max-height: 90vh;
  overflow-y: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: slideUp 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  position: absolute;
  width: 100%;
  height: 80px;
  top: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #fafafa;
  border-radius: 12px 12px 0 0;
}
.header-content {
  padding-bottom: 12px;
}
.header-content h2 {
  margin: 0 0 4px 0;
  color: #111827;
  font-size: 1.5rem;
  font-weight: 600;
}

.subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.close-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 6px;
  color: #6b7280;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

/* Progress Indicator */
.progress-indicator {
  position: absolute;
  width: 100%;
  top: calc(15% - 20px);
  display: flex;
  padding: 8px 24px;
  border-bottom: 1px solid #b0b2b5;
  background: #f9fafb;
  z-index: 1;
}

.step {
  display: flex;
  align-items: center;
  padding: 12px 0;
  flex: 1;
  position: relative;
}

.step:not(:last-child):after {
  content: '';
  position: absolute;
  top: 50%;
  right: 0;
  width: 100%;
  height: 2px;
  background: #e5e7eb;
  z-index: 1;
}

.step.completed:not(:last-child):after {
  background: #10b981;
}

.step-number {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #f3f4f6;
  border: 2px solid #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  color: #6b7280;
  margin-right: 8px;
  z-index: 2;
  transition: all 0.3s;
}

.step.active .step-number {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.step.completed .step-number {
  background: #10b981;
  border-color: #10b981;
  color: white;
}

.step-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  transform: translatey(15px) translateX(-20%);
  transition: color 0.3s;
}

.step.active .step-label {
  color: #111827;
  font-weight: 600;
}

.step.completed .step-label {
  color: #10b981;
}

/* Form Steps */
.usecase-form {
  transform: translateY(40%);
  max-height: 300px;
  padding: 0;
}

.form-step {
  max-height: 450px;
  overflow-y: auto;
  padding: 24px;
}

.step-header {
  margin-bottom: 24px;
}

.step-header h3 {
  margin: 0 0 4px 0;
  color: #111827;
  font-size: 1.25rem;
  font-weight: 600;
}

.step-header p {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.span-2 {
  grid-column: span 2;
}

.form-group.span-3 {
  grid-column: span 3;
}

label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 4px;
}

label.required:after {
  content: '*';
  color: #ef4444;
}

input,
select,
textarea {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: all 0.2s;
  font-family: inherit;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

input.error,
textarea.error {
  border-color: #ef4444;
}

input.error:focus,
textarea.error:focus {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.error-message {
  color: #ef4444;
  font-size: 0.75rem;
  margin-top: 4px;
}

.field-help {
  color: #6b7280;
  font-size: 0.75rem;
  margin-top: 4px;
}

textarea {
  resize: vertical;
  min-height: 60px;
  line-height: 1.5;
}

/* Priority Selector */
.priority-selector {
  display: flex;
  gap: 8px;
}

.priority-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
}

.priority-option:hover {
  border-color: #9ca3af;
}

.priority-option.active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #1e40af;
  font-weight: 500;
}

.priority-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.priority-indicator.high {
  background: #ef4444;
}

.priority-indicator.medium {
  background: #f59e0b;
}

.priority-indicator.low {
  background: #10b981;
}

/* Array Inputs */
.array-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.array-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.array-item .step-number {
  width: 20px;
  height: 20px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  color: #6b7280;
  font-size: 0.625rem;
  flex-shrink: 0;
}

.array-item input {
  flex: 1;
  margin: 0;
}

.remove-item-btn,
.add-item-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.75rem;
  color: #6b7280;
}

.remove-item-btn:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.add-item-btn:hover {
  background: #f0f9ff;
  border-color: #bae6fd;
  color: #0369a1;
}

.remove-item-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.remove-item-btn:disabled:hover {
  background: white;
  border-color: #d1d5db;
  color: #6b7280;
}

/* Review Section */
.review-section {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
}

.review-section h4 {
  margin: 0 0 16px 0;
  color: #111827;
  font-size: 1rem;
  font-weight: 600;
}

.review-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.review-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.review-item.span-2 {
  grid-column: span 2;
}

.review-label {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}

.review-value {
  font-size: 0.875rem;
  color: #111827;
  line-height: 1.4;
}

.priority-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  width: fit-content;
}

.priority-tag.high {
  background: #fef2f2;
  color: #dc2626;
}

.priority-tag.medium {
  background: #fffbeb;
  color: #d97706;
}

.priority-tag.low {
  background: #f0fdf4;
  color: #059669;
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
  border-radius: 0 0 12px 12px;
}

.action-left,
.action-right {
  display: flex;
  gap: 12px;
}

.primary-btn,
.secondary-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.primary-btn {
  background: #1a365d;
  color: white;
}

.primary-btn:hover:not(:disabled) {
  background: #12337c;
}

.primary-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.secondary-btn {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.secondary-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.secondary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Loading Spinner */
.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Related Use Case Select */
.related-usecase-select {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: all 0.2s;
  font-family: inherit;
  background: white;
  flex: 1;
}

.related-usecase-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.related-usecase-select option:disabled {
  color: #9ca3af;
  background-color: #f3f4f6;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
  }

  .modal-content {
    max-height: 95vh;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-group.span-2,
  .form-group.span-3 {
    grid-column: span 1;
  }

  .priority-selector {
    flex-direction: column;
  }

  .form-actions {
    flex-direction: column-reverse;
    gap: 12px;
  }

  .action-left,
  .action-right {
    width: 100%;
  }

  .action-right {
    justify-content: space-between;
  }

  .progress-indicator {
    padding: 0 16px;
  }

  .step-label {
    display: none;
  }
}
</style>