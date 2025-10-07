import { createRouter, createWebHistory } from 'vue-router'
import Homepage from '../views/HomePage.vue'
import UsecaseManagement from '../views/UsecaseManagement.vue'
import OutputManagement from '../views/OutputManagement.vue'
import TestcaseManagement from '../views/TestcaseManagement.vue'
import DatabaseManagement from '../views/DatabaseManagement.vue'
import UmlManagement from '../views/UmlManagement.vue'
import Login from '../pages/login.vue'
import OauthRedirect from '../pages/OauthRedirect.vue'
import Register from '../pages/register.vue'
import VerifyEmail from '../pages/VerifyEmail.vue'
import VerifyOtp from '../pages/VerifyOtp.vue'
import ForgotPassword from '../pages/ForgotPassword.vue'
import ResetPassword from '../pages/ResetPassword.vue'

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
  { path: '/dashboard', name: 'Home', component: Homepage },
  { path: '/editor/:id', name: 'Editor', component: UsecaseManagement, props: true },
  {
    path: '/project/:id/output',
    name: 'OutputManagement',
    component: OutputManagement,
    props: true,
    meta: { requiresAuth: true }
  },
  {
    path: '/project/:id/testcases',
    name: 'TestcaseManagement',
    component: TestcaseManagement,
    props: true,
    meta: { requiresAuth: true }
  },
  {
    path: '/project/:id/database',
    name: 'DatabaseManagement',
    component: DatabaseManagement,
    props: true,
    meta: { requiresAuth: true }
  },
  {
    path: '/project/:id/uml',
    name: 'UmlManagement',
    component: UmlManagement,
    props: true,
    meta: { requiresAuth: true }
  }

]
const router = createRouter({
  history: createWebHistory(),
  routes,
})
export default router
