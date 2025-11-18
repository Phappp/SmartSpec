<template>
  <div
    class="ucd-renderer-final"
    :class="{
      'preview-mode': previewMode,
      'editable-mode': editable,
      'fullscreen-mode': isFullscreen,
      'hidden-renderer': optimizeForPreview,
    }"
  >
    <!-- Toolbar - Ẩn trong preview mode và optimize mode -->
    <div v-if="!previewMode && editable && !optimizeForPreview" class="toolbar-final">
      <div class="toolbar-left">
        <!-- View Controls -->
        <div class="toolbar-group">
          <button class="toolbar-btn" @click="zoomOut" title="Zoom Out (Ctrl + -)">
            <span class="material-symbols-outlined">zoom_out</span>
          </button>
          <div class="zoom-display">{{ Math.round(internalZoom * 100) }}%</div>
          <button class="toolbar-btn" @click="zoomIn" title="Zoom In (Ctrl + +)">
            <span class="material-symbols-outlined">zoom_in</span>
          </button>
          <button
            class="toolbar-btn"
            @click="toggleFullscreen"
            :title="isFullscreen ? 'Exit Fullscreen (F11)' : 'Enter Fullscreen (F11)'"
          >
            <span class="material-symbols-outlined">{{
              isFullscreen ? 'fullscreen_exit' : 'fullscreen'
            }}</span>
          </button>
          <button class="toolbar-btn" @click="resetZoom" title="Reset Zoom">
            <span class="material-symbols-outlined">refresh</span>
          </button>
          <button class="toolbar-btn" @click="fitToViewport" title="Fit to Viewport">
            <span class="material-symbols-outlined">fit_screen</span>
          </button>
        </div>

        <!-- Undo/Redo Controls -->
        <div class="toolbar-group">
          <button class="toolbar-btn" @click="undo" :disabled="!canUndo" title="Undo (Ctrl+Z)">
            <span class="material-symbols-outlined">undo</span>
            Undo
          </button>
          <button class="toolbar-btn" @click="redo" :disabled="!canRedo" title="Redo (Ctrl+Y)">
            <span class="material-symbols-outlined">redo</span>
            Redo
          </button>
        </div>

        <!-- Export Controls -->
        <div class="toolbar-group">
          <button class="toolbar-btn" @click="exportAsSVG" title="Export as SVG">
            <span class="material-symbols-outlined">download</span>
            SVG
          </button>
          <button class="toolbar-btn" @click="exportAsPNG" title="Export as PNG">
            <span class="material-symbols-outlined">image</span>
            PNG
          </button>
        </div>

        <!-- Auto Save Status -->
        <div class="toolbar-group auto-save-status">
          <div class="save-indicator" :class="{ saving: isSaving, saved: lastSaved && !isSaving }">
            <span class="material-symbols-outlined icon">
              {{ isSaving ? 'sync' : lastSaved ? 'check_circle' : 'circle' }}
            </span>
            <span class="save-text">
              {{ getSaveStatusText() }}
            </span>
            <span v-if="lastSaved && !isSaving" class="save-time">
              {{ formatLastSaved() }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Container -->
    <div
      class="ucd-container-final"
      ref="container"
      @mousedown="startPan"
      @mousemove="handlePan"
      @mouseup="endPan"
      @mouseleave="endPan"
      @wheel="handleWheel"
    >
      <!-- SVG Container -->
      <svg
        :width="containerWidth"
        :height="containerHeight"
        class="ucd-svg-final"
        :style="svgStyle"
        :viewBox="viewBox"
        @click="handleSvgClick"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseLeave"
      >
        <!-- Definitions -->
        <defs>
          <!-- Grid pattern -->
          <pattern
            id="grid-pattern-final"
            x="0"
            y="0"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" stroke-width="1" />
          </pattern>

          <!-- Arrow markers -->
          <marker
            id="association-arrow-final"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#374151" />
          </marker>

          <marker
            id="include-arrow-final"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
          </marker>

          <marker
            id="extend-arrow-final"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#8b5cf6" />
          </marker>

          <marker
            id="generalization-arrow-final"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto"
          >
            <path
              d="M 0 0 L 10 5 L 0 10 L 2.5 5 z"
              fill="#10b981"
              stroke="#10b981"
              stroke-width="1"
            />
          </marker>

          <!-- Drop shadow filter -->
          <filter id="drop-shadow-final" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="1" dy="1" result="offsetblur" />
            <feFlood flood-color="#000000" flood-opacity="0.2" />
            <feComposite in2="offsetblur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <!-- Background Grid -->
        <g class="grid-layer">
          <rect
            :x="virtualSpace.minX"
            :y="virtualSpace.minY"
            :width="virtualSpace.width"
            :height="virtualSpace.height"
            fill="url(#grid-pattern-final)"
          />
          <!-- Canvas Boundary -->
          <rect
            v-if="!previewMode && editable"
            :x="virtualSpace.minX"
            :y="virtualSpace.minY"
            :width="virtualSpace.width"
            :height="virtualSpace.height"
            class="canvas-boundary"
            fill="none"
            stroke="#e5e7eb"
            stroke-width="1"
            stroke-dasharray="5,5"
          />
        </g>

        <!-- Render Associations -->
        <g class="associations-layer">
          <g
            v-for="assoc in computedAssociations"
            :key="`assoc-${assoc.id}`"
            class="association-group"
          >
            <path
              :d="calculateAssociationPath(assoc)"
              class="association-line"
              marker-end="url(#association-arrow-final)"
            />
          </g>
        </g>

        <!-- Render Relationships với labels -->
        <g class="relationships-layer">
          <g v-for="rel in computedRelationships" :key="`rel-${rel.id}`" class="relationship-group">
            <!-- Đường relationship -->
            <path
              :d="calculateRelationshipPath(rel)"
              :class="`relationship-line relationship-${rel.type}`"
              :marker-end="getRelationshipMarker(rel.type)"
            />

            <!-- Label -->
            <g v-if="rel.type !== 'association'" class="relationship-label-container">
              <rect
                :x="getRelationshipLabelPosition(rel).x - 20"
                :y="getRelationshipLabelPosition(rel).y - 8"
                width="40"
                height="16"
                rx="3"
                fill="white"
                stroke="#e5e7eb"
                stroke-width="1"
                class="label-background"
              />
              <text
                :x="getRelationshipLabelPosition(rel).x"
                :y="getRelationshipLabelPosition(rel).y"
                class="relationship-label"
                text-anchor="middle"
                dominant-baseline="middle"
              >
                {{ getRelationshipLabel(rel.type) }}
              </text>
            </g>
          </g>
        </g>

        <!-- Render Use Cases -->
        <g class="usecases-layer">
          <g
            v-for="uc in computedUsecases"
            :key="`uc-${uc.id}`"
            :class="{
              'usecase-group': true,
              selected: selectedElement && selectedElement.id === uc.id,
              draggable: editable,
            }"
            @mousedown="startDrag(uc, 'usecase', $event)"
          >
            <ellipse
              :cx="uc.x"
              :cy="uc.y"
              :rx="uc.width / 2"
              :ry="uc.height / 2"
              class="usecase-node"
              filter="url(#drop-shadow-final)"
            />
            <foreignObject
              :x="uc.x - uc.width / 2"
              :y="uc.y - uc.height / 2"
              :width="uc.width"
              :height="uc.height"
              class="usecase-content"
            >
              <div class="usecase-title">
                {{ uc.title }}
              </div>
            </foreignObject>
          </g>
        </g>

        <!-- Render Actors -->
        <g class="actors-layer">
          <g
            v-for="actor in computedActors"
            :key="`actor-${actor.id}`"
            :class="{
              'actor-group': true,
              selected: selectedElement && selectedElement.id === actor.id,
              draggable: editable,
            }"
            @mousedown="startDrag(actor, 'actor', $event)"
          >
            <!-- Actor stick figure -->
            <circle
              :cx="actor.x"
              :cy="actor.y - 20"
              r="12"
              class="actor-head"
              filter="url(#drop-shadow-final)"
            />
            <line
              :x1="actor.x"
              :y1="actor.y - 8"
              :x2="actor.x"
              :y2="actor.y + 15"
              class="actor-body"
            />
            <line
              :x1="actor.x - 12"
              :y1="actor.y + 5"
              :x2="actor.x + 12"
              :y2="actor.y + 5"
              class="actor-arms"
            />
            <line
              :x1="actor.x"
              :y1="actor.y + 15"
              :x2="actor.x - 10"
              :y2="actor.y + 30"
              class="actor-legs"
            />
            <line
              :x1="actor.x"
              :y1="actor.y + 15"
              :x2="actor.x + 10"
              :y2="actor.y + 30"
              class="actor-legs"
            />

            <!-- Actor name -->
            <foreignObject
              :x="actor.x - 40"
              :y="actor.y + 40"
              :width="80"
              :height="30"
              class="actor-content"
            >
              <div class="actor-name">
                {{ actor.name }}
              </div>
            </foreignObject>
          </g>
        </g>

        <!-- Selection highlight -->
        <rect
          v-if="selectedElement && !previewMode"
          :x="selectedElement.x - selectedElement.width / 2 - 8"
          :y="selectedElement.y - selectedElement.height / 2 - 8"
          :width="selectedElement.width + 16"
          :height="selectedElement.height + 16"
          class="selection-highlight-final"
          :rx="selectedElementType === 'usecase' ? (selectedElement.height + 16) / 2 : 8"
        />

        <!-- Drag preview -->
        <g v-if="draggingElement" class="drag-preview">
          <ellipse
            v-if="draggingType === 'usecase'"
            :cx="dragPosition.x"
            :cy="dragPosition.y"
            :rx="draggingElement.width / 2"
            :ry="draggingElement.height / 2"
            class="usecase-node drag-preview-element"
          />
          <g v-else-if="draggingType === 'actor'">
            <circle
              :cx="dragPosition.x"
              :cy="dragPosition.y - 20"
              r="12"
              class="actor-head drag-preview-element"
            />
            <line
              :x1="dragPosition.x"
              :y1="dragPosition.y - 8"
              :x2="dragPosition.x"
              :y2="dragPosition.y + 15"
              class="actor-body drag-preview-element"
            />
            <line
              :x1="dragPosition.x - 12"
              :y1="dragPosition.y + 5"
              :x2="dragPosition.x + 12"
              :y2="dragPosition.y + 5"
              class="actor-arms drag-preview-element"
            />
            <line
              :x1="dragPosition.x"
              :y1="dragPosition.y + 15"
              :x2="dragPosition.x - 10"
              :y2="dragPosition.y + 30"
              class="actor-legs drag-preview-element"
            />
            <line
              :x1="dragPosition.x"
              :y1="dragPosition.y + 15"
              :x2="dragPosition.x + 10"
              :y2="dragPosition.y + 30"
              class="actor-legs drag-preview-element"
            />
          </g>
        </g>
      </svg>
    </div>

    <!-- Status Bar - Ẩn trong preview mode và optimize mode -->
    <div v-if="!previewMode && !optimizeForPreview" class="status-bar-final">
      <div class="status-item">
        <span class="material-symbols-outlined">person</span>
        {{ computedActors.length }} Actors
      </div>
      <div class="status-item">
        <span class="material-symbols-outlined">cases</span>
        {{ computedUsecases.length }} Use Cases
      </div>
      <div class="status-item">
        <span class="material-symbols-outlined">link</span>
        {{ computedAssociations.length + computedRelationships.length }} Relationships
      </div>

      <div class="status-item" v-if="selectedElement">
        Selected: {{ selectedElement.name || selectedElement.title }}
      </div>

      <div class="status-item spacer"></div>

      <div class="status-item">
        View: ({{ Math.round(viewport.x) }}, {{ Math.round(viewport.y) }})
      </div>
      <div class="status-item">
        Canvas: {{ Math.round(virtualSpace.width) }} × {{ Math.round(virtualSpace.height) }}
      </div>
      <div class="status-item">Zoom: {{ Math.round(internalZoom * 100) }}%</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UCDRendererFinal',
  props: {
    diagramData: {
      type: Object,
      required: true,
      default: () => ({
        actors: [],
        usecases: [],
        associations: [],
        relationships: [],
      }),
    },
    onPositionChange: {
      type: Function,
      default: null,
    },
    previewMode: {
      type: Boolean,
      default: false,
    },
    editable: {
      type: Boolean,
      default: false,
    },
    zoomLevel: {
      type: Number,
      default: 1,
    },
    containerWidth: {
      type: Number,
      default: 1200,
    },
    containerHeight: {
      type: Number,
      default: 800,
    },
    autoGeneratePreview: {
      type: Boolean,
      default: false,
    },
    optimizeForPreview: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      selectedElement: null,
      selectedElementType: null,
      draggingElement: null,
      draggingType: null,
      dragPosition: { x: 0, y: 0 },
      dragOffset: { x: 0, y: 0 },
      isDragging: false,
      internalZoom: 1,
      viewport: { x: 0, y: 0 },
      isPanning: false,
      panStart: { x: 0, y: 0 },
      isFullscreen: false,
      isExporting: false,
      isSaving: false,
      lastSaved: null,
      saveChangesCount: 0,

      virtualSpace: {
        minX: -1000,
        maxX: 2200,
        minY: -1000,
        maxY: 1800,
        get width() {
          return this.maxX - this.minX
        },
        get height() {
          return this.maxY - this.minY
        },
        get centerX() {
          return (this.minX + this.maxX) / 2
        },
        get centerY() {
          return (this.minY + this.maxY) / 2
        },
      },

      // History
      history: [],
      currentHistoryIndex: -1,
      maxHistoryLength: 50,
      isRestoringFromHistory: false,

      // Preview generation
      previewGenerated: false,
    }
  },
  computed: {
    viewBox() {
      return `${this.virtualSpace.minX} ${this.virtualSpace.minY} ${this.virtualSpace.width} ${this.virtualSpace.height}`
    },
    svgStyle() {
      return {
        transform: `translate(${this.viewport.x}px, ${this.viewport.y}px) scale(${this.internalZoom})`,
        transformOrigin: '0 0',
      }
    },
    canUndo() {
      return this.history.length > 1 && this.currentHistoryIndex > 0
    },
    canRedo() {
      return this.history.length > 0 && this.currentHistoryIndex < this.history.length - 1
    },

    safeDiagramData() {
      return {
        actors: Array.isArray(this.diagramData?.actors) ? this.diagramData.actors : [],
        usecases: Array.isArray(this.diagramData?.usecases) ? this.diagramData.usecases : [],
        associations: Array.isArray(this.diagramData?.associations)
          ? this.diagramData.associations
          : [],
        relationships: Array.isArray(this.diagramData?.relationships)
          ? this.diagramData.relationships
          : [],
      }
    },

    computedActors() {
      const actors = this.safeDiagramData.actors
      if (!actors || actors.length === 0) return []

      return actors.map((actor, index) => {
        const position = actor.position || { x: 0, y: 0 }

        return {
          id: this.normalizeId(actor._id) || this.normalizeId(actor.id) || `actor-${index}`,
          name: actor.name || 'Unnamed Actor',
          description: actor.description || '',
          x: position.x || this.virtualSpace.centerX - 200 + (index % 2) * 200,
          y: position.y || this.virtualSpace.centerY - 100 + Math.floor(index / 2) * 120,
          width: 80,
          height: 80,
          _originalData: actor,
        }
      })
    },

    computedUsecases() {
      const usecases = this.safeDiagramData.usecases
      if (!usecases || usecases.length === 0) return []

      return usecases.map((uc, index) => {
        const position = uc.position || { x: 0, y: 0 }

        return {
          id: this.normalizeId(uc._id) || this.normalizeId(uc.id) || `uc-${index}`,
          title: uc.title || 'Unnamed Use Case',
          description: uc.description || '',
          x: position.x || this.virtualSpace.centerX + (index % 4) * 150,
          y: position.y || this.virtualSpace.centerY - 150 + Math.floor(index / 4) * 100,
          width: 120,
          height: 40,
          _originalData: uc,
        }
      })
    },

    computedAssociations() {
      const associations = this.safeDiagramData.associations
      const actors = this.computedActors
      const usecases = this.computedUsecases

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

    computedRelationships() {
      const relationships = this.safeDiagramData.relationships
      const actors = this.computedActors
      const usecases = this.computedUsecases

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
  },
  watch: {
    diagramData: {
      handler(newData, oldData) {
        this.updateVirtualSpace()

        if (this.autoGeneratePreview && !this.previewGenerated) {
          this.$nextTick(() => {
            setTimeout(() => {
              this.generatePreviewImage().then((previewData) => {
                if (previewData) {
                  this.$emit('preview-generated', previewData)
                  this.previewGenerated = true
                }
              })
            }, 300)
          })
        }
      },
      deep: true,
      immediate: true,
    },
    zoomLevel: {
      handler(newZoom) {
        this.internalZoom = newZoom
      },
      immediate: true,
    },
  },
  mounted() {
    this.updateVirtualSpace()
    this.setupEventListeners()
    this.setupKeyboardShortcuts()
    this.setupFullscreenListener()
    this.centerViewport()

    if (this.editable) {
      this.$nextTick(() => {
        this.saveToHistory('Initial state')
      })
    }

    // Auto generate preview nếu được yêu cầu
    if (this.autoGeneratePreview) {
      this.$nextTick(() => {
        setTimeout(() => {
          this.generatePreviewImage().then((previewData) => {
            if (previewData) {
              this.$emit('preview-generated', previewData)
              this.previewGenerated = true
            }
          })
        }, 500)
      })
    }
  },
  beforeUnmount() {
    this.removeEventListeners()
    this.cleanupFullscreenListener()
  },
  methods: {
    // Virtual Space Management
    updateVirtualSpace() {
      const allElements = [...this.computedActors, ...this.computedUsecases]
      if (allElements.length === 0) return

      const bounds = allElements.reduce(
        (acc, element) => ({
          minX: Math.min(acc.minX, element.x - (element.width || 60)),
          maxX: Math.max(acc.maxX, element.x + (element.width || 60)),
          minY: Math.min(acc.minY, element.y - (element.height || 60)),
          maxY: Math.max(acc.maxY, element.y + (element.height || 60)),
        }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
      )

      const padding = 200
      this.virtualSpace.minX = Math.min(this.virtualSpace.minX, bounds.minX - padding)
      this.virtualSpace.maxX = Math.max(this.virtualSpace.maxX, bounds.maxX + padding)
      this.virtualSpace.minY = Math.min(this.virtualSpace.minY, bounds.minY - padding)
      this.virtualSpace.maxY = Math.max(this.virtualSpace.maxY, bounds.maxY + padding)
    },

    centerViewport() {
      const centerX = this.containerWidth / 2 - this.virtualSpace.centerX * this.internalZoom
      const centerY = this.containerHeight / 2 - this.virtualSpace.centerY * this.internalZoom
      this.viewport.x = centerX
      this.viewport.y = centerY
    },

    // Drag and Drop
    startDrag(element, type, event) {
      if (!this.editable || this.previewMode) return

      event.preventDefault()
      event.stopPropagation()

      this.draggingElement = element
      this.draggingType = type

      const rect = this.$refs.container.getBoundingClientRect()
      const point = this.$el.querySelector('.ucd-svg-final').createSVGPoint()
      point.x = event.clientX - rect.left
      point.y = event.clientY - rect.top

      const svgPoint = point.matrixTransform(
        this.$el.querySelector('.ucd-svg-final').getScreenCTM().inverse()
      )

      this.dragOffset = { x: svgPoint.x - element.x, y: svgPoint.y - element.y }
      this.dragPosition = { x: element.x, y: element.y }
      this.isDragging = true

      this.selectElement(element, type)
      this.initialDragPosition = { x: element.x, y: element.y }

      this.$refs.container.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
    },

    handleMouseMove(event) {
      if (!this.isDragging || !this.draggingElement) return

      const rect = this.$refs.container.getBoundingClientRect()
      const point = this.$el.querySelector('.ucd-svg-final').createSVGPoint()
      point.x = event.clientX - rect.left
      point.y = event.clientY - rect.top

      const svgPoint = point.matrixTransform(
        this.$el.querySelector('.ucd-svg-final').getScreenCTM().inverse()
      )

      let newX = svgPoint.x - this.dragOffset.x
      let newY = svgPoint.y - this.dragOffset.y

      // Giới hạn trong virtual space
      const safePadding = 20
      newX = Math.max(
        this.virtualSpace.minX + safePadding,
        Math.min(this.virtualSpace.maxX - safePadding, newX)
      )
      newY = Math.max(
        this.virtualSpace.minY + safePadding,
        Math.min(this.virtualSpace.maxY - safePadding, newY)
      )

      this.dragPosition = { x: newX, y: newY }

      if (this.draggingElement) {
        this.draggingElement.x = newX
        this.draggingElement.y = newY

        // Hiển thị saving indicator ngay lập tức khi đang kéo
        this.showSavingIndicator()

        this.$emit('position-updated', {
          element: this.draggingElement,
          type: this.draggingType,
          position: this.dragPosition,
        })

        this.$emit('element-dragged', {
          element: this.draggingElement,
          type: this.draggingType,
          newPosition: this.dragPosition,
        })
      }
    },

    showSavingIndicator() {
      this.isSaving = true
      this.lastSaved = null
    },

    hideSavingIndicator() {
      this.isSaving = false
      this.lastSaved = new Date()
    },

    getSaveStatusText() {
      if (this.isSaving) {
        return 'Saving...'
      } else if (this.lastSaved) {
        return 'Saved'
      } else {
        return 'No changes'
      }
    },

    formatLastSaved() {
      if (!this.lastSaved) return ''

      const now = new Date()
      const diffMs = now - this.lastSaved
      const diffSec = Math.floor(diffMs / 1000)
      const diffMin = Math.floor(diffSec / 60)

      if (diffSec < 5) return 'just now'
      if (diffSec < 60) return `${diffSec}s ago`
      if (diffMin < 60) return `${diffMin}m ago`

      return this.lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },

    // Method để parent component gọi khi save hoàn thành
    onSaveComplete(success = true) {
      if (success) {
        this.hideSavingIndicator()
      } else {
        // Hiển thị lỗi nếu save thất bại
        this.isSaving = false
        this.lastSaved = null
      }
    },

    // Method để parent component gọi khi bắt đầu save
    onSaveStart() {
      this.showSavingIndicator()
    },

    handleMouseUp() {
      if (!this.isDragging || !this.draggingElement) return

      const hasMoved =
        this.initialDragPosition &&
        (Math.abs(this.initialDragPosition.x - this.dragPosition.x) > 1 ||
          Math.abs(this.initialDragPosition.y - this.dragPosition.y) > 1)

      if (hasMoved && this.editable) {
        // Tăng counter để hiển thị có thay đổi
        this.saveChangesCount++

        // Gọi callback để parent xử lý save
        if (this.onPositionChange) {
          this.onPositionChange({
            element: this.draggingElement,
            type: this.draggingType,
            position: this.dragPosition,
          })
        }

        this.saveToHistory(`Moved ${this.draggingType}`)
      }

      this.endDrag()
    },

    handleMouseLeave() {
      this.endDrag()
    },

    endDrag() {
      this.isDragging = false
      this.draggingElement = null
      this.draggingType = null
      this.initialDragPosition = null

      this.$refs.container.style.cursor = 'grab'
      document.body.style.userSelect = ''
    },

    // Relationship Methods
    getRelationshipMarker(type) {
      const markers = {
        include: 'url(#include-arrow-final)',
        extend: 'url(#extend-arrow-final)',
        generalization: 'url(#generalization-arrow-final)',
      }
      return markers[type] || 'url(#association-arrow-final)'
    },

    getRelationshipLabel(type) {
      const labels = { include: '«include»', extend: '«extend»', generalization: '«inherits»' }
      return labels[type] || ''
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

    calculateAssociationPath(association) {
      const { actor, usecase } = association
      const dx = usecase.x - actor.x
      const dy = usecase.y - actor.y
      const length = Math.sqrt(dx * dx + dy * dy)
      if (length === 0) return ''

      const nx = dx / length
      const ny = dy / length
      const actorOffset = this.calculateActorOffset(actor, nx, ny)
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

    calculateActorOffset(actor, nx, ny) {
      return 25
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
      else return this.calculateActorOffset(element, nx, ny)
    },

    // Viewport Methods
    startPan(event) {
      if (this.previewMode || !this.editable || this.isDragging) return
      this.isPanning = true
      this.panStart = { x: event.clientX - this.viewport.x, y: event.clientY - this.viewport.y }
      this.$refs.container.style.cursor = 'grabbing'
    },

    handlePan(event) {
      if (!this.isPanning) return
      this.viewport.x = event.clientX - this.panStart.x
      this.viewport.y = event.clientY - this.panStart.y
    },

    endPan() {
      this.isPanning = false
      this.$refs.container.style.cursor = 'grab'
    },

    handleWheel(event) {
      event.preventDefault()
      if (event.ctrlKey) {
        const zoomIntensity = 0.1
        const wheel = event.deltaY < 0 ? 1 : -1
        const zoom = Math.exp(wheel * zoomIntensity)

        const rect = this.$refs.container.getBoundingClientRect()
        const mouseX = event.clientX - rect.left
        const mouseY = event.clientY - rect.top

        const worldX = (mouseX - this.viewport.x) / this.internalZoom
        const worldY = (mouseY - this.viewport.y) / this.internalZoom

        this.internalZoom = Math.max(0.1, Math.min(5, this.internalZoom * zoom))
        this.$emit('zoom-changed', this.internalZoom)

        this.viewport.x = mouseX - worldX * this.internalZoom
        this.viewport.y = mouseY - worldY * this.internalZoom
      } else {
        this.viewport.x -= event.deltaX * 0.5
        this.viewport.y -= event.deltaY * 0.5
      }
    },

    // Zoom and View Methods
    zoomIn() {
      this.internalZoom = Math.min(5, this.internalZoom + 0.1)
      this.$emit('zoom-changed', this.internalZoom)
    },

    zoomOut() {
      this.internalZoom = Math.max(0.1, this.internalZoom - 0.1)
      this.$emit('zoom-changed', this.internalZoom)
    },

    resetZoom() {
      this.internalZoom = 1
      this.centerViewport()
      this.$emit('zoom-changed', this.internalZoom)
    },

    fitToViewport() {
      const allElements = [...this.computedActors, ...this.computedUsecases]
      if (allElements.length === 0) return

      const bounds = allElements.reduce(
        (acc, element) => ({
          minX: Math.min(acc.minX, element.x - (element.width || 60)),
          maxX: Math.max(acc.maxX, element.x + (element.width || 60)),
          minY: Math.min(acc.minY, element.y - (element.height || 60)),
          maxY: Math.max(acc.maxY, element.y + (element.height || 60)),
        }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
      )

      const contentWidth = bounds.maxX - bounds.minX + 200
      const contentHeight = bounds.maxY - bounds.minY + 200

      const scaleX = this.containerWidth / contentWidth
      const scaleY = this.containerHeight / contentHeight

      this.internalZoom = Math.min(scaleX, scaleY, 1)
      this.viewport.x = -bounds.minX * this.internalZoom + 100
      this.viewport.y = -bounds.minY * this.internalZoom + 100
      this.$emit('zoom-changed', this.internalZoom)
    },

    // Selection Methods
    selectElement(element, type) {
      if (this.isDragging) return
      this.selectedElement = element
      this.selectedElementType = type
      this.$emit('element-selected', { element, type })
    },

    handleSvgClick(event) {
      if (event.target.tagName === 'svg') {
        this.selectedElement = null
        this.selectedElementType = null
        this.$emit('element-selected', null)
      }
    },

    clearSelection() {
      this.selectedElement = null
      this.selectedElementType = null
    },

    // History Methods
    saveToHistory(action = 'Position change') {
      const currentData = JSON.parse(
        JSON.stringify({
          actors: this.safeDiagramData.actors.map((actor) => {
            const computedActor = this.computedActors.find(
              (a) => a.id === this.normalizeId(actor._id) || a.id === this.normalizeId(actor.id)
            )
            return {
              ...actor,
              position: {
                x: computedActor?.x || actor.position?.x || 0,
                y: computedActor?.y || actor.position?.y || 0,
              },
            }
          }),
          usecases: this.safeDiagramData.usecases.map((uc) => {
            const computedUc = this.computedUsecases.find(
              (u) => u.id === this.normalizeId(uc._id) || u.id === this.normalizeId(uc.id)
            )
            return {
              ...uc,
              position: {
                x: computedUc?.x || uc.position?.x || 0,
                y: computedUc?.y || uc.position?.y || 0,
              },
            }
          }),
        })
      )

      const snapshot = {
        timestamp: Date.now(),
        action,
        data: currentData,
      }

      if (this.history.length === 0) {
        this.history.push(snapshot)
        this.currentHistoryIndex = 0
      } else {
        if (this.currentHistoryIndex < this.history.length - 1) {
          this.history = this.history.slice(0, this.currentHistoryIndex + 1)
        }

        this.history.push(snapshot)

        if (this.history.length > this.maxHistoryLength) {
          this.history.shift()
        } else {
          this.currentHistoryIndex = this.history.length - 1
        }
      }
    },

    undo() {
      if (this.canUndo && this.currentHistoryIndex > 0) {
        this.currentHistoryIndex--
        const snapshot = this.history[this.currentHistoryIndex]
        this.restoreFromSnapshot(snapshot)

        // Kích hoạt auto save
        this.showSavingIndicator()
        this.$emit('position-updated', {
          action: 'undo',
          snapshot: snapshot,
        })
      }
    },

    redo() {
      if (this.canRedo && this.currentHistoryIndex < this.history.length - 1) {
        this.currentHistoryIndex++
        const snapshot = this.history[this.currentHistoryIndex]
        this.restoreFromSnapshot(snapshot)

        // Kích hoạt auto save
        this.showSavingIndicator()
        this.$emit('position-updated', {
          action: 'redo',
          snapshot: snapshot,
        })
      }
    },

    restoreFromSnapshot(snapshot) {
      this.isRestoringFromHistory = true

      if (snapshot.data && snapshot.data.actors) {
        snapshot.data.actors.forEach((actor) => {
          const existingActor = this.computedActors.find(
            (a) =>
              a.id === this.normalizeId(actor._id) ||
              a.id === this.normalizeId(actor.id) ||
              a.id === actor.id
          )
          if (existingActor && actor.position) {
            existingActor.x = actor.position.x
            existingActor.y = actor.position.y

            if (existingActor._originalData) {
              existingActor._originalData.position = { ...actor.position }
            }
          }
        })
      }

      if (snapshot.data && snapshot.data.usecases) {
        snapshot.data.usecases.forEach((uc) => {
          const existingUc = this.computedUsecases.find(
            (u) =>
              u.id === this.normalizeId(uc._id) ||
              u.id === this.normalizeId(uc.id) ||
              u.id === uc.id
          )
          if (existingUc && uc.position) {
            existingUc.x = uc.position.x
            existingUc.y = uc.position.y

            if (existingUc._originalData) {
              existingUc._originalData.position = { ...uc.position }
            }
          }
        })
      }

      this.clearSelection()
      this.endDrag()
    },

    // Preview Generation Methods
    async generatePreviewImage() {
      return new Promise((resolve) => {
        setTimeout(async () => {
          try {
            console.log('🖼️ UCDRenderer: Starting preview generation...')
            const allElements = [...this.computedActors, ...this.computedUsecases]
            console.log('🖼️ UCDRenderer: Elements count:', allElements.length)
            if (allElements.length === 0) {
              console.log('🖼️ UCDRenderer: No elements, returning null')
              resolve(null)
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

            const padding = 80
            const contentWidth = Math.max(bounds.maxX - bounds.minX + padding * 2, 400)
            const contentHeight = Math.max(bounds.maxY - bounds.minY + padding * 2, 300)

            const svgString = this.generateExportSVG(bounds, padding, contentWidth, contentHeight)
            const svgData = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`

            const img = new Image()
            img.onload = () => {
              const canvas = document.createElement('canvas')
              const ctx = canvas.getContext('2d')
              const scale = 1

              canvas.width = contentWidth * scale
              canvas.height = contentHeight * scale
              ctx.scale(scale, scale)

              ctx.fillStyle = 'white'
              ctx.fillRect(0, 0, contentWidth, contentHeight)

              ctx.drawImage(img, 0, 0, contentWidth, contentHeight)

              const base64 = canvas.toDataURL('image/png', 0.8)
              console.log('🖼️ UCDRenderer: Preview generation completed successfully')
              resolve(base64)
            }
            img.onerror = () => resolve(null)
            img.src = svgData
          } catch (error) {
            console.error('Error generating preview image:', error)
            resolve(null)
          }
        }, 100)
      })
    },

    regeneratePreview() {
      this.previewGenerated = false
      if (this.autoGeneratePreview) {
        this.generatePreviewImage().then((previewData) => {
          if (previewData) {
            this.$emit('preview-generated', previewData)
            this.previewGenerated = true
          }
        })
      }
    },

    generateExportSVG(bounds, padding, contentWidth, contentHeight) {
      const viewBox = `${bounds.minX - padding} ${
        bounds.minY - padding
      } ${contentWidth} ${contentHeight}`

      return `
<svg xmlns="http://www.w3.org/2000/svg" width="${contentWidth}" height="${contentHeight}" viewBox="${viewBox}">
  <defs>
    <marker id="association-arrow-preview" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#374151" />
    </marker>
    <marker id="include-arrow-preview" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
    </marker>
    <marker id="extend-arrow-preview" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#8b5cf6" />
    </marker>
    <marker id="generalization-arrow-preview" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 L 2.5 5 z" fill="#10b981" stroke="#10b981" stroke-width="1" />
    </marker>
  </defs>

  <!-- Background trắng -->
  <rect x="${bounds.minX - padding}" y="${bounds.minY - padding}" 
        width="${contentWidth}" height="${contentHeight}" fill="white" />

  <!-- Render Associations -->
  ${this.computedAssociations
    .map((assoc) => {
      const path = this.calculateAssociationPath(assoc)
      return `<path d="${path}" stroke="#374151" stroke-width="1.5" fill="none" marker-end="url(#association-arrow-preview)" />`
    })
    .join('')}

  <!-- Render Relationships -->
  ${this.computedRelationships
    .map((rel) => {
      const path = this.calculateRelationshipPath(rel)
      const marker = this.getRelationshipMarker(rel.type).replace('final', 'preview')
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
  ${this.computedUsecases
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
  ${this.computedActors
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

    getRelationshipColor(type) {
      const colors = {
        include: '#3b82f6',
        extend: '#8b5cf6',
        generalization: '#10b981',
        association: '#374151',
      }
      return colors[type] || '#374151'
    },

    // Export Methods
    async exportAsPNG() {
      try {
        this.isExporting = true

        const allElements = [...this.computedActors, ...this.computedUsecases]
        if (allElements.length === 0) {
          alert('No content to export!')
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

        const svgString = this.generateExportSVG(bounds, padding, contentWidth, contentHeight)
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
                  a.download = `use-case-diagram-${new Date().getTime()}.png`
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
        console.error('Error exporting PNG:', err)
        alert('Error exporting PNG: ' + err.message)
      } finally {
        this.isExporting = false
      }
    },

    exportAsSVG() {
      const allElements = [...this.computedActors, ...this.computedUsecases]
      if (allElements.length === 0) {
        alert('No content to export!')
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

      const svgContent = this.generateExportSVG(bounds, padding, contentWidth, contentHeight)
      const blob = new Blob([svgContent], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `use-case-diagram-${new Date().getTime()}.svg`
      a.click()
      URL.revokeObjectURL(url)
    },

    // Fullscreen Methods
    toggleFullscreen() {
      if (!this.isFullscreen) this.enterFullscreen()
      else this.exitFullscreen()
    },

    enterFullscreen() {
      const element = this.$el
      if (element.requestFullscreen) element.requestFullscreen()
      else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen()
      else if (element.msRequestFullscreen) element.msRequestFullscreen()
    },

    exitFullscreen() {
      if (document.exitFullscreen) document.exitFullscreen()
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
      else if (document.msExitFullscreen) document.msExitFullscreen()
    },

    setupFullscreenListener() {
      document.addEventListener('fullscreenchange', this.handleFullscreenChange)
      document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange)
      document.addEventListener('msfullscreenchange', this.handleFullscreenChange)
    },

    cleanupFullscreenListener() {
      document.removeEventListener('fullscreenchange', this.handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange)
      document.removeEventListener('msfullscreenchange', this.handleFullscreenChange)
    },

    handleFullscreenChange() {
      this.isFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      )
    },

    // Utility Methods
    normalizeId(id) {
      if (!id) return null
      if (typeof id === 'object' && id.$oid) return id.$oid
      if (typeof id === 'string') return id
      if (typeof id === 'object') return String(id)
      return String(id)
    },

    setupEventListeners() {
      document.addEventListener('mousemove', this.handleMouseMove)
      document.addEventListener('mouseup', this.handleMouseUp)
    },

    removeEventListeners() {
      document.removeEventListener('mousemove', this.handleMouseMove)
      document.removeEventListener('mouseup', this.handleMouseUp)
    },

    setupKeyboardShortcuts() {
      document.addEventListener('keydown', (event) => {
        if (event.ctrlKey || event.metaKey) {
          switch (event.key) {
            case '=':
            case '+':
              event.preventDefault()
              this.zoomIn()
              break
            case '-':
              event.preventDefault()
              this.zoomOut()
              break
            case '0':
              event.preventDefault()
              this.resetZoom()
              break
            case 'f':
              event.preventDefault()
              this.fitToViewport()
              break
            case 'z':
              event.preventDefault()
              if (!event.shiftKey) this.undo()
              break
            case 'y':
              event.preventDefault()
              this.redo()
              break
          }
        }
        if (event.key === 'F11') {
          event.preventDefault()
          this.toggleFullscreen()
        }
        switch (event.key) {
          case 'Escape':
            this.clearSelection()
            if (this.isFullscreen) this.exitFullscreen()
            break
        }
      })
    },
  },
}
</script>

<style scoped>
.ucd-renderer-final {
  display: flex;
  height: 100%;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.ucd-renderer-final.preview-mode {
  border: 1px solid #e5e7eb;
}

.ucd-renderer-final.editable-mode {
  border: 2px dashed #d1d5db;
}

.ucd-renderer-final.fullscreen-mode {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  border-radius: 0;
}

.ucd-renderer-final.hidden-renderer {
  opacity: 0;
  pointer-events: none;
  position: absolute;
  width: 100%;
  height: 100%;
}

/* Toolbar */
.toolbar-final {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #e5e7eb;
  z-index: 100;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.toolbar-btn:hover:not(:disabled) {
  background: #3b82f6;
  color: white;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zoom-display {
  min-width: 48px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

/* Main Container */
.ucd-container-final {
  flex: 1;
  overflow: hidden;
  background: #f8fafc;
  position: relative;
  cursor: grab;
}

.ucd-container-final:active {
  cursor: grabbing;
}

.ucd-svg-final {
  display: block;
  transition: transform 0.1s ease;
}

/* Status Bar */
.status-bar-final {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-top: 1px solid #e5e7eb;
  font-size: 12px;
  color: #6b7280;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-item.spacer {
  flex: 1;
}

/* SVG Element Styles */
.actor-group,
.usecase-group {
  cursor: pointer;
  transition: all 0.2s ease;
}

.actor-group.draggable,
.usecase-group.draggable {
  cursor: grab;
}

.actor-group.draggable:active,
.usecase-group.draggable:active {
  cursor: grabbing;
}

.actor-head {
  fill: white;
  stroke: #1f2937;
  stroke-width: 2;
}

.actor-body,
.actor-arms,
.actor-legs {
  stroke: #1f2937;
  stroke-width: 2;
}

.actor-name {
  font-size: 11px;
  font-weight: 500;
  color: #374151;
  text-align: center;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.usecase-node {
  fill: white;
  stroke: #3b82f6;
  stroke-width: 2;
}

.usecase-title {
  font-size: 10px;
  font-weight: 500;
  color: #1e40af;
  text-align: center;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  line-height: 1.2;
}

/* Relationship Styles */
.association-line {
  stroke: #374151;
  stroke-width: 1.5;
  fill: none;
}

.relationship-line {
  stroke-width: 1.5;
  fill: none;
}

.relationship-include {
  stroke: #3b82f6;
}

.relationship-extend {
  stroke: #8b5cf6;
  stroke-dasharray: 5, 3;
}

.relationship-generalization {
  stroke: #10b981;
}

.relationship-label-container {
  pointer-events: none;
}

.label-background {
  fill: white;
  stroke: #e5e7eb;
  stroke-width: 1;
}

.relationship-label {
  font-size: 9px;
  font-weight: 500;
  fill: #374151;
  pointer-events: none;
}

/* Canvas Boundary */
.canvas-boundary {
  pointer-events: none;
}

/* Selection and Drag Styles */
.selection-highlight-final {
  fill: none;
  stroke: #f59e0b;
  stroke-width: 2;
  stroke-dasharray: 4, 4;
  pointer-events: none;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

.actor-group.selected .actor-head,
.actor-group.selected .actor-body,
.actor-group.selected .actor-arms,
.actor-group.selected .actor-legs {
  stroke: #f59e0b;
  stroke-width: 2.5;
}

.usecase-group.selected .usecase-node {
  stroke: #f59e0b;
  stroke-width: 3;
}

.drag-preview-element {
  opacity: 0.7;
  stroke: #6b7280;
  stroke-dasharray: 4, 4;
  fill: none;
}

.drag-preview .actor-head {
  fill: rgba(255, 255, 255, 0.7);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .toolbar-final {
    flex-direction: column;
    gap: 8px;
    padding: 8px;
  }

  .toolbar-left {
    width: 100%;
    justify-content: center;
  }

  .status-bar-final {
    flex-wrap: wrap;
    gap: 8px;
  }

  .toolbar-btn {
    font-size: 11px;
    padding: 4px 8px;
  }
}

/* Fullscreen specific styles */
:fullscreen .ucd-renderer-final,
:-webkit-full-screen .ucd-renderer-final,
:-moz-full-screen .ucd-renderer-final,
:-ms-fullscreen .ucd-renderer-final {
  border-radius: 0;
}
/* Auto Save Status Styles */
.auto-save-status {
  margin-left: auto;
  border: none !important;
  background: transparent !important;
}

.save-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
  min-width: 120px;
}

.save-indicator .icon {
  font-size: 16px;
  transition: all 0.3s ease;
}

/* Saving State */
.save-indicator.saving {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}

.save-indicator.saving .icon {
  animation: spin 1s linear infinite;
  color: #f59e0b;
}

/* Saved State */
.save-indicator.saved {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.save-indicator.saved .icon {
  color: #10b981;
}

/* Default State */
.save-indicator:not(.saving):not(.saved) {
  color: #6b7280;
}

.save-text {
  font-weight: 600;
}

.save-time {
  font-size: 11px;
  opacity: 0.8;
  margin-left: 4px;
}

/* Spin Animation */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Pulse Animation for New Changes */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.save-indicator.saving {
  animation: pulse 1.5s ease-in-out infinite;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .auto-save-status {
    display: none; /* Ẩn trên mobile để tiết kiệm không gian */
  }
}
</style>