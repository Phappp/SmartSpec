<template>
  <div>
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"></div>
      <p>{{ loadingText }}</p>
    </div>

    <div class="container">
      <header class="header">
        <h1>SmartSpec Project Tester</h1>
        <p>A simple interface to test your project creation and processing flow.</p>
      </header>

      <form @submit.prevent="createProject" class="project-form card">
        <h2><i class="icon-plus"></i> Create New Project</h2>
        <div class="form-group">
          <label for="name">Project Name</label>
          <input
            id="name"
            v-model="newProject.name"
            placeholder="e.g., E-commerce Platform"
            required
          />
        </div>
        <div class="form-group">
          <label for="description">Project Description</label>
          <textarea
            id="description"
            v-model="newProject.description"
            placeholder="e.g., A platform to sell goods online"
            required
          ></textarea>
        </div>
        <div class="form-group">
          <label for="rawText">Raw Text (optional)</label>
          <textarea
            id="rawText"
            v-model="newProject.rawText"
            placeholder="Paste requirements text here..."
          ></textarea>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label for="language">Language</label>
            <select id="language" v-model="newProject.language">
              <option value="vi-VN">Tiếng Việt (vi-VN)</option>
              <option value="en-US">English (en-US)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="files">Attach Files</label>
            <input id="files" type="file" @change="handleFileChange" multiple />
          </div>
        </div>
        <button type="submit" :disabled="isCreating">
          <span v-if="isCreating" class="button-spinner"></span>
          {{ isCreating ? 'Creating...' : 'Create Project' }}
        </button>
      </form>

      <div class="project-list">
        <h2><i class="icon-folder"></i> Projects</h2>
        <div v-if="projects.length === 0" class="card empty-state">
          No projects yet. Create one to get started!
        </div>
        <ul v-else>
          <li v-for="project in projects" :key="project._id" class="project-item card">
            <div class="project-header">
              <h3>{{ project.name }}</h3>
              <span class="language-tag">{{ project.language }}</span>
            </div>
            <p class="description">{{ project.description }}</p>

            <div v-if="project.current_version" class="version-status">
              <strong>Version {{ project.current_version.version_number }}:</strong>

              <div
                v-if="project.current_version.status === 'processing'"
                class="status-box processing"
              >
                <div class="spinner-small"></div>
                <span>Processing...</span>
              </div>

              <div
                v-else-if="project.current_version.status === 'completed'"
                class="status-box completed"
              >
                <span
                  >✅ Completed ({{ project.current_version.requirement_model.length }} use
                  cases)</span
                >
              </div>

              <div
                v-else-if="project.current_version.status === 'has_conflicts'"
                class="status-box conflicts"
              >
                <span
                  >⚠️ Has Conflicts ({{
                    project.current_version.pending_conflicts.length
                  }}
                  conflicts)</span
                >
              </div>

              <div
                v-else-if="project.current_version.status === 'failed'"
                class="status-box failed"
              >
                <div class="failed-content">
                  <span>❌ Analysis Failed!</span>
                  <pre class="error-log">{{
                    project.current_version.processing_errors.join('\n')
                  }}</pre>
                </div>
                <button
                  @click="retryProcessing(project._id, project.current_version._id)"
                  :disabled="project.current_version.isRetrying"
                >
                  <span v-if="project.current_version.isRetrying" class="button-spinner"></span>
                  {{ project.current_version.isRetrying ? 'Retrying...' : 'Retry' }}
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import axios from 'axios'

// --- CONFIG ---
const API_BASE_URL = 'http://localhost:8000/api'
const AUTH_TOKEN =
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OGNjYTA4NWY1YzMyYjJkNWMzOGIyOTQiLCJzdWIiOiI2OGNjYTA4NWY1YzMyYjJkNWMzOGIyOTQiLCJzaWQiOiJjNTYxN2IwOC03OTZmLTQ0ZTktYWY1Ni1iYjRkY2NiNzk5YjEiLCJpYXQiOjE3NTgyOTY0NzIsImV4cCI6MTc1ODM4Mjg3Mn0.UEWak2-2SPAf4dSaDi_NmR1p7F7syYfaFcOQLLc9kkg'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Authorization: AUTH_TOKEN },
})

// --- STATE ---
const projects = ref([])
const newProject = ref({
  name: '',
  description: '',
  rawText: '',
  language: 'vi-VN',
})
const selectedFiles = ref([])
const isCreating = ref(false)
const loadingText = ref('')
const pollingIntervals = ref({})

// --- COMPUTED ---
const isLoading = ref(false) // Tổng hợp các trạng thái loading

// --- METHODS ---
const handleFileChange = (event) => {
  selectedFiles.value = event.target.files
}

