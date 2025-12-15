[file name]: NewProjectForm.vue
[file content begin]
<template>
  <div v-if="show" class="modal-overlay" @click.self="() => {}">
    <div class="modal-content">
      <!-- FORM (idle) -->
      <template v-if="creationStatus === 'idle'">
        <div class="modal-header">
          <div class="header-text">
            <h2>Create New Project</h2>
            <p class="progress-indicator">Step {{ currentStep }} of 2</p>
          </div>
          <button class="close-btn" @click="handleClose">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleCreateProject">
            <!-- Step 1 -->
            <div v-if="currentStep === 1">
              <div class="form-group">
                <label for="projectName"
                  >Project Name <span class="required-asterisk">*</span></label
                >
                <input
                  id="projectName"
                  v-model="projectData.name"
                  placeholder="e.g., E-commerce Platform"
                  required
                  @input="validateStep1"
                />
                <div v-if="step1Error.name" class="error-message">
                  <!-- {{ step1Error.name }} -->
                </div>
              </div>
              <div class="form-group">
                <label for="projectDescription"
                  >Project Description <span class="required-asterisk">*</span></label
                >
                <textarea
                  id="projectDescription"
                  v-model="projectData.description"
                  placeholder="A platform to sell goods online"
                  rows="5"
                  required
                  @input="validateStep1"
                ></textarea>
                <div v-if="step1Error.description" class="error-message">
                  <!-- {{ step1Error.description }} -->
                </div>
              </div>
            </div>

            <!-- Step 2 (Language Selection) -->
            <div v-if="currentStep === 2">
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
                v-if="currentStep < 2"
                @click="nextStep"
                :disabled="isNextButtonDisabled"
              >
                Next
              </button>
              <button type="submit" class="create-btn" v-if="currentStep === 2">
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
            <h3 class="status-title">Creation Failed</h3>
            <p class="status-text">Something went wrong during project creation.</p>
            <div class="button-group">
              <button class="cancel-btn" @click="handleCancelInStatus">Close</button>
              <button class="create-btn" @click="handleRetry">Retry</button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { ref, watch, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { createProject } from '@/api/project'

export default {
  name: 'NewProjectModal',
  props: {
    show: { type: Boolean, default: false },
    creatingProjects: { type: Array, default: () => [] },
  },
  setup(props, { emit }) {
    const router = useRouter()

    // Form state
    const currentStep = ref(1)
    const projectData = ref({ name: '', description: '', language: 'vi-VN' })
    const step1Error = ref({ name: '', description: '' })

    // Status state
    const creationStatus = ref('idle') // idle, creating, completed, failed
    const finalProjectData = ref(null)
    const processingError = ref('')

    // Computed property để kiểm tra nút Next có bị disable không
    const isNextButtonDisabled = computed(() => {
      if (currentStep.value === 1) {
        return !projectData.value.name.trim() || !projectData.value.description.trim()
      }
      return false
    })

    const validateStep1 = () => {
      const errors = { name: '', description: '' }

      if (!projectData.value.name.trim()) {
        errors.name = 'Project name is required'
      }

      if (!projectData.value.description.trim()) {
        errors.description = 'Project description is required'
      }

      step1Error.value = errors
    }

    // Reset form
    const resetForm = () => {
      currentStep.value = 1
      creationStatus.value = 'idle'
      projectData.value = { name: '', description: '', language: 'vi-VN' }
      step1Error.value = { name: '', description: '' }
      finalProjectData.value = null
      processingError.value = ''
    }

    const handleClose = () => {
      if (creationStatus.value === 'creating') return
      emit('close')
    }

    const handleCancelInStatus = () => {
      handleClose()
    }

    watch(
      () => props.show,
      (newVal) => {
        if (!newVal) resetForm()
      }
    )

    const nextStep = () => {
      if (currentStep.value === 1) {
        // Validate cả tên và mô tả
        const errors = { name: '', description: '' }
        let hasError = false

        if (!projectData.value.name.trim()) {
          errors.name = 'Project name is required'
          hasError = true
        }

        if (!projectData.value.description.trim()) {
          errors.description = 'Project description is required'
          hasError = true
        }

        step1Error.value = errors

        if (hasError) {
          return
        }
      }

      if (currentStep.value < 2) currentStep.value++
    }

    const prevStep = () => {
      if (currentStep.value > 1) currentStep.value--
    }

    const handleCreateProject = async () => {
      creationStatus.value = 'creating'

      const formData = new FormData()
      formData.append('name', projectData.value.name)
      formData.append('description', projectData.value.description)
      formData.append('language', projectData.value.language)

      try {
        const response = await createProject(formData)
        const createdProject = response.data.data

        // Lưu lại project data
        finalProjectData.value = createdProject

        // Chuyển trạng thái thành completed ngay lập tức
        creationStatus.value = 'completed'
        emit('project-created', createdProject)
      } catch (error) {
        creationStatus.value = 'failed'
        processingError.value = error.response?.data?.message || 'Failed to create project!!'
      }
    }

    const goToEditor = () => {
      if (!finalProjectData.value) return
      router.push({ name: 'Editor', params: { id: finalProjectData.value._id } })
      handleClose()
    }

    const handleRetry = async () => {
      // Reset form để tạo lại project
      resetForm()
      creationStatus.value = 'idle'
    }

    return {
      router,
      currentStep,
      projectData,
      creationStatus,
      finalProjectData,
      processingError,
      isNextButtonDisabled,
      step1Error,
      handleClose,
      handleCancelInStatus,
      nextStep,
      prevStep,
      handleCreateProject,
      goToEditor,
      handleRetry,
      validateStep1,
    }
  },
}
</script>
<style scoped>
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
  backdrop-filter: blur(8px);
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  padding: 28px;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(26, 54, 93, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
  width: 90%;
  max-width: 650px;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
}

.modal-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #1a365d 0%, #2d4a8a 50%, #1a365d 100%);
  background-size: 200% 100%;
  animation: shimmer 3s linear infinite;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 20px;
  margin-bottom: 24px;
  position: relative;
}

