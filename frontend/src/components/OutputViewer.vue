<template>
  <div class="output-viewer">
    <!-- SRS -->
    <div class="output-card">
      <h3>Software Requirements Specification</h3>
      <p><strong>1. Introduction</strong></p>
      <p>This document outlines the software requirements for the e-commerce platform project...</p>
      <p><strong>2. Functional Requirements</strong></p>
      <ul>
        <li>User authentication and authorization</li>
        <li>Product catalog management</li>
        <li>Shopping cart functionality</li>
        <li>Payment processing integration</li>
      </ul>
    </div>

    <!-- Use Case Diagram -->
    <div class="output-card">
      <h3>Use Case Diagram</h3>
      <div class="diagram-box">Use Case Diagram will be generated here</div>
    </div>

    <!-- Activity Diagram -->
    <div class="output-card">
      <h3>Activity Diagram</h3>
      <div class="diagram-box">Activity Diagram will be generated here</div>
    </div>
  </div>
</template>

<script>
export default {
  name: "OutputViewer",
};
</script>

<style scoped>
.output-viewer {
  padding: 20px;
  background: #ffffff;
  height: 100%;
  overflow-y: auto;
}

.output-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
}

.output-card h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #111827;
}

.output-card p,
.output-card li {
  font-size: 13px;
  color: #374151;
  line-height: 1.5;
}

.diagram-box {
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #6b7280;
}
</style>
