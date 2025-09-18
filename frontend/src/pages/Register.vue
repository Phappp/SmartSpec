<template>
  <div class="signup-container">
    <a href="/" class="spotify-logo">
      <i class="fa-brands fa-slack"></i>
    </a>
    <div class="signup-form-wrapper">
      <div class="progress-bar-container">
        <div class="progress-bar" :style="{ width: progressWidth }"></div>
      </div>

      <div class="form-step" v-show="currentStep === 1">
        <h2>Create an account to get started</h2>
        <div class="form-group">
          <label for="email">Email address</label>
          <input
            type="email"
            id="email"
            v-model="email"
            placeholder="name@domain.com"
            :disabled="emailVerified"
          />
          <p class="error-message" v-if="emailError">{{ emailError }}</p>
          <p class="error-message" v-if="emailExistsError">{{ emailExistsError }}</p>
          <p class="success-message" v-if="emailVerified">✓ Email has been verified</p>
        </div>
        <br />
        <button
          class="spotify-button primary"
          @click="nextStep"
          :disabled="checkingEmail"
        >
          <div v-if="checkingEmail" class="button-spinner"></div>
          <span v-else>Next</span>
        </button>

        <div class="divider">
          <hr />
          <span>or</span>
          <hr />
        </div>
        <button class="social-signup-button google" @click="continueWith('google')">
          <i class="fa-brands fa-google"></i>
          Sign up with Google
        </button>

        <div class="login-redirect">
          <p>Already have an account? <a href="/login">Sign in here</a></p>
        </div>
      </div>

      <div class="form-step" v-show="currentStep === 2">
        <div class="back-arrow" @click="prevStep">
          <i class="fa-regular fa-circle-left"></i>
        </div>
        <h3>
          Step <span>{{ currentStepDisplay }}</span> of 3
        </h3>
        <h2>Create password</h2>
        <div class="form-group">
          <label for="password">Password</label>
          <div class="password-input-wrapper">
            <input
              :type="passwordVisible ? 'text' : 'password'"
              id="password"
              v-model="password"
              placeholder=""
            />
            <span class="password-toggle" @click="togglePasswordVisibility">
              <i
                :class="passwordVisible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'"
              ></i>
            </span>
          </div>
          <p class="error-message" v-if="passwordError">{{ passwordError }}</p>
        </div>
        <div class="password-strength-checklist">
          <h4>Your password must have at least</h4>
          <p class="checklist-item" :class="{ valid: hasChar }">
            <i :class="hasChar ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle'"></i> 1
            letter
          </p>
          <p class="checklist-item" :class="{ valid: hasSpecial }">
            <i
              :class="hasSpecial ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle'"
            ></i>
            1 number or special character (e.g. # ?!&)
          </p>
          <p class="checklist-item" :class="{ valid: hasLength }">
            <i :class="hasLength ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle'"></i>
            10 characters
          </p>
        </div>
        <button class="spotify-button primary" @click="nextStep">Next</button>

        <div class="login-redirect">
          <p>Already have an account? <a href="/login">Sign in here</a></p>
        </div>
      </div>

      <div class="form-step" v-show="currentStep === 3">
        <div class="back-arrow" @click="prevStep">
          <i class="fa-regular fa-circle-left"></i>
        </div>
        <h3>
          Step <span>{{ currentStepDisplay }}</span> of 3
        </h3>
        <h2>Tell us about yourself</h2>
        <div class="form-group">
          <label for="name">Name</label>
          <input
            type="text"
            id="name"
            v-model="name"
            placeholder="This name will appear on your profile"
          />
          <p class="error-message" v-if="nameError">{{ nameError }}</p>
        </div>
        <div class="form-group">
          <label>Date of birth</label>
          <p class="info-text">
            Why do we need your date of birth? <a href="#">Learn more.</a>
          </p>
          <div class="dob-group">
            <input type="text" id="day" v-model="day" placeholder="DD" maxlength="2" />
            <select id="month" v-model="month">
              <option value="">Month</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
            <input
              type="text"
              id="year"
              v-model="year"
              placeholder="YYYY"
              maxlength="4"
            />
          </div>
          <p class="error-message" v-if="dobError">{{ dobError }}</p>
        </div>
        <div class="form-group">
          <label>Gender</label>
          <p class="info-text">
            We use your gender to help us personalize our content recommendations and ads
            for you.
          </p>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" name="gender" value="male" v-model="gender" /> Male
            </label>
            <label class="radio-label">
              <input type="radio" name="gender" value="female" v-model="gender" /> Female
            </label>
            <label class="radio-label">
              <input type="radio" name="gender" value="non-binary" v-model="gender" />
              Non-binary
            </label>
            <label class="radio-label">
              <input type="radio" name="gender" value="other" v-model="gender" /> Other
            </label>
            <label class="radio-label">
              <input type="radio" name="gender" value="not-specified" v-model="gender" />
              Prefer not to say
            </label>
          </div>
          <p class="error-message" v-if="genderError">{{ genderError }}</p>
        </div>
        <button class="spotify-button primary" @click="nextStep">Next</button>

        <div class="login-redirect">
          <p>Already have an account? <a href="/login">Sign in here</a></p>
        </div>
      </div>

      <div class="form-step" v-show="currentStep === 4">
        <div class="back-arrow" @click="prevStep">
          <i class="fa-regular fa-circle-left"></i>
        </div>
        <h3>
          Step <span>{{ currentStepDisplay }}</span> of 3
        </h3>
        <h2>Terms & Options</h2>
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="newsletter" required />
            I agree to the terms of use
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="isTwoFactorEnabled" />
            Enable Two-Factor Authentication
          </label>
        </div>
        <p class="terms-text">
          By clicking on Sign up, you agree to Spotify's
          <a href="#">Terms and Conditions of Use</a>.
        </p>
        <p class="terms-text">
          To learn more about how Spotify collects, uses, shares and protects your
          personal data, please see
          <a href="#">Spotify's Privacy Policy</a>.
        </p>
        <button class="spotify-button primary" @click="register" :disabled="registering">
          <div v-if="registering" class="button-spinner"></div>
          <span v-else>Sign Up</span>
        </button>

        <div class="login-redirect">
          <p>Already have an account? <a href="/login">Sign in here</a></p>
        </div>
      </div>
    </div>
    <div class="recaptcha-info">
      <p>
        This site is protected by reCAPTCHA and the Google
        <a href="#">Privacy Policy</a> and <a href="#">Terms of Service</a> apply.
      </p>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useRouter, useRoute } from "vue-router";
