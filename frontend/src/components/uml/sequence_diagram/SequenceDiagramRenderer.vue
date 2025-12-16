<template>
  <div
    class="sequence-diagram-renderer"
    :class="{
      'preview-mode': previewMode,
      'editable-mode': editable,
      'fullscreen-mode': isFullscreen,
      'hidden-renderer': optimizeForPreview,
    }"
  >
    <!-- Toolbar -->
    <div v-if="!previewMode && editable && !optimizeForPreview" class="toolbar">
      <div class="toolbar-left">
        <!-- View Controls -->
        <div class="toolbar-group">
          <button class="toolbar-btn" @click="zoomOut" title="Zoom Out (Ctrl + -)">
            <span class="material-symbols-outlined">zoom_out</span>
          </button>
          <div class="zoom-display">{{ Math.round(internalZoom * 100) }}%</div>
          <button class="toolbar-btn" @click="zoomIn" title="Zoom In (Ctrl + +)">
            <span class="material-symbols-outlined">zoom_in</span>
          </button>
          <button
            class="toolbar-btn"
            @click="toggleFullscreen"
            :title="isFullscreen ? 'Exit Fullscreen (F11)' : 'Enter Fullscreen (F11)'"
          >
            <span class="material-symbols-outlined">{{
              isFullscreen ? 'fullscreen_exit' : 'fullscreen'
            }}</span>
          </button>
          <button class="toolbar-btn" @click="resetZoom" title="Reset Zoom">
            <span class="material-symbols-outlined">refresh</span>
          </button>
          <button class="toolbar-btn" @click="fitToViewport" title="Fit to Viewport">
            <span class="material-symbols-outlined">fit_screen</span>
          </button>
        </div>

        <!-- CRUD Controls -->
        <div class="toolbar-group">
          <button class="toolbar-btn btn-manage" @click="showManagementModal" title="Manage Diagram">
            <span class="material-symbols-outlined">settings</span>
            Manage
          </button>
        </div>

        <!-- Export Controls -->
        <div class="toolbar-group">
          <button class="toolbar-btn" @click="exportAsSVG" title="Export as SVG">
            <span class="material-symbols-outlined">download</span>
            SVG
          </button>
          <button class="toolbar-btn" @click="exportAsPNG" title="Export as PNG">
            <span class="material-symbols-outlined">image</span>
            PNG
          </button>
        </div>

        <!-- Auto Save Status -->
        <div class="toolbar-group auto-save-status">
          <div class="save-indicator" :class="{ saving: isSaving, saved: lastSaved && !isSaving }">
            <span class="material-symbols-outlined icon">
              {{ isSaving ? 'sync' : lastSaved ? 'check_circle' : 'circle' }}
            </span>
            <span class="save-text">
              {{ getSaveStatusText() }}
            </span>
            <span v-if="lastSaved && !isSaving" class="save-time">
              {{ formatLastSaved() }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Container -->
    <div
      class="sequence-container"
      ref="container"
      @mousedown="startPan"
      @mousemove="handlePan"
      @mouseup="endPan"
      @mouseleave="endPan"
      @wheel="handleWheel"
    >
      <!-- SVG Container -->
      <svg
        :width="containerWidth"
        :height="containerHeight"
        class="sequence-svg"
        :style="svgStyle"
        :viewBox="viewBox"
        @click="handleSvgClick"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseLeave"
      >
        <!-- Definitions -->
        <defs>
          <!-- Grid pattern -->
          <pattern
            id="sequence-grid-pattern"
            x="0"
            y="0"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" stroke-width="1" />
          </pattern>

          <!-- Arrow markers -->
          <marker
            id="sync-arrow"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
          </marker>
          <marker
            id="async-arrow"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#8b5cf6" />
          </marker>
          <marker
            id="reply-arrow"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
          </marker>

          <!-- Drop shadow filter -->
          <filter id="sequence-drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="1" dy="1" result="offsetblur" />
            <feFlood flood-color="#000000" flood-opacity="0.2" />
            <feComposite in2="offsetblur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <!-- Background Grid -->
        <g class="grid-layer">
          <rect
            :x="virtualSpace.minX"
            :y="virtualSpace.minY"
            :width="virtualSpace.width"
            :height="virtualSpace.height"
            fill="url(#sequence-grid-pattern)"
          />
          <rect
            v-if="!previewMode && editable"
            :x="virtualSpace.minX"
            :y="virtualSpace.minY"
            :width="virtualSpace.width"
            :height="virtualSpace.height"
            class="canvas-boundary"
            fill="none"
            stroke="#e5e7eb"
            stroke-width="1"
            stroke-dasharray="5,5"
          />
        </g>

        <!-- Fragments Layer -->
        <g class="fragments-layer">
          <g
            v-for="fragment in computedFragments"
            :key="`fragment-${fragment.id}`"
            class="fragment-group"
          >
            <!-- Main Fragment Rectangle -->
            <rect
              :x="fragment.x"
              :y="fragment.y"
              :width="fragment.width"
              :height="fragment.totalHeight"
              class="fragment-rect"
              :class="`fragment-${fragment.type}`"
            />

            <!-- Fragment Label -->
            <text :x="fragment.x + 10" :y="fragment.y + 20" class="fragment-label">
              {{ getFragmentLabel(fragment.type) }}
            </text>
            <text
              v-if="fragment.guard_condition"
              :x="fragment.x + 10"
              :y="fragment.y + 40"
              class="fragment-condition"
            >
              [{{ fragment.guard_condition }}]
            </text>

            <!-- Messages in Main Fragment -->
            <g class="fragment-messages">
              <g
                v-for="message in fragment.messages"
                :key="`fragment-message-${message.id}`"
                class="message-group"
                :class="{
                  selected: selectedElement && selectedElement.id === message.id,
                }"
                @mousedown="startDrag(message, 'message', $event)"
              >
                <path
                  :d="calculateMessagePath(message)"
                  :class="`message-line message-${message.type}`"
                  :marker-end="getMessageMarker(message.type)"
                />
                <text
                  :x="getMessageLabelPosition(message).x"
                  :y="getMessageLabelPosition(message).y"
                  class="message-label"
                  text-anchor="middle"
                  dominant-baseline="middle"
                >
                  {{ message.content }}
                </text>
              </g>
            </g>

            <!-- Child Fragments -->
            <g
              v-for="child in fragment.children"
              :key="`child-fragment-${child.id}`"
              class="child-fragment-group"
            >
              <!-- Divider line -->
              <line
                :x1="child.x"
                :y1="child.y"
                :x2="child.x + child.width"
                :y2="child.y"
                class="fragment-divider"
              />

              <!-- Child fragment label -->
              <text :x="child.x + 10" :y="child.y + 15" class="fragment-label child-fragment-label">
                {{ getFragmentLabel(child.type) }}
              </text>
              <text
                v-if="child.guard_condition"
                :x="child.x + 10"
                :y="child.y + 35"
                class="fragment-condition child-fragment-condition"
              >
                [{{ child.guard_condition }}]
              </text>

              <!-- Messages in Child Fragment -->
              <g class="fragment-messages">
                <g
                  v-for="message in child.messages"
                  :key="`child-message-${message.id}`"
                  class="message-group"
                  :class="{
                    selected: selectedElement && selectedElement.id === message.id,
                  }"
                  @mousedown="startDrag(message, 'message', $event)"
                >
                  <path
                    :d="calculateMessagePath(message)"
                    :class="`message-line message-${message.type}`"
                    :marker-end="getMessageMarker(message.type)"
                  />
                  <text
                    :x="getMessageLabelPosition(message).x"
                    :y="getMessageLabelPosition(message).y"
                    class="message-label"
                    text-anchor="middle"
                    dominant-baseline="middle"
                  >
                    {{ message.content }}
                  </text>
                </g>
              </g>
            </g>
          </g>
        </g>

        <!-- Lifelines Layer -->
        <g class="lifelines-layer">
          <g
            v-for="lifeline in computedLifelines"
            :key="`lifeline-${lifeline.id}`"
            :class="{
              'lifeline-group': true,
              selected: selectedElement && selectedElement.id === lifeline.id,
            }"
            @mousedown="startDrag(lifeline, 'lifeline', $event)"
          >
            <rect
              :x="lifeline.x - 60"
              :y="lifeline.y - 30"
              :width="120"
              :height="60"
              rx="8"
              class="lifeline-header"
              filter="url(#sequence-drop-shadow)"
            />
            <text
              :x="lifeline.x"
              :y="lifeline.y"
              class="lifeline-name"
              text-anchor="middle"
              dominant-baseline="middle"
            >
              {{ lifeline.name }}
            </text>
            <line
              :x1="lifeline.x"
              :y1="lifeline.y + 30"
              :x2="lifeline.x"
              :y2="lifeline.endY || virtualSpace.maxY - 50"
              class="lifeline-line"
              :class="{ 'lifeline-mirror-line': lifeline.isMirror }"
            />
          </g>
        </g>

        <!-- Messages Outside Fragments -->
        <g class="messages-layer">
          <g
            v-for="message in rootMessages"
            :key="`message-${message.id}`"
            class="message-group"
            :class="{
              selected: selectedElement && selectedElement.id === message.id,
            }"
            @mousedown="startDrag(message, 'message', $event)"
          >
            <path
              :d="calculateMessagePath(message)"
              :class="`message-line message-${message.type}`"
              :marker-end="getMessageMarker(message.type)"
            />
            <text
              :x="getMessageLabelPosition(message).x"
              :y="getMessageLabelPosition(message).y"
              class="message-label"
              text-anchor="middle"
              dominant-baseline="middle"
            >
              {{ message.content }}
            </text>
          </g>
        </g>

        <!-- Selection highlight -->
        <rect
          v-if="selectedElement && !previewMode"
          :x="getSelectionBounds().x"
          :y="getSelectionBounds().y"
          :width="getSelectionBounds().width"
          :height="getSelectionBounds().height"
          class="selection-highlight"
          :rx="getSelectionBounds().rx"
        />

        <!-- Drag preview -->
        <g v-if="draggingElement && draggingType === 'lifeline'" class="drag-preview">
          <rect
            :x="dragPosition.x - 60"
            :y="dragPosition.y - 30"
            :width="120"
            :height="60"
            rx="8"
            class="lifeline-header drag-preview-element"
          />
          <line
            :x1="dragPosition.x"
            :y1="dragPosition.y + 30"
            :x2="dragPosition.x"
            :y2="draggingElement.endY || virtualSpace.maxY - 50"
            class="lifeline-line drag-preview-element"
          />
        </g>
      </svg>
    </div>

    <!-- Status Bar -->
    <div v-if="!previewMode && !optimizeForPreview" class="status-bar">
      <div class="status-item">
        <span class="material-symbols-outlined">person</span>
        {{ computedLifelines.length }} Lifelines
      </div>
      <div class="status-item">
        <span class="material-symbols-outlined">chat</span>
        {{ computedMessages.length }} Messages
      </div>
      <div class="status-item">
        <span class="material-symbols-outlined">widgets</span>
        {{ computedFragments.length }} Fragments
      </div>

      <div class="status-item" v-if="selectedElement">
        Selected: {{ selectedElement.name || selectedElement.content }}
      </div>

      <div class="status-item spacer"></div>

      <div class="status-item">
        View: ({{ Math.round(viewport.x) }}, {{ Math.round(viewport.y) }})
      </div>
      <div class="status-item">
        Canvas: {{ Math.round(virtualSpace.width) }} × {{ Math.round(virtualSpace.height) }}
      </div>
      <div class="status-item">Zoom: {{ Math.round(internalZoom * 100) }}%</div>
    </div>

    <!-- Management Modal -->
    <div v-if="managementModal.visible" class="management-modal-overlay" @click="closeManagementModal">
      <div class="management-modal-content" @click.stop>
        <div class="management-modal-header">
          <h2>Manage Sequence Diagram</h2>
          <button class="modal-close-btn" @click="closeManagementModal">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Tabs -->
        <div class="management-tabs">
          <button
            v-for="tab in managementTabs"
            :key="tab.id"
            class="tab-btn"
            :class="{ active: managementModal.activeTab === tab.id }"
            @click="managementModal.activeTab = tab.id"
          >
            <span class="material-symbols-outlined">{{ tab.icon }}</span>
            {{ tab.label }}
            <span class="tab-count">({{ getTabCount(tab.id) }})</span>
          </button>
        </div>

        <!-- Tab Content -->
        <div class="management-tab-content">
          <!-- Lifelines Tab -->
          <div v-if="managementModal.activeTab === 'lifelines'" class="tab-panel">
            <div class="panel-header">
              <h3>Lifelines</h3>
              <button 
                class="btn-add-item" 
                @click="openCreateForm('lifeline')"
                :disabled="isCrudLoading"
              >
                <span class="material-symbols-outlined">add</span>
                Add Lifeline
              </button>
            </div>
            <div class="items-list">
              <div
                v-for="lifeline in originalLifelines"
                :key="lifeline.id"
                class="item-card"
              >
                <div class="item-info">
                  <div class="item-name">{{ lifeline.name || 'Unnamed Lifeline' }}</div>
                  <div v-if="lifeline.description" class="item-description">{{ lifeline.description }}</div>
                </div>
                <div class="item-actions">
                  <button 
                    class="btn-edit" 
                    @click="openEditForm('lifeline', lifeline)" 
                    title="Edit"
                    :disabled="isCrudLoading"
                  >
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button 
                    class="btn-delete" 
                    @click="confirmDelete('lifeline', lifeline)" 
                    title="Delete"
                    :disabled="isCrudLoading || deletingElementId === lifeline.id"
                  >
                    <span 
                      class="material-symbols-outlined"
                      :class="{ 'spinning': deletingElementId === lifeline.id }"
                    >
                      {{ deletingElementId === lifeline.id ? 'sync' : 'delete' }}
                    </span>
                  </button>
                </div>
              </div>
              <div v-if="originalLifelines.length === 0" class="empty-state">
                <span class="material-symbols-outlined">person_off</span>
                <p>No lifelines yet</p>
              </div>
            </div>
          </div>

          <!-- Messages Tab -->
          <div v-if="managementModal.activeTab === 'messages'" class="tab-panel">
            <div class="panel-header">
              <h3>Messages</h3>
              <button 
                class="btn-add-item" 
                @click="openCreateForm('message')"
                :disabled="isCrudLoading"
              >
                <span class="material-symbols-outlined">add</span>
                Add Message
              </button>
            </div>
            
            <!-- Outgoing Messages (Luồng đi) -->
            <div class="message-section">
              <h4 class="section-title">
                <span class="material-symbols-outlined">arrow_forward</span>
                Outgoing Messages ({{ outgoingMessages.length }})
              </h4>
              <div class="items-list">
                <div
                  v-for="message in outgoingMessages"
                  :key="message.id"
                  class="item-card"
                >
                  <div class="item-info">
                    <div class="item-name">
                      {{ message.from?.name || 'Unknown' }} → {{ message.to?.name || 'Unknown' }}
                    </div>
                    <div v-if="message.content" class="item-description">{{ message.content }}</div>
                    <div class="item-meta">
                      <span class="message-type">{{ message.type || 'sync' }}</span>
                    </div>
                  </div>
                  <div class="item-actions">
                    <button 
                      class="btn-edit" 
                      @click="openEditForm('message', message)" 
                      title="Edit"
                      :disabled="isCrudLoading"
                    >
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button 
                      class="btn-delete" 
                      @click="confirmDelete('message', message)" 
                      title="Delete"
                      :disabled="isCrudLoading || deletingElementId === message.id"
                    >
                      <span 
                        class="material-symbols-outlined"
                        :class="{ 'spinning': deletingElementId === message.id }"
                      >
                        {{ deletingElementId === message.id ? 'sync' : 'delete' }}
                      </span>
                    </button>
                  </div>
                </div>
                <div v-if="outgoingMessages.length === 0" class="empty-state-small">
                  <span class="material-symbols-outlined">arrow_forward</span>
                  <p>No outgoing messages</p>
                </div>
              </div>
            </div>

            <!-- Incoming Messages (Luồng về) -->
            <div class="message-section">
              <h4 class="section-title">
                <span class="material-symbols-outlined">arrow_back</span>
                Incoming Messages ({{ incomingMessages.length }})
              </h4>
              <div class="items-list">
                <div
                  v-for="message in incomingMessages"
                  :key="message.id"
                  class="item-card"
                >
                  <div class="item-info">
                    <div class="item-name">
                      {{ message.from?.name || 'Unknown' }} → {{ message.to?.name || 'Unknown' }}
                    </div>
                    <div v-if="message.content" class="item-description">{{ message.content }}</div>
                    <div class="item-meta">
                      <span class="message-type">{{ message.type || 'sync' }}</span>
                    </div>
                  </div>
                  <div class="item-actions">
                    <button 
                      class="btn-edit" 
                      @click="openEditForm('message', message)" 
                      title="Edit"
                      :disabled="isCrudLoading"
                    >
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button 
                      class="btn-delete" 
                      @click="confirmDelete('message', message)" 
                      title="Delete"
                      :disabled="isCrudLoading || deletingElementId === message.id"
                    >
                      <span 
                        class="material-symbols-outlined"
                        :class="{ 'spinning': deletingElementId === message.id }"
                      >
                        {{ deletingElementId === message.id ? 'sync' : 'delete' }}
                      </span>
                    </button>
                  </div>
                </div>
                <div v-if="incomingMessages.length === 0" class="empty-state-small">
                  <span class="material-symbols-outlined">arrow_back</span>
                  <p>No incoming messages</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Fragments Tab -->
          <div v-if="managementModal.activeTab === 'fragments'" class="tab-panel">
            <div class="panel-header">
              <h3>Fragments</h3>
              <button 
                class="btn-add-item" 
                @click="openCreateForm('fragment')"
                :disabled="isCrudLoading"
              >
                <span class="material-symbols-outlined">add</span>
                Add Fragment
              </button>
            </div>
            <div class="items-list">
              <div
                v-for="fragment in computedFragments"
                :key="fragment.id"
                class="item-card fragment-card"
              >
                <div class="item-info">
                  <div class="item-name">{{ getFragmentLabel(fragment.type) || 'Fragment' }}</div>
                  <div v-if="fragment.guard_condition" class="item-description">
                    Guard: {{ fragment.guard_condition }}
                  </div>
                  <div class="fragment-messages-info">
                    <span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle;">chat</span>
                    <span style="margin-left: 4px;">{{ getFragmentMessages(fragment).length }} messages</span>
                  </div>
                  <!-- Messages trong fragment -->
                  <div v-if="getFragmentMessages(fragment).length > 0" class="fragment-messages-list">
                    <div
                      v-for="msg in getFragmentMessages(fragment)"
                      :key="msg.id"
                      class="fragment-message-item"
                    >
                      <span class="message-arrow">→</span>
                      <span class="message-content">{{ msg.content || 'No content' }}</span>
                      <span class="message-type-badge">{{ msg.type || 'sync' }}</span>
                    </div>
                  </div>
                  <div v-else class="fragment-no-messages">
                    <span class="material-symbols-outlined" style="font-size: 14px;">info</span>
                    <span style="margin-left: 4px; font-size: 12px; color: #9ca3af;">No messages in this fragment</span>
                  </div>
                </div>
                <div class="item-actions">
                  <button class="btn-add-message" @click="openAddMessageToFragment(fragment)" title="Add Message">
                    <span class="material-symbols-outlined">add_comment</span>
                    Add Message
                  </button>
                  <button class="btn-edit" @click="openEditForm('fragment', fragment)" title="Edit">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="btn-delete" @click="confirmDelete('fragment', fragment)" title="Delete">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
              <div v-if="computedFragments.length === 0" class="empty-state">
                <span class="material-symbols-outlined">widgets</span>
                <p>No fragments yet</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Form Modal -->
    <div v-if="formModal.visible" class="form-modal-overlay" @click="closeFormModal">
      <div class="form-modal-content" @click.stop>
        <div class="form-modal-header">
          <h3>{{ formModal.isEdit ? 'Edit' : 'Create' }} {{ formModal.type }}</h3>
          <button class="modal-close-btn" @click="closeFormModal">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="form-modal-body">
          <!-- Lifeline Form -->
          <div v-if="formModal.type === 'lifeline'">
            <div class="form-group">
              <label>Lifeline Name *</label>
              <input
                v-model="formModal.data.name"
                type="text"
                placeholder="Enter lifeline name"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea
                v-model="formModal.data.description"
                placeholder="Enter description (optional)"
                class="form-textarea"
                rows="3"
              ></textarea>
            </div>
          </div>

          <!-- Message Form -->
          <div v-if="formModal.type === 'message'">
            <div v-if="formModal.data.fragment_id" class="form-group">
              <div class="info-badge">
                <span class="material-symbols-outlined">info</span>
                Adding message to fragment: {{ getFragmentName(formModal.data.fragment_id) }}
              </div>
            </div>
            <div class="form-group">
              <label>From Lifeline *</label>
              <select v-model="formModal.data.from" class="form-input">
                <option value="">Select From Lifeline</option>
                <option
                  v-for="lifeline in originalLifelines"
                  :key="lifeline.id"
                  :value="lifeline.id"
                >
                  {{ lifeline.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>To Lifeline *</label>
              <select v-model="formModal.data.to" class="form-input">
                <option value="">Select To Lifeline</option>
                <option
                  v-for="lifeline in originalLifelines"
                  :key="lifeline.id"
                  :value="lifeline.id"
                >
                  {{ lifeline.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Message Content *</label>
              <input
                v-model="formModal.data.content"
                type="text"
                placeholder="Enter message content"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>Message Type *</label>
              <select v-model="formModal.data.type" class="form-input">
                <option value="sync">Sync</option>
                <option value="async">Async</option>
                <option value="reply">Reply</option>
              </select>
            </div>
          </div>

          <!-- Fragment Form -->
          <div v-if="formModal.type === 'fragment'">
            <div class="form-group">
              <label>Fragment Type *</label>
              <select v-model="formModal.data.type" class="form-input">
                <option value="alt">Alt (Alternative)</option>
                <option value="opt">Opt (Optional)</option>
                <option value="loop">Loop</option>
                <option value="par">Par (Parallel)</option>
                <option value="ref">Ref (Reference)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Guard Condition</label>
              <input
                v-model="formModal.data.guard_condition"
                type="text"
                placeholder="Enter guard condition (optional)"
                class="form-input"
              />
            </div>
          </div>
        </div>
        <div class="form-modal-footer">
          <button 
            class="btn-secondary" 
            @click="closeFormModal"
            :disabled="isCrudLoading"
          >
            Cancel
          </button>
          <button 
            class="btn-primary" 
            @click="saveForm"
            :disabled="isCrudLoading"
          >
            <span 
              v-if="isCrudLoading" 
              class="material-symbols-outlined spinning"
              style="font-size: 18px; margin-right: 6px;"
            >
              sync
            </span>
            {{ isCrudLoading ? 'Saving...' : (formModal.isEdit ? 'Update' : 'Create') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  createMessage,
  updateMessage,
  deleteMessage,
  createFragment,
  updateFragment,
  deleteFragment,
  updateLifeline,
  deleteLifeline,
  getSequenceDiagramById,
} from '@/api/sqd';

export default {
  name: 'SequenceDiagramRenderer',
  props: {
    diagramData: {
      type: Object,
      required: true,
      default: () => ({
        lifelines: [],
        messages: [],
        fragments: [],
      }),
    },
    onPositionChange: {
      type: Function,
      default: null,
    },
    previewMode: {
      type: Boolean,
      default: false,
    },
    editable: {
      type: Boolean,
      default: false,
    },
    zoomLevel: {
      type: Number,
      default: 1,
    },
    containerWidth: {
      type: Number,
      default: 1200,
    },
    containerHeight: {
      type: Number,
      default: 800,
    },
    autoGeneratePreview: {
      type: Boolean,
      default: false,
    },
    optimizeForPreview: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      selectedElement: null,
      selectedElementType: null,
      draggingElement: null,
      draggingType: null,
      dragPosition: { x: 0, y: 0 },
      dragOffset: { x: 0, y: 0 },
      isDragging: false,
      internalZoom: 1,
      viewport: { x: 0, y: 0 },
      isPanning: false,
      panStart: { x: 0, y: 0 },
      isFullscreen: false,
      isExporting: false,
      isSaving: false,
      lastSaved: null,
      virtualSpace: {
        minX: -1000,
        maxX: 2200,
        minY: -1000,
        maxY: 1800,
        get width() {
          return this.maxX - this.minX
        },
        get height() {
          return this.maxY - this.minY
        },
        get centerX() {
          return (this.minX + this.maxX) / 2
        },
        get centerY() {
          return (this.minY + this.maxY) / 2
        },
      },
      previewGenerated: false,

      // Management Modal state
      managementModal: {
        visible: false,
        activeTab: 'lifelines',
        hasChanges: false,
      },
      managementTabs: [
        { id: 'lifelines', label: 'Lifelines', icon: 'person' },
        { id: 'messages', label: 'Messages', icon: 'chat' },
        { id: 'fragments', label: 'Fragments', icon: 'widgets' },
      ],
      formModal: {
        visible: false,
        type: null, // 'lifeline', 'message', 'fragment'
        isEdit: false,
        hasChanges: false,
        data: {
          name: '',
          description: '',
          from: '',
          to: '',
          content: '',
          type: 'sync',
          guard_condition: '',
        },
        element: null,
      },
      diagramId: null,
      isCrudLoading: false,
      deletingElementId: null,
    }
  },
  computed: {
    viewBox() {
      return `${this.virtualSpace.minX} ${this.virtualSpace.minY} ${this.virtualSpace.width} ${this.virtualSpace.height}`
    },
    svgStyle() {
      return {
        transform: `translate(${this.viewport.x}px, ${this.viewport.y}px) scale(${this.internalZoom})`,
        transformOrigin: '0 0',
      }
    },
    safeDiagramData() {
      return {
        lifelines: Array.isArray(this.diagramData?.lifelines) ? this.diagramData.lifelines : [],
        messages: Array.isArray(this.diagramData?.messages) ? this.diagramData.messages : [],
        fragments: Array.isArray(this.diagramData?.fragments) ? this.diagramData.fragments : [],
      }
    },
    lifelineEndY() {
      // Tính toán Y lớn nhất từ tất cả messages và fragments
      // Vue sẽ tự động tính computedMessages và computedFragments trước
      let maxY = 0

      // Tìm Y lớn nhất từ computedMessages
      if (this.computedMessages && this.computedMessages.length > 0) {
        const messageMaxY = Math.max(...this.computedMessages.map(msg => (msg.y || 0) + 30))
        maxY = Math.max(maxY, messageMaxY)
      }

      // Tìm Y lớn nhất từ computedFragments
      if (this.computedFragments && this.computedFragments.length > 0) {
        this.computedFragments.forEach(fragment => {
          // Y cuối của fragment chính
          const fragmentEndY = fragment.y + (fragment.totalHeight || fragment.height || 0)
          maxY = Math.max(maxY, fragmentEndY)

          // Y cuối của các child fragments
          if (fragment.children && fragment.children.length > 0) {
            fragment.children.forEach(child => {
              const childEndY = child.y + (child.height || 0)
              maxY = Math.max(maxY, childEndY)
            })
          }
        })
      }

      // Nếu không có messages/fragments, sử dụng giá trị mặc định
      if (maxY === 0) {
        maxY = this.virtualSpace.centerY + 200 // Giá trị mặc định
      }

      // Thêm padding phía dưới để có khoảng trống trước khi đặt lifeline ảo
      return maxY + 100
    },
    computedLifelines() {
      const lifelines = this.safeDiagramData.lifelines
      if (!lifelines || lifelines.length === 0) return []

      const lifelineSpacing = 200 // Khoảng cách giữa các lifelines
      const verticalOffset = 150 // Khoảng cách từ centerY
      const baseCenterY = 400 // centerY của virtual space mặc định

      // Tính toán độ dài của lifeline-line dựa trên messages và fragments
      const lifelineEndY = this.lifelineEndY

      // Tạo lifelines gốc ở phía trên
      const topLifelines = lifelines.map((lifeline, index) => {
        const totalLifelines = lifelines.length
        const startX = this.virtualSpace.centerX - ((totalLifelines - 1) * lifelineSpacing) / 2
        const defaultX = startX + index * lifelineSpacing
        const defaultY = baseCenterY - verticalOffset
        
        // Chỉ sử dụng position đã lưu nếu cả x và y đều được set hợp lệ
        const hasSavedPosition = lifeline.position && 
          typeof lifeline.position.x === 'number' && 
          typeof lifeline.position.y === 'number' &&
          (Math.abs(lifeline.position.x) > 10 || Math.abs(lifeline.position.y) > 10)
        
        const position = lifeline.position || { x: 0, y: 0 }
        const x = hasSavedPosition ? position.x : defaultX
        const y = hasSavedPosition ? position.y : defaultY

        return {
          id: this.normalizeId(lifeline._id || lifeline.id || `lifeline-${index}`),
          name: lifeline.name || 'Unnamed',
          x,
          y,
          endY: lifelineEndY, // Độ dài dynamic của lifeline-line
          _originalData: lifeline,
          isMirror: false,
        }
      })

      // Tạo lifelines ảo đối xứng phía dưới - đặt ở cuối lifeline-line
      const bottomLifelines = topLifelines.map((topLifeline, index) => {
        // Lifelines ảo nằm ở cuối lifeline-line (endY)
        // Điều chỉnh Y để lifeline ảo nằm ở giữa (center của header) tại endY
        const x = topLifeline.x
        const y = lifelineEndY - 30 // Trừ 30 để center của header nằm ở endY

        return {
          id: `mirror-${topLifeline.id}`,
          name: topLifeline.name,
          x,
          y,
          endY: lifelineEndY,
          _originalData: null, // Không có original data vì là lifeline ảo
          isMirror: true,
          originalLifelineId: topLifeline.id, // Lưu ID của lifeline gốc để sync
        }
      })

      // Kết hợp lifelines gốc và lifelines ảo
      return [...topLifelines, ...bottomLifelines]
    },
    computedMessages() {
      const messages = this.safeDiagramData.messages
      if (!messages || messages.length === 0) return []
      
      // Tính toán lifelines gốc trực tiếp từ safeDiagramData để tránh circular dependency
      const lifelines = this.safeDiagramData.lifelines || []
      if (lifelines.length === 0) return []
      
      const lifelineSpacing = 200
      const verticalOffset = 150
      const baseCenterY = 400
      
      // Tạo lifelines gốc để map messages (không bao gồm lifelines ảo)
      const originalLifelines = lifelines.map((lifeline, index) => {
        const totalLifelines = lifelines.length
        const startX = this.virtualSpace.centerX - ((totalLifelines - 1) * lifelineSpacing) / 2
        const defaultX = startX + index * lifelineSpacing
        const defaultY = baseCenterY - verticalOffset
        
        const hasSavedPosition = lifeline.position && 
          typeof lifeline.position.x === 'number' && 
          typeof lifeline.position.y === 'number' &&
          (Math.abs(lifeline.position.x) > 10 || Math.abs(lifeline.position.y) > 10)
        
        const position = lifeline.position || { x: 0, y: 0 }
        const x = hasSavedPosition ? position.x : defaultX
        const y = hasSavedPosition ? position.y : defaultY

        return {
          id: this.normalizeId(lifeline._id || lifeline.id || `lifeline-${index}`),
          name: lifeline.name || 'Unnamed',
          x,
          y,
        }
      })
      
      return messages
        .map((message, index) => {
          const sourceLifeline = originalLifelines.find(
            (ll) => ll.id === this.normalizeId(message.source_lifeline_id)
          )
          const targetLifeline = originalLifelines.find(
            (ll) => ll.id === this.normalizeId(message.target_lifeline_id)
          )
          return {
            id: this.normalizeId(message._id || message.id || `message-${index}`),
            source: sourceLifeline,
            target: targetLifeline,
            from: sourceLifeline, // Alias for Management Modal
            to: targetLifeline, // Alias for Management Modal
            content: message.content || 'message',
            type: message.type || 'sync',
            order: message.order || index,
            y: 200 + index * 50,
            fragment_id: this.normalizeId(message.fragment_id),
            _originalData: message,
          }
        })
        .filter((message) => message.source && message.target)
        .sort((a, b) => a.order - b.order)
    },
    rootMessages() {
      return this.computedMessages.filter((message) => !message.fragment_id)
    },
    originalLifelines() {
      return this.computedLifelines.filter((ll) => !ll.isMirror)
    },
    outgoingMessages() {
      // Messages đi ra (sync và async, không phải reply)
      return this.computedMessages.filter((msg) => {
        return msg.type === 'sync' || msg.type === 'async'
      })
    },
    incomingMessages() {
      // Messages đi về (reply messages)
      return this.computedMessages.filter((msg) => msg.type === 'reply')
    },
    computedFragments() {
      const fragments = this.safeDiagramData.fragments
      if (!fragments || fragments.length === 0) return []

      // Build fragment hierarchy
      const fragmentMap = new Map()
      const rootFragments = []
      const childFragments = []

      // First pass: create fragment objects and categorize
      fragments.forEach((fragment) => {
        const fragmentId = this.normalizeId(fragment._id || fragment.id)
        const parentId = this.normalizeId(fragment.parent_fragment_id)
        const fragmentObj = {
          id: fragmentId,
          type: fragment.type || 'opt',
          guard_condition: fragment.guard_condition,
          parentId: parentId,
          messages: [],
          children: [],
          _originalData: fragment,
        }
        fragmentMap.set(fragmentId, fragmentObj)
        if (!parentId) {
          rootFragments.push(fragmentObj)
        } else {
          childFragments.push(fragmentObj)
        }
      })

      // Second pass: assign messages to fragments
      this.computedMessages.forEach((message) => {
        if (message.fragment_id) {
          const fragment = fragmentMap.get(message.fragment_id)
          if (fragment) {
            fragment.messages.push(message)
          }
        }
      })

      // Third pass: build parent-child relationships
      childFragments.forEach((child) => {
        const parent = fragmentMap.get(child.parentId)
        if (parent) {
          parent.children.push(child)
        }
      })

      // Fourth pass: calculate positions and dimensions
      return rootFragments.map((fragment, index) => {
        const bounds = this.calculateFragmentBounds(fragment, index)
        return {
          ...fragment,
          ...bounds,
        }
      })
    },
  },
  watch: {
    diagramData: {
      handler(newData, oldData) {
        this.updateVirtualSpace()
        if (this.autoGeneratePreview && !this.previewGenerated) {
          this.$nextTick(() => {
            setTimeout(() => {
              this.generatePreviewImage().then((previewData) => {
                if (previewData) {
                  this.$emit('preview-generated', previewData)
                  this.previewGenerated = true
                }
              })
            }, 300)
          })
        }
      },
      deep: true,
      immediate: true,
    },
    zoomLevel: {
      handler(newZoom) {
        this.internalZoom = newZoom
      },
      immediate: true,
    },
  },
  mounted() {
    this.updateVirtualSpace()
    this.setupEventListeners()
    this.setupKeyboardShortcuts()
    this.setupFullscreenListener()
    this.centerViewport()
    if (this.autoGeneratePreview) {
      this.$nextTick(() => {
        setTimeout(() => {
          this.generatePreviewImage().then((previewData) => {
            if (previewData) {
              this.$emit('preview-generated', previewData)
              this.previewGenerated = true
            }
          })
        }, 500)
      })
    }
  },
  beforeUnmount() {
    this.removeEventListeners()
    this.cleanupFullscreenListener()
  },
  methods: {
    // Utility Methods
    normalizeId(id) {
      if (!id) return null
      if (typeof id === 'object' && id.$oid) {
        return id.$oid
      }
      return id.toString()
    },

    // Fragment Methods - HOÀN TOÀN MỚI
    calculateFragmentBounds(fragment, index = 0) {
      // Lấy tất cả messages thuộc fragment này và các fragment con
      const allFragmentMessages = this.getAllFragmentMessages(fragment)

      if (allFragmentMessages.length === 0) {
        return {
          x: 50,
          y: 150 + index * 400,
          width: 500,
          height: 200,
          totalHeight: 200,
        }
      }

      // Tìm các lifeline có liên quan đến fragment này
      const involvedLifelines = new Set()
      allFragmentMessages.forEach((message) => {
        if (message.source) involvedLifelines.add(message.source)
        if (message.target) involvedLifelines.add(message.target)
      })

      const lifelineArray = Array.from(involvedLifelines)
      const lifelineXs = lifelineArray.map((ll) => ll.x)
      // Padding ngang: 120px mỗi bên để messages không đè lên biên
      const horizontalPadding = 120
      const minX = Math.min(...lifelineXs) - horizontalPadding
      const maxX = Math.max(...lifelineXs) + horizontalPadding

      // Tính Y bounds CHỈ dựa trên messages thuộc fragment
      const messageYs = allFragmentMessages.map((msg) => msg.y)
      const messageMinY = Math.min(...messageYs)
      const messageMaxY = Math.max(...messageYs)
      
      // Padding cho fragment: 
      // - Top: 60px (20px cho label + 40px padding)
      // - Bottom: 30px padding
      const fragmentTopPadding = 60 // Không gian cho label và guard condition
      const fragmentBottomPadding = 30
      
      const minY = messageMinY - fragmentTopPadding
      const maxY = messageMaxY + fragmentBottomPadding

      const baseHeight = Math.max(150, maxY - minY)

      // Khởi tạo fragment chính
      const mainFragment = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: baseHeight,
        totalHeight: baseHeight,
      }

      // Xử lý fragment con - CHÍNH XÁC HƠN
      if (fragment.children && fragment.children.length > 0) {
        // Sắp xếp fragment con theo thứ tự Y
        fragment.children.forEach((child) => {
          const childMessages = child.messages
          if (childMessages.length > 0) {
            child.minY = Math.min(...childMessages.map((m) => m.y))
          } else {
            child.minY = mainFragment.y + 30
          }
        })

        fragment.children.sort((a, b) => a.minY - b.minY)

        let currentY = mainFragment.y + 30

        fragment.children.forEach((child, childIndex) => {
          const childMessages = child.messages

          if (childMessages.length === 0) {
            child.x = mainFragment.x
            child.y = currentY
            child.width = mainFragment.width
            child.height = 60
            currentY += child.height + 10
          } else {
            const childMessageYs = childMessages.map((msg) => msg.y)
            const childMinY = Math.min(...childMessageYs)
            const childMaxY = Math.max(...childMessageYs)
            
            // Padding cho child fragment: 30px top (cho label), 20px bottom
            const childTopPadding = 30
            const childBottomPadding = 20

            child.x = mainFragment.x
            child.y = childMinY - childTopPadding // Đặt đường phân cách phía trên messages với padding
            child.width = mainFragment.width
            child.height = childMaxY - childMinY + childTopPadding + childBottomPadding

            // Cập nhật currentY cho fragment tiếp theo
            currentY = childMaxY + childBottomPadding + 10
          }
        })

        // Điều chỉnh chiều cao tổng của fragment cha nếu cần
        const lastChild = fragment.children[fragment.children.length - 1]
        const lastChildMessages = lastChild.messages
        const lastChildMaxY =
          lastChildMessages.length > 0
            ? Math.max(...lastChildMessages.map((m) => m.y))
            : lastChild.y + lastChild.height

        // Tính lại required height với padding đầy đủ
        const requiredHeight = lastChildMaxY - mainFragment.y + fragmentBottomPadding
        if (requiredHeight > mainFragment.totalHeight) {
          mainFragment.totalHeight = requiredHeight
        }
      }

      return mainFragment
    },

    getAllFragmentMessages(fragment) {
      let messages = [...fragment.messages]
      if (fragment.children) {
        fragment.children.forEach((child) => {
          messages = messages.concat(child.messages)
        })
      }
      return messages
    },

    // Diagram Element Methods
    calculateMessagePath(message) {
      const { source, target, y } = message
      return `M ${source.x} ${y} L ${target.x} ${y}`
    },

    getMessageLabelPosition(message) {
      const { source, target, y } = message
      const midX = (source.x + target.x) / 2
      return { x: midX, y: y - 10 }
    },

    getMessageMarker(type) {
      const markers = {
        sync: 'url(#sync-arrow)',
        async: 'url(#async-arrow)',
        reply: 'url(#reply-arrow)',
      }
      return markers[type] || 'url(#sync-arrow)'
    },

    getFragmentLabel(type) {
      const labels = {
        loop: 'loop',
        alt: 'alt',
        opt: 'opt',
        par: 'par',
        else: 'else',
      }
      return labels[type] || type
    },
    getFragmentMessages(fragment) {
      // Lấy tất cả messages trong fragment (bao gồm cả child fragments)
      let messages = [...(fragment.messages || [])]
      if (fragment.children && fragment.children.length > 0) {
        fragment.children.forEach((child) => {
          messages = messages.concat(child.messages || [])
        })
      }
      return messages
    },
    getFragmentName(fragmentId) {
      if (!fragmentId) return 'Fragment'
      const fragment = this.computedFragments.find((f) => f.id === fragmentId)
      return fragment ? this.getFragmentLabel(fragment.type) : 'Fragment'
    },
    openAddMessageToFragment(fragment) {
      // Mở form để thêm message vào fragment
      this.formModal.visible = true
      this.formModal.type = 'message'
      this.formModal.isEdit = false
      this.formModal.element = null
      this.formModal.hasChanges = false
      this.formModal.data = {
        from: '',
        to: '',
        content: '',
        type: 'sync',
        fragment_id: fragment.id, // Lưu fragment_id để biết message thuộc fragment nào
      }
    },

    getSelectionBounds() {
      if (!this.selectedElement) return { x: 0, y: 0, width: 0, height: 0, rx: 0 }
      if (this.selectedElementType === 'lifeline') {
        return {
          x: this.selectedElement.x - 70,
          y: this.selectedElement.y - 40,
          width: 140,
          height: 80,
          rx: 8,
        }
      } else if (this.selectedElementType === 'message') {
        const { source, target, y } = this.selectedElement
        const minX = Math.min(source.x, target.x)
        const maxX = Math.max(source.x, target.x)
        return {
          x: minX - 10,
          y: y - 15,
          width: maxX - minX + 20,
          height: 30,
          rx: 4,
        }
      }
      return { x: 0, y: 0, width: 0, height: 0, rx: 0 }
    },

    // Virtual Space Management
    updateVirtualSpace() {
      const allElements = [...this.computedLifelines, ...this.computedFragments]
      if (allElements.length === 0) {
        // Nếu không có elements, sử dụng kích thước mặc định đối xứng
        this.virtualSpace.minX = -1000
        this.virtualSpace.maxX = 2200
        this.virtualSpace.minY = -1000
        this.virtualSpace.maxY = 1800
        return
      }

      const bounds = allElements.reduce(
        (acc, element) => ({
          minX: Math.min(acc.minX, element.x - (element.width || 60)),
          maxX: Math.max(acc.maxX, element.x + (element.width || 60)),
          minY: Math.min(acc.minY, element.y - (element.totalHeight || element.height || 30)),
          maxY: Math.max(
            acc.maxY,
            element.y + (element.totalHeight || element.height || 0) || this.virtualSpace.maxY
          ),
        }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
      )

      // Tính toán bounds cho messages (bao gồm cả messages trong fragments)
      this.computedMessages.forEach((message) => {
        bounds.minY = Math.min(bounds.minY, message.y - 30)
        bounds.maxY = Math.max(bounds.maxY, message.y + 30)
      })

      // Tính toán padding động dựa trên số lượng elements và messages
      const elementCount = allElements.length + this.computedMessages.length
      const basePadding = 200
      const dynamicPadding = Math.min(400, basePadding + Math.floor(elementCount / 5) * 50)
      
      // Đặt centerY ở giữa virtual space mặc định để đảm bảo đối xứng
      const targetCenterY = 400 // centerY của virtual space mặc định (1800 - 1000) / 2 = 400
      
      // Tính toán chiều cao cần thiết (đảm bảo đối xứng)
      const contentHeight = bounds.maxY - bounds.minY
      const symmetricHeight = Math.max(contentHeight + dynamicPadding * 2, 1000) // Min height 1000
      
      // Cập nhật virtual space với đối xứng
      this.virtualSpace.minX = Math.min(this.virtualSpace.minX, bounds.minX - dynamicPadding)
      this.virtualSpace.maxX = Math.max(this.virtualSpace.maxX, bounds.maxX + dynamicPadding)
      
      // Đảm bảo đối xứng: centerY luôn ở giữa
      this.virtualSpace.minY = targetCenterY - symmetricHeight / 2
      this.virtualSpace.maxY = targetCenterY + symmetricHeight / 2
      
      // Nếu elements không đối xứng, điều chỉnh để đảm bảo đối xứng
      const topElements = allElements.filter(el => el.y < targetCenterY)
      const bottomElements = allElements.filter(el => el.y > targetCenterY)
      const topMessages = this.computedMessages.filter(msg => msg.y < targetCenterY)
      const bottomMessages = this.computedMessages.filter(msg => msg.y > targetCenterY)
      
      const maxTopDistance = Math.max(
        topElements.length > 0 ? Math.max(...topElements.map(el => targetCenterY - (el.y - (el.totalHeight || el.height || 30)))) : 0,
        topMessages.length > 0 ? Math.max(...topMessages.map(msg => targetCenterY - (msg.y - 30))) : 0
      )
      const maxBottomDistance = Math.max(
        bottomElements.length > 0 ? Math.max(...bottomElements.map(el => (el.y + (el.totalHeight || el.height || 0)) - targetCenterY)) : 0,
        bottomMessages.length > 0 ? Math.max(...bottomMessages.map(msg => (msg.y + 30) - targetCenterY)) : 0
      )
      
      // Đảm bảo khoảng cách trên và dưới bằng nhau
      const maxDistance = Math.max(maxTopDistance, maxBottomDistance, 200)
      this.virtualSpace.minY = targetCenterY - maxDistance - dynamicPadding
      this.virtualSpace.maxY = targetCenterY + maxDistance + dynamicPadding
    },

    centerViewport() {
      const centerX = this.containerWidth / 2 - this.virtualSpace.centerX * this.internalZoom
      const centerY = this.containerHeight / 2 - this.virtualSpace.centerY * this.internalZoom
      this.viewport.x = centerX
      this.viewport.y = centerY
    },

    // Drag and Drop
    startDrag(element, type, event) {
      if (!this.editable || this.previewMode) return
      // Không cho phép drag lifelines ảo
      if (type === 'lifeline' && element.isMirror) return
      event.preventDefault()
      event.stopPropagation()

      this.draggingElement = element
      this.draggingType = type
      const rect = this.$refs.container.getBoundingClientRect()
      const point = this.$el.querySelector('.sequence-svg').createSVGPoint()
      point.x = event.clientX - rect.left
      point.y = event.clientY - rect.top
      const svgPoint = point.matrixTransform(
        this.$el.querySelector('.sequence-svg').getScreenCTM().inverse()
      )

      if (type === 'lifeline') {
        this.dragOffset = {
          x: svgPoint.x - element.x,
          y: svgPoint.y - element.y,
        }
        this.dragPosition = { x: element.x, y: element.y }
      } else if (type === 'message') {
        this.dragOffset = {
          x: 0,
          y: svgPoint.y - element.y,
        }
        this.dragPosition = { x: element.x, y: element.y }
      }

      this.isDragging = true
      this.selectElement(element, type)
      this.initialDragPosition = { x: element.x, y: element.y }
      this.$refs.container.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
    },

    handleMouseMove(event) {
      if (!this.isDragging || !this.draggingElement) return

      const rect = this.$refs.container.getBoundingClientRect()
      const point = this.$el.querySelector('.sequence-svg').createSVGPoint()
      point.x = event.clientX - rect.left
      point.y = event.clientY - rect.top
      const svgPoint = point.matrixTransform(
        this.$el.querySelector('.sequence-svg').getScreenCTM().inverse()
      )

      let newX = this.draggingElement.x
      let newY = this.draggingElement.y

      if (this.draggingType === 'lifeline') {
        newX = svgPoint.x - this.dragOffset.x
        newY = svgPoint.y - this.dragOffset.y
        
        // Cập nhật cả lifeline ảo tương ứng để giữ đối xứng
        if (!this.draggingElement.isMirror) {
          const mirrorId = `mirror-${this.draggingElement.id}`
          const mirrorLifeline = this.computedLifelines.find(ll => ll.id === mirrorId)
          if (mirrorLifeline) {
            mirrorLifeline.x = newX // Giữ nguyên x
            // Y sẽ được tính lại trong computedLifelines dựa trên baseCenterY
          }
        }
      } else if (this.draggingType === 'message') {
        newY = svgPoint.y - this.dragOffset.y
      }

      const safePadding = 20
      newX = Math.max(
        this.virtualSpace.minX + safePadding,
        Math.min(this.virtualSpace.maxX - safePadding, newX)
      )
      newY = Math.max(
        this.virtualSpace.minY + safePadding,
        Math.min(this.virtualSpace.maxY - safePadding, newY)
      )

      this.dragPosition = { x: newX, y: newY }

      if (this.draggingElement) {
        if (this.draggingType === 'lifeline') {
          this.draggingElement.x = newX
          this.draggingElement.y = newY
        } else if (this.draggingType === 'message') {
          this.draggingElement.y = newY
        }

        // Chỉ emit event cho lifelines gốc, không phải lifelines ảo
        if (!this.draggingElement.isMirror) {
          this.showSavingIndicator()
          this.$emit('position-updated', {
            element: this.draggingElement,
            type: this.draggingType,
            position: this.dragPosition,
          })
          this.$emit('element-dragged', {
            element: this.draggingElement,
            type: this.draggingType,
            newPosition: this.dragPosition,
          })
        }
      }
    },

    showSavingIndicator() {
      this.isSaving = true
      this.lastSaved = null
    },

    hideSavingIndicator() {
      this.isSaving = false
      this.lastSaved = new Date()
    },

    getSaveStatusText() {
      if (this.isSaving) {
        return 'Saving...'
      } else if (this.lastSaved) {
        return 'Saved'
      } else {
        return 'No changes'
      }
    },

    formatLastSaved() {
      if (!this.lastSaved) return ''
      const now = new Date()
      const diffMs = now - this.lastSaved
      const diffSec = Math.floor(diffMs / 1000)
      const diffMin = Math.floor(diffSec / 60)
      if (diffSec < 5) return 'just now'
      if (diffSec < 60) return `${diffSec}s ago`
      if (diffMin < 60) return `${diffMin}m ago`
      return this.lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },

    handleMouseUp() {
      if (!this.isDragging || !this.draggingElement) return

      const hasMoved =
        this.initialDragPosition &&
        (Math.abs(this.initialDragPosition.x - this.dragPosition.x) > 1 ||
          Math.abs(this.initialDragPosition.y - this.dragPosition.y) > 1)

      if (hasMoved && this.editable) {
        // Cập nhật position trong _originalData để lưu vào backend
        if (this.draggingElement._originalData) {
          if (!this.draggingElement._originalData.position) {
            this.draggingElement._originalData.position = {}
          }
          if (this.draggingType === 'lifeline') {
            this.draggingElement._originalData.position.x = Math.round(this.dragPosition.x)
            this.draggingElement._originalData.position.y = Math.round(this.dragPosition.y)
          } else if (this.draggingType === 'message') {
            this.draggingElement._originalData.position = { y: Math.round(this.dragPosition.y) }
          }
        }

        if (this.onPositionChange) {
          this.onPositionChange({
            element: this.draggingElement,
            type: this.draggingType,
            position: this.dragPosition,
          })
        }
      }

      this.endDrag()
    },

    handleMouseLeave() {
      this.endDrag()
    },

    endDrag() {
      this.isDragging = false
      this.draggingElement = null
      this.draggingType = null
      this.initialDragPosition = null
      this.$refs.container.style.cursor = 'grab'
      document.body.style.userSelect = ''
    },

    // Viewport Methods
    startPan(event) {
      if (this.previewMode || !this.editable || this.isDragging) return

      this.isPanning = true
      this.panStart = {
        x: event.clientX - this.viewport.x,
        y: event.clientY - this.viewport.y,
      }
      this.$refs.container.style.cursor = 'grabbing'
    },

    handlePan(event) {
      if (!this.isPanning) return

      this.viewport.x = event.clientX - this.panStart.x
      this.viewport.y = event.clientY - this.panStart.y
    },

    endPan() {
      this.isPanning = false
      this.$refs.container.style.cursor = 'grab'
    },

    handleWheel(event) {
      event.preventDefault()

      if (event.ctrlKey) {
        const zoomIntensity = 0.1
        const wheel = event.deltaY < 0 ? 1 : -1
        const zoom = Math.exp(wheel * zoomIntensity)
        const rect = this.$refs.container.getBoundingClientRect()
        const mouseX = event.clientX - rect.left
        const mouseY = event.clientY - rect.top
        const worldX = (mouseX - this.viewport.x) / this.internalZoom
        const worldY = (mouseY - this.viewport.y) / this.internalZoom

        this.internalZoom = Math.max(0.1, Math.min(5, this.internalZoom * zoom))
        this.$emit('zoom-changed', this.internalZoom)

        this.viewport.x = mouseX - worldX * this.internalZoom
        this.viewport.y = mouseY - worldY * this.internalZoom
      } else {
        this.viewport.x -= event.deltaX * 0.5
        this.viewport.y -= event.deltaY * 0.5
      }
    },

    // Zoom and View Methods
    zoomIn() {
      this.internalZoom = Math.min(5, this.internalZoom + 0.1)
      this.$emit('zoom-changed', this.internalZoom)
    },

    zoomOut() {
      this.internalZoom = Math.max(0.1, this.internalZoom - 0.1)
      this.$emit('zoom-changed', this.internalZoom)
    },

    resetZoom() {
      this.internalZoom = 1
      this.centerViewport()
      this.$emit('zoom-changed', this.internalZoom)
    },

    fitToViewport() {
      const allElements = [...this.computedLifelines, ...this.computedFragments]
      if (allElements.length === 0) return

      // Đảm bảo virtualSpace được cập nhật trước
      this.updateVirtualSpace()

      // Sử dụng virtualSpace bounds để đảm bảo đối xứng
      const contentWidth = this.virtualSpace.width
      const contentHeight = this.virtualSpace.height

      const scaleX = this.containerWidth / contentWidth
      const scaleY = this.containerHeight / contentHeight

      this.internalZoom = Math.min(scaleX, scaleY, 1)
      this.viewport.x = -this.virtualSpace.minX * this.internalZoom + (this.containerWidth - contentWidth * this.internalZoom) / 2
      this.viewport.y = -this.virtualSpace.minY * this.internalZoom + (this.containerHeight - contentHeight * this.internalZoom) / 2
      this.$emit('zoom-changed', this.internalZoom)
    },

    // Selection Methods
    selectElement(element, type) {
      if (this.isDragging) return

      this.selectedElement = element
      this.selectedElementType = type
      this.$emit('element-selected', { element, type })
    },

    handleSvgClick(event) {
      if (event.target.tagName === 'svg') {
        this.selectedElement = null
        this.selectedElementType = null
        this.$emit('element-selected', null)
      }
    },

    clearSelection() {
      this.selectedElement = null
      this.selectedElementType = null
    },

    onSaveComplete(success = true) {
      if (success) {
        this.hideSavingIndicator()
      } else {
        this.isSaving = false
        this.lastSaved = null
      }
    },

    onSaveStart() {
      this.showSavingIndicator()
    },

    // Preview Generation Methods
    async generatePreviewImage() {
      return new Promise((resolve) => {
        setTimeout(async () => {
          try {
            const allElements = [...this.computedLifelines, ...this.computedFragments]
            if (allElements.length === 0) {
              resolve(null)
              return
            }

            const bounds = allElements.reduce(
              (acc, element) => ({
                minX: Math.min(acc.minX, element.x - (element.width || 60)),
                maxX: Math.max(acc.maxX, element.x + (element.width || 60)),
                minY: Math.min(acc.minY, element.y - (element.totalHeight || element.height || 30)),
                maxY: Math.max(
                  acc.maxY,
                  element.y + (element.totalHeight || element.height || 0) || this.virtualSpace.maxY
                ),
              }),
              { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
            )

            this.computedMessages.forEach((message) => {
              bounds.minY = Math.min(bounds.minY, message.y - 20)
              bounds.maxY = Math.max(bounds.maxY, message.y + 20)
            })

            const padding = 80
            const contentWidth = Math.max(bounds.maxX - bounds.minX + padding * 2, 400)
            const contentHeight = Math.max(bounds.maxY - bounds.minY + padding * 2, 300)
            const svgString = this.generateExportSVG(bounds, padding, contentWidth, contentHeight)
            const svgData = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`

            const img = new Image()
            img.onload = () => {
              const canvas = document.createElement('canvas')
              const ctx = canvas.getContext('2d')
              const scale = 1
              canvas.width = contentWidth * scale
              canvas.height = contentHeight * scale
              ctx.scale(scale, scale)
              ctx.fillStyle = 'white'
              ctx.fillRect(0, 0, contentWidth, contentHeight)
              ctx.drawImage(img, 0, 0, contentWidth, contentHeight)
              const base64 = canvas.toDataURL('image/png', 0.8)
              resolve(base64)
            }
            img.onerror = () => resolve(null)
            img.src = svgData
          } catch (error) {
            console.error('Error generating preview image:', error)
            resolve(null)
          }
        }, 100)
      })
    },

    generateExportSVG(bounds, padding, contentWidth, contentHeight) {
      const viewBox = `${bounds.minX - padding} ${
        bounds.minY - padding
      } ${contentWidth} ${contentHeight}`

      return `
<svg xmlns="http://www.w3.org/2000/svg" width="${contentWidth}" height="${contentHeight}" viewBox="${viewBox}">
  <defs>
    <marker id="sync-arrow-preview" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
    </marker>
    <marker id="async-arrow-preview" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#8b5cf6" />
    </marker>
    <marker id="reply-arrow-preview" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
    </marker>
  </defs>
  
  <!-- Background trắng -->
  <rect x="${bounds.minX - padding}" y="${
        bounds.minY - padding
      }" width="${contentWidth}" height="${contentHeight}" fill="white" />
  
  <!-- Render Fragments Hierarchy -->
  ${this.computedFragments
    .map(
      (fragment) => `
    <!-- Main Fragment -->
    <g>
      <rect x="${fragment.x}" y="${fragment.y}" width="${fragment.width}" height="${
        fragment.totalHeight
      }" fill="none" stroke="#6b7280" stroke-width="1" stroke-dasharray="5,5" />
      <text x="${fragment.x + 10}" y="${
        fragment.y + 20
      }" font-size="12" font-weight="600" fill="#374151">${this.getFragmentLabel(
        fragment.type
      )}</text>
      ${
        fragment.guard_condition
          ? `<text x="${fragment.x + 10}" y="${fragment.y + 40}" font-size="10" fill="#6b7280">[${
              fragment.guard_condition
            }]</text>`
          : ''
      }
      
      ${fragment.messages
        .map((message) => {
          const path = this.calculateMessagePath(message)
          const marker = this.getMessageMarker(message.type).replace('-arrow', '-arrow-preview')
          const strokeColor = this.getMessageColor(message.type)
          const labelPos = this.getMessageLabelPosition(message)
          return `
          <path d="${path}" stroke="${strokeColor}" stroke-width="2" fill="none" marker-end="${marker}" />
          <text x="${labelPos.x}" y="${labelPos.y}" font-size="12" fill="#374151" text-anchor="middle" dominant-baseline="middle">${message.content}</text>
          `
        })
        .join('')}
      
      <!-- Child Fragments -->
      ${fragment.children
        .map(
          (child) => `
        <g>
          <line x1="${child.x}" y1="${child.y}" x2="${child.x + child.width}" y2="${
            child.y
          }" stroke="#6b7280" stroke-width="1" stroke-dasharray="3,3" />
          <text x="${child.x + 10}" y="${
            child.y + 15
          }" font-size="11" font-weight="600" fill="#374151">${this.getFragmentLabel(
            child.type
          )}</text>
          ${
            child.guard_condition
              ? `<text x="${child.x + 10}" y="${child.y + 35}" font-size="9" fill="#6b7280">[${
                  child.guard_condition
                }]</text>`
              : ''
          }
          ${child.messages
            .map((message) => {
              const path = this.calculateMessagePath(message)
              const marker = this.getMessageMarker(message.type).replace('-arrow', '-arrow-preview')
              const strokeColor = this.getMessageColor(message.type)
              const labelPos = this.getMessageLabelPosition(message)
              return `
              <path d="${path}" stroke="${strokeColor}" stroke-width="2" fill="none" marker-end="${marker}" />
              <text x="${labelPos.x}" y="${labelPos.y}" font-size="12" fill="#374151" text-anchor="middle" dominant-baseline="middle">${message.content}</text>
              `
            })
            .join('')}
        </g>
      `
        )
        .join('')}
    </g>
  `
    )
    .join('')}
  
  <!-- Render Lifelines -->
  ${this.computedLifelines
    .map(
      (lifeline) => `
    <g>
      <rect x="${lifeline.x - 60}" y="${
        lifeline.y - 30
      }" width="120" height="60" rx="8" fill="white" stroke="#374151" stroke-width="2" />
      <text x="${lifeline.x}" y="${
        lifeline.y
      }" font-size="14" font-weight="600" fill="#1f2937" text-anchor="middle" dominant-baseline="middle">${
        lifeline.name
      }</text>
      <line x1="${lifeline.x}" y1="${lifeline.y + 30}" x2="${lifeline.x}" y2="${
        bounds.maxY - padding
      }" stroke="#374151" stroke-width="2" stroke-dasharray="5,5" />
    </g>
  `
    )
    .join('')}
  
  <!-- Render Messages không thuộc fragment -->
  ${this.rootMessages
    .map((message) => {
      const path = this.calculateMessagePath(message)
      const marker = this.getMessageMarker(message.type).replace('-arrow', '-arrow-preview')
      const strokeColor = this.getMessageColor(message.type)
      const labelPos = this.getMessageLabelPosition(message)
      return `
      <path d="${path}" stroke="${strokeColor}" stroke-width="2" fill="none" marker-end="${marker}" />
      <text x="${labelPos.x}" y="${labelPos.y}" font-size="12" fill="#374151" text-anchor="middle" dominant-baseline="middle">${message.content}</text>
      `
    })
    .join('')}
</svg>`
    },

    getMessageColor(type) {
      const colors = {
        sync: '#3b82f6',
        async: '#8b5cf6',
        reply: '#10b981',
      }
      return colors[type] || '#374151'
    },

    regeneratePreview() {
      this.previewGenerated = false
      if (this.autoGeneratePreview) {
        this.generatePreviewImage().then((previewData) => {
          if (previewData) {
            this.$emit('preview-generated', previewData)
            this.previewGenerated = true
          }
        })
      }
    },

    // Export Methods
    async exportAsPNG() {
      try {
        this.isExporting = true
        const allElements = [...this.computedLifelines, ...this.computedFragments]
        if (allElements.length === 0) {
          alert('No content to export!')
          return
        }

        const bounds = allElements.reduce(
          (acc, element) => ({
            minX: Math.min(acc.minX, element.x - (element.width || 60)),
            maxX: Math.max(acc.maxX, element.x + (element.width || 60)),
            minY: Math.min(acc.minY, element.y - (element.totalHeight || element.height || 30)),
            maxY: Math.max(
              acc.maxY,
              element.y + (element.totalHeight || element.height || 0) || this.virtualSpace.maxY
            ),
          }),
          { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
        )

        this.computedMessages.forEach((message) => {
          bounds.minY = Math.min(bounds.minY, message.y - 20)
          bounds.maxY = Math.max(bounds.maxY, message.y + 20)
        })

        const padding = 100
        const contentWidth = Math.max(bounds.maxX - bounds.minX + padding * 2, 800)
        const contentHeight = Math.max(bounds.maxY - bounds.minY + padding * 2, 600)
        const svgString = this.generateExportSVG(bounds, padding, contentWidth, contentHeight)
        const svgData = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`

        const img = new Image()
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = contentWidth
        canvas.height = contentHeight
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, contentWidth, contentHeight)

        return new Promise((resolve, reject) => {
          img.onload = () => {
            try {
              ctx.drawImage(img, 0, 0, contentWidth, contentHeight)
              canvas.toBlob(
                (blob) => {
                  if (!blob) {
                    reject(new Error('Could not create blob from canvas'))
                    return
                  }
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `sequence-diagram-${new Date().getTime()}.png`
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                  resolve()
                },
                'image/png',
                1.0
              )
            } catch (error) {
              console.error('Error drawing image:', error)
              reject(error)
            }
          }
          img.onerror = (error) => {
            console.error('Error loading SVG:', error)
            reject(new Error('Could not load SVG for export.'))
          }
          img.src = svgData
        })
      } catch (err) {
        console.error('Error exporting PNG:', err)
        alert('Error exporting PNG: ' + err.message)
      } finally {
        this.isExporting = false
      }
    },

    exportAsSVG() {
      const allElements = [...this.computedLifelines, ...this.computedFragments]
      if (allElements.length === 0) {
        alert('No content to export!')
        return
      }

      const bounds = allElements.reduce(
        (acc, element) => ({
          minX: Math.min(acc.minX, element.x - (element.width || 60)),
          maxX: Math.max(acc.maxX, element.x + (element.width || 60)),
          minY: Math.min(acc.minY, element.y - (element.totalHeight || element.height || 30)),
          maxY: Math.max(
            acc.maxY,
            element.y + (element.totalHeight || element.height || 0) || this.virtualSpace.maxY
          ),
        }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
      )

      this.computedMessages.forEach((message) => {
        bounds.minY = Math.min(bounds.minY, message.y - 20)
        bounds.maxY = Math.max(bounds.maxY, message.y + 20)
      })

      const padding = 100
      const contentWidth = Math.max(bounds.maxX - bounds.minX + padding * 2, 800)
      const contentHeight = Math.max(bounds.maxY - bounds.minY + padding * 2, 600)
      const svgContent = this.generateExportSVG(bounds, padding, contentWidth, contentHeight)
      const blob = new Blob([svgContent], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sequence-diagram-${new Date().getTime()}.svg`
      a.click()
      URL.revokeObjectURL(url)
    },

    // Fullscreen Methods
    toggleFullscreen() {
      if (!this.isFullscreen) this.enterFullscreen()
      else this.exitFullscreen()
    },

    enterFullscreen() {
      const element = this.$el
      if (element.requestFullscreen) element.requestFullscreen()
      else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen()
      else if (element.msRequestFullscreen) element.msRequestFullscreen()
    },

    exitFullscreen() {
      if (document.exitFullscreen) document.exitFullscreen()
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
      else if (document.msExitFullscreen) document.msExitFullscreen()
    },

    setupFullscreenListener() {
      document.addEventListener('fullscreenchange', this.handleFullscreenChange)
      document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange)
      document.addEventListener('msfullscreenchange', this.handleFullscreenChange)
    },

    cleanupFullscreenListener() {
      document.removeEventListener('fullscreenchange', this.handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange)
      document.removeEventListener('msfullscreenchange', this.handleFullscreenChange)
    },

    handleFullscreenChange() {
      this.isFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      )
    },

    // Utility Methods
    setupEventListeners() {
      document.addEventListener('mousemove', this.handleMouseMove)
      document.addEventListener('mouseup', this.handleMouseUp)
    },

    removeEventListeners() {
      document.removeEventListener('mousemove', this.handleMouseMove)
      document.removeEventListener('mouseup', this.handleMouseUp)
    },

    setupKeyboardShortcuts() {
      document.addEventListener('keydown', (event) => {
        if (event.ctrlKey || event.metaKey) {
          switch (event.key) {
            case '=':
            case '+':
              event.preventDefault()
              this.zoomIn()
              break
            case '-':
              event.preventDefault()
              this.zoomOut()
              break
            case '0':
              event.preventDefault()
              this.resetZoom()
              break
            case 'f':
              event.preventDefault()
              this.fitToViewport()
              break
          }
        }
        if (event.key === 'F11') {
          event.preventDefault()
          this.toggleFullscreen()
        }
        switch (event.key) {
          case 'Escape':
            this.clearSelection()
            if (this.managementModal.visible) {
              this.closeManagementModal()
            } else if (this.formModal.visible) {
              this.closeFormModal()
            } else if (this.isFullscreen) {
              this.exitFullscreen()
            }
            break
        }
      })
    },

    // Management Modal Methods
    showManagementModal() {
      this.managementModal.visible = true
      this.managementModal.activeTab = 'lifelines'
      this.managementModal.hasChanges = false
    },
    closeManagementModal() {
      if (this.managementModal.hasChanges) {
        this.$emit('diagram-updated')
      }
      this.managementModal.visible = false
      this.managementModal.hasChanges = false
    },
    getTabCount(tabId) {
      switch (tabId) {
        case 'lifelines':
          return this.computedLifelines.filter(ll => !ll.isMirror).length
        case 'messages':
          return this.computedMessages.length
        case 'fragments':
          return this.computedFragments.length
        default:
          return 0
      }
    },
    openCreateForm(type) {
      this.formModal.visible = true
      this.formModal.type = type
      this.formModal.isEdit = false
      this.formModal.element = null
      this.formModal.hasChanges = false
      this.formModal.data = {
        name: '',
        description: '',
        from: '',
        to: '',
        content: '',
        type: 'sync',
        guard_condition: '',
        fragment_id: null,
      }
    },
    openEditForm(type, element) {
      this.formModal.visible = true
      this.formModal.type = type
      this.formModal.isEdit = true
      this.formModal.element = element
      this.formModal.hasChanges = false

      if (type === 'lifeline') {
        this.formModal.data = {
          name: element.name || '',
          description: element.description || '',
        }
      } else if (type === 'message') {
        const fromId = element.source?._id || element.source?.id || element.source_lifeline_id
        const toId = element.target?._id || element.target?.id || element.target_lifeline_id
        this.formModal.data = {
          from: this.normalizeId(fromId) || '',
          to: this.normalizeId(toId) || '',
          content: element.content || '',
          type: element.type || 'sync',
          fragment_id: element.fragment_id || null,
        }
      } else if (type === 'fragment') {
        this.formModal.data = {
          type: element.type || 'opt',
          guard_condition: element.guard_condition || '',
        }
      }
    },
    closeFormModal() {
      if (this.formModal.hasChanges) {
        this.$emit('diagram-updated')
        this.managementModal.hasChanges = true
      }
      this.formModal.visible = false
      this.formModal.element = null
      this.formModal.hasChanges = false
    },
    async saveForm() {
      const diagramId = this.diagramId || this.diagramData?.id || this.diagramData?._id
      if (!diagramId) {
        alert('Diagram ID not found')
        return
      }

      if (this.isCrudLoading) return

      try {
        this.isCrudLoading = true
        this.showSavingIndicator()

        if (this.formModal.type === 'lifeline') {
          if (!this.formModal.data.name.trim()) {
            alert('Lifeline name is required')
            this.isCrudLoading = false
            this.hideSavingIndicator()
            return
          }
          if (this.formModal.isEdit) {
            await updateLifeline(String(diagramId), String(this.formModal.element.id), {
              name: this.formModal.data.name,
              description: this.formModal.data.description || '',
            })
          } else {
            // Note: Creating lifelines might need special handling
            alert('Creating new lifelines is not yet supported via API')
            this.isCrudLoading = false
            this.hideSavingIndicator()
            return
          }
        } else if (this.formModal.type === 'message') {
          if (!this.formModal.data.from || !this.formModal.data.to || !this.formModal.data.content) {
            alert('From, To, and Content are required')
            this.isCrudLoading = false
            this.hideSavingIndicator()
            return
          }
          const messageData = {
            source_lifeline_id: this.formModal.data.from,
            target_lifeline_id: this.formModal.data.to,
            content: this.formModal.data.content,
            type: this.formModal.data.type,
          }
          // Nếu có fragment_id, thêm vào message data
          if (this.formModal.data.fragment_id) {
            messageData.fragment_id = this.formModal.data.fragment_id
          }
          if (this.formModal.isEdit) {
            await updateMessage(String(diagramId), String(this.formModal.element.id), messageData)
          } else {
            await createMessage(String(diagramId), messageData)
          }
        } else if (this.formModal.type === 'fragment') {
          if (!this.formModal.data.type) {
            alert('Fragment type is required')
            this.isCrudLoading = false
            this.hideSavingIndicator()
            return
          }
          if (this.formModal.isEdit) {
            await updateFragment(String(diagramId), String(this.formModal.element.id), {
              type: this.formModal.data.type,
              guard_condition: this.formModal.data.guard_condition || '',
            })
          } else {
            await createFragment(String(diagramId), {
              type: this.formModal.data.type,
              guard_condition: this.formModal.data.guard_condition || '',
            })
          }
        }

        // Fetch updated diagram data
        const response = await getSequenceDiagramById(String(diagramId))
        const updatedDiagram = response?.data?.data || response?.data

        this.formModal.hasChanges = true
        this.managementModal.hasChanges = true

        if (updatedDiagram) {
          this.$emit('diagram-updated', updatedDiagram)
        } else {
          this.$emit('diagram-updated')
        }

        this.closeFormModal()
        this.hideSavingIndicator()
        this.isCrudLoading = false
      } catch (error) {
        console.error('Error saving:', error)
        alert('Failed to save: ' + (error.response?.data?.message || error.message))
        this.hideSavingIndicator()
        this.isCrudLoading = false
      }
    },
    async confirmDelete(type, element) {
      if (!confirm(`Are you sure you want to delete this ${type}?`)) {
        return
      }

      const diagramId = this.diagramId || this.diagramData?.id || this.diagramData?._id
      if (!diagramId) {
        alert('Diagram ID not found')
        return
      }

      if (this.isCrudLoading || this.deletingElementId) return

      try {
        this.deletingElementId = element.id
        this.isCrudLoading = true
        this.showSavingIndicator()

        if (type === 'lifeline') {
          await deleteLifeline(String(diagramId), String(element.id))
        } else if (type === 'message') {
          await deleteMessage(String(diagramId), String(element.id))
        } else if (type === 'fragment') {
          await deleteFragment(String(diagramId), String(element.id))
        }

        // Fetch updated diagram data
        const response = await getSequenceDiagramById(String(diagramId))
        const updatedDiagram = response?.data?.data || response?.data

        this.managementModal.hasChanges = true

        if (updatedDiagram) {
          this.$emit('diagram-updated', updatedDiagram)
        } else {
          this.$emit('diagram-updated')
        }

        this.hideSavingIndicator()
        this.isCrudLoading = false
        this.deletingElementId = null
      } catch (error) {
        console.error('Error deleting:', error)
        alert('Failed to delete: ' + (error.response?.data?.message || error.message))
        this.hideSavingIndicator()
        this.isCrudLoading = false
        this.deletingElementId = null
      }
    },
  },
}
</script>

<style scoped>
.sequence-diagram-renderer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
  user-select: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(226, 232, 240, 0.8);
}
.sequence-diagram-renderer.preview-mode {
  border: 1px solid #e5e7eb;
}
.sequence-diagram-renderer.editable-mode {
  border: 2px dashed #d1d5db;
}
.sequence-diagram-renderer.fullscreen-mode {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  border-radius: 0;
}
.sequence-diagram-renderer.hidden-renderer {
  opacity: 0;
  pointer-events: none;
  position: absolute;
  width: 100%;
  height: 100%;
}

/* Toolbar */
.toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%);
  backdrop-filter: blur(12px);
  border-bottom: 2px solid rgba(226, 232, 240, 0.8);
  z-index: 100;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.toolbar-group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 12px;
  border: 1.5px solid #e2e8f0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}
.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  background: transparent;
  border-radius: 10px;
  cursor: pointer;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}
.toolbar-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(26, 54, 93, 0.1), transparent);
  transition: left 0.5s;
}
.toolbar-btn:hover:not(:disabled)::before {
  left: 100%;
}
.toolbar-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #1a365d 0%, #2d4a8a 100%);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(26, 54, 93, 0.2);
}
.toolbar-btn:active:not(:disabled) {
  transform: translateY(0);
}
.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.zoom-display {
  min-width: 56px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: #1a365d;
  padding: 4px 8px;
  background: linear-gradient(135deg, #e6f2ff 0%, #dbeafe 100%);
  border-radius: 8px;
  border: 1px solid rgba(26, 54, 93, 0.1);
}

/* Main Container */
.sequence-container {
  flex: 1;
  overflow: hidden;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #f8fafc 100%);
  position: relative;
  cursor: grab;
}
.sequence-container:active {
  cursor: grabbing;
}
.sequence-svg {
  display: block;
  transition: transform 0.1s ease;
}

/* Status Bar */
.status-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%);
  backdrop-filter: blur(12px);
  border-top: 2px solid rgba(226, 232, 240, 0.8);
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.05);
}
.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  transition: all 0.3s ease;
}
.status-item:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
}
.status-item.spacer {
  flex: 1;
  background: transparent;
}
.status-item.spacer:hover {
  transform: none;
}

/* Lifeline Styles */
.lifeline-header {
  fill: white;
  stroke: #374151;
  stroke-width: 2;
}
.lifeline-name {
  font-size: 14px;
  font-weight: 600;
  fill: #1f2937;
}
.lifeline-line {
  stroke: #374151;
  stroke-width: 2;
  stroke-dasharray: 5, 5;
}

/* Message Styles */
.message-line {
  stroke-width: 2;
  fill: none;
}
.message-sync {
  stroke: #3b82f6;
}
.message-async {
  stroke: #8b5cf6;
}
.message-reply {
  stroke: #10b981;
}
.message-label {
  font-size: 12px;
  fill: #374151;
  font-weight: 500;
}

/* Fragment Styles */
.fragment-rect {
  fill: none;
  stroke: #6b7280;
  stroke-width: 1;
  stroke-dasharray: 5, 5;
}
.fragment-alt {
  stroke: #ef4444;
}
.fragment-loop {
  stroke: #f59e0b;
}
.fragment-opt {
  stroke: #10b981;
}
.fragment-else {
  stroke: #6b7280;
}
.fragment-label {
  font-size: 12px;
  fill: #374151;
  font-weight: 600;
}
.child-fragment-label {
  font-size: 11px;
  font-weight: 600;
}
.fragment-condition {
  font-size: 10px;
  fill: #6b7280;
}
.child-fragment-condition {
  font-size: 9px;
}
.fragment-divider {
  stroke: #6b7280;
  stroke-width: 1;
  stroke-dasharray: 3, 3;
}

/* Canvas Boundary */
.canvas-boundary {
  pointer-events: none;
}

/* Selection and Drag Styles */
.selection-highlight {
  fill: none;
  stroke: #f59e0b;
  stroke-width: 2;
  stroke-dasharray: 4, 4;
  pointer-events: none;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}
.lifeline-group.selected .lifeline-header {
  stroke: #f59e0b;
  stroke-width: 3;
}
.message-group.selected .message-line {
  stroke-width: 3;
}
.drag-preview-element {
  opacity: 0.7;
  stroke: #6b7280;
  stroke-dasharray: 4, 4;
  fill: none;
}

/* Auto Save Status Styles */
.auto-save-status {
  margin-left: auto;
  border: none !important;
  background: transparent !important;
}
.save-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
  min-width: 120px;
}
.save-indicator .icon {
  font-size: 16px;
  transition: all 0.3s ease;
}
.save-indicator.saving {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}
.save-indicator.saving .icon {
  animation: spin 1s linear infinite;
  color: #f59e0b;
}
.save-indicator.saved {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}
.save-indicator.saved .icon {
  color: #10b981;
}
.save-indicator:not(.saving):not(.saved) {
  color: #6b7280;
}
.save-text {
  font-weight: 600;
}
.save-time {
  font-size: 11px;
  opacity: 0.8;
  margin-left: 4px;
}
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
.save-indicator.saving {
  animation: pulse 1.5s ease-in-out infinite;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    gap: 8px;
    padding: 8px;
  }
  .toolbar-left {
    width: 100%;
    justify-content: center;
  }
  .status-bar {
    flex-wrap: wrap;
    gap: 8px;
  }
  .toolbar-btn {
    font-size: 11px;
    padding: 4px 8px;
  }
  .auto-save-status {
    display: none;
  }
}

/* Fullscreen specific styles */
:fullscreen .sequence-diagram-renderer,
:-webkit-full-screen .sequence-diagram-renderer,
:-moz-full-screen .sequence-diagram-renderer,
:-ms-fullscreen .sequence-diagram-renderer {
  border-radius: 0;
}

/* Management Modal Styles */
.management-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.management-modal-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: modalSlideIn 0.3s ease;
}

.management-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 2px solid #e5e7eb;
}

.management-modal-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

.modal-close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  color: #6b7280;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.management-tabs {
  display: flex;
  gap: 4px;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.tab-btn.active {
  background: white;
  color: #1a365d;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tab-count {
  font-size: 12px;
  opacity: 0.7;
}

.management-tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.tab-panel {
  animation: fadeIn 0.2s ease;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.btn-add-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-add-item:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.item-card:hover {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: #d1d5db;
}

.item-info {
  flex: 1;
}

.item-name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.item-description {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.4;
}

.item-meta {
  margin-top: 4px;
}

.message-type {
  padding: 2px 8px;
  background: #e0e7ff;
  color: #6366f1;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.item-actions {
  display: flex;
  gap: 8px;
}

.btn-edit,
.btn-delete {
  padding: 8px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-edit {
  background: #eff6ff;
  color: #3b82f6;
}

.btn-edit:hover {
  background: #dbeafe;
}

.btn-delete {
  background: #fef2f2;
  color: #ef4444;
}

.btn-delete:hover {
  background: #fee2e2;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
}

.empty-state .material-symbols-outlined {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.empty-state-small {
  text-align: center;
  padding: 20px;
  color: #9ca3af;
  font-size: 13px;
}

.empty-state-small .material-symbols-outlined {
  font-size: 24px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.message-section {
  margin-bottom: 32px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
}

.section-title .material-symbols-outlined {
  font-size: 20px;
}

.fragment-card {
  border-left: 4px solid #6366f1;
}

.fragment-messages-info {
  margin-top: 8px;
  font-size: 13px;
  color: #6b7280;
  display: flex;
  align-items: center;
}

.fragment-messages-list {
  margin-top: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.fragment-message-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  margin-bottom: 4px;
  background: white;
  border-radius: 6px;
  font-size: 13px;
}

.fragment-message-item:last-child {
  margin-bottom: 0;
}

.message-arrow {
  color: #6366f1;
  font-weight: bold;
}

.message-content {
  flex: 1;
  color: #374151;
}

.message-type-badge {
  padding: 2px 6px;
  background: #e0e7ff;
  color: #6366f1;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.fragment-no-messages {
  margin-top: 8px;
  padding: 8px;
  background: #fef3c7;
  border-radius: 6px;
  display: flex;
  align-items: center;
  color: #92400e;
  font-size: 12px;
}

.btn-add-message {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
  background: #dbeafe;
  color: #3b82f6;
  font-size: 12px;
  font-weight: 500;
}

.btn-add-message:hover {
  background: #bfdbfe;
}

.info-badge {
  padding: 12px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1e40af;
  font-size: 13px;
  margin-bottom: 16px;
}

.info-badge .material-symbols-outlined {
  font-size: 18px;
}

/* Form Modal Styles */
.form-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  backdrop-filter: blur(4px);
}

.form-modal-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalSlideIn 0.3s ease;
}

.form-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.form-modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.form-modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
}

.btn-secondary {
  padding: 10px 20px;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.btn-primary {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #1a365d 0%, #2d4a8a 100%);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #2d4a8a 0%, #3d5a9a 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(26, 54, 93, 0.2);
}

.btn-primary:disabled,
.btn-secondary:disabled,
.btn-add-item:disabled,
.btn-edit:disabled,
.btn-delete:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.spinning {
  animation: spin 1s linear infinite;
}

.btn-manage {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
  border: none;
}

.btn-manage:hover {
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>