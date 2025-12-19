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
                :value="roleName"
                @input="updateRoleName($event.target.value)"
                @blur="validateRoleName(roleName)"
                type="text"
                required
                placeholder="e.g., User, Admin, System"
                autocomplete="off"
                :class="{ error: fieldErrors.role, 'has-suggestion': showSuggestion }"
              />

              <!-- Gợi ý (không tự động áp dụng) -->
              <div v-if="showSuggestion" class="suggestion-banner">
                <span>Gợi ý: </span>
                <button type="button" class="suggestion-btn" @click="applySuggestion">
                  {{ suggestedRole }}
                </button>
                <span> (Nhấn để áp dụng)</span>
              </div>

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
                      :key="getUsecaseId(usecase)"
                      :value="getUsecaseId(usecase)"
                      :disabled="
                        isCurrentUseCase(getUsecaseId(usecase)) || isAlreadySelected(getUsecaseId(usecase), index)
                      "
                    >
                      {{ getUsecaseId(usecase) }} - {{ usecase.name }}
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
                    <span class="review-value">{{ localForm.role.name || 'Not provided' }}</span>
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
      originalForm: null, // Lưu dữ liệu ban đầu để so sánh
      currentStep: 1,
      fieldErrors: {},
      showSuggestion: false,
      suggestedRole: '',
    }
  },
  computed: {
    existingRoles() {
      const roles = this.availableUseCases.map((uc) => uc.role).filter(Boolean)
      const uniqueRoles = [...new Map(roles.map((role) => [role.id, role])).values()]
      return uniqueRoles
    },

    nextRoleId() {
      // ❌ CÓ THỂ XÓA vì BE đã xử lý
      // Hoặc giữ lại chỉ để hiển thị tạm thời
      return 'role_new' // Placeholder
    },
    roleName: {
      get() {
        return this.localForm.role?.name || ''
      },
      set(value) {
        if (!this.localForm.role) {
          this.localForm.role = { id: '', name: '' }
        }
        this.localForm.role.name = value
        // ❌ XÓA dòng này - để updateRoleName xử lý
        // this.localForm.role.id = `role_${value.toLowerCase().replace(/\s+/g, '_')}`
      },
    },
    isFormValid() {
      // Check required fields
      const requiredFields = ['name', 'role', 'goal', 'reason']
      for (const field of requiredFields) {
        if (field === 'role') {
          if (!this.localForm.role?.name?.trim()) return false
        } else if (!this.localForm[field]?.trim()) return false
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
        return step1Fields.every((field) => {
          if (field === 'role') {
            return this.localForm.role?.name?.trim()
          }
          return this.localForm[field]?.trim()
        })
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
    'localForm.role.name': {
      handler(newValue) {
        if (newValue && this.showSuggestion) {
          // Nếu user tự sửa đúng thì ẩn gợi ý
          const trimmed = newValue.trim()
          if (!/^[a-z]/.test(trimmed)) {
            this.showSuggestion = false
          }
        }
      },
      immediate: false,
    },
    usecaseData: {
      handler(newData) {
        if (newData && Object.keys(newData).length > 0) {
          const normalized = this.normalizeFormData(newData)
          this.localForm = { ...this.getEmptyForm(), ...normalized }
          // Lưu bản gốc đã được clean để so sánh chính xác khi submit
          // Sử dụng cleanFormData để đảm bảo format giống nhau
          this.originalForm = this.cleanFormDataForComparison(this.localForm)
        } else {
          this.localForm = this.getEmptyForm()
          this.originalForm = null
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
      this.originalForm = null
    },

    updateRoleName(value) {
      if (!this.localForm.role) {
        this.localForm.role = { id: '', name: '' }
      }
      this.localForm.role.name = value

      // ❌ XÓA logic tạo ID cũ - để BE xử lý
      // this.localForm.role.id = exactRole ? exactRole.id : this.nextRoleId

      this.validateRoleName(value)
    },

    submitForm() {
      if (this.isEditing && !this.localForm._id && !this.localForm.id) {
        console.warn('⚠️ No usecase ID provided — skipping submit.')
        return
      }

      // Final validation
      if (!this.validateForm()) {
        // If using steps and there are errors, go to the first step with errors
        if (this.useSteps) {
          if (
            !this.localForm.name?.trim() ||
            !this.localForm.role?.name?.trim() ||
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

      // Clean data and ensure role has proper structure
      const cleanedForm = this.cleanFormData()
      if (!this.isEditing) {
        delete cleanedForm.id
      }
      
      // Remove id field if _id exists (backend uses _id)
      if (cleanedForm._id && cleanedForm.id) {
        delete cleanedForm.id
      }

      // ✅ KIỂM TRA: Nếu đang edit và không có thay đổi, chỉ đóng modal
      if (this.isEditing && this.originalForm) {
        const originalCleaned = this.cleanFormDataForComparison(this.originalForm)
        const hasChanges = this.hasFormChanged(originalCleaned, cleanedForm)
        if (!hasChanges) {
          console.log('ℹ️ No changes detected, closing modal without API call')
          this.close()
          return
        }
      }
      
      console.log('📤 Data being sent to BE:', JSON.stringify(cleanedForm, null, 2))
      console.log('✅ Submitting form with ID:', cleanedForm._id || cleanedForm.id)

      // 🔥 FIX: Chỉ emit cleanedForm, không emit event object
      this.$emit('submit', cleanedForm)
    },

    applySuggestion() {
      this.roleName = this.suggestedRole
      this.showSuggestion = false
      // ✅ Cần gọi lại updateRoleName để cập nhật ID
      this.updateRoleName(this.suggestedRole)
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
        if (field.key === 'role') {
          // Fix: Kiểm tra role.name
          if (!this.localForm.role?.name?.trim()) {
            this.fieldErrors[field.key] = `${field.label} is required`
          }
        } else if (!this.localForm[field.key]?.trim()) {
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

      if (fieldName === 'role') {
        // Fix: Kiểm tra role.name thay vì role
        if (!this.localForm.role?.name?.trim()) {
          this.fieldErrors[fieldName] = 'This field is required'
        } else {
          delete this.fieldErrors[fieldName]
        }
      } else if (requiredFields.includes(fieldName) && !this.localForm[fieldName]?.trim()) {
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

      // Ensure role has proper structure
      if (!cleanedForm.role.id || cleanedForm.role.id === 'role_unknown') {
        cleanedForm.role.id = `role_${
          cleanedForm.role.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'
        }`
      }

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
            .map((item) => {
              if (typeof item === 'string') {
                return item.trim()
              } else if (typeof item === 'object' && item !== null) {
                // Convert object thành string để tránh "[object Object]"
                // Xử lý theo từng loại field
                if (field === 'inputs' || field === 'outputs') {
                  if (item.name) {
                    let desc = item.name
                    if (item.type) desc += ` (${item.type})`
                    return desc
                  }
                } else if (field === 'rules') {
                  return item.description || item.id || ''
                } else if (field === 'exceptions') {
                  const parts = []
                  if (item.description) parts.push(item.description)
                  else if (item.type) parts.push(`${item.type} exception`)
                  if (item.at_step) parts.push(`at step ${item.at_step}`)
                  return parts.length > 0 ? parts.join(' - ') : ''
                }
                // Fallback: convert object thành string
                return JSON.stringify(item)
              }
              return String(item || '').trim()
            })
            .filter((item) => item && item !== '')
        }
      })

      // Đảm bảo tasks có ít nhất một item
      if (cleanedForm.tasks.length === 0) {
        cleanedForm.tasks = ['']
      }

      // Đảm bảo context có giá trị mặc định nếu empty - kiểm tra type trước khi gọi trim()
      if (typeof cleanedForm.context === 'string') {
        if (!cleanedForm.context || cleanedForm.context.trim() === '') {
          cleanedForm.context = ''
        }
      } else if (cleanedForm.context && typeof cleanedForm.context === 'object') {
        // Context object từ backend: { module, scope, system }
        const parts = []
        if (cleanedForm.context.module) parts.push(`Module: ${cleanedForm.context.module}`)
        if (cleanedForm.context.scope) parts.push(`Scope: ${cleanedForm.context.scope}`)
        if (cleanedForm.context.system) parts.push(`System: ${cleanedForm.context.system}`)
        cleanedForm.context = parts.join(', ').trim() || ''
      } else {
        cleanedForm.context = ''
      }

      // Đảm bảo feedback có giá trị phù hợp - kiểm tra type trước khi gọi trim()
      if (typeof cleanedForm.feedback === 'string') {
        if (!cleanedForm.feedback || cleanedForm.feedback.trim() === '') {
          cleanedForm.feedback = null // hoặc '' tùy BE xử lý
        }
      } else {
        cleanedForm.feedback = null
      }

      // Đảm bảo priority hợp lệ
      if (!['low', 'medium', 'high'].includes(cleanedForm.priority)) {
        cleanedForm.priority = 'medium'
      }

      return cleanedForm
    },

    // Trong AddEditUseCaseModal.vue
    validateRoleName(value) {
      const trimmed = value.trim()

      // Reset suggestion trước
      this.showSuggestion = false
      this.suggestedRole = ''

      // Chỉ gợi ý nếu có giá trị và bắt đầu bằng chữ thường
      if (trimmed && /^[a-z]/.test(trimmed)) {
        const suggested = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)

        // Chỉ show gợi ý nếu khác với giá trị hiện tại
        if (suggested !== trimmed) {
          this.showSuggestion = true
          this.suggestedRole = suggested
        }
      }
    },

    normalizeFormData(data) {
      const normalized = { ...data }

      // Normalize business_reason -> reason
      if (normalized.business_reason && !normalized.reason) {
        normalized.reason = normalized.business_reason
      }

      // Normalize role
      if (normalized.role && typeof normalized.role === 'string') {
        // ✅ Đơn giản hóa - chỉ giữ name, để BE mapping ID
        normalized.role = {
          id: '', // Để BE tự động mapping
          name: normalized.role,
        }
      } else if (normalized.role && typeof normalized.role === 'object' && !normalized.role.id) {
        // ✅ Chỉ cần name, BE sẽ tạo ID đúng
        normalized.role = {
          id: '', // Để BE tự động mapping
          name: normalized.role.name || '',
        }
      }

      // Normalize context - convert từ object sang string nếu cần
      if (normalized.context && typeof normalized.context === 'object') {
        // Context object từ backend: { module, scope, system }
        const parts = []
        if (normalized.context.module) parts.push(`Module: ${normalized.context.module}`)
        if (normalized.context.scope) parts.push(`Scope: ${normalized.context.scope}`)
        if (normalized.context.system) parts.push(`System: ${normalized.context.system}`)
        normalized.context = parts.join(', ').trim() || ''
      } else if (!normalized.context || typeof normalized.context !== 'string') {
        normalized.context = ''
      }

      // Normalize actor (backend có thể dùng actor thay vì role)
      if (normalized.actor && !normalized.role) {
        // Nếu có actor nhưng không có role, copy actor sang role
        if (typeof normalized.actor === 'object') {
          normalized.role = {
            id: normalized.actor.id || '',
            name: normalized.actor.name || '',
          }
        } else if (typeof normalized.actor === 'string') {
          normalized.role = {
            id: '',
            name: normalized.actor,
          }
        }
      }

      // Normalize inputs: array of objects { name, type, required, optional } -> array of strings
      if (Array.isArray(normalized.inputs)) {
        normalized.inputs = normalized.inputs.map((item) => {
          if (typeof item === 'string') return item
          if (typeof item === 'object' && item !== null) {
            // Extract name từ object, hoặc tạo string mô tả
            if (item.name) {
              let desc = item.name
              if (item.type) desc += ` (${item.type})`
              return desc
            }
            return JSON.stringify(item)
          }
          return String(item || '')
        }).filter(Boolean)
      } else if (!normalized.inputs) {
        normalized.inputs = []
      }

      // Normalize outputs: array of objects { name, type, required, optional } -> array of strings
      if (Array.isArray(normalized.outputs)) {
        normalized.outputs = normalized.outputs.map((item) => {
          if (typeof item === 'string') return item
          if (typeof item === 'object' && item !== null) {
            // Extract name từ object, hoặc tạo string mô tả
            if (item.name) {
              let desc = item.name
              if (item.type) desc += ` (${item.type})`
              return desc
            }
            return JSON.stringify(item)
          }
          return String(item || '')
        }).filter(Boolean)
      } else if (!normalized.outputs) {
        normalized.outputs = []
      }

      // Normalize rules: array of objects { id, description } -> array of strings
      if (Array.isArray(normalized.rules)) {
        normalized.rules = normalized.rules.map((item) => {
          if (typeof item === 'string') return item
          if (typeof item === 'object' && item !== null) {
            // Extract description từ object
            return item.description || item.id || JSON.stringify(item)
          }
          return String(item || '')
        }).filter(Boolean)
      } else if (!normalized.rules) {
        normalized.rules = []
      }

      // Normalize exceptions: array of objects { id, at_step, type, description, system_response } -> array of strings
      if (Array.isArray(normalized.exceptions)) {
        normalized.exceptions = normalized.exceptions.map((item) => {
          if (typeof item === 'string') return item
          if (typeof item === 'object' && item !== null) {
            // Tạo string mô tả từ exception object
            const parts = []
            if (item.description) parts.push(item.description)
            else if (item.type) parts.push(`${item.type} exception`)
            if (item.at_step) parts.push(`at step ${item.at_step}`)
            if (item.system_response) parts.push(`→ ${item.system_response}`)
            return parts.length > 0 ? parts.join(' - ') : JSON.stringify(item)
          }
          return String(item || '')
        }).filter(Boolean)
      } else if (!normalized.exceptions) {
        normalized.exceptions = []
      }

      // Normalize trigger: object { event, source } -> array of strings (triggers)
      if (normalized.trigger && typeof normalized.trigger === 'object' && !Array.isArray(normalized.trigger)) {
        // Convert trigger object thành array
        const triggerStrings = []
        if (normalized.trigger.event) {
          triggerStrings.push(normalized.trigger.event)
        }
        if (normalized.trigger.source && normalized.trigger.source !== 'UI') {
          triggerStrings.push(`Source: ${normalized.trigger.source}`)
        }
        normalized.triggers = triggerStrings.length > 0 ? triggerStrings : (normalized.triggers || [])
        delete normalized.trigger
      } else if (!normalized.triggers || !Array.isArray(normalized.triggers)) {
        normalized.triggers = []
      }

      // Normalize main_flow: array of objects -> tasks array of strings
      if (Array.isArray(normalized.main_flow) && normalized.main_flow.length > 0) {
        // Convert main_flow objects thành tasks strings
        normalized.tasks = normalized.main_flow.map((step) => {
          if (typeof step === 'string') return step
          if (typeof step === 'object' && step !== null) {
            // Extract action từ step object
            if (step.action) {
              let taskDesc = step.action
              if (step.expected_result) {
                taskDesc += ` → ${step.expected_result}`
              }
              return taskDesc
            }
            return JSON.stringify(step)
          }
          return String(step || '')
        }).filter(Boolean)
      } else if (!normalized.tasks || !Array.isArray(normalized.tasks)) {
        // Nếu không có main_flow, giữ nguyên tasks hoặc tạo mảng rỗng
        normalized.tasks = normalized.tasks || ['']
      }

      // Normalize non_functional_constraints -> constraints
      if (Array.isArray(normalized.non_functional_constraints)) {
        normalized.constraints = normalized.non_functional_constraints.map((item) => {
          return typeof item === 'string' ? item : String(item || '')
        }).filter(Boolean)
      } else if (!normalized.constraints || !Array.isArray(normalized.constraints)) {
        normalized.constraints = []
      }

      // Đảm bảo các array fields khác là array
      const arrayFields = ['preconditions', 'postconditions', 'stakeholders', 'related_usecases']
      arrayFields.forEach((field) => {
        if (!Array.isArray(normalized[field])) {
          normalized[field] = []
        }
      })

      // Đảm bảo tasks có ít nhất một item
      if (!normalized.tasks || normalized.tasks.length === 0) {
        normalized.tasks = ['']
      }

      return normalized
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

    // Helper: Get usecase ID (support both _id and id for backward compatibility)
    getUsecaseId(uc) {
      if (!uc) return ''
      return String(uc._id || uc.id || '')
    },

    // Kiểm tra xem use case có phải là use case hiện tại không
    isCurrentUseCase(usecaseId) {
      if (!this.isEditing) return false
      const currentId = String(this.localForm._id || this.localForm.id || '')
      return currentId === String(usecaseId)
    },

    // Kiểm tra xem use case đã được chọn trong các mục khác chưa
    isAlreadySelected(usecaseId, currentIndex) {
      return this.localForm.related_usecases.some(
        (id, index) => index !== currentIndex && String(id) === String(usecaseId)
      )
    },

    // Clean form data để so sánh (tương tự cleanFormData nhưng không thay đổi ID)
    cleanFormDataForComparison(form) {
      const cleaned = { ...form }

      // Clean array fields - đảm bảo luôn là array và trim
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
        if (!Array.isArray(cleaned[field])) {
          cleaned[field] = []
        } else {
          cleaned[field] = cleaned[field]
            .map((item) => {
              if (typeof item === 'string') {
                return item.trim()
              } else if (typeof item === 'object' && item !== null) {
                // Convert object thành string để tránh "[object Object]"
                // Xử lý theo từng loại field
                if (field === 'inputs' || field === 'outputs') {
                  if (item.name) {
                    let desc = item.name
                    if (item.type) desc += ` (${item.type})`
                    return desc
                  }
                } else if (field === 'rules') {
                  return item.description || item.id || ''
                } else if (field === 'exceptions') {
                  const parts = []
                  if (item.description) parts.push(item.description)
                  else if (item.type) parts.push(`${item.type} exception`)
                  if (item.at_step) parts.push(`at step ${item.at_step}`)
                  return parts.length > 0 ? parts.join(' - ') : ''
                }
                // Fallback: convert object thành string
                return JSON.stringify(item)
              }
              return String(item || '').trim()
            })
            .filter((item) => item && item !== '')
        }
      })

      // Đảm bảo tasks có ít nhất một item
      if (cleaned.tasks.length === 0) {
        cleaned.tasks = ['']
      }

      // Normalize string fields - kiểm tra type trước khi gọi trim()
      const stringFields = ['name', 'goal', 'reason', 'context', 'feedback']
      stringFields.forEach((field) => {
        const value = cleaned[field]
        if (typeof value === 'string') {
          cleaned[field] = value.trim()
        } else if (value != null && typeof value === 'object') {
          // Nếu là object (ví dụ context từ backend), convert sang string
          if (field === 'context') {
            // Context object từ backend: { module, scope, system }
            const parts = []
            if (value.module) parts.push(`Module: ${value.module}`)
            if (value.scope) parts.push(`Scope: ${value.scope}`)
            if (value.system) parts.push(`System: ${value.system}`)
            cleaned[field] = parts.join(', ').trim()
          } else {
            // Các object khác, convert sang empty string
            cleaned[field] = ''
          }
        } else {
          cleaned[field] = String(value || '').trim()
        }
      })

      // Normalize priority
      if (!['low', 'medium', 'high'].includes(cleaned.priority)) {
        cleaned.priority = 'medium'
      }

      // Normalize role
      if (cleaned.role) {
        cleaned.role = {
          name: (cleaned.role.name || '').trim(),
        }
      }

      return cleaned
    },

    // So sánh form ban đầu với form hiện tại để phát hiện thay đổi
    hasFormChanged(original, current) {
      // So sánh các trường cơ bản
      const basicFields = ['name', 'goal', 'reason', 'priority', 'context', 'feedback']
      for (const field of basicFields) {
        // Xử lý an toàn - kiểm tra type trước khi gọi trim()
        let originalValue = original[field]
        let currentValue = current[field]
        
        if (typeof originalValue === 'string') {
          originalValue = originalValue.trim()
        } else if (originalValue != null && typeof originalValue === 'object' && field === 'context') {
          // Context object từ backend
          const parts = []
          if (originalValue.module) parts.push(`Module: ${originalValue.module}`)
          if (originalValue.scope) parts.push(`Scope: ${originalValue.scope}`)
          if (originalValue.system) parts.push(`System: ${originalValue.system}`)
          originalValue = parts.join(', ').trim()
        } else {
          originalValue = String(originalValue || '').trim()
        }
        
        if (typeof currentValue === 'string') {
          currentValue = currentValue.trim()
        } else if (currentValue != null && typeof currentValue === 'object' && field === 'context') {
          // Context object từ backend
          const parts = []
          if (currentValue.module) parts.push(`Module: ${currentValue.module}`)
          if (currentValue.scope) parts.push(`Scope: ${currentValue.scope}`)
          if (currentValue.system) parts.push(`System: ${currentValue.system}`)
          currentValue = parts.join(', ').trim()
        } else {
          currentValue = String(currentValue || '').trim()
        }
        
        if (originalValue !== currentValue) {
          return true
        }
      }

      // So sánh role
      const originalRoleName = (original.role?.name || '').trim()
      const currentRoleName = (current.role?.name || '').trim()
      if (originalRoleName !== currentRoleName) {
        return true
      }

      // So sánh các mảng
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

      for (const field of arrayFields) {
        const originalArray = (original[field] || []).map((item) => String(item).trim()).filter(Boolean)
        const currentArray = (current[field] || []).map((item) => String(item).trim()).filter(Boolean)

        if (originalArray.length !== currentArray.length) {
          return true
        }

        // So sánh từng phần tử (đã được sort để so sánh chính xác)
        const sortedOriginal = [...originalArray].sort()
        const sortedCurrent = [...currentArray].sort()

        for (let i = 0; i < sortedOriginal.length; i++) {
          if (sortedOriginal[i] !== sortedCurrent[i]) {
            return true
          }
        }
      }

      return false
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
.suggestion-banner {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 8px;
  font-size: 0.875rem;
  color: #0369a1;
}

.suggestion-btn {
  background: none;
  border: none;
  color: #0891b2;
  text-decoration: underline;
  cursor: pointer;
  font-weight: 500;
}

.suggestion-btn:hover {
  color: #0e7490;
}

input.has-suggestion {
  border-color: #38bdf8;
  box-shadow: 0 0 0 1px #38bdf8;
}
</style>