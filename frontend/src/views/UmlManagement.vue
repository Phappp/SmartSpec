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
              <!-- Hiển thị ảnh preview nếu có -->
              <img
                v-if="diagram.previewImage"
                :src="diagram.previewImage"
                :alt="diagram.name || 'Use Case Diagram'"
                class="preview-image"
                @load="onPreviewImageLoad"
                @error="onPreviewImageError(diagram, $event)"
              />
              <!-- Fallback: hiển thị UCDRenderer để generate preview -->
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
              {{ formatDate(diagram.updatedAt || diagram.createdAt) }}
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
  deleteUsecaseDiagram,
  updateMultiplePositions,
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

      // Preview management
      previewCache: new Map(),
      generatingPreviews: new Set(),
      needsPreviewRegeneration: false,
      currentEditingDiagramId: null,

      // Export dropdown state
      activeExportDropdown: null,

      toast: useToast(),
      saveTimeout: null,
    }
  },
  watch: {
    diagrams: {
      handler(newDiagrams) {
        if (newDiagrams && newDiagrams.length > 0) {
          this.$nextTick(() => {
            setTimeout(() => {
              this.triggerPreviewGenerationForAllDiagrams()
            }, 500)
          })
        }
      },
      deep: true,
      immediate: false,
    },
    editingDiagram: {
      handler(newDiagram) {
        if (newDiagram) {
          this.currentEditingDiagramId = newDiagram.id || newDiagram._id
        }
      },
      deep: true,
      immediate: true,
    },
  },
  async created() {
    const projectId = this.$route.params.id
    if (projectId) {
      await this.fetchProjectData(projectId)
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

    async loadDiagrams() {
      if (!this.selectedVersionId) {
        this.diagrams = []
        return
      }

      this.loading = true
      try {
        const { data } = await getUsecaseDiagrams(this.selectedVersionId)
        const diagrams = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []

        this.diagrams = diagrams.map((diagram) => {
          const diagramId = diagram.id || diagram._id
          if (this.previewCache.has(diagramId)) {
            return {
              ...diagram,
              previewImage: this.previewCache.get(diagramId),
            }
          }
          return diagram
        })

        this.$nextTick(() => {
          setTimeout(() => {
            this.triggerPreviewGenerationForAllDiagrams()
          }, 300)
        })
      } catch (err) {
        console.error('Error loading diagrams:', err)
        this.toast.error('Failed to load diagrams')
        this.diagrams = []
      } finally {
        this.loading = false
      }
    },

    // Preview Generation
    triggerPreviewGenerationForAllDiagrams() {
      console.log('🔄 Starting preview generation for all diagrams...')

      this.diagrams.forEach((diagram, index) => {
        const diagramId = diagram.id || diagram._id
        const needsPreview = !diagram.previewImage && !this.previewCache.has(diagramId)

        if (needsPreview) {
          setTimeout(() => {
            this.triggerPreviewGeneration(diagram)
          }, index * 500)
        } else {
          console.log(`✅ Preview already exists for diagram: ${diagramId}`)
        }
      })
    },

    async triggerPreviewGeneration(diagram) {
      const diagramId = diagram.id || diagram._id

      if (this.generatingPreviews.has(diagramId)) {
        console.log(`⏳ Preview already generating for: ${diagramId}`)
        return
      }

      this.generatingPreviews.add(diagramId)
      console.log(`🚀 Starting preview generation for: ${diagramId}`)

      try {
        await this.$nextTick()
        await new Promise((resolve) => setTimeout(resolve, 100))

        const rendererRef = `previewGenerator_${diagramId}`
        console.log(`🔍 Looking for renderer ref: ${rendererRef}`)

        if (this.$refs[rendererRef] && this.$refs[rendererRef][0]) {
          const renderer = this.$refs[rendererRef][0]
          console.log(`✅ Found renderer for: ${diagramId}`)

          if (typeof renderer.generatePreviewImage === 'function') {
            console.log(`🎨 Calling generatePreviewImage for: ${diagramId}`)

            const previewData = await renderer.generatePreviewImage()
            if (previewData) {
              console.log(`✅ Preview generated successfully for: ${diagramId}`)
              this.handlePreviewGenerated(diagram, previewData)
            } else {
              console.warn(`❌ No preview data returned for: ${diagramId}`)
            }
          } else {
            console.error(`❌ generatePreviewImage method not found in renderer for: ${diagramId}`)
          }
        } else {
          console.error(`❌ Renderer ref not found for: ${diagramId}`, this.$refs[rendererRef])

          setTimeout(() => {
            if (!this.previewCache.has(diagramId)) {
              console.log(`🔄 Retrying preview generation for: ${diagramId}`)
              this.triggerPreviewGeneration(diagram)
            }
          }, 1000)
          return
        }
      } catch (error) {
        console.error(`💥 Error generating preview for ${diagramId}:`, error)

        setTimeout(() => {
          if (!this.previewCache.has(diagramId)) {
            console.log(`🔄 Retrying after error for: ${diagramId}`)
            this.triggerPreviewGeneration(diagram)
          }
        }, 2000)
      } finally {
        this.generatingPreviews.delete(diagramId)
        console.log(`🏁 Finished preview generation attempt for: ${diagramId}`)
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
      this.editingDiagram = { ...diagram }
      this.selectedElement = null
      this.zoomLevel = 1
    },

    closeEditor() {
      const editedDiagramId = this.editingDiagram
        ? this.editingDiagram.id || this.editingDiagram._id
        : null

      this.editingDiagram = null
      this.selectedElement = null

      if (editedDiagramId) {
        const diagram = this.diagrams.find((d) => (d.id || d._id) === editedDiagramId)
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

    async deleteDiagram(diagramId, event) {
      if (event) {
        event.stopPropagation()
      }

      const diagram = this.diagrams.find((d) => (d.id || d._id) === diagramId)
      const diagramName = diagram?.name || 'Unnamed Diagram'

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
        await deleteUsecaseDiagram(diagramId)
        this.diagrams = this.diagrams.filter((d) => (d.id || d._id) !== diagramId)

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
          } else {
            this.toast.error('Export functionality not available')
          }
        } else {
          await this.exportAsPNGFallback(diagram)
        }
        this.closeExportDropdown()
      } catch (err) {
        console.error('Error exporting PNG:', err)
        this.toast.error('Failed to export PNG: ' + (err.message || 'Unknown error'))
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
          } else {
            this.toast.error('SVG export functionality not available')
          }
        } else {
          await this.exportAsSVGFallback(diagram)
        }
        this.closeExportDropdown()
      } catch (err) {
        console.error('Error exporting SVG:', err)
        this.toast.error('Failed to export SVG: ' + (err.message || 'Unknown error'))
      }
    },

    // Fallback export methods
    async exportAsPNGFallback(diagram) {
      try {
        const allElements = [
          ...this.getComputedActors(diagram),
          ...this.getComputedUsecases(diagram),
        ]
        if (allElements.length === 0) {
          this.toast.error('No content to export!')
          return
        }

        const bounds = allElements.reduce(
          (acc, element) => ({
            minX: Math.min(acc.minX, element.x - (element.width || 60)),
            maxX: Math.max(acc.maxX, element.x + (element.width || 60)),
            minY: Math.min(acc.minY, element.y - (element.height || 60)),
            maxY: Math.max(acc.maxY, element.y + (element.height || 60)),
          }),
          { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
        )

        const padding = 100
        const contentWidth = Math.max(bounds.maxX - bounds.minX + padding * 2, 800)
        const contentHeight = Math.max(bounds.maxY - bounds.minY + padding * 2, 600)

        const svgString = this.generateExportSVG(
          diagram,
          bounds,
          padding,
          contentWidth,
          contentHeight
        )
        const svgData = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`

        const img = new Image()
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        canvas.width = contentWidth
        canvas.height = contentHeight
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, contentWidth, contentHeight)

        return new Promise((resolve, reject) => {
          img.onload = () => {
            try {
              ctx.drawImage(img, 0, 0, contentWidth, contentHeight)

              canvas.toBlob(
                (blob) => {
                  if (!blob) {
                    reject(new Error('Could not create blob from canvas'))
                    return
                  }

                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `use-case-diagram-${
                    diagram.name || 'export'
                  }-${new Date().getTime()}.png`
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                  resolve()
                },
                'image/png',
                1.0
              )
            } catch (error) {
              console.error('Error drawing image:', error)
              reject(error)
            }
          }
          img.onerror = (error) => {
            console.error('Error loading SVG:', error)
            reject(new Error('Could not load SVG for export.'))
          }
          img.src = svgData
        })
      } catch (err) {
        console.error('Error in PNG fallback export:', err)
        throw err
      }
    },

    async exportAsSVGFallback(diagram) {
      try {
        const allElements = [
          ...this.getComputedActors(diagram),
          ...this.getComputedUsecases(diagram),
        ]
        if (allElements.length === 0) {
          this.toast.error('No content to export!')
          return
        }

        const bounds = allElements.reduce(
          (acc, element) => ({
            minX: Math.min(acc.minX, element.x - (element.width || 60)),
            maxX: Math.max(acc.maxX, element.x + (element.width || 60)),
            minY: Math.min(acc.minY, element.y - (element.height || 60)),
            maxY: Math.max(acc.maxY, element.y + (element.height || 60)),
          }),
          { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
        )

        const padding = 100
        const contentWidth = Math.max(bounds.maxX - bounds.minX + padding * 2, 800)
        const contentHeight = Math.max(bounds.maxY - bounds.minY + padding * 2, 600)

        const svgContent = this.generateExportSVG(
          diagram,
          bounds,
          padding,
          contentWidth,
          contentHeight
        )
        const blob = new Blob([svgContent], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `use-case-diagram-${diagram.name || 'export'}-${new Date().getTime()}.svg`
        a.click()
        URL.revokeObjectURL(url)
      } catch (err) {
        console.error('Error in SVG fallback export:', err)
        throw err
      }
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

    // Helper methods for export
    getComputedActors(diagram) {
      const actors = Array.isArray(diagram?.actors) ? diagram.actors : []
      if (actors.length === 0) return []

      const virtualSpace = {
        minX: -1000,
        maxX: 2200,
        minY: -1000,
        maxY: 1800,
        centerX: 600,
        centerY: 400,
      }

      return actors.map((actor, index) => {
        const position = actor.position || { x: 0, y: 0 }

        return {
          id: this.normalizeId(actor._id) || this.normalizeId(actor.id) || `actor-${index}`,
          name: actor.name || 'Unnamed Actor',
          description: actor.description || '',
          x: position.x || virtualSpace.centerX - 200 + (index % 2) * 200,
          y: position.y || virtualSpace.centerY - 100 + Math.floor(index / 2) * 120,
          width: 80,
          height: 80,
          _originalData: actor,
        }
      })
    },

    getComputedUsecases(diagram) {
      const usecases = Array.isArray(diagram?.usecases) ? diagram.usecases : []
      if (!usecases || usecases.length === 0) return []

      const virtualSpace = {
        minX: -1000,
        maxX: 2200,
        minY: -1000,
        maxY: 1800,
        centerX: 600,
        centerY: 400,
      }

      return usecases.map((uc, index) => {
        const position = uc.position || { x: 0, y: 0 }

        return {
          id: this.normalizeId(uc._id) || this.normalizeId(uc.id) || `uc-${index}`,
          title: uc.title || 'Unnamed Use Case',
          description: uc.description || '',
          x: position.x || virtualSpace.centerX + (index % 4) * 150,
          y: position.y || virtualSpace.centerY - 150 + Math.floor(index / 4) * 100,
          width: 120,
          height: 40,
          _originalData: uc,
        }
      })
    },

    generateExportSVG(diagram, bounds, padding, contentWidth, contentHeight) {
      const computedActors = this.getComputedActors(diagram)
      const computedUsecases = this.getComputedUsecases(diagram)
      const computedAssociations = this.getComputedAssociations(diagram)
      const computedRelationships = this.getComputedRelationships(diagram)

      const viewBox = `${bounds.minX - padding} ${
        bounds.minY - padding
      } ${contentWidth} ${contentHeight}`

      return `
<svg xmlns="http://www.w3.org/2000/svg" width="${contentWidth}" height="${contentHeight}" viewBox="${viewBox}">
  <defs>
    <marker id="association-arrow-export" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#374151" />
    </marker>
    <marker id="include-arrow-export" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
    </marker>
    <marker id="extend-arrow-export" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#8b5cf6" />
    </marker>
    <marker id="generalization-arrow-export" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 L 2.5 5 z" fill="#10b981" stroke="#10b981" stroke-width="1" />
    </marker>
  </defs>

  <!-- Background trắng -->
  <rect x="${bounds.minX - padding}" y="${bounds.minY - padding}" 
        width="${contentWidth}" height="${contentHeight}" fill="white" />

  <!-- Render Associations -->
  ${computedAssociations
    .map((assoc) => {
      const path = this.calculateAssociationPath(assoc)
      return `<path d="${path}" stroke="#374151" stroke-width="1.5" fill="none" marker-end="url(#association-arrow-export)" />`
    })
    .join('')}

  <!-- Render Relationships -->
  ${computedRelationships
    .map((rel) => {
      const path = this.calculateRelationshipPath(rel)
      const marker = this.getRelationshipMarkerExport(rel.type)
      const dashArray = rel.type === 'extend' ? 'stroke-dasharray="5,3"' : ''
      const label = this.getRelationshipLabel(rel.type)
      const labelPos = this.getRelationshipLabelPosition(rel)

      const labelContent =
        rel.type !== 'association'
          ? `
      <g>
        <rect x="${labelPos.x - 20}" y="${
              labelPos.y - 8
            }" width="40" height="16" rx="3" fill="white" stroke="#e5e7eb" stroke-width="1" />
        <text x="${labelPos.x}" y="${
              labelPos.y
            }" font-size="9" fill="#374151" text-anchor="middle" dominant-baseline="middle">${label}</text>
      </g>
    `
          : ''

      return `
      <path d="${path}" stroke="${this.getRelationshipColor(
        rel.type
      )}" stroke-width="1.5" fill="none" ${dashArray} marker-end="${marker}" />
      ${labelContent}
    `
    })
    .join('')}

  <!-- Render Use Cases -->
  ${computedUsecases
    .map(
      (uc) => `
    <g>
      <ellipse cx="${uc.x}" cy="${uc.y}" rx="${uc.width / 2}" ry="${
        uc.height / 2
      }" fill="white" stroke="#3b82f6" stroke-width="2" />
      <text x="${uc.x}" y="${
        uc.y
      }" font-size="10" fill="#1e40af" text-anchor="middle" dominant-baseline="middle">${
        uc.title
      }</text>
    </g>
  `
    )
    .join('')}

  <!-- Render Actors -->
  ${computedActors
    .map(
      (actor) => `
    <g>
      <circle cx="${actor.x}" cy="${
        actor.y - 20
      }" r="12" fill="white" stroke="#1f2937" stroke-width="2" />
      <line x1="${actor.x}" y1="${actor.y - 8}" x2="${actor.x}" y2="${
        actor.y + 15
      }" stroke="#1f2937" stroke-width="2" />
      <line x1="${actor.x - 12}" y1="${actor.y + 5}" x2="${actor.x + 12}" y2="${
        actor.y + 5
      }" stroke="#1f2937" stroke-width="2" />
      <line x1="${actor.x}" y1="${actor.y + 15}" x2="${actor.x - 10}" y2="${
        actor.y + 30
      }" stroke="#1f2937" stroke-width="2" />
      <line x1="${actor.x}" y1="${actor.y + 15}" x2="${actor.x + 10}" y2="${
        actor.y + 30
      }" stroke="#1f2937" stroke-width="2" />
      <text x="${actor.x}" y="${
        actor.y + 50
      }" font-size="11" fill="#374151" text-anchor="middle" dominant-baseline="middle">${
        actor.name
      }</text>
    </g>
  `
    )
    .join('')}
</svg>`
    },

    // Additional helper methods for export
    getRelationshipMarkerExport(type) {
      const markers = {
        include: 'url(#include-arrow-export)',
        extend: 'url(#extend-arrow-export)',
        generalization: 'url(#generalization-arrow-export)',
      }
      return markers[type] || 'url(#association-arrow-export)'
    },

    getRelationshipLabel(type) {
      const labels = {
        include: '«include»',
        extend: '«extend»',
        generalization: '«inherits»',
      }
      return labels[type] || ''
    },

    getRelationshipColor(type) {
      const colors = {
        include: '#3b82f6',
        extend: '#8b5cf6',
        generalization: '#10b981',
        association: '#374151',
      }
      return colors[type] || '#374151'
    },

    calculateAssociationPath(association) {
      const { actor, usecase } = association
      const dx = usecase.x - actor.x
      const dy = usecase.y - actor.y
      const length = Math.sqrt(dx * dx + dy * dy)
      if (length === 0) return ''

      const nx = dx / length
      const ny = dy / length
      const actorOffset = 25
      const usecaseOffset = this.calculateUsecaseOffset(usecase, -nx, -ny)

      const startX = actor.x + nx * actorOffset
      const startY = actor.y + ny * actorOffset
      const endX = usecase.x - nx * usecaseOffset
      const endY = usecase.y - ny * usecaseOffset

      return `M ${startX} ${startY} L ${endX} ${endY}`
    },

    calculateRelationshipPath(relationship) {
      const { source, target } = relationship
      if (source.id === target.id) {
        return `M ${source.x} ${source.y} C ${source.x + 50} ${source.y - 50} ${source.x + 50} ${
          source.y - 50
        } ${source.x} ${source.y}`
      }

      const dx = target.x - source.x
      const dy = target.y - source.y
      const length = Math.sqrt(dx * dx + dy * dy)
      if (length === 0) return ''

      const nx = dx / length
      const ny = dy / length
      const sourceOffset = this.getElementOffset(source, nx, ny)
      const targetOffset = this.getElementOffset(target, -nx, -ny)

      const startX = source.x + nx * sourceOffset
      const startY = source.y + ny * sourceOffset
      const endX = target.x - nx * targetOffset
      const endY = target.y - ny * targetOffset

      return `M ${startX} ${startY} L ${endX} ${endY}`
    },

    calculateUsecaseOffset(usecase, nx, ny) {
      const rx = usecase.width / 2
      const ry = usecase.height / 2
      if (nx === 0) return ry
      if (ny === 0) return rx

      const angle = Math.atan2(ny, nx)
      const cosAngle = Math.cos(angle)
      const sinAngle = Math.sin(angle)
      return Math.sqrt((rx * cosAngle) ** 2 + (ry * sinAngle) ** 2)
    },

    getElementOffset(element, nx, ny) {
      if (element.width && element.height) return this.calculateUsecaseOffset(element, nx, ny)
      else return 25
    },

    getRelationshipLabelPosition(relationship) {
      const { source, target } = relationship
      const midX = (source.x + target.x) / 2
      const midY = (source.y + target.y) / 2

      const dx = target.x - source.x
      const dy = target.y - source.y
      const length = Math.sqrt(dx * dx + dy * dy)
      const offset = Math.min(30, length * 0.2)

      const perpendicularX = (-dy / length) * offset
      const perpendicularY = (dx / length) * offset

      return { x: midX + perpendicularX, y: midY + perpendicularY }
    },

    getComputedAssociations(diagram) {
      const associations = Array.isArray(diagram?.associations) ? diagram.associations : []
      const actors = this.getComputedActors(diagram)
      const usecases = this.getComputedUsecases(diagram)

      if (
        !associations ||
        associations.length === 0 ||
        actors.length === 0 ||
        usecases.length === 0
      ) {
        return []
      }

      return associations
        .map((assoc) => {
          try {
            const actorId = this.normalizeId(assoc.actor_id)
            const usecaseId = this.normalizeId(assoc.usecase_id)
            if (!actorId || !usecaseId) return null

            const actor = actors.find((a) => a.id === actorId)
            const usecase = usecases.find((uc) => uc.id === usecaseId)
            if (!actor || !usecase) return null

            return {
              id:
                this.normalizeId(assoc._id) ||
                this.normalizeId(assoc.id) ||
                `assoc-${actorId}-${usecaseId}`,
              actor,
              usecase,
            }
          } catch (error) {
            console.warn('Error processing association:', error)
            return null
          }
        })
        .filter(Boolean)
    },

    getComputedRelationships(diagram) {
      const relationships = Array.isArray(diagram?.relationships) ? diagram.relationships : []
      const actors = this.getComputedActors(diagram)
      const usecases = this.getComputedUsecases(diagram)

      if (!relationships || relationships.length === 0) return []

      return relationships
        .map((rel) => {
          try {
            const sourceId = this.normalizeId(rel.source)
            const targetId = this.normalizeId(rel.target)
            if (!sourceId || !targetId) return null

            let source =
              usecases.find((uc) => uc.id === sourceId) ||
              actors.find((actor) => actor.id === sourceId)
            let target =
              usecases.find((uc) => uc.id === targetId) ||
              actors.find((actor) => actor.id === targetId)
            if (!source || !target) return null

            return {
              id:
                this.normalizeId(rel._id) ||
                this.normalizeId(rel.id) ||
                `rel-${sourceId}-${targetId}`,
              source,
              target,
              type: rel.type || 'association',
            }
          } catch (error) {
            console.warn('Error processing relationship:', error)
            return null
          }
        })
        .filter(Boolean)
    },

    normalizeId(id) {
      if (!id) return null
      if (typeof id === 'object' && id.$oid) return id.$oid
      if (typeof id === 'string') return id
      if (typeof id === 'object') return String(id)
      return String(id)
    },

    // Preview Image Management
    handlePreviewGenerated(diagram, previewData) {
      if (previewData) {
        const diagramId = diagram.id || diagram._id

        console.log('✅ Preview generated and saved for diagram:', diagramId)

        this.previewCache.set(diagramId, previewData)

        const diagramIndex = this.diagrams.findIndex((d) => (d.id || d._id) === diagramId)
        if (diagramIndex !== -1) {
          this.diagrams[diagramIndex].previewImage = previewData
          console.log(`🖼️ Preview image set for diagram: ${diagramId}`)
        }

        this.generatingPreviews.delete(diagramId)
      } else {
        console.warn('❌ No preview data received for diagram:', diagram.id || diagram._id)
      }
    },

    onPreviewImageLoad(event) {
      console.log('🖼️ Preview image loaded successfully')
      event.target.style.opacity = '1'
    },

    onPreviewImageError(diagram, event) {
      const diagramId = diagram.id || diagram._id
      console.warn('❌ Preview image failed to load for diagram:', diagramId)
      event.target.style.display = 'none'

      if (!this.generatingPreviews.has(diagramId)) {
        console.log('🔄 Regenerating preview due to image load error')
        this.triggerPreviewGeneration(diagram)
      }
    },

    async regeneratePreview(diagram) {
      const diagramId = diagram.id || diagram._id
      if (this.generatingPreviews.has(diagramId)) {
        console.log('⏳ Preview regeneration already in progress for:', diagramId)
        return
      }

      console.log('🔄 Manually regenerating preview for:', diagramId)

      this.previewCache.delete(diagramId)
      const diagramIndex = this.diagrams.findIndex((d) => (d.id || d._id) === diagramId)
      if (diagramIndex !== -1) {
        delete this.diagrams[diagramIndex].previewImage
      }

      this.triggerPreviewGeneration(diagram)
    },

    forceRegenerateAllPreviews() {
      console.log('🔄 Force regenerating all previews')

      this.previewCache.clear()
      this.generatingPreviews.clear()

      this.diagrams.forEach((diagram) => {
        delete diagram.previewImage
      })

      this.triggerPreviewGenerationForAllDiagrams()
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

      if (this.$refs.ucdEditor && this.$refs.ucdEditor.onSaveStart) {
        this.$refs.ucdEditor.onSaveStart()
      }

      this.debounceSave()
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

    async saveDiagramPositions() {
      if (!this.editingDiagram) return

      try {
        const diagramId = this.editingDiagram.id || this.editingDiagram._id
        if (!diagramId) return

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

        if (this.$refs.ucdEditor && this.$refs.ucdEditor.onSaveComplete) {
          this.$refs.ucdEditor.onSaveComplete(true)
        }

        console.log('💾 Positions saved successfully')
        this.needsPreviewRegeneration = true
      } catch (err) {
        console.error('❌ Error saving positions:', err)

        if (this.$refs.ucdEditor && this.$refs.ucdEditor.onSaveComplete) {
          this.$refs.ucdEditor.onSaveComplete(false)
        }

        this.toast.error('Failed to save positions')
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

    async refreshDiagrams() {
      await this.loadDiagrams()
      this.toast.success('Diagrams refreshed')
    },

    async exportDiagram(diagram) {
      await this.exportDiagramAsPNG(diagram)
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

/* Diagrams Grid - Responsive */
.diagrams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
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

/* Diagram Preview với ảnh */
.diagram-preview {
  position: relative;
  width: 100%;
  height: 200px;
  background: #f8fafc;
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

  .diagrams-grid {
    grid-template-columns: 1fr;
  }

  .navigation-tabs {
    flex-direction: column;
    padding: 0;
  }

  .tab-button {
    justify-content: center;
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
}
</style>