.modal-header::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, #1a365d 0%, #2d4a8a 100%);
  border-radius: 2px;
}

.modal-header h2 {
  font-size: 24px;
  background: linear-gradient(135deg, #1a365d 0%, #2d4a8a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.progress-indicator {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1a365d;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
  margin-top: 8px;
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.15);
  border: 1px solid rgba(26, 54, 93, 0.1);
}

.close-btn {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.close-btn:hover {
  color: #dc2626;
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
  padding: 14px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 14px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.form-group input:hover,
.form-group textarea:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.1);
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 4px rgba(26, 54, 93, 0.15), 0 4px 12px rgba(26, 54, 93, 0.2);
  background: #ffffff;
  transform: translateY(-1px);
}

.required-asterisk {
  color: #ef4444;
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
  padding: 18px;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.lang-option::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: linear-gradient(135deg, rgba(26, 54, 93, 0.1) 0%, rgba(45, 74, 138, 0.1) 100%);
  transition: width 0.3s ease;
}

.lang-option:hover::before {
  width: 4px;
}

.lang-option:hover {
  border-color: #1a365d;
  box-shadow: 0 4px 16px rgba(26, 54, 93, 0.2);
  transform: translateY(-2px);
}

.lang-option.selected {
  border-color: #1a365d;
  background: linear-gradient(135deg, #e6f2ff 0%, #dbeafe 100%);
  box-shadow: 0 6px 20px rgba(26, 54, 93, 0.25), 0 0 0 3px rgba(26, 54, 93, 0.1);
  transform: translateY(-2px);
}

.lang-option.selected::before {
  width: 4px;
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
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  position: relative;
  overflow: hidden;
}

.cancel-btn::before,
.create-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.cancel-btn:hover::before,
.create-btn:hover::before {
  width: 300px;
  height: 300px;
}

.cancel-btn {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 2px solid #e5e7eb;
  color: #374151;
}

.cancel-btn:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-color: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.create-btn {
  background: linear-gradient(135deg, #1a365d 0%, #2d4a8a 100%);
  color: white;
}

.create-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #2d4a8a 0%, #1a365d 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(26, 54, 93, 0.35);
}

.create-btn:disabled {
  background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
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
  font-size: 64px;
  animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes scaleIn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.processing-view .create-btn,
.processing-view .cancel-btn {
  margin-top: 24px;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
}

/* Success and Error Colors */
.success {
  color: #10b981;
  filter: drop-shadow(0 4px 12px rgba(16, 185, 129, 0.3));
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.fail {
  color: #ef4444;
  filter: drop-shadow(0 4px 12px rgba(239, 68, 68, 0.3));
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-10px);
  }
  75% {
    transform: translateX(10px);
  }
}
</style>
[file content end]