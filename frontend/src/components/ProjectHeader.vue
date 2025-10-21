<template>
  <div class="project-header-modern">
    <div class="header-content">
      <!-- Left Section -->
      <div class="header-left">
        <button class="back-btn" @click="goBack">
          <span class="material-symbols-outlined">arrow_back</span>
          <span class="btn-text">Back to Projects</span>
        </button>

        <div class="project-info">
          <div class="project-title-section">
            <h1 class="project-title">{{ project.name }}</h1>
          </div>

          <div class="description-section">
            <button class="toggle-description-btn" @click="toggleDescription">
              <span class="material-symbols-outlined icon">
                {{ showDescription ? 'expand_less' : 'expand_more' }}
              </span>
              <span class="btn-text">{{
                showDescription ? 'Hide Description' : 'Show Description'
              }}</span>
            </button>
            <div v-if="showDescription" class="project-description">
              <p>{{ project.description || 'No description available' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Section -->
      <div class="header-right">
        <!-- Version Control -->
        <div class="version-control">
          <div class="version-selector" ref="versionSelector">
            <div class="selector-header" @click="toggleDropdown">
              <div class="selector-icon">
                <span class="material-symbols-outlined">history</span>
              </div>
              <div class="selector-content">
                <span class="selector-label">Version</span>
                <span class="version-label">{{ selectedLabel }}</span>
              </div>
              <span class="material-symbols-outlined dropdown-arrow" :class="{ open: isOpen }">
                expand_more
              </span>
            </div>

            <div v-if="isOpen" class="dropdown-menu">
              <div class="dropdown-header">
                <span>Select Version</span>
              </div>
              <div class="version-list">
                <div
                  v-for="version in versions"
                  :key="version._id"
                  class="version-option"
                  :class="{ active: version._id === selectedVersionId }"
                  @click="selectVersion(version)"
                >
                  <div class="version-icon">
                    <span class="material-symbols-outlined">history</span>
                  </div>
                  <div class="version-details">
                    <span class="version-number">Version {{ version.version_number }}</span>
                    <span class="version-date">{{ formatDate(version.created_at) }}</span>
                  </div>
                </div>
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
            <span class="btn-text">Retry Failed</span>
          </button>
        </div>

        <!-- Progress Indicator -->
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

        <!-- Active Users Indicator -->
        <div class="active-users-indicator" ref="activeUsersIndicator">
          <div class="active-users-trigger" @click="toggleActiveUsers">
            <div class="active-users-icon">
              <span class="material-symbols-outlined">group</span>
            </div>
            <div class="active-users-count">
              <span class="count">{{ activeUsers.length }}</span>
              <span class="label">Active</span>
            </div>
            <span class="material-symbols-outlined arrow" :class="{ open: showActiveUsers }">
              expand_more
            </span>
          </div>

          <div v-if="showActiveUsers" class="active-users-dropdown">
            <div class="dropdown-header">
              <span>Active Users</span>
            </div>
            <div class="active-users-list">
              <div v-for="user in activeUsers" :key="user.userId" class="active-user-item">
                <div class="user-avatar">
                  <img
                    v-if="user.avatar"
                    :src="getFullAvatarUrl(user.avatar)"
                    @error="handleAvatarError"
                    alt="User Avatar"
                  />
                  <div v-else class="avatar-placeholder">
                    {{ getUserInitials(user.name) }}
                  </div>
                </div>
                <div class="user-info">
                  <span class="user-name">{{ user.name }}</span>
                  <span class="user-email">{{ user.email }}</span>
                </div>
                <div class="online-status"></div>
              </div>
              <div v-if="activeUsers.length === 0" class="no-active-users">
                <span class="material-symbols-outlined">group_off</span>
                <p>No active users</p>
              </div>
            </div>
            <div class="active-users-footer">
              {{ activeUsers.length }} member{{ activeUsers.length !== 1 ? 's' : '' }} online
            </div>
          </div>
        </div>

        <!-- Members Button -->
        <button class="members-btn" @click="showSharingModal">
          <div class="members-icon">
            <span class="material-symbols-outlined">group</span>
          </div>
          <div class="members-count">
            <span class="count">{{ totalMembersCount }}</span>
            <span class="label">Members</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProjectHeaderModern',
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
    activeUsers: {
      type: Array,
      default: () => [],
      required: true,
    },
  },
  data() {
    return {
      showDescription: false,
      isOpen: false,
      showActiveUsers: false,
    }
  },
  computed: {
    hasFailedVersion() {
      return this.versions.some((version) => version.status === 'failed')
    },
    selectedLabel() {
      const version = this.versions.find((v) => v._id === this.selectedVersionId)
      return version ? `v${version.version_number}` : 'Select version'
    },
    totalMembersCount() {
      const ownerCount = 1
      const acceptedMembers =
        this.project.members?.filter((member) => member.status === 'accepted').length || 0
      return ownerCount + acceptedMembers
    },
  },
  methods: {
    toggleDescription() {
      this.showDescription = !this.showDescription
    },
    toggleDropdown() {
      this.isOpen = !this.isOpen
      if (this.isOpen) {
        this.showActiveUsers = false
      }
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
    showSharingModal() {
      this.$emit('show-sharing')
    },
    toggleActiveUsers() {
      this.showActiveUsers = !this.showActiveUsers
      if (this.showActiveUsers) {
        this.isOpen = false
      }
    },
    handleClickOutside(event) {
      if (
        this.$refs.activeUsersIndicator &&
        !this.$refs.activeUsersIndicator.contains(event.target)
      ) {
        this.showActiveUsers = false
      }
      if (this.$refs.versionSelector && !this.$refs.versionSelector.contains(event.target)) {
        this.isOpen = false
      }
    },
    getUserInitials(name) {
      if (!name) return 'U'
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    },
    formatDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    },
    getFullAvatarUrl(avatarUrl) {
      if (!avatarUrl) {
        console.log('❌ No avatar_url provided')
        return ''
      }

      // Nếu đã là full URL hoặc blob URL
      if (avatarUrl.startsWith('http') || avatarUrl.startsWith('blob:')) {
        console.log('✅ Already full URL:', avatarUrl)
        return avatarUrl
      }

      // Đảm bảo giữ nguyên toàn bộ URL
      const cleanUrl = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`
      const baseUrl = 'http://localhost:8000'
      const fullUrl = `${baseUrl}${cleanUrl}`

      console.log('🔗 Header constructed avatar URL:', fullUrl)
      return fullUrl
    },

    // THÊM: Xử lý lỗi load avatar (từ Sidebar)
    handleAvatarError(event) {
      console.error('❌ Header avatar load failed:', event.target.src)

      // Fallback to placeholder
      const img = event.target
      img.style.display = 'none'

      // Hiển thị placeholder
      const placeholder = img.nextElementSibling
      if (placeholder && placeholder.classList.contains('avatar-placeholder')) {
        placeholder.style.display = 'flex'
      }
    },
  },
  mounted() {
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside)
  },
}
</script>

<style scoped>
.project-header-modern {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f2f5;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

/* Left Section */
.header-left {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  flex: 1;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 10px;
  color: #5a6573;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.back-btn:hover {
  background: #f8f9fa;
  border-color: #1a365d;
  color: #1a365d;
}

.project-info {
  display: flex;
  flex: 1;
  align-items: center;
  flex-direction: column;
  gap: 12px;
}

.project-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1a365d;
  margin: 0;
  line-height: 1.2;
}

.project-status {
  display: flex;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.status-badge.active {
  background: #e6f4ee;
  color: #137a5a;
}

.status-badge.completed {
  background: #e6f4ee;
  color: #137a5a;
}

.status-badge.pending {
  background: #fff8e6;
  color: #b3870f;
}

.description-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toggle-description-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 12px;
  background: #f8f9fa;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  color: #5a6573;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.6rem;
  font-weight: 500;
  align-self: flex-start;
}

.toggle-description-btn:hover {
  background: #e9ecef;
  color: #1a365d;
}

.toggle-description-btn .icon {
  font-size: 18px;
}

.project-description {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e1e5e9;
}

.project-description p {
  margin: 0;
  color: #5a6573;
  line-height: 1.6;
  font-size: 0.875rem;
}

/* Right Section */
.header-right {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

/* Version Control */
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
  gap: 12px;
  padding: 10px 16px;
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none; /* Các trình duyệt hiện đại */
  -webkit-user-select: none; /* Safari */
  -moz-user-select: none; /* Firefox */
  -ms-user-select: none; /* Internet Explorer/Edge */
}

.selector-header:hover {
  border-color: #1a365d;
}

.selector-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #f0f4f8;
  border-radius: 8px;
  color: #1a365d;
}

.selector-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.selector-label {
  font-size: 0.75rem;
  color: #8a94a6;
  font-weight: 500;
}

.version-label {
  font-weight: 600;
  color: #1a365d;
  font-size: 0.875rem;
}

.dropdown-arrow {
  font-size: 18px;
  color: #8a94a6;
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
  margin-top: 8px;
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  z-index: 10;
  overflow: hidden;
}

.dropdown-header {
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e1e5e9;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a365d;
}

.version-list {
  max-height: 280px;
  overflow-y: auto;
}

.version-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  border-bottom: 1px solid #f0f2f5;
}

.version-option:last-child {
  border-bottom: none;
}

.version-option:hover,
.version-option.active {
  background: #f0f4f8;
}

.version-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #f0f4f8;
  border-radius: 8px;
  color: #1a365d;
}

.version-details {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.version-number {
  font-weight: 600;
  color: #1a365d;
  font-size: 0.875rem;
}

.version-date {
  font-size: 0.75rem;
  color: #8a94a6;
}

.version-status {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.version-status.completed {
  background: #e6f4ee;
  color: #137a5a;
}

.version-status.failed {
  background: #fde8e8;
  color: #c53030;
}

.version-status.processing {
  background: #fff8e6;
  color: #b3870f;
}

.retry-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #e53e3e;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  font-weight: 500;
  font-size: 0.875rem;
}

.retry-btn:hover:not(:disabled) {
  background: #c53030;
}

.retry-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
}

/* Progress Indicator */
.progress-indicator {
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 12px;
  padding: 16px;
  min-width: 280px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
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
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1a365d, #2c5282);
  border-radius: 4px;
  transition: width 0.5s ease-in-out;
}

.stage-description {
  font-size: 0.75rem;
  color: #8a94a6;
  font-style: italic;
}

/* Active Users Indicator */
.active-users-indicator {
  position: relative;
}

.active-users-trigger {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  color: #1a365d;
  user-select: none; /* Các trình duyệt hiện đại */
  -webkit-user-select: none; /* Safari */
  -moz-user-select: none; /* Firefox */
  -ms-user-select: none; /* Internet Explorer/Edge */
}

.active-users-trigger:hover {
  border-color: #1a365d;
  background: #f8f9fa;
}

.active-users-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #f0f4f8;
  border-radius: 8px;
  color: #1a365d;
}

.active-users-count {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.count {
  font-weight: 700;
  font-size: 1rem;
  line-height: 1;
}

.label {
  font-size: 0.75rem;
  color: #8a94a6;
  font-weight: 500;
}

.arrow {
  font-size: 18px;
  color: #8a94a6;
  transition: transform 0.3s ease;
}

.arrow.open {
  transform: rotate(180deg);
}

.active-users-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  z-index: 20;
  min-width: 280px;
  max-height: 320px;
  display: flex;
  flex-direction: column;
}

.active-users-list {
  padding: 8px;
  max-height: 250px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.active-user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 8px;
  transition: background-color 0.3s ease;
}

.active-user-item:hover {
  background: #f0f4f8;
}
.user-avatar {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}
.user-avatar img {
  width: 36px;
  height: 36px;
  max-width: 36px;
  max-height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #000;
}

.avatar-placeholder {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #1a365d;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 500;
  color: #1a365d;
  font-size: 0.875rem;
  line-height: 1.2;
}

.user-email {
  font-size: 0.75rem;
  color: #8a94a6;
  line-height: 1.2;
}

.online-status {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #38a169;
  flex-shrink: 0;
}

.no-active-users {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  color: #8a94a6;
}

.no-active-users .material-symbols-outlined {
  font-size: 48px;
  color: #cbd5e0;
}

.no-active-users p {
  margin: 0;
  font-size: 0.875rem;
}

.active-users-footer {
  padding: 12px 16px;
  border-top: 1px solid #e1e5e9;
  font-size: 0.75rem;
  color: #8a94a6;
  text-align: center;
  background: #f8f9fa;
}

/* Members Button */
.members-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 10px;
  color: #1a365d;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.members-btn:hover {
  background: #f8f9fa;
  border-color: #1a365d;
}

.members-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #f0f4f8;
  border-radius: 8px;
  color: #1a365d;
}

.members-count {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .header-content {
    flex-direction: column;
    gap: 20px;
  }

  .header-right {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .version-control,
  .progress-indicator,
  .active-users-indicator {
    flex: 1;
    min-width: auto;
  }
}

@media (max-width: 768px) {
  .project-header-modern {
    padding: 20px;
  }

  .header-left {
    flex-direction: column;
    gap: 16px;
  }

  .project-title-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .header-right {
    flex-direction: column;
    gap: 12px;
  }

  .version-control,
  .progress-indicator,
  .active-users-indicator {
    width: 100%;
  }

  .active-users-dropdown {
    right: auto;
    left: 0;
    width: 100%;
  }
}

/* Animation for dropdowns */
.dropdown-menu,
.active-users-dropdown {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>