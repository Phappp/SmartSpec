<template>
  <div class="main-content">
    <div class="usecase-area">
      <!-- Header với thống kê -->
      <!-- Thay thế phần content-header hiện tại -->
      <div class="content-header">
        <div class="header-info">
          <!-- <h2>Use Cases Management</h2>
          <p class="subtitle">Manage and organize your system use cases and requirements</p> -->
        </div>
        <div class="header-actions">
          <button class="btn-primary" @click="showAddUsecaseModal">
            <span class="material-symbols-outlined">add</span>
            Add Use Case
          </button>
          <button
            class="btn-secondary"
            @click="$emit('find-conflicts')"
            :disabled="isFindingConflicts"
          >
            <span v-if="isFindingConflicts" class="button-spinner-small"></span>
            <span v-else class="material-symbols-outlined">rule</span>
            {{ isFindingConflicts ? 'Scanning...' : 'Scan for Duplicates' }}
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
              <div class="filter-icon-wrapper">
                <button 
                  class="filter-icon-btn" 
                  @click.stop="toggleRoleFilter"
                  :title="getRoleFilterLabel()"
                >
                  <span class="material-symbols-outlined">groups</span>
                </button>
                <div 
                  v-if="showRoleFilter" 
                  class="filter-dropdown-menu"
                  @click.stop
                >
                  <button 
                    class="filter-option" 
                    :class="{ active: roleFilter === '' }"
                    @click="setRoleFilter('')"
                  >
                    <span class="material-symbols-outlined">filter_alt_off</span>
                    All Roles
                  </button>
                  <button 
                    v-for="role in availableRoles" 
                    :key="role"
                    class="filter-option" 
                    :class="{ active: roleFilter === role }"
                    @click="setRoleFilter(role)"
                  >
                    <span class="material-symbols-outlined">person</span>
                    {{ role }}
                  </button>
                </div>
              </div>
              <div class="filter-icon-wrapper">
                <button 
                  class="filter-icon-btn" 
                  @click.stop="togglePriorityFilter"
                  :title="getPriorityFilterLabel()"
                >
                  <span class="material-symbols-outlined">priority_high</span>
                </button>
                <div 
                  v-if="showPriorityFilter" 
                  class="filter-dropdown-menu"
                  @click.stop
                >
                  <button 
                    class="filter-option" 
                    :class="{ active: priorityFilter === '' }"
                    @click="setPriorityFilter('')"
                  >
                    <span class="material-symbols-outlined">filter_alt_off</span>
                    All Priorities
                  </button>
                  <button 
                    class="filter-option" 
                    :class="{ active: priorityFilter === 'high' }"
                    @click="setPriorityFilter('high')"
                  >
                    <span class="material-symbols-outlined">error</span>
                    High
                  </button>
                  <button 
                    class="filter-option" 
                    :class="{ active: priorityFilter === 'medium' }"
                    @click="setPriorityFilter('medium')"
                  >
                    <span class="material-symbols-outlined">remove</span>
                    Medium
                  </button>
                  <button 
                    class="filter-option" 
                    :class="{ active: priorityFilter === 'low' }"
                    @click="setPriorityFilter('low')"
                  >
                    <span class="material-symbols-outlined">arrow_downward</span>
                    Low
                  </button>
                </div>
              </div>
            </div>
            <!-- View Mode Selector -->
            <div class="view-mode-selector">
              <button
                class="view-mode-btn"
                :class="{ active: viewMode === 'table' }"
                @click="viewMode = 'table'"
                title="Table View"
              >
                <span class="material-symbols-outlined">table_rows</span>
              </button>
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
            <!-- Column Visibility Menu (for table view) -->
            <div v-if="viewMode === 'table'" class="column-visibility-menu">
              <button
                class="btn-icon"
                @click="showColumnMenu = !showColumnMenu"
                title="Column Options"
              >
                <span class="material-symbols-outlined">view_column</span>
              </button>
              <div v-if="showColumnMenu" class="column-menu-dropdown" @click.stop>
                <div class="column-menu-header">
                  <h4>Show/Hide Columns</h4>
                  <button class="btn-close-menu" @click="showColumnMenu = false">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div class="column-menu-content">
                  <label
                    v-for="column in columnOptions"
                    :key="column.key"
                    class="column-menu-item"
                    :class="{ disabled: column.required }"
                  >
                    <input
                      type="checkbox"
                      :checked="visibleColumns[column.key]"
                      :disabled="column.required"
                      @change="toggleColumn(column.key)"
                    />
                    <span class="column-label">{{ column.label }}</span>
                    <span v-if="column.required" class="required-badge">Required</span>
                  </label>
                </div>
                <div class="column-menu-footer">
                  <button class="btn-reset-columns" @click="resetColumns">Reset to Default</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Table View -->
        <div v-if="viewMode === 'table'" class="usecase-table-view">
          <!-- Sorting Options -->
          <div class="sorting-section">
            <span class="sort-label">Sort by:</span>
            <div class="sort-options">
              <button
                class="sort-option"
                :class="{ active: sortBy === 'name' }"
                @click="setSort('name')"
              >
                Name
                <span
                  class="material-symbols-outlined sort-icon"
                  :class="{ 'sort-desc': sortOrder === 'desc' }"
                >
                  unfold_more
                </span>
              </button>
              <button
                class="sort-option"
                :class="{ active: sortBy === 'priority' }"
                @click="setSort('priority')"
              >
                Priority
                <span
                  class="material-symbols-outlined sort-icon"
                  :class="{ 'sort-desc': sortOrder === 'desc' }"
                >
                  unfold_more
                </span>
              </button>
              <button
                class="sort-option"
                :class="{ active: sortBy === 'role' }"
                @click="setSort('role')"
              >
                Role
                <span
                  class="material-symbols-outlined sort-icon"
                  :class="{ 'sort-desc': sortOrder === 'desc' }"
                >
                  unfold_more
                </span>
              </button>
            </div>
          </div>

          <!-- Table Container -->
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th class="checkbox-column">
                    <input
                      type="checkbox"
                      v-model="selectAll"
                      @change="toggleSelectAll"
                      :disabled="filteredUseCases.length === 0"
                    />
                  </th>
                  <th class="id-column">ID</th>
                  <th class="name-column">Name</th>
                  <th v-if="visibleColumns.goal" class="goal-column">Goal</th>
                  <th v-if="visibleColumns.role" class="role-column">Role</th>
                  <th v-if="visibleColumns.priority" class="priority-column">Priority</th>
                  <th v-if="visibleColumns.tasks" class="tasks-column">Tasks</th>
                  <th class="actions-column">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(uc, index) in paginatedUseCases"
                  :key="getUsecaseId(uc)"
                  :class="{
                    selected: selectedUseCases.includes(getUsecaseId(uc)),
                    'row-even': index % 2 === 0,
                    'row-odd': index % 2 !== 0,
                    'new-usecase': isNewUsecase(uc),
                  }"
                  class="usecase-row"
                  @mouseenter="handleUsecaseHover(uc)"
                >
                  <td class="checkbox-column">
                    <input type="checkbox" :value="getUsecaseId(uc)" v-model="selectedUseCases" />
                  </td>
                  <td class="id-column">
                    <span class="usecase-id">{{ formatUsecaseId(uc, getUseCaseIndex(uc)) }}</span>
                  </td>
                  <td class="name-column">
                    <div class="usecase-name-cell">
                      <div class="name-main">{{ uc.name }}</div>
                      <div v-if="uc.goal && !visibleColumns.goal" class="name-goal">
                        {{ uc.goal }}
                      </div>
                    </div>
                  </td>
                  <td v-if="visibleColumns.goal" class="goal-column">
                    <span class="goal-text">{{ uc.goal || 'No goal specified' }}</span>
                  </td>
                  <td v-if="visibleColumns.role" class="role-column">
                    <span class="role-badge">{{ uc.role?.name || 'Undefined' }}</span>
                  </td>
                  <td v-if="visibleColumns.priority" class="priority-column">
                    <span class="priority-badge" :class="`priority-${uc.priority || 'medium'}`">
                      {{ uc.priority || 'medium' }}
                    </span>
                  </td>
                  <td v-if="visibleColumns.tasks" class="tasks-column">
                    <span class="tasks-count">{{ uc.tasks?.length || 0 }} tasks</span>
                  </td>
                  <td class="actions-column">
                    <div class="action-buttons">
                      <button class="btn-icon" @click="showUsecaseDetail(uc)" title="View Details">
                        <span class="material-symbols-outlined">visibility</span>
                      </button>
                      <button class="btn-icon" @click="showEditUsecaseModal(uc)" title="Edit">
                        <span class="material-symbols-outlined">edit</span>
                      </button>
                      <button class="btn-icon danger" @click="showDeleteConfirm(uc)" title="Delete">
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Empty State -->
            <div v-if="filteredUseCases.length === 0" class="empty-state">
              <span class="material-symbols-outlined">list_alt</span>
              <h3>No use cases found</h3>
              <p v-if="hasActiveFilters">Try adjusting your filters or search terms.</p>
              <p v-else>Create your first use case to define system requirements.</p>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="filteredUseCases.length > 0" class="pagination">
            <div class="pagination-info">
              Showing {{ pagination.startIndex + 1 }} to {{ pagination.endIndex }} of
              {{ filteredUseCases.length }} use cases
            </div>
            <div class="pagination-controls">
              <button
                class="btn-icon"
                @click="previousPage"
                :disabled="pagination.currentPage === 1"
              >
                <span class="material-symbols-outlined">chevron_left</span>
              </button>
              <div class="page-numbers">
                <button
                  v-for="page in visiblePages"
                  :key="page"
                  class="page-number"
                  :class="{ active: page === pagination.currentPage }"
                  @click="goToPage(page)"
                >
                  {{ page }}
                </button>
              </div>
              <button
                class="btn-icon"
                @click="nextPage"
                :disabled="pagination.currentPage === pagination.totalPages"
              >
                <span class="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
            <div class="page-size-selector">
              <label for="pageSize">Show:</label>
              <select
                id="pageSize"
                v-model="pagination.pageSize"
                @change="handlePageSizeChange"
                class="page-size-select"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>

          <!-- Bulk Actions -->
          <div v-if="selectedUseCases.length > 0" class="bulk-actions">
            <div class="bulk-info">
              <span class="material-symbols-outlined">check_circle</span>
              {{ selectedUseCases.length }} use case(s) selected
            </div>
            <div class="bulk-buttons">
              <button class="btn-secondary" @click="showBulkRoleModal = true" :disabled="loading">
                <span class="material-symbols-outlined">group</span>
                Change Role
              </button>
              <button
                class="btn-secondary"
                @click="showBulkPriorityModal = true"
                :disabled="loading"
              >
                <span class="material-symbols-outlined">priority_high</span>
                Change Priority
              </button>
              <button class="btn-secondary danger" @click="bulkDelete" :disabled="loading">
                <span class="material-symbols-outlined">delete</span>
                Delete Selected
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
                :class="{
                  expanded: expandedUseCaseId === getUsecaseId(uc),
                  'new-usecase': isNewUsecase(uc),
                }"
                @mouseenter="handleUsecaseHover(uc)"
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
                <div
                  v-if="expandedUseCaseId === getUsecaseId(uc)"
                  class="usecase-details expanded-full"
                >
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
                            <template v-else>
                              Use Case {{ String(relatedId).substring(0, 8) }}...
                            </template>
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
            :class="{
              expanded: expandedUseCaseId === getUsecaseId(uc),
              'new-usecase': isNewUsecase(uc),
            }"
            @click="toggleUseCase(getUsecaseId(uc))"
            @mouseenter="handleUsecaseHover(uc)"
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
            :class="{
              expanded: expandedUseCaseId === getUsecaseId(uc),
              'new-usecase': isNewUsecase(uc),
            }"
            @mouseenter="handleUsecaseHover(uc)"
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
            :class="{
              expanded: expandedUseCaseId === getUsecaseId(uc),
              'new-usecase': isNewUsecase(uc),
            }"
            @click="toggleUseCase(getUsecaseId(uc))"
            @mouseenter="handleUsecaseHover(uc)"
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

    <!-- Bulk Role Change Modal -->
    <div v-if="showBulkRoleModal" class="modal-overlay" @click="showBulkRoleModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Change Role for {{ selectedUseCases.length }} Use Case(s)</h3>
          <button class="btn-close" @click="showBulkRoleModal = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="bulkRole">Select Role:</label>
            <select id="bulkRole" v-model="bulkRoleValue" class="form-select">
              <option value="">-- Select Role --</option>
              <option v-for="role in availableRoles" :key="role" :value="role">
                {{ role }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" v-model="createNewRole" />
              Create new role if not exists
            </label>
          </div>
          <div v-if="createNewRole" class="form-group">
            <label for="newRoleName">New Role Name:</label>
            <input
              id="newRoleName"
              v-model="newRoleName"
              type="text"
              class="form-input"
              placeholder="Enter role name"
            />
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showBulkRoleModal = false">Cancel</button>
          <button
            class="btn-primary"
            @click="bulkUpdateRole"
            :disabled="
              loading || (!bulkRoleValue && !createNewRole) || (createNewRole && !newRoleName)
            "
          >
            <span v-if="loading" class="button-spinner"></span>
            {{ loading ? 'Updating...' : 'Update Role' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Priority Change Modal -->
    <div v-if="showBulkPriorityModal" class="modal-overlay" @click="showBulkPriorityModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Change Priority for {{ selectedUseCases.length }} Use Case(s)</h3>
          <button class="btn-close" @click="showBulkPriorityModal = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="bulkPriority">Select Priority:</label>
            <select id="bulkPriority" v-model="bulkPriorityValue" class="form-select">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showBulkPriorityModal = false">Cancel</button>
          <button class="btn-primary" @click="bulkUpdatePriority" :disabled="loading">
            <span v-if="loading" class="button-spinner"></span>
            {{ loading ? 'Updating...' : 'Update Priority' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Use Case Detail Modal -->
    <div v-if="showDetailModal && viewingUsecase" class="modal-overlay" @click="closeDetailModal">
      <div class="modal-content detail-modal" @click.stop>
        <div class="modal-header">
          <h3>Use Case Details</h3>
          <button class="btn-close" @click="closeDetailModal">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body detail-modal-body">
          <div class="detail-header">
            <div class="detail-header-main">
              <span class="usecase-id-badge">{{
                formatUsecaseId(viewingUsecase, getUseCaseIndex(viewingUsecase))
              }}</span>
              <h4 class="usecase-name">{{ viewingUsecase.name }}</h4>
            </div>
            <div class="detail-header-meta">
              <span
                class="priority-badge"
                :class="`priority-${viewingUsecase.priority || 'medium'}`"
              >
                {{ viewingUsecase.priority || 'medium' }}
              </span>
              <span class="role-badge">{{ viewingUsecase.role?.name || 'Undefined' }}</span>
            </div>
          </div>

          <div class="details-grid expanded-content">
            <!-- Row 1: Goal, Description, Context -->
            <div class="detail-row">
              <div class="detail-section">
                <h5>Goal</h5>
                <p>{{ viewingUsecase.goal || 'No goal specified' }}</p>
              </div>
              <div class="detail-section">
                <h5>Description</h5>
                <p>{{ viewingUsecase.reason || 'No description available' }}</p>
              </div>
              <div class="detail-section">
                <h5>Context</h5>
                <p>{{ viewingUsecase.context || 'No context specified' }}</p>
              </div>
            </div>

            <!-- Row 2: Main Flow (Full Width) -->
            <div class="detail-row">
              <div class="detail-section full-width">
                <h5>Main Flow</h5>
                <ol class="task-list">
                  <li v-for="(task, i) in viewingUsecase.tasks" :key="i">{{ task }}</li>
                  <li v-if="!viewingUsecase.tasks || viewingUsecase.tasks.length === 0">
                    No tasks defined
                  </li>
                </ol>
              </div>
            </div>

            <!-- Row 3: Preconditions & Postconditions -->
            <div class="detail-row">
              <div class="detail-section">
                <h5>Preconditions</h5>
                <ul class="condition-list">
                  <li v-for="(item, i) in viewingUsecase.preconditions" :key="i">{{ item }}</li>
                  <li
                    v-if="
                      !viewingUsecase.preconditions || viewingUsecase.preconditions.length === 0
                    "
                  >
                    None
                  </li>
                </ul>
              </div>
              <div class="detail-section">
                <h5>Postconditions</h5>
                <ul class="condition-list">
                  <li v-for="(item, i) in viewingUsecase.postconditions" :key="i">{{ item }}</li>
                  <li
                    v-if="
                      !viewingUsecase.postconditions || viewingUsecase.postconditions.length === 0
                    "
                  >
                    None
                  </li>
                </ul>
              </div>
            </div>

            <!-- Row 4: Inputs & Outputs -->
            <div class="detail-row">
              <div class="detail-section">
                <h5>Inputs</h5>
                <div class="tag-list">
                  <span v-for="item in viewingUsecase.inputs" :key="item" class="tag tag-input">{{
                    item
                  }}</span>
                  <span
                    v-if="!viewingUsecase.inputs || viewingUsecase.inputs.length === 0"
                    class="tag tag-meta"
                    >None</span
                  >
                </div>
              </div>
              <div class="detail-section">
                <h5>Outputs</h5>
                <div class="tag-list">
                  <span v-for="item in viewingUsecase.outputs" :key="item" class="tag tag-output">{{
                    item
                  }}</span>
                  <span
                    v-if="!viewingUsecase.outputs || viewingUsecase.outputs.length === 0"
                    class="tag tag-meta"
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
                  <li v-for="(item, i) in viewingUsecase.triggers" :key="i">{{ item }}</li>
                  <li v-if="!viewingUsecase.triggers || viewingUsecase.triggers.length === 0">
                    None
                  </li>
                </ul>
              </div>
              <div class="detail-section">
                <h5>Business Rules</h5>
                <ul class="condition-list">
                  <li v-for="(item, i) in viewingUsecase.rules" :key="i">{{ item }}</li>
                  <li v-if="!viewingUsecase.rules || viewingUsecase.rules.length === 0">None</li>
                </ul>
              </div>
              <div class="detail-section">
                <h5>Constraints</h5>
                <ul class="condition-list">
                  <li v-for="(item, i) in viewingUsecase.constraints" :key="i">{{ item }}</li>
                  <li v-if="!viewingUsecase.constraints || viewingUsecase.constraints.length === 0">
                    None
                  </li>
                </ul>
              </div>
            </div>

            <!-- Row 6: Exceptions (Full Width) -->
            <div class="detail-row">
              <div class="detail-section full-width">
                <h5>Exceptions</h5>
                <ul class="exception-list">
                  <li v-for="(item, i) in viewingUsecase.exceptions" :key="i">
                    <span class="material-symbols-outlined">warning</span>
                    {{ item }}
                  </li>
                  <li v-if="!viewingUsecase.exceptions || viewingUsecase.exceptions.length === 0">
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
                  <span
                    v-for="item in viewingUsecase.stakeholders"
                    :key="item"
                    class="tag tag-meta"
                    >{{ item }}</span
                  >
                  <span
                    v-if="!viewingUsecase.stakeholders || viewingUsecase.stakeholders.length === 0"
                    class="tag tag-meta"
                    >None</span
                  >
                </div>
              </div>
              <div class="detail-section">
                <h5>Related Use Cases</h5>
                <div class="tag-list">
                  <span
                    v-for="relatedId in viewingUsecase.related_usecases"
                    :key="relatedId"
                    class="tag tag-related"
                  >
                    <template v-if="useCaseMap[relatedId]">
                      {{ getUsecaseName(useCaseMap[relatedId]) }}
                    </template>
                    <template v-else>
                      Use Case {{ String(relatedId).substring(0, 8) }}...
                    </template>
                  </span>
                  <span
                    v-if="
                      !viewingUsecase.related_usecases ||
                      viewingUsecase.related_usecases.length === 0
                    "
                    class="tag tag-meta"
                    >None</span
                  >
                </div>
              </div>
            </div>

            <!-- Row 8: Feedback -->
            <div v-if="viewingUsecase.feedback" class="detail-row">
              <div class="detail-section full-width">
                <h5>Feedback</h5>
                <p>{{ viewingUsecase.feedback }}</p>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="closeDetailModal">Close</button>
          <button class="btn-primary" @click="editFromDetail">
            <span class="material-symbols-outlined">edit</span>
            Edit Use Case
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useToast } from 'vue-toastification'
import AddEditUseCaseModal from './AddEditUseCaseModal.vue'
import UsecaseSpecDocExport from './UsecaseSpecDocExport.vue'
import { usecaseApi } from '@/api/project'
import { formatErrorForDisplay } from '@/utils/errorMessages'

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
    isFindingConflicts: {
      type: Boolean,
      default: false,
    },
    newUseCaseIds: {
      type: Set,
      default: () => new Set(),
    },
  },
  emits: [
    'addUsecase',
    'updateUsecase',
    'deleteUsecase',
    'refresh',
    'find-conflicts',
    'remove-highlight',
  ],
  data() {
    return {
      expandedUseCaseId: null,
      expandedGroups: this.loadExpandedGroupsState(),
      searchQuery: '',
      roleFilter: '',
      priorityFilter: '',
      showRoleFilter: false,
      showPriorityFilter: false,
      viewMode: this.loadViewMode(), // 'table', 'grouped', 'grid', 'list', 'compact'

      // Table view states
      showColumnMenu: false,
      sortBy: 'name',
      sortOrder: 'asc',
      selectedUseCases: [],
      selectAll: false,
      pagination: {
        currentPage: 1,
        pageSize: 25,
        totalPages: 1,
        startIndex: 0,
        endIndex: 0,
      },

      // Column visibility
      columnOptions: [
        //{ key: 'goal', label: 'Goal', required: false },
        { key: 'role', label: 'Role', required: false },
        { key: 'priority', label: 'Priority', required: false },
        { key: 'tasks', label: 'Tasks', required: false },
      ],
      defaultVisibleColumns: {
        goal: true,
        role: true,
        priority: true,
        tasks: true,
      },
      visibleColumns: {
        goal: true,
        role: true,
        priority: true,
        tasks: true,
      },

      // Modal states
      showUsecaseModal: false,
      showDeleteModal: false,
      showExportModalFlag: false,
      showDetailModal: false,
      viewingUsecase: null,
      isEditing: false,
      submitting: false,
      deleting: false,
      // Bulk action modals
      showBulkRoleModal: false,
      showBulkPriorityModal: false,
      bulkRoleValue: '',
      bulkPriorityValue: 'medium',
      createNewRole: false,
      newRoleName: '',
      loading: false,

      // Form data
      usecaseForm: this.getEmptyForm(),
      usecaseToDelete: null,

      // Export data
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
        filtered = filtered.filter((uc) => (uc.role?.name || 'Undefined') === this.roleFilter)
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
    // Has active filters
    hasActiveFilters() {
      return this.searchQuery || this.roleFilter || this.priorityFilter
    },
    // Sorted use cases for table view
    sortedUseCases() {
      let sorted = [...this.filteredUseCases]

      sorted.sort((a, b) => {
        let aValue, bValue

        if (this.sortBy === 'name') {
          aValue = a.name || ''
          bValue = b.name || ''
        } else if (this.sortBy === 'priority') {
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          aValue = priorityOrder[a.priority] || 0
          bValue = priorityOrder[b.priority] || 0
        } else if (this.sortBy === 'role') {
          aValue = a.role?.name || 'Undefined'
          bValue = b.role?.name || 'Undefined'
        } else {
          aValue = a[this.sortBy] || ''
          bValue = b[this.sortBy] || ''
        }

        if (this.sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
        }
      })

      return sorted
    },
    // Paginated use cases
    paginatedUseCases() {
      const startIndex = (this.pagination.currentPage - 1) * this.pagination.pageSize
      const endIndex = startIndex + this.pagination.pageSize

      this.pagination.startIndex = startIndex
      this.pagination.endIndex = Math.min(endIndex, this.sortedUseCases.length)
      this.pagination.totalPages = Math.ceil(this.sortedUseCases.length / this.pagination.pageSize)

      return this.sortedUseCases.slice(startIndex, endIndex)
    },
    // Visible pages for pagination
    visiblePages() {
      const pages = []
      const totalPages = this.pagination.totalPages
      const currentPage = this.pagination.currentPage

      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        if (currentPage <= 4) {
          for (let i = 1; i <= 5; i++) {
            pages.push(i)
          }
          pages.push('...')
          pages.push(totalPages)
        } else if (currentPage >= totalPages - 3) {
          pages.push(1)
          pages.push('...')
          for (let i = totalPages - 4; i <= totalPages; i++) {
            pages.push(i)
          }
        } else {
          pages.push(1)
          pages.push('...')
          for (let i = currentPage - 1; i <= currentPage + 1; i++) {
            pages.push(i)
          }
          pages.push('...')
          pages.push(totalPages)
        }
      }

      return pages
    },
  },
  methods: {
    // Helper: Get usecase ID (support both _id and id for backward compatibility)
    getUsecaseId(uc) {
      if (!uc) return ''
      return String(uc._id || uc.id || '')
    },
    // Helper: Check if usecase is newly added
    isNewUsecase(uc) {
      if (!this.newUseCaseIds || this.newUseCaseIds.size === 0) return false
      const id = this.getUsecaseId(uc)
      return this.newUseCaseIds.has(id)
    },
    // Handle hover to remove highlight
    handleUsecaseHover(uc) {
      if (this.isNewUsecase(uc)) {
        const id = this.getUsecaseId(uc)
        this.newUseCaseIds.delete(id)
        // Emit event to parent to update newUseCaseIds
        this.$emit('remove-highlight', id)
      }
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

    showUsecaseDetail(usecase) {
      this.viewingUsecase = { ...usecase }
      this.showDetailModal = true
    },

    closeDetailModal() {
      this.showDetailModal = false
      this.viewingUsecase = null
    },

    editFromDetail() {
      if (this.viewingUsecase) {
        this.closeDetailModal()
        this.showEditUsecaseModal(this.viewingUsecase)
      }
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
        return saved || 'table' // Default to table view
      } catch (error) {
        console.error('Error loading view mode:', error)
        return 'table'
      }
    },
    saveViewMode() {
      try {
        localStorage.setItem('usecaseViewMode', this.viewMode)
      } catch (error) {
        console.error('Error saving view mode:', error)
      }
    },
    // Column visibility methods
    loadColumnVisibility() {
      try {
        const saved = localStorage.getItem('usecaseColumnVisibility')
        if (saved) {
          const parsed = JSON.parse(saved)
          return { ...this.defaultVisibleColumns, ...parsed }
        }
      } catch (error) {
        console.error('Error loading column visibility:', error)
      }
      return { ...this.defaultVisibleColumns }
    },
    saveColumnVisibility() {
      try {
        localStorage.setItem('usecaseColumnVisibility', JSON.stringify(this.visibleColumns))
      } catch (error) {
        console.error('Error saving column visibility:', error)
      }
    },
    toggleColumn(columnKey) {
      // Ensure the key exists, default to true if not set
      if (this.visibleColumns[columnKey] === undefined) {
        this.visibleColumns[columnKey] = true
      }
      this.visibleColumns[columnKey] = !this.visibleColumns[columnKey]
      this.saveColumnVisibility()
    },
    resetColumns() {
      this.visibleColumns = { ...this.defaultVisibleColumns }
      this.saveColumnVisibility()
      this.toast.info('Column visibility reset to default')
    },
    // Sorting methods
    setSort(field) {
      if (this.sortBy === field) {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortBy = field
        this.sortOrder = 'asc'
      }
    },
    // Pagination methods
    goToPage(page) {
      if (page !== '...') {
        this.pagination.currentPage = page
      }
    },
    previousPage() {
      if (this.pagination.currentPage > 1) {
        this.pagination.currentPage--
      }
    },
    nextPage() {
      if (this.pagination.currentPage < this.pagination.totalPages) {
        this.pagination.currentPage++
      }
    },
    handlePageSizeChange() {
      this.pagination.currentPage = 1
    },
    // Selection methods
    toggleSelectAll() {
      if (this.selectAll) {
        this.selectedUseCases = this.paginatedUseCases.map((uc) => this.getUsecaseId(uc))
      } else {
        this.selectedUseCases = []
      }
    },
    // Click outside handler for column menu
    handleClickOutsideColumnMenu(event) {
      if (!event || !event.target) return
      if (this.showColumnMenu && !event.target.closest('.column-visibility-menu')) {
        this.showColumnMenu = false
      }
    },
    // Filter dropdown methods
    toggleRoleFilter() {
      this.showRoleFilter = !this.showRoleFilter
      this.showPriorityFilter = false
    },
    togglePriorityFilter() {
      this.showPriorityFilter = !this.showPriorityFilter
      this.showRoleFilter = false
    },
    setRoleFilter(value) {
      this.roleFilter = value
      this.showRoleFilter = false
    },
    setPriorityFilter(value) {
      this.priorityFilter = value
      this.showPriorityFilter = false
    },
    getRoleFilterLabel() {
      if (this.roleFilter === '') return 'All Roles'
      return this.roleFilter
    },
    getPriorityFilterLabel() {
      if (this.priorityFilter === '') return 'All Priorities'
      return this.priorityFilter.charAt(0).toUpperCase() + this.priorityFilter.slice(1)
    },
    handleClickOutsideFilters(event) {
      if (!event.target.closest('.filter-icon-wrapper')) {
        this.showRoleFilter = false
        this.showPriorityFilter = false
      }
    },
    // Bulk operations
    async bulkUpdateRole() {
      if (this.selectedUseCases.length === 0) {
        this.toast.warning('No use cases selected')
        return
      }

      let roleToUpdate = this.bulkRoleValue

      // If creating new role, use newRoleName
      if (this.createNewRole && this.newRoleName) {
        roleToUpdate = this.newRoleName.trim()
      }

      if (!roleToUpdate) {
        this.toast.warning('Please select or enter a role')
        return
      }

      this.loading = true
      let successCount = 0
      let failCount = 0
      const total = this.selectedUseCases.length

      try {
        // Update each usecase individually
        for (const usecaseId of this.selectedUseCases) {
          try {
            // Get current usecase data
            const usecase = this.useCases.find((uc) => this.getUsecaseId(uc) === usecaseId)
            if (!usecase) {
              failCount++
              continue
            }

            // Prepare update data with role
            const updateData = {
              ...usecase,
              role: {
                name: roleToUpdate,
              },
            }

            await usecaseApi.updateUsecase(this.versionId, usecaseId, updateData)
            successCount++
          } catch (error) {
            console.error(`Error updating usecase ${usecaseId}:`, error)
            failCount++
          }
        }

        if (successCount > 0) {
          this.toast.success(
            `Updated role for ${successCount} use case(s)${
              failCount > 0 ? `, ${failCount} failed` : ''
            }`
          )
        } else {
          this.toast.error(`Failed to update all ${total} use case(s)`)
        }

        this.selectedUseCases = []
        this.selectAll = false
        this.showBulkRoleModal = false
        this.bulkRoleValue = ''
        this.createNewRole = false
        this.newRoleName = ''

        // Emit event to parent to refresh usecases
        this.$emit('refresh')
      } catch (error) {
        console.error('Error bulk updating role:', error)
        const errorMessage = formatErrorForDisplay(error, 'Failed to update use cases')
        this.toast.error(errorMessage)
      } finally {
        this.loading = false
      }
    },
    async bulkUpdatePriority() {
      if (this.selectedUseCases.length === 0) {
        this.toast.warning('No use cases selected')
        return
      }

      if (!this.bulkPriorityValue) {
        this.toast.warning('Please select a priority')
        return
      }

      this.loading = true
      let successCount = 0
      let failCount = 0
      const total = this.selectedUseCases.length

      try {
        // Update each usecase individually
        for (const usecaseId of this.selectedUseCases) {
          try {
            // Get current usecase data
            const usecase = this.useCases.find((uc) => this.getUsecaseId(uc) === usecaseId)
            if (!usecase) {
              failCount++
              continue
            }

            // Prepare update data with priority
            const updateData = {
              ...usecase,
              priority: this.bulkPriorityValue,
            }

            await usecaseApi.updateUsecase(this.versionId, usecaseId, updateData)
            successCount++
          } catch (error) {
            console.error(`Error updating usecase ${usecaseId}:`, error)
            failCount++
          }
        }

        if (successCount > 0) {
          this.toast.success(
            `Updated priority for ${successCount} use case(s)${
              failCount > 0 ? `, ${failCount} failed` : ''
            }`
          )
        } else {
          this.toast.error(`Failed to update all ${total} use case(s)`)
        }

        this.selectedUseCases = []
        this.selectAll = false
        this.showBulkPriorityModal = false
        this.bulkPriorityValue = 'medium'

        // Emit event to parent to refresh usecases
        this.$emit('refresh')
      } catch (error) {
        console.error('Error bulk updating priority:', error)
        const errorMessage = formatErrorForDisplay(error, 'Failed to update use cases')
        this.toast.error(errorMessage)
      } finally {
        this.loading = false
      }
    },
    async bulkDelete() {
      if (this.selectedUseCases.length === 0) {
        this.toast.warning('No use cases selected')
        return
      }

      if (
        !confirm(
          `Are you sure you want to delete ${this.selectedUseCases.length} use case(s)? This action cannot be undone.`
        )
      ) {
        return
      }

      this.loading = true
      let successCount = 0
      let failCount = 0
      const total = this.selectedUseCases.length

      try {
        // Delete each usecase individually
        for (const usecaseId of this.selectedUseCases) {
          try {
            await usecaseApi.deleteUsecase(this.versionId, usecaseId)
            successCount++
          } catch (error) {
            console.error(`Error deleting usecase ${usecaseId}:`, error)
            failCount++
          }
        }

        if (successCount > 0) {
          this.toast.success(
            `Deleted ${successCount} use case(s)${failCount > 0 ? `, ${failCount} failed` : ''}`
          )
        } else {
          this.toast.error(`Failed to delete all ${total} use case(s)`)
        }

        this.selectedUseCases = []
        this.selectAll = false

        // Emit event to parent to refresh usecases
        this.$emit('refresh')
      } catch (error) {
        console.error('Error bulk deleting:', error)
        const errorMessage = formatErrorForDisplay(error, 'Failed to delete use cases')
        this.toast.error(errorMessage)
      } finally {
        this.loading = false
      }
    },
  },
  created() {
    // Load column visibility from localStorage and merge with defaults
    const loadedColumns = this.loadColumnVisibility()
    // Merge loaded columns into visibleColumns, ensuring all keys exist
    Object.keys(this.defaultVisibleColumns).forEach((key) => {
      if (loadedColumns[key] !== undefined) {
        this.visibleColumns[key] = loadedColumns[key]
      } else {
        this.visibleColumns[key] = this.defaultVisibleColumns[key]
      }
    })
  },
  mounted() {
    // Add click outside listener for column menu
    document.addEventListener('click', this.handleClickOutsideColumnMenu)
    // Add click outside listener for filter dropdowns
    document.addEventListener('click', this.handleClickOutsideFilters)
  },
  beforeUnmount() {
    // Remove click outside listener
    document.removeEventListener('click', this.handleClickOutsideColumnMenu)
    document.removeEventListener('click', this.handleClickOutsideFilters)
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
        // Reset pagination when switching views
        if (newMode === 'table') {
          this.pagination.currentPage = 1
        }
      },
    },
    selectedUseCases: {
      handler(newSelection) {
        this.selectAll =
          newSelection.length > 0 && newSelection.length === this.paginatedUseCases.length
      },
    },
    filteredUseCases: {
      handler() {
        // Reset to first page when filters change
        this.pagination.currentPage = 1
        // Clear selection when filters change
        this.selectedUseCases = []
        this.selectAll = false
      },
    },
  },
}
</script>

