<template>
  <div class="project-editor">
    <!-- Header -->
    <div class="editor-header">
      <button class="back-btn" @click="goBack">
        <span class="material-symbols-outlined">arrow_back</span>
        Back to Dashboard
      </button>

      <div class="project-info">
        <h2>{{ project.name }}</h2>
        <p>{{ project.description }}</p>
      </div>

      <div class="editor-actions">
        <button class="version-btn">
          <span class="material-symbols-outlined">history</span>
          Version 1.0
        </button>
        <button class="members-btn">
          <span class="material-symbols-outlined">group</span>
          3 Members
        </button>
      </div>
    </div>

    <!-- Main body -->
    <div class="editor-body">
      <!-- Detected + Recommended -->
      <div class="feature-section">
        <h3>Detected Features ({{ detectedFeatures.length }})</h3>
        <div class="feature-list">
          <label v-for="(f, i) in detectedFeatures" :key="'d' + i" class="feature-item">
            <input type="checkbox" v-model="selectedFeatures" :value="f" />
            <span class="material-symbols-outlined">check_circle</span>
            <span>{{ f }}</span>
          </label>
        </div>

        <h3>Recommended Features ({{ recommendedFeatures.length }})</h3>
        <div class="feature-list">
          <label v-for="(f, i) in recommendedFeatures" :key="'r' + i" class="feature-item">
            <input type="checkbox" v-model="selectedFeatures" :value="f" />
            <span class="material-symbols-outlined">lightbulb</span>
            <span>{{ f }}</span>
          </label>
        </div>
      </div>

      <!-- Documentation Types -->
      <div class="doc-section">
        <h3>Select Documentation Types to Generate</h3>
        <div class="doc-types">
          <label v-for="(doc, i) in docTypes" :key="i" class="doc-option">
            <input type="checkbox" v-model="selectedDocs" :value="doc" />
            <span class="material-symbols-outlined">description</span>
            {{ doc }}
          </label>
        </div>
      </div>

      <!-- Prompt box -->
      <div class="prompt-box">
        <input
          type="text"
          placeholder="Describe changes or ask questions about your project..."
          v-model="prompt"
        />
        <button class="send-btn" @click="generateDocs">
          <span class="material-symbols-outlined">send</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { getProject, generateDocumentation } from '@/api/project'

export default {
  name: 'ProjectEditor',
  data() {
    return {
      project: { name: '', description: '' },
      detectedFeatures: ['Login', 'Logout', 'View all Products', 'Edit Products'],
      recommendedFeatures: ['Add Product'],
      selectedFeatures: [],
      docTypes: [
        'Software Requirements Specification',
        'Use Case Diagram',
        'Activity Diagram',
        'Sequence Diagram',
        'Class Diagram',
        'Database Schema',
        'API Documentation',
        'User Stories',
      ],
      selectedDocs: [],
      prompt: '',
    }
  },
  async created() {
    const id = this.$route.params.id
    if (id) {
      try {
        const { data } = await getProject(id)
        this.project = data.data || data
      } catch (err) {
        console.error('Get project failed', err)
      }
    }
  },
  methods: {
    goBack() {
      this.$router.push('/dashboard')
    },
    async generateDocs() {
      try {
        const id = this.$route.params.id
        const { data } = await generateDocumentation(id, {
          options: {
            features: this.selectedFeatures,
            docs: this.selectedDocs,
            prompt: this.prompt,
          },
        })
        console.log('Generated docs:', data)
      } catch (err) {
        console.error('Generate docs error', err)
      }
    },
  },
}
</script>

<style scoped>
.project-editor {
  padding: 30px;
  background: #ffffff;
  min-height: 100vh;
  border-left: 1px solid #e5e7eb;
}

/* Header */
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 16px;
  padding: 8px 14px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
}
.back-btn:hover {
  background: #e5e7eb;
  transform: scale(1.05);
}

/* Info */
.project-info h2 {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}
.project-info p {
  font-size: 14px;
  color: #6b7280;
}

.editor-actions {
  display: flex;
  align-items: center;
  gap: 12px; /* khoảng cách giữa 2 nút */
}

.editor-actions button {
  padding: 8px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.editor-actions button:hover {
  background: #f9fafb;
  transform: translateY(-2px);
}

/* Sections */
.feature-section h3,
.doc-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 20px 0 12px;
  color: #111827;
}

/* Features style */
.feature-list {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 18px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #ffffff;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  min-width: 180px;
  justify-content: flex-start;
  transition: all 0.2s ease;
}
.feature-item input {
  accent-color: #2563eb;
}
.feature-item:hover {
  background: #f3f4f6;
  transform: scale(1.03);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

/* Docs */
.doc-types {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.doc-option {
  font-size: 14px;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}
.doc-option input {
  accent-color: #2563eb;
}
.doc-option:hover {
  background: #f9fafb;
  transform: scale(1.02);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

/* Prompt */
.prompt-box {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 25px;
}

.prompt-box input {
  flex: 1;
  padding: 12px;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
}

.send-btn {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}
.send-btn:hover {
  background: #1d4ed8;
  transform: translateY(-2px);
}
</style>