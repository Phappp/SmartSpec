// Test API calls để debug
import { getUsers, searchUsers, filterUsers } from '@/api/admin'

export const testUserAPIs = async () => {
  console.log('Testing User APIs...')
  
  try {
    // Test 1: Get all users
    console.log('Test 1: Getting all users...')
    const allUsers = await getUsers()
    console.log('All users response:', allUsers)
    
    // Test 2: Search users
    console.log('Test 2: Searching users...')
    const searchResult = await searchUsers('test')
    console.log('Search result:', searchResult)
    
    // Test 3: Filter users by role
    console.log('Test 3: Filtering users by role...')
    const filterResult = await filterUsers({ system_role: 'ADMIN' })
    console.log('Filter by role result:', filterResult)
    
    // Test 4: Filter users by status
    console.log('Test 4: Filtering users by status...')
    const filterStatusResult = await filterUsers({ status: 'ACTIVE' })
    console.log('Filter by status result:', filterStatusResult)
    
    // Test 5: Filter users by both role and status
    console.log('Test 5: Filtering users by role and status...')
    const filterBothResult = await filterUsers({ system_role: 'ADMIN', status: 'ACTIVE' })
    console.log('Filter by both result:', filterBothResult)
    
  } catch (error) {
    console.error('API Test failed:', error)
    console.error('Error details:', error.response?.data || error.message)
  }
}

// Test search functionality
export const testSearchFunctionality = async () => {
  console.log('Testing Search Functionality...')
  
  const searchTerms = ['admin', 'test', 'user', '@gmail.com']
  
  for (const term of searchTerms) {
    try {
      console.log(`Searching for: "${term}"`)
      const result = await searchUsers(term)
      console.log(`Search "${term}" result:`, result)
    } catch (error) {
      console.error(`Search "${term}" failed:`, error)
    }
  }
}

// Test filter functionality
export const testFilterFunctionality = async () => {
  console.log('🔧 Testing Filter Functionality...')
  
  const filterTests = [
    { system_role: 'ADMIN' },
    { system_role: 'PARTICIPANT' },
    { status: 'ACTIVE' },
    { status: 'INACTIVE' },
    { system_role: 'ADMIN', status: 'ACTIVE' },
    { system_role: 'PARTICIPANT', status: 'INACTIVE' }
  ]
  
  for (const filter of filterTests) {
    try {
      console.log(`Filtering with:`, filter)
      const result = await filterUsers(filter)
      console.log(`Filter result:`, result)
    } catch (error) {
      console.error(`Filter failed:`, error)
    }
  }
}

// Export để có thể gọi từ console
window.testUserAPIs = testUserAPIs
window.testSearchFunctionality = testSearchFunctionality
window.testFilterFunctionality = testFilterFunctionality
