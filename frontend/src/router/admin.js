import { adminGuard } from '../utils/authGuard'

// Admin routes với authentication guard
const adminRoutes = [
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: () => import('../views/AdminDashboard.vue'),
    beforeEnter: adminGuard, // Chỉ cho phép ADMIN vào
    children: [
      {
        path: '',
        name: 'AdminHome',
        component: () => import('../views/admin/Dashboard.vue')
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('../views/admin/UserManagement.vue')
      },
      {
        path: 'api-keys',
        name: 'AdminApiKeys',
        component: () => import('../views/admin/ApiKeysManagement.vue')
      },
      {
        path: 'projects',
        name: 'AdminProjects',
        component: () => import('../views/admin/ProjectManagement.vue')
      },
      {
        path: 'access-denied',
        name: 'AdminAccessDenied',
        component: () => import('../components/AdminAccessDenied.vue')
      }
    ]
  }
]

export default adminRoutes
