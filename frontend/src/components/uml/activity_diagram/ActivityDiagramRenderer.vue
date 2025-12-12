<template>
  <div
    class="activity-diagram-renderer"
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

        <!-- Drag Settings -->
        <div class="toolbar-group">
          <button 
            class="toolbar-btn" 
            :class="{ active: snapToGrid }"
            @click="snapToGrid = !snapToGrid" 
            title="Snap to Grid (Ctrl+G)"
          >
            <span class="material-symbols-outlined">grid_on</span>
            Snap
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
      class="activity-container"
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
        class="activity-svg"
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
            id="activity-grid-pattern"
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
            id="activity-arrow"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#374151" />
          </marker>

          <!-- Drop shadow filter -->
          <filter id="activity-drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
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
            fill="url(#activity-grid-pattern)"
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

        <!-- Swimlanes -->
        <g class="swimlanes-layer" v-if="showSwimlanes && computedLanes.length > 0">
          <g v-for="(lane, index) in computedLanes" :key="`lane-${lane.id}`">
            <!-- Lane background với chiều cao giới hạn -->
            <rect
              :x="getLaneX(index)"
              :y="virtualSpace.minY + laneHeaderHeight"
              :width="getLaneWidth()"
              :height="laneMaxHeight"
              :class="['swimlane-bg', index % 2 === 0 ? 'swimlane-even' : 'swimlane-odd']"
            />

            <!-- Lane label -->
            <text
              :x="getLaneX(index) + getLaneWidth() / 2"
              :y="virtualSpace.minY + 30"
              class="swimlane-label"
              text-anchor="middle"
              dominant-baseline="middle"
            >
              {{ lane.name || `Lane ${index + 1}` }}
            </text>

            <!-- Lane boundary (bottom) -->
            <line
              :x1="getLaneX(index)"
              :y1="virtualSpace.minY + laneHeaderHeight + laneMaxHeight"
              :x2="getLaneX(index) + getLaneWidth()"
              :y2="virtualSpace.minY + laneHeaderHeight + laneMaxHeight"
              class="swimlane-boundary"
              stroke="#d1d5db"
              stroke-width="2"
              stroke-dasharray="5,5"
            />

            <!-- Lane separator -->
            <line
              v-if="index > 0"
              :x1="getLaneX(index)"
              :y1="virtualSpace.minY + laneHeaderHeight"
              :x2="getLaneX(index)"
              :y2="virtualSpace.minY + laneHeaderHeight + laneMaxHeight"
              class="swimlane-separator"
            />
          </g>
        </g>

        <!-- Render Edges -->
        <g class="edges-layer">
          <g v-for="edge in computedEdges" :key="`edge-${edge.id}`" class="edge-group">
            <path
              :d="calculateEdgePath(edge)"
              class="activity-edge"
              marker-end="url(#activity-arrow)"
            />
            <text
              v-if="getEdgeLabel(edge)"
              :x="getEdgeLabelPosition(edge).x"
              :y="getEdgeLabelPosition(edge).y"
              class="edge-label"
              text-anchor="middle"
              dominant-baseline="middle"
            >
              {{ getEdgeLabel(edge) }}
            </text>
          </g>
        </g>

        <!-- Render Nodes -->
        <g class="nodes-layer">
          <g
            v-for="node in positionedNodes"
            :key="`node-${node.id}`"
            :class="{
              'node-group': true,
              selected: selectedElement && selectedElement.id === node.id,
              draggable: editable,
            }"
            @mousedown="startDrag(node, 'node', $event)"
          >
            <!-- Start/End Nodes -->
            <circle
              v-if="node.type === 'start' || node.type === 'end'"
              :cx="node.x"
              :cy="node.y"
              r="20"
              :class="`activity-node node-${node.type}`"
              filter="url(#activity-drop-shadow)"
            />

            <!-- Action Nodes -->
            <rect
              v-else-if="node.type === 'action'"
              :x="node.x - node.width / 2"
              :y="node.y - node.height / 2"
              :width="node.width"
              :height="node.height"
              rx="8"
              :class="`activity-node node-${node.type}`"
              filter="url(#activity-drop-shadow)"
            />

            <!-- Decision Nodes -->
            <polygon
              v-else-if="node.type === 'decision'"
              :points="getDecisionPoints(node)"
              :class="`activity-node node-${node.type}`"
              filter="url(#activity-drop-shadow)"
            />

            <!-- Merge Nodes -->
            <polygon
              v-else-if="node.type === 'merge'"
              :points="getMergePoints(node)"
              :class="`activity-node node-${node.type}`"
              filter="url(#activity-drop-shadow)"
            />

            <!-- Fork/Join Nodes -->
            <rect
              v-else-if="node.type === 'fork' || node.type === 'join'"
              :x="node.x - node.width / 2"
              :y="node.y - node.height / 2"
              :width="node.width"
              :height="node.height"
              :class="`activity-node node-${node.type}`"
              filter="url(#activity-drop-shadow)"
            />

            <!-- Object Nodes -->
            <rect
              v-else-if="node.type === 'object'"
              :x="node.x - node.width / 2"
              :y="node.y - node.height / 2"
              :width="node.width"
              :height="node.height"
              rx="8"
              :class="`activity-node node-${node.type}`"
              filter="url(#activity-drop-shadow)"
            />

            <!-- Node Label -->
            <foreignObject
              :x="getNodeLabelPosition(node).x"
              :y="getNodeLabelPosition(node).y"
              :width="getNodeLabelSize(node).width"
              :height="getNodeLabelSize(node).height"
              class="node-content"
              style="pointer-events: none;"
            >
              <div
                class="node-label"
                :class="{
                  'object-node': node.type === 'object',
                  'swimlane-node': node.type === 'swimlane',
                }"
              >
                {{ node.label }}
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
          class="selection-highlight"
          :rx="getSelectionHighlightRadius(selectedElement)"
        />

        <!-- Drag preview -->
        <g v-if="draggingElement" class="drag-preview">
          <circle
            v-if="
              draggingType === 'node' &&
              (draggingElement.type === 'start' || draggingElement.type === 'end')
            "
            :cx="dragPosition.x"
            :cy="dragPosition.y"
            r="20"
            :class="`activity-node node-${draggingElement.type} drag-preview-element`"
          />
          <rect
            v-else-if="
              draggingType === 'node' &&
              (draggingElement.type === 'action' || draggingElement.type === 'object')
            "
            :x="dragPosition.x - draggingElement.width / 2"
            :y="dragPosition.y - draggingElement.height / 2"
            :width="draggingElement.width"
            :height="draggingElement.height"
            rx="8"
            :class="`activity-node node-${draggingElement.type} drag-preview-element`"
          />
          <polygon
            v-else-if="
              draggingType === 'node' &&
              draggingElement.type === 'decision'
            "
            :points="
              getDecisionPoints({ ...draggingElement, x: dragPosition.x, y: dragPosition.y })
            "
            :class="`activity-node node-${draggingElement.type} drag-preview-element`"
          />
          <polygon
            v-else-if="
              draggingType === 'node' &&
              draggingElement.type === 'merge'
            "
            :points="
              getMergePoints({ ...draggingElement, x: dragPosition.x, y: dragPosition.y })
            "
            :class="`activity-node node-${draggingElement.type} drag-preview-element`"
          />
          <rect
            v-else-if="
              draggingType === 'node' &&
              (draggingElement.type === 'fork' || draggingElement.type === 'join')
            "
            :x="dragPosition.x - draggingElement.width / 2"
            :y="dragPosition.y - draggingElement.height / 2"
            :width="draggingElement.width"
            :height="draggingElement.height"
            :class="`activity-node node-${draggingElement.type} drag-preview-element`"
          />
        </g>
      </svg>
    </div>

    <!-- Auto-fix Suggestion Banner -->
    <div
      v-if="showAutoFixSuggestion && !previewMode && editable"
      class="auto-fix-banner"
    >
      <div class="auto-fix-content">
        <span class="material-symbols-outlined">info</span>
        <span class="auto-fix-text">
          Có {{ nodesOutsideLaneCount }} node đang nằm ngoài lane. Nhấp để tự động sắp xếp lại.
        </span>
        <button class="auto-fix-btn" @click="autoFixNodesInLanes">
          <span class="material-symbols-outlined">auto_fix_high</span>
          Sắp xếp tự động
        </button>
        <button class="auto-fix-close" @click="dismissAutoFixSuggestion">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>

    <!-- Status Bar - Ẩn trong preview mode và optimize mode -->
    <div v-if="!previewMode && !optimizeForPreview" class="status-bar">
      <div class="status-item">
        <span class="material-symbols-outlined">circle</span>
        {{ positionedNodes.length }} Nodes
      </div>
      <div class="status-item">
        <span class="material-symbols-outlined">arrow_right_alt</span>
        {{ computedEdges.length }} Edges
      </div>

      <div class="status-item" v-if="selectedElement">Selected: {{ selectedElement.label }}</div>

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
  name: 'ActivityDiagramRenderer',
  props: {
    diagramData: {
      type: Object,
      required: true,
      default: () => ({
        nodes: [],
        edges: [],
        lanes: [],
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
    showSwimlanes: {
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
      viewport: { x: 0, y: 0 },
      isPanning: false,
      panStart: { x: 0, y: 0 },
      isFullscreen: false,
      isExporting: false,
      isSaving: false,
      lastSaved: null,
      // Drag settings
      snapToGrid: false,
      gridSize: 20,
      dragSmoothness: 1, // 1 = immediate, higher = smoother but slower

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

      previewGenerated: false,
      nodeSpacing: 120,
      laneHeaderHeight: 60,
      horizontalSpacing: 200,
      laneMaxHeight: 2000,
      fixedLaneWidth: 400, // Kích thước cố định cho mỗi lane
      showAutoFixSuggestion: false,
      autoFixDismissed: false,
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
        nodes: Array.isArray(this.diagramData?.nodes) ? this.diagramData.nodes : [],
        edges: Array.isArray(this.diagramData?.edges) ? this.diagramData.edges : [],
        lanes: Array.isArray(this.diagramData?.lanes) ? this.diagramData.lanes : [],
      }
    },
    computedLanes() {
      return this.safeDiagramData.lanes
    },
    computedNodes() {
      const nodes = this.safeDiagramData.nodes
      if (!nodes || nodes.length === 0) return []

      // Nhóm nodes theo lane để phân bố vị trí
      const nodesByLane = {}
      const nodesWithoutLane = []
      
      nodes.forEach((node) => {
        const laneId = node.lane_id || null
        if (laneId) {
          if (!nodesByLane[laneId]) {
            nodesByLane[laneId] = []
          }
          nodesByLane[laneId].push(node)
        } else {
          nodesWithoutLane.push(node)
        }
      })

      // Đếm số node trong mỗi lane để tính Y position
      const laneNodeCounts = {}
      Object.keys(nodesByLane).forEach(laneId => {
        laneNodeCounts[laneId] = 0
      })

      let globalIndex = 0
      return nodes.map((node, index) => {
        const { width, height } = this.getNodeSize(node.type)
        const nodeHalfWidth = width / 2
        const nodeHalfHeight = height / 2
        const safePadding = 20
        
        const laneId = node.lane_id || null
        const laneIndex = this.getLaneIndex(laneId)
        
        // Nếu node có position từ database, validate và điều chỉnh nếu cần
        let x, y
        if (node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number') {
          x = node.position.x
          y = node.position.y
          
          // ✅ MỚI: Nếu node có lane_id, validate position có nằm trong lane không
          if (laneId && laneIndex !== -1 && this.computedLanes.length > 0) {
            const laneX = this.getLaneX(laneIndex)
            const laneWidth = this.getLaneWidth()
            const laneMinX = laneX + safePadding + nodeHalfWidth
            const laneMaxX = laneX + laneWidth - safePadding - nodeHalfWidth
            const laneMinY = this.virtualSpace.minY + this.laneHeaderHeight + nodeHalfHeight + safePadding
            const laneMaxY = this.virtualSpace.minY + this.laneHeaderHeight + this.laneMaxHeight - nodeHalfHeight - safePadding
            
            // Kiểm tra xem position có nằm trong lane không
            const isXInLane = x >= laneMinX && x <= laneMaxX
            const isYInLane = y >= laneMinY && y <= laneMaxY
            
            // Nếu position nằm ngoài lane, điều chỉnh lại
            if (!isXInLane || !isYInLane) {
              // Điều chỉnh X về giữa lane
              x = laneX + laneWidth / 2
              
              // Điều chỉnh Y: nếu Y quá nhỏ, đặt ở đầu lane; nếu quá lớn, đặt ở cuối lane
              if (y < laneMinY) {
                y = laneMinY
              } else if (y > laneMaxY) {
                y = laneMaxY
              }
              
              // Nếu Y vẫn nằm ngoài, tính lại dựa trên thứ tự node trong lane
              if (y < laneMinY || y > laneMaxY) {
                const nodeIndexInLane = laneNodeCounts[laneId] || 0
                laneNodeCounts[laneId] = nodeIndexInLane + 1
                const yOffset = this.laneHeaderHeight + 100 + nodeIndexInLane * 120
                y = this.virtualSpace.minY + yOffset
              }
            }
          }
        } else {
          // Tính vị trí mặc định dựa trên lane
          if (laneIndex !== -1 && this.computedLanes.length > 0) {
            // Node có lane - đặt vào giữa lane
            const laneX = this.getLaneX(laneIndex)
            const laneWidth = this.getLaneWidth()
            const laneCenterX = laneX + laneWidth / 2
            
            // Tính Y trong lane (bắt đầu từ sau header, phân bố theo thứ tự)
            const nodeIndexInLane = laneNodeCounts[laneId] || 0
            laneNodeCounts[laneId] = nodeIndexInLane + 1
            const yOffset = this.laneHeaderHeight + 100 + nodeIndexInLane * 120
            
            x = laneCenterX
            y = this.virtualSpace.minY + yOffset
          } else {
            // Node không có lane - phân bố tự do
            x = this.virtualSpace.centerX + (globalIndex % 5) * 150
            y = this.virtualSpace.centerY - 200 + Math.floor(globalIndex / 5) * 100
            globalIndex++
          }
        }

        // Tạo label mặc định dựa trên type nếu không có label
        let defaultLabel = 'Unnamed'
        if (!node.label || node.label.trim() === '') {
          switch (node.type) {
            case 'start':
              defaultLabel = 'Start'
              break
            case 'end':
              defaultLabel = 'End'
              break
            case 'decision':
              defaultLabel = 'Decision'
              break
            case 'merge':
              defaultLabel = 'Merge'
              break
            case 'fork':
              defaultLabel = 'Fork'
              break
            case 'join':
              defaultLabel = 'Join'
              break
            case 'action':
              defaultLabel = 'Action'
              break
            case 'object':
              defaultLabel = 'Object'
              break
            default:
              defaultLabel = `Node ${index + 1}`
          }
        }

        return {
          id: node.id || `node-${index}`,
          type: node.type || 'action',
          label: node.label && node.label.trim() !== '' ? node.label : defaultLabel,
          lane_id: node.lane_id || null,
          width: width,
          height: height,
          x: x,
          y: y,
          position: node.position ? { ...node.position } : { x, y },
          _originalData: node,
        }
      })
    },
    positionedNodes() {
      // Trả về nodes với vị trí đã tính toán
      return this.computedNodes
    },
    nodesOutsideLaneCount() {
      if (!this.computedLanes.length || this.autoFixDismissed) return 0
      
      let count = 0
      this.computedNodes.forEach((node) => {
        if (node.lane_id) {
          const laneIndex = this.getLaneIndex(node.lane_id)
          if (laneIndex !== -1) {
            const laneX = this.getLaneX(laneIndex)
            const laneWidth = this.getLaneWidth()
            const nodeHalfWidth = node.width / 2
            const nodeHalfHeight = node.height / 2
            const safePadding = 20
            
            const laneMinX = laneX + safePadding + nodeHalfWidth
            const laneMaxX = laneX + laneWidth - safePadding - nodeHalfWidth
            const laneMinY = this.virtualSpace.minY + this.laneHeaderHeight + nodeHalfHeight + safePadding
            const laneMaxY = this.virtualSpace.minY + this.laneHeaderHeight + this.laneMaxHeight - nodeHalfHeight - safePadding
            
            const isXInLane = node.x >= laneMinX && node.x <= laneMaxX
            const isYInLane = node.y >= laneMinY && node.y <= laneMaxY
            
            if (!isXInLane || !isYInLane) {
              count++
            }
          }
        }
      })
      return count
    },
    computedEdges() {
      const edges = this.safeDiagramData.edges
      if (!edges || edges.length === 0) return []

      return edges
        .map((edge, index) => {
          const sourceNode = this.positionedNodes.find((n) => n.id === edge.from)
          const targetNode = this.positionedNodes.find((n) => n.id === edge.to)
          return {
            id: `edge-${index}`,
            from: edge.from,
            to: edge.to,
            condition: edge.condition,
            guard: edge.guard,
            trigger: edge.trigger,
            source: sourceNode,
            target: targetNode,
          }
        })
        .filter((edge) => edge.source && edge.target)
    },
  },
  watch: {
    diagramData: {
      handler(newData, oldData) {
        this.updateVirtualSpace()
        // Kiểm tra nodes nằm ngoài lane để hiển thị gợi ý
        this.$nextTick(() => {
          this.checkNodesOutsideLanes()
        })
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
    nodesOutsideLaneCount: {
      handler(count) {
        if (count > 0 && !this.autoFixDismissed) {
          this.showAutoFixSuggestion = true
        } else {
          this.showAutoFixSuggestion = false
        }
      },
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
    // ============ NODE METHODS ============
    getNodeSize(type) {
      switch (type) {
        case 'start':
        case 'end':
          return { width: 40, height: 40 }
        case 'action':
        case 'object':
          return { width: 120, height: 60 }
        case 'decision':
        case 'merge':
          return { width: 80, height: 80 }
        case 'fork':
        case 'join':
          return { width: 100, height: 20 }
        case 'swimlane':
          return { width: 300, height: 400 }
        default:
          return { width: 120, height: 60 }
      }
    },

    getLaneX(index) {
      // Sử dụng kích thước cố định cho lanes
      return this.virtualSpace.minX + index * this.fixedLaneWidth
    },

    getLaneWidth() {
      // Trả về kích thước cố định
      return this.fixedLaneWidth
    },

    getLaneIndex(laneId) {
      if (!laneId || this.computedLanes.length === 0) return -1
      return this.computedLanes.findIndex(lane => lane.id === laneId || lane._id === laneId)
    },

    getDecisionPoints(node) {
      const size = 40
      return `
        ${node.x},${node.y - size}
        ${node.x + size},${node.y}
        ${node.x},${node.y + size}
        ${node.x - size},${node.y}
      `
    },

    getMergePoints(node) {
      // Hình thang ngược (inverted trapezoid) cho merge node
      const width = node.width || 80
      const height = node.height || 80
      const topWidth = width * 0.6 // Đỉnh nhỏ hơn
      const bottomWidth = width // Đáy rộng hơn
      
      return `
        ${node.x - topWidth / 2},${node.y - height / 2}
        ${node.x + topWidth / 2},${node.y - height / 2}
        ${node.x + bottomWidth / 2},${node.y + height / 2}
        ${node.x - bottomWidth / 2},${node.y + height / 2}
      `
    },

    getNodeLabelPosition(node) {
      if (node.type === 'fork' || node.type === 'join') {
        return {
          x: node.x - node.width / 2,
          y: node.y + node.height / 2 + 5,
        }
      }
      return {
        x: node.x - node.width / 2,
        y: node.y - node.height / 2,
      }
    },

    getNodeLabelSize(node) {
      if (node.type === 'fork' || node.type === 'join') {
        return {
          width: node.width,
          height: 20,
        }
      }
      return {
        width: node.width,
        height: node.height,
      }
    },

    getSelectionHighlightRadius(node) {
      switch (node.type) {
        case 'action':
        case 'object':
          return 12
        default:
          return 8
      }
    },

    // ============ EDGE METHODS ============
    calculateEdgePath(edge) {
      const { source, target } = edge

      if (source.type === 'decision') {
        return this.calculateDecisionEdgePath(edge)
      }

      const condition = this.getEdgeCondition(source.id, target.id)
      const normalizedCondition = this.normalizeCondition(condition)
      if (normalizedCondition === 'yes' || normalizedCondition === 'no') {
        return this.calculateBranchEdgePath(edge)
      }

      return this.calculateStraightEdgePath(edge)
    },

    calculateDecisionEdgePath(edge) {
      const { source, target, condition } = edge
      const normalizedCondition = this.normalizeCondition(condition)
      const startOffset = this.getNodeOffset(source, 0, 1)
      const endOffset = this.getNodeOffset(target, 0, -1)

      const startX = source.x
      const startY = source.y + startOffset
      const endX = target.x
      const endY = target.y - endOffset

      // Làm thẳng thay vì cong - chỉ dùng đường thẳng L
      return `M ${startX} ${startY} L ${endX} ${endY}`
    },

    calculateBranchEdgePath(edge) {
      const { source, target, condition } = edge
      const normalizedCondition = this.normalizeCondition(condition)
      const startOffset = this.getNodeOffset(source, 0, 1)
      const endOffset = this.getNodeOffset(target, 0, -1)

      const startX = source.x
      const startY = source.y + startOffset
      const endX = target.x
      const endY = target.y - endOffset

      if (normalizedCondition === 'yes') {
        const midX = (startX + endX) / 2 - 40
        const midY = (startY + endY) / 2
        return `M ${startX} ${startY} Q ${midX} ${midY}, ${endX} ${endY}`
      } else if (normalizedCondition === 'no') {
        const midX = (startX + endX) / 2 + 40
        const midY = (startY + endY) / 2
        return `M ${startX} ${startY} Q ${midX} ${midY}, ${endX} ${endY}`
      }

      return `M ${startX} ${startY} L ${endX} ${endY}`
    },

    calculateStraightEdgePath(edge) {
      const { source, target } = edge
      const dx = target.x - source.x
      const dy = target.y - source.y
      const length = Math.sqrt(dx * dx + dy * dy)
      if (length === 0) return ''

      const nx = dx / length
      const ny = dy / length

      const startX = source.x + nx * this.getNodeOffset(source, nx, ny)
      const startY = source.y + ny * this.getNodeOffset(source, nx, ny)
      const endX = target.x - nx * this.getNodeOffset(target, -nx, -ny)
      const endY = target.y - ny * this.getNodeOffset(target, -nx, -ny)

      return `M ${startX} ${startY} L ${endX} ${endY}`
    },

    getNodeOffset(node, nx, ny) {
      if (node.type === 'start' || node.type === 'end') {
        return 20
      } else if (node.type === 'decision') {
        const size = 40
        return Math.abs(nx * size) + Math.abs(ny * size)
      } else if (node.type === 'merge') {
        // Tính offset cho hình thang ngược
        const width = node.width || 80
        const height = node.height || 80
        const topWidth = width * 0.6
        const bottomWidth = width
        
        // Tính offset dựa trên hướng
        if (ny < 0) {
          // Phía trên (đỉnh nhỏ)
          return topWidth / 2
        } else if (ny > 0) {
          // Phía dưới (đáy rộng)
          return bottomWidth / 2
        } else {
          // Bên trái/phải
          return height / 2
        }
      } else if (['action', 'object', 'fork', 'join'].includes(node.type)) {
        const rx = node.width / 2
        const ry = node.height / 2
        if (nx === 0) return ry
        if (ny === 0) return rx

        const angle = Math.atan2(ny, nx)
        const cosAngle = Math.cos(angle)
        const sinAngle = Math.sin(angle)
        return Math.sqrt((rx * cosAngle) ** 2 + (ry * sinAngle) ** 2)
      }
      return 30
    },

    getEdgeLabel(edge) {
      if (edge.guard) return `[${edge.guard}]`
      if (edge.trigger) return `/${edge.trigger}`
      if (edge.condition) return `[${edge.condition}]`
      return ''
    },

    getEdgeLabelPosition(edge) {
      const { source, target } = edge

      const condition = this.getEdgeCondition(source.id, target.id)
      const normalizedCondition = this.normalizeCondition(condition)

      if (
        source.type === 'decision' ||
        normalizedCondition === 'yes' ||
        normalizedCondition === 'no'
      ) {
        const midY = (source.y + target.y) / 2
        let midX
        if (normalizedCondition === 'yes') {
          midX = (source.x + target.x) / 2 - 50
        } else if (normalizedCondition === 'no') {
          midX = (source.x + target.x) / 2 + 50
        } else {
          midX = (source.x + target.x) / 2
        }
        return { x: midX, y: midY }
      }

      const midX = (source.x + target.x) / 2
      const midY = (source.y + target.y) / 2
      return { x: midX, y: midY - 10 }
    },

    getEdgeCondition(fromId, toId) {
      const edge = this.safeDiagramData.edges.find(
        (edge) => edge.from === fromId && edge.to === toId
      )
      return edge ? edge.condition : null
    },

    normalizeCondition(condition) {
      if (!condition) return null

      const lowerCondition = condition.toLowerCase().trim()
      if (lowerCondition === 'yes' || lowerCondition === 'true' || lowerCondition === 'đúng') {
        return 'yes'
      } else if (
        lowerCondition === 'no' ||
        lowerCondition === 'false' ||
        lowerCondition === 'sai'
      ) {
        return 'no'
      }
      return lowerCondition
    },

    // ============ DRAG AND DROP METHODS ============
    startDrag(element, type, event) {
      if (!this.editable || this.previewMode) return

      event.preventDefault()
      event.stopPropagation()

      this.draggingElement = element
      this.draggingType = type

      const rect = this.$refs.container.getBoundingClientRect()
      const point = this.$el.querySelector('.activity-svg').createSVGPoint()
      point.x = event.clientX - rect.left
      point.y = event.clientY - rect.top

      const svgPoint = point.matrixTransform(
        this.$el.querySelector('.activity-svg').getScreenCTM().inverse()
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
      const point = this.$el.querySelector('.activity-svg').createSVGPoint()
      point.x = event.clientX - rect.left
      point.y = event.clientY - rect.top

      const svgPoint = point.matrixTransform(
        this.$el.querySelector('.activity-svg').getScreenCTM().inverse()
      )

      let newX = svgPoint.x - this.dragOffset.x
      let newY = svgPoint.y - this.dragOffset.y

      // Giới hạn node trong lane nếu node có lane_id
      const nodeHalfWidth = (this.draggingElement.width || 60) / 2
      const nodeHalfHeight = (this.draggingElement.height || 60) / 2
      const safePadding = 20

      if (this.draggingElement.lane_id && this.computedLanes.length > 0) {
        // Node thuộc lane - giới hạn trong lane
        const laneIndex = this.getLaneIndex(this.draggingElement.lane_id)
        if (laneIndex !== -1) {
          const laneX = this.getLaneX(laneIndex)
          const laneWidth = this.getLaneWidth()
          const laneMinX = laneX + safePadding + nodeHalfWidth
          const laneMaxX = laneX + laneWidth - safePadding - nodeHalfWidth
          
          // Giới hạn X trong lane
          newX = Math.max(laneMinX, Math.min(laneMaxX, newX))
          
          // Giới hạn Y trong phạm vi lane (từ header đến maxHeight)
          const laneMinY = this.virtualSpace.minY + this.laneHeaderHeight + nodeHalfHeight + safePadding
          const laneMaxY = this.virtualSpace.minY + this.laneHeaderHeight + this.laneMaxHeight - nodeHalfHeight - safePadding
          newY = Math.max(laneMinY, Math.min(laneMaxY, newY))
        }
      } else {
        // Node không có lane - giới hạn trong virtual space
        newX = Math.max(
          this.virtualSpace.minX + nodeHalfWidth + safePadding,
          Math.min(this.virtualSpace.maxX - nodeHalfWidth - safePadding, newX)
        )
        newY = Math.max(
          this.virtualSpace.minY + nodeHalfHeight + safePadding,
          Math.min(this.virtualSpace.maxY - nodeHalfHeight - safePadding, newY)
        )
      }

      // Snap to grid nếu được bật
      if (this.snapToGrid) {
        newX = Math.round(newX / this.gridSize) * this.gridSize
        newY = Math.round(newY / this.gridSize) * this.gridSize
      }

      this.dragPosition = { x: newX, y: newY }

      if (this.draggingElement) {
        this.draggingElement.x = newX
        this.draggingElement.y = newY

        // Cập nhật position để đồng bộ với database
        if (!this.draggingElement.position) {
          this.draggingElement.position = { x: 0, y: 0 }
        }
        this.draggingElement.position.x = newX
        this.draggingElement.position.y = newY

        // Cập nhật original data nếu có
        if (this.draggingElement._originalData) {
          if (!this.draggingElement._originalData.position) {
            this.draggingElement._originalData.position = { x: 0, y: 0 }
          }
          this.draggingElement._originalData.position.x = newX
          this.draggingElement._originalData.position.y = newY
        }

        this.showSavingIndicator()

        // Emit events để parent component biết có thay đổi
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

    // ============ VIEWPORT METHODS ============
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

    // ============ ZOOM AND VIEW METHODS ============
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
      const allElements = [...this.positionedNodes]
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

    centerViewport() {
      const centerX = this.containerWidth / 2 - this.virtualSpace.centerX * this.internalZoom
      const centerY = this.containerHeight / 2 - this.virtualSpace.centerY * this.internalZoom
      this.viewport.x = centerX
      this.viewport.y = centerY
    },

    updateVirtualSpace() {
      // Nếu có lanes, tính toán virtualSpace dựa trên lanes với kích thước cố định
      if (this.computedLanes.length > 0) {
        const totalLanesWidth = this.computedLanes.length * this.fixedLaneWidth
        const lanesHeight = this.laneHeaderHeight + this.laneMaxHeight
        
        // Cố định virtualSpace để chứa toàn bộ lanes
        this.virtualSpace.minX = -1000
        this.virtualSpace.maxX = -1000 + totalLanesWidth
        this.virtualSpace.minY = -1000
        this.virtualSpace.maxY = -1000 + lanesHeight
        
        return
      }

      // Nếu không có lanes, tính toán như cũ
      const allElements = [...this.positionedNodes]
      if (allElements.length === 0) {
        this.virtualSpace.minX = -1000
        this.virtualSpace.maxX = 2200
        this.virtualSpace.minY = -1000
        this.virtualSpace.maxY = 1800
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

      const padding = 200
      this.virtualSpace.minX = Math.min(this.virtualSpace.minX, bounds.minX - padding)
      this.virtualSpace.maxX = Math.max(this.virtualSpace.maxX, bounds.maxX + padding)
      this.virtualSpace.minY = Math.min(this.virtualSpace.minY, bounds.minY - padding)
      this.virtualSpace.maxY = Math.max(this.virtualSpace.maxY, bounds.maxY + padding)
    },

    // ============ SELECTION METHODS ============
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

    // ============ SAVE STATUS METHODS ============
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

    onSaveComplete(success = true) {
      if (success) {
        this.hideSavingIndicator()
      } else {
        this.isSaving = false
        this.lastSaved = null
      }
    },

    onSaveStart() {
      this.showSavingIndicator()
    },

    // ============ EXPORT AND PREVIEW METHODS ============
    async generatePreviewImage() {
      return new Promise((resolve) => {
        setTimeout(async () => {
          try {
            console.log('🖼️ ActivityDiagramRenderer: Starting preview generation...')
            const allElements = [...this.positionedNodes]
            console.log('🖼️ ActivityDiagramRenderer: Elements count:', allElements.length)
            
            if (allElements.length === 0) {
              console.log('🖼️ ActivityDiagramRenderer: No elements, returning null')
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

            // Bao gồm lanes trong bounds nếu có lanes
            if (this.computedLanes.length > 0) {
              const firstLaneX = this.getLaneX(0)
              const lastLaneIndex = this.computedLanes.length - 1
              const lastLaneX = this.getLaneX(lastLaneIndex)
              const laneWidth = this.getLaneWidth()
              const lanesMaxX = lastLaneX + laneWidth
              const lanesMinY = this.virtualSpace.minY
              const lanesMaxY = this.virtualSpace.minY + this.laneHeaderHeight + this.laneMaxHeight

              bounds.minX = Math.min(bounds.minX, firstLaneX)
              bounds.maxX = Math.max(bounds.maxX, lanesMaxX)
              bounds.minY = Math.min(bounds.minY, lanesMinY)
              bounds.maxY = Math.max(bounds.maxY, lanesMaxY)
            }

            console.log('🖼️ ActivityDiagramRenderer: Bounds:', bounds)

            const padding = 80
            const contentWidth = Math.max(bounds.maxX - bounds.minX + padding * 2, 400)
            const contentHeight = Math.max(bounds.maxY - bounds.minY + padding * 2, 300)

            console.log('🖼️ ActivityDiagramRenderer: Content size:', contentWidth, 'x', contentHeight)

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
              console.log('🖼️ ActivityDiagramRenderer: Preview generation completed successfully')
              resolve(base64)
            }
            img.onerror = (error) => {
              console.error('🖼️ ActivityDiagramRenderer: Image load error:', error)
              resolve(null)
            }
            img.src = svgData
          } catch (error) {
            console.error('🖼️ ActivityDiagramRenderer: Error generating preview image:', error)
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
    <marker id="activity-arrow-preview" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#374151" />
    </marker>
  </defs>

  <!-- Background trắng -->
  <rect x="${bounds.minX - padding}" y="${bounds.minY - padding}" 
        width="${contentWidth}" height="${contentHeight}" fill="white" />

  <!-- Render Swimlanes -->
  ${this.computedLanes.length > 0 ? this.computedLanes
    .map((lane, index) => {
      const laneX = this.getLaneX(index) - bounds.minX + padding
      const laneWidth = this.getLaneWidth()
      const laneY = this.virtualSpace.minY - bounds.minY + padding
      const laneHeight = this.laneHeaderHeight + this.laneMaxHeight
      const laneName = lane.name || `Lane ${index + 1}`

      return `
      <rect x="${laneX}" y="${laneY}" 
            width="${laneWidth}" height="${laneHeight}"
            fill="${index % 2 === 0 ? 'rgba(229, 231, 235, 0.8)' : 'rgba(243, 244, 246, 0.8)'}" 
            stroke="#e5e7eb" stroke-width="1" />
      <text x="${laneX + laneWidth / 2}" y="${laneY + 30}" 
            font-size="14" font-weight="600" fill="#6b7280" 
            text-anchor="middle" dominant-baseline="middle">
        ${laneName}
      </text>
      ${
        index > 0
          ? `<line x1="${laneX}" y1="${laneY}" x2="${laneX}" y2="${
              laneY + laneHeight
            }" stroke="#d1d5db" stroke-width="2" />`
          : ''
      }
      <line x1="${laneX}" y1="${laneY + laneHeight}" x2="${laneX + laneWidth}" y2="${
        laneY + laneHeight
      }" stroke="#d1d5db" stroke-width="2" stroke-dasharray="5,5" />
    `
    })
    .join('') : ''}

  <!-- Render Edges -->
  ${this.computedEdges
    .map((edge) => {
      const path = this.calculateEdgePath(edge)
      const labelContent = this.getEdgeLabel(edge)
        ? `<text x="${this.getEdgeLabelPosition(edge).x - bounds.minX + padding}" y="${
            this.getEdgeLabelPosition(edge).y - bounds.minY + padding
          }" font-size="10" fill="#6b7280" text-anchor="middle" dominant-baseline="middle">${this.getEdgeLabel(
            edge
          )}</text>`
        : ''

      return `
        <path d="${this.adjustPathForExport(path, bounds, padding)}" 
              stroke="#374151" stroke-width="2" fill="none" 
              marker-end="url(#activity-arrow-preview)" />
        ${labelContent}
      `
    })
    .join('')}

  <!-- Render Nodes -->
  ${this.positionedNodes
    .map((node) => {
      const x = node.x - bounds.minX + padding
      const y = node.y - bounds.minY + padding

      if (node.type === 'start' || node.type === 'end') {
        return `
          <circle cx="${x}" cy="${y}" r="20" 
                  fill="${node.type === 'start' ? '#10b981' : '#ef4444'}" 
                  stroke="${node.type === 'start' ? '#047857' : '#dc2626'}" 
                  stroke-width="2" />
          <text x="${x}" y="${y}" font-size="12" fill="white" 
                text-anchor="middle" dominant-baseline="middle" font-weight="bold">
            ${node.type === 'start' ? 'Start' : 'End'}
          </text>
        `
      } else if (node.type === 'action') {
        return `
          <rect x="${x - node.width / 2}" y="${y - node.height / 2}" 
                width="${node.width}" height="${node.height}" rx="8"
                fill="white" stroke="#3b82f6" stroke-width="2" />
          <text x="${x}" y="${y}" font-size="12" fill="#1e40af" 
                text-anchor="middle" dominant-baseline="middle">${node.label}</text>
        `
      } else if (node.type === 'decision') {
        const points = this.getDecisionPoints({ ...node, x, y })
        return `
          <polygon points="${points}" fill="white" stroke="#8b5cf6" stroke-width="2" />
          <text x="${x}" y="${y}" font-size="12" fill="#6b21a8" 
                text-anchor="middle" dominant-baseline="middle">${node.label}</text>
        `
      } else if (node.type === 'merge') {
        const points = this.getMergePoints({ ...node, x, y })
        return `
          <polygon points="${points}" fill="white" stroke="#8b5cf6" stroke-width="2" />
          <text x="${x}" y="${y}" font-size="12" fill="#6b21a8" 
                text-anchor="middle" dominant-baseline="middle">${node.label}</text>
        `
      } else if (node.type === 'fork' || node.type === 'join') {
        return `
          <rect x="${x - node.width / 2}" y="${y - node.height / 2}" 
                width="${node.width}" height="${node.height}"
                fill="#6b7280" stroke="#374151" stroke-width="2" />
          <text x="${x}" y="${y + node.height / 2 + 15}" font-size="10" fill="#374151" 
                text-anchor="middle" dominant-baseline="middle">${node.label}</text>
        `
      } else if (node.type === 'object') {
        return `
          <rect x="${x - node.width / 2}" y="${y - node.height / 2}" 
                width="${node.width}" height="${node.height}" rx="8"
                fill="white" stroke="#f59e0b" stroke-width="2" />
          <text x="${x}" y="${y}" font-size="12" fill="#92400e" 
                text-anchor="middle" dominant-baseline="middle" text-decoration="underline">${
                  node.label
                }</text>
        `
      }
      return ''
    })
    .join('')}
</svg>`
    },

    adjustPathForExport(path, bounds, padding) {
      if (!path) return ''
      // Xử lý tất cả các lệnh SVG path: M, L, C, Q, S, T, Z
      return path.replace(/([MmLlCcQqSsTtZz])\s*([-\d.]+(?:\s+[-\d.]+)*)/g, (match, command, coords) => {
        if (command.toLowerCase() === 'z') {
          return command // Z không có tọa độ
        }
        
        const numbers = coords.trim().split(/\s+/).map(Number)
        const adjusted = numbers.map((num, index) => {
          if (index % 2 === 0) {
            // X coordinate
            return num - bounds.minX + padding
          } else {
            // Y coordinate
            return num - bounds.minY + padding
          }
        })
        
        return `${command} ${adjusted.join(' ')}`
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

    async exportAsPNG() {
      try {
        this.isExporting = true

        const allElements = [...this.positionedNodes]
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
                  a.download = `activity-diagram-${new Date().getTime()}.png`
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
      const allElements = [...this.positionedNodes]
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
      a.download = `activity-diagram-${new Date().getTime()}.svg`
      a.click()
      URL.revokeObjectURL(url)
    },

    // ============ FULLSCREEN METHODS ============
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

    // ============ AUTO-FIX METHODS ============
    checkNodesOutsideLanes() {
      // Logic này được xử lý trong computed nodesOutsideLaneCount
      // Chỉ cần trigger để computed được tính lại
      this.$forceUpdate()
    },
    
    autoFixNodesInLanes() {
      if (!this.editable || this.previewMode) return
      
      const nodesToFix = []
      const safePadding = 20
      
      this.computedNodes.forEach((node) => {
        if (node.lane_id) {
          const laneIndex = this.getLaneIndex(node.lane_id)
          if (laneIndex !== -1) {
            const laneX = this.getLaneX(laneIndex)
            const laneWidth = this.getLaneWidth()
            const nodeHalfWidth = node.width / 2
            const nodeHalfHeight = node.height / 2
            
            const laneMinX = laneX + safePadding + nodeHalfWidth
            const laneMaxX = laneX + laneWidth - safePadding - nodeHalfWidth
            const laneMinY = this.virtualSpace.minY + this.laneHeaderHeight + nodeHalfHeight + safePadding
            const laneMaxY = this.virtualSpace.minY + this.laneHeaderHeight + this.laneMaxHeight - nodeHalfHeight - safePadding
            
            const isXInLane = node.x >= laneMinX && node.x <= laneMaxX
            const isYInLane = node.y >= laneMinY && node.y <= laneMaxY
            
            if (!isXInLane || !isYInLane) {
              // Tính vị trí mới trong lane
              const newX = laneX + laneWidth / 2
              
              // Tìm Y phù hợp - đặt ở đầu lane hoặc giữa các node khác
              let newY = laneMinY
              
              // Tìm node gần nhất trong cùng lane để đặt phía dưới
              const nodesInSameLane = this.computedNodes.filter(n => 
                n.lane_id === node.lane_id && n.id !== node.id
              )
              
              if (nodesInSameLane.length > 0) {
                const maxY = Math.max(...nodesInSameLane.map(n => n.y))
                newY = Math.min(maxY + 120, laneMaxY)
              }
              
              nodesToFix.push({
                node,
                newPosition: { x: newX, y: newY }
              })
            }
          }
        }
      })
      
      if (nodesToFix.length === 0) {
        this.showAutoFixSuggestion = false
        return
      }
      
      // Cập nhật vị trí cho tất cả nodes
      nodesToFix.forEach(({ node, newPosition }) => {
        node.x = newPosition.x
        node.y = newPosition.y
        
        // Cập nhật position trong original data
        if (node._originalData) {
          if (!node._originalData.position) {
            node._originalData.position = { x: 0, y: 0 }
          }
          node._originalData.position.x = newPosition.x
          node._originalData.position.y = newPosition.y
        }
        
        // Emit event để parent component lưu
        this.$emit('position-updated', {
          element: node,
          type: 'node',
          position: newPosition,
        })
      })
      
      // Ẩn gợi ý sau khi fix
      this.showAutoFixSuggestion = false
      this.autoFixDismissed = true
      
      // Force update để render lại
      this.$forceUpdate()
    },
    
    dismissAutoFixSuggestion() {
      this.showAutoFixSuggestion = false
      this.autoFixDismissed = true
    },

    // ============ UTILITY METHODS ============
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
            case 'g':
              event.preventDefault()
              this.snapToGrid = !this.snapToGrid
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
.activity-diagram-renderer {
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

.activity-diagram-renderer.preview-mode {
  border: 1px solid #e5e7eb;
}

.activity-diagram-renderer.editable-mode {
  border: 2px dashed #d1d5db;
}

.activity-diagram-renderer.fullscreen-mode {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  border-radius: 0;
}

.activity-diagram-renderer.hidden-renderer {
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

.toolbar-btn.active {
  background: #1a365d;
  color: white;
}

.toolbar-btn.active:hover {
  background: #2d4a8a;
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
.activity-container {
  flex: 1;
  overflow: hidden;
  background: #f8fafc;
  position: relative;
  cursor: grab;
}

.activity-container:active {
  cursor: grabbing;
}

.activity-svg {
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

/* Node Styles */
.node-group {
  cursor: pointer;
  transition: all 0.2s ease;
}

.node-group.draggable {
  cursor: grab;
}

.node-group.draggable:active {
  cursor: grabbing;
}

/* .activity-node - Removed pointer-events: none to allow drag events */

.node-start {
  fill: #10b981;
  stroke: #047857;
  stroke-width: 2;
}

.node-end {
  fill: #ef4444;
  stroke: #dc2626;
  stroke-width: 2;
}

.node-action {
  fill: white;
  stroke: #3b82f6;
  stroke-width: 2;
}

.node-decision,
.node-merge {
  fill: white;
  stroke: #8b5cf6;
  stroke-width: 2;
}

.node-fork,
.node-join {
  fill: #6b7280;
  stroke: #374151;
  stroke-width: 2;
}

.node-object {
  fill: white;
  stroke: #f59e0b;
  stroke-width: 2;
}

.node-content {
  pointer-events: none;
}

.node-label {
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  pointer-events: none;
  word-break: break-word;
  padding: 4px;
  box-sizing: border-box;
}

.object-node {
  text-decoration: underline;
}

.swimlane-node {
  font-weight: bold;
}

/* Edge Styles */
.edge-group {
  pointer-events: none;
}

.activity-edge {
  stroke: #374151;
  stroke-width: 2;
  fill: none;
  pointer-events: none;
}

.edge-label {
  font-size: 10px;
  fill: #6b7280;
  pointer-events: none;
}

/* Swimlane Styles */
.swimlanes-layer {
  pointer-events: none;
}

.swimlane-bg {
  fill: transparent;
}

.swimlane-even {
  fill: rgba(229, 231, 235, 0.8);
}

.swimlane-odd {
  fill: rgba(243, 244, 246, 0.8);
}

.swimlane-label {
  font-size: 14px;
  font-weight: 600;
  fill: #6b7280;
  text-anchor: middle;
  dominant-baseline: middle;
}

.swimlane-separator {
  stroke: #d1d5db;
  stroke-width: 2;
}

.swimlane-boundary {
  pointer-events: none;
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

.node-group.selected .activity-node {
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

/* Auto-fix Banner Styles */
.auto-fix-banner {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #f59e0b;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  padding: 12px 20px;
  min-width: 500px;
  max-width: 90%;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.auto-fix-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.auto-fix-content .material-symbols-outlined {
  font-size: 24px;
  color: #f59e0b;
}

.auto-fix-text {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #92400e;
}

.auto-fix-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.auto-fix-btn:hover {
  background: #d97706;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
}

.auto-fix-btn .material-symbols-outlined {
  font-size: 18px;
}

.auto-fix-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #92400e;
  transition: all 0.2s ease;
}

.auto-fix-close:hover {
  background: rgba(146, 64, 14, 0.1);
}

.auto-fix-close .material-symbols-outlined {
  font-size: 20px;
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
  
  .auto-fix-banner {
    min-width: auto;
    width: calc(100% - 32px);
    left: 16px;
    transform: none;
    padding: 10px 16px;
  }
  
  .auto-fix-content {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .auto-fix-text {
    width: 100%;
    font-size: 12px;
  }
  
  .auto-fix-btn {
    flex: 1;
    padding: 6px 12px;
    font-size: 12px;
  }
}

/* Fullscreen specific styles */
:fullscreen .activity-diagram-renderer,
:-webkit-full-screen .activity-diagram-renderer,
:-moz-full-screen .activity-diagram-renderer,
:-ms-fullscreen .activity-diagram-renderer {
  border-radius: 0;
}
</style>