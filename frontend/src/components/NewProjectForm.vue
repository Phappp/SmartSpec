
<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <!-- FORM (idle) -->
      <template v-if="creationStatus === 'idle'">
        <div class="modal-header">
          <div class="header-text">
            <h2>Create New Project</h2>
            <p class="progress-indicator">Step {{ currentStep }} of 3</p>
          </div>
          <button class="close-btn" @click="handleClose">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleCreateProject">
            <!-- Step 1 -->
            <div v-if="currentStep === 1">
              <div class="form-group">
                <label for="projectName">Project Name</label>
                <input
                  id="projectName"
                  v-model="projectData.name"
                  placeholder="e.g., E-commerce Platform"
                  required
                />
              </div>
              <div class="form-group">
                <label for="projectDescription">Project Description</label>
                <textarea
                  id="projectDescription"
                  v-model="projectData.description"
                  placeholder="A platform to sell goods online"
                  rows="5"
                  required
                ></textarea>
              </div>
            </div>

            <!-- Step 2 -->
            <div v-if="currentStep === 2">
              <div class="form-group">
                <label for="rawText">Raw Text (Optional)</label>
                <textarea
                  id="rawText"
                  v-model="projectData.rawText"
                  placeholder="Paste requirements, user stories, or any context text here..."
                  rows="5"
                ></textarea>
              </div>
              <div class="form-group">
                <label>Attachments (Optional)</label>
                <div class="attachment-trigger" @click="$refs.fileInput.click()">
                  <span class="material-symbols-outlined">upload_file</span> Click to choose
                  files...
                </div>
                <input
                  type="file"
                  ref="fileInput"
                  class="hidden-input"
                  multiple
                  @change="handleFileChange"
                />
                <div v-if="selectedFiles.length > 0" class="file-list-container">
                  <ul class="file-list">
                    <li v-for="(file, idx) in Array.from(selectedFiles)" :key="idx">
                      <span class="file-name">{{ file.name }}</span>
                      <button type="button" class="remove-file-btn" @click="removeFile(idx)">
                        &times;
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- Step 3 -->
            <div v-if="currentStep === 3">
              <div class="form-group">
                <label>Select Language</label>
                <p class="lang-description">Choose the primary language for the documentation.</p>
                <div class="language-selector">
                  <div
                    class="lang-option"
                    :class="{ selected: projectData.language === 'vi-VN' }"
                    @click="projectData.language = 'vi-VN'"
                  >
                    <img src="https://flagcdn.com/w40/vn.png" alt="Vietnam Flag" />
                    <span>Tiếng Việt</span>
                  </div>
                  <div
                    class="lang-option"
                    :class="{ selected: projectData.language === 'en-US' }"
                    @click="projectData.language = 'en-US'"
                  >
                    <img src="https://flagcdn.com/w40/us.png" alt="USA Flag" />
                    <span>English</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="modal-footer">
              <button type="button" class="cancel-btn" v-if="currentStep > 1" @click="prevStep">
                Back
              </button>
              <button type="button" class="create-btn" v-if="currentStep < 3" @click="nextStep">
                Next
              </button>
              <button type="submit" class="create-btn" v-if="currentStep === 3">
                Create Project
              </button>
            </div>
          </form>
        </div>
      </template>

      <!-- STATUS VIEW -->
      <template v-else>
        <div class="modal-header">
          <div class="header-text">
            <h2>Project Status</h2>
            <p class="progress-indicator">{{ creationStatusMessage }}</p>
          </div>
          <button class="close-btn" @click="handleClose" :disabled="creationStatus === 'creating'">
            &times;
          </button>
        </div>
        <div class="modal-body processing-view">
          <!-- COMPLETED -->
          <div v-if="creationStatus === 'completed'">
            <div class="status-icon success">✅</div>
            <h3 class="status-title">Project Ready!</h3>
            <p class="status-text">Detected {{ 25 }} use cases.</p>
            <div class="button-group">
              <button
                class="cancel-btn"
                @click="
                  () => {
                    handleClose()
                  }
                "
              >
                Go Home
              </button>
              <button class="create-btn" @click="goToEditor">View Detail</button>
            </div>
          </div>

          <!-- FAILED -->
          <div v-if="creationStatus === 'failed'">
            <div class="status-icon fail">❌</div>
            <h3 class="status-title">Processing Failed</h3>
            <p class="status-text">Something went wrong during the analysis.</p>
            <pre class="error-log">{{ processingError || 'Unknown error.' }}</pre>
            <button class="cancel-btn" @click="handleClose">Close</button>
          </div>
        </div>
      </template>
    </div>

    <!-- FULLSCREEN LOADING OVERLAY -->
    <div v-if="overlayLoading" class="fullscreen-overlay">
      <div class="loading-box">
        <div class="spinner-borders"></div>
        <p class="loading-text">{{ loadingMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { createProject, getVersionStatus } from '@/api/project'

export default {
  name: 'NewProjectModal',
  props: { show: { type: Boolean, default: false } },
  setup(props, { emit }) {
    const router = useRouter()

    // Form state
    const currentStep = ref(1)
    const projectData = ref({ name: '', description: '', rawText: '', language: 'vi-VN' })
    const selectedFiles = ref([])

    // Status state
    const creationStatus = ref('idle') // idle, creating, polling, completed, failed
    const finalProjectData = ref(null)
    const processingError = ref('')
    const pollingInterval = ref(null)

    // Loading overlay
    const overlayLoading = ref(false)
    const loadingMessage = ref('Analyzing requirements...')
    const messageIndex = ref(0)
    let messageInterval = null

    const loadingMessages = [
      'Analyzing requirements...',
      'Processing data...',
      'Generating results...',
      'Finalizing project...',
    ]

    const startLoadingMessages = () => {
      overlayLoading.value = true
      messageIndex.value = 0
      loadingMessage.value = loadingMessages[0]
      messageInterval = setInterval(() => {
        messageIndex.value = (messageIndex.value + 1) % loadingMessages.length
        loadingMessage.value = loadingMessages[messageIndex.value]
      }, 2000)
    }
    const stopLoadingMessages = () => {
      overlayLoading.value = false
      if (messageInterval) clearInterval(messageInterval)
    }

    const creationStatusMessage = computed(() => {
      const messages = {
        idle: 'Fill in project details',
        creating: 'Sending data...',
        polling: 'Processing...',
        completed: 'Success!',
        failed: 'Error!',
      }
      return messages[creationStatus.value]
    })

    // Reset form
    const resetForm = () => {
      currentStep.value = 1
      creationStatus.value = 'idle'
      projectData.value = { name: '', description: '', rawText: '', language: 'vi-VN' }
      selectedFiles.value = []
      finalProjectData.value = null
      processingError.value = ''
      if (pollingInterval.value) clearInterval(pollingInterval.value)
      stopLoadingMessages()
    }

    const handleClose = () => {
      if (creationStatus.value === 'creating') return
      emit('close')
    }

    watch(
      () => props.show,
      (newVal) => {
        if (!newVal) resetForm()
      }
    )

    const nextStep = () => {
      if (currentStep.value === 1 && (!projectData.value.name || !projectData.value.description)) {
        alert('Please fill in both Project Name and Description.')
        return
      }
      if (currentStep.value < 3) currentStep.value++
    }
    const prevStep = () => {
      if (currentStep.value > 1) currentStep.value--
    }

    const handleFileChange = (event) => {
      selectedFiles.value = event.target.files
    }
    const removeFile = (index) => {
      const files = Array.from(selectedFiles.value)
      files.splice(index, 1)
      const dataTransfer = new DataTransfer()
      files.forEach((f) => dataTransfer.items.add(f))
      selectedFiles.value = dataTransfer.files
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) fileInput.files = dataTransfer.files
    }

    // Polling

    const startPolling = (projectId, versionId) => {
      pollingInterval.value = setInterval(async () => {
        try {
          const response = await getVersionStatus(versionId)
          const { status, version, project } = response.data.data

          if (status !== 'processing') {
            clearInterval(pollingInterval.value)
            finalProjectData.value = project

            if (status === 'completed' || status === 'has_conflicts') {
              creationStatus.value = 'completed'
              stopLoadingMessages()
              emit('processing-finished')
            } else {
              creationStatus.value = 'failed'
              processingError.value =
                version.processing_errors?.join('\n') || 'Analysis failed without specific errors.'
              stopLoadingMessages()
            }
          }
        } catch (error) {
          clearInterval(pollingInterval.value)
          creationStatus.value = 'failed'
          processingError.value =
            error.response?.data?.message || 'Could not fetch processing status from the server.'
          stopLoadingMessages()
        }
      }, 5000)
    }

    // Create project
    const handleCreateProject = async () => {
      creationStatus.value = 'creating'
      startLoadingMessages()

      const formData = new FormData()
      formData.append('name', projectData.value.name)
      formData.append('description', projectData.value.description)
      formData.append('language', projectData.value.language)
      if (projectData.value.rawText) formData.append('rawText', projectData.value.rawText)
      for (const file of selectedFiles.value) formData.append('files', file)

      try {
        const response = await createProject(formData)
        const createdProject = response.data.data
        creationStatus.value = 'polling'
        startPolling(createdProject._id, createdProject.current_version)
      } catch (error) {
        creationStatus.value = 'failed'
        processingError.value = error.response?.data?.message || 'Failed to create project.'
        stopLoadingMessages()
      }
    }

    const goToEditor = () => {
      if (!finalProjectData.value) return
      router.push({ name: 'Editor', params: { id: finalProjectData.value._id } })
      handleClose()
    }

    onUnmounted(() => {
      if (pollingInterval.value) clearInterval(pollingInterval.value)
      stopLoadingMessages()
    })

    return {
      router,
      currentStep,
      projectData,
      selectedFiles,
      creationStatus,
      creationStatusMessage,
      finalProjectData,
      processingError,
      overlayLoading,
      loadingMessage,
      handleClose,
      nextStep,
      prevStep,
      handleFileChange,
      removeFile,
      handleCreateProject,
      goToEditor,
    }
  },
}
</script>

<style scoped>
/* FULLSCREEN LOADING */
.fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(6px);
}
.loading-box {
  background: white;
  padding: 30px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
.loading-text {
  margin-top: 15px;
  font-size: 1.2em;
  color: #333;
}
.button-group {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
}
/* GENERAL MODAL STYLES */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}
.modal-content {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 650px;
  display: flex;
  flex-direction: column;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 16px;
  margin-bottom: 20px;
}
.modal-header h2 {
  font-size: 22px;
  color: #333;
  margin: 0;
}
.progress-indicator {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  display: inline-block;
  margin-top: 8px;
}
.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: #999;
  cursor: pointer;
}
.close-btn:disabled {
  color: #ccc;
  cursor: not-allowed;
}

