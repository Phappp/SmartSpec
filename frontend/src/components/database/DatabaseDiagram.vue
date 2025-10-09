<template>
  <div class="schema-diagram">
    <!-- Enhanced Controls Panel -->
    <div class="diagram-controls">
      <div class="control-group">
        <button class="btn-icon" @click="autoLayout" title="Auto Layout">
          <span class="material-symbols-outlined">auto_awesome</span>
        </button>
        <button
          class="btn-icon"
          @click="toggleRelationships"
          :title="showRelationships ? 'Hide Relationships' : 'Show Relationships'"
        >
          <span class="material-symbols-outlined">
            {{ showRelationships ? 'link_off' : 'link' }}
          </span>
        </button>
        <button class="btn-icon" @click="toggleGrid" :title="showGrid ? 'Hide Grid' : 'Show Grid'">
          <span class="material-symbols-outlined">
            {{ showGrid ? 'grid_off' : 'grid_on' }}
          </span>
        </button>
      </div>

      <div class="control-group">
        <button class="btn-icon" @click="zoomOut" title="Zoom Out">
          <span class="material-symbols-outlined">zoom_out</span>
        </button>
        <div class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</div>
        <button class="btn-icon" @click="zoomIn" title="Zoom In">
          <span class="material-symbols-outlined">zoom_in</span>
        </button>
        <button class="btn-icon" @click="resetZoom" title="Reset Zoom">
          <span class="material-symbols-outlined">refresh</span>
        </button>
      </div>

      <div class="control-group">
        <button class="btn-icon" @click="fitToScreen" title="Fit to Screen">
          <span class="material-symbols-outlined">fit_screen</span>
        </button>
        <button class="btn-icon" @click="exportAsImage" title="Export as Image">
          <span class="material-symbols-outlined">image</span>
        </button>
        <button
          class="btn-icon"
          @click="toggleMiniMap"
          :title="showMiniMap ? 'Hide Mini Map' : 'Show Mini Map'"
        >
          <span class="material-symbols-outlined">
            {{ showMiniMap ? 'map' : 'map' }}
          </span>
        </button>
      </div>

      <!-- Undo/Redo Controls -->
      <div class="control-group" v-if="historyEnabled">
        <button class="btn-icon" @click="undo" :disabled="!canUndo" title="Undo (Ctrl+Z)">
          <span class="material-symbols-outlined">undo</span>
        </button>
        <button class="btn-icon" @click="redo" :disabled="!canRedo" title="Redo (Ctrl+Y)">
          <span class="material-symbols-outlined">redo</span>
        </button>
        <div class="history-info">{{ historyIndex + 1 }}/{{ history.length }}</div>
      </div>

      <!-- Auto-save Status -->
      <div class="control-group" v-if="autoSaveEnabled">
        <div class="auto-save-status" :class="{ saving: isSaving }">
          <span class="material-symbols-outlined" v-if="isSaving">sync</span>
          <span class="material-symbols-outlined" v-else>check_circle</span>
          {{ isSaving ? 'Saving...' : 'Saved' }}
        </div>
      </div>

      <!-- Search Box -->
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search tables..."
          class="search-input"
          @input="highlightTables"
        />
        <span class="material-symbols-outlined search-icon">search</span>
      </div>
    </div>

    <!-- Main Diagram Container -->
    <div
      class="diagram-container"
      ref="diagramContainer"
      :style="{ width: diagramWidth + 'px', height: diagramHeight + 'px' }"
      @wheel="handleWheel"
      @mousemove="handleContainerMouseMove"
      @mouseup="handleContainerMouseUp"
    >
      <!-- Grid Background -->
      <div v-if="showGrid" class="grid-background" :style="gridStyle"></div>

      <!-- Tables Container với zoom -->
      <div
        class="tables-container"
        :style="diagramContainerStyle"
        @contextmenu.prevent="showContextMenu"
      >
        <!-- Tables -->
        <div
          v-for="table in filteredTables"
          :key="table._id || table.name"
          class="table-card"
          :class="{
            'table-highlighted': isTableHighlighted(table),
            'table-selected': selectedTable === table.name,
            'table-dragging': dragData?.table?.name === table.name,
          }"
          :style="{
            top: (table.position?.y || 0) + 'px',
            left: (table.position?.x || 0) + 'px',
            zIndex: dragData?.table?.name === table.name ? 1000 : 10,
          }"
          @mousedown="startDrag(table, $event)"
          @click.stop="selectTable(table)"
          @dblclick="$emit('table-view', table)"
        >
          <div class="table-header">
            <h4>{{ table.name }}</h4>
            <div class="table-actions">
              <button class="btn-icon" @click="$emit('table-view', table)" title="View Details">
                <span class="material-symbols-outlined">visibility</span>
              </button>
              <button class="btn-icon" @click="$emit('table-edit', table)" title="Edit">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button
                class="btn-icon danger"
                @click="$emit('table-delete', table._id || table.name)"
                title="Delete"
              >
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>

          <div class="table-description" v-if="table.description">
            {{ table.description }}
          </div>

          <div class="table-columns">
            <div
              v-for="column in table.columns || []"
              :key="column.name"
              class="table-column"
              :class="{
                primary: column.is_primary_key,
                foreign: column.is_foreign_key,
                'column-highlighted': isColumnHighlighted(column, table),
              }"
              @mouseenter="highlightColumnRelationships(column, table)"
              @mouseleave="clearColumnHighlights"
            >
              <span class="column-name">{{ column.name }}</span>
              <span class="column-type">
                {{ column.type }}
                <span v-if="column.length">({{ column.length }})</span>
              </span>
              <div class="column-badges">
                <span v-if="column.is_primary_key" class="column-badge pk">PK</span>
                <span v-if="column.is_foreign_key" class="column-badge fk">FK</span>
                <span v-if="!column.nullable" class="column-badge nn">NN</span>
                <span v-if="column.unique" class="column-badge uq">UQ</span>
              </div>
            </div>
          </div>

          <!-- Table Connection Points -->
          <div class="connection-points">
            <div class="connection-point top" data-side="top"></div>
            <div class="connection-point right" data-side="right"></div>
            <div class="connection-point bottom" data-side="bottom"></div>
            <div class="connection-point left" data-side="left"></div>
          </div>
        </div>

        <!-- Selection Rectangle -->
        <div
          v-if="selectionRect"
          class="selection-rectangle"
          :style="{
            left: selectionRect.x + 'px',
            top: selectionRect.y + 'px',
            width: selectionRect.width + 'px',
            height: selectionRect.height + 'px',
          }"
        ></div>
      </div>

      <!-- Relationships Layer -->
      <svg
        v-if="showRelationships"
        class="relationships-layer"
        :style="[
          diagramContainerStyle,
          { width: diagramWidth + 'px', height: diagramHeight + 'px' },
        ]"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" class="arrowhead" />
          </marker>
          <marker
            id="arrowhead-highlighted"
            markerWidth="12"
            markerHeight="9"
            refX="11"
            refY="4.5"
            orient="auto"
          >
            <polygon points="0 0, 12 4.5, 0 9" class="arrowhead-highlighted" />
          </marker>
        </defs>

        <!-- Render relationships -->
        <path
          v-for="(relationship, index) in allRelationships"
          :key="`rel-${index}`"
          :d="calculateRelationshipPath(relationship)"
          class="relationship-path"
          :class="[
            relationship.type,
            {
              'relationship-highlighted': isRelationshipHighlighted(relationship),
              'relationship-selected': selectedRelationship === relationship,
            },
          ]"
          :marker-end="
            isRelationshipHighlighted(relationship)
              ? 'url(#arrowhead-highlighted)'
              : 'url(#arrowhead)'
          "
          @click.stop="selectRelationship(relationship)"
          @mouseenter="highlightRelationship(relationship)"
          @mouseleave="clearRelationshipHighlight"
        />
      </svg>

      <!-- Connection Line khi đang kéo -->
      <svg
        v-if="isConnecting"
        class="connection-line-layer"
        :style="{ width: diagramWidth + 'px', height: diagramHeight + 'px' }"
      >
        <path :d="connectionLinePath" class="connection-line" marker-end="url(#arrowhead)" />
      </svg>
    </div>

    <!-- Mini Map -->
    <div v-if="showMiniMap" class="mini-map">
      <div
        class="mini-map-content"
        :style="{
          width: miniMapWidth + 'px',
          height: miniMapHeight + 'px',
          transform: `scale(${miniMapScale})`,
        }"
      >
        <div
          v-for="table in tables"
          :key="table._id || table.name"
          class="mini-table"
          :style="{
            left: (table.position?.x || 0) * miniMapScale + 'px',
            top: (table.position?.y || 0) * miniMapScale + 'px',
            width: '4px',
            height: '3px',
            backgroundColor: selectedTable === table.name ? '#3b82f6' : '#6b7280',
          }"
        ></div>
        <div
          class="mini-viewport"
          :style="{
            left: viewportPosition.x + 'px',
            top: viewportPosition.y + 'px',
            width: viewportPosition.width + 'px',
            height: viewportPosition.height + 'px',
          }"
        ></div>
      </div>
    </div>

    <!-- Context Menu -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{
        left: contextMenu.x + 'px',
        top: contextMenu.y + 'px',
      }"
    >
      <div class="context-menu-item" @click="addNewTable">Add New Table</div>
      <div class="context-menu-item" @click="autoLayout">Auto Layout</div>
      <div class="context-menu-item" @click="clearSelection">Clear Selection</div>
      <div class="context-menu-item" @click="exportAsImage">Export as Image</div>
    </div>

    <!-- Debug Info -->
    <div v-if="showDebug" class="debug-info">
      Tables: {{ tables.length }} | Relationships: {{ allRelationships.length }} | Zoom:
      {{ Math.round(zoomLevel * 100) }}% | History: {{ historyIndex + 1 }}/{{ history.length }}
    </div>
  </div>
