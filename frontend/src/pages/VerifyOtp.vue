<template>
  <div class="container-center">
    <div class="login-card">
      <div class="card-content">
        <router-link to="/"><i class="fa-brands fa-slack"></i></router-link>
        <h1 class="card-title">Verify your OTP</h1>

        <div class="form-group">
          <form @submit.prevent="handleSubmit">
            <div class="form-group-input">
              <label for="otp" class="form-label">Enter OTP</label>
              <div class="otp-inputs">
                <input
                  v-for="(digit, index) in otpArray"
                  :key="index"
                  type="text"
                  maxlength="1"
                  class="otp-box"
                  v-model="otpArray[index]"
                  @input="onInput($event, index)"
                  @keydown.backspace="onBackspace($event, index)"
                  ref="otpRefs"
                  :disabled="loading"
                />
              </div>
              <p v-if="otpError" class="field-error">{{ otpError }}</p>
            </div>

            <div class="continue-button-wrapper">
              <button type="submit" class="spotify-button primary" :disabled="loading">
                <span v-if="loading" class="button-spinner"></span>
                <span v-else>Verify</span>
              </button>
            </div>
          </form>

          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
          <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
        </div>

        <router-link to="/login" class="forgot-password-link"> Back to Login </router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

export default {
  name: 'VerifyOtpView',
  setup() {
    const router = useRouter()
    const otpArray = ref(['', '', '', '', '', ''])
    const otpRefs = ref([])
    const otpError = ref('')
    const errorMessage = ref('')
    const successMessage = ref('')
    const loading = ref(false)

    const clearErrors = () => {
      otpError.value = ''
      errorMessage.value = ''
      successMessage.value = ''
    }

    const onInput = (e, index) => {
      if (loading.value) return // Ngăn input khi đang loading

      const val = e.target.value.replace(/[^0-9]/g, '')
      otpArray.value[index] = val
      if (val && index < 5) {
        otpRefs.value[index + 1].focus()
      }
      clearErrors()
    }

    const onBackspace = (e, index) => {
      if (loading.value) return // Ngăn backspace khi đang loading

      if (!otpArray.value[index] && index > 0) {
        otpRefs.value[index - 1].focus()
      }
    }

    const validateOtp = () => {
      const otp = otpArray.value.join('')
      otpError.value = ''
      if (!otp) {
        otpError.value = 'OTP is required'
        return false
      }
      if (!/^[0-9]{6}$/.test(otp)) {
        otpError.value = 'OTP must be 6 digits'
        return false
      }
      return true
    }

    const handleSubmit = async () => {
      clearErrors()
      if (!validateOtp()) return

      loading.value = true
      try {
        const email = localStorage.getItem('email')
        const otpToken = localStorage.getItem('otpToken')

        // Kiểm tra nếu thiếu thông tin cần thiết
        if (!email || !otpToken) {
          errorMessage.value = 'Session expired. Please login again.'
          setTimeout(() => router.push('/login'), 2000)
          return
        }

        const response = await axios.post('http://localhost:8000/api/auth/verify-otp', {
          email,
          otp: otpArray.value.join(''),
          otpToken,
        })

        const { data } = response

        if (data.success === true || data.status === 'Success') {
          successMessage.value = 'OTP verified successfully!'

          // Lưu các token cần thiết vào localStorage
          localStorage.setItem('accessToken', data.data.accessToken)
          localStorage.setItem('refreshToken', data.data.refreshToken)
          localStorage.setItem('userId', data.data.sub)

          // Xóa otpToken và email tạm
          localStorage.removeItem('otpToken')
          localStorage.removeItem('email')

          setTimeout(() => router.push('/dashboard'), 1000)
        } else {
          errorMessage.value = data.message || 'Invalid or expired OTP.'
        }
      } catch (error) {
        console.error('OTP verify error:', error)

        // Xử lý lỗi chi tiết từ server
        if (error.response) {
          // Lỗi từ server (4xx, 5xx)
          const serverError = error.response.data
          errorMessage.value =
            serverError.message || serverError.error || 'An error occurred during OTP verification.'

          // Xử lý các trường hợp lỗi cụ thể
          if (error.response.status === 401) {
            errorMessage.value = 'Invalid or expired OTP. Please try again.'
          } else if (error.response.status === 400) {
            errorMessage.value = 'Invalid OTP format.'
          } else if (error.response.status === 404) {
            errorMessage.value = 'OTP session not found. Please request a new OTP.'
          }
        } else if (error.request) {
          // Lỗi network
          errorMessage.value = 'Network error. Please check your connection and try again.'
        } else {
          // Lỗi khác
          errorMessage.value = 'An unexpected error occurred. Please try again.'
        }
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      if (otpRefs.value[0]) otpRefs.value[0].focus()
    })

    return {
      otpArray,
      otpRefs,
      otpError,
      errorMessage,
      successMessage,
      loading,
      handleSubmit,
      clearErrors,
      onInput,
      onBackspace,
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
  border-radius: 12px;
  padding: 30px;
  text-align: center;
}

.fa-slack {
  font-size: 50px;
  color: #0a1a4d;
  margin-bottom: 24px;
  display: block;
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

.form-control.error {
  border-color: #e74c3c;
}

.otp-inputs {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 16px 0;
}

.otp-box {
  width: 48px;
  height: 56px;
  text-align: center;
  font-size: 22px;
  border: 1px solid #ddd;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.3s;
}

.otp-box:focus {
  border-color: #0a1a4d;
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

.success-message {
  color: #27ae60;
  font-size: 14px;
  margin-top: 8px;
  text-align: center;
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

.field-error {
  color: #e74c3c;
  font-size: 13px;
  margin-top: 5px;
}

.spotify-button {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 9999px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;
  margin-top: 10px;
  color: #ddd;
  /* Ensure button keeps its height during loading */
  min-height: 58px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.spotify-button.primary {
  background-color: #0a1a4d;
}

/* Thêm style cho trạng thái disabled */
.otp-box:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.7;
}

.spotify-button:disabled {
  background-color: #b3b3b3;
  cursor: not-allowed;
}

.spotify-button:disabled:hover {
  background-color: #b3b3b3;
  transform: none;
}

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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

<style>
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
</style>