/* FORM STYLES */
.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}
.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
}
.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 2px rgba(26, 54, 93, 0.2);
}

/* FILE INPUT */
.hidden-input {
  display: none;
}
.attachment-trigger {
  border: 2px dashed #ddd;
  border-radius: 6px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.attachment-trigger:hover {
  border-color: #1a365d;
  background-color: #f8f9fa;
}
.file-list {
  margin-top: 15px;
  padding-left: 0;
  list-style: none;
}
.file-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  font-size: 14px;
  background-color: #f9fafb;
  border-radius: 4px;
  margin-bottom: 5px;
}
.remove-file-btn {
  background: none;
  border: none;
  color: #ef4444;
  font-weight: bold;
  cursor: pointer;
  font-size: 18px;
}

/* LANGUAGE SELECTOR */
.lang-description {
  font-size: 14px;
  color: #666;
  margin-top: -5px;
  margin-bottom: 15px;
}
.language-selector {
  display: flex;
  gap: 15px;
}
.lang-option {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px;
  border: 2px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.lang-option:hover {
  border-color: #aaa;
}
.lang-option.selected {
  border-color: #1a365d;
  background-color: #f0f5fa;
  box-shadow: 0 0 0 2px rgba(26, 54, 93, 0.2);
}
.lang-option img {
  width: 32px;
  border-radius: 4px;
}
.lang-option span {
  font-weight: 500;
  color: #333;
}

/* FOOTER BUTTONS */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}
.cancel-btn,
.create-btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}
.cancel-btn {
  background: white;
  border-color: #ddd;
  color: #666;
}
.cancel-btn:hover {
  background-color: #f5f5f5;
  border-color: #ccc;
}
.create-btn {
  background-color: #1a365d;
  border-color: #1a365d;
  color: white;
}
.create-btn:hover {
  background-color: #2c5282;
}

