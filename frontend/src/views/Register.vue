<template>
  <div class="signup-container">
    <a href="/" class="spotify-logo">
      <i class="fa-brands fa-slack"></i>
    </a>
    <div class="signup-form-wrapper">
      <div class="progress-bar-container">
        <div class="progress-bar" :style="{ width: progressWidth }"></div>
      </div>

      <!-- Step 1: Email -->
      <div class="form-step" v-show="currentStep === 1">
        <h2>Tạo tài khoản để bắt đầu</h2>
        <div class="form-group">
          <label for="email">Địa chỉ email</label>
          <input
            type="email"
            id="email"
            v-model="email"
            placeholder="name@domain.com"
            @blur="checkEmailExists"
          />
          <p class="error-message" v-if="emailError">{{ emailError }}</p>
          <p class="error-message" v-if="emailExistsError">{{ emailExistsError }}</p>
        </div>
        <br />
        <button class="spotify-button primary" @click="nextStep" :disabled="checkingEmail">
          <span v-if="checkingEmail" class="loading"></span>
          <span v-else>Tiếp theo</span>
        </button>

        <div class="divider">
          <hr />
          <span>hoặc</span>
          <hr />
        </div>
        <button class="social-signup-button google" @click="continueWith('google')">
          <i class="fa-brands fa-google"></i>
          Đăng ký bằng Google
        </button>

        <!-- Thêm link chuyển sang trang login -->
        <div class="login-redirect">
          <p>Bạn đã có tài khoản? <a href="/login">Đăng nhập tại đây</a></p>
        </div>
      </div>

      <!-- Step 2: Password -->
      <div class="form-step" v-show="currentStep === 2">
        <div class="back-arrow" @click="prevStep">
          <i class="fa-regular fa-circle-left"></i>
        </div>
        <h3>
          Bước <span>{{ currentStepDisplay }}</span> của 3
        </h3>
        <h2>Tạo mật khẩu</h2>
        <div class="form-group">
          <label for="password">Mật khẩu</label>
          <div class="password-input-wrapper">
            <input
              :type="passwordVisible ? 'text' : 'password'"
              id="password"
              v-model="password"
              placeholder=""
            />
            <span class="password-toggle" @click="togglePasswordVisibility">
              <i :class="passwordVisible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'"></i>
            </span>
          </div>
          <p class="error-message" v-if="passwordError">{{ passwordError }}</p>
        </div>
        <div class="password-strength-checklist">
          <h4>Mật khẩu của bạn phải có ít nhất</h4>
          <p class="checklist-item" :class="{ valid: hasChar }">
            <i :class="hasChar ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle'"></i> 1 chữ cái
          </p>
          <p class="checklist-item" :class="{ valid: hasSpecial }">
            <i :class="hasSpecial ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle'"></i> 1 chữ số
            hoặc ký tự đặc biệt (ví dụ # ?!&)
          </p>
          <p class="checklist-item" :class="{ valid: hasLength }">
            <i :class="hasLength ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle'"></i> 10 ký tự
          </p>
        </div>
        <button class="spotify-button primary" @click="nextStep">Tiếp theo</button>

        <!-- Thêm link chuyển sang trang login ở bước 2 -->
        <div class="login-redirect">
          <p>Bạn đã có tài khoản? <a href="/login">Đăng nhập tại đây</a></p>
        </div>
      </div>

      <!-- Step 3: Personal Info -->
      <div class="form-step" v-show="currentStep === 3">
        <div class="back-arrow" @click="prevStep">
          <i class="fa-regular fa-circle-left"></i>
        </div>
        <h3>
          Bước <span>{{ currentStepDisplay }}</span> của 3
        </h3>
        <h2>Giới thiệu thông tin về bản thân bạn</h2>
        <div class="form-group">
          <label for="name">Tên</label>
          <input
            type="text"
            id="name"
            v-model="name"
            placeholder="Tên này sẽ xuất hiện trên hồ sơ của bạn"
          />
          <p class="error-message" v-if="nameError">{{ nameError }}</p>
        </div>
        <div class="form-group">
          <label>Ngày sinh</label>
          <p class="info-text">
            Tại sao chúng tôi cần biết ngày sinh của bạn? <a href="#">Tìm hiểu thêm.</a>
          </p>
          <div class="dob-group">
            <input type="text" id="day" v-model="day" placeholder="2" maxlength="2" />
            <select id="month" v-model="month">
              <option value="">Tháng</option>
              <option value="1">Tháng 1</option>
              <option value="2">Tháng 2</option>
              <option value="3">Tháng 3</option>
              <option value="4">Tháng 4</option>
              <option value="5">Tháng 5</option>
              <option value="6">Tháng 6</option>
              <option value="7">Tháng 7</option>
              <option value="8">Tháng 8</option>
              <option value="9">Tháng 9</option>
              <option value="10">Tháng 10</option>
              <option value="11">Tháng 11</option>
              <option value="12">Tháng 12</option>
            </select>
            <input type="text" id="year" v-model="year" placeholder="1999" maxlength="4" />
          </div>
          <p class="error-message" v-if="dobError">{{ dobError }}</p>
        </div>
        <div class="form-group">
          <label>Giới tính</label>
          <p class="info-text">
            Giới tính của bạn giúp chúng tôi cung cấp nội dung đề xuất và quảng cáo phù hợp với bạn.
          </p>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" name="gender" value="male" v-model="gender" /> Nam
            </label>
            <label class="radio-label">
              <input type="radio" name="gender" value="female" v-model="gender" /> Nữ
            </label>
            <label class="radio-label">
              <input type="radio" name="gender" value="non-binary" v-model="gender" /> Phi nhị giới
            </label>
            <label class="radio-label">
              <input type="radio" name="gender" value="other" v-model="gender" /> Giới tính khác
            </label>
            <label class="radio-label">
              <input type="radio" name="gender" value="not-specified" v-model="gender" /> Không muốn
              nêu cụ thể
            </label>
          </div>
          <p class="error-message" v-if="genderError">{{ genderError }}</p>
        </div>
        <button class="spotify-button primary" @click="nextStep">Tiếp theo</button>

        <!-- Thêm link chuyển sang trang login ở bước 3 -->
        <div class="login-redirect">
          <p>Bạn đã có tài khoản? <a href="/login">Đăng nhập tại đây</a></p>
        </div>
      </div>

      <!-- Step 4: Terms & Conditions -->
      <div class="form-step" v-show="currentStep === 4">
        <div class="back-arrow" @click="prevStep">
          <i class="fa-regular fa-circle-left"></i>
        </div>
        <h3>
          Bước <span>{{ currentStepDisplay }}</span> của 3
        </h3>
        <h2>Điều khoản & Tùy chọn</h2>
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="newsletter" required />
            Chấp nhận điều khoản sử dụng
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="isTwoFactorEnabled" />
            Kích hoạt xác thực 2 lớp
          </label>
        </div>
        <p class="terms-text">
          Bằng việc nhấp vào nút Đăng ký, bạn đồng ý với
          <a href="#">Điều khoản và điều kiện sử dụng</a> của Spotify.
        </p>
        <p class="terms-text">
          Để tìm hiểu thêm về cách thức Spotify thu thập, sử dụng, chia sẻ và bảo vệ dữ liệu cá nhân
          của bạn, vui lòng xem <a href="#">Chính sách quyền riêng tư</a> của Spotify.
        </p>
        <button class="spotify-button primary" @click="register" :disabled="registering">
          <span v-if="registering" class="loading"></span>
          <span v-else>Đăng ký</span>
        </button>

        <!-- Thêm link chuyển sang trang login ở bước 4 -->
        <div class="login-redirect">
          <p>Bạn đã có tài khoản? <a href="/login">Đăng nhập tại đây</a></p>
        </div>
      </div>
    </div>
    <div class="recaptcha-info">
      <p>
        This site is protected by reCAPTCHA and the Google <a href="#">Privacy Policy</a> and
        <a href="#">Terms of Service</a> apply.
      </p>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

export default {
  name: 'RegisterView',
  setup() {
    const router = useRouter()

    // Form data
    const email = ref('')
    const password = ref('')
    const name = ref('')
    const day = ref('')
    const month = ref('')
    const year = ref('')
    const gender = ref('')
    const newsletter = ref(false)
    const isTwoFactorEnabled = ref(false)

    // UI state
    const currentStep = ref(1)
    const passwordVisible = ref(false)
    const emailError = ref('')
    const emailExistsError = ref('')
    const passwordError = ref('')
    const nameError = ref('')
    const dobError = ref('')
    const genderError = ref('')
    const checkingEmail = ref(false)
    const registering = ref(false)

    // Computed properties
    const progressWidth = computed(() => {
      return `${((currentStep.value - 1) / 3) * 100}%`
    })

    const currentStepDisplay = computed(() => {
      return currentStep.value === 1 ? 1 : currentStep.value - 1
    })

    const hasChar = computed(() => {
      return /[a-zA-Z]/.test(password.value)
    })

    const hasSpecial = computed(() => {
      return /[0-9!@#$%^&*(),.?":{}|<>]/.test(password.value)
    })

    const hasLength = computed(() => {
      return password.value.length >= 10
    })

    // Methods
    const togglePasswordVisibility = () => {
      passwordVisible.value = !passwordVisible.value
    }

    const checkEmailExists = async () => {
      if (!email.value) return

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(email.value)) {
        emailError.value = 'Vui lòng nhập địa chỉ email hợp lệ'
        return
      }

      emailError.value = ''
      checkingEmail.value = true

      try {
        // Sử dụng axios để gọi API kiểm tra email
        const response = await axios.post('/api/check-email', { email: email.value })

        if (response.data.exists) {
          emailExistsError.value = 'Email này đã được sử dụng. Vui lòng sử dụng email khác.'
        } else {
          emailExistsError.value = ''
        }
      } catch (error) {
        console.error('Error checking email:', error)
        emailExistsError.value = 'Không thể kiểm tra email. Vui lòng thử lại.'
      } finally {
        checkingEmail.value = false
      }
    }

    const nextStep = async () => {
      if (currentStep.value === 1) {
        // Validate email
        if (!email.value) {
          emailError.value = 'Vui lòng nhập địa chỉ email'
          return
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailPattern.test(email.value)) {
          emailError.value = 'Vui lòng nhập địa chỉ email hợp lệ'
          return
        }

        // Kiểm tra email đã tồn tại chưa
        checkingEmail.value = true
        try {
          const response = await axios.post('/api/check-email', { email: email.value })

          if (response.data.exists) {
            emailExistsError.value = 'Email này đã được sử dụng. Vui lòng sử dụng email khác.'
            checkingEmail.value = false
            return
          }
        } catch (error) {
          console.error('Error checking email:', error)
          emailExistsError.value = 'Không thể kiểm tra email. Vui lòng thử lại.'
          checkingEmail.value = false
          return
        }

        emailError.value = ''
        emailExistsError.value = ''
        currentStep.value++
        checkingEmail.value = false
      } else if (currentStep.value === 2) {
        // Validate password
        if (!password.value) {
          passwordError.value = 'Vui lòng nhập mật khẩu'
          return
        }
        if (!hasChar.value || !hasSpecial.value || !hasLength.value) {
          passwordError.value = 'Mật khẩu không đáp ứng yêu cầu'
          return
        }
        passwordError.value = ''
        currentStep.value++
      } else if (currentStep.value === 3) {
        // Validate personal info
        let isValid = true
        if (!name.value) {
          nameError.value = 'Vui lòng nhập tên của bạn'
          isValid = false
        } else {
          nameError.value = ''
        }

        if (!day.value || !month.value || !year.value) {
          dobError.value = 'Vui lòng nhập đầy đủ ngày, tháng, năm sinh'
          isValid = false
        } else {
          const dayNum = parseInt(day.value)
          const monthNum = parseInt(month.value)
          const yearNum = parseInt(year.value)
          const currentYear = new Date().getFullYear()

          if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
            dobError.value = 'Ngày không hợp lệ'
            isValid = false
          } else if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            dobError.value = 'Tháng không hợp lệ'
            isValid = false
          } else if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear) {
            dobError.value = 'Năm không hợp lệ'
            isValid = false
          } else {
            dobError.value = ''
          }
        }

        if (!gender.value) {
          genderError.value = 'Vui lòng chọn giới tính'
          isValid = false
        } else {
          genderError.value = ''
        }

        if (isValid) {
          currentStep.value++
        }
      }
    }

    const prevStep = () => {
      if (currentStep.value > 1) {
        currentStep.value--
      }
    }

    const continueWith = (provider) => {
      console.log(`Continue with ${provider}`)
      // Simulate social signup
      alert(`This would normally redirect to ${provider} authentication`)
    }

    const register = async () => {
      registering.value = true

      try {
        // Sử dụng axios để gửi yêu cầu đăng ký
        const response = await axios.post('/api/register', {
          email: email.value,
          password: password.value,
          name: name.value,
          dob: `${year.value}-${month.value}-${day.value}`,
          gender: gender.value,
          newsletter: newsletter.value,
          isTwoFactorEnabled: isTwoFactorEnabled.value,
        })

        if (response.data.success) {
          // Đăng ký thành công, chuyển hướng đến trang đăng nhập
          router.push('/login?registered=true')
        } else {
          alert('Đăng ký thất bại. Vui lòng thử lại.')
        }
      } catch (error) {
        console.error('Registration error:', error)
        alert('Đã xảy ra lỗi. Vui lòng thử lại.')
      } finally {
        registering.value = false
      }
    }

    // Watch for email changes to clear error
    watch(email, () => {
      if (emailExistsError.value) {
        emailExistsError.value = ''
      }
    })

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
      progressWidth,
      currentStepDisplay,
      hasChar,
      hasSpecial,
      hasLength,
      togglePasswordVisibility,
      checkEmailExists,
      nextStep,
      prevStep,
      continueWith,
      register,
    }
  },
}
</script>


