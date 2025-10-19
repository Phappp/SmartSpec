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
        <!-- Tabs -->
        <div class="tabs">
          <button
            class="tab-button"
            :class="{ active: activeTab === 'received' }"
            @click="activeTab = 'received'"
          >
            Received ({{ receivedInvitations.length }})
          </button>
          <button
            class="tab-button"
            :class="{ active: activeTab === 'sent' }"
            @click="activeTab = 'sent'"
          >
            Sent ({{ sentInvitations.length }})
          </button>
        </div>

        <!-- Received Invitations -->
        <div v-if="activeTab === 'received'" class="invitations-section">
          <div v-if="receivedInvitations.length > 0" class="invitations-list">
            <div v-for="inv in receivedInvitations" :key="inv.id" class="invitation-item">
              <div class="invitation-info">
                <h4>Project: {{ inv.projectName }}</h4>
                <p>
                  <strong>{{ inv.invitedBy }}</strong> invited you as
                  <strong>{{ inv.role }}</strong>
                </p>
                <small>Received: {{ formatDate(inv.date) }}</small>
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
            <span class="material-symbols-outlined">inbox</span>
            <p>No pending invitations</p>
          </div>
        </div>

        <!-- Sent Invitations -->
        <div v-if="activeTab === 'sent'" class="invitations-section">
          <div v-if="sentInvitations.length > 0" class="invitations-list">
            <div v-for="inv in sentInvitations" :key="inv.invite_id" class="invitation-item">
              <div class="invitation-info">
                <h4>Project: {{ inv.projectName }}</h4>
                <p>
                  Invited <strong>{{ inv.invitee.name }}</strong> as
                  <strong>{{ inv.role }}</strong>
                </p>
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
            <span class="material-symbols-outlined">send</span>
            <p>No sent invitations</p>
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
    }
  },
  methods: {
    close() {
      this.$emit('close')
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
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: #6b7280;
  transition: color 0.3s;
}

.close-btn:hover {
  color: #374151;
}

.modal-body {
  padding: 0;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 24px;
}

.tab-button {
  background: none;
  border: none;
  padding: 12px 16px;
  cursor: pointer;
  font-weight: 500;
  color: #6b7280;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

.tab-button.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.tab-button:hover:not(.active) {
  color: #374151;
}

.invitations-section {
  padding: 24px;
  max-height: 400px;
  overflow-y: auto;
}

.invitations-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.invitation-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.invitation-info h4 {
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 1rem;
}

.invitation-info p {
  margin: 0 0 8px 0;
  color: #6b7280;
}

.invitation-info small {
  color: #9ca3af;
  display: block;
  margin-bottom: 4px;
}

.status-pending {
  color: #f59e0b;
  font-weight: 500;
}

.invitation-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.3s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-accept {
  background: #10b981;
  color: white;
}

.btn-accept:hover:not(:disabled) {
  background: #059669;
}

.btn-reject {
  background: #ef4444;
  color: white;
}

.btn-reject:hover:not(:disabled) {
  background: #dc2626;
}

.btn-cancel {
  background: #6b7280;
  color: white;
}

.btn-cancel:hover:not(:disabled) {
  background: #4b5563;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.empty-state .material-symbols-outlined {
  font-size: 48px;
  margin-bottom: 16px;
  color: #9ca3af;
}

.empty-state p {
  margin: 0;
  font-size: 1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 20px;
  }

  .invitation-item {
    flex-direction: column;
    gap: 12px;
  }

  .invitation-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>