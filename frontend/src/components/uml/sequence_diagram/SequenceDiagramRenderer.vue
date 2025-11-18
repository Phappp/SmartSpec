<template>
  <div
    class="sequence-diagram-renderer"
    :class="{
      'preview-mode': previewMode,
      'editable-mode': editable,
      'fullscreen-mode': isFullscreen,
      'hidden-renderer': optimizeForPreview,
    }"
  >
    <!-- Toolbar - Ẩn trong preview mode và optimize mode -->
    <div v-if="!previewMode && editable && !optimizeForPreview" class="toolbar">
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
      class="sequence-container"
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
        class="sequence-svg"
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
            id="sequence-grid-pattern"
            x="0"
            y="0"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" stroke-width="1" />
          </pattern>

          <!-- Arrow markers for different message types -->
          <marker
            id="sync-arrow"
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
            id="async-arrow"
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
            id="reply-arrow"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
          </marker>

          <!-- Drop shadow filter -->
          <filter id="sequence-drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
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
            fill="url(#sequence-grid-pattern)"
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

        <!-- Render Lifelines -->
        <g class="lifelines-layer">
          <g
            v-for="lifeline in computedLifelines"
            :key="`lifeline-${lifeline.id}`"
            :class="{
              'lifeline-group': true,
              selected: selectedElement && selectedElement.id === lifeline.id,
            }"
          >
            <!-- Lifeline Header -->
            <rect
              :x="lifeline.x - 60"
              :y="lifeline.y - 30"
              :width="120"
              :height="60"
              rx="8"
              class="lifeline-header"
              filter="url(#sequence-drop-shadow)"
            />
            <text
              :x="lifeline.x"
              :y="lifeline.y"
              class="lifeline-name"
              text-anchor="middle"
              dominant-baseline="middle"
            >
              {{ lifeline.name }}
            </text>

            <!-- Lifeline Vertical Line -->
            <line
              :x1="lifeline.x"
              :y1="lifeline.y + 30"
              :x2="lifeline.x"
              :y2="virtualSpace.maxY - 100"
              class="lifeline-line"
            />
          </g>
        </g>

        <!-- Render Messages -->
        <g class="messages-layer">
          <g
            v-for="message in computedMessages"
            :key="`message-${message.id}`"
            class="message-group"
          >
            <!-- Message Line -->
            <path
              :d="calculateMessagePath(message)"
              :class="`message-line message-${message.type}`"
              :marker-end="getMessageMarker(message.type)"
            />

            <!-- Message Label -->
            <text
              :x="getMessageLabelPosition(message).x"
              :y="getMessageLabelPosition(message).y"
              class="message-label"
              text-anchor="middle"
              dominant-baseline="middle"
            >
              {{ message.content }}
            </text>
          </g>
        </g>

        <!-- Render Fragments -->
        <g class="fragments-layer">
          <g
            v-for="fragment in computedFragments"
            :key="`fragment-${fragment.id}`"
            class="fragment-group"
          >
            <rect
              :x="fragment.x"
              :y="fragment.y"
              :width="fragment.width"
              :height="fragment.height"
              class="fragment-rect"
            />
            <text :x="fragment.x + 10" :y="fragment.y + 20" class="fragment-label">
              {{ getFragmentLabel(fragment.type) }}
            </text>
            <text
              v-if="fragment.guard_condition"
              :x="fragment.x + 10"
              :y="fragment.y + 40"
              class="fragment-condition"
            >
              [{{ fragment.guard_condition }}]
            </text>
          </g>
        </g>

        <!-- Selection highlight -->
        <rect
          v-if="selectedElement && !previewMode"
          :x="selectedElement.x - 70"
          :y="selectedElement.y - 40"
          :width="140"
          :height="80"
          class="selection-highlight"
          rx="8"
        />

        <!-- Drag preview -->
        <g v-if="draggingElement && draggingType === 'lifeline'" class="drag-preview">
          <rect
            :x="dragPosition.x - 60"
            :y="dragPosition.y - 30"
            :width="120"
            :height="60"
            rx="8"
            class="lifeline-header drag-preview-element"
          />
          <line
            :x1="dragPosition.x"
            :y1="dragPosition.y + 30"
            :x2="dragPosition.x"
            :y2="virtualSpace.maxY - 100"
            class="lifeline-line drag-preview-element"
          />
        </g>
      </svg>
    </div>

    <!-- Status Bar - Ẩn trong preview mode và optimize mode -->
    <div v-if="!previewMode && !optimizeForPreview" class="status-bar">
      <div class="status-item">
        <span class="material-symbols-outlined">person</span>
        {{ computedLifelines.length }} Lifelines
      </div>
      <div class="status-item">
        <span class="material-symbols-outlined">chat</span>
        {{ computedMessages.length }} Messages
      </div>
      <div class="status-item">
        <span class="material-symbols-outlined">widgets</span>
        {{ computedFragments.length }} Fragments
      </div>

      <div class="status-item" v-if="selectedElement">
        Selected: {{ selectedElement.name || selectedElement.content }}
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
  name: 'SequenceDiagramRenderer',
  props: {
    diagramData: {
      type: Object,
      required: true,
      default: () => ({
        lifelines: [],
        messages: [],
        fragments: [],
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

      virtualSpace: {
        minX: -500,
        maxX: 1500,
        minY: -500,
        maxY: 1500,
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

    safeDiagramData() {
      return {
        lifelines: Array.isArray(this.diagramData?.lifelines) ? this.diagramData.lifelines : [],
        messages: Array.isArray(this.diagramData?.messages) ? this.diagramData.messages : [],
        fragments: Array.isArray(this.diagramData?.fragments) ? this.diagramData.fragments : [],
      }
    },

    computedLifelines() {
      const lifelines = this.safeDiagramData.lifelines
      if (!lifelines || lifelines.length === 0) return []

      return lifelines.map((lifeline, index) => {
        const position = lifeline.position || { x: 0, y: 0 }

        return {
          id: lifeline._id || lifeline.id || `lifeline-${index}`,
          name: lifeline.name || 'Unnamed',
          x: position.x || 100 + index * 200,
          y: position.y || 100,
          _originalData: lifeline,
        }
      })
    },

    computedMessages() {
      const messages = this.safeDiagramData.messages
      if (!messages || messages.length === 0) return []

      return messages
        .map((message, index) => {
          const sourceLifeline = this.computedLifelines.find(
            (ll) => ll.id === message.source_lifeline_id
          )
          const targetLifeline = this.computedLifelines.find(
            (ll) => ll.id === message.target_lifeline_id
          )
          return {
            id: message._id || message.id || `message-${index}`,
            source: sourceLifeline,
            target: targetLifeline,
            content: message.content || 'message',
            type: message.type || 'sync',
            order: message.order || index,
            y: 200 + index * 50,
          }
        })
        .filter((message) => message.source && message.target)
    },

    computedFragments() {
      const fragments = this.safeDiagramData.fragments
      if (!fragments || fragments.length === 0) return []

      return fragments.map((fragment, index) => {
        return {
          id: fragment._id || fragment.id || `fragment-${index}`,
          type: fragment.type || 'opt',
          guard_condition: fragment.guard_condition,
          x: 50,
          y: 150 + index * 200,
          width: 500,
          height: 300,
          _originalData: fragment,
        }
      })
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
      const allElements = [...this.computedLifelines]
      if (allElements.length === 0) return

      const bounds = allElements.reduce(
        (acc, element) => ({
          minX: Math.min(acc.minX, element.x - 60),
          maxX: Math.max(acc.maxX, element.x + 60),
          minY: Math.min(acc.minY, element.y - 30),
          maxY: Math.max(acc.maxY, this.virtualSpace.maxY),
        }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
      )

      const padding = 200
      this.virtualSpace.minX = Math.min(this.virtualSpace.minX, bounds.minX - padding)
      this.virtualSpace.maxX = Math.max(this.virtualSpace.maxX, bounds.maxX + padding)
      this.virtualSpace.minY = Math.min(this.virtualSpace.minY, bounds.minY - padding)
    },

    centerViewport() {
      const centerX = this.containerWidth / 2 - this.virtualSpace.centerX * this.internalZoom
      const centerY = this.containerHeight / 2 - this.virtualSpace.centerY * this.internalZoom
      this.viewport.x = centerX
      this.viewport.y = centerY
    },

    // Diagram Element Methods
    calculateMessagePath(message) {
      const { source, target, y } = message
      return `M ${source.x} ${y} L ${target.x} ${y}`
    },

    getMessageLabelPosition(message) {
      const { source, target, y } = message
      const midX = (source.x + target.x) / 2
      return { x: midX, y: y - 10 }
    },

    getMessageMarker(type) {
      const markers = {
        sync: 'url(#sync-arrow)',
        async: 'url(#async-arrow)',
        reply: 'url(#reply-arrow)',
      }
      return markers[type] || 'url(#sync-arrow)'
    },

    getFragmentLabel(type) {
      const labels = {
        loop: 'loop',
        alt: 'alt',
        opt: 'opt',
        par: 'par',
      }
      return labels[type] || type
    },

    // Drag and Drop
    startDrag(element, type, event) {
      if (!this.editable || this.previewMode) return

      event.preventDefault()
      event.stopPropagation()

      this.draggingElement = element
      this.draggingType = type

      const rect = this.$refs.container.getBoundingClientRect()
      const point = this.$el.querySelector('.sequence-svg').createSVGPoint()
      point.x = event.clientX - rect.left
      point.y = event.clientY - rect.top

      const svgPoint = point.matrixTransform(
        this.$el.querySelector('.sequence-svg').getScreenCTM().inverse()
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
      const point = this.$el.querySelector('.sequence-svg').createSVGPoint()
      point.x = event.clientX - rect.left
      point.y = event.clientY - rect.top

      const svgPoint = point.matrixTransform(
        this.$el.querySelector('.sequence-svg').getScreenCTM().inverse()
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

    handleMouseUp() {
      if (!this.isDragging || !this.draggingElement) return

      const hasMoved =
        this.initialDragPosition &&
        (Math.abs(this.initialDragPosition.x - this.dragPosition.x) > 1 ||
          Math.abs(this.initialDragPosition.y - this.dragPosition.y) > 1)

      if (hasMoved && this.editable) {
        if (this.onPositionChange) {
          this.onPositionChange({
            element: this.draggingElement,
            type: this.draggingType,
            position: this.dragPosition,
          })
        }
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
      const allElements = [...this.computedLifelines]
      if (allElements.length === 0) return

      const bounds = allElements.reduce(
        (acc, element) => ({
          minX: Math.min(acc.minX, element.x - 60),
          maxX: Math.max(acc.maxX, element.x + 60),
          minY: Math.min(acc.minY, element.y - 30),
          maxY: Math.max(acc.maxY, this.virtualSpace.maxY),
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

    // Method để parent component gọi khi save hoàn thành
    onSaveComplete(success = true) {
      if (success) {
        this.hideSavingIndicator()
      } else {
        this.isSaving = false
        this.lastSaved = null
      }
    },

    // Method để parent component gọi khi bắt đầu save
    onSaveStart() {
      this.showSavingIndicator()
    },

    // Preview Generation Methods
    async generatePreviewImage() {
      return new Promise((resolve) => {
        setTimeout(async () => {
          try {
            const allElements = [...this.computedLifelines]
            if (allElements.length === 0) {
              resolve(null)
              return
            }

            const bounds = allElements.reduce(
              (acc, element) => ({
                minX: Math.min(acc.minX, element.x - 60),
                maxX: Math.max(acc.maxX, element.x + 60),
                minY: Math.min(acc.minY, element.y - 30),
                maxY: Math.max(acc.maxY, this.virtualSpace.maxY),
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

    generateExportSVG(bounds, padding, contentWidth, contentHeight) {
      const viewBox = `${bounds.minX - padding} ${
        bounds.minY - padding
      } ${contentWidth} ${contentHeight}`

      return `
<svg xmlns="http://www.w3.org/2000/svg" width="${contentWidth}" height="${contentHeight}" viewBox="${viewBox}">
  <defs>
    <marker id="sync-arrow-preview" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
    </marker>
    <marker id="async-arrow-preview" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#8b5cf6" />
    </marker>
    <marker id="reply-arrow-preview" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
    </marker>
  </defs>

  <!-- Background trắng -->
  <rect x="${bounds.minX - padding}" y="${bounds.minY - padding}" 
        width="${contentWidth}" height="${contentHeight}" fill="white" />

  <!-- Render Lifelines -->
  ${this.computedLifelines
    .map(
      (lifeline) => `
    <g>
      <rect x="${lifeline.x - 60}" y="${lifeline.y - 30}" width="120" height="60" rx="8" 
            fill="white" stroke="#374151" stroke-width="2" />
      <text x="${lifeline.x}" y="${lifeline.y}" font-size="14" font-weight="600" 
            fill="#1f2937" text-anchor="middle" dominant-baseline="middle">${lifeline.name}</text>
      <line x1="${lifeline.x}" y1="${lifeline.y + 30}" x2="${lifeline.x}" 
            y2="${
              bounds.maxY - padding
            }" stroke="#374151" stroke-width="2" stroke-dasharray="5,5" />
    </g>
  `
    )
    .join('')}

  <!-- Render Messages -->
  ${this.computedMessages
    .map((message) => {
      const path = this.calculateMessagePath(message)
      const marker = this.getMessageMarker(message.type).replace('-arrow', '-arrow-preview')
      const strokeColor = this.getMessageColor(message.type)

      return `
        <path d="${path}" stroke="${strokeColor}" stroke-width="2" fill="none" marker-end="${marker}" />
        <text x="${this.getMessageLabelPosition(message).x}" y="${
        this.getMessageLabelPosition(message).y
      }" font-size="12" fill="#374151" text-anchor="middle" dominant-baseline="middle">${
        message.content
      }</text>
      `
    })
    .join('')}

  <!-- Render Fragments -->
  ${this.computedFragments
    .map(
      (fragment) => `
    <g>
      <rect x="${fragment.x}" y="${fragment.y}" width="${fragment.width}" height="${
        fragment.height
      }" 
            fill="none" stroke="#6b7280" stroke-width="1" stroke-dasharray="5,5" />
      <text x="${fragment.x + 10}" y="${fragment.y + 20}" font-size="12" font-weight="600" 
            fill="#374151">${this.getFragmentLabel(fragment.type)}</text>
      ${
        fragment.guard_condition
          ? `<text x="${fragment.x + 10}" y="${fragment.y + 40}" font-size="10" fill="#6b7280">[${
              fragment.guard_condition
            }]</text>`
          : ''
      }
    </g>
  `
    )
    .join('')}
</svg>`
    },

    getMessageColor(type) {
      const colors = {
        sync: '#3b82f6',
        async: '#8b5cf6',
        reply: '#10b981',
      }
      return colors[type] || '#374151'
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

    // Export Methods
    async exportAsPNG() {
      try {
        this.isExporting = true

        const allElements = [...this.computedLifelines]
        if (allElements.length === 0) {
          alert('No content to export!')
          return
        }

        const bounds = allElements.reduce(
          (acc, element) => ({
            minX: Math.min(acc.minX, element.x - 60),
            maxX: Math.max(acc.maxX, element.x + 60),
            minY: Math.min(acc.minY, element.y - 30),
            maxY: Math.max(acc.maxY, this.virtualSpace.maxY),
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
                  a.download = `sequence-diagram-${new Date().getTime()}.png`
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
      const allElements = [...this.computedLifelines]
      if (allElements.length === 0) {
        alert('No content to export!')
        return
      }

      const bounds = allElements.reduce(
        (acc, element) => ({
          minX: Math.min(acc.minX, element.x - 60),
          maxX: Math.max(acc.maxX, element.x + 60),
          minY: Math.min(acc.minY, element.y - 30),
          maxY: Math.max(acc.maxY, this.virtualSpace.maxY),
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
      a.download = `sequence-diagram-${new Date().getTime()}.svg`
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
.sequence-diagram-renderer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
  user-select: none;
}

.sequence-diagram-renderer.preview-mode {
  border: 1px solid #e5e7eb;
}

.sequence-diagram-renderer.editable-mode {
  border: 2px dashed #d1d5db;
}

.sequence-diagram-renderer.fullscreen-mode {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  border-radius: 0;
}

.sequence-diagram-renderer.hidden-renderer {
  opacity: 0;
  pointer-events: none;
  position: absolute;
  width: 100%;
  height: 100%;
}

/* Toolbar */
.toolbar {
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
.sequence-container {
  flex: 1;
  overflow: hidden;
  background: #f8fafc;
  position: relative;
  cursor: grab;
}

.sequence-container:active {
  cursor: grabbing;
}

.sequence-svg {
  display: block;
  transition: transform 0.1s ease;
}

/* Status Bar */
.status-bar {
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

/* Lifeline Styles */
.lifeline-header {
  fill: white;
  stroke: #374151;
  stroke-width: 2;
}

.lifeline-name {
  font-size: 14px;
  font-weight: 600;
  fill: #1f2937;
}

.lifeline-line {
  stroke: #374151;
  stroke-width: 2;
  stroke-dasharray: 5, 5;
}

/* Message Styles */
.message-line {
  stroke-width: 2;
  fill: none;
}

.message-sync {
  stroke: #3b82f6;
}

.message-async {
  stroke: #8b5cf6;
}

.message-reply {
  stroke: #10b981;
}

.message-label {
  font-size: 12px;
  fill: #374151;
  font-weight: 500;
}

/* Fragment Styles */
.fragment-rect {
  fill: none;
  stroke: #6b7280;
  stroke-width: 1;
  stroke-dasharray: 5, 5;
}

.fragment-label {
  font-size: 12px;
  fill: #374151;
  font-weight: 600;
}

.fragment-condition {
  font-size: 10px;
  fill: #6b7280;
}

/* Canvas Boundary */
.canvas-boundary {
  pointer-events: none;
}

/* Selection and Drag Styles */
.selection-highlight {
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

.lifeline-group.selected .lifeline-header {
  stroke: #f59e0b;
  stroke-width: 3;
}

.drag-preview-element {
  opacity: 0.7;
  stroke: #6b7280;
  stroke-dasharray: 4, 4;
  fill: none;
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

.save-indicator.saving {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}

.save-indicator.saving .icon {
  animation: spin 1s linear infinite;
  color: #f59e0b;
}

.save-indicator.saved {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.save-indicator.saved .icon {
  color: #10b981;
}

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

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.save-indicator.saving {
  animation: pulse 1.5s ease-in-out infinite;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    gap: 8px;
    padding: 8px;
  }

  .toolbar-left {
    width: 100%;
    justify-content: center;
  }

  .status-bar {
    flex-wrap: wrap;
    gap: 8px;
  }

  .toolbar-btn {
    font-size: 11px;
    padding: 4px 8px;
  }

  .auto-save-status {
    display: none;
  }
}

/* Fullscreen specific styles */
:fullscreen .sequence-diagram-renderer,
:-webkit-full-screen .sequence-diagram-renderer,
:-moz-full-screen .sequence-diagram-renderer,
:-ms-fullscreen .sequence-diagram-renderer {
  border-radius: 0;
}
</style>