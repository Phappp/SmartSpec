<template>
  <div class="modal-overlay" @click="close">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>Project Invitations</h2>
        <button class="close-btn" @click="close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <!-- Search Bar -->
        <div class="search-container">
          <div class="search-input-wrapper">
            <span class="material-symbols-outlined search-icon">search</span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by project name or inviter..."
              class="search-input"
              @input="handleSearch"
            />
            <button v-if="searchQuery" class="clear-search-btn" @click="clearSearch">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button
            class="tab-button"
            :class="{ active: activeTab === 'received' }"
            @click="activeTab = 'received'"
          >
            Received ({{ filteredReceivedInvitations.length }})
          </button>
          <button
            class="tab-button"
            :class="{ active: activeTab === 'sent' }"
            @click="activeTab = 'sent'"
          >
            Sent ({{ filteredSentInvitations.length }})
          </button>
        </div>

        <!-- Received Invitations -->
        <div v-if="activeTab === 'received'" class="invitations-section">
          <div v-if="filteredReceivedInvitations.length > 0" class="invitations-list">
            <div
              v-for="inv in filteredReceivedInvitations"
              :key="inv.invite_id"
              class="invitation-item"
            >
              <div class="invitation-avatar">
                <img
                  v-if="inv.inviter?.avatar_url && !inv.avatarLoadError"
                  :src="getFullAvatarUrl(inv.inviter.avatar_url)"
                  @error="(e) => handleAvatarError(e, inv)"
                  alt="Inviter Avatar"
                  class="avatar-img"
                />
                <div v-else class="avatar-placeholder">
                  {{ getUserInitials(inv.inviter?.name) }}
                </div>
              </div>
              <div class="invitation-info">
                <h4>Project: {{ inv.projectName }}</h4>
                <div class="inviter-info">
                  <strong>{{ inv.inviter?.name }}</strong> invited you as
                  <span class="role-badge">{{ inv.role }}</span>
                </div>
                <small>Received: {{ formatDate(inv.created_at) }}</small>
              </div>
              <div class="invitation-actions">
                <button
                  class="btn btn-accept"
                  @click="$emit('accept-invite', inv)"
                  :disabled="isProcessing"
                >
                  Accept
                </button>
                <button
                  class="btn btn-reject"
                  @click="$emit('reject-invite', inv)"
                  :disabled="isProcessing"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <span v-if="searchQuery" class="material-symbols-outlined">search_off</span>
            <span v-else class="material-symbols-outlined">inbox</span>
            <p>
              {{
                searchQuery ? 'No invitations found matching your search' : 'No pending invitations'
              }}
            </p>
            <button v-if="searchQuery" class="btn btn-secondary" @click="clearSearch">
              Clear Search
            </button>
          </div>
        </div>

        <!-- Sent Invitations -->
        <div v-if="activeTab === 'sent'" class="invitations-section">
          <div v-if="filteredSentInvitations.length > 0" class="invitations-list">
            <div
              v-for="inv in filteredSentInvitations"
              :key="inv.invite_id"
              class="invitation-item"
            >
              <div class="invitation-avatar">
                <img
                  v-if="inv.invitee?.avatar_url && !inv.avatarLoadError"
                  :src="getFullAvatarUrl(inv.invitee.avatar_url)"
                  @error="(e) => handleAvatarError(e, inv)"
                  alt="Invitee Avatar"
                  class="avatar-img"
                />
                <div v-else class="avatar-placeholder">
                  {{ getUserInitials(inv.invitee?.name || inv.invitee?.email) }}
                </div>
              </div>
              <div class="invitation-info">
                <h4>Project: {{ inv.projectName }}</h4>
                <div class="invitee-info">
                  Invited <strong>{{ inv.invitee?.name || inv.invitee?.email }}</strong> as
                  <span class="role-badge">{{ inv.role }}</span>
                </div>
                <small>Sent: {{ formatDate(inv.created_at) }}</small>
                <small>Status: <span class="status-pending">Pending</span></small>
              </div>
              <div class="invitation-actions">
                <button
                  class="btn btn-cancel"
                  @click="$emit('cancel-invite', inv)"
                  :disabled="isProcessing"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <span v-if="searchQuery" class="material-symbols-outlined">search_off</span>
            <span v-else class="material-symbols-outlined">send</span>
            <p>
              {{
                searchQuery
                  ? 'No sent invitations found matching your search'
                  : 'No sent invitations'
              }}
            </p>
            <button v-if="searchQuery" class="btn btn-secondary" @click="clearSearch">
              Clear Search
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InvitationsModal',
  props: {
    sentInvitations: {
      type: Array,
      default: () => [],
    },
    receivedInvitations: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      activeTab: 'received',
      isProcessing: false,
      searchQuery: '',
    }
  },
  computed: {
    formattedReceivedInvitations() {
      return (this.receivedInvitations || []).map((inv) => {
        console.log('Processing received invite:', inv)

        // Xử lý trường hợp có inviter object hoặc chỉ có invitedBy string
        let inviterObj = inv.inviter
        if (!inviterObj && inv.invitedBy) {
          inviterObj = {
            name: inv.invitedBy,
            avatar_url: null,
          }
        }

        return {
          ...inv,
          projectName: inv.projectName || `Project ${inv.project_id}`,
          inviter: inviterObj || {
            name: 'Unknown User',
            avatar_url: null,
          },
        }
      })
    },

    filteredReceivedInvitations() {
      const invitations = this.formattedReceivedInvitations
      if (!this.searchQuery.trim()) {
        return invitations
      }

      const query = this.searchQuery.toLowerCase().trim()
      return invitations.filter(
        (inv) =>
          inv.projectName?.toLowerCase().includes(query) ||
          inv.inviter?.name?.toLowerCase().includes(query) ||
          inv.role?.toLowerCase().includes(query)
      )
    },

    filteredSentInvitations() {
      if (!this.searchQuery.trim()) {
        return this.sentInvitations
      }

      const query = this.searchQuery.toLowerCase().trim()
      return this.sentInvitations.filter(
        (inv) =>
          inv.projectName?.toLowerCase().includes(query) ||
          inv.invitee?.name?.toLowerCase().includes(query) ||
          inv.invitee?.email?.toLowerCase().includes(query) ||
          inv.role?.toLowerCase().includes(query)
      )
    },
  },
  mounted() {
    console.log(
      '📥 Raw received invitations:',
      JSON.parse(JSON.stringify(this.receivedInvitations))
    )
    console.log('📤 Raw sent invitations:', JSON.parse(JSON.stringify(this.sentInvitations)))
  },
  methods: {
    close() {
      this.$emit('close')
    },

    getFullAvatarUrl(avatarUrl) {
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
    },

    handleAvatarError(event, invitation) {
      console.error('❌ Avatar load failed:', event.target.src)
      invitation.avatarLoadError = true
      const img = event.target
      img.style.display = 'none'
    },

    getUserInitials(name) {
      if (!name) return '?'
      const names = name.split(' ')
      if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    },

    formatDate(dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    },

    handleSearch() {
      // Search is handled reactively through computed properties
    },

    clearSearch() {
      this.searchQuery = ''
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
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
  box-sizing: border-box;
  overflow-x: hidden;
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
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  border: none;
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
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

.modal-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
  background-size: 200% 100%;
  animation: shimmer 3s linear infinite;
  z-index: 1;
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
  align-items: center;
  padding: 24px 28px;
  border-bottom: 2px solid rgba(229, 231, 235, 0.3);
  flex-shrink: 0;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  position: relative;
  overflow: visible;
}

.modal-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
  background-size: 200% 100%;
  animation: shimmer 3s linear infinite;
}

