<template>
  <div class="new-project-form">
    <h2>Create New Project</h2>
    <p>Start a new documentation project with AI assistance</p>

    <form @submit.prevent="createProjectHandler">
      <div class="form-group">
        <label for="projectName">Project Name</label>
        <input
          type="text"
          id="projectName"
          v-model="newProject.name"
          placeholder="Enter project name..."
          required
        />
      </div>

      <div class="form-group description-group">
        <label for="projectDescription">Project Description & Requirements</label>
        <div class="description-wrapper">
          <textarea
            id="projectDescription"
            v-model="newProject.description"
            placeholder="Describe your project requirements, features, and any specific documentation needs..."
            rows="3"
            required
          ></textarea>

          <span class="material-symbols-outlined attach-icon" @click="toggleAttachmentOptions">
            attach_file
          </span>

          <div v-if="showAttachmentOptions" class="attachment-dropdown">
            <div class="dropdown-item" @click="triggerFileInput('doc')">
              <span class="material-symbols-outlined">description</span> Choose File
            </div>
            <div class="dropdown-item" @click="triggerFileInput('image')">
              <span class="material-symbols-outlined">image</span> Choose Image
            </div>
            <div class="dropdown-item" @click="triggerFileInput('audio')">
              <span class="material-symbols-outlined">audiotrack</span> Choose Audio
            </div>
          </div>
        </div>

        <!-- hidden inputs -->
        <input type="file" ref="docInput" class="hidden-input" accept=".doc,.docx,.pdf,.txt" @change="handleFileUpload($event,'doc')" />
        <input type="file" ref="imageInput" class="hidden-input" accept="image/*" @change="handleFileUpload($event,'image')" />
        <input type="file" ref="audioInput" class="hidden-input" accept="audio/*" @change="handleFileUpload($event,'audio')" />
      </div>

      <div v-if="uploadedFiles.length > 0" class="file-list-container">
        <p style="font-weight:500">Selected Files:</p>
        <ul class="file-list">
          <li v-for="(f, idx) in uploadedFiles" :key="idx">
            <span class="file-name">{{ f.name }}</span>
            <button type="button" class="remove-file-btn" @click="removeFile(idx)">&times;</button>
          </li>
        </ul>
      </div>

      <div class="form-actions">
        <button type="button" class="cancel-btn" @click="$emit('cancel')">Cancel</button>
        <button type="submit" class="create-btn" :disabled="submitting">
          {{ submitting ? 'Creating...' : 'Create Project' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { createProject, uploadAttachments } from '@/api/project';

export default {
  name: 'NewProjectForm',
  data() {
    return {
      newProject: { name: '', description: '' },
      showAttachmentOptions: false,
      uploadedFiles: [],
      submitting: false
    };
  },
  methods: {
    toggleAttachmentOptions() { this.showAttachmentOptions = !this.showAttachmentOptions; },
    triggerFileInput(type) {
      if (type === 'doc') this.$refs.docInput.click();
      if (type === 'image') this.$refs.imageInput.click();
      if (type === 'audio') this.$refs.audioInput.click();
      this.showAttachmentOptions = false;
    },
    handleFileUpload(event) {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!this.uploadedFiles.some(f => f.name === file.name && f.size === file.size)) {
          this.uploadedFiles.push(file);
        }
      }
      event.target.value = '';
    },
    removeFile(index) { this.uploadedFiles.splice(index, 1); },

    async createProjectHandler() {
      if (!this.newProject.name) return;
      this.submitting = true;
      try {
        const { data } = await createProject(this.newProject);
        const created = data.data || data;
        const projectId = created._id || created.id;

        if (this.uploadedFiles.length > 0 && projectId) {
          const form = new FormData();
          this.uploadedFiles.forEach(f => form.append('files', f));
          await uploadAttachments(projectId, form);
        }

        if (projectId) {
          this.$router.push({ name: 'Editor', params: { id: projectId } });
        } else {
          this.$emit('created', created);
        }

        this.newProject = { name: '', description: '' };
        this.uploadedFiles = [];
      } catch (err) {
        console.error('Create project error', err);
        alert(err?.response?.data?.message || 'Create project failed');
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>
