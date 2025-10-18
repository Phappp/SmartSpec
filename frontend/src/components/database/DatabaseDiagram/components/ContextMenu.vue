<template>
  <div
    class="context-menu"
    :style="{
      left: x + 'px',
      top: y + 'px',
    }"
  >
    <div class="context-menu-item" @click="$emit('add-new-table')">Add New Table</div>
    <div class="context-menu-item" @click="$emit('auto-layout')">Auto Layout</div>
    <div class="context-menu-item" @click="$emit('clear-selection')">Clear Selection</div>
    <div class="context-menu-item" @click="$emit('export-as-image')">Export as Image</div>
  </div>
</template>

<script>
export default {
  name: 'ContextMenu',
  props: {
    x: Number,
    y: Number,
  },
  emits: ['add-new-table', 'auto-layout', 'clear-selection', 'export-as-image', 'close'],
  mounted() {
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeDestroy() {
    document.removeEventListener('click', this.handleClickOutside)
  },
  methods: {
    handleClickOutside(event) {
      if (!this.$el.contains(event.target)) {
        this.$emit('close')
      }
    },
  },
}
</script>

<style scoped>
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
</style>