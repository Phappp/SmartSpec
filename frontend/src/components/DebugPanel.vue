<template>
  <div v-if="showDebug" class="debug-panel">
    <div class="debug-header">
      <h3> Debug Panel</h3>
      <button @click="showDebug = false" class="close-btn">&times;</button>
    </div>
    
    <div class="debug-content">
      <div class="debug-section">
        <h4> Authentication</h4>
        <p><strong>Access Token:</strong> {{ hasAccessToken ? 'Present' : 'Missing' }}</p>
        <p><strong>Admin Token:</strong> {{ hasAdminToken ? 'Present' : 'Missing' }}</p>
        <p><strong>Token Preview:</strong> {{ tokenPreview }}</p>
      </div>
      
      <div class="debug-section">
        <h4> API Status</h4>
        <p><strong>Base URL:</strong> {{ apiBaseUrl }}</p>
        <p><strong>Last API Call:</strong> {{ lastApiCall || 'None' }}</p>
        <p><strong>Last Error:</strong> {{ lastError || 'None' }}</p>
      </div>
      
      <div class="debug-section">
        <h4> Data Status</h4>
        <p><strong>Users Count:</strong> {{ usersCount }}</p>
        <p><strong>Loading State:</strong> {{ isLoading ? 'Loading...' : 'Idle' }}</p>
      </div>
      
      <div class="debug-actions">
        <button @click="testApi" class="btn-test">Test API</button>
        <button @click="clearTokens" class="btn-clear">Clear Tokens</button>
        <button @click="refreshData" class="btn-refresh">Refresh Data</button>
      </div>
    </div>
  </div>
  
  <button v-else @click="showDebug = true" class="debug-toggle">
    🐛 Debug
  </button>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getUsers } from '@/api/admin'

const showDebug = ref(false)
const lastApiCall = ref('')
const lastError = ref('')
const isLoading = ref(false)
const usersCount = ref(0)

const apiBaseUrl = computed(() => {
  return import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
})

const hasAccessToken = computed(() => {
  return !!localStorage.getItem('accessToken')
})

const hasAdminToken = computed(() => {
  return !!localStorage.getItem('adminToken')
})

const tokenPreview = computed(() => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken')
  if (!token) return 'No token found'
  return token.substring(0, 20) + '...'
})

const testApi = async () => {
  try {
    isLoading.value = true
    lastApiCall.value = new Date().toLocaleTimeString()
    lastError.value = ''
    
    console.log(' Testing API call...')
    const response = await getUsers()
    console.log(' API test successful:', response)
    
    if (response?.data) {
      usersCount.value = response.data.length
    }
  } catch (error) {
    console.error(' API test failed:', error)
    lastError.value = error.message || 'Unknown error'
    
    if (error.response) {
      lastError.value += ` (${error.response.status})`
    }
  } finally {
    isLoading.value = false
  }
}

const clearTokens = () => {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('adminToken')
  localStorage.removeItem('adminToken')
  console.log(' Tokens cleared')
}

const refreshData = () => {
  window.location.reload()
}

onMounted(() => {
  // Auto-test API on mount
  testApi()
})
</script>

<style scoped>
.debug-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 400px;
  background: #1a1a1a;
  color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 9999;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #2d2d2d;
  border-radius: 8px 8px 0 0;
}

.debug-header h3 {
  margin: 0;
  font-size: 14px;
}

.close-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.debug-content {
  padding: 16px;
}

.debug-section {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #333;
}

.debug-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.debug-section h4 {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #4CAF50;
}

.debug-section p {
  margin: 4px 0;
  font-size: 11px;
  line-height: 1.4;
}

.debug-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.debug-actions button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-test {
  background: #4CAF50;
  color: white;
}

.btn-test:hover {
  background: #45a049;
}

.btn-clear {
  background: #f44336;
  color: white;
}

.btn-clear:hover {
  background: #da190b;
}

.btn-refresh {
  background: #2196F3;
  color: white;
}

.btn-refresh:hover {
  background: #1976D2;
}

.debug-toggle {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #1a1a1a;
  color: #fff;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  z-index: 9999;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.debug-toggle:hover {
  background: #2d2d2d;
}
</style>
