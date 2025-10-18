<template>
  <div class="mini-map">
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
</template>

<script>
export default {
  name: 'MiniMap',
  props: {
    tables: Array,
    viewportPosition: Object,
    miniMapWidth: Number,
    miniMapHeight: Number,
    miniMapScale: Number,
    selectedTable: String,
  },
}
</script>

<style scoped>
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
</style>