import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import Homepage from '../views/HomePage.vue'
import ProjectEditor from '../views/ProjectEditor.vue'
import Login from '../pages/login.vue'
import Register from '../pages/register.vue'
import VerifyEmail from '../pages/VerifyEmail.vue'
import VerifyOtp from '../pages/VerifyOtp.vue'
import ForgotPassword from '../pages/ForgotPassword.vue'
import ResetPassword from '../pages/ResetPassword.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/verify-email', component: VerifyEmail },
  { path: '/verify-otp', component: VerifyOtp },
  { path: '/forgot-password', component: ForgotPassword },
  { path: '/reset-password', component: ResetPassword },
  { path: '/reset-password', component: ResetPassword },
  { path: '/dashboard', name: 'Home', component: Homepage },
  { path: '/editor/:id', name: 'Editor', component: ProjectEditor, props: true }
]
const router = createRouter({
  history: createWebHistory(),
  routes,
})
export default router
