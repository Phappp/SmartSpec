<template>
  <div class="admin-dashboard">
    <!-- Material Icons -->
    <link
      href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      rel="stylesheet"
    />

    <!-- Header -->
    <header class="dashboard-header">
      <div class="header-left">
        <div class="logo">
          <span class="material-symbols-outlined">admin_panel_settings</span>
          <h1>SmartSpec Admin</h1>
        </div>
      </div>
      <div class="header-right">
        <div class="header-actions">
          
          <div class="user-menu" @click="toggleUserMenu">
            <div class="user-avatar">
              <img
                :src="currentUser.avatar_url"
                :alt="currentUser.name"
                @error="(e) => (e.target.src = 'https://static.vecteezy.com/system/resources/previews/024/983/914/original/simple-user-default-icon-free-png.png')"
              />
            </div>
            <span class="user-name">{{ currentUser.name }}</span>
            <span class="material-symbols-outlined">expand_more</span>

            <transition name="fade-slide">
              <div v-if="showUserMenu" class="user-dropdown">
                <div class="dropdown-item" @click="showProfileModal = true">
                  <span class="material-symbols-outlined">person</span>
                  <span>Thông tin cá nhân</span>
                </div>
                <div class="dropdown-item" @click="showChangePasswordModal = true">
                  <span class="material-symbols-outlined">key</span>
                  <span>Đổi mật khẩu</span>
                </div>
                <div class="dropdown-item" @click="showSystemSettingsModal = true">
                  <span class="material-symbols-outlined">settings</span>
                  <span>Cài đặt hệ thống</span>
                </div>
                <hr />
                <div class="dropdown-item logout" @click="logout">
                  <span class="material-symbols-outlined">logout</span>
                  <span>Đăng xuất</span>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="dashboard-main">
      <!-- Quick Stats -->
      <section class="stats-section">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-symbols-outlined">group</span>
            </div>
            <div class="stat-content">
              <h3>{{ formatNumber(stats.totalUsers) }}</h3>
              <p>Tổng người dùng</p>
              <div class="stat-trend" :class="userTrend.type">
                <span class="material-symbols-outlined">{{ userTrend.icon }}</span>
                <span>{{ userTrend.value }}</span>
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-symbols-outlined">key</span>
            </div>
            <div class="stat-content">
              <h3>{{ formatNumber(stats.activeApiKeys) }}</h3>
              <p>API Keys hoạt động</p>
              <div class="stat-trend" :class="apiTrend.type">
                <span class="material-symbols-outlined">{{ apiTrend.icon }}</span>
                <span>{{ apiTrend.value }}</span>
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-symbols-outlined">folder</span>
            </div>
            <div class="stat-content">
              <h3>{{ formatNumber(stats.totalProjects) }}</h3>
              <p>Tổng dự án</p>
              <div class="stat-trend" :class="projectTrend.type">
                <span class="material-symbols-outlined">{{ projectTrend.icon }}</span>
                <span>{{ projectTrend.value }}</span>
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-symbols-outlined">activity_zone</span>
            </div>
            <div class="stat-content">
              <h3>{{ formatNumber(stats.dailyActive) }}</h3>
              <p>Hoạt động hôm nay</p>
              <div class="stat-trend" :class="activityTrend.type">
                <span class="material-symbols-outlined">{{ activityTrend.icon }}</span>
                <span>{{ activityTrend.value }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Charts and Analytics -->
      <section class="analytics-section">
        <div class="analytics-grid">
          <!-- User Distribution & User Analytics (full-width) -->
          <div class="analytics-card modern-card user-analytics-card">
            <div class="card-header-modern">
              <div class="header-content">
                <span class="material-symbols-outlined header-icon">pie_chart</span>
                <div>
                  <h3>Phân bố người dùng</h3>
                  <p class="header-subtitle">Tổng quan vai trò, đăng ký mới và người dùng đang hoạt động</p>
                </div>
              </div>
              <div class="chart-actions">
                <div class="user-filters-modern">
                  <div class="filter-icon-wrapper">
                    <button 
                      class="filter-icon-btn-modern" 
                      @click.stop="toggleRangeDaysFilter"
                      :title="`Range: ${userAnalyticsFilters.rangeDays} days`"
                    >
                      <span class="material-symbols-outlined">calendar_month</span>
                    </button>
                    <div 
                      v-if="showRangeDaysFilter" 
                      class="filter-dropdown-menu"
                      @click.stop
                    >
                      <button 
                        class="filter-option" 
                        :class="{ active: userAnalyticsFilters.rangeDays === 7 }"
                        @click="setRangeDays(7)"
                      >
                        <span class="material-symbols-outlined">today</span>
                        7 days
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: userAnalyticsFilters.rangeDays === 30 }"
                        @click="setRangeDays(30)"
                      >
                        <span class="material-symbols-outlined">date_range</span>
                        30 days
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: userAnalyticsFilters.rangeDays === 90 }"
                        @click="setRangeDays(90)"
                      >
                        <span class="material-symbols-outlined">event</span>
                        90 days
                      </button>
                    </div>
                  </div>
                  <div class="filter-icon-wrapper">
                    <button 
                      class="filter-icon-btn-modern" 
                      @click.stop="toggleViewModeFilter"
                      :title="`View: ${getViewModeLabel()}`"
                    >
                      <span class="material-symbols-outlined">timeline</span>
                    </button>
                    <div 
                      v-if="showViewModeFilter" 
                      class="filter-dropdown-menu"
                      @click.stop
                    >
                      <button 
                        class="filter-option" 
                        :class="{ active: userAnalyticsFilters.viewMode === 'day' }"
                        @click="setViewMode('day')"
                      >
                        <span class="material-symbols-outlined">today</span>
                        By Day
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: userAnalyticsFilters.viewMode === 'month' }"
                        @click="setViewMode('month')"
                      >
                        <span class="material-symbols-outlined">calendar_month</span>
                        By Month
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: userAnalyticsFilters.viewMode === 'year' }"
                        @click="setViewMode('year')"
                      >
                        <span class="material-symbols-outlined">event</span>
                        By Year
                      </button>
                    </div>
                  </div>
                </div>
                <button class="btn-icon-modern" @click="() => { loadUserAnalytics(); loadUserTimelineChart(); }" title="Làm mới">
                  <span class="material-symbols-outlined">refresh</span>
                </button>
                <button class="btn-icon-modern" @click="exportUserStats" title="Xuất dữ liệu">
                  <span class="material-symbols-outlined">download</span>
                </button>
              </div>
            </div>
            <div class="user-analytics-content">
              <!-- Top counters -->
              <div class="user-counters-grid">
                <div class="user-counter-card">
                  <div class="counter-icon total">
                    <span class="material-symbols-outlined">group</span>
                  </div>
                  <div class="counter-info">
                    <span class="counter-label">Tổng người dùng</span>
                    <span class="counter-value">{{ formatNumber(userAnalytics.counters.totalUsers || 0) }}</span>
                  </div>
                </div>
                <div class="user-counter-card">
                  <div class="counter-icon active">
                    <span class="material-symbols-outlined">verified_user</span>
                  </div>
                  <div class="counter-info">
                    <span class="counter-label">Đang hoạt động</span>
                    <span class="counter-value">{{ formatNumber(userAnalytics.counters.activeUsers || 0) }}</span>
                  </div>
                </div>
                <div class="user-counter-card">
                  <div class="counter-icon new">
                    <span class="material-symbols-outlined">person_add</span>
                  </div>
                  <div class="counter-info">
                    <span class="counter-label">Đăng ký hôm nay</span>
                    <span class="counter-value">{{ formatNumber(userAnalytics.counters.newUsersToday || 0) }}</span>
                  </div>
                </div>
                <div class="user-counter-card">
                  <div class="counter-icon online">
                    <span class="material-symbols-outlined">online_prediction</span>
                  </div>
                  <div class="counter-info">
                    <span class="counter-label">Online hôm nay</span>
                    <span class="counter-value">{{ formatNumber(userAnalytics.counters.onlineToday || 0) }}</span>
                  </div>
                </div>
              </div>

              <!-- Charts row: distribution & registrations timeline -->
              <div class="user-charts-grid">
                <!-- User distribution doughnut + legend -->
                <div class="chart-container-modern">
                  <div class="chart-header-inline">
                    <div>
                      <h4 class="chart-title-modern">
                        <span class="material-symbols-outlined">donut_small</span>
                        Phân bố theo vai trò
                      </h4>
                      <p class="chart-subtitle">Tỷ lệ người dùng theo nhóm quyền</p>
                    </div>
                  </div>
                  <div class="chart-content-modern">
                    <div class="chart-visual">
                      <canvas ref="userDistributionChart" id="userDistributionChart"></canvas>
                    </div>
                    <div class="chart-legend-modern">
                      <div
                        v-for="(item, index) in userDistribution"
                        :key="item.label"
                        class="legend-item-modern"
                        :class="{ active: hoveredSegment === index }"
                        @mouseenter="hoveredSegment = index"
                        @mouseleave="hoveredSegment = null"
                      >
                        <div class="legend-indicator">
                          <div class="legend-color-modern" :style="{ backgroundColor: item.color }"></div>
                          <div class="legend-pulse" :style="{ backgroundColor: item.color }"></div>
                        </div>
                        <div class="legend-info">
                          <span class="legend-label-modern">{{ item.label }}</span>
                          <span class="legend-value-modern">{{ item.value }} người ({{ item.percentage }}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Registrations timeline -->
                <div class="chart-container-modern user-timeline-container">
                  <div class="chart-header-inline">
                  <div>
                    <h4 class="chart-title-modern">
                      <span class="material-symbols-outlined">timeline</span>
                      Đăng ký mới {{ userAnalyticsFilters.rangeDays || userAnalytics.rangeDays || 7 }}
                      {{
                        userAnalyticsFilters.viewMode === 'day'
                          ? 'ngày gần đây'
                          : userAnalyticsFilters.viewMode === 'month'
                          ? 'tháng gần đây'
                          : 'năm gần đây'
                      }}
                    </h4>
                    <p class="chart-subtitle">
                      Xu hướng người dùng đăng ký mới theo
                      {{
                        userAnalyticsFilters.viewMode === 'day'
                          ? 'ngày'
                          : userAnalyticsFilters.viewMode === 'month'
                          ? 'tháng'
                          : 'năm'
                      }}
                    </p>
                  </div>
                  </div>
                  <div class="chart-canvas-wrapper small">
                    <canvas ref="userTimelineChart" id="userTimelineChart"></canvas>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- API Usage Analytics -->
          <div class="analytics-card modern-card api-analytics-card">
            <div class="card-header-modern">
              <div class="header-content">
                <span class="material-symbols-outlined header-icon">analytics</span>
                <div>
                  <h3>Phân tích sử dụng API</h3>
                  <p class="header-subtitle">Thống kê chi tiết theo nhà cung cấp</p>
                </div>
              </div>
              <div class="chart-actions">
                <button class="btn-icon-modern" @click="refreshApiStats" title="Làm mới">
                  <span class="material-symbols-outlined">refresh</span>
                </button>
                <button class="btn-icon-modern" @click="exportApiStats" title="Xuất dữ liệu">
                  <span class="material-symbols-outlined">download</span>
                </button>
              </div>
            </div>

            <!-- Enhanced Filters -->
            <div class="filters-modern">
              <div class="filters-header">
                <span class="material-symbols-outlined">filter_list</span>
                <span>Bộ lọc</span>
              </div>
              <div class="filters-grid">
                <div class="filter-item-modern">
                  <label class="filter-label">
                    <span class="material-symbols-outlined">calendar_today</span>
                    Từ ngày
                  </label>
                  <input type="date" v-model="apiFilters.dateFrom" @change="applyApiFilters" class="filter-input-modern" />
                </div>
                <div class="filter-item-modern">
                  <label class="filter-label">
                    <span class="material-symbols-outlined">event</span>
                    Đến ngày
                  </label>
                  <input type="date" v-model="apiFilters.dateTo" @change="applyApiFilters" class="filter-input-modern" />
                </div>
                <div class="filter-item-modern">
                  <label class="filter-label">
                    <span class="material-symbols-outlined">cloud</span>
                    Provider
                  </label>
                  <div class="filter-icon-wrapper">
                    <button 
                      class="filter-icon-btn-modern" 
                      @click.stop="toggleProviderFilter"
                      :title="getProviderFilterLabel()"
                    >
                      <span class="material-symbols-outlined">cloud</span>
                    </button>
                    <div 
                      v-if="showProviderFilter" 
                      class="filter-dropdown-menu"
                      @click.stop
                    >
                      <button 
                        class="filter-option" 
                        :class="{ active: apiFilters.provider === '' }"
                        @click="setProviderFilter('')"
                      >
                        <span class="material-symbols-outlined">filter_alt_off</span>
                        All Providers
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: apiFilters.provider === 'gemini' }"
                        @click="setProviderFilter('gemini')"
                      >
                        <span class="material-symbols-outlined">auto_awesome</span>
                        Gemini
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: apiFilters.provider === 'openai' }"
                        @click="setProviderFilter('openai')"
                      >
                        <span class="material-symbols-outlined">smart_toy</span>
                        OpenAI
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: apiFilters.provider === 'claude' }"
                        @click="setProviderFilter('claude')"
                      >
                        <span class="material-symbols-outlined">psychology</span>
                        Claude
                      </button>
                    </div>
                  </div>
                </div>
                <div class="filter-item-modern">
                  <label class="filter-label">
                    <span class="material-symbols-outlined">check_circle</span>
                    Status
                  </label>
                  <div class="filter-icon-wrapper">
                    <button 
                      class="filter-icon-btn-modern" 
                      @click.stop="toggleStatusFilter"
                      :title="getStatusFilterLabel()"
                    >
                      <span class="material-symbols-outlined">check_circle</span>
                    </button>
                    <div 
                      v-if="showStatusFilter" 
                      class="filter-dropdown-menu"
                      @click.stop
                    >
                      <button 
                        class="filter-option" 
                        :class="{ active: apiFilters.status === '' }"
                        @click="setStatusFilter('')"
                      >
                        <span class="material-symbols-outlined">filter_alt_off</span>
                        All Status
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: apiFilters.status === 'success' }"
                        @click="setStatusFilter('success')"
                      >
                        <span class="material-symbols-outlined">check_circle</span>
                        Success
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: apiFilters.status === 'failed' }"
                        @click="setStatusFilter('failed')"
                      >
                        <span class="material-symbols-outlined">cancel</span>
                        Failed
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: apiFilters.status === 'timeout' }"
                        @click="setStatusFilter('timeout')"
                      >
                        <span class="material-symbols-outlined">schedule</span>
                        Timeout
                      </button>
                    </div>
                  </div>
                </div>
                <button class="btn-reset-modern" @click="resetApiFilters">
                  <span class="material-symbols-outlined">clear_all</span>
                  <span>Đặt lại</span>
                </button>
              </div>
            </div>

            <!-- API Summary Cards -->
            <div class="api-summary-modern">
              <div class="summary-card-modern">
                <div class="summary-icon requests">
                  <span class="material-symbols-outlined">api</span>
                </div>
                <div class="summary-content">
                  <span class="summary-label-modern">Tổng requests</span>
                  <span class="summary-value-modern">{{ formatNumber(totalApiRequests) }}</span>
                </div>
              </div>
              <div class="summary-card-modern">
                <div class="summary-icon tokens">
                  <span class="material-symbols-outlined">token</span>
                </div>
                <div class="summary-content">
                  <span class="summary-label-modern">Tổng tokens</span>
                  <span class="summary-value-modern">{{ formatNumber(totalApiTokens) }}</span>
                </div>
              </div>
              <div class="summary-card-modern">
                <div class="summary-icon success">
                  <span class="material-symbols-outlined">check_circle</span>
                </div>
                <div class="summary-content">
                  <span class="summary-label-modern">Thành công</span>
                  <span class="summary-value-modern success-text">{{ apiSuccessRate }}%</span>
                </div>
              </div>
              <div class="summary-card-modern">
                <div class="summary-icon error">
                  <span class="material-symbols-outlined">error</span>
                </div>
                <div class="summary-content">
                  <span class="summary-label-modern">Lỗi</span>
                  <span class="summary-value-modern error-text">{{ apiErrorRate }}%</span>
                </div>
              </div>
            </div>

            <!-- Provider Usage List -->
            <div class="provider-list-modern">
              <div v-for="provider in apiUsage" :key="provider.name" class="provider-item-modern">
                <div class="provider-header-modern">
                  <div class="provider-info">
                    <div class="provider-badge" :style="{ backgroundColor: provider.color }"></div>
                    <span class="provider-name-modern">{{ provider.name }}</span>
                  </div>
                  <div class="provider-stats">
                    <span class="provider-percentage">{{ provider.percentage }}%</span>
                    <span class="provider-trend" :class="provider.trend">
                      <span class="material-symbols-outlined">
                        {{ provider.trend === 'up' ? 'trending_up' : 'trending_down' }}
                      </span>
                      {{ provider.change }}
                    </span>
                  </div>
                </div>
                <div class="progress-bar-modern">
                  <div
                    class="progress-fill-modern"
                    :style="{ width: provider.percentage + '%', backgroundColor: provider.color }"
                  ></div>
                </div>
                <div class="provider-details-modern">
                  <span class="provider-count">{{ provider.usage }} requests</span>
                </div>
              </div>
            </div>

            <!-- Charts Section -->
            <div class="charts-section-modern">
              <div class="chart-container-modern timeline-chart">
                <div class="chart-header-inline">
                  <div>
                    <h4 class="chart-title-modern">
                      <span class="material-symbols-outlined">show_chart</span>
                      Biểu đồ theo thời gian
                    </h4>
                    <p class="chart-subtitle">Xu hướng requests theo ngày</p>
                  </div>
                </div>
                <div class="chart-canvas-wrapper">
                  <canvas ref="timelineChart" id="timelineChart"></canvas>
                </div>
              </div>
              <div class="charts-grid-modern">
                <div class="chart-container-modern">
                  <div class="chart-header-inline">
                    <div>
                      <h4 class="chart-title-modern">
                        <span class="material-symbols-outlined">donut_large</span>
                        Phân bố Provider
                      </h4>
                      <p class="chart-subtitle">Tỷ lệ sử dụng</p>
                    </div>
                  </div>
                  <div class="chart-canvas-wrapper">
                    <canvas ref="providerChart" id="providerChart"></canvas>
                  </div>
                </div>
                <div class="chart-container-modern">
                  <div class="chart-header-inline">
                    <div>
                      <h4 class="chart-title-modern">
                        <span class="material-symbols-outlined">bar_chart</span>
                        Thành công / Thất bại
                      </h4>
                      <p class="chart-subtitle">Tỷ lệ trạng thái</p>
                    </div>
                  </div>
                  <div class="chart-canvas-wrapper">
                    <canvas ref="statusChart" id="statusChart"></canvas>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Management Sections -->
      <section class="management-section">
        <div class="management-grid">
          <!-- User Management -->
          <div class="management-card">
            <div class="card-header">
              <h3><span class="material-symbols-outlined">group</span> Quản lý người dùng</h3>
              <span class="card-badge">{{ stats.totalUsers }}</span>
            </div>
            <div class="card-content">
              <div class="quick-stats">
                <div class="quick-stat">
                  <span class="stat-label">Hoạt động</span>
                  <span class="stat-value">{{ stats.activeUsers }}</span>
                </div>
                <div class="quick-stat">
                  <span class="stat-label">Mới hôm nay</span>
                  <span class="stat-value">{{ stats.newUsersToday }}</span>
                </div>
                <div class="quick-stat">
                  <span class="stat-label">Đang chờ</span>
                  <span class="stat-value">{{ stats.pendingUsers }}</span>
                </div>
              </div>
              <div class="action-buttons">
                <button class="btn-action primary" @click="showUserManagementModal = true">
                  <span class="material-symbols-outlined">list</span>
                  Danh sách người dùng
                </button>
                <button class="btn-action secondary" @click="showAddUserModal = true">
                  <span class="material-symbols-outlined">person_add</span>
                  Thêm người dùng
                </button>
              </div>
            </div>
          </div>

          <!-- API Key Management -->
          <div class="management-card">
            <div class="card-header">
              <h3><span class="material-symbols-outlined">key</span> Quản lý API Keys</h3>
              <span class="card-badge">{{ stats.activeApiKeys }}</span>
            </div>
            <div class="card-content">
              <div class="quick-stats" style="min-height:150px">
                <!-- <div class="quick-stat">
                  <span class="stat-label">Gemini</span>
                  <span class="stat-value">{{ apiStats.gemini }}</span>
                </div>
                <div class="quick-stat">
                  <span class="stat-label">OpenAI</span>
                  <span class="stat-value">{{ apiStats.openai }}</span>
                </div>
                <div class="quick-stat">
                  <span class="stat-label">Claude</span>
                  <span class="stat-value">{{ apiStats.claude }}</span>
                </div> -->
              </div>
              <div class="action-buttons">
                <button class="btn-action primary" @click="showApiKeyManagementModal = true">
                  <span class="material-symbols-outlined">list</span>
                  Danh sách API Keys
                </button>
                <button class="btn-action secondary" @click="showAddApiKeyModal = true">
                  <span class="material-symbols-outlined">add</span>
                  Thêm API Key
                </button>
                <button class="btn-action secondary" @click="showApiAnalyticsModal = true">
                  <span class="material-symbols-outlined">analytics</span>
                  Phân tích sử dụng
                </button>
              </div>
            </div>
          </div>

          <!-- Project Management -->
          <div class="management-card">
            <div class="card-header">
              <h3><span class="material-symbols-outlined">folder</span> Quản lý dự án</h3>
              <span class="card-badge">{{ stats.totalProjects }}</span>
            </div>
            <div class="card-content">
              <div class="quick-stats">
                <div class="quick-stat">
                  <span class="stat-label">Đang hoạt động</span>
                  <span class="stat-value">{{ stats.activeProjects }}</span>
                </div>
                <div class="quick-stat">
                  <span class="stat-label">Mới hôm nay</span>
                  <span class="stat-value">{{ stats.newProjectsToday }}</span>
                </div>
                <div class="quick-stat">
                  <span class="stat-label">Đã xóa</span>
                  <span class="stat-value">{{ stats.deletedProjects }}</span>
                </div>
              </div>
              <div class="action-buttons">
                <button class="btn-action primary" @click="showProjectManagementModal = true">
                  <span class="material-symbols-outlined">list</span>
                  Danh sách dự án
                </button>
                <button class="btn-action secondary" @click="showProjectAnalyticsModal = true">
                  <span class="material-symbols-outlined">analytics</span>
                  Phân tích
                </button>
                <button class="btn-action secondary" @click="showProjectTemplatesModal = true">
                  <span class="material-symbols-outlined">description</span>
                  Template
                </button>
              </div>
            </div>
          </div>

          <!-- System Management -->
          <!-- <div class="management-card">
            <div class="card-header">
              <h3><span class="material-symbols-outlined">settings</span> Quản lý hệ thống</h3>
              <span class="card-badge">{{ systemStats.totalConfigs }}</span>
            </div>
            <div class="card-content">
              <div class="quick-stats">
                <div class="quick-stat">
                  <span class="stat-label">Dịch vụ</span>
                  <span class="stat-value">{{ systemStats.activeServices }}</span>
                </div>
                <div class="quick-stat">
                  <span class="stat-label">Cấu hình</span>
                  <span class="stat-value">{{ systemStats.totalConfigs }}</span>
                </div>
                <div class="quick-stat">
                  <span class="stat-label">Backup</span>
                  <span class="stat-value">{{ systemStats.lastBackup }}</span>
                </div>
              </div>
              <div class="action-buttons">
                <button class="btn-action primary" @click="showSystemSettingsModal = true">
                  <span class="material-symbols-outlined">settings</span>
                  Cài đặt hệ thống
                </button>
                <button class="btn-action secondary" @click="showBackupModal = true">
                  <span class="material-symbols-outlined">backup</span>
                  Sao lưu
                </button>
              </div>
            </div>
          </div> -->
        </div>
      </section>

      <!-- Two Column Layout -->
      <section class="two-column-section">
        <div class="column-grid">
          <!-- Log System (moved here, replaces Recent Activity) -->
          <div class="column-card">
            <div class="card-header">
              <h3>
                <span class="material-symbols-outlined">list_alt</span> Log hệ thống
              </h3>
              <div class="card-actions">
                <div class="log-filters">
                  <div class="filter-icon-wrapper">
                    <button 
                      class="filter-icon-btn-modern" 
                      @click.stop="toggleLogLevelFilter"
                      :title="getLogLevelFilterLabel()"
                    >
                      <span class="material-symbols-outlined">signal_cellular_alt</span>
                    </button>
                    <div 
                      v-if="showLogLevelFilter" 
                      class="filter-dropdown-menu"
                      @click.stop
                    >
                      <button 
                        class="filter-option" 
                        :class="{ active: logFilter.level === 'all' }"
                        @click="setLogLevelFilter('all')"
                      >
                        <span class="material-symbols-outlined">filter_alt_off</span>
                        All Levels
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: logFilter.level === 'info' }"
                        @click="setLogLevelFilter('info')"
                      >
                        <span class="material-symbols-outlined">info</span>
                        Info
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: logFilter.level === 'warning' }"
                        @click="setLogLevelFilter('warning')"
                      >
                        <span class="material-symbols-outlined">warning</span>
                        Warning
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: logFilter.level === 'error' }"
                        @click="setLogLevelFilter('error')"
                      >
                        <span class="material-symbols-outlined">error</span>
                        Error
                      </button>
                    </div>
                  </div>
                  <div class="filter-icon-wrapper">
                    <button 
                      class="filter-icon-btn-modern" 
                      @click.stop="toggleLogTypeFilter"
                      :title="getLogTypeFilterLabel()"
                    >
                      <span class="material-symbols-outlined">category</span>
                    </button>
                    <div 
                      v-if="showLogTypeFilter" 
                      class="filter-dropdown-menu"
                      @click.stop
                    >
                      <button 
                        class="filter-option" 
                        :class="{ active: logFilter.type === 'all' }"
                        @click="setLogTypeFilter('all')"
                      >
                        <span class="material-symbols-outlined">filter_alt_off</span>
                        All Types
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: logFilter.type === 'system' }"
                        @click="setLogTypeFilter('system')"
                      >
                        <span class="material-symbols-outlined">settings</span>
                        System
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: logFilter.type === 'user' }"
                        @click="setLogTypeFilter('user')"
                      >
                        <span class="material-symbols-outlined">person</span>
                        User
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: logFilter.type === 'project' }"
                        @click="setLogTypeFilter('project')"
                      >
                        <span class="material-symbols-outlined">folder</span>
                        Project
                      </button>
                      <button 
                        class="filter-option" 
                        :class="{ active: logFilter.type === 'member' }"
                        @click="setLogTypeFilter('member')"
                      >
                        <span class="material-symbols-outlined">group</span>
                        Member
                      </button>
                    </div>
                  </div>
                </div>
                <button class="btn-icon" @click="refreshLogs">
                  <span class="material-symbols-outlined">refresh</span>
                </button>
                <div class="relative dropdown">
                  <button 
                    class="btn-action secondary flex items-center gap-1"
                    @click.stop="showExportMenu = !showExportMenu" 
                  >
                    <span class="material-symbols-outlined">download</span>
                    Xuất log
                    <span class="material-symbols-outlined text-sm">expand_more</span>
                  </button>
                  
                  <div 
                    v-if="showExportMenu" 
                    class="dropdown-menu absolute right-0 mt-2 w-36 bg-white border rounded-lg shadow-lg z-50"
                  >
                    <button @click="exportLogs('pdf'); showExportMenu = false" class="dropdown-item">Xuất PDF</button>
                    <button @click="exportLogs('csv'); showExportMenu = false" class="dropdown-item">Xuất CSV</button>
                    <button @click="exportLogs('json'); showExportMenu = false" class="dropdown-item">Xuất JSON</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="log-list">
              <div v-for="log in filteredLogs" :key="log.id" class="log-item" :class="log.level">
                <div class="log-icon-wrapper" :class="log.level">
                  <span class="material-symbols-outlined">{{ getLogIcon(log) }}</span>
                </div>
                <div class="log-content">
                  <div class="log-header-enhanced">
                    <div class="log-user-info">
                      <span class="log-user-name">{{ log.user || 'System' }}</span>
                      <span class="log-action-type">{{ formatLogAction(log.action) }}</span>
                    </div>
                    <div class="log-badges">
                      <span class="log-type-badge">{{ formatLogType(log.type) }}</span>
                      <span class="log-status-badge" :class="getLogStatus(log)">
                        <span class="material-symbols-outlined">{{ getStatusIcon(log) }}</span>
                        {{ getLogStatusText(log) }}
                      </span>
                      <!-- <span class="log-level-badge" :class="log.level">
                        <span class="material-symbols-outlined">{{ getLevelIcon(log.level) }}</span>
                        {{ formatLogLevel(log.level) }}
                      </span> -->
                    </div>
                  </div>
                  <div class="log-message-enhanced">
                    {{ formatLogMessage(log) }}
                  </div>
                  <div class="log-meta-enhanced">
                    <span class="log-time-enhanced" :title="formatFullTime(log.timestamp)">
                      <span class="material-symbols-outlined">schedule</span>
                      {{ formatTime(log.timestamp) }}
                    </span>
                    <span v-if="log.ip && log.ip !== '-'" class="log-ip" :title="`IP: ${log.ip}`">
                      <span class="material-symbols-outlined">language</span>
                      {{ log.ip }}
                    </span>
                  </div>
                </div>
                <div class="log-actions">
                  <button class="btn-icon small" @click="viewLogDetails(log)" title="Xem chi tiết">
                    <span class="material-symbols-outlined">visibility</span>
                  </button>
                </div>
              </div>
            </div>
            <div class="log-footer">
              <div class="log-summary">
                Hiển thị {{ filteredLogs.length }} log
                <span v-if="logFilter.level !== 'all'">(lọc theo {{ logFilter.level }})</span>
              </div>
              <button class="btn-view-all" @click="showLogManagementModal = true">
                Xem tất cả log
              </button>
            </div>
          </div>

          <!-- System Status (right column, unchanged) -->
          <!-- <div class="column-card">
            <div class="card-header">
              <h3>
                <span class="material-symbols-outlined">monitor_heart</span> Trạng thái hệ thống
              </h3>
              <div class="card-actions">
                <button class="btn-icon" @click="refreshSystemStatus">
                  <span class="material-symbols-outlined">refresh</span>
                </button>
              </div>
            </div>
            <div class="system-status">
              <div class="status-item" v-for="service in systemServices" :key="service.name">
                <div class="status-info">
                  <div class="status-name">{{ service.name }}</div>
                  <div class="status-description">{{ service.description }}</div>
                </div>
                <div class="status-indicator" :class="service.status">
                  <div class="status-dot"></div>
                  <span class="status-text">{{ service.statusText }}</span>
                  <span class="status-uptime" v-if="service.uptime">{{ service.uptime }}</span>
                </div>
              </div>
            </div>
            <div class="system-metrics">
              <div class="metric-item">
                <span class="metric-label">CPU</span>
                <div class="metric-bar">
                  <div class="metric-fill" :style="{ width: systemMetrics.cpu + '%' }"></div>
                </div>
                <span class="metric-value">{{ systemMetrics.cpu }}%</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Memory</span>
                <div class="metric-bar">
                  <div class="metric-fill" :style="{ width: systemMetrics.memory + '%' }"></div>
                </div>
                <span class="metric-value">{{ systemMetrics.memory }}%</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Disk</span>
                <div class="metric-bar">
                  <div class="metric-fill" :style="{ width: systemMetrics.disk + '%' }"></div>
                </div>
                <span class="metric-value">{{ systemMetrics.disk }}%</span>
              </div>
            </div>
          </div> -->
        </div>
      </section>
    </main>

    <!-- Modals -->
    <!-- Profile Modal -->
    <AdminProfileModal
      v-if="showProfileModal"
      :user="currentUser"
      @save="updateProfile"
      @close="showProfileModal = false"
    />

    <!-- Change Password Modal -->
    <AdminChangePasswordModal
      v-if="showChangePasswordModal"
      @change="changePassword"
      @close="showChangePasswordModal = false"
    />

    <!-- Add User Modal -->
    <AdminAddUserModal v-if="showAddUserModal" @add="addUser" @close="showAddUserModal = false" />

    <!-- Add API Key Modal -->
    <AdminAddApiKeyModal
      v-if="showAddApiKeyModal"
      @add="addApiKey"
      @close="showAddApiKeyModal = false"
    />

    <!-- System Settings Modal -->
    <AdminSystemSettingsModal
      v-if="showSystemSettingsModal"
      :settings="systemSettings"
      @save="saveSystemSettings"
      @close="showSystemSettingsModal = false"
    />

    <!-- User Management Modal -->
    <AdminUserManagementModal
      v-if="showUserManagementModal"
      @close="showUserManagementModal = false"
    />

    <!-- API Key Management Modal -->
    <AdminApiKeyManagementModal
      v-if="showApiKeyManagementModal"
      @close="showApiKeyManagementModal = false"
    />

    <!-- Project Management Modal -->
    <AdminProjectManagementModal
      v-if="showProjectManagementModal"
      @close="showProjectManagementModal = false"
    />

    <!-- Log Management Modal -->
    <AdminLogManagementModal
      v-if="showLogManagementModal"
      @close="showLogManagementModal = false"
    />

    <!-- Other Modals -->
    <AdminApiAnalyticsModal v-if="showApiAnalyticsModal" @close="showApiAnalyticsModal = false" />

    <AdminProjectAnalyticsModal
      v-if="showProjectAnalyticsModal"
      @close="showProjectAnalyticsModal = false"
    />

    <AdminProjectTemplatesModal
      v-if="showProjectTemplatesModal"
      @close="showProjectTemplatesModal = false"
    />

    <AdminBackupModal v-if="showBackupModal" @close="showBackupModal = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import axiosClient from '@/utils/axiosClient'
