<template>
  <div class="modal-wrapper">
    <div class="modal-overlay" @click="$emit('close')"></div>

    <div class="modal-container">
      <header class="modal-header">
        <div class="toast-container-local">
          <transition-group name="toast-local" tag="div">
            <div
              v-for="toast in toasts"
              :key="toast.id"
              class="toast"
              :data-toast-type="toast.type"
            >
              <div class="toast-icon">
                <svg
                  v-if="toast.type === 'success'"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <svg
                  v-if="toast.type === 'error'"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <svg
                  v-if="toast.type === 'info'"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 16v-4m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p class="toast-message">{{ toast.message }}</p>
              <div
                class="toast-progress"
                :style="{ animationDuration: `${toast.duration}ms` }"
              ></div>
            </div>
          </transition-group>
        </div>

        <h1 class="modal-title">Project Sharing Management: {{ project?.name }}</h1>
        <div class="header-actions">
          <div class="user-role-display">
            Role: <span class="role-text" style="text-transform: capitalize">{{ userRole }}</span>
          </div>
          <button @click="$emit('close')" class="btn-icon">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </header>

      <div class="modal-content">
        <div class="content-card">
          <div class="card-header">
            <h2 class="card-title">Project Members & Invitations</h2>

            <div class="filter-controls">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search by name or email..."
                class="form-input search-input"
                @input="handleSearch"
              />
              <select
                v-model="selectedRoleFilter"
                class="form-select role-filter-select"
                @change="filterMembers"
              >
                <option value="all">All Roles</option>
                <option value="owner">Owner</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <div class="card-actions">
              <button @click="openInviteModal" class="btn btn-primary">Invite</button>
              <button v-if="!isOwner" @click="handleLeaveProject" class="btn btn-danger">
                Leave
              </button>
            </div>
          </div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="member in filteredMembers" :key="member.id">
                  <td class="user-cell">
                    <div class="user-info">
                      <div class="user-avatar">
                        <img
                          v-if="member.avatar_url && !member.avatarLoadError"
                          :src="getFullAvatarUrl(member.avatar_url)"
                          @error="(e) => handleAvatarError(e, member)"
                          alt="User Avatar"
                          class="avatar-img"
                        />
                        <div v-else class="avatar-placeholder">
                          {{ getUserInitials(member.name) }}
                        </div>
                      </div>
                      <div class="user-details">
                        <span class="user-name">{{ member.name }}</span>
                        <small class="user-email">{{ member.email }}</small>
                      </div>
                    </div>
                  </td>
                  <td class="role-cell">
                    <span class="role-badge">{{ member.role }}</span>
                  </td>
                  <td class="date-cell">{{ formatDate(member.date) }}</td>
                  <td class="status-cell">
                    <span :class="['status-badge', `status-${member.status}`]">{{
                      member.status
                    }}</span>
                  </td>
                  <td class="action-cell">
                    <template v-if="isOwner">
                      <button
                        v-if="member.status === 'accepted' && member.id !== currentUser._id"
                        @click="confirmRemoveMember(member)"
                        class="btn-text-danger"
                      >
                        Remove
                      </button>
                      <button
                        v-else-if="member.status === 'pending'"
                        @click="confirmCancelInvitation(member)"
                        class="btn-text-danger"
                      >
                        Cancel
                      </button>
                      <span v-else class="text-muted">-</span>
                    </template>
                    <span v-else class="text-muted">-</span>
                  </td>
                </tr>
                <tr v-if="filteredMembers.length === 0">
                  <td colspan="5" class="text-center">No members found matching your criteria.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Invite Modal -->
      <div v-if="isInviteModalVisible" class="dialog-overlay">
        <div class="dialog-box fade-in">
          <div class="dialog-header"><h3>Invite Member</h3></div>
          <form @submit.prevent="handleInviteMemberSubmit" class="dialog-content">
            <div class="form-group">
              <label>Email or Name</label>
              <div class="autocomplete-wrapper">
                <input
                  v-model="inviteForm.email"
                  type="text"
                  required
                  class="form-input"
                  :disabled="isInviteLoading"
                  placeholder="Enter email or name to search..."
                  @input="handleEmailInput"
                  @focus="showSuggestions = true"
                  @blur="onEmailInputBlur"
                />
                <!-- Loading indicator -->
                <div v-if="isSearchingUsers" class="autocomplete-loading">
                  <span class="loading-spinner-small"></span>
                </div>
                <!-- Suggestions dropdown -->
                <div
                  v-if="showSuggestions && userSuggestions.length > 0"
                  class="suggestions-dropdown"
                >
                  <div
                    v-for="user in userSuggestions"
                    :key="user._id"
                    class="suggestion-item"
                    @mousedown="selectSuggestion(user)"
                  >
                    <div class="suggestion-avatar">
                      <img
                        v-if="user.avatar_url && !user.avatarLoadError"
                        :src="getFullAvatarUrl(user.avatar_url)"
                        @error="(e) => handleSuggestionAvatarError(e, user)"
                        alt="User Avatar"
                        class="avatar-img"
                      />
                      <div v-else class="avatar-placeholder">
                        {{ getUserInitials(user.name || user.email) }}
                      </div>
                    </div>
                    <div class="suggestion-info">
                      <div class="suggestion-name">{{ user.name || 'No name' }}</div>
                      <div class="suggestion-email">{{ user.email }}</div>
                    </div>
                  </div>
                </div>
                <!-- No results message -->
                <div
                  v-if="
                    showSuggestions && userSuggestions.length === 0 && inviteForm.email.length >= 2
                  "
                  class="suggestions-dropdown no-results"
                >
                  <div class="suggestion-item no-results-item">
                    <span class="material-symbols-outlined">search_off</span>
                    No users found
                  </div>
                </div>
              </div>
              <small class="hint-text">Start typing to search for users by name or email</small>
            </div>
            <div class="form-group">
              <label>Role</label>
              <select v-model="inviteForm.role" class="form-select" :disabled="isInviteLoading">
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div class="dialog-actions">
              <button
                type="button"
                @click="closeInviteModal"
                class="btn btn-secondary"
                :disabled="isInviteLoading"
              >
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" :disabled="isInviteLoading">
                <span v-if="isInviteLoading" class="loading-spinner"></span>
                {{ isInviteLoading ? 'Sending...' : 'Send' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Confirm Modal -->
      <div v-if="isConfirmModalVisible" class="dialog-overlay">
        <div class="dialog-box fade-in">
          <div class="dialog-header">
            <h3 class="dialog-title">{{ confirmModalContent.title }}</h3>
          </div>
          <div class="dialog-content">
            <p>{{ confirmModalContent.message }}</p>
          </div>
          <div class="dialog-actions" style="justify-content: flex-end">
            <button type="button" @click="closeConfirmModal" class="btn btn-secondary">
              Cancel
            </button>
            <button type="button" @click="executeConfirm" class="btn btn-danger">Confirm</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import shareApi from '@/api/share'
import projectApi from '@/api/project'

const props = defineProps({ projectId: { type: String, required: true } })
const emit = defineEmits(['close'])

// State
const currentUser = ref({})
const members = ref([])
const project = ref(null)
const searchQuery = ref('')
const selectedRoleFilter = ref('all')
const isSearching = ref(false)

// Modal states
const isInviteModalVisible = ref(false)
const isInviteLoading = ref(false)
const isConfirmModalVisible = ref(false)
const confirmModalContent = reactive({
  title: '',
  message: '',
  onConfirm: () => {},
})

// Invite form and suggestions
const inviteForm = reactive({ email: '', role: 'editor' })
const userSuggestions = ref([])
const showSuggestions = ref(false)
const isSearchingUsers = ref(false)

const toasts = ref([])

// Computed
const isOwner = computed(() => {
  if (!project.value || !currentUser.value?._id) return false
  const ownerId = project.value.owner_id?._id || project.value.owner_id
  return currentUser.value._id === ownerId
})

const userRole = computed(() => {
  if (isOwner.value) return 'owner'
  const found = members.value.find(
    (m) => m.id === currentUser.value?._id && m.status === 'accepted'
  )
  return found?.role || 'viewer'
})

const filteredMembers = computed(() => {
  if (isSearching.value) return members.value

  const query = searchQuery.value.toLowerCase().trim()
  const roleFilter = selectedRoleFilter.value

  return members.value.filter((member) => {
    const matchesRole = roleFilter === 'all' || member.role.toLowerCase() === roleFilter
    const matchesSearch =
      member.name.toLowerCase().includes(query) || member.email?.toLowerCase().includes(query)
    return matchesRole && matchesSearch
  })
})

// Methods
function addToast(message, type = 'info', duration = 1000) {
  const id = Date.now()
  toasts.value.unshift({ id, message, type, duration })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, duration)
}

function getFullAvatarUrl(avatarUrl) {
  if (!avatarUrl) {
    return ''
  }

  if (avatarUrl.startsWith('http') || avatarUrl.startsWith('blob:')) {
    return avatarUrl
  }

  const cleanUrl = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`
  const baseUrl = 'http://localhost:8000'
  const fullUrl = `${baseUrl}${cleanUrl}`

  return fullUrl
}

function handleAvatarError(event, member) {
  console.error('❌ Avatar load failed:', event.target.src)
  member.avatarLoadError = true
  const img = event.target
  img.style.display = 'none'
}

function handleSuggestionAvatarError(event, user) {
  console.error('❌ Suggestion avatar load failed:', event.target.src)
  user.avatarLoadError = true
  const img = event.target
  img.style.display = 'none'
}

function getUserInitials(name) {
  if (!name) return '?'
  const names = name.split(' ')
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString()
}

async function loadData() {
  try {
    // Load project details
    const projectRes = await projectApi.getProjectDetail(props.projectId)
    project.value = projectRes.data?.data?.project || null

    if (!project.value) {
      addToast('Project not found', 'error')
      return
    }

    // Load current user
    const storedUserId = localStorage.getItem('userId')
    if (storedUserId) {
      currentUser.value = { _id: storedUserId }
    }

    // Load project invites
    await loadProjectInvites()
  } catch (err) {
    console.error('Error loading project data:', err)
    addToast('Failed to load project data', 'error')
  }
}

async function loadProjectInvites() {
  try {
    const invitesRes = await shareApi.getProjectInvites(props.projectId)
    const invites = invitesRes.data?.data || []

    // Transform invites data
    const inviteMembers = invites.map((invite) => ({
      id: invite.invitee._id,
      name: invite.invitee.name || invite.invitee.email?.split('@')[0] || 'Invited User',
      email: invite.invitee.email,
      avatar_url: invite.invitee.avatar_url,
      role: invite.role,
      status: invite.status,
      date: invite.created_at,
      type: 'invite',
      avatarLoadError: false,
    }))

    // Get project members from project data
    const projectMembers = (project.value.members || [])
      .filter((m) => m.status === 'accepted')
      .map((m) => ({
        id: m.user_id?._id,
        name: m.user_id?.name || m.user_id?.email?.split('@')[0] || 'Member',
        email: m.user_id?.email,
        avatar_url: m.user_id?.avatar_url,
        role: m.role,
        status: m.status,
        date: m.responded_at,
        type: 'member',
        avatarLoadError: false,
      }))

    // Add owner if not in list
    const ownerId = project.value.owner_id?._id || project.value.owner_id
    const ownerEmail = project.value.owner_id?.email
    const isOwnerInList = [...inviteMembers, ...projectMembers].some((m) => m.id === ownerId)

    if (ownerId && !isOwnerInList && ownerEmail) {
      const owner = {
        id: ownerId,
        name: project.value.owner_id.name || ownerEmail.split('@')[0],
        email: ownerEmail,
        avatar_url: project.value.owner_id.avatar_url,
        role: 'owner',
        status: 'accepted',
        date: project.value.created_at,
        type: 'owner',
        avatarLoadError: false,
      }
      members.value = [owner, ...projectMembers, ...inviteMembers]
    } else {
      members.value = [...projectMembers, ...inviteMembers]
    }
  } catch (err) {
    console.error('Error loading project invites:', err)
    addToast('Failed to load project members', 'error')
  }
}

async function handleSearch() {
  if (searchQuery.value.trim().length > 2) {
    isSearching.value = true
    try {
      const searchRes = await shareApi.searchMembers(props.projectId, searchQuery.value.trim())
      members.value = searchRes.data?.data || []
    } catch (err) {
      console.error('Error searching members:', err)
      addToast('Failed to search members', 'error')
    }
  } else {
    isSearching.value = false
    await loadProjectInvites()
  }
}

// User search and suggestions
let searchUsersTimeout
async function handleEmailInput() {
  showSuggestions.value = true
  clearTimeout(searchUsersTimeout)

  if (inviteForm.email.length < 2) {
    userSuggestions.value = []
    return
  }

  isSearchingUsers.value = true
  searchUsersTimeout = setTimeout(async () => {
    try {
      const searchRes = await shareApi.searchUsers(inviteForm.email.trim())
      userSuggestions.value = (searchRes.data?.data || []).map(user => ({
        ...user,
        avatarLoadError: false
      }))
    } catch (err) {
      console.error('Error searching users:', err)
      userSuggestions.value = []

      if (err.response?.status !== 400) {
        addToast('Failed to search users', 'error')
      }
    } finally {
      isSearchingUsers.value = false
    }
  }, 300)
}

function selectSuggestion(user) {
  inviteForm.email = user.email
  showSuggestions.value = false
}

function onEmailInputBlur() {
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}

function filterMembers() {
  // Filter is handled in computed property
}

async function handleInviteMemberSubmit() {
  if (!inviteForm.email) {
    addToast('Please enter an email', 'error')
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(inviteForm.email)) {
    addToast('Please enter a valid email address', 'error')
    return
  }

  isInviteLoading.value = true

  try {
    await shareApi.inviteMember(props.projectId, inviteForm.email, inviteForm.role)

    addToast('Invitation sent successfully!', 'success')
    closeInviteModal()
    await loadProjectInvites()
  } catch (err) {
    const errorMessage = err.response?.data?.message || 'Failed to send invitation'
    addToast(errorMessage, 'error')
  } finally {
    isInviteLoading.value = false
  }
}

function openConfirmModal(title, message, onConfirmAction) {
  confirmModalContent.title = title
  confirmModalContent.message = message
  confirmModalContent.onConfirm = onConfirmAction
  isConfirmModalVisible.value = true
}

function closeConfirmModal() {
  isConfirmModalVisible.value = false
  confirmModalContent.title = ''
  confirmModalContent.message = ''
  confirmModalContent.onConfirm = () => {}
}

function executeConfirm() {
  if (typeof confirmModalContent.onConfirm === 'function') {
    confirmModalContent.onConfirm()
  }
  closeConfirmModal()
}

function confirmCancelInvitation(member) {
  openConfirmModal(
    'Confirm Cancellation',
    `Are you sure you want to cancel the invitation for ${member.email}?`,
    async () => {
      try {
        await shareApi.cancelInvite(props.projectId, member.id)
        members.value = members.value.filter((m) => m.id !== member.id)
        addToast('Invitation cancelled successfully', 'info')
      } catch (err) {
        console.error('Error cancelling invitation:', err)
        addToast('Failed to cancel invitation', 'error')
      }
    }
  )
}

function confirmRemoveMember(member) {
  openConfirmModal(
    'Confirm Member Removal',
    `Are you sure you want to remove ${member.name} from the project? This action cannot be undone.`,
    async () => {
      if (isOwner.value && member.id === currentUser.value._id) {
        addToast('Owner cannot remove themselves.', 'error')
        return
      }

      try {
        await shareApi.removeMember(props.projectId, member.id)
        members.value = members.value.filter((m) => m.id !== member.id)
        addToast('Member removed successfully', 'success')
      } catch (err) {
        console.error('Error removing member:', err)
        addToast('Failed to remove member', 'error')
      }
    }
  )
}

function handleLeaveProject() {
  if (isOwner.value) {
    addToast('Owners must transfer ownership before leaving.', 'error')
    return
  }

  openConfirmModal(
    'Confirm Leave Project',
    'Are you sure you want to leave this project? You will lose access unless invited back.',
    async () => {
      try {
        await shareApi.leaveProject(props.projectId)
        addToast('You have left the project', 'info')
        emit('close')
      } catch (err) {
        console.error('Error leaving project:', err)
        addToast('Failed to leave project', 'error')
      }
    }
  )
}

function openInviteModal() {
  isInviteModalVisible.value = true
  inviteForm.email = ''
  inviteForm.role = 'editor'
  userSuggestions.value = []
  showSuggestions.value = false
}

function closeInviteModal() {
  isInviteModalVisible.value = false
  inviteForm.email = ''
  inviteForm.role = 'editor'
  isInviteLoading.value = false
  userSuggestions.value = []
  showSuggestions.value = false
}

// Lifecycle
onMounted(loadData)

// Watch for search query changes with debounce
let searchTimeout
watch(searchQuery, (newValue) => {
  clearTimeout(searchTimeout)
  if (newValue.trim().length > 2) {
    searchTimeout = setTimeout(() => {
      handleSearch()
    }, 500)
  } else if (newValue.trim() === '') {
    isSearching.value = false
    loadProjectInvites()
  }
})
</script>

<style scoped>
.status-badge {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
}
.status-accepted {
  background-color: #d1fae5;
  color: #065f46;
}
.status-pending {
  background-color: #feefc3;
  color: #92400e;
}

.loading-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

.loading-spinner-small {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid transparent;
  border-top: 2px solid #6b7280;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.role-badge,
.text-muted {
  text-transform: capitalize;
}

.data-table tbody tr td:nth-child(2),
.data-table tbody tr td:nth-child(4) {
  text-transform: capitalize;
}

.data-table tbody tr td button {
  text-transform: none !important;
}

.text-center {
  text-align: center;
  color: var(--text-muted-color);
  padding: 2rem;
}

/* Avatar Styles */
.user-avatar {
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  background-color: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  overflow: hidden;
  margin-right: 12px;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 12px;
  font-weight: 600;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.user-name {
  font-weight: 500;
  color: var(--text-color-dark);
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-email {
  font-size: 0.8rem;
  color: var(--text-color-light);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Autocomplete Styles */
.autocomplete-wrapper {
  position: relative;
}

.autocomplete-loading {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 4px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f3f4f6;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background-color: #f9fafb;
}

.suggestion-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  /* background: #4f46e5; */
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  margin-right: 12px;
  flex-shrink: 0;
  overflow: hidden;
}

.suggestion-info {
  flex: 1;
  min-width: 0;
}

.suggestion-name {
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 2px;
  font-size: 14px;
}

.suggestion-email {
  font-size: 12px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-results-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  justify-content: center;
  padding: 16px;
}

.no-results-item .material-symbols-outlined {
  font-size: 18px;
}

.hint-text {
  color: #6b7280;
  font-size: 0.75rem;
  margin-top: 4px;
  display: block;
}
</style>

<!-- Keep the existing global styles below (they remain unchanged) -->
<style>
/* ===== Biến CSS Global ===== */
:root {
  --primary-color: #4f46e5;
  --primary-hover-color: #4338ca;
  --danger-color: #dc2626;
  --danger-hover-color: #b91c1c;
  --text-color-dark: #111827;
  --text-color-medium: #374151;
  --text-color-light: #6b7280;
  --text-muted-color: #9ca3af;
  --border-color: #e5e7eb;
  --background-light: #f9fafb;
  --background-white: #ffffff;
  --font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial,
    sans-serif;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-lg: 0 10px 20px -5px rgb(0 0 0 / 0.1);
  --border-radius: 0.75rem;
}

/* Reset cơ bản */
* {
  box-sizing: border-box;
  font-family: var(--font-family-sans);
  margin: 0;
  padding: 0;
}

/* ===== Modal Overlay & Container ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  z-index: 40;
}
.modal-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--background-light);
  z-index: 50;
  display: flex;
  flex-direction: column;
  width: 95%;
  max-width: 1000px;
  max-height: 95vh;
  min-height: 400px;
  min-width: 300px;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.toast-container-local {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 100;
  width: 320px;
  max-width: calc(100% - 2rem);
}

.toast {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-left: 5px solid;
  margin-bottom: 1rem;
  position: relative;
  overflow: hidden;
  color: #374151;
  font-weight: 500;
}

.toast[data-toast-type='success'] {
  border-color: #22c55e;
}
.toast[data-toast-type='error'] {
  border-color: #ef4444;
}
.toast[data-toast-type='info'] {
  border-color: #3b82f6;
}

.toast-icon {
  flex-shrink: 0;
  margin-right: 0.75rem;
  width: 1.5rem;
  height: 1.5rem;
}
.toast[data-toast-type='success'] .toast-icon {
  color: #22c55e;
}
.toast[data-toast-type='error'] .toast-icon {
  color: #ef4444;
}
.toast[data-toast-type='info'] .toast-icon {
  color: #3b82f6;
}

.toast-message {
  margin: 0;
  font-size: 0.9rem;
  word-break: break-word;
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.1);
  animation-name: progress-local;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

.toast-local-enter-active,
.toast-local-leave-active {
  transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
}

.toast-local-enter-from,
.toast-local-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-local-move {
  transition: transform 0.3s ease;
}

/* ===== Header ===== */
.modal-header {
  background: var(--background-white);
  border-bottom: 1px solid var(--border-color);
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  position: sticky;
  top: 0;
  z-index: 10;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-color-dark);
  line-height: 1.3;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-grow: 1;
  max-width: 400px;
  min-width: 250px;
}

.search-input {
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  flex: 2;
  border-radius: 6px;
  min-width: 150px;
}

.form-input {
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  border-radius: 6px;
  width: 100%;
}

.role-filter-select {
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  flex: 1;
  min-width: 120px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.user-role-display {
  font-size: 0.9rem;
  color: var(--text-color-medium);
  white-space: nowrap;
}

/* ===== Nội dung chính ===== */
.modal-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
}

.content-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--background-white);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-sm);
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-color-dark);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.table-wrapper {
  flex: 1;
  overflow-y: auto;
  max-height: 60vh;
  height: 60vh;
  min-height: 60vh;
  border-top: 1px solid var(--border-color);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}

.data-table th,
.data-table td {
  padding: 0.875rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.data-table thead {
  background: var(--background-light);
  position: sticky;
  top: 0;
  z-index: 5;
}

.data-table th {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-color-light);
  text-transform: uppercase;
  white-space: nowrap;
}

.data-table tbody tr {
  transition: 0.2s;
}

.data-table tbody tr:hover {
  background: #f3f4f6;
}

.user-cell {
  min-width: 200px;
}

.role-cell,
.status-cell,
.date-cell {
  white-space: nowrap;
}

.action-cell {
  white-space: nowrap;
  text-align: center;
}

/* ===== Nút ===== */
.btn {
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: 0.2s;
  font-size: 0.875rem;
  white-space: nowrap;
}

.btn-primary {
  background: var(--primary-color);
  color: #fff;
}

.btn-primary:hover {
  background: var(--primary-hover-color);
}

.btn-danger {
  background: var(--danger-color);
  color: #fff;
}

.btn-danger:hover {
  background: var(--danger-hover-color);
}

.btn-secondary {
  background: var(--background-light);
  border: 1px solid var(--border-color);
  color: var(--text-color-medium);
}

.btn-secondary:hover {
  background: #f3f4f6;
}

.btn-text-danger {
  background: var(--danger-color);
  color: #fff;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-text-danger:hover {
  background: var(--danger-hover-color);
}

.table-wrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.table-wrapper::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 8px;
}

.table-wrapper::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.btn-icon {
  background: #efefef;
  border: 1px solid rgb(198, 198, 198);
  padding: 0.5rem;
  border-radius: 10px;
  cursor: pointer;
  color: #060606;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
}

.btn-icon:hover {
  transform: scale(1.1);
  background: #dcdcdc;
  color: #be2727;
  border-color: #c0c0c0;
}

.btn-icon:active {
  transform: scale(0.95);
  transition-duration: 0.1s;
}

/* ===== Dialog ===== */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
  padding: 1rem;
}

.dialog-box {
  background: var(--background-white);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-lg);
  max-width: 28rem;
  width: 100%;
  min-width: 280px;
  overflow: hidden;
}

.dialog-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.dialog-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-color-dark);
}

.dialog-content {
  padding: 1rem 1.25rem;
}

.dialog-actions {
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group:last-of-type {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color-medium);
  margin-bottom: 0.5rem;
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 1rem;
  color: var(--text-color-dark);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
}

.fade-in {
  animation: fadeIn 0.25s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ===== Responsive Breakpoints ===== */
@media (max-width: 768px) {
  .modal-container {
    width: 98%;
    max-height: 98vh;
    border-radius: 12px;
  }

  .modal-header {
    padding: 0.875rem 1rem;
    gap: 0.75rem;
  }

  .modal-title {
    font-size: 1.1rem;
    flex: 1;
    min-width: 0;
  }

  .header-actions {
    gap: 0.5rem;
  }

  .user-role-display {
    font-size: 0.8rem;
  }

  .modal-content {
    padding: 1rem;
  }

  .card-header {
    padding: 0.875rem 1rem;
    gap: 0.75rem;
  }

  .card-title {
    font-size: 1rem;
  }

  .filter-controls {
    order: 3;
    max-width: 100%;
    min-width: 100%;
    margin-top: 0.5rem;
  }

  .card-actions {
    margin-left: auto;
  }

  .table-wrapper {
    max-height: 45vh;
  }

  .data-table th,
  .data-table td {
    padding: 0.75rem 0.5rem;
    font-size: 0.875rem;
  }

  .toast-container-local {
    width: 280px;
    right: 0.5rem;
    top: 0.5rem;
  }

  .toast {
    padding: 0.625rem 0.875rem;
  }

  .toast-message {
    font-size: 0.85rem;
  }
}

@media (max-width: 640px) {
  .modal-container {
    width: 100%;
    height: 100%;
    max-height: 100vh;
    border-radius: 0;
    top: 0;
    left: 0;
    transform: none;
  }

  .modal-header {
    flex-direction: column;
    align-items: flex-start;
    height: auto;
    padding: 1rem;
  }

  .modal-title {
    width: 100%;
    margin-bottom: 0.5rem;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .card-actions {
    width: 100%;
    justify-content: space-between;
    margin-top: 0.5rem;
  }

  .btn {
    flex: 1;
    text-align: center;
    margin: 0 0.25rem;
  }

  .table-wrapper {
    max-height: 40vh;
    border: none;
  }

  .data-table {
    min-width: 100%;
  }

  .data-table th,
  .data-table td {
    padding: 0.5rem 0.375rem;
    font-size: 0.8rem;
  }

  .user-name {
    font-size: 0.875rem;
  }

  .user-email {
    font-size: 0.75rem;
  }

  .dialog-overlay {
    padding: 0.5rem;
  }

  .dialog-box {
    max-width: 100%;
    margin: 0.5rem;
  }

  .dialog-actions {
    flex-direction: column;
  }

  .dialog-actions .btn {
    width: 100%;
    margin: 0.25rem 0;
  }
}

@media (max-width: 480px) {
  .modal-content {
    padding: 0.75rem;
  }

  .data-table th,
  .data-table td {
    padding: 0.375rem 0.25rem;
    font-size: 0.75rem;
  }

  .btn {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
  }

  .btn-text-danger {
    padding: 0.3rem 0.6rem;
    font-size: 0.8rem;
  }

  .role-badge,
  .status-badge {
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
  }

  .toast-container-local {
    width: 250px;
  }

  .toast {
    padding: 0.5rem 0.75rem;
  }

  .toast-message {
    font-size: 0.8rem;
  }
}

@media (max-width: 360px) {
  .modal-header {
    padding: 0.75rem;
  }

  .modal-title {
    font-size: 1rem;
  }

  .card-header {
    padding: 0.75rem;
  }

  .card-title {
    font-size: 0.9rem;
  }

  .search-input,
  .role-filter-select {
    min-width: 120px;
    font-size: 0.8rem;
    padding: 0.375rem 0.5rem;
  }

  .data-table {
    font-size: 0.7rem;
  }

  .user-name {
    font-size: 0.8rem;
  }

  .user-email {
    font-size: 0.7rem;
  }
}

@media (max-width: 620px) {
  .table-wrapper {
    position: relative;
  }

  .table-wrapper::after {
    content: '← Scroll →';
    position: absolute;
    top: 50%;
    right: 10px;
    transform: translateY(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.7rem;
    opacity: 0.7;
    pointer-events: none;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.7;
    }
    50% {
      opacity: 0.4;
    }
  }
}
</style>