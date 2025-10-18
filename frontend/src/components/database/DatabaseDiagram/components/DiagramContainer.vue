<template>
  <div
    class="diagram-container"
    :style="{ width: width + 'px', height: height + 'px' }"
    @wheel="$emit('wheel', $event)"
    @mousedown="$emit('mousedown', $event)"
    @mousemove="$emit('mousemove', $event)"
    @mouseup="$emit('mouseup', $event)"
    @mouseleave="$emit('mouseleave', $event)"
    @contextmenu.prevent="$emit('contextmenu', $event)"
    ref="container"
  >
    <!-- Grid Background -->
    <div v-if="showGrid" class="grid-background" :style="gridStyle"></div>

    <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'DiagramContainer',
  props: {
    width: Number,
    height: Number,
    showGrid: Boolean,
    gridStyle: Object,
    zoomLevel: Number,
    diagramOffset: Object,
  },
  emits: ['wheel', 'mousedown', 'mousemove', 'mouseup', 'mouseleave', 'contextmenu'],
  mounted() {
    this.$el.style.cursor = 'grab'
  },
}
</script>

<style scoped>
.diagram-container {
  position: relative;
  overflow: auto;
  background-color: #f8fafc;
  cursor: grab;
}

.diagram-container.panning {
  cursor: grabbing;
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
</style>