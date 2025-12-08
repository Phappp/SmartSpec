<template>
  <div class="main-content">
    <div class="usecase-area">
      <!-- Header với thống kê -->
      <!-- Thay thế phần content-header hiện tại -->
      <div class="content-header">
        <div class="header-info">
          <h2>Use Cases Management</h2>
          <p class="subtitle">Manage and organize your system use cases and requirements</p>
        </div>
        <div class="header-actions">
          <button class="btn-primary" @click="showAddUsecaseModal">
            <span class="material-symbols-outlined">add</span>
            Add Use Case
          </button>
          <button class="btn-secondary" @click="showExportModal">
            <span class="material-symbols-outlined">download</span>
            Export
          </button>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card total">
          <div class="stat-icon">
            <span class="material-symbols-outlined">list_alt</span>
          </div>
          <div class="stat-info">
            <h3>{{ useCases.length }}</h3>
            <p>Total Use Cases</p>
          </div>
        </div>
        <div class="stat-card roles">
          <div class="stat-icon">
            <span class="material-symbols-outlined">groups</span>
          </div>
          <div class="stat-info">
            <h3>{{ Object.keys(groupedUseCases).length }}</h3>
            <p>Roles</p>
          </div>
        </div>
        <div class="stat-card high-priority">
          <div class="stat-icon">
            <span class="material-symbols-outlined">priority_high</span>
          </div>
          <div class="stat-info">
            <h3>{{ highPriorityCount }}</h3>
            <p>High Priority</p>
          </div>
        </div>
        <!-- <div class="stat-card completed">
          <div class="stat-icon">
            <span class="material-symbols-outlined">check_circle</span>
          </div>
          <div class="stat-info">
            <h3>{{ completedCount }}</h3>
            <p>Completed</p>
          </div>
        </div> -->
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading use cases...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="useCases.length === 0" class="empty-state">
        <div class="empty-icon">
          <span class="material-symbols-outlined">list_alt</span>
        </div>
        <h3>No Use Cases Yet</h3>
        <p>Start by creating your first use case to define system requirements.</p>
        <button class="btn-primary" @click="showAddUsecaseModal">
          <span class="material-symbols-outlined">add</span>
          Create First Use Case
        </button>
      </div>

      <!-- Use Cases Content -->
      <div v-else class="usecase-content">
        <!-- Search and Filter Bar -->
        <div class="toolbar">
          <div class="search-box">
            <span class="material-symbols-outlined">search</span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search use cases by name, goal or ID..."
              class="search-input"
            />
          </div>
          <div class="toolbar-right">
          <div class="filter-options">
            <select v-model="roleFilter" class="filter-select">
              <option value="">All Roles</option>
              <option v-for="role in availableRoles" :key="role" :value="role">{{ role }}</option>
            </select>
            <select v-model="priorityFilter" class="filter-select">
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            </div>
            <!-- View Mode Selector -->
            <div class="view-mode-selector">
              <button
                class="view-mode-btn"
                :class="{ active: viewMode === 'grouped' }"
                @click="viewMode = 'grouped'"
                title="Grouped by Role"
              >
                <span class="material-symbols-outlined">view_list</span>
              </button>
              <button
                class="view-mode-btn"
                :class="{ active: viewMode === 'grid' }"
                @click="viewMode = 'grid'"
                title="Grid View"
              >
                <span class="material-symbols-outlined">grid_view</span>
              </button>
              <button
                class="view-mode-btn"
                :class="{ active: viewMode === 'list' }"
                @click="viewMode = 'list'"
                title="List View"
              >
                <span class="material-symbols-outlined">view_agenda</span>
              </button>
              <button
                class="view-mode-btn"
                :class="{ active: viewMode === 'compact' }"
                @click="viewMode = 'compact'"
                title="Compact View"
              >
                <span class="material-symbols-outlined">view_compact</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Use Cases Groups (Grouped View) -->
        <div v-if="viewMode === 'grouped'" class="usecase-groups">
          <div
            v-for="(group, role) in filteredGroupedUseCases"
            :key="role"
            class="usecase-group-card"
          >
            <div class="group-header" @click="toggleGroup(role)">
              <div class="group-info">
                <h3 class="group-title">{{ role }}</h3>
                <span class="group-count">{{ group.length }} use cases</span>
              </div>
              <div class="group-actions">
                <span class="expand-icon">{{ expandedGroups[role] ? '−' : '+' }}</span>
              </div>
            </div>

            <div v-if="expandedGroups[role]" class="group-content">
              <div
                v-for="(uc, ucIndex) in group"
                :key="getUsecaseId(uc)"
                class="usecase-card"
                :class="{ expanded: expandedUseCaseId === getUsecaseId(uc) }"
              >
                <div class="usecase-header" @click="toggleUseCase(getUsecaseId(uc))">
                    <div class="usecase-basic-info">
                    <div class="usecase-id-badge">{{ formatUsecaseId(uc, ucIndex) }}</div>
                    <h4 class="usecase-name">{{ uc.name }}</h4>
                    <span class="priority-badge" :class="`priority-${uc.priority}`">
                      {{ uc.priority }}
                    </span>
                  </div>
                  <div class="usecase-meta">
                    <!-- <span class="meta-item">
                      <span class="material-symbols-outlined">schedule</span>
                      {{ formatLastModified(uc.updated_at) }}
                    </span> -->
                    <div class="action-buttons">
                      <button class="btn-icon" @click.stop="showEditUsecaseModal(uc)" title="Edit">
                        <span class="material-symbols-outlined">edit</span>
                      </button>
                      <button
                        class="btn-icon danger"
                        @click.stop="showDeleteConfirm(uc)"
                        title="Delete"
                      >
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Expanded Details -->
                <div v-if="expandedUseCaseId === getUsecaseId(uc)" class="usecase-details expanded-full">
                  <div class="details-grid expanded-content">
                    <!-- Row 1: Goal, Description, Context -->
                    <div class="detail-row">
                      <div class="detail-section">
                        <h5>Goal</h5>
                        <p>{{ uc.goal || 'No goal specified' }}</p>
                      </div>
                      <div class="detail-section">
                        <h5>Description</h5>
                        <p>{{ uc.reason || 'No description available' }}</p>
                      </div>
                      <div class="detail-section">
                        <h5>Context</h5>
                        <p>{{ uc.context || 'No context specified' }}</p>
                      </div>
                    </div>

                    <!-- Row 2: Main Flow (Full Width) -->
                    <div class="detail-row">
                      <div class="detail-section full-width">
                        <h5>Main Flow</h5>
                        <ol class="task-list">
                          <li v-for="(task, i) in uc.tasks" :key="i">{{ task }}</li>
                          <li v-if="!uc.tasks || uc.tasks.length === 0">No tasks defined</li>
                        </ol>
                      </div>
                    </div>

                    <!-- Row 3: Preconditions & Postconditions -->
                    <div class="detail-row">
                      <div class="detail-section">
                        <h5>Preconditions</h5>
                        <ul class="condition-list">
                          <li v-for="(item, i) in uc.preconditions" :key="i">{{ item }}</li>
                          <li v-if="!uc.preconditions || uc.preconditions.length === 0">None</li>
                        </ul>
                      </div>
                      <div class="detail-section">
                        <h5>Postconditions</h5>
                        <ul class="condition-list">
                          <li v-for="(item, i) in uc.postconditions" :key="i">{{ item }}</li>
                          <li v-if="!uc.postconditions || uc.postconditions.length === 0">None</li>
                        </ul>
                      </div>
                    </div>

                    <!-- Row 4: Inputs & Outputs -->
                    <div class="detail-row">
                      <div class="detail-section">
                        <h5>Inputs</h5>
                        <div class="tag-list">
                          <span v-for="item in uc.inputs" :key="item" class="tag tag-input">{{
                            item
                          }}</span>
                          <span v-if="!uc.inputs || uc.inputs.length === 0" class="tag tag-meta"
                            >None</span
                          >
                        </div>
                      </div>
                      <div class="detail-section">
                        <h5>Outputs</h5>
                        <div class="tag-list">
                          <span v-for="item in uc.outputs" :key="item" class="tag tag-output">{{
                            item
                          }}</span>
                          <span v-if="!uc.outputs || uc.outputs.length === 0" class="tag tag-meta"
                            >None</span
                          >
                        </div>
                      </div>
                    </div>

                    <!-- Row 5: Triggers, Business Rules & Constraints -->
                    <div class="detail-row">
                      <div class="detail-section">
                        <h5>Triggers</h5>
                        <ul class="condition-list">
                          <li v-for="(item, i) in uc.triggers" :key="i">{{ item }}</li>
                          <li v-if="!uc.triggers || uc.triggers.length === 0">None</li>
                        </ul>
                      </div>
                      <div class="detail-section">
                        <h5>Business Rules</h5>
                        <ul class="condition-list">
                          <li v-for="(item, i) in uc.rules" :key="i">{{ item }}</li>
                          <li v-if="!uc.rules || uc.rules.length === 0">None</li>
                        </ul>
                      </div>
                      <div class="detail-section">
                        <h5>Constraints</h5>
                        <ul class="condition-list">
                          <li v-for="(item, i) in uc.constraints" :key="i">{{ item }}</li>
                          <li v-if="!uc.constraints || uc.constraints.length === 0">None</li>
                        </ul>
                      </div>
                    </div>

                    <!-- Row 6: Exceptions (Full Width) -->
                    <div class="detail-row">
                      <div class="detail-section full-width">
                        <h5>Exceptions</h5>
                        <ul class="exception-list">
                          <li v-for="(item, i) in uc.exceptions" :key="i">
                            <span class="material-symbols-outlined">warning</span>
                            {{ item }}
                          </li>
                          <li v-if="!uc.exceptions || uc.exceptions.length === 0">
                            No exceptions defined
                          </li>
                        </ul>
                      </div>
                    </div>

                    <!-- Row 7: Stakeholders & Related Use Cases -->
                    <div class="detail-row">
                      <div class="detail-section">
                        <h5>Stakeholders</h5>
                        <div class="tag-list">
                          <span v-for="item in uc.stakeholders" :key="item" class="tag tag-meta">{{
                            item
                          }}</span>
                          <span
                            v-if="!uc.stakeholders || uc.stakeholders.length === 0"
                            class="tag tag-meta"
                            >None</span
                          >
                        </div>
                      </div>
                      <div class="detail-section">
                        <h5>Related Use Cases</h5>
                        <div class="tag-list">
                          <span
                            v-for="relatedId in uc.related_usecases"
                            :key="relatedId"
                            class="tag tag-related"
                          >
                            <template v-if="useCaseMap[relatedId]">
                              {{ getUsecaseName(useCaseMap[relatedId]) }}
                            </template>
                            <template v-else> Use Case {{ String(relatedId).substring(0, 8) }}... </template>
                          </span>
                          <span
                            v-if="!uc.related_usecases || uc.related_usecases.length === 0"
                            class="tag tag-meta"
                            >None</span
                          >
                        </div>
                      </div>
                    </div>

                    <!-- Row 8: Feedback -->
                    <div v-if="uc.feedback" class="detail-row">
                      <div class="detail-section full-width">
                        <h5>Feedback</h5>
                        <p>{{ uc.feedback }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Action Buttons -->
                  <div class="detail-actions">
                    <button class="btn-secondary" @click="showEditUsecaseModal(uc)">
                      <span class="material-symbols-outlined">edit</span>
                      Edit Use Case
                    </button>
                    <button class="btn-danger" @click="showDeleteConfirm(uc)">
                      <span class="material-symbols-outlined">delete</span>
                      Delete Use Case
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Grid View -->
        <div v-else-if="viewMode === 'grid'" class="usecase-grid-view">
          <div
            v-for="(uc, index) in filteredUseCases"
            :key="getUsecaseId(uc)"
            class="usecase-grid-card"
            :class="{ expanded: expandedUseCaseId === getUsecaseId(uc) }"
            @click="toggleUseCase(getUsecaseId(uc))"
          >
            <div class="grid-card-header">
              <div class="grid-card-id">{{ formatUsecaseId(uc, getUseCaseIndex(uc)) }}</div>
              <h4 class="grid-card-name">{{ uc.name }}</h4>
              <div class="grid-card-meta">
                <span class="priority-badge" :class="`priority-${uc.priority}`">
                  {{ uc.priority }}
                </span>
                <span class="role-badge">{{ uc.role?.name || 'Undefined' }}</span>
              </div>
            </div>
            <div v-if="expandedUseCaseId === getUsecaseId(uc)" class="grid-card-details">
              <div class="grid-details-content">
                <div class="detail-section">
                  <h5>Goal</h5>
                  <p>{{ uc.goal || 'No goal specified' }}</p>
                </div>
                <div class="detail-section">
                  <h5>Description</h5>
                  <p>{{ uc.reason || 'No description available' }}</p>
                </div>
                <div class="detail-section">
                  <h5>Main Flow</h5>
                  <ol class="task-list">
                    <li v-for="(task, i) in uc.tasks" :key="i">{{ task }}</li>
                    <li v-if="!uc.tasks || uc.tasks.length === 0">No tasks defined</li>
                  </ol>
                </div>
              </div>
              <div class="grid-card-actions" @click.stop>
                <button class="btn-secondary" @click="showEditUsecaseModal(uc)">
                  <span class="material-symbols-outlined">edit</span>
                  Edit
                </button>
                <button class="btn-danger" @click="showDeleteConfirm(uc)">
                  <span class="material-symbols-outlined">delete</span>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- List View -->
        <div v-else-if="viewMode === 'list'" class="usecase-list-view">
          <div
            v-for="(uc, index) in filteredUseCases"
            :key="getUsecaseId(uc)"
            class="usecase-list-item"
            :class="{ expanded: expandedUseCaseId === getUsecaseId(uc) }"
          >
            <div class="list-item-header" @click="toggleUseCase(getUsecaseId(uc))">
              <div class="list-item-main">
                <div class="list-item-id">{{ formatUsecaseId(uc, getUseCaseIndex(uc)) }}</div>
                <div class="list-item-info">
                  <h4>{{ uc.name }}</h4>
                  <p class="list-item-goal">{{ uc.goal || 'No goal specified' }}</p>
                </div>
              </div>
              <div class="list-item-meta">
                <span class="priority-badge" :class="`priority-${uc.priority}`">
                  {{ uc.priority }}
                </span>
                <span class="role-badge">{{ uc.role?.name || 'Undefined' }}</span>
                <div class="list-item-actions" @click.stop>
                  <button class="btn-icon" @click="showEditUsecaseModal(uc)" title="Edit">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="btn-icon danger" @click="showDeleteConfirm(uc)" title="Delete">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            </div>
            <div v-if="expandedUseCaseId === getUsecaseId(uc)" class="list-item-details">
              <div class="list-details-grid">
                <div class="detail-section">
                  <h5>Description</h5>
                  <p>{{ uc.reason || 'No description available' }}</p>
                </div>
                <div class="detail-section">
                  <h5>Context</h5>
                  <p>{{ uc.context || 'No context specified' }}</p>
                </div>
                <div class="detail-section full-width">
                  <h5>Main Flow</h5>
                  <ol class="task-list">
                    <li v-for="(task, i) in uc.tasks" :key="i">{{ task }}</li>
                    <li v-if="!uc.tasks || uc.tasks.length === 0">No tasks defined</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Compact View -->
        <div v-else-if="viewMode === 'compact'" class="usecase-compact-view">
          <div
            v-for="(uc, index) in filteredUseCases"
            :key="getUsecaseId(uc)"
            class="usecase-compact-item"
            :class="{ expanded: expandedUseCaseId === getUsecaseId(uc) }"
            @click="toggleUseCase(getUsecaseId(uc))"
          >
            <div class="compact-item-header">
              <div class="compact-id">{{ formatUsecaseId(uc, getUseCaseIndex(uc)) }}</div>
              <div class="compact-info">
                <h4>{{ uc.name }}</h4>
                <p>{{ uc.goal || 'No goal' }}</p>
              </div>
              <div class="compact-badges">
                <span class="priority-badge" :class="`priority-${uc.priority}`">
                  {{ uc.priority }}
                </span>
              </div>
            </div>
            <div v-if="expandedUseCaseId === getUsecaseId(uc)" class="compact-item-details">
              <div class="compact-details-content">
                <p><strong>Description:</strong> {{ uc.reason || 'N/A' }}</p>
                <p><strong>Main Flow:</strong></p>
                <ol class="task-list">
                  <li v-for="(task, i) in uc.tasks" :key="i">{{ task }}</li>
                </ol>
              </div>
              <div class="compact-item-actions" @click.stop>
                <button class="btn-secondary sm" @click="showEditUsecaseModal(uc)">
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <button class="btn-danger sm" @click="showDeleteConfirm(uc)">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
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
          <button class="btn-close" @click="closeDeleteModal">
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
          <button class="btn-secondary" @click="closeDeleteModal">Cancel</button>
          <button class="btn-danger" @click="confirmDelete" :disabled="deleting">
            <span v-if="deleting" class="button-spinner"></span>
            {{ deleting ? 'Deleting...' : 'Delete Use Case' }}
          </button>
        </div>
      </div>
    </div>
    <!-- Export Modal -->
    <UsecaseSpecDocExport
      v-if="showExportModalFlag"
      :show-export-modal="showExportModalFlag"
      :use-cases="useCases"
      :selected-use-cases="selectedUseCases"
      :project-info="projectInfo"
      @close="closeExportModal"
    />
  </div>
</template>

<script>
import { useToast } from 'vue-toastification'
import AddEditUseCaseModal from './AddEditUseCaseModal.vue'
import UsecaseSpecDocExport from './UsecaseSpecDocExport.vue'

export default {
  name: 'UseCaseMainContent',
  components: {
    AddEditUseCaseModal,
    UsecaseSpecDocExport,
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
    projectData: {
      type: Object,
      default: () => ({}),
    },
  },
  data() {
    return {
      expandedUseCaseId: null,
      expandedGroups: this.loadExpandedGroupsState(),
      searchQuery: '',
      roleFilter: '',
      priorityFilter: '',
      viewMode: this.loadViewMode(), // 'grouped', 'grid', 'list', 'compact'

      // Modal states
      showUsecaseModal: false,
      showDeleteModal: false,
      showExportModalFlag: false,
      isEditing: false,
      submitting: false,
      deleting: false,

      // Form data
      usecaseForm: this.getEmptyForm(),
      usecaseToDelete: null,

      // Export data
      selectedUseCases: [],
      projectInfo: {},

      toast: useToast(),
    }
  },
  computed: {
    useCaseMap() {
      if (!this.useCases || this.useCases.length === 0) {
        return {}
      }
      return this.useCases.reduce((map, uc) => {
        const id = String(uc._id || uc.id || '')
        map[id] = uc
        return map
      }, {})
    },
    groupedUseCases() {
      if (!this.useCases || this.useCases.length === 0) {
        return {}
      }

      const groups = this.useCases.reduce((groups, uc) => {
        const role = uc.role.name || 'Undefined'
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
    filteredGroupedUseCases() {
      let filtered = { ...this.groupedUseCases }

      // Apply role filter
      if (this.roleFilter) {
        if (this.roleFilter in filtered) {
          const temp = {}
          temp[this.roleFilter] = filtered[this.roleFilter]
          filtered = temp
        } else {
          return {}
        }
      }

      // Apply search and priority filters to each group
      Object.keys(filtered).forEach((role) => {
        filtered[role] = filtered[role].filter((uc) => {
          const matchesSearch =
            !this.searchQuery ||
            uc.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
            uc.goal?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
            `UC-${this.getUsecaseId(uc)}`.toLowerCase().includes(this.searchQuery.toLowerCase())

          const matchesPriority = !this.priorityFilter || uc.priority === this.priorityFilter

          return matchesSearch && matchesPriority
        })
      })

      // Remove empty groups
      Object.keys(filtered).forEach((role) => {
        if (filtered[role].length === 0) {
          delete filtered[role]
        }
      })

      return filtered
    },
    availableRoles() {
      return Object.keys(this.groupedUseCases)
    },
    highPriorityCount() {
      return this.useCases.filter((uc) => uc.priority === 'high').length
    },
    completedCount() {
      return this.useCases.filter((uc) => uc.name && uc.goal && uc.tasks && uc.tasks.length > 0)
        .length
    },
    // Filtered use cases for non-grouped views
    filteredUseCases() {
      let filtered = [...this.useCases]

      // Apply role filter
      if (this.roleFilter) {
        filtered = filtered.filter(
          (uc) => (uc.role?.name || 'Undefined') === this.roleFilter
        )
      }

      // Apply search filter
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(
          (uc) =>
            uc.name.toLowerCase().includes(query) ||
            uc.goal?.toLowerCase().includes(query) ||
            this.formatUsecaseId(uc).toLowerCase().includes(query)
        )
      }

      // Apply priority filter
      if (this.priorityFilter) {
        filtered = filtered.filter((uc) => uc.priority === this.priorityFilter)
      }

      return filtered
    },
  },
  methods: {
    // Helper: Get usecase ID (support both _id and id for backward compatibility)
    getUsecaseId(uc) {
      if (!uc) return ''
      return String(uc._id || uc.id || '')
    },
    // Helper: Format usecase ID to short readable format (e.g., UC-001, UC-002)
    formatUsecaseId(uc, index = null) {
      if (!uc) return 'UC-???'
      const id = String(uc._id || uc.id || '')
      
      // Always try to use index-based format if available
      if (index !== null && index !== undefined) {
        const paddedIndex = String(index + 1).padStart(3, '0')
        return `UC-${paddedIndex}`
      }
      
      // Fallback: Try to extract number from ID or use hash
      const numericMatch = id.match(/\d+/)
      if (numericMatch) {
        const num = parseInt(numericMatch[0])
        return `UC-${String(num).padStart(3, '0')}`
      }
      
      // Last resort: use first 8 characters
      const shortId = id.length > 8 ? id.substring(0, 8) : id
      return `UC-${shortId.toUpperCase()}`
    },
    // Helper: Get usecase name for display
    getUsecaseName(uc) {
      if (!uc) return 'Unknown Use Case'
      return uc.name || uc.goal || 'Unnamed Use Case'
    },
    // Helper: Get usecase index in all usecases for consistent ID formatting
    getUseCaseIndex(uc) {
      if (!uc) return null
      const id = this.getUsecaseId(uc)
      return this.useCases.findIndex((u) => this.getUsecaseId(u) === id)
    },
    // Use Case CRUD Operations
    async submitUsecaseForm(formData) {
      if (this.submitting) return
      this.submitting = true
      try {
        if (this.isEditing) {
          const usecaseId = String(formData._id || formData.id || '')
          if (!usecaseId) {
            console.warn('⚠️ No ID in submitted form — skipping update.')
            return
          }
          await this.$emit('updateUsecase', {
            usecaseId: usecaseId,
            data: formData,
          })
        } else {
          await this.$emit('addUsecase', formData)
        }
        this.closeUsecaseModal()
      } catch (error) {
        const { formatErrorForDisplay } = require('@/utils/errorMessages')
        this.toast.error(formatErrorForDisplay(error, 'Failed to save use case. Please try again.'))
      } finally {
        this.submitting = false
      }
    },
    async confirmDelete() {
      this.deleting = true
      try {
        const usecaseId = this.getUsecaseId(this.usecaseToDelete)
        await this.$emit('deleteUsecase', usecaseId)
        this.closeDeleteModal()
      } catch (error) {
        console.error('Deletion failed from parent:', error)
        this.toast.error('Failed to delete use case')
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
    },

    closeDeleteModal() {
      this.showDeleteModal = false
      this.usecaseToDelete = null
    },

    // Export Methods
    showExportModal() {
      this.projectInfo = {
        id: this.projectId,
        name: this.projectData.name || 'Project',
        version: this.versionId,
        description: this.projectData.description || '',
      }
      this.showExportModalFlag = true
    },

    closeExportModal() {
      this.showExportModalFlag = false
      this.selectedUseCases = []
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

    // UI Methods
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

    formatLastModified(dateString) {
      if (!dateString) return 'Unknown'
      return new Date(dateString).toLocaleDateString('en-US')
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
    loadViewMode() {
      try {
        const saved = localStorage.getItem('usecaseViewMode')
        return saved || 'grouped'
      } catch (error) {
        console.error('Error loading view mode:', error)
        return 'grouped'
      }
    },
    saveViewMode() {
      try {
        localStorage.setItem('usecaseViewMode', this.viewMode)
      } catch (error) {
        console.error('Error saving view mode:', error)
      }
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
    viewMode: {
      handler(newMode) {
        this.saveViewMode()
      },
    },
  },
}
</script>

<style scoped>
.main-content {
  flex: 3;
  background: #f9fafb;
  padding: 0;
  overflow-y: auto;
}

.usecase-area {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

/* Header Styles */
.content-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.header-info h2 {
  font-size: 2rem;
  font-weight: 700;
  color: #1a365d;
  margin: 0 0 8px 0;
}

.subtitle {
  color: #6b7280;
  font-size: 1.1rem;
  margin: 0;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #1a365d;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;
}

.header-actions {
  display: flex;
  gap: 12px;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.btn-primary:hover {
  background: #2d4a8a;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #3b82f6;
}

.stat-card.total {
  border-left-color: #3b82f6;
}

.stat-card.roles {
  border-left-color: #8b5cf6;
}

.stat-card.high-priority {
  border-left-color: #ef4444;
}

.stat-card.completed {
  border-left-color: #10b981;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
}

.stat-card.total .stat-icon {
  background: #dbeafe;
  color: #3b82f6;
}

.stat-card.roles .stat-icon {
  background: #ede9fe;
  color: #8b5cf6;
}

.stat-card.high-priority .stat-icon {
  background: #fee2e2;
  color: #ef4444;
}

.stat-card.completed .stat-icon {
  background: #d1fae5;
  color: #10b981;
}

.stat-info h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: #1f2937;
}

.stat-info p {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
}

/* Toolbar */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-box .material-symbols-outlined {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 40px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #1a365d;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.filter-options {
  display: flex;
  gap: 12px;
}

/* View Mode Selector */
.view-mode-selector {
  display: flex;
  gap: 4px;
  background: #f3f4f6;
  padding: 4px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.view-mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
}

.view-mode-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.view-mode-btn.active {
  background: #1a365d;
  color: white;
}

.view-mode-btn .material-symbols-outlined {
  font-size: 20px;
}

.filter-select {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
}

/* Use Case Groups */
.usecase-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.usecase-group-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.group-header {
  padding: 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.3s ease;
}

.group-header:hover {
  background: #f1f5f9;
}

.group-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.group-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.group-count {
  background: #e5e7eb;
  color: #6b7280;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.expand-icon {
  font-size: 1.25rem;
  font-weight: bold;
  color: #6b7280;
  transition: transform 0.3s ease;
}

.group-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Use Case Cards */
.usecase-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.usecase-card:hover {
  border-color: #9ca3af;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.usecase-card.expanded {
  border-color: #1a365d;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.usecase-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.usecase-basic-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.usecase-id-badge {
  background: #1a365d;
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.usecase-name {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  flex: 1;
}

.priority-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.priority-high {
  background: #fee2e2;
  color: #dc2626;
}

.priority-medium {
  background: #fef3c7;
  color: #d97706;
}

.priority-low {
  background: #d1fae5;
  color: #059669;
}

.usecase-meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #6b7280;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-icon {
  padding: 6px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.3s ease;
}

.btn-icon:hover {
  background: #f3f4f6;
  color: #374151;
}

.btn-icon.danger:hover {
  background: #fee2e2;
  color: #dc2626;
}

/* Use Case Details */
.usecase-details {
  padding: 20px;
  border-top: 1px solid #e5e7eb;
  background: white;
  border-radius: 0 0 8px 8px;
  max-height: none;
  overflow: visible;
}

.usecase-details.expanded-full {
  padding: 24px;
  background: #f9fafb;
}

.expanded-content {
  max-height: none;
  overflow: visible;
}

.details-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
}

.detail-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  align-items: start;
}

.detail-section {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  height: 100%;
  min-height: 120px;
  display: flex;
  flex-direction: column;
}

.detail-section.full-width {
  grid-column: 1 / -1;
}

.detail-section h5 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-section p {
  margin: 0;
  color: #4b5563;
  line-height: 1.5;
  font-size: 0.875rem;
  flex: 1;
}

.task-list,
.condition-list,
.exception-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-list {
  padding-left: 12px;
  list-style-type: decimal;
}

.task-list li,
.condition-list li {
  color: #4b5563;
  font-size: 0.875rem;
  line-height: 1.5;
}

.exception-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #dc2626;
  font-size: 0.875rem;
  line-height: 1.5;
}

.exception-list .material-symbols-outlined {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
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

.tag-related {
  background: #f3e8ff;
  color: #7c3aed;
}

.detail-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-danger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-danger:disabled {
  background: #fca5a5;
  cursor: not-allowed;
}

/* Loading and Empty States */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-left: 4px solid #1a365d;
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

.empty-icon {
  width: 80px;
  height: 80px;
  background: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.empty-icon .material-symbols-outlined {
  font-size: 40px;
  color: #9ca3af;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #374151;
  font-size: 1.25rem;
}

.empty-state p {
  margin: 0 0 24px 0;
  color: #6b7280;
  text-align: center;
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
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.delete-modal {
  max-width: 500px;
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
  color: #1f2937;
  font-size: 1.25rem;
}

.btn-close {
  padding: 8px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: background 0.3s ease;
}

.btn-close:hover {
  background: #f3f4f6;
}

.modal-body {
  padding: 24px;
}

.warning-text {
  color: #dc2626;
  font-weight: 500;
  margin-top: 8px;
  font-size: 0.875rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
}

.button-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
  margin-right: 8px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .usecase-area {
    padding: 16px;
  }

  .content-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    max-width: none;
  }

  .filter-options {
    justify-content: space-between;
  }

  .usecase-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .usecase-basic-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .usecase-meta {
    width: 100%;
    justify-content: space-between;
  }

  .detail-actions {
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .detail-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .detail-row {
    grid-template-columns: 1fr;
  }
}

/* ========== GRID VIEW STYLES ========== */
.usecase-grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.usecase-grid-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.usecase-grid-card:hover {
  border-color: #1a365d;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.usecase-grid-card.expanded {
  border-color: #1a365d;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.grid-card-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.grid-card-id {
  background: #1a365d;
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  display: inline-block;
  width: fit-content;
}

.grid-card-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  line-height: 1.4;
}

.grid-card-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.role-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  background: #e0e7ff;
  color: #3730a3;
}

.grid-card-details {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.grid-details-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.grid-card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

/* ========== LIST VIEW STYLES ========== */
.usecase-list-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.usecase-list-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.usecase-list-item:hover {
  border-color: #1a365d;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.usecase-list-item.expanded {
  border-color: #1a365d;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.list-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  gap: 16px;
}

.list-item-main {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.list-item-id {
  background: #1a365d;
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  flex-shrink: 0;
}

.list-item-info {
  flex: 1;
  min-width: 0;
}

.list-item-info h4 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.list-item-goal {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-item-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.list-item-actions {
  display: flex;
  gap: 4px;
}

.list-item-details {
  padding: 20px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.list-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

/* ========== COMPACT VIEW STYLES ========== */
.usecase-compact-view {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.usecase-compact-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 16px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.usecase-compact-item:hover {
  border-color: #1a365d;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.usecase-compact-item.expanded {
  border-color: #1a365d;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.compact-item-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.compact-id {
  background: #1a365d;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  flex-shrink: 0;
  min-width: 60px;
  text-align: center;
}

.compact-info {
  flex: 1;
  min-width: 0;
}

.compact-info h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 2px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact-info p {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact-badges {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.compact-item-details {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.compact-details-content {
  margin-bottom: 12px;
}

.compact-details-content p {
  font-size: 0.875rem;
  color: #4b5563;
  margin: 8px 0;
  line-height: 1.5;
}

.compact-item-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.btn-secondary.sm,
.btn-danger.sm {
  padding: 6px 10px;
  font-size: 0.75rem;
}

.btn-secondary.sm .material-symbols-outlined,
.btn-danger.sm .material-symbols-outlined {
  font-size: 16px;
}

/* ========== IMPROVED EXPANDED VIEW ========== */
.usecase-details {
  max-height: none;
  overflow: visible;
}

.details-grid {
  max-height: none;
  overflow-y: visible;
}

.detail-section {
  max-height: none;
  overflow: visible;
}

.detail-section.full-width {
  min-height: auto;
}

/* Responsive adjustments for new views */
@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    gap: 12px;
  }

  .toolbar-right {
    width: 100%;
    justify-content: space-between;
  }

  .view-mode-selector {
    order: -1;
  }

  .usecase-grid-view {
    grid-template-columns: 1fr;
  }

  .list-item-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .list-item-meta {
    width: 100%;
    justify-content: space-between;
  }
}
</style>