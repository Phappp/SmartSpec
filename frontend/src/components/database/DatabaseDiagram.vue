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

      <!-- Relationship Controls -->
      <div class="control-group">
        <button
          class="btn-icon"
          @click="toggleRelationshipLayer"
          :title="relationshipOnTop ? 'Relationships on Top' : 'Relationships Under Tables'"
        >
          <span class="material-symbols-outlined">
            {{ relationshipOnTop ? 'layers' : 'layers_clear' }}
          </span>
        </button>
        <button class="btn-icon" @click="showRelationshipManager" title="Manage Relationships">
          <span class="material-symbols-outlined">settings</span>
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

      <!-- Relationships Layer UNDER Tables -->
      <svg
        v-if="showRelationships && !relationshipOnTop"
        class="relationships-layer relationships-under"
        :style="[
          diagramContainerStyle,
          { width: diagramWidth + 'px', height: diagramHeight + 'px' },
        ]"
      >
        <defs>
          <marker
            id="arrowhead-under"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" class="arrowhead" />
          </marker>
          <marker
            id="arrowhead-highlighted-under"
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
          :key="`rel-under-${index}`"
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
              ? 'url(#arrowhead-highlighted-under)'
              : 'url(#arrowhead-under)'
          "
          @click.stop="selectRelationship(relationship)"
          @mouseenter="highlightRelationship(relationship)"
          @mouseleave="clearRelationshipHighlight"
        />
      </svg>

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

      <!-- Relationships Layer ON TOP of Tables -->
      <svg
        v-if="showRelationships && relationshipOnTop"
        class="relationships-layer relationships-over"
        :style="[
          diagramContainerStyle,
          { width: diagramWidth + 'px', height: diagramHeight + 'px' },
        ]"
      >
        <defs>
          <marker
            id="arrowhead-over"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" class="arrowhead" />
          </marker>
          <marker
            id="arrowhead-highlighted-over"
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
          :key="`rel-over-${index}`"
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
              ? 'url(#arrowhead-highlighted-over)'
              : 'url(#arrowhead-over)'
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
        <path :d="connectionLinePath" class="connection-line" marker-end="url(#arrowhead-over)" />
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

    <!-- Relationship Manager Modal -->
    <div v-if="showRelationshipModal" class="modal-overlay" @click="closeRelationshipManager">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Manage Relationships</h3>
          <button class="btn-icon" @click="closeRelationshipManager">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="modal-body">
          <!-- Add New Relationship Form -->
          <div class="relationship-form">
            <h4>{{ editingRelationship ? 'Edit Relationship' : 'Add New Relationship' }}</h4>

            <div class="form-row">
              <div class="form-group">
                <label>From Table</label>
                <select v-model="newRelationship.from_table" @change="updateFromColumns">
                  <option value="">Select Table</option>
                  <option v-for="table in localTables" :key="table.name" :value="table.name">
                    {{ table.name }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>From Column</label>
                <select
                  v-model="newRelationship.from_column"
                  :disabled="!newRelationship.from_table"
                >
                  <option value="">Select Column</option>
                  <option
                    v-for="column in fromTableColumns"
                    :key="column.name"
                    :value="column.name"
                  >
                    {{ column.name }} ({{ column.type }})
                  </option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>To Table</label>
                <select v-model="newRelationship.to_table" @change="updateToColumns">
                  <option value="">Select Table</option>
                  <option v-for="table in localTables" :key="table.name" :value="table.name">
                    {{ table.name }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>To Column</label>
                <select v-model="newRelationship.to_column" :disabled="!newRelationship.to_table">
                  <option value="">Select Column</option>
                  <option v-for="column in toTableColumns" :key="column.name" :value="column.name">
                    {{ column.name }} ({{ column.type }})
                  </option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Relationship Type</label>
                <select v-model="newRelationship.type">
                  <option value="one-to-one">One to One</option>
                  <option value="one-to-many">One to Many</option>
                  <option value="many-to-one">Many to One</option>
                  <option value="many-to-many">Many to Many</option>
                </select>
              </div>

              <div class="form-group">
                <label>Display Layer</label>
                <select v-model="newRelationship.layer">
                  <option value="over">On Top of Tables</option>
                  <option value="under">Under Tables</option>
                </select>
              </div>
            </div>

            <div class="form-actions">
              <button
                class="btn btn-secondary"
                @click="cancelEditRelationship"
                v-if="editingRelationship"
              >
                Cancel
              </button>
              <button
                class="btn btn-primary"
                @click="saveRelationship"
                :disabled="!isRelationshipValid"
              >
                {{ editingRelationship ? 'Update' : 'Add' }} Relationship
              </button>
            </div>
          </div>

          <!-- Existing Relationships List -->
          <div class="relationships-list">
            <h4>Existing Relationships</h4>
            <div v-if="manualRelationships.length === 0" class="empty-state">
              No manual relationships defined
            </div>
            <div v-else class="relationship-items">
              <div
                v-for="relationship in manualRelationships"
                :key="relationship._id || `${relationship.from_table}-${relationship.from_column}`"
                class="relationship-item"
                :class="{ selected: selectedRelationship === relationship }"
              >
                <div class="relationship-info">
                  <div class="relationship-type-badge" :class="relationship.type">
                    {{ formatRelationshipType(relationship.type) }}
                  </div>
                  <div class="relationship-details">
                    <strong>{{ relationship.from_table }}</strong
                    >.{{ relationship.from_column }}
                    <span class="relationship-arrow">→</span>
                    <strong>{{ relationship.to_table }}</strong
                    >.{{ relationship.to_column }}
                  </div>
                  <div class="relationship-layer">
                    {{ relationship.layer === 'over' ? 'On Top' : 'Under' }}
                  </div>
                </div>
                <div class="relationship-actions">
                  <button class="btn-icon" @click="editRelationship(relationship)" title="Edit">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button
                    class="btn-icon danger"
                    @click="deleteRelationship(relationship)"
                    title="Delete"
                  >
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
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
      zoomLevel: 0.5,
      diagramWidth: 2000,
      diagramHeight: 2000,
      dragData: null,
      showDebug: false,

      // New features
      showRelationships: true,
      showGrid: true,
      showMiniMap: false,
      relationshipOnTop: true, // Mặc định relationship nổi trên bảng
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

      // Relationship Management
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
              layer: 'under', // Auto-generated relationships mặc định nằm dưới
            })
          }
        })
      })

      return relationships
    },

    allRelationships() {
      // Tách relationships theo layer
      const overRelationships = this.manualRelationships.filter((rel) => rel.layer === 'over')
      const underRelationships = [
        ...this.manualRelationships.filter((rel) => rel.layer === 'under'),
        ...this.autoGeneratedRelationships,
      ]

      return this.relationshipOnTop
        ? [...underRelationships, ...overRelationships]
        : [...overRelationships, ...underRelationships]
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
    // ========== RELATIONSHIP MANAGEMENT ==========
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
        // Update existing relationship
        const index = this.manualRelationships.findIndex(
          (rel) => rel._id === this.editingRelationship._id
        )
        if (index !== -1) {
          this.manualRelationships.splice(index, 1, relationship)
        }
      } else {
        // Add new relationship
        this.manualRelationships.push(relationship)
      }

      // Emit changes to parent
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

    // ========== HISTORY MANAGEMENT ==========
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
    },

    redo() {
      if (!this.canRedo) return

      this.historyIndex++
      const snapshot = this.history[this.historyIndex]

      this.applyHistorySnapshot(snapshot)
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
    },

    // ========== AUTO-SAVE ==========
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

    // ========== AUTO-LAYOUT ==========
    autoLayout() {
      this.saveToHistory('Auto layout applied')

      const LAYOUT_CONFIG = {
        TABLE_WIDTH: 240, // Chiều rộng của một table card
        TABLE_HEIGHT: 200, // Chiều cao của một table card
        MARGIN_X: 100, // Khoảng cách ngang giữa các bảng
        MARGIN_Y: 80, // Khoảng cách dọc giữa các hàng
        GROUP_MARGIN_Y: 120, // Khoảng cách dọc lớn hơn giữa các nhóm
        PADDING: 200, // Khoảng đệm so với lề của diagram
        COLUMNS: 7, // Số lượng bảng tối đa trên một hàng
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

    // ========== KEYBOARD SHORTCUTS ==========
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
        case 'Delete':
        case 'Backspace':
          if (this.selectedTable) {
            this.$emit('table-delete', this.selectedTable)
            this.selectedTable = null
          }
          break
        case 'Escape':
          this.clearSelection()
          break
      }
    },

    // ========== ZOOM AND PAN ==========
    handleWheel(event) {
      if (event.ctrlKey) {
        event.preventDefault()

        const zoomFactor = 0.1
        const newZoomLevel = this.zoomLevel + (event.deltaY > 0 ? -zoomFactor : zoomFactor)

        this.zoomLevel = Math.max(0.1, Math.min(3, newZoomLevel))
      }
    },

    zoomIn() {
      this.zoomLevel = Math.min(3, this.zoomLevel + 0.1)
    },

    zoomOut() {
      this.zoomLevel = Math.max(0.1, this.zoomLevel - 0.1)
    },

    resetZoom() {
      this.zoomLevel = 1
    },

    fitToScreen() {
      const container = this.$refs.diagramContainer
      if (!container) return

      const rect = container.getBoundingClientRect()
      const contentWidth = this.diagramWidth
      const contentHeight = this.diagramHeight

      const scaleX = rect.width / contentWidth
      const scaleY = rect.height / contentHeight

      this.zoomLevel = Math.min(scaleX, scaleY, 1)
    },

    // ========== SELECTION AND HIGHLIGHTING ==========
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
      this.highlightedColumn = { column, table }
    },

    highlightRelationship(relationship) {
      this.highlightedRelationship = relationship
    },

    clearRelationshipHighlight() {
      this.highlightedRelationship = null
    },

    clearColumnHighlights() {
      this.highlightedColumn = null
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

    // ========== RELATIONSHIP PATH CALCULATION ==========
    calculateRelationshipPath(relationship) {
      const fromTable = this.localTables.find((t) => t.name === relationship.from_table)
      const toTable = this.localTables.find((t) => t.name === relationship.to_table)

      if (!fromTable || !toTable) return ''

      const fromPos = fromTable.position || { x: 0, y: 0 }
      const toPos = toTable.position || { x: 0, y: 0 }

      const fromCenter = {
        x: fromPos.x + 120,
        y: fromPos.y + 100,
      }

      const toCenter = {
        x: toPos.x + 120,
        y: toPos.y + 100,
      }

      const dx = toCenter.x - fromCenter.x
      const dy = toCenter.y - fromCenter.y

      const angle = Math.atan2(dy, dx)
      const distance = Math.sqrt(dx * dx + dy * dy)

      const startX = fromCenter.x + Math.cos(angle) * 100
      const startY = fromCenter.y + Math.sin(angle) * 100
      const endX = toCenter.x - Math.cos(angle) * 100
      const endY = toCenter.y - Math.sin(angle) * 100

      const controlDistance = Math.min(distance * 0.5, 200)
      const controlX = (startX + endX) / 2 + Math.cos(angle + Math.PI / 2) * controlDistance
      const controlY = (startY + endY) / 2 + Math.sin(angle + Math.PI / 2) * controlDistance

      return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`
    },

    // ========== UTILITY METHODS ==========
    findTargetTableForForeignKey(fkColumn, sourceTableName) {
      const columnName = fkColumn.name.toLowerCase()
      const possibleTargetNames = [
        columnName.replace(/_id$/, ''),
        columnName.replace(/id$/, ''),
        columnName.replace(/_fk$/, ''),
      ]

      return this.localTables.find((table) => {
        if (table.name === sourceTableName) return false

        const tableName = table.name.toLowerCase()
        return possibleTargetNames.some((targetName) => tableName.includes(targetName))
      })
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

    // ========== UI CONTROLS ==========
    toggleRelationships() {
      this.showRelationships = !this.showRelationships
    },

    toggleGrid() {
      this.showGrid = !this.showGrid
    },

    toggleMiniMap() {
      this.showMiniMap = !this.showMiniMap
    },

    // ========== EXPORT ==========
    async exportAsImage() {
      const container = this.$refs.diagramContainer
      if (!container) return

      try {
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

    // ========== CONTEXT MENU ==========
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

    // ========== EVENT HANDLERS ==========
    handleContainerMouseMove(event) {
      // Handle panning and other mouse interactions
    },

    handleContainerMouseUp() {
      // Handle mouse up events
    },
  },
  mounted() {
    document.addEventListener('keydown', this.handleKeydown)

    // Initialize positions if not set
    this.localTables.forEach((table, index) => {
      if (!table.position) {
        this.$set(table, 'position', {
          x: (index % 5) * 300 + 100,
          y: Math.floor(index / 5) * 250 + 100,
        })
      }
    })

    this.updateContainerSize()

    // Save initial state to history
    if (this.historyEnabled) {
      this.saveToHistory('Initial state')
    }
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.handleKeydown)
    document.removeEventListener('mousemove', this.handleDrag)
    document.removeEventListener('mouseup', this.stopDrag)
    document.removeEventListener('click', this.hideContextMenu)
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

/* Enhanced Controls Panel */
.diagram-controls {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.control-group {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: #3b82f6;
  color: white;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon.danger:hover {
  background: #ef4444;
  color: white;
}

.zoom-level {
  min-width: 48px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.history-info {
  font-size: 12px;
  color: #6b7280;
  padding: 0 8px;
}

.auto-save-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
  padding: 4px 8px;
}

.auto-save-status.saving {
  color: #f59e0b;
}

.auto-save-status.saved {
  color: #10b981;
}

.search-box {
  position: relative;
  margin-left: auto;
}

.search-input {
  width: 200px;
  padding: 8px 32px 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
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
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
  color: #9ca3af;
}

/* Diagram Container */
.diagram-container {
  position: relative;
  overflow: auto;
  background-color: #f8fafc;
  cursor: grab;
}

.diagram-container:active {
  cursor: grabbing;
}

.grid-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.3;
}

.tables-container {
  position: relative;
  min-width: 2000px;
  min-height: 2000px;
}

/* Enhanced Table Card */
.table-card {
  position: absolute;
  width: 280px;
  min-height: 120px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  cursor: grab;
  user-select: none;
}

.table-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transform: translateY(-2px);
}

.table-card.table-highlighted {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.table-card.table-selected {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
}

.table-card.table-dragging {
  cursor: grabbing;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  z-index: 1000;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #1a365d;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 10px 10px 0 0;
}

.table-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.table-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.table-card:hover .table-actions {
  opacity: 1;
}

.table-description {
  padding: 8px 16px;
  font-size: 12px;
  color: #6b7280;
  border-bottom: 1px solid #f3f4f6;
  background: #fafafa;
}

.table-columns {
  max-height: 300px;
  overflow-y: auto;
}

.table-column {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s ease;
}

.table-column:hover {
  background: #f8fafc;
}

.table-column.column-highlighted {
  background: #dbeafe;
}

.column-name {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
  flex: 1;
}

.column-type {
  font-size: 12px;
  color: #6b7280;
  margin-right: 8px;
}

.column-badges {
  display: flex;
  gap: 4px;
}

.column-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  color: white;
}

.column-badge.pk {
  background: #ef4444;
}

.column-badge.fk {
  background: #3b82f6;
}

.column-badge.nn {
  background: #f59e0b;
}

.column-badge.uq {
  background: #10b981;
}

/* Connection Points */
.connection-points {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.connection-point {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #3b82f6;
  border: 2px solid white;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: all;
  cursor: crosshair;
}

.connection-point.top {
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
}

.connection-point.right {
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
}

.connection-point.bottom {
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
}

.connection-point.left {
  left: -6px;
  top: 50%;
  transform: translateY(-50%);
}

.table-card:hover .connection-point {
  opacity: 1;
}

/* Relationships Layer */
.relationships-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.relationships-under {
  z-index: 5;
}

.relationships-over {
  z-index: 15;
}

.relationship-path {
  fill: none;
  stroke: #9ca3af;
  stroke-width: 2;
  pointer-events: stroke;
  cursor: pointer;
  transition: all 0.3s ease;
}

.relationship-path:hover,
.relationship-path.relationship-highlighted {
  stroke: #3b82f6;
  stroke-width: 3;
}

.relationship-path.relationship-selected {
  stroke: #1d4ed8;
  stroke-width: 3;
  filter: drop-shadow(0 2px 4px rgba(29, 78, 216, 0.3));
}

/* Relationship type styles */
.relationship-path.one-to-one {
  stroke-dasharray: 5, 5;
}

.relationship-path.one-to-many {
  stroke-dasharray: none;
}

.relationship-path.many-to-one {
  stroke-dasharray: none;
}

.relationship-path.many-to-many {
  stroke-dasharray: 10, 5;
}

.arrowhead {
  fill: #9ca3af;
}

.arrowhead-highlighted {
  fill: #3b82f6;
}

.relationship-path:hover .arrowhead,
.relationship-path.relationship-highlighted .arrowhead {
  fill: #3b82f6;
}

/* Connection Line */
.connection-line-layer {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;
  pointer-events: none;
}

.connection-line {
  fill: none;
  stroke: #3b82f6;
  stroke-width: 2;
  stroke-dasharray: 5, 5;
}

/* Mini Map */
.mini-map {
  position: absolute;
  bottom: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
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
  background: #6b7280;
  border-radius: 1px;
  transition: background-color 0.2s ease;
}

.mini-viewport {
  position: absolute;
  border: 2px solid #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  pointer-events: none;
}

/* Relationship Manager Modal */
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
  z-index: 2000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.modal-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 600;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

/* Relationship Form */
.relationship-form {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
}

.relationship-form h4 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-group select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  transition: border-color 0.2s ease;
}

.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
}

/* Relationships List */
.relationships-list h4 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
  font-style: italic;
}

.relationship-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.relationship-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.relationship-item:hover {
  border-color: #d1d5db;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.relationship-item.selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.relationship-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.relationship-type-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  min-width: 32px;
  text-align: center;
}

.relationship-type-badge.one-to-one {
  background: #10b981;
}

.relationship-type-badge.one-to-many {
  background: #3b82f6;
}

.relationship-type-badge.many-to-one {
  background: #8b5cf6;
}

.relationship-type-badge.many-to-many {
  background: #f59e0b;
}

.relationship-details {
  flex: 1;
  font-size: 14px;
  color: #374151;
}

.relationship-arrow {
  margin: 0 8px;
  color: #9ca3af;
}

.relationship-layer {
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
}

.relationship-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.relationship-item:hover .relationship-actions {
  opacity: 1;
}

/* Context Menu */
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 1000;
  min-width: 160px;
}

.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
  transition: background-color 0.2s ease;
}

.context-menu-item:hover {
  background: #f3f4f6;
}

.context-menu-item:first-child {
  border-radius: 8px 8px 0 0;
}

.context-menu-item:last-child {
  border-radius: 0 0 8px 8px;
}

/* Selection Rectangle */
.selection-rectangle {
  position: absolute;
  background: rgba(59, 130, 246, 0.1);
  border: 2px solid #3b82f6;
  pointer-events: none;
  z-index: 10;
}

/* Debug Info */
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

/* Scrollbar Styling */
.diagram-container::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.diagram-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 6px;
}

.diagram-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 6px;
  border: 2px solid #f1f5f9;
}

.diagram-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.table-columns::-webkit-scrollbar {
  width: 6px;
}

.table-columns::-webkit-scrollbar-track {
  background: #f8fafc;
}

.table-columns::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .diagram-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .control-group {
    justify-content: center;
  }

  .search-box {
    margin-left: 0;
    margin-top: 8px;
  }

  .search-input {
    width: 100%;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .modal-content {
    width: 95%;
    margin: 20px;
  }
}

/* Animation for smooth transitions */
.table-card,
.relationship-path,
.btn-icon {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Focus styles for accessibility */
.btn-icon:focus-visible,
.search-input:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .schema-diagram {
    background-color: #111827;
  }

  .diagram-controls {
    background: rgba(31, 41, 55, 0.95);
    border-color: #374151;
  }

  .control-group {
    background: #1f2937;
    border-color: #374151;
  }

  .btn-icon {
    color: #d1d5db;
  }

  .table-card {
    background: #1f2937;
    border-color: #374151;
    color: #f9fafb;
  }

  .table-header {
    background: #111827;
    border-color: #374151;
    color: #f9fafb;
  }

  .table-header h4 {
    color: #f9fafb;
  }

  .table-description {
    background: #111827;
    border-color: #374151;
    color: #d1d5db;
  }

  .table-column {
    border-color: #374151;
    color: #f9fafb;
  }

  .table-column:hover {
    background: #374151;
  }

  .column-name {
    color: #f9fafb;
  }

  .column-type {
    color: #9ca3af;
  }

  .search-input {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }

  .search-input:focus {
    border-color: #3b82f6;
  }

  .grid-background {
    opacity: 0.2;
  }
}
</style>