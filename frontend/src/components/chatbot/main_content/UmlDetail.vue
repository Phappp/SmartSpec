<template>
  <div class="uml-detail">
    <!-- Overview Card -->
    <div class="card overview-card">
      <div class="card-header">
        <h3 class="card-title">{{ data.name }}</h3>
        <div class="card-actions">
          <span :class="['status-badge', statusClass]">
            <i class="material-symbols-outlined">{{ statusIcon }}</i>
            {{ statusText }}
          </span>
          <span class="type-badge">
            <i class="material-symbols-outlined">account_tree</i>
            {{ data.type }}
          </span>
        </div>
      </div>
      <p class="card-description">{{ data.description }}</p>
    </div>

    <!-- Diagram Preview -->
    <div class="card">
      <h4 class="card-subheader">
        <i class="material-symbols-outlined">preview</i>
        Diagram Preview
      </h4>
      <div class="diagram-preview">
        <!-- Preview Image (nếu đã generate) -->
        <img
          v-if="previewImage"
          :src="previewImage"
          :alt="data.name || 'UML Diagram'"
          class="preview-image"
          @load="onPreviewImageLoad"
          @error="onPreviewImageError"
        />
        
        <!-- Use Case Diagram Renderer -->
        <div v-else-if="diagramType === 'usecase' || data.type === 'uml-usecase'" class="preview-generator">
          <UCDRenderer
            :ref="`previewGenerator_${data.id || data._id}`"
            :diagram-data="normalizedDiagramData"
            :preview-mode="true"
            :auto-generate-preview="true"
            :optimize-for-preview="true"
            @preview-generated="handlePreviewGenerated"
            class="hidden-renderer"
          />
          <div class="generating-preview">
            <div class="loading-spinner-small"></div>
            <span>Generating preview...</span>
          </div>
        </div>
        
        <!-- Activity Diagram Renderer -->
        <div v-else-if="diagramType === 'activity' || data.type === 'uml-activity'" class="preview-generator">
          <ActivityDiagramRenderer
            :ref="`previewGenerator_${data.id || data._id}`"
            :diagram-data="normalizedDiagramData"
            :preview-mode="true"
            :auto-generate-preview="true"
            :optimize-for-preview="true"
            @preview-generated="handlePreviewGenerated"
            class="hidden-renderer"
          />
          <div class="generating-preview">
            <div class="loading-spinner-small"></div>
            <span>Generating preview...</span>
          </div>
        </div>
        
        <!-- Sequence Diagram Renderer -->
        <div v-else-if="diagramType === 'sequence' || data.type === 'uml-sequence'" class="preview-generator">
          <SequenceDiagramRenderer
            :ref="`previewGenerator_${data.id || data._id}`"
            :diagram-data="normalizedDiagramData"
            :preview-mode="true"
            :auto-generate-preview="true"
            :optimize-for-preview="true"
            @preview-generated="handlePreviewGenerated"
            class="hidden-renderer"
          />
          <div class="generating-preview">
            <div class="loading-spinner-small"></div>
            <span>Generating preview...</span>
          </div>
        </div>
        
        <!-- Fallback Placeholder -->
        <div v-else class="preview-placeholder">
          <i class="material-symbols-outlined preview-icon">account_tree</i>
          <h4 class="preview-title">{{ data.type || 'UML Diagram' }}</h4>
          <p class="preview-description">Visualization of {{ data.name }}</p>
          <div class="preview-hint">Diagram type not recognized</div>
        </div>
      </div>
    </div>

    <!-- Elements & Relationships -->
    <div class="grid-2">
      <!-- Elements Card -->
      <div class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">category</i>
          Elements
        </h4>
        <ul class="elements-list">
          <li v-for="element in data.elements" :key="element" class="element-item">
            <i class="material-symbols-outlined element-icon">fiber_manual_record</i>
            <span class="element-text">{{ element }}</span>
          </li>
        </ul>
      </div>

      <!-- Relationships Card -->
      <div class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">share</i>
          Relationships
        </h4>
        <ul class="relationships-list">
          <li v-for="relationship in data.relationships" :key="relationship" class="relationship-item">
            <i class="material-symbols-outlined relationship-icon">arrow_forward</i>
            <span class="relationship-text">{{ relationship }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Additional Info -->
    <div v-if="data.additionalInfo" class="card">
      <h4 class="card-subheader">
        <i class="material-symbols-outlined">info</i>
        Additional Information
      </h4>
      <div class="additional-info">
        {{ data.additionalInfo }}
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue'
import UCDRenderer from '@/components/uml/usecase_diagram/UCDRenderer.vue'
import ActivityDiagramRenderer from '@/components/uml/activity_diagram/ActivityDiagramRenderer.vue'
import SequenceDiagramRenderer from '@/components/uml/sequence_diagram/SequenceDiagramRenderer.vue'

export default {
  name: 'UmlDetail',
  components: {
    UCDRenderer,
    ActivityDiagramRenderer,
    SequenceDiagramRenderer,
  },
  props: {
    data: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    // Khởi tạo previewImage từ data nếu có sẵn
    const previewImage = ref(props.data.previewImage || null)
    const statusClass = computed(() => {
      const statusMap = {
        completed: 'status-completed',
        in_progress: 'status-progress',
        draft: 'status-draft'
      }
      return statusMap[props.data.status] || 'status-default'
    })

    const statusIcon = computed(() => {
      const iconMap = {
        completed: 'check_circle',
        in_progress: 'schedule',
        draft: 'edit'
      }
      return iconMap[props.data.status] || 'help'
    })

    const statusText = computed(() => {
      const statusMap = {
        completed: 'Completed',
        in_progress: 'In Progress',
        draft: 'Draft'
      }
      return statusMap[props.data.status] || props.data.status
    })

    // Xác định loại diagram từ data
    const diagramType = computed(() => {
      if (props.data.type) {
        if (props.data.type.includes('usecase')) return 'usecase'
        if (props.data.type.includes('activity')) return 'activity'
        if (props.data.type.includes('sequence')) return 'sequence'
      }
      // Fallback: thử đoán từ cấu trúc data
      if (props.data.actors && props.data.usecases) return 'usecase'
      if (props.data.nodes && props.data.edges) return 'activity'
      if (props.data.lifelines && props.data.messages) return 'sequence'
      return null
    })

    // Chuẩn hoá data để renderer có thể sử dụng
    // Renderer cần data đúng format, nên truyền toàn bộ data nếu có
    const normalizedDiagramData = computed(() => {
      // Nếu data đã có đầy đủ structure, dùng luôn
      if (props.data.nodes || props.data.actors || props.data.lifelines) {
        return {
          ...props.data,
          id: props.data.id || props.data._id,
          _id: props.data._id || props.data.id,
        }
      }

      // Nếu không, tạo structure cơ bản
      const base = {
        id: props.data.id || props.data._id,
        _id: props.data._id || props.data.id,
        name: props.data.name,
        description: props.data.description,
        lang: props.data.lang || 'en-US',
      }

      if (diagramType.value === 'usecase') {
        return {
          ...base,
          actors: props.data.actors || [],
          usecases: props.data.usecases || [],
          associations: props.data.associations || [],
          relationships: props.data.relationships || [],
        }
      } else if (diagramType.value === 'activity') {
        return {
          ...base,
          nodes: props.data.nodes || [],
          edges: props.data.edges || [],
          lanes: props.data.lanes || [],
        }
      } else if (diagramType.value === 'sequence') {
        return {
          ...base,
          lifelines: props.data.lifelines || [],
          messages: props.data.messages || [],
          fragments: props.data.fragments || [],
        }
      }

      return base
    })

    // Reset previewImage khi data thay đổi
    watch(
      () => props.data.id || props.data._id,
      () => {
        previewImage.value = props.data.previewImage || null
      }
    )

    // Xử lý preview generated từ renderer
    const handlePreviewGenerated = (previewData) => {
      if (previewData) {
        previewImage.value = previewData
      }
    }

    const onPreviewImageLoad = (event) => {
      event.target.style.opacity = '1'
    }

    const onPreviewImageError = (event) => {
      event.target.style.display = 'none'
      previewImage.value = null
    }

    return {
      statusClass,
      statusIcon,
      statusText,
      diagramType,
      normalizedDiagramData,
      previewImage,
      handlePreviewGenerated,
      onPreviewImageLoad,
      onPreviewImageError,
    }
  }
}
</script>

<style scoped>
.uml-detail {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  background-color: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 20px;
}

.overview-card {
  background: linear-gradient(135deg, #161b22 0%, #1c2b41 100%);
  border: 1px solid #30363d;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}

.card-title {
  font-size: 20px;
  font-weight: 700;
  color: #ffa657;
  margin: 0;
  flex: 1;
}

.card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.card-description {
  color: #8b949e;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}

.card-subheader {
  font-size: 16px;
  font-weight: 600;
  color: #f0f6fc;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-subheader .material-symbols-outlined {
  font-size: 20px;
  color: #ffa657;
}

.diagram-preview {
  border: 2px dashed #30363d;
  border-radius: 8px;
  background-color: #0d1117;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  position: relative;
}

.preview-image {
  width: 100%;
  height: 100%;
  min-height: 300px;
  object-fit: contain;
  transition: opacity 0.3s ease;
  opacity: 0;
}

.preview-generator {
  width: 100%;
  height: 100%;
  min-height: 300px;
  position: relative;
}

.hidden-renderer {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 100%;
  height: 100%;
}

.generating-preview {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #8b949e;
  font-size: 14px;
  background: #0d1117;
}

.loading-spinner-small {
  width: 24px;
  height: 24px;
  border: 2px solid #30363d;
  border-top: 2px solid #ffa657;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.preview-placeholder {
  text-align: center;
  padding: 40px;
  color: #8b949e;
}

.preview-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
  color: #ffa657;
}

.preview-title {
  font-size: 18px;
  font-weight: 600;
  color: #f0f6fc;
  margin: 0 0 8px 0;
}

.preview-description {
  font-size: 14px;
  margin: 0 0 16px 0;
}

.preview-hint {
  font-size: 12px;
  color: #6e7681;
  font-style: italic;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.elements-list,
.relationships-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.element-item,
.relationship-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.element-icon {
  color: #ffa657;
  font-size: 16px;
}

.relationship-icon {
  color: #79c0ff;
  font-size: 18px;
}

.element-text,
.relationship-text {
  color: #c9d1d9;
  font-size: 14px;
  line-height: 1.4;
}

.additional-info {
  color: #8b949e;
  font-size: 14px;
  line-height: 1.5;
  padding: 12px;
  background-color: #0d1117;
  border-radius: 6px;
  border: 1px solid #21262d;
}

.status-badge,
.type-badge {
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-badge .material-symbols-outlined,
.type-badge .material-symbols-outlined {
  font-size: 14px;
}

.status-completed {
  background-color: rgba(46, 160, 67, 0.15);
  color: #7ee787;
}

.status-progress {
  background-color: rgba(187, 128, 9, 0.15);
  color: #ffa657;
}

.status-draft {
  background-color: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}

.status-default {
  background-color: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}

.type-badge {
  background-color: rgba(255, 166, 87, 0.15);
  color: #ffa657;
}
</style>