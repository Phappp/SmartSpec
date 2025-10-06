<template>
  <div class="main-content">
    <div class="usecase-area">
      <div class="usecase-header">
        <h2>
          Use Cases <span class="counter-badge">{{ useCases.length }}</span>
        </h2>
        <button class="add-usecase-btn" @click="showAddUsecaseModal">
          <span class="material-symbols-outlined">add</span>
          Add Use Case
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading use cases...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="useCases.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No Use Cases Yet</h3>
        <p>Start by creating your first use case to define system requirements.</p>
        <button class="primary-btn" @click="showAddUsecaseModal">Create First Use Case</button>
      </div>

      <!-- Use Cases List -->
      <div v-else v-for="(group, role) in groupedUseCases" :key="role" class="usecase-group">
        <h3 class="group-title" @click="toggleGroup(role)">
          {{ role }}
          <span class="expand-icon">{{ expandedGroups[role] ? '−' : '+' }}</span>
        </h3>
        <ul v-if="expandedGroups[role]" class="usecase-list">
          <li v-for="uc in group" :key="uc.id" class="usecase-item">
            <div class="usecase-summary" @click="toggleUseCase(uc.id)">
              <div class="summary-left">
                <span class="usecase-id">[{{ uc.id }}]</span>
                <span class="usecase-name">{{ uc.name }}</span>
              </div>
              <div class="summary-actions">
                <span class="usecase-role">{{ uc.role }}</span>
                <button class="action-btn edit-btn" @click.stop="showEditUsecaseModal(uc)">
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <button class="action-btn delete-btn" @click.stop="showDeleteConfirm(uc)">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
            <div v-if="expandedUseCaseId === uc.id" class="usecase-detail">
              <!-- Use Case Detail Content (giữ nguyên) -->
              <div class="usecase-grid">
                <div class="usecase-section span-2">
                  <h4>Goal</h4>
                  <p>{{ uc.goal }}</p>
                </div>
                <div class="usecase-section span-1">
                  <h4>Priority</h4>
                  <p>
                    <span :class="['priority-badge', `priority-${uc.priority}`]">{{
                      uc.priority
                    }}</span>
                  </p>
                </div>
                <div class="usecase-section span-3">
                  <h4>Reason</h4>
                  <p>{{ uc.reason }}</p>
                </div>

                <div class="usecase-section">
                  <h4>Preconditions</h4>
                  <ul class="detail-list">
                    <li v-for="(item, i) in uc.preconditions" :key="i">{{ item }}</li>
                    <li v-if="!uc.preconditions || uc.preconditions.length === 0">None</li>
                  </ul>
                </div>
                <div class="usecase-section">
                  <h4>Postconditions</h4>
                  <ul class="detail-list">
                    <li v-for="(item, i) in uc.postconditions" :key="i">{{ item }}</li>
                    <li v-if="!uc.postconditions || uc.postconditions.length === 0">None</li>
                  </ul>
                </div>
                <div class="usecase-section">
                  <h4>Triggers</h4>
                  <ul class="detail-list">
                    <li v-for="(item, i) in uc.triggers" :key="i">{{ item }}</li>
                    <li v-if="!uc.triggers || uc.triggers.length === 0">None</li>
                  </ul>
                </div>

                <div class="usecase-section span-3">
                  <h4>Tasks (Main Flow)</h4>
                  <ol class="detail-list ordered">
                    <li v-for="(task, i) in uc.tasks" :key="i">{{ task }}</li>
                  </ol>
                </div>

                <div class="usecase-section">
                  <h4>Inputs</h4>
                  <div class="tag-list">
                    <span v-for="item in uc.inputs" :key="item" class="tag tag-input">{{
                      item
                    }}</span>
                  </div>
                </div>
                <div class="usecase-section">
                  <h4>Outputs</h4>
                  <div class="tag-list">
                    <span v-for="item in uc.outputs" :key="item" class="tag tag-output">{{
                      item
                    }}</span>
                  </div>
                </div>
                <div class="usecase-section">
                  <h4>Context</h4>
                  <p>{{ uc.context }}</p>
                </div>

                <div class="usecase-section span-2">
                  <h4>Business Rules</h4>
                  <ul class="detail-list">
                    <li v-for="(item, i) in uc.rules" :key="i">{{ item }}</li>
                  </ul>
                </div>
                <div class="usecase-section">
                  <h4>Constraints</h4>
                  <ul class="detail-list">
                    <li v-for="(item, i) in uc.constraints" :key="i">{{ item }}</li>
                  </ul>
                </div>

                <div class="usecase-section span-3">
                  <h4>Exceptions (Alternate Flows)</h4>
                  <ul class="detail-list exception">
                    <li v-for="(item, i) in uc.exceptions" :key="i">
                      <span class="material-symbols-outlined">error</span>{{ item }}
                    </li>
                  </ul>
                </div>

                <div class="usecase-section">
                  <h4>Stakeholders</h4>
                  <div class="tag-list">
                    <span v-for="item in uc.stakeholders" :key="item" class="tag tag-meta">{{
                      item
                    }}</span>
                  </div>
                </div>
                <div class="usecase-section">
                  <h4>Related Usecases</h4>
                  <div class="tag-list">
                    <span
                      v-for="relatedId in uc.related_usecases"
                      :key="relatedId"
                      class="tag tag-meta"
                    >
                      <template v-if="useCaseMap[relatedId]">
                        [{{ relatedId }}] {{ useCaseMap[relatedId].name }}
                      </template>
                      <template v-else> [{{ relatedId }}] (Not found) </template>
                    </span>
                  </div>
                </div>
                <div class="usecase-section">
                  <h4>Feedback</h4>
                  <p>{{ uc.feedback || 'No feedback yet' }}</p>
                </div>
              </div>

              <!-- Action Buttons in Detail View -->
              <div class="detail-actions">
                <button class="secondary-btn" @click="showEditUsecaseModal(uc)">
                  <span class="material-symbols-outlined">edit</span>
                  Edit Use Case
                </button>
                <button class="danger-btn" @click="showDeleteConfirm(uc)">
                  <span class="material-symbols-outlined">delete</span>
                  Delete Use Case
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Add/Edit Use Case Modal Component -->
    <AddEditUseCaseModal
      v-if="showUsecaseModal"
      :show="showUsecaseModal"
      :isEditing="isEditing"
      :usecaseData="usecaseForm"
      :submitting="submitting"
      :available-use-cases="availableUseCases"
      @close="closeUsecaseModal"
      @submit="submitUsecaseForm"
    />

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteModal">
      <div class="modal-content delete-modal" @click.stop>
        <div class="modal-header">
          <h3>Delete Use Case</h3>
          <button class="close-btn" @click="closeDeleteModal">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <p>
            Are you sure you want to delete the use case
            <strong>"{{ usecaseToDelete?.name }}"</strong>?
          </p>
          <p class="warning-text">
            This action cannot be undone and will remove all associated data.
          </p>
        </div>
        <div class="modal-actions">
          <button class="secondary-btn" @click="closeDeleteModal">Cancel</button>
          <button class="danger-btn" @click="confirmDelete" :disabled="deleting">
            {{ deleting ? 'Deleting...' : 'Delete Use Case' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useToast } from 'vue-toastification'
import AddEditUseCaseModal from './AddEditUseCaseModal.vue'

export default {
  name: 'UseCaseMainContent',
  components: {
    AddEditUseCaseModal,
  },
  props: {
    useCases: {
      type: Array,
      default: () => [],
    },
    projectId: {
      type: String,
      required: true,
    },
    versionId: {
      type: String,
      required: true,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    availableUseCases: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      loading: false,
      expandedUseCaseId: null,
      expandedGroups: this.loadExpandedGroupsState(),

      // Modal states
      showUsecaseModal: false,
      showDeleteModal: false,
      isEditing: false,
      submitting: false,
      deleting: false,

      // Form data
      usecaseForm: this.getEmptyForm(),
      usecaseToDelete: null,

      toast: useToast(),
    }
  },
  computed: {
    useCaseMap() {
      if (!this.useCases || this.useCases.length === 0) {
        return {}
      }
      return this.useCases.reduce((map, uc) => {
        map[uc.id] = uc
        return map
      }, {})
    },
    groupedUseCases() {
      if (!this.useCases || this.useCases.length === 0) {
        return {}
      }

      const groups = this.useCases.reduce((groups, uc) => {
        const role = uc.role || 'Undefined'
        if (!groups[role]) {
          groups[role] = []
        }
        groups[role].push(uc)
        return groups
      }, {})

      Object.keys(groups).forEach((role) => {
        if (this.expandedGroups[role] === undefined) {
          this.expandedGroups[role] = true
        }
      })

      return groups
    },
  },
  methods: {
    // Use Case CRUD Operations
    async submitUsecaseForm(formData) {
      if (this.submitting) return
      this.submitting = true
      try {
        if (this.isEditing) {
          if (!formData.id) {
            console.warn('⚠️ No ID in submitted form — skipping update.')
            return
          }
          await this.$emit('updateUsecase', {
            usecaseId: formData.id,
            data: formData,
          })
          // ❌ Bỏ dòng toast ở đây
          // this.toast.success('Use case updated successfully')
        } else {
          await this.$emit('addUsecase', formData)
          // ❌ Bỏ dòng này luôn
          // this.toast.success('Use case created successfully')
        }

        this.closeUsecaseModal()
      } catch (error) {
        this.toast.error(error.message || 'Failed to save use case')
      } finally {
        this.submitting = false
      }
    },
    async confirmDelete() {
      this.deleting = true
      try {
        await this.$emit('deleteUsecase', this.usecaseToDelete.id)
        this.closeDeleteModal()
      } catch (error) {
        console.error('Deletion failed from parent:', error)
      } finally {
        this.deleting = false
      }
    },

    // Modal Management
    showAddUsecaseModal() {
      this.usecaseForm = this.getEmptyForm()
      this.isEditing = false
      this.showUsecaseModal = true
    },

    showEditUsecaseModal(usecase) {
      this.usecaseForm = { ...usecase }
      this.currentEditingUseCase = usecase
      this.isEditing = true
      this.showUsecaseModal = true
    },

    showDeleteConfirm(usecase) {
      this.usecaseToDelete = usecase
      this.showDeleteModal = true
    },

    closeUsecaseModal() {
      this.showUsecaseModal = false
      this.usecaseForm = this.getEmptyForm()
      this.currentEditingUseCase = null
    },

    closeDeleteModal() {
      this.showDeleteModal = false
      this.usecaseToDelete = null
    },

    // Form Helpers
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

    // Existing methods
    toggleUseCase(useCaseId) {
      this.expandedUseCaseId = this.expandedUseCaseId === useCaseId ? null : useCaseId
    },

    toggleGroup(role) {
      this.expandedGroups = {
        ...this.expandedGroups,
        [role]: !this.expandedGroups[role],
      }
      this.saveExpandedGroupsState()
    },

    saveExpandedGroupsState() {
      localStorage.setItem('useCaseGroupsState', JSON.stringify(this.expandedGroups))
    },

    loadExpandedGroupsState() {
      try {
        const savedState = localStorage.getItem('useCaseGroupsState')
        return savedState ? JSON.parse(savedState) : {}
      } catch (error) {
        console.error('Error loading expanded groups state:', error)
        return {}
      }
    },
    isCurrentUseCase(usecaseId) {
      return this.isEditing && this.usecaseForm.id === usecaseId
    },

    isAlreadySelected(usecaseId, currentIndex) {
      return this.usecaseForm.related_usecases.some(
        (id, index) => index !== currentIndex && id === usecaseId
      )
    },
  },

  watch: {
    useCases: {
      handler(newUseCases) {
        if (newUseCases && newUseCases.length > 0) {
          const groups = this.groupedUseCases
          let hasNewGroups = false

          Object.keys(groups).forEach((role) => {
            if (this.expandedGroups[role] === undefined) {
              this.expandedGroups[role] = true
              hasNewGroups = true
            }
          })

          if (hasNewGroups) {
            this.saveExpandedGroupsState()
          }
        }
      },
      immediate: true,
    },
  },
}
</script>

<style scoped>
/* Existing CSS styles remain the same */
.main-content {
  flex: 3;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 20px;
  overflow-y: auto;
}

.usecase-header {
  display: flex;
  justify-content: left;
  align-items: center;
  margin-bottom: 20px;
  font-weight: bold;
  font-size: 100%;
}

.usecase-header h2 {
  font-weight: bold;
}

.usecase-header span {
  font-size: 18px;
}

.counter-badge {
  padding: 2px 8px;
  background: #e2e8f0;
  color: #475569;
  border-radius: 12px;
  font-weight: 600;
  margin-left: 8px;
}

.usecase-area h2 {
  margin-top: 0;
  margin-bottom: 0;
  color: #111827;
}

.usecase-group {
  margin-bottom: 25px;
}

.group-title {
  font-size: 16px;
  font-weight: bold;
  color: #000000;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 12px;
  text-transform: capitalize;
  background-color: #27375a6a;
  padding: 6px 12px;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s ease;
}

.group-title:hover {
  background-color: #22222230;
}

.expand-icon {
  font-weight: bold;
  font-size: 18px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.usecase-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.usecase-item {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 10px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.usecase-item:hover {
  border-color: #9ca3af;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.usecase-summary {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.usecase-id {
  font-family: monospace;
  font-size: 14px;
  color: #6b7280;
}

.usecase-name {
  font-weight: 600;
  color: #1f2937;
}

.usecase-role {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 12px;
  background-color: #e0e7ff;
  color: #4338ca;
  font-weight: 500;
}

.usecase-detail {
  padding: 16px;
  border-top: 1px solid #e5e7eb;
  margin-top: 12px;
}

.usecase-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.usecase-section {
  background: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  font-size: 14px;
}

.usecase-section.span-1 {
  grid-column: span 1;
}

.usecase-section.span-2 {
  grid-column: span 2;
}

.usecase-section.span-3 {
  grid-column: span 3;
}

.usecase-section h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.usecase-section p {
  margin: 0;
  line-height: 1.5;
  color: #4b5563;
}

.detail-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-list.ordered {
  padding-left: 20px;
  list-style-type: decimal;
}

.detail-list li {
  line-height: 1.5;
  color: #4b5563;
}

.detail-list.exception li {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #b91c1c;
}

.detail-list.exception .material-symbols-outlined {
  font-size: 16px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.tag-input {
  background: #e0e7ff;
  color: #3730a3;
}

.tag-output {
  background: #d1fae5;
  color: #065f46;
}

.tag-meta {
  background: #e5e7eb;
  color: #374151;
}

.priority-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
}

.priority-high {
  background-color: #fee2e2;
  color: #b91c1c;
}

.priority-medium {
  background-color: #fef3c7;
  color: #b45309;
}

.priority-low {
  background-color: #dbeafe;
  color: #1e40af;
}

@media (max-width: 1200px) {
  .usecase-grid {
    grid-template-columns: 1fr 1fr;
  }
  .usecase-section.span-3 {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .usecase-grid {
    grid-template-columns: 1fr;
  }
  .usecase-section.span-2,
  .usecase-section.span-3 {
    grid-column: span 1;
  }

  .usecase-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
/* Header with Add Button */
.usecase-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.add-usecase-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #1a365d;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.add-usecase-btn:hover {
  background: #12337c;
}

.add-usecase-btn span {
  font-size: 24px;
  transition: 0.2s ease;
}

.add-usecase-btn:hover span {
  transform: rotate(90deg);
}

/* Summary Actions */
.summary-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  padding: 6px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-btn {
  background: #dbeafe;
  color: #1e40af;
}

.edit-btn:hover {
  background: #bfdbfe;
}

.delete-btn {
  background: #fee2e2;
  color: #dc2626;
}

.delete-btn:hover {
  background: #fecaca;
}

/* Detail Actions */
.detail-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

/* Buttons */
.primary-btn {
  background: #1a365d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.primary-btn:hover:not(:disabled) {
  background: #12337c;
}

.primary-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.secondary-btn {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.secondary-btn:hover {
  background: #e5e7eb;
}

.danger-btn {
  background: #ef4444;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.danger-btn:hover:not(:disabled) {
  background: #dc2626;
}

.danger-btn:disabled {
  background: #fca5a5;
  cursor: not-allowed;
}

/* Modal Styles */
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

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 6px;
  color: #6b7280;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
}

/* Delete Modal */
.delete-modal {
  max-width: 500px;
}

.modal-body {
  padding: 24px;
}

.warning-text {
  color: #dc2626;
  font-weight: 500;
  margin-top: 8px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
}

/* Loading and Empty States */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6b7280;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-left: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #374151;
}

.empty-state p {
  margin: 0 0 24px 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .usecase-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .detail-actions {
    flex-direction: column;
  }

  .modal-content {
    margin: 20px;
    max-height: calc(100vh - 40px);
  }
}
</style>