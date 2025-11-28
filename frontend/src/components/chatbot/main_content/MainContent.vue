<template>
  <div class="main-content">
    <div class="content-header">
      <div class="header-main">
        <h2>{{ contentTitle }}</h2>
        <div class="header-actions">
          <button v-if="selectedEntity" class="action-btn" @click="addToChat" title="Thêm vào chat">
            <i class="material-symbols-outlined">chat</i>
            Thêm vào chat
          </button>
          <button
            v-if="selectedEntity && canDeleteEntity"
            class="action-btn danger"
            @click="$emit('delete-entity')"
            title="Xóa"
          >
            <i class="material-symbols-outlined">delete</i>
            Xóa
          </button>
        </div>
      </div>
      <div v-if="selectedEntity" class="breadcrumb">
        <span class="breadcrumb-item">{{ entityTypeLabel }}</span>
        <i class="material-symbols-outlined breadcrumb-separator">chevron_right</i>
        <span class="breadcrumb-item current">{{ entityName }}</span>
      </div>
    </div>

    <div v-if="pendingOperations.length" class="operation-review">
      <h3>Thay đổi chờ xác nhận</h3>
      <div
        v-for="operation in pendingOperations"
        :key="operation.id"
        class="operation-card"
      >
        <div class="operation-card-header">
          <div class="operation-info">
            <span class="operation-chip">{{ operation.action }}</span>
            <span class="operation-entity">{{ formatOperationTitle(operation) }}</span>
            <span class="operation-description" v-if="operation.description">
              {{ operation.description }}
            </span>
          </div>
          <div class="operation-actions">
            <button class="btn-ghost" @click="$emit('undo-operation', operation.id)">
              Hoàn tác
            </button>
            <button class="btn-primary" @click="$emit('keep-operation', operation.id)">
              Giữ
            </button>
          </div>
        </div>
        <div class="operation-diff">
          <div class="diff-column">
            <h4>Trước</h4>
            <pre>{{ formatJson(operation.before) }}</pre>
          </div>
          <div class="diff-column">
            <h4>Sau</h4>
            <pre>{{ formatJson(operation.after) }}</pre>
          </div>
        </div>
      </div>
    </div>

    <div class="content-body">
      <!-- Empty State -->
      <div v-if="!selectedEntity" class="empty-state">
        <div class="empty-icon">
          <i class="material-symbols-outlined">waving_hand</i>
        </div>
        <h3 class="empty-title">Chào mừng đến với Chatbot Assistant</h3>
        <p class="empty-description">
          Chọn một use case, test case, database hoặc UML diagram từ sidebar bên trái để xem chi
          tiết.
        </p>
        <div class="empty-features">
          <div class="feature-item">
            <i class="material-symbols-outlined">ads_click</i>
            <span class="feature-text">Kéo thả entities vào khung chat để thêm ngữ cảnh</span>
          </div>
          <div class="feature-item">
            <i class="material-symbols-outlined">chat</i>
            <span class="feature-text">Chat với AI assistant về dự án của bạn</span>
          </div>
          <div class="feature-item">
            <i class="material-symbols-outlined">search</i>
            <span class="feature-text">Phân tích chi tiết các thành phần hệ thống</span>
          </div>
        </div>
      </div>

      <!-- Usecase Detail -->
      <UsecaseDetail
        v-else-if="selectedEntity.type === 'usecase'"
        :data="entityData"
        :canEdit="canEditEntity"
        :mode="entityMode"
        :isCreating="isCreating"
        @submit="onDetailSubmit('usecase', $event)"
        @cancel="onDetailCancel"
      />

      <!-- Testcase Detail -->
      <TestcaseDetail
        v-else-if="selectedEntity.type === 'testcase'"
        :data="entityData"
        :canEdit="canEditEntity"
        :mode="entityMode"
        :isCreating="isCreating"
        @submit="onDetailSubmit('testcase', $event)"
        @cancel="onDetailCancel"
      />

      <!-- Database Detail -->
      <DatabaseDetail
        v-else-if="selectedEntity.type === 'database'"
        :data="entityData"
        :canEdit="canEditEntity"
        :mode="entityMode"
        :isCreating="isCreating"
        @submit="onDetailSubmit('database', $event)"
        @cancel="onDetailCancel"
      />

      <!-- UML Detail -->
      <UmlDetail v-else-if="selectedEntity.type === 'uml'" :data="entityData" />
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import UsecaseDetail from './UsecaseDetail.vue'
import TestcaseDetail from './TestcaseDetail.vue'
import DatabaseDetail from './DatabaseDetail.vue'
import UmlDetail from './UmlDetail.vue'

