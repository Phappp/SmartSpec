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
              />
              <select v-model="selectedRoleFilter" class="form-select role-filter-select">
                <option value="all">All Roles</option>
                <option value="owner">Owner</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <div class="card-actions">
              <button @click="openInviteModal" class="btn btn-primary">Invite</button>
              <!-- Ẩn nút Leave nếu là owner -->
              <button v-if="!isOwner" @click="handleLeaveProject" class="btn btn-danger">
                Leave
              </button>
            </div>
          </div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in filteredParticipants" :key="p.id">
                  <td>
                    {{ p.name }}<br /><small>{{ p.email }}</small>
                  </td>
                  <td>
                    <span class="role-badge">{{ p.role }}</span>
                  </td>
                  <td>{{ formatDate(p.date) }}</td>
                  <td>
                    <span :class="['status-badge', `status-${p.status}`]">{{ p.status }}</span>
                  </td>
                  <td>
                    <template v-if="isOwner">
                      <button
                        v-if="p.status === 'accepted' && p.id !== currentUser._id"
                        @click="confirmRemoveMember(p)"
                        class="btn-text-danger"
                      >
                        Remove
                      </button>
                      <button
                        v-else-if="p.status === 'pending'"
                        @click="confirmCancelInvitation(p)"
                        class="btn-text-danger"
                      >
                        Cancel
                      </button>
                      <span v-else class="text-muted">-</span>
                    </template>
                    <span v-else class="text-muted">-</span>
                  </td>
                </tr>
                <tr v-if="filteredParticipants.length === 0">
                  <td colspan="5" class="text-center">No members found matching your criteria.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-if="isInviteModalVisible" class="dialog-overlay">
        <div class="dialog-box fade-in">
          <div class="dialog-header"><h3>Invite Member</h3></div>
          <form @submit.prevent="handleInviteMemberSubmit" class="dialog-content">
            <div class="form-group">
              <label>Email</label>
              <input
                v-model="inviteForm.email"
                type="email"
                required
                class="form-input"
                :disabled="isInviteLoading"
              />
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
import { ref, reactive, computed, onMounted } from 'vue'
import axiosClient from '@/utils/axiosClient'

const props = defineProps({ projectId: { type: String, required: true } })
const emit = defineEmits(['close'])

const currentUser = ref({})
const participants = ref([])
const project = ref(null)

const searchQuery = ref('')
const selectedRoleFilter = ref('all')

const inviteForm = reactive({ email: '', role: 'editor' })
const isInviteModalVisible = ref(false)
const isInviteLoading = ref(false) // Thêm state loading cho invite

const isConfirmModalVisible = ref(false)
const confirmModalContent = reactive({
  title: '',
  message: '',
  onConfirm: () => {},
})

const toasts = ref([])
function addToast(message, type = 'info', duration = 4000) {
  const id = Date.now()
  toasts.value.unshift({ id, message, type, duration })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, duration)
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString()
}

const isOwner = computed(() => {
  if (!project.value || !currentUser.value?._id) return false
  const ownerId = project.value.owner_id?._id || project.value.owner_id
  return currentUser.value._id === ownerId
})

const userRole = computed(() => {
  if (isOwner.value) return 'owner'
  const found = participants.value.find(
    (p) => p.id === currentUser.value?._id && p.status === 'accepted'
  )
  return found?.role || 'viewer'
})

const filteredParticipants = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  const roleFilter = selectedRoleFilter.value

  return participants.value.filter((p) => {
    const matchesRole = roleFilter === 'all' || p.role.toLowerCase() === roleFilter
    const matchesSearch =
      p.name.toLowerCase().includes(query) || p.email?.toLowerCase().includes(query)
    return matchesRole && matchesSearch
  })
})

