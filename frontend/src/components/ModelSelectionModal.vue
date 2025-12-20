<template>
  <div v-if="modelValue" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Select LLM Model</h3>
        <button class="btn-close" @click="close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <!-- Loading State -->
        <div v-if="loading" class="loading-container">
          <div class="spinner"></div>
          <p>Loading available models...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="error-container">
          <span class="material-symbols-outlined error-icon">error</span>
          <p>{{ error }}</p>
          <button class="btn-retry" @click="fetchModels">Retry</button>
        </div>

        <!-- Models List -->
        <div v-else class="models-container">
          <!-- Category Filter -->
          <div class="category-filter">
            <button
              v-for="cat in categories"
              :key="cat"
              class="filter-btn"
              :class="{ active: selectedCategory === cat }"
              @click="selectedCategory = cat"
            >
              {{ cat.charAt(0).toUpperCase() + cat.slice(1) }}
            </button>
          </div>

          <!-- Models List -->
          <div class="models-list">
            <div
              v-for="model in filteredModels"
              :key="model.modelName"
              class="model-item"
              :class="{ selected: selectedModel === model.modelName }"
              @click="selectModel(model)"
            >
              <div class="model-info">
                <div class="model-header">
                  <span class="model-name">{{ model.displayName }}</span>
                  <span v-if="model.isFree" class="badge free">FREE</span>
                  <span v-if="!model.hasKey" class="badge warning">No Key</span>
                </div>
                <div class="model-details">
                  <span class="model-provider">{{ model.provider }}</span>
                  <span class="model-context">{{ formatContextWindow(model.contextWindow) }}</span>
                  <span v-if="!model.isFree && getModelPricing(model.modelName)" class="model-pricing">
                    {{ getModelPricing(model.modelName) }}
                  </span>
                </div>
              </div>
              <div class="model-check">
                <span
                  v-if="selectedModel === model.modelName"
                  class="material-symbols-outlined check-icon"
                >
                  check_circle
                </span>
              </div>
            </div>

            <div v-if="filteredModels.length === 0" class="empty-state">
              <span class="material-symbols-outlined">info</span>
              <p>No models available for this category</p>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="close">Cancel</button>
        <button
          class="btn-primary"
          @click="saveSelection"
          :disabled="!selectedModel || loading"
        >
          Save Selection
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import axiosClient from '@/utils/axiosClient'
import { useToast } from 'vue-toastification'