import { socket, initSocketConnection } from '@/utils/socket'
import { useToast } from 'vue-toastification'
// Component imports
import AdminProfileModal from '@/components/admin/AdminProfileModal.vue'
import AdminChangePasswordModal from '@/components/admin/AdminChangePasswordModal.vue'
import AdminAddUserModal from '@/components/admin/AdminAddUserModal.vue'
import AdminAddApiKeyModal from '@/components/admin/AdminAddApiKeyModal.vue'
import AdminSystemSettingsModal from '@/components/admin/AdminSystemSettingsModal.vue'
import AdminUserManagementModal from '@/components/admin/AdminUserManagementModal.vue'
import AdminApiKeyManagementModal from '@/components/admin/AdminApiKeyManagementModal.vue'
import AdminProjectManagementModal from '@/components/admin/AdminProjectManagementModal.vue'
// import AdminLogManagementModal from '@/components/admin/AdminLogManagementModal.vue'
// import AdminApiAnalyticsModal from '@/components/admin/AdminApiAnalyticsModal.vue'
// import AdminProjectAnalyticsModal from '@/components/admin/AdminProjectAnalyticsModal.vue'
// import AdminProjectTemplatesModal from '@/components/admin/AdminProjectTemplatesModal.vue'
// import AdminBackupModal from '@/components/admin/AdminBackupModal.vue'
const router = useRouter()
// State
const showUserMenu = ref(false)
const hoveredSegment = ref(null)
const { toast } = useToast()
// Modal states
const showExportMenu = ref(false)
const showProfileModal = ref(false)
const showChangePasswordModal = ref(false)
const showSystemSettingsModal = ref(false)
const showAddUserModal = ref(false)
const showAddApiKeyModal = ref(false)
const showUserManagementModal = ref(false)
const showApiKeyManagementModal = ref(false)
const showProjectManagementModal = ref(false)
const showProjectAnalyticsModal = ref(false)
const showLogManagementModal = ref(false)
const showApiAnalyticsModal = ref(false)
const showProjectTemplatesModal = ref(false)
const showBackupModal = ref(false)

