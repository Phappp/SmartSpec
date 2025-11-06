<template>
  <div class="project-header-modern">
    <div class="header-content">
      <!-- Left Section -->
      <div class="header-left">
        <button class="back-btn" @click="goBack">
          <span class="material-symbols-outlined">arrow_back</span>
          <span
            class="btn-text"
            style="-webkit-user-select: none; -moz-user-select: none; -ms-user-select: none"
            >Back to Projects</span
          >
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

          <!-- <button
            v-if="hasFailedVersion && !isRetrying"
            class="retry-btn"
            @click="handleRetry"
            :disabled="isPolling"
          >
            <span class="material-symbols-outlined">refresh</span>
            <span class="btn-text">Retry Failed</span>
          </button> -->
        </div>

        <!-- Progress Indicator -->
        <!-- <div v-if="isRetrying" class="progress-indicator">
          <div class="progress-header">
            <span class="stage-name">{{ currentStage }}</span>
            <span class="progress-percentage">{{ processingProgress }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: processingProgress + '%' }"></div>
          </div>
          <div class="stage-description">{{ getStageDescription(currentStage) }}</div>
        </div> -->

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
              <div
                v-for="user in activeUsers"
                :key="user.userId"
                class="active-user-item"
                :class="{ 'current-user': user.userId === currentUserId }"
              >
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
                  <span class="user-name">
                    {{ user.userId === currentUserId ? 'You' : user.name }}
                  </span>
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
      return ownerCount + acceptedMembers - 1
    },
    currentUserId() {
      // CÁCH 1: Nếu dùng Vuex store
      // return this.$store.state.user?.id || this.$store.getters.userId

      // CÁCH 2: Nếu dùng localStorage (hiện tại)
      const userId = localStorage.getItem('userId')
      console.log('🔍 Current User ID from localStorage:', userId)
      return userId
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
      const userId = this.currentUserId // LẤY userId từ computed
      if (!userId) {
        console.error('❌ User ID not found for retry operation')
        return
      }

      this.$emit('retry-analysis', userId) // TRUYỀN userId lên component cha
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

    handleResize() {
      // Đóng dropdown khi resize để tránh vị trí không chính xác
      if (window.innerWidth < 768) {
        this.isOpen = false
        this.showActiveUsers = false
      }
    },

    // Tối ưu touch events cho mobile
    handleTouchStart(event) {
      // Ngăn chặn double tap zoom trên các interactive elements
      if (event.target.closest('.selector-header, .active-users-trigger, .version-option')) {
        event.preventDefault()
      }
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
    window.addEventListener('resize', this.handleResize)
    document.addEventListener('touchstart', this.handleTouchStart, { passive: false })
  },

  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside)
    window.removeEventListener('resize', this.handleResize)
    document.removeEventListener('touchstart', this.handleTouchStart)
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
  position: relative;
}

.active-user-item:hover {
  background: #f0f4f8;
}
/* Hiệu ứng live pulse cho online status */
.online-status {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #38a169;
  flex-shrink: 0;
  position: relative;
}

/* Hiệu ứng live pulse animation */
.online-status::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: #38a169;
  border-radius: 50%;
  animation: pulse 2s infinite;
  opacity: 0.6;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.5);
    opacity: 0.2;
  }
  100% {
    transform: scale(1);
    opacity: 0.6;
  }
}

/* Highlight user hiện tại */
.active-user-item.current-user {
  background: #f0f7ff;
  border: 1px solid #bee3f8;
}

.active-user-item.current-user .user-name {
  color: #2b6cb0;
  font-weight: 600;
}

.active-user-item.current-user .online-status {
  background: #3182ce;
}

