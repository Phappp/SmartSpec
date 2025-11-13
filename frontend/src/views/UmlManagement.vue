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
          <p class="subtitle">Manage and visualize your system use cases</p>
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

      <!-- Diagrams Grid -->
      <div v-else class="diagrams-section">
        <div class="section-header">
          <h3>Use Case Diagrams</h3>
          <div class="view-options">
            <button
              class="view-toggle"
              :class="{ active: viewMode === 'grid' }"
              @click="viewMode = 'grid'"
            >
              <span class="material-symbols-outlined">grid_view</span>
            </button>
            <button
              class="view-toggle"
              :class="{ active: viewMode === 'list' }"
              @click="viewMode = 'list'"
            >
              <span class="material-symbols-outlined">view_list</span>
            </button>
          </div>
        </div>

        <!-- Grid View -->
        <div v-if="viewMode === 'grid'" class="diagrams-grid">
          <div
            v-for="diagram in diagrams"
            :key="diagram.id || diagram._id"
            class="diagram-card"
            @click="editDiagram(diagram)"
          >
            <div class="diagram-preview">
              <UCDRenderer
                :diagram-data="diagram"
                :width="200"
                :height="200"
                :preview-mode="true"
                :auto-fit="true"
                class="preview-renderer"
              />
              <div class="diagram-overlay">
                <button class="btn-icon" @click.stop="editDiagram(diagram)" title="Edit">
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <button class="btn-icon" @click.stop="exportDiagram(diagram)" title="Export">
                  <span class="material-symbols-outlined">download</span>
                </button>
                <button
                  class="btn-icon danger"
                  @click.stop="deleteDiagram(diagram.id || diagram._id)"
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
                <span class="meta-item">
                  <span class="material-symbols-outlined">schedule</span>
                  {{ formatDate(diagram.updated_at || diagram.updatedAt) }}
                </span>
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
                  {{ getSafeArrayLength(diagram.relationships) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- List View -->
        <div v-else class="diagrams-list">
          <div class="list-header">
            <div class="col-name">Diagram Name</div>
            <div class="col-lang">Language</div>
            <div class="col-stats">Actors / Use Cases</div>
            <div class="col-date">Last Updated</div>
            <div class="col-actions">Actions</div>
          </div>
          <div
            v-for="diagram in diagrams"
            :key="diagram.id || diagram._id"
            class="list-item"
            @click="editDiagram(diagram)"
          >
            <div class="col-name">
              <div class="diagram-icon">
                <span class="material-symbols-outlined">account_tree</span>
              </div>
              <div class="item-info">
                <h4>{{ getSafeValue(diagram.name, 'Unnamed Diagram') }}</h4>
                <p>{{ getSafeValue(diagram.description, 'No description') }}</p>
              </div>
            </div>
            <div class="col-lang">
              <span class="lang-badge">{{ getLanguageCode(diagram.lang) }}</span>
            </div>
            <div class="col-stats">
              <div class="stats-info">
                <span>{{ getSafeArrayLength(diagram.actors) }} Actors</span>
                <span>{{ getSafeArrayLength(diagram.usecases) }} Use Cases</span>
              </div>
            </div>
            <div class="col-date">
              {{ formatDate(diagram.updated_at || diagram.updatedAt) }}
            </div>
            <div class="col-actions">
              <button class="btn-icon" @click.stop="editDiagram(diagram)" title="Edit">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button
                class="btn-icon danger"
                @click.stop="deleteDiagram(diagram.id || diagram._id)"
                title="Delete"
              >
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="diagrams.length === 0" class="empty-state">
          <div class="empty-icon">
            <span class="material-symbols-outlined">account_tree</span>
          </div>
          <h3>No Use Case Diagrams</h3>
          <p>Generate your first use case diagram to visualize system requirements.</p>
          <div class="empty-actions">
            <button class="btn-primary" @click="generateNewDiagram">
              <span class="material-symbols-outlined">auto_awesome</span>
              Auto Generate
            </button>
            <button class="btn-secondary" @click="openManualEditor">
              <span class="material-symbols-outlined">draw</span>
              Create Manually
            </button>
          </div>
        </div>
      </div>

      <!-- Generate Diagram Modal -->
      <div v-if="showGenerateModal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Generate Use Case Diagram</h3>
            <button class="btn-close" @click="closeGenerateModal">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="modal-body">
            <form @submit.prevent="generateDiagram">
              <div class="form-group">
                <label>Language</label>
                <select v-model="generateForm.lang" required>
                  <option value="en-US">English</option>
                  <option value="vi-VN">Vietnamese</option>
                </select>
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
                <button type="submit" class="btn-primary" :disabled="generating">
                  <span v-if="generating" class="loading-spinner-small"></span>
                  {{ generating ? 'Generating...' : 'Generate Diagram' }}
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
              <button class="btn-close" @click="closeEditor">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          <div class="modal-body editor-body">
            <div class="editor-content">
              <div class="editor-main">
                <UCDRenderer
                  ref="ucdEditor"
                  :diagram-data="editingDiagram"
                  :width="editorWidth"
                  :height="editorHeight"
                  :editable="true"
                  :show-labels="showElementLabels"
                  :show-relationship-labels="showRelationshipLabels"
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
import {
  getUsecaseDiagrams,
  generateUsecaseDiagram,
  deleteUsecase,
  updateMultiplePositions,
  resetPositions,
} from '@/api/ucd'
import { useToast } from 'vue-toastification'
import ProjectHeader from '@/components/ProjectHeader.vue'
import UCDRenderer from '@/components/uml/usecase_diagram/UCDRenderer.vue'
import { useActiveMembers } from '@/utils/useActiveMembers'

export default {
  name: 'UmlManagement',
  components: {
    ProjectHeader,
    UCDRenderer,
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

      diagrams: [],
      loading: false,
      viewMode: 'grid',

      showGenerateModal: false,
      editingDiagram: null,
      generating: false,
      saveTimeout: null,

      generateForm: {
        description: '',
        lang: 'en-US',
      },

      // Editor state
      selectedElement: null,
      selectedElementType: null,

      // View settings
      showElementLabels: true,
      showRelationshipLabels: true,
      zoomLevel: 1,

      // Dimensions
      editorWidth: 8000,
      editorHeight: 6000,

      toast: useToast(),
    }
  },
  async created() {
    const projectId = this.$route.params.id
    if (projectId) {
      await this.fetchProjectData(projectId)
      await this.loadDiagrams()
      this.initSocketConnection(projectId)
    }
  },
  beforeUnmount() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }
    if (this.project._id) {
      this.cleanupSocketConnection(this.project._id)
    }
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

    async loadDiagrams() {
      if (!this.selectedVersionId) {
        this.diagrams = []
        return
      }

      this.loading = true
      try {
        const { data } = await getUsecaseDiagrams(this.selectedVersionId)
        this.diagrams = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
      } catch (err) {
        console.error('Error loading diagrams:', err)
        this.toast.error('Failed to load diagrams')
        this.diagrams = []
      } finally {
        this.loading = false
      }
    },

    // Diagram actions
    generateNewDiagram() {
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

      this.generating = true
      try {
        const { data } = await generateUsecaseDiagram(
          this.selectedVersionId,
          this.generateForm.lang
        )

        const newDiagram = data?.data || data
        if (newDiagram) {
          this.diagrams.unshift(newDiagram)
          this.closeGenerateModal()
          this.toast.success('Diagram generated successfully!')

          // Auto open the new diagram for editing
          setTimeout(() => {
            this.editDiagram(newDiagram)
          }, 500)
        } else {
          throw new Error('No diagram data returned')
        }
      } catch (err) {
        console.error('Error generating diagram:', err)
        this.toast.error(
          'Failed to generate diagram: ' + (err.response?.data?.message || err.message)
        )
      } finally {
        this.generating = false
      }
    },

    openManualEditor() {
      this.toast.info('Manual editor will be implemented in next version')
    },

    editDiagram(diagram) {
      // Sử dụng trực tiếp diagram được truyền vào, không load lại từ server
      this.editingDiagram = { ...diagram }
      this.selectedElement = null
      this.zoomLevel = 1

      console.log('📝 Editing diagram:', this.editingDiagram)
    },

    // Trong methods của UmlManagement.vue
    closeEditor() {
      // Chỉ đóng editor, KHÔNG load lại dữ liệu
      this.editingDiagram = null
      this.selectedElement = null

      // Load lại dữ liệu mới từ server sau khi đóng editor
      this.loadDiagrams().then(() => {
        console.log('🔄 Diagrams reloaded after closing editor')
      })
    },

    async deleteDiagram(diagramId) {
      if (!confirm('Are you sure you want to delete this diagram?')) return

      try {
        await deleteUsecase(diagramId)
        this.diagrams = this.diagrams.filter((d) => (d.id || d._id) !== diagramId)
        if (
          this.editingDiagram &&
          (this.editingDiagram.id || this.editingDiagram._id) === diagramId
        ) {
          this.closeEditor()
        }
        this.toast.success('Diagram deleted successfully')
      } catch (err) {
        console.error('Error deleting diagram:', err)
        this.toast.error('Failed to delete diagram')
      }
    },

    // Sửa lại phương thức saveDiagramPositions để KHÔNG load lại diagrams
    async saveDiagramPositions() {
      if (!this.editingDiagram) {
        console.log('❌ No editing diagram to save')
        return
      }

      try {
        const diagramId = this.editingDiagram.id || this.editingDiagram._id
        if (!diagramId) {
          console.log('❌ No diagram ID found')
          return
        }

        console.log('💾 Saving positions for diagram:', diagramId)

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

        console.log('🚀 Calling API with updates:', updates)

        const response = await updateMultiplePositions(diagramId, updates)
        console.log('✅ Save response:', response)

        this.toast.success('Positions saved successfully')

        // ❌ REMOVE THIS LINE - Không load lại diagrams khi save
        // await this.loadDiagrams()
      } catch (err) {
        console.error('❌ Error saving positions:', err)
        this.toast.error(
          'Failed to save positions: ' + (err.response?.data?.message || err.message)
        )
      }
    },

    async resetDiagramPositions() {
      if (!this.editingDiagram) return

      try {
        await resetPositions(this.editingDiagram.id || this.editingDiagram._id)
        // Reload the diagram to get new positions
        await this.loadDiagrams()
        const updatedDiagram = this.diagrams.find(
          (d) => (d.id || d._id) === (this.editingDiagram.id || this.editingDiagram._id)
        )
        if (updatedDiagram) {
          this.editingDiagram = { ...updatedDiagram }
        }
        this.toast.success('Layout reset successfully')
      } catch (err) {
        console.error('Error resetting positions:', err)
        this.toast.error('Failed to reset layout')
      }
    },

    exportDiagram(diagram) {
      if (this.$refs.ucdEditor) {
        this.$refs.ucdEditor.exportAsPNG().then((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${diagram.name || 'usecase-diagram'}.png`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            this.toast.success('Diagram exported successfully')
          }
        })
      }
    },

    async refreshDiagrams() {
      await this.loadDiagrams()
      this.toast.success('Diagrams refreshed')
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

      if (type === 'actor') {
        const actorIndex = this.editingDiagram.actors.findIndex(
          (a) => (a._id || a.id) === (element._id || element.id)
        )
        if (actorIndex !== -1) {
          this.editingDiagram.actors[actorIndex].position = position
        }
      } else if (type === 'usecase') {
        const usecaseIndex = this.editingDiagram.usecases.findIndex(
          (uc) => (uc._id || uc.id) === (element._id || element.id)
        )
        if (usecaseIndex !== -1) {
          this.editingDiagram.usecases[usecaseIndex].position = position
        }
      }
    },

    handleElementDrag({ element, type, newPosition }) {
      this.handlePositionUpdate({ element, type, position: newPosition })
    },

    updateElementProperty() {
      // Properties are updated reactively through v-model
    },

    updateElementPosition() {
      if (this.selectedElement && this.selectedElementType) {
        this.handlePositionUpdate({
          element: this.selectedElement,
          type: this.selectedElementType,
          position: this.selectedElement.position,
        })
      }
    },

    deleteSelectedElement() {
      if (!this.selectedElement || !this.selectedElementType || !this.editingDiagram) return

      const id = this.selectedElement._id || this.selectedElement.id

      if (this.selectedElementType === 'actor') {
        this.editingDiagram.actors = this.editingDiagram.actors.filter(
          (a) => (a._id || a.id) !== id
        )
        // Also remove associated associations
        this.editingDiagram.associations = this.editingDiagram.associations.filter(
          (assoc) => (assoc.actor_id || assoc.actor) !== id
        )
      } else if (this.selectedElementType === 'usecase') {
        this.editingDiagram.usecases = this.editingDiagram.usecases.filter(
          (uc) => (uc._id || uc.id) !== id
        )
        // Also remove associated associations and relationships
        this.editingDiagram.associations = this.editingDiagram.associations.filter(
          (assoc) => (assoc.usecase_id || assoc.usecase) !== id
        )
        this.editingDiagram.relationships = this.editingDiagram.relationships.filter(
          (rel) => rel.source !== id && rel.target !== id
        )
      }

      this.selectedElement = null
      this.selectedElementType = null
      this.toast.success('Element deleted')
    },

    // Zoom and View Controls
    fitToViewport() {
      if (this.$refs.ucdEditor) {
        this.$refs.ucdEditor.fitToViewport()
      }
    },

    zoomIn() {
      this.zoomLevel = Math.min(2, this.zoomLevel + 0.1)
    },

    zoomOut() {
      this.zoomLevel = Math.max(0.5, this.zoomLevel - 0.1)
    },

    resetZoom() {
      this.zoomLevel = 1
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
      if (!dateString) return 'Unknown'
      try {
        return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      } catch (error) {
        return 'Invalid Date'
      }
    },
    async handlePositionUpdate({ element, type, position }) {
      if (!this.editingDiagram) return

      console.log('📍 Position updated:', { element, type, position })

      // Cập nhật vị trí trong editingDiagram
      if (type === 'actor') {
        const actorIndex = this.editingDiagram.actors.findIndex(
          (a) => (a._id || a.id) === (element._id || element.id)
        )
        if (actorIndex !== -1) {
          // Đảm bảo có object position
          if (!this.editingDiagram.actors[actorIndex].position) {
            this.editingDiagram.actors[actorIndex].position = {}
          }
          this.editingDiagram.actors[actorIndex].position.x = Math.round(position.x)
          this.editingDiagram.actors[actorIndex].position.y = Math.round(position.y)

          console.log('✅ Updated actor position:', this.editingDiagram.actors[actorIndex])
        }
      } else if (type === 'usecase') {
        const usecaseIndex = this.editingDiagram.usecases.findIndex(
          (uc) => (uc._id || uc.id) === (element._id || element.id)
        )
        if (usecaseIndex !== -1) {
          // Đảm bảo có object position
          if (!this.editingDiagram.usecases[usecaseIndex].position) {
            this.editingDiagram.usecases[usecaseIndex].position = {}
          }
          this.editingDiagram.usecases[usecaseIndex].position.x = Math.round(position.x)
          this.editingDiagram.usecases[usecaseIndex].position.y = Math.round(position.y)

          console.log('✅ Updated usecase position:', this.editingDiagram.usecases[usecaseIndex])
        }
      }

      // Auto-save sau 1 giây
      this.debounceSave()
    },

    // Debounce để tránh gọi API quá nhiều
    debounceSave() {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout)
      }
      this.saveTimeout = setTimeout(() => {
        this.saveDiagramPositions()
      }, 2000)
    },

    // Sửa lại phương thức saveDiagramPositions để KHÔNG load lại diagrams
    async saveDiagramPositions() {
      if (!this.editingDiagram) {
        console.log('❌ No editing diagram to save')
        return
      }

      try {
        const diagramId = this.editingDiagram.id || this.editingDiagram._id
        if (!diagramId) {
          console.log('❌ No diagram ID found')
          return
        }

        console.log('💾 Saving positions for diagram:', diagramId)

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

        console.log('🚀 Calling API with updates:', updates)

        const response = await updateMultiplePositions(diagramId, updates)
        console.log('✅ Save response:', response)

        // ✅ CHỈ toast success, KHÔNG load lại diagrams
        // this.toast.success('Positions saved automatically')

        // ❌ ĐÃ XÓA: await this.loadDiagrams()
      } catch (err) {
        console.error('❌ Error saving positions:', err)
        this.toast.error(
          'Failed to save positions: ' + (err.response?.data?.message || err.message)
        )
      }
    },

    resetGenerateForm() {
      this.generateForm = {
        description: '',
        lang: 'en-US',
      }
    },

    handleVersionSelect(versionId) {
      this.selectedVersionId = versionId
      this.loadDiagrams()
    },

    goBack() {
      this.$router.push('/dashboard')
    },
  },
}
</script>

<style scoped>
/* Styles remain mostly the same as original, with additions for new features */
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
  border-left: 4px solid;
}

.stat-card.total {
  border-left-color: #3b82f6;
}
.stat-card.actors {
  border-left-color: #10b981;
}
.stat-card.usecases {
  border-left-color: #8b5cf6;
}
.stat-card.relationships {
  border-left-color: #f59e0b;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-card.total .stat-icon {
  background: #dbeafe;
  color: #3b82f6;
}

.stat-card.actors .stat-icon {
  background: #d1fae5;
  color: #10b981;
}

.stat-card.usecases .stat-icon {
  background: #ede9fe;
  color: #8b5cf6;
}

.stat-card.relationships .stat-icon {
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

/* View Options */
.view-options {
  display: flex;
  gap: 4px;
  background: #f3f4f6;
  padding: 4px;
  border-radius: 8px;
}

.view-toggle {
  padding: 8px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.3s ease;
}

.view-toggle.active {
  background: white;
  color: #1a365d;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Diagrams Section */
.diagrams-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
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
  border: 1px solid #e5e7eb;
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

.preview-renderer {
  width: 100%;
  height: 100%;
  transform-origin: center;
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
  margin-bottom: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #9ca3af;
}

.diagram-stats {
  display: flex;
  gap: 8px;
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

/* List View */
.diagrams-list {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.list-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr auto;
  gap: 16px;
  padding: 16px 20px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.list-item {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr auto;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
  align-items: center;
}

.list-item:hover {
  background: #f9fafb;
}

.col-name {
  display: flex;
  align-items: center;
  gap: 12px;
}

.diagram-icon {
  width: 40px;
  height: 40px;
  background: #e5e7eb;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.item-info h4 {
  margin: 0 0 4px 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
}

.item-info p {
  margin: 0;
  font-size: 0.75rem;
  color: #6b7280;
}

.lang-badge {
  padding: 4px 8px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.stats-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.75rem;
  color: #6b7280;
}

.col-actions {
  display: flex;
  gap: 4px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
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

.empty-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
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

.editor-body,
.viewer-body {
  flex: 1;
  padding: 0;
  overflow: hidden;
}

.editor-content,
.viewer-content {
  display: flex;
  height: 100%;
}

/* Editor Styles */
.editor-toolbar {
  width: 200px;
  padding: 20px;
  background: #f8fafc;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.toolbar-section h4 {
  margin: 0 0 12px 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 8px;
}

.tool-btn:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.editor-main {
  flex: 1;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
}

.editor-sidebar {
  width: 0;
  padding: 20px;
  background: white;
  border-left: 1px solid #e5e7eb;
}

.sidebar-placeholder {
  text-align: center;
  color: #6b7280;
  padding: 40px 20px;
}

.sidebar-placeholder .material-symbols-outlined {
  font-size: 48px;
  margin-bottom: 12px;
  color: #9ca3af;
}

/* Viewer Styles */
.diagram-view {
  flex: 1;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.viewer-sidebar {
  width: 300px;
  padding: 20px;
  background: white;
  border-left: 1px solid #e5e7eb;
}

.viewer-sidebar h4 {
  margin: 0 0 16px 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.info-label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
  flex-shrink: 0;
  margin-right: 12px;
}

.info-value {
  color: #6b7280;
  font-size: 0.875rem;
  text-align: right;
  word-break: break-word;
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
  border-top: 2px solid #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
  margin-right: 8px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .uml-management-view {
    padding: 16px;
  }

  .content-header {
    flex-direction: column;
    gap: 16px;
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

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .diagrams-grid {
    grid-template-columns: 1fr;
  }

  .navigation-tabs {
    flex-direction: column;
  }

  .editor-content,
  .viewer-content {
    flex-direction: column;
  }

  .editor-toolbar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }

  .editor-sidebar,
  .viewer-sidebar {
    width: 100%;
    border-left: none;
    border-top: 1px solid #e5e7eb;
  }

  .empty-actions {
    flex-direction: column;
  }

  .list-header,
  .list-item {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .col-actions {
    justify-content: flex-end;
  }
}
/* New styles for editor enhancements */
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  margin: 0;
}

.info-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.stat-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.position-inputs {
  display: flex;
  gap: 8px;
}

.position-inputs input {
  flex: 1;
}

.full-width {
  width: 100%;
}

.viewer-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.zoom-level {
  padding: 4px 12px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.associated-actors {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.actor-tag {
  padding: 2px 8px;
  background: #e5e7eb;
  border-radius: 12px;
  font-size: 11px;
  color: #374151;
}

.no-actors {
  font-size: 11px;
  color: #9ca3af;
  font-style: italic;
}

.hint {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 8px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .position-inputs {
    flex-direction: column;
  }

  .viewer-toolbar {
    flex-wrap: wrap;
  }
}
</style>