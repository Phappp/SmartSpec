<template>
  <div class="container-center">
    <div class="login-card">
      <div class="card-content">
        <router-link to="/"><i class="fa-brands fa-slack"></i></router-link>
        <h1 class="card-title">Forgot Password</h1>

        <div class="form-group">
          <form @submit.prevent="handleSubmit">
            <div class="form-group-input">
              <label for="email" class="form-label">Email or username</label>
              <input
                type="text"
                v-model="email"
                class="form-control"
                :class="{ error: emailError }"
                id="email"
                placeholder="Enter your email or username"
                @input="clearErrors"
              />
              <p v-if="emailError" class="field-error">{{ emailError }}</p>
            </div>

            <div class="continue-button-wrapper">
              <button type="submit" class="btn btn-primary" :disabled="loading">
                <span v-if="loading" class="loading"></span>
                <span v-else>Send Reset Link</span>
              </button>
            </div>
          </form>

          <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        </div>

        <router-link to="/login" class="forgot-password-link">Back to Login</router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from "vue";
import axios from "axios";

export default {
  name: "ForgotPasswordView",
  setup() {
    const email = ref("");
    const emailError = ref("");
    const errorMessage = ref("");
    const successMessage = ref("");
    const loading = ref(false);

    const clearErrors = () => {
      emailError.value = "";
      errorMessage.value = "";
      successMessage.value = "";
    };

    const validateEmail = () => {
      emailError.value = "";
      if (!email.value) {
        emailError.value = "Email or username is required";
        return false;
      }
      if (!/\S+@\S+\.\S+/.test(email.value) && email.value.length < 3) {
        emailError.value = "Please enter a valid email or username";
        return false;
      }
      return true;
    };

    const handleSubmit = async () => {
      clearErrors();
      if (!validateEmail()) return;

      loading.value = true;
      try {
        // Gọi API forgot password
        const res = await axios.post("http://localhost:8000/auth/forgot-password", {
          email: email.value,
        });

        if (res.data.status === "Success") {
          successMessage.value =
            "Reset link has been sent. Interface will close in 10 seconds.";
          setTimeout(() => {
            window.close();
          }, 10000);
        } else {
          errorMessage.value = "Unable to send reset link. Please try again.";
        }
      } catch (err) {
        errorMessage.value = "An error occurred. Please try again.";
      } finally {
        loading.value = false;
      }
    };

    return {
      email,
      emailError,
      errorMessage,
      successMessage,
      loading,
      clearErrors,
      handleSubmit,
    };
  },
};
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

.form-control:focus {
  outline: none;
  border-color: #0a1a4d;
  box-shadow: 0 0 0 2px rgba(10, 26, 77, 0.2);
}

.form-control.error {
  border-color: #e74c3c;
}

.continue-button-wrapper {
  margin-top: 24px;
  margin-bottom: 16px;
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
  font-weight: 500;
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

.error-message {
  color: #e74c3c;
  font-size: 14px;
  margin-top: 8px;
  text-align: center;
}

.success-message {
  color: #2ecc71;
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
  margin-top: 24px;
  font-size: 14px;
}

.forgot-password-link:hover {
  text-decoration: underline;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
}
</style>

<style>
@import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css");
</style>
