import { createRouter, createWebHistory } from 'vue-router'
import Homepage from '../views/HomePage.vue'
import UsecaseManagement from '../views/UsecaseManagement.vue'
import Login from '../pages/login.vue'
import OauthRedirect from '../pages/OauthRedirect.vue'
import Register from '../pages/register.vue'
import VerifyEmail from '../pages/VerifyEmail.vue'
import VerifyOtp from '../pages/VerifyOtp.vue'
import ForgotPassword from '../pages/ForgotPassword.vue'
import ResetPassword from '../pages/ResetPassword.vue'
import adminRoutes from './admin'
import { authGuard, adminGuard } from '../utils/authGuard'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/oauth/redirect', component: OauthRedirect },
  { path: '/verify-email', component: VerifyEmail },
  { path: '/verify-otp', component: VerifyOtp },
  { path: '/forgot-password', component: ForgotPassword },
  { path: '/reset-password', component: ResetPassword },
  { 
    path: '/dashboard', 
    name: 'Home', 
    component: Homepage,
    beforeEnter: authGuard
  },
  { 
    path: '/editor/:id', 
    name: 'Editor', 
    component: UsecaseManagement, 
    props: true,
    beforeEnter: authGuard
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
