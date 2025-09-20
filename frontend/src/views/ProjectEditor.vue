<template>
  <div class="project-editor">
    <!-- Header -->
    <div class="editor-header">
      <button class="back-btn">← Back to Dashboard</button>
      <div class="project-info">
        <h2>{{ project.name }}</h2>
        <p>{{ project.description }}</p>
      </div>
      <div class="editor-actions">
        <button class="version-btn">Version 1.0</button>
        <button class="members-btn">3 Members</button>
      </div>
    </div>

    <!-- Main body -->
    <div class="editor-body">
      <!-- Detected + Recommended -->
      <div class="feature-section">
        <h3>Detected Features ({{ detectedFeatures.length }})</h3>
        <div class="feature-list">
          <button
            v-for="(f, i) in detectedFeatures"
            :key="i"
            class="feature-btn"
          >
            {{ f }}
          </button>
        </div>

        <h3>Recommended Features ({{ recommendedFeatures.length }})</h3>
        <div class="feature-list">
          <button
            v-for="(f, i) in recommendedFeatures"
            :key="i"
            class="feature-btn"
          >
            {{ f }}
          </button>
        </div>
      </div>

      <!-- Documentation Types -->
      <div class="doc-section">
        <h3>Select Documentation Types to Generate</h3>
        <div class="doc-types">
          <label v-for="(doc, i) in docTypes" :key="i" class="doc-option">
            <input type="checkbox" v-model="selectedDocs" :value="doc" />
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
        <button class="send-btn">Send</button>
      </div>
    </div>
  </div>
</template>

<script>
import { getProject, generateDocumentation } from '@/api/project';

export default {
  name: "ProjectEditor",
  data() {
    return {
      project: { name: "", description: "" },
      detectedFeatures: [],
      recommendedFeatures: [],
      docTypes: [
        "Software Requirements Specification",
        "Use Case Diagram",
        "Activity Diagram",
        "Sequence Diagram",
        "Class Diagram",
        "Database Schema",
        "API Documentation",
        "User Stories",
      ],
      selectedDocs: [],
      prompt: "",
    };
  },
  async created() {
    const id = this.$route.params.id;
    if (id) {
      try {
        const { data } = await getProject(id);
        this.project = data.data || data;
      } catch (err) {
        console.error("Get project failed", err);
      }
    }
  },
  methods: {
    async generateDocs() {
      try {
        const id = this.$route.params.id;
        const { data } = await generateDocumentation(id, {
          options: { docs: this.selectedDocs, prompt: this.prompt }
        });
        console.log("Generated docs:", data);
      } catch (err) {
        console.error("Generate docs error", err);
      }
    }
  }
};
</script>


<style scoped>
.project-editor {
  padding: 20px;
  background: #f9fafb;
  border-right: 1px solid #e5e7eb;
  height: 100%;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.back-btn {
  background: none;
  border: none;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
}

.project-info h2 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.project-info p {
  font-size: 12px;
  color: #6b7280;
}

.editor-actions button {
  margin-left: 10px;
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 12px;
  cursor: pointer;
}

.feature-section h3,
.doc-section h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 15px 0 10px;
  color: #111827;
}

.feature-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.feature-btn {
  padding: 8px 14px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.feature-btn:hover {
  background: #f3f4f6;
}

.doc-types {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.doc-option {
  font-size: 13px;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 6px;
}

.prompt-box {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
}

.prompt-box input {
  flex: 1;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
}

.send-btn {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 13px;
}

.send-btn:hover {
  background: #1d4ed8;
}
</style>
