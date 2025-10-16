<template>
  <div v-if="show" class="modal-overlay" @click.self="() => {}">
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
                <div class="file-info">
                  <span class="file-count">{{ selectedFiles.length }} files selected</span>
                  <span class="file-size">Total size: {{ formatFileSize(totalFileSize) }}</span>
                </div>
                <div class="attachment-trigger" @click="$refs.fileInput.click()">
                  <span class="material-symbols-outlined">upload_file</span>
                  Click to choose files...
                </div>
                <input
                  type="file"
                  ref="fileInput"
                  class="hidden-input"
                  multiple
                  @change="handleFileChange"
                />
                <div v-if="selectedFiles.length > 0" class="file-list-container">
                  <div class="file-list-scroll">
                    <div v-for="(file, idx) in selectedFiles" :key="file.id" class="file-item">
                      <div class="file-preview" v-if="isImageFile(file)">
                        <img :src="file.previewUrl" :alt="file.name" />
                      </div>
                      <div v-else class="file-icon">
                        <span class="material-symbols-outlined">description</span>
                      </div>
                      <span class="file-name">{{ file.name }}</span>
                      <span class="file-size-small">{{ formatFileSize(file.size) }}</span>
                      <button type="button" class="remove-file-btn" @click="removeFile(idx)">
                        &times;
                      </button>
                    </div>
                  </div>
                </div>
                <div v-if="sizeLimitExceeded" class="error-message">
                  Total file size exceeds the limit of 150KB. Please remove some files.
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
              <button
                type="button"
                class="create-btn"
                v-if="currentStep < 3"
                @click="nextStep"
                :disabled="currentStep === 2 && sizeLimitExceeded"
              >
                Next
              </button>
              <button
                type="submit"
                class="create-btn"
                v-if="currentStep === 3"
                :disabled="sizeLimitExceeded"
              >
                Create Project
              </button>
            </div>
          </form>
        </div>
      </template>

      <!-- STATUS VIEW -->
      <template v-else>
        <div class="modal-body processing-view">
          <!-- COMPLETED -->
          <div v-if="creationStatus === 'completed'">
            <span class="status-icon success material-symbols-outlined"> check_circle </span>
            <h3 class="status-title">Project Ready!</h3>
            <div class="button-group">
              <button class="cancel-btn" @click="handleCancelInStatus">Go Home</button>
              <button class="create-btn" @click="goToEditor">View Detail</button>
            </div>
          </div>

          <!-- FAILED -->
          <div v-if="creationStatus === 'failed'">
            <span class="status-icon fail material-symbols-outlined"> error </span>
            <h3 class="status-title">Processing Failed</h3>
            <p class="status-text">Something went wrong during the analysis.</p>
            <div class="button-group">
              <button class="cancel-btn" @click="handleCancelInStatus">Close</button>
              <button class="create-btn" @click="handleRetry">Retry</button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- FULLSCREEN LOADING OVERLAY -->
    <div v-if="overlayLoading" class="fullscreen-overlay">
      <div class="loading-box">
        <div class="spinner-flashlight"></div>
        <!-- <p class="loading-text">{{ loadingMessage }}</p> -->

        <!-- PROCESSING PROGRESS -->
        <div v-if="creationStatus === 'polling'" class="processing-status">
          <!-- <h3 class="status-title">Processing Project</h3> -->

          <!-- Progress Bar -->
          <div class="progress-container">
            <div class="progress-info">
              <span class="stage-text">{{ currentStage }}</span>
              <span class="progress-percent">{{ processingProgress }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: processingProgress + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { createProject, getVersionStatus, retryProjectAnalysis } from '@/api/project'

export default {
  name: 'NewProjectModal',
  props: { show: { type: Boolean, default: false } },
  setup(props, { emit }) {
    const router = useRouter()

    // Constants
    const MAX_TOTAL_SIZE = 20000 * 1024 // 20000KB in bytes

    // Form state
    const currentStep = ref(1)
    const projectData = ref({ name: '', description: '', rawText: '', language: 'vi-VN' })
    const selectedFiles = ref([])

    // Status state
    const creationStatus = ref('idle') // idle, creating, polling, completed, failed
    const finalProjectData = ref(null)
    const failedVersionId = ref(null)
    const processingError = ref('')
    const pollingInterval = ref(null)
    const isRetrying = ref(false)

    // Processing progress state
    const processingProgress = ref(0)
    const currentStage = ref('Initializing...')

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

    // Computed properties
    const totalFileSize = computed(() => {
      return selectedFiles.value.reduce((total, file) => total + file.size, 0)
    })

    const sizeLimitExceeded = computed(() => {
      return totalFileSize.value > MAX_TOTAL_SIZE
    })

    const startLoadingMessages = () => {
      overlayLoading.value = true
      messageIndex.value = 0
      loadingMessage.value = loadingMessages[0]
      messageInterval = setInterval(() => {
        messageIndex.value = (messageIndex.value + 1) % loadingMessages.length
        loadingMessage.value = loadingMessages[messageIndex.value]
      }, 4000)
    }

    const stopLoadingMessages = () => {
      overlayLoading.value = false
      if (messageInterval) clearInterval(messageInterval)
    }

    // File utility methods
    const isImageFile = (file) => {
      return file.type.startsWith('image/')
    }

    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const isDuplicateFile = (newFile, existingFiles) => {
      return existingFiles.some(
        (existingFile) => existingFile.name === newFile.name && existingFile.size === newFile.size
      )
    }

    const createFileObject = (file) => {
      return {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
        previewUrl: isImageFile(file) ? URL.createObjectURL(file) : null,
      }
    }

    // Clean up object URLs when component unmounts
    onUnmounted(() => {
      selectedFiles.value.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl)
        }
      })
    })

    // Reset form
    const resetForm = () => {
      currentStep.value = 1
      creationStatus.value = 'idle'
      projectData.value = { name: '', description: '', rawText: '', language: 'vi-VN' }
      processingProgress.value = 0
      currentStage.value = 'Initializing...'

      selectedFiles.value.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl)
        }
      })
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

    const handleCancelInStatus = () => {
      window.location.reload()
    }

    watch(
      () => props.show,
      (newVal) => {
        if (!newVal) resetForm()
      }
    )

    const nextStep = () => {
      if (currentStep.value === 1 && (!projectData.value.name || !projectData.value.description)) {
        alert('Please fill in both Project Name and Description!')
        return
      }
      if (currentStep.value === 2 && sizeLimitExceeded.value) {
        alert('Please reduce total file size below 150KB before proceeding.')
        return
      }
      if (currentStep.value < 3) currentStep.value++
    }

    const prevStep = () => {
      if (currentStep.value > 1) currentStep.value--
    }

    const handleFileChange = (event) => {
      const newFiles = Array.from(event.target.files)
      if (newFiles.length === 0) return

      let addedFiles = 0
      let duplicateFiles = 0
      let oversizedFiles = 0

      newFiles.forEach((file) => {
        if (isDuplicateFile(file, selectedFiles.value)) {
          duplicateFiles++
          return
        }

        const newTotalSize = totalFileSize.value + file.size
        if (newTotalSize > MAX_TOTAL_SIZE) {
          oversizedFiles++
          return
        }

        selectedFiles.value.push(createFileObject(file))
        addedFiles++
      })

      let message = ''
      if (addedFiles > 0) {
        message += `Added ${addedFiles} file(s). `
      }
      if (duplicateFiles > 0) {
        message += `${duplicateFiles} duplicate file(s) skipped. `
      }
      if (oversizedFiles > 0) {
        message += `${oversizedFiles} file(s) skipped due to size limit. `
      }

      if (message) {
        if (duplicateFiles > 0 || oversizedFiles > 0) {
          alert(message.trim())
        }
      }

      event.target.value = ''
    }

    const removeFile = (index) => {
      const fileToRemove = selectedFiles.value[index]
      if (fileToRemove.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl)
      }
      selectedFiles.value.splice(index, 1)
    }

    // Update progress based on stage
    const updateProgressFromStage = (stage) => {
      const stageProgressMap = {
        initializing: 5,
        input: 25,
        analyzing: 60,
        finalizing: 90,
        completed: 100,
      }

      currentStage.value = stage.charAt(0).toUpperCase() + stage.slice(1)
      processingProgress.value = stageProgressMap[stage] || 0
    }

    const startPolling = (projectId, versionId) => {
      pollingInterval.value = setInterval(async () => {
        try {
          const response = await getVersionStatus(versionId)
          const { status, version, project } = response.data.data

          // Update progress and stage from backend
          if (version) {
            updateProgressFromStage(version.stage || 'initializing')
            if (version.progress) {
              processingProgress.value = version.progress
            }
          }

          if (status !== 'processing') {
            clearInterval(pollingInterval.value)
            finalProjectData.value = { _id: projectId, current_version: { _id: versionId } }

            if (status === 'completed' || status === 'has_conflicts') {
              // Đảm bảo progress là 100% trước khi delay
              processingProgress.value = 100
              currentStage.value = 'Completed'

              // Delay 1s trước khi chuyển sang trạng thái completed
              setTimeout(() => {
                creationStatus.value = 'completed'
                stopLoadingMessages()
                emit('processing-finished')
              }, 1000)
            } else {
              failedVersionId.value = versionId
              creationStatus.value = 'failed'
              processingError.value =
                version.processing_errors?.join('\n') || 'Analysis failed without specific errors!!'
              stopLoadingMessages()
            }
          }
        } catch (error) {
          clearInterval(pollingInterval.value)
          failedVersionId.value = versionId
          creationStatus.value = 'failed'
          processingError.value =
            error.response?.data?.message || 'Could not fetch processing status from the server!!'
          stopLoadingMessages()
        }
      }, 3000)
    }

    const handleCreateProject = async () => {
      if (sizeLimitExceeded.value) {
        alert('Please reduce total file size below 150KB before creating project.')
        return
      }

      creationStatus.value = 'creating'
      processingProgress.value = 0
      currentStage.value = 'Initializing...'
      startLoadingMessages()

      const formData = new FormData()
      formData.append('name', projectData.value.name)
      formData.append('description', projectData.value.description)
      formData.append('language', projectData.value.language)
      if (projectData.value.rawText) formData.append('rawText', projectData.value.rawText)

      selectedFiles.value.forEach((fileObj) => {
        formData.append('files', fileObj.file)
      })

      try {
        const response = await createProject(formData)
        const createdProject = response.data.data
        creationStatus.value = 'polling'
        startPolling(createdProject._id, createdProject.current_version)
      } catch (error) {
        creationStatus.value = 'failed'
        processingError.value = error.response?.data?.message || 'Failed to create project!!'
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

    const handleRetry = async () => {
      if (!finalProjectData.value || !failedVersionId.value) {
        alert('Cannot retry: Project or Version ID is missing.')
        return
      }

      const projectId = finalProjectData.value._id
      const versionId = failedVersionId.value

      isRetrying.value = true
      loadingMessage.value = 'Retrying analysis...'
      processingProgress.value = 0
      currentStage.value = 'Initializing...'
      overlayLoading.value = true
      creationStatus.value = 'polling'

      try {
        await retryProjectAnalysis(projectId, versionId)
        startPolling(projectId, versionId)
      } catch (error) {
        console.error('Error retrying processing:', error)
        creationStatus.value = 'failed'
        processingError.value = error.response?.data?.message || 'Failed to start retry process.'
      } finally {
        isRetrying.value = false
      }
    }

    return {
      router,
      currentStep,
      projectData,
      selectedFiles,
      creationStatus,
      finalProjectData,
      processingError,
      overlayLoading,
      loadingMessage,
      isRetrying,
      totalFileSize,
      sizeLimitExceeded,
      processingProgress,
      currentStage,
      handleClose,
      handleCancelInStatus,
      nextStep,
      prevStep,
      handleFileChange,
      removeFile,
      handleCreateProject,
      goToEditor,
      handleRetry,
      isImageFile,
      formatFileSize,
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
  display: flex;
  flex-direction: column;
  align-items: center;
}
.loading-text {
  margin-top: 45px;
  font-size: 1.2em;
  color: #ece8e8;
}
.button-group {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
}

/* PROCESSING STATUS STYLES */
.processing-status {
  width: 100%;
  margin-top: 25px;
}

.status-title {
  font-size: 1.4em;
  margin-bottom: 20px;
  font-weight: 600;
}

.progress-container {
  width: 100%;
  margin: 15px 0;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
  color: #ece8e8;
  gap: 12px;
}

.stage-text {
  font-weight: 500;
  color: #ece8e8;
}

.progress-percent {
  font-weight: 600;
  color: #ece8e8;
}

.progress-bar {
  min-width: 200px;
  height: 10px;
  background-color: #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1a365d, #2c5282);
  border-radius: 8px;
  transition: width 0.5s ease-in-out;
  box-shadow: 0 2px 4px rgba(26, 54, 93, 0.3);
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
  transition: all 0.1s;
}
.close-btn:hover {
  color: #666;
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
  margin-top: 8px;
}
.attachment-trigger:hover {
  border-color: #1a365d;
  background-color: #f8f9fa;
}

/* FILE INFO */
.file-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}
.file-count {
  font-weight: 500;
}
.file-size {
  color: #1a365d;
}

/* FILE LIST STYLES */
.file-list-container {
  margin-top: 15px;
}
.file-list-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 8px 4px;
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}
.file-list-scroll::-webkit-scrollbar {
  height: 8px;
}
.file-list-scroll::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}
.file-list-scroll::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}
.file-list-scroll::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
.file-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
  background-color: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  min-width: 100px;
  max-width: 120px;
  position: relative;
  transition: all 0.2s;
}
.file-item:hover {
  background-color: #f3f4f6;
  border-color: #d1d5db;
}
.file-preview {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
  border: 1px solid #e5e7eb;
}
.file-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.file-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e5e7eb;
  border-radius: 4px;
  color: #6b7280;
}
.file-icon .material-symbols-outlined {
  font-size: 28px;
}
.file-name {
  font-size: 11px;
  text-align: center;
  word-break: break-word;
  width: 100%;
  color: #374151;
  line-height: 1.3;
  font-weight: 500;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  user-select: none;
  overflow: hidden;
  text-overflow: ellipsis;
}
.file-size-small {
  font-size: 10px;
  color: #6b7280;
}
.remove-file-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(239, 68, 68, 0.9);
  border: none;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.2s;
}
.remove-file-btn:hover {
  background: #ef4444;
  transform: scale(1.1);
}

/* ERROR MESSAGE */
.error-message {
  color: #ef4444;
  font-size: 12px;
  margin-top: 8px;
  font-weight: 500;
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
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
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
.create-btn:hover:not(:disabled) {
  background-color: #2c5282;
}
.create-btn:disabled {
  background-color: #9ca3af;
  border-color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
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
  justify-self: center;
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

.button-group {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
}

/* SPINNER */
.spinner-flashlight {
  position: relative;
  width: 56px;
  height: 56px;
  animation: spinner-xza56z 2s infinite linear;
}

.spinner-flashlight::before,
.spinner-flashlight::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  background: #f5f5f5;
  border-radius: 50%;
  animation: spinner-lqsq3g 1.3s infinite ease;
}

.spinner-flashlight::before {
  height: 75%;
  width: 75%;
  transform-origin: -40% -80%;
}

.spinner-flashlight::after {
  height: 50%;
  width: 50%;
  transform-origin: 40% 80%;
}

@keyframes spinner-xza56z {
  to {
    transform: rotate(360deg);
  }
}

@keyframes spinner-lqsq3g {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(0);
  }
}

/* Success and Error Colors */
.success {
  color: #10b981;
}
.fail {
  color: #ef4444;
}
</style>