.active-user-item.current-user .online-status::before {
  background: #3182ce;
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
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
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
    align-items: center;
    gap: 8px;
  }

  .header-right {
    flex-direction: row;
    gap: 12px;
  }

  .version-control,
  .progress-indicator,
  .active-users-indicator {
    width: 30%;
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
/* Thêm vào phần responsive hiện tại */

/* Tablet breakpoint */
@media (max-width: 1024px) {
  .header-content {
    flex-direction: column;
    gap: 20px;
  }

  .header-left {
    width: 100%;
  }

  .header-right {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
  }

  .version-control,
  .active-users-indicator,
  .members-btn {
    flex: 1;
    min-width: 200px;
  }

  .project-title {
    font-size: 1.5rem;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

/* Mobile breakpoint */
@media (max-width: 768px) {
  .project-header-modern {
    padding: 16px;
    border-radius: 12px;
  }

  .header-left {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .back-btn {
    align-self: flex-start;
    padding: 8px 12px;
  }

  .project-info {
    align-items: stretch;
  }

  .project-title-section {
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .project-title {
    font-size: 1.25rem;
    line-height: 1.3;
  }

  .header-right {
    flex-direction: column;
    gap: 8px;
  }

  .version-control,
  .active-users-indicator,
  .members-btn {
    width: 100%;
    min-width: auto;
  }

  /* Cải thiện dropdown trên mobile */
  .active-users-dropdown {
    right: 0;
    left: 0;
    width: 100%;
    max-height: 50vh;
  }

  .dropdown-menu {
    right: 0;
    left: 0;
    width: 100%;
  }

  /* Tối ưu text và icon trên mobile */
  .btn-text {
    font-size: 0.75rem;
  }

  .selector-content,
  .active-users-count,
  .members-count {
    font-size: 0.875rem;
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
}

/* Small mobile breakpoint */
@media (max-width: 480px) {
  .project-header-modern {
    padding: 12px;
    margin-bottom: 16px;
  }

  .header-content {
    gap: 16px;
  }
  .header-right {
    flex-direction: row;
    gap: 2px;
    justify-content: space-around;
  }
  .back-btn {
    padding: 6px 10px;
    font-size: 0.75rem;
  }

  .project-title {
    font-size: 1.125rem;
    position: absolute;
    top: 10px;
  }
  .header-left {
    position: relative;
  }
  .version-control,
  .progress-indicator,
  .active-users-indicator,
  .members-btn {
    max-width: calc(30% - 2px);
  }
  .material-symbols-outlined{
    font-size: 14px;
  }
  .selector-header {
    max-height: 50px;
  }
  .dropdown-arrow {
    display: none;
  }
  .arrow {
    display: none;
  }
  .toggle-description-btn {
    font-size: 0.7rem;
    padding: 4px 8px;
    position: absolute;
    top: 0px;
    right: 0px;
  }

  /* Ẩn text dài, chỉ hiện icon trên mobile nhỏ */
  .back-btn .btn-text,
  .toggle-description-btn .btn-text {
    display: none;
  }

  .back-btn,
  .toggle-description-btn {
    padding: 8px;
  }

  /* Tối ưu version selector */
  .selector-header {
    padding: 8px 12px;
  }

  .selector-label {
    font-size: 0.7rem;
  }

  .version-label {
    font-size: 0.8rem;
  }

  /* Tối ưu active users và members */
  .active-users-trigger,
  .members-btn {
    padding: 8px 12px;
  }

  .count {
    font-size: 0.9rem;
  }

  .label {
    font-size: 0.7rem;
  }
}

/* Xử lý text overflow cho tên dự án dài */
.project-title {
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}

/* Đảm bảo dropdown không bị tràn */
.dropdown-menu,
.active-users-dropdown {
  max-width: 100vw;
  box-sizing: border-box;
}

/* Touch-friendly improvements */
@media (hover: none) and (pointer: coarse) {
  .selector-header,
  .active-users-trigger,
  .members-btn,
  .back-btn,
  .toggle-description-btn {
    min-height: 44px; /* Kích thước touch tối thiểu */
  }

  .version-option,
  .active-user-item {
    min-height: 40px;
    padding: 12px 16px;
  }
}

/* Landscape mobile optimization */
@media (max-width: 768px) and (orientation: landscape) {
  .project-header-modern {
    padding: 12px;
  }
  .project-title-section {
    align-items: center;
  }
  .project-title {
    width: 100%;
    text-align: center;
  }
  .header-content {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .header-left {
    flex: 1;
    min-width: 60%;
  }

  .header-right {
    flex: 1;
    min-width: 35%;
  }

  .active-users-dropdown,
  .dropdown-menu {
    max-height: 40vh;
  }
}
</style>