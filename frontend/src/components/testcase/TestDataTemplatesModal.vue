<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content large">
      <div class="modal-header">
        <h2>Test Data Templates</h2>
        <button class="btn-close" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <div class="templates-container">
          <div class="template-categories">
            <button
              v-for="category in categories"
              :key="category.id"
              :class="['category-btn', activeCategory === category.id ? 'active' : '']"
              @click="activeCategory = category.id"
            >
              {{ category.name }}
            </button>
          </div>

          <div class="templates-content">
            <div class="templates-list">
              <div
                v-for="template in filteredTemplates"
                :key="template.id"
                class="template-card"
                @click="selectTemplate(template)"
              >
                <div class="template-header">
                  <h4 class="template-title">{{ template.title }}</h4>
                  <span class="template-scenarios">{{ template.scenarios.length }} scenarios</span>
                </div>
                <p class="template-description">{{ template.description }}</p>

                <div class="scenarios-preview">
                  <div
                    v-for="(scenario, index) in template.scenarios.slice(0, 2)"
                    :key="index"
                    class="scenario-preview"
                  >
                    <h5 class="scenario-name">{{ scenario.name }}</h5>
                    <div class="scenario-data">
                      <div class="data-preview">
                        <span class="data-label">Input:</span>
                        <code class="data-code">{{ previewData(scenario.input_payload) }}</code>
                      </div>
                      <div class="data-preview">
                        <span class="data-label">Expected:</span>
                        <code class="data-code">{{ previewData(scenario.expected_output) }}</code>
                      </div>
                    </div>
                  </div>
                  <div v-if="template.scenarios.length > 2" class="more-scenarios">
                    +{{ template.scenarios.length - 2 }} more scenarios
                  </div>
                </div>

                <div class="template-tags">
                  <span v-for="tag in template.tags" :key="tag" class="template-tag">
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>

            <div class="template-preview" v-if="selectedTemplate">
              <h3 class="preview-title">{{ selectedTemplate.title }}</h3>
              <p class="preview-description">{{ selectedTemplate.description }}</p>

              <div class="scenarios-list">
                <div
                  v-for="(scenario, index) in selectedTemplate.scenarios"
                  :key="index"
                  class="scenario-detail"
                >
                  <h4 class="scenario-title">{{ scenario.name }}</h4>

                  <div class="scenario-data-grid">
                    <div class="data-section">
                      <h5 class="data-title">Input Payload</h5>
                      <pre
                        class="data-json"
                      ><code>{{ JSON.stringify(scenario.input_payload, null, 2) }}</code></pre>
                    </div>

                    <div class="data-section">
                      <h5 class="data-title">Expected Output</h5>
                      <pre
                        class="data-json"
                      ><code>{{ JSON.stringify(scenario.expected_output, null, 2) }}</code></pre>
                    </div>
                  </div>

                  <div class="validation-rules" v-if="scenario.validation_rules.length">
                    <h5 class="rules-title">Validation Rules</h5>
                    <ul class="rules-list">
                      <li
                        v-for="(rule, ruleIndex) in scenario.validation_rules"
                        :key="ruleIndex"
                        class="rule-item"
                      >
                        {{ rule }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
          <button class="btn btn-primary" @click="applyTemplate" :disabled="!selectedTemplate">
            Use This Template
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'

export default {
  name: 'TestDataTemplatesModal',
  emits: ['close', 'apply-template'],
  setup(props, { emit }) {
    const toast = useToast()
    const activeCategory = ref('common')
    const selectedTemplate = ref(null)

    const categories = [
      { id: 'common', name: 'Common Scenarios' },
      { id: 'auth', name: 'Authentication' },
      { id: 'api', name: 'API Testing' },
      { id: 'forms', name: 'Form Validation' },
      { id: 'boundary', name: 'Boundary Values' },
      { id: 'custom', name: 'My Templates' },
    ]

    const templates = ref([
      {
        id: 'user-registration',
        title: 'User Registration Scenarios',
        description: 'Comprehensive test data for user registration flows',
        category: 'auth',
        tags: ['authentication', 'registration', 'validation'],
        scenarios: [
          {
            name: 'Valid Registration',
            input_payload: {
              username: 'john_doe',
              email: 'john@example.com',
              password: 'SecurePass123!',
              confirm_password: 'SecurePass123!',
            },
            expected_output: {
              success: true,
              user_id: 12345,
              message: 'User registered successfully',
            },
            validation_rules: [
              'Username must be unique',
              'Email must be valid format',
              'Password must meet complexity requirements',
            ],
          },
          {
            name: 'Duplicate Username',
            input_payload: {
              username: 'existing_user',
              email: 'new@example.com',
              password: 'Password123!',
              confirm_password: 'Password123!',
            },
            expected_output: {
              success: false,
              error: 'Username already exists',
              error_code: 'USERNAME_TAKEN',
            },
            validation_rules: ['Username uniqueness validation', 'Appropriate error message'],
          },
        ],
      },
      {
        id: 'api-error-cases',
        title: 'API Error Scenarios',
        description: 'Test data for various API error responses',
        category: 'api',
        tags: ['api', 'errors', 'http'],
        scenarios: [
          {
            name: 'Invalid JSON',
            input_payload: {
              malformed: 'json{',
            },
            expected_output: {
              error: 'Invalid JSON format',
              status_code: 400,
            },
            validation_rules: ['Proper error response format', 'Correct HTTP status code'],
          },
          {
            name: 'Missing Required Fields',
            input_payload: {
              optional_field: 'value',
            },
            expected_output: {
              error: 'Missing required fields: username, email',
              status_code: 422,
              missing_fields: ['username', 'email'],
            },
            validation_rules: ['Clear error message', 'List missing fields'],
          },
        ],
      },
    ])

    const filteredTemplates = computed(() => {
      if (activeCategory.value === 'custom') {
        return []
      }
      return templates.value.filter((template) => template.category === activeCategory.value)
    })

    const previewData = (data) => {
      const str = JSON.stringify(data)
      return str.length > 50 ? str.substring(0, 50) + '...' : str
    }

    const selectTemplate = (template) => {
      selectedTemplate.value = template
    }

    const applyTemplate = () => {
      if (selectedTemplate.value) {
        emit('apply-template', selectedTemplate.value)
        emit('close')
        toast.success('Test data template applied successfully')
      }
    }

    return {
      activeCategory,
      selectedTemplate,
      categories,
      filteredTemplates,
      previewData,
      selectTemplate,
      applyTemplate,
    }
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
  padding: 1rem;
}

.modal-content.large {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 1000px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
  position: sticky;
  top: 0;
  z-index: 10;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a365d;
  margin: 0;
}

.btn-close {
  padding: 0.5rem;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  background: #e2e8f0;
  color: #475569;
}

.modal-body {
  padding: 2rem;
}

.templates-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 600px;
}

.templates-content {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 1.5rem;
  height: 100%;
}

.templates-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
}