async function loadData() {
  try {
    const projectRes = await axiosClient.get(`/api/projects/${props.projectId}`)
    project.value = projectRes.data?.data?.project || null

    if (!project.value) {
      addToast('Project not found', 'error')
      return
    }

    const storedUserId = localStorage.getItem('userId')
    if (storedUserId) {
      currentUser.value = { _id: storedUserId }
    }

    let allParticipants = (project.value.members || []).map((m) => ({
      id: m.user_id?._id,
      name: m.user_id?.name || m.user_id?.email?.split('@')[0] || 'Invited User',
      email: m.user_id?.email,
      role: m.role,
      date: m.status === 'accepted' ? m.responded_at : m.invited_at,
      status: m.status,
    }))

    const ownerId = project.value.owner_id?._id || project.value.owner_id
    const ownerEmail = project.value.owner_id?.email
    const isOwnerInList = allParticipants.some((p) => p.id === ownerId)

    if (ownerId && !isOwnerInList && ownerEmail) {
      const owner = {
        id: ownerId,
        name: project.value.owner_id.name || ownerEmail.split('@')[0],
        email: ownerEmail,
        role: 'owner',
        date: project.value.created_at,
        status: 'accepted',
      }
      allParticipants.unshift(owner)
    }

    participants.value = allParticipants
  } catch (err) {
    console.error(err)
    addToast('Failed to load project data', 'error')
  }
}

async function handleInviteMemberSubmit() {
  if (!inviteForm.email) return addToast('Please enter an email', 'error')

  isInviteLoading.value = true // Bắt đầu loading

  try {
    const res = await axiosClient.post(
      `/api/projects/${props.projectId}/members/invite`,
      inviteForm
    )

    const newInvitation = {
      id: res.data.user_id?._id,
      name: res.data.user_id?.email?.split('@')[0] || 'Invited User',
      email: res.data.user_id?.email,
      role: res.data.role,
      status: 'pending',
      date: new Date().toISOString(),
    }
    participants.value.push(newInvitation)

    addToast('Invitation sent!', 'success')
    closeInviteModal()
  } catch (err) {
    const errorMessage = err.response?.data?.message || 'Failed to send invitation'
    addToast(errorMessage, 'error')
  } finally {
    isInviteLoading.value = false // Kết thúc loading
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

function confirmCancelInvitation(participant) {
  openConfirmModal(
    'Confirm Cancellation',
    `Are you sure you want to cancel the invitation for ${participant.email}?`,
    async () => {
      const userId = participant.id
      try {
        await axiosClient.delete(`/api/projects/${props.projectId}/members/${userId}/cancel`)
        participants.value = participants.value.filter((p) => p.id !== userId)
        addToast('Invitation cancelled', 'info')
      } catch {
        addToast('Failed to cancel invitation', 'error')
      }
    }
  )
}

function confirmRemoveMember(participant) {
  openConfirmModal(
    'Confirm Member Removal',
    `Are you sure you want to remove ${participant.name} from the project? This action cannot be undone.`,
    async () => {
      const userId = participant.id
      if (isOwner.value && userId === currentUser.value._id) {
        return addToast('Owner cannot remove themselves.', 'error')
      }

      try {
        await axiosClient.delete(`/api/projects/${props.projectId}/members/${userId}`)
        participants.value = participants.value.filter((p) => p.id !== userId)
        addToast('Member removed', 'success')
      } catch (err) {
        console.error(err)
        addToast('Failed to remove member', 'error')
      }
    }
  )
}

function handleLeaveProject() {
  if (isOwner.value) {
    return addToast('Owners must transfer ownership before leaving.', 'error')
  }

  openConfirmModal(
    'Confirm Leave Project',
    'Are you sure you want to leave this project? You will lose access unless invited back.',
    async () => {
      try {
        await axiosClient.post(`/api/projects/${props.projectId}/leave`)
        addToast('You left the project', 'info')
        emit('close')
      } catch (err) {
        console.error(err)
        addToast('Failed to leave project', 'error')
      }
    }
  )
}

function openInviteModal() {
  isInviteModalVisible.value = true
}

function closeInviteModal() {
  isInviteModalVisible.value = false
  inviteForm.email = ''
  inviteForm.role = 'editor'
  isInviteLoading.value = false // Reset loading state khi đóng modal
}

onMounted(loadData)
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

/* Thêm style cho loading spinner */
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
</style>

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
  margin: auto;
  background: var(--background-light);
  z-index: 50;
  display: flex;
  flex-direction: column;
  width: 80%;
  max-width: 1000px;
  max-height: 90vh;
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
  max-width: 80%;
}

/* Style cho một toast đơn lẻ */
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

/* Màu sắc dựa trên type */
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
}

