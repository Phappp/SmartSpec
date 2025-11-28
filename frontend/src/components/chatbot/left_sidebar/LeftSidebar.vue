<template>
  <div class="sidebar-left">
    <div class="sidebar-header">
      <div class="header-top">
        <h2>Dự án</h2>
        <button class="open-project-btn" @click="$emit('open-project-modal')">
          <i class="material-symbols-outlined">folder_open</i>
          Mở dự án
        </button>
      </div>

      <div class="project-info" v-if="selectedProject">
        <span class="project-name">{{ currentProject?.name }}</span>
        <span class="project-description">{{ currentProject?.description }}</span>
        <div class="project-stats">
          <span class="stat">
            <i class="material-symbols-outlined">people</i>
            {{ currentProject?.members }}
          </span>
          <span class="stat">
            <i class="material-symbols-outlined">trending_up</i>
            {{ currentProject?.progress }}%
          </span>
        </div>
      </div>
    </div>

    <div class="sidebar-content">
      <EntitySection
        v-for="section in entitySections"
        :key="section.type"
        :type="section.type"
        :title="section.title"
        :entities="section.entities"
        :isOpen="section.isOpen"
        :icon="section.icon"
        :selectedEntity="selectedEntity"
        :allowCreate="section.allowCreate"
        @toggle="toggleSection(section.type)"
        @select="onEntitySelect"
        @drag-start="onEntityDragStart"
        @add-to-chat="onAddToChat"
        @create="onCreateEntity(section.type)"
      />

      <!-- UML Sub-sections -->
      <div class="uml-sections" v-if="sectionStates.uml">
        <EntitySection
          v-for="umlSection in umlSubSections"
          :key="umlSection.type"
          :type="umlSection.type"
          :title="umlSection.title"
          :entities="umlSection.entities"
          :isOpen="umlSection.isOpen"
          :icon="umlSection.icon"
          :isSubSection="true"
          :selectedEntity="selectedEntity"
          :allowCreate="umlSection.allowCreate"
          @toggle="toggleUmlSection(umlSection.type)"
          @select="onEntitySelect"
          @drag-start="onEntityDragStart"
          @add-to-chat="onAddToChat"
          @create="onCreateEntity(umlSection.type)"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue'
import EntitySection from './EntitySection.vue'