@keyframes shimmerHeader {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #1f2937;
  font-weight: 700;
  letter-spacing: -0.02em;
  position: relative;
  z-index: 1;
}

.close-btn {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  color: #6b7280;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 10;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #374151;
  transform: scale(1.05);
  border-color: #d1d5db;
}

.close-btn:active {
  transform: scale(0.95);
}

.modal-body {
  padding: 0;
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  background: #f7fafc;
}

/* Search Styles */
.search-container {
  padding: 20px 24px 0;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
  background: white;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #718096;
  font-size: 20px;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 40px 12px 40px;
  border: 1px solid #cbd5e0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s;
  background: #f7fafc;
  color: #2d3748;
}

.search-input:focus {
  outline: none;
  border-color: #1a365d;
  background: white;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

.search-input::placeholder {
  color: #a0aec0;
}

.clear-search-btn {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  color: #718096;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.clear-search-btn:hover {
  color: #1a365d;
  background: #edf2f7;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  padding: 0 24px;
  flex-shrink: 0;
  background: white;
}

.tab-button {
  background: none;
  border: none;
  padding: 16px 20px;
  cursor: pointer;
  font-weight: 500;
  color: #718096;
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
  white-space: nowrap;
  flex: 1;
  text-align: center;
  font-size: 0.95rem;
}

.tab-button.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: linear-gradient(to bottom, #f7fafc, white);
}

.tab-button:hover:not(.active) {
  color: #667eea;
  background: #f7fafc;
}

.invitations-section {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
  background: #f7fafc;
}

.invitations-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.invitation-item {
  display: flex;
  align-items: flex-start;
  padding: 20px;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  gap: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(26, 54, 93, 0.12);
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.invitation-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
  transition: width 0.3s ease;
}

.invitation-item:hover::before {
  width: 4px;
}

.invitation-item:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-4px) scale(1.01);
  border-color: #667eea;
}