import axios from "axios";

export default {
  name: "RegisterView",
  setup() {
    const router = useRouter();
    const route = useRoute();

    // Form data
    const email = ref("");
    const password = ref("");
    const name = ref("");
    const day = ref("");
    const month = ref("");
    const year = ref("");
    const gender = ref("");
    const newsletter = ref(false);
    const isTwoFactorEnabled = ref(false);

    // UI state
    const currentStep = ref(1);
    const passwordVisible = ref(false);
    const emailError = ref("");
    const emailExistsError = ref("");
    const passwordError = ref("");
    const nameError = ref("");
    const dobError = ref("");
    const genderError = ref("");
    const checkingEmail = ref(false);
    const registering = ref(false);
    const emailVerified = ref(false);
    const verificationToken = ref("");

    onMounted(() => {
      window.addEventListener("storage", handleStorageEvent);

      if (route.query.verified === "true") {
        // Người dùng vừa click link xác thực email
        localStorage.setItem("emailVerified", "true");
        email.value = localStorage.getItem("registerEmail") || "";
        currentStep.value = 2;
        localStorage.setItem("registerStep", "2");
        setTimeout(() => {
          router.replace({ path: route.path });
        }, 1000);
      } else {
        // Luôn khôi phục từ localStorage khi reload
        const savedStep = localStorage.getItem("registerStep");
        const savedEmail = localStorage.getItem("registerEmail");

        if (savedStep) {
          currentStep.value = parseInt(savedStep, 10);
        }
        if (savedEmail) {
          email.value = savedEmail;
        }
      }
    });

    onBeforeUnmount(() => {
      window.removeEventListener("storage", handleStorageEvent);
    });

    function handleStorageEvent(e) {
      if (e.key === "emailVerified" && e.newValue === "true") {
        currentStep.value = 2;
        email.value = localStorage.getItem("registerEmail") || "";
        localStorage.removeItem("emailVerified");
      }
    }

    // Computed properties
    const progressWidth = computed(() => {
      return `${((currentStep.value - 1) / 3) * 100}%`;
    });

    const currentStepDisplay = computed(() => {
      return currentStep.value === 1 ? 1 : currentStep.value - 1;
    });

    const hasChar = computed(() => {
      return /[a-zA-Z]/.test(password.value);
    });

    const hasSpecial = computed(() => {
      return /[0-9!@#$%^&*(),.?":{}|<>]/.test(password.value);
    });

    const hasLength = computed(() => {
      return password.value.length >= 10;
    });

    // Methods
    const togglePasswordVisibility = () => {
      passwordVisible.value = !passwordVisible.value;
    };

    const verifyEmailToken = async (token) => {
      try {
        const response = await axios.post("http://localhost:8000/auth/verify-email", {
          token,
        });

        if (response.data.status === "Success" && response.data.data === true) {
          emailVerified.value = true;
          verificationToken.value = token;
          currentStep.value = 2;
          return true;
        } else {
          alert(response.data.message || "Verification link is invalid or has expired.");
          return false;
        }
      } catch (error) {
        console.error("Error verifying token:", error);
        alert("Server error during email verification.");
        return false;
      }
    };

    const nextStep = async () => {
      if (currentStep.value === 1) {
        if (!email.value) {
          emailError.value = "Please enter your email address";
          return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email.value)) {
          emailError.value = "Please enter a valid email address";
          return;
        }

        checkingEmail.value = true;
        try {
          const response = await axios.post(
            "http://localhost:8000/auth/send-verification-email",
            { email: email.value }
          );

          if (response.data.status === "Success") {
            emailExistsError.value = "";
            alert(
              "We've sent a verification link to your email. Please check your inbox."
            );
            localStorage.setItem("registerEmail", email.value);
            localStorage.setItem("registerStep", "2");
            //currentStep.value = 2;
          } else {
            emailExistsError.value =
              response.data.message ||
              "This email is already in use. Please try another.";
          }
        } catch (error) {
          console.error("Error sending verification email:", error);
          emailExistsError.value =
            error.response?.data?.message ||
            "Could not send verification email. Please try again.";
        } finally {
          checkingEmail.value = false;
        }
      } else if (currentStep.value === 2) {
        if (!password.value) {
          passwordError.value = "Please enter a password";
          return;
        }
        if (!hasChar.value || !hasSpecial.value || !hasLength.value) {
          passwordError.value = "Password does not meet the requirements";
          return;
        }
        passwordError.value = "";
        currentStep.value++;
        localStorage.setItem("registerStep", currentStep.value.toString());
        localStorage.setItem("registerEmail", email.value);
      } else if (currentStep.value === 3) {
        let isValid = true;
        if (!name.value) {
          nameError.value = "Please enter your name";
          isValid = false;
        } else {
          nameError.value = "";
        }

        if (!day.value || !month.value || !year.value) {
          dobError.value = "Please enter your full date of birth";
          isValid = false;
        } else {
          const dayNum = parseInt(day.value);
          const monthNum = parseInt(month.value);
          const yearNum = parseInt(year.value);
          const currentYear = new Date().getFullYear();

          if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
            dobError.value = "Invalid day";
            isValid = false;
          } else if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            dobError.value = "Invalid month";
            isValid = false;
          } else if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear) {
            dobError.value = "Invalid year";
            isValid = false;
          } else {
            dobError.value = "";
          }
        }

        if (!gender.value) {
          genderError.value = "Please select your gender";
          isValid = false;
        } else {
          genderError.value = "";
        }

        if (isValid) {
          currentStep.value++;
          localStorage.setItem("registerStep", currentStep.value.toString());
          localStorage.setItem("registerEmail", email.value);
        }
      }
    };

    const prevStep = () => {
      if (currentStep.value > 1) {
        currentStep.value--;
        localStorage.setItem("registerStep", currentStep.value.toString());
        localStorage.setItem("registerEmail", email.value);
      }
    };

    const continueWith = (provider) => {
      alert(`This would normally redirect to ${provider} authentication`);
    };

    const register = async () => {
      const storedEmail = localStorage.getItem("registerEmail") || "";
      const emailToSend = email.value || storedEmail;

      if (!emailToSend) {
        alert("Email not found. Please re-enter or verify your email.");
        return;
      }

      registering.value = true;
      try {
        const response = await axios.post("http://localhost:8000/auth/register", {
          email: emailToSend,
          password: password.value,
          confirmPassword: password.value,
          name: name.value,
          dob: {
            day: parseInt(day.value, 10),
            month: parseInt(month.value, 10),
            year: parseInt(year.value, 10),
          },
          gender: gender.value,
          isTwoFactorEnabled: isTwoFactorEnabled.value,
        });

        if (response.data.status === "Success") {
          localStorage.removeItem("registerEmail");
          localStorage.removeItem("emailVerified");
          localStorage.removeItem("registerStep");

          router.push("/login?registered=true");
          alert(response.data.message || "Registration successful! Please log in.");
        } else {
          alert(response.data.message || "Registration failed. Please try again.");
        }
      } catch (error) {
        console.error("Registration error:", error);
        alert(error.response?.data?.message || "An error occurred. Please try again.");
      } finally {
        registering.value = false;
      }
    };

    watch(email, () => {
      if (emailExistsError.value) {
        emailExistsError.value = "";
      }
    });

    return {
      email,
      password,
      name,
      day,
      month,
      year,
      gender,
      newsletter,
      isTwoFactorEnabled,
      currentStep,
      passwordVisible,
      emailError,
      emailExistsError,
      passwordError,
      nameError,
      dobError,
      genderError,
      checkingEmail,
      registering,
      emailVerified,
      verificationToken,
      progressWidth,
      currentStepDisplay,
      hasChar,
      hasSpecial,
      hasLength,
      togglePasswordVisibility,
      verifyEmailToken,
      nextStep,
      prevStep,
      continueWith,
      register,
    };
  },
};
</script>

