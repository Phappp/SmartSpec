<template>
  <div class="entity-section" :class="{ 'sub-section': isSubSection }">
    <button
      class="section-header"
      :style="{ borderLeftColor: color, paddingLeft: isSubSection ? '12px' : '16px' }"
      @click="$emit('toggle')"
    >
      <div class="header-left">
        <i class="material-symbols-outlined section-icon">{{ icon }}</i>
        <span class="section-title">{{ title }}</span>
        <span class="entity-count">({{ safeEntities.length }})</span>
      </div>
      <div class="header-right">
        <button
          v-if="allowCreate"
          class="icon-button"
          title="Thêm mới"
          @click.stop="$emit('create')"
        >
          <i class="material-symbols-outlined">add</i>
        </button>
        <i class="material-symbols-outlined toggle-icon">{{ isOpen ? 'expand_less' : 'expand_more' }}</i>
      </div>
    </button>

    <div class="section-content" :class="{ open: isOpen }">
      <div class="entities-container">
        <EntityItem
          v-for="entity in safeEntities"
          :key="entity.id || entity._id"
          :entity="entity"
          :type="type"
          :isActive="isActive(entity)"
          @select="onSelect"
          @drag-start="onDragStart"
          @add-to-chat="onAddToChat"
        />
      </div>

      <div v-if="safeEntities.length === 0" class="empty-section">
        <i class="material-symbols-outlined empty-icon">description</i>
        <span class="empty-text">Không có dữ liệu</span>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import EntityItem from './EntityItem.vue'

export default {
  name: 'EntitySection',
  components: {
    EntityItem,
  },
  props: {
    type: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    entities: {
      type: Array,
      required: true,
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    icon: {
      type: String,
      default: 'article',
    },
    color: {
      type: String,
      default: '#79c0ff',
    },
    isSubSection: {
      type: Boolean,
      default: false,
    },
    selectedEntity: {
      type: Object,
      default: null,
    },
    allowCreate: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['toggle', 'select', 'drag-start', 'add-to-chat', 'create'],
  setup(props, { emit }) {
    const safeEntities = computed(() => props.entities || [])

    const isActive = (entity) => {
      if (!props.selectedEntity) return false
      const selectedId =
        props.selectedEntity.id ??
        props.selectedEntity._id ??
        (props.selectedEntity.data?.id ?? props.selectedEntity.data?._id)
      if (!selectedId) return false

      const normalizedSelectedId = String(selectedId)
      const entityId = String(entity.id ?? entity._id ?? '')
      if (!entityId) return false

      if (props.type.startsWith('uml-')) {
        if (props.selectedEntity.type !== 'uml') return false
        const umlType = props.selectedEntity.umlType || ''
        return entityId === normalizedSelectedId && `uml-${umlType}` === props.type
      }

      return entityId === normalizedSelectedId && props.selectedEntity.type === props.type
    }

    const onSelect = (entity) => {
      emit('select', entity)
    }

    const onDragStart = (event, entity) => {
      emit('drag-start', event, entity)
    }

    const onAddToChat = (contextData) => {
      emit('add-to-chat', contextData)
    }

    return {
      safeEntities,
      isActive,
      onSelect,
      onDragStart,
      onAddToChat,
    }
  },
}
</script>

<style scoped>
.entity-section {
  border: 1px solid #30363d;
  border-radius: 8px;
  margin-bottom: 8px;
  background-color: #161b22;
  overflow: hidden;
}

.entity-section.sub-section {
  border: none;
  border-radius: 4px;
  margin-bottom: 4px;
  background-color: #0d1117;
}

.section-header {
  width: 100%;
  padding: 12px 16px;
  background-color: #161b22;
  border: none;
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s;
  border-left: 3px solid;
}

.entity-section.sub-section .section-header {
  background-color: #0d1117;
  padding: 8px 12px;
}

.section-header:hover {
  background-color: #1f2937;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 18px;
  color: #58a6ff;
}

.section-title {
  font-weight: 600;
  color: #f0f6fc;
  font-size: 14px;
}

.entity-section.sub-section .section-title {
  font-size: 13px;
  font-weight: 500;
}

.entity-count {
  color: #8b949e;
  font-size: 12px;
}

.toggle-icon {
  color: #8b949e;
  font-size: 18px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon-button {
  background: transparent;
  border: 1px solid #30363d;
  border-radius: 4px;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8b949e;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-button:hover {
  border-color: #58a6ff;
  color: #58a6ff;
  background-color: rgba(88, 166, 255, 0.1);
}

.section-content {
  background-color: #0d1117;
  display: none;
  border-top: 1px solid #21262d;
}

.entity-section.sub-section .section-content {
  border-top: 1px solid #30363d;
}

.section-content.open {
  display: block;
}

.entities-container {
  max-height: 300px;
  overflow-x: hidden;
  overflow-y: auto;
}

.entities-container::-webkit-scrollbar {
  width: 3px;
}

.entities-container::-webkit-scrollbar-track {
  background: #0d1117;
}

.entities-container::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 1.5px;
}

.empty-section {
  padding: 20px;
  text-align: center;
  color: #6e7681;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-icon {
  font-size: 24px;
  color: #6e7681;
}

.empty-text {
  font-size: 12px;
}
</style>