.template-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.template-card:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.template-card:active {
  border-color: #1a365d;
  background: #f7fafc;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.template-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1a365d;
  margin: 0;
}

.template-scenarios {
  font-size: 0.75rem;
  color: #64748b;
  background: #f1f5f9;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
}

.template-description {
  color: #64748b;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.scenarios-preview {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.scenario-preview {
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 6px;
  border-left: 3px solid #1a365d;
}

.scenario-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a365d;
  margin: 0 0 0.5rem 0;
}

.scenario-data {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.data-preview {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.data-label {
  font-weight: 500;
  color: #64748b;
  min-width: 50px;
}

.data-code {
  background: #f1f5f9;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  color: #475569;
  font-family: 'Monaco', 'Menlo', monospace;
  flex: 1;
}

.more-scenarios {
  font-size: 0.75rem;
  color: #64748b;
  text-align: center;
  padding: 0.5rem;
  background: #f1f5f9;
  border-radius: 4px;
}

.template-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.template-tag {
  font-size: 0.7rem;
  color: #475569;
  background: #e2e8f0;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
}

.template-preview {
  border-left: 1px solid #e2e8f0;
  padding-left: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
}

.preview-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a365d;
  margin: 0;
}

.preview-description {
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

.scenarios-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.scenario-detail {
  padding: 1.25rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.scenario-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1a365d;
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.scenario-data-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.data-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.data-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a365d;
  margin: 0;
}

.data-json {
  background: #1e293b;
  color: #e2e8f0;
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.75rem;
  line-height: 1.4;
  font-family: 'Monaco', 'Menlo', monospace;
  margin: 0;
}

.validation-rules {
  margin-top: 1rem;
}

.rules-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a365d;
  margin: 0 0 0.5rem 0;
}

.rules-list {
  margin: 0;
  padding-left: 1.25rem;
}

.rule-item {
  font-size: 0.875rem;
  color: #475569;
  line-height: 1.5;
  margin-bottom: 0.25rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #1a365d;
  border-color: #1a365d;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2d3748;
  border-color: #2d3748;
}

.btn-primary:disabled {
  background: #9ca3af;
  border-color: #9ca3af;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  border-color: #d1d5db;
  color: #374151;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #9ca3b8;
}

.template-categories {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.category-btn {
  padding: 0.75rem 1rem;
  border: none;
  background: #f1f5f9;
  border-radius: 6px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
  white-space: nowrap;
}

.category-btn:hover {
  background: #e2e8f0;
  color: #374151;
}

.category-btn.active {
  background: #1a365d;
  color: white;
}

@media (max-width: 768px) {
  .templates-content {
    grid-template-columns: 1fr;
  }

  .template-preview {
    border-left: none;
    border-top: 1px solid #e2e8f0;
    padding-left: 0;
    padding-top: 1.5rem;
  }

  .scenario-data-grid {
    grid-template-columns: 1fr;
  }

  .template-categories {
    flex-wrap: wrap;
  }
}
</style>