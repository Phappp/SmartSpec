<template>
  <svg 
    class="relationships-layer" 
    :class="layerClass" 
    :style="layerStyle" 
    :width="svgWidth" 
    :height="svgHeight"
    v-if="showRelationships"
  >
    <defs>
      <marker
        :id="`arrowhead-${layer}`"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" class="arrowhead" />
      </marker>
      <marker
        :id="`arrowhead-highlighted-${layer}`"
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
      v-for="(relationship, index) in relationships"
      :key="`rel-${layer}-${index}`"
      :d="calculateRelationshipPath(relationship)"
      class="relationship-path"
      :class="[
        relationship.type,
        {
          'relationship-colored': relationship.isColored,
          'relationship-highlighted': isRelationshipHighlighted(relationship),
          'relationship-selected': isRelationshipSelected(relationship),
          'relationship-related': isRelationshipRelated(relationship),
        },
      ]"
      :marker-end="
        isRelationshipHighlighted(relationship)
          ? `url(#arrowhead-highlighted-${layer})`
          : `url(#arrowhead-${layer})`
      "
      @click.stop="$emit('relationship-click', relationship)"
      @mouseenter="$emit('relationship-enter', relationship)"
      @mouseleave="$emit('relationship-leave')"
    />
  </svg>
</template>