export default {
  name: 'MainContent',
  components: {
    UsecaseDetail,
    TestcaseDetail,
    DatabaseDetail,
    UmlDetail,
  },
  props: {
    selectedEntity: {
      type: Object,
      default: null,
    },
    entityData: {
      type: Object,
      default: null,
    },
    pendingOperations: {
      type: Array,
      default: () => [],
    },
    canEditEntity: {
      type: Boolean,
      default: false,
    },
    canDeleteEntity: {
      type: Boolean,
      default: false,
    },
    entityMode: {
      type: String,
      default: 'view',
    },
    isCreating: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    'add-to-chat',
    'undo-operation',
    'keep-operation',
    'save-entity',
    'cancel-create',
    'delete-entity',
  ],
  setup(props, { emit }) {
    const contentTitle = computed(() => {
      if (!props.selectedEntity) return 'Tổng quan'

      const typeMap = {
        usecase: 'Use Case',
        testcase: 'Test Case',
        database: 'Database',
        uml: 'UML Diagram',
      }

      return `${typeMap[props.selectedEntity.type]} Detail`
    })

    const entityTypeLabel = computed(() => {
      const typeMap = {
        usecase: 'Use Case',
        testcase: 'Test Case',
        database: 'Database',
        uml: 'UML Diagram',
      }
      return typeMap[props.selectedEntity?.type] || 'Entity'
    })

    const entityName = computed(() => {
      return props.entityData?.name || props.entityData?.title || 'Unnamed'
    })

    const addToChat = () => {
      if (props.selectedEntity && props.entityData) {
        emit('add-to-chat', {
          type: props.selectedEntity.type,
          id: props.selectedEntity.id,
          name: entityName.value,
          data: props.entityData,
        })
      }
    }

    const exportEntity = () => {
      // Export functionality would be implemented here
      console.log('Exporting:', props.selectedEntity)
    }

    const formatJson = (value) => {
      if (!value) return '∅'
      try {
        return JSON.stringify(value, null, 2)
      } catch (error) {
        return String(value)
      }
    }

    const formatOperationTitle = (operation) => {
      return `${operation.entityType || 'entity'} · ${operation.entityId || ''}`.trim()
    }

    const onDetailSubmit = (type, payload) => {
      emit('save-entity', { type, payload })
    }

    const onDetailCancel = () => {
      emit('cancel-create')
    }

    return {
      contentTitle,
      entityTypeLabel,
      entityName,
      addToChat,
      exportEntity,
      formatJson,
      formatOperationTitle,
      onDetailSubmit,
      onDetailCancel,
    }
  },
}
</script>

<style scoped>
.main-content {
  width: 60%;
  background-color: #0d1117;
  border-right: 1px solid #21262d;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.content-header {
  padding: 20px 24px;
  border-bottom: 1px solid #21262d;
  background-color: #161b22;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.header-main h2 {
  font-size: 24px;
  font-weight: 700;
  color: #f0f6fc;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #21262d;
  color: #c9d1d9;
  border: 1px solid #30363d;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.action-btn.danger {
  border-color: #f85149;
  color: #ff7b72;
}

.action-btn.danger:hover {
  background-color: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
}

.action-btn:hover {
  background-color: #30363d;
  border-color: #58a6ff;
  color: #58a6ff;
}

.action-btn .material-symbols-outlined {
  font-size: 16px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.breadcrumb-item {
  color: #8b949e;
}

.breadcrumb-item.current {
  color: #f0f6fc;
  font-weight: 500;
}

.breadcrumb-separator {
  color: #484f58;
  font-size: 18px;
}

.operation-review {
  padding: 16px 24px;
  border-bottom: 1px solid #21262d;
  background-color: #10151d;
}

.operation-review h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #f0f6fc;
}

.operation-card {
  border: 1px solid #2f3742;
  border-radius: 8px;
  padding: 12px;
  background-color: #111824;
  margin-bottom: 12px;
}

.operation-card-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.operation-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.operation-chip {
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 700;
  color: #f0f6fc;
  background: #bb86fc33;
  padding: 2px 8px;
  border-radius: 12px;
}

.operation-entity {
  font-weight: 600;
  color: #c9d1d9;
}

.operation-description {
  color: #8b949e;
  font-size: 12px;
}

.operation-actions {
  display: flex;
  gap: 8px;
}

.btn-ghost,
.btn-primary {
  border: 1px solid #30363d;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  background: transparent;
  color: #c9d1d9;
}

.btn-ghost:hover {
  border-color: #f8514980;
  color: #ff7b72;
}

.btn-primary {
  background: #238636;
  border-color: #2ea043;
  color: #fff;
}

.btn-primary:hover {
  background: #2ea043;
}

.operation-diff {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.diff-column h4 {
  margin: 0 0 4px 0;
  font-size: 12px;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.diff-column pre {
  background-color: #0d1117;
  border: 1px solid #1f2632;
  border-radius: 6px;
  padding: 8px;
  font-size: 11px;
  max-height: 200px;
  overflow: auto;
}

.content-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
  max-width: 500px;
  margin: 0 auto;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  color: #58a6ff;
}

.empty-icon .material-symbols-outlined {
  font-size: 64px;
}

.empty-title {
  font-size: 24px;
  font-weight: 600;
  color: #f0f6fc;
  margin-bottom: 12px;
}

.empty-description {
  font-size: 16px;
  color: #8b949e;
  line-height: 1.5;
  margin-bottom: 30px;
}

.empty-features {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: #161b22;
  border-radius: 8px;
  border: 1px solid #21262d;
}

.feature-item .material-symbols-outlined {
  font-size: 20px;
  color: #58a6ff;
  flex-shrink: 0;
}

.feature-text {
  color: #c9d1d9;
  font-size: 14px;
  text-align: left;
}

/* Scrollbar */
.content-body::-webkit-scrollbar {
  width: 6px;
}

.content-body::-webkit-scrollbar-track {
  background: #0d1117;
}

.content-body::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 3px;
}

.content-body::-webkit-scrollbar-thumb:hover {
  background: #484f58;
}
</style>