const createProject = async () => {
  isCreating.value = true
  loadingText.value = 'Creating your new project...'
  isLoading.value = true

  const formData = new FormData()
  formData.append('name', newProject.value.name)
  formData.append('description', newProject.value.description)
  formData.append('language', newProject.value.language)
  if (newProject.value.rawText) {
    formData.append('rawText', newProject.value.rawText)
  }
  for (const file of selectedFiles.value) {
    formData.append('files', file)
  }

  try {
    const response = await api.post('/projects', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    const createdProjectFromServer = response.data.data

    const newProjectForUI = {
      ...createdProjectFromServer,
      current_version: {
        _id: createdProjectFromServer.current_version,
        version_number: 1,
        status: 'processing',
        requirement_model: [],
        pending_conflicts: [],
        processing_errors: [],
      },
    }

    projects.value.unshift(newProjectForUI)
    startPolling(newProjectForUI._id, newProjectForUI.current_version._id)

    // Reset form
    newProject.value = { name: '', description: '', rawText: '', language: 'vi-VN' }
    selectedFiles.value = []
    document.querySelector('input[type="file"]').value = ''
  } catch (error) {
    console.error('Error creating project:', error)
    alert('Failed to create project. Check console for details.')
  } finally {
    isCreating.value = false
    isLoading.value = false
  }
}

const startPolling = (projectId, versionId) => {
  if (pollingIntervals.value[versionId]) {
    clearInterval(pollingIntervals.value[versionId])
  }

  pollingIntervals.value[versionId] = setInterval(async () => {
    try {
      const response = await api.get(`/versions/${versionId}/status`)
      const { status, version } = response.data.data

      const projectIndex = projects.value.findIndex((p) => p._id === projectId)
      if (projectIndex !== -1) {
        projects.value[projectIndex].current_version = {
          ...projects.value[projectIndex].current_version,
          ...version,
          status: status,
        }
      }

      if (status !== 'processing') {
        clearInterval(pollingIntervals.value[versionId])
        delete pollingIntervals.value[versionId]
      }
    } catch (error) {
      console.error(`Error polling status for version ${versionId}:`, error)
      clearInterval(pollingIntervals.value[versionId])
      delete pollingIntervals.value[versionId]
    }
  }, 5000)
}

const retryProcessing = async (projectId, versionId) => {
  const projectIndex = projects.value.findIndex((p) => p._id === projectId)
  if (projectIndex === -1) return

  projects.value[projectIndex].current_version.isRetrying = true
  loadingText.value = `Retrying analysis for ${projects.value[projectIndex].name}...`
  isLoading.value = true

  try {
    // Gọi API retry
    await api.post(`/orchestrator/run`, {
      project_id: projectId,
      version_id: versionId,
      mode: 'incremental',
    })

    // Cập nhật UI ngay lập tức và bắt đầu polling lại
    projects.value[projectIndex].current_version.status = 'processing'
    startPolling(projectId, versionId)
  } catch (error) {
    console.error('Error retrying processing:', error)
    projects.value[projectIndex].current_version.status = 'failed'
    alert('Failed to start retry process. Check console for details.')
  } finally {
    projects.value[projectIndex].current_version.isRetrying = false
    isLoading.value = false
  }
}

onUnmounted(() => {
  Object.values(pollingIntervals.value).forEach(clearInterval)
})
</script>

<style scoped>
:root {
  --primary-color: #6d5edc;
  --primary-light: #f3f1fe;
  --secondary-color: #f0f2f5;
  --text-color: #333;
  --text-light: #666;
  --border-color: #e0e0e0;
  --success-color: #28a745;
  --warning-color: #ffc107;
  --danger-color: #dc3545;
  --danger-light: #fdeeee;
}

.container {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  max-width: 900px;
  margin: 40px auto;
  padding: 20px;
  color: var(--text-color);
}

.header {
  text-align: center;
  margin-bottom: 40px;
}
.header h1 {
  color: var(--primary-color);
  margin-bottom: 8px;
}
.header p {
  color: var(--text-light);
  font-size: 1.1em;
}

.card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  padding: 24px;
  transition: all 0.3s ease;
}

.project-form {
  margin-bottom: 40px;
}
.project-form h2 {
  margin-top: 0;
  margin-bottom: 24px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-group {
  margin-bottom: 16px;
}
.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--text-light);
}
input,
textarea,
select {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 1em;
  transition: border-color 0.3s, box-shadow 0.3s;
}
input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

button[type='submit'] {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 8px;
  background-color: #2c3e50;
  color: #fff;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 10px;
}
button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
button:not(:disabled):hover {
  background-color: #5849b3;
}

.project-list h2 {
  display: flex;
  align-items: center;
  gap: 8px;
}
.project-list ul {
  list-style: none;
  padding: 0;
}
.project-item {
  margin-bottom: 20px;
}
.project-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
}
.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.project-header h3 {
  margin: 0;
  color: #2c3e50;
}
.description {
  color: var(--text-light);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 16px;
  margin-bottom: 16px;
}
.language-tag {
  background-color: var(--secondary-color);
  color: var(--text-light);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8em;
  font-weight: 600;
}
.version-status {
  color: var(--text-light);
}
.status-box {
  margin-top: 10px;
  padding: 12px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}
.status-box.processing {
  background-color: #e6f7ff;
  color: #1890ff;
}
.status-box.completed {
  background-color: #f6ffed;
  color: #52c41a;
}
.status-box.conflicts {
  background-color: #fffbe6;
  color: #faad14;
}
.status-box.failed {
  background-color: var(--danger-light);
  color: var(--danger-color);
  flex-direction: column;
  align-items: flex-start;
}
.failed-content {
  width: 100%;
  margin-bottom: 10px;
}

.status-box button {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background-color: var(--danger-color);
  color: white;
  cursor: pointer;
  transition: opacity 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.status-box button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.status-box button:not(:disabled):hover {
  opacity: 0.8;
}

.error-log {
  margin-top: 8px;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 8px;
  border-radius: 4px;
  white-space: pre-wrap;
  font-size: 0.9em;
  color: inherit;
}
.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--text-light);
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(5px);
}
.loading-overlay p {
  margin-top: 20px;
  font-size: 1.2em;
  color: var(--primary-color);
  font-weight: 600;
}

/* Spinners */
.spinner,
.spinner-small,
.button-spinner {
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid var(--primary-light);
  border-top-color: var(--primary-color);
}
.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  opacity: 0.7;
}
.button-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>