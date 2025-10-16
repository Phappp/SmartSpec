<template>
  <div class="database-list-view">
    <!-- List Controls -->
    <div class="list-controls">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search tables, columns..."
          class="search-input"
        />
        <span class="material-symbols-outlined search-icon">search</span>
      </div>

      <div class="filter-controls">
        <select v-model="sortBy" class="filter-select">
          <option value="name">Sort by Name</option>
          <option value="columns">Sort by Columns</option>
          <option value="relationships">Sort by Relationships</option>
        </select>

        <select v-model="filterBy" class="filter-select">
          <option value="all">All Tables</option>
          <option value="withRelationships">With Relationships</option>
          <option value="withForeignKeys">With Foreign Keys</option>
          <option value="noRelationships">No Relationships</option>
        </select>
      </div>

      <div class="view-actions">
        <button class="btn-secondary" @click="exportToCSV">
          <span class="material-symbols-outlined">download</span>
          Export CSV
        </button>
        <button class="btn-secondary" @click="printList">
          <span class="material-symbols-outlined">print</span>
          Print
        </button>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="list-statistics">
      <div class="stat-card">
        <div class="stat-value">{{ filteredTables.length }}</div>
        <div class="stat-label">Tables</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ totalColumns }}</div>
        <div class="stat-label">Columns</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ totalRelationships }}</div>
        <div class="stat-label">Relationships</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ tablesWithForeignKeys }}</div>
        <div class="stat-label">Tables with FKs</div>
      </div>
    </div>

    <!-- Tables List -->
    <div class="tables-list">
      <div
        v-for="table in sortedTables"
        :key="table._id || table.name"
        class="table-list-item"
        :class="{ 'table-selected': selectedTable === table.name }"
        @click="selectTable(table)"
        @dblclick="$emit('table-view', table)"
      >
        <div class="table-list-header">
          <div class="table-info">
            <h4 class="table-name">{{ table.name }}</h4>
            <p class="table-description" v-if="table.description">{{ table.description }}</p>
          </div>
          <div class="table-meta">
            <span class="table-stats">
              {{ table.columns?.length || 0 }} columns
              <span class="stat-separator">•</span>
              {{ getTableRelationshipCount(table) }} relationships
            </span>
            <div class="table-actions">
              <button
                class="btn-icon"
                @click.stop="$emit('table-view', table)"
                title="View Details"
              >
                <span class="material-symbols-outlined">visibility</span>
              </button>
              <button class="btn-icon" @click.stop="$emit('table-edit', table)" title="Edit">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button
                class="btn-icon danger"
                @click.stop="$emit('table-delete', table._id || table.name)"
                title="Delete"
              >
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Columns Preview -->
        <div class="columns-preview">
          <div
            v-for="column in getPreviewColumns(table)"
            :key="column.name"
            class="column-preview-item"
            :class="{
              primary: column.is_primary_key,
              foreign: column.is_foreign_key,
            }"
          >
            <span class="column-name">{{ column.name }}</span>
            <span class="column-type">{{ column.type }}</span>
            <div class="column-badges">
              <span v-if="column.is_primary_key" class="column-badge pk">PK</span>
              <span v-if="column.is_foreign_key" class="column-badge fk">FK</span>
              <span v-if="!column.nullable" class="column-badge nn">NN</span>
              <span v-if="column.unique" class="column-badge uq">UQ</span>
            </div>
          </div>
          <div v-if="hasMoreColumns(table)" class="more-columns">
            +{{ getRemainingColumnsCount(table) }} more columns
          </div>
        </div>

        <!-- Relationships Preview -->
        <div v-if="getTableRelationships(table).length > 0" class="relationships-preview">
          <div class="relationships-label">Relationships:</div>
          <div class="relationship-tags">
            <span
              v-for="rel in getTableRelationships(table)"
              :key="`${rel.from_table}-${rel.to_table}`"
              class="relationship-tag"
              :class="rel.type"
            >
              {{ rel.from_table === table.name ? '→ ' + rel.to_table : '← ' + rel.from_table }}
              <span class="relationship-type">({{ rel.type }})</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredTables.length === 0" class="empty-state">
      <span class="material-symbols-outlined">table</span>
      <h3>No tables found</h3>
      <p v-if="searchQuery">Try adjusting your search criteria</p>
      <p v-else>No tables available in this database</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DatabaseList',
  props: {
    tables: {
      type: Array,
      default: () => [],
    },
    relationships: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      searchQuery: '',
      sortBy: 'name',
      filterBy: 'all',
      selectedTable: null,
    }
  },
  computed: {
    filteredTables() {
      let filtered = this.tables

      // Apply search filter
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(
          (table) =>
            table.name.toLowerCase().includes(query) ||
            table.description?.toLowerCase().includes(query) ||
            table.columns?.some((col) => col.name.toLowerCase().includes(query))
        )
      }

      // Apply type filter
      switch (this.filterBy) {
        case 'withRelationships':
          filtered = filtered.filter((table) => this.getTableRelationshipCount(table) > 0)
          break
        case 'withForeignKeys':
          filtered = filtered.filter((table) => table.columns?.some((col) => col.is_foreign_key))
          break
        case 'noRelationships':
          filtered = filtered.filter((table) => this.getTableRelationshipCount(table) === 0)
          break
      }

      return filtered
    },

    sortedTables() {
      const tables = [...this.filteredTables]

      switch (this.sortBy) {
        case 'name':
          return tables.sort((a, b) => a.name.localeCompare(b.name))
        case 'columns':
          return tables.sort((a, b) => (b.columns?.length || 0) - (a.columns?.length || 0))
        case 'relationships':
          return tables.sort(
            (a, b) => this.getTableRelationshipCount(b) - this.getTableRelationshipCount(a)
          )
        default:
          return tables
      }
    },

    totalColumns() {
      return this.tables.reduce((sum, table) => sum + (table.columns?.length || 0), 0)
    },

    totalRelationships() {
      return this.relationships.length
    },

    tablesWithForeignKeys() {
      return this.tables.filter((table) => table.columns?.some((col) => col.is_foreign_key)).length
    },
  },
  methods: {
    selectTable(table) {
      this.selectedTable = table.name
      this.$emit('table-selected', table)
    },

    getTableRelationshipCount(table) {
      return this.relationships.filter(
        (rel) => rel.from_table === table.name || rel.to_table === table.name
      ).length
    },

    getTableRelationships(table) {
      return this.relationships.filter(
        (rel) => rel.from_table === table.name || rel.to_table === table.name
      )
    },

    getPreviewColumns(table) {
      return (table.columns || []).slice(0, 5) // Show first 5 columns
    },

    hasMoreColumns(table) {
      return (table.columns?.length || 0) > 5
    },

    getRemainingColumnsCount(table) {
      return (table.columns?.length || 0) - 5
    },

    exportToCSV() {
      const csvContent = this.generateCSV()
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `database-schema-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    },

    generateCSV() {
      const headers = [
        'Table',
        'Description',
        'Columns',
        'Primary Keys',
        'Foreign Keys',
        'Relationships',
      ]
      const rows = this.tables.map((table) => [
        table.name,
        table.description || '',
        (table.columns?.length || 0).toString(),
        (table.columns?.filter((col) => col.is_primary_key).length || 0).toString(),
        (table.columns?.filter((col) => col.is_foreign_key).length || 0).toString(),
        this.getTableRelationshipCount(table).toString(),
      ])

      return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    },

    printList() {
      window.print()
    },
  },
}
</script>

<style scoped>
.database-list-view {
  padding: 20px;
  background: #f8fafc;
  min-height: 600px;
}

.list-controls {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 250px;
}

.search-input {
  width: 100%;
  padding: 10px 40px 10px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}

.filter-controls {
  display: flex;
  gap: 12px;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  font-size: 0.875rem;
  color: #374151;
}

.view-actions {
  display: flex;
  gap: 8px;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

/* Statistics */
.list-statistics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
  border: 1px solid #e5e7eb;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1a365d;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
}

/* Tables List */
.tables-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table-list-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-list-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.table-list-item.table-selected {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.table-list-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.table-info {
  flex: 1;
}

.table-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.table-description {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.4;
}

.table-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.table-stats {
  font-size: 0.75rem;
  color: #6b7280;
}

.stat-separator {
  margin: 0 4px;
}

.table-actions {
  display: flex;
  gap: 4px;
}

.btn-icon {
  padding: 6px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: #f3f4f6;
  color: #374151;
}

.btn-icon.danger:hover {
  background: #fef2f2;
  color: #ef4444;
}

/* Columns Preview */
.columns-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.column-preview-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.75rem;
}

.column-preview-item.primary {
  background: #f0f9ff;
  border-color: #3b82f6;
}

.column-preview-item.foreign {
  background: #fef7ff;
  border-color: #8b5cf6;
}

.column-name {
  font-weight: 500;
  color: #1f2937;
}

.column-type {
  color: #6b7280;
  font-family: 'Courier New', monospace;
}

.column-badges {
  display: flex;
  gap: 2px;
}

.column-badge {
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 0.6rem;
  font-weight: 600;
  color: white;
}

.column-badge.pk {
  background: #3b82f6;
}

.column-badge.fk {
  background: #8b5cf6;
}

.column-badge.nn {
  background: #ef4444;
}

.column-badge.uq {
  background: #10b981;
}

.more-columns {
  font-size: 0.75rem;
  color: #6b7280;
  padding: 6px 12px;
  background: #f8fafc;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
}

/* Relationships Preview */
.relationships-preview {
  border-top: 1px solid #f3f4f6;
  padding-top: 12px;
}

.relationships-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 8px;
}

.relationship-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.relationship-tag {
  padding: 4px 8px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 0.7rem;
  color: #374151;
}

.relationship-tag.one-to-one {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.relationship-tag.one-to-many {
  border-color: #10b981;
  background: #f0fdf4;
}

.relationship-tag.many-to-one {
  border-color: #f59e0b;
  background: #fffbeb;
}

.relationship-tag.many-to-many {
  border-color: #8b5cf6;
  background: #faf5ff;
}

.relationship-type {
  font-size: 0.6rem;
  color: #6b7280;
  margin-left: 2px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.empty-state .material-symbols-outlined {
  font-size: 48px;
  color: #9ca3af;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 1.5rem;
  margin-bottom: 8px;
  color: #1f2937;
}

.empty-state p {
  color: #6b7280;
  margin: 0;
}

/* Print Styles */
@media print {
  .list-controls,
  .list-statistics,
  .table-actions {
    display: none;
  }

  .table-list-item {
    break-inside: avoid;
    box-shadow: none;
    border: 1px solid #000;
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .list-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .table-list-header {
    flex-direction: column;
    gap: 12px;
  }

  .table-meta {
    align-items: flex-start;
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
  }

  .columns-preview {
    flex-direction: column;
    align-items: flex-start;
  }

  .column-preview-item {
    width: 100%;
    justify-content: space-between;
  }
}
</style>