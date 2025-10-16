<template>
  <div class="uml-management-view">
    <ProjectHeader
      :project="project"
      :versions="versions"
      :selected-version-id="selectedVersionId"
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
      <div class="content-header">
        <h2>UML Diagram Management</h2>
        <button class="btn-primary" @click="showCreateDiagramModal = true">
          <span class="material-symbols-outlined">add</span>
          Create Diagram
        </button>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card usecase">
          <div class="stat-icon">
            <span class="material-symbols-outlined">account_circle</span>
          </div>
          <div class="stat-info">
            <h3>{{ umlStats.usecase }}</h3>
            <p>Use Case Diagrams</p>
          </div>
        </div>
        <div class="stat-card activity">
          <div class="stat-icon">
            <span class="material-symbols-outlined">play_arrow</span>
          </div>
          <div class="stat-info">
            <h3>{{ umlStats.activity }}</h3>
            <p>Activity Diagrams</p>
          </div>
        </div>
        <div class="stat-card sequence">
          <div class="stat-icon">
            <span class="material-symbols-outlined">swap_vert</span>
          </div>
          <div class="stat-info">
            <h3>{{ umlStats.sequence }}</h3>
            <p>Sequence Diagrams</p>
          </div>
        </div>
        <div class="stat-card total">
          <div class="stat-icon">
            <span class="material-symbols-outlined">schema</span>
          </div>
          <div class="stat-info">
            <h3>{{ umlStats.total }}</h3>
            <p>Total Diagrams</p>
          </div>
        </div>
      </div>

      <!-- Diagram Type Navigation -->
      <div class="diagram-type-nav">
        <button
          v-for="type in diagramTypes"
          :key="type.id"
          class="type-button"
          :class="{ active: selectedDiagramType === type.id }"
          @click="selectedDiagramType = type.id"
        >
          <span class="material-symbols-outlined">{{ type.icon }}</span>
          {{ type.name }}
        </button>
      </div>

      <!-- Diagrams Grid -->
      <div class="diagrams-grid">
        <div v-for="diagram in filteredDiagrams" :key="diagram.id" class="diagram-card">
          <div class="diagram-preview">
            <div class="preview-placeholder" :class="diagram.type">
              <span class="material-symbols-outlined">{{ getDiagramIcon(diagram.type) }}</span>
            </div>
            <div class="diagram-overlay">
              <button class="btn-icon" @click="viewDiagram(diagram)" title="View">
                <span class="material-symbols-outlined">visibility</span>
              </button>
              <button class="btn-icon" @click="editDiagram(diagram)" title="Edit">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button class="btn-icon danger" @click="deleteDiagram(diagram.id)" title="Delete">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
          <div class="diagram-info">
            <h4>{{ diagram.name }}</h4>
            <p class="diagram-description">{{ diagram.description }}</p>
            <div class="diagram-meta">
              <span class="meta-item">
                <span class="material-symbols-outlined">schedule</span>
                {{ diagram.lastModified }}
              </span>
              <span class="meta-badge" :class="diagram.type">
                {{ getDiagramTypeName(diagram.type) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredDiagrams.length === 0" class="empty-state">
          <div class="empty-icon">
            <span class="material-symbols-outlined">schema</span>
          </div>
          <h3>No Diagrams Found</h3>
          <p>
            Create your first {{ getDiagramTypeName(selectedDiagramType) }} diagram to get started.
          </p>
          <button class="btn-primary" @click="showCreateDiagramModal = true">
            <span class="material-symbols-outlined">add</span>
            Create Diagram
          </button>
        </div>
      </div>

      <!-- Create Diagram Modal -->
      <div v-if="showCreateDiagramModal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Create New Diagram</h3>
            <button class="btn-close" @click="showCreateDiagramModal = false">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="modal-body">
            <form @submit.prevent="createDiagram">
              <div class="form-group">
                <label>Diagram Name</label>
                <input
                  v-model="diagramForm.name"
                  type="text"
                  required
                  placeholder="Enter diagram name"
                />
              </div>

              <div class="form-group">
                <label>Description</label>
                <textarea
                  v-model="diagramForm.description"
                  rows="3"
                  placeholder="Enter diagram description"
                ></textarea>
              </div>

              <div class="form-group">
                <label>Diagram Type</label>
                <div class="diagram-type-options">
                  <label
                    v-for="type in diagramTypes.filter((t) => t.id !== 'all')"
                    :key="type.id"
                    class="type-option"
                    :class="{ active: diagramForm.type === type.id }"
                  >
                    <input
                      v-model="diagramForm.type"
                      type="radio"
                      :value="type.id"
                      class="sr-only"
                    />
                    <span class="type-icon">
                      <span class="material-symbols-outlined">{{ type.icon }}</span>
                    </span>
                    <span class="type-name">{{ type.name }}</span>
                  </label>
                </div>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-secondary" @click="showCreateDiagramModal = false">
                  Cancel
                </button>
                <button type="submit" class="btn-primary">Create Diagram</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Diagram Viewer Modal -->
      <div v-if="viewingDiagram" class="modal-overlay large">
        <div class="modal-content fullscreen">
          <div class="modal-header">
            <h3>{{ viewingDiagram.name }}</h3>
            <div class="modal-actions-header">
              <button class="btn-secondary" @click="exportDiagram(viewingDiagram)">
                <span class="material-symbols-outlined">download</span>
                Export
              </button>
              <button class="btn-close" @click="viewingDiagram = null">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          <div class="modal-body viewer-body">
            <div class="viewer-content">
              <div class="diagram-view" :class="viewingDiagram.type">
                <div class="view-placeholder">
                  <span class="material-symbols-outlined">{{
                    getDiagramIcon(viewingDiagram.type)
                  }}</span>
                  <h4>{{ viewingDiagram.name }}</h4>
                  <p>{{ viewingDiagram.description }}</p>
                </div>
              </div>
              <div class="viewer-sidebar">
                <h4>Diagram Information</h4>
                <div class="info-list">
                  <div class="info-item">
                    <span class="info-label">Type:</span>
                    <span class="info-value">{{ getDiagramTypeName(viewingDiagram.type) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Created:</span>
                    <span class="info-value">{{ viewingDiagram.created }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Last Modified:</span>
                    <span class="info-value">{{ viewingDiagram.lastModified }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Elements:</span>
                    <span class="info-value">{{ viewingDiagram.elements || 0 }}</span>
                  </div>
                </div>

                <div class="viewer-actions">
                  <button class="btn-secondary" @click="editDiagram(viewingDiagram)">
                    <span class="material-symbols-outlined">edit</span>
                    Edit Diagram
                  </button>
                  <button class="btn-danger" @click="deleteDiagram(viewingDiagram.id)">
                    <span class="material-symbols-outlined">delete</span>
                    Delete Diagram
                  </button>
                </div>
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
import { useToast } from 'vue-toastification'
import ProjectHeader from '@/components/ProjectHeader.vue'

export default {
  name: 'UmlManagement',
  components: {
    ProjectHeader,
  },
  data() {
    return {
      project: {},
      versions: [],
      selectedVersionId: null,

      umlStats: {
        usecase: 0,
        activity: 0,
        sequence: 0,
        total: 0,
      },

      diagramTypes: [
        { id: 'all', name: 'All Diagrams', icon: 'schema' },
        { id: 'usecase', name: 'Use Case', icon: 'account_circle' },
        { id: 'activity', name: 'Activity', icon: 'play_arrow' },
        { id: 'sequence', name: 'Sequence', icon: 'swap_vert' },
      ],
      selectedDiagramType: 'all',

      diagrams: [],
      viewingDiagram: null,

      showCreateDiagramModal: false,
      editingDiagram: null,

      diagramForm: {
        name: '',
        description: '',
        type: 'usecase',
      },

      toast: useToast(),
    }
  },
  computed: {
    filteredDiagrams() {
      if (this.selectedDiagramType === 'all') {
        return this.diagrams
      }
      return this.diagrams.filter((diagram) => diagram.type === this.selectedDiagramType)
    },
  },
  async created() {
    const projectId = this.$route.params.id
    if (projectId) {
      await this.fetchProjectData(projectId)
      this.loadDiagrams()
    }
  },
  methods: {
    // Navigation methods
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
        this.project = result.project
        this.versions = result.versions

        if (this.versions.length > 0) {
          this.selectedVersionId = this.versions[0]._id
        }
      } catch (err) {
        console.error('Error fetching project details:', err)
        this.toast.error('Failed to load project data')
      }
    },

    loadDiagrams() {
      // Mock data - replace with actual API call
      this.diagrams = [
        {
          id: 1,
          name: 'User Authentication Use Case',
          description: 'Diagram showing user authentication flows',
          type: 'usecase',
          lastModified: '2 days ago',
          created: '2024-01-10',
          elements: 8,
        },
        {
          id: 2,
          name: 'Order Processing Activity',
          description: 'Activity flow for order processing system',
          type: 'activity',
          lastModified: '1 week ago',
          created: '2024-01-05',
          elements: 12,
        },
        {
          id: 3,
          name: 'Payment Sequence',
          description: 'Sequence diagram for payment processing',
          type: 'sequence',
          lastModified: '3 days ago',
          created: '2024-01-08',
          elements: 6,
        },
        {
          id: 4,
          name: 'User Management Use Case',
          description: 'Use cases for user management system',
          type: 'usecase',
          lastModified: '1 day ago',
          created: '2024-01-14',
          elements: 5,
        },
      ]

      this.updateStats()
    },

    updateStats() {
      this.umlStats.usecase = this.diagrams.filter((d) => d.type === 'usecase').length
      this.umlStats.activity = this.diagrams.filter((d) => d.type === 'activity').length
      this.umlStats.sequence = this.diagrams.filter((d) => d.type === 'sequence').length
      this.umlStats.total = this.diagrams.length
    },

    // Diagram actions
    viewDiagram(diagram) {
      this.viewingDiagram = diagram
    },

    editDiagram(diagram) {
      this.editingDiagram = diagram
      this.diagramForm = { ...diagram }
      this.showCreateDiagramModal = true
      this.viewingDiagram = null
    },

    deleteDiagram(diagramId) {
      if (confirm('Are you sure you want to delete this diagram?')) {
        this.diagrams = this.diagrams.filter((d) => d.id !== diagramId)
        this.updateStats()
        this.viewingDiagram = null
        this.toast.success('Diagram deleted successfully')
      }
    },

    createDiagram() {
      const newDiagram = {
        id: Date.now(),
        ...this.diagramForm,
        lastModified: 'Just now',
        created: new Date().toISOString().split('T')[0],
        elements: 0,
      }

      this.diagrams.push(newDiagram)
      this.updateStats()
      this.showCreateDiagramModal = false
      this.resetForm()
      this.toast.success('Diagram created successfully!')
    },

    exportDiagram(diagram) {
      this.toast.info(`Exporting ${diagram.name}...`)
      // Implement export logic (PNG, PDF, etc.)
    },

    // Helper methods
    getDiagramIcon(type) {
      const icons = {
        usecase: 'account_circle',
        activity: 'play_arrow',
        sequence: 'swap_vert',
      }
      return icons[type] || 'schema'
    },

    getDiagramTypeName(type) {
      const names = {
        usecase: 'Use Case Diagram',
        activity: 'Activity Diagram',
        sequence: 'Sequence Diagram',
      }
      return names[type] || 'Diagram'
    },

    resetForm() {
      this.diagramForm = {
        name: '',
        description: '',
        type: 'usecase',
      }
      this.editingDiagram = null
    },

    handleVersionSelect(versionId) {
      this.selectedVersionId = versionId
      this.fetchProjectData(this.project._id)
    },

    goBack() {
      this.$router.push('/dashboard')
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

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.content-header h2 {
  font-size: 2rem;
  font-weight: 700;
  color: #1a365d;
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

.btn-primary:hover {
  background: #2d4a8a;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-card.usecase {
  border-left: 4px solid #3b82f6;
}

.stat-card.activity {
  border-left: 4px solid #10b981;
}

.stat-card.sequence {
  border-left: 4px solid #8b5cf6;
}

.stat-card.total {
  border-left: 4px solid #f59e0b;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-card.usecase .stat-icon {
  background: #dbeafe;
  color: #3b82f6;
}

.stat-card.activity .stat-icon {
  background: #d1fae5;
  color: #10b981;
}

.stat-card.sequence .stat-icon {
  background: #ede9fe;
  color: #8b5cf6;
}

.stat-card.total .stat-icon {
  background: #fef3c7;
  color: #f59e0b;
}

.stat-info h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-info p {
  color: #6b7280;
  font-size: 0.875rem;
}

/* Diagram Type Navigation */
.diagram-type-nav {
  display: flex;
  gap: 8px;
  margin-bottom: 30px;
  padding: 8px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.type-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: transparent;
  border: 2px solid transparent;
  border-radius: 8px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
  justify-content: center;
}

.type-button:hover {
  color: #1a365d;
  background: #f8fafc;
}

.type-button.active {
  background: #1a365d;
  color: white;
  border-color: #1a365d;
}

/* Diagrams Grid */
.diagrams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.diagram-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.diagram-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

.diagram-preview {
  position: relative;
  height: 200px;
  background: #f8fafc;
  overflow: hidden;
}

.preview-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
}

.preview-placeholder.usecase {
  background: linear-gradient(135deg, #dbeafe, #93c5fd);
}

.preview-placeholder.activity {
  background: linear-gradient(135deg, #d1fae5, #6ee7b7);
}

.preview-placeholder.sequence {
  background: linear-gradient(135deg, #ede9fe, #c4b5fd);
}

.preview-placeholder .material-symbols-outlined {
  font-size: 64px;
  color: rgba(255, 255, 255, 0.9);
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

.diagram-info {
  padding: 16px;
}

.diagram-info h4 {
  margin: 0 0 8px 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.diagram-description {
  margin: 0 0 12px 0;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
}

.diagram-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #9ca3af;
}

.meta-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  color: white;
}

.meta-badge.usecase {
  background: #3b82f6;
}

.meta-badge.activity {
  background: #10b981;
}

.meta-badge.sequence {
  background: #8b5cf6;
}

/* Empty State */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon .material-symbols-outlined {
  font-size: 40px;
  color: #9ca3af;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #374151;
}

.empty-state p {
  margin: 0 0 24px 0;
  color: #6b7280;
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

.modal-body {
  padding: 20px;
}

.viewer-body {
  flex: 1;
  padding: 0;
  overflow: hidden;
}

.viewer-content {
  display: flex;
  height: 100%;
}

.diagram-view {
  flex: 1;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
}

.view-placeholder {
  text-align: center;
  color: #6b7280;
}

.view-placeholder .material-symbols-outlined {
  font-size: 80px;
  margin-bottom: 16px;
  color: #9ca3af;
}

.view-placeholder h4 {
  margin: 0 0 8px 0;
  color: #374151;
}

.viewer-sidebar {
  width: 300px;
  padding: 20px;
  background: white;
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.viewer-sidebar h4 {
  margin: 0 0 16px 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.info-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.info-label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.info-value {
  color: #6b7280;
  font-size: 0.875rem;
}

.viewer-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
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

.btn-danger:hover {
  background: #dc2626;
}

/* Form Styles */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
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
  min-height: 80px;
}

.diagram-type-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.type-option {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.type-option:hover {
  border-color: #1a365d;
}

.type-option.active {
  border-color: #1a365d;
  background: #f0f4ff;
}

.type-icon {
  width: 40px;
  height: 40px;
  margin: 0 auto 8px;
  background: #f3f4f6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.type-option.active .type-icon {
  background: #1a365d;
  color: white;
}

.type-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.type-option.active .type-name {
  color: #1a365d;
  font-weight: 600;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

/* Navigation Tabs */
.navigation-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  padding: 0 8px;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-button:hover {
  border-color: #1a365d;
  color: #1a365d;
}

.tab-button.active {
  background: #1a365d;
  border-color: #1a365d;
  color: white;
}

.tab-button .material-symbols-outlined {
  font-size: 20px;
}
</style>