<template>
  <div class="usecase-detail">
    <!-- Overview Card -->
    <div class="card overview-card">
      <div class="card-header">
        <div class="title-wrapper">
          <h3 v-if="!isEditing" class="card-title">{{ data?.name || 'Unnamed Use Case' }}</h3>
          <input
            v-else
            class="input title-input"
            v-model="formData.name"
            placeholder="Tên use case"
          />
          <div class="card-actions">
            <template v-if="!isEditing">
              <span :class="['status-badge', statusClass]">
                <i class="material-symbols-outlined">{{ statusIcon }}</i>
                {{ statusText }}
              </span>
              <span :class="['priority-badge', priorityClass]">
                <i class="material-symbols-outlined">flag</i>
                {{ priorityText }}
              </span>
            </template>
            <template v-else>
              <select class="pill-input" v-model="formData.status">
                <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <select class="pill-input" v-model="formData.priority">
                <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </template>
          </div>
        </div>
        <div v-if="canEditControls" class="edit-toolbar">
          <button v-if="!isEditing" class="icon-button" @click="startEditing" title="Chỉnh sửa">
            <i class="material-symbols-outlined">edit</i>
          </button>
          <div v-else class="edit-actions">
            <button class="btn primary mini" @click="saveChanges">
              <i class="material-symbols-outlined">save</i>
              Lưu
            </button>
            <button class="btn ghost mini" @click="cancelEditing">
              <i class="material-symbols-outlined">close</i>
              Hủy
            </button>
          </div>
        </div>
      </div>
      <div v-if="!isEditing" class="card-description">
        {{ data.goal || data.description || 'No description' }}
      </div>
      <textarea
        v-else
        class="textarea description-input"
        v-model="formData.goal"
        placeholder="Mục tiêu hoặc mô tả"
      ></textarea>
      <div v-if="data.reason && !isEditing" class="card-reason">
        <strong>Lý do:</strong> {{ data.reason }}
      </div>
      <div v-if="data.feedback && !isEditing" class="card-feedback">
        <strong>Feedback:</strong> {{ formatFeedback(data.feedback) }}
      </div>
    </div>

    <!-- Two Column Layout -->
    <div class="grid-2">
      <!-- Actors Card -->
      <div class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">people</i>
          Actors / Role
        </h4>
        <template v-if="isEditing">
          <div class="editable-list">
            <div
              v-for="(actor, index) in formData.actors"
              :key="`actor-${index}`"
              class="editable-list-item"
            >
              <input class="input" v-model="formData.actors[index]" placeholder="Tên actor" />
              <button class="icon-button" @click="removeListItem('actors', index)" title="Xóa">
                <i class="material-symbols-outlined">close</i>
              </button>
            </div>
            <button class="btn ghost mini" @click="addListItem('actors')">
              <i class="material-symbols-outlined">add</i>
              Thêm actor
            </button>
          </div>
        </template>
        <template v-else>
          <div v-if="data.role" class="role-info">
            <div class="role-name">{{ data.role.name || 'N/A' }}</div>
            <div v-if="data.role.description" class="role-description">
              {{ data.role.description }}
            </div>
          </div>
          <ul v-else-if="data.actors && data.actors.length" class="entity-list">
            <li v-for="actor in data.actors" :key="actor" class="entity-item">
              <i class="material-symbols-outlined entity-icon">person</i>
              <span class="entity-text">{{ actor }}</span>
            </li>
          </ul>
          <div v-else class="empty-state">
            <i class="material-symbols-outlined">inbox</i>
            <span class="empty-text">No actors</span>
          </div>
        </template>
      </div>

      <!-- Preconditions Card -->
      <div class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">assignment</i>
          Preconditions
        </h4>
        <template v-if="isEditing">
          <div class="editable-list">
            <div
              v-for="(item, index) in formData.preconditions"
              :key="`precondition-${index}`"
              class="editable-list-item"
            >
              <input
                class="input"
                v-model="formData.preconditions[index]"
                placeholder="Điều kiện"
              />
              <button class="icon-button" @click="removeListItem('preconditions', index)">
                <i class="material-symbols-outlined">close</i>
              </button>
            </div>
            <button class="btn ghost mini" @click="addListItem('preconditions')">
              <i class="material-symbols-outlined">add</i>
              Thêm điều kiện
            </button>
          </div>
        </template>
        <template v-else>
          <ul class="entity-list" v-if="data.preconditions && data.preconditions.length">
            <li v-for="precondition in data.preconditions" :key="precondition" class="entity-item">
              <i class="material-symbols-outlined entity-icon">checklist</i>
              <span class="entity-text">{{ precondition }}</span>
            </li>
          </ul>
          <div v-else class="empty-state">
            <i class="material-symbols-outlined">inbox</i>
            <span class="empty-text">No preconditions</span>
          </div>
        </template>
      </div>
    </div>

    <!-- Main Flow / Tasks Card -->
    <div class="card">
      <h4 class="card-subheader">
        <i class="material-symbols-outlined">play_arrow</i>
        Main Flow / Tasks
      </h4>
      <div v-if="isEditing" class="steps-editor">
        <div
          v-for="(step, index) in formData.mainFlow"
          :key="`step-${index}`"
          class="step-edit-row"
        >
          <div class="step-number">{{ index + 1 }}</div>
          <textarea
            class="textarea step-textarea"
            v-model="formData.mainFlow[index]"
            placeholder="Mô tả bước"
          ></textarea>
          <button class="icon-button" @click="removeListItem('mainFlow', index)">
            <i class="material-symbols-outlined">close</i>
          </button>
        </div>
        <button class="btn ghost mini" @click="addListItem('mainFlow')">
          <i class="material-symbols-outlined">add</i>
          Thêm bước
        </button>
      </div>
      <ol v-else class="steps-list">
        <li
          v-for="(step, index) in data.tasks || data.mainFlow || []"
          :key="index"
          class="step-item"
        >
          <div class="step-number">{{ index + 1 }}</div>
          <div class="step-content">{{ step }}</div>
        </li>
      </ol>
    </div>

    <!-- Additional Info Grid -->
    <div class="grid-2">
      <!-- Inputs Card -->
      <div v-if="data.inputs && data.inputs.length" class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">input</i>
          Inputs
        </h4>
        <ul class="entity-list">
          <li v-for="input in data.inputs" :key="input" class="entity-item">
            <i class="material-symbols-outlined entity-icon">arrow_downward</i>
            <span class="entity-text">{{ input }}</span>
          </li>
        </ul>
      </div>

      <!-- Outputs Card -->
      <div v-if="data.outputs && data.outputs.length" class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">output</i>
          Outputs
        </h4>
        <ul class="entity-list">
          <li v-for="output in data.outputs" :key="output" class="entity-item">
            <i class="material-symbols-outlined entity-icon">arrow_upward</i>
            <span class="entity-text">{{ output }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Postconditions Card -->
    <div v-if="data.postconditions && data.postconditions.length" class="card">
      <h4 class="card-subheader">
        <i class="material-symbols-outlined">task_alt</i>
        Postconditions
      </h4>
      <ul class="entity-list">
        <li v-for="postcondition in data.postconditions" :key="postcondition" class="entity-item">
          <i class="material-symbols-outlined entity-icon">verified</i>
          <span class="entity-text">{{ postcondition }}</span>
        </li>
      </ul>
    </div>

    <!-- Rules & Triggers -->
    <div class="grid-2">
      <div v-if="data.rules && data.rules.length" class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">rule</i>
          Rules
        </h4>
        <ul class="entity-list">
          <li v-for="rule in data.rules" :key="rule" class="entity-item">
            <i class="material-symbols-outlined entity-icon">gavel</i>
            <span class="entity-text">{{ rule }}</span>
          </li>
        </ul>
      </div>

      <div v-if="data.triggers && data.triggers.length" class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">bolt</i>
          Triggers
        </h4>
        <ul class="entity-list">
          <li v-for="trigger in data.triggers" :key="trigger" class="entity-item">
            <i class="material-symbols-outlined entity-icon">flash_on</i>
            <span class="entity-text">{{ trigger }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Exceptions & Related Usecases -->
    <div class="grid-2">
      <div v-if="data.exceptions && data.exceptions.length" class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">error</i>
          Exceptions
        </h4>
        <ul class="entity-list">
          <li v-for="exception in data.exceptions" :key="exception" class="entity-item">
            <i class="material-symbols-outlined entity-icon">warning</i>
            <span class="entity-text">{{ exception }}</span>
          </li>
        </ul>
      </div>

      <div v-if="data.related_usecases && data.related_usecases.length" class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">link</i>
          Related Use Cases
        </h4>
        <ul class="entity-list">
          <li v-for="related in data.related_usecases" :key="related" class="entity-item">
            <i class="material-symbols-outlined entity-icon">share</i>
            <span class="entity-text">{{ related }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Stakeholders & Constraints -->
    <div class="grid-2">
      <div v-if="data.stakeholders && data.stakeholders.length" class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">groups</i>
          Stakeholders
        </h4>
        <ul class="entity-list">
          <li v-for="stakeholder in data.stakeholders" :key="stakeholder" class="entity-item">
            <i class="material-symbols-outlined entity-icon">person</i>
            <span class="entity-text">{{ stakeholder }}</span>
          </li>
        </ul>
      </div>

      <div v-if="data.constraints && data.constraints.length" class="card">
        <h4 class="card-subheader">
          <i class="material-symbols-outlined">lock</i>
          Constraints
        </h4>
        <ul class="entity-list">
          <li v-for="constraint in data.constraints" :key="constraint" class="entity-item">
            <i class="material-symbols-outlined entity-icon">block</i>
            <span class="entity-text">{{ constraint }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Context & Metadata -->
    <div class="card">
      <h4 class="card-subheader">
        <i class="material-symbols-outlined">info</i>
        Context & Metadata
      </h4>
      <div v-if="data.context" class="context-text">{{ data.context }}</div>

      <div class="metadata-grid" v-if="hasMetadata">
        <div class="metadata-item" v-if="data.id">
          <span class="metadata-label">ID:</span>
          <span class="metadata-value">{{ data.id }}</span>
        </div>
        <div class="metadata-item" v-if="data.version">
          <span class="metadata-label">Version:</span>
          <span class="metadata-value">{{ data.version }}</span>
        </div>
        <div class="metadata-item" v-if="data.created_at">
          <span class="metadata-label">Created:</span>
          <span class="metadata-value">{{ formatDate(data.created_at) }}</span>
        </div>
        <div class="metadata-item" v-if="data.updated_at">
          <span class="metadata-label">Updated:</span>
          <span class="metadata-value">{{ formatDate(data.updated_at) }}</span>
        </div>
      </div>
    </div>

    <!-- Conflicts Section (if any) -->
    <div v-if="data.conflicts && data.conflicts.length" class="card conflicts-card">
      <h4 class="card-subheader conflict-header">
        <i class="material-symbols-outlined">warning</i>
        Conflicts ({{ data.conflicts.length }})
      </h4>
      <div v-for="conflict in data.conflicts" :key="conflict.conflict_id" class="conflict-item">
        <div class="conflict-id">Conflict ID: {{ conflict.conflict_id }}</div>
        <div class="conflict-items">
          <div v-for="item in conflict.items" :key="item.id" class="conflict-use-case">
            <strong>{{ item.name }}</strong> - {{ item.goal }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, reactive, ref, watch } from 'vue'

export default {
  name: 'UsecaseDetail',
  props: {
    data: {
      type: Object,
      required: true,
    },
    canEdit: {
      type: Boolean,
      default: false,
    },
    mode: {
      type: String,
      default: 'view',
    },
    isCreating: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['submit', 'cancel'],
  setup(props, { emit }) {
    const isEditing = ref(props.isCreating)
    const formData = reactive({
      name: '',
      goal: '',
      description: '',
      status: 'draft',
      priority: 'medium',
      actors: [],
      preconditions: [],
      mainFlow: [],
    })

    const statusOptions = [
      { value: 'draft', label: 'Draft' },
      { value: 'in_progress', label: 'In progress' },
      { value: 'approved', label: 'Approved' },
      { value: 'completed', label: 'Completed' },
      { value: 'failed', label: 'Failed' },
    ]

    const priorityOptions = [
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' },
    ]

    const hydrateForm = () => {
      const source = props.data || {}
      formData.name = source.name || ''
      formData.goal = source.goal || source.description || ''
      formData.description = source.description || ''
      formData.status = source.status || 'draft'
      formData.priority = source.priority || 'medium'
      formData.actors = Array.isArray(source.actors) ? [...source.actors] : []
      formData.preconditions = Array.isArray(source.preconditions)
        ? [...source.preconditions]
        : []
      const mainFlow = source.tasks || source.mainFlow || []
      formData.mainFlow = Array.isArray(mainFlow) ? [...mainFlow] : []
    }

    watch(
      () => props.data,
      () => {
        if (!isEditing.value || props.mode !== 'create') {
          hydrateForm()
        }
      },
      { immediate: true }
    )

    watch(
      () => props.mode,
      (newMode) => {
        if (newMode === 'create') {
          isEditing.value = true
          hydrateForm()
        } else if (!props.canEdit) {
          isEditing.value = false
        }
      }
    )

    const canEditControls = computed(() => props.canEdit || props.mode === 'create')

    const startEditing = () => {
      if (!props.canEdit) return
      isEditing.value = true
      hydrateForm()
    }

    const cancelEditing = () => {
      if (props.mode === 'create') {
        emit('cancel')
        return
      }
      isEditing.value = false
      hydrateForm()
    }

    const cleanArray = (arr) => (Array.isArray(arr) ? arr.filter((item) => item && item.trim()) : [])

    const saveChanges = () => {
      const payload = {
        ...props.data,
        name: formData.name,
        goal: formData.goal,
        description: formData.goal || formData.description,
        status: formData.status,
        priority: formData.priority,
        actors: cleanArray(formData.actors),
        preconditions: cleanArray(formData.preconditions),
        tasks: cleanArray(formData.mainFlow),
        mainFlow: cleanArray(formData.mainFlow),
      }
      emit('submit', payload)
      if (props.mode !== 'create') {
        isEditing.value = false
      }
    }

    const addListItem = (field) => {
      if (!Array.isArray(formData[field])) {
        formData[field] = []
      }
      formData[field].push('')
    }

    const removeListItem = (field, index) => {
      if (Array.isArray(formData[field])) {
        formData[field].splice(index, 1)
      }
    }

    const currentStatus = computed(() => (isEditing.value ? formData.status : props.data.status))

    const statusClass = computed(() => {
      const statusMap = {
        approved: 'status-approved',
        draft: 'status-draft',
        in_progress: 'status-progress',
        processing: 'status-progress',
        completed: 'status-approved',
        failed: 'status-failed',
        has_conflicts: 'status-conflict',
      }
      return statusMap[currentStatus.value] || 'status-default'
    })

    const statusIcon = computed(() => {
      const iconMap = {
        approved: 'verified',
        draft: 'edit',
        in_progress: 'schedule',
        processing: 'schedule',
        completed: 'check_circle',
        failed: 'error',
        has_conflicts: 'warning',
      }
      return iconMap[currentStatus.value] || 'help'
    })

    const statusText = computed(() => {
      const statusMap = {
        approved: 'Approved',
        draft: 'Draft',
        in_progress: 'In Progress',
        processing: 'Processing',
        completed: 'Completed',
        failed: 'Failed',
        has_conflicts: 'Has Conflicts',
      }
      return statusMap[currentStatus.value] || currentStatus.value || 'N/A'
    })

    const currentPriority = computed(() =>
      isEditing.value ? formData.priority : props.data.priority
    )

    const priorityClass = computed(() => {
      const priorityMap = {
        high: 'priority-high',
        medium: 'priority-medium',
        low: 'priority-low',
      }
      return priorityMap[currentPriority.value] || 'priority-default'
    })

    const priorityText = computed(() => {
      const priorityMap = {
        high: 'High',
        medium: 'Medium',
        low: 'Low',
      }
      return priorityMap[currentPriority.value] || currentPriority.value || 'N/A'
    })

    const hasMetadata = computed(() => {
      return (
        props.data.id ||
        props.data.version ||
        props.data.created_at ||
        props.data.updated_at
      )
    })

    const formatFeedback = (feedback) => {
      if (typeof feedback === 'string') return feedback
      if (typeof feedback === 'object') return JSON.stringify(feedback, null, 2)
      return String(feedback)
    }

    const formatDate = (date) => {
      if (!date) return 'N/A'
      return new Date(date).toLocaleString()
    }

    return {
      statusClass,
      statusIcon,
      statusText,
      priorityClass,
      priorityText,
      hasMetadata,
      formatFeedback,
      formatDate,
      isEditing,
      formData,
      canEditControls,
      startEditing,
      cancelEditing,
      saveChanges,
      addListItem,
      removeListItem,
      statusOptions,
      priorityOptions,
    }
  },
}
</script>

<style scoped>
.usecase-detail {
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
}

.card-title {
  font-size: 20px;
  font-weight: 700;
  color: #79c0ff;
  margin: 0;
  flex: 1;
}

.card-actions {
  display: flex;
  gap: 8px;
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
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-subheader .material-symbols-outlined {
  font-size: 20px;
  color: #79c0ff;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.entity-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.entity-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.entity-icon {
  font-size: 18px;
  flex-shrink: 0;
  color: #79c0ff;
}

.entity-text {
  color: #c9d1d9;
  font-size: 14px;
  line-height: 1.4;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #6e7681;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-state .material-symbols-outlined {
  font-size: 24px;
}

.empty-text {
  font-size: 14px;
}

.steps-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #21262d;
}

.step-item:last-child {
  border-bottom: none;
}

.step-number {
  background-color: rgba(56, 139, 253, 0.15);
  color: #79c0ff;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content {
  color: #c9d1d9;
  font-size: 14px;
  line-height: 1.5;
  flex: 1;
}

.status-badge,
.priority-badge {
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
.priority-badge .material-symbols-outlined {
  font-size: 14px;
}

.title-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.edit-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-actions {
  display: flex;
  gap: 6px;
}

.input {
  width: 100%;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 8px 10px;
  color: #f0f6fc;
  font-size: 14px;
}

.textarea {
  width: 100%;
  min-height: 64px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 8px 10px;
  color: #f0f6fc;
  font-size: 14px;
  resize: vertical;
}

.title-input {
  font-size: 20px;
  font-weight: 600;
}

.description-input {
  margin-top: 8px;
}

.pill-input {
  background: #21262d;
  border: 1px solid #30363d;
  color: #c9d1d9;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
}

.editable-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.editable-list-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon-button {
  border: 1px solid #30363d;
  background: transparent;
  color: #8b949e;
  border-radius: 4px;
  padding: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.icon-button:hover {
  border-color: #58a6ff;
  color: #58a6ff;
}

.btn {
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn.mini {
  padding: 4px 8px;
  font-size: 12px;
}

.btn.primary {
  background: #238636;
  border-color: #2ea043;
  color: #fff;
}

.btn.ghost {
  background: transparent;
  border-color: #30363d;
  color: #c9d1d9;
}

.steps-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-edit-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.step-textarea {
  flex: 1;
  min-height: 60px;
}

.status-approved {
  background-color: rgba(46, 160, 67, 0.15);
  color: #7ee787;
}

.status-draft {
  background-color: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}

.status-progress {
  background-color: rgba(187, 128, 9, 0.15);
  color: #ffa657;
}

.status-failed {
  background-color: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
}

.status-conflict {
  background-color: rgba(187, 128, 9, 0.15);
  color: #ffa657;
}

.status-default {
  background-color: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}

.priority-high {
  background-color: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
}

.priority-medium {
  background-color: rgba(187, 128, 9, 0.15);
  color: #ffa657;
}

.priority-low {
  background-color: rgba(56, 139, 253, 0.15);
  color: #79c0ff;
}

.priority-default {
  background-color: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}

.card-reason,
.card-feedback {
  margin-top: 12px;
  padding: 12px;
  background-color: rgba(56, 139, 253, 0.1);
  border-radius: 6px;
  color: #c9d1d9;
  font-size: 13px;
  line-height: 1.5;
}

.card-feedback {
  background-color: rgba(187, 128, 9, 0.1);
}

.card-reason strong,
.card-feedback strong {
  color: #79c0ff;
}

.role-info {
  padding: 8px 0;
}

.role-name {
  font-weight: 600;
  color: #f0f6fc;
  font-size: 15px;
  margin-bottom: 4px;
}

.role-description {
  color: #8b949e;
  font-size: 13px;
  line-height: 1.4;
}

.context-text {
  color: #c9d1d9;
  font-size: 14px;
  line-height: 1.6;
  padding: 8px 0;
  margin-bottom: 12px;
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.metadata-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #21262d;
}

.metadata-item:last-child {
  border-bottom: none;
}

.metadata-label {
  font-weight: 600;
  color: #8b949e;
  font-size: 13px;
}

.metadata-value {
  color: #c9d1d9;
  font-size: 13px;
  font-family: monospace;
}

.conflicts-card {
  border-left: 4px solid #ffa657;
}

.conflict-header {
  color: #ffa657;
}

.conflict-item {
  padding: 12px;
  margin-bottom: 12px;
  background-color: rgba(187, 128, 9, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(187, 128, 9, 0.3);
}

.conflict-item:last-child {
  margin-bottom: 0;
}

.conflict-id {
  font-size: 12px;
  color: #ffa657;
  font-weight: 600;
  margin-bottom: 8px;
}

.conflict-use-case {
  padding: 8px;
  background-color: rgba(139, 148, 158, 0.1);
  border-radius: 4px;
  margin-bottom: 4px;
  font-size: 13px;
}

.conflict-use-case:last-child {
  margin-bottom: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }

  .card-header {
    flex-direction: column;
    gap: 12px;
  }

  .card-actions {
    align-self: flex-start;
  }

  .metadata-grid {
    grid-template-columns: 1fr;
  }
}
</style>