export default {
  name: 'ModelSelectionModal',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue', 'model-selected'],
  setup() {
    const toast = useToast()
    return { toast }
  },
  data() {
    return {
      loading: false,
      error: null,
      models: [],
      selectedCategory: 'all',
      selectedModel: null,
      categories: ['all', 'agent', 'worker', 'specialized'],
      // Hard-coded pricing cho các model có phí
      modelPricing: {
        'google/gemini-2.5-flash-lite': '$0.10/M input, $0.40/M output',
        'google/gemini-2.5-flash': '$0.30/M input, $2.50/M output, $1/M audio',
        'google/gemini-2.0-flash-001': '$0.10/M input, $0.40/M output, $0.70/M audio',
        'x-ai/grok-4.1-fast': '$0.20/M input, $0.50/M output',
        'openai/gpt-oss-20b': '$0.03/M input, $0.14/M output',
      },
    }
  },
  computed: {
    filteredModels() {
      if (this.selectedCategory === 'all') {
        return this.models
      }
      return this.models.filter((m) => m.category === this.selectedCategory)
    },
  },
  watch: {
    modelValue(newVal) {
      if (newVal) {
        this.fetchModels()
        this.loadSelectedModel() // ✅ Load sau khi fetch models để có thể match với models list
      }
    },
  },
  methods: {
    async fetchModels() {
      this.loading = true
      this.error = null

      try {
        // Gọi API để lấy danh sách models
        const response = await axiosClient.get('/api/llm/available-models')
        console.log('📥 [ModelSelectionModal] API Response:', response.data)
        
        const models = response.data?.data || response.data || []
        this.models = Array.isArray(models) ? models : []
        
        console.log(`✅ [ModelSelectionModal] Loaded ${this.models.length} models`)
        
        if (this.models.length === 0) {
          console.warn('⚠️ [ModelSelectionModal] No models available. Check if you have API keys configured.')
        }
      } catch (error) {
        console.error('❌ [ModelSelectionModal] Failed to fetch models:', error)
        console.error('Error details:', error.response?.data || error.message)
        this.error =
          error.response?.data?.message ||
          error.message ||
          'Failed to load available models. Please try again.'
      } finally {
        this.loading = false
      }
    },
    selectModel(model) {
      if (!model.hasKey) {
        this.toast.warning(
          `No API key found for ${model.provider}. Please add an API key first.`
        )
        return
      }
      this.selectedModel = model.modelName
    },
    async saveSelection() {
      if (!this.selectedModel) return

      try {
        // ✅ Lưu vào database qua API
        await axiosClient.post('/api/llm/save-model-preference', {
          modelName: this.selectedModel
        })
        console.log(`✅ [ModelSelectionModal] Saved model preference to database: ${this.selectedModel}`)

        // Lưu vào localStorage (backup)
        localStorage.setItem('selectedLLMModel', this.selectedModel)

        // Emit event
        this.$emit('model-selected', this.selectedModel)
        this.toast.success(`Model "${this.getModelDisplayName(this.selectedModel)}" selected`)
        this.close()
      } catch (error) {
        console.error('❌ [ModelSelectionModal] Failed to save model preference:', error)
        // Vẫn lưu vào localStorage nếu API fail
        localStorage.setItem('selectedLLMModel', this.selectedModel)
        this.toast.warning('Model saved locally. Please check your connection.')
        this.close()
      }
    },
    async loadSelectedModel() {
      try {
        // ✅ Ưu tiên load từ database
        const response = await axiosClient.get('/api/llm/get-model-preference')
        const modelName = response.data?.data?.modelName
        
        if (modelName) {
          console.log(`✅ [ModelSelectionModal] Loaded model preference from database: ${modelName}`)
          this.selectedModel = modelName
          
          // Sync với localStorage
          localStorage.setItem('selectedLLMModel', modelName)
          return
        }
      } catch (error) {
        console.warn('⚠️ [ModelSelectionModal] Failed to load model preference from database:', error)
        // Fallback to localStorage nếu API fail
      }
      
      // ✅ Fallback: Load từ localStorage nếu không có trong database
      const saved = localStorage.getItem('selectedLLMModel')
      if (saved) {
        console.log(`✅ [ModelSelectionModal] Loaded model preference from localStorage: ${saved}`)
        this.selectedModel = saved
      } else {
        console.log('⚠️ [ModelSelectionModal] No model preference found')
      }
    },
    getModelDisplayName(modelName) {
      const model = this.models.find((m) => m.modelName === modelName)
      return model ? model.displayName : modelName
    },
    formatContextWindow(tokens) {
      if (tokens >= 1000000) {
        return `${(tokens / 1000000).toFixed(1)}M tokens`
      } else if (tokens >= 1000) {
        return `${(tokens / 1000).toFixed(0)}K tokens`
      }
      return `${tokens} tokens`
    },
    getModelPricing(modelName) {
      return this.modelPricing[modelName] || null
    },
    close() {
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1a365d;
}

.btn-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #6b7280;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.btn-close:hover {
  color: #1a365d;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #1a365d;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-icon {
  font-size: 48px;
  color: #ef4444;
  margin-bottom: 16px;
}

.error-container p {
  color: #6b7280;
  margin-bottom: 16px;
}

.btn-retry {
  padding: 8px 16px;
  background: #1a365d;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-retry:hover {
  background: #2d4a8a;
}

.category-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 8px 16px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: #e5e7eb;
  color: #1a365d;
}

.filter-btn.active {
  background: #1a365d;
  color: white;
  border-color: #1a365d;
}

.models-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.model-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.model-item:hover {
  border-color: #1a365d;
  background: #f8fafc;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(26, 54, 93, 0.1);
}

.model-item.selected {
  border-color: #1a365d;
  background: #f0f4ff;
}

.model-info {
  flex: 1;
}

.model-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.model-name {
  font-size: 16px;
  font-weight: 600;
  color: #1a365d;
}

.badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.badge.free {
  background: #d1fae5;
  color: #065f46;
}

.badge.warning {
  background: #fef3c7;
  color: #92400e;
}

.model-details {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #6b7280;
}

.model-provider {
  font-weight: 500;
}

.model-context {
  color: #9ca3af;
}

.model-pricing {
  color: #dc2626;
  font-weight: 500;
  font-size: 12px;
}

.model-check {
  display: flex;
  align-items: center;
}

.check-icon {
  font-size: 24px;
  color: #1a365d;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6b7280;
}

.empty-state .material-symbols-outlined {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
}

.btn-secondary,
.btn-primary {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-secondary {
  background: #f3f4f6;
  color: #6b7280;
}

.btn-secondary:hover {
  background: #e5e7eb;
  color: #1a365d;
}

.btn-primary {
  background: #1a365d;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2d4a8a;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

