<template>
  <div class="uml-management-view">
    <ProjectHeader
      :project="project"
      :versions="versions"
      :selected-version-id="selectedVersionId"
      :active-users="activeUsers"
      @version-selected="handleVersionSelect"
      @go-back="goBack"
    />

    <!-- Navigation Tabs -->
    <div class="navigation-tabs">
      <button class="tab-button" @click="navigateToUsecase">
        <span class="material-symbols-outlined">list_alt</span>
        Use Cases
      </button>
      <button class="tab-button" @click="navigateToOutput">
        <span class="material-symbols-outlined">output</span>
        Output
      </button>
      <button class="tab-button active">
        <span class="material-symbols-outlined">schema</span>
        UML Diagrams
      </button>
    </div>

    <div class="uml-content">
      <!-- Header với Actions -->
      <div class="content-header">
        <div class="header-left">
          <h2>UML Diagram Management</h2>
          <p class="subtitle">Manage and visualize your system diagrams</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" @click="refreshDiagrams">
            <span class="material-symbols-outlined">refresh</span>
            Refresh
          </button>
          <button class="btn-primary" @click="generateNewDiagram">
            <span class="material-symbols-outlined">auto_awesome</span>
            Generate Diagram
          </button>
          <button class="btn-secondary" @click="openManualEditor">
            <span class="material-symbols-outlined">draw</span>
            Create Manually
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading diagrams...</p>
      </div>

      <!-- Diagrams Display - 3 loại diagram trên 3 hàng -->
      <div v-else class="diagrams-display">
        <!-- Use Case Diagrams Section -->
        <div class="diagram-section">
          <div class="section-header">
            <div class="section-title">
              <h3>Use Case Diagrams</h3>
              <span class="diagram-count">({{ usecaseDiagrams.length }})</span>
            </div>
            <div class="section-controls">
              <div class="search-box">
                <span class="material-symbols-outlined search-icon">search</span>
                <input
                  v-model="searchFilters.usecase"
                  type="text"
                  placeholder="Search use case diagrams..."
                  class="search-input"
                />
              </div>
              <div class="filter-controls">
                <select v-model="sortFilters.usecase" class="sort-select">
                  <option value="name">Sort by Name</option>
                  <option value="date">Sort by Date</option>
                  <option value="actors">Sort by Actors</option>
                  <option value="usecases">Sort by Use Cases</option>
                </select>
                <select v-model="languageFilters.usecase" class="lang-select">
                  <option value="all">All Languages</option>
                  <option value="en-US">English</option>
                  <option value="vi-VN">Vietnamese</option>
                </select>
              </div>
            </div>
          </div>

          <div class="diagrams-scroll-container">
            <div class="diagrams-scroll-content">
              <div
                v-for="diagram in filteredUsecaseDiagrams"
                :key="diagram.id || diagram._id"
                class="diagram-card"
                @click="editDiagram(diagram)"
              >
                <div class="diagram-preview">
                  <img
                    v-if="diagram.previewImage"
                    :src="diagram.previewImage"
                    :alt="diagram.name || 'Use Case Diagram'"
                    class="preview-image"
                    @load="onPreviewImageLoad"
                    @error="onPreviewImageError(diagram, $event)"
                  />
                  <div v-else class="preview-generator">
                    <UCDRenderer
                      :ref="`previewGenerator_${diagram.id || diagram._id}`"
                      :diagram-data="diagram"
                      :preview-mode="true"
                      :auto-generate-preview="true"
                      :optimize-for-preview="true"
                      @preview-generated="handlePreviewGenerated(diagram, $event)"
                      class="hidden-renderer"
                    />
                    <div class="generating-preview">
                      <div class="loading-spinner-small"></div>
                      <span>Generating preview...</span>
                    </div>
                  </div>

                  <div class="diagram-overlay">
                    <div class="export-dropdown">
                      <button
                        class="btn-icon export-toggle"
                        @click.stop="toggleExportDropdown(diagram)"
                        title="Export"
                      >
                        <span class="material-symbols-outlined">download</span>
                      </button>
                      <div
                        v-if="activeExportDropdown === (diagram.id || diagram._id)"
                        class="export-options"
                      >
                        <button class="export-option" @click.stop="exportDiagramAsPNG(diagram)">
                          <span class="material-symbols-outlined">image</span>
                          Export PNG
                        </button>
                        <button class="export-option" @click.stop="exportDiagramAsSVG(diagram)">
                          <span class="material-symbols-outlined">code</span>
                          Export SVG
                        </button>
                      </div>
                    </div>
                    <button
                      class="btn-icon danger"
                      @click.stop="deleteDiagram(diagram.id || diagram._id, $event)"
                      title="Delete"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
                <div class="diagram-info">
                  <h4>{{ getSafeValue(diagram.name, 'Unnamed Diagram') }}</h4>
                  <p class="diagram-description">
                    {{ getSafeValue(diagram.description, 'No description') }}
                  </p>
                  <div class="diagram-meta">
                    <span class="meta-item">
                      <span class="material-symbols-outlined">language</span>
                      {{ getLanguageCode(diagram.lang) }}
                    </span>
                    <span class="meta-item diagram-type-badge type-usecase"> Use Case </span>
                  </div>
                  <div class="diagram-stats">
                    <span class="stat-badge">
                      <span class="material-symbols-outlined">person</span>
                      {{ getSafeArrayLength(diagram.actors) }}
                    </span>
                    <span class="stat-badge">
                      <span class="material-symbols-outlined">task</span>
                      {{ getSafeArrayLength(diagram.usecases) }}
                    </span>
                    <span class="stat-badge">
                      <span class="material-symbols-outlined">link</span>
                      {{ getRelationshipCount(diagram) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Empty State for Use Case Diagrams -->
              <div v-if="filteredUsecaseDiagrams.length === 0" class="empty-section">
                <div class="empty-icon">
                  <span class="material-symbols-outlined">account_tree</span>
                </div>
                <h4>No Use Case Diagrams</h4>
                <p>Generate your first use case diagram to visualize system requirements.</p>
                <button class="btn-primary small" @click="generateSpecificDiagram('usecase')">
                  <span class="material-symbols-outlined">auto_awesome</span>
                  Generate Use Case
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Activity Diagrams Section -->
        <div class="diagram-section">
          <div class="section-header">
            <div class="section-title">
              <h3>Activity Diagrams</h3>
              <span class="diagram-count">({{ activityDiagrams.length }})</span>
            </div>
            <div class="section-controls">
              <div class="search-box">
                <span class="material-symbols-outlined search-icon">search</span>
                <input
                  v-model="searchFilters.activity"
                  type="text"
                  placeholder="Search activity diagrams..."
                  class="search-input"
                />
              </div>
              <div class="filter-controls">
                <select v-model="sortFilters.activity" class="sort-select">
                  <option value="name">Sort by Name</option>
                  <option value="date">Sort by Date</option>
                  <option value="nodes">Sort by Nodes</option>
                </select>
                <select v-model="languageFilters.activity" class="lang-select">
                  <option value="all">All Languages</option>
                  <option value="en-US">English</option>
                  <option value="vi-VN">Vietnamese</option>
                </select>
              </div>
            </div>
          </div>

          <div class="diagrams-scroll-container">
            <div class="diagrams-scroll-content">
              <div
                v-for="diagram in filteredActivityDiagrams"
                :key="diagram.id || diagram._id"
                class="diagram-card"
                @click="editDiagram(diagram)"
              >
                <div class="diagram-preview">
                  <img
                    v-if="diagram.previewImage"
                    :src="diagram.previewImage"
                    :alt="diagram.name || 'Activity Diagram'"
                    class="preview-image"
                    @load="onPreviewImageLoad"
                    @error="onPreviewImageError(diagram, $event)"
                  />
                  <div v-else class="preview-generator">
                    <ActivityDiagramRenderer
                      :ref="`previewGenerator_${diagram.id || diagram._id}`"
                      :diagram-data="diagram"
                      :preview-mode="true"
                      :auto-generate-preview="true"
                      :optimize-for-preview="true"
                      @preview-generated="handlePreviewGenerated(diagram, $event)"
                      class="hidden-renderer"
                    />
                    <div class="generating-preview">
                      <div class="loading-spinner-small"></div>
                      <span>Generating preview...</span>
                    </div>
                  </div>

                  <div class="diagram-overlay">
                    <div class="export-dropdown">
                      <button
                        class="btn-icon export-toggle"
                        @click.stop="toggleExportDropdown(diagram)"
                        title="Export"
                      >
                        <span class="material-symbols-outlined">download</span>
                      </button>
                      <div
                        v-if="activeExportDropdown === (diagram.id || diagram._id)"
                        class="export-options"
                      >
                        <button class="export-option" @click.stop="exportDiagramAsPNG(diagram)">
                          <span class="material-symbols-outlined">image</span>
                          Export PNG
                        </button>
                        <button class="export-option" @click.stop="exportDiagramAsSVG(diagram)">
                          <span class="material-symbols-outlined">code</span>
                          Export SVG
                        </button>
                      </div>
                    </div>
                    <button
                      class="btn-icon danger"
                      @click.stop="deleteDiagram(diagram.id || diagram._id, $event)"
                      title="Delete"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
                <div class="diagram-info">
                  <h4>{{ getSafeValue(diagram.name, 'Unnamed Diagram') }}</h4>
                  <p class="diagram-description">
                    {{ getSafeValue(diagram.description, 'No description') }}
                  </p>
                  <div class="diagram-meta">
                    <span class="meta-item">
                      <span class="material-symbols-outlined">language</span>
                      {{ getLanguageCode(diagram.lang) }}
                    </span>
                    <span class="meta-item diagram-type-badge type-activity"> Activity </span>
                  </div>
                  <div class="diagram-stats">
                    <span class="stat-badge">
                      <span class="material-symbols-outlined">play_arrow</span>
                      {{ getSafeArrayLength(diagram.nodes) }}
                    </span>
                    <span class="stat-badge">
                      <span class="material-symbols-outlined">link</span>
                      {{ getRelationshipCount(diagram) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Empty State for Activity Diagrams -->
              <div v-if="filteredActivityDiagrams.length === 0" class="empty-section">
                <div class="empty-icon">
                  <span class="material-symbols-outlined">play_arrow</span>
                </div>
                <h4>No Activity Diagrams</h4>
                <p>Generate activity diagrams to visualize workflow processes.</p>
                <button class="btn-primary small" @click="generateSpecificDiagram('activity')">
                  <span class="material-symbols-outlined">auto_awesome</span>
                  Generate Activity
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Sequence Diagrams Section -->
        <div class="diagram-section">
          <div class="section-header">
            <div class="section-title">
              <h3>Sequence Diagrams</h3>
              <span class="diagram-count">({{ sequenceDiagrams.length }})</span>
            </div>
            <div class="section-controls">
              <div class="search-box">
                <span class="material-symbols-outlined search-icon">search</span>
                <input
                  v-model="searchFilters.sequence"
                  type="text"
                  placeholder="Search sequence diagrams..."
                  class="search-input"
                />
              </div>
              <div class="filter-controls">
                <select v-model="sortFilters.sequence" class="sort-select">
                  <option value="name">Sort by Name</option>
                  <option value="date">Sort by Date</option>
                  <option value="lifelines">Sort by Lifelines</option>
                </select>
                <select v-model="languageFilters.sequence" class="lang-select">
                  <option value="all">All Languages</option>
                  <option value="en-US">English</option>
                  <option value="vi-VN">Vietnamese</option>
                </select>
              </div>
            </div>
          </div>

          <div class="diagrams-scroll-container">
            <div class="diagrams-scroll-content">
              <div
                v-for="diagram in filteredSequenceDiagrams"
                :key="diagram.id || diagram._id"
                class="diagram-card"
                @click="editDiagram(diagram)"
              >
                <div class="diagram-preview">
                  <img
                    v-if="diagram.previewImage"
                    :src="diagram.previewImage"
                    :alt="diagram.name || 'Sequence Diagram'"
                    class="preview-image"
                    @load="onPreviewImageLoad"
                    @error="onPreviewImageError(diagram, $event)"
                  />
                  <div v-else class="preview-generator">
                    <SequenceDiagramRenderer
                      :ref="`previewGenerator_${diagram.id || diagram._id}`"
                      :diagram-data="diagram"
                      :preview-mode="true"
                      :auto-generate-preview="true"
                      :optimize-for-preview="true"
                      @preview-generated="handlePreviewGenerated(diagram, $event)"
                      class="hidden-renderer"
                    />
                    <div class="generating-preview">
                      <div class="loading-spinner-small"></div>
                      <span>Generating preview...</span>
                    </div>
                  </div>

                  <div class="diagram-overlay">
                    <div class="export-dropdown">
                      <button
                        class="btn-icon export-toggle"
                        @click.stop="toggleExportDropdown(diagram)"
                        title="Export"
                      >
                        <span class="material-symbols-outlined">download</span>
                      </button>
                      <div
                        v-if="activeExportDropdown === (diagram.id || diagram._id)"
                        class="export-options"
                      >
                        <button class="export-option" @click.stop="exportDiagramAsPNG(diagram)">
                          <span class="material-symbols-outlined">image</span>
                          Export PNG
                        </button>
                        <button class="export-option" @click.stop="exportDiagramAsSVG(diagram)">
                          <span class="material-symbols-outlined">code</span>
                          Export SVG
                        </button>
                      </div>
                    </div>
                    <button
                      class="btn-icon danger"
                      @click.stop="deleteDiagram(diagram.id || diagram._id, $event)"
                      title="Delete"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
                <div class="diagram-info">
                  <h4>{{ getSafeValue(diagram.name, 'Unnamed Diagram') }}</h4>
                  <p class="diagram-description">
                    {{ getSafeValue(diagram.description, 'No description') }}
                  </p>
                  <div class="diagram-meta">
                    <span class="meta-item">
                      <span class="material-symbols-outlined">language</span>
                      {{ getLanguageCode(diagram.lang) }}
                    </span>
                    <span class="meta-item diagram-type-badge type-sequence"> Sequence </span>
                  </div>
                  <div class="diagram-stats">
                    <span class="stat-badge">
                      <span class="material-symbols-outlined">timeline</span>
                      {{ getSafeArrayLength(diagram.lifelines) }}
                    </span>
                    <span class="stat-badge">
                      <span class="material-symbols-outlined">link</span>
                      {{ getRelationshipCount(diagram) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Empty State for Sequence Diagrams -->
              <div v-if="filteredSequenceDiagrams.length === 0" class="empty-section">
                <div class="empty-icon">
                  <span class="material-symbols-outlined">timeline</span>
                </div>
                <h4>No Sequence Diagrams</h4>
                <p>Generate sequence diagrams to visualize object interactions.</p>
                <button class="btn-primary small" @click="generateSpecificDiagram('sequence')">
                  <span class="material-symbols-outlined">auto_awesome</span>
                  Generate Sequence
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Generate Diagram Modal -->
      <div v-if="showGenerateModal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Generate {{ getDiagramTypeName() }}</h3>
            <button class="btn-close" @click="closeGenerateModal">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="modal-body">
            <form @submit.prevent="generateDiagram">
              <div class="form-group">
                <label>Diagram Type</label>
                <select v-model="generateForm.type" required>
                  <option value="usecase">Use Case Diagram</option>
                  <option value="activity">Activity Diagram</option>
                  <option value="sequence">Sequence Diagram</option>
                </select>
              </div>

              <div class="form-group">
                <label>Language</label>
                <select v-model="generateForm.lang" required>
                  <option value="en-US">English</option>
                  <option value="vi-VN">Vietnamese</option>
                </select>
              </div>

              <!-- Sequence Diagram Options -->
              <div class="form-group" v-if="generateForm.type === 'sequence'">
                <label class="required">Use Case</label>
                <select v-model="generateForm.usecaseId" required>
                  <option value="">Select Use Case</option>
                  <option
                    v-for="usecase in availableUsecases"
                    :key="usecase.id"
                    :value="usecase.id"
                  >
                    {{ usecase.name || usecase.title }}
                  </option>
                </select>
                <div v-if="!availableUsecases.length" class="field-help">
                  No use cases available. Please create use cases first.
                </div>
              </div>

              <!-- Activity Diagram Options -->
              <div class="form-group" v-if="generateForm.type === 'activity'">
                <label class="required">Generation Source</label>
                <select v-model="generateForm.sourceType" required>
                  <option value="usecase">From Use Case</option>
                  <option value="actor">From Actor</option>
                </select>
              </div>

              <!-- Activity Diagram - Use Case Source -->
              <div
                class="form-group"
                v-if="generateForm.type === 'activity' && generateForm.sourceType === 'usecase'"
              >
                <label class="required">Use Case</label>
                <select v-model="generateForm.requirementId" required>
                  <option value="">Select Use Case</option>
                  <option
                    v-for="usecase in availableUsecases"
                    :key="usecase.id"
                    :value="usecase.id"
                  >
                    {{ usecase.name || usecase.title }}
                  </option>
                </select>
                <div v-if="!availableUsecases.length" class="field-help">
                  No use cases available. Please create use cases first.
                </div>
              </div>

              <!-- Activity Diagram - Actor Source -->
              <div
                class="form-group"
                v-if="generateForm.type === 'activity' && generateForm.sourceType === 'actor'"
              >
                <label class="required">Actor</label>
                <input
                  v-model="generateForm.actor"
                  type="text"
                  placeholder="Enter actor name"
                  required
                />
              </div>

              <div class="form-group">
                <label>Description</label>
                <textarea
                  v-model="generateForm.description"
                  rows="3"
                  placeholder="Enter diagram description"
                ></textarea>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-secondary" @click="closeGenerateModal">
                  Cancel
                </button>
                <button type="submit" class="btn-primary" :disabled="generating || !canGenerate">
                  <span v-if="generating" class="loading-spinner-small"></span>
                  {{ generating ? 'Generating...' : `Generate ${getDiagramTypeName()}` }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Diagram Editor Modal -->
      <div v-if="editingDiagram" class="modal-overlay large">
        <div class="modal-content fullscreen">
          <div class="modal-header">
            <h3>{{ editingDiagram.name }}</h3>
            <div class="modal-actions-header">
              <span class="diagram-type-label">{{ getDiagramTypeLabel(editingDiagram) }}</span>
              <button class="btn-close" @click="closeEditor">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          <div class="modal-body editor-body">
            <div class="editor-content">
              <div class="editor-main">
                <component
                  :is="getEditorComponent()"
                  ref="diagramEditor"
                  :diagram-data="editingDiagram"
                  :editable="true"
                  :show-labels="showElementLabels"
                  :zoom-level="zoomLevel"
                  @element-selected="handleElementSelect"
                  @position-updated="handlePositionUpdate"
                  @element-dragged="handleElementDrag"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getProjectDetail } from '@/api/project'
import { usecaseApi } from '@/api/project'
import {
  getUsecaseDiagrams,
  generateUsecaseDiagram,
  deleteUsecaseDiagram,
  updateMultiplePositions,
} from '@/api/ucd'
import {
  getActivityDiagrams,
  generateFromUsecase,
  generateFromActor,
  deleteActivityDiagram,
} from '@/api/avd'
import { getSequenceDiagrams, generateSequenceDiagram, deleteSequenceDiagram } from '@/api/sqd'
import { useToast } from 'vue-toastification'
import ProjectHeader from '@/components/ProjectHeader.vue'
import UCDRenderer from '@/components/uml/usecase_diagram/UCDRenderer.vue'
import ActivityDiagramRenderer from '@/components/uml/activity_diagram/ActivityDiagramRenderer.vue'
import SequenceDiagramRenderer from '@/components/uml/sequence_diagram/SequenceDiagramRenderer.vue'
import { useActiveMembers } from '@/utils/useActiveMembers'

export default {
  name: 'UmlManagement',
  components: {
    ProjectHeader,
    UCDRenderer,
    ActivityDiagramRenderer,
    SequenceDiagramRenderer,
  },
  setup() {
    const { activeUsers, initSocketConnection, cleanupSocketConnection } = useActiveMembers()
    return {
      activeUsers,
      initSocketConnection,
      cleanupSocketConnection,
    }
  },
  data() {
    return {
      project: {},
      versions: [],
      selectedVersionId: null,
      // Combined diagrams data
      usecaseDiagrams: [],
      activityDiagrams: [],
      sequenceDiagrams: [],
      loading: false,
      showGenerateModal: false,
      editingDiagram: null,
      generating: false,
      generateForm: {
        type: 'usecase',
        lang: 'en-US',
        description: '',
        usecaseId: '',
        sourceType: 'usecase',
        requirementId: '',
        actor: '',
      },
      availableUsecases: [],
      // Editor state
      selectedElement: null,
      selectedElementType: null,
      // View settings
      showElementLabels: true,
      zoomLevel: 1,
      // Preview management
      previewCache: new Map(),
      generatingPreviews: new Set(),
      activeExportDropdown: null,
      // Filter và search
      searchFilters: {
        usecase: '',
        activity: '',
        sequence: '',
      },
      sortFilters: {
        usecase: 'name',
        activity: 'name',
        sequence: 'name',
      },
      languageFilters: {
        usecase: 'all',
        activity: 'all',
        sequence: 'all',
      },
      toast: useToast(),
      saveTimeout: null,
    }
  },
  computed: {
    filteredUsecaseDiagrams() {
      let filtered = this.usecaseDiagrams

      // Search filter
      if (this.searchFilters.usecase) {
        const searchTerm = this.searchFilters.usecase.toLowerCase()
        filtered = filtered.filter(
          (diagram) =>
            diagram.name?.toLowerCase().includes(searchTerm) ||
            diagram.description?.toLowerCase().includes(searchTerm)
        )
      }

      // Language filter
      if (this.languageFilters.usecase !== 'all') {
        filtered = filtered.filter((diagram) => diagram.lang === this.languageFilters.usecase)
      }

      // Sort
      switch (this.sortFilters.usecase) {
        case 'name':
          filtered = filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
          break
        case 'date':
          filtered = filtered.sort(
            (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
          )
          break
        case 'actors':
          filtered = filtered.sort((a, b) => (b.actors?.length || 0) - (a.actors?.length || 0))
          break
        case 'usecases':
          filtered = filtered.sort((a, b) => (b.usecases?.length || 0) - (a.usecases?.length || 0))
          break
      }

      return filtered
    },
    filteredActivityDiagrams() {
      let filtered = this.activityDiagrams

      // Search filter
      if (this.searchFilters.activity) {
        const searchTerm = this.searchFilters.activity.toLowerCase()
        filtered = filtered.filter(
          (diagram) =>
            diagram.name?.toLowerCase().includes(searchTerm) ||
            diagram.description?.toLowerCase().includes(searchTerm)
        )
      }

      // Language filter
      if (this.languageFilters.activity !== 'all') {
        filtered = filtered.filter((diagram) => diagram.lang === this.languageFilters.activity)
      }

      // Sort
      switch (this.sortFilters.activity) {
        case 'name':
          filtered = filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
          break
        case 'date':
          filtered = filtered.sort(
            (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
          )
          break
        case 'nodes':
          filtered = filtered.sort((a, b) => (b.nodes?.length || 0) - (a.nodes?.length || 0))
          break
      }

      return filtered
    },
    filteredSequenceDiagrams() {
      let filtered = this.sequenceDiagrams

      // Search filter
      if (this.searchFilters.sequence) {
        const searchTerm = this.searchFilters.sequence.toLowerCase()
        filtered = filtered.filter(
          (diagram) =>
            diagram.name?.toLowerCase().includes(searchTerm) ||
            diagram.description?.toLowerCase().includes(searchTerm)
        )
      }

      // Language filter
      if (this.languageFilters.sequence !== 'all') {
        filtered = filtered.filter((diagram) => diagram.lang === this.languageFilters.sequence)
      }

      // Sort
      switch (this.sortFilters.sequence) {
        case 'name':
          filtered = filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
          break
        case 'date':
          filtered = filtered.sort(
            (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
          )
          break
        case 'lifelines':
          filtered = filtered.sort(
            (a, b) => (b.lifelines?.length || 0) - (a.lifelines?.length || 0)
          )
          break
      }

      return filtered
    },
    canGenerate() {
      // Kiểm tra điều kiện generate dựa trên loại diagram
      if (this.generateForm.type === 'sequence') {
        return !!this.generateForm.usecaseId
      }
      if (this.generateForm.type === 'activity') {
        if (this.generateForm.sourceType === 'usecase') {
          return !!this.generateForm.requirementId
        } else {
          return !!this.generateForm.actor?.trim()
        }
      }
      // Use case diagram luôn có thể generate
      return true
    },
  },
  watch: {
    filteredUsecaseDiagrams: {
      handler(newDiagrams) {
        this.triggerPreviewGenerationForDiagrams(newDiagrams, 'usecase')
      },
      deep: true,
      immediate: false,
    },
    filteredActivityDiagrams: {
      handler(newDiagrams) {
        this.triggerPreviewGenerationForDiagrams(newDiagrams, 'activity')
      },
      deep: true,
      immediate: false,
    },
    filteredSequenceDiagrams: {
      handler(newDiagrams) {
        this.triggerPreviewGenerationForDiagrams(newDiagrams, 'sequence')
      },
      deep: true,
      immediate: false,
    },
  },
  async created() {
    const projectId = this.$route.params.id
    if (projectId) {
      await this.fetchProjectData(projectId)
      await this.loadAvailableUsecases()
      await this.loadDiagrams()
      this.initSocketConnection(projectId)
    }
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeUnmount() {
    if (this.project._id) {
      this.cleanupSocketConnection(this.project._id)
    }
    document.removeEventListener('click', this.handleClickOutside)
  },
  methods: {
    // Navigation
    navigateToUsecase() {
      this.$router.push({
        name: 'Editor',
        params: { id: this.project._id },
      })
    },
    navigateToOutput() {
      this.$router.push({
        name: 'OutputManagement',
        params: { id: this.project._id },
      })
    },
    // Data methods
    async fetchProjectData(projectId) {
      try {
        const userId = 'CURRENT_LOGGED_IN_USER_ID'
        const { data } = await getProjectDetail(projectId, userId)
        const result = data.data || data
        this.project = result.project || {}
        this.versions = result.versions || []
        if (this.versions.length > 0) {
          this.selectedVersionId = this.versions[0]._id
        }
      } catch (err) {
        console.error('Error fetching project details:', err)
        this.toast.error('Failed to load project data')
      }
    },
    async loadAvailableUsecases() {
      if (!this.selectedVersionId) {
        this.availableUsecases = []
        return
      }
      try {
        const response = await usecaseApi.getUsecases(this.selectedVersionId)
        this.availableUsecases = response.data.data || []
        console.log('📋 Loaded available usecases:', this.availableUsecases)
      } catch (error) {
        console.error('Error loading usecases:', error)
        this.availableUsecases = []
        this.toast.error('Failed to load use cases')
      }
    },
    async loadDiagrams() {
      if (!this.selectedVersionId) {
        this.usecaseDiagrams = []
        this.activityDiagrams = []
        this.sequenceDiagrams = []
        return
      }
      this.loading = true
      try {
        // Load all diagram types in parallel
        const [usecaseResponse, activityResponse, sequenceResponse] = await Promise.all([
          getUsecaseDiagrams(this.selectedVersionId).catch(() => ({ data: { data: [] } })),
          getActivityDiagrams(this.selectedVersionId).catch(() => ({ data: { data: [] } })),
          getSequenceDiagrams(this.selectedVersionId).catch(() => ({ data: { data: [] } })),
        ])

        this.usecaseDiagrams = this.processDiagrams(usecaseResponse.data?.data || [], 'usecase')
        this.activityDiagrams = this.processDiagrams(activityResponse.data?.data || [], 'activity')
        this.sequenceDiagrams = this.processDiagrams(sequenceResponse.data?.data || [], 'sequence')

        this.$nextTick(() => {
          setTimeout(() => {
            this.triggerPreviewGenerationForAllDiagrams()
          }, 300)
        })
      } catch (err) {
        console.error('Error loading diagrams:', err)
        this.toast.error('Failed to load diagrams')
        this.usecaseDiagrams = []
        this.activityDiagrams = []
        this.sequenceDiagrams = []
      } finally {
        this.loading = false
      }
    },
    processDiagrams(diagrams, type) {
      return diagrams.map((diagram) => {
        const diagramId = diagram.id || diagram._id
        if (this.previewCache.has(diagramId)) {
          return {
            ...diagram,
            previewImage: this.previewCache.get(diagramId),
            _type: type,
          }
        }
        return {
          ...diagram,
          _type: type,
        }
      })
    },
    // Diagram Type Helpers
    getDiagramTypeName(plural = false) {
      const names = {
        usecase: plural ? 'Use Case Diagrams' : 'Use Case Diagram',
        activity: plural ? 'Activity Diagrams' : 'Activity Diagram',
        sequence: plural ? 'Sequence Diagrams' : 'Sequence Diagram',
      }
      return names[this.generateForm.type] || 'Diagram'
    },
    getDiagramTypeLabel(diagram) {
      const type = diagram._type || this.generateForm.type
      const labels = {
        usecase: 'Use Case',
        activity: 'Activity',
        sequence: 'Sequence',
      }
      return labels[type] || 'Diagram'
    },
    getDiagramTypeClass(diagram) {
      const type = diagram._type || this.generateForm.type
      return `type-${type}`
    },
    getDiagramIcon(diagram) {
      const type = diagram ? diagram._type || this.generateForm.type : this.generateForm.type
      const icons = {
        usecase: 'account_tree',
        activity: 'play_arrow',
        sequence: 'timeline',
      }
      return icons[type] || 'schema'
    },
    getEditorComponent() {
      const components = {
        usecase: 'UCDRenderer',
        activity: 'ActivityDiagramRenderer',
        sequence: 'SequenceDiagramRenderer',
      }
      const type = this.editingDiagram?._type || this.generateForm.type
      return components[type] || 'UCDRenderer'
    },
    getRelationshipCount(diagram) {
      const type = diagram._type || this.generateForm.type
      switch (type) {
        case 'usecase':
          return (diagram.associations?.length || 0) + (diagram.relationships?.length || 0)
        case 'activity':
          return diagram.edges?.length || 0
        case 'sequence':
          return diagram.messages?.length || 0
        default:
          return 0
      }
    },
    // Diagram actions
    generateNewDiagram() {
      this.generateForm.type = 'usecase'
      this.generateForm.lang = 'en-US'
      this.generateForm.description = ''
      this.generateForm.usecaseId = ''
      this.generateForm.sourceType = 'usecase'
      this.generateForm.requirementId = ''
      this.generateForm.actor = ''

      this.showGenerateModal = true
    },
    generateSpecificDiagram(type) {
      this.generateForm.type = type
      this.generateForm.lang = 'en-US'
      this.generateForm.description = ''
      this.generateForm.usecaseId = ''
      this.generateForm.sourceType = 'usecase'
      this.generateForm.requirementId = ''
      this.generateForm.actor = ''

      // Nếu không có usecase nào, hiển thị cảnh báo
      if (
        (type === 'sequence' ||
          (type === 'activity' && this.generateForm.sourceType === 'usecase')) &&
        this.availableUsecases.length === 0
      ) {
        this.toast.warning('Please create use cases first before generating diagrams')
        return
      }

      this.showGenerateModal = true
    },
    closeGenerateModal() {
      this.showGenerateModal = false
      this.resetGenerateForm()
    },
    async generateDiagram() {
      if (!this.selectedVersionId) {
        this.toast.error('Please select a version first')
        return
      }

      // Validate form
      if (!this.canGenerate) {
        this.toast.error('Please fill all required fields')
        return
      }

      this.generating = true
      try {
        let newDiagram

        switch (this.generateForm.type) {
          case 'activity':
            if (this.generateForm.sourceType === 'usecase') {
              const { data } = await generateFromUsecase(
                this.selectedVersionId,
                this.generateForm.requirementId,
                this.generateForm.lang
              )
              newDiagram = data?.data || data
            } else {
              const { data } = await generateFromActor(
                this.selectedVersionId,
                this.generateForm.actor,
                this.generateForm.lang
              )
              newDiagram = data?.data || data
            }
            break
          case 'sequence':
            const { data: sequenceData } = await generateSequenceDiagram(
              this.selectedVersionId,
              this.generateForm.usecaseId,
              this.generateForm.lang
            )
            newDiagram = sequenceData?.data || sequenceData
            break
          case 'usecase':
          default:
            const { data: usecaseData } = await generateUsecaseDiagram(
              this.selectedVersionId,
              this.generateForm.lang
            )
            newDiagram = usecaseData?.data || usecaseData
            break
        }

        if (newDiagram) {
          // Add to appropriate array
          newDiagram._type = this.generateForm.type
          switch (this.generateForm.type) {
            case 'activity':
              this.activityDiagrams.unshift(newDiagram)
              break
            case 'sequence':
              this.sequenceDiagrams.unshift(newDiagram)
              break
            case 'usecase':
            default:
              this.usecaseDiagrams.unshift(newDiagram)
              break
          }

          this.closeGenerateModal()
          this.toast.success(`${this.getDiagramTypeName()} generated successfully!`)

          setTimeout(() => {
            this.triggerPreviewGeneration(newDiagram)
          }, 1000)

          setTimeout(() => {
            this.editDiagram(newDiagram)
          }, 500)
        } else {
          throw new Error('No diagram data returned')
        }
      } catch (err) {
        console.error('Error generating diagram:', err)
        this.toast.error(
          `Failed to generate ${this.getDiagramTypeName()}: ${
            err.response?.data?.message || err.message
          }`
        )
      } finally {
        this.generating = false
      }
    },
    openManualEditor() {
      this.toast.info('Manual editor will be implemented in next version')
    },
    editDiagram(diagram) {
      this.editingDiagram = { ...diagram }
      this.selectedElement = null
      this.zoomLevel = 1
    },
    closeEditor() {
      const editedDiagramId = this.editingDiagram
        ? this.editingDiagram.id || this.editingDiagram._id
        : null
      const diagramType = this.editingDiagram?._type

      this.editingDiagram = null
      this.selectedElement = null

      if (editedDiagramId && diagramType) {
        const diagrams = this.getDiagramsByType(diagramType)
        const diagram = diagrams.find((d) => (d.id || d._id) === editedDiagramId)
        if (diagram) {
          console.log('🔄 Regenerating preview for edited diagram:', editedDiagramId)
          this.regeneratePreview(diagram)
          this.previewCache.delete(editedDiagramId)
        }
      }

      this.loadDiagrams().then(() => {
        console.log('🔄 Diagrams reloaded after closing editor')
      })
    },
    getDiagramsByType(type) {
      switch (type) {
        case 'activity':
          return this.activityDiagrams
        case 'sequence':
          return this.sequenceDiagrams
        case 'usecase':
        default:
          return this.usecaseDiagrams
      }
    },
    async deleteDiagram(diagramId, event) {
      if (event) {
        event.stopPropagation()
      }

      const diagram = this.findDiagramById(diagramId)
      if (!diagram) return

      const diagramName = diagram?.name || 'Unnamed Diagram'
      const diagramType = diagram._type || 'usecase'

      if (
        !confirm(`Are you sure you want to delete "${diagramName}"? This action cannot be undone.`)
      ) {
        return
      }

      const deleteButton = event?.target
      const originalHTML = deleteButton?.innerHTML
      if (deleteButton) {
        deleteButton.innerHTML = '<span class="loading-spinner-small"></span>'
        deleteButton.disabled = true
      }

      try {
        switch (diagramType) {
          case 'activity':
            await deleteActivityDiagram(diagramId)
            this.activityDiagrams = this.activityDiagrams.filter(
              (d) => (d.id || d._id) !== diagramId
            )
            break
          case 'sequence':
            await deleteSequenceDiagram(diagramId)
            this.sequenceDiagrams = this.sequenceDiagrams.filter(
              (d) => (d.id || d._id) !== diagramId
            )
            break
          case 'usecase':
          default:
            await deleteUsecaseDiagram(diagramId)
            this.usecaseDiagrams = this.usecaseDiagrams.filter((d) => (d.id || d._id) !== diagramId)
            break
        }

        this.previewCache.delete(diagramId)
        this.generatingPreviews.delete(diagramId)

        if (
          this.editingDiagram &&
          (this.editingDiagram.id || this.editingDiagram._id) === diagramId
        ) {
          this.closeEditor()
        }

        this.toast.success(`Diagram deleted successfully`)
      } catch (err) {
        console.error('Error deleting diagram:', err)
        this.toast.error(
          'Failed to delete diagram: ' + (err.response?.data?.message || err.message)
        )
      } finally {
        if (deleteButton) {
          deleteButton.innerHTML = originalHTML
          deleteButton.disabled = false
        }
      }
    },
    findDiagramById(diagramId) {
      return (
        this.usecaseDiagrams.find((d) => (d.id || d._id) === diagramId) ||
        this.activityDiagrams.find((d) => (d.id || d._id) === diagramId) ||
        this.sequenceDiagrams.find((d) => (d.id || d._id) === diagramId)
      )
    },
    // Preview Generation
    triggerPreviewGenerationForAllDiagrams() {
      console.log('🔄 Starting preview generation for all diagrams...')
      this.triggerPreviewGenerationForDiagrams(this.usecaseDiagrams, 'usecase')
      this.triggerPreviewGenerationForDiagrams(this.activityDiagrams, 'activity')
      this.triggerPreviewGenerationForDiagrams(this.sequenceDiagrams, 'sequence')
    },
    triggerPreviewGenerationForDiagrams(diagrams, type) {
      diagrams.forEach((diagram, index) => {
        const diagramId = diagram.id || diagram._id
        const needsPreview = !diagram.previewImage && !this.previewCache.has(diagramId)
        if (needsPreview) {
          setTimeout(() => {
            this.triggerPreviewGeneration(diagram)
          }, index * 500)
        }
      })
    },
    async triggerPreviewGeneration(diagram) {
      const diagramId = diagram.id || diagram._id
      if (this.generatingPreviews.has(diagramId)) return

      this.generatingPreviews.add(diagramId)
      try {
        await this.$nextTick()
        const rendererRef = `previewGenerator_${diagramId}`
        if (this.$refs[rendererRef] && this.$refs[rendererRef][0]) {
          const renderer = this.$refs[rendererRef][0]
          if (typeof renderer.generatePreviewImage === 'function') {
            const previewData = await renderer.generatePreviewImage()
            if (previewData) {
              this.handlePreviewGenerated(diagram, previewData)
            }
          }
        }
      } catch (error) {
        console.error(`Error generating preview for ${diagramId}:`, error)
      } finally {
        this.generatingPreviews.delete(diagramId)
      }
    },
    // Export Methods
    async exportDiagramAsPNG(diagram) {
      try {
        const diagramId = diagram.id || diagram._id
        const rendererRef = `previewGenerator_${diagramId}`
        if (this.$refs[rendererRef] && this.$refs[rendererRef][0]) {
          const renderer = this.$refs[rendererRef][0]
          if (renderer.exportAsPNG) {
            await renderer.exportAsPNG()
            this.toast.success('Diagram exported as PNG successfully!')
          }
        }
        this.closeExportDropdown()
      } catch (err) {
        console.error('Error exporting PNG:', err)
        this.toast.error('Failed to export PNG')
      }
    },
    async exportDiagramAsSVG(diagram) {
      try {
        const diagramId = diagram.id || diagram._id
        const rendererRef = `previewGenerator_${diagramId}`
        if (this.$refs[rendererRef] && this.$refs[rendererRef][0]) {
          const renderer = this.$refs[rendererRef][0]
          if (renderer.exportAsSVG) {
            renderer.exportAsSVG()
            this.toast.success('Diagram exported as SVG successfully!')
          }
        }
        this.closeExportDropdown()
      } catch (err) {
        console.error('Error exporting SVG:', err)
        this.toast.error('Failed to export SVG')
      }
    },
    // Helper methods
    getSafeValue(value, defaultValue = '') {
      return value !== null && value !== undefined ? value : defaultValue
    },
    getSafeArrayLength(array) {
      return Array.isArray(array) ? array.length : 0
    },
    getLanguageCode(lang) {
      const codes = {
        'en-US': 'EN',
        'vi-VN': 'VI',
        en: 'EN',
        vi: 'VI',
      }
      return codes[lang] || 'EN'
    },
    formatDate(dateString) {
      if (!dateString) return 'N/A'
      return new Date(dateString).toLocaleDateString()
    },
    resetGenerateForm() {
      this.generateForm = {
        type: 'usecase',
        lang: 'en-US',
        description: '',
        usecaseId: '',
        sourceType: 'usecase',
        requirementId: '',
        actor: '',
      }
    },
    handleVersionSelect(versionId) {
      this.selectedVersionId = versionId
      this.loadAvailableUsecases()
      this.loadDiagrams()
    },
    goBack() {
      this.$router.push('/dashboard')
    },
    async refreshDiagrams() {
      await this.loadAvailableUsecases()
      await this.loadDiagrams()
      this.toast.success('Diagrams refreshed')
    },
    // Preview Image Management
    handlePreviewGenerated(diagram, previewData) {
      if (previewData) {
        const diagramId = diagram.id || diagram._id
        this.previewCache.set(diagramId, previewData)
        const diagrams = this.getDiagramsByType(diagram._type)
        const diagramIndex = diagrams.findIndex((d) => (d.id || d._id) === diagramId)
        if (diagramIndex !== -1) {
          diagrams[diagramIndex].previewImage = previewData
        }
      }
    },
    onPreviewImageLoad(event) {
      event.target.style.opacity = '1'
    },
    onPreviewImageError(diagram, event) {
      const diagramId = diagram.id || diagram._id
      event.target.style.display = 'none'
      if (!this.generatingPreviews.has(diagramId)) {
        this.triggerPreviewGeneration(diagram)
      }
    },
    async regeneratePreview(diagram) {
      const diagramId = diagram.id || diagram._id
      if (this.generatingPreviews.has(diagramId)) return

      this.previewCache.delete(diagramId)
      const diagrams = this.getDiagramsByType(diagram._type)
      const diagramIndex = diagrams.findIndex((d) => (d.id || d._id) === diagramId)
      if (diagramIndex !== -1) {
        delete diagrams[diagramIndex].previewImage
      }
      this.triggerPreviewGeneration(diagram)
    },
    // Export dropdown methods
    toggleExportDropdown(diagram) {
      const diagramId = diagram.id || diagram._id
      this.activeExportDropdown = this.activeExportDropdown === diagramId ? null : diagramId
    },
    closeExportDropdown() {
      this.activeExportDropdown = null
    },
    handleClickOutside(event) {
      if (!event.target.closest('.export-dropdown')) {
        this.closeExportDropdown()
      }
    },
    // Editor Methods
    handleElementSelect(event) {
      if (!event) {
        this.selectedElement = null
        this.selectedElementType = null
        return
      }
      this.selectedElement = event.element
      this.selectedElementType = event.type
    },
    handlePositionUpdate({ element, type, position }) {
      if (!this.editingDiagram) return

      const diagramType = this.editingDiagram._type

      switch (diagramType) {
        case 'usecase':
          this.handleUsecasePositionUpdate({ element, type, position })
          break
        case 'activity':
          this.handleActivityPositionUpdate({ element, type, position })
          break
        case 'sequence':
          this.handleSequencePositionUpdate({ element, type, position })
          break
      }

      // Gọi onSaveStart để hiển thị "Saving..."
      if (this.$refs.diagramEditor && this.$refs.diagramEditor.onSaveStart) {
        this.$refs.diagramEditor.onSaveStart()
      }

      this.debounceSave()
    },

    async saveDiagramPositions() {
      if (!this.editingDiagram) return

      const diagramType = this.editingDiagram._type
      const diagramId = this.editingDiagram.id || this.editingDiagram._id

      try {
        switch (diagramType) {
          case 'usecase':
            await this.saveUsecasePositions(diagramId)
            break
          case 'activity':
            await this.saveActivityPositions(diagramId)
            break
          case 'sequence':
            await this.saveSequencePositions(diagramId)
            break
        }

        // Gọi onSaveComplete để hiển thị "Saved just now"
        if (this.$refs.diagramEditor && this.$refs.diagramEditor.onSaveComplete) {
          this.$refs.diagramEditor.onSaveComplete(true)
        }

        console.log('💾 Positions saved successfully')
      } catch (err) {
        console.error('❌ Error saving positions:', err)

        // Gọi onSaveComplete với false để hiển thị lỗi
        if (this.$refs.diagramEditor && this.$refs.diagramEditor.onSaveComplete) {
          this.$refs.diagramEditor.onSaveComplete(false)
        }

        this.toast.error('Failed to save positions')
      }
    },

    // Thêm các phương thức xử lý cụ thể
    handleUsecasePositionUpdate({ element, type, position }) {
      if (type === 'actor') {
        const actorIndex = this.editingDiagram.actors.findIndex(
          (a) => (a._id || a.id) === (element._id || element.id)
        )
        if (actorIndex !== -1) {
          if (!this.editingDiagram.actors[actorIndex].position) {
            this.editingDiagram.actors[actorIndex].position = {}
          }
          this.editingDiagram.actors[actorIndex].position.x = Math.round(position.x)
          this.editingDiagram.actors[actorIndex].position.y = Math.round(position.y)
        }
      } else if (type === 'usecase') {
        const usecaseIndex = this.editingDiagram.usecases.findIndex(
          (uc) => (uc._id || uc.id) === (element._id || element.id)
        )
        if (usecaseIndex !== -1) {
          if (!this.editingDiagram.usecases[usecaseIndex].position) {
            this.editingDiagram.usecases[usecaseIndex].position = {}
          }
          this.editingDiagram.usecases[usecaseIndex].position.x = Math.round(position.x)
          this.editingDiagram.usecases[usecaseIndex].position.y = Math.round(position.y)
        }
      }
    },

    async saveUsecasePositions(diagramId) {
      const updates = {
        actors: this.editingDiagram.actors.map((actor) => ({
          id: actor._id || actor.id,
          position: actor.position || { x: 0, y: 0 },
        })),
        usecases: this.editingDiagram.usecases.map((usecase) => ({
          id: usecase._id || usecase.id,
          position: usecase.position || { x: 0, y: 0 },
        })),
      }

      await updateMultiplePositions(diagramId, updates)
    },

    // Placeholder cho các loại diagram khác (cần implement sau)
    handleActivityPositionUpdate({ element, type, position }) {
      // TODO: Implement for activity diagrams
      console.log('Activity diagram position update:', { element, type, position })
    },

    handleSequencePositionUpdate({ element, type, position }) {
      // TODO: Implement for sequence diagrams
      console.log('Sequence diagram position update:', { element, type, position })
    },

    async saveActivityPositions(diagramId) {
      // TODO: Implement for activity diagrams
      console.log('Saving activity diagram positions:', diagramId)
    },

    async saveSequencePositions(diagramId) {
      // TODO: Implement for sequence diagrams
      console.log('Saving sequence diagram positions:', diagramId)
    },
    handleElementDrag({ element, type, newPosition }) {
      this.handlePositionUpdate({ element, type, position: newPosition })
    },
    debounceSave() {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout)
      }
      this.saveTimeout = setTimeout(() => {
        this.saveDiagramPositions()
      }, 1500)
    },
  },
}
</script>

<style scoped>
.uml-management-view {
  padding: 30px;
  background: #f9fafb;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.uml-content {
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

/* Header */
.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header-left h2 {
  font-size: 2rem;
  font-weight: 700;
  color: #1a365d;
  margin: 0 0 8px 0;
}

.subtitle {
  color: #6b7280;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* Buttons */
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

.btn-primary:hover {
  background: #2d4a8a;
}

.btn-primary.small {
  padding: 8px 16px;
  font-size: 0.875rem;
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

.btn-icon {
  padding: 8px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #374151;
  transition: all 0.3s ease;
}

.btn-icon:hover {
  background: white;
  transform: scale(1.1);
}

.btn-icon.danger:hover {
  background: #fee2e2;
  color: #dc2626;
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
  color: #374151;
}

/* Navigation Tabs */
.navigation-tabs {
  display: flex;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 2rem;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #6b7280;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button:hover {
  color: #1a365d;
  background: #f9fafb;
}

.tab-button.active {
  color: #1a365d;
  border-bottom-color: #1a365d;
}

/* Diagrams Display */
.diagrams-display {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.diagram-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.diagram-count {
  color: #6b7280;
  font-size: 0.875rem;
}

.section-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #9ca3af;
  font-size: 20px;
}

.search-input {
  padding: 8px 12px 8px 40px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  width: 250px;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #1a365d;
}

.filter-controls {
  display: flex;
  gap: 8px;
}

.sort-select,
.lang-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 0.875rem;
  min-width: 120px;
}

/* Diagrams Scroll Container */
.diagrams-scroll-container {
  overflow-x: auto;
  padding-bottom: 8px;
}

.diagrams-scroll-content {
  display: flex;
  gap: 20px;
  min-width: min-content;
}

/* Diagram Cards */
.diagram-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  min-width: 300px;
  max-width: 300px;
  flex-shrink: 0;
}

.diagram-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

/* Diagram Preview với ảnh */
.diagram-preview {
  position: relative;
  width: 100%;
  height: 180px;
  background: #fff;
  overflow: hidden;
  border-bottom: 1px solid #e5e7eb;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: opacity 0.3s ease;
  opacity: 0;
}

.preview-generator {
  width: 100%;
  height: 100%;
  position: relative;
}

.hidden-renderer {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 100%;
  height: 100%;
}

.generating-preview {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #6b7280;
  font-size: 14px;
  background: #f8fafc;
}

.diagram-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.diagram-card:hover .diagram-overlay {
  opacity: 1;
}

.diagram-info {
  padding: 16px;
}

.diagram-info h4 {
  margin: 0 0 8px 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.diagram-description {
  margin: 0 0 12px 0;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.diagram-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #9ca3af;
}

/* Type Badges */
.diagram-type-badge,
.type-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.type-usecase {
  background: #dbeafe;
  color: #1e40af;
}

.type-activity {
  background: #dcfce7;
  color: #166534;
}

.type-sequence {
  background: #fef3c7;
  color: #92400e;
}

.diagram-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 12px;
  font-size: 0.75rem;
  color: #374151;
}

/* Empty Section */
.empty-section {
  text-align: center;
  padding: 40px 20px;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.empty-icon {
  width: 60px;
  height: 60px;
  margin-bottom: 16px;
  background: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon .material-symbols-outlined {
  font-size: 30px;
  color: #9ca3af;
}

.empty-section h4 {
  margin: 0 0 8px 0;
  color: #374151;
  font-size: 1rem;
}

.empty-section p {
  margin: 0 0 16px 0;
  font-size: 0.875rem;
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

.modal-overlay.large {
  padding: 40px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.fullscreen {
  max-width: 1200px;
  width: 95%;
  height: 95vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.modal-actions-header {
  display: flex;
  gap: 12px;
  align-items: center;
}

.modal-body {
  padding: 20px;
}

.editor-body {
  flex: 1;
  padding: 0;
  overflow: hidden;
}

.editor-content {
  display: flex;
  height: 100%;
}

.editor-main {
  flex: 1;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Form Styles */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.form-group label.required:after {
  content: '*';
  color: #ef4444;
  margin-left: 4px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.3s ease;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #1a365d;
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

/* Loading States */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6b7280;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #1a365d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f4f6;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Export Dropdown Styles */
.export-dropdown {
  position: relative;
  display: inline-block;
}

.export-toggle {
  z-index: 2;
}

.export-options {
  position: absolute;
  top: 100%;
  left: -100%;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 10;
  min-width: 140px;
  margin-top: 4px;
}

.export-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: #374151;
  transition: background 0.3s ease;
}

.export-option:hover {
  background: #f3f4f6;
}

.export-option:first-child {
  border-radius: 8px 8px 0 0;
}

.export-option:last-child {
  border-radius: 0 0 8px 8px;
}

.export-option .material-symbols-outlined {
  font-size: 16px;
}

/* Field Help */
.field-help {
  color: #6b7280;
  font-size: 0.75rem;
  margin-top: 4px;
  font-style: italic;
}

.diagram-type-label {
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #6b7280;
  margin-right: 12px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .uml-management-view {
    padding: 16px;
  }

  .content-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: stretch;
    flex-wrap: wrap;
  }

  .btn-primary,
  .btn-secondary {
    flex: 1;
    justify-content: center;
    min-width: 120px;
  }

  .navigation-tabs {
    flex-direction: column;
    padding: 0;
  }

  .tab-button {
    justify-content: center;
  }

  .section-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .section-controls {
    width: 100%;
    flex-direction: column;
    gap: 12px;
  }

  .search-input {
    width: 100%;
  }

  .filter-controls {
    width: 100%;
    justify-content: space-between;
  }

  .sort-select,
  .lang-select {
    flex: 1;
  }

  .diagram-card {
    min-width: 280px;
  }

  .modal-overlay.large {
    padding: 10px;
  }

  .modal-content.fullscreen {
    width: 100%;
    height: 100%;
    max-width: none;
    border-radius: 0;
  }

  .diagram-preview {
    height: 160px;
  }
}

@media (max-width: 480px) {
  .diagram-preview {
    height: 140px;
  }

  .header-left h2 {
    font-size: 1.5rem;
  }

  .diagram-stats {
    flex-wrap: wrap;
  }

  .diagrams-scroll-content {
    gap: 12px;
  }

  .diagram-card {
    min-width: 260px;
  }
}
</style>