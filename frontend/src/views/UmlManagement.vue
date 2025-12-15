<template>
  <div class="uml-management-view">
    <div class="uml-content">
      <!-- Header với Actions -->
      <div class="content-header">
        <div class="header-left">
          <!-- <h2>UML Diagram Management</h2>
          <p class="subtitle">Manage and visualize your system diagrams</p> -->
        </div>
        <div class="header-actions">
          <button class="btn-secondary" @click="refreshDiagrams">
            <span class="material-symbols-outlined">refresh</span>
            Refresh
          </button>
          <button class="btn-primary" @click="generateNewDiagram">
            <span class="material-symbols-outlined">auto_awesome</span>
            Generate Diagram
          </button>
          <!-- <button class="btn-secondary" @click="openManualEditor">
            <span class="material-symbols-outlined">draw</span>
            Create Manually
          </button> -->
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading diagrams...</p>
      </div>

      <!-- Diagrams Display - 3 loại diagram trên 3 hàng -->
      <div v-else class="diagrams-display">
        <!-- Use Case Diagrams Section -->
        <div class="diagram-section">
          <div class="section-header">
            <div class="section-title">
              <h3>Use Case Diagrams</h3>
              <span class="diagram-count">({{ usecaseDiagrams.length }})</span>
            </div>
            <div class="section-controls">
              <div class="search-box">
                <span class="material-symbols-outlined search-icon">search</span>
                <input
                  v-model="searchFilters.usecase"
                  type="text"
                  placeholder="Search use case diagrams..."
                  class="search-input"
                />
              </div>
              <div class="filter-controls">
                <div class="filter-dropdown">
                  <button 
                    class="filter-icon-btn" 
                    @click.stop="toggleSortDropdown('usecase')"
                    :title="getSortLabel(globalSortFilter)"
                  >
                    <span class="material-symbols-outlined">sort</span>
                  </button>
                  <div 
                    v-if="activeSortDropdown === 'usecase'" 
                    class="filter-dropdown-menu"
                    @click.stop
                  >
                    <button 
                      class="filter-option" 
                      :class="{ active: globalSortFilter === 'name' }"
                      @click="setSortFilter('name')"
                    >
                      <span class="material-symbols-outlined">text_fields</span>
                      Sort by Name
                    </button>
                    <button 
                      class="filter-option" 
                      :class="{ active: globalSortFilter === 'date' }"
                      @click="setSortFilter('date')"
                    >
                      <span class="material-symbols-outlined">schedule</span>
                      Sort by Date
                    </button>
                    <button 
                      class="filter-option" 
                      :class="{ active: globalSortFilter === 'created' }"
                      @click="setSortFilter('created')"
                    >
                      <span class="material-symbols-outlined">calendar_today</span>
                      Sort by Created Date
                    </button>
                    <button 
                      class="filter-option" 
                      :class="{ active: globalSortFilter === 'actors' }"
                      @click="setSortFilter('actors')"
                    >
                      <span class="material-symbols-outlined">person</span>
                      Sort by Actors
                    </button>
                    <button 
                      class="filter-option" 
                      :class="{ active: globalSortFilter === 'usecases' }"
                      @click="setSortFilter('usecases')"
                    >
                      <span class="material-symbols-outlined">task</span>
                      Sort by Use Cases
                    </button>
                  </div>
                </div>
                <div class="filter-dropdown">
                  <button 
                    class="filter-icon-btn" 
                    @click.stop="toggleLangDropdown('usecase')"
                    :title="getLangLabel(languageFilters.usecase)"
                  >
                    <span class="material-symbols-outlined">language</span>
                  </button>
                  <div 
                    v-if="activeLangDropdown === 'usecase'" 
                    class="filter-dropdown-menu"
                    @click.stop
                  >
                    <button 
                      class="filter-option" 
                      :class="{ active: languageFilters.usecase === 'all' }"
                      @click="setLangFilter('usecase', 'all')"
                    >
                      <span class="material-symbols-outlined">public</span>
                      All Languages
                    </button>
                    <button 
                      class="filter-option" 
                      :class="{ active: languageFilters.usecase === 'en-US' }"
                      @click="setLangFilter('usecase', 'en-US')"
                    >
                      <span class="material-symbols-outlined">flag</span>
                      English
                    </button>
                    <button 
                      class="filter-option" 
                      :class="{ active: languageFilters.usecase === 'vi-VN' }"
                      @click="setLangFilter('usecase', 'vi-VN')"
                    >
                      <span class="material-symbols-outlined">flag</span>
                      Vietnamese
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="diagrams-scroll-container-wrapper">
            <!-- Scroll Arrow Left -->
            <button 
              v-if="scrollStates.usecase.canScrollLeft"
              class="scroll-arrow scroll-arrow-left" 
              @click="scrollDiagrams('usecase', 'left')"
            >
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            
            <div class="diagrams-scroll-container" ref="usecaseScrollContainer">
              <div class="diagrams-scroll-content" ref="usecaseScrollContent">

                <div
                  v-for="diagram in filteredUsecaseDiagrams"
                  :key="diagram.id || diagram._id"
                  class="diagram-card"
                  @click="editDiagram(diagram)"
                >
                  <div class="diagram-preview">
                    <img
                      v-if="diagram.previewImage"
                      :src="diagram.previewImage"
                      :alt="diagram.name || 'Use Case Diagram'"
                      class="preview-image"
                      @load="onPreviewImageLoad"
                      @error="onPreviewImageError(diagram, $event)"
                    />
                    <div v-else class="generating-preview">
                      <div class="loading-spinner-small"></div>
                      <span>Generating preview...</span>
                    </div>
                    <!-- Luôn render renderer để có thể export, ẩn khi đã có previewImage -->
                    <div class="preview-generator" :class="{ 'hidden-renderer': diagram.previewImage }">
                      <UCDRenderer
                        :ref="`previewGenerator_${diagram.id || diagram._id}`"
                        :diagram-data="diagram"
                        :preview-mode="true"
                        :auto-generate-preview="!diagram.previewImage"
                        :optimize-for-preview="true"
                        @preview-generated="handlePreviewGenerated(diagram, $event)"
                        class="hidden-renderer"
                      />
                    </div>

                    <div class="diagram-overlay">
                      <div class="export-dropdown">
                        <button
                          class="btn-icon export-toggle"
                          @click.stop="toggleExportDropdown(diagram)"
                          title="Export"
                        >
                          <span class="material-symbols-outlined">download</span>
                        </button>
                        <div
                          v-if="activeExportDropdown === (diagram.id || diagram._id)"
                          class="export-options"
                        >
                          <button class="export-option" @click.stop="exportDiagramAsPNG(diagram)">
                            <span class="material-symbols-outlined">image</span>
                            Export PNG
                          </button>
                          <button class="export-option" @click.stop="exportDiagramAsSVG(diagram)">
                            <span class="material-symbols-outlined">code</span>
                            Export SVG
                          </button>
                        </div>
                      </div>
                      <button
                        class="btn-icon danger"
                        @click.stop="deleteDiagram(diagram.id || diagram._id, $event)"
                        title="Delete"
                      >
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                  <div class="diagram-info">
                    <h4>{{ getSafeValue(diagram.name, 'Unnamed Diagram') }}</h4>
                    <p class="diagram-description">
                      {{ getSafeValue(diagram.description, 'No description') }}
                    </p>
                    <div class="diagram-meta">
                      <span class="meta-item">
                        <span class="material-symbols-outlined">language</span>
                        {{ getLanguageCode(diagram.lang) }}
                      </span>
                      <span class="meta-item diagram-type-badge type-usecase"> Use Case </span>
                    </div>
                    <div class="diagram-stats">
                      <span class="stat-badge">
                        <span class="material-symbols-outlined">person</span>
                        {{ getSafeArrayLength(diagram.actors) }}
                      </span>
                      <span class="stat-badge">
                        <span class="material-symbols-outlined">task</span>
                        {{ getSafeArrayLength(diagram.usecases) }}
                      </span>
                      <span class="stat-badge">
                        <span class="material-symbols-outlined">link</span>
                        {{ getRelationshipCount(diagram) }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Empty State for Use Case Diagrams -->
                <div v-if="filteredUsecaseDiagrams.length === 0" class="empty-section">
                  <div class="empty-icon">
                    <span class="material-symbols-outlined">account_tree</span>
                  </div>
                  <h4>No Use Case Diagrams</h4>
                  <p>Generate your first use case diagram to visualize system requirements.</p>
                  <button class="btn-primary small" @click="generateSpecificDiagram('usecase')">
                    <span class="material-symbols-outlined">auto_awesome</span>
                    Generate Use Case
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Scroll Arrow Right -->
            <button 
              v-if="scrollStates.usecase.canScrollRight"
              class="scroll-arrow scroll-arrow-right" 
              @click="scrollDiagrams('usecase', 'right')"
            >
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>

        <!-- Activity Diagrams Section -->
        <div class="diagram-section">
          <div class="section-header">
            <div class="section-title">
              <h3>Activity Diagrams</h3>
              <span class="diagram-count">({{ activityDiagrams.length }})</span>
            </div>
            <div class="section-controls">
              <div class="search-box">
                <span class="material-symbols-outlined search-icon">search</span>
                <input
                  v-model="searchFilters.activity"
                  type="text"
                  placeholder="Search activity diagrams..."
                  class="search-input"
                />
              </div>
              <div class="filter-controls">
                <div class="filter-dropdown">
                  <button 
                    class="filter-icon-btn" 
                    @click.stop="toggleSortDropdown('activity')"
                    :title="getSortLabel(globalSortFilter)"
                  >
                    <span class="material-symbols-outlined">sort</span>
                  </button>
                  <div 
                    v-if="activeSortDropdown === 'activity'" 
                    class="filter-dropdown-menu"
                    @click.stop
                  >
                    <button 
                      class="filter-option" 
                      :class="{ active: globalSortFilter === 'name' }"
                      @click="setSortFilter('name')"
                    >
                      <span class="material-symbols-outlined">text_fields</span>
                      Sort by Name
                    </button>
                    <button 
                      class="filter-option" 
                      :class="{ active: globalSortFilter === 'date' }"
                      @click="setSortFilter('date')"
                    >
                      <span class="material-symbols-outlined">schedule</span>
                      Sort by Date
                    </button>
                    <button 
                      class="filter-option" 
                      :class="{ active: globalSortFilter === 'created' }"
                      @click="setSortFilter('created')"
                    >
                      <span class="material-symbols-outlined">calendar_today</span>
                      Sort by Created Date
                    </button>
                    <button 
                      class="filter-option" 
                      :class="{ active: globalSortFilter === 'nodes' }"
                      @click="setSortFilter('nodes')"
                    >
                      <span class="material-symbols-outlined">play_arrow</span>
                      Sort by Nodes
                    </button>
                  </div>
                </div>
                <div class="filter-dropdown">
                  <button 
                    class="filter-icon-btn" 
                    @click.stop="toggleLangDropdown('activity')"
                    :title="getLangLabel(languageFilters.activity)"
                  >
                    <span class="material-symbols-outlined">language</span>
                  </button>
                  <div 
                    v-if="activeLangDropdown === 'activity'" 
                    class="filter-dropdown-menu"
                    @click.stop
                  >
                    <button 
                      class="filter-option" 
                      :class="{ active: languageFilters.activity === 'all' }"
                      @click="setLangFilter('activity', 'all')"
                    >
                      <span class="material-symbols-outlined">public</span>
                      All Languages
                    </button>
                    <button 
                      class="filter-option" 
                      :class="{ active: languageFilters.activity === 'en-US' }"
                      @click="setLangFilter('activity', 'en-US')"
                    >
                      <span class="material-symbols-outlined">flag</span>
                      English
                    </button>
                    <button 
                      class="filter-option" 
                      :class="{ active: languageFilters.activity === 'vi-VN' }"
                      @click="setLangFilter('activity', 'vi-VN')"
                    >
                      <span class="material-symbols-outlined">flag</span>
                      Vietnamese
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="diagrams-scroll-container-wrapper">
            <!-- Scroll Arrow Left -->
            <button 
              v-if="scrollStates.activity.canScrollLeft"
              class="scroll-arrow scroll-arrow-left" 
              @click="scrollDiagrams('activity', 'left')"
            >
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            
            <div class="diagrams-scroll-container" ref="activityScrollContainer">
              <div class="diagrams-scroll-content" ref="activityScrollContent">

                <div
                  v-for="diagram in filteredActivityDiagrams"
                  :key="diagram.id || diagram._id"
                  class="diagram-card"
                  @click="editDiagram(diagram)"
                >
                  <div class="diagram-preview">
                    <img
                      v-if="diagram.previewImage"
                      :src="diagram.previewImage"
                      :alt="diagram.name || 'Activity Diagram'"
                      class="preview-image"
                      @load="onPreviewImageLoad"
                      @error="onPreviewImageError(diagram, $event)"
                    />
                    <div v-else class="generating-preview">
                      <div class="loading-spinner-small"></div>
                      <span>Generating preview...</span>
                    </div>
                    <!-- Luôn render renderer để có thể export, ẩn khi đã có previewImage -->
                    <div class="preview-generator" :class="{ 'hidden-renderer': diagram.previewImage }">
                      <ActivityDiagramRenderer
                        :ref="`previewGenerator_${diagram.id || diagram._id}`"
                        :diagram-data="diagram"
                        :preview-mode="true"
                        :auto-generate-preview="!diagram.previewImage"
                        :optimize-for-preview="true"
                        @preview-generated="handlePreviewGenerated(diagram, $event)"
                        class="hidden-renderer"
                      />
                    </div>

                    <div class="diagram-overlay">
                      <div class="export-dropdown">
                        <button
                          class="btn-icon export-toggle"
                          @click.stop="toggleExportDropdown(diagram)"
                          title="Export"
                        >
                          <span class="material-symbols-outlined">download</span>
                        </button>
                        <div
                          v-if="activeExportDropdown === (diagram.id || diagram._id)"
                          class="export-options"
                        >
                          <button class="export-option" @click.stop="exportDiagramAsPNG(diagram)">
                            <span class="material-symbols-outlined">image</span>
                            Export PNG
                          </button>
                          <button class="export-option" @click.stop="exportDiagramAsSVG(diagram)">
                            <span class="material-symbols-outlined">code</span>
                            Export SVG
                          </button>
                        </div>
                      </div>
                      <button
                        class="btn-icon danger"
                        @click.stop="deleteDiagram(diagram.id || diagram._id, $event)"
                        title="Delete"
                      >
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                  <div class="diagram-info">
                    <h4>{{ getSafeValue(diagram.name, 'Unnamed Diagram') }}</h4>
                    <p class="diagram-description">
                      {{ getSafeValue(diagram.description, 'No description') }}
                    </p>
                    <div class="diagram-meta">
                      <span class="meta-item">
                        <span class="material-symbols-outlined">language</span>
                        {{ getLanguageCode(diagram.lang) }}
                      </span>
                      <span class="meta-item diagram-type-badge type-activity"> Activity </span>
                    </div>
                    <div class="diagram-stats">
                      <span class="stat-badge">
                        <span class="material-symbols-outlined">play_arrow</span>
                        {{ getSafeArrayLength(diagram.nodes) }}
                      </span>
                      <span class="stat-badge">
                        <span class="material-symbols-outlined">link</span>
                        {{ getRelationshipCount(diagram) }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Empty State for Activity Diagrams -->
                <div v-if="filteredActivityDiagrams.length === 0" class="empty-section">
                  <div class="empty-icon">
                    <span class="material-symbols-outlined">play_arrow</span>
                  </div>
                  <h4>No Activity Diagrams</h4>
                  <p>Generate activity diagrams to visualize workflow processes.</p>
                  <button class="btn-primary small" @click="generateSpecificDiagram('activity')">
                    <span class="material-symbols-outlined">auto_awesome</span>
                    Generate Activity
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Scroll Arrow Right -->
            <button 
              v-if="scrollStates.activity.canScrollRight"
              class="scroll-arrow scroll-arrow-right" 
              @click="scrollDiagrams('activity', 'right')"
            >
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>

        <!-- Sequence Diagrams Section -->
        <div class="diagram-section">
          <div class="section-header">
            <div class="section-title">
              <h3>Sequence Diagrams</h3>
              <span class="diagram-count">({{ sequenceDiagrams.length }})</span>
            </div>
            <div class="section-controls">
              <div class="search-box">
                <span class="material-symbols-outlined search-icon">search</span>
                <input
                  v-model="searchFilters.sequence"
                  type="text"
                  placeholder="Search sequence diagrams..."
                  class="search-input"
                />
              </div>
              <div class="filter-controls">
                <div class="filter-dropdown">
                  <button 
                    class="filter-icon-btn" 
                    @click.stop="toggleSortDropdown('sequence')"
                    :title="getSortLabel(globalSortFilter)"
                  >
                    <span class="material-symbols-outlined">sort</span>
                  </button>
                  <div 
                    v-if="activeSortDropdown === 'sequence'" 
                    class="filter-dropdown-menu"
                    @click.stop
                  >
                    <button 
                      class="filter-option" 
                      :class="{ active: globalSortFilter === 'name' }"
                      @click="setSortFilter('name')"
                    >
                      <span class="material-symbols-outlined">text_fields</span>
                      Sort by Name
                    </button>
                    <button 
                      class="filter-option" 
                      :class="{ active: globalSortFilter === 'date' }"
                      @click="setSortFilter('date')"
                    >
                      <span class="material-symbols-outlined">schedule</span>
                      Sort by Date
                    </button>
                    <button 
                      class="filter-option" 
                      :class="{ active: globalSortFilter === 'created' }"
                      @click="setSortFilter('created')"
                    >
                      <span class="material-symbols-outlined">calendar_today</span>
                      Sort by Created Date
                    </button>
                    <button 
                      class="filter-option" 
                      :class="{ active: globalSortFilter === 'lifelines' }"
                      @click="setSortFilter('lifelines')"
                    >
                      <span class="material-symbols-outlined">timeline</span>
                      Sort by Lifelines
                    </button>
                  </div>
                </div>
                <div class="filter-dropdown">
                  <button 
                    class="filter-icon-btn" 
                    @click.stop="toggleLangDropdown('sequence')"
                    :title="getLangLabel(languageFilters.sequence)"
                  >
                    <span class="material-symbols-outlined">language</span>
                  </button>
                  <div 
                    v-if="activeLangDropdown === 'sequence'" 
                    class="filter-dropdown-menu"
                    @click.stop
                  >
                    <button 
                      class="filter-option" 
                      :class="{ active: languageFilters.sequence === 'all' }"
                      @click="setLangFilter('sequence', 'all')"
                    >
                      <span class="material-symbols-outlined">public</span>
                      All Languages
                    </button>
                    <button 
                      class="filter-option" 
                      :class="{ active: languageFilters.sequence === 'en-US' }"
                      @click="setLangFilter('sequence', 'en-US')"
                    >
                      <span class="material-symbols-outlined">flag</span>
                      English
                    </button>
                    <button 
                      class="filter-option" 
                      :class="{ active: languageFilters.sequence === 'vi-VN' }"
                      @click="setLangFilter('sequence', 'vi-VN')"
                    >
                      <span class="material-symbols-outlined">flag</span>
                      Vietnamese
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="diagrams-scroll-container-wrapper">
            <!-- Scroll Arrow Left -->
            <button 
              v-if="scrollStates.sequence.canScrollLeft"
              class="scroll-arrow scroll-arrow-left" 
              @click="scrollDiagrams('sequence', 'left')"
            >
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            
            <div class="diagrams-scroll-container" ref="sequenceScrollContainer">
              <div class="diagrams-scroll-content" ref="sequenceScrollContent">

                <div
                  v-for="diagram in filteredSequenceDiagrams"
                  :key="diagram.id || diagram._id"
                  class="diagram-card"
                  @click="editDiagram(diagram)"
                >
                  <div class="diagram-preview">
                    <img
                      v-if="diagram.previewImage"
                      :src="diagram.previewImage"
                      :alt="diagram.name || 'Sequence Diagram'"
                      class="preview-image"
                      @load="onPreviewImageLoad"
                      @error="onPreviewImageError(diagram, $event)"
                    />
                    <div v-else class="generating-preview">
                      <div class="loading-spinner-small"></div>
                      <span>Generating preview...</span>
                    </div>
                    <!-- Luôn render renderer để có thể export, ẩn khi đã có previewImage -->
                    <div class="preview-generator" :class="{ 'hidden-renderer': diagram.previewImage }">
                      <SequenceDiagramRenderer
                        :ref="`previewGenerator_${diagram.id || diagram._id}`"
                        :diagram-data="diagram"
                        :preview-mode="true"
                        :auto-generate-preview="!diagram.previewImage"
                        :optimize-for-preview="true"
                        @preview-generated="handlePreviewGenerated(diagram, $event)"
                        class="hidden-renderer"
                      />
                    </div>

                    <div class="diagram-overlay">
                      <div class="export-dropdown">
                        <button
                          class="btn-icon export-toggle"
                          @click.stop="toggleExportDropdown(diagram)"
                          title="Export"
                        >
                          <span class="material-symbols-outlined">download</span>
                        </button>
                        <div
                          v-if="activeExportDropdown === (diagram.id || diagram._id)"
                          class="export-options"
                        >
                          <button class="export-option" @click.stop="exportDiagramAsPNG(diagram)">
                            <span class="material-symbols-outlined">image</span>
                            Export PNG
                          </button>
                          <button class="export-option" @click.stop="exportDiagramAsSVG(diagram)">
                            <span class="material-symbols-outlined">code</span>
                            Export SVG
                          </button>
                        </div>
                      </div>
                      <button
                        class="btn-icon danger"
                        @click.stop="deleteDiagram(diagram.id || diagram._id, $event)"
                        title="Delete"
                      >
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                  <div class="diagram-info">
                    <h4>{{ getSafeValue(diagram.name, 'Unnamed Diagram') }}</h4>
                    <p class="diagram-description">
                      {{ getSafeValue(diagram.description, 'No description') }}
                    </p>
                    <div class="diagram-meta">
                      <span class="meta-item">
                        <span class="material-symbols-outlined">language</span>
                        {{ getLanguageCode(diagram.lang) }}
                      </span>
                      <span class="meta-item diagram-type-badge type-sequence"> Sequence </span>
                    </div>
                    <div class="diagram-stats">
                      <span class="stat-badge">
                        <span class="material-symbols-outlined">timeline</span>
                        {{ getSafeArrayLength(diagram.lifelines) }}
                      </span>
                      <span class="stat-badge">
                        <span class="material-symbols-outlined">link</span>
                        {{ getRelationshipCount(diagram) }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Empty State for Sequence Diagrams -->
                <div v-if="filteredSequenceDiagrams.length === 0" class="empty-section">
                  <div class="empty-icon">
                    <span class="material-symbols-outlined">timeline</span>
                  </div>
                  <h4>No Sequence Diagrams</h4>
                  <p>Generate sequence diagrams to visualize object interactions.</p>
                  <button class="btn-primary small" @click="generateSpecificDiagram('sequence')">
                    <span class="material-symbols-outlined">auto_awesome</span>
                    Generate Sequence
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Scroll Arrow Right -->
            <button 
              v-if="scrollStates.sequence.canScrollRight"
              class="scroll-arrow scroll-arrow-right" 
              @click="scrollDiagrams('sequence', 'right')"
            >
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Generate Diagram Modal -->
      <div v-if="showGenerateModal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Generate {{ getDiagramTypeName() }}</h3>
            <button class="btn-close" @click="closeGenerateModal">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="modal-body">
            <form @submit.prevent="generateDiagram">
              <div class="form-group">
                <label>Diagram Type</label>
                <select v-model="generateForm.type" required>
                  <option value="usecase">Use Case Diagram</option>
                  <option value="activity">Activity Diagram</option>
                  <option value="sequence">Sequence Diagram</option>
                </select>
              </div>

              <!-- Language is automatically set from project settings -->

              <!-- Sequence Diagram Options -->
              <div class="form-group" v-if="generateForm.type === 'sequence'">
                <label class="required">Use Case</label>
                <select v-model="generateForm.usecaseId" required>
                  <option value="">Select Use Case</option>
                  <option
                    v-for="usecase in availableUsecases"
                    :key="getUsecaseId(usecase)"
                    :value="getUsecaseId(usecase)"
                  >
                    {{ usecase.name || usecase.title }}
                  </option>
                </select>
                <div v-if="!availableUsecases.length" class="field-help">
                  No use cases available. Please create use cases first.
                </div>
              </div>

              <!-- Activity Diagram Options -->
              <div class="form-group" v-if="generateForm.type === 'activity'">
                <label class="required">Generation Source</label>
                <select v-model="generateForm.sourceType" required>
                  <option value="usecase">From Use Case</option>
                  <option value="actor">From Actor</option>
                </select>
              </div>

              <!-- Activity Diagram - Use Case Source -->
              <div
                class="form-group"
                v-if="generateForm.type === 'activity' && generateForm.sourceType === 'usecase'"
              >
                <label class="required">Use Case</label>
                <select v-model="generateForm.requirementId" required>
                  <option value="">Select Use Case</option>
                  <option
                    v-for="usecase in availableUsecases"
                    :key="getUsecaseId(usecase)"
                    :value="getUsecaseId(usecase)"
                  >
                    {{ usecase.name || usecase.title }}
                  </option>
                </select>
                <div v-if="!availableUsecases.length" class="field-help">
                  No use cases available. Please create use cases first.
                </div>
              </div>

              <!-- Activity Diagram - Actor Source -->
              <div
                class="form-group"
                v-if="generateForm.type === 'activity' && generateForm.sourceType === 'actor'"
              >
                <label class="required">Actor</label>
                <input
                  v-model="generateForm.actor"
                  type="text"
                  placeholder="Enter actor name"
                  required
                />
              </div>

              <!-- <div class="form-group">
                <label>Description</label>
                <textarea
                  v-model="generateForm.description"
                  rows="3"
                  placeholder="Enter diagram description"
                ></textarea>
              </div> -->

              <div class="modal-actions">
                <button type="button" class="btn-secondary" @click="closeGenerateModal">
                  Cancel
                </button>
                <button type="submit" class="btn-primary" :disabled="!canGenerate">
                  {{ `Generate ${getDiagramTypeName()}` }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Diagram Editor Modal -->
      <div v-if="editingDiagram" class="modal-overlay large">
        <div class="modal-content fullscreen">
          <div class="modal-header">
            <h3>{{ editingDiagram.name }}</h3>
            <div class="modal-actions-header">
              <span class="diagram-type-label">{{ getDiagramTypeLabel(editingDiagram) }}</span>
              <button class="btn-close" @click="closeEditor">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          <div class="modal-body editor-body">
            <div class="editor-content">
              <div class="editor-main">
                <component
                  :is="getEditorComponent()"
                  ref="diagramEditor"
                  :diagram-data="editingDiagram"
                  :editable="true"
                  :show-labels="showElementLabels"
                  :zoom-level="zoomLevel"
                  :project-language="project?.language || 'vi-VN'"
                  @element-selected="handleElementSelect"
                  @position-updated="handlePositionUpdate"
                  @element-dragged="handleElementDrag"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sharing Modal -->
    <ProjectSharingModal
      v-if="showSharingModal"
      :project-id="project._id"
      @close="showSharingModal = false"
    />
  </div>
</template>

<script>
import { getProjectDetail } from '@/api/project'
import { usecaseApi } from '@/api/project'
import {
  getUsecaseDiagrams,
  getUsecaseDiagramById,
  generateUsecaseDiagram,
  deleteUsecaseDiagram,
  updateMultiplePositions,
} from '@/api/ucd'
import {
  getActivityDiagrams,
  getActivityDiagramById,
  generateFromUsecase,
  generateFromActor,
  deleteActivityDiagram,
  updateNodePosition,
  updateMultipleNodePositions,
} from '@/api/avd'

import { getSequenceDiagrams, getSequenceDiagramById, generateSequenceDiagram, deleteSequenceDiagram } from '@/api/sqd'
import { useToast } from 'vue-toastification'
import ProjectSharingModal from '@/components/ProjectSharingModal.vue'
import UCDRenderer from '@/components/uml/usecase_diagram/UCDRenderer.vue'
import ActivityDiagramRenderer from '@/components/uml/activity_diagram/ActivityDiagramRenderer.vue'
import SequenceDiagramRenderer from '@/components/uml/sequence_diagram/SequenceDiagramRenderer.vue'
import { useActiveMembers } from '@/utils/useActiveMembers'
import {
  saveSelectedVersion,
  getSelectedOrDefaultVersion,
  filterApprovedVersions,
  isOwner as checkIsOwner,
} from '@/utils/versionSync'
import eventBus from '@/utils/eventBus'
import { socket } from '@/utils/socket'

export default {
  name: 'UmlManagement',
  components: {
    ProjectSharingModal,
    UCDRenderer,
    ActivityDiagramRenderer,
    SequenceDiagramRenderer,
  },
  setup() {
    const { activeUsers, initSocketConnection, cleanupSocketConnection } = useActiveMembers()
    return {
      activeUsers,
      initSocketConnection,
      cleanupSocketConnection,
    }
  },
  data() {
    return {
      project: {},
      versions: [],
      selectedVersionId: null,
      // Combined diagrams data
      usecaseDiagrams: [],
      activityDiagrams: [],
      sequenceDiagrams: [],
      loading: false,
      showGenerateModal: false,
      showSharingModal: false,
      editingDiagram: null,
      generateForm: {
        type: 'usecase',
        lang: 'en-US',
        description: '',
        usecaseId: '',
        sourceType: 'usecase',
        requirementId: '',
        actor: '',
      },
      availableUsecases: [],
      // Editor state
      selectedElement: null,
      selectedElementType: null,
      // View settings
      showElementLabels: true,
      zoomLevel: 1,
      // Preview management
      previewCache: new Map(),
      generatingPreviews: new Set(),
      activeExportDropdown: null,
      // Cache key prefix để tránh conflict giữa các projects/versions
      cacheKeyPrefix: null,
      // Filter và search
      searchFilters: {
        usecase: '',
        activity: '',
        sequence: '',
      },
      sortFilters: {
        usecase: 'name',
        activity: 'name',
        sequence: 'name',
      },
      languageFilters: {
        usecase: 'all',
        activity: 'all',
        sequence: 'all',
      },
      toast: useToast(),
      saveTimeout: null,
      // Track changed nodes for activity diagram (debounce save)
      activityChangedNodes: null,
      // Track if diagram has been modified
      diagramHasChanges: false,
      // Scroll handlers để cleanup
      scrollHandlers: null,
      // Scroll button states - track để reactive
      scrollStates: {
        usecase: { canScrollLeft: false, canScrollRight: false },
        activity: { canScrollLeft: false, canScrollRight: false },
        sequence: { canScrollLeft: false, canScrollRight: false },
      },
      // Dropdown states for sort and filter
      activeSortDropdown: null,
      activeLangDropdown: null,
    }
  },
  computed: {
    filteredUsecaseDiagrams() {
      let filtered = this.usecaseDiagrams

      // Search filter
      if (this.searchFilters.usecase) {
        const searchTerm = this.searchFilters.usecase.toLowerCase()
        filtered = filtered.filter(
          (diagram) =>
            diagram.name?.toLowerCase().includes(searchTerm) ||
            diagram.description?.toLowerCase().includes(searchTerm)
        )
      }

      // Language filter
      if (this.languageFilters.usecase !== 'all') {
        filtered = filtered.filter((diagram) => diagram.lang === this.languageFilters.usecase)
      }

      // Sort
      switch (this.globalSortFilter) {
        case 'name':
          filtered = filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
          break
        case 'date':
          filtered = filtered.sort(
            (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
          )
          break
        case 'created':
          filtered = filtered.sort(
            (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
          )
          break
        case 'actors':
          filtered = filtered.sort((a, b) => (b.actors?.length || 0) - (a.actors?.length || 0))
          break
        case 'usecases':
          filtered = filtered.sort((a, b) => (b.usecases?.length || 0) - (a.usecases?.length || 0))
          break
      }

      return filtered
    },
    filteredActivityDiagrams() {
      let filtered = this.activityDiagrams

      // Search filter
      if (this.searchFilters.activity) {
        const searchTerm = this.searchFilters.activity.toLowerCase()
        filtered = filtered.filter(
          (diagram) =>
            diagram.name?.toLowerCase().includes(searchTerm) ||
            diagram.description?.toLowerCase().includes(searchTerm)
        )
      }

      // Language filter
      if (this.languageFilters.activity !== 'all') {
        filtered = filtered.filter((diagram) => diagram.lang === this.languageFilters.activity)
      }

      // Sort
      switch (this.globalSortFilter) {
        case 'name':
          filtered = filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
          break
        case 'date':
          filtered = filtered.sort(
            (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
          )
          break
        case 'created':
          filtered = filtered.sort(
            (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
          )
          break
        case 'nodes':
          filtered = filtered.sort((a, b) => (b.nodes?.length || 0) - (a.nodes?.length || 0))
          break
      }

      return filtered
    },
    filteredSequenceDiagrams() {
      let filtered = this.sequenceDiagrams

      // Search filter
      if (this.searchFilters.sequence) {
        const searchTerm = this.searchFilters.sequence.toLowerCase()
        filtered = filtered.filter(
          (diagram) =>
            diagram.name?.toLowerCase().includes(searchTerm) ||
            diagram.description?.toLowerCase().includes(searchTerm)
        )
      }

      // Language filter
      if (this.languageFilters.sequence !== 'all') {
        filtered = filtered.filter((diagram) => diagram.lang === this.languageFilters.sequence)
      }

      // Sort
      switch (this.globalSortFilter) {
        case 'name':
          filtered = filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
          break
        case 'date':
          filtered = filtered.sort(
            (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
          )
          break
        case 'created':
          filtered = filtered.sort(
            (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
          )
          break
        case 'lifelines':
          filtered = filtered.sort(
            (a, b) => (b.lifelines?.length || 0) - (a.lifelines?.length || 0)
          )
          break
      }

      return filtered
    },
    canGenerate() {
      // Kiểm tra điều kiện generate dựa trên loại diagram
      if (this.generateForm.type === 'sequence') {
        return !!this.generateForm.usecaseId
      }
      if (this.generateForm.type === 'activity') {
        if (this.generateForm.sourceType === 'usecase') {
          return !!this.generateForm.requirementId
        } else {
          return !!this.generateForm.actor?.trim()
        }
      }
      // Use case diagram luôn có thể generate
      return true
    },
  },
  watch: {
    filteredUsecaseDiagrams: {
      handler(newDiagrams) {
        this.triggerPreviewGenerationForDiagrams(newDiagrams, 'usecase')
        this.$nextTick(() => {
          setTimeout(() => {
            this.updateScrollButtons('usecase')
          }, 150)
        })
      },
      deep: true,
      immediate: false,
    },
    filteredActivityDiagrams: {
      handler(newDiagrams) {
        this.triggerPreviewGenerationForDiagrams(newDiagrams, 'activity')
        this.$nextTick(() => {
          setTimeout(() => {
            this.updateScrollButtons('activity')
          }, 150)
        })
      },
      deep: true,
      immediate: false,
    },
    filteredSequenceDiagrams: {
      handler(newDiagrams) {
        this.triggerPreviewGenerationForDiagrams(newDiagrams, 'sequence')
        this.$nextTick(() => {
          setTimeout(() => {
            this.updateScrollButtons('sequence')
          }, 150)
        })
      },
      deep: true,
      immediate: false,
    },
  },
  async created() {
    const projectId = this.$route.params.id
    if (projectId) {
      await this.fetchProjectData(projectId)
      await this.loadAvailableUsecases()
      // Load preview cache từ localStorage trước khi load diagrams
      this.loadPreviewCache()
      await this.loadDiagrams()
      this.initSocketConnection(projectId)
      this.initVersionSocketListeners(projectId)
    }
    document.addEventListener('click', this.handleClickOutside)

    // Listen for version-approved event from PreviewModal
    eventBus.on('version-approved', this.handleVersionApproved)
  },
  beforeUnmount() {
    if (this.project._id) {
      this.cleanupSocketConnection(this.project._id)
      this.cleanupVersionSocketListeners()
    }

    // Cleanup scroll event listeners
    if (this.scrollHandlers) {
      this.scrollHandlers.forEach(({ container, handler }) => {
        container.removeEventListener('scroll', handler)
      })
      this.scrollHandlers.clear()
    }

    // Remove event listener
    eventBus.off('version-approved', this.handleVersionApproved)
    document.removeEventListener('click', this.handleClickOutside)
  },
  methods: {
    // Helper: Get usecase ID (support both _id and id for backward compatibility)
    getUsecaseId(uc) {
      if (!uc) return ''
      return String(uc._id || uc.id || '')
    },
    // Navigation
    navigateToUsecase() {
      this.$router.push({
        name: 'Editor',
        params: { id: this.project._id },
      })
    },
    navigateToOutput() {
      this.$router.push({
        name: 'OutputManagement',
        params: { id: this.project._id },
      })
    },
    // Data methods
    async fetchProjectData(projectId) {
      try {
        const userId = 'CURRENT_LOGGED_IN_USER_ID'
        const { data } = await getProjectDetail(projectId, userId)
        const result = data.data || data
        this.project = result.project || {}
        // Lọc bỏ version tạm thời, chỉ giữ version đã được approve
        const allVersions = result.versions || []
        this.versions = filterApprovedVersions(allVersions)

        // Sử dụng version sync utility
        const currentVersionId = result.current_version?._id
        this.selectedVersionId = getSelectedOrDefaultVersion(
          projectId,
          this.versions,
          currentVersionId
        )

        if (this.selectedVersionId) {
          saveSelectedVersion(projectId, this.selectedVersionId)
        }
      } catch (err) {
        console.error('Error fetching project details:', err)
        this.toast.error('Failed to load project data')
      }
    },
    async loadAvailableUsecases() {
      if (!this.selectedVersionId) {
        this.availableUsecases = []
        return
      }
      try {
        const response = await usecaseApi.getUsecases(this.selectedVersionId)
        this.availableUsecases = response.data.data || []
        console.log('📋 Loaded available usecases:', this.availableUsecases)
      } catch (error) {
        console.error('Error loading usecases:', error)
        this.availableUsecases = []
        this.toast.error('Failed to load use cases')
      }
    },
    async loadDiagrams() {
      if (!this.selectedVersionId) {
        this.usecaseDiagrams = []
        this.activityDiagrams = []
        this.sequenceDiagrams = []
        return
      }
      this.loading = true
      try {
        // Load all diagram types in parallel
        const [usecaseResponse, activityResponse, sequenceResponse] = await Promise.all([
          getUsecaseDiagrams(this.selectedVersionId).catch(() => ({ data: { data: [] } })),
          getActivityDiagrams(this.selectedVersionId).catch(() => ({ data: { data: [] } })),
          getSequenceDiagrams(this.selectedVersionId).catch(() => ({ data: { data: [] } })),
        ])

        this.usecaseDiagrams = this.processDiagrams(usecaseResponse.data?.data || [], 'usecase')
        this.activityDiagrams = this.processDiagrams(activityResponse.data?.data || [], 'activity')
        this.sequenceDiagrams = this.processDiagrams(sequenceResponse.data?.data || [], 'sequence')

        this.$nextTick(() => {
          setTimeout(() => {
            this.triggerPreviewGenerationForAllDiagrams()
          }, 300)
        })
      } catch (err) {
        console.error('Error loading diagrams:', err)
        this.toast.error('Failed to load diagrams')
        this.usecaseDiagrams = []
        this.activityDiagrams = []
        this.sequenceDiagrams = []
      } finally {
        this.loading = false
      }
    },
    processDiagrams(diagrams, type) {
      return diagrams.map((diagram) => {
        const diagramId = diagram.id || diagram._id
        if (this.previewCache.has(diagramId)) {
          return {
            ...diagram,
            previewImage: this.previewCache.get(diagramId),
            _type: type,
          }
        }
        return {
          ...diagram,
          _type: type,
        }
      })
    },
    // Diagram Type Helpers
    getDiagramTypeName(plural = false) {
      const names = {
        usecase: plural ? 'Use Case Diagrams' : 'Use Case Diagram',
        activity: plural ? 'Activity Diagrams' : 'Activity Diagram',
        sequence: plural ? 'Sequence Diagrams' : 'Sequence Diagram',
      }
      return names[this.generateForm.type] || 'Diagram'
    },
    getDiagramTypeLabel(diagram) {
      const type = diagram._type || this.generateForm.type
      const labels = {
        usecase: 'Use Case',
        activity: 'Activity',
        sequence: 'Sequence',
      }
      return labels[type] || 'Diagram'
    },
    getDiagramTypeClass(diagram) {
      const type = diagram._type || this.generateForm.type
      return `type-${type}`
    },
    getDiagramIcon(diagram) {
      const type = diagram ? diagram._type || this.generateForm.type : this.generateForm.type
      const icons = {
        usecase: 'account_tree',
        activity: 'play_arrow',
        sequence: 'timeline',
      }
      return icons[type] || 'schema'
    },
    getEditorComponent() {
      const components = {
        usecase: 'UCDRenderer',
        activity: 'ActivityDiagramRenderer',
        sequence: 'SequenceDiagramRenderer',
      }
      const type = this.editingDiagram?._type || this.generateForm.type
      return components[type] || 'UCDRenderer'
    },
    getRelationshipCount(diagram) {
      const type = diagram._type || this.generateForm.type
      switch (type) {
        case 'usecase':
          return (diagram.associations?.length || 0) + (diagram.relationships?.length || 0)
        case 'activity':
          return diagram.edges?.length || 0
        case 'sequence':
          return diagram.messages?.length || 0
        default:
          return 0
      }
    },
    // Diagram actions
    generateNewDiagram() {
      this.generateForm.type = 'usecase'
      this.generateForm.lang = this.project?.language || 'vi-VN'
      this.generateForm.description = ''
      this.generateForm.usecaseId = ''
      this.generateForm.sourceType = 'usecase'
      this.generateForm.requirementId = ''
      this.generateForm.actor = ''

      this.showGenerateModal = true
    },
    generateSpecificDiagram(type) {
      this.generateForm.type = type
      this.generateForm.lang = this.project?.language || 'vi-VN'
      this.generateForm.description = ''
      this.generateForm.usecaseId = ''
      this.generateForm.sourceType = 'usecase'
      this.generateForm.requirementId = ''
      this.generateForm.actor = ''

      // Nếu không có usecase nào, hiển thị cảnh báo
      if (
        (type === 'sequence' ||
          (type === 'activity' && this.generateForm.sourceType === 'usecase')) &&
        this.availableUsecases.length === 0
      ) {
        this.toast.warning('Please create use cases first before generating diagrams')
        return
      }

      this.showGenerateModal = true
    },
    closeGenerateModal() {
      this.showGenerateModal = false
      this.resetGenerateForm()
    },
    async generateDiagram() {
      if (!this.selectedVersionId) {
        this.toast.error('Please select a version first')
        return
      }

      // Validate form
      if (!this.canGenerate) {
        this.toast.error('Please fill all required fields')
        return
      }

      // Lưu type và các giá trị cần thiết trước khi reset form
      const diagramType = this.generateForm.type
      const usecaseId = this.generateForm.usecaseId
      const requirementId = this.generateForm.requirementId
      const actor = this.generateForm.actor
      const sourceType = this.generateForm.sourceType
      const language = this.project?.language || this.generateForm.lang || 'vi-VN'

      // Close modal immediately - loading will be shown in ProjectLayout
      this.showGenerateModal = false // Chỉ đóng modal, không reset form
      
      try {
        let newDiagram

        switch (diagramType) {
          case 'activity':
            if (sourceType === 'usecase') {
              const { data } = await generateFromUsecase(
                this.selectedVersionId,
                requirementId,
                language
              )
              newDiagram = data?.data || data
            } else {
              const { data } = await generateFromActor(
                this.selectedVersionId,
                actor,
                language
              )
              newDiagram = data?.data || data
            }
            break
          case 'sequence':
            const { data: sequenceData } = await generateSequenceDiagram(
              this.selectedVersionId,
              usecaseId,
              language
            )
            newDiagram = sequenceData?.data || sequenceData
            break
          case 'usecase':
          default:
            const { data: usecaseData } = await generateUsecaseDiagram(
              this.selectedVersionId,
              language
            )
            newDiagram = usecaseData?.data || usecaseData
            break
        }

        if (newDiagram) {
          // Lấy tên diagram type trước khi reset form
          const diagramTypeNames = {
            usecase: 'Use Case Diagram',
            activity: 'Activity Diagram',
            sequence: 'Sequence Diagram',
          }
          const diagramTypeName = diagramTypeNames[diagramType] || 'Diagram'
          
          // Không gọi closeGenerateModal() ở đây vì sẽ reset form
          // Chỉ đóng modal
          this.showGenerateModal = false
          
          this.toast.success(`${diagramTypeName} generated successfully!`)

          // Refresh diagrams from server to ensure data consistency
          await this.loadDiagrams()

          // Find the newly created diagram and open editor
          const diagramId = newDiagram._id || newDiagram.id
          const diagrams = this.getDiagramsByType(diagramType)
          const createdDiagram = diagrams.find((d) => (d._id || d.id) === diagramId)

          if (createdDiagram) {
            setTimeout(() => {
              this.triggerPreviewGeneration(createdDiagram)
            }, 1000)

            setTimeout(() => {
              this.editDiagram(createdDiagram)
            }, 500)
          }
        } else {
          throw new Error('No diagram data returned')
        }
      } catch (err) {
        console.error('Error generating diagram:', err)
        
        // Lấy tên diagram type trước khi reset form
        const diagramTypeNames = {
          usecase: 'Use Case Diagram',
          activity: 'Activity Diagram',
          sequence: 'Sequence Diagram',
        }
        const diagramTypeName = diagramTypeNames[diagramType] || 'Diagram'
        
        this.toast.error(
          `Failed to generate ${diagramTypeName}: ${
            err.response?.data?.message || err.message
          }`
        )
      } finally {
        // Reset form sau khi hoàn thành (thành công hoặc lỗi)
        this.resetGenerateForm()
      }
    },
    openManualEditor() {
      this.toast.info('Manual editor will be implemented in next version')
    },
    editDiagram(diagram) {
      this.editingDiagram = { ...diagram }
      this.selectedElement = null
      this.zoomLevel = 1
      // Reset activity changed nodes khi mở editor mới
      this.activityChangedNodes = null
      // Reset flag thay đổi
      this.diagramHasChanges = false
    },
    closeEditor() {
      const editedDiagramId = this.editingDiagram
        ? this.editingDiagram.id || this.editingDiagram._id
        : null
      const diagramType = this.editingDiagram?._type
      const hasChanges = this.diagramHasChanges

      // Clear save timeout nếu có
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout)
        this.saveTimeout = null
      }

      // Clear activity changed nodes
      this.activityChangedNodes = null

      // Reset flag thay đổi
      this.diagramHasChanges = false

      this.editingDiagram = null
      this.selectedElement = null

      // Chỉ refresh và regenerate preview nếu có thay đổi
      if (hasChanges && editedDiagramId && diagramType) {
        const diagrams = this.getDiagramsByType(diagramType)
        const diagram = diagrams.find((d) => (d.id || d._id) === editedDiagramId)
        if (diagram) {
          console.log('🔄 Regenerating preview for edited diagram:', editedDiagramId)
          this.regeneratePreview(diagram)
          this.previewCache.delete(editedDiagramId)
          
          // Chỉ refresh diagram đã chỉnh sửa thay vì refresh tất cả
          this.refreshSingleDiagram(diagramType, editedDiagramId)
        }
      }
    },
    getDiagramsByType(type) {
      switch (type) {
        case 'activity':
          return this.activityDiagrams
        case 'sequence':
          return this.sequenceDiagrams
        case 'usecase':
        default:
          return this.usecaseDiagrams
      }
    },
    async deleteDiagram(diagramId, event) {
      if (event) {
        event.stopPropagation()
      }

      const diagram = this.findDiagramById(diagramId)
      if (!diagram) return

      const diagramName = diagram?.name || 'Unnamed Diagram'
      const diagramType = diagram._type || 'usecase'

      if (
        !confirm(`Are you sure you want to delete "${diagramName}"? This action cannot be undone.`)
      ) {
        return
      }

      const deleteButton = event?.target
      const originalHTML = deleteButton?.innerHTML
      if (deleteButton) {
        deleteButton.innerHTML = '<span class="loading-spinner-small"></span>'
        deleteButton.disabled = true
      }

      try {
        switch (diagramType) {
          case 'activity':
            await deleteActivityDiagram(diagramId)
            this.activityDiagrams = this.activityDiagrams.filter(
              (d) => (d.id || d._id) !== diagramId
            )
            break
          case 'sequence':
            await deleteSequenceDiagram(diagramId)
            this.sequenceDiagrams = this.sequenceDiagrams.filter(
              (d) => (d.id || d._id) !== diagramId
            )
            break
          case 'usecase':
          default:
            await deleteUsecaseDiagram(diagramId)
            this.usecaseDiagrams = this.usecaseDiagrams.filter((d) => (d.id || d._id) !== diagramId)
            break
        }

        // Xóa cache trong memory
        this.previewCache.delete(diagramId)
        this.generatingPreviews.delete(diagramId)
        
        // Xóa cache trong localStorage
        try {
          const cacheKey = this.getCacheKey(diagramId)
          localStorage.removeItem(cacheKey)
        } catch (err) {
          console.warn('Error removing cache:', err)
        }

        if (
          this.editingDiagram &&
          (this.editingDiagram.id || this.editingDiagram._id) === diagramId
        ) {
          this.closeEditor()
        }

        this.toast.success(`Diagram deleted successfully`)
      } catch (err) {
        console.error('Error deleting diagram:', err)
        this.toast.error(err.response?.data?.message || err.message)
      } finally {
        if (deleteButton) {
          deleteButton.innerHTML = originalHTML
          deleteButton.disabled = false
        }
      }
    },
    findDiagramById(diagramId) {
      return (
        this.usecaseDiagrams.find((d) => (d.id || d._id) === diagramId) ||
        this.activityDiagrams.find((d) => (d.id || d._id) === diagramId) ||
        this.sequenceDiagrams.find((d) => (d.id || d._id) === diagramId)
      )
    },
    // Preview Generation
    triggerPreviewGenerationForAllDiagrams() {
      console.log('🔄 Starting preview generation for all diagrams...')
      this.triggerPreviewGenerationForDiagrams(this.usecaseDiagrams, 'usecase')
      this.triggerPreviewGenerationForDiagrams(this.activityDiagrams, 'activity')
      this.triggerPreviewGenerationForDiagrams(this.sequenceDiagrams, 'sequence')
    },
    triggerPreviewGenerationForDiagrams(diagrams, type) {
      diagrams.forEach((diagram, index) => {
        const diagramId = diagram.id || diagram._id
        const needsPreview = !diagram.previewImage && !this.previewCache.has(diagramId)
        if (needsPreview) {
          setTimeout(() => {
            this.triggerPreviewGeneration(diagram)
          }, index * 500)
        }
      })
    },
    async triggerPreviewGeneration(diagram) {
      const diagramId = diagram.id || diagram._id
      if (this.generatingPreviews.has(diagramId)) return

      this.generatingPreviews.add(diagramId)
      try {
        await this.$nextTick()
        const rendererRef = `previewGenerator_${diagramId}`
        if (this.$refs[rendererRef] && this.$refs[rendererRef][0]) {
          const renderer = this.$refs[rendererRef][0]
          if (typeof renderer.generatePreviewImage === 'function') {
            const previewData = await renderer.generatePreviewImage()
            if (previewData) {
              this.handlePreviewGenerated(diagram, previewData)
            }
          }
        }
      } catch (error) {
        console.error(`Error generating preview for ${diagramId}:`, error)
      } finally {
        this.generatingPreviews.delete(diagramId)
      }
    },
    // Export Methods
    async exportDiagramAsPNG(diagram) {
      try {
        const diagramId = diagram.id || diagram._id
        const rendererRef = `previewGenerator_${diagramId}`
        
        // Đợi renderer được mount nếu chưa có
        await this.$nextTick()
        
        // Tìm renderer trong $refs (có thể là array hoặc object)
        let renderer = null
        if (this.$refs[rendererRef]) {
          if (Array.isArray(this.$refs[rendererRef])) {
            renderer = this.$refs[rendererRef][0]
          } else {
            renderer = this.$refs[rendererRef]
          }
        }
        
        if (renderer && typeof renderer.exportAsPNG === 'function') {
          await renderer.exportAsPNG()
          this.toast.success('Diagram exported as PNG successfully!')
        } else {
          console.error('Renderer not found or exportAsPNG method not available', {
            rendererRef,
            hasRef: !!this.$refs[rendererRef],
            renderer,
          })
          this.toast.error('Export function not available. Please try again.')
        }
        this.closeExportDropdown()
      } catch (err) {
        console.error('Error exporting PNG:', err)
        this.toast.error('Failed to export PNG: ' + (err.message || 'Unknown error'))
      }
    },
    async exportDiagramAsSVG(diagram) {
      try {
        const diagramId = diagram.id || diagram._id
        const rendererRef = `previewGenerator_${diagramId}`
        
        // Đợi renderer được mount nếu chưa có
        await this.$nextTick()
        
        // Tìm renderer trong $refs (có thể là array hoặc object)
        let renderer = null
        if (this.$refs[rendererRef]) {
          if (Array.isArray(this.$refs[rendererRef])) {
            renderer = this.$refs[rendererRef][0]
          } else {
            renderer = this.$refs[rendererRef]
          }
        }
        
        if (renderer && typeof renderer.exportAsSVG === 'function') {
          renderer.exportAsSVG()
          this.toast.success('Diagram exported as SVG successfully!')
        } else {
          console.error('Renderer not found or exportAsSVG method not available', {
            rendererRef,
            hasRef: !!this.$refs[rendererRef],
            renderer,
          })
          this.toast.error('Export function not available. Please try again.')
        }
        this.closeExportDropdown()
      } catch (err) {
        console.error('Error exporting SVG:', err)
        this.toast.error('Failed to export SVG: ' + (err.message || 'Unknown error'))
      }
    },
    // Helper methods
    getSafeValue(value, defaultValue = '') {
      return value !== null && value !== undefined ? value : defaultValue
    },
    getSafeArrayLength(array) {
      return Array.isArray(array) ? array.length : 0
    },
    getLanguageCode(lang) {
      const codes = {
        'en-US': 'EN',
        'vi-VN': 'VI',
        en: 'EN',
        vi: 'VI',
      }
      return codes[lang] || 'EN'
    },
    formatDate(dateString) {
      if (!dateString) return 'Not available'
      return new Date(dateString).toLocaleDateString()
    },
    resetGenerateForm() {
      this.generateForm = {
        type: 'usecase',
        lang: this.project?.language || 'vi-VN',
        description: '',
        usecaseId: '',
        sourceType: 'usecase',
        requirementId: '',
        actor: '',
      }
    },
    handleVersionSelect(versionId) {
      // Chỉ Owner mới được phép select version
      if (!checkIsOwner(this.project)) {
        this.toast.warning('Only project owner can switch versions')
        return
      }

      const oldVersionId = this.selectedVersionId
      this.selectedVersionId = versionId
      // Lưu vào localStorage để đồng bộ
      saveSelectedVersion(this.project._id, versionId)

      // Emit socket event để các thành viên khác biết version đã được switch
      if (socket && socket.connected) {
        const userId = localStorage.getItem('userId')
        socket.emit('version_event', {
          type: 'VERSION_SWITCHED',
          projectId: this.project._id,
          userId: userId,
          toVersionId: versionId,
          fromVersionId: oldVersionId,
          timestamp: new Date(),
        })
        console.log('📡 Emitted VERSION_SWITCHED socket event')
      }

      // Load cache cho version mới
      this.loadPreviewCache()
      this.loadAvailableUsecases()
      this.loadDiagrams()
    },

    /**
     * Xử lý khi version được approve thành công từ PreviewModal
     */
    async handleVersionApproved(event) {
      // Chỉ xử lý nếu là project hiện tại
      if (!event || event.projectId !== this.project._id) {
        return
      }

      console.log('✅ Version approved event received:', event)

      const { versionId, version, newVersion } = event

      if (!versionId) {
        console.warn('⚠️ Invalid version-approved event: missing versionId', event)
        return
      }

      try {
        // Đợi một chút để backend cập nhật xong
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Refresh project data để lấy version mới
        await this.fetchProjectData(this.project._id)

        // Đảm bảo version mới có trong danh sách (thêm vào nếu chưa có)
        let newVersionObj = this.versions.find((v) => v._id === versionId)

        if (!newVersionObj) {
          // Nếu chưa có trong danh sách, thử fetch lại một lần nữa
          console.log('🔄 Version not found, fetching project data again...')
          await new Promise((resolve) => setTimeout(resolve, 500))
          await this.fetchProjectData(this.project._id)
          newVersionObj = this.versions.find((v) => v._id === versionId)
        }

        // Nếu vẫn chưa có và có version object từ event, thêm vào
        if (!newVersionObj && version) {
          // Chỉ thêm nếu version đã được approve (version_temporary = false)
          if (version.version_temporary === false || version.version_temporary === undefined) {
            this.versions.push(version)
            newVersionObj = version
            console.log('✅ Added new approved version to list:', versionId)
          }
        }

        // Force set selectedVersionId ngay cả khi chưa có trong danh sách
        // Vì version đã được approve rồi, nên chắc chắn sẽ có
        this.selectedVersionId = versionId

        // Lưu vào localStorage để đồng bộ với các trang khác
        saveSelectedVersion(this.project._id, versionId)

        // Load cache cho version mới và refresh diagrams
        this.loadPreviewCache()
        await this.loadAvailableUsecases()
        await this.loadDiagrams()

        // Thông báo cho user
        this.toast.success(`Switched to approved version: ${newVersion || versionId}`)

        this.$forceUpdate()
      } catch (error) {
        console.error('❌ Error handling version-approved event:', error)
        this.toast.error('Failed to switch to approved version')
      }
    },
    goBack() {
      this.$router.push('/dashboard')
    },
    async refreshDiagrams() {
      await this.loadAvailableUsecases()
      await this.loadDiagrams()
      this.toast.success('Diagrams refreshed')
    },
    // Preview Image Management
    getCacheKey(diagramId) {
      if (!this.cacheKeyPrefix) {
        const projectId = this.project._id || this.$route.params.id
        const versionId = this.selectedVersionId || 'default'
        this.cacheKeyPrefix = `diagram_preview_${projectId}_${versionId}_`
      }
      return `${this.cacheKeyPrefix}${diagramId}`
    },

    loadPreviewCache() {
      try {
        // Reset cache key prefix khi version thay đổi
        const projectId = this.project._id || this.$route.params.id
        const versionId = this.selectedVersionId || 'default'
        this.cacheKeyPrefix = `diagram_preview_${projectId}_${versionId}_`
        
        // Load tất cả cache keys cho project và version này
        const cacheKeys = Object.keys(localStorage).filter(key => 
          key.startsWith(this.cacheKeyPrefix)
        )
        
        let loadedCount = 0
        cacheKeys.forEach(key => {
          try {
            const cachedData = localStorage.getItem(key)
            if (cachedData) {
              const data = JSON.parse(cachedData)
              // Check cache age (7 days)
              const cacheAge = Date.now() - (data.timestamp || 0)
              const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
              
              if (cacheAge < maxAge && data.previewImage) {
                const diagramId = key.replace(this.cacheKeyPrefix, '')
                this.previewCache.set(diagramId, data.previewImage)
                loadedCount++
              } else {
                // Remove expired cache
                localStorage.removeItem(key)
              }
            }
          } catch (err) {
            console.warn('Error loading cached preview:', key, err)
            localStorage.removeItem(key)
          }
        })
        
        if (loadedCount > 0) {
          console.log(`📦 Loaded ${loadedCount} preview images from cache`)
        }
      } catch (err) {
        console.error('Error loading preview cache:', err)
      }
    },

    savePreviewToCache(diagramId, previewData) {
      try {
        const cacheKey = this.getCacheKey(diagramId)
        const cacheData = {
          previewImage: previewData,
          timestamp: Date.now(),
          diagramId: diagramId,
        }
        
        // Check localStorage size limit (5MB)
        const dataString = JSON.stringify(cacheData)
        const estimatedSize = new Blob([dataString]).size
        
        // Nếu quá lớn, skip cache (mỗi preview thường < 100KB)
        if (estimatedSize > 500 * 1024) {
          console.warn('Preview too large to cache:', diagramId)
          return
        }
        
        localStorage.setItem(cacheKey, dataString)
      } catch (err) {
        // Nếu localStorage đầy, try cleanup old cache
        if (err.name === 'QuotaExceededError') {
          console.warn('LocalStorage full, cleaning old cache...')
          this.cleanupOldCache()
          // Retry once
          try {
            const cacheKey = this.getCacheKey(diagramId)
            const cacheData = {
              previewImage: previewData,
              timestamp: Date.now(),
              diagramId: diagramId,
            }
            localStorage.setItem(cacheKey, JSON.stringify(cacheData))
          } catch (retryErr) {
            console.error('Failed to cache preview after cleanup:', retryErr)
          }
        } else {
          console.error('Error saving preview to cache:', err)
        }
      }
    },

    cleanupOldCache() {
      try {
        // Cleanup cache older than 7 days
        const maxAge = 7 * 24 * 60 * 60 * 1000
        const allKeys = Object.keys(localStorage)
        let cleanedCount = 0
        
        allKeys.forEach(key => {
          if (key.startsWith('diagram_preview_')) {
            try {
              const data = JSON.parse(localStorage.getItem(key))
              const cacheAge = Date.now() - (data.timestamp || 0)
              if (cacheAge > maxAge) {
                localStorage.removeItem(key)
                cleanedCount++
              }
            } catch (err) {
              // Invalid cache entry, remove it
              localStorage.removeItem(key)
              cleanedCount++
            }
          }
        })
        
        if (cleanedCount > 0) {
          console.log(`🧹 Cleaned up ${cleanedCount} old cache entries`)
        }
      } catch (err) {
        console.error('Error cleaning up cache:', err)
      }
    },

    handlePreviewGenerated(diagram, previewData) {
      if (previewData) {
        const diagramId = diagram.id || diagram._id
        this.previewCache.set(diagramId, previewData)
        // Save to persistent cache
        this.savePreviewToCache(diagramId, previewData)
        
        const diagrams = this.getDiagramsByType(diagram._type)
        const diagramIndex = diagrams.findIndex((d) => (d.id || d._id) === diagramId)
        if (diagramIndex !== -1) {
          diagrams[diagramIndex].previewImage = previewData
        }
      }
    },
    onPreviewImageLoad(event) {
      event.target.style.opacity = '1'
    },
    // Socket methods for version events
    initVersionSocketListeners(projectId) {
      if (!socket) return
      if (socket.connected) {
        socket.emit('join_project', projectId)
      }
      socket.on('version_event', this.handleVersionEvent)
      console.log('✅ Version socket listeners initialized for UmlManagement')
    },

    cleanupVersionSocketListeners() {
      if (socket) {
        socket.off('version_event', this.handleVersionEvent)
      }
    },

    handleVersionEvent(event) {
      const currentUserId = localStorage.getItem('userId')
      if (event.userId === currentUserId) return

      switch (event.type) {
        case 'VERSION_SWITCHED':
          this.handleRemoteVersionSwitched(event)
          break
        case 'VERSION_CREATED':
          this.handleRemoteVersionCreated(event)
          break
      }
    },

    async handleRemoteVersionSwitched(event) {
      if (event.projectId !== this.project._id) return
      this.selectedVersionId = event.toVersionId
      saveSelectedVersion(this.project._id, event.toVersionId)
      // Load cache cho version mới
      this.loadPreviewCache()
      await this.loadAvailableUsecases()
      await this.loadDiagrams()
      const version = this.versions.find((v) => v._id === event.toVersionId)
      if (version) {
        this.toast.info(`Version switched to: ${version.version_number || event.toVersionId}`)
      }
    },

    async handleRemoteVersionCreated(event) {
      if (event.projectId !== this.project._id) return
      await this.fetchProjectData(this.project._id)
      if (
        event.version &&
        (event.version.version_temporary === false || event.version.version_temporary === undefined)
      ) {
        const exists = this.versions.find((v) => v._id === event.version._id)
        if (!exists) {
          this.versions.push(event.version)
        }
        this.selectedVersionId = event.version._id
        saveSelectedVersion(this.project._id, event.version._id)
        // Load cache cho version mới
        this.loadPreviewCache()
        await this.loadAvailableUsecases()
        await this.loadDiagrams()
        this.toast.info(`New version created: ${event.version.version_number || event.version._id}`)
      }
    },

    onPreviewImageError(diagram, event) {
      const diagramId = diagram.id || diagram._id
      event.target.style.display = 'none'
      if (!this.generatingPreviews.has(diagramId)) {
        this.triggerPreviewGeneration(diagram)
      }
    },
    async regeneratePreview(diagram) {
      const diagramId = diagram.id || diagram._id
      if (this.generatingPreviews.has(diagramId)) return

      // Xóa cache trong memory
      this.previewCache.delete(diagramId)
      
      // Xóa cache trong localStorage
      try {
        const cacheKey = this.getCacheKey(diagramId)
        localStorage.removeItem(cacheKey)
      } catch (err) {
        console.warn('Error removing cache:', err)
      }
      
      const diagrams = this.getDiagramsByType(diagram._type)
      const diagramIndex = diagrams.findIndex((d) => (d.id || d._id) === diagramId)
      if (diagramIndex !== -1) {
        delete diagrams[diagramIndex].previewImage
      }
      this.triggerPreviewGeneration(diagram)
    },
    // Export dropdown methods
    toggleExportDropdown(diagram) {
      const diagramId = diagram.id || diagram._id
      this.activeExportDropdown = this.activeExportDropdown === diagramId ? null : diagramId
    },
    closeExportDropdown() {
      this.activeExportDropdown = null
    },
    handleClickOutside(event) {
      if (!event.target.closest('.export-dropdown')) {
        this.closeExportDropdown()
      }
      if (!event.target.closest('.filter-dropdown')) {
        this.activeSortDropdown = null
        this.activeLangDropdown = null
      }
    },
    // Sort and filter dropdown methods
    toggleSortDropdown(type) {
      this.activeSortDropdown = this.activeSortDropdown === type ? null : type
      this.activeLangDropdown = null
    },
    toggleLangDropdown(type) {
      this.activeLangDropdown = this.activeLangDropdown === type ? null : type
      this.activeSortDropdown = null
    },
    setSortFilter(value) {
      this.globalSortFilter = value
      this.activeSortDropdown = null
    },
    setLangFilter(type, value) {
      this.languageFilters[type] = value
      this.activeLangDropdown = null
    },
    getSortLabel(value) {
      const labels = {
        name: 'Sort by Name',
        date: 'Sort by Date',
        created: 'Sort by Created Date',
        actors: 'Sort by Actors',
        usecases: 'Sort by Use Cases',
        nodes: 'Sort by Nodes',
        lifelines: 'Sort by Lifelines',
      }
      return labels[value] || 'Sort'
    },
    getLangLabel(value) {
      const labels = {
        all: 'All Languages',
        'en-US': 'English',
        'vi-VN': 'Vietnamese',
      }
      return labels[value] || 'Language'
    },
    // Editor Methods
    handleElementSelect(event) {
      if (!event) {
        this.selectedElement = null
        this.selectedElementType = null
        return
      }
      this.selectedElement = event.element
      this.selectedElementType = event.type
    },
    handlePositionUpdate({ element, type, position }) {
      if (!this.editingDiagram) return

      // Đánh dấu diagram có thay đổi
      this.diagramHasChanges = true

      const diagramType = this.editingDiagram._type

      switch (diagramType) {
        case 'usecase':
          this.handleUsecasePositionUpdate({ element, type, position })
          break
        case 'activity':
          this.handleActivityPositionUpdate({ element, type, position })
          // Lưu thông tin node đã thay đổi để debounce save
          if (type === 'node') {
            const nodeId = element.id || element._id
            if (nodeId) {
              // Lưu node đã thay đổi vào map để debounce save
              if (!this.activityChangedNodes) {
                this.activityChangedNodes = new Map()
              }
              this.activityChangedNodes.set(nodeId, {
                id: nodeId,
                position: {
                  x: Math.round(position.x),
                  y: Math.round(position.y),
                },
              })
            }
          }
          break
        case 'sequence':
          this.handleSequencePositionUpdate({ element, type, position })
          break
      }

      // Gọi onSaveStart để hiển thị "Saving..."
      if (this.$refs.diagramEditor && this.$refs.diagramEditor.onSaveStart) {
        this.$refs.diagramEditor.onSaveStart()
      }

      this.debounceSave()
    },

    async saveDiagramPositions() {
      if (!this.editingDiagram) return

      const diagramType = this.editingDiagram._type
      const diagramId = this.editingDiagram.id || this.editingDiagram._id

      try {
        switch (diagramType) {
          case 'usecase':
            await this.saveUsecasePositions(diagramId)
            break
          case 'activity':
            await this.saveActivityPositions(diagramId)
            break
          case 'sequence':
            await this.saveSequencePositions(diagramId)
            break
        }

        // Gọi onSaveComplete để hiển thị "Saved just now"
        if (this.$refs.diagramEditor && this.$refs.diagramEditor.onSaveComplete) {
          this.$refs.diagramEditor.onSaveComplete(true)
        }

        console.log('💾 Positions saved successfully')
      } catch (err) {
        console.error('❌ Error saving positions:', err)

        // Gọi onSaveComplete với false để hiển thị lỗi
        if (this.$refs.diagramEditor && this.$refs.diagramEditor.onSaveComplete) {
          this.$refs.diagramEditor.onSaveComplete(false)
        }

        this.toast.error('Failed to save positions')
      }
    },

    // Thêm các phương thức xử lý cụ thể
    handleUsecasePositionUpdate({ element, type, position }) {
      if (type === 'actor') {
        const actorIndex = this.editingDiagram.actors.findIndex(
          (a) => (a._id || a.id) === (element._id || element.id)
        )
        if (actorIndex !== -1) {
          if (!this.editingDiagram.actors[actorIndex].position) {
            this.editingDiagram.actors[actorIndex].position = {}
          }
          this.editingDiagram.actors[actorIndex].position.x = Math.round(position.x)
          this.editingDiagram.actors[actorIndex].position.y = Math.round(position.y)
        }
      } else if (type === 'usecase') {
        const usecaseIndex = this.editingDiagram.usecases.findIndex(
          (uc) => (uc._id || uc.id) === (element._id || element.id)
        )
        if (usecaseIndex !== -1) {
          if (!this.editingDiagram.usecases[usecaseIndex].position) {
            this.editingDiagram.usecases[usecaseIndex].position = {}
          }
          this.editingDiagram.usecases[usecaseIndex].position.x = Math.round(position.x)
          this.editingDiagram.usecases[usecaseIndex].position.y = Math.round(position.y)
        }
      }
    },

    async saveUsecasePositions(diagramId) {
      const updates = {
        actors: this.editingDiagram.actors.map((actor) => ({
          id: actor._id || actor.id,
          position: actor.position || { x: 0, y: 0 },
        })),
        usecases: this.editingDiagram.usecases.map((usecase) => ({
          id: usecase._id || usecase.id,
          position: usecase.position || { x: 0, y: 0 },
        })),
      }

      await updateMultiplePositions(diagramId, updates)
    },

    // Activity diagram position update handler
    handleActivityPositionUpdate({ element, type, position }) {
      if (type === 'node') {
        const nodeIndex = this.editingDiagram.nodes.findIndex(
          (n) => n.id === (element.id || element._id)
        )
        if (nodeIndex !== -1) {
          if (!this.editingDiagram.nodes[nodeIndex].position) {
            this.editingDiagram.nodes[nodeIndex].position = { x: 0, y: 0 }
          }
          this.editingDiagram.nodes[nodeIndex].position.x = Math.round(position.x)
          this.editingDiagram.nodes[nodeIndex].position.y = Math.round(position.y)
        }
      }
    },

    handleSequencePositionUpdate({ element, type, position }) {
      // TODO: Implement for sequence diagrams
      console.log('Sequence diagram position update:', { element, type, position })
    },

    async saveActivityPositions(diagramId) {
      // Save đơn lẻ từng node đã thay đổi (với debounce 1.5s)
      if (!this.activityChangedNodes || this.activityChangedNodes.size === 0) {
        return
      }

      const nodesToSave = Array.from(this.activityChangedNodes.values())
      
      // Save từng node một (đơn lẻ) và cập nhật UI
      for (const node of nodesToSave) {
        try {
          const response = await updateNodePosition(diagramId, node.id, node.position)
          // ✅ Cập nhật editingDiagram với dữ liệu mới từ server để UI cập nhật
          if (response?.data?.data) {
            const updatedDiagram = response.data.data
            if (this.editingDiagram && (this.editingDiagram.id || this.editingDiagram._id) === diagramId) {
              // Cập nhật nodes với position mới - dùng Vue.set để đảm bảo reactivity
              if (updatedDiagram.nodes) {
                updatedDiagram.nodes.forEach((updatedNode) => {
                  const localNodeIndex = this.editingDiagram.nodes.findIndex(
                    (n) => n.id === updatedNode.id
                  )
                  if (localNodeIndex !== -1 && updatedNode.position) {
                    // ✅ Dùng Vue.set để đảm bảo Vue detect được thay đổi
                    this.$set(this.editingDiagram.nodes[localNodeIndex], 'position', {
                      x: updatedNode.position.x,
                      y: updatedNode.position.y,
                    })
                  }
                })
              }
            }
          }
        } catch (err) {
          console.error(`❌ Error saving node ${node.id}:`, err)
          // Tiếp tục save các node khác dù có lỗi
        }
      }

      // Clear changed nodes sau khi save xong
      this.activityChangedNodes.clear()
    },

    async saveSequencePositions(diagramId) {
      // TODO: Implement for sequence diagrams
      console.log('Saving sequence diagram positions:', diagramId)
    },
    handleElementDrag({ element, type, newPosition }) {
      this.handlePositionUpdate({ element, type, position: newPosition })
    },
    debounceSave() {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout)
      }
      this.saveTimeout = setTimeout(() => {
        this.saveDiagramPositions()
      }, 1500)
    },
    async refreshSingleDiagram(diagramType, diagramId) {
      if (!diagramId) return
      
      try {
        let updatedDiagram = null
        let response = null
        
        switch (diagramType) {
          case 'usecase':
            response = await getUsecaseDiagramById(diagramId)
            updatedDiagram = response?.data?.data || response?.data
            if (updatedDiagram) {
              const index = this.usecaseDiagrams.findIndex((d) => (d.id || d._id) === diagramId)
              if (index !== -1) {
                this.$set(this.usecaseDiagrams, index, {
                  ...this.processDiagrams([updatedDiagram], 'usecase')[0],
                  previewImage: this.usecaseDiagrams[index].previewImage, // Giữ preview image cũ
                })
              } else {
                // Nếu không tìm thấy trong list, thêm vào (trường hợp diagram mới được tạo)
                this.usecaseDiagrams.push(this.processDiagrams([updatedDiagram], 'usecase')[0])
              }
            }
            break
          case 'activity':
            response = await getActivityDiagramById(diagramId)
            updatedDiagram = response?.data?.data || response?.data
            if (updatedDiagram) {
              const index = this.activityDiagrams.findIndex((d) => (d.id || d._id) === diagramId)
              if (index !== -1) {
                this.$set(this.activityDiagrams, index, {
                  ...this.processDiagrams([updatedDiagram], 'activity')[0],
                  previewImage: this.activityDiagrams[index].previewImage, // Giữ preview image cũ
                })
              } else {
                // Nếu không tìm thấy trong list, thêm vào (trường hợp diagram mới được tạo)
                this.activityDiagrams.push(this.processDiagrams([updatedDiagram], 'activity')[0])
              }
            }
            break
          case 'sequence':
            response = await getSequenceDiagramById(diagramId)
            updatedDiagram = response?.data?.data || response?.data
            if (updatedDiagram) {
              const index = this.sequenceDiagrams.findIndex((d) => (d.id || d._id) === diagramId)
              if (index !== -1) {
                this.$set(this.sequenceDiagrams, index, {
                  ...this.processDiagrams([updatedDiagram], 'sequence')[0],
                  previewImage: this.sequenceDiagrams[index].previewImage, // Giữ preview image cũ
                })
              } else {
                // Nếu không tìm thấy trong list, thêm vào (trường hợp diagram mới được tạo)
                this.sequenceDiagrams.push(this.processDiagrams([updatedDiagram], 'sequence')[0])
              }
            }
            break
        }
      } catch (err) {
        console.error('Error refreshing single diagram:', err)
        // Không fallback về loadDiagrams() để tránh refresh tất cả
        // Chỉ log error và giữ nguyên data hiện tại
      }
    },
    // Scroll methods - FIXED VERSION
    scrollDiagrams(type, direction) {
      const container = this.getScrollContainer(type)
      if (!container) return
      
      const scrollAmount = 400 // Scroll 400px mỗi lần
      const currentScroll = container.scrollLeft
      
      if (direction === 'left') {
        container.scrollTo({
          left: Math.max(0, currentScroll - scrollAmount),
          behavior: 'smooth'
        })
      } else {
        const maxScroll = container.scrollWidth - container.clientWidth
        container.scrollTo({
          left: Math.min(maxScroll, currentScroll + scrollAmount),
          behavior: 'smooth'
        })
      }
      
      // Update button states sau khi scroll - đợi scroll animation hoàn thành
      setTimeout(() => {
        this.updateScrollButtons(type)
      }, 100)
    },
    
    getScrollContainer(type) {
      const refName = `${type}ScrollContainer`
      const containerRef = this.$refs[refName]
      if (!containerRef) return null
      
      // Handle both array and single ref
      return Array.isArray(containerRef) ? containerRef[0] : containerRef
    },
    
    updateScrollButtons(type) {
      const container = this.getScrollContainer(type)
      if (!container) {
        // Nếu chưa có ref, set về false
        this.scrollStates[type] = { canScrollLeft: false, canScrollRight: false }
        return
      }
      
      // Kiểm tra xem có thể scroll không (scrollWidth > clientWidth)
      const scrollWidth = container.scrollWidth
      const clientWidth = container.clientWidth
      const canScroll = scrollWidth > clientWidth
      
      if (!canScroll) {
        // Không thể scroll
        this.scrollStates[type] = { canScrollLeft: false, canScrollRight: false }
        return
      }
      
      // Có thể scroll - kiểm tra vị trí hiện tại
      const scrollLeft = container.scrollLeft
      const maxScroll = scrollWidth - clientWidth
      
      // canScrollLeft: có thể scroll về trái nếu scrollLeft > threshold
      const canScrollLeft = scrollLeft > 5
      
      // canScrollRight: có thể scroll về phải nếu chưa đến cuối
      const canScrollRight = scrollLeft < (maxScroll - 5)
      
      // Update state
      this.scrollStates[type] = {
        canScrollLeft,
        canScrollRight,
      }
    },
  },
  mounted() {
    // Initialize scroll handlers map
    this.scrollHandlers = new Map()
    
    // Update scroll buttons khi component mounted - đợi DOM render xong
    this.$nextTick(() => {
      // Đợi thêm một chút để đảm bảo refs đã được mount và có kích thước
      setTimeout(() => {
        ['usecase', 'activity', 'sequence'].forEach(type => {
          this.updateScrollButtons(type)
        })
      }, 200)
    })
    
    // Listen scroll events để update button states
    this.$nextTick(() => {
      setTimeout(() => {
        ['usecase', 'activity', 'sequence'].forEach(type => {
          const container = this.getScrollContainer(type)
          if (container) {
            const handleScroll = () => {
              this.updateScrollButtons(type)
            }
            container.addEventListener('scroll', handleScroll)
            // Store handler để có thể remove sau
            this.scrollHandlers.set(`${type}ScrollContainer`, { container, handler: handleScroll })
            
            // Update buttons ngay sau khi add listener
            this.updateScrollButtons(type)
          }
        })
      }, 200)
    })
  },
  updated() {
    // Update scroll buttons khi component updated (có thể có thêm diagrams)
    this.$nextTick(() => {
      setTimeout(() => {
        ['usecase', 'activity', 'sequence'].forEach(type => {
          this.updateScrollButtons(type)
        })
      }, 100)
    })
  },
}
</script>

<style scoped>
.uml-management-view {
  padding: 30px;
  background: #f9fafb;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.uml-content {
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  margin-top: 24px;
  width: 100%;
}

/* Header */
.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header-left h2 {
  font-size: 2rem;
  font-weight: 700;
  color: #1a365d;
  margin: 0 0 8px 0;
}

.subtitle {
  color: #6b7280;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* Buttons */
.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #1a365d;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-primary:hover {
  background: #2d4a8a;
}

.btn-primary.small {
  padding: 8px 16px;
  font-size: 0.875rem;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-icon {
  padding: 8px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #374151;
  transition: all 0.3s ease;
}

.btn-icon:hover {
  background: white;
  transform: scale(1.1);
}

.btn-icon.danger:hover {
  background: #fee2e2;
  color: #dc2626;
}

.btn-close {
  padding: 8px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: background 0.3s ease;
}

.btn-close:hover {
  background: #f3f4f6;
  color: #374151;
}

/* Navigation Tabs */

/* Diagrams Display */
.diagrams-display {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.diagram-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.diagram-count {
  color: #6b7280;
  font-size: 0.875rem;
}

.section-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #9ca3af;
  font-size: 20px;
}

.search-input {
  padding: 8px 12px 8px 40px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  width: 250px;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #1a365d;
}

.filter-controls {
  display: flex;
  gap: 8px;
}

/* Diagrams Scroll Container - FIXED */
.diagrams-scroll-container-wrapper {
  position: relative;
  width: 100%;
}

.diagrams-scroll-container {
  position: relative;
  overflow-x: auto;
  padding-bottom: 8px;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
}

.diagrams-scroll-container::-webkit-scrollbar {
  height: 8px;
}

.diagrams-scroll-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.diagrams-scroll-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.diagrams-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.diagrams-scroll-content {
  display: flex;
  gap: 20px;
  min-width: min-content;
  padding: 2px 0; /* Add padding để không bị cắt border */
}

/* Diagram Cards */
.diagram-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  min-width: 300px;
  max-width: 300px;
  flex-shrink: 0;
}

.diagram-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

/* Diagram Preview với ảnh */
.diagram-preview {
  position: relative;
  width: 100%;
  height: 180px;
  background: #fff;
  overflow: hidden;
  border-bottom: 1px solid #e5e7eb;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: opacity 0.3s ease;
  opacity: 0;
}

.preview-generator {
  width: 100%;
  height: 100%;
  position: relative;
}

.hidden-renderer {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 100%;
  height: 100%;
}

.generating-preview {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #6b7280;
  font-size: 14px;
  background: #f8fafc;
}

.diagram-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.diagram-card:hover .diagram-overlay {
  opacity: 1;
}

.diagram-info {
  padding: 16px;
}

.diagram-info h4 {
  margin: 0 0 8px 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.diagram-description {
  margin: 0 0 12px 0;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.diagram-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #9ca3af;
}

/* Type Badges */
.diagram-type-badge,
.type-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.type-usecase {
  background: #dbeafe;
  color: #1e40af;
}

.type-activity {
  background: #dcfce7;
  color: #166534;
}

.type-sequence {
  background: #fef3c7;
  color: #92400e;
}

.diagram-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 12px;
  font-size: 0.75rem;
  color: #374151;
}

/* Empty Section */
.empty-section {
  text-align: center;
  padding: 40px 20px;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.empty-icon {
  width: 60px;
  height: 60px;
  margin-bottom: 16px;
  background: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon .material-symbols-outlined {
  font-size: 30px;
  color: #9ca3af;
}

.empty-section h4 {
  margin: 0 0 8px 0;
  color: #374151;
  font-size: 1rem;
}

.empty-section p {
  margin: 0 0 16px 0;
  font-size: 0.875rem;
}

.empty-section.loading-section {
  background: rgba(59, 130, 246, 0.05);
  border: 2px dashed #3b82f6;
  border-radius: 12px;
  margin: 20px;
  min-height: 300px;
}

.empty-section.loading-section .loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.empty-section.loading-section h4 {
  color: #3b82f6;
  font-weight: 600;
}

.empty-section.loading-section p {
  color: #6b7280;
}

/* Modal Styles */
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
  padding: 20px;
}

.modal-overlay.large {
  padding: 40px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.fullscreen {
  max-width: 1200px;
  width: 95%;
  height: 95vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.modal-actions-header {
  display: flex;
  gap: 12px;
  align-items: center;
}

.modal-body {
  padding: 20px;
}

.editor-body {
  flex: 1;
  padding: 0;
  overflow: hidden;
}

.editor-content {
  display: flex;
  height: 100%;
}

.editor-main {
  flex: 1;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Form Styles */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.form-group label.required:after {
  content: '*';
  color: #ef4444;
  margin-left: 4px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.3s ease;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #1a365d;
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

/* Loading States */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6b7280;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #1a365d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f4f6;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Export Dropdown Styles */
.export-dropdown {
  position: relative;
  display: inline-block;
}

.export-toggle {
  z-index: 2;
}

.export-options {
  position: absolute;
  top: 100%;
  left: -100%;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 10;
  min-width: 140px;
  margin-top: 4px;
}

.export-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: #374151;
  transition: background 0.3s ease;
}

.export-option:hover {
  background: #f3f4f6;
}

.export-option:first-child {
  border-radius: 8px 8px 0 0;
}

.export-option:last-child {
  border-radius: 0 0 8px 8px;
}

.export-option .material-symbols-outlined {
  font-size: 16px;
}

/* Field Help */
.field-help {
  color: #6b7280;
  font-size: 0.75rem;
  margin-top: 4px;
  font-style: italic;
}

.diagram-type-label {
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #6b7280;
  margin-right: 12px;
}

/* Scroll Arrows - FIXED POSITION */
.scroll-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  width: 40px;
  height: 40px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.scroll-arrow:hover:not(:disabled) {
  background: #f3f4f6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.scroll-arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.scroll-arrow-left {
  left: -20px;
}

.scroll-arrow-right {
  right: -20px;
}

.scroll-arrow .material-symbols-outlined {
  font-size: 24px;
  color: #374151;
}

/* Diagram Generating Overlay - Giản dị */
.diagram-generating-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  animation: fadeInOverlay 0.3s ease-in;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border: 2px solid rgba(59, 130, 246, 0.3);
}

.generating-content {
  text-align: center;
  padding: 40px 30px;
  max-width: 350px;
}

.generating-spinner-wrapper {
  margin: 0 0 20px 0;
  display: flex;
  justify-content: center;
}

.generating-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(59, 130, 246, 0.2);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spinLarge 1s linear infinite;
}

.generating-content h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1e40af;
  margin: 0;
}

.diagram-card.blurred {
  filter: blur(3px);
  opacity: 0.4;
  pointer-events: none;
  transition: all 0.3s ease;
}

@keyframes fadeInOverlay {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes spinLarge {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .uml-management-view {
    padding: 16px;
  }

  .content-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: stretch;
    flex-wrap: wrap;
  }

  .btn-primary,
  .btn-secondary {
    flex: 1;
    justify-content: center;
    min-width: 120px;
  }


  .section-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .section-controls {
    width: 100%;
    flex-direction: column;
    gap: 12px;
  }

  .search-input {
    width: 100%;
  }

  .filter-controls {
    width: 100%;
    justify-content: space-between;
  }

  .diagram-card {
    min-width: 280px;
  }

  .modal-overlay.large {
    padding: 10px;
  }

  .modal-content.fullscreen {
    width: 100%;
    height: 100%;
    max-width: none;
    border-radius: 0;
  }

  .diagram-preview {
    height: 160px;
  }
  
  /* Adjust scroll arrows for mobile */
  .scroll-arrow-left {
    left: -15px;
  }
  
  .scroll-arrow-right {
    right: -15px;
  }
  
  .scroll-arrow {
    width: 36px;
    height: 36px;
  }
}

@media (max-width: 480px) {
  .diagram-preview {
    height: 140px;
  }

  .header-left h2 {
    font-size: 1.5rem;
  }

  .diagram-stats {
    flex-wrap: wrap;
  }

  .diagrams-scroll-content {
    gap: 12px;
  }

  .diagram-card {
    min-width: 260px;
  }
  
  .scroll-arrow-left {
    left: -10px;
  }
  
  .scroll-arrow-right {
    right: -10px;
  }
  
  .scroll-arrow {
    width: 32px;
    height: 32px;
  }
  
  .scroll-arrow .material-symbols-outlined {
    font-size: 20px;
  }
}

/* Filter Dropdown Styles */
.filter-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-dropdown {
  position: relative;
}

.filter-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-icon-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #374151;
}

.filter-icon-btn .material-symbols-outlined {
  font-size: 20px;
}

.filter-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 200px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 100;
  overflow: hidden;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease;
}

.filter-option:hover {
  background: #f9fafb;
}

.filter-option.active {
  background: #eff6ff;
  color: #1e40af;
  font-weight: 500;
}

.filter-option .material-symbols-outlined {
  font-size: 18px;
  color: inherit;
}
</style>