// Data
const currentUser = ref({
  name: 'Đang tải...',
  email: '',
  avatar_url: '',
})

const stats = ref({})
const systemStats = ref({})
const apiUsage = ref([])
const apiStats = ref({})
const totalApiRequests = ref(0)
const totalApiTokens = ref(0)
const apiSuccessRate = ref(0)
const apiErrorRate = ref(0)

const userDistribution = ref([
])
const userList = ref([])

const systemServices = ref([])
const systemMetrics = ref({
  cpu: 0,
  memory: 0,
  disk: 0,
  network: 0,
})

const systemLogs = ref([])
const logLoading = ref(false)
const logFilter = ref({
  level: 'all',
  type: 'all',
})

// Filter dropdown states
const showRangeDaysFilter = ref(false)
const showViewModeFilter = ref(false)
const showProviderFilter = ref(false)
const showStatusFilter = ref(false)
const showLogLevelFilter = ref(false)
const showLogTypeFilter = ref(false)

const systemSettings = ref({})

// API Filters
const apiFilters = ref({
  dateFrom: '',
  dateTo: '',
  provider: '',
  status: '',
})

// User analytics filters
const userAnalyticsFilters = ref({
  rangeDays: 7,
  viewMode: 'day', // 'day' | 'month' | 'year'
})

// Chart refs
const timelineChart = ref(null)
const providerChart = ref(null)
const statusChart = ref(null)
const userDistributionChart = ref(null)
const userTimelineChart = ref(null)
let timelineChartInstance = null
let providerChartInstance = null
let statusChartInstance = null
let userDistributionChartInstance = null
let userTimelineChartInstance = null

const userAnalytics = ref({
  counters: {
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    newUsersToday: 0,
    onlineToday: 0,
  },
  registrationTimeline: [],
  rangeDays: 7,
})

// Computed
const userTrend = ref({ type: 'positive', icon: 'trending_up', value: '+0%' })
const apiTrend = ref({ type: 'positive', icon: 'trending_up', value: '+0%' })
const projectTrend = ref({ type: 'positive', icon: 'trending_up', value: '+0%' })
const activityTrend = ref({ type: 'negative', icon: 'trending_down', value: '-0%' })