<style scoped>
/* Original CSS remains unchanged */
body {
  margin: 0;
  padding: 0;
  font-family: "Circular Spotify Text", -apple-system, BlinkMacSystemFont, "Segoe UI",
    Roboto, "Helvetica Neue", Arial, sans-serif;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
}

.signup-container {
  width: 100%;
  max-width: 500px;
  border-radius: 8px;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-self: center;
}

.spotify-logo {
  font-size: 48px;
  color: #0a1a4d;
  margin-bottom: 30px;
  border-radius: 50%;
  pointer-events: none;
}

.signup-form-wrapper {
  width: 100%;
  max-width: 450px;
  margin-bottom: 20px;
}

.progress-bar-container {
  width: 100%;
  height: 4px;
  background-color: #959292;
  border-radius: 2px;
  margin-bottom: 20px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background-color: #0a1a4d;
  border-radius: 2px;
  transition: width 0.3s ease-in-out;
}

.form-step {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.form-step h2,
.form-step h3 {
  text-align: center;
  margin-bottom: 20px;
}

.form-step h3 {
  font-size: 16px;
  font-weight: normal;
  text-align: left;
  margin-left: 0;
}

.form-group {
  margin-bottom: 15px;
  width: 100%;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 8px;
}

.form-group input[type="email"],
.form-group input[type="password"],
.form-group input[type="text"] {
  width: 100%;
  padding: 14px;
  border: 1px solid #535353;
  border-radius: 4px;
  font-size: 16px;
  box-sizing: border-box;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.form-group input[type="email"]:focus,
.form-group input[type="password"]:focus,
.form-group input[type="text"]:focus {
  border-color: #ffffff;
}

.form-group input::placeholder {
  color: #737373;
}

.error-message {
  color: #ff3333;
  font-size: 13px;
  margin-top: 5px;
}

.success-message {
  color: #1ed760;
  font-size: 13px;
  margin-top: 5px;
}

.use-phone-link {
  color: #0a1a4d;
  text-decoration: none;
  font-size: 14px;
  font-weight: bold;
  display: block;
  margin-bottom: 20px;
  text-align: left;
}

.use-phone-link:hover {
  text-decoration: underline;
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

.spotify-button.primary:hover:not(:disabled) {
  background-color: #434c69;
  transform: scale(1.01);
  color: #fff;
}

.spotify-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Divider */
.divider {
  display: flex;
  align-items: center;
  margin: 30px 0;
  color: #737373;
  font-size: 14px;
}

.divider hr {
  flex-grow: 1;
  border: none;
  border-top: 1px solid #2e2e2e;
}

.divider span {
  padding: 0 15px;
}

/* Social Signup Buttons */
.social-signup-button {
  width: 100%;
  padding: 14px;
  margin-bottom: 10px;
  background-color: transparent;
  border: 1px solid #737373;
  border-radius: 9999px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.social-signup-button:hover {
  border-color: #ffffff;
  color: #ffffff;
  background-color: #282828;
}

.social-signup-button img,
.social-signup-button .fa-brands {
  font-size: 20px;
}

/* Password Toggle */
.password-input-wrapper {
  position: relative;
  width: 100%;
}

.password-toggle {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: #b3b3b3;
  cursor: pointer;
  font-size: 18px;
}

.password-toggle:hover {
  color: #ffffff;
}

/* Password Strength Checklist */
.password-strength-checklist {
  margin-top: 15px;
  margin-bottom: 25px;
  text-align: left;
}

.password-strength-checklist h4 {
  font-size: 14px;
  color: #b3b3b3;
  margin-bottom: 10px;
  margin-top: 0;
}

.checklist-item {
  font-size: 14px;
  color: #737373;
  margin: 8px 0;
  display: flex;
  align-items: center;
}

.checklist-item i {
  margin-right: 8px;
  color: #737373;
}

/* Valid checklist item */
.checklist-item.valid {
  color: #1ed760;
}

.checklist-item.valid i {
  color: #1ed760;
}

/* Date of Birth Group */
.dob-group {
  display: flex;
  gap: 10px;
}

.dob-group input,
.dob-group select {
  flex-grow: 1;
  padding: 14px;
  border: 1px solid #535353;
  border-radius: 4px;
  font-size: 16px;
  box-sizing: border-box;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

.dob-group input[type="text"]:focus,
.dob-group select:focus {
  border-color: #000;
}

.dob-group input[type="text"]#day {
  flex-basis: 60px;
  flex-grow: 0;
}

.dob-group input[type="text"]#year {
  flex-basis: 90px;
  flex-grow: 0;
}

.dob-group select {
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 16px;
}

.info-text {
  font-size: 12px;
  margin-top: -8px;
  margin-bottom: 10px;
}

.info-text a {
  color: #0a1a4d;
  text-decoration: none;
}

.info-text a:hover {
  text-decoration: underline;
}

/* Radio Group (Gender) */
.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 20px;
}

.radio-label {
  display: flex;
  align-items: center;
  font-size: 16px;
  color: #b3b3b3;
  cursor: pointer;
}

.radio-label input[type="radio"] {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid #535353;
  border-radius: 50%;
  margin-right: 10px;
  outline: none;
  cursor: pointer;
  position: relative;
  transition: border-color 0.2s ease;
}

.radio-label input[type="radio"]:checked {
  border-color: #0a1a4d;
}

.radio-label input[type="radio"]:checked::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background-color: #0a1a4d;
  border-radius: 50%;
}

/* Checkbox Group (Terms) */
.checkbox-group {
  margin-bottom: 20px;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  font-size: 14px;
  margin-bottom: 15px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid #535353;
  border-radius: 4px;
  margin-right: 10px;
  outline: none;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.checkbox-label input[type="checkbox"]:checked {
  background-color: #0a1a4d;
  border-color: #0a1a4d;
}

.checkbox-label input[type="checkbox"]:checked::before {
  content: "\2713";
  font-size: 16px;
  color: #fffbfb;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.terms-text {
  font-size: 12px;
  color: #b3b3b3;
  text-align: center;
  margin-bottom: 10px;
  line-height: 1.5;
}

.terms-text a {
  color: #0a1a4d;
  text-decoration: none;
}

.terms-text a:hover {
  text-decoration: underline;
}

/* Back Arrow */
.back-arrow {
  position: absolute;
  left: -40px;
  top: 10px;
  font-size: 26px;
  cursor: pointer;
  transition: color 0.2s ease;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-arrow:hover {
  color: #ffffff;
}

.back-arrow i {
  pointer-events: none;
}

/* ReCAPTCHA Info */
.recaptcha-info {
  font-size: 11px;
  color: #737373;
  text-align: center;
  padding: 0 10px;
}

.recaptcha-info a {
  color: #b3b3b3;
  text-decoration: none;
}

.recaptcha-info a:hover {
  text-decoration: underline;
}

/* Login Redirect Link */
.login-redirect {
  text-align: center;
  margin-top: 25px;
  padding-top: 15px;
  border-top: 1px solid #2e2e2e;
}

.login-redirect p {
  color: #b3b3b3;
  font-size: 14px;
  margin: 0;
}

.login-redirect a {
  color: #0a1a4d;
  text-decoration: none;
  font-weight: bold;
}

.login-redirect a:hover {
  text-decoration: underline;
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
  content: "";
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

/* Responsive adjustments */
@media (max-width: 600px) {
  body {
    padding: 10px;
  }

  .signup-container {
    padding: 15px;
  }

  .spotify-logo {
    font-size: 40px;
    margin-bottom: 20px;
  }

  .form-step h2 {
    font-size: 24px;
  }

  .form-group label {
    font-size: 13px;
  }

  .form-group input,
  .dob-group select,
  .spotify-button {
    padding: 12px;
    font-size: 15px;
    min-height: 50px;
  }

  .social-signup-button {
    padding: 12px;
    font-size: 15px;
  }

  .password-strength-checklist h4,
  .checklist-item {
    font-size: 13px;
  }

  .radio-label,
  .checkbox-label {
    font-size: 15px;
  }

  .terms-text {
    font-size: 11px;
  }

  .back-arrow {
    left: -30px;
  }

  .login-redirect p {
    font-size: 13px;
  }
}
</style>
