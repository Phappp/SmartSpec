<template>
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
</template>

<script>
export default {
  name: 'SortDropdown',
  props: {
    showSortOptions: Boolean,
    currentSort: String,
  },
  emits: ['toggle-sort', 'sort'],
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
.control-group {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  position: relative;
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

  .control-group {
    background: #1f2937;
    border-color: #374151;
  }

  .btn-icon {
    color: #d1d5db;
  }
}
</style>