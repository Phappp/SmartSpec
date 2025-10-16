// Test Dashboard APIs
export const testDashboard = async () => {
  console.log('Testing Dashboard APIs...')
  
  try {
    const { getUsers, getProjects, getApiKeys } = await import('@/api/admin')
    
    // Test all APIs
    const [usersRes, projectsRes, apiKeysRes] = await Promise.all([
      getUsers(),
      getProjects(),
      getApiKeys()
    ])
    
    console.log('Users API:', usersRes?.data)
    console.log('Projects API:', projectsRes?.data)
    console.log('API Keys API:', apiKeysRes?.data)
    
    // Process data like Dashboard does
    const users = usersRes?.data?.data || usersRes?.data || []
    const projects = projectsRes?.data?.data || projectsRes?.data || []
    const apiKeys = apiKeysRes?.data?.data || apiKeysRes?.data || []
    
    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status === 'ACTIVE').length,
      totalProjects: projects.length,
      activeApiKeys: apiKeys.filter(k => k.is_active).length
    }
    
    console.log('Dashboard Stats:', stats)
    
    // User role stats
    const roleCounts = {}
    users.forEach(user => {
      const role = user.system_role || user.role || 'USER'
      roleCounts[role] = (roleCounts[role] || 0) + 1
    })
    
    const userRoleStats = Object.entries(roleCounts).map(([role, count], index) => ({
      name: role,
      count,
      percentage: users.length > 0 ? Math.round((count / users.length) * 100) : 0,
      color: ['blue', 'green', 'purple', 'orange'][index % 4]
    }))
    
    console.log('👥 User Role Stats:', userRoleStats)
    
    // API provider stats
    const providerCounts = {}
    apiKeys.forEach(key => {
      const provider = key.provider || 'Unknown'
      providerCounts[provider] = (providerCounts[provider] || 0) + 1
    })
    
    const apiProviderStats = Object.entries(providerCounts).map(([provider, count], index) => ({
      name: provider,
      count,
      percentage: apiKeys.length > 0 ? Math.round((count / apiKeys.length) * 100) : 0,
      color: ['blue', 'green', 'purple', 'orange'][index % 4]
    }))
    
    console.log('API Provider Stats:', apiProviderStats)
    
    return { stats, userRoleStats, apiProviderStats }
    
  } catch (error) {
    console.error('Dashboard test failed:', error)
  }
}

// Export for console
window.testDashboard = testDashboard
