<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Add New Input</h3>
        <button class="close-btn" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="modal-body">
        <div class="input-section">
          <h4>Upload Files</h4>
          <div class="file-upload-area" @click="triggerFileInput">
            <input
              type="file"
              ref="fileInput"
              @change="handleFileSelect"
              multiple
              accept=".docx,.pdf,.jpg,.jpeg,.png,.gif,.mp3,.wav,.m4a"
              style="display: none"
            />
            <div class="upload-placeholder">
              <span class="material-symbols-outlined upload-icon">cloud_upload</span>
              <p>Click to upload files</p>
              <p class="file-types">Supported: DOCX, PDF, Images, Audio files</p>
            </div>
          </div>
          <div v-if="selectedFiles.length > 0" class="selected-files">
            <h5>Selected Files ({{ selectedFiles.length }})</h5>
            <ul class="file-list">
              <li v-for="(file, index) in selectedFiles" :key="index" class="file-item">
                <span class="material-symbols-outlined file-icon">description</span>
                <span class="file-name">{{ file.name }}</span>
                <span class="file-size">({{ formatFileSize(file.size) }})</span>
                <button class="remove-file" @click="removeFile(index)">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div class="input-section">
          <h4>Describe your project</h4>
          <textarea
            v-model="rawText"
            placeholder="Describe your requirements, use cases, or system specifications here..."
            class="text-input"
            rows="6"
          ></textarea>
        </div>

        <div v-if="!canSubmit" class="validation-message">
          Please add at least one file or enter some text to proceed!
        </div>
      </div>
      <div class="modal-footer">
        <button class="cancel-btn" @click="$emit('close')">Cancel</button>
        <button class="submit-btn" @click="handleSubmit" :disabled="!canSubmit || isAddingInput">
          <span v-if="isAddingInput" class="button-spinner-small"></span>
          {{ isAddingInput ? 'Adding...' : 'Add Input' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AddInputModal',
  emits: ['close', 'add-inputs'],
  props: {
    isAddingInput: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      selectedFiles: [],
      rawText: '',
    }
  },
  computed: {
    canSubmit() {
      return this.selectedFiles.length > 0 || this.rawText.trim().length > 0
    },
  },
  methods: {
    /**
     * Trigger file input click
     */
    triggerFileInput() {
      this.$refs.fileInput.click()
    },

    /**
     * Handle file selection
     */
    handleFileSelect(event) {
      const files = Array.from(event.target.files)
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'audio/mpeg',
        'audio/wav',
        'audio/mp4',
      ]

      const validFiles = files.filter((file) => allowedTypes.includes(file.type))
      this.selectedFiles = [...this.selectedFiles, ...validFiles]
      event.target.value = ''
    },

    /**
     * Remove selected file
     */
    removeFile(index) {
      this.selectedFiles.splice(index, 1)
    },

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },

    /**
     * Handle form submission
     */
    handleSubmit() {
      if (!this.canSubmit) return

      const formData = new FormData()
      if (this.selectedFiles.length > 0) {
        this.selectedFiles.forEach((file) => {
          formData.append('files', file)
        })
      }
      if (this.rawText.trim()) {
        formData.append('rawText', this.rawText.trim())
      }

      this.$emit('add-inputs', formData)
      this.resetForm()
    },

    /**
     * Reset form
     */
    resetForm() {
      this.selectedFiles = []
      this.rawText = ''
    },
  },
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: #111827;
}

.close-btn {
  background: transparent;
  border: none;
  border-radius: 4px;
  padding: 4px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.input-section {
  margin-bottom: 20px;
}

.input-section h4 {
  font-weight: bold;
  margin-bottom: 10px;
}

.file-upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 20px;
}

.file-upload-area:hover {
  border-color: #1a365d;
  background: #f8fafc;
}

.upload-placeholder {
  color: #6b7280;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 10px;
  color: #9ca3af;
}

.file-types {
  font-size: 12px;
  margin-top: 8px;
  color: #9ca3af;
}

.selected-files h5 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.file-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #f9fafb;
  border-radius: 4px;
  margin-bottom: 4px;
}

.file-name {
  flex: 1;
  font-size: 14px;
  color: #374151;
}

.file-size {
  font-size: 12px;
  color: #6b7280;
}

.remove-file {
  background: transparent;
  border: none;
  border-radius: 4px;
  padding: 2px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
}

.remove-file:hover {
  background: #f3f4f6;
  color: #374151;
}

.text-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.text-input:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.validation-message {
  color: #dc2626;
  font-size: 14px;
  text-align: center;
  padding: 10px;
  background: #fef2f2;
  border-radius: 6px;
  margin-top: 10px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e5e7eb;
}

.cancel-btn {
  padding: 10px 20px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.submit-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background: #1a365d;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.submit-btn:hover:not(:disabled) {
  background: #12337c;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.button-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>