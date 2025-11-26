<template>
  <div class="schema-diagram">
    <!-- Enhanced Controls Panel -->
    <DiagramControls
      :showSortOptions="showSortOptions"
      :currentSort="currentSort"
      :showRelationships="showRelationships"
      :showGrid="showGrid"
      :showMiniMap="showMiniMap"
      :showRelationshipColors="showRelationshipColors"
      :relationshipOnTop="relationshipOnTop"
      :zoomLevel="zoomLevel"
      :isFullscreen="isFullscreen"
      :historyEnabled="historyEnabled"
      :canUndo="canUndo"
      :canRedo="canRedo"
      :historyIndex="historyIndex"
      :history="history"
      :autoSaveEnabled="autoSaveEnabled"
      :isSaving="isSaving"
      :searchQuery="searchQuery"
      @toggle-sort="showSortOptions = !showSortOptions"
      @sort="sortTables"
      @auto-layout="autoLayout"
      @toggle-relationships="toggleRelationships"
      @toggle-grid="toggleGrid"
      @toggle-relationship-colors="toggleRelationshipColors"
      @zoom-out="zoomOut"
      @zoom-in="zoomIn"
      @reset-zoom="resetZoom"
      @toggle-fullscreen="toggleFullscreen"
      @fit-to-screen="fitToScreen"
      @export-as-image="exportAsImage"
      @toggle-mini-map="toggleMiniMap"
      @toggle-relationship-layer="toggleRelationshipLayer"
      @show-relationship-manager="showRelationshipManager"
      @undo="undo"
      @redo="redo"
      @search-change="searchQuery = $event"
    />

    <!-- Main Diagram Container -->
    <DiagramContainer
      ref="diagramContainer"
      :width="diagramWidth"
      :height="diagramHeight"
      :showGrid="showGrid"
      :gridStyle="gridStyle"
      :zoomLevel="zoomLevel"
      :diagramOffset="diagramOffset"
      @wheel="handleWheel"
      @mousedown="handleContainerMouseDown"
      @mousemove="handlePan"
      @mouseup="stopPan"
      @mouseleave="stopPan"
      @contextmenu="showContextMenu"
    >
      <!-- Relationships Layer UNDER Tables -->
      <RelationshipLayer
        v-if="showRelationships && !relationshipOnTop"
        :relationships="visibleRelationships"
        :tables="localTables"
        :zoomLevel="zoomLevel"
        :diagramOffset="diagramOffset"
        :highlightedColumn="highlightedColumn"
        layer="under"
        @relationship-click="selectRelationship"
        @relationship-enter="highlightRelationship"
        @relationship-leave="clearRelationshipHighlight"
      />

      <!-- Tables Container -->
      <div class="tables-container" :style="diagramContainerStyle">
        <TableCard
          v-for="table in filteredTables"
          :key="table._id || table.name"
          :table="table"
          :isHighlighted="isTableHighlighted(table) || table.isHighlighted"
          :isSelected="selectedTable === table.name"
          :isDragging="dragData?.table?.name === table.name"
          :isDimmed="table.isDimmed"
          :isUnrelated="showOnlyRelatedRelationships && !table.isRelated"
          :isHovered="hoveredTable === table.name"
          :zIndex="getTableZIndex(table)"
          @mouseenter="handleTableHover(table, true)"
          @mouseleave="handleTableHover(table, false)"
          @mousedown="startDrag(table, $event)"
          @click="selectTable(table)"
          @dblclick="$emit('table-view', table)"
          @view="$emit('table-view', table)"
          @edit="$emit('table-edit', table)"
          @delete="handleDeleteTable(table)"
          @column-hover="handleColumnHover"
          @column-leave="clearColumnHighlights"
        />
      </div>

      <!-- Relationships Layer ON TOP of Tables -->
      <RelationshipLayer
        v-if="showRelationships && relationshipOnTop"
        :relationships="visibleRelationships"
        :tables="localTables"
        :zoomLevel="zoomLevel"
        :diagramOffset="diagramOffset"
        :highlightedColumn="highlightedColumn"
        layer="over"
        @relationship-click="selectRelationship"
        @relationship-enter="highlightRelationship"
        @relationship-leave="clearRelationshipHighlight"
      />

      <!-- Connection Line khi đang kéo -->
      <svg
        v-if="isConnecting"
        class="connection-line-layer"
        :style="{ width: diagramWidth + 'px', height: diagramHeight + 'px' }"
      >
        <path :d="connectionLinePath" class="connection-line" marker-end="url(#arrowhead-over)" />
      </svg>
    </DiagramContainer>

    <!-- Mini Map -->
    <MiniMap
      v-if="showMiniMap"
      :tables="tables"
      :viewportPosition="viewportPosition"
      :miniMapWidth="miniMapWidth"
      :miniMapHeight="miniMapHeight"
      :miniMapScale="miniMapScale"
      :selectedTable="selectedTable"
    />

    <!-- Relationship Manager Modal -->
    <RelationshipManager
      v-if="showRelationshipModal"
      :editingRelationship="editingRelationship"
      :newRelationship="newRelationship"
      :localTables="localTables"
      :fromTableColumns="fromTableColumns"
      :toTableColumns="toTableColumns"
      :manualRelationships="manualRelationships"
      :isRelationshipValid="isRelationshipValid"
      @close="closeRelationshipManager"
      @update-from-table="handleUpdateFromTable"
      @update-to-table="handleUpdateToTable"
      @update-from-column="newRelationship.from_column = $event"
      @update-to-column="newRelationship.to_column = $event"
      @update-type="newRelationship.type = $event"
      @update-layer="newRelationship.layer = $event"
      @save="saveRelationship"
      @cancel-edit="cancelEditRelationship"
      @edit="editRelationship"
      @delete="deleteRelationship"
    />

    <!-- Context Menu -->
    <ContextMenu
      v-if="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      @add-new-table="addNewTable"
      @auto-layout="autoLayout"
      @clear-selection="clearSelection"
      @export-as-image="exportAsImage"
      @close="hideContextMenu"
    />

    <!-- Debug Info -->
    <div v-if="showDebug" class="debug-info">
      Tables: {{ tables.length }} | Relationships: {{ allRelationships.length }} | Zoom:
      {{ Math.round(zoomLevel * 100) }}% | History: {{ historyIndex + 1 }}/{{ history.length }}
    </div>
  </div>
