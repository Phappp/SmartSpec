<template>
  <div class="view-header">
    <button class="back-button" @click="goBack">
      <span class="material-symbols-outlined">arrow_back</span>
      Back to Projects
    </button>
    <div class="project-info">
      <h2>{{ project.name }}</h2>
      <div class="description-container">
        <button class="toggle-description" @click="toggleDescription">
          <span class="material-symbols-outlined">
            {{ showDescription ? 'expand_less' : 'expand_more' }}
          </span>
          {{ showDescription ? 'Hide Description' : 'Show Description' }}
        </button>
        <div v-if="showDescription" class="project-description">
          <p>{{ project.description || 'No description available' }}</p>
        </div>
      </div>
    </div>
    <div class="actions">
      <div class="version-section">
        <div class="version-selector">
          <span class="material-symbols-outlined">history</span>

          <div class="dropdown" @click="toggleDropdown">
            <span>{{ selectedLabel }}</span>
            <span class="material-symbols-outlined arrow" :class="{ open: isOpen }">
              <span class="material-symbols-outlined"> chevron_right </span>
            </span>
          </div>

          <ul v-if="isOpen" class="dropdown-menu">
            <li v-for="v in versions" :key="v._id" @click="selectVersion(v)">
              <span class="material-symbols-outlined">history</span>
              Version {{ v.version_number }}
            </li>
          </ul>

          <button
            v-if="hasFailedVersion && !isRetrying"
            @click="handleRetry"
            class="retry-btn"
            :disabled="isPolling"
          >
            <span class="material-symbols-outlined">refresh</span>
            Retry Failed
          </button>
        </div>

        <!-- PROGRESS BAR HIỂN THỊ TRỰC TIẾP -->
        <div v-if="isRetrying" class="inline-progress-container">
          <div class="progress-info">
            <span class="stage-text">{{ currentStage }}</span>
            <span class="progress-percent">{{ processingProgress }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: processingProgress + '%' }"></div>
          </div>
          <div class="stage-description">{{ getStageDescription(currentStage) }}</div>
        </div>
      </div>

      <button class="members-button">
        <span class="material-symbols-outlined">group</span>
        {{ project.members ? project.members.length : 0 }} Members
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProjectHeader',
  props: {
    project: {
      type: Object,
      required: true,
    },
    versions: {
      type: Array,
      default: () => [],
    },
    selectedVersionId: {
      type: String,
      default: null,
    },
    isRetrying: {
      type: Boolean,
      default: false,
    },
    processingProgress: {
      type: Number,
      default: 0,
    },
    currentStage: {
      type: String,
      default: 'Initializing...',
    },
  },
  data() {
    return {
      showDescription: false,
      isOpen: false,
    }
  },
  computed: {
    hasFailedVersion() {
      return this.versions.some((version) => version.status === 'failed')
    },
    failedVersion() {
      return this.versions.find((version) => version.status === 'failed')
    },
    selectedLabel() {
      const v = this.versions.find((x) => x._id === this.selectedVersionId)
      return v ? `Version ${v.version_number} ` : 'Select version'
    },
  },
  methods: {
    toggleDescription() {
      this.showDescription = !this.showDescription
    },
    toggleDropdown() {
      this.isOpen = !this.isOpen
    },
    selectVersion(v) {
      this.$emit('version-selected', v._id)
      this.isOpen = false
    },
    handleRetry() {
      this.$emit('retry-analysis')
    },
    goBack() {
      this.$emit('go-back')
    },
    getStageDescription(stage) {
      const descriptions = {
        Initializing: 'Preparing the analysis environment...',
        'Processing Inputs': 'Reading and processing your input files...',
        'Analyzing Requirements': 'Extracting use cases and requirements...',
        'Normalizing Data': 'Organizing and structuring the data...',
        Finalizing: 'Generating final documentation...',
        Completed: 'Analysis completed successfully!',
      }
      return descriptions[stage] || 'Processing your request...'
    },
  },
}
</script>

<style scoped>
.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 25px;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 15px;
  padding: 8px 14px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-button:hover {
  background: #e5e7eb;
}

.project-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 50%;
}

.project-info h2 {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
}

.description-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.toggle-description {
  display: flex;
  align-items: center;
  gap: 4px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 10px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-description:hover {
  background: #e5e7eb;
  color: #374151;
}

.project-description {
  border-radius: 6px;
  padding: 8px 12px;
  width: 100%;
  max-width: 800px;
  text-align: justify;
}

.description-container span {
  font-size: 10px;
}

.project-description p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.4;
  justify-self: center;
}

.actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.version-selector {
  padding: 0 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  transform: translateX(-15%);
}

.dropdown {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
}

.arrow {
  margin-left: 8px;
  font-size: 12px;
  color: #6b7280;
  transition: transform 0.2s ease;
}

.arrow.open {
  transform: rotate(90deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 36px;
  margin-top: 6px;
  width: 100%;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
  z-index: 20;
  transform: translateX(-21%);
}

.dropdown-menu li {
  padding: 4px 0px;
  padding-left: 12px;
  width: 100%;
  font-size: 14px;
  cursor: pointer;
  list-style: none;
  display: flex;
  gap: 24px;
  align-items: center;
  font-weight: bold;
}

.dropdown-menu li:hover {
  background: #f3f4f6;
}

.counter-badge {
  padding: 2px 8px;
  background: #e2e8f0;
  color: #475569;
  border-radius: 12px;
  font-weight: 600;
  margin-left: 8px;
}

.retry-btn {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
  margin-left: 8px;
}

.retry-btn:hover:not(:disabled) {
  background: #dc2626;
}

.retry-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.members-button {
  padding: 8px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* INLINE PROGRESS CONTAINER */
.inline-progress-container {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  min-width: 300px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-top: 8px;
  transform: translateX(-15%);
}

.inline-progress-container .progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
  color: #374151;
}

.inline-progress-container .stage-text {
  font-weight: 600;
  color: #1a365d;
}

.inline-progress-container .progress-percent {
  font-weight: 700;
  color: #1a365d;
}

.inline-progress-container .progress-bar {
  width: 100%;
  height: 6px;
  background-color: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}

.inline-progress-container .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1a365d, #2c5282);
  border-radius: 3px;
  transition: width 0.5s ease-in-out;
}

.inline-progress-container .stage-description {
  font-size: 11px;
  color: #6b7280;
  font-style: italic;
}

@media (max-width: 768px) {
  .view-header {
    flex-direction: column;
    gap: 15px;
    align-items: center;
  }

  .project-info {
    max-width: 100%;
    order: 2;
  }

  .back-button {
    order: 1;
    align-self: flex-start;
  }

  .actions {
    order: 3;
    align-self: flex-end;
    flex-direction: column;
    gap: 10px;
  }

  .version-selector {
    flex-direction: column;
    align-items: flex-start;
  }

  .retry-btn {
    margin-left: 0;
    margin-top: 8px;
  }
}
</style>