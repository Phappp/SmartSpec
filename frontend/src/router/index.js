import { createRouter, createWebHistory } from 'vue-router'
import Homepage from '../views/HomePage.vue'
import UsecaseManagement from '../views/UsecaseManagement.vue'
import OutputManagement from '../views/OutputManagement.vue'
import TestcaseManagement from '../views/TestcaseManagement.vue'
import DatabaseManagement from '../views/DatabaseManagement.vue'
// import ActivityDiagramManagement from '../views/ActivityDiagramManagement.vue'
import UmlManagement from '../views/UmlManagement.vue'
import Login from '../pages/login.vue'
import OauthRedirect from '../pages/OauthRedirect.vue'
import Register from '../pages/register.vue'
import VerifyEmail from '../pages/VerifyEmail.vue'
import VerifyOtp from '../pages/VerifyOtp.vue'
import ForgotPassword from '../pages/ForgotPassword.vue'
import ResetPassword from '../pages/ResetPassword.vue'
import ProjectLayout from '../layouts/ProjectLayout.vue'
import adminRoutes from './admin'
import { authGuard, adminGuard } from '../utils/authGuard'

//import ProjectSharing from '@./components/ProjectSharingManagement.vue'
const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/oauth/redirect', component: OauthRedirect },
  { path: '/verify-email', component: VerifyEmail },
  { path: '/verify-otp', component: VerifyOtp },
  { path: '/forgot-password', component: ForgotPassword },
  { path: '/reset-password', component: ResetPassword },

  { path: '/reset-password', component: ResetPassword },
  { 
    path: '/dashboard', 
    name: 'Home', 
    component: Homepage,
    beforeEnter: authGuard
  },
  // ✅ Project Layout với children routes - giữ ProjectHeader không bị reload
  {
    path: '/project/:id',
    component: ProjectLayout,
    props: true,
    beforeEnter: authGuard,
    children: [
      {
        path: '',
        redirect: (to) => `/editor/${to.params.id}`
      },
      {
        path: 'editor',
        name: 'Editor',
        component: UsecaseManagement,
        props: true,
      },
      {
        path: 'output',
        name: 'OutputManagement',
        component: OutputManagement,
        props: true,
      },
      {
        path: 'testcases',
        name: 'TestcaseManagement',
        component: TestcaseManagement,
        props: true,
      },
      {
        path: 'database',
        name: 'DatabaseManagement',
        component: DatabaseManagement,
        props: true,
      },
      {
        path: 'uml',
        name: 'UmlManagement',
        component: UmlManagement,
        props: true,
      },
    ]
  },
  // ✅ Giữ route cũ để backward compatibility
  {
    path: '/editor/:id',
    redirect: (to) => `/project/${to.params.id}/editor`
  },
  ...adminRoutes,
]


const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Global navigation guard
router.beforeEach((to, from, next) => {
  console.log(`🔄 Navigating from ${from.path} to ${to.path}`)
  next()
})

export default router