const filteredLogs = computed(() => {
  return systemLogs.value.filter((log) => {
    const levelMatch = logFilter.value.level === 'all' || log.level === logFilter.value.level
    const typeMatch = logFilter.value.type === 'all' || log.type === logFilter.value.type
    return levelMatch && typeMatch
  })
})
const fetchCurrentUser = async () => {
  try {
    const res = await axiosClient.get('/api/auth/me')
    if (res.data?.status === 'Success' && res.data.data) {
      const user = res.data.data
      const BASE_URL = 'http://localhost:8000'

      currentUser.value = {
        id: user.id,
        name: user.name || 'Không rõ',
        email: user.email || 'Chưa có email',
        avatar_url: user.avatar_url
          ? user.avatar_url.startsWith('http')
            ? user.avatar_url
            : `${BASE_URL}${user.avatar_url}`
          : 'https://static.vecteezy.com/system/resources/previews/024/983/914/original/simple-user-default-icon-free-png.png',
      }

      console.log('✅ Current user loaded:', currentUser.value)
    } else {
      console.warn('⚠️ Không lấy được user từ /api/auth/me', res.data)
    }
  } catch (err) {
    console.error('❌ Lỗi khi lấy thông tin user:', err)
  }
}
// Methods
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

const formatNumber = (num) => {
  return new Intl.NumberFormat('vi-VN').format(num)
}

const formatTime = (date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  if (hours < 24) return `${hours} giờ trước`
  return `${days} ngày trước`
}

const formatFullTime = (date) => {
  const d = new Date(date)
  return d.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatLogLevel = (level) => {
  const levelMap = {
    info: 'Thông tin',
    warning: 'Cảnh báo',
    error: 'Lỗi'
  }
  return levelMap[level] || level
}

const formatLogType = (type) => {
  const typeMap = {
    system: 'Hệ thống',
    user: 'Người dùng',
    project: 'Dự án',
    member: 'Thành viên'
  }
  return typeMap[type] || type
}

const formatLogAction = (action) => {
  if (!action) return ''
  return action
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const getLogIcon = (log) => {
  const action = log.action?.toLowerCase() || ''
  if (action.includes('login')) return 'login'
  if (action.includes('logout')) return 'logout'
  if (action.includes('create')) return 'add_circle'
  if (action.includes('update')) return 'edit'
  if (action.includes('delete')) return 'delete'
  if (action.includes('generate')) return 'auto_awesome'
  if (action.includes('export')) return 'download'
  if (action.includes('error') || action.includes('failed')) return 'error'
  return 'info'
}

const getLevelIcon = (level) => {
  const iconMap = {
    info: 'info',
    warning: 'warning',
    error: 'error'
  }
  return iconMap[level] || 'circle'
}

const getLogStatus = (log) => {
  // Xác định status dựa trên level và action
  if (log.level === 'error' || log.action?.toLowerCase().includes('failed') || log.action?.toLowerCase().includes('error')) {
    return 'status-failed'
  }
  // Nếu không phải error thì coi là success
  return 'status-success'
}

const getLogStatusText = (log) => {
  const status = getLogStatus(log)
  return status === 'status-failed' ? 'Thất bại' : 'Thành công'
}

const getStatusIcon = (log) => {
  const status = getLogStatus(log)
  return status === 'status-failed' ? 'cancel' : 'check_circle'
}

const formatLogMessage = (log) => {
  if (!log.message) return 'Không có mô tả hành động'
  
  let message = String(log.message)
  const userName = log.user || 'Hệ thống'
  const userId = log.userId || ''
  
  // Pattern 1: Thay thế user ID (ObjectId format) bằng tên người dùng
  // "6927fdb0baa4bc0eafe6e990" → tên người dùng
  if (userId && typeof userId === 'string' && userId.length === 24) {
    // ObjectId pattern: 24 ký tự hex
    const objectIdPattern = new RegExp(`\\b${userId}\\b`, 'gi')
    message = message.replace(objectIdPattern, userName)
  }
  
  // Pattern 2: "User "ID" logged out successfully (Session ID: ...)" 
  // → "Người dùng [Tên] đã đăng xuất thành công"
  message = message.replace(/User\s+["']?([^"'\s]+)["']?\s+logged\s+out\s+successfully[^.]*/gi, 
    () => `Người dùng ${userName} đã đăng xuất thành công`)
  
  // Pattern 3: "User "ID" logged in successfully"
  message = message.replace(/User\s+["']?([^"'\s]+)["']?\s+logged\s+in\s+successfully[^.]*/gi, 
    () => `Người dùng ${userName} đã đăng nhập thành công`)
  
  // Pattern 4: "ID updated usecase X in version Y"
  // → "Người dùng [Tên] đã cập nhật usecase 'X' trong version Y"
  message = message.replace(/([a-f0-9]{24})\s+updated\s+usecase\s+([^i]+?)\s+in\s+version\s+([\d.]+)/gi, 
    (match, id, usecase, version) => {
      const name = (id === userId || id.length === 24) ? userName : id
      return `${name} đã cập nhật usecase "${usecase.trim()}" trong version ${version}`
    })
  
  // Pattern 5: "ID created usecase X in version Y"
  message = message.replace(/([a-f0-9]{24})\s+created\s+usecase\s+([^i]+?)\s+in\s+version\s+([\d.]+)/gi, 
    (match, id, usecase, version) => {
      const name = (id === userId || id.length === 24) ? userName : id
      return `${name} đã tạo usecase "${usecase.trim()}" trong version ${version}`
    })
  
  // Pattern 6: "ID deleted usecase X in version Y"
  message = message.replace(/([a-f0-9]{24})\s+deleted\s+usecase\s+([^i]+?)\s+in\s+version\s+([\d.]+)/gi, 
    (match, id, usecase, version) => {
      const name = (id === userId || id.length === 24) ? userName : id
      return `${name} đã xóa usecase "${usecase.trim()}" trong version ${version}`
    })
  
  // Pattern 7: Bất kỳ ObjectId nào còn lại trong message → thay bằng userName nếu match userId
  if (userId && userId.length === 24) {
    const remainingObjectIdPattern = new RegExp(`\\b${userId}\\b`, 'gi')
    message = message.replace(remainingObjectIdPattern, userName)
  }
  
  // Loại bỏ Session ID không cần thiết
  message = message.replace(/\s*\(Session ID:\s*[^)]+\)/gi, '')
  message = message.replace(/\s*\(session id:\s*[^)]+\)/gi, '')
  
  // Loại bỏ các dấu ngoặc kép thừa và chuẩn hóa
  message = message.replace(/["']{2,}/g, '"')
  message = message.replace(/^["']|["']$/g, '')
  
  // Loại bỏ khoảng trắng thừa
  message = message.replace(/\s+/g, ' ').trim()
  
  // Đảm bảo câu đầu tiên viết hoa
  if (message.length > 0) {
    message = message.charAt(0).toUpperCase() + message.slice(1)
  }
  
  return message
}


const pieBackground = computed(() => {
  let start = 0
  const gradients = userDistribution.value.map((item) => {
    const end = start + item.percentage * 3.6
    const part = `${item.color} ${start}deg ${end}deg`
    start = end
    return part
  })
  return `conic-gradient(${gradients.join(', ')})`
})
const refreshProjectStats = async () => {
  try {
    const res = await axiosClient.get('http://localhost:8000/api/projects/admin/all')

    if (res.data?.status === 'Success' && Array.isArray(res.data.data)) {
      const projects = res.data.data

      // Tổng số dự án
      stats.value.totalProjects = projects.length

      // Dự án đang hoạt động (chưa bị xóa)
      const activeProjects = projects.filter((p) => !p.isTrashed).length
      stats.value.activeProjects = activeProjects

      // Dự án đã xóa (isTrashed = true)
      const trashedProjects = projects.filter((p) => p.isTrashed).length
      stats.value.deletedProjects = trashedProjects

      // Dự án tạo trong hôm nay
      const today = new Date().toISOString().split('T')[0]
      const newProjectsToday = projects.filter((p) => {
        const createdDate = new Date(p.createdAt).toISOString().split('T')[0]
        return createdDate === today
      }).length
      stats.value.newProjectsToday = newProjectsToday

      console.log('✅ Project stats loaded:', {
        total: projects.length,
        active: activeProjects,
        deleted: trashedProjects,
        today: newProjectsToday,
      })
    } else {
      console.warn('⚠️ Không nhận được dữ liệu hợp lệ từ API /projects/admin/all')
    }
  } catch (error) {
    console.error('❌ Lỗi khi tải dữ liệu dự án:', error)
  }
}

const refreshUserStats = async () => {
  try {
    const res = await axiosClient.get('/api/users')

    if (res.data && res.data.status === 'Success') {
      const rawUsers = res.data.data
      const BASE_URL = 'http://localhost:8000'
      // ✅ Chuẩn hóa dữ liệu người dùng
      const users = rawUsers.map(u => ({
        id: u.id,
        name: u.name || 'Không rõ',
        email: u.email || 'Chưa có email',
        avatar_url: u.avatar_url
          ? u.avatar_url.startsWith('http')
            ? u.avatar_url
            : `${BASE_URL}${u.avatar_url}`
          : 'https://static.vecteezy.com/system/resources/previews/024/983/914/original/simple-user-default-icon-free-png.png',
        role:
          u.system_role === 'ADMIN'
            ? 'Quản Trị Viên'
            : u.system_role === 'PARTICIPANT'
            ? 'Thành Viên'
            : 'Khác',
        system_role: u.system_role,
        status: u.status === 'ACTIVE' ? 'Đang hoạt động' : 'Không hoạt động',
        rawStatus: u.status,
        createdAt: u.dob
          ? new Date(u.dob).toLocaleDateString('vi-VN')
          : 'Không rõ',
        gender:
          u.gender === 'male' ? 'Nam' : u.gender === 'female' ? 'Nữ' : 'Khác',
        twoFactor: u.isTwoFactorEnabled ? 'Bật' : 'Tắt',
      }))

      // ✅ Lưu danh sách người dùng để dùng ở modal
      userList.value = users

      // ✅ Tổng số người dùng
      stats.value.totalUsers = users.length

      // ✅ Đếm hoạt động / không hoạt động
      stats.value.activeUsers = users.filter(u => u.rawStatus === 'ACTIVE').length
      stats.value.inactiveUsers = users.filter(u => u.rawStatus !== 'ACTIVE').length

      // ✅ Đếm theo role
      const roleCounts = users.reduce((acc, user) => {
        acc[user.system_role] = (acc[user.system_role] || 0) + 1
        return acc
      }, {})

      // ✅ Biểu đồ phân bố người dùng
      const total = users.length || 1
      const distribution = Object.entries(roleCounts).map(([role, count]) => ({
        label:
          role === 'ADMIN'
            ? 'Admin'
            : role === 'PARTICIPANT'
            ? 'Participant'
            : role,
        value: count,
        percentage: Math.round((count / total) * 100),
        color:
          role === 'ADMIN'
            ? '#13235d'
            : role === 'PARTICIPANT'
            ? '#52abea'
            : '#8884d8',
      }))

      userDistribution.value = distribution

      // Đồng bộ counters cơ bản với userAnalytics (fallback nếu API analytics chưa trả về)
      userAnalytics.value.counters.totalUsers = users.length
      userAnalytics.value.counters.activeUsers = stats.value.activeUsers || 0
      // Load chart after data is ready
      setTimeout(() => {
        loadUserDistributionChart()
      }, 100)

      console.log('✅ User stats loaded:', {
        total: users.length,
        active: stats.value.activeUsers,
        inactive: stats.value.inactiveUsers,
        distribution,
      })
    } else {
      console.warn('❌ Dữ liệu không hợp lệ khi gọi /api/users:', res.data)
    }
  } catch (error) {
    console.error('❌ Lỗi khi tải thống kê người dùng:', error)
  }
}

// Load user analytics (new registrations, online users, timeline)
const loadUserAnalytics = async () => {
  try {
    const params = {
      rangeDays: userAnalyticsFilters.value.rangeDays,
    }
    const res = await axiosClient.get('/api/stats/users/analytics', { params })
    
    // Xử lý response format: có thể là res.data hoặc res.data.data
    const data = res.data?.data || res.data
    
    if (data) {
      userAnalytics.value = {
        counters: data.counters || userAnalytics.value.counters,
        registrationTimeline: data.registrationTimeline || [],
        rangeDays: data.rangeDays || userAnalyticsFilters.value.rangeDays,
      }

      console.log('✅ User analytics loaded:', {
        counters: userAnalytics.value.counters,
        timelineCount: userAnalytics.value.registrationTimeline.length,
        rangeDays: userAnalytics.value.rangeDays
      })

      // Đợi một chút để đảm bảo canvas đã sẵn sàng, sau đó load chart
      await new Promise(resolve => setTimeout(resolve, 100))
      await loadUserTimelineChart()
    } else {
      console.warn('⚠️ Không nhận được dữ liệu từ user analytics API:', res.data)
    }
  } catch (error) {
    console.error('❌ Lỗi khi tải user analytics:', error)
    toast.error('Không thể tải dữ liệu đăng ký người dùng')
  }
}

const applyApiFilters = async () => {
  await refreshApiStats()
  await loadChartData()
}

const resetApiFilters = () => {
  apiFilters.value = {
    dateFrom: '',
    dateTo: '',
    provider: '',
    status: '',
  }
  applyApiFilters()
}

const refreshApiStats = async () => {
  try {
    // Lấy số lượng keys
    const keysRes = await axiosClient.get('/api/keys')
    if (keysRes.data?.status === 'Success' && Array.isArray(keysRes.data.data)) {
      const keys = keysRes.data.data
      const activeKeys = keys.filter((k) => k.is_active).length
      stats.value.activeApiKeys = activeKeys

      // Đếm theo nhà cung cấp
      const providerStats = keys.reduce((acc, key) => {
        const provider = key.provider?.toLowerCase() || 'other'
        acc[provider] = (acc[provider] || 0) + 1
        return acc
      }, {})

      apiStats.value.gemini = providerStats['gemini'] || 0
      apiStats.value.openai = providerStats['openai'] || 0
      apiStats.value.claude = providerStats['claude'] || 0
    }

    // Lấy usage từ API stats với filters
    const params = {}
    if (apiFilters.value.dateFrom) params.dateFrom = apiFilters.value.dateFrom
    if (apiFilters.value.dateTo) params.dateTo = apiFilters.value.dateTo
    if (apiFilters.value.provider) params.provider = apiFilters.value.provider
    if (apiFilters.value.status) params.status = apiFilters.value.status

    const [usageRes, providerRes] = await Promise.all([
      axiosClient.get('/api/stats/usage-summary', { params }),
      axiosClient.get('/api/stats/provider-usage', { params }),
    ])

    if (usageRes.data) {
      totalApiRequests.value = usageRes.data.total_requests || 0
      totalApiTokens.value = usageRes.data.total_tokens || 0
      apiSuccessRate.value = usageRes.data.total_requests 
        ? Math.round((usageRes.data.total_success / usageRes.data.total_requests) * 100) 
        : 0
      apiErrorRate.value = usageRes.data.total_requests 
        ? Math.round((usageRes.data.total_failed / usageRes.data.total_requests) * 100) 
        : 0
    }

    if (providerRes.data && Array.isArray(providerRes.data)) {
      const totalRequests = providerRes.data.reduce((sum, p) => sum + (p.requests || 0), 0)
      apiUsage.value = providerRes.data.map(p => ({
        name: p.provider,
        usage: formatNumber(p.requests || 0),
        percentage: totalRequests > 0 ? Math.round((p.requests / totalRequests) * 100) : 0,
        color: p.provider === 'Gemini' ? '#1a365d' : p.provider === 'OpenAI' ? '#2d3748' : '#4a5568',
        trend: (p.success || 0) > (p.failed || 0) ? 'up' : 'down',
        change: p.failed > 0 ? `-${Math.round((p.failed / p.requests) * 100)}%` : '+0%',
      }))
    }

    console.log('✅ API stats loaded:', { apiUsage: apiUsage.value, totalRequests: totalApiRequests.value })
  } catch (error) {
    console.error('❌ Lỗi khi tải API key stats:', error)
  }
}

const loadChartData = async () => {
  try {
    const params = {}
    if (apiFilters.value.dateFrom) params.dateFrom = apiFilters.value.dateFrom
    if (apiFilters.value.dateTo) params.dateTo = apiFilters.value.dateTo
    if (apiFilters.value.provider) params.provider = apiFilters.value.provider

    const [timelineRes, providerRes, statusRes] = await Promise.all([
      axiosClient.get('/api/stats/usage/charts', { params: { ...params, chartType: 'timeline' } }),
      axiosClient.get('/api/stats/usage/charts', { params: { ...params, chartType: 'provider' } }),
      axiosClient.get('/api/stats/usage/charts', { params: { ...params, chartType: 'status' } }),
    ])

    // Load Chart.js dynamically
    const Chart = (await import('chart.js/auto')).default

    // Timeline Chart (Line)
    if (timelineRes.data?.data) {
      const ctx = timelineChart.value?.getContext('2d')
      if (ctx) {
        if (timelineChartInstance) timelineChartInstance.destroy()
        timelineChartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels: timelineRes.data.data.map(d => d.date),
            datasets: [
              {
                label: 'Requests',
                data: timelineRes.data.data.map(d => d.requests),
                borderColor: '#1a365d',
                backgroundColor: 'rgba(26, 54, 93, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 3,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#1a365d',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
              },
              {
                label: 'Success',
                data: timelineRes.data.data.map(d => d.success),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 3,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
              },
              {
                label: 'Failed',
                data: timelineRes.data.data.map(d => d.failed),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 3,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#ef4444',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
              mode: 'index',
              intersect: false,
            },
            plugins: {
              legend: { 
                position: 'top',
                labels: {
                  usePointStyle: true,
                  padding: 20,
                  font: { size: 13, weight: '600' }
                }
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 16,
                titleFont: { size: 14, weight: '600' },
                bodyFont: { size: 13 },
                cornerRadius: 8,
                position: 'nearest',
                intersect: false,
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                ticks: { font: { size: 12 } }
              },
              x: {
                grid: { display: false },
                ticks: { font: { size: 12 } }
              }
            }
          },
          plugins: [
            {
              id: 'timelineCrosshair',
              afterDraw(chart) {
                const activePoints = chart.getActiveElements()
                if (!activePoints || activePoints.length === 0) return

                const ctx = chart.ctx
                const chartArea = chart.chartArea
                const x = activePoints[0].element.x

                ctx.save()
                ctx.beginPath()
                ctx.moveTo(x, chartArea.top)
                ctx.lineTo(x, chartArea.bottom)
                ctx.lineWidth = 1
                ctx.strokeStyle = 'rgba(26, 54, 93, 0.6)'
                ctx.setLineDash([4, 4])
                ctx.stroke()
                ctx.restore()
              },
            },
          ],
        })
      }
    }

    // Provider Chart (Pie)
    if (providerRes.data?.data) {
      const ctx = providerChart.value?.getContext('2d')
      if (ctx) {
        if (providerChartInstance) providerChartInstance.destroy()
        providerChartInstance = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: providerRes.data.data.map(d => d.provider),
            datasets: [{
              data: providerRes.data.data.map(d => d.requests),
              backgroundColor: ['#1a365d', '#2d3748', '#4a5568', '#718096'],
              borderWidth: 0,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { 
                position: 'bottom',
                labels: {
                  usePointStyle: true,
                  padding: 20,
                  font: { size: 13, weight: '600' }
                }
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 16,
                titleFont: { size: 14, weight: '600' },
                bodyFont: { size: 13 },
                cornerRadius: 8,
                callbacks: {
                  label: (context) => {
                    const label = context.label || ''
                    const value = context.parsed || 0
                    const total = context.dataset.data.reduce((a, b) => a + b, 0)
                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0
                    return `${label}: ${value} requests (${percentage}%)`
                  }
                }
              }
            },
            cutout: '60%',
          },
        })
      }
    }

    // Status Chart (Bar)
    if (statusRes.data?.data) {
      const ctx = statusChart.value?.getContext('2d')
      if (ctx) {
        if (statusChartInstance) statusChartInstance.destroy()
        statusChartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: statusRes.data.data.map(d => d.status === 'success' ? 'Thành công' : d.status === 'failed' ? 'Thất bại' : 'Timeout'),
            datasets: [{
              label: 'Số lượng',
              data: statusRes.data.data.map(d => d.count),
              backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
              borderRadius: 8,
              borderSkipped: false,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 16,
                titleFont: { size: 14, weight: '600' },
                bodyFont: { size: 13 },
                cornerRadius: 8,
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                ticks: { font: { size: 12 } }
              },
              x: {
                grid: { display: false },
                ticks: { font: { size: 12, weight: '600' } }
              }
            }
          },
        })
      }
    }
  } catch (error) {
    console.error('❌ Lỗi khi tải chart data:', error)
  }
}