<style scoped>
/* Giữ nguyên toàn bộ phần CSS từ file gốc */
body {
  margin: 0;
  padding: 0;
  font-family: 'Circular Spotify Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
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

/* Progress Bar */
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

/* Form Steps */
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

.form-group input[type='email'],
.form-group input[type='password'],
.form-group input[type='text'] {
  width: 100%;
  padding: 14px;
  border: 1px solid #535353;
  border-radius: 4px;
  font-size: 16px;
  box-sizing: border-box;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.form-group input[type='email']:focus,
.form-group input[type='password']:focus,
.form-group input[type='text']:focus {
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
}

.spotify-button.primary {
  background-color: #0a1a4d;
}

.spotify-button.primary:hover {
  background-color: #434c69;
  transform: scale(1.01);
  color: #fff;
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

.dob-group input[type='text']:focus,
.dob-group select:focus {
  border-color: #000;
}

.dob-group input[type='text']#day {
  flex-basis: 60px;
  flex-grow: 0;
}

.dob-group input[type='text']#year {
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

.radio-label input[type='radio'] {
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

.radio-label input[type='radio']:checked {
  border-color: #0a1a4d;
}

.radio-label input[type='radio']:checked::before {
  content: '';
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

.checkbox-label input[type='checkbox'] {
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

.checkbox-label input[type='checkbox']:checked {
  background-color: #0a1a4d;
  border-color: #0a1a4d;
}

.checkbox-label input[type='checkbox']:checked::before {
  content: '\2713';
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