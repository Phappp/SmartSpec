<template>
  <div class="project-header">
    <div class="header-content">
      <div class="header-left">
        <button class="back-btn" @click="goBack">
          <span class="material-symbols-outlined">arrow_back</span>
          Back to Projects
        </button>

        <div class="project-info">
          <h1>{{ project.name }}</h1>
          <div class="description-section">
            <button class="toggle-description-btn" @click="toggleDescription">
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
      </div>

      <div class="header-right">
        <div class="version-control">
          <div class="version-selector">
            <div class="selector-header" @click="toggleDropdown">
              <span class="material-symbols-outlined">history</span>
              <span class="version-label">{{ selectedLabel }}</span>
              <span class="material-symbols-outlined dropdown-arrow" :class="{ open: isOpen }">
                expand_more
              </span>
            </div>

            <div v-if="isOpen" class="dropdown-menu">
              <div
                v-for="version in versions"
                :key="version._id"
                class="version-option"
                @click="selectVersion(version)"
              >
                <span class="material-symbols-outlined">history</span>
                Version {{ version.version_number }}
                <span class="version-status" :class="version.status">{{ version.status }}</span>
              </div>
            </div>
          </div>

          <button
            v-if="hasFailedVersion && !isRetrying"
            class="retry-btn"
            @click="handleRetry"
            :disabled="isPolling"
          >
            <span class="material-symbols-outlined">refresh</span>
            Retry Failed
          </button>
        </div>

        <div v-if="isRetrying" class="progress-indicator">
          <div class="progress-header">
            <span class="stage-name">{{ currentStage }}</span>
            <span class="progress-percentage">{{ processingProgress }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: processingProgress + '%' }"></div>
          </div>
          <div class="stage-description">{{ getStageDescription(currentStage) }}</div>
        </div>

        <button class="members-btn">
          <span class="material-symbols-outlined">group</span>
          {{ project.members ? project.members.length : 0 }}
        </button>
      </div>
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
    selectedLabel() {
      const version = this.versions.find((v) => v._id === this.selectedVersionId)
      return version ? `Version ${version.version_number}` : 'Select version'
    },
  },
  methods: {
    toggleDescription() {
      this.showDescription = !this.showDescription
    },
    toggleDropdown() {
      this.isOpen = !this.isOpen
    },
    selectVersion(version) {
      this.$emit('version-selected', version._id)
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
.project-header {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex: 1;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  color: #374151;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.back-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.project-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
}

.project-info h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1a365d;
  margin: 0 0 12px 0;
}

.description-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toggle-description-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.875rem;
  font-weight: 500;
  align-self: center;
}

.toggle-description-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.project-description {
  display: flex;
  justify-content: center;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  text-align: justify;
}

.project-description p {
  margin: 0;
  color: #6b7280;
  line-height: 1.5;
  font-size: 0.875rem;
}

.header-right {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.version-control {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 200px;
}

.version-selector {
  position: relative;
}

.selector-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.3s ease;
}

.selector-header:hover {
  border-color: #9ca3af;
}

.version-label {
  font-weight: 500;
  color: #374151;
  flex: 1;
}

.dropdown-arrow {
  font-size: 18px;
  color: #6b7280;
  transition: transform 0.3s ease;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  max-height: 200px;
  overflow-y: auto;
}

.version-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  border-bottom: 1px solid #f3f4f6;
}

.version-option:last-child {
  border-bottom: none;
}

.version-option:hover {
  background: #f3f4f6;
}

.version-status {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.version-status.completed {
  background: #d1fae5;
  color: #065f46;
}

.version-status.failed {
  background: #fee2e2;
  color: #b91c1c;
}

.version-status.processing {
  background: #fef3c7;
  color: #92400e;
}

.retry-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  font-weight: 500;
  font-size: 0.875rem;
}

.retry-btn:hover:not(:disabled) {
  background: #dc2626;
}

.retry-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.progress-indicator {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  min-width: 250px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stage-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a365d;
}

.progress-percentage {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1a365d;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1a365d, #2c5282);
  border-radius: 3px;
  transition: width 0.5s ease-in-out;
}

.stage-description {
  font-size: 0.75rem;
  color: #6b7280;
  font-style: italic;
}

.members-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 11px 16px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  color: #374151;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.members-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 16px;
  }

  .header-left {
    flex-direction: column;
    gap: 12px;
  }

  .header-right {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .version-control {
    min-width: auto;
    flex: 1;
  }

  .progress-indicator {
    min-width: auto;
    flex: 1;
  }
}
</style>