import { createRouter, createWebHistory } from 'vue-router'
import Login from '../pages/Login.vue'
import Register from '../pages/Register.vue'
import VerifyEmail from '../pages/VerifyEmail.vue'
import VerifyOtp from '../pages/VerifyOtp.vue'
import ForgotPassword from '../pages/ForgotPassword.vue'
import ResetPassword from '../pages/ResetPassword.vue'
// 📌 Import thêm các view quản lý project
import Homepage from '../views/HomePage.vue'
import ProjectEditor from '../views/ProjectEditor.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/verify-email', component: VerifyEmail }, 
  { path: '/verify-otp', component: VerifyOtp },
  { path: '/forgot-password', component: ForgotPassword },
  { path: '/reset-password', component: ResetPassword },
  // Project routes
  { path: '/dashboard', name: 'Home', component: Homepage },
  { path: '/editor/:id', name: 'Editor', component: ProjectEditor, props: true }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router




// import { createRouter, createWebHistory } from 'vue-router'
// import HomeView from '../views/HomeView.vue'
// import Register from '../views/Register.vue'
// import Login from '../views/Login.vue'
// // import GenerateDocView from '../views/GenerateDocView.vue'
// const router = createRouter({
//   history: createWebHistory(import.meta.env.BASE_URL),
//   routes: [
//     { path: '/', name: 'home', component: HomeView, },
//     { path: '/register', name: 'register', component: Register },
//     { path: '/login', name: 'login', component: Login },
//     // { path: '/generate-doc', component: GenerateDocView },
//     // {
//     //   path: '/about',
//     //   name: 'about',
//     //   // route level code-splitting
//     //   // this generates a separate chunk (About.[hash].js) for this route
//     //   // which is lazy-loaded when the route is visited.
//     //   component: () => import('../views/AboutView.vue'),
//     // },
//   ],
// })
// // ✅ Route Guard
// // router.beforeEach((to, from, next) => {
// //   const isLoggedIn = !!localStorage.getItem('token')

// //   // Nếu chưa login mà truy cập trang chủ => redirect về login
// //   // if (to.name === 'home' && !isLoggedIn) {
// //   //   next('/login')
// //   // } else {
// //   //   next()
// //   // }
// // })
// export default router