</template>

<script>
import html2canvas from 'html2canvas'
import { debounce } from 'lodash'

export default {
  name: 'DatabaseDiagram',
  props: {
    tables: {
      type: Array,
      default: () => [],
    },
    relationships: {
      type: Array,
      default: () => [],
    },
    databaseId: {
      type: String,
      default: null,
    },
    autoSaveEnabled: {
      type: Boolean,
      default: true,
    },
    historyEnabled: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      zoomLevel: 1,
      diagramWidth: 2000,
      diagramHeight: 2000,
      dragData: null,
      showDebug: false,

      // New features
      showRelationships: true,
      showGrid: true,
      showMiniMap: false,
      searchQuery: '',
      selectedTable: null,
      selectedRelationship: null,
      highlightedColumn: null,
      highlightedTable: null,
      highlightedRelationship: null,

      // Selection
      selectionRect: null,
      selectionStart: null,

      // Connection
      isConnecting: false,
      connectionStart: null,

      // Context Menu
      contextMenu: {
        visible: false,
        x: 0,
        y: 0,
      },
      localTables: [],

      // Mini Map
      miniMapWidth: 200,
      miniMapHeight: 150,
      miniMapScale: 0.05,

      // Auto-save
      isSaving: false,
      lastSaveTime: null,
      saveQueue: [],

      // History (Undo/Redo)
      history: [],
      historyIndex: -1,
      maxHistorySize: 50,
    }
  },
  computed: {
    diagramContainerStyle() {
      return {
        transform: `scale(${this.zoomLevel})`,
        transformOrigin: '0 0',
      }
    },

    gridStyle() {
      const size = 20 * this.zoomLevel
      return {
        backgroundSize: `${size}px ${size}px`,
        backgroundImage: `linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                         linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)`,
      }
    },

    autoGeneratedRelationships() {
      const relationships = []

      this.localTables.forEach((table) => {
        const foreignKeys = (table.columns || []).filter((col) => col.is_foreign_key)

        foreignKeys.forEach((fkColumn) => {
          const targetTable = this.findTargetTableForForeignKey(fkColumn, table.name)

          if (targetTable) {
            relationships.push({
              from_table: table.name,
              to_table: targetTable.name,
              from_column: fkColumn.name,
              to_column: this.findPrimaryKeyColumn(targetTable),
              type: 'many-to-one',
              auto_generated: true,
            })
          }
        })
      })

      return relationships
    },

    allRelationships() {
      const manualRelationships = this.relationships.filter((rel) => {
        const fromTable = this.localTables.find((t) => t.name === rel.from_table)
        const toTable = this.localTables.find((t) => t.name === rel.to_table)
        return fromTable && toTable
      })

      return [...manualRelationships, ...this.autoGeneratedRelationships]
    },

    filteredTables() {
      if (!this.searchQuery) return this.localTables

      const query = this.searchQuery.toLowerCase()
      return this.localTables.filter(
        (table) =>
          table.name.toLowerCase().includes(query) ||
          table.description?.toLowerCase().includes(query) ||
          table.columns?.some((col) => col.name.toLowerCase().includes(query))
      )
    },

    connectionLinePath() {
      if (!this.connectionStart) return ''

      const endX = this.connectionStart.endX
      const endY = this.connectionStart.endY

      return `M ${this.connectionStart.x} ${this.connectionStart.y} L ${endX} ${endY}`
    },

    viewportPosition() {
      const container = this.$refs.diagramContainer
      if (!container) return { x: 0, y: 0, width: 0, height: 0 }

      const rect = container.getBoundingClientRect()
      return {
        x: (rect.left / this.zoomLevel) * this.miniMapScale,
        y: (rect.top / this.zoomLevel) * this.miniMapScale,
        width: (rect.width / this.zoomLevel) * this.miniMapScale,
        height: (rect.height / this.zoomLevel) * this.miniMapScale,
      }
    },

    canUndo() {
      return this.historyIndex > 0
    },

    canRedo() {
      return this.historyIndex < this.history.length - 1
    },
  },
  watch: {
    tables: {
      // Khi prop 'tables' từ cha thay đổi...
      handler(newTables) {
        // ...tạo một bản sao hoàn toàn mới để phá vỡ tham chiếu
        this.localTables = JSON.parse(JSON.stringify(newTables))
      },
      deep: true, // Theo dõi sự thay đổi sâu bên trong mảng
      immediate: true, // Chạy ngay lần đầu khi component được tạo
    },
  },
  methods: {
    // ========== HISTORY MANAGEMENT ==========
    saveToHistory(description = 'Change') {
      if (!this.historyEnabled) return

      // Remove future history if we're not at the end
      if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1)
      }

      const snapshot = {
        description,
        timestamp: new Date(),
        tables: JSON.parse(JSON.stringify(this.localTables)),
        zoomLevel: this.zoomLevel,
      }

      this.history.push(snapshot)

      // Limit history size
      if (this.history.length > this.maxHistorySize) {
        this.history.shift()
      }

      this.historyIndex = this.history.length - 1
      console.log(`History saved: ${description} (${this.historyIndex + 1}/${this.history.length})`)
    },

    undo() {
      if (!this.canUndo) return

      this.isLoadingHistory = true
      this.historyIndex--
      const snapshot = this.history[this.historyIndex]

      this.applyHistorySnapshot(snapshot)
      console.log(`Undo: ${snapshot.description}`)

      this.$nextTick(() => {
        this.isLoadingHistory = false
      })
    },

    redo() {
      if (!this.canRedo) return

      this.isLoadingHistory = true
      this.historyIndex++
      const snapshot = this.history[this.historyIndex]

      this.applyHistorySnapshot(snapshot)
      console.log(`Redo: ${snapshot.description}`)

      this.$nextTick(() => {
        this.isLoadingHistory = false
      })
    },

    applyHistorySnapshot(snapshot) {
      // Update tables
      this.localTables.forEach((table, index) => {
        if (snapshot.tables[index]) {
          Object.assign(table, snapshot.tables[index])
        }
      })

      // Update zoom
      this.zoomLevel = snapshot.zoomLevel

      // Emit update
      this.$emit('tables-updated', this.localTables)
    },

    // ========== AUTO-SAVE ==========
    scheduleAutoSave: debounce(function () {
      if (!this.autoSaveEnabled || !this.databaseId) return

      this.savePositionsToServer()
    }, 1000), // Debounce 1 second

    async savePositionsToServer() {
      if (!this.databaseId) return

      this.isSaving = true
      try {
        const positionUpdates = this.localTables.map((table) => ({
          tableName: table.name,
          position: table.position || { x: 0, y: 0 },
        }))

        console.log('📤 Sending position updates:', positionUpdates)

        // QUAN TRỌNG: Đợi kết quả thực tế từ parent component
        await new Promise((resolve, reject) => {
          this.$emit(
            'save-positions',
            {
              databaseId: this.databaseId,
              positionUpdates,
            },
            (success) => {
              if (success) {
                resolve()
              } else {
                reject(new Error('Failed to save positions'))
              }
            }
          )
        })

        this.lastSaveTime = new Date()
        console.log('✅ Positions saved successfully')
      } catch (error) {
        console.error('❌ Failed to save positions:', error)
        // Có thể hiển thị thông báo lỗi cho user
      } finally {
        this.isSaving = false
      }
    },

    // ========== ENHANCED DRAG AND DROP ==========
    startDrag(table, event) {
      if (event.button !== 0) return

      const rect = this.$refs.diagramContainer.getBoundingClientRect()
      const scale = this.zoomLevel

      this.dragData = {
        table,
        startX: table.position?.x || 0,
        startY: table.position?.y || 0,
        offsetX: (event.clientX - rect.left) / scale - (table.position?.x || 0),
        offsetY: (event.clientY - rect.top) / scale - (table.position?.y || 0),
        containerRect: rect,
        scale: scale,
      }

      document.addEventListener('mousemove', this.handleDrag)
      document.addEventListener('mouseup', this.stopDrag)

      event.preventDefault()
      event.stopPropagation()
    },

    handleDrag(event) {
      if (this.dragData) {
        if (!this.dragData.table.position) {
          this.$set(this.dragData.table, 'position', { x: 0, y: 0 })
        }

        const scale = this.zoomLevel
        const rect = this.dragData.containerRect

        this.dragData.table.position.x = (event.clientX - rect.left) / scale - this.dragData.offsetX
        this.dragData.table.position.y = (event.clientY - rect.top) / scale - this.dragData.offsetY

        this.updateContainerSize()
      }
    },

    stopDrag() {
      if (this.dragData) {
        // Save to history if position changed
        const finalX = this.dragData.table.position?.x || 0
        const finalY = this.dragData.table.position?.y || 0

        if (finalX !== this.dragData.startX || finalY !== this.dragData.startY) {
          this.saveToHistory(`Moved ${this.dragData.table.name}`)
          this.scheduleAutoSave()
        }

        this.dragData = null
      }

      document.removeEventListener('mousemove', this.handleDrag)
      document.removeEventListener('mouseup', this.stopDrag)

      // this.$emit('tables-updated', this.localTables)
    },

    // ========== ENHANCED AUTO-LAYOUT ==========
    autoLayout() {
      this.saveToHistory('Auto layout applied')

      const tableWidth = 240
      const tableHeight = 200
      const margin = 100

      const groups = this.groupTablesByRelationships()

      let currentX = 50
      let currentY = 50
      let maxRowHeight = 0

      groups.forEach((group, groupIndex) => {
        group.forEach((table, tableIndex) => {
          if (!table.position) {
            this.$set(table, 'position', { x: 0, y: 0 })
          }

          table.position.x = currentX
          table.position.y = currentY

          currentX += tableWidth + margin
          maxRowHeight = Math.max(maxRowHeight, tableHeight)

          if ((tableIndex + 1) % 3 === 0) {
            currentX = 50
            currentY += maxRowHeight + margin
            maxRowHeight = 0
          }
        })

        if (groupIndex < groups.length - 1) {
          currentX = 50
          currentY += maxRowHeight + margin * 2
          maxRowHeight = 0
        }
      })

      if (groups.length === 0) {
        this.localTables.forEach((table, index) => {
          if (!table.position) {
            this.$set(table, 'position', { x: 0, y: 0 })
          }
          const row = Math.floor(index / 4)
          const col = index % 4
          table.position.x = col * (tableWidth + margin) + 50
          table.position.y = row * (tableHeight + margin) + 50
        })
      }

      this.updateContainerSize()
      this.scheduleAutoSave()
      // this.$emit('tables-updated', this.localTables)
    },

    // ========== KEYBOARD SHORTCUTS ==========
    handleKeydown(event) {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'z':
            event.preventDefault()
            if (!event.shiftKey) this.undo()
            break
          case 'y':
            event.preventDefault()
            this.redo()
            break
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
            this.fitToScreen()
            break
        }
      }

      if (event.key === 'Escape') {
        this.clearSelection()
      }
    },

    // ========== EXISTING METHODS (giữ nguyên) ==========
    handleWheel(event) {
      if (event.ctrlKey) {
        event.preventDefault()
        const delta = event.deltaY > 0 ? -0.1 : 0.1
        this.zoomLevel = Math.max(0.3, Math.min(2, this.zoomLevel + delta))
      }
    },

    handleContainerMouseMove(event) {
      if (this.selectionStart) {
        const rect = this.$refs.diagramContainer.getBoundingClientRect()
        const scale = this.zoomLevel

        const currentX = (event.clientX - rect.left) / scale
        const currentY = (event.clientY - rect.top) / scale

        this.selectionRect = {
          x: Math.min(this.selectionStart.x, currentX),
          y: Math.min(this.selectionStart.y, currentY),
          width: Math.abs(currentX - this.selectionStart.x),
          height: Math.abs(currentY - this.selectionStart.y),
        }
      }
    },

    handleContainerMouseUp() {
      this.selectionStart = null
      this.selectionRect = null
    },

    selectTable(table) {
      this.selectedTable = table.name
      this.selectedRelationship = null
      this.$emit('table-selected', table)
    },

    selectRelationship(relationship) {
      this.selectedRelationship = relationship
      this.selectedTable = null
      this.$emit('relationship-selected', relationship)
    },

    clearSelection() {
      this.selectedTable = null
      this.selectedRelationship = null
    },

    isTableHighlighted(table) {
      return (
        this.highlightedTable === table.name ||
        (this.searchQuery && table.name.toLowerCase().includes(this.searchQuery.toLowerCase()))
      )
    },

    isColumnHighlighted(column, table) {
      return (
        this.highlightedColumn?.table === table.name &&
        this.highlightedColumn?.column === column.name
      )
    },

    isRelationshipHighlighted(relationship) {
      return this.highlightedRelationship === relationship
    },

    highlightColumnRelationships(column, table) {
      if (column.is_foreign_key || column.is_primary_key) {
        this.highlightedColumn = { table: table.name, column: column.name }
      }
    },

    highlightRelationship(relationship) {
      this.highlightedRelationship = relationship
    },

    clearColumnHighlights() {
      this.highlightedColumn = null
    },

    clearRelationshipHighlight() {
      this.highlightedRelationship = null
    },

    highlightTables() {
      // Search highlighting is handled in computed properties
    },

    showContextMenu(event) {
      const rect = this.$refs.diagramContainer.getBoundingClientRect()
      this.contextMenu = {
        visible: true,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }

      document.addEventListener('click', this.hideContextMenu)
    },

    hideContextMenu() {
      this.contextMenu.visible = false
      document.removeEventListener('click', this.hideContextMenu)
    },

    addNewTable() {
      const newTable = {
        name: `new_table_${Date.now()}`,
        description: 'New table',
        position: {
          x: this.contextMenu.x / this.zoomLevel,
          y: this.contextMenu.y / this.zoomLevel,
        },
        columns: [],
      }

      this.$emit('table-add', newTable)
      this.hideContextMenu()
    },

    toggleRelationships() {
      this.showRelationships = !this.showRelationships
    },

    toggleGrid() {
      this.showGrid = !this.showGrid
    },

    toggleMiniMap() {
      this.showMiniMap = !this.showMiniMap
    },

    async exportAsImage() {
      try {
        const element = this.$refs.diagramContainer
        const canvas = await html2canvas(element, {
          backgroundColor: '#f8fafc',
          scale: 2,
          useCORS: true,
        })

        const link = document.createElement('a')
        link.download = `database-diagram-${new Date().toISOString().split('T')[0]}.png`
        link.href = canvas.toDataURL()
        link.click()
      } catch (error) {
        console.error('Export failed:', error)
        alert('Export failed. Please try again.')
      }
    },

    fitToScreen() {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity

      this.localTables.forEach((table) => {
        if (table.position) {
          minX = Math.min(minX, table.position.x)
          minY = Math.min(minY, table.position.y)
          maxX = Math.max(maxX, table.position.x + 240)
          maxY = Math.max(maxY, table.position.y + 200)
        }
      })

      if (minX !== Infinity) {
        const container = this.$refs.diagramContainer.parentElement
        const containerWidth = container.clientWidth
        const containerHeight = container.clientHeight

        const contentWidth = maxX - minX
        const contentHeight = maxY - minY

        const scaleX = containerWidth / contentWidth
        const scaleY = containerHeight / contentHeight

        this.zoomLevel = Math.min(scaleX, scaleY, 1) * 0.9
      }
    },

    findTargetTableForForeignKey(fkColumn, sourceTableName) {
      let possibleTableName = fkColumn.name
        .replace(/_id$/, '')
        .replace(/Id$/, '')
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()

      if (!possibleTableName.endsWith('s')) {
        possibleTableName += 's'
      }

      let targetTable = this.localTables.find(
        (t) =>
          t.name.toLowerCase() === possibleTableName.toLowerCase() && t.name !== sourceTableName
      )

      if (!targetTable) {
        targetTable = this.localTables.find((t) => {
          if (t.name === sourceTableName) return false
          const pkColumn = (t.columns || []).find((col) => col.is_primary_key)
          return pkColumn && this.isForeignKeyMatch(fkColumn, pkColumn)
        })
      }

      return targetTable
    },

    isForeignKeyMatch(fkColumn, pkColumn) {
      return fkColumn.type === pkColumn.type
    },

    findPrimaryKeyColumn(table) {
      const pkColumn = (table.columns || []).find((col) => col.is_primary_key)
      return pkColumn ? pkColumn.name : 'id'
    },

    calculateRelationshipPath(relationship) {
      const fromTable = this.localTables.find((t) => t.name === relationship.from_table)
      const toTable = this.localTables.find((t) => t.name === relationship.to_table)

      if (!fromTable || !toTable) {
        console.warn('Missing table for relationship:', relationship)
        return ''
      }

      const fromX = fromTable.position?.x || 0
      const fromY = fromTable.position?.y || 0
      const toX = toTable.position?.x || 0
      const toY = toTable.position?.y || 0

      const tableWidth = 240
      const tableHeight = 200

      const fromCenterX = fromX + tableWidth / 2
      const fromCenterY = fromY + tableHeight / 2
      const toCenterX = toX + tableWidth / 2
      const toCenterY = toY + tableHeight / 2

      const dx = toCenterX - fromCenterX
      const dy = toCenterY - fromCenterY

      let startX, startY, endX, endY

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
          startX = fromX + tableWidth
          startY = fromY + tableHeight / 2
          endX = toX
          endY = toY + tableHeight / 2
        } else {
          startX = fromX
          startY = fromY + tableHeight / 2
          endX = toX + tableWidth
          endY = toY + tableHeight / 2
        }
      } else {
        if (dy > 0) {
          startX = fromX + tableWidth / 2
          startY = fromY + tableHeight
          endX = toX + tableWidth / 2
          endY = toY
        } else {
          startX = fromX + tableWidth / 2
          startY = fromY
          endX = toX + tableWidth / 2
          endY = toY + tableHeight
        }
      }

      const midX = (startX + endX) / 2
      const midY = (startY + endY) / 2

      let controlX1, controlY1, controlX2, controlY2

      if (Math.abs(dx) > Math.abs(dy)) {
        controlX1 = startX + (endX - startX) * 0.5
        controlY1 = startY
        controlX2 = startX + (endX - startX) * 0.5
        controlY2 = endY
      } else {
        controlX1 = startX
        controlY1 = startY + (endY - startY) * 0.5
        controlX2 = endX
        controlY2 = startY + (endY - startY) * 0.5
      }

      return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`
    },

    groupTablesByRelationships() {
      if (this.allRelationships.length === 0) return []

      const groups = []
      const visited = new Set()

      const findConnectedTables = (tableName, group) => {
        if (visited.has(tableName)) return
        visited.add(tableName)

        const table = this.localTables.find((t) => t.name === tableName)
        if (table) group.push(table)

        this.allRelationships.forEach((rel) => {
          if (rel.from_table === tableName && !visited.has(rel.to_table)) {
            findConnectedTables(rel.to_table, group)
          }
          if (rel.to_table === tableName && !visited.has(rel.from_table)) {
            findConnectedTables(rel.from_table, group)
          }
        })
      }

      this.allRelationships.forEach((rel) => {
        if (!visited.has(rel.from_table)) {
          const group = []
          findConnectedTables(rel.from_table, group)
          if (group.length > 0) groups.push(group)
        }
      })

      this.localTables.forEach((table) => {
        if (!visited.has(table.name)) {
          groups.push([table])
        }
      })

      return groups
    },

    zoomIn() {
      this.zoomLevel = Math.min(this.zoomLevel + 0.1, 2)
    },

    zoomOut() {
      this.zoomLevel = Math.max(this.zoomLevel - 0.1, 0.3)
    },

    resetZoom() {
      this.zoomLevel = 1
    },

    updateContainerSize() {
      let maxX = 0
      let maxY = 0

      this.localTables.forEach((table) => {
        if (table.position) {
          maxX = Math.max(maxX, table.position.x + 300)
          maxY = Math.max(maxY, table.position.y + 250)
        }
      })

      this.diagramWidth = Math.max(2000, maxX + 200)
      this.diagramHeight = Math.max(2000, maxY + 200)
    },
  },
  mounted() {
    console.log('Enhanced DatabaseDiagram mounted with auto-save and history')

    // Initialize history with current state
    this.saveToHistory('Initial state')
    this.isInitialized = true

    if (this.localTables.length > 0) {
      this.$nextTick(() => {
        // CHỈ autoLayout nếu tables chưa có position
        const hasExistingPositions = this.localTables.some(
          (table) => table.position && (table.position.x !== 0 || table.position.y !== 0)
        )

        if (!hasExistingPositions) {
          this.autoLayout()
        }
        this.updateContainerSize()
      })
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeydown)
  },

  beforeUnmount() {
    document.removeEventListener('keydown', this.handleKeydown)
  },
}
</script>

<style scoped>
/* Enhanced CSS với các style mới cho history và auto-save */
.schema-diagram {
  padding: 20px;
  min-height: 600px;
  background: #f8fafc;
  position: relative;
  overflow: hidden;
  border-radius: 0 0 12px 12px;
}

.diagram-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 600px;
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: grab;
}

.diagram-container:active {
  cursor: grabbing;
}

.diagram-controls {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 16px;
  align-items: center;
  z-index: 1000;
  background: white;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #e5e7eb;
}

.control-group {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 0 8px;
  border-right: 1px solid #f3f4f6;
}

.control-group:last-child {
  border-right: none;
}

.zoom-level {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 600;
  min-width: 50px;
  text-align: center;
}

.history-info {
  font-size: 0.7rem;
  color: #6b7280;
  min-width: 40px;
  text-align: center;
}

.auto-save-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #10b981;
}

.auto-save-status.saving {
  color: #f59e0b;
}

.auto-save-status .material-symbols-outlined {
  font-size: 1rem;
}

/* Search Box */
.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  padding: 8px 32px 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.875rem;
  width: 200px;
  background: white;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-icon {
  position: absolute;
  right: 8px;
  color: #9ca3af;
  font-size: 1.125rem;
}

/* Grid Background */
.grid-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.3;
}

.btn-icon {
  padding: 8px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover:not(:disabled) {
  background: #f3f4f6;
  color: #374151;
  transform: translateY(-1px);
}

.btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.btn-icon.danger:hover {
  background: #fef2f2;
  color: #ef4444;
}

/* Các style khác giữ nguyên... */
.tables-container {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  transition: transform 0.2s ease;
  z-index: 20;
}

.table-card {
  position: absolute;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  width: 240px;
  cursor: move;
  transition: all 0.2s ease;
  z-index: 10;
  user-select: none;
}

.table-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.table-card.table-highlighted {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.table-card.table-selected {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.table-card.table-dragging {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 1000;
}

.table-header {
  padding: 12px;
  background: #1a365d;
  color: white;
  border-radius: 8px 8px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-header h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.table-actions {
  display: flex;
  gap: 4px;
}

.table-description {
  padding: 8px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.4;
}

.table-columns {
  padding: 8px 0;
  max-height: 300px;
  overflow-y: auto;
}

.table-column {
  padding: 6px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  transition: all 0.2s ease;
}

.table-column:last-child {
  border-bottom: none;
}

.table-column.primary {
  background: #f0f9ff;
}

.table-column.foreign {
  background: #fef7ff;
}

.table-column.column-highlighted {
  background: #fff7ed;
  border-left: 3px solid #f59e0b;
}

.column-name {
  font-weight: 500;
  color: #1f2937;
  flex: 1;
}

.column-type {
  color: #6b7280;
  font-family: 'Courier New', monospace;
  font-size: 0.7rem;
  margin-right: 8px;
}

.column-badges {
  display: flex;
  gap: 2px;
}

.column-badge {
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 0.6rem;
  font-weight: 600;
  color: white;
}

.column-badge.pk {
  background: #3b82f6;
}

.column-badge.fk {
  background: #8b5cf6;
}

.column-badge.nn {
  background: #ef4444;
}

.column-badge.uq {
  background: #10b981;
}

/* Connection Points */
.connection-points {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.connection-point {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #3b82f6;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.table-card:hover .connection-point {
  opacity: 1;
}

.connection-point.top {
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
}

.connection-point.right {
  right: -4px;
  top: 50%;
  transform: translateY(-50%);
}

.connection-point.bottom {
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
}

.connection-point.left {
  left: -4px;
  top: 50%;
  transform: translateY(-50%);
}

/* Relationships Layer */
.relationships-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 15;
  transform-origin: 0 0;
  transition: transform 0.2s ease;
}

.relationship-path {
  fill: none;
  stroke-width: 2;
  transition: all 0.2s ease;
  pointer-events: visibleStroke;
  cursor: pointer;
}

.relationship-path:hover {
  stroke-width: 3;
}

.relationship-path.relationship-highlighted {
  stroke-width: 4;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.relationship-path.relationship-selected {
  stroke-width: 4;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.relationship-path.one-to-one {
  stroke: #3b82f6;
}

.relationship-path.one-to-many {
  stroke: #10b981;
}

.relationship-path.many-to-one {
  stroke: #f59e0b;
}

.relationship-path.many-to-many {
  stroke: #8b5cf6;
}

.arrowhead {
  fill: #6b7280;
}

.arrowhead-highlighted {
  fill: #f59e0b;
}

/* Connection Line */
.connection-line-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 25;
}

.connection-line {
  fill: none;
  stroke: #ef4444;
  stroke-width: 2;
  stroke-dasharray: 5, 5;
}

/* Selection Rectangle */
.selection-rectangle {
  position: absolute;
  background: rgba(59, 130, 246, 0.1);
  border: 2px solid #3b82f6;
  border-radius: 4px;
  pointer-events: none;
  z-index: 30;
}

/* Mini Map */
.mini-map {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
}

.mini-map-content {
  position: relative;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.mini-table {
  position: absolute;
  border-radius: 1px;
  transition: all 0.2s ease;
}

.mini-viewport {
  position: absolute;
  border: 2px solid #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  pointer-events: none;
}

/* Context Menu */
.context-menu {
  position: absolute;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 160px;
}

.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f3f4f6;
}

.context-menu-item:last-child {
  border-bottom: none;
}

.context-menu-item:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.debug-info {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  z-index: 100;
}

/* Responsive design */
@media (max-width: 768px) {
  .diagram-controls {
    top: 10px;
    right: 10px;
    flex-direction: column;
    gap: 8px;
  }

  .control-group {
    border-right: none;
    border-bottom: 1px solid #f3f4f6;
    padding: 4px 0;
  }

  .control-group:last-child {
    border-bottom: none;
  }

  .search-input {
    width: 150px;
  }

  .table-card {
    width: 200px;
  }

  .mini-map {
    bottom: 10px;
    right: 10px;
    transform: scale(0.8);
    transform-origin: bottom right;
  }
}
</style>