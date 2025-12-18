// composables/useActiveMembers.js
import { ref } from 'vue'
import { socket } from '@/utils/socket'

export function useActiveMembers() {
    const activeUsers = ref([])
    const isSocketConnected = ref(false)

    const currentUserId = localStorage.getItem('userId')

    // Socket event handlers - CHỈ active members
    const handleUserJoined = (event) => {
        console.log('👤 User joined event received:', event)
        activeUsers.value = event.activeUsers || []
    }

    const handleUserLeft = (event) => {
        console.log('👤 User left event received:', event)
        let updatedActiveUsers = event.activeUsers || []

        // Fix manual nếu server gửi sai
        if (updatedActiveUsers.some((user) => user.userId === event.userId)) {
            updatedActiveUsers = updatedActiveUsers.filter((user) => user.userId !== event.userId)
        }
        activeUsers.value = updatedActiveUsers
    }

    // Initialize socket connection - CHỈ active members
    const initSocketConnection = (projectId) => {
        if (!socket) {
            console.error('❌ Socket not available')
            return
        }

        console.log('🔌 Initializing socket connection for active members...')

        socket.auth = { userId: currentUserId }

        // Remove existing listeners trước khi thêm mới (tránh duplicate)
        socket.off('user_joined', handleUserJoined)
        socket.off('user_left', handleUserLeft)

        // ✅ THÊM listeners cho active members
        socket.on('user_joined', handleUserJoined)
        socket.on('user_left', handleUserLeft)

        // THÊM connect/disconnect handlers
        const handleConnect = () => {
            isSocketConnected.value = true
            console.log('✅ Connected to socket server')
            joinProjectRoom(projectId)
        }

        const handleDisconnect = () => {
            isSocketConnected.value = false
            console.log('❌ Disconnected from socket server')
        }

        socket.off('connect', handleConnect)
        socket.off('disconnect', handleDisconnect)
        socket.on('connect', handleConnect)
        socket.on('disconnect', handleDisconnect)

        // Join project room
        if (socket.connected) {
            joinProjectRoom(projectId)
        } else {
            console.log('🔄 Socket not connected, connecting...')
            socket.connect()
        }
    }

    const joinProjectRoom = (projectId) => {
        if (socket && projectId) {
            socket.emit('join_project', projectId)
            //console.log(`✅ Joined project room: project_${projectId}`)
        }
    }

    const cleanupSocketConnection = (projectId) => {
        if (socket) {
            console.log('🧹 Cleaning up socket connection...')

            // Remove ONLY the listeners we added
            socket.off('user_joined', handleUserJoined)
            socket.off('user_left', handleUserLeft)

            // Leave project room
            if (projectId) {
                socket.emit('leave_project', projectId)
                //console.log(`🚪 Left project room: project_${projectId}`)
            }
        }
    }

    return {
        activeUsers,
        isSocketConnected,
        initSocketConnection,
        cleanupSocketConnection
    }
}