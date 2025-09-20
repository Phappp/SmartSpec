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
              <input
                type="text"
                v-model="otp"
                maxlength="6"
                class="form-control"
                :class="{ error: otpError }"
                id="otp"
                placeholder="6-digit OTP"
                @input="clearErrors"
              />
              <p v-if="otpError" class="field-error">{{ otpError }}</p>
            </div>

            <div class="continue-button-wrapper">
              <button type="submit" class="btn btn-primary" :disabled="loading">
                <span v-if="loading" class="loading"></span>
                <span v-else>Verify</span>
              </button>
            </div>
          </form>

          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
          <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
        </div>

        <router-link to="/login" class="forgot-password-link">
          Back to Login
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";

export default {
  name: "VerifyOtpView",
  setup() {
    const router = useRouter();
    const otp = ref("");
    const otpError = ref("");
    const errorMessage = ref("");
    const successMessage = ref("");
    const loading = ref(false);

    const clearErrors = () => {
      otpError.value = "";
      errorMessage.value = "";
      successMessage.value = "";
    };

    const validateOtp = () => {
      otpError.value = "";
      if (!otp.value) {
        otpError.value = "OTP is required";
        return false;
      }
      if (!/^[0-9]{6}$/.test(otp.value)) {
        otpError.value = "OTP must be 6 digits";
        return false;
      }
      return true;
    };

    const handleSubmit = async () => {
  clearErrors();
  if (!validateOtp()) return;

  loading.value = true;
  try {
    const email = localStorage.getItem("email");      
    const otpToken = localStorage.getItem("otpToken");

    const response = await axios.post("http://localhost:8000/api/auth/verify-otp", {
      email,                                          
      otp: otp.value,
      otpToken
    });

    const { data } = response;
if ((data.success === true) || data.status === "Success") {
  successMessage.value = "OTP verified successfully!";
  localStorage.removeItem("otpToken");
  setTimeout(() => router.push("/dashboard"), 1000);
} else {
  errorMessage.value = data.message || "Invalid or expired OTP.";
}
  } catch (error) {
    console.error("OTP verify error:", error);
    errorMessage.value = "An error occurred during OTP verification.";
  } finally {
    loading.value = false;
  }
};

    return {
      otp,
      otpError,
      errorMessage,
      successMessage,
      loading,
      handleSubmit,
      clearErrors,
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

.form-control.error {
  border-color: #e74c3c;
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

.loading {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

<style>
@import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css");
</style>