/* PROCESSING VIEW STYLES */
.processing-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 250px;
  text-align: center;
}
.status-text {
  margin-top: 15px;
  font-size: 1.1em;
  color: #666;
  max-width: 80%;
}
.status-title {
  font-size: 1.5em;
  margin-top: 15px;
  margin-bottom: 10px;
  color: #333;
}
.status-icon {
  font-size: 48px;
}
.processing-view .create-btn,
.processing-view .cancel-btn {
  margin-top: 20px;
}
.error-log {
  margin-top: 15px;
  background-color: #f8f8f8;
  border: 1px solid #ddd;
  padding: 10px;
  border-radius: 4px;
  white-space: pre-wrap;
  font-size: 0.9em;
  text-align: left;
  max-height: 100px;
  overflow-y: auto;
  width: 100%;
}

/* SPINNER */
.spinner-borders {
  position: relative;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.spinner-borders::before,
.spinner-borders::after {
  border: 6.7px solid #1a365d;
  border-radius: 50%;
  position: absolute;
  content: '';
  display: block;
}
.spinner-borders::before {
  width: 33.6px;
  height: 33.6px;
  border-bottom-color: transparent;
  border-left-color: transparent;
  animation: spin-inner 0.8s infinite linear reverse;
}
.spinner-borders::after {
  animation: spin-outer 0.5s infinite linear;
  height: 56px;
  width: 56px;
  border-right-color: transparent;
  border-top-color: transparent;
}
@keyframes spin-inner {
  to {
    transform: rotate(360deg);
  }
}
@keyframes spin-outer {
  to {
    transform: rotate(360deg);
  }
}
</style>
