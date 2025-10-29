<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content medium">
      <div class="modal-header">
        <h2>Step Templates</h2>
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

          <div class="templates-list">
            <div
              v-for="template in filteredTemplates"
              :key="template.id"
              class="template-card"
              @click="selectTemplate(template)"
            >
              <div class="template-header">
                <h4 class="template-title">{{ template.title }}</h4>
                <span class="template-steps">{{ template.steps.length }} steps</span>
              </div>
              <p class="template-description">{{ template.description }}</p>
              <div class="template-preview">
                <div
                  v-for="(step, index) in template.steps.slice(0, 2)"
                  :key="index"
                  class="preview-step"
                >
                  <span class="step-number">{{ index + 1 }}</span>
                  <span class="step-action">{{ step.action.substring(0, 50) }}...</span>
                </div>
                <div v-if="template.steps.length > 2" class="more-steps">
                  +{{ template.steps.length - 2 }} more steps
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
          <button class="btn btn-primary" @click="createCustomTemplate" v-if="customSteps.length">
            Create Custom ({{ customSteps.length }})
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
  name: 'StepTemplatesModal',
  emits: ['close', 'apply-template'],
  setup(props, { emit }) {
    const toast = useToast()
    const activeCategory = ref('common')
    const customSteps = ref([])

    const categories = [
      { id: 'common', name: 'Common Flows' },
      { id: 'auth', name: 'Authentication' },
      { id: 'crud', name: 'CRUD Operations' },
      { id: 'api', name: 'API Testing' },
      { id: 'ui', name: 'UI Testing' },
      { id: 'custom', name: 'My Templates' },
    ]

    const templates = ref([
      {
        id: 'login-flow',
        title: 'User Login Flow',
        description: 'Standard user authentication process',
        category: 'auth',
        steps: [
          {
            step_number: 1,
            action: 'Navigate to login page',
            input_data: { url: '/login' },
            expected_immediate_result: 'Login page loads successfully',
          },
          {
            step_number: 2,
            action: 'Enter username and password',
            input_data: { username: 'testuser', password: 'testpass123' },
            expected_immediate_result: 'Credentials entered into form fields',
          },
          {
            step_number: 3,
            action: 'Click login button',
            input_data: { element: 'login-btn' },
            expected_immediate_result: 'Login request sent to server',
          },
          {
            step_number: 4,
            action: 'Verify successful login',
            input_data: { expected_url: '/dashboard' },
            expected_immediate_result: 'User redirected to dashboard',
          },
        ],
      },
      {
        id: 'create-record',
        title: 'Create New Record',
        description: 'Create a new record in the system',
        category: 'crud',
        steps: [
          {
            step_number: 1,
            action: 'Navigate to create form',
            input_data: { url: '/create' },
            expected_immediate_result: 'Create form loads successfully',
          },
          {
            step_number: 2,
            action: 'Fill in required fields',
            input_data: { field1: 'value1', field2: 'value2' },
            expected_immediate_result: 'All required fields populated',
          },
          {
            step_number: 3,
            action: 'Submit the form',
            input_data: { element: 'submit-btn' },
            expected_immediate_result: 'Form data sent to server',
          },
          {
            step_number: 4,
            action: 'Verify record creation',
            input_data: { expected_message: 'Record created successfully' },
            expected_immediate_result: 'Success message displayed',
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

    const selectTemplate = (template) => {
      emit('apply-template', template)
      emit('close')
    }

    const createCustomTemplate = () => {
      toast.info('Custom template creation feature coming soon')
    }

    return {
      activeCategory,
      categories,
      filteredTemplates,
      customSteps,
      selectTemplate,
      createCustomTemplate,
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

.modal-content.medium {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 800px;
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
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 1.5rem;
  height: 500px;
}

.template-categories {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-right: 1px solid #e2e8f0;
  padding-right: 1rem;
}

.category-btn {
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  border-radius: 6px;
  text-align: left;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.category-btn:hover {
  background: #f1f5f9;
  color: #374151;
}

.category-btn.active {
  background: #1a365d;
  color: white;
}

.templates-list {
  display: grid;
  grid-template-columns: 1fr;
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
  border-color: #1a365d;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
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

.template-steps {
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

.template-preview {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-step {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.5rem;
  background: #f8fafc;
  border-radius: 4px;
}

.step-number {
  background: #1a365d;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.step-action {
  font-size: 0.875rem;
  color: #475569;
  line-height: 1.4;
}

.more-steps {
  font-size: 0.75rem;
  color: #64748b;
  text-align: center;
  padding: 0.5rem;
  background: #f1f5f9;
  border-radius: 4px;
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

.btn-secondary {
  background: white;
  border-color: #d1d5db;
  color: #374151;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #9ca3b8;
}

@media (max-width: 768px) {
  .templates-container {
    grid-template-columns: 1fr;
    height: auto;
  }

  .template-categories {
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
    padding-right: 0;
    padding-bottom: 1rem;
    flex-direction: row;
    overflow-x: auto;
  }

  .category-btn {
    white-space: nowrap;
  }
}
</style>