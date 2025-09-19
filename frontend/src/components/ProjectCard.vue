<template>
  <div class="project-card">
    <div class="project-header">
      <h3 @click="openProject">{{ project.name }}</h3>

      <!-- Badge project type -->
      <span class="project-type" :class="projectType">
        {{ projectType === "my" ? "My Project" : "Shared Project" }}
      </span>
    </div>

    <p class="project-description">{{ project.description }}</p>

    <div class="project-meta">
      <span class="update-time">Updated {{ formatDate(project.updatedAt) }}</span>
      <div class="meta-right">
        <span class="project-members">
          <span class="material-symbols-outlined">group</span>
          {{ project.members?.length || 0 }}
        </span>
        <button v-if="showDelete" class="delete-btn" @click="confirmDelete">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ProjectCard",
  props: {
    project: { type: Object, required: true },
    showDelete: { type: Boolean, default: true },
  },
  computed: {
    projectType() {
      const currentEmail = localStorage.getItem("email");
      return this.project.owner_id?.email === currentEmail ? "my" : "shared";
    },
  },
  methods: {
    openProject() {
      this.$emit("open", this.project);
    },
    confirmDelete() {
      this.$emit("delete", this.project._id || this.project.id);
    },
    formatDate(dateStr) {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      const d = String(date.getDate()).padStart(2, "0");
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    },
  },
};
</script>

<style scoped>
.project-type {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  margin-left: 8px;
}
.project-type.my {
  background-color: #bdd6ef;
  color: #414141;
}
.project-type.shared {
  background-color: #d1e1eb;
  color: #5f5f5f;
}
</style>