const loadUserTimelineChart = async () => {
  try {
    // Kiểm tra canvas ref có sẵn sàng không
    if (!userTimelineChart.value) {
      console.warn('⚠️ Canvas ref chưa sẵn sàng, đợi thêm...')
      setTimeout(() => loadUserTimelineChart(), 200)
      return
    }

    const Chart = (await import('chart.js/auto')).default
    const ctx = userTimelineChart.value?.getContext('2d')

    if (!ctx) {
      console.warn('⚠️ Không thể lấy context từ canvas')
      return
    }

    // Chuẩn hóa dữ liệu: luôn hiển thị đủ rangeDays ngày, nếu không có dữ liệu thì = 0
    const range = userAnalytics.value.rangeDays || userAnalyticsFilters.value.rangeDays || 7
    const raw = userAnalytics.value.registrationTimeline || []
    
    console.log('📊 Loading timeline chart with:', {
      range,
      rawDataCount: raw.length,
      rawData: raw
    })
    
    const countsByDate = raw.reduce((acc, item) => {
      if (item && item.date) {
        acc[item.date] = item.count || 0
      }
      return acc
    }, {})

    const labels = []
    const data = []
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Đảm bảo bắt đầu từ 00:00:00

    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const label = d.toISOString().slice(0, 10) // YYYY-MM-DD
      labels.push(label)
      data.push(countsByDate[label] || 0)
    }
    
    console.log('📈 Chart data prepared:', { labels, data })

    // Gộp dữ liệu theo tháng/năm nếu cần
    const mode = userAnalyticsFilters.value.viewMode || 'day'
    if (mode === 'month' || mode === 'year') {
      const grouped = {}

      labels.forEach((label, idx) => {
        const count = data[idx] || 0
        if (!label) return

        let key = label
        let display = label

        if (mode === 'month') {
          // YYYY-MM -> MM/YYYY
          const parts = label.split('-')
          if (parts.length === 3) {
            const year = parts[0]
            const month = parts[1]
            key = `${year}-${month}`
            display = `${month}/${year}`
          }
        } else if (mode === 'year') {
          const year = label.split('-')[0]
          key = year
          display = year
        }

        if (!grouped[key]) {
          grouped[key] = { label: display, count: 0 }
        }
        grouped[key].count += count
      })

      const sortedKeys = Object.keys(grouped).sort()
      const aggLabels = []
      const aggData = []
      sortedKeys.forEach((k) => {
        aggLabels.push(grouped[k].label)
        aggData.push(grouped[k].count)
      })

      // Gán lại labels/data sau khi gộp
      labels.length = 0
      data.length = 0
      aggLabels.forEach((l) => labels.push(l))
      aggData.forEach((v) => data.push(v))
    }

    // Destroy existing chart instance if exists
    if (userTimelineChartInstance) {
      userTimelineChartInstance.destroy()
      userTimelineChartInstance = null
    }

    // Tạo chart mới
    userTimelineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Đăng ký mới',
              data,
              borderColor: '#4299e1',
              backgroundColor: 'rgba(66, 153, 225, 0.15)',
              tension: 0.4,
              fill: true,
              borderWidth: 3,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: '#3182ce',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 16,
              titleFont: { size: 14, weight: '600' },
              bodyFont: { size: 13 },
              cornerRadius: 8,
              position: 'nearest',
              intersect: false,
              callbacks: {
                label: (context) => {
                  const value = context.parsed.y || 0
                  return `Đăng ký mới: ${value} người`
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: { font: { size: 12 } },
            },
            x: {
              grid: { display: false },
              ticks: {
                font: { size: 12 },
                callback: (value, index, ticks) => {
                  // ticks[index].label trong runtime là string ngày 'YYYY-MM-DD'
                  const tick = ticks[index]
                  const label = tick && typeof tick.label === 'string' ? tick.label : ''
                  if (!label) return ''
                  const parts = label.split('-')
                  if (parts.length !== 3) return label
                  const day = parts[2]
                  const month = parts[1]
                  // Hiển thị dạng dd/MM
                  return `${day}/${month}`
                },
              },
            },
          },
        },
        plugins: [
          {
            id: 'userTimelineCrosshair',
            afterDraw(chart) {
              const activePoints = chart.getActiveElements()
              if (!activePoints || activePoints.length === 0) return

              const ctx = chart.ctx
              const chartArea = chart.chartArea
              const x = activePoints[0].element.x

              ctx.save()
              ctx.beginPath()
              ctx.moveTo(x, chartArea.top)
              ctx.lineTo(x, chartArea.bottom)
              ctx.lineWidth = 1
              ctx.strokeStyle = 'rgba(66, 153, 225, 0.6)'
              ctx.setLineDash([4, 4])
              ctx.stroke()
              ctx.restore()
            },
          },
        ],
      })
      
      console.log('✅ User timeline chart rendered successfully')
  } catch (error) {
    console.error('❌ Lỗi khi vẽ user timeline chart:', error)
    toast.error('Không thể vẽ biểu đồ đăng ký người dùng')
  }
}