export default {
  name: 'LeftSidebar',
  components: {
    EntitySection,
  },
  props: {
    selectedProject: {
      type: [Number, String],
      default: null,
    },
    entities: {
      type: Object,
      required: true,
    },
    projects: {
      type: Array,
      default: () => [],
    },
    selectedEntity: {
      type: Object,
      default: null,
    },
    crudCapabilities: {
      type: Object,
      default: () => ({}),
    },
  },
  emits: [
    'project-change',
    'entity-select',
    'entity-drag-start',
    'add-to-chat',
    'open-project-modal',
    'create-entity',
  ],
  setup(props, { emit }) {
    const sectionStates = ref({
      usecase: true,
      testcase: true,
      database: true,
      uml: true,
      umlActivity: true,
      umlUsecase: true,
      umlSequence: true,
    })

    const resolveCapability = (type) => props.crudCapabilities?.[type] || {}

    const entitySections = computed(() => [
      {
        type: 'usecase',
        title: 'Use Cases',
        entities: props.entities.usecases ?? [],
        isOpen: sectionStates.value.usecase,
        icon: 'description',
        color: '#79c0ff',
        allowCreate: !!resolveCapability('usecase').canCreate,
      },
      {
        type: 'testcase',
        title: 'Test Cases',
        entities: props.entities.testcases ?? [],
        isOpen: sectionStates.value.testcase,
        icon: 'science',
        color: '#7ee787',
        allowCreate: !!resolveCapability('testcase').canCreate,
      },
      {
        type: 'database',
        title: 'Databases',
        entities: props.entities.databases ?? [],
        isOpen: sectionStates.value.database,
        icon: 'storage',
        color: '#d2a8ff',
        allowCreate: !!resolveCapability('database').canCreate,
      },
      {
        type: 'uml',
        title: 'UML Diagrams',
        entities: [],
        isOpen: sectionStates.value.uml,
        icon: 'account_tree',
        color: '#ffa657',
        allowCreate: false,
      },
    ])

    const umlSubSections = computed(() => [
      {
        type: 'uml-activity',
        title: 'Activity Diagrams',
        entities: props.entities.umlDiagrams?.activity ?? [],
        isOpen: sectionStates.value.umlActivity,
        icon: 'swap_horiz',
        color: '#ffa657',
        allowCreate: !!resolveCapability('uml-activity').canCreate,
      },
      {
        type: 'uml-usecase',
        title: 'Use Case Diagrams',
        entities: props.entities.umlDiagrams?.usecase ?? [],
        isOpen: sectionStates.value.umlUsecase,
        icon: 'group',
        color: '#ffa657',
        allowCreate: !!resolveCapability('uml-usecase').canCreate,
      },
      {
        type: 'uml-sequence',
        title: 'Sequence Diagrams',
        entities: props.entities.umlDiagrams?.sequence ?? [],
        isOpen: sectionStates.value.umlSequence,
        icon: 'fast_forward',
        color: '#ffa657',
        allowCreate: !!resolveCapability('uml-sequence').canCreate,
      },
    ])

    const currentProject = computed(() =>
      props.projects.find((p) => String(p.id ?? p._id) === String(props.selectedProject))
    )

    const totalEntities = computed(() => {
      let total = 0
      total += props.entities.usecases?.length || 0
      total += props.entities.testcases?.length || 0
      total += props.entities.databases?.length || 0
      total += props.entities.umlDiagrams.activity?.length || 0
      total += props.entities.umlDiagrams.usecase?.length || 0
      total += props.entities.umlDiagrams.sequence?.length || 0
      return total
    })

    const activeProjects = computed(
      () => props.projects.filter((p) => p.status === 'active').length || 0
    )

    const toggleSection = (sectionType) => {
      sectionStates.value[sectionType] = !sectionStates.value[sectionType]
    }

    const toggleUmlSection = (umlSectionType) => {
      sectionStates.value[umlSectionType] = !sectionStates.value[umlSectionType]
    }

    const onEntitySelect = (entity) => {
      // Xử lý cho UML sub-sections
      if (entity.type.startsWith('uml-')) {
        const umlType = entity.type.replace('uml-', '')
        emit('entity-select', {
          ...entity,
          type: 'uml',
          umlType: umlType,
        })
      } else {
        emit('entity-select', entity)
      }
    }

    const onEntityDragStart = (event, entity) => {
      emit('entity-drag-start', event, entity)
    }

    const onCreateEntity = (type) => () => {
      emit('create-entity', type)
    }

    const onAddToChat = (contextData) => {
      emit('add-to-chat', contextData)
    }

    return {
      entitySections,
      umlSubSections,
      currentProject,
      totalEntities,
      activeProjects,
      sectionStates,
      toggleSection,
      toggleUmlSection,
      onEntitySelect,
      onEntityDragStart,
      onAddToChat,
      onCreateEntity,
    }
  },
}
</script>

<style scoped>
.sidebar-left {
  width: 15%;
  min-width: 320px;
  background-color: #161b22;
  border-right: 1px solid #21262d;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid #21262d;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.sidebar-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #f0f6fc;
  margin: 0;
}

.open-project-btn {
  background: #238636;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.open-project-btn:hover {
  background: #2ea043;
}

.project-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.project-name {
  font-size: 14px;
  font-weight: 500;
  color: #79c0ff;
}

.project-description {
  font-size: 12px;
  color: #8b949e;
  line-height: 1.3;
}

.project-stats {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.stat {
  font-size: 11px;
  color: #8b949e;
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat .material-symbols-outlined {
  font-size: 14px;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.uml-sections {
  margin-left: 12px;
  border-left: 2px solid #30363d;
  padding-left: 8px;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #21262d;
  background-color: #0d1117;
}

.quick-stats {
  display: flex;
  justify-content: space-around;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #f0f6fc;
}

.stat-label {
  font-size: 11px;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sidebar-content::-webkit-scrollbar {
  width: 4px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: #161b22;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 2px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background: #484f58;
}
</style>