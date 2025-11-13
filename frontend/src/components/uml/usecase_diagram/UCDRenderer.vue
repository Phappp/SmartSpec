<template>
  <div
    class="ucd-renderer-final"
    :class="{
      'preview-mode': previewMode,
      'editable-mode': editable,
      'fullscreen-mode': isFullscreen,
    }"
  >
    <!-- Toolbar -->
    <div v-if="!previewMode && editable" class="toolbar-final">
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

        <!-- Auto Save Indicator -->
        <div class="toolbar-group" v-if="showAutoSave">
          <div class="auto-save-indicator" :class="{ saving: isSaving }">
            <span class="material-symbols-outlined blink">{{
              isSaving ? 'sync' : 'check_circle'
            }}</span>
            {{ isSaving ? 'Saving...' : 'Saved' }}
          </div>
        </div>
        <div class="toolbar-group">
          <!-- <button class="toolbar-btn" @click="exportAsSVG" title="Export as SVG">
            <span class="material-symbols-outlined">download</span>
            SVG
          </button> -->
          <button class="toolbar-btn" @click="exportAsPNG" title="Export as PNG">
            <span class="material-symbols-outlined">image</span>
            PNG
          </button>
        </div>
        <div class="toolbar-group">
          <div class="canvas-info">
            Canvas: {{ Math.round(virtualSpace.width) }} × {{ Math.round(virtualSpace.height) }}
          </div>
        </div>
      </div>
    </div>

    <div class="toolbar-right">
      <!-- Canvas Info -->
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
      <!-- SVG Container với virtual space -->
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

        <!-- Background Grid với virtual space -->
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

        <!-- Render Relationships với labels tích hợp -->
        <g class="relationships-layer">
          <g v-for="rel in computedRelationships" :key="`rel-${rel.id}`" class="relationship-group">
            <!-- Đường relationship -->
            <path
              :d="calculateRelationshipPath(rel)"
              :class="`relationship-line relationship-${rel.type}`"
              :marker-end="getRelationshipMarker(rel.type)"
            />

            <!-- Label tích hợp trực tiếp trên đường -->
            <g v-if="rel.type !== 'association'" class="relationship-label-container">
              <!-- Background cho label -->
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
              <!-- Text label -->
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

        <!-- Expansion Indicator -->
        <g v-if="isExpanding" class="expansion-indicator">
          <text
            :x="virtualSpace.minX + 20"
            :y="virtualSpace.minY + 30"
            class="expansion-text"
            fill="#6b7280"
            font-size="12"
          >
            Expanding Canvas...
          </text>
        </g>
      </svg>
    </div>

    <!-- Status Bar -->
    <div v-if="!previewMode" class="status-bar-final">
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
      <div class="status-item relationship-types">
        <span class="relationship-preview include">⟶ «include»</span>
        <span class="relationship-preview extend">⟶ «extend»</span>
        <span class="relationship-preview generalization">⟷ «inherits»</span>
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
    autoFit: {
      type: Boolean,
      default: false,
    },
    containerWidth: {
      type: Number,
      default: 1200,
    },
    containerHeight: {
      type: Number,
      default: 800,
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
    autoSaveDelay: {
      type: Number,
      default: 2000,
    },
    showAutoSave: {
      type: Boolean,
      default: true,
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
      viewport: {
        x: 0,
        y: 0,
      },
      lastMousePosition: { x: 0, y: 0 },
      isPanning: false,
      panStart: { x: 0, y: 0 },
      isFullscreen: false,

      // Virtual Space for Infinite Canvas
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

      // Auto expansion
      isExpanding: false,
      expansionThreshold: 100, // Khoảng cách từ biên để bắt đầu mở rộng
      expansionAmount: 500, // Số pixel mở rộng mỗi lần

      // Auto save
      isSaving: false,
      autoSaveTimeout: null,
      hasUnsavedChanges: false,

      // Undo/Redo system
      history: [],
      currentHistoryIndex: -1,
      maxHistoryLength: 50,
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
      return this.currentHistoryIndex > 0
    },
    canRedo() {
      return this.currentHistoryIndex < this.history.length - 1
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

      if (!relationships || relationships.length === 0) {
        return []
      }

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
      handler() {
        if (this.autoFit && this.previewMode) {
          this.$nextTick(() => {
            this.fitToViewportForPreview()
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
    hasUnsavedChanges: {
      handler(hasChanges) {
        if (hasChanges && this.editable) {
          this.scheduleAutoSave()
        }
      },
    },
  },
  mounted() {
    if (this.autoFit && this.previewMode) {
      this.$nextTick(() => {
        this.fitToViewportForPreview()
      })
    }
    this.setupEventListeners()
    this.setupKeyboardShortcuts()
    this.setupFullscreenListener()

    // Initialize viewport to center of virtual space
    this.centerViewport()
  },
  beforeUnmount() {
    this.removeEventListeners()
    this.cleanupAutoSave()
    this.cleanupFullscreenListener()
  },
  methods: {
    // Virtual Space Management
    centerViewport() {
      const centerX = this.containerWidth / 2 - this.virtualSpace.centerX * this.internalZoom
      const centerY = this.containerHeight / 2 - this.virtualSpace.centerY * this.internalZoom
      this.viewport.x = centerX
      this.viewport.y = centerY
    },

    expandVirtualSpace(x, y) {
      let expanded = false

      // Kiểm tra và mở rộng các hướng
      if (x < this.virtualSpace.minX + this.expansionThreshold) {
        this.virtualSpace.minX -= this.expansionAmount
        expanded = true
      }
      if (x > this.virtualSpace.maxX - this.expansionThreshold) {
        this.virtualSpace.maxX += this.expansionAmount
        expanded = true
      }
      if (y < this.virtualSpace.minY + this.expansionThreshold) {
        this.virtualSpace.minY -= this.expansionAmount
        expanded = true
      }
      if (y > this.virtualSpace.maxY - this.expansionThreshold) {
        this.virtualSpace.maxY += this.expansionAmount
        expanded = true
      }

      if (expanded) {
        this.isExpanding = true
        this.$emit('canvas-expanded', {
          virtualSpace: { ...this.virtualSpace },
          width: this.virtualSpace.width,
          height: this.virtualSpace.height,
        })

        // Ẩn indicator sau 1 giây
        setTimeout(() => {
          this.isExpanding = false
        }, 1000)
      }

      return expanded
    },

    // Relationship visualization
    getRelationshipMarker(type) {
      const markers = {
        include: 'url(#include-arrow-final)',
        extend: 'url(#extend-arrow-final)',
        generalization: 'url(#generalization-arrow-final)',
      }
      return markers[type] || 'url(#association-arrow-final)'
    },

    fitToViewportForPreview() {
      const allElements = [...this.computedActors, ...this.computedUsecases]
      if (allElements.length === 0) {
        this.internalZoom = 0.8
        this.viewport.x = 0
        this.viewport.y = 0
        return
      }

      // Tính toán bounding box
      const bounds = allElements.reduce(
        (acc, element) => ({
          minX: Math.min(acc.minX, element.x - (element.width || 60) / 2),
          maxX: Math.max(acc.maxX, element.x + (element.width || 60) / 2),
          minY: Math.min(acc.minY, element.y - (element.height || 60) / 2),
          maxY: Math.max(acc.maxY, element.y + (element.height || 60) / 2),
        }),
        {
          minX: Infinity,
          maxX: -Infinity,
          minY: Infinity,
          maxY: -Infinity,
        }
      )

      // Tính độ bao phủ (coverage)
      const coverageWidth = bounds.maxX - bounds.minX
      const coverageHeight = bounds.maxY - bounds.minY
      const coverageArea = coverageWidth * coverageHeight

      console.log('Coverage analysis:', {
        coverageWidth,
        coverageHeight,
        coverageArea,
        bounds,
      })

      // 🔥 GỌI HÀM MỚI: Tính toán parameters theo từng mức coverage
      const params = this.calculateParametersByCoverageLevel(
        coverageArea,
        coverageWidth,
        coverageHeight
      )

      const padding = params.padding
      const contentWidth = Math.max(coverageWidth + padding * 2, 200)
      const contentHeight = Math.max(coverageHeight + padding * 2, 150)

      // Áp dụng zoom từ hàm tính toán
      this.internalZoom = params.zoom

      // Tính toán viewport
      const scaledContentWidth = contentWidth * this.internalZoom
      const scaledContentHeight = contentHeight * this.internalZoom

      // Áp dụng độ dịch chuyển từ hàm tính toán
      this.viewport.x = (this.containerWidth - scaledContentWidth) / 2 - params.leftShift
      this.viewport.y = (this.containerHeight - scaledContentHeight) / 2 - params.topShift

      // Điều chỉnh virtual space
      this.virtualSpace.minX = bounds.minX - padding
      this.virtualSpace.maxX = bounds.maxX + padding
      this.virtualSpace.minY = bounds.minY - padding
      this.virtualSpace.maxY = bounds.maxY + padding

      console.log('Preview fit with level-based parameters:', {
        coverage: { width: coverageWidth, height: coverageHeight, area: coverageArea },
        level: params.level,
        padding: params.padding,
        zoom: params.zoom,
        viewport: { x: this.viewport.x, y: this.viewport.y },
        shifts: { left: params.leftShift, top: params.topShift },
      })
    },

    // 🔥 HÀM MỚI: Tính toán parameters theo từng mức coverage
    calculateParametersByCoverageLevel(coverageArea, coverageWidth, coverageHeight) {
      let padding, zoom, leftShift, topShift, level

      // Phân loại thành 10 khoảng đều từ 0 đến 40000
      if (coverageArea < 100000) {
        // Khoảng 1: 0-4000
        level = 'LEVEL_1'
        padding = 120
        zoom = 0.25
        leftShift = 750
        topShift = 350
      } else if (coverageArea < 150000) {
        // Khoảng 2: 4000-8000
        level = 'LEVEL_2'
        padding = 100
        zoom = 0.245
        leftShift = 550
        topShift = 340
      } else if (coverageArea < 200000) {
        // Khoảng 3: 8000-12000
        level = 'LEVEL_3'
        padding = 90
        zoom = 0.24
        leftShift =600
        topShift = 335
      } else if (coverageArea < 250000) {
        // Khoảng 4: 12000-16000
        level = 'LEVEL_4'
        padding = 80
        zoom = 0.235
        leftShift = 620
        topShift = 330
      } else if (coverageArea < 300000) {
        // Khoảng 5: 16000-20000
        level = 'LEVEL_5'
        padding = 70
        zoom = 0.23
        leftShift = 600
        topShift = 320
      } else if (coverageArea < 400000) {
        // Khoảng 6: 20000-24000
        level = 'LEVEL_6'
        padding = 60
        zoom = 0.225
        leftShift = 550
        topShift = 310
      } else if (coverageArea < 500000) {
        // Khoảng 7: 24000-28000
        level = 'LEVEL_7'
        padding = 50
        zoom = 0.22
        leftShift = 520
        topShift = 300
      } else if (coverageArea < 1000000) {
        // Khoảng 8: 28000-32000
        level = 'LEVEL_8'
        padding = 40
        zoom = 0.215
        leftShift = 500
        topShift = 290
      } else if (coverageArea < 1500000) {
        // Khoảng 9: 32000-36000
        level = 'LEVEL_9'
        padding = 35
        zoom = 0.21
        leftShift = 485
        topShift = 280
      } else if (coverageArea < 2000000) {
        // Khoảng 10: 36000-40000
        level = 'LEVEL_10'
        padding = 30
        zoom = 0.205
        leftShift = 470
        topShift = 270
      } else if (coverageArea < 2500000) {
        // Khoảng 10: 36000-40000
        level = 'LEVEL_11'
        padding = 30
        zoom = 0.2
        leftShift = 450
        topShift = 260
      } else {
        // Trên 40000
        level = 'MAXIMUM'
        padding = 25
        zoom = 0.195
        leftShift = 420
        topShift = 245
      }

      // 🔥 ĐIỀU CHỈNH THÊM THEO TỶ LỆ CHIỀU RỘNG/CAO
      const aspectRatio = coverageWidth / coverageHeight

      if (aspectRatio > 2.5) {
        // Diagram rất ngang → giảm dịch trái nhiều, tăng zoom
        leftShift *= 0.5
        zoom *= 1.2
        level += '_EXTRA_WIDE'
      } else if (aspectRatio > 2) {
        // Diagram ngang → giảm dịch trái, tăng zoom
        leftShift *= 0.7
        zoom *= 1.1
        level += '_WIDE'
      } else if (aspectRatio < 0.4) {
        // Diagram rất dọc → giảm dịch lên nhiều, tăng zoom
        topShift *= 0.5
        zoom *= 1.2
        level += '_EXTRA_TALL'
      } else if (aspectRatio < 0.5) {
        // Diagram dọc → giảm dịch lên, tăng zoom
        topShift *= 0.7
        zoom *= 1.1
        level += '_TALL'
      }

      // 🔥 ĐIỀU CHỈNH CUỐI CÙNG: Đảm bảo giá trị hợp lý
      padding = Math.max(padding, 20)
      zoom = Math.max(zoom, 0.1)
      leftShift = Math.max(leftShift, 20)
      topShift = Math.max(topShift, 20)

      console.log('📊 Coverage Level Analysis (10 levels):', {
        level,
        coverageArea: `${coverageArea.toLocaleString()} (${((coverageArea / 40000) * 100).toFixed(
          1
        )}% of max)`,
        coverageWidth: Math.round(coverageWidth),
        coverageHeight: Math.round(coverageHeight),
        aspectRatio: aspectRatio.toFixed(2),
        parameters: {
          padding: `${padding}px`,
          zoom: `${(zoom * 100).toFixed(1)}%`,
          leftShift: `${Math.round(leftShift)}px`,
          topShift: `${Math.round(topShift)}px`,
        },
      })

      return {
        level,
        padding,
        zoom,
        leftShift,
        topShift,
      }
    },

    getRelationshipLabel(type) {
      const labels = {
        include: '«include»',
        extend: '«extend»',
        generalization: '«inherits»',
      }
      return labels[type] || ''
    },

    getRelationshipLabelPosition(relationship) {
      const { source, target } = relationship
      const midX = (source.x + target.x) / 2
      const midY = (source.y + target.y) / 2

      // Offset the label for better visibility
      const dx = target.x - source.x
      const dy = target.y - source.y
      const length = Math.sqrt(dx * dx + dy * dy)
      const offset = Math.min(30, length * 0.2)

      const perpendicularX = (-dy / length) * offset
      const perpendicularY = (dx / length) * offset

      return {
        x: midX + perpendicularX,
        y: midY + perpendicularY,
      }
    },

    calculateAssociationPath(association) {
      const { actor, usecase } = association

      // Tính toán vector hướng từ actor đến usecase
      const dx = usecase.x - actor.x
      const dy = usecase.y - actor.y
      const length = Math.sqrt(dx * dx + dy * dy)

      if (length === 0) return ''

      // Vector đơn vị hướng
      const nx = dx / length
      const ny = dy / length

      // Tính toán offset dựa trên kích thước phần tử
      const actorOffset = this.calculateActorOffset(actor, nx, ny)
      const usecaseOffset = this.calculateUsecaseOffset(usecase, -nx, -ny)

      // Điểm bắt đầu và kết thúc
      const startX = actor.x + nx * actorOffset
      const startY = actor.y + ny * actorOffset
      const endX = usecase.x - nx * usecaseOffset
      const endY = usecase.y - ny * usecaseOffset

      // Sử dụng đường thẳng thay vì đường cong
      return `M ${startX} ${startY} L ${endX} ${endY}`
    },

    calculateRelationshipPath(relationship) {
      const { source, target } = relationship

      if (source.id === target.id) {
        // Self-relationship - draw a loop
        return `M ${source.x} ${source.y} 
                C ${source.x + 50} ${source.y - 50} 
                  ${source.x + 50} ${source.y - 50} 
                  ${source.x} ${source.y}`
      }

      // Tính toán vector hướng từ source đến target
      const dx = target.x - source.x
      const dy = target.y - source.y
      const length = Math.sqrt(dx * dx + dy * dy)

      if (length === 0) return ''

      // Vector đơn vị hướng
      const nx = dx / length
      const ny = dy / length

      // Tính toán offset dựa trên loại phần tử
      const sourceOffset = this.getElementOffset(source, nx, ny)
      const targetOffset = this.getElementOffset(target, -nx, -ny)

      // Điểm bắt đầu và kết thúc
      const startX = source.x + nx * sourceOffset
      const startY = source.y + ny * sourceOffset
      const endX = target.x - nx * targetOffset
      const endY = target.y - ny * targetOffset

      // Sử dụng đường thẳng thay vì đường cong
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
      if (element.width && element.height) {
        return this.calculateUsecaseOffset(element, nx, ny)
      } else {
        return this.calculateActorOffset(element, nx, ny)
      }
    },

    // Panning functionality
    startPan(event) {
      if (this.previewMode || !this.editable || this.isDragging) return

      this.isPanning = true
      this.panStart = {
        x: event.clientX - this.viewport.x,
        y: event.clientY - this.viewport.y,
      }
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

    // Zoom functionality
    handleWheel(event) {
      event.preventDefault()

      if (event.ctrlKey) {
        // Zoom with Ctrl+Scroll
        const zoomIntensity = 0.1
        const wheel = event.deltaY < 0 ? 1 : -1
        const zoom = Math.exp(wheel * zoomIntensity)

        const rect = this.$refs.container.getBoundingClientRect()
        const mouseX = event.clientX - rect.left
        const mouseY = event.clientY - rect.top

        // Calculate world coordinates before zoom
        const worldX = (mouseX - this.viewport.x) / this.internalZoom
        const worldY = (mouseY - this.viewport.y) / this.internalZoom

        // Apply zoom
        this.internalZoom = Math.max(0.1, Math.min(5, this.internalZoom * zoom))
        this.$emit('zoom-changed', this.internalZoom)

        // Adjust viewport to zoom around mouse position
        this.viewport.x = mouseX - worldX * this.internalZoom
        this.viewport.y = mouseY - worldY * this.internalZoom
      } else {
        // Pan with scroll (without Ctrl)
        this.viewport.x -= event.deltaX * 0.5
        this.viewport.y -= event.deltaY * 0.5
      }
    },

    // Fullscreen functionality
    toggleFullscreen() {
      if (!this.isFullscreen) {
        this.enterFullscreen()
      } else {
        this.exitFullscreen()
      }
    },

    enterFullscreen() {
      const element = this.$el
      if (element.requestFullscreen) {
        element.requestFullscreen()
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen()
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen()
      }
    },

    exitFullscreen() {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen()
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen()
      }
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

    // Zoom Controls
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
          minX: Math.min(acc.minX, element.x - element.width / 2),
          maxX: Math.max(acc.maxX, element.x + element.width / 2),
          minY: Math.min(acc.minY, element.y - element.height / 2),
          maxY: Math.max(acc.maxY, element.y + element.height / 2),
        }),
        {
          minX: Infinity,
          maxX: -Infinity,
          minY: Infinity,
          maxY: -Infinity,
        }
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

    // Drag and drop functionality với virtual space expansion
    startDrag(element, type, event) {
      if (!this.editable || this.previewMode) return

      event.preventDefault()
      event.stopPropagation()

      this.draggingElement = element
      this.draggingType = type

      const rect = this.$refs.container.getBoundingClientRect()

      // 🎯 Sử dụng cùng phương pháp với handleMouseMove
      const point = this.$el.querySelector('.ucd-svg-final').createSVGPoint()
      point.x = event.clientX - rect.left
      point.y = event.clientY - rect.top

      const svgPoint = point.matrixTransform(
        this.$el.querySelector('.ucd-svg-final').getScreenCTM().inverse()
      )

      this.dragOffset = {
        x: svgPoint.x - element.x,
        y: svgPoint.y - element.y,
      }

      this.dragPosition = {
        x: element.x,
        y: element.y,
      }
      this.isDragging = true

      this.selectElement(element, type)
      this.initialDragPosition = { x: element.x, y: element.y }

      // Cursor management
      this.$refs.container.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
    },

    handleMouseMove(event) {
      if (!this.isDragging || !this.draggingElement) return

      const rect = this.$refs.container.getBoundingClientRect()

      // 🎯 QUAN TRỌNG: Tính toán đơn giản hóa, không dùng transform
      // Chỉ sử dụng viewBox của SVG, bỏ qua transform CSS
      const point = this.$el.querySelector('.ucd-svg-final').createSVGPoint()
      point.x = event.clientX - rect.left
      point.y = event.clientY - rect.top

      // Chuyển đổi sang tọa độ SVG world space
      const svgPoint = point.matrixTransform(
        this.$el.querySelector('.ucd-svg-final').getScreenCTM().inverse()
      )

      this.dragPosition = {
        x: svgPoint.x - this.dragOffset.x,
        y: svgPoint.y - this.dragOffset.y,
      }

      // 🎯 Tự động mở rộng virtual space nếu cần
      this.expandVirtualSpace(this.dragPosition.x, this.dragPosition.y)

      // 🎯 Cập nhật phần tử ngay lập tức
      if (this.draggingElement) {
        this.draggingElement.x = this.dragPosition.x
        this.draggingElement.y = this.dragPosition.y

        this.$emit('position-updated', {
          element: this.draggingElement,
          type: this.draggingType,
          position: this.dragPosition,
        })

        this.markUnsavedChanges()
      }
    },

    handleMouseUp() {
      if (!this.isDragging || !this.draggingElement) return

      if (
        this.initialDragPosition &&
        (this.initialDragPosition.x !== this.dragPosition.x ||
          this.initialDragPosition.y !== this.dragPosition.y)
      ) {
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
    },

    // Selection
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

    // Auto save functionality
    scheduleAutoSave() {
      this.cleanupAutoSave()
      this.autoSaveTimeout = setTimeout(() => {
        this.performAutoSave()
      }, this.autoSaveDelay)
    },

    performAutoSave() {
      if (!this.hasUnsavedChanges || !this.editable) return

      this.isSaving = true
      setTimeout(() => {
        this.$emit('auto-save', {
          ...this.diagramData,
          virtualSpace: this.virtualSpace,
        })
        this.isSaving = false
        this.hasUnsavedChanges = false
      }, 500)
    },

    cleanupAutoSave() {
      if (this.autoSaveTimeout) {
        clearTimeout(this.autoSaveTimeout)
        this.autoSaveTimeout = null
      }
    },

    markUnsavedChanges() {
      if (this.editable) {
        this.hasUnsavedChanges = true
      }
    },

    // Undo/Redo system
    saveToHistory(action = 'Position change') {
      const snapshot = {
        timestamp: Date.now(),
        action,
        data: JSON.parse(JSON.stringify(this.diagramData)),
        virtualSpace: { ...this.virtualSpace },
        viewport: { ...this.viewport },
        zoom: this.internalZoom,
      }

      if (this.currentHistoryIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.currentHistoryIndex + 1)
      }

      this.history.push(snapshot)

      if (this.history.length > this.maxHistoryLength) {
        this.history.shift()
      } else {
        this.currentHistoryIndex = this.history.length - 1
      }
    },

    undo() {
      if (this.canUndo) {
        this.currentHistoryIndex--
        const snapshot = this.history[this.currentHistoryIndex]
        this.restoreFromSnapshot(snapshot)
      }
    },

    redo() {
      if (this.canRedo) {
        this.currentHistoryIndex++
        const snapshot = this.history[this.currentHistoryIndex]
        this.restoreFromSnapshot(snapshot)
      }
    },

    restoreFromSnapshot(snapshot) {
      this.$emit('history-restored', snapshot.data)
      if (snapshot.virtualSpace) {
        this.virtualSpace = { ...snapshot.virtualSpace }
      }
      if (snapshot.viewport) {
        this.viewport = { ...snapshot.viewport }
      }
      if (snapshot.zoom) {
        this.internalZoom = snapshot.zoom
      }
      this.markUnsavedChanges()
    },

    // Utility methods
    normalizeId(id) {
      if (!id) return null

      if (typeof id === 'object' && id.$oid) {
        return id.$oid
      }

      if (typeof id === 'string') {
        return id
      }

      if (typeof id === 'object') {
        return String(id)
      }

      return String(id)
    },

    // Event listeners
    setupEventListeners() {
      document.addEventListener('mousemove', this.handleMouseMove)
      document.addEventListener('mouseup', this.handleMouseUp)
    },

    removeEventListeners() {
      document.removeEventListener('mousemove', this.handleMouseMove)
      document.removeEventListener('mouseup', this.handleMouseUp)
    },

    // Keyboard shortcuts
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
              this.undo()
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
            if (this.isFullscreen) {
              this.exitFullscreen()
            }
            break
        }
      })
    },

    // Export functionality (đã cập nhật cho virtual space)
    async exportAsPNG() {
      try {
        // Sử dụng virtual space cho export
        const bounds = {
          minX: this.virtualSpace.minX,
          minY: this.virtualSpace.minY,
          maxX: this.virtualSpace.maxX,
          maxY: this.virtualSpace.maxY,
        }

        const contentWidth = this.virtualSpace.width
        const contentHeight = this.virtualSpace.height

        // Tạo SVG string với virtual space
        const svgString = `
          <svg xmlns="http://www.w3.org/2000/svg" 
               width="${contentWidth}" 
               height="${contentHeight}" 
               viewBox="${bounds.minX} ${bounds.minY} ${contentWidth} ${contentHeight}">
            ${this.getExportStyles()}
            ${this.getExportContent()}
          </svg>
        `

        const svgData = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`

        const img = new Image()
        const scale = 2
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        canvas.width = contentWidth * scale
        canvas.height = contentHeight * scale
        ctx.scale(scale, scale)

        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, contentWidth, contentHeight)

        img.crossOrigin = 'anonymous'

        return new Promise((resolve, reject) => {
          img.onload = () => {
            try {
              ctx.drawImage(img, 0, 0, contentWidth, contentHeight)
              canvas.toBlob(
                (blob) => {
                  if (!blob) {
                    reject(new Error('Không thể tạo blob từ canvas'))
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
                0.95
              )
            } catch (error) {
              console.error('Lỗi khi vẽ ảnh:', error)
              reject(error)
            }
          }
          img.onerror = (error) => {
            console.error('Lỗi tải SVG:', error)
            reject(new Error('Không thể tải SVG để xuất ảnh.'))
          }
          img.src = svgData
        })
      } catch (err) {
        console.error('Lỗi khi xuất PNG:', err)
        alert('Có lỗi xảy ra khi xuất ảnh PNG: ' + err.message)
      }
    },

    getExportStyles() {
      return `
        <style>
          * { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-sizing: border-box;
          }
          .actor-head { fill: white; stroke: #1f2937; stroke-width: 2; }
          .actor-body, .actor-arms, .actor-legs { stroke: #1f2937; stroke-width: 2; }
          .actor-name { 
            font-size: 11px; 
            font-weight: 500; 
            color: #374151; 
            text-align: center; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            height: 100%;
            margin: 0;
            padding: 0;
          }
          .usecase-node { fill: white; stroke: #3b82f6; stroke-width: 2; }
          .usecase-title { 
            font-size: 10px; 
            font-weight: 500; 
            color: #1e40af; 
            text-align: center; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            height: 100%;
            margin: 0;
            padding: 0;
            line-height: 1.2;
          }
          .association-line { stroke: #374151; stroke-width: 1.5; fill: none; }
          .relationship-line { stroke-width: 1.5; fill: none; }
          .relationship-include { stroke: #3b82f6; }
          .relationship-extend { stroke: #8b5cf6; stroke-dasharray: 5, 3; }
          .relationship-generalization { stroke: #10b981; }
          .relationship-label { font-size: 9px; font-weight: 500; fill: #374151; }
          .label-background { fill: white; stroke: #e5e7eb; stroke-width: 1; }
          foreignObject { overflow: visible; }
          foreignObject > div { 
            display: flex !important; 
            align-items: center !important; 
            justify-content: center !important; 
            width: 100% !important; 
            height: 100% !important; 
            pointer-events: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        </style>
      `
    },

    getExportContent() {
      // Tạo nội dung SVG cho export (tương tự như render bình thường)
      // Đây là phần simplified, bạn có thể tối ưu thêm
      return `
        <defs>
          <pattern id="grid-pattern-export" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" stroke-width="1" />
          </pattern>
          <!-- Các markers khác -->
        </defs>
        <rect x="${this.virtualSpace.minX}" y="${this.virtualSpace.minY}" 
              width="${this.virtualSpace.width}" height="${this.virtualSpace.height}" 
              fill="url(#grid-pattern-export)" />
        <!-- Render các phần tử -->
      `
    },

    exportAsSVG() {
      const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" 
             width="${this.virtualSpace.width}" 
             height="${this.virtualSpace.height}" 
             viewBox="${this.virtualSpace.minX} ${this.virtualSpace.minY} ${
        this.virtualSpace.width
      } ${this.virtualSpace.height}">
          ${this.getExportStyles()}
          ${this.getExportContent()}
        </svg>
      `

      const blob = new Blob([svgContent], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `use-case-diagram-${new Date().getTime()}.svg`
      a.click()
      URL.revokeObjectURL(url)
    },
  },
}
</script>

<style scoped>
/* Giữ nguyên toàn bộ CSS từ phiên bản trước */
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

.toolbar-left,
.toolbar-right {
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

.canvas-info {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  padding: 4px 8px;
}

/* Auto Save Indicator */
.auto-save-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #059669;
}

.auto-save-indicator.saving {
  color: #d97706;
}

.blink {
  animation: blink 1.5s infinite;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0.3;
  }
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

.relationship-types {
  display: flex;
  align-items: center;
  gap: 12px;
}

.relationship-preview {
  font-size: 11px;
  font-weight: 500;
}

.relationship-preview.include {
  color: #3b82f6;
}

.relationship-preview.extend {
  color: #8b5cf6;
}

.relationship-preview.generalization {
  color: #10b981;
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

/* Expansion Indicator */
.expansion-indicator {
  pointer-events: none;
}

.expansion-text {
  font-size: 12px;
  fill: #6b7280;
  font-style: italic;
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

  .toolbar-left,
  .toolbar-right {
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

  .auto-save-indicator {
    font-size: 11px;
  }

  .relationship-types {
    display: none;
  }
}

/* Fullscreen specific styles */
:fullscreen .ucd-renderer-final,
:-webkit-full-screen .ucd-renderer-final,
:-moz-full-screen .ucd-renderer-final,
:-ms-fullscreen .ucd-renderer-final {
  border-radius: 0;
}
</style>