/* Thanh tiến trình */
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

/* Hiệu ứng chuyển động cho danh sách toast */
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
@media (min-width: 1024px) {
  .modal-container {
    inset: 2.5rem;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-lg);
  }
}
.role-badge,
.text-muted {
  text-transform: capitalize;
}
/* ===== Header ===== */
.modal-header {
  background: var(--background-white);
  border-bottom: 1px solid var(--border-color);
  padding: 0 1.5rem;
  height: 4rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
}
.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-color-dark);
}
.card-header {
  flex-wrap: wrap;
  gap: 1rem;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
  flex-grow: 1;
  max-width: 400px;
}

.search-input {
  padding: 0.3rem 0.65rem;
  font-size: 0.9rem;
  flex: 2;
  border-radius: 19px;
}
.form-input {
  padding: 0.3rem 0.65rem;
  font-size: 0.9rem;
  flex: 2;
  border-radius: 19px;
}
.role-filter-select {
  padding: 0.3rem 0.65rem;
  font-size: 0.9rem;
  flex: 1;
}
.data-table tbody tr td:nth-child(2) {
  text-transform: capitalize;
}
.data-table tbody tr td:nth-child(4) {
  text-transform: capitalize;
}
.data-table tbody tr td button {
  text-transform: none !important;
}
.text-center {
  text-align: center;
  color: var(--text-muted-color);
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-left: auto;
}
.tab-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}

/* ===== Nội dung chính ===== */
.modal-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
}

/* ===== Tabs ===== */
.tab-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}
.tab-btn {
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-color-light);
  background: none;
  border: none;
  cursor: pointer;
  transition: 0.2s;
}
.tab-btn:hover {
  color: var(--text-color-medium);
}
.tab-btn.active {
  color: var(--primary-color);
  border-bottom: 2px solid var(--primary-color);
}

/* ===== Card ===== */
.content-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Chỉ phần bảng được cuộn */
.table-wrapper {
  flex: 1;
  overflow-y: auto;
  max-height: 55vh;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
}
.content-card:hover {
  box-shadow: var(--shadow-lg);
}
.card-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-color-dark);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th,
.data-table td {
  padding: 0.875rem 1rem;
  text-align: left;
}
.data-table thead {
  background: var(--background-light);
}
.data-table th {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-color-light);
  text-transform: uppercase;
}
.data-table tbody tr {
  border-bottom: 1px solid var(--border-color);
  transition: 0.2s;
}
.data-table tbody tr:hover {
  background: #f3f4f6;
}
.member-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 9999px;
  background: #e0e7ff;
  color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

/* ===== Nút ===== */
.btn {
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: 0.2s;
}
.btn-primary {
  background: var(--primary-color);
  color: #fff;
  margin-right: 0.5rem;
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
  margin-right: 0.3rem;
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
}

.btn-text-danger:hover {
  background: var(--danger-hover-color);
  transform: scale(1.05);
}
.table-wrapper::-webkit-scrollbar {
  width: 8px;
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
  font-size: 1.5rem;
  display: flex;
  place-items: center;
  transition: all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  align-items: center;
  flex-direction: row;
}
.btn-icon:hover {
  transform: scale(1.1);
  background: #dcdcdc;
  color: #be2727;
  border-color: #c0c0c0;
}

/* Hiệu ứng khi nhấn xuống */
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
}
.dialog-box {
  background: var(--background-white);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-lg);
  max-width: 28rem;
  width: 100%;
  overflow: hidden;
}
.dialog-header,
.dialog-actions {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}
.dialog-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-color-dark);
}
.dialog-content {
  padding: 1rem 1.5rem;
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

/* Kiểu cho input và select */
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

/* Hiệu ứng khi focus vào input/select */
.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
}
/* ===== Animation ===== */
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
.slide-up {
  animation: slideUp 0.25s ease-out;
}
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>