</template>

<script>
import { debounce } from 'lodash'
import DiagramControls from './components/DiagramControls.vue'
import DiagramContainer from './components/DiagramContainer.vue'
import TableCard from './components/TableCard.vue'
import RelationshipLayer from './components/RelationshipLayer.vue'
import MiniMap from './components/MiniMap.vue'
import RelationshipManager from './components/RelationshipManager.vue'
import ContextMenu from './components/ContextMenu.vue'

export default {
  name: 'DatabaseDiagram',
  components: {
    DiagramControls,
    DiagramContainer,
    TableCard,
    RelationshipLayer,
    MiniMap,
    RelationshipManager,
    ContextMenu,
  },
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
      zoomLevel: 0.5,
      diagramWidth: 2000,
      diagramHeight: 2000,
      dragData: null,
      showDebug: false,
      showSortOptions: false,
      currentSort: null,
      originalTableOrder: [],
      panning: false,
      lastPanPoint: { x: 0, y: 0 },
      diagramOffset: { x: 0, y: 0 },
      showRelationshipColors: true,
      isFullscreen: false,
      showRelationships: true,
      showGrid: true,
      showMiniMap: false,
      relationshipOnTop: true,
      searchQuery: '',
      selectedTable: null,
      selectedRelationship: null,
      highlightedColumn: null,
      highlightedTable: null,
      highlightedRelationship: null,
      selectionRect: null,
      selectionStart: null,
      isConnecting: false,
      connectionStart: null,
      contextMenu: {
        visible: false,
        x: 0,
        y: 0,
      },
      localTables: [],
      miniMapWidth: 200,
      miniMapHeight: 150,
      miniMapScale: 0.05,
      isSaving: false,
      lastSaveTime: null,
      saveQueue: [],
      history: [],
      historyIndex: -1,
      maxHistorySize: 50,
      showRelationshipModal: false,
      editingRelationship: null,
      newRelationship: {
        from_table: '',
        from_column: '',
        to_table: '',
        to_column: '',
        type: 'one-to-many',
        layer: 'over',
      },
      manualRelationships: [],
      focusedTable: null,
      showOnlyRelatedRelationships: false,
      hoveredTable: null,
    }
  },
  computed: {
    tableClasses() {
      const classes = {}
      this.filteredTables.forEach((table) => {
        classes[table.name] = {
          'column-highlighted':
            this.highlightedColumn && this.highlightedColumn.table.name === table.name,
        }
      })
      return classes
    },
    tableFkCounts() {
      const counts = {}
      this.localTables.forEach((table) => {
        counts[table.name] = (table.columns || []).filter((col) => col.is_foreign_key).length
      })
      return counts
    },
    diagramContainerStyle() {
      return {
        transform: `translate(${this.diagramOffset.x}px, ${this.diagramOffset.y}px) scale(${this.zoomLevel})`,
        transformOrigin: '0 0',
      }
    },
    visibleRelationships() {
      if (!this.showOnlyRelatedRelationships || !this.focusedTable) {
        return this.allRelationships
      }

      return this.allRelationships.filter(
        (relationship) =>
          relationship.from_table === this.focusedTable.name ||
          relationship.to_table === this.focusedTable.name
      )
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
              layer: 'under',
            })
          }
        })
      })

      return relationships
    },
    allRelationships() {
      const overRelationships = this.manualRelationships.filter((rel) => rel.layer === 'over')
      const underRelationships = [
        ...this.manualRelationships.filter((rel) => rel.layer === 'under'),
        ...this.autoGeneratedRelationships,
      ]

      const relationships = this.relationshipOnTop
        ? [...underRelationships, ...overRelationships]
        : [...overRelationships, ...underRelationships]

      return relationships.map((rel) => ({
        ...rel,
        isColored: this.showRelationshipColors,
      }))
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
      const container = this.$refs.diagramContainer?.$el
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
    fromTableColumns() {
      if (!this.newRelationship.from_table) return []
      const table = this.localTables.find((t) => t.name === this.newRelationship.from_table)
      return table?.columns || []
    },
    toTableColumns() {
      if (!this.newRelationship.to_table) return []
      const table = this.localTables.find((t) => t.name === this.newRelationship.to_table)
      return table?.columns || []
    },
    isRelationshipValid() {
      return (
        this.newRelationship.from_table &&
        this.newRelationship.from_column &&
        this.newRelationship.to_table &&
        this.newRelationship.to_column &&
        this.newRelationship.from_table !== this.newRelationship.to_table
      )
    },
  },
  watch: {
    tables: {
      handler(newTables) {
        this.localTables = JSON.parse(JSON.stringify(newTables))
        if (this.originalTableOrder.length === 0) {
          this.originalTableOrder = [...this.localTables.map((t) => t.name)]
        }
      },
      deep: true,
      immediate: true,
    },
    relationships: {
      handler(newRelationships) {
        this.manualRelationships = newRelationships.filter((rel) => !rel.auto_generated)
      },
      deep: true,
      immediate: true,
    },
  },
  methods: {
    handleClickOutside(event) {
      if (this.showSortOptions && !this.$el.contains(event.target)) {
        this.showSortOptions = false
      }

      if (this.selectedTable || this.selectedRelationship) {
        const isClickOnTable = event.target.closest('.table-card')
        const isClickOnRelationship = event.target.closest('.relationship-path')
        const isClickOnControls = event.target.closest('.diagram-controls')
        const isClickOnModal = event.target.closest('.modal-content')
        const isClickOnContextMenu = event.target.closest('.context-menu')

        if (
          !isClickOnTable &&
          !isClickOnRelationship &&
          !isClickOnControls &&
          !isClickOnModal &&
          !isClickOnContextMenu
        ) {
          this.clearSelection()
        }
      }
    },
    toggleFullscreen() {
      if (!this.isFullscreen) {
        this.enterFullscreen()
      } else {
        this.exitFullscreen()
      }
    },
    enterFullscreen() {
      const element = this.$refs.diagramContainer?.$el || this.$el

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
    handleFullscreenChange() {
      this.isFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      )

      if (this.isFullscreen) {
        this.fitToScreen()
      }
    },
    showRelationshipManager() {
      this.showRelationshipModal = true
      this.editingRelationship = null
      this.resetNewRelationship()
    },
    closeRelationshipManager() {
      this.showRelationshipModal = false
      this.editingRelationship = null
      this.resetNewRelationship()
    },
    resetNewRelationship() {
      this.newRelationship = {
        from_table: '',
        from_column: '',
        to_table: '',
        to_column: '',
        type: 'one-to-many',
        layer: 'over',
      }
    },
    updateFromColumns() {
      this.newRelationship.from_column = ''
    },
    updateToColumns() {
      this.newRelationship.to_column = ''
    },
    saveRelationship() {
      if (!this.isRelationshipValid) return

      const relationship = {
        ...this.newRelationship,
        _id: this.editingRelationship?._id || `rel_${Date.now()}`,
      }

      if (this.editingRelationship) {
        const index = this.manualRelationships.findIndex(
          (rel) => rel._id === this.editingRelationship._id
        )
        if (index !== -1) {
          this.manualRelationships.splice(index, 1, relationship)
        }
      } else {
        this.manualRelationships.push(relationship)
      }

      this.$emit('relationships-updated', this.manualRelationships)
      this.saveToHistory(this.editingRelationship ? 'Relationship updated' : 'Relationship added')
      this.closeRelationshipManager()
    },
    editRelationship(relationship) {
      this.editingRelationship = relationship
      this.newRelationship = { ...relationship }
    },
    deleteRelationship(relationship) {
      if (confirm('Are you sure you want to delete this relationship?')) {
        this.manualRelationships = this.manualRelationships.filter(
          (rel) => rel._id !== relationship._id
        )

        this.$emit('relationships-updated', this.manualRelationships)
        this.saveToHistory('Relationship deleted')

        if (this.selectedRelationship === relationship) {
          this.selectedRelationship = null
        }
      }
    },
    cancelEditRelationship() {
      this.editingRelationship = null
      this.resetNewRelationship()
    },
    formatRelationshipType(type) {
      const typeMap = {
        'one-to-one': '1:1',
        'one-to-many': '1:N',
        'many-to-one': 'N:1',
        'many-to-many': 'N:N',
      }
      return typeMap[type] || type
    },
    toggleRelationshipLayer() {
      this.relationshipOnTop = !this.relationshipOnTop
    },
    saveToHistory(description = 'Change') {
      if (!this.historyEnabled) return

      if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1)
      }

      const snapshot = {
        description,
        timestamp: new Date(),
        tables: JSON.parse(JSON.stringify(this.localTables)),
        relationships: JSON.parse(JSON.stringify(this.manualRelationships)),
        zoomLevel: this.zoomLevel,
      }

      this.history.push(snapshot)

      if (this.history.length > this.maxHistorySize) {
        this.history.shift()
      }

      this.historyIndex = this.history.length - 1
    },
    undo() {
      if (!this.canUndo) return

      this.historyIndex--
      const snapshot = this.history[this.historyIndex]
      this.applyHistorySnapshot(snapshot)
      // Có thể thêm dòng này nếu muốn lưu undo operation vào history
      // this.saveToHistory('Undo')
    },

    redo() {
      if (!this.canRedo) return

      this.historyIndex++
      const snapshot = this.history[this.historyIndex]
      this.applyHistorySnapshot(snapshot)
      // Có thể thêm dòng này nếu muốn lưu redo operation vào history
      // this.saveToHistory('Redo')
    },
    applyHistorySnapshot(snapshot) {
      this.localTables.forEach((table, index) => {
        if (snapshot.tables[index]) {
          Object.assign(table, snapshot.tables[index])
        }
      })

      this.manualRelationships = snapshot.relationships || []
      this.zoomLevel = snapshot.zoomLevel

      this.$emit('tables-updated', this.localTables)
      this.$emit('relationships-updated', this.manualRelationships)

      // THÊM DÒNG NÀY để kích hoạt auto save
      this.scheduleAutoSave()
    },
    scheduleAutoSave: debounce(function () {
      if (!this.autoSaveEnabled || !this.databaseId) return
      this.savePositionsToServer()
    }, 1000),
    async savePositionsToServer() {
      if (!this.databaseId) return

      this.isSaving = true
      try {
        const positionUpdates = this.localTables.map((table) => ({
          tableName: table.name,
          position: table.position || { x: 0, y: 0 },
        }))

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
      } catch (error) {
        console.error('Failed to save positions:', error)
      } finally {
        this.isSaving = false
      }
    },
    startDrag(table, event) {
      if (event.button !== 0) return

      const container = this.$refs.diagramContainer ? this.$refs.diagramContainer.$el : null
      if (!container) return

      const rect = container.getBoundingClientRect()
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
    },
    autoLayout() {
      this.saveToHistory('Auto layout applied')

      const LAYOUT_CONFIG = {
        TABLE_WIDTH: 240,
        TABLE_HEIGHT: 200,
        MARGIN_X: 100,
        MARGIN_Y: 120,
        GROUP_MARGIN_Y: 200,
        PADDING: 200,
        COLUMNS: 7,
      }

      let layoutGroups = this.groupTablesByRelationships()
      if (layoutGroups.length === 0 && this.localTables.length > 0) {
        layoutGroups = [this.localTables]
      }

      let nextGroupY = LAYOUT_CONFIG.PADDING

      layoutGroups.forEach((group) => {
        let currentX = LAYOUT_CONFIG.PADDING
        let currentY = nextGroupY
        let maxGroupHeight = 0

        group.forEach((table, index) => {
          if (index > 0 && index % LAYOUT_CONFIG.COLUMNS === 0) {
            currentX = LAYOUT_CONFIG.PADDING
            currentY += maxGroupHeight + LAYOUT_CONFIG.MARGIN_Y
            maxGroupHeight = 0
          }

          if (!table.position) {
            this.$set(table, 'position', { x: 0, y: 0 })
          }

          table.position.x = currentX
          table.position.y = currentY

          maxGroupHeight = Math.max(maxGroupHeight, LAYOUT_CONFIG.TABLE_HEIGHT)
          currentX += LAYOUT_CONFIG.TABLE_WIDTH + LAYOUT_CONFIG.MARGIN_X
        })

        nextGroupY = currentY + maxGroupHeight + LAYOUT_CONFIG.GROUP_MARGIN_Y
      })

      this.updateContainerSize()
      this.scheduleAutoSave()
    },
    handleKeydown(event) {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return

      const ctrlKey = event.ctrlKey || event.metaKey

      if (ctrlKey) {
        switch (event.key) {
          case 'z':
            event.preventDefault()
            if (event.shiftKey) {
              this.redo()
            } else {
              this.undo()
            }
            break
          case 'y':
            event.preventDefault()
            this.redo()
            break
          case 'f':
            event.preventDefault()
            this.searchQuery = ''
            setTimeout(() => {
              const searchInput = this.$el.querySelector('.search-input')
              if (searchInput) searchInput.focus()
            }, 100)
            break
          case 'g':
            event.preventDefault()
            this.toggleGrid()
            break
          case 'r':
            event.preventDefault()
            this.toggleRelationships()
            break
          case 'm':
            event.preventDefault()
            this.toggleMiniMap()
            break
          case 'l':
            event.preventDefault()
            this.autoLayout()
            break
          case 'd':
            event.preventDefault()
            this.showDebug = !this.showDebug
            break
        }
      }

      switch (event.key) {
        case 'F11':
          event.preventDefault()
          this.toggleFullscreen()
          break
        case 'Escape':
          if (this.isFullscreen) {
            this.exitFullscreen()
          } else {
            this.clearSelection()
          }
          break
        case 'Delete':
        case 'Backspace':
          if (this.selectedTable) {
            this.$emit('table-delete', this.selectedTable)
            this.selectedTable = null
          }
          break
      }
    },
    handleWheel(event) {
      if (event.ctrlKey) {
        event.preventDefault()

        const container = this.$refs.diagramContainer ? this.$refs.diagramContainer.$el : null
        if (!container) return

        const rect = container.getBoundingClientRect()
        const mouseX = event.clientX - rect.left
        const mouseY = event.clientY - rect.top

        const diagramX = (mouseX - this.diagramOffset.x) / this.zoomLevel
        const diagramY = (mouseY - this.diagramOffset.y) / this.zoomLevel

        // Rất chậm - chỉ 2% mỗi lần scroll (giảm từ 0.1 xuống 0.02)
        const zoomFactor = 0.02
        const zoomDirection = event.deltaY > 0 ? -1 : 1

        const newZoom = this.zoomLevel + zoomDirection * zoomFactor

        this.zoomLevel = Math.max(0.1, Math.min(3, newZoom))

        this.diagramOffset.x = mouseX - diagramX * this.zoomLevel
        this.diagramOffset.y = mouseY - diagramY * this.zoomLevel

        this.updateDiagramTransform()
      }
    },
    updateDiagramTransform() {
      const transform = `translate(${this.diagramOffset.x}px, ${this.diagramOffset.y}px) scale(${this.zoomLevel})`

      // Áp dụng transform cho tables-container
      const tablesContainer = this.$el.querySelector('.tables-container')
      if (tablesContainer) {
        tablesContainer.style.transform = transform
        tablesContainer.style.transformOrigin = '0 0'
      }

      // Áp dụng transform cho relationships layers
      const relationshipLayers = this.$el.querySelectorAll('.relationships-layer')
      relationshipLayers.forEach((layer) => {
        layer.style.transform = transform
        layer.style.transformOrigin = '0 0'
      })
    },
    handleContainerMouseDown(event) {
      if (event.button === 1 || (event.button === 0 && event.ctrlKey)) {
        this.startPan(event)
      }
    },
    zoomIn() {
      const container = this.$refs.diagramContainer ? this.$refs.diagramContainer.$el : null
      if (!container) return

      const rect = container.getBoundingClientRect()
      const centerX = rect.width / 2
      const centerY = rect.height / 2

      const diagramX = (centerX - this.diagramOffset.x) / this.zoomLevel
      const diagramY = (centerY - this.diagramOffset.y) / this.zoomLevel

      // Giảm từ 0.1 xuống 0.05 cho nút zoom
      this.zoomLevel = Math.min(3, this.zoomLevel + 0.05)

      this.diagramOffset.x = centerX - diagramX * this.zoomLevel
      this.diagramOffset.y = centerY - diagramY * this.zoomLevel

      this.updateDiagramTransform()
    },

    zoomOut() {
      const container = this.$refs.diagramContainer ? this.$refs.diagramContainer.$el : null
      if (!container) return

      const rect = container.getBoundingClientRect()
      const centerX = rect.width / 2
      const centerY = rect.height / 2

      const diagramX = (centerX - this.diagramOffset.x) / this.zoomLevel
      const diagramY = (centerY - this.diagramOffset.y) / this.zoomLevel

      // Giảm từ 0.1 xuống 0.05 cho nút zoom
      this.zoomLevel = Math.max(0.1, this.zoomLevel - 0.05)

      this.diagramOffset.x = centerX - diagramX * this.zoomLevel
      this.diagramOffset.y = centerY - diagramY * this.zoomLevel

      this.updateDiagramTransform()
    },

    resetZoom() {
      this.zoomLevel = 0.5
      this.diagramOffset.x = 0
      this.diagramOffset.y = 0
      this.updateDiagramTransform()
    },
    fitToScreen() {
      const container = this.$refs.diagramContainer ? this.$refs.diagramContainer.$el : null
      if (!container) return

      const rect = container.getBoundingClientRect()
      const contentWidth = this.diagramWidth
      const contentHeight = this.diagramHeight

      const scaleX = rect.width / contentWidth
      const scaleY = rect.height / contentHeight

      this.zoomLevel = Math.min(scaleX, scaleY, 1)

      // Center the diagram after fitting
      this.diagramOffset.x = (rect.width - contentWidth * this.zoomLevel) / 2
      this.diagramOffset.y = (rect.height - contentHeight * this.zoomLevel) / 2

      this.updateDiagramTransform()
    },
    selectTable(table) {
      this.selectedTable = table.name
      this.selectedRelationship = null
    },
    selectRelationship(relationship) {
      this.selectedRelationship = relationship
      this.selectedTable = null
    },
    clearSelection() {
      this.selectedTable = null
      this.selectedRelationship = null
      this.clearRelationshipHighlight()
      this.clearColumnHighlights()
      this.focusedTable = null
      this.showOnlyRelatedRelationships = false

      this.localTables.forEach((table) => {
        table.isRelated = true
      })
    },
    highlightTables() {
      if (!this.searchQuery) {
        this.highlightedTable = null
        return
      }

      const query = this.searchQuery.toLowerCase()
      const table = this.localTables.find(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.columns?.some((col) => col.name.toLowerCase().includes(query))
      )

      this.highlightedTable = table || null
    },
    highlightColumnRelationships(column, table) {
      if (!column.is_primary_key && !column.is_foreign_key) {
        return
      }

      this.highlightedColumn = { column, table }
      this.highlightRelatedTables(column, table)
    },
    highlightRelatedTables(column, table) {
      console.log('Highlighting related tables for column:', table.name, column.name)

      this.localTables.forEach((t) => {
        t.isHighlighted = false
      })

      table.isHighlighted = true
      console.log('Highlighted current table:', table.name)

      this.allRelationships.forEach((relationship) => {
        const isFromColumn =
          relationship.from_table === table.name && relationship.from_column === column.name
        const isToColumn =
          relationship.to_table === table.name && relationship.to_column === column.name

        if (isFromColumn || isToColumn) {
          const targetTableName = isFromColumn ? relationship.to_table : relationship.from_table
          const targetTable = this.localTables.find((t) => t.name === targetTableName)

          if (targetTable) {
            console.log('Highlighting related table:', targetTable.name)
            targetTable.isHighlighted = true
          }
        }
      })
    },
    highlightRelationship(relationship) {
      this.highlightedRelationship = relationship
    },
    clearRelationshipHighlight() {
      this.highlightedRelationship = null
    },
    clearColumnHighlights() {
      this.highlightedColumn = null
      this.localTables.forEach((table) => {
        table.isHighlighted = false
      })
      console.log('Cleared all highlights')

      if (this.focusedTable) {
        this.localTables.forEach((t) => {
          const isRelated = this.isTableRelatedToFocused(t)
          t.isRelated = isRelated
        })
      } else {
        this.localTables.forEach((t) => {
          t.isRelated = true
        })
      }
    },
    isTableHighlighted(table) {
      return this.highlightedTable === table || table.name === this.selectedTable
    },
    isColumnHighlighted(column, table) {
      if (!this.highlightedColumn) return false

      return this.highlightedColumn.column === column && this.highlightedColumn.table === table
    },
    isRelationshipHighlighted(relationship) {
      if (!this.highlightedRelationship && !this.highlightedColumn) return false

      if (this.highlightedRelationship === relationship) return true

      if (this.highlightedColumn) {
        const { column, table } = this.highlightedColumn

        return (
          (relationship.from_table === table.name && relationship.from_column === column.name) ||
          (relationship.to_table === table.name && relationship.to_column === column.name)
        )
      }

      return false
    },
    calculateRelationshipPath(relationship) {
      const fromTable = this.localTables.find((t) => t.name === relationship.from_table)
      const toTable = this.localTables.find((t) => t.name === relationship.to_table)

      if (!fromTable || !toTable) return ''

      const fromPos = fromTable.position || { x: 0, y: 0 }
      const toPos = toTable.position || { x: 0, y: 0 }

      const startPoint = this.calculateConnectionPoint(fromPos, toPos, true)
      const endPoint = this.calculateConnectionPoint(toPos, fromPos, false)

      return this.drawOrthogonalPath(startPoint, endPoint)
    },
    calculateConnectionPoint(tablePos, targetPos, isStart) {
      const tableCenter = {
        x: tablePos.x + 150,
        y: tablePos.y + 100,
      }

      const targetCenter = {
        x: targetPos.x + 150,
        y: targetPos.y + 100,
      }

      const dx = targetCenter.x - tableCenter.x
      const dy = targetCenter.y - tableCenter.y

      let side = 'right'

      if (Math.abs(dx) > Math.abs(dy)) {
        side = dx > 0 ? 'right' : 'left'
      } else {
        side = dy > 0 ? 'bottom' : 'top'
      }

      let x, y

      switch (side) {
        case 'top':
          x = tableCenter.x
          y = tablePos.y
          break
        case 'right':
          x = tablePos.x + 300
          y = tableCenter.y
          break
        case 'bottom':
          x = tableCenter.x
          y = tablePos.y + 200
          break
        case 'left':
          x = tablePos.x
          y = tableCenter.y
          break
      }

      return { x, y, side }
    },
    drawOrthogonalPath(startPoint, endPoint) {
      const start = startPoint
      const end = endPoint

      if (start.side === 'right' && end.side === 'left' && Math.abs(start.y - end.y) < 50) {
        return `M ${start.x} ${start.y} L ${end.x} ${end.y}`
      }

      if (start.side === 'left' && end.side === 'right' && Math.abs(start.y - end.y) < 50) {
        return `M ${start.x} ${start.y} L ${end.x} ${end.y}`
      }

      if (start.side === 'top' && end.side === 'bottom' && Math.abs(start.x - end.x) < 50) {
        return `M ${start.x} ${start.y} L ${end.x} ${end.y}`
      }

      if (start.side === 'bottom' && end.side === 'top' && Math.abs(start.x - end.x) < 50) {
        return `M ${start.x} ${start.y} L ${end.x} ${end.y}`
      }

      let path = `M ${start.x} ${start.y}`

      const firstMid = this.getFirstIntermediatePoint(start, end)
      path += ` L ${firstMid.x} ${firstMid.y}`

      const secondMid = this.getSecondIntermediatePoint(firstMid, end, start)
      path += ` L ${secondMid.x} ${secondMid.y}`

      path += ` L ${end.x} ${end.y}`

      return path
    },
    getFirstIntermediatePoint(start, end) {
      const offset = 50

      switch (start.side) {
        case 'top':
          return { x: start.x, y: start.y - offset }
        case 'right':
          return { x: start.x + offset, y: start.y }
        case 'bottom':
          return { x: start.x, y: start.y + offset }
        case 'left':
          return { x: start.x - offset, y: start.y }
        default:
          return { x: start.x, y: start.y }
      }
    },
    getSecondIntermediatePoint(firstMid, end, start) {
      const offset = 50

      let approachPoint = { ...end }

      switch (end.side) {
        case 'top':
          approachPoint.y = end.y - offset
          break
        case 'right':
          approachPoint.x = end.x + offset
          break
        case 'bottom':
          approachPoint.y = end.y + offset
          break
        case 'left':
          approachPoint.x = end.x - offset
          break
      }

      if (start.side === 'top' || start.side === 'bottom') {
        return { x: approachPoint.x, y: firstMid.y }
      } else {
        return { x: firstMid.x, y: approachPoint.y }
      }
    },
    findTargetTableForForeignKey(fkColumn, sourceTableName) {
      const columnName = fkColumn.name.toLowerCase()

      if (fkColumn.references) {
        const targetTable = this.localTables.find((t) => t.name === fkColumn.references)
        if (targetTable) return targetTable
      }

      const baseName = columnName.replace(/_id$/, '').replace(/_fk$/, '').replace(/id$/, '')
      const possibleTargetNames = this.generatePossibleTableNames(baseName)

      return this.localTables.find((table) => {
        if (table.name === sourceTableName) return false

        const tableName = table.name.toLowerCase()

        if (tableName === baseName) return true

        return possibleTargetNames.some(
          (targetName) =>
            tableName === targetName ||
            tableName.includes(targetName) ||
            targetName.includes(tableName)
        )
      })
    },
    generatePossibleTableNames(baseName) {
      const names = new Set()

      names.add(baseName)

      if (baseName.endsWith('y')) {
        names.add(baseName.slice(0, -1) + 'ies')
      } else if (
        baseName.endsWith('s') ||
        baseName.endsWith('x') ||
        baseName.endsWith('z') ||
        baseName.endsWith('ch') ||
        baseName.endsWith('sh')
      ) {
        names.add(baseName + 'es')
      } else {
        names.add(baseName + 's')
      }

      if (baseName.endsWith('man')) {
        names.add(baseName.slice(0, -2) + 'en')
      }

      if (baseName.endsWith('us')) {
        names.add(baseName.slice(0, -2) + 'i')
      }

      if (baseName.endsWith('is')) {
        names.add(baseName.slice(0, -2) + 'es')
      }

      if (baseName.endsWith('on')) {
        names.add(baseName.slice(0, -2) + 'a')
      }

      names.add('tbl_' + baseName)
      names.add('tbl_' + Array.from(names)[1])

      return Array.from(names)
    },
    findPrimaryKeyColumn(table) {
      const pkColumn = (table.columns || []).find((col) => col.is_primary_key)
      return pkColumn ? pkColumn.name : 'id'
    },
    groupTablesByRelationships() {
      const visited = new Set()
      const groups = []

      this.localTables.forEach((table) => {
        if (!visited.has(table.name)) {
          const group = this.getConnectedTables(table, visited)
          groups.push(group)
        }
      })

      return groups
    },
    getConnectedTables(table, visited) {
      const queue = [table]
      const connected = []

      while (queue.length > 0) {
        const current = queue.shift()

        if (visited.has(current.name)) continue
        visited.add(current.name)
        connected.push(current)

        const relatedTables = this.findRelatedTables(current)
        relatedTables.forEach((relatedTable) => {
          if (!visited.has(relatedTable.name)) {
            queue.push(relatedTable)
          }
        })
      }

      return connected
    },
    findRelatedTables(table) {
      const related = new Set()

      this.allRelationships.forEach((relationship) => {
        if (relationship.from_table === table.name) {
          const targetTable = this.localTables.find((t) => t.name === relationship.to_table)
          if (targetTable) related.add(targetTable)
        } else if (relationship.to_table === table.name) {
          const sourceTable = this.localTables.find((t) => t.name === relationship.from_table)
          if (sourceTable) related.add(sourceTable)
        }
      })

      return Array.from(related)
    },
    updateContainerSize() {
      let maxX = 0
      let maxY = 0

      this.localTables.forEach((table) => {
        const pos = table.position || { x: 0, y: 0 }
        maxX = Math.max(maxX, pos.x + 240)
        maxY = Math.max(maxY, pos.y + 200)
      })

      this.diagramWidth = Math.max(2000, maxX + 200)
      this.diagramHeight = Math.max(2000, maxY + 200)
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
      const container = this.$refs.diagramContainer ? this.$refs.diagramContainer.$el : null
      if (!container) return

      try {
        // Note: html2canvas would need to be imported
        const canvas = await html2canvas(container, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          allowTaint: true,
        })

        const link = document.createElement('a')
        link.download = `database-diagram-${new Date().getTime()}.png`
        link.href = canvas.toDataURL()
        link.click()
      } catch (error) {
        console.error('Failed to export image:', error)
        alert('Failed to export image. Please try again.')
      }
    },
    showContextMenu(event) {
      event.preventDefault()

      this.contextMenu = {
        visible: true,
        x: event.clientX,
        y: event.clientY,
      }

      document.addEventListener('click', this.hideContextMenu)
    },
    hideContextMenu() {
      this.contextMenu.visible = false
      document.removeEventListener('click', this.hideContextMenu)
    },
    addNewTable() {
      const newTable = {
        name: `table_${Date.now()}`,
        description: 'New table description',
        columns: [
          {
            name: 'id',
            type: 'int',
            is_primary_key: true,
            nullable: false,
          },
        ],
        position: {
          x: this.contextMenu.x / this.zoomLevel - 120,
          y: this.contextMenu.y / this.zoomLevel - 100,
        },
      }

      this.localTables.push(newTable)
      this.$emit('table-add', newTable)
      this.saveToHistory('Table added')
      this.hideContextMenu()
    },
    handleContainerMouseMove(event) {
      // Handle panning and other mouse interactions
    },
    handleContainerMouseUp() {
      // Handle mouse up events
    },
    handleDeleteTable(table) {
      this.$emit('table-delete', table.name)
    },
    handleTableHover(table, isHovering) {
      if (isHovering) {
        this.focusedTable = table
        this.showOnlyRelatedRelationships = true

        this.localTables.forEach((t) => {
          const isRelated = this.isTableRelatedToFocused(t)
          t.isRelated = isRelated
        })
      } else {
        if (!this.highlightedColumn) {
          this.focusedTable = null
          this.showOnlyRelatedRelationships = false
          this.localTables.forEach((t) => {
            t.isRelated = true
          })
        }
      }
    },
    isTableRelatedToFocused(table) {
      if (!this.focusedTable) return true

      return this.allRelationships.some(
        (relationship) =>
          (relationship.from_table === this.focusedTable.name &&
            relationship.to_table === table.name) ||
          (relationship.to_table === this.focusedTable.name &&
            relationship.from_table === table.name)
      )
    },
    isRelationshipRelated(relationship) {
      if (!this.focusedTable) return true
      return (
        relationship.from_table === this.focusedTable.name ||
        relationship.to_table === this.focusedTable.name
      )
    },
    getTableZIndex(table) {
      if (this.dragData?.table?.name === table.name) return 1000
      if (this.focusedTable === table) return 999
      if (this.selectedTable === table.name) return 998
      if (this.showOnlyRelatedRelationships && !table.isRelated) return 1
      return 10
    },
    sortTables(sortType) {
      this.currentSort = sortType
      this.showSortOptions = false

      this.saveSortPreference(sortType)

      switch (sortType) {
        case 'name-asc':
          this.localTables.sort((a, b) => a.name.localeCompare(b.name))
          break
        case 'name-desc':
          this.localTables.sort((a, b) => b.name.localeCompare(a.name))
          break
        case 'columns-asc':
          this.localTables.sort((a, b) => (a.columns?.length || 0) - (b.columns?.length || 0))
          break
        case 'columns-desc':
          this.localTables.sort((a, b) => (b.columns?.length || 0) - (a.columns?.length || 0))
          break
        case 'fk-asc':
          this.localTables.sort((a, b) => this.tableFkCounts[a.name] - this.tableFkCounts[b.name])
          break
        case 'fk-desc':
          this.localTables.sort((a, b) => this.tableFkCounts[b.name] - this.tableFkCounts[a.name])
          break
        case 'original':
          this.localTables.sort((a, b) => {
            const indexA = this.originalTableOrder.indexOf(a.name)
            const indexB = this.originalTableOrder.indexOf(b.name)
            return indexA - indexB
          })
          break
      }

      this.applySortLayout()
      this.saveToHistory(`Sorted tables by ${this.getSortDisplayName(sortType)}`)
    },
    saveSortPreference(sortType) {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('db-diagram-sort-preference', sortType)
      }
    },
    loadSortPreference() {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedSort = localStorage.getItem('db-diagram-sort-preference')
        if (savedSort) {
          this.currentSort = savedSort
        }
      }
    },
    applySortLayout() {
      const LAYOUT_CONFIG = {
        TABLE_WIDTH: 240,
        TABLE_HEIGHT: 200,
        MARGIN_X: 100,
        MARGIN_Y: 120,
        PADDING: 200,
        COLUMNS: 7,
      }

      let currentX = LAYOUT_CONFIG.PADDING
      let currentY = LAYOUT_CONFIG.PADDING
      let maxHeightInRow = 0

      this.localTables.forEach((table, index) => {
        if (index > 0 && index % LAYOUT_CONFIG.COLUMNS === 0) {
          currentX = LAYOUT_CONFIG.PADDING
          currentY += maxHeightInRow + LAYOUT_CONFIG.MARGIN_Y
          maxHeightInRow = 0
        }

        if (!table.position) {
          this.$set(table, 'position', { x: 0, y: 0 })
        }

        table.position.x = currentX
        table.position.y = currentY

        maxHeightInRow = Math.max(maxHeightInRow, LAYOUT_CONFIG.TABLE_HEIGHT)
        currentX += LAYOUT_CONFIG.TABLE_WIDTH + LAYOUT_CONFIG.MARGIN_X
      })

      this.updateContainerSize()
      this.scheduleAutoSave()
    },
    handleColumnHover(column, table) {
      if (column.is_primary_key || column.is_foreign_key) {
        this.highlightColumnRelationships(column, table)
      }
    },
    getSortDisplayName(sortType) {
      const sortNames = {
        'name-asc': 'A-Z',
        'name-desc': 'Z-A',
        'columns-asc': 'Columns ↑',
        'columns-desc': 'Columns ↓',
        'fk-asc': 'FK ↑',
        'fk-desc': 'FK ↓',
        original: 'Original',
      }
      return sortNames[sortType] || 'Custom'
    },
    startPan(event) {
      this.panning = true
      this.lastPanPoint = { x: event.clientX, y: event.clientY }
      if (this.$refs.diagramContainer && this.$refs.diagramContainer.$el) {
        this.$refs.diagramContainer.$el.style.cursor = 'grabbing'
      }
      event.preventDefault()
    },
    handlePan(event) {
      if (this.panning) {
        const deltaX = event.clientX - this.lastPanPoint.x
        const deltaY = event.clientY - this.lastPanPoint.y

        this.diagramOffset.x += deltaX
        this.diagramOffset.y += deltaY

        this.lastPanPoint = { x: event.clientX, y: event.clientY }
        this.updateDiagramTransform()
      }
    },
    stopPan() {
      this.panning = false
      if (this.$refs.diagramContainer && this.$refs.diagramContainer.$el) {
        this.$refs.diagramContainer.$el.style.cursor = 'grab'
      }
    },
    toggleRelationshipColors() {
      this.showRelationshipColors = !this.showRelationshipColors
    },
    handleUpdateFromTable(value) {
      this.newRelationship.from_table = value
      this.updateFromColumns()
    },
    handleUpdateToTable(value) {
      this.newRelationship.to_table = value
      this.updateToColumns()
    },
  },
  mounted() {
    console.log('All relationships:', this.allRelationships)
    console.log('Local tables:', this.localTables)
    document.addEventListener('keydown', this.handleKeydown)
    document.addEventListener('click', this.handleClickOutside)
    document.addEventListener('fullscreenchange', this.handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange)
    document.addEventListener('msfullscreenchange', this.handleFullscreenChange)

    this.localTables.forEach((table, index) => {
      if (!table.position) {
        this.$set(table, 'position', {
          x: (index % 5) * 300 + 100,
          y: Math.floor(index / 5) * 250 + 100,
        })
      }
    })

    this.originalTableOrder = [...this.localTables.map((t) => t.name)]
    this.updateContainerSize()

    this.updateDiagramTransform()

    this.loadSortPreference()

    if (this.historyEnabled) {
      this.saveToHistory('Initial state')
    }
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.handleKeydown)
    document.removeEventListener('mousemove', this.handleDrag)
    document.removeEventListener('mouseup', this.stopDrag)
    document.removeEventListener('click', this.hideContextMenu)
    document.removeEventListener('click', this.handleClickOutside)
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange)
    document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange)
    document.removeEventListener('msfullscreenchange', this.handleFullscreenChange)
  },
}
</script>

<style scoped>
.schema-diagram {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #f8fafc;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.tables-container {
  position: relative;
  min-width: 2000px;
  min-height: 2000px;
}

.connection-line-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 20;
}

.debug-info {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-family: monospace;
  z-index: 100;
}

/* Fullscreen styles */
.schema-diagram:fullscreen {
  background: white;
  padding: 20px;
}

.schema-diagram:-webkit-full-screen {
  background: white;
  padding: 20px;
}

.schema-diagram:-ms-fullscreen {
  background: white;
  padding: 20px;
}

.schema-diagram:fullscreen .diagram-controls {
  top: 20px;
  left: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.98);
  border: 2px solid #e5e7eb;
}

.schema-diagram:-webkit-full-screen .diagram-controls {
  top: 20px;
  left: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.98);
  border: 2px solid #e5e7eb;
}

.schema-diagram:-ms-fullscreen .diagram-controls {
  top: 20px;
  left: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.98);
  border: 2px solid #e5e7eb;
}

.schema-diagram:fullscreen .diagram-container {
  background: white;
}

.schema-diagram:-webkit-full-screen .diagram-container {
  background: white;
}

.schema-diagram:-ms-fullscreen .diagram-container {
  background: white;
}
</style>