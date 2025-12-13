<template>
  <div class="change-visualization">
    <!-- Before Panel -->
    <div class="comparison-panel before-panel">
      <div class="panel-header">
        <span class="material-symbols-outlined">history</span>
        Before
      </div>
      <div class="panel-content">
        <div v-if="beforeData" class="visualized-content">
          <ChangeFieldDisplay :data="beforeData" :entity-type="entityType" />
        </div>
        <div v-else class="no-data">
          <span class="material-symbols-outlined">add</span>
          No previous data
        </div>
      </div>
    </div>

    <!-- After Panel -->
    <div class="comparison-panel after-panel">
      <div class="panel-header">
        <span class="material-symbols-outlined">edit</span>
        After
      </div>
      <div class="panel-content">
        <div v-if="afterData" class="visualized-content">
          <ChangeFieldDisplay :data="afterData" :entity-type="entityType" />
        </div>
        <div v-else class="no-data">
          <span class="material-symbols-outlined">remove</span>
          Data will be removed
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ChangeFieldDisplay from './ChangeFieldDisplay.vue'

export default {
  name: 'ChangeVisualization',
  components: {
    ChangeFieldDisplay,
  },
  props: {
    beforeSnapshot: {
      type: [Object, String],
      default: null,
    },
    afterSnapshot: {
      type: [Object, String],
      default: null,
    },
    entityType: {
      type: String,
      default: '',
    },
  },
  computed: {
    beforeData() {
      if (!this.beforeSnapshot) return null
      if (typeof this.beforeSnapshot === 'string') {
        try {
          return JSON.parse(this.beforeSnapshot)
        } catch {
          return null
        }
      }
      return this.beforeSnapshot
    },
    afterData() {
      if (!this.afterSnapshot) return null
      if (typeof this.afterSnapshot === 'string') {
        try {
          return JSON.parse(this.afterSnapshot)
        } catch {
          return null
        }
      }
      return this.afterSnapshot
    },
  },
}
</script>

<style scoped>
.change-visualization {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  flex: 1;
  min-height: 0;
}

.comparison-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  color: #374151;
}

.before-panel .panel-header {
  color: #dc2626;
}

.after-panel .panel-header {
  color: #16a34a;
}

.panel-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
  background: #fafafa;
}

.visualized-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6b7280;
  text-align: center;
  gap: 8px;
  min-height: 200px;
}

.no-data .material-symbols-outlined {
  font-size: 48px;
  opacity: 0.5;
}
</style>










