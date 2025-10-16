<template>
  <div class="container-center">
    <div class="login-card">
      <div class="card-content">
        <router-link style="pointer-events: none" to="/"
          ><i class="fa-brands fa-slack"></i
        ></router-link>
        <h1 class="card-title">Log in to SmartSpec</h1>

        <div class="form-group">
          <form @submit.prevent="handleSubmit">
            <div class="form-group-input">
              <label for="emailOrUsername" class="form-label">Email or username</label>
              <input
                type="text"
                v-model="email"
                class="form-control"
                :class="{ error: emailError }"
                id="emailOrUsername"
                placeholder="Email or username"
                @input="clearErrors"
              />
              <p v-if="emailError" class="field-error">{{ emailError }}</p>
            </div>
            <div class="form-group-input" v-if="showPasswordField" id="password-input">
              <label for="password" class="form-label">Password</label>
              <input
                :type="passwordVisible ? 'text' : 'password'"
                v-model="password"
                class="form-control"
                :class="{ error: passwordError }"
                id="password"
                placeholder="Password"
                @input="clearErrors"
              />
              <span class="password-toggle" @click="togglePasswordVisibility">
                <i :class="passwordVisible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'"></i>
              </span>
              <p v-if="passwordError" class="field-error">{{ passwordError }}</p>
            </div>
            <div class="divider">
              <span class="divider-text">or</span>
            </div>
            <div class="social-buttons-grid">
              <button type="button" class="btn btn-social" @click="loginWithGoogle">
                <i class="fab fa-google icon-margin-right"></i>
                <div class="brand">Continue with Google</div>
              </button>

              <!-- <div class="btn btn-social" @click="continueWith('facebook')">
                <i class="fab fa-facebook icon-margin-right"></i>
                <div class="brand">Continue with Facebook</div>
              </div>
              <div class="btn btn-social" @click="continueWith('apple')">
                <i class="fab fa-apple icon-margin-right" style="font-size: 1.2rem"></i>
                <div class="brand">Continue with Apple</div>
              </div> -->
            </div>
            <div class="continue-button-wrapper">
              <button type="submit" class="btn btn-primary" :disabled="loading">
                <span v-if="loading" class="button-spinner"></span>
                <span v-else>{{ showPasswordField ? 'Log In' : 'Continue' }}</span>
              </button>
            </div>
          </form>
          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        </div>

        <router-link to="forgot-password" class="forgot-password-link"
          >Forgot your password?</router-link
        >

        <p class="signup-text">
          Don't have an account?
          <router-link to="/register" class="signup-link">Sign up for SmartSpec</router-link>
        </p>
      </div>
    </div>
    <AppModal
      v-model="modalOpen"
      :title="modalTitle"
      :message="modalMessage"
      @update:modelValue="handleModalClose"
    />
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import AppModal from '../components/AppModal.vue'
export default {
  name: 'LoginView',
  components: { AppModal },
  setup() {
    const router = useRouter()
    const email = ref('')
    const password = ref('')
    const passwordVisible = ref(false)
    const showPasswordField = ref(false)
    const errorMessage = ref('')
    const loading = ref(false)
    const emailError = ref('')
    const passwordError = ref('')

    // Modal state
    const modalOpen = ref(false)
    const modalTitle = ref('Thông báo')
    const modalMessage = ref('')

    const openModal = (message, title = 'Thông báo', onClose = null) => {
      modalTitle.value = title
      modalMessage.value = message
      modalOpen.value = true
      // Store callback for when modal closes
      if (onClose) {
        modalOnClose.value = onClose
      }
    }

    const modalOnClose = ref(null)

    const handleModalClose = () => {
      modalOpen.value = false
      if (modalOnClose.value) {
        modalOnClose.value()
        modalOnClose.value = null
      }
    }

    // Google OAuth config
    const GOOGLE_CLIENT_ID =
      '1030258814420-rra11eqd5vhcriar7sgclokotfrgmp9k.apps.googleusercontent.com'
    const GOOGLE_REDIRECT_URI = 'http://localhost:5173/login' // FE domain
    const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

    function loginWithGoogle() {
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: 'http://localhost:8000/api/auth/google/oauth',
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
      })
      window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`
    }

    const togglePasswordVisibility = () => {
      passwordVisible.value = !passwordVisible.value
    }

    const validateEmail = () => {
      emailError.value = ''
      if (!email.value) {
        emailError.value = 'Email is required'
        return false
      }
      if (!/\S+@\S+\.\S+/.test(email.value)) {
        emailError.value = 'Please enter a valid email'
        return false
      }
      return true
    }

    const validatePassword = () => {
      passwordError.value = ''
      if (!password.value) {
        passwordError.value = 'Password is required'
        return false
      }
      return true
    }

    const clearErrors = () => {
      errorMessage.value = ''
      emailError.value = ''
      passwordError.value = ''
    }

    const handleSubmit = async () => {
      clearErrors()

      if (!showPasswordField.value) {
        if (validateEmail()) {
          showPasswordField.value = true
        }
        return
      }

      if (!validateEmail() || !validatePassword()) return

      loading.value = true
      try {
        const response = await axios.post('http://localhost:8000/api/auth/login', {
          email: email.value,
          password: password.value,
        })

        const data = response.data?.data
        if (!data) throw new Error('Login response không có token')

        if (data.isTwoFactorEnabled) {
          localStorage.setItem('otpToken', data.otpToken)
          localStorage.setItem('email', email.value)
          router.push('/verify-otp')
        } else {
          localStorage.setItem('accessToken', data.accessToken)
          localStorage.setItem('refreshToken', data.refreshToken)
          localStorage.setItem('userId', data.sub)
          
          // Kiểm tra nếu là ADMIN thì chuyển vào trang admin
          try {
            const payload = JSON.parse(atob(data.accessToken.split('.')[1]))
            if (payload.system_role === 'ADMIN') {
              openModal('Log in successfully', 'Login', () => {
                router.push('/admin')
              })
            } else {
              openModal('Log in successfully', 'Login', () => {
                router.push('/dashboard')
              })
            }
          } catch (error) {
            console.error('Error parsing token:', error)
            openModal('Log in successfully', 'Login', () => {
              router.push('/dashboard')
            })
          }
        }
      } catch (error) {
        console.error(error)
        const msg = error.response?.data?.message || 'Invalid email or password. Please try again.'
        errorMessage.value = msg
        openModal(msg, 'Login failed')
      } finally {
        loading.value = false
      }
    }

    return {
      email,
      password,
      passwordVisible,
      showPasswordField,
      errorMessage,
      loading,
      emailError,
      passwordError,
      modalOpen,
      modalTitle,
      modalMessage,
      togglePasswordVisibility,
      handleSubmit,
      clearErrors,
      loginWithGoogle,
      openModal,
      handleModalClose,
    }
  },
}
</script>

<style scoped>
.container-center {
  width: 100%;
  width: 450px;
  padding: 20px;
  margin: 0 auto;
}

.login-card {
  /* background-color: white; */
  border-radius: 12px;
  /* box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); */
  padding: 30px;
  text-align: center;
}

.fa-slack {
  font-size: 50px;
  color: #0a1a4d;
  margin-bottom: 24px;
  display: block;
  justify-self: center;
}

.card-title {
  font-size: 24px;
  margin-bottom: 24px;
  font-weight: bold;
  color: #0a1a4d;
}

.form-group {
  text-align: left;
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.form-control {
  width: 100%;
  padding: 14px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.form-control:focus {
  outline: none;
  border-color: #0a1a4d;
  box-shadow: 0 0 0 2px rgba(10, 26, 77, 0.2);
}

.form-control::placeholder {
  color: #b3b3b3;
}

.form-control.error {
  border-color: #e74c3c;
}

#password-input {
  position: relative;
  margin-top: 12px;
}

.password-toggle {
  position: absolute;
  right: 15px;
  transform: translateY(40%);
  color: #b3b3b3;
  cursor: pointer;
  font-size: 18px;
  transition: 0.2s ease;
}

.password-toggle:hover {
  color: #000;
}

.divider {
  border: none;
  border-top: 1px solid #ddd;
  margin: 20px 0;
  position: relative;
}

.divider-text {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 0 15px;
  color: #b3b3b3;
  font-size: 14px;
}

.social-buttons-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 14px 20px;
  border: 1px solid #ddd;
  border-radius: 9999px;
  background-color: white;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  box-sizing: border-box;
  font-weight: 500;
}

.btn-social {
  background-color: white;
  color: #333;
}

.btn-social:hover {
  background-color: #f9f9f9;
  border-color: #ccc;
}

.btn-social .brand {
  text-align: center;
  flex: 1;
}

.btn-primary {
  background-color: #0a1a4d;
  border-color: #0a1a4d;
  color: white;
  font-weight: bold;
  font-size: 16px;
  padding: 16px 20px;
}

.btn-primary:hover {
  background-color: #1a2a7a;
  border-color: #1a2a7a;
}

.btn-primary:disabled {
  background-color: #b3b3b3;
  border-color: #b3b3b3;
  cursor: not-allowed;
}

.icon-margin-right {
  margin-right: 8px;
}

.continue-button-wrapper {
  margin-top: 24px;
  margin-bottom: 16px;
}

.error-message {
  color: #e74c3c;
  font-size: 14px;
  margin-top: 8px;
  text-align: center;
}

.field-error {
  color: #e74c3c;
  font-size: 13px;
  margin-top: 5px;
}

.forgot-password-link {
  color: #0a1a4d;
  text-decoration: none;
  display: block;
  margin-bottom: 24px;
  font-size: 14px;
}

.forgot-password-link:hover {
  text-decoration: underline;
}

.signup-text {
  color: #b3b3b3;
  font-size: 14px;
  margin-top: 16px;
}

.signup-link {
  color: #0a1a4d;
  text-decoration: none;
  font-weight: 500;
}

.signup-link:hover {
  text-decoration: underline;
}

/* Loading animation */
/* 👇 NEW SPINNER STYLES ADDED HERE 👇 */
@keyframes spinner-a4dj62 {
  100% {
    transform: rotate(1turn);
  }
}

.button-spinner {
  width: 24px;
  height: 24px;
  display: grid;
  border: 3px solid #0000;
  border-radius: 50%;
  border-right-color: #ffffff; /* Color for spinner */
  animation: spinner-a4dj62 1s infinite linear;
}

.button-spinner::before,
.button-spinner::after {
  content: '';
  grid-area: 1/1;
  margin: 1.5px;
  border: inherit;
  border-radius: 50%;
  animation: spinner-a4dj62 2s infinite;
}

.button-spinner::after {
  margin: 6px;
  animation-duration: 3s;
}

/* Responsive */
@media (max-width: 480px) {
  .container-center {
    width: 100vw;
    padding: 10px;
  }

  .login-card {
    padding: 20px;
    max-width: 300px;
  }

  .card-title {
    font-size: 20px;
  }

  .btn {
    padding: 12px 16px;
    font-size: 14px;
  }
}
</style>

<style>
/* Global styles for Font Awesome */
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
</style>
