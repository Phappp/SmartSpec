<template>
  <div class="stats-grid">
    <div class="stat-card tables">
      <div class="stat-icon">
        <span class="material-symbols-outlined">table</span>
      </div>
      <div class="stat-info">
        <h3>{{ stats.tables }}</h3>
        <p>Total Tables</p>
      </div>
    </div>
    <div class="stat-card relationships">
      <div class="stat-icon">
        <span class="material-symbols-outlined">link</span>
      </div>
      <div class="stat-info">
        <h3>{{ stats.relationships }}</h3>
        <p>Relationships</p>
      </div>
    </div>
    <div class="stat-card columns">
      <div class="stat-icon">
        <span class="material-symbols-outlined">view_column</span>
      </div>
      <div class="stat-info">
        <h3>{{ stats.columns }}</h3>
        <p>Total Columns</p>
      </div>
    </div>
    <div class="stat-card usecases">
      <div class="stat-icon">
        <span class="material-symbols-outlined">assignment</span>
      </div>
      <div class="stat-info">
        <h3>{{ stats.relatedUsecases }}</h3>
        <p>Related Use Cases</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DatabaseStats',
  props: {
    stats: {
      type: Object,
      required: true,
      default: () => ({
        tables: 0,
        relationships: 0,
        columns: 0,
        relatedUsecases: 0,
      }),
    },
  },
}
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-card.tables {
  border-left: 4px solid #3b82f6;
}

.stat-card.relationships {
  border-left: 4px solid #8b5cf6;
}

.stat-card.columns {
  border-left: 4px solid #10b981;
}

.stat-card.usecases {
  border-left: 4px solid #f59e0b;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-card.tables .stat-icon {
  background: #dbeafe;
  color: #3b82f6;
}

.stat-card.relationships .stat-icon {
  background: #ede9fe;
  color: #8b5cf6;
}

.stat-card.columns .stat-icon {
  background: #d1fae5;
  color: #10b981;
}

.stat-card.usecases .stat-icon {
  background: #fef3c7;
  color: #f59e0b;
}

.stat-info h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 4px;
  color: #1f2937;
}

.stat-info p {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
}
</style>