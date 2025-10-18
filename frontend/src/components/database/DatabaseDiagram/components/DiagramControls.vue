<template>
  <div class="diagram-controls">
    <!-- Thêm Control Group cho Sorting -->
    <div class="control-group">
      <button class="btn-icon" @click="$emit('toggle-sort')" title="Sort Tables">
        <span class="material-symbols-outlined">sort</span>
      </button>
      <div class="sort-dropdown" v-if="showSortOptions">
        <div class="sort-option" @click="$emit('sort', 'name-asc')">
          <span class="material-symbols-outlined">sort_by_alpha</span>
          Name A-Z
        </div>
        <div class="sort-option" @click="$emit('sort', 'name-desc')">
          <span class="material-symbols-outlined">sort_by_alpha</span>
          Name Z-A
        </div>
        <div class="sort-option" @click="$emit('sort', 'columns-asc')">
          <span class="material-symbols-outlined">expand_more</span>
          Columns ↑
        </div>
        <div class="sort-option" @click="$emit('sort', 'columns-desc')">
          <span class="material-symbols-outlined">expand_less</span>
          Columns ↓
        </div>
        <div class="sort-option" @click="$emit('sort', 'fk-asc')">
          <span class="material-symbols-outlined">expand_more</span>
          FK Count ↑
        </div>
        <div class="sort-option" @click="$emit('sort', 'fk-desc')">
          <span class="material-symbols-outlined">expand_less</span>
          FK Count ↓
        </div>
        <div class="sort-option" @click="$emit('sort', 'original')">
          <span class="material-symbols-outlined">restart_alt</span>
          Original Order
        </div>
      </div>
      <div class="current-sort" v-if="currentSort">
        {{ getSortDisplayName(currentSort) }}
      </div>
    </div>

    <div class="control-group">
      <button class="btn-icon" @click="$emit('auto-layout')" title="Auto Layout">
        <span class="material-symbols-outlined">auto_awesome</span>
      </button>
      <button
        class="btn-icon"
        @click="$emit('toggle-relationships')"
        :title="showRelationships ? 'Hide Relationships' : 'Show Relationships'"
      >
        <span class="material-symbols-outlined">
          {{ showRelationships ? 'link_off' : 'link' }}
        </span>
      </button>
      <button
        class="btn-icon"
        @click="$emit('toggle-relationship-colors')"
        :title="showRelationshipColors ? 'Hide Relationship Colors' : 'Show Relationship Colors'"
      >
        <span class="material-symbols-outlined">
          {{ showRelationshipColors ? 'palette' : 'format_color_reset' }}
        </span>
      </button>
      <!-- <button
        class="btn-icon"
        @click="$emit('toggle-grid')"
        :title="showGrid ? 'Hide Grid' : 'Show Grid'"
      >
        <span class="material-symbols-outlined">
          {{ showGrid ? 'grid_off' : 'grid_on' }}
        </span>
      </button> -->
    </div>

    <div class="control-group">
      <button class="btn-icon" @click="$emit('zoom-out')" title="Zoom Out">
        <span class="material-symbols-outlined">zoom_out</span>
      </button>
      <div class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</div>
      <button class="btn-icon" @click="$emit('zoom-in')" title="Zoom In">
        <span class="material-symbols-outlined">zoom_in</span>
      </button>
      <button class="btn-icon" @click="$emit('reset-zoom')" title="Reset Zoom">
        <span class="material-symbols-outlined">refresh</span>
      </button>
      <button
        class="btn-icon"
        @click="$emit('toggle-fullscreen')"
        :title="isFullscreen ? 'Exit Fullscreen (F11)' : 'Enter Fullscreen (F11)'"
      >
        <span class="material-symbols-outlined">
          {{ isFullscreen ? 'fullscreen_exit' : 'fullscreen' }}
        </span>
      </button>
    </div>

    <!-- <div class="control-group">
      <button class="btn-icon" @click="$emit('fit-to-screen')" title="Fit to Screen">
        <span class="material-symbols-outlined">fit_screen</span>
      </button>
      
      <button
        class="btn-icon"
        @click="$emit('toggle-mini-map')"
        :title="showMiniMap ? 'Hide Mini Map' : 'Show Mini Map'"
      >
        <span class="material-symbols-outlined">
          {{ showMiniMap ? 'map' : 'map' }}
        </span>
      </button>
    </div> -->

    <!-- Relationship Controls -->
    <div class="control-group">
      <button class="btn-icon" @click="$emit('export-as-image')" title="Export as Image">
        <span class="material-symbols-outlined">image</span>
      </button>
      <!-- <button
        class="btn-icon"
        @click="$emit('toggle-relationship-layer')"
        :title="relationshipOnTop ? 'Relationships on Top' : 'Relationships Under Tables'"
      >
        <span class="material-symbols-outlined">
          {{ relationshipOnTop ? 'layers' : 'layers_clear' }}
        </span>
      </button> -->
      <button
        class="btn-icon"
        @click="$emit('show-relationship-manager')"
        title="Manage Relationships"
      >
        <span class="material-symbols-outlined">settings</span>
      </button>
    </div>

    <!-- Undo/Redo Controls -->
    <div class="control-group" v-if="historyEnabled">
      <button class="btn-icon" @click="$emit('undo')" :disabled="!canUndo" title="Undo (Ctrl+Z)">
        <span class="material-symbols-outlined">undo</span>
      </button>
      <button class="btn-icon" @click="$emit('redo')" :disabled="!canRedo" title="Redo (Ctrl+Y)">
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
        :value="searchQuery"
        @input="$emit('search-change', $event.target.value)"
        type="text"
        placeholder="Search tables..."
        class="search-input"
      />
      <span class="material-symbols-outlined search-icon">search</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DiagramControls',
  props: {
    showSortOptions: Boolean,
    currentSort: String,
    showRelationships: Boolean,
    showGrid: Boolean,
    showMiniMap: Boolean,
    showRelationshipColors: Boolean,
    relationshipOnTop: Boolean,
    zoomLevel: Number,
    isFullscreen: Boolean,
    historyEnabled: Boolean,
    canUndo: Boolean,
    canRedo: Boolean,
    historyIndex: Number,
    history: Array,
    autoSaveEnabled: Boolean,
    isSaving: Boolean,
    searchQuery: String,
  },
  emits: [
    'toggle-sort',
    'sort',
    'auto-layout',
    'toggle-relationships',
    'toggle-grid',
    'toggle-relationship-colors',
    'zoom-out',
    'zoom-in',
    'reset-zoom',
    'toggle-fullscreen',
    'fit-to-screen',
    'export-as-image',
    'toggle-mini-map',
    'toggle-relationship-layer',
    'show-relationship-manager',
    'undo',
    'redo',
    'search-change',
  ],
  methods: {
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
  },
}
</script>

<style scoped>
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

/* Sort Dropdown Styles */
.sort-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 1001;
  min-width: 180px;
  margin-top: 4px;
}

.sort-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #f3f4f6;
}

.sort-option:last-child {
  border-bottom: none;
}

.sort-option:hover {
  background: #f3f4f6;
}

.sort-option .material-symbols-outlined {
  font-size: 16px;
  color: #6b7280;
}

.current-sort {
  font-size: 12px;
  color: #374151;
  padding: 0 8px;
  min-width: 60px;
  text-align: center;
  font-weight: 500;
}

/* Responsive cho sort dropdown */
@media (max-width: 768px) {
  .sort-dropdown {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 300px;
  }
}

/* Dark mode support cho sorting */
@media (prefers-color-scheme: dark) {
  .sort-dropdown {
    background: #1f2937;
    border-color: #374151;
  }

  .sort-option {
    color: #f9fafb;
    border-bottom-color: #374151;
  }

  .sort-option:hover {
    background: #374151;
  }

  .sort-option .material-symbols-outlined {
    color: #d1d5db;
  }

  .current-sort {
    color: #d1d5db;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
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

  .search-input {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }

  .search-input:focus {
    border-color: #3b82f6;
  }
}
</style>