.invitation-avatar {
  width: 48px;
  height: 48px;
  min-width: 48px;
  min-height: 48px;
  border-radius: 50%;
  border: 2px solid #e2e8f0;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  overflow: hidden;
  flex-shrink: 0;
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
  font-size: 14px;
  font-weight: 600;
}

.invitation-info {
  flex: 1;
  min-width: 0;
}

.invitation-info h4 {
  margin: 0 0 8px 0;
  color: #374151;
  font-size: 1.1rem;
  font-weight: 600;
  word-break: break-word;
}

.inviter-info,
.invitee-info {
  margin: 0 0 12px 0;
  color: #4a5568;
  word-break: break-word;
  line-height: 1.5;
}

.invitation-info small {
  color: #718096;
  display: block;
  margin-bottom: 4px;
  font-size: 0.875rem;
}

.role-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  margin-left: 4px;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
}

.status-pending {
  color: #d69e2e;
  font-weight: 600;
  background: #fefcbf;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
}

.invitation-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: flex-start;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.3s;
  min-width: 80px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.btn-accept {
  background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
  color: white;
  box-shadow: 0 2px 4px rgba(56, 161, 105, 0.3);
}

.btn-accept:hover:not(:disabled) {
  background: linear-gradient(135deg, #2f855a 0%, #276749 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(56, 161, 105, 0.4);
}

.btn-reject {
  background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
  color: white;
  box-shadow: 0 2px 4px rgba(229, 62, 62, 0.3);
}

.btn-reject:hover:not(:disabled) {
  background: linear-gradient(135deg, #c53030 0%, #9b2c2c 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(229, 62, 62, 0.4);
}

.btn-cancel {
  background: linear-gradient(135deg, #718096 0%, #4a5568 100%);
  color: white;
  box-shadow: 0 2px 4px rgba(113, 128, 150, 0.3);
}

.btn-cancel:hover:not(:disabled) {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(113, 128, 150, 0.4);
}

.btn-secondary {
  background: linear-gradient(135deg, #718096 0%, #4a5568 100%);
  color: white;
  margin-top: 12px;
  box-shadow: 0 2px 4px rgba(113, 128, 150, 0.3);
}

.btn-secondary:hover {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(113, 128, 150, 0.4);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #718096;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: white;
  border-radius: 12px;
  border: 2px dashed #e2e8f0;
}

.empty-state .material-symbols-outlined {
  font-size: 64px;
  margin-bottom: 20px;
  color: #cbd5e0;
  opacity: 0.7;
}

.empty-state p {
  margin: 0 0 20px 0;
  font-size: 1.1rem;
  color: #4a5568;
  font-weight: 500;
}

/* Responsive Breakpoints */
@media (max-width: 480px) {
  .modal-overlay {
    padding: 12px;
    align-items: flex-end;
  }

  .modal-content {
    max-height: 85vh;
    border-radius: 16px 16px 0 0;
  }

  .modal-header {
    padding: 16px 20px;
  }

  .modal-header h2 {
    font-size: 1.2rem;
  }

  .search-container {
    padding: 16px 20px 0;
  }

  .tabs {
    padding: 0 20px;
  }

  .tab-button {
    padding: 14px 16px;
    font-size: 0.9rem;
  }

  .invitations-section {
    padding: 20px;
  }

  .invitation-item {
    flex-direction: column;
    padding: 16px;
    gap: 16px;
    text-align: center;
  }

  .invitation-avatar {
    align-self: center;
  }

  .invitation-actions {
    width: 100%;
    justify-content: stretch;
  }

  .invitation-info {
    width: 100%;
    right: 0px;
  }

  .btn {
    flex: 1;
    padding: 12px 16px;
  }

  .empty-state {
    padding: 40px 16px;
  }

  .empty-state .material-symbols-outlined {
    font-size: 48px;
  }
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 12px;
    align-items: flex-start;
  }

  .modal-content {
    width: 100%;
    margin: 0;
    max-height: 90vh;
  }

  .modal-header {
    padding: 18px 20px;
  }

  .modal-header h2 {
    font-size: 1.25rem;
  }

  .search-container {
    padding: 18px 20px 0;
  }

  .tabs {
    padding: 0 20px;
  }

  .tab-button {
    padding: 14px 16px;
    font-size: 0.9rem;
  }

  .invitations-section {
    padding: 20px;
  }

  .invitation-item {
    flex-direction: column;
    padding: 16px;
    gap: 16px;
    text-align: center;
  }

  .invitation-avatar {
    align-self: center;
  }

  .invitation-info {
    width: 100%;
  }

  .invitation-actions {
    width: 100%;
    justify-content: stretch;
  }

  .btn {
    flex: 1;
    padding: 12px 16px;
  }
}

@media (max-width: 360px) {
  .modal-overlay {
    padding: 8px;
    align-items: flex-start;
  }

  .modal-content {
    max-height: 95vh;
    min-width: 280px;
  }

  .modal-header {
    padding: 14px 16px;
  }

  .modal-header h2 {
    font-size: 1.1rem;
  }

  .search-container {
    padding: 14px 16px 0;
  }

  .tab-button {
    padding: 12px 14px;
    font-size: 0.85rem;
  }

  .invitations-section {
    padding: 16px;
  }

  .empty-state {
    padding: 30px 16px;
  }
  .invitation-info {
    width: 100%;
  }

  .empty-state .material-symbols-outlined {
    font-size: 40px;
  }
}

@media (max-width: 320px) {
  .modal-content {
    min-width: 240px;
  }
  .invitation-info {
    width: 100%;
  }

  .modal-header {
    padding: 12px 14px;
  }

  .tab-button {
    min-width: 110px;
    font-size: 0.8rem;
    padding: 10px 12px;
  }
}

/* Custom scrollbar */
.invitations-section::-webkit-scrollbar {
  width: 6px;
}

.invitations-section::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.invitations-section::-webkit-scrollbar-thumb {
  background: #1a365d;
  border-radius: 3px;
}

.invitations-section::-webkit-scrollbar-thumb:hover {
  background: #2d3748;
}
</style>