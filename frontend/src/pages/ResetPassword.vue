<template>
  <div class="container-center">
    <div class="login-card">
      <div class="card-content">
        <router-link to="/"><i class="fa-brands fa-slack"></i></router-link>
        <h1 class="card-title">Reset your password</h1>

        <div class="form-group">
          <form @submit.prevent="handleSubmit">
            <!-- New password -->
            <div class="form-group-input" id="password-input">
              <label for="newPassword" class="form-label">New password</label>
              <div class="password-input-wrapper">
                <input
                  :type="newPasswordVisible ? 'text' : 'password'"
                  v-model="newPassword"
                  class="form-control"
                  :class="{ error: newPasswordError }"
                  id="newPassword"
                  placeholder="Enter new password"
                  @input="clearErrors"
                />
                <span class="password-toggle" @click="toggleNewPasswordVisibility">
                  <i :class="newPasswordVisible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'"></i>
                </span>
              </div>
              <p v-if="newPasswordError" class="field-error">{{ newPasswordError }}</p>
            </div>

            <!-- Confirm password -->
            <div class="form-group-input" id="confirm-password-input" style="margin-top: 16px">
              <label for="confirmPassword" class="form-label">Confirm password</label>
              <div class="password-input-wrapper">
                <input
                  :type="confirmPasswordVisible ? 'text' : 'password'"
                  v-model="confirmPassword"
                  class="form-control"
                  :class="{ error: confirmPasswordError }"
                  id="confirmPassword"
                  placeholder="Confirm new password"
                  @input="clearErrors"
                />
                <span class="password-toggle" @click="toggleConfirmPasswordVisibility">
                  <i
                    :class="confirmPasswordVisible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'"
                  ></i>
                </span>
              </div>
              <p v-if="confirmPasswordError" class="field-error">
                {{ confirmPasswordError }}
              </p>
            </div>

            <div class="continue-button-wrapper">
              <button type="submit" class="btn btn-primary" :disabled="loading">
                <span v-if="loading" class="button-spinner"></span>
                <span v-else>Reset Password</span>
              </button>
            </div>
          </form>

          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
          <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

export default {
  name: 'ResetPasswordView',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const token = route.query.token || ''

    const newPassword = ref('')
    const confirmPassword = ref('')
    const newPasswordVisible = ref(false)
    const confirmPasswordVisible = ref(false)
    const newPasswordError = ref('')
    const confirmPasswordError = ref('')
    const errorMessage = ref('')
    const successMessage = ref('')
    const loading = ref(false)

    const clearErrors = () => {
      newPasswordError.value = ''
      confirmPasswordError.value = ''
      errorMessage.value = ''
      successMessage.value = ''
    }

    const toggleNewPasswordVisibility = () => {
      newPasswordVisible.value = !newPasswordVisible.value
    }

    const toggleConfirmPasswordVisibility = () => {
      confirmPasswordVisible.value = !confirmPasswordVisible.value
    }

    const validate = () => {
      let valid = true

      if (!newPassword.value) {
        newPasswordError.value = 'New password is required'
        valid = false
      } else if (newPassword.value.length < 10) {
        newPasswordError.value =
          'Password must be at least 10 characters long and contain at least one number and one letter or special character'
        valid = false
      }

      if (!confirmPassword.value) {
        confirmPasswordError.value = 'Please confirm your password'
        valid = false
      } else if (confirmPassword.value !== newPassword.value) {
        confirmPasswordError.value = 'Passwords do not match'
        valid = false
      }

      return valid
    }

    const handleSubmit = async () => {
      clearErrors()
      if (!validate()) return

      loading.value = true
      try {
        const res = await axios.post(
          `http://localhost:8000/api/auth/reset-password?token=${token}`,
          {
            newPassword: newPassword.value,
            confirmNewPassword: confirmPassword.value,
          }
        )

        if (res.data.status === 'Success') {
          successMessage.value = 'Password reset successfully. Redirecting to login...'
          setTimeout(() => router.push('/login'), 2000)
        } else {
          errorMessage.value = res.data.message || 'Reset password failed.'
        }
      } catch (e) {
        errorMessage.value = 'An error occurred. Please try again.'
      } finally {
        loading.value = false
      }
    }

    return {
      newPassword,
      confirmPassword,
      newPasswordVisible,
      confirmPasswordVisible,
      newPasswordError,
      confirmPasswordError,
      errorMessage,
      successMessage,
      loading,
      clearErrors,
      toggleNewPasswordVisibility,
      toggleConfirmPasswordVisibility,
      handleSubmit,
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

.password-input-wrapper {
  position: relative;
}

.form-control {
  padding-right: 40px; /* Tạo khoảng trống cho biểu tượng */
}

.password-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: #6c757d;
}

.password-toggle:hover {
  color: #0a1a4d;
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
.success-message {
  color: #2ecc71;
  font-size: 14px;
  margin-top: 8px;
  text-align: center;
}
</style>

<style>
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
</style>
