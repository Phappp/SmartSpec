<template>
  <div
    class="table-card"
    :class="tableClasses"
    :style="tableStyles"
    @mouseenter="$emit('mouseenter', $event)"
    @mouseleave="$emit('mouseleave', $event)"
    @mousedown="$emit('mousedown', $event)"
    @click="$emit('click', $event)"
    @dblclick="$emit('dblclick', $event)"
  >
    <div class="table-header">
      <h4>{{ table.name }}</h4>
      <div class="table-actions">
        <button class="btn-icon" @click="$emit('view')" title="View Details">
          <span class="material-symbols-outlined">visibility</span>
        </button>
        <button class="btn-icon" @click="$emit('edit')" title="Edit">
          <span class="material-symbols-outlined">edit</span>
        </button>
        <button class="btn-icon danger" @click.stop="$emit('delete')" title="Delete">
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
          'column-highlighted': isColumnHighlighted(column),
        }"
        @mouseenter="$emit('column-hover', column, table)"
        @mouseleave="$emit('column-leave')"
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
</template>

<script>
export default {
  name: 'TableCard',
  props: {
    table: Object,
    isHighlighted: Boolean,
    isSelected: Boolean,
    isDragging: Boolean,
    isDimmed: Boolean,
    isUnrelated: Boolean,
    isHovered: Boolean,
    zIndex: Number,
    highlightedColumn: Object,
  },
  emits: [
    'mouseenter',
    'mouseleave',
    'mousedown',
    'click',
    'dblclick',
    'view',
    'edit',
    'delete',
    'column-hover',
    'column-leave',
  ],
  computed: {
    tableClasses() {
      return {
        'table-highlighted': this.isHighlighted,
        'table-selected': this.isSelected,
        'table-dragging': this.isDragging,
        'table-dimmed': this.isDimmed,
        'table-unrelated': this.isUnrelated,
        'table-hovered': this.isHovered,
      }
    },
    tableStyles() {
      return {
        top: (this.table.position?.y || 0) + 'px',
        left: (this.table.position?.x || 0) + 'px',
        zIndex: this.zIndex,
      }
    },
  },
  methods: {
    isColumnHighlighted(column) {
      if (!this.highlightedColumn) return false
      return this.highlightedColumn.column === column && this.highlightedColumn.table === this.table
    },
  },
}
</script>

<style scoped>
.table-card {
  position: absolute;
  width: 300px;
  min-height: 300px;
  max-height: 300px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: grab;
  overflow: hidden;
  user-select: none;
  z-index: 10;
}

.table-card.column-highlighted {
  background: transparent !important;
  backdrop-filter: blur(30px);
  border-color: rgba(59, 130, 246, 0.5);
}

.table-card:hover {
  min-height: unset;
  max-height: unset;
}

/* Tùy chỉnh thanh cuộn */
.table-card::-webkit-scrollbar {
  width: 1px;
}

.table-card::-webkit-scrollbar-thumb {
  background-color: #a0aec0;
  border-radius: 10px;
}

.table-card::-webkit-scrollbar-thumb:hover {
  background-color: #718096;
}

.table-card::-webkit-scrollbar-track {
  background: #edf2f7;
  border-radius: 10px;
}

.table-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 8px 25px -8px rgba(59, 130, 246, 0.15), 0 4px 12px -4px rgba(0, 0, 0, 0.1);
  transform: translateY(-4px) scale(1.02);
  z-index: 100;
}

.table-card.table-unrelated {
  opacity: 0.4;
  filter: grayscale(70%) blur(0.5px);
  transform: scale(0.92);
  transition: all 0.4s ease;
}

.table-card.table-unrelated:hover {
  opacity: 1;
  filter: grayscale(0%) blur(0px);
  transform: scale(0.95);
  z-index: 90;
}

.table-card.table-highlighted {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.8), 0 6px 20px -6px rgba(59, 130, 246, 0.3);
  z-index: 80;
}

.table-card.table-selected {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.4), 0 8px 25px -8px rgba(37, 99, 235, 0.2);
  z-index: 85;
}

.table-card.table-dragging {
  cursor: grabbing;
  box-shadow: 0 15px 40px -12px rgba(0, 0, 0, 0.25), 0 0 0 2px rgba(59, 130, 246, 0.8);
  transform: rotate(1deg) scale(1.03);
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
  min-height: 300px;
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

/* Dark mode support */
@media (prefers-color-scheme: dark) {
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
}

/* Thêm style cho table được highlight */
.table-card.table-highlighted {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 12px rgba(244, 11, 3, 0.4), 0 8px 25px -8px rgba(64, 102, 163, 0.3) !important;
  z-index: 80;
  transform: scale(1.08);
  transition: all 0.3s ease;
}

/* Column highlight */
.table-column.column-highlighted {
  background: #dbeafe !important;
  border-left: 3px solid #3b82f6;
}

.table-column.primary.column-highlighted {
  background: #fef2f2;
  border-left: 3px solid #ef4444;
}

.table-column.foreign.column-highlighted {
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
}
</style>