<script>
export default {
  name: 'RelationshipLayer',
  props: {
    relationships: Array,
    tables: Array,
    zoomLevel: Number,
    diagramOffset: Object,
    diagramWidth: {
      type: Number,
      default: 2000,
    },
    diagramHeight: {
      type: Number,
      default: 2000,
    },
    layer: {
      type: String,
      default: 'over',
      validator: (value) => ['over', 'under'].includes(value),
    },
    highlightedRelationship: Object,
    highlightedColumn: {
      type: Object,
      default: null,
    },
    selectedRelationship: Object,
    focusedTable: Object,
  },
  emits: ['relationship-click', 'relationship-enter', 'relationship-leave'],
  computed: {
    layerClass() {
      return `relationships-${this.layer}`
    },
    layerStyle() {
      return {
        transform: `translate(${this.diagramOffset.x}px, ${this.diagramOffset.y}px) scale(${this.zoomLevel})`,
        transformOrigin: '0 0',
        width: '100%',
        height: '100%',
      }
    },
    showRelationships() {
      return this.relationships && this.relationships.length > 0
    },
    svgWidth() {
      return this.diagramWidth
    },
    svgHeight() {
      return this.diagramHeight
    },
  },
  methods: {
    calculateRelationshipPath(relationship) {
      const fromTable = this.tables.find((t) => t.name === relationship.from_table)
      const toTable = this.tables.find((t) => t.name === relationship.to_table)

      if (!fromTable || !toTable) return ''

      const fromPos = fromTable.position || { x: 0, y: 0 }
      const toPos = toTable.position || { x: 0, y: 0 }

      const startPoint = this.calculateConnectionPoint(fromPos, toPos, true)
      const endPoint = this.calculateConnectionPoint(toPos, fromPos, false)

      return this.drawOrthogonalPath(startPoint, endPoint)
    },

    calculateConnectionPoint(tablePos, targetPos, isStart) {
      // Hardcode kích thước bảng là 300x300
      const tableWidth = 300
      const tableHeight = 300

      let x, y, side

      const dx = targetPos.x - tablePos.x
      const dy = targetPos.y - tablePos.y

      // Xác định side dựa trên vị trí tương đối
      if (Math.abs(dx) > Math.abs(dy)) {
        side = dx > 0 ? 'right' : 'left'
      } else {
        side = dy > 0 ? 'bottom' : 'top'
      }

      // Tính toán điểm kết nối trên mép bảng
      switch (side) {
        case 'top':
          x = tablePos.x + tableWidth / 2
          y = tablePos.y // Mép trên
          break
        case 'right':
          x = tablePos.x + tableWidth // Mép phải
          y = tablePos.y + tableHeight / 2
          break
        case 'bottom':
          x = tablePos.x + tableWidth / 2
          y = tablePos.y + tableHeight // Mép dưới
          break
        case 'left':
          x = tablePos.x // Mép trái
          y = tablePos.y + tableHeight / 2
          break
      }

      return { x, y, side }
    },

    drawOrthogonalPath(startPoint, endPoint) {
      const start = startPoint
      const end = endPoint
      const curveRadius = 15

      // Direct horizontal/vertical lines with smooth curves
      if (start.side === 'right' && end.side === 'left' && Math.abs(start.y - end.y) < 100) {
        const midX = (start.x + end.x) / 2
        return `M ${start.x} ${start.y} C ${start.x + curveRadius} ${start.y}, ${midX - curveRadius} ${end.y}, ${midX} ${end.y} C ${midX + curveRadius} ${end.y}, ${end.x - curveRadius} ${end.y}, ${end.x} ${end.y}`
      }

      if (start.side === 'left' && end.side === 'right' && Math.abs(start.y - end.y) < 100) {
        const midX = (start.x + end.x) / 2
        return `M ${start.x} ${start.y} C ${start.x - curveRadius} ${start.y}, ${midX + curveRadius} ${end.y}, ${midX} ${end.y} C ${midX - curveRadius} ${end.y}, ${end.x + curveRadius} ${end.y}, ${end.x} ${end.y}`
      }

      if (start.side === 'top' && end.side === 'bottom' && Math.abs(start.x - end.x) < 100) {
        const midY = (start.y + end.y) / 2
        return `M ${start.x} ${start.y} C ${start.x} ${start.y - curveRadius}, ${end.x} ${midY + curveRadius}, ${end.x} ${midY} C ${end.x} ${midY - curveRadius}, ${end.x} ${end.y - curveRadius}, ${end.x} ${end.y}`
      }

      if (start.side === 'bottom' && end.side === 'top' && Math.abs(start.x - end.x) < 100) {
        const midY = (start.y + end.y) / 2
        return `M ${start.x} ${start.y} C ${start.x} ${start.y + curveRadius}, ${end.x} ${midY - curveRadius}, ${end.x} ${midY} C ${end.x} ${midY + curveRadius}, ${end.x} ${end.y + curveRadius}, ${end.x} ${end.y}`
      }

      // Orthogonal path with smooth curves
      let path = `M ${start.x} ${start.y}`

      const firstMid = this.getFirstIntermediatePoint(start, end)
      const secondMid = this.getSecondIntermediatePoint(firstMid, end, start)

      // Use bezier curves for smooth transitions
      if (start.side === 'right' || start.side === 'left') {
        path += ` C ${start.x + (firstMid.x - start.x) * 0.5} ${start.y}, ${firstMid.x} ${firstMid.y - (firstMid.y - start.y) * 0.5}, ${firstMid.x} ${firstMid.y}`
      } else {
        path += ` C ${start.x} ${start.y + (firstMid.y - start.y) * 0.5}, ${firstMid.x - (firstMid.x - start.x) * 0.5} ${firstMid.y}, ${firstMid.x} ${firstMid.y}`
      }

      path += ` L ${secondMid.x} ${secondMid.y}`

      // Smooth curve to end point
      if (end.side === 'right' || end.side === 'left') {
        path += ` C ${secondMid.x} ${secondMid.y + (end.y - secondMid.y) * 0.5}, ${end.x - (end.x - secondMid.x) * 0.5} ${end.y}, ${end.x} ${end.y}`
      } else {
        path += ` C ${secondMid.x + (end.x - secondMid.x) * 0.5} ${secondMid.y}, ${end.x} ${end.y - (end.y - secondMid.y) * 0.5}, ${end.x} ${end.y}`
      }

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

    isRelationshipSelected(relationship) {
      return this.selectedRelationship === relationship
    },

    isRelationshipRelated(relationship) {
      if (!this.focusedTable) return true
      return (
        relationship.from_table === this.focusedTable.name ||
        relationship.to_table === this.focusedTable.name
      )
    },
  },
}
</script>

<style scoped>
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
  stroke: #64748b;
  stroke-width: 2.5;
  pointer-events: stroke;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  opacity: 0.7;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.relationship-path:hover,
.relationship-path.relationship-highlighted {
  stroke-width: 3.5;
  opacity: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
}

.relationship-path.relationship-highlighted.one-to-one {
  stroke: #10b981;
  filter: drop-shadow(0 2px 6px rgba(16, 185, 129, 0.4));
}

.relationship-path.relationship-highlighted.one-to-many {
  stroke: #3b82f6;
  filter: drop-shadow(0 2px 6px rgba(59, 130, 246, 0.4));
}

.relationship-path.relationship-highlighted.many-to-one {
  stroke: #8b5cf6;
  filter: drop-shadow(0 2px 6px rgba(139, 92, 246, 0.4));
}

.relationship-path.relationship-highlighted.many-to-many {
  stroke: #f59e0b;
  filter: drop-shadow(0 2px 6px rgba(245, 158, 11, 0.4));
}

/* Arrowhead styles */
.arrowhead {
  fill: #64748b;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.arrowhead-highlighted {
  fill: #475569;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
}

.arrowhead-one-to-one {
  fill: #06eea5;
}

.arrowhead-one-to-many {
  fill: #d6ff07;
}

.arrowhead-many-to-one {
  fill: #02eaff;
}

.arrowhead-many-to-many {
  fill: #d97706;
}

.relationship-type-badge.one-to-one {
  background: #06eea5;
}

.relationship-type-badge.one-to-many {
  background: #d6ff07;
}

.relationship-type-badge.many-to-one {
  background: #02eaff;
}

.relationship-type-badge.many-to-many {
  background: #d97706;
}

/* Relationship coloring when enabled */
.relationship-path.relationship-colored.one-to-one {
  stroke: #10b981;
  opacity: 0.8;
}

.relationship-path.relationship-colored.one-to-many {
  stroke: #3b82f6;
  opacity: 0.8;
}

.relationship-path.relationship-colored.many-to-one {
  stroke: #8b5cf6;
  opacity: 0.8;
}

.relationship-path.relationship-colored.many-to-many {
  stroke: #f59e0b;
  opacity: 0.8;
}

.relationship-path.relationship-selected {
  stroke-width: 4;
  opacity: 1;
  filter: drop-shadow(0 4px 8px rgba(26, 54, 93, 0.4));
  animation: pulse-relationship 2s ease-in-out infinite;
}

@keyframes pulse-relationship {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
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

.relationship-path:hover .arrowhead,
.relationship-path.relationship-highlighted .arrowhead {
  fill: #3b82f6;
}

.relationship-path:not(.relationship-related) {
  opacity: 0.15;
  stroke-width: 1;
  transition: all 0.3s ease;
  pointer-events: none;
}

.relationship-path.relationship-related {
  opacity: 1;
  stroke-width: 2.5;
  transition: all 0.3s ease;
  pointer-events: none;
}

/* Đảm bảo relationship highlight hoạt động */
.relationship-path.relationship-highlighted {
  stroke-width: 4 !important;
  opacity: 1 !important;
  filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.5));
}
</style>