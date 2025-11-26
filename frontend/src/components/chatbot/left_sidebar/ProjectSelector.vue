<template>
  <div class="project-selector">
    <label class="selector-label">Chọn dự án</label>
    <select :value="selectedProject" @change="onChange" class="project-select">
      <option value="">-- Chọn dự án --</option>
      <option v-for="project in projects" :key="project.id" :value="project.id">
        {{ project.name }}
      </option>
    </select>

    <div v-if="selectedProject" class="project-details">
      <div class="detail-item">
        <span class="detail-label">Mô tả:</span>
        <span class="detail-value">{{ currentProject?.description }}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">ID:</span>
        <span class="detail-value">PROJ-{{ currentProject?.id }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'ProjectSelector',
  props: {
    projects: {
      type: Array,
      required: true,
    },
    selectedProject: {
      type: Number,
      required: true,
    },
  },
  emits: ['change'],
  setup(props, { emit }) {
    const currentProject = computed(() =>
      props.projects.find((p) => p.id === props.selectedProject)
    )

    const onChange = (event) => {
      emit('change', parseInt(event.target.value))
    }

    return {
      currentProject,
      onChange,
    }
  },
}
</script>

<style scoped>
.project-selector {
  margin-bottom: 20px;
}

.selector-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #8b949e;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.project-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #30363d;
  border-radius: 6px;
  font-size: 14px;
  background-color: #0d1117;
  color: #c9d1d9;
  transition: all 0.2s;
}

.project-select:focus {
  outline: none;
  border-color: #58a6ff;
  box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.1);
}

.project-details {
  margin-top: 12px;
  padding: 12px;
  background-color: #0d1117;
  border-radius: 6px;
  border: 1px solid #21262d;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-label {
  font-size: 12px;
  color: #8b949e;
  font-weight: 500;
}

.detail-value {
  font-size: 12px;
  color: #c9d1d9;
  text-align: right;
  max-width: 60%;
  word-break: break-word;
}
</style>