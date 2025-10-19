<script setup>
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { initSocketConnection } from '@/utils/socket'

// Khi app được mount (chạy lần đầu tiên)
onMounted(() => {
  const userId = localStorage.getItem('userId')
  if (userId) {
    initSocketConnection()
    console.log('🔌 Socket initialized from App.vue')
  } else {
    console.log('⚠️ No userId found in localStorage — socket not joined')
  }
})
</script>

<template>
  <RouterView />
</template>