const refreshActivities = async () => {
  try {
    const res = await axiosClient.get('/api/stats/activities')
    if (res.data?.dailyActive !== undefined) {
      stats.value.dailyActive = res.data.dailyActive
    }
  } catch (error) {
    console.error('❌ Lỗi khi tải activities:', error)
  }
}

const refreshSystemStatus = async () => {
  try {
    const res = await axiosClient.get('/api/stats/system')
    if (res.data) {
      systemServices.value = res.data.services || []
      systemMetrics.value = {
        cpu: res.data.cpu || 0,
        memory: res.data.memory || 0,
        disk: res.data.disk || 0,
        network: res.data.network || 0,
      }
    }
  } catch (error) {
    console.error('❌ Lỗi khi tải system status:', error)
  }
}

const refreshLogs = async () => {
  logLoading.value = true
  try {
    // ✅ Đồng bộ với backend — kiểm tra đúng tên query param
    const params = {}
    if (logFilter.value.level !== 'all') params.level = logFilter.value.level
    if (logFilter.value.type !== 'all') params.target_type = logFilter.value.type  // <-- đổi từ type sang target_type

    console.log('📡 Fetching logs with params:', params)
    const res = await axiosClient.get('/api/logs', { params })

    const logItems = res.data?.data?.items || res.data?.data || []

    if (res.data?.status === 'Success' && Array.isArray(logItems)) {
      systemLogs.value = logItems.map((log) => {
        // Xử lý user_id - có thể là ObjectId hoặc populated object
        const userId = log.user_id?._id || log.user_id?.id || log.user_id || null
        const userIdString = userId ? String(userId) : null
        
        // Xử lý user name - ưu tiên từ populated user_id (backend đã populate)
        let userName = null
        if (log.user_id && typeof log.user_id === 'object' && !log.user_id._id) {
          // Populated user object
          userName = log.user_id.name || log.user_id.email
        } else if (log.user_id?.name) {
          // Nested populated
          userName = log.user_id.name
        } else if (log.user_id?.email) {
          userName = log.user_id.email
        } else if (log.user_name) {
          userName = log.user_name
        } else if (log.user_email) {
          userName = log.user_email
        }
        
        // Chỉ dùng "Hệ thống" nếu thực sự không có user_id
        // Nếu có user_id nhưng không có tên, có thể user đã bị xóa - dùng "Người dùng [ID ngắn]"
        if (!userName && !userIdString) {
          userName = 'Hệ thống'
        } else if (!userName && userIdString) {
          // Có user_id nhưng không lấy được tên (user có thể đã bị xóa)
          userName = `Người dùng ${userIdString.substring(0, 8)}...`
        }
        
        return {
          id: log._id || log.id,
          userId: userIdString,
          user: userName,
          action: log.action || '-',
          type: log.target_type?.toLowerCase() || 'system',  // ✅ chuẩn hóa type
          level: log.level?.toLowerCase() || 'info',
          message:
            log.details?.message ||
            log.action ||
            'Không có mô tả hành động',
          timestamp: new Date(log.created_at || log.timestamp),
          ip: log.ip || '-',
          userAgent: log.user_agent || '-',
        }
      })

      console.log(`✅ Loaded ${systemLogs.value.length} logs`)
    } else {
      console.warn('⚠️ Không nhận được log hợp lệ:', res.data)
      systemLogs.value = []
    }
  } catch (err) {
    console.error('❌ Lỗi khi tải log:', err)
    toast({
      title: 'Lỗi tải log',
      description:
        err.response?.data?.message || 'Không thể tải log hệ thống.',
      variant: 'destructive',
    })
  } finally {
    logLoading.value = false
  }
}



const exportUserStats = () => {
  console.log('Exporting user stats...')
}

const exportApiStats = () => {
  console.log('Exporting API stats...')
}

const exportLogs = async (format) => {
  try {
    const baseURL = 'http://localhost:8000';
    
    // ✅ Lấy giá trị của bộ lọc
    const levelFilter = logFilter.value.level !== 'all' ? logFilter.value.level : '';
    const typeFilter = logFilter.value.type !== 'all' ? logFilter.value.type : '';
    
    // ✅ Xây dựng các query params
    const params = new URLSearchParams();
    params.append('format', format);

    // Thêm level và target_type vào params nếu chúng không phải 'all'
    if (levelFilter) {
        params.append('level', levelFilter);
    }
    if (typeFilter) {
        params.append('target_type', typeFilter); // Backend đang dùng target_type
    }

    const url = `${baseURL}/api/logs/export?${params.toString()}`;

    console.log('📤 Exporting logs with URL:', url); // Log URL để kiểm tra

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (!response.ok) {
      // Cố gắng đọc thông báo lỗi từ server (nếu có)
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`Server trả lỗi ${response.status}: ${errorText.substring(0, 100)}...`);
    }

    // 👇 Lấy tên file từ header (nếu được expose)
    const disposition = response.headers.get('Content-Disposition');
    const filename =
      disposition?.split('filename=')[1]?.replace(/"/g, '') ||
      `logs_${levelFilter}_${typeFilter}_${Date.now()}.${format}`; // Tạo tên file chi tiết hơn

    // 👇 Đọc binary stream
    const blob = await response.blob();

    // 👇 Tạo và click link tải
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // 👇 Dọn dẹp
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    console.log(`✅ Tải thành công ${filename}`);
  } catch (err) {
    console.error('❌ Lỗi export log:', err);
    alert('Xuất thất bại: ' + err.message);
  }
};

// Filter dropdown methods
const toggleRangeDaysFilter = () => {
  showRangeDaysFilter.value = !showRangeDaysFilter.value
  showViewModeFilter.value = false
}
const toggleViewModeFilter = () => {
  showViewModeFilter.value = !showViewModeFilter.value
  showRangeDaysFilter.value = false
}
const setRangeDays = (value) => {
  userAnalyticsFilters.value.rangeDays = value
  showRangeDaysFilter.value = false
  loadUserAnalytics()
}
const setViewMode = (value) => {
  userAnalyticsFilters.value.viewMode = value
  showViewModeFilter.value = false
  loadUserTimelineChart()
}
const getViewModeLabel = () => {
  const labels = {
    day: 'By Day',
    month: 'By Month',
    year: 'By Year',
  }
  return labels[userAnalyticsFilters.value.viewMode] || 'View'
}

const toggleProviderFilter = () => {
  showProviderFilter.value = !showProviderFilter.value
  showStatusFilter.value = false
}
const toggleStatusFilter = () => {
  showStatusFilter.value = !showStatusFilter.value
  showProviderFilter.value = false
}
const setProviderFilter = (value) => {
  apiFilters.value.provider = value
  showProviderFilter.value = false
  applyApiFilters()
}
const setStatusFilter = (value) => {
  apiFilters.value.status = value
  showStatusFilter.value = false
  applyApiFilters()
}
const getProviderFilterLabel = () => {
  if (apiFilters.value.provider === '') return 'All Providers'
  return apiFilters.value.provider.charAt(0).toUpperCase() + apiFilters.value.provider.slice(1)
}
const getStatusFilterLabel = () => {
  if (apiFilters.value.status === '') return 'All Status'
  const labels = {
    success: 'Success',
    failed: 'Failed',
    timeout: 'Timeout',
  }
  return labels[apiFilters.value.status] || apiFilters.value.status
}

const toggleLogLevelFilter = () => {
  showLogLevelFilter.value = !showLogLevelFilter.value
  showLogTypeFilter.value = false
}
const toggleLogTypeFilter = () => {
  showLogTypeFilter.value = !showLogTypeFilter.value
  showLogLevelFilter.value = false
}
const setLogLevelFilter = (value) => {
  logFilter.value.level = value
  showLogLevelFilter.value = false
  refreshLogs()
}
const setLogTypeFilter = (value) => {
  logFilter.value.type = value
  showLogTypeFilter.value = false
  refreshLogs()
}
const getLogLevelFilterLabel = () => {
  if (logFilter.value.level === 'all') return 'All Levels'
  return logFilter.value.level.charAt(0).toUpperCase() + logFilter.value.level.slice(1)
}
const getLogTypeFilterLabel = () => {
  if (logFilter.value.type === 'all') return 'All Types'
  return logFilter.value.type.charAt(0).toUpperCase() + logFilter.value.type.slice(1)
}

const handleClickOutsideFilters = (event) => {
  if (!event.target.closest('.filter-icon-wrapper')) {
    showRangeDaysFilter.value = false
    showViewModeFilter.value = false
    showProviderFilter.value = false
    showStatusFilter.value = false
    showLogLevelFilter.value = false
    showLogTypeFilter.value = false
  }
}


const viewLogDetails = (log) => {
  console.log('Viewing log details:', log)
}

const updateProfile = (userData) => {
  console.log('Updating profile:', userData)
  currentUser.value = { ...currentUser.value, ...userData }
  showProfileModal.value = false
}

const changePassword = (passwordData) => {
  console.log('Changing password:', passwordData)
  showChangePasswordModal.value = false
}

const addUser = (userData) => {
  console.log('Adding new user:', userData)
  showAddUserModal.value = false
}

const addApiKey = (apiKeyData) => {
  console.log('Adding new API key:', apiKeyData)
  showAddApiKeyModal.value = false
}

const saveSystemSettings = async (settings) => {
  try {
    const res = await axiosClient.put('/api/stats/settings', settings)
    if (res.data) {
      systemSettings.value = { ...systemSettings.value, ...settings }
      toast.success('Cập nhật cài đặt hệ thống thành công')
    }
  } catch (error) {
    console.error('❌ Lỗi khi lưu system settings:', error)
    toast.error('Lỗi khi lưu cài đặt hệ thống')
  } finally {
    showSystemSettingsModal.value = false
  }
}

const logout = () => {
  console.log('Logging out...')
  showUserMenu.value = false

  // Xóa token & thông tin user
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  localStorage.removeItem('role')

  // Chuyển hướng về trang đăng nhập
  router.push('/login')
}

// Close user menu when clicking outside
const handleClickOutside = (event) => {
  const userMenu = document.querySelector('.user-menu')
  if (userMenu && !userMenu.contains(event.target)) {
    showUserMenu.value = false
  }
}

// Watchers
watch(logFilter, () => {
  refreshLogs()
}, { deep: true })

// Watch user analytics filters để tự động reload
watch(() => userAnalyticsFilters.value.rangeDays, () => {
  loadUserAnalytics()
})

watch(() => userAnalyticsFilters.value.viewMode, () => {
  loadUserTimelineChart()
}, { immediate: false })

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('click', handleClickOutsideFilters)
  initSocketConnection()
  // 🔥 Lắng nghe log realtime từ server (cả project + system)
  socket.on("log_event", (event) => {
    console.log("🧩 Realtime log event:", event);

    // Nếu log hệ thống (không có projectId)
    if (!event.projectId) {
      const log = event.log || event;
      const userId = log.user_id?._id || log.user_id?.id || log.user_id || null
      const userIdString = userId ? String(userId) : null
      const userName = log.user_id?.name || 
                      log.user_id?.email || 
                      log.user_name || 
                      log.user_email || 
                      'Hệ thống'
      
      systemLogs.value.unshift({
        id: log._id || log.id,
        userId: userIdString,
        user: userName,
        action: log.action || '-',
        type: log.target_type?.toLowerCase() || 'system',
        level: log.level?.toLowerCase() || 'info',
        message: log.details?.message || log.action || 'Không có mô tả hành động',
        timestamp: new Date(log.created_at || log.timestamp || event.timestamp),
        ip: log.ip || '-',
        userAgent: log.user_agent || '-',
      });

      // Giới hạn tối đa 100 log
      if (systemLogs.value.length > 100) systemLogs.value.pop();
    }
  })

  // Load tất cả dữ liệu từ API
  loadDashboardStatsFromAPI()
  
  // Fetch initial data từ các API riêng lẻ (nếu cần)
  refreshUserStats()
  loadUserAnalytics()
  refreshProjectStats()
  refreshApiStats()
  refreshLogs()
  fetchCurrentUser()
  
  // Load charts after a short delay to ensure canvas is ready
  setTimeout(() => {
    loadChartData()
    loadUserDistributionChart()
    // Đảm bảo user timeline chart được render sau khi dữ liệu đã load
    if (userAnalytics.value.registrationTimeline && userAnalytics.value.registrationTimeline.length > 0) {
      loadUserTimelineChart()
    }
  }, 500)
  
  console.log('Admin dashboard mounted')
})