<style scoped>
.main-content {
  flex: 3;
  min-width: 0; /* Cho phép flex item co lại dưới min-content */
  background: #f9fafb;
  padding: 0;
  overflow-y: auto;
  overflow-x: hidden; /* Ẩn thanh cuộn ngang */
}

.usecase-area {
  max-width: 1400px;
  width: 100%; /* Đảm bảo không vượt quá container */
  margin: 0 auto;
  padding: 24px;
  box-sizing: border-box; /* Bao gồm padding trong width */
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

/* Filter Icon Buttons */
.filter-icon-wrapper {
  position: relative;
  display: inline-block;
}

.filter-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 40px;
  height: 40px;
}

.filter-icon-btn:hover {
  background: #f9fafb;
  border-color: #1a365d;
  color: #1a365d;
}

.filter-icon-btn .material-symbols-outlined {
  font-size: 20px;
}

.filter-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 180px;
  z-index: 100;
  overflow: hidden;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-option:hover {
  background: #f9fafb;
}

.filter-option.active {
  background: #e6f2ff;
  color: #1a365d;
  font-weight: 500;
}

.filter-option .material-symbols-outlined {
  font-size: 18px;
  color: #6b7280;
}

.filter-option.active .material-symbols-outlined {
  color: #1a365d;
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

.detail-modal {
  max-width: 1200px;
  width: 95%;
}

.detail-modal-body {
  padding: 24px;
  max-height: calc(90vh - 140px);
  overflow-y: auto;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.detail-header-main {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.detail-header-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
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
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
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

/* ========== TABLE VIEW STYLES ========== */
.usecase-table-view {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  width: 100%;
  min-width: 0; /* Cho phép co lại */
  max-width: 100%; /* Không vượt quá container */
}

.sorting-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.sort-label {
  font-weight: 500;
  color: #6b7280;
  font-size: 0.875rem;
}

.sort-options {
  display: flex;
  gap: 0.5rem;
}

.sort-option {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  color: #1a365d;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sort-option:hover {
  border-color: #1a365d;
  color: #1a365d;
}

.sort-option.active {
  background: #1a365d;
  border-color: #1a365d;
  color: white;
}

.sort-option.sort-desc .sort-icon {
  transform: rotate(180deg);
}

.sort-icon {
  font-size: 1rem;
  transition: transform 0.2s ease;
}

.table-container {
  max-height: 600px;
  overflow-y: auto;
  overflow-x: auto; /* Cho phép cuộn ngang nếu table quá rộng */
  width: 100%;
}

table {
  width: 100%;
  min-width: 0; /* Cho phép table co lại */
  border-collapse: collapse;
  table-layout: auto; /* Tự động điều chỉnh cột */
}

thead {
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 10;
}

th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #6b7280;
  font-size: 0.875rem;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}

td {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.checkbox-column {
  width: 40px;
  text-align: center;
}

.id-column {
  width: 80px;
  text-align: center;
  font-weight: 500;
  color: #6b7280;
}

.name-column {
  min-width: 150px; /* Giảm min-width để tránh overflow */
  max-width: 300px; /* Thêm max-width */
}

.goal-column {
  min-width: 150px; /* Giảm min-width để tránh overflow */
  max-width: 250px; /* Thêm max-width */
}

.role-column,
.priority-column {
  width: 120px;
  text-align: left;
}

.tasks-column {
  width: 100px;
  text-align: center;
}

.actions-column {
  width: 120px;
}

.usecase-row {
  transition: background-color 0.2s ease;
}

.usecase-row.row-even {
  background-color: #ffffff;
}

.usecase-row.row-odd {
  background-color: #f8fafc;
}

.usecase-row:hover {
  background: #f1f5f9;
}

.usecase-row.selected {
  background: #dbeafe;
}

/* Highlight for newly added usecases */
.usecase-row.new-usecase {
  background: linear-gradient(90deg, #fef3c7 0%, #fde68a 50%, #fef3c7 100%);
  animation: highlightPulse 2s ease-in-out;
  border-left: 4px solid #f59e0b;
}

.usecase-list-item.new-usecase {
  background: linear-gradient(90deg, #fef3c7 0%, #fde68a 50%, #fef3c7 100%);
  animation: highlightPulse 2s ease-in-out;
  border-left: 4px solid #f59e0b;
}

.usecase-compact-item.new-usecase {
  background: linear-gradient(90deg, #fef3c7 0%, #fde68a 50%, #fef3c7 100%);
  animation: highlightPulse 2s ease-in-out;
  border-left: 4px solid #f59e0b;
}

.usecase-card.new-usecase {
  background: linear-gradient(90deg, #fef3c7 0%, #fde68a 50%, #fef3c7 100%);
  animation: highlightPulse 2s ease-in-out;
  border-left: 4px solid #f59e0b;
}

@keyframes highlightPulse {
  0%,
  100% {
    background: linear-gradient(90deg, #fef3c7 0%, #fde68a 50%, #fef3c7 100%);
  }
  50% {
    background: linear-gradient(90deg, #fde68a 0%, #fcd34d 50%, #fde68a 100%);
  }
}

.usecase-id {
  font-weight: 500;
  color: #1a365d;
  font-size: 0.875rem;
  font-family: 'Courier New', monospace;
}

.usecase-name-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.name-main {
  font-weight: 500;
  color: #1f2937;
}

.name-goal {
  font-size: 0.75rem;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.goal-text {
  font-size: 0.875rem;
  color: #4b5563;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  max-width: 200px;
}

.tasks-count {
  font-size: 0.875rem;
  color: #6b7280;
}

/* Pagination Styles */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: white;
}

.pagination-info {
  color: #6b7280;
  font-size: 0.875rem;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

.page-number {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  background: white;
  color: #1f2937;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.page-number:hover {
  border-color: #1a365d;
  color: #1a365d;
}

.page-number.active {
  background: #1a365d;
  border-color: #1a365d;
  color: white;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-size-selector label {
  color: #6b7280;
  font-size: 0.875rem;
}

.page-size-select {
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  color: #1f2937;
  font-size: 0.875rem;
}

/* Column Visibility Menu */
.column-visibility-menu {
  position: relative;
}

.column-menu-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border: 1px solid #e5e7eb;
  min-width: 280px;
  z-index: 1000;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.column-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.column-menu-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.btn-close-menu {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-close-menu:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.column-menu-content {
  padding: 8px 0;
  max-height: 300px;
  overflow-y: auto;
}

.column-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
}

.column-menu-item:hover:not(.disabled) {
  background: #f8fafc;
}

.column-menu-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.column-menu-item input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #1a365d;
}

.column-menu-item.disabled input[type='checkbox'] {
  cursor: not-allowed;
}

.column-label {
  flex: 1;
  font-size: 0.875rem;
  color: #1f2937;
  font-weight: 500;
}

.required-badge {
  font-size: 0.75rem;
  color: #9ca3af;
  font-style: italic;
}

.column-menu-footer {
  padding: 12px 20px;
  border-top: 1px solid #e5e7eb;
}

.btn-reset-columns {
  width: 100%;
  padding: 8px 16px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #1f2937;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset-columns:hover {
  background: #e5e7eb;
  border-color: #1a365d;
  color: #1a365d;
}

/* Bulk Actions Styles */
.bulk-actions {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 2px solid #1a365d;
  width: 70%;
  max-width: 800px;
  z-index: 1000;
}

.bulk-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #1a365d;
  font-weight: 500;
}

.bulk-buttons {
  display: flex;
  gap: 0.5rem;
}

.bulk-buttons .btn-secondary.danger {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #dc2626;
}

.bulk-buttons .btn-secondary.danger:hover {
  background: #dc2626;
  color: white;
}

/* Form Styles for Modals */
.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.form-select,
.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  color: #1f2937;
}

.form-select:focus,
.form-input:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

.form-group input[type='checkbox'] {
  margin-right: 0.5rem;
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #1a365d;
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

  .table-container {
    overflow-x: auto;
  }

  .pagination {
    flex-direction: column;
    gap: 1rem;
  }

  .pagination-controls {
    order: -1;
  }

  .page-size-selector {
    order: 1;
  }
}

/* Button Spinner */
.button-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
}
</style>