const loadUserDistributionChart = async () => {
  try {
    if (!userDistribution.value || userDistribution.value.length === 0) return
    
    const Chart = (await import('chart.js/auto')).default
    const ctx = userDistributionChart.value?.getContext('2d')
    
    if (ctx) {
      if (userDistributionChartInstance) userDistributionChartInstance.destroy()
      
      userDistributionChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: userDistribution.value.map(d => d.label),
          datasets: [{
            data: userDistribution.value.map(d => d.value),
            backgroundColor: userDistribution.value.map(d => d.color),
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              titleFont: { size: 14, weight: '600' },
              bodyFont: { size: 13 },
              callbacks: {
                label: (context) => {
                  const label = context.label || ''
                  const value = context.parsed || 0
                  const total = context.dataset.data.reduce((a, b) => a + b, 0)
                  const percentage = total > 0 ? Math.round((value / total) * 100) : 0
                  return `${label}: ${value} người (${percentage}%)`
                }
              }
            }
          },
          cutout: '60%',
        },
      })
    }
  } catch (error) {
    console.error('❌ Lỗi khi tải user distribution chart:', error)
  }
}

async function loadDashboardStatsFromAPI() {
  try {
    // Song song các request
    const [usage, provider, quick, sys, trends, activities, settings] = await Promise.all([
      axiosClient.get('/api/stats/usage-summary'),
      axiosClient.get('/api/stats/provider-usage'),
      axiosClient.get('/api/stats/quick'),
      axiosClient.get('/api/stats/system'),
      axiosClient.get('/api/stats/trends'),
      axiosClient.get('/api/stats/activities'),
      axiosClient.get('/api/stats/settings'),
    ])
    // Tổng hợp vào biến
    stats.value = { ...stats.value, ...(quick.data || {}) }
    if (activities.data?.dailyActive !== undefined) {
      stats.value.dailyActive = activities.data.dailyActive
    }
    
    systemStats.value = sys.data || {}
    systemServices.value = sys.data?.services || []
    systemMetrics.value = {
      cpu: sys.data?.cpu || 0,
      memory: sys.data?.memory || 0,
      disk: sys.data?.disk || 0,
      network: sys.data?.network || 0,
    }
    
    const totalProviderRequests = (provider.data || []).reduce((sum, p) => sum + (p.requests || 0), 0)
    apiUsage.value = (provider.data || []).map(p => ({
      name: p.provider,
      usage: formatNumber(p.requests || 0),
      percentage: totalProviderRequests > 0 ? Math.round((p.requests / totalProviderRequests) * 100) : 0,
      color: p.provider === 'Gemini' ? '#1a365d' : p.provider === 'OpenAI' ? '#2d3748' : '#4a5568',
      trend: (p.success || 0) > (p.failed || 0) ? 'up' : 'down',
      change: p.failed > 0 ? `-${Math.round((p.failed / p.requests) * 100)}%` : '+0%',
    }))
    
    totalApiRequests.value = usage.data?.total_requests || 0
    totalApiTokens.value = usage.data?.total_tokens || 0
    apiSuccessRate.value = usage.data && usage.data.total_requests ? Math.round((usage.data.total_success / usage.data.total_requests) * 100) : 0
    apiErrorRate.value = usage.data && usage.data.total_requests ? Math.round((usage.data.total_failed / usage.data.total_requests) * 100) : 0
    
    // Trends
    if (trends.data) {
      userTrend.value = trends.data.userTrend || userTrend.value
      apiTrend.value = trends.data.apiTrend || apiTrend.value
      projectTrend.value = trends.data.projectTrend || projectTrend.value
      activityTrend.value = trends.data.activityTrend || activityTrend.value
    }
    
    // Settings
    systemSettings.value = settings.data || {}
  } catch (err) {
    console.error('Lỗi load dashboard stats:', err)
  }
}

</script>

<style scoped>
/* Giữ nguyên toàn bộ CSS từ file gốc */
.admin-dashboard {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Header */
.dashboard-header {
  background: #1a365d;
  color: white;
  padding: 0 32px;
  height: 70px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left .logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo .material-symbols-outlined {
  font-size: 32px;
  color: #63b3ed;
}
.pie-chart {
  position: relative;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  transition: all 0.3s;
}

.pie-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
  border-radius: 50%;
  width: 100px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.center-content .center-value {
  display: block;
  font-weight: bold;
  font-size: 20px;
  color: #1a365d;
}

.center-content .center-label {
  font-size: 14px;
  color: #555;
}
.logo h1 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #63b3ed 0%, #4299e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.btn-notification {
  position: relative;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.btn-notification:hover {
  background: rgba(255, 255, 255, 0.1);
}

.notification-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: #e53e3e;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

.user-menu {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-menu:hover {
  background: rgba(255, 255, 255, 0.1);
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #63b3ed;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-name {
  font-weight: 500;
  font-size: 14px;
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  z-index: 1000;
  margin-top: 8px;
}
.relative.dropdown {
    position: relative;
    display: inline-block; /* Quan trọng để chỉ chiếm không gian cần thiết */
}

/* 2. Nút kích hoạt Dropdown */
.btn-action.secondary {
    /* Đảm bảo nút có kiểu dáng dễ nhìn */
    padding: 8px 12px;
    border: 1px solid #ccc;
    background-color: #f7f7f7;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
}

.btn-action.secondary:hover {
    background-color: #e0e0e0;
}

/* 3. Menu thả xuống */
.dropdown-menu {
    /* Định vị và hình dáng chung */
    position: absolute;
    right: 0; /* Menu xuất hiện bên phải nút bấm */
    top: 100%; /* Đặt dưới nút bấm */
    margin-top: 8px; /* Khoảng cách với nút */
    width: 140px; /* Chiều rộng của menu */
    background-color: #ffffff;
    border: 1px solid #e2e8f0; /* Viền nhẹ */
    border-radius: 8px; /* Bo góc */
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
    z-index: 50;
    overflow: hidden; /* Đảm bảo các item không tràn ra ngoài bo góc */
}

/* 4. Các mục trong Menu (Xuất PDF, CSV, JSON) */
.dropdown-item {
    /* Đảm bảo là nút bấm full width */
    width: 100%;
    text-align: left;
    padding: 10px 15px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    color: #333;
    transition: background-color 0.15s, color 0.15s;
}

/* Hiệu ứng di chuột (Hover) */
.dropdown-item:hover {
    background-color: #f1f5f9; /* Màu nền khi di chuột */
    color: #007bff; /* Thay đổi màu chữ (tùy chọn) */
}

/* Loại bỏ viền cho item cuối cùng (nếu muốn) */
.dropdown-menu .dropdown-item:not(:last-child) {
    border-bottom: 1px solid #f0f0f0; 
}
.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: #2d3748;
  text-decoration: none;
  transition: background 0.2s;
  cursor: pointer;
}

.dropdown-item:hover {
  background: #f7fafc;
}

.dropdown-item.logout {
  color: #e53e3e;
}

.dropdown-item .material-symbols-outlined {
  font-size: 18px;
  width: 20px;
}

/* Main Content */
.dashboard-main {
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Stats Section */
.stats-section {
  margin-bottom: 32px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-icon .material-symbols-outlined {
  font-size: 28px;
}

.stat-content h3 {
  font-size: 28px;
  font-weight: 700;
  color: #1a365d;
  margin: 0 0 4px 0;
}

.stat-content p {
  color: #718096;
  margin: 0 0 8px 0;
  font-size: 14px;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
}

.stat-trend.positive {
  color: #38a169;
}

.stat-trend.negative {
  color: #e53e3e;
}

.stat-trend .material-symbols-outlined {
  font-size: 14px;
}

/* Analytics Section - Modern Design */
.analytics-section {
  margin-bottom: 32px;
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 24px;
}

.modern-card {
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  transition: all 0.3s ease;
}

.modern-card:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.api-analytics-card {
  grid-column: span 2;
}

.user-analytics-card {
  grid-column: span 2;
}

.card-header-modern {
  background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
  padding: 24px;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  font-size: 32px;
  color: #63b3ed;
  background: rgba(255, 255, 255, 0.1);
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-header-modern h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: white;
}

.header-subtitle {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 400;
}

.btn-icon-modern {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  color: white;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
}

.btn-icon-modern:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.chart-content-modern {
  padding: 24px;
  display: flex;
  gap: 32px;
  align-items: center;
}

.user-analytics-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.user-counters-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.user-counter-card {
  background: linear-gradient(135deg, #ffffff 0%, #f7fafc 100%);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #e2e8f0;
}

.counter-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.counter-icon.total {
  background: linear-gradient(135deg, #3182ce 0%, #2b6cb0 100%);
}

.counter-icon.active {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
}

.counter-icon.new {
  background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%);
}

.counter-icon.online {
  background: linear-gradient(135deg, #805ad5 0%, #6b46c1 100%);
}

.counter-icon .material-symbols-outlined {
  font-size: 22px;
}

.counter-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.counter-label {
  font-size: 12px;
  color: #718096;
}

.counter-value {
  font-size: 18px;
  font-weight: 700;
  color: #1a365d;
}

.user-timeline-container {
  margin-top: 0;
}

.chart-canvas-wrapper.small {
  height: 260px;
}

.user-charts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.chart-visual {
  flex-shrink: 0;
  width: 280px;
  height: 280px;
  position: relative;
}

.chart-visual canvas {
  width: 100% !important;
  height: 100% !important;
}

.chart-legend-modern {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.legend-item-modern {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.legend-item-modern:hover {
  background: #f7fafc;
  border-color: #e2e8f0;
  transform: translateX(4px);
}

.legend-item-modern.active {
  background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
  border-color: #1a365d;
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.1);
}

.legend-indicator {
  position: relative;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.legend-color-modern {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  position: absolute;
  z-index: 2;
}

.legend-pulse {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  position: absolute;
  opacity: 0.3;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.3); opacity: 0; }
}

.legend-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.legend-label-modern {
  font-size: 15px;
  font-weight: 600;
  color: #2d3748;
}

.legend-value-modern {
  font-size: 13px;
  color: #718096;
}

/* Filters Modern */
.filters-modern {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.filters-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-weight: 600;
  color: #1a365d;
  font-size: 14px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  align-items: end;
}

.filter-select-modern.small {
  padding: 6px 10px;
  font-size: 12px;position: absolute;
  right: 100px;
  top: 24px;
}

.filter-item-modern {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #4a5568;
}

.filter-label .material-symbols-outlined {
  font-size: 16px;
}

.filter-input-modern,
.filter-select-modern {
  padding: 10px 14px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  background: white;
  color: #2d3748;
  transition: all 0.2s;
  font-weight: 500;
}

.filter-input-modern:focus,
.filter-select-modern:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 4px rgba(26, 54, 93, 0.1);
  transform: translateY(-1px);
}

/* Filter Icon Buttons */
.filter-icon-wrapper {
  position: relative;
  display: inline-block;
}

.filter-icon-btn-modern {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 40px;
  height: 40px;
}

.filter-icon-btn-modern:hover {
  background: #f9fafb;
  border-color: #1a365d;
  color: #1a365d;
}

.filter-icon-btn-modern .material-symbols-outlined {
  font-size: 20px;
}

.filter-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 180px;
  z-index: 100;
  overflow: hidden;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-option:hover {
  background: #f9fafb;
}

.filter-option.active {
  background: #e6f2ff;
  color: #1a365d;
  font-weight: 500;
}

.filter-option .material-symbols-outlined {
  font-size: 18px;
  color: #6b7280;
}

.filter-option.active .material-symbols-outlined {
  color: #1a365d;
}

.btn-reset-modern {
  padding: 10px 18px;
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%);
  color: #2d3748;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  height: fit-content;
}

.btn-reset-modern:hover {
  background: linear-gradient(135deg, #cbd5e0 0%, #a0aec0 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* API Summary Modern */
.api-summary-modern {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 24px;
  background: #f8fafc;
}

.summary-card-modern {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.summary-card-modern:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  border-color: #1a365d;
}

.summary-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.summary-icon.requests {
  background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
  color: white;
}

.summary-icon.tokens {
  background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
  color: white;
}

.summary-icon.success {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  color: white;
}

.summary-icon.error {
  background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
  color: white;
}

.summary-icon .material-symbols-outlined {
  font-size: 28px;
}

.summary-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-label-modern {
  font-size: 12px;
  color: #718096;
  font-weight: 500;
}

.summary-value-modern {
  font-size: 20px;
  font-weight: 700;
  color: #1a365d;
}

.summary-value-modern.success-text {
  color: #38a169;
}

.summary-value-modern.error-text {
  color: #e53e3e;
}

/* Provider List Modern */
.provider-list-modern {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.provider-item-modern {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 14px;
  padding: 20px;
  border: 2px solid #e2e8f0;
  transition: all 0.3s ease;
}

.provider-item-modern:hover {
  border-color: #1a365d;
  box-shadow: 0 4px 16px rgba(26, 54, 93, 0.1);
  transform: translateX(4px);
}

.provider-header-modern {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.provider-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.provider-badge {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgba(26, 54, 93, 0.1);
}

.provider-name-modern {
  font-size: 16px;
  font-weight: 700;
  color: #1a365d;
}

.provider-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.provider-percentage {
  font-size: 18px;
  font-weight: 700;
  color: #1a365d;
}

.provider-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  font-size: 13px;
}

.provider-trend.up {
  color: #38a169;
}

.provider-trend.down {
  color: #e53e3e;
}

.progress-bar-modern {
  height: 10px;
  background: #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 10px;
  position: relative;
}

.progress-fill-modern {
  height: 100%;
  border-radius: 10px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.progress-fill-modern::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.provider-details-modern {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.provider-count {
  color: #718096;
  font-weight: 500;
}

/* Charts Section Modern */
.charts-section-modern {
  padding: 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.chart-container-modern {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  max-width: calc(100% - 20px);
}

.chart-container-modern.timeline-chart {
  margin-bottom: 24px;
}

.chart-header-inline {
  margin-bottom: 20px;
}

.chart-title-modern {
  margin: 0 0 6px 0;
  font-size: 18px;
  font-weight: 700;
  color: #1a365d;
  display: flex;
  align-items: center;
  gap: 10px;
}

.chart-title-modern .material-symbols-outlined {
  font-size: 24px;
  color: #4299e1;
}

.chart-subtitle {
  margin: 0;
  font-size: 13px;
  color: #718096;
  font-weight: 400;
}

.chart-canvas-wrapper {
  height: 320px;
  position: relative;
}

.charts-grid-modern {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.charts-grid-modern .chart-canvas-wrapper {
  height: 280px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a365d;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-icon {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
  color: #718096;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: #edf2f7;
  color: #1a365d;
}

.btn-icon.small {
  padding: 4px;
}

/* Pie Chart */
.chart-container {
  display: flex;
  gap: 24px;
  align-items: center;
}

.pie-chart {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  position: relative;
  background: #e2e8f0;
}

.pie-segment {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 50% 100%);
  transform-origin: center;
}

.segment-tooltip {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  background: #3979ad;
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 10;
}

.pie-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.center-content {
  text-align: center;
}

.center-value {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #1a365d;
}

.center-label {
  display: block;
  font-size: 12px;
  color: #718096;
  margin-top: 2px;
}

.chart-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.legend-item.active,
.legend-item:hover {
  background: #f7fafc;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  flex: 1;
  font-size: 14px;
  color: #4a5568;
}

.legend-value {
  font-size: 14px;
  font-weight: 600;
  color: #1a365d;
}

/* API Usage Stats */
.usage-stats {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.usage-item {
  padding: 16px;
  background: #f7fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.usage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.provider-name {
  font-weight: 600;
  color: #1a365d;
}

.usage-percentage {
  font-weight: 700;
  color: #1a365d;
  font-size: 18px;
}

.usage-bar {
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.usage-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.usage-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.usage-count {
  color: #718096;
}

.usage-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
}

.usage-trend.up {
  color: #38a169;
}

.usage-trend.down {
  color: #e53e3e;
}

.usage-trend .material-symbols-outlined {
  font-size: 14px;
}

.api-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

/* API Filters */
.api-filters {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #f7fafc;
  border-radius: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 150px;
}

.filter-group label {
  font-size: 12px;
  font-weight: 600;
  color: #4a5568;
}

.filter-input,
.filter-select {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  color: #2d3748;
  transition: all 0.2s;
}

.filter-input:focus,
.filter-select:focus {
  outline: none;
  border-color: #1a365d;
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

.btn-filter-reset {
  padding: 8px 16px;
  background: #e2e8f0;
  color: #4a5568;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  height: fit-content;
}

.btn-filter-reset:hover {
  background: #cbd5e0;
  color: #2d3748;
}

/* Charts Section */
.charts-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 24px;
}

.chart-wrapper {
  background: white;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.chart-wrapper h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
}

.chart-wrapper canvas {
  max-height: 300px;
}

#timelineChart {
  height: 300px !important;
}

#providerChart,
#statusChart {
  height: 250px !important;
}

.summary-item {
  text-align: center;
  padding: 12px;
  background: #f7fafc;
  border-radius: 8px;
}

.summary-label {
  display: block;
  font-size: 12px;
  color: #718096;
  margin-bottom: 4px;
}

.summary-value {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #1a365d;
}

.summary-value.success {
  color: #38a169;
}

.summary-value.error {
  color: #e53e3e;
}

/* Management Section */
.management-section {
  margin-bottom: 32px;
}

.management-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.management-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.management-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.card-header {
  background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
  color: white;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.card-content {
  padding: 24px;
}

.quick-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.quick-stat {
  text-align: center;
  padding: 12px;
  background: #f7fafc;
  border-radius: 8px;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #718096;
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #1a365d;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-action {
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  text-align: left;
}

.btn-action.primary {
  background: #1a365d;
  color: white;
}

.btn-action.primary:hover {
  background: #2d3748;
  transform: translateY(-1px);
}

.btn-action.secondary {
  background: #f7fafc;
  color: #4a5568;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
}

.btn-action.secondary:hover {
  background: #edf2f7;
  transform: translateY(-1px);
}

/* Two Column Section */
.two-column-section {
  margin-bottom: 32px;
}

.column-grid {
  display: grid;
  gap: 24px;
}

.column-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.column-card .card-header {
  background: white;
  color: #1a365d;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-view-all {
  background: none;
  border: 1px solid #1a365d;
  color: #1a365d;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-view-all:hover {
  background: #1a365d;
  color: white;
}

/* Activity List */
.activity-list {
  padding: 0;
  max-height: 400px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid #f7fafc;
  transition: background 0.2s;
}

.activity-item:hover {
  background: #f7fafc;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-item.user .activity-icon {
  background: #bee3f8;
  color: #2b6cb0;
}

.activity-item.project .activity-icon {
  background: #c6f6d5;
  color: #276749;
}

.activity-item.api .activity-icon {
  background: #faf089;
  color: #d69e2e;
}

.activity-item.system .activity-icon {
  background: #e9d8fd;
  color: #6b46c1;
}

.activity-item.error .activity-icon {
  background: #fed7d7;
  color: #c53030;
}

.activity-content {
  flex: 1;
}

.activity-description {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #4a5568;
  font-weight: 500;
}

.activity-time {
  font-size: 12px;
  color: #718096;
}

.activity-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

.activity-badge.success {
  background: #c6f6d5;
  color: #276749;
}

.activity-badge.warning {
  background: #faf089;
  color: #d69e2e;
}

/* System Status */
.system-status {
  padding: 0;
  margin-bottom: 20px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #f7fafc;
}

.status-item:last-child {
  border-bottom: none;
}

.status-info {
  flex: 1;
}

.status-name {
  font-weight: 600;
  color: #1a365d;
  margin-bottom: 4px;
}

.status-description {
  font-size: 14px;
  color: #718096;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.online .status-dot {
  background: #48bb78;
}

.status-indicator.offline .status-dot {
  background: #e53e3e;
}

.status-indicator.maintenance .status-dot {
  background: #ed8936;
}

.status-text {
  font-size: 14px;
  font-weight: 500;
}

.status-indicator.online .status-text {
  color: #48bb78;
}

.status-indicator.offline .status-text {
  color: #e53e3e;
}

.status-indicator.maintenance .status-text {
  color: #ed8936;
}

.status-uptime {
  font-size: 12px;
  color: #718096;
  margin-left: 8px;
}

/* System Metrics */
.system-metrics {
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f7fafc;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.metric-item:last-child {
  margin-bottom: 0;
}

.metric-label {
  font-size: 14px;
  color: #4a5568;
  width: 60px;
}

.metric-bar {
  flex: 1;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  background: linear-gradient(90deg, #48bb78, #38a169);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
  color: #1a365d;
  width: 40px;
  text-align: right;
}

/* Log Section */
.log-section {
  margin-bottom: 32px;
}

.log-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.log-card .card-header {
  background: white;
  color: #1a365d;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-filters {
  display: flex;
  gap: 12px;
}

.filter-select {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  background: white;
  color: #4a5568;
}

.log-list {
  padding: 0;
  max-height: 506px;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  box-sizing: border-box;
}

.log-list:empty::after {
  content: 'Không có log nào';
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #94a3b8;
  font-size: 0.9rem;
}

.log-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  transition: all 0.2s ease;
  background: white;
  border-left: 4px solid transparent;
  overflow: hidden;
  word-wrap: break-word;
  overflow-wrap: break-word;
  width: 100%;
  box-sizing: border-box;
}

.log-item:hover {
  background: #f8fafc;
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.log-item:last-child {
  border-bottom: none;
}

.log-item.info {
  border-left-color: #3b82f6;
}

.log-item.warning {
  border-left-color: #f59e0b;
}

.log-item.error {
  border-left-color: #ef4444;
}

.log-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.log-item:hover .log-icon-wrapper {
  transform: scale(1.1);
}

.log-icon-wrapper.info {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.log-icon-wrapper.warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.log-icon-wrapper.error {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.log-icon-wrapper .material-symbols-outlined {
  font-size: 20px;
}

.log-content {
  flex: 1;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.log-header-enhanced {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.log-user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.log-user-name {
  font-weight: 600;
  color: #1a365d;
  font-size: 0.9rem;
}

.log-action-type {
  background: #e2e8f0;
  color: #475569;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
}

.log-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  max-width: 100%;
  overflow: hidden;
}

.log-type-badge {
  background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%);
  color: white;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
}

.log-level-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.log-level-badge.info {
  background: #dbeafe;
  color: #1e40af;
}

.log-level-badge.warning {
  background: #fef3c7;
  color: #d97706;
}

.log-level-badge.error {
  background: #fee2e2;
  color: #dc2626;
}

.log-level-badge .material-symbols-outlined {
  font-size: 14px;
}

.log-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
}

.log-status-badge.status-success {
  background: #d1fae5;
  color: #065f46;
}

.log-status-badge.status-failed {
  background: #fee2e2;
  color: #991b1b;
}

.log-status-badge .material-symbols-outlined {
  font-size: 14px;
}

.log-message-enhanced {
  font-size: 0.9rem;
  color: #1e293b;
  margin-bottom: 8px;
  font-weight: 500;
  line-height: 1.5;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
  border-left: 3px solid #e2e8f0;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
}

.log-item.info .log-message-enhanced {
  border-left-color: #3b82f6;
  background: #eff6ff;
}

.log-item.warning .log-message-enhanced {
  border-left-color: #f59e0b;
  background: #fffbeb;
}

.log-item.error .log-message-enhanced {
  border-left-color: #ef4444;
  background: #fef2f2;
}

.log-meta-enhanced {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.75rem;
  flex-wrap: wrap;
}

.log-time-enhanced {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #64748b;
  font-weight: 500;
}

.log-time-enhanced .material-symbols-outlined {
  font-size: 14px;
}

.log-ip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #94a3b8;
  font-size: 0.7rem;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 12px;
}

.log-ip .material-symbols-outlined {
  font-size: 12px;
}

.log-actions {
  display: flex;
  gap: 4px;
}

.log-footer {
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f7fafc;
}

.log-summary {
  font-size: 14px;
  color: #718096;
}

/* Responsive */
@media (max-width: 768px) {
  .dashboard-main {
    padding: 16px;
  }

  .analytics-grid {
    grid-template-columns: 1fr;
  }

  .api-analytics-card {
    grid-column: span 1;
  }

  .chart-content-modern {
    flex-direction: column;
    gap: 24px;
  }

  .chart-visual {
    width: 100%;
    max-width: 280px;
    margin: 0 auto;
  }

  .filters-grid {
    grid-template-columns: 1fr;
  }

  .api-summary-modern {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-grid-modern {
    grid-template-columns: 1fr;
  }

  .chart-container {
    flex-direction: column;
  }

  .management-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .column-grid {
    grid-template-columns: 1fr;
  }

  .user-name {
    display: none;
  }

  .api-summary {
    grid-template-columns: 1fr;
  }

  .api-summary-modern {
    grid-template-columns: 1fr;
  }

  .card-header-modern {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .chart-actions {
    align-self: flex-end;
  }

  .log-filters {
    flex-direction: column;
    gap: 8px;
  }

  .card-actions {
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .dashboard-header {
    padding: 0 16px;
  }

  .logo h1 {
    font-size: 16px;
  }

  .stat-card {
    flex-direction: column;
    text-align: center;
  }

  .activity-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .activity-badge {
    align-self: flex-start;
  }

  .log-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .log-header-enhanced {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .log-badges {
    width: 100%;
    justify-content: flex-start;
  }

  .log-meta-enhanced {
    width: 100%;
  }

  .log-actions {
    align-self: flex-end;
  }

  .log-icon-wrapper {
    width: 32px;
    height: 32px;
  }

  .log-message-enhanced {
    font-size: 0.85rem;
    padding: 6px 10px;
  }